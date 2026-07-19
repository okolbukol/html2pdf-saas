# Revenue Sprint 1 Milestone Plan

**Status:** Draft

**Purpose:** Define the logical delivery sequence, dependencies, parallel work, evidence points, and ADOS Gates for Revenue Sprint 1.

## Milestone outcome

Produce an independently verified user-management foundation containing secure Google authentication, persistent user identity, protected customer surfaces, user-owned PDF history and downloads, a minimal dashboard, and configurable accounting for the 20-PDF UTC calendar-month Free plan.

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

## Governing inputs

- `docs/sprints/revenue-sprint-1/PROJECT_BRIEF.md`
- `docs/sprints/revenue-sprint-1/SPEC.md`
- `docs/adr/ADR-002-AUTHENTICATION-AND-USER-IDENTITY.md`
- `docs/adr/ADR-003-USER-FACING-AUTHORIZATION-AND-DATA-ACCESS.md`
- `docs/adr/ADR-004-FREE-PLAN-QUOTA-AND-USAGE-ACCOUNTING.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- Released baseline `97672c16381f989ef561cd6fe936fce9ecc0dc14` / `v0.2.0-alpha`

## Stage 1 — Architecture preparation

### Sequence

1. Confirm the resolved Founder product decisions are recorded consistently in the planning artifacts.
2. Confirm ADR-002 records the resolved authentication library and adapter boundary, session and cookie policy, concurrent-session behavior, revocation rules, and callback policy.
3. Review ADR-003 for the user-facing authorization and web-application data-access boundary.
4. Review ADR-004 for the resolved 20-PDF UTC calendar-month quota and accounting architecture.
5. Confirm the ADRs collectively resolve provider mapping, service-boundary, concurrency, idempotency, and period-assignment decisions.
6. Reconcile ADR decisions into the Specification without expanding the Brief.

### Parallel work

- Authentication/session analysis and quota/accounting analysis can proceed in parallel.
- Authorization/data-access analysis can proceed alongside them after existing conversion and download boundaries are mapped.

### Exit evidence

- Gate 1-ready ADRs with alternatives and trade-offs.
- Specification with no unresolved architecture decision hidden in requirements.
- Traceability from every ADR to the Project Brief and Specification.

## Gate 1 — Design approval

The Founder reviews the exact Specification and applicable ADRs. No implementation begins before explicit Gate 1 approval. Approval authorizes only the recorded scope and does not authorize a commit, merge, tag, release, or push unless separately stated.

## Stage 2 — Identity and data foundation

### Sequence

1. Create the approved database migration.
2. Integrate the approved Google authentication and persistence adapter.
3. Implement session validation, expiry, and logout.
4. Implement first-login creation, repeat-login identity resolution, and last-login tracking.
5. Establish reusable server-side identity and authorization primitives.

### Parallel work

- Migration tests can be developed alongside session boundary tests once the ADR contracts are stable.
- Protected-route test cases can be prepared while authentication integration is implemented.

### Exit evidence

- Migration compatibility results from the released baseline.
- Authentication, session, logout, and provider-account mapping test results.
- Proof that secrets remain outside repository and client output.

## Stage 3 — Ownership and quota foundation

### Sequence

1. Implement user-scoped conversion history queries.
2. Implement user-scoped completed-PDF download authorization.
3. Implement configured lookup and quota-service reads for the 20-PDF UTC calendar-month Free plan.
4. Implement approved reservation, consumption, release, retry, and reconciliation behavior.
5. Integrate quota checks with every approved customer conversion entry point in scope.

### Parallel work

- History/download ownership and quota-service implementation can proceed in parallel after identity primitives and their ADR contracts are stable.
- Isolation tests and quota concurrency tests can be built in parallel with their respective implementation units.

### Exit evidence

- Cross-user list and download denial tests.
- Quota zero, partial, exhausted, concurrent, retry, and failure tests.
- Traceability from usage records to users and conversions under the approved semantics.

## Stage 4 — Customer surfaces

### Sequence

1. Build the authenticated dashboard shell and states.
2. Add recent jobs and quota summary.
3. Build the read-only profile.
4. Build paginated history and download interaction.
5. Record the search/filter extension design without implementing it.
6. Complete accessibility, responsive, empty, loading, and safe-failure states.

### Parallel work

- Profile can be implemented independently after identity services stabilize.
- Dashboard recent-jobs and quota-summary components can proceed in parallel against stable service contracts.
- History presentation can proceed in parallel with dashboard presentation after ownership queries are complete.

### Exit evidence

- Component and browser tests for every state.
- User-scoped service tests beneath UI tests.
- Demonstration that no unavailable feature is presented as complete.

## Stage 5 — Integrated verification

Run the approved verification suite in order, stopping on the first applicable blocking failure:

1. migration and schema validation;
2. formatting check;
3. typecheck;
4. lint;
5. production build;
6. unit tests;
7. applicable integration tests with required services;
8. applicable browser tests;
9. security and cross-user isolation tests;
10. acceptance-criteria evidence reconciliation.

Every check is classified as Passed, Failed, Blocked, or Not Applicable. A material correction invalidates dependent evidence and requires affected checks to be repeated.

## Stage 6 — Candidate and clean-clone verification

After local verification passes and the Founder explicitly authorizes the repository operation:

1. stage only approved milestone files;
2. inspect the staged candidate;
3. create one local Candidate Commit without tagging or pushing;
4. create a true clean clone at the exact commit;
5. install with the frozen lockfile and declared tool versions;
6. apply migrations in the approved test environment;
7. repeat every mandatory verification check;
8. confirm initial and final clean status and unchanged lock data.

The Candidate Commit provides identity for verification. It does not imply Gate 2, Gate 3, merge, release, tag, or push approval.

## Stage 7 — Independent review and Gate 2

The Reviewer receives the approved Brief, Specification, ADRs, exact candidate, acceptance mapping, clean-clone evidence, and permitted review context. Private implementation reasoning is excluded.

The Reviewer records findings and recommends readiness or blocking. The Founder alone approves, rejects, or returns Gate 2. Gate 2 approval is not a merge decision.

## Stage 8 — Gate 3 and release

After Gate 2 passes:

1. the Founder makes the explicit Gate 3 merge decision;
2. approved mechanical execution is performed and verified;
3. the Founder makes a separate release decision;
4. the approved version tag is created;
5. the branch and tag are pushed only with explicit authorization;
6. remote branch and tag identities are verified;
7. the working tree and authoritative remote are confirmed synchronized.

## Stage 9 — Closure

Prepare the Release Note and Retrospective, record remaining non-blocking work separately, verify milestone closure evidence, and only then begin the subscriptions/payments milestone.

## Dependency path

> Resolved Founder product decisions
> → ADRs and final Specification
> → Gate 1
> → identity/session foundation
> → ownership and quota services
> → customer surfaces
> → integrated verification
> → Candidate Commit
> → clean-clone verification
> → independent review
> → Gate 2
> → Gate 3
> → release decision
> → tag and push
> → release verification
> → closure

## Stop conditions

Stop affected work and escalate when:

- the scope expands beyond the five approved epics;
- an architectural choice lacks an approved ADR;
- identity, ownership, quota, or migration assumptions prove incorrect;
- a change to queue, worker, PDF engine, storage, infrastructure, or existing internal security boundaries becomes necessary;
- secrets or personal data could be exposed;
- a mandatory check fails or required infrastructure is unavailable;
- the candidate differs materially from the reviewed or verified state; or
- additional Founder authority is required.

## Milestone exit criteria

- Every applicable Specification acceptance criterion has passed with preserved evidence.
- Required ADRs and all three Gate decisions are recorded.
- Independent review is complete and blocking findings are resolved.
- Clean-clone verification passes at the exact candidate state.
- The approved merged state and release are committed, tagged, pushed, and remotely verified.
- The working tree is clean and synchronized with the authoritative remote.
- Subscriptions and payments remain unimplemented and are routed to the next governed milestone.
