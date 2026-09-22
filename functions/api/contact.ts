const MAX_BODY_BYTES = 16_384;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5_000;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1_000;

const acceptedSubmissionIds = new Map<string, number>();

interface ContactEnvironment {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_EMAIL_API_TOKEN?: string;
  CONTACT_EMAIL_FROM?: string;
  CONTACT_EMAIL_TO?: string;
}

interface PagesContext {
  request: Request;
  env: ContactEnvironment;
}

interface ContactPayload {
  name: string;
  email: string;
  message: string;
  website: string;
  submissionId: string;
}

type Fetcher = typeof fetch;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanExpiredSubmissionIds(now: number): void {
  for (const [submissionId, acceptedAt] of acceptedSubmissionIds) {
    if (now - acceptedAt > IDEMPOTENCY_TTL_MS) acceptedSubmissionIds.delete(submissionId);
  }
}

function parseRecipients(value: string): string[] {
  return [...new Set(value.split(",").map((recipient) => recipient.trim()).filter(Boolean))];
}

function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

function parsePayload(value: unknown): ContactPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.message !== "string" ||
    typeof candidate.website !== "string" ||
    typeof candidate.submissionId !== "string"
  ) {
    return null;
  }

  return {
    name: candidate.name.trim(),
    email: candidate.email.trim(),
    message: candidate.message.trim(),
    website: candidate.website.trim(),
    submissionId: candidate.submissionId.trim(),
  };
}

function validatePayload(payload: ContactPayload): string | null {
  if (!payload.name || !payload.email || !payload.message) return "Please complete all required fields.";
  if (payload.name.length > MAX_NAME_LENGTH) return "Name is too long.";
  if (!isValidEmail(payload.email)) return "Please enter a valid email address.";
  if (payload.message.length > MAX_MESSAGE_LENGTH) return "Message is too long.";
  if (!SUBMISSION_ID_PATTERN.test(payload.submissionId)) return "Invalid submission.";
  return null;
}

function formatEmailText(payload: ContactPayload): string {
  return [
    "New enquiry submitted through the 6D Address website.",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    "",
    "Message:",
    payload.message,
  ].join("\n");
}

async function sendNotification(
  payload: ContactPayload,
  env: ContactEnvironment,
  fetcher: Fetcher,
): Promise<boolean> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();
  const from = env.CONTACT_EMAIL_FROM?.trim();
  const recipients = parseRecipients(env.CONTACT_EMAIL_TO ?? "");

  if (!accountId || !apiToken || !from || recipients.length === 0) return false;
  if (!isValidEmail(from) || recipients.some((recipient) => !isValidEmail(recipient))) return false;

  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: recipients,
        from: { address: from, name: "6D Address" },
        reply_to: payload.email,
        subject: "New 6D Address enquiry",
        text: formatEmailText(payload),
      }),
    },
  );

  if (!response.ok) return false;

  const result = await response.json().catch(() => null) as {
    success?: boolean;
    result?: { delivered?: string[]; queued?: string[]; permanent_bounces?: string[] };
  } | null;

  const delivered = result?.result?.delivered?.length ?? 0;
  const queued = result?.result?.queued?.length ?? 0;
  const bounced = result?.result?.permanent_bounces?.length ?? 0;
  return result?.success === true && bounced === 0 && delivered + queued === recipients.length;
}

export async function handleContactRequest(
  request: Request,
  env: ContactEnvironment,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!origin || origin !== requestUrl.origin) {
    return jsonResponse({ success: false, message: "Request origin was not accepted." }, 403);
  }

  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ success: false, message: "Malformed request." }, 415);
  }

  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ success: false, message: "Request is too large." }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ success: false, message: "Malformed request." }, 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ success: false, message: "Request is too large." }, 413);
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ success: false, message: "Malformed request." }, 400);
  }

  const payload = parsePayload(decoded);
  if (!payload) return jsonResponse({ success: false, message: "Malformed request." }, 400);

  // Silently accept honeypot submissions so automated senders receive no useful signal.
  if (payload.website) return jsonResponse({ success: true }, 200);

  const validationError = validatePayload(payload);
  if (validationError) return jsonResponse({ success: false, message: validationError }, 400);

  const now = Date.now();
  cleanExpiredSubmissionIds(now);
  if (acceptedSubmissionIds.has(payload.submissionId)) {
    return jsonResponse({ success: true, duplicate: true }, 200);
  }

  try {
    const delivered = await sendNotification(payload, env, fetcher);
    if (!delivered) return jsonResponse({ success: false, message: "We couldn't send your message. Please try again." }, 502);
  } catch {
    return jsonResponse({ success: false, message: "We couldn't send your message. Please try again." }, 502);
  }

  acceptedSubmissionIds.set(payload.submissionId, now);
  return jsonResponse({ success: true }, 200);
}

export const onRequest = ({ request, env }: PagesContext): Promise<Response> =>
  handleContactRequest(request, env);
