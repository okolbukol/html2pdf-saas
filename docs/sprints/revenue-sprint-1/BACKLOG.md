# Revenue Sprint 1 Backlog

**Status:** Draft

**Purpose:** Prioritize the governed planning and implementation work for Revenue Sprint 1 without authorizing implementation.

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

## Priority definitions

- **P0:** Required to satisfy the sprint objective or preserve security and governance. Blocks Gate 2 if incomplete.
- **P1:** Required for the complete minimum customer experience after P0 foundations exist.
- **P2:** Readiness, refinement, or design work that may be deferred without falsely claiming it is implemented.

## P0 — Foundation and security

| ID    | Work item                                                                                 | Epic                         | Dependencies                    | Evidence                              |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- | ------------------------------------- |
| P0-01 | Approve ADR-002 authentication, identity mapping, and session architecture                | Authentication               | Draft Specification             | Approved ADR and Gate 1 input         |
| P0-02 | Approve ADR-003 user-facing authorization and data-access architecture                    | Authentication, PDF History  | Draft Specification             | Approved ADR and Gate 1 input         |
| P0-03 | Approve ADR-004 quota configuration and accounting architecture                           | Usage Quota                  | Resolved Founder product policy | Approved ADR and Gate 1 input         |
| P0-04 | Finalize Specification and complete Gate 1                                                | All                          | P0-01 through P0-03             | Recorded Founder decision             |
| P0-05 | Add reviewed schema migration for last login and any approved auth/quota changes          | User Management, Usage Quota | Gate 1                          | Migration and compatibility tests     |
| P0-06 | Implement Google sign-in and safe callback handling                                       | Authentication               | P0-05                           | Auth boundary tests                   |
| P0-07 | Implement server session validation, expiry, and logout                                   | Authentication               | P0-06                           | Session lifecycle tests               |
| P0-08 | Protect dashboard, profile, history, download, and quota operations                       | Authentication               | P0-07                           | Unauthenticated-denial tests          |
| P0-09 | Implement first-login creation, repeat-login identity resolution, and last-login tracking | User Management              | P0-05, P0-06                    | Identity and migration tests          |
| P0-10 | Implement user-scoped history and completed-PDF authorization                             | PDF History                  | P0-02, P0-07                    | Cross-user isolation tests            |
| P0-11 | Implement quota service for the configured 20-PDF UTC calendar-month Free plan            | Usage Quota                  | P0-03, P0-05                    | Service and configuration tests       |
| P0-12 | Implement race-safe, idempotent usage accounting at approved customer entry points        | Usage Quota                  | P0-10, P0-11                    | Concurrency, retry, and failure tests |
| P0-13 | Run local verification and collect acceptance-criteria evidence                           | All                          | All implementation P0 items     | Complete evidence map                 |
| P0-14 | Create explicitly authorized Candidate Commit and true clean-clone verification           | All                          | P0-13                           | Clean-clone report                    |
| P0-15 | Complete independent review and Gate 2 decision                                           | All                          | P0-14                           | Review Report and Founder decision    |

## P1 — Minimum customer experience

| ID    | Work item                                                                                 | Epic                   | Dependencies        | Evidence                       |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------- | ------------------- | ------------------------------ |
| P1-01 | Build authenticated landing dashboard and safe state handling                             | Dashboard              | P0-08, P0-10, P0-11 | Component and browser tests    |
| P1-02 | Display recent user-owned jobs in deterministic order                                     | Dashboard              | P0-10               | Query and UI tests             |
| P1-03 | Display reserved-plus-consumed usage and remaining quota against the 20-PDF monthly limit | Dashboard              | P0-11               | Service/UI consistency tests   |
| P1-04 | Build minimal read-only profile                                                           | User Management        | P0-09               | Authorization and UI tests     |
| P1-05 | Build paginated PDF history                                                               | PDF History            | P0-10               | Pagination and isolation tests |
| P1-06 | Add completed-PDF download interaction and safe failure states                            | PDF History            | P0-10               | Download browser tests         |
| P1-07 | Add new-user and no-history empty states without advertising unavailable features         | Dashboard, PDF History | P1-01, P1-05        | UI tests and review            |
| P1-08 | Complete full regression, migration, security, and browser verification                   | All                    | P1-01 through P1-07 | Verification report            |

## P2 — Readiness and refinement

| ID    | Work item                                                                              | Epic                                    | Dependencies    | Evidence                                  |
| ----- | -------------------------------------------------------------------------------------- | --------------------------------------- | --------------- | ----------------------------------------- |
| P2-01 | Document search/filter extension contract without implementing it                      | PDF History                             | P0-02           | Reviewed design note in governed artifact |
| P2-02 | Add accessibility and responsive-state review for new surfaces                         | Dashboard, User Management, PDF History | P1 UI items     | Review findings and corrections           |
| P2-03 | Add safe operational event coverage for auth and quota failures without sensitive data | Authentication, Usage Quota             | Approved ADRs   | Log review and tests                      |
| P2-04 | Record subscription-readiness handoff and unresolved entitlement questions             | Usage Quota                             | Sprint evidence | Follow-up brief proposal                  |

## Explicitly excluded backlog

The following do not belong in this sprint: payments, subscriptions, checkout, billing, paid-plan entitlement, email/password authentication, anonymous quotas, organizations, API authentication, API keys, public API v1, conversion editor, search/filter implementation, queue redesign, worker redesign, PDF-engine redesign, infrastructure redesign, and unrelated refactoring. Paid plans belong to Revenue Sprint 2.

## Governance boundary

Backlog order is a planning proposal, not implementation authorization. Work begins only after applicable ADRs, the Specification, and Gate 1 receive Founder approval. Any additional file, feature, or architecture decision must be routed through the approved change process.
