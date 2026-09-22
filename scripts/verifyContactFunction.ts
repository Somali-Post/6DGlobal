import assert from "node:assert/strict";
import { handleContactRequest } from "../functions/api/contact.ts";

const origin = "https://preview.example.pages.dev";
const env = {
  CLOUDFLARE_ACCOUNT_ID: "account-id",
  CLOUDFLARE_EMAIL_API_TOKEN: "test-token",
  CONTACT_EMAIL_FROM: "contact@6daddress.com",
  CONTACT_EMAIL_TO: "one@example.com,two@example.com,three@example.com",
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Visitor",
    email: "visitor@example.com",
    message: "Please tell me more about 6D Address.",
    website: "",
    submissionId: crypto.randomUUID(),
    ...overrides,
  };
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function successfulEmailResponse(): Response {
  return Response.json({
    success: true,
    result: {
      delivered: ["one@example.com", "two@example.com"],
      queued: ["three@example.com"],
      permanent_bounces: [],
    },
  });
}

{
  let emailRequest: Request | undefined;
  const response = await handleContactRequest(request(payload()), env, async (input, init) => {
    emailRequest = new Request(input, init);
    return successfulEmailResponse();
  });
  assert.equal(response.status, 200, "valid submissions should be accepted");
  assert.ok(emailRequest, "valid submissions should call the email API");
  assert.match(emailRequest.url, /\/accounts\/account-id\/email\/sending\/send$/);
  assert.equal(emailRequest.headers.get("Authorization"), "Bearer test-token");
  const emailBody = await emailRequest.json() as Record<string, unknown>;
  assert.deepEqual(emailBody.to, ["one@example.com", "two@example.com", "three@example.com"]);
  assert.deepEqual(emailBody.from, { address: "contact@6daddress.com", name: "6D Address" });
  assert.equal(emailBody.reply_to, "visitor@example.com");
  assert.equal(emailBody.subject, "New 6D Address enquiry");
}

{
  const response = await handleContactRequest(request(payload({ name: "" })), env, async () => successfulEmailResponse());
  assert.equal(response.status, 400, "missing required fields should be rejected");
}

{
  const response = await handleContactRequest(request(payload({ email: "not-an-email" })), env, async () => successfulEmailResponse());
  assert.equal(response.status, 400, "invalid email addresses should be rejected");
}

{
  const response = await handleContactRequest(request(payload({ message: "x".repeat(5_001) })), env, async () => successfulEmailResponse());
  assert.equal(response.status, 400, "oversized messages should be rejected");
}

{
  const response = await handleContactRequest(request(payload(), { "Content-Length": "20000" }), env, async () => successfulEmailResponse());
  assert.equal(response.status, 413, "oversized request bodies should be rejected before parsing");
}

{
  let emailCalls = 0;
  const response = await handleContactRequest(request(payload({ website: "spam.example" })), env, async () => {
    emailCalls += 1;
    return successfulEmailResponse();
  });
  assert.equal(response.status, 200, "honeypot submissions should be silently accepted");
  assert.equal(emailCalls, 0, "honeypot submissions should not send email");
}

{
  const response = await handleContactRequest(request(payload()), env, async () => new Response("upstream failure", { status: 503 }));
  assert.equal(response.status, 502, "email delivery failures should be reported as gateway failures");
  assert.deepEqual(await response.json(), { success: false, message: "We couldn't send your message. Please try again." });
}

{
  let emailCalls = 0;
  const duplicatePayload = payload();
  const send = async () => {
    emailCalls += 1;
    return successfulEmailResponse();
  };
  const first = await handleContactRequest(request(duplicatePayload), env, send);
  const duplicate = await handleContactRequest(request(duplicatePayload), env, send);
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200, "duplicate retries should receive the original accepted outcome");
  assert.equal(emailCalls, 1, "duplicate retries should not send another email in the same isolate");
}

{
  const malformed = await handleContactRequest(request("{"), env, async () => successfulEmailResponse());
  assert.equal(malformed.status, 400, "malformed JSON should be rejected");

  const wrongOrigin = await handleContactRequest(
    request(payload(), { Origin: "https://attacker.example" }),
    env,
    async () => successfulEmailResponse(),
  );
  assert.equal(wrongOrigin.status, 403, "cross-origin requests should be rejected");

  const wrongMethod = await handleContactRequest(new Request(`${origin}/api/contact`), env, async () => successfulEmailResponse());
  assert.equal(wrongMethod.status, 405, "non-POST requests should be rejected");
}

console.log("Contact Function verification passed.");
