# Kinship

Kinship is a private family archive for preserving relationships, memories, events, files, and the conversations that make those records useful. A family can create a shared space, invite relatives, upload media and documents, record dates and context, and ask questions of the resulting archive.

The application is a React/Vite client backed by a Fastify API. Supabase provides user authentication only. Kinship's profiles, family graph, memberships, invitations, archive metadata, retrieval context, sessions for the optional server-managed auth flow, and saved Ask Kinship conversations are application data stored through the Kinship repository layer. In the deployed stack, that repository is the self-hosted HydraDB OSS graph database, with Cloudflare R2 as HydraDB's durable object store.

Kinship does not use the hosted HydraDB API. The repository runs the open source `ghcr.io/hydra-db/hydradb` container and talks directly to that instance over its authenticated HTTP/OpenCypher API.

See [architecture.md](architecture.md) for request flows, the graph model, trust boundaries, failure behavior, and deployment topology. See [server/README.md](server/README.md) for the API contract.

## User-facing features

- Supabase email/password sign-up, confirmation, sign-in, session restoration, and sign-out.
- Profile onboarding with gender, phone number, and birthday fields.
- Multiple family spaces with owner, admin, and member roles.
- Family membership through shareable invite codes or expiring, optionally email-bound invitations.
- Per-viewer relationship labels between family members.
- Memory albums with dates, descriptions, and one or more photos.
- Family events with category, date, location, description, and optional image.
- A shared file archive for documents, PDFs, audio, images, video, spreadsheets, and other files, including preview, download, and rename flows.
- Ask Kinship, which retrieves evidence from one authorized family archive and asks Gemini to answer from that evidence only.
- Per-user, per-family saved Ask Kinship conversations.
- Responsive desktop and mobile navigation.

Some screens still mix persisted records with demonstration content. In particular, the activity feed is static demonstration data, and the events and files views append demonstration records to live API records. The family tree presentation is not yet a general graph traversal/editor. These limitations are important when evaluating the current build.

## How HydraDB powers Kinship

`server/repository.ts` selects `HydraDbRepository` when `DATA_PROVIDER=hydradb`. The adapter in `server/repositories/hydradb.ts` implements the complete `KinshipRepository` interface. It issues parameterized OpenCypher statements through `HydraDbClient`; there is no Supabase database fallback and no hosted HydraDB SDK.

For each query, the client sends:

```text
POST {HYDRADB_HTTP_URL}/v1/graphs/{HYDRADB_GRAPH_ID}/query
Authorization: Bearer {HYDRADB_AUTH_TOKEN}
X-Graph-Namespace: {HYDRADB_NAMESPACE}
Content-Type: application/json

{
  "cell_id": "{HYDRADB_CELL_ID}",
  "query": "parameterized OpenCypher",
  "parameters": { ... },
  "consistency": "causal or strong"
}
```

The client applies 10 second query timeouts, decodes HydraDB's typed row values, and uses `/healthz` for the application health dependency check. Writes use application UUIDs as `appId` properties and numeric `vertexId` values as HydraDB vertex IDs. Batched `UNWIND` statements create vertices and edges; parameterized `MATCH`, `MERGE`, `SET`, and `DETACH DELETE` statements implement reads and mutations.

HydraDB stores two kinds of archive context:

1. Canonical records such as memories, events, files, members, and conversations.
2. `SourceChunk` vertices produced when a memory, event, or file is ingested.

Ask Kinship loads up to 100 recent source chunks plus current memories, events, files, and members. The API deduplicates candidates, ranks them with deterministic title/content term matching, takes up to eight items, and sends only that family-scoped evidence to Gemini. This is grounded text retrieval, not vector search or arbitrary full-graph generation.

Cloudinary and R2 serve different purposes. Cloudinary stores and delivers uploaded user media. HydraDB stores the media URLs, descriptions, ownership, family scope, photo containment edges, and retrieval text. R2 is configured behind HydraDB and stores HydraDB's durable database objects; users do not upload family files directly to that bucket.

## Without HydraDB

The code includes `MemoryRepository` for tests and lightweight API development, but it is process-local, non-durable, and starts empty. It is not a production-equivalent database.

Without HydraDB, the deployed product fails or becomes materially weaker in these concrete ways:

- Restarting the API deletes all Kinship application state when the memory provider is used: synchronized profiles, families, membership, relationship labels, invitations, memory metadata, events, file metadata, source chunks, and conversations.
- Multiple API processes do not share state. A request routed to another process can see a different user, family, or archive, making horizontal scaling invalid.
- Family authorization cannot rely on a durable membership graph. Membership changes disappear on restart and differ across processes.
- Ask Kinship loses its preserved retrieval corpus and canonical family records. Gemini either receives no useful evidence or receives only records created during the current process lifetime.
- Saved conversations disappear, so Ask Kinship has no durable per-user history.
- Cloudinary assets may still physically exist, but Kinship loses their family association, title, dates, uploader, description, and containment relationships. The media becomes operationally orphaned.
- R2-backed recovery and compute replacement are lost. A fresh API process cannot reconstruct the archive from disposable memory.
- Graph-native evolution, including deeper kinship traversals and context expansion, is reduced to ad hoc in-process collections rather than persistent vertices and edges.

Supabase cannot fill this gap in the current architecture because it is deliberately used for authentication only. No Kinship application tables, family records, archive records, or retrieval context are stored in Supabase.

## Infrastructure

| Component | Current responsibility |
| --- | --- |
| React 19 and Vite | Browser UI, routing, Supabase session acquisition, direct Cloudinary upload |
| Fastify 5 | Validation, authorization, API orchestration, retrieval, provider integrations |
| Supabase Auth | Identity verification and browser sessions only |
| HydraDB OSS | Primary application graph, archive metadata, context records, conversations, and optional server-auth records |
| Cloudflare R2 | S3-compatible durable object storage underneath HydraDB |
| Cloudinary | User-uploaded image, audio, video, and document bytes |
| Gemini | Evidence-grounded response generation for Ask Kinship |
| Resend | Optional invitation delivery; also supports legacy API email verification/reset routes |

## Prerequisites

- Node.js 22 or a compatible current Node.js release.
- npm 10 or a compatible npm release.
- Docker with Docker Compose v2 for the HydraDB stack.
- A Cloudflare R2 bucket and S3 API credentials for the Compose HydraDB service.
- A Supabase project with email/password authentication enabled.
- A Cloudinary cloud and restricted unsigned upload preset for uploads.
- Optional Gemini and Resend credentials for generated answers and delivered email.

## Environment variables

Start from `.env.example`, but replace every placeholder before using HydraDB or production mode. Never commit `.env`, the generated `.codespaces/hydradb-token`, or secret values.

Application and API:

```dotenv
NODE_ENV=
API_HOST=
API_PORT=
APP_ORIGIN=
SESSION_COOKIE_NAME=
SESSION_TTL_DAYS=
PASSWORD_PEPPER=
DATA_PROVIDER=
```

Supabase Auth only:

```dotenv
SUPABASE_URL=
SUPABASE_ANON_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

HydraDB application connection:

```dotenv
HYDRADB_HTTP_URL=
HYDRADB_AUTH_TOKEN=
HYDRADB_NAMESPACE=
HYDRADB_GRAPH_ID=
HYDRADB_CELL_ID=
HYDRADB_CONSISTENCY=
```

HydraDB's R2/S3-compatible storage:

```dotenv
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
AWS_REGION=
```

Media, generation, and email:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
GEMINI_API_KEY=
GEMINI_MODEL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

`R2_ACCOUNT_ID` is documented for credential management but is not directly consumed by `compose.yaml`; `R2_ENDPOINT` carries the account-specific S3 endpoint. The Compose stack maps R2 values to HydraDB's `AWS_*` variables because R2 implements the S3 API.

## Deployment

Kinship's development deployment runs three processes: HydraDB OSS in Docker, the Fastify API in Docker, and Vite on the host. The API connects to HydraDB over the private Compose network at `http://hydradb:8443`; Vite proxies browser `/api` requests to Fastify on port `3001`. HydraDB's HTTP, Bolt, and admin ports are not published to the host.

### Deploy with Docker in GitHub Codespaces

1. Open the repository in a Codespace with Docker and Docker Compose v2 support.
2. Add the repository's Codespaces secrets. Use the names in the environment-variable section above. At minimum, provide the HydraDB auth token, R2 credentials, Supabase URL and keys, `PASSWORD_PEPPER`, Cloudinary values, and Gemini key.
3. From the repository root, install Node dependencies:

```bash
npm ci
```

4. Start HydraDB and the API with the checked-in bootstrap script:

```bash
bash scripts/start-codespace.sh
```

The script derives the Codespaces frontend origin from `CODESPACE_NAME` and `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`, writes `HYDRADB_AUTH_TOKEN` to the ignored `.codespaces/hydradb-token` file, and runs `docker compose up -d --build --force-recreate`.

5. Start Vite in a second terminal:

```bash
npm run dev
```

6. In the Codespaces Ports panel, forward port `5173` and open the generated HTTPS URL. It must match the `APP_ORIGIN` printed by `start-codespace.sh`.
7. Verify the API and both containers:

```bash
docker compose ps
curl http://127.0.0.1:3001/api/health
```

The health response must report `"dataProvider":"hydradb"`. The API is ready when HydraDB and the API containers are running and Vite is serving port `5173`.

To replace a Codespaces secret, update it in the repository's **Settings -> Secrets and variables -> Codespaces**, restart the Codespace, and run the bootstrap script again. Do not put secret values in the repository or commit `.env` files.

### Deploy with Docker on a local machine

This flow is for Linux, macOS, or Windows with Docker Desktop, Docker Compose v2, Node.js 22+, and npm 10+ installed. It uses the same HydraDB OSS and API containers but does not depend on Codespaces variables.

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/TimothyBayode/Kinship/
cd Kinship
npm ci
```

2. Create the local environment file:

```bash
cp .env.example .env
```

3. Open `.env` and replace every placeholder. For local browser development, use these values:

```dotenv
NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=3001
APP_ORIGIN=http://127.0.0.1:5173
DATA_PROVIDER=hydradb
HYDRADB_HTTP_URL=http://127.0.0.1:8443
```

Also replace the empty values for `HYDRADB_AUTH_TOKEN`, `PASSWORD_PEPPER`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`, and `GEMINI_API_KEY`. Keep `HYDRADB_NAMESPACE=kinship`, `HYDRADB_GRAPH_ID=kinship`, and `HYDRADB_CELL_ID=cell-0` unless your HydraDB setup uses different identifiers.

4. Load the `.env` values into the shell for the bootstrap script. If a value contains spaces or shell punctuation, quote that value in `.env` first:

```bash
set -a
source .env
set +a
```

5. Start HydraDB and the Fastify API:

```bash
bash scripts/start-codespace.sh
```

The script name is retained for compatibility; on a local machine it only creates the ignored token file and starts Docker Compose. It does not require Codespaces when `APP_ORIGIN` is already set.

6. Start the Vite frontend:

```bash
npm run dev
```

Open `http://127.0.0.1:5173` and verify the backend:

```bash
docker compose ps
curl http://127.0.0.1:3001/api/health
```

For a clean restart without deleting HydraDB data, use:

```bash
docker compose down
bash scripts/start-codespace.sh
```

Do not use `docker compose down -v` unless you intentionally want to remove Docker volumes. HydraDB's durable graph data belongs in the configured R2 bucket, but preserving local volumes avoids unnecessary cache rebuilds.

## Lightweight local API mode

For API tests or development without Docker, use the in-memory provider:

```bash
npm ci
npm run dev:api
npm run dev
```

Set `DATA_PROVIDER=memory`. This mode is intentionally non-durable and should not be used to demonstrate HydraDB integration or deploy Kinship.

## Build and test

```bash
npm run test:api
npm run build:api
npm run build
npm run lint
```

The current API tests use Fastify injection and `MemoryRepository`; they cover legacy registration/login/cookie sessions, family creation, memory ingestion, retrieval authorization, logout, and origin rejection. They do not exercise a real HydraDB container, R2 durability, Supabase token validation, Cloudinary, Gemini, Resend, or browser flows. A production release should add integration and end-to-end coverage for those boundaries.

## Deployment outline

The development topology can move from Codespaces to an EC2 Linux host with Docker Compose:

1. Provision an EC2 instance with Docker, Compose v2, HTTPS ingress, persistent operational logging, and enough memory for the API and HydraDB.
2. Store secrets in a managed secret facility or root-readable environment file outside the repository.
3. Pin the HydraDB image to a tested version or digest instead of `latest`.
4. Keep HydraDB ports private; publish only the reverse-proxied frontend/API surface.
5. Configure R2 credentials and bucket lifecycle/recovery policy, then start HydraDB before the API.
6. Build and serve the Vite static output, and route `/api` to the Fastify service.
7. Set `NODE_ENV=production`, exact `APP_ORIGIN`, HTTPS, a production pepper, Supabase values, and all required provider settings.
8. Add health checks, restarts, monitoring, R2 recovery tests, Cloudinary restrictions, and deployment rollback procedures.

The checked-in Compose file is development-oriented: it enables HydraDB plaintext inside the private Compose network, uses `latest`, runs the API in development mode, and does not include a frontend container or public TLS proxy. Do not expose it unchanged to the Internet.

## Attribution and limitations

Kinship uses [HydraDB](https://github.com/hydra-db/hydradb), an object-store-native distributed graph database written in Rust and licensed under the GNU Affero General Public License v3.0. This project consumes the upstream OSS container as a separate service and does not use HydraDB's hosted API. Review the upstream license and source-offer obligations before distribution or public network deployment, especially if HydraDB is modified. This note is not legal advice.

Current technical limitations include:

- Retrieval is deterministic lexical ranking over recent family-scoped records, not semantic/vector retrieval.
- Source chunks contain submitted metadata and descriptions; Kinship does not extract text from uploaded file bytes or transcribe audio/video.
- Some user interface views include demonstration records, and the activity feed is not API-backed.
- The Google button is displayed but does not currently start an OAuth flow.
- Cloudinary uploads are unsigned and occur from the browser; preset restrictions are an essential security control.
- Invitation codes are bearer capabilities. Email-bound invitations triggers domain name verification from Resend, while general family invite codes do not expire in the current code.
- The API's legacy cookie-auth routes remain implemented, but the current browser uses Supabase Auth.
- The Compose topology is a single HydraDB data node without a separately deployed indexer or high-availability arrangement.
