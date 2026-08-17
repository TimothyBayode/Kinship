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

## Hackathon Track 03 positioning

Kinship is positioned for Track 03 as a product whose central data problem is graph-shaped, contextual, and durable: a family archive is not merely a folder of uploads. People belong to families, people describe relationships from their own perspective, memories contain photos, invitations connect future members to a family, and all of those records form the context used to answer questions.

HydraDB OSS is not included as a logo-only integration or replaceable demo lookup. It is the primary application and context database in the Docker/Codespaces deployment:

- Every synchronized user profile is written to HydraDB.
- Family creation writes a `Family` vertex and a `MEMBER_OF` edge from its owner.
- Joining a family creates another membership edge; relationship editing creates or updates a `RELATED_TO` edge.
- Memories create `Memory` and `Photo` vertices plus `CONTAINS` edges.
- Events, file metadata, invitations, retrieval chunks, and conversations are HydraDB vertices.
- Authorization checks traverse or query the user-to-family membership graph before family data is read or changed.
- Ask Kinship reads family-scoped records and context chunks from HydraDB before Gemini receives any archive evidence.
- HydraDB writes its graph records, WAL, manifests, and indexes to the configured Cloudflare R2 bucket. Local container storage is a disposable cache, not the durable source of truth.

This makes the Track 03 claim concrete: the OSS database owns product state, graph relationships, retrieval context, and durable continuity across compute replacement.

## Exactly how HydraDB powers Kinship

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

## Codespaces and Docker Compose

The repository does not currently contain a `.devcontainer` definition. Open it in a Codespace with Docker support, configure Codespaces secrets for the required values, and run from the repository root:

```bash
npm ci
bash scripts/start-codespace.sh
npm run dev
```

The script:

- Requires HydraDB, R2, Supabase, and pepper values.
- Derives `APP_ORIGIN` from the Codespace name and forwarding domain when available.
- writes the HydraDB bearer token to the ignored `.codespaces/hydradb-token` file with restrictive permissions.
- Builds and starts `hydradb` and `api` through `docker compose`.

Vite runs outside Compose on port `5173`; the API is bound to host loopback port `3001`. Vite proxies browser `/api` requests to the API. In Codespaces, make port `5173` visible at the same URL represented by `APP_ORIGIN`. HydraDB's HTTP, Bolt, and admin ports are exposed only to the Compose network, not published on the host.

For the same stack outside Codespaces, set `APP_ORIGIN` to the exact frontend origin, ensure all required variables are exported or available through `.env`, then run:

```bash
mkdir -p .codespaces
umask 077
printf '%s\n' "$HYDRADB_AUTH_TOKEN" > .codespaces/hydradb-token
docker compose up -d --build
npm ci
npm run dev
```

Use `docker compose ps` to inspect the two services and request `http://127.0.0.1:3001/api/health` to verify that the API can reach HydraDB. A healthy response reports `dataProvider: "hydradb"`.

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

- No real HydraDB integration test is included in the test suite.
- Retrieval is deterministic lexical ranking over recent family-scoped records, not semantic/vector retrieval.
- Source chunks contain submitted metadata and descriptions; Kinship does not extract text from uploaded file bytes or transcribe audio/video.
- Conversations and photo URL arrays are JSON-encoded properties on vertices rather than separate message graphs or fully normalized photo reads.
- Several user interface views include demonstration records, and the activity feed is not API-backed.
- The Google button is displayed but does not currently start an OAuth flow.
- Cloudinary uploads are unsigned and occur from the browser; preset restrictions are an essential security control.
- Invitation codes are bearer capabilities. Email-bound invitations add an address check, while general family invite codes do not expire in the current code.
- The API's legacy cookie-auth routes remain implemented, but the current browser uses Supabase Auth.
- The Compose topology is a single HydraDB data node without a separately deployed indexer or high-availability arrangement.
