# ADR-004: Free-Plan Quota and Usage Accounting

**Status:** Draft

**Date:** 2026-07-19

**Author:** Software Architect

**Related Specification:** `docs/sprints/revenue-sprint-1/SPEC.md`

**Related Brief:** `docs/sprints/revenue-sprint-1/PROJECT_BRIEF.md`

**Depends on:**

- `docs/adr/ADR-002-AUTHENTICATION-AND-USER-IDENTITY.md`
- `docs/adr/ADR-003-USER-FACING-AUTHORIZATION-AND-DATA-ACCESS.md`

## Context

Revenue Sprint 1 establishes a Free plan of 20 PDFs per UTC calendar month. Customer identity is the internal `User.id` resolved from a validated server session. Customer conversion entry points must enforce this quota before accepting work, and dashboard reads must report the same authoritative accounting state used by enforcement.

Simple counting of completed conversions is insufficient. Multiple requests can pass a count simultaneously and exceed the limit before any conversion completes. Work may remain queued or processing for some time, and retries can cause the same conversion to be observed more than once. A completed-conversion count also allows a customer to submit unlimited concurrent work while all jobs are pending.

Immediate permanent deduction is also insufficient. Queue acceptance can fail, rendering can fail after all retries, work can be cancelled, or a PDF can exceed the approved 20-page limit. Charging permanently when no usable PDF is produced would be unfair and would make operational failures consume customer allowance.

Client-side checks cannot protect the limit because the client can be modified, replayed, raced, or bypassed. In-memory and cache-only counters cannot provide durable authority across processes, restarts, reconciliation, or database recovery.

The quota architecture therefore needs a durable reservation ledger, concrete concurrency control, idempotent request mapping, explicit lifecycle transitions, UTC period assignment, and auditable reconciliation.

## Decision

### 1. Free-plan policy

The Free plan permits 20 quota units per UTC calendar month.

One quota unit represents one customer conversion that is reserved in the applicable period and ultimately produces one accepted PDF. A reservation occupies capacity immediately; it becomes consumed only after successful PDF production. A terminal non-success releases the reservation.

The approved 2 MB maximum HTML size, 20-page maximum PDF length, and seven-day PDF retention remain product constraints. A request rejected before acceptance creates no reservation. A conversion that cannot produce an accepted PDF within those constraints releases its reservation when it reaches a terminal non-success state.

### 2. Exact UTC period boundaries

For an instant `t`, the applicable quota period is the half-open interval:

> `[UTC start of the calendar month containing t, UTC start of the next calendar month)`

For example, every reservation created from `2026-07-01T00:00:00Z` through the instant before `2026-08-01T00:00:00Z` belongs to the July 2026 period. The next period begins exactly at `2026-08-01T00:00:00Z`.

Period calculations use UTC only. Browser locale, user locale, application-server local time, database-session local time, and Google profile locale do not affect quota boundaries.

### 3. Authoritative quota service

A server-only quota service is the sole authority for:

- resolving the current Free-plan configuration;
- calculating UTC period boundaries;
- checking capacity;
- creating and transitioning usage reservations;
- reporting current-period usage and remaining quota; and
- reconciling usage state with conversion evidence.

Customer pages, route handlers, server actions, workers, and internal jobs must not calculate or mutate quota independently. They call the quota service through server-only application boundaries.

The quota service uses the primary PostgreSQL database as the authoritative store. Redis, process memory, client state, and cached dashboard values may improve delivery but are not accounting authority.

### 4. Configurable plan and feature data

The 20-unit limit and calendar-month period are represented as approved plan/feature configuration in authoritative database data. Route logic and UI components must not embed the limit as their own policy.

At the first reservation for a user and period, the quota service records a durable period record containing:

- internal `User.id`;
- metric identifier for PDF conversions;
- UTC period start and end;
- the effective limit of 20; and
- the applicable plan/configuration identity or version.

The period record snapshots the effective limit for that period. Later configuration changes do not silently rewrite existing-period accounting. Future plan-change semantics require a separate decision.

### 5. Usage identity and ownership

Usage is keyed by the internal `User.id` derived from the validated server session. A client cannot supply or override the usage owner.

Each conversion reservation belongs to exactly one user, one UTC quota period, and one governed conversion. The `Conversion.userId`, reservation user, and authenticated user must agree. A mismatch fails closed and creates an auditable finding; it must not be repaired by trusting client data.

### 6. Usage ledger and conversion relationship

The authoritative usage ledger contains one reservation record per governed customer conversion. Each record contains at minimum:

- stable usage-record identifier;
- internal `User.id`;
- conversion identifier;
- quota metric;
- UTC period start and end;
- effective limit or reference to the period record;
- accounting state;
- idempotency-key hash;
- canonical request fingerprint;
- created and last-transition timestamps; and
- transition reason and reconciliation metadata when applicable.

The conversion relationship is unique: one governed conversion has at most one quota reservation for the PDF-conversion metric. The user-scoped idempotency key is also unique for the retained idempotency window.

Existing `UsageRecord` and `Conversion` models provide starting data relationships, but implementation must evolve the schema through a reviewed migration so accounting state, uniqueness, and audit requirements are enforced durably.

### 7. Check and reservation timing

Quota is checked after:

- session and internal user identity are validated;
- request structure and applicable input constraints are validated;
- the idempotency key and canonical request fingerprint are established; and
- an existing result for that user and key is checked.

Quota is checked before:

- new chargeable work is accepted;
- a new conversion is committed as accepted; and
- a new job is submitted to the queue.

The quota period record, conversion record, and `RESERVED` usage record are created or linked within the same database transaction under the concurrency control defined below. Queue submission occurs only after that transaction commits.

If queue submission fails, the conversion is moved to the approved safe terminal failure state and the reservation is released through an idempotent database transition. The request is not reported as accepted.

### 8. Reserve, consume, and release semantics

The system uses reserve-then-consume/release semantics:

- **Reserve:** A validated, non-duplicate request with available capacity creates a conversion and one `RESERVED` usage record. `RESERVED` immediately occupies one quota unit.
- **Consume:** The reservation becomes `CONSUMED` only when the PDF has been successfully produced, passed the approved output constraints, been stored, linked by a valid `ConversionFile`, and the conversion is committed as `COMPLETED`.
- **Release:** The reservation becomes `RELEASED` when the conversion reaches a terminal state without an accepted PDF.

The success transition should occur in the same database transaction that records the completed conversion and its file relationship. The storage object may necessarily be written before that database transaction, but the quota is not consumed until the authoritative completion records commit.

### 9. Terminal and retry behavior

- **Validation or policy rejection before reservation:** No usage record is created.
- **Limit exhaustion:** No conversion or reservation is created for new work; the service returns the approved quota-exhausted result.
- **Queue acceptance failure:** A created reservation transitions to `RELEASED`; the conversion records the safe terminal queue failure.
- **Conversion success:** `RESERVED` transitions to `CONSUMED` once, after authoritative completion.
- **Retryable conversion failure:** The reservation remains `RESERVED` while the same conversion is eligible for another attempt.
- **Final conversion failure:** `RESERVED` transitions to `RELEASED` after retries are exhausted or the failure is non-retryable.
- **Cancellation before accepted PDF completion:** `RESERVED` transitions to `RELEASED`.
- **Worker timeout with another approved retry:** The reservation remains `RESERVED`.
- **Final worker timeout:** `RESERVED` transitions to `RELEASED`.
- **Rejected PDF output, including the approved page-limit failure:** `RESERVED` transitions to `RELEASED` because no accepted PDF was produced.
- **PDF expiry after successful completion:** `CONSUMED` remains consumed. Retention expiry does not refund a successfully produced PDF.

Retries operate on the same conversion and reservation. They never create a new usage unit.

### 10. Dashboard usage calculation

For the current UTC period:

- **limit** is the snapshotted period limit, 20;
- **consumed** is the number of `CONSUMED` records;
- **reserved** is the number of active `RESERVED` records;
- **used for limit enforcement** is `consumed + reserved`; and
- **remaining** is `max(0, limit - consumed - reserved)`.

The dashboard's `used` value is the used-for-limit-enforcement value so that `used + remaining = limit`. The quota service may also return consumed and reserved components for safe status explanation, but the UI must not derive a competing calculation.

`RELEASED` records remain in the auditable ledger but do not count toward used or remaining quota.

### 11. Limit exhaustion and fail-closed behavior

When `consumed + reserved` is 20, the quota service rejects new chargeable work before creating a conversion or queue job. The response identifies Free-plan quota exhaustion without exposing ledger internals and may state the next UTC reset boundary. It must not imply a paid upgrade flow during Revenue Sprint 1.

The service fails closed when it cannot establish any mandatory input, including:

- validated internal `User.id`;
- authoritative plan configuration;
- UTC period identity;
- period lock;
- current ledger state;
- idempotency outcome;
- conversion ownership; or
- a durable reservation transition.

Database, lock, configuration, or reconciliation uncertainty must not result in accepted unaccounted work. A cached or client-calculated remaining value cannot override an authoritative failure.

## Concurrency Model

### Selected strategy

PostgreSQL serializes quota admission using a durable per-user, per-metric, per-period row and row-level locking.

The transaction for a new request performs these steps:

1. Resolve the authenticated internal `User.id`, metric, and exact UTC period.
2. Look up the user-scoped idempotency record; return the existing conversion for an exact duplicate or reject a conflicting reuse.
3. Create the period row if absent using a uniqueness constraint over user, metric, and period start. Concurrent creation uses insert-with-conflict handling and then reloads the single row.
4. Lock that period row for update.
5. Recheck idempotency inside the locked transaction.
6. Count authoritative ledger records in `RESERVED` or `CONSUMED` for the locked period.
7. If the count is 20, reject without creating a conversion or reservation.
8. Otherwise create the conversion and its unique `RESERVED` ledger record in the same transaction.
9. Commit before submitting the job to the queue.

All admission paths for this quota metric must use this transaction. The row lock makes concurrent requests for one user's period wait and observe the latest committed reservation count. Requests for different users or periods can proceed independently.

The unique reservation-to-conversion and user-to-idempotency constraints provide a second defense against duplicate accounting. Redis locks, in-memory mutexes, and client sequencing are not accepted substitutes.

### Justification

The current product database is PostgreSQL, and the quota limit is small. A per-user/per-period lock keeps the critical section narrow, avoids a global lock, and makes the durable ledger the source of truth. It favors correctness and auditability over maximum admission throughput, which is appropriate for the Free-plan foundation.

## Accounting State Model

The accounting states are:

- **RESERVED:** One unit occupies capacity for accepted work that has not reached a terminal outcome.
- **CONSUMED:** One unit was charged because an accepted PDF was successfully produced and authoritatively recorded.
- **RELEASED:** The reservation ended without a chargeable successful PDF and no longer occupies capacity.

`CONSUMED` and `RELEASED` are terminal. `EXPIRED` is not required because quota period expiry does not change the historical outcome of a reservation. `RECONCILED` is not a separate accounting state; reconciliation applies an allowed transition and records reconciliation metadata and reason.

### Allowed transitions

| Current state | Event                                                          | Next state            | Quota effect                                         |
| ------------- | -------------------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| None          | Accepted request with capacity                                 | `RESERVED`            | Occupies one unit                                    |
| None          | Duplicate request with matching fingerprint                    | Existing state        | No new unit                                          |
| None          | Duplicate key with different fingerprint                       | None; reject conflict | No new unit                                          |
| None          | Validation, ownership, policy, or quota rejection              | None                  | No unit                                              |
| `RESERVED`    | Queue acceptance failure                                       | `RELEASED`            | Frees one unit                                       |
| `RESERVED`    | Successful PDF production and authoritative completion         | `CONSUMED`            | Remains one used unit                                |
| `RESERVED`    | Retryable conversion failure or retryable timeout              | `RESERVED`            | Continues occupying one unit                         |
| `RESERVED`    | Final failure or final timeout                                 | `RELEASED`            | Frees one unit                                       |
| `RESERVED`    | Cancellation before successful completion                      | `RELEASED`            | Frees one unit                                       |
| `RESERVED`    | Reconciliation proves completed PDF outcome                    | `CONSUMED`            | Remains one used unit; records reconciliation reason |
| `RESERVED`    | Reconciliation proves terminal non-success                     | `RELEASED`            | Frees one unit; records reconciliation reason        |
| `CONSUMED`    | Retry, duplicate delivery, retention expiry, or reconciliation | `CONSUMED`            | No additional unit                                   |
| `RELEASED`    | Retry, duplicate delivery, or reconciliation                   | `RELEASED`            | No unit; terminal work cannot restart silently       |

A new attempt after a terminal conversion requires a new governed request, new idempotency key, new conversion, and new quota admission. A terminal usage record is never moved back to `RESERVED`.

## Chargeable Event

One quota unit represents one successfully produced, accepted PDF for a customer conversion, assigned to the UTC period in which its reservation was created.

The system reserves one unit when validated work is admitted, consumes it upon successful authoritative PDF completion, and releases it upon terminal non-success. This decision prevents:

- unlimited pending jobs bypassing a completed-only count;
- double charging during worker retry or duplicate delivery;
- permanent charges for queue or rendering failure; and
- moving a long-running job between quota periods based on completion timing.

The seven-day retention period affects file availability, not whether successful production consumed quota.

## Idempotency

### Request identity

Every customer conversion submission uses an opaque idempotency key that remains stable across client retries of the same intended request. A browser flow may generate the key before submission, but the server treats it only as a deduplication input, never as identity, ownership, permission, or a conversion identifier.

The authoritative uniqueness boundary is the pair of authenticated internal `User.id` and a cryptographic hash of the idempotency key. The raw key does not need to be retained after hashing.

### Request fingerprint

The quota service stores a canonical fingerprint of the normalized chargeable request. The fingerprint includes fields that determine conversion work and output, after validation and normalization. It excludes secrets and unstable transport metadata.

- Reuse of the same key by the same user with the same fingerprint returns the existing conversion and current accounting state without creating a new reservation or queue job.
- Reuse of the same key by the same user with a different fingerprint returns a safe idempotency-conflict result and creates no new work.
- Use of the same opaque key by a different user is independent because the uniqueness scope includes internal `User.id`.

### Conversion and worker retries

Each reservation maps uniquely to one conversion. Queue retries and worker retries carry the existing conversion identifier and transition the existing reservation idempotently. Duplicate success, failure, timeout, or reconciliation events against a terminal accounting state are no-ops that preserve the original terminal outcome and produce no additional charge.

The client cannot select `User.id`, conversion ownership, usage ownership, ledger state, quota period, or reservation identity.

## Period Boundaries

Usage belongs permanently to the UTC period in which the reservation was created, not the period in which rendering starts or completes.

- A reservation created before the month boundary and completed after it becomes `CONSUMED` in the earlier period.
- A reservation created before the boundary and released after it is released in the earlier period.
- A retry after the boundary remains attached to the original conversion, reservation, and earlier period.
- A new governed request after the boundary uses the new period even when it follows a prior-period failure.
- The current dashboard reports only the current period's ledger. Prior-period reservations and later transitions remain available as historical accounting evidence but do not reduce the new period's remaining capacity.
- At the exact boundary, the new period begins at `00:00:00Z`; there is no overlap or gap.

Assigning by reservation time prevents completion timing, queue delay, and retries from moving usage unpredictably between periods. It can allow PDFs reserved in the prior month to finish during the new month while the user also has new-month capacity; this is an accepted trade-off for deterministic admission and fair treatment of queued work.

## Reconciliation

### Authoritative records

The authoritative reconciliation inputs are:

- the quota period record and snapshotted configuration;
- the usage ledger;
- the owned `Conversion` record and lifecycle state;
- the related `ConversionFile` record;
- required storage evidence for completed PDFs; and
- preserved queue/worker evidence where conversion state is not terminal.

The usage ledger remains accounting authority, while conversion and file evidence determine whether a pending reservation should reach an allowed terminal state. Redis-only state and logs alone cannot authorize a charge or release.

### Triggers

Reconciliation occurs:

- synchronously when queue submission or conversion finalization cannot complete the expected accounting transition;
- on a scheduled scan for stale `RESERVED` records and cross-record inconsistencies;
- through an operator-triggered read-and-reconcile operation for a bounded user, conversion, or period; and
- before a discrepancy is treated as resolved after recovery from a partial failure.

### Stale reservations

A reservation is a stale candidate when it remains `RESERVED` beyond the configured operational threshold or when its conversion and queue evidence conflict. Age alone does not authorize release.

Reconciliation:

- transitions `RESERVED` to `CONSUMED` only when authoritative evidence proves successful accepted PDF completion;
- transitions `RESERVED` to `RELEASED` only when authoritative evidence proves terminal non-success;
- leaves an ambiguous reservation as `RESERVED`, fails closed for that occupied unit, and records a finding requiring recovery or operator review; and
- never changes `CONSUMED` or `RELEASED` automatically into another accounting state.

### Auditability

Reconciliation does not delete or rewrite usage history. Each transition records the previous state, next state, reason, timestamp, actor or process identity, related conversion, evidence reference, and reconciliation run identifier where applicable.

Operator adjustment, refund, or promotional credit is not represented by mutating this ledger and requires a future adjustment model.

## Alternatives Considered

### Count only completed conversions

**Rejected.** Concurrent pending work can exceed the limit, and long-running or retried jobs remain invisible until completion.

### Deduct immediately and never release

**Rejected.** Queue failures, terminal rendering failures, cancellations, and timeouts would charge customers without an accepted PDF.

### Reserve then consume or release

**Selected.** It blocks concurrent limit bypass while charging permanently only for successful accepted output.

### Calculate usage dynamically from Conversion rows

**Rejected as the accounting authority.** Conversion lifecycle states do not preserve idempotency, reservation timing, period snapshots, transition reasons, or auditable corrections with sufficient precision. Conversion evidence remains an input to reconciliation.

### Maintain an explicit UsageRecord ledger

**Selected.** A durable ledger represents reservation and terminal accounting outcomes independently while retaining a unique relationship to the conversion.

### In-memory or Redis-only counters

**Rejected.** They are not the durable Source of Truth, can diverge across processes or restarts, and cannot support authoritative reconciliation alone.

### Database-authoritative accounting

**Selected.** PostgreSQL transactions, row locks, constraints, and durable records provide the required concurrency control, idempotency, and auditability.

### Serializable transaction without a period lock row

**Not selected.** Serializable isolation could provide correctness with retries, but a stable per-user/per-period lock row makes contention scope and admission ordering explicit while retaining database transaction guarantees.

## Consequences

### Positive

- Concurrent requests cannot exceed the 20-unit period limit through racing admissions.
- Users are not permanently charged for terminal non-success.
- Pending work occupies capacity and cannot bypass the limit.
- Request replay and worker retry do not double-count.
- UTC month assignment is deterministic across queue delay and month rollover.
- Dashboard reporting and enforcement use the same authoritative ledger.
- Accounting discrepancies can be reconciled without deleting history.

### Negative

- The schema needs durable period, accounting-state, idempotency, fingerprint, and audit support.
- Admission requires a database transaction and row lock before queue submission.
- Stale reservations can temporarily reduce a user's available capacity while evidence is ambiguous.
- The system needs scheduled and operator-triggered reconciliation responsibilities.
- Prior-month work may complete in a new month without consuming new-month capacity.

### Trade-offs

- **Correctness over maximum per-user admission throughput:** Requests for one user and period serialize briefly; different users remain independent.
- **Fail closed over speculative availability:** Ambiguous reservations continue occupying capacity until evidence resolves them.
- **Reservation-period assignment over completion-period assignment:** Determinism and retry stability are chosen over counting by output completion date.
- **Explicit ledger over derived counts:** Additional records and transitions are accepted for idempotency, auditability, and reconciliation.
- **No automatic terminal reversal:** Historical integrity is chosen over hidden refunds or adjustments.

### Operational responsibilities

- Monitor reservation age and reconciliation findings.
- Run scheduled reconciliation and provide a bounded operator-triggered path.
- Alert on repeated idempotency conflicts, lock failures, ledger/conversion divergence, and ambiguous stale reservations.
- Preserve plan configuration versions and UTC period records.
- Keep database migrations, constraints, backups, and recovery procedures compatible with accounting integrity.
- Verify that dashboard summaries and admission decisions use the same service and current authoritative state.

## Security and Abuse Considerations

### Concurrent quota bypass

The per-user/per-period database row lock and in-transaction authoritative count prevent multiple concurrent requests from observing the same remaining slot.

### Replay and duplicate requests

User-scoped hashed idempotency keys, canonical request fingerprints, and unique conversion reservations prevent replay from creating additional work or charges.

### User-controlled identifiers

An idempotency key is untrusted input. It is length-bounded, normalized only as specified, hashed for storage, and never grants access to a conversion or ledger record.

### Forged ownership

Usage owner and conversion owner come only from the validated session's internal `User.id`. Client-supplied owner fields are rejected or ignored according to the approved input contract and never reach accounting authority.

### Fail-open behavior

Database, lock, configuration, identity, or ledger uncertainty blocks new chargeable work. Cached remaining values, UI checks, Redis counters, or operator assumptions cannot authorize a fail-open admission.

### Stale reservations

Stale reservations remain occupied until authoritative evidence permits transition. Scheduled reconciliation and operational findings prevent silent indefinite drift while preserving fail-closed behavior.

### Reservation-exhaustion denial of service

A user can consume their own available capacity by submitting valid work that remains pending. The bounded limit contains the impact to that user and period. Request validation occurs before reservation, and operational timeouts plus reconciliation resolve terminal work. Rate limiting and broader abuse controls are separate concerns and do not replace quota accounting.

### Log and audit safety

Logs and audit evidence must not contain raw idempotency keys, raw HTML, PDF contents, session tokens, provider tokens, secrets, storage paths, or unnecessary personal data. Safe internal user, conversion, usage, reconciliation, and request identifiers may be recorded under the approved logging policy.

## Future Evolution

The explicit period and usage ledger can be extended through future ADRs without changing the canonical internal user identity.

### Paid plans and different limits

Revenue Sprint 2 may select plan-specific limits and entitlement sources. New periods snapshot the effective approved plan configuration; existing periods retain their historical snapshot unless an explicit migration or adjustment policy says otherwise.

### Promotional credits

Credits require an additive, auditable adjustment model rather than mutation of historical reservation outcomes.

### Plan changes

Upgrade, downgrade, proration, and effective-time semantics require a separate ADR. They must state whether and how a current period limit changes while preserving the original ledger.

### Refunds and operator adjustments

Refunds or corrections require explicit adjustment entries with actor, reason, amount, evidence, and audit history. `CONSUMED` records are not silently rewritten.

### Organization quotas

Organization accounting may introduce a different owner type and membership authorization. It must not infer organization ownership from the current user ledger or silently move historical usage.

### API usage

A future API quota may use the same service after API authentication resolves an authoritative internal owner. API keys, scopes, per-key limits, and API idempotency contracts require separate decisions.

## Non-goals

This ADR does not define or authorize:

- payments;
- subscriptions;
- billing;
- paid entitlements;
- overage billing;
- anonymous quotas;
- promotional credits;
- organization quotas;
- API quotas or API authentication;
- an operator quota-management UI;
- refunds or discretionary adjustments;
- rate-limiting architecture;
- implementation code, schema names, SQL, module names, route names, or deployment configuration; or
- changes to authentication, ownership, PDF generation, storage, or retention architecture beyond the accounting relationships stated here.

These capabilities require future governed artifacts and approval.

## Open Questions

No unresolved question remains for core accounting semantics, concurrency, period assignment, or idempotency.

The following operational parameters must be fixed in the approved Specification or Implementation Tasks:

- the elapsed-time threshold at which a `RESERVED` record becomes a stale reconciliation candidate;
- the retention period for idempotency-key hashes and request fingerprints after their quota period closes;
- the bounded batch size and cadence for scheduled reconciliation; and
- the concrete plan-feature keys and schema names used to represent the approved policy.

These parameters must not change the 20-unit limit, UTC calendar-month boundaries, reservation-period assignment, reserve-then-consume/release model, database row-lock strategy, or uniqueness boundaries. If they would, this ADR must be revised before implementation.
