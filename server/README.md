# Kinship API

The Kinship API is a Fastify 5 and TypeScript service that authenticates users, enforces family boundaries, persists the family archive through a repository abstraction, prepares retrieval context, and coordinates Cloudinary, Gemini, and Resend.

In the product deployment, the repository is self-hosted HydraDB OSS backed by Cloudflare R2. Supabase is authentication only. The API does not use Supabase tables and does not use the hosted HydraDB API.

## Current responsibilities

- Validate Supabase access tokens and synchronize auth identities into Kinship user profiles.
- Support the retained API-managed email/password and cookie-session flow.
- Create and update profiles, families, memberships, relative relationship labels, and invitations.
- Persist memory albums/photos, events, file metadata, retrieval chunks, and conversations.
- Enforce authenticated family scope and owner/admin invitation permissions.
- Return constrained Cloudinary unsigned-upload configuration.
- Retrieve family evidence and request grounded Gemini responses.
- Optionally deliver invitations, verification links, and password-reset links with Resend.
- Apply request validation, origin checks, CORS, rate limits, health checks, and normalized errors.

## Runtime

`server/index.ts` loads and validates configuration, creates the selected repository, builds Fastify, and listens on `API_HOST:API_PORT`.

```bash
npm ci
npm run dev:api
```

The development default is `http://127.0.0.1:3001`. `tsx watch` reloads TypeScript sources. Vite normally runs separately with `npm run dev` and proxies `/api` to this address.

Build and run compiled output:

```bash
npm run build:api
npm run start:api
```

`Dockerfile.api` performs the same API build on Node 22 and starts `server-dist/index.js`.

## Configuration

Configuration is parsed by `server/config.ts`. Do not put secret values in documentation, source control, frontend variables, logs, or API responses.

| Variable | Required/Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production`; controls logging, proxy trust, secure cookies, and provider failure behavior |
| `API_HOST` | `127.0.0.1` | Listen address |
| `API_PORT` | `3001` | Listen port |
| `APP_ORIGIN` | `http://127.0.0.1:5173` | Exact allowed browser origin and email-link base URL |
| `SESSION_COOKIE_NAME` | `kinship_session` | Legacy opaque-session cookie name |
| `SESSION_TTL_DAYS` | `30` | Legacy session lifetime |
| `PASSWORD_PEPPER` | Development fallback | Server-side password/HMAC secret; minimum effective production hygiene is a strong random value |
| `SUPABASE_URL` | Optional pair | Supabase project URL used only for Auth token validation |
| `SUPABASE_ANON_KEY` | Optional pair | Supabase Auth anon key; must be configured with `SUPABASE_URL` |
| `DATA_PROVIDER` | `memory` | `memory` or `hydradb` |
| `HYDRADB_HTTP_URL` | `http://127.0.0.1:8443` | Self-hosted HydraDB OSS HTTP base URL |
| `HYDRADB_AUTH_TOKEN` | Required for HydraDB | HydraDB bearer token, at least 32 characters when selected |
| `HYDRADB_NAMESPACE` | `kinship` | `X-Graph-Namespace` value |
| `HYDRADB_GRAPH_ID` | `kinship` | Graph path segment |
| `HYDRADB_CELL_ID` | `cell-0` | Query request cell |
| `HYDRADB_CONSISTENCY` | `causal` | `causal` or `strong` |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud returned to authenticated upload clients |
| `CLOUDINARY_UPLOAD_PRESET` | Optional | Restricted unsigned preset returned to authenticated upload clients |
| `GEMINI_API_KEY` | Optional in development | Gemini server credential; required for production chat |
| `GEMINI_MODEL` | `gemini-3.6-flash` | Generation model |
| `RESEND_API_KEY` | Optional | Email delivery credential |
| `RESEND_FROM_EMAIL` | Placeholder default | Sender address; production delivery requires a permitted sender/domain |

The API configuration does not read `VITE_SUPABASE_*` or `R2_*` directly. Compose maps `VITE_SUPABASE_*` into API `SUPABASE_*`, and passes R2 values to the HydraDB container as S3-compatible `AWS_*` settings.

Production rejects the checked-in development pepper prefix. HydraDB mode rejects bearer tokens shorter than 32 characters. Supabase URL/key must be both present or both absent.

## Local and Codespaces modes

### In-memory API development

Set `DATA_PROVIDER=memory`, then run:

```bash
npm run dev:api
```

The memory repository is process-local and loses every record on restart. It is intended for tests and route development only.

### HydraDB through Docker Compose

From the repository root, provide all variables required by `compose.yaml`, create the ignored HydraDB token file, and start the services:

```bash
mkdir -p .codespaces
umask 077
printf '%s\n' "$HYDRADB_AUTH_TOKEN" > .codespaces/hydradb-token
docker compose up -d --build
docker compose ps
```

Compose forces the API to `DATA_PROVIDER=hydradb` and `HYDRADB_HTTP_URL=http://hydradb:8443`. HydraDB is reachable only inside the Compose network. Its graph is durable in the configured R2 bucket; the named Docker volume is a local cache.

### Codespaces

Configure Codespaces secrets, then run:

```bash
npm ci
bash scripts/start-codespace.sh
npm run dev
```

The script derives the forwarded Vite `APP_ORIGIN`, writes the ignored token file with restrictive permissions, and starts HydraDB and the API. It does not start Vite. The repository currently has no `.devcontainer` file, so Docker availability depends on the Codespace environment used.

## Authentication

### Current frontend path: Supabase bearer token

The browser authenticates directly with Supabase Auth and sends:

```http
Authorization: Bearer <supabase-access-token>
```

For every protected request, `SupabaseAuthService` calls `supabase.auth.getUser`. A valid identity is resolved to a repository user by ID, then email. If neither exists, the API creates a Kinship `User` record using the Supabase identity ID. The placeholder `passwordHash` on such a user is never used for bearer-token authentication.

`POST /api/auth/sync` makes this synchronization explicit. Supabase remains authentication only; the resulting Kinship profile is stored in HydraDB when HydraDB is selected.

### Retained server-managed path

When no valid Supabase bearer identity is present, protected routes try the configured cookie. The legacy path provides:

- Argon2id password hashes with `PASSWORD_PEPPER`.
- Random 32-byte opaque session tokens.
- SHA-256 session-token hashes in the repository.
- `HttpOnly`, `SameSite=Strict` cookies; `Secure` in production.
- HMAC-SHA256 email verification and reset tokens.
- Expired-session cleanup during cookie authentication.

The current React authentication page does not use these registration/login routes. They remain implemented and tested as an alternate API surface.

## Repository abstraction

`KinshipRepository` in `server/domain.ts` is the API's data boundary. Route and service code receives that interface rather than a database client. `server/repository.ts` selects:

- `MemoryRepository` for non-durable tests/development.
- `HydraDbRepository` for the real application graph and archive.

The interface includes all user, session, family, membership, invitation, archive, context, and conversation operations. Authorization is split between route handlers and repository methods. Callers must not treat low-level methods such as `createSourceChunk` or `listSourceChunks` as independently authorized public operations.

## HydraDB query contract

`HydraDbClient.query(query, parameters)` sends parameterized OpenCypher to the locally/self-hosted OSS service:

```http
POST /v1/graphs/{HYDRADB_GRAPH_ID}/query
Authorization: Bearer {HYDRADB_AUTH_TOKEN}
X-Graph-Namespace: {HYDRADB_NAMESPACE}
Content-Type: application/json
```

```json
{
  "cell_id": "HYDRADB_CELL_ID",
  "query": "MATCH ... WHERE ... = $parameter RETURN ...",
  "parameters": {
    "parameter": "value"
  },
  "consistency": "causal"
}
```

Contract details:

- Graph ID is URL-encoded in the request path.
- Every query is authenticated and namespace-scoped.
- Query parameters are serialized separately from OpenCypher text.
- The consistency value is `causal` or `strong`.
- Client timeout is 10 seconds per query.
- Non-2xx responses throw an error containing status and HydraDB response text; Fastify logs the exception and normally returns a generic production `500`.
- Typed HydraDB rows are decoded by matching `columns` to row entries. `null` and nested `list` values receive special decoding; all other values return their `value` field.
- `health()` calls HydraDB `GET /healthz` with a 3 second timeout.
- The client does not currently consume response bookmarks or use streaming NDJSON/Bolt.

`HydraDbRepository` stores UUID/string application IDs as `appId` and random numeric vertex IDs as both the HydraDB `id` and `vertexId`. It uses `UNWIND` for batched vertex/edge writes and `MATCH`, `MERGE`, `SET`, and `DETACH DELETE` for operations. The adapter implements actual product persistence; it is not a stub, health-only integration, or hosted service redirect.

## Routes

All routes below are defined in `server/app.ts`. Except `GET /api/health` and the initial legacy auth operations, product routes require either a valid Supabase bearer token or valid legacy session cookie.

### Health and profile

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | None | `200 { status, dataProvider, supabaseAuth }`; repository health must pass |
| `POST` | `/api/auth/sync` | Auth header/cookie | `200 { user }`; creates missing Supabase-backed Kinship user |
| `PATCH` | `/api/profile` | `{ gender, phone, birthday }` | `200 { user }`; marks profile complete |

`gender` is `female`, `male`, `non-binary`, or `prefer-not-to-say`; `birthday` is an ISO date.

### Authentication

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `{ name, email, password }` | `201 { user, emailDelivery }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `200 { user }` and session cookie |
| `POST` | `/api/auth/logout` | Session cookie if present | `204`; deletes session and clears cookie |
| `GET` | `/api/auth/me` | Auth header/cookie | `200 { user }` |
| `POST` | `/api/auth/verify-email` | `{ token }` | `204` |
| `POST` | `/api/auth/forgot-password` | `{ email }` | `202` with non-enumerating message |
| `POST` | `/api/auth/reset-password` | `{ token, password }` | `204` |

Passwords are 8 to 128 characters. Registration and forgot-password allow 5 attempts per 15 minutes; login allows 10 per 15 minutes.

### Families and members

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/families` | Auth | `200 { families }`; generates/persists missing invite codes |
| `POST` | `/api/families` | `{ name, pictureUrl? }` | `201 { family }`; caller becomes owner |
| `GET` | `/api/families/:familyId/members` | UUID path | `200 { members }` |
| `POST` | `/api/families/:familyId/invite-code` | UUID path | `200 { inviteCode }` |
| `POST` | `/api/families/join` | `{ code }` | `200 { familyId }` |
| `PATCH` | `/api/families/:familyId/members/:memberId/relationship` | `{ relationship }` | `204` |

Family names are 2 to 100 characters. Invite codes are normalized to uppercase. General family invite codes do not currently expire.

### Invitations

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `POST` | `/api/invitations` | `{ familyId, email?, relationship }` | `201 { invitation, delivery }` |
| `GET` | `/api/invitations/:code` | Invite code path | `200 { invitation }` |
| `POST` | `/api/invitations/:code/accept` | Invite code path | `200 { familyId }` |

Creation requires owner/admin role. Invitations expire after seven days. When `invitedEmail` is non-empty, acceptance requires the authenticated user's lowercased email to match.

### Memories

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/memories?familyId=:uuid` | Family query | `200 { memories }` |
| `POST` | `/api/memories` | `{ familyId, title, description, memoryDate, photos }` | `201 { memory }` plus retrieval chunk |
| `POST` | `/api/memories/:memoryId/photos` | `{ familyId, photos }` | `200 { memory }` |

Memory creation requires 1 to 50 valid photo URLs. Appending accepts 1 to 50 URLs per request.

### Events

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/events?familyId=:uuid` | Family query | `200 { events }` |
| `POST` | `/api/events` | `{ familyId, title, description, category, eventDate, location, imageUrl }` | `201 { event }` plus retrieval chunk |

Category is `Birthday`, `Gathering`, `Anniversary`, or `Other`. `imageUrl` may be empty.

### Files

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/files?familyId=:uuid` | Family query | `200 { files }` |
| `POST` | `/api/files` | `{ familyId, name, description, mimeType, fileType, sizeBytes, url }` | `201 { file }` plus retrieval chunk |
| `PATCH` | `/api/files/:fileId` | `{ familyId, name }` | `200 { file }` |

`fileType` is `PDF`, `Audio`, `Spreadsheet`, `Document`, `Image`, `Video`, or `Other`. The API stores metadata and a URL; file bytes are uploaded directly from the browser to Cloudinary.

### Conversations

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/conversations?familyId=:uuid` | Family query | `200 { conversations }` for the current user |
| `PUT` | `/api/conversations/:conversationId` | Full conversation plus `familyId` | `200 { conversation }` |
| `DELETE` | `/api/conversations/:conversationId?familyId=:uuid` | Family query | `204` |

The path ID must equal the body ID on save. Messages are limited to 200 and persisted as one JSON property. Repository queries scope conversations by authenticated user and family.

### Upload and AI

| Method | Path | Request | Success |
| --- | --- | --- | --- |
| `GET` | `/api/uploads/cloudinary-config` | Auth | `200 { cloudName, uploadPreset, uploadUrl }` |
| `POST` | `/api/ai/chat` | `{ familyId, question, history? }` | `200 { content, sources }` |

AI chat allows 20 requests/minute, questions up to 8,000 characters, and up to 20 supplied history items. It verifies family membership before retrieval. Retrieval reads HydraDB-backed source chunks, memories, events, files, and members, applies deterministic term scoring, and sends up to eight matches to Gemini.

## Response and error behavior

Successful JSON responses use route-specific wrappers such as `{ user }`, `{ families }`, `{ memory }`, or `{ content, sources }`. Empty successes use `204`.

Errors have this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe client message",
    "details": []
  }
}
```

`details` appears for Zod validation failures only.

| Status | Typical codes/conditions |
| --- | --- |
| `400` | `VALIDATION_ERROR`, invalid/expired auth token |
| `401` | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| `403` | `ORIGIN_NOT_ALLOWED`, `FORBIDDEN`, `INVITATION_EMAIL_MISMATCH` |
| `404` | `FAMILY_NOT_FOUND`, `INVITATION_NOT_FOUND`, `MEMORY_NOT_FOUND`, `FILE_NOT_FOUND` |
| `409` | `EMAIL_EXISTS` |
| `415` | `INVALID_CONTENT_TYPE`; JSON routes require `application/json` |
| `500` | Provider/repository failures and uncaught errors |

In development, `INTERNAL_ERROR` may include the exception message. Production returns `The request could not be completed` and logs the underlying error server-side.

Authorization failures are not perfectly uniform: some repository-backed list methods return an empty list for a non-member, while route-level guards return `403` or `404`. Clients should use documented route behavior, not infer resource existence from one universal status.

## HTTP policy

- Global limit: 120 requests per minute.
- CORS origin: exact `APP_ORIGIN`, credentials enabled.
- Configured CORS methods: `GET`, `POST`, `DELETE`, and `OPTIONS`.
- Non-safe methods in non-development environments reject a supplied mismatched `Origin`.
- Fastify trusts proxy headers only in production.

The application implements `PATCH` and `PUT` routes even though those methods are absent from the configured CORS method list. Same-origin deployments are unaffected by CORS. A cross-origin production frontend requires correcting that configuration before these routes can pass browser preflight.

## Tests

Run:

```bash
npm run test:api
npm run build:api
```

`server/app.test.ts` uses Node's test runner, Fastify injection, and `MemoryRepository`. Current coverage verifies:

- Registration and duplicate-email handling.
- Invalid and valid legacy login.
- HTTP-only strict cookie creation.
- Authenticated profile lookup.
- Family and memory creation.
- Family role listing.
- Authorized retrieval behavior without Gemini.
- Logout/session deletion.
- Rejection of state-changing requests from another origin.

Current gaps include HydraDB query integration, R2 persistence/recovery, Supabase bearer-token sync, profile/membership/invitation route coverage, files/events/conversations, Cloudinary, Gemini, Resend, rate-limit behavior, and browser end-to-end tests.

## Production requirements

- Use `DATA_PROVIDER=hydradb`; never deploy `MemoryRepository` for persistent data.
- Run the open source HydraDB service under your control. Do not substitute claims about a hosted HydraDB API.
- Pin a tested HydraDB image version or digest instead of `latest`.
- Keep HydraDB HTTP, Bolt, and admin ports on a private network.
- Use TLS at public ingress and for any connection that leaves a trusted private network.
- Store `PASSWORD_PEPPER`, `HYDRADB_AUTH_TOKEN`, R2 credentials, Gemini key, and Resend key in managed secrets.
- Restrict R2 credentials to the intended bucket and test backup/recovery and lifecycle behavior.
- Restrict the Cloudinary unsigned preset by format, size, folder, and abuse controls.
- Set an exact HTTPS `APP_ORIGIN` and align CORS methods if frontend/API origins differ.
- Configure Supabase production redirect URLs and email confirmation policy.
- Configure a permitted Resend sender if email delivery is enabled.
- Add structured log collection, metrics, alerting, dependency health checks, and request tracing.
- Add idempotency/repair handling for routes that perform multiple HydraDB or provider operations.
- Review private-family data handling, retention, deletion, export, provider consent, and incident response.
- Review HydraDB's AGPL-3.0 license and source-availability obligations, especially for modified network deployments. This is not legal advice.

## Known limitations

- Ingestion operations are multi-query and not wrapped in one application-level transaction.
- Retrieval ranks submitted text metadata only; it does not parse or transcribe uploaded bytes.
- Conversation messages and memory photo URL lists are stored as JSON properties.
- The API supports two authentication paths, increasing maintenance and security surface.
- General family invite codes have no expiry or rotation endpoint.
- No audit log is implemented.
- No retry, circuit breaker, job queue, or idempotency-key support is implemented.
- The Compose deployment is one HydraDB node and is not a high-availability topology.

HydraDB attribution: <https://github.com/hydra-db/hydradb>, licensed upstream under GNU AGPL-3.0.
