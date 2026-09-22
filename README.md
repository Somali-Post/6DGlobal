# 6D Address Open Website

Clean React/Vite rebuild for 6D Address / 6D Global. The site positions 6D as an open addressing method: a six-digit reference plus locality information.

## Run Locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

The Google Maps key is read by Vite at build/dev time. Do not commit `.env` or `.env.local`.

## Cloudflare Pages Deployment

The Cloudflare Pages project builds from the repository root with `npm run build` and publishes `dist`. Keep the Google Maps key in the Pages build environment. The tracked `public/_redirects` rule continues to serve the single-page app for routes such as `/find`, while `public/_headers` retains long-lived caching for static assets. The root-level `functions` directory is discovered automatically by Pages and does not need a separate build command.

## Clean Sharing

Use `git archive` to create a clean ZIP. Do not manually zip the working folder because it may include `.env.local`, `.git`, build cache files or local artifacts.

```bash
git archive --format=zip --output=../6daddressDan-clean.zip HEAD
```

## Map Provider

The finder route (`/find`) uses Google Maps through `src/map/googleMapsAdapter.ts`. If `VITE_GOOGLE_MAPS_API_KEY` is not set, the page falls back to a non-provider preview grid so the address UI and 6D calculation can still be tested locally.

`/find` opens the full-page map without selecting a location. It shows an empty state until the user clicks the map or chooses current location. `/find?locate=1` requests browser geolocation once, then creates the 6D address only after a real coordinate is approved.

Required Google APIs for the live map:

- Maps JavaScript API
- Places API
- Geocoding API

Recommended Google Console HTTP referrers for local development:

- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`

Production referrer examples:

- `https://6daddress.com/*`
- `https://www.6daddress.com/*`

## Somalia District Boundaries

The reference zip includes `public/data/somalia.geojson`, which is a Somalia country boundary, not district boundaries. For authoritative district/locality resolution, place district polygons at:

```text
public/data/somalia_districts.geojson
```

Expected feature properties are `NAME_2` for district and `NAME_1` for region. Until that dataset is supplied, the map uses filtered Google reverse-geocode locality fields and does not display POI, building, ministry, or commercial place names as the 6D address line.

## How 6D Is Calculated

The implementation in `src/lib/sixd.ts` follows the reference project logic:

1. Snap the selected coordinate to the centre of a `0.0001` degree grid cell.
2. Take absolute latitude and longitude.
3. Pair the 2nd, 3rd, and 4th decimal digits of latitude and longitude.
4. Format them as `dd-dd-dd`.

Example shape:

```text
lat decimal digits: 0, 4, 6, 9
lng decimal digits: 3, 1, 8, 2
6D reference: 43-61-98
```

The first decimal digit pair is retained as a helper suffix in the UI, but the complete public address is:

```text
Road / landmark
six-digit reference + locality
city / region / country
```

A six-digit reference alone is not globally unique.

## Contact Form

The contact form sends same-origin JSON requests to the Cloudflare Pages Function at `POST /api/contact`. Email delivery uses the Cloudflare Email Service REST API because Pages Functions do not list the Workers `send_email` binding among their supported bindings.

Configure these values for both preview and production under **Workers & Pages > 6dglobal > Settings > Variables and Secrets**:

```text
CLOUDFLARE_ACCOUNT_ID=<Cloudflare account ID>
CLOUDFLARE_EMAIL_API_TOKEN=<encrypted secret>
CONTACT_EMAIL_FROM=<authorized sender on the sending domain>
CONTACT_EMAIL_TO=<three verified recipients, comma-separated>
```

Create the API token with the account-level **Email Sending: Edit** permission and store it as an encrypted secret. The other three values are non-secret environment variables. In **Compute > Email Service > Email Sending**, onboard the sender domain and wait until its Cloudflare-managed SPF, DKIM, bounce MX, and DMARC records are ready. The configured sender must belong to that onboarded domain. Before a sending domain is onboarded, Cloudflare limits delivery to account-verified destination addresses.

For local Function testing, copy `.dev.vars.example` to `.dev.vars`, use non-production credentials only when a real send is intended, then run:

```bash
npm run build
npm run dev:pages
```

The handler validates origin, content type, body size, required values, email format, and field lengths. It retains a honeypot and performs best-effort ten-minute idempotency within a warm Function isolate. Turnstile is intentionally deferred to keep the form unobtrusive; the public endpoint still has distributed spam and rate-abuse risk, so enable a Cloudflare WAF rate-limiting rule for `/api/contact` and add server-validated Turnstile if abuse appears.

Historical Netlify submissions are not migrated by this change.
