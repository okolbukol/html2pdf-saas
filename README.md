# HTML2PDF Pro

HTML2PDF Pro is planned as a commercial SaaS product for converting HTML, public URLs and templates into professional PDF files. This repository currently contains the MVP Phase 1, Phase 2 and early Phase 3 conversion foundation.

## Current Scope

Implemented in this foundation:

- Next.js App Router application shell
- TypeScript strict mode
- Tailwind CSS
- ESLint and Prettier
- Environment variable validation with Zod
- Vitest test setup
- Prisma schema and database package
- Docker Compose services for PostgreSQL and Redis
- BullMQ queue package
- Worker application skeleton
- SSRF-safe URL validation
- Internal-only conversion creation endpoint
- Playwright Chromium PDF engine
- Local source and output storage
- Internal-only PDF download endpoint
- Internal-only conversion status and list endpoints
- Cleanup dry-run/apply commands
- Reconciliation report
- Health and readiness checks
- Architecture documentation

Not implemented yet:

- Authentication
- Payments
- API key flows
- Admin panel
- Functional user dashboard features

## Architecture

The repository uses a pnpm workspace:

```text
apps/web              Next.js web application
apps/worker           Conversion worker skeleton
packages/conversions  Conversion domain, SSRF validation and PDF options
packages/config       Environment validation
packages/database     Prisma schema and database exports
packages/pdf-engine   Playwright rendering and network policy
packages/queue        BullMQ conversion queue
packages/storage      Local source and output storage
docs                  Product and architecture documentation
```

See `docs/ARCHITECTURE.md` for technical decisions and phase boundaries.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer

Repository root: `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`

Primary commands:

- Install: `pnpm install`
- Run: `pnpm dev`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Docker and Docker Compose for local PostgreSQL and Redis

## Local Setup

Install dependencies:

```bash
pnpm install
```

Install Playwright Chromium into the repository-local ignored cache:

```bash
set PLAYWRIGHT_BROWSERS_PATH=%cd%\.cache\ms-playwright
pnpm --filter @html2pdf-pro/pdf-engine exec playwright install chromium
```

Copy environment variables:

```bash
cp .env.example .env
```

Start local infrastructure:

```bash
docker compose up -d
```

Validate Prisma schema:

```bash
pnpm db:validate
```

Generate Prisma client:

```bash
pnpm db:generate
```

Run the web app:

```bash
pnpm dev
```

Run the worker locally:

```bash
pnpm worker:start
```

Check queue connectivity:

```bash
pnpm queue:check
```

## Environment Variables

Required variables are listed in `.env.example`:

- `NODE_ENV`
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `APP_SECRET`
- `STORAGE_DRIVER`
- `LOCAL_STORAGE_PATH`
- `HTML_SOURCE_STORAGE_PATH`
- `PDF_OUTPUT_STORAGE_PATH`
- `INTERNAL_API_SECRET`
- `CONVERSION_QUEUE_NAME`
- `CONVERSION_JOB_ATTEMPTS`
- `CONVERSION_JOB_TIMEOUT_MS`
- `CONVERSION_WORKER_CONCURRENCY`
- `CONVERSION_RETENTION_HOURS`
- `SOURCE_TTL_SECONDS`
- `OUTPUT_TTL_SECONDS`
- `HTML_SOURCE_TTL_SECONDS`
- `PDF_OUTPUT_TTL_SECONDS`
- `CLEANUP_BATCH_SIZE`
- `CLEANUP_INTERVAL_SECONDS`
- `CLEANUP_DRY_RUN`
- `MAX_HTML_BYTES`
- `MAX_PDF_BYTES`
- `HTML_MAX_BYTES`
- `PDF_MAX_BYTES`
- `NAVIGATION_TIMEOUT_MS`
- `PDF_GENERATION_TIMEOUT_MS`
- `MAX_REDIRECTS`
- `MAX_NETWORK_REQUESTS`
- `MAX_NETWORK_BYTES`
- `MAX_TOTAL_NETWORK_BYTES`
- `MAX_RESOURCE_BYTES`
- `MAX_DOM_CONTENT_BYTES`
- `WORKER_CONCURRENCY`
- `WORKER_JOB_TIMEOUT_MS`
- `PLAYWRIGHT_JAVASCRIPT_ENABLED`

Real secrets must not be committed to the repository.

## Validation Commands

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:playwright
pnpm test:runtime
pnpm db:validate
pnpm queue:check
pnpm cleanup:dry-run
pnpm reconcile
pnpm health:check
```

## Internal Conversion Example

This endpoint is internal only and requires `x-internal-api-secret`.

```bash
curl -X POST http://localhost:3000/api/internal/conversions ^
  -H "Content-Type: application/json" ^
  -H "x-internal-api-secret: replace-with-at-least-32-characters" ^
  -d "{\"sourceType\":\"HTML\",\"html\":\"<h1>Hello</h1>\",\"options\":{\"fileName\":\"hello.pdf\"}}"
```

Download a completed internal conversion:

```bash
curl -L http://localhost:3000/api/internal/conversions/CONVERSION_ID/file ^
  -H "x-internal-api-secret: replace-with-at-least-32-characters" ^
  -o hello.pdf
```

Start a URL conversion. The URL must be public and pass SSRF checks:

```bash
curl -X POST http://localhost:3000/api/internal/conversions ^
  -H "Content-Type: application/json" ^
  -H "x-internal-api-secret: replace-with-at-least-32-characters" ^
  -d "{\"sourceType\":\"URL\",\"url\":\"https://example.com\",\"options\":{\"fileName\":\"example.pdf\"}}"
```

Check one conversion status:

```bash
curl http://localhost:3000/api/internal/conversions/CONVERSION_ID ^
  -H "x-internal-api-secret: replace-with-at-least-32-characters"
```

List conversions with cursor pagination:

```bash
curl "http://localhost:3000/api/internal/conversions?limit=20&status=COMPLETED" ^
  -H "x-internal-api-secret: replace-with-at-least-32-characters"
```

Run cleanup in dry-run mode:

```bash
pnpm cleanup:dry-run
```

Apply cleanup:

```bash
pnpm cleanup:run
```

Run reconciliation:

```bash
pnpm reconcile
```

Check health and readiness:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
pnpm health:check
```

## Database

The Prisma schema is located at:

```text
packages/database/prisma/schema.prisma
```

The initial migration is stored at:

```text
packages/database/prisma/migrations/20260714000000_initial_schema/migration.sql
```

## Docker

`docker-compose.yml` defines:

- PostgreSQL 16
- Redis 7
- Web service
- Worker service

Start only infrastructure:

```bash
docker compose up -d postgres redis
```

Start the worker as well:

```bash
docker compose up worker
```

## Security Notes

- Environment values are validated centrally with Zod.
- API keys and passwords are represented as hash fields in the schema.
- URL-to-PDF SSRF validation is integrated into the Playwright navigation layer. Main documents, redirects and subresources are intercepted and validated.
- PDF generation must run through a queue and separate worker, not inside a synchronous web request.
- Queue payloads must not contain raw HTML or secrets.
- Node.js memory checks are not isolation; production must enforce container resource and egress controls.

## Known Limitations

- The app shell does not provide product workflows yet.
- Authentication is not wired.
- Internal conversion creation exists at `/api/internal/conversions`, guarded by `x-internal-api-secret`; it is not the public API v1 product.
- Browser pool optimization is not implemented.
- Signed public download URLs are not implemented.
- No payment provider is integrated.

## Roadmap

Next recommended phase: implement Phase 3 foundation for PDF conversion architecture, including validated conversion requests, queue boundaries, SSRF-safe URL validation and a separate worker process.
