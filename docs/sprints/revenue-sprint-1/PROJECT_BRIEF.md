# Revenue Sprint 1 Project Brief

**Status:** Draft

**Author:** Product Architect

**Date:** 2026-07-19

**Repository:** `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`

**Baseline:** Commit `97672c16381f989ef561cd6fe936fce9ecc0dc14`, tag `v0.2.0-alpha`

## Purpose

Define the need, intended outcome, and boundaries for the minimum user-management foundation required before subscriptions and payments are implemented.

## Need

The released conversion foundation can create, process, list, and download PDF jobs through internal-only interfaces, but it has no implemented authentication or functional user dashboard. The database schema contains initial user, account, session, plan, usage, conversion, and file entities; these are starting points rather than completed user workflows.

Without authenticated identity, user-owned data access, account lifecycle, and enforceable usage limits, the product cannot safely expose conversion history to customers or establish the foundation required for paid subscriptions.

## Intended outcome

Deliver the smallest coherent user foundation that allows a person to:

- sign in with Google and maintain a secure session;
- sign out and receive protection on authenticated product routes;
- obtain and view a basic account profile;
- land on a dashboard showing recent PDF jobs and Free-plan usage;
- view and download only their own completed PDF jobs; and
- see an authoritative remaining quota calculated by a server-side quota service.

The sprint should leave the product ready for a separately governed subscription and payments milestone. It does not itself create revenue collection.

## Context

- The ADOS Pilot, clean-clone verification, independent Gate 2 review, and `v0.2.0-alpha` release completed successfully.
- PostgreSQL through Prisma is the current source of truth for product entities.
- The current conversion endpoints are internal-only and guarded by a shared internal secret; they are not user-facing authorization boundaries.
- `Conversion.userId`, `UsageRecord.userId`, `User`, `Account`, `Session`, `Plan`, and `PlanFeature` already exist in the schema.
- Authentication logic, last-login tracking, user-facing history, user-scoped downloads, functional dashboard features, and quota enforcement are not implemented.
- The commercial objective is to reach first paying customers quickly without weakening security, review independence, or release reproducibility.

## Resolved Founder product decisions

| Decision           | Approved value             | Status   |
| ------------------ | -------------------------- | -------- |
| Authentication     | Google OAuth only          | Resolved |
| Free plan          | 20 PDFs per calendar month | Resolved |
| Quota reset        | Monthly at 00:00 UTC       | Resolved |
| Maximum HTML size  | 2 MB                       | Resolved |
| Maximum PDF length | 20 pages                   | Resolved |
| PDF retention      | 7 days                     | Resolved |
| API                | Out of scope               | Resolved |
| Paid plans         | Revenue Sprint 2           | Resolved |

## Boundaries

### Included

- Google OAuth login, secure session management, logout, and protected product routes.
- User profile, Google provider-account creation and identity-mapping flow, persistent user identity, and last-login tracking.
- Authenticated landing dashboard with recent jobs, usage summary, remaining quota, and empty states.
- Authenticated PDF history with job status and completed-PDF download.
- Search/filter readiness as design only unless explicitly approved for implementation.
- A configurable Free-plan policy of 20 PDFs per calendar month, monthly reset at 00:00 UTC, server-side usage accounting, remaining-quota display, and a quota service boundary.
- Tests, security evidence, migration evidence, clean-clone verification, independent review, and release evidence required by the approved Specification.

### Excluded

- Subscriptions, payments, checkout, billing portal, invoices, refunds, or payment-provider integration; paid plans belong to Revenue Sprint 2.
- Paid-plan purchase or upgrade flows in Revenue Sprint 1.
- Email/password registration, email verification, password reset, or additional identity providers.
- Anonymous conversion quotas.
- New conversion input experiences, templates, API keys, public API v1, webhooks, admin features, or organizations.
- Search/filter implementation beyond ensuring the history design can accommodate it later.
- Queue, worker, PDF-engine, storage, or infrastructure redesign.
- UI redesign outside the minimum authenticated product surfaces.

## Constraints and dependencies

- All access control and quota enforcement must occur server-side; client presentation alone is insufficient.
- User data and PDF downloads must be isolated by authenticated ownership.
- Secrets and provider credentials must remain outside version control.
- Existing conversion behavior and internal service boundaries must remain intact unless an approved ADR and Specification explicitly authorize a change.
- Approved product constraints are 2 MB maximum HTML input, 20 pages maximum PDF length, and seven-day PDF retention.
- Google identity configuration, database availability, Redis availability for full conversion flows, and browser/runtime prerequisites are external dependencies.
- Architecture decisions listed in `SPEC.md` require ADRs and Gate 1 approval before implementation.

## Assumptions and open questions

### Verified

- The released baseline is reproducible from a clean clone.
- The schema has initial identity, session, plan, usage, conversion, and file models.
- Conversion ownership fields are optional and current internal routes do not enforce authenticated user ownership.
- Functional authentication and dashboard workflows are absent.

### Architecture decisions recorded for Gate 1

- ADR-002 maps one verified Google identity to one stable internal user and uses database-backed sessions for logout and revocation.
- ADR-003 keeps customer authorization behind a server-only web-application service boundary and excludes ownerless legacy conversions from customer access.
- ADR-004 uses database-authoritative reserve-then-consume/release accounting for the resolved 20-PDF UTC calendar-month policy.

These decisions remain Draft until Gate 1 approval.

### Resolved pre-Gate 1 authentication parameters

ADR-002 records the selected Auth.js and Prisma-adapter boundary, a fixed 30-day absolute session lifetime without sliding renewal, concurrent-session and revocation behavior, the exact production session-cookie policy, and exact environment-specific callback rules. The repository proves the development callback at `http://localhost:3000/api/auth/callback/google`.

Review, staging, and production application domains are not present in repository evidence. Their exact HTTPS callback URLs remain external deployment configuration inputs and must be supplied before provider registration or callback verification in those environments; wildcard or inferred domains are not permitted.

### Remaining implementation parameters

- Default and maximum history page sizes, customer-safe error code names, and server module layout within ADR-003.
- Stale-reservation threshold, idempotency-record retention, reconciliation cadence and batch size, and concrete plan-feature schema names within ADR-004.

## Related artifacts

- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/adr/ADR-002-AUTHENTICATION-AND-USER-IDENTITY.md`
- `docs/adr/ADR-003-USER-FACING-AUTHORIZATION-AND-DATA-ACCESS.md`
- `docs/adr/ADR-004-FREE-PLAN-QUOTA-AND-USAGE-ACCOUNTING.md`
- `docs/sprints/revenue-sprint-1/SPEC.md`
- `docs/sprints/revenue-sprint-1/BACKLOG.md`
- `docs/sprints/revenue-sprint-1/MILESTONE_PLAN.md`
- ADOS Foundation Freeze: `v1.3.1-foundation-freeze`
