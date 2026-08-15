# Kinship API

Node.js/TypeScript application backend for Kinship. The existing Vite frontend is intentionally not connected yet; backend work must not alter frontend behavior without approval.

## Responsibilities

- Email/password accounts using Argon2id password hashes
- Opaque HTTP-only cookie sessions; only SHA-256 token hashes are persisted
- Email verification and password reset through Resend
- Multi-family membership and authorization
- HydraDB graph persistence through its parameterized HTTPS/OpenCypher API
- Graph-scoped text retrieval followed by Gemini generation
- Cloudinary unsigned-upload configuration for user media

HydraDB's bearer token, Gemini key, and Resend key stay in this server. They are never returned to the browser.

## Local Development Without Docker

This PC does not currently have HydraDB's native `libcypher-parser` and GraphBLAS dependencies and has limited RAM. Use the in-memory repository while developing API behavior:

```bash
cp .env.example .env
npm run dev:api
```

Keep this setting:

```dotenv
DATA_PROVIDER=memory
```

The API listens on `http://127.0.0.1:3001` by default. In-memory data resets when the API process restarts.

Run verification:

```bash
npm run test:api
npm run build:api
```

## Native HydraDB Option

HydraDB can run without Docker, but Ubuntu/Linux requires:

```bash
sudo apt-get install -y \
  build-essential clang libclang-dev cmake pkg-config \
  libcypher-parser-dev libgraphblas-dev
cargo install just --locked
```

Then follow `/home/timothy/Downloads/hydradb-main/README.md`. A source build may be slow on this two-core, 3.6 GB RAM machine. The API switches to it with:

```dotenv
DATA_PROVIDER=hydradb
HYDRADB_HTTP_URL=http://127.0.0.1:8443
HYDRADB_AUTH_TOKEN=<at-least-32-characters>
HYDRADB_NAMESPACE=kinship
HYDRADB_GRAPH_ID=kinship
HYDRADB_CELL_ID=cell-0
```

## Remote HydraDB and Cloudflare R2

For staging/production, run HydraDB on a Linux host and use an R2 Standard bucket as HydraDB's S3-compatible durable object store. R2's S3 endpoint is:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

R2 Standard currently includes a monthly free tier of 10 GB-month storage, 1 million Class A operations, 10 million Class B operations, and free egress. HydraDB object-store credentials belong on the HydraDB host, not in the browser.

Cloudinary remains separate:

- Cloudinary stores and delivers family images/audio/documents.
- R2 stores HydraDB's WAL, manifests, graph records, and indexes.

## Cloudinary Unsigned Uploads

Set:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
```

The preset is intentionally unsigned. Restrict it in Cloudinary by allowed formats, maximum file size, target folder, and moderation rules. The authenticated endpoint `GET /api/uploads/cloudinary-config` returns only the cloud name, preset, and upload URL.

## Gemini

Set:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

The model is configurable because Google's free-tier model availability can change. Retrieval currently selects family-scoped HydraDB source chunks using deterministic text ranking, then sends only those chunks to Gemini. No vector database is required for the initial integration.

## Resend

Set:

```dotenv
RESEND_API_KEY=
RESEND_FROM_EMAIL=Kinship <noreply@your-verified-domain.com>
```

In development without a key, email methods return a local preview URL. Production fails rather than silently pretending an email was delivered.

## API Routes

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/families
POST   /api/families
GET    /api/uploads/cloudinary-config
POST   /api/ai/chat
```

State-changing requests enforce the configured frontend origin. Authentication endpoints and AI chat are rate limited.

## Production Requirements

- HTTPS for both the frontend/API and HydraDB
- A strong random `PASSWORD_PEPPER`
- A strong HydraDB bearer token stored outside source control
- A verified Resend sending domain
- Restricted Cloudinary unsigned preset
- Internal-only HydraDB network access
- Backups and lifecycle policy for the R2 bucket
- Review HydraDB's AGPL-3.0 obligations before public deployment
