# Revenue Sprint 1 Specification

**Status:** Draft

**Revision:** 0.1

**Purpose:** Define independently reviewable requirements and acceptance criteria for the minimum user-management foundation preceding subscriptions and payments.

## Source Brief

`docs/sprints/revenue-sprint-1/PROJECT_BRIEF.md`

## Objective

Deliver authenticated user identity, user-owned conversion access, a minimal dashboard and history experience, and server-enforced Free-plan quota foundations without implementing subscriptions or payments.

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

## Scope

Implementation includes only the five epics defined below: Authentication, User Management, Dashboard, PDF History, and Usage Quota.

All functionality must preserve the released conversion architecture, enforce identity and ownership on the server, remain reproducible from a clean clone, and produce evidence suitable for independent review.

## Global requirements

- **GR-001:** Every authenticated product operation MUST derive identity from the validated server session, not from a client-supplied user identifier.
- **GR-002:** A user MUST NOT read, download, mutate, or account usage against another user's data.
- **GR-003:** Provider credentials, session secrets, tokens, and other secret values MUST NOT be committed or exposed to the client, logs, URLs, or error responses.
- **GR-004:** Database changes MUST use reviewed migrations and preserve compatibility with existing records.
- **GR-005:** Existing internal conversion endpoints MUST remain internal and MUST NOT be repurposed as customer authorization boundaries without an approved ADR.
- **GR-006:** Error responses and UI states MUST avoid disclosing whether another user's resource exists.
- **GR-007:** Required checks MUST include formatting, typecheck, lint, production build, unit tests, applicable integration tests, applicable browser tests, and clean-clone verification.
- **GR-008:** No implementation may begin until the required ADRs, this Specification, and Gate 1 are approved.

## Epic 1 — Authentication

### Objective

Provide Google sign-in, persistent secure sessions, logout, and server-enforced protection for authenticated product surfaces.

### User stories

- As a visitor, I want to sign in with Google so I can access my account without creating another password.
- As a signed-in user, I want my session to persist safely across requests so I can use the product.
- As a signed-in user, I want to log out so the current session no longer grants access.
- As a visitor, I want protected product routes to redirect or reject me safely so private data is not exposed.

### Functional requirements

- **AUTH-FR-001:** The application MUST initiate and complete Google OAuth/OIDC sign-in through the approved authentication architecture.
- **AUTH-FR-002:** Successful sign-in MUST resolve a persistent user and provider account without creating duplicates for repeated sign-ins.
- **AUTH-FR-003:** The server MUST create, validate, expire, and revoke database-backed sessions with a fixed 30-day absolute lifetime and no sliding renewal.
- **AUTH-FR-004:** Multiple concurrent sessions MUST be allowed; logout MUST invalidate only the current session and leave protected product surfaces inaccessible through that session.
- **AUTH-FR-005:** Dashboard, profile, history, PDF download, and quota operations MUST require an authenticated server session.
- **AUTH-FR-006:** Authentication failures and provider denial MUST return the user to a safe, actionable state without exposing sensitive details.

### Non-functional requirements

- **AUTH-NFR-001:** The production session cookie MUST be named `__Host-html2pdf_session`, set `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`, and omit `Domain`; only local development without HTTPS may disable `Secure`.
- **AUTH-NFR-002:** OAuth state, callback, and redirect handling MUST prevent request forgery and unsafe external redirects; callbacks MUST use exact environment allowlists and MUST NOT use wildcard or customer-supplied URLs.
- **AUTH-NFR-003:** Authentication events MUST NOT log tokens, authorization codes, session values, or provider secrets.
- **AUTH-NFR-004:** Route protection MUST be enforced server-side and tested independently of client navigation.

### Acceptance criteria

- **AUTH-AC-001:** A configured test account can complete Google sign-in and reaches the authenticated landing dashboard.
- **AUTH-AC-002:** Repeated sign-in for the same approved identity resolves the same user and does not duplicate the provider account.
- **AUTH-AC-003:** An unauthenticated request cannot access any protected page, data endpoint, or PDF download.
- **AUTH-AC-004:** Logout invalidates the current session; replaying it cannot regain protected access, while another unrevoked concurrent session remains valid.
- **AUTH-AC-005:** A session expires no later than 30 days after creation, authenticated use does not extend that expiry, and expired or invalid sessions fail closed without revealing private data.
- **AUTH-AC-006:** Automated tests cover successful sign-in plumbing at the application boundary, protected-route denial, logout, and invalid-session behavior; provider interaction may use a controlled test double where real-provider automation is unsuitable.

### Risks

- Incorrect provider-account mapping could merge distinct identities or create duplicates.
- Weak cookie or callback configuration could expose sessions or enable request forgery.
- External provider configuration may differ across local, review, and production environments.

### Dependencies

- `docs/adr/ADR-002-AUTHENTICATION-AND-USER-IDENTITY.md`, subject to Gate 1 approval.
- Auth.js for Next.js with the Prisma adapter and the narrow mapping boundary defined by ADR-002.
- Google OAuth application configuration and non-repository secrets.
- Exact externally supplied HTTPS application domains for review, staging, and production callback registration.
- Database migration and authentication adapter integration.

### Out of scope

- Email/password authentication, additional providers, multi-factor authentication, session-management UI, and account recovery.

## Epic 2 — User Management

### Objective

Persist a reliable user identity and expose a minimal authenticated profile and account-creation lifecycle.

### User stories

- As a first-time user, I want an account created from my successful Google sign-in.
- As a returning user, I want the same account and history restored.
- As a user, I want to view my basic profile information.
- As the product operator, I want the last successful login recorded for support and lifecycle visibility.

### Functional requirements

- **USER-FR-001:** First successful sign-in MUST create the minimum user and provider-account records required by the approved identity design.
- **USER-FR-002:** Returning sign-in MUST update `lastLoginAt` only after authentication succeeds.
- **USER-FR-003:** The authenticated user MUST be able to view their name, email, account creation time, and last successful login when available.
- **USER-FR-004:** Profile reads MUST derive the target user from the server session.
- **USER-FR-005:** Existing users and historical records MUST remain valid after migration; legacy conversions without ownership MUST NOT be assigned implicitly.

### Non-functional requirements

- **USER-NFR-001:** User creation and provider-account mapping MUST be atomic or safely recoverable.
- **USER-NFR-002:** Email and profile data MUST be minimized to the fields required by this sprint.
- **USER-NFR-003:** Last-login updates MUST not block a safe authentication failure path or overwrite user identity.

### Acceptance criteria

- **USER-AC-001:** First sign-in creates exactly one user and one linked provider account.
- **USER-AC-002:** A later successful sign-in updates `lastLoginAt` and preserves the original user identity.
- **USER-AC-003:** The profile displays only the authenticated user's approved fields.
- **USER-AC-004:** Requests cannot select another profile by supplying a different user identifier.
- **USER-AC-005:** Migration applies to an empty database and an existing released-baseline schema, with rollback or recovery guidance recorded.

### Risks

- Provider email changes and unverified-email assumptions could make identity linking unsafe.
- Migration defaults could create misleading last-login data.
- Optional ownership fields could allow accidental exposure of unowned historical records.

### Dependencies

- Epic 1 identity contract.
- Approved schema migration and the identity-mapping rules in ADR-002.

### Out of scope

- Profile editing, avatar storage, account deletion, organizations, invitations, roles, and administrative user management.

## Epic 3 — Dashboard

### Objective

Provide the authenticated landing experience with useful recent activity and Free-plan usage information.

### User stories

- As a signed-in user, I want to land on a dashboard after login.
- As a new user, I want a clear empty state rather than misleading metrics.
- As a returning user, I want to see recent PDF jobs and their status.
- As a Free-plan user, I want to see usage and remaining quota.

### Functional requirements

- **DASH-FR-001:** Successful login MUST lead to the authenticated dashboard.
- **DASH-FR-002:** The dashboard MUST show a bounded list of the authenticated user's most recent conversion jobs.
- **DASH-FR-003:** Each recent job MUST show file name, source type, status, and creation time.
- **DASH-FR-004:** The dashboard MUST show the current quota period's used amount, defined by ADR-004 as reserved plus consumed units, and the remaining amount supplied by the quota service.
- **DASH-FR-005:** A user with no jobs MUST see an empty state with a path toward creating a future conversion; this sprint MUST NOT imply an unimplemented conversion UI exists.
- **DASH-FR-006:** Loading, empty, failure, and populated states MUST be distinguishable.

### Non-functional requirements

- **DASH-NFR-001:** Dashboard queries MUST be user-scoped and bounded.
- **DASH-NFR-002:** Dashboard rendering MUST not expose internal secrets, storage keys, raw HTML, or sensitive error details.
- **DASH-NFR-003:** Usage and job data SHOULD be fetched efficiently without unbounded scans or per-row query amplification.

### Acceptance criteria

- **DASH-AC-001:** An authenticated user reaches the dashboard after successful login.
- **DASH-AC-002:** A new user sees the defined empty state and accurate zero usage.
- **DASH-AC-003:** A user with jobs sees only their most recent jobs in deterministic newest-first order.
- **DASH-AC-004:** Used quota, including reserved and consumed units, and remaining quota match the quota service for the active period.
- **DASH-AC-005:** Failure to load one dashboard component produces a safe error state and does not disclose another user's data.

### Risks

- Joining jobs and usage inefficiently may degrade the first authenticated page.
- An empty-state action may falsely advertise conversion UI not included in this sprint.
- Cached user data could cross identity boundaries if cache keys are incomplete.

### Dependencies

- Epics 1, 2, 4, and 5 service contracts.
- `docs/adr/ADR-003-USER-FACING-AUTHORIZATION-AND-DATA-ACCESS.md`, subject to Gate 1 approval.

### Out of scope

- Conversion editor, advanced analytics, success-rate charts, average-duration metrics, templates, billing prompts, and dashboard customization.

## Epic 4 — PDF History

### Objective

Allow authenticated users to view their prior conversion jobs and download their own completed PDFs safely.

### User stories

- As a user, I want to list previous conversions so I can find earlier work.
- As a user, I want to see job status so I know whether a PDF is available.
- As a user, I want to download my completed PDF.
- As a future user, I want history structured so search and filtering can be added without redesigning ownership boundaries.

### Functional requirements

- **HIST-FR-001:** History MUST list only conversions whose `userId` matches the authenticated user.
- **HIST-FR-002:** Results MUST use deterministic pagination and newest-first ordering.
- **HIST-FR-003:** Each item MUST expose only approved customer fields: identifier, file name, source type, status, timestamps, output size when available, and safe failure state.
- **HIST-FR-004:** Download MUST succeed only for an authenticated owner when the conversion is completed and a valid PDF record and object exist.
- **HIST-FR-005:** Missing, non-owned, unavailable, expired, and non-completed files MUST fail safely without ownership disclosure.
- **HIST-FR-006:** The query contract MUST allow later search/filter extension, but this sprint MUST NOT implement search or filter unless separately approved.

### Non-functional requirements

- **HIST-NFR-001:** Ownership MUST be enforced in the database query or equivalent server-side authorization boundary, not by filtering client results.
- **HIST-NFR-002:** Storage keys and filesystem paths MUST never be returned to the client.
- **HIST-NFR-003:** Download responses MUST retain safe file-name handling and private/no-store caching.
- **HIST-NFR-004:** Pagination MUST be bounded and stable under concurrent job creation.

### Acceptance criteria

- **HIST-AC-001:** A user sees only their own jobs across multiple pages.
- **HIST-AC-002:** Jobs display accurate lifecycle status using the existing conversion state model.
- **HIST-AC-003:** The owner can download an available completed PDF with correct content type and safe file name.
- **HIST-AC-004:** A different authenticated user cannot discover or download that PDF, including by guessing its identifier.
- **HIST-AC-005:** Unowned released-baseline records do not appear in any customer's history.
- **HIST-AC-006:** Contract or component design documents the future search/filter extension point without implementing it.

### Risks

- Reusing internal endpoints could bypass user ownership.
- Identifier probing could reveal resource existence.
- Expired database records and deleted storage objects can diverge.

### Dependencies

- Epic 1 authenticated identity.
- Existing conversion lifecycle, file metadata, and storage abstraction.
- `docs/adr/ADR-003-USER-FACING-AUTHORIZATION-AND-DATA-ACCESS.md`, subject to Gate 1 approval.

### Out of scope

- Search/filter execution, deletion, regeneration, bulk download, sharing, signed public links, and history for organizations.

## Epic 5 — Usage Quota

### Objective

Create a server-side, configurable Free-plan quota boundary that accounts for conversion usage and reports remaining allowance.

### User stories

- As a Free-plan user, I want to know my remaining quota.
- As a user at the limit, I want a clear refusal before unsupported work is accepted.
- As the product operator, I want limits configured outside application logic.
- As a future payments implementer, I want a quota service that can support additional plans without rewriting product routes.

### Functional requirements

- **QUOTA-FR-001:** The Free plan MUST allow 20 PDFs per calendar month, with the limit and period supplied by approved plan configuration or database data rather than hard-coded route logic.
- **QUOTA-FR-002:** A server-side quota service MUST provide the authoritative limit, used amount as reserved plus consumed units, remaining amount, period boundaries, and allow/deny result for an authenticated user.
- **QUOTA-FR-003:** Every customer conversion entry point introduced or exposed in this sprint MUST check quota before accepting work.
- **QUOTA-FR-004:** Usage accounting MUST follow the reservation, consumption, release, idempotency, reconciliation, and period-assignment semantics in ADR-004.
- **QUOTA-FR-005:** Repeated requests or retries MUST NOT double-count the same governed conversion event.
- **QUOTA-FR-006:** Dashboard quota display MUST use the same service semantics as enforcement.
- **QUOTA-FR-007:** Limit exhaustion MUST return a stable safe error suitable for a later upgrade flow without implementing payments.

### Non-functional requirements

- **QUOTA-NFR-001:** Quota checks and usage writes MUST be race-safe for concurrent requests.
- **QUOTA-NFR-002:** The quota period MUST be a UTC calendar month beginning at 00:00 UTC on the first day and ending immediately before 00:00 UTC on the first day of the next month.
- **QUOTA-NFR-003:** Accounting changes MUST be traceable to a user and conversion where applicable.
- **QUOTA-NFR-004:** Quota failures MUST fail closed when authoritative plan or usage data cannot be established.

### Acceptance criteria

- **QUOTA-AC-001:** The configured Free-plan limit can change without changing route or quota-service source code.
- **QUOTA-AC-002:** The service reports a 20-PDF limit, correct reserved-plus-consumed usage, remaining amount, and UTC calendar-month boundaries for zero, partial, and exhausted usage.
- **QUOTA-AC-003:** A request at the limit is rejected server-side before new chargeable work is accepted.
- **QUOTA-AC-004:** Concurrent requests cannot cause accepted usage to exceed the approved limit under the ADR semantics.
- **QUOTA-AC-005:** Retry and failure scenarios do not double-count or silently lose usage.
- **QUOTA-AC-006:** Dashboard display and enforcement agree for the same user and period.

### Risks

- Incorrect implementation of ADR-004's reserve-then-consume/release timing can produce unfair deductions or allow overuse.
- Concurrent acceptance can oversubscribe the limit.
- Incorrect implementation of the resolved UTC calendar-month boundary can reset users inconsistently.
- Existing optional usage relationships may be insufficient for strong idempotency.

### Dependencies

- `docs/adr/ADR-004-FREE-PLAN-QUOTA-AND-USAGE-ACCOUNTING.md`, subject to Gate 1 approval, and the resolved Founder product decisions in this Specification.
- Epic 1 identity and Epic 2 user lifecycle.
- Existing Plan, PlanFeature, UsageRecord, and Conversion models, subject to migration review.

### Out of scope

- Paid plans, subscription entitlements, metered billing, overages, anonymous quotas, promotional credits, refunds, and operator quota-management UI; paid plans belong to Revenue Sprint 2.

## Constraints

- No subscription or payment behavior may be implemented.
- No architecture decision may be hidden inside implementation.
- No client-only authentication, ownership, or quota check can satisfy a requirement.
- No secret or personal token may enter repository history, queue payloads, browser-visible data, or logs.
- Customer-facing work in this sprint MUST preserve the resolved limits of 2 MB maximum HTML input, 20 pages maximum PDF length, and seven-day PDF retention.
- API functionality remains out of scope.
- Scope expansion requires Founder approval and any affected artifact to return through the ADOS change process.
- Existing PDF worker, queue, rendering, SSRF, storage, and internal-service protections must remain intact.

## Acceptance criteria and evidence

The sprint is eligible for independent review only when:

1. Every applicable epic acceptance criterion is mapped to implementation and test evidence.
2. Required migrations apply from the released baseline and schema validation passes.
3. Formatting, typecheck, lint, production build, and all applicable tests pass.
4. Security tests demonstrate unauthenticated denial, cross-user isolation, safe downloads, session invalidation, and quota concurrency behavior.
5. A true clean clone at the exact candidate state installs with the frozen lockfile and repeats the mandatory verification suite without repository changes.
6. The Reviewer receives approved artifacts, the exact candidate identity, evidence, and no private implementation deliberation.
7. No unresolved Critical or Major finding remains, and no mandatory check is Failed or Blocked.

Evidence MUST record command results, environment versions, migration results, test counts, acceptance-criterion mapping, initial and final repository status, and any external prerequisite.

## Applicable ADRs

The following architectural decisions are required before Gate 1:

- `docs/adr/ADR-002-AUTHENTICATION-AND-USER-IDENTITY.md` defines the proposed authentication, internal identity, session, and ownership architecture and requires Gate 1 approval.
- `docs/adr/ADR-003-USER-FACING-AUTHORIZATION-AND-DATA-ACCESS.md` defines the proposed server-only web-application service boundary, ownership-scoped queries, history pagination, and download authorization and requires Gate 1 approval.
- `docs/adr/ADR-004-FREE-PLAN-QUOTA-AND-USAGE-ACCOUNTING.md` defines the proposed quota configuration, reserve-then-consume/release lifecycle, database concurrency control, idempotency, UTC period assignment, and reconciliation and requires Gate 1 approval.

## Non-goals

- Subscriptions, payments, billing, paid entitlements, or revenue collection.
- Features excluded by each epic.
- Broad visual redesign or unrelated refactoring.

## Risks and external dependencies

- ADR-002's pre-Gate 1 authentication parameters are resolved and recorded.
- Real Google callback verification in review, staging, and production depends on exact approved external application domains and provider configuration that are not present in repository evidence.
- Full conversion and quota integration may require PostgreSQL and Redis availability.
- The current schema is broad; ADR-002 defines its required adapter mapping boundary, while the accounting records and constraints required by ADR-004 remain subject to migration review.
