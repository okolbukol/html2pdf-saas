# HTML2PDF Pro Architecture

## Active Scope

This document covers MVP Phase 1, Phase 2 and MVP Phase 3.1-3.3. It establishes the product boundary, technical architecture, base project infrastructure, secure conversion domain model, SSRF-safe URL validation, queue boundary, source/output storage, Playwright-based worker PDF generation, internal status/list APIs, cleanup/retention and reconciliation. The following areas remain intentionally out of scope for this phase:

- Authentication implementation
- Browser pool optimization
- Public signed download URLs
- Payment and Stripe integration
- Admin panel
- API key management
- Functional user dashboard workflows
- Public API v1
- Stripe, billing and webhooks

## Repository Assessment

The repository started with project instructions and product specification documents only. There was no existing application code, package manager configuration, framework setup, database schema or test harness. Because there was no running structure to preserve, the initial implementation creates a clean workspace foundation.

## MVP Boundary

The full MVP described in `docs/PRODUCT_SPEC.md` includes authentication, HTML and URL conversion, queue-backed PDF generation, conversion history, usage limits, Stripe test mode, API keys, SSRF protection, rate limiting, Docker Compose and test coverage.

For the first foundation task, the active MVP boundary was narrowed to Phase 1 and Phase 2:

- Product and technical architecture documentation
- Next.js App Router application shell
- Strict TypeScript baseline
- Tailwind CSS baseline
- ESLint and Prettier configuration
- Environment variable validation
- Vitest test harness
- Docker Compose services for PostgreSQL and Redis
- Prisma schema and database package structure
- README and `.env.example`

The current Phase 3 slice adds:

- Conversion lifecycle domain rules
- SSRF-safe URL validation module
- Central PDF options schema
- BullMQ queue package
- Worker application skeleton
- Internal-only conversion creation endpoint
- Local short-lived source and output storage
- Playwright Chromium PDF engine
- Internal-only PDF download endpoint

## Technical Decisions

- Use a pnpm workspace without Turborepo for the first foundation. This keeps the setup small while still allowing separate app and package boundaries.
- Place the web application in `apps/web`.
- Place shared environment validation in `packages/config`.
- Place Prisma schema and database client exports in `packages/database`.
- Use Next.js App Router with React strict mode and TypeScript strict compiler settings.
- Use Zod for environment validation.
- Use Prisma with PostgreSQL as the source of truth for product entities.
- Use Redis through BullMQ for conversion jobs.
- Use Vitest with jsdom for unit-level tests.
- Keep raw HTML out of queue payloads. Queue jobs carry only conversion IDs, source type, source reference and normalized options.

## Security Decisions

- Secrets are represented only as names and examples in `.env.example`; no real secret values are committed.
- Environment variables are centrally validated before use.
- The Prisma model includes hashed API keys and password hash fields but no authentication logic is implemented in this phase.
- URL-to-PDF SSRF defenses are documented as a mandatory future implementation before any URL conversion endpoint is created.
- PDF generation is not implemented in request handlers. Conversion work is enqueued and processed by `apps/worker`.
- The worker uses Playwright Chromium through `packages/pdf-engine`; the old stub PDF engine has been removed.
- URL validation blocks local, private, link-local, multicast, reserved, metadata and internal container targets before any URL source is queued.
- Local source and output storage use server-generated keys. User file names are only sanitized download names.

## Project Structure

```text
apps/
  web/
    src/app/
packages/
  conversions/
  config/
  database/
    prisma/
  pdf-engine/
  queue/
  storage/
apps/
  worker/
docs/
docker-compose.yml
```

Future packages can be added without reshaping the repository:

- `packages/pdf-engine`
- `packages/queue`
- `packages/storage`
- `packages/payments`
- `packages/auth`
- `packages/email`
- `apps/worker`

## Conversion Lifecycle

Allowed conversion status transitions are centralized in `packages/conversions`:

1. `PENDING -> QUEUED`
2. `QUEUED -> PROCESSING`
3. `PROCESSING -> COMPLETED`
4. `PROCESSING -> FAILED`
5. `PENDING -> CANCELLED`
6. `QUEUED -> CANCELLED`
7. `COMPLETED -> EXPIRED`
8. `PENDING -> FAILED`

Invalid transitions throw a domain error. This avoids worker or API code inventing lifecycle rules independently.

`PENDING -> FAILED` is reserved for pre-queue terminal failures such as `QUEUE_ENQUEUE_FAILED`. MVP does not add a separate `ENQUEUE_FAILED` status because a terminal `FAILED` state with an explicit error code is simpler to query and reconcile.

## Queue Boundary

The queue boundary is intentionally small:

```json
{
  "conversionId": "conversion-id",
  "sourceType": "HTML | URL | TEMPLATE",
  "sourceReference": "temporary-source-or-normalized-url",
  "normalizedOptions": {}
}
```

The queue payload must not include raw HTML, cookies, authorization headers, API keys, tokens or other secret values. BullMQ jobs use deterministic IDs in the form `conversion-<conversionUuid>` to provide idempotency at enqueue time. The job ID is produced by `createConversionJobId`, rejects invalid conversion IDs and avoids `:` because BullMQ does not allow it in custom job IDs.

Retry behavior uses bounded attempts, exponential backoff, short retention for completed jobs and controlled retention for failed jobs. Stalled job handling is configured at the worker boundary.

## Worker Responsibilities

`apps/worker` owns asynchronous conversion processing. In this phase it:

1. Reads the conversion record.
2. Validates `QUEUED -> PROCESSING`.
3. Marks the job as `PROCESSING`.
4. Loads HTML from source storage or validates URL navigation.
5. Calls the Playwright PDF engine.
6. Writes the PDF to output storage.
7. Marks success as `COMPLETED` and records a `ConversionFile` row.
8. Marks terminal failures as `FAILED` with safe error metadata.

The worker is idempotent for terminal states. If a duplicate job appears for `COMPLETED`, `FAILED` or `CANCELLED`, it exits without producing a new PDF. `QUEUED -> PROCESSING` is guarded with an optimistic state update.

## SSRF Threat Model

URL sources are validated by a dedicated SSRF-safe validator before queueing. It blocks:

- Non-HTTP(S) protocols including `file:`, `ftp:`, `data:`, `javascript:`, `gopher:` and `chrome:`
- URLs with embedded username or password
- `localhost`, `.localhost`, single-label hostnames and known internal container names
- Direct private, local, link-local, multicast, reserved and metadata IP addresses
- IPv6 local, link-local, unique-local, multicast and IPv4-mapped IPv6 private addresses
- DNS responses resolving to unsafe IPv4 or IPv6 addresses

DNS resolution is injected through an interface for testability. The Playwright navigation layer intercepts every request, including redirects and subresources, and runs the same validator before allowing the request to continue. Direct navigation to resolved IPs is not used because it breaks TLS certificate validation and Host header semantics. This reduces DNS rebinding risk, but production must still enforce egress firewall rules at the container/network layer.

## Playwright Isolation Model

Each job launches a fresh headless Chromium browser and isolated browser context. Persistent profiles, downloads, popups and service workers are disabled or blocked. Dialogs are dismissed. User cookies, authorization headers, basic auth capture and arbitrary browser tuning are not supported in this phase.

Page, browser context and browser are closed in `finally` blocks. Browser crashes and timeouts are mapped to centralized safe error codes. `--no-sandbox` is not used as a default. Docker uses the official Playwright image and runs as `pwuser`; production deployments must satisfy Chromium sandbox requirements instead of casually disabling sandboxing.

## Network Interception Policy

Every Playwright request is intercepted. Unsupported protocols and WebSocket requests are aborted. Main document requests, redirects and subresources are validated against the SSRF policy. The engine enforces maximum request count, maximum single-resource bytes and maximum total transfer bytes. A public page cannot fetch private metadata, localhost or container resources because those subresource requests pass through the same policy.

## Source Retention Decision

Raw HTML is not stored long term in the database or queue. The schema uses `sourceHtmlStorageKey` rather than a `sourceHtml` text column. HTML is written to local short-lived source storage using server-generated keys, UTF-8 encoding and TTL metadata. Sources are deleted after success, final retry failure, cancellation or TTL cleanup. Retryable non-final failures keep the source so BullMQ can retry.

Cloud source storage is intentionally interface-only for now. S3, Cloudflare R2 and MinIO providers can be added behind the same interface later.

## Output Storage Lifecycle

Generated PDFs are written to output storage with server-generated keys. Output storage validates `%PDF-` magic bytes, `application/pdf`, maximum PDF size and SHA-256 checksum. `ConversionFile` records storage key, size, checksum and expiry metadata. Internal download uses DB lookup only; clients never provide storage keys and never see filesystem paths.

## Idempotency Approach

Queue idempotency is based on deterministic BullMQ job IDs derived from the conversion ID. PostgreSQL and Redis are not falsely treated as one atomic transaction. The internal endpoint uses compensating actions: write source, create `PENDING` conversion, enqueue job, and only then update to `QUEUED`. If enqueue fails, source storage is deleted and the conversion is marked `FAILED` with `QUEUE_ENQUEUE_FAILED`.

## Failure Semantics

Worker failures are mapped to centralized safe error codes. Retryable non-final failures return the conversion to `QUEUED` and keep the source. Final attempts and non-retryable failures mark `FAILED`, store safe messages and clean source storage. Partial PDF outputs are deleted if the DB link is not completed.

## Container Resource Isolation

Docker Compose gives the worker `init: true`, memory and CPU limits, restart policy, healthcheck and stop grace period. Node.js memory checks are not real isolation. Production must enforce container CPU, memory, pids and network egress limits.

## Known Security Limitations

- DNS rebinding mitigation runs before each Playwright request, but production egress policy is still required.
- Browser memory isolation depends on container/runtime limits.
- Local filesystem storage is for development and should be replaced by S3/R2/MinIO in production.
- Signed public download URLs are not implemented yet.

## Database Model Direction

The initial Prisma schema includes the core commercial SaaS entities needed by the product specification:

- Users, accounts, sessions and verification tokens
- Organizations and organization members
- Plans, plan features and subscriptions
- Usage records
- Conversions and conversion files
- Templates and template versions
- API keys
- Webhook endpoints and deliveries
- Payments and invoices
- Audit logs, admin actions and coupons

The schema is intentionally a starting point. It should be evolved with migrations as implementation phases add real workflows.

## Application Flow Direction

The target conversion flow for later phases is:

1. Web or API request validates identity, entitlement and input.
2. Conversion metadata is created in PostgreSQL.
3. A job is queued in Redis.
4. A separate worker performs PDF generation in an isolated browser process.
5. The generated PDF is stored through a storage abstraction.
6. Conversion status and usage are updated transactionally.
7. The user receives a short-lived download link.

No part of that conversion flow is implemented in this phase.

## Phase 2 Completion Criteria

Phase 2 is complete when:

- The workspace installs dependencies.
- The web app builds.
- Lint passes.
- TypeScript strict typecheck passes.
- Vitest tests pass.
- Prisma schema validates.
- Docker Compose defines PostgreSQL and Redis.

## Phase 3.3 Runtime Hardening

Phase 3.3 adds runtime verification surfaces around the existing PDF core without adding auth, billing, API keys, dashboard UI, public API v1 or admin features.

### Queue/DB Consistency Matrix

| Failure point                                    | Result                                                                                            | Mitigation                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Source write fails before DB create              | No conversion row                                                                                 | Standard safe error response                          |
| DB create fails after source write               | Source may be orphaned until TTL cleanup                                                          | Source metadata TTL and cleanup scheduler             |
| Queue enqueue fails after DB create              | Conversion becomes `FAILED` with `QUEUE_ENQUEUE_FAILED`                                           | HTML source is deleted immediately                    |
| Queue enqueue succeeds but `QUEUED` update fails | Deterministic job ID prevents duplicate enqueue; conversion is failed through compensating action | Worker exits on terminal states                       |
| Worker writes output but DB transaction fails    | Output key is deleted in the catch path                                                           | Reconciliation reports any remaining storage-only PDF |
| DB file exists but storage file is missing       | Download returns safe 404                                                                         | Reconciliation reports DB-file-missing-storage        |

There is no distributed transaction across PostgreSQL and Redis. Consistency is maintained through deterministic BullMQ job IDs, optimistic status transitions, compensating cleanup and reconciliation.

### Idempotency Guarantees And Limits

BullMQ jobs use deterministic IDs in the form `conversion-<conversionUuid>`. The worker exits without work for `COMPLETED`, `FAILED` and `CANCELLED` conversions. `QUEUED -> PROCESSING` uses an optimistic `updateMany`, so duplicate delivery can only transition one active worker. `ConversionFile.conversionId` is unique and the worker upserts the file row.

The guarantee is best-effort across DB, Redis and local storage, not a true distributed transaction. Any remaining mismatch is handled by reconciliation.

### Cleanup Locking And Retention

Cleanup runs inside the worker process on a configurable interval and is also available through CLI commands. It uses PostgreSQL advisory lock `47291033` so only one worker runs cleanup at a time. The lock scopes only the cleanup job.

Retention lifecycle:

1. HTML source is stored with metadata and a short TTL.
2. Successful or final-failed HTML conversions delete source immediately.
3. Retryable non-final failures keep source so BullMQ retry can use it.
4. Cleanup never deletes source for `QUEUED` or `PROCESSING` conversions.
5. Output PDFs are stored with expiry metadata.
6. Expired completed conversions become `EXPIRED`.
7. Expired output files are deleted and `ConversionFile.deletedAt` is set.
8. Partial `.tmp` files are removed during non-dry-run cleanup.

Cleanup has dry-run mode and batch size from validated config.

### Source/Output Reconciliation

Reconciliation reports DB file rows whose PDF is missing from storage, PDFs in storage with no DB row, `COMPLETED` conversions without a file row, `PROCESSING` conversions without a matching BullMQ job, and expired source/output files still present. The first implementation avoids dangerous automatic deletion. When dry-run is disabled, it only deletes expired storage-only PDFs because they are not referenced by DB and have passed retention.

### Health And Readiness

`GET /api/health` is a fast liveness check and does not touch PostgreSQL or Redis. `GET /api/ready` validates config, PostgreSQL, Redis and local storage write/read capability without returning secrets or connection strings. The worker exposes the same readiness model through `pnpm --filter @html2pdf-pro/worker health:check`, which Docker healthcheck uses.

### Chromium DNS Boundary

The Playwright route interception layer validates each request, redirect and subresource before it continues. Unsupported protocols and WebSocket requests are aborted. Application code still cannot fully control Chromium's connection-level DNS behavior. Production deployments must enforce egress firewall rules that block private, metadata and internal ranges at the container/network layer.

### Runtime Integration Status

Real PostgreSQL/Redis end-to-end verification requires Docker or host PostgreSQL and Redis. Any unavailable runtime dependency must be reported as not executed; mock or unit tests must not be represented as real service validation.

Local validation on 2026-07-14 found that Docker is not available in PATH and localhost PostgreSQL `5432` / Redis `6379` are not accepting connections. Therefore the real PostgreSQL + Redis + web + worker end-to-end conversion flow was not executed in this environment. Unit, Playwright and static validation cover the code paths, but they are not a substitute for real runtime integration.
