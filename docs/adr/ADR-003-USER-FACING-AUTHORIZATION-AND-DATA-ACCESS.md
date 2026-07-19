# ADR-003: User-Facing Authorization and Data Access

**Status:** Draft

**Date:** 2026-07-19

**Author:** Software Architect

**Related Specification:** `docs/sprints/revenue-sprint-1/SPEC.md`

**Related Brief:** `docs/sprints/revenue-sprint-1/PROJECT_BRIEF.md`

**Depends on:** `docs/adr/ADR-002-AUTHENTICATION-AND-USER-IDENTITY.md`

## Context

Revenue Sprint 1 introduces authenticated profile, dashboard, history, download, and usage experiences over the released conversion foundation. ADR-002 establishes the verified Google identity, stable internal `User.id`, database-backed session, and ownership chain from `User` to `Conversion` to `ConversionFile`. This ADR defines how customer-facing application operations enforce that identity and ownership when reading data or accepting future customer conversion requests within the sprint.

The existing conversion endpoints are internal service interfaces. They authenticate a caller through a shared internal secret and operate across conversion records without deriving a customer from an application session. Their list, detail, and download behavior was designed for trusted internal callers, not for mutually untrusted customers.

Those endpoints cannot serve as customer authorization boundaries because:

- possession of an internal service secret proves service access, not customer identity;
- their requests do not establish the authenticated internal `User.id` defined by ADR-002;
- their database queries are not consistently scoped to a customer owner;
- exposing the shared secret to a browser or customer would compromise the entire internal boundary; and
- adding client-selected ownership to them would create an insecure direct-object-reference risk.

Revenue Sprint 1 therefore needs a separate customer-facing authorization and data-access boundary. It must remain small, preserve the internal endpoints, and avoid creating a package or public API before a second authorized consumer exists.

## Decision

### 1. Authorization identity

The internal `User.id` resolved from a valid server-side session is the only customer authorization identity.

Google subject, email, display name, provider token, cookie contents not validated against the session store, request parameters, and client-supplied user identifiers are not authorization identities. Provider identity establishes a session under ADR-002; product authorization uses the internal user associated with that validated session.

### 2. Session-derived identity only

Every customer-facing operation covered by this ADR must begin by resolving the current server session. The operation receives an authenticated context containing the internal `User.id`; it does not accept a user or owner identifier from route parameters, query parameters, request bodies, form fields, headers, or client state.

An invalid, expired, revoked, or absent session fails closed before customer data access. Client-side route guards and middleware redirects may improve navigation but are not sufficient authorization controls.

### 3. Web-application service boundary

Revenue Sprint 1 will keep customer authorization and data access inside the web application behind a dedicated server-only service boundary. A new workspace package or independently deployed service is not justified for this sprint.

The boundary will:

- expose use-case-oriented operations for current profile, recent jobs, history, conversion detail, completed-PDF download authorization, quota reads, and any approved customer conversion entry point;
- accept an authenticated internal user context from the server session;
- own authorization predicates, bounded query behavior, lifecycle checks, and safe result mapping;
- return customer-safe data transfer objects rather than raw database records; and
- remain inaccessible to browser bundles and direct client invocation except through protected server entry points.

Customer-facing pages, server actions, or route handlers may call this boundary. They must not independently recreate ownership rules. The existing internal endpoints remain separate and continue to use their internal authentication mechanism.

The service boundary is architectural; this ADR does not choose module names, file locations, framework primitives, or an implementation library.

### 4. Ownership-scoped database queries

Customer resources must be selected with ownership included in the database query or equivalent server-side data predicate.

For conversion-scoped operations, the minimum predicate is the requested conversion identifier together with `Conversion.userId = authenticated User.id`. Additional lifecycle predicates may be included where they do not prevent safe owner-specific status handling.

The implementation must not fetch a conversion by identifier alone and then treat a later application check as the primary authorization boundary. This avoids transient exposure through logs, caches, tracing, error differences, and future code paths that forget the second check.

### 5. No client-selected ownership

Customer requests must not supply or override `userId`, owner, account, organization, usage owner, or file owner.

For any future customer conversion entry point introduced within the approved sprint:

- the owner is assigned from the validated session;
- quota and usage operations use the same session-derived `User.id`;
- input limits and quota policy come from the approved Specification and quota architecture; and
- internal service credentials are not exposed or delegated to the customer.

### 6. Profile access

Profile access resolves the current user exclusively from the server session. There is no customer-facing profile lookup by arbitrary user identifier in this sprint.

The profile operation returns only fields approved by the Specification. It must not expose provider tokens, session records or tokens, password fields, internal role machinery, deleted-user details, or unrelated account data.

### 7. Dashboard recent-job queries

Dashboard recent jobs are selected where `Conversion.userId` equals the authenticated `User.id`. Results are bounded, ordered by `createdAt` descending and then `id` descending, and mapped to the approved customer fields.

Dashboard usage and remaining-quota reads use the same session-derived user identity and the authoritative quota service. Dashboard presentation must not calculate an alternative quota result from client data.

### 8. PDF history

PDF history is ownership-scoped at the database boundary and ordered deterministically by:

1. `createdAt` descending; and
2. `id` descending as the unique tie-breaker.

Pagination uses a bounded server-enforced page size and an opaque cursor representing the ordering tuple. The client may request a page size only within the server maximum. Offset-only pagination is not the primary history mechanism because concurrent job creation can make it unstable.

History returns only approved customer fields and never exposes raw HTML, provider data, session data, storage keys, filesystem paths, internal secrets, or unsafe error details.

### 9. Conversion status and detail reads

Status and detail operations query by both conversion identifier and authenticated owner. An authenticated owner may see the safe lifecycle state of their own pending, queued, processing, completed, failed, expired, or cancelled conversion.

Failure information is limited to approved customer-safe codes and messages. Internal exception details, stack traces, queue data, source storage references, network targets not already approved for display, and worker diagnostics remain internal.

### 10. Safe resource-not-found behavior

For customer-selected resource identifiers, the following states are indistinguishable at the authorization boundary:

- the resource does not exist;
- the resource belongs to another user; and
- the resource is a legacy ownerless record.

Each returns the same safe not-found classification, response shape, and externally observable authorization behavior. The system must not perform a secondary unscoped lookup merely to provide a more specific customer error.

Operational diagnostics may distinguish these cases only through internal, access-controlled evidence that does not expose another user's data or secrets.

### 11. Completed-PDF authorization

A customer PDF download is authorized only after an ownership-scoped conversion query establishes the authenticated user as owner. The server then verifies that:

- the conversion status is `COMPLETED`;
- the related `ConversionFile` record exists;
- the file record is not marked deleted;
- the conversion and file have not expired under the approved seven-day retention policy;
- the content type is the approved PDF type; and
- the storage object can be obtained through the configured storage abstraction.

If ownership is not established, the operation returns the common not-found behavior. If ownership is established but the conversion is incomplete or failed, download returns a safe not-ready classification. If the owner's PDF is expired or marked deleted, download returns a safe expired classification. A missing storage object returns a safe file-not-found result and produces internal operational evidence without exposing storage details.

### 12. Storage access boundary

Storage lookup occurs only after session validation, ownership-scoped database selection, and lifecycle authorization. The storage key comes from the authorized database relationship, never from customer input.

Storage keys, filesystem paths, cache paths, bucket internals, signed backend credentials, and internal object metadata are not returned to the customer. Customer download names are derived from approved conversion metadata and passed through the existing safe filename policy before use in response headers.

### 13. Quota and usage reads

Quota and usage reads accept only the session-derived internal `User.id`. They use the authoritative quota service and the approved policy of 20 PDFs per UTC calendar month.

The customer receives only the approved limit, used amount, remaining amount, and period boundaries. Raw usage records, other users' usage, internal accounting identifiers, and future entitlement data are not exposed.

This ADR governs authorization for quota reads and customer entry points. Reservation, consumption, release, concurrency, retry, and reconciliation semantics remain the responsibility of the required quota/accounting ADR.

### 14. Internal and customer-facing separation

Internal service endpoints and customer-facing operations remain separate authorization domains:

- internal endpoints authenticate an authorized service caller and retain their internal purpose;
- customer-facing operations authenticate a user session and enforce ownership through this ADR; and
- one boundary must not call the other by exposing, forwarding, or simulating the internal shared secret in a customer context.

Shared domain logic may be called beneath both boundaries when it does not carry caller authority. Authentication and authorization context must remain explicit at each entry point.

## Authorization Behavior

| Condition                                          | Profile and collection behavior                                                    | Conversion detail behavior                                      | PDF download behavior                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Unauthenticated request                            | Page may redirect to sign-in; data operation returns a safe unauthenticated result | Safe unauthenticated result                                     | Safe unauthenticated result                                                                        |
| Authenticated owner                                | Current profile, owned jobs, and owned usage may be returned                       | Safe detail and lifecycle status may be returned                | PDF may be returned only after all ownership, completion, file, retention, and storage checks pass |
| Authenticated non-owner                            | No other user's data is returned                                                   | Same safe not-found result as a missing resource                | Same safe not-found result as a missing resource                                                   |
| Missing resource                                   | Not applicable to current-profile access; empty collections are valid              | Safe not-found result                                           | Safe not-found result                                                                              |
| Ownerless legacy resource                          | Excluded from customer collections                                                 | Same safe not-found result as a missing resource                | Same safe not-found result as a missing resource                                                   |
| Expired or deleted PDF owned by requester          | History may show only the approved lifecycle state                                 | Safe owner-visible lifecycle state                              | Safe expired result; no storage lookup for a record already known to be expired or deleted         |
| Incomplete or failed conversion owned by requester | History may show the approved status                                               | Safe owner-visible status and customer-safe failure information | Safe not-ready result; no PDF bytes returned                                                       |

Response transport details must remain consistent with the application framework and approved Specification. The essential invariant is that unauthenticated, unauthorized, missing, and ownerless cases do not disclose protected data or cross-user existence.

## Alternatives Considered

### Reuse existing internal endpoints

**Rejected.** The internal shared secret authenticates services rather than customers, the endpoints are not uniformly owner-scoped, and exposing or proxying that credential into a customer flow would collapse the internal trust boundary.

### Fetch by identifier, then authorize afterward

**Rejected as the primary authorization pattern.** Although a correct second check can deny access, an initial unscoped fetch increases the chance of IDOR defects, unsafe logging, cache contamination, timing differences, and future callers omitting the check.

### Ownership-scoped query

**Selected.** Including `User.id` in the resource query makes ownership part of data selection, produces uniform not-found behavior, and keeps the authorization invariant close to the database boundary.

### Dedicated authorization/data-access package

**Rejected for Revenue Sprint 1.** The web application is the only approved customer-facing consumer. A new workspace package would add public surface, dependency boundaries, and maintenance before reuse is demonstrated. Extraction remains possible when a separately approved public API or another application consumer exists.

### Web-application service boundary

**Selected.** A server-only service layer inside the web application centralizes session-derived identity, ownership queries, lifecycle checks, and safe result mapping without adding a package or changing deployment architecture.

## Consequences

### Positive

- Customer authorization is tied to the stable internal identity established by ADR-002.
- Ownership-scoped queries materially reduce IDOR and resource-enumeration risk.
- Customer and internal service trust boundaries remain distinct.
- Dashboard, history, detail, download, profile, and quota reads use one authorization pattern.
- Storage identifiers and paths remain behind the database and storage abstractions.
- The sprint avoids premature package and service expansion.

### Negative

- Customer-facing operations cannot directly reuse the existing internal route handlers.
- The web application gains a server-only service layer that must remain centralized and tested.
- Uniform not-found behavior reduces customer-visible diagnostic specificity for unauthorized or ownerless identifiers.
- Cursor pagination and lifecycle-safe downloads require more deliberate queries than unscoped identifier lookup.

### Trade-offs

- **Scoped queries over post-fetch checks:** Slightly more specialized queries are accepted for stronger authorization and safer observable behavior.
- **Web boundary over shared package:** Lower immediate complexity is chosen over speculative reuse; future extraction may require controlled refactoring.
- **Uniform not-found behavior over precise external errors:** Reduced information disclosure is chosen over telling a requester that another user's resource exists.
- **Ownership through `Conversion` over duplicated file owner:** An authorization relationship join is accepted to preserve one ownership source of truth.
- **Opaque cursor over offset pagination:** More cursor handling is accepted for stable results under concurrent job creation.

## Security Considerations

### IDOR prevention

Every customer-selected conversion identifier is combined with the authenticated `User.id` in the authoritative query. Route protection alone, unpredictable identifiers, and client filtering do not satisfy authorization.

### Resource enumeration

Missing, non-owned, and ownerless resources produce the same customer-visible not-found behavior. Error shape, status classification, and response detail must not reveal ownership. Rate limiting is a separate control and does not replace scoped queries.

### Cache isolation

Authenticated profile, dashboard, history, detail, quota, and download responses must not enter shared public caches. Personalized data uses private, no-store behavior unless a later approved design proves a user-keyed cache cannot cross identities. Cache keys must never omit the authenticated identity when personalized caching is explicitly introduced.

### Error-message safety

Customer errors expose only approved safe codes and messages. They do not contain database errors, stack traces, internal IDs not approved for display, storage keys, paths, secrets, tokens, or another user's existence.

### Log safety

Logs must not contain session tokens, provider tokens, internal shared secrets, raw HTML, storage paths, storage credentials, or customer PDF contents. Security-relevant events may record an internal request identifier, safe event type, and internal user or conversion identifier under the approved logging policy, but must minimize personal data.

### Filename and download-header safety

Download filenames come only from authorized conversion metadata and pass through the existing filename sanitizer. Response headers must prevent header injection, force attachment behavior, declare the PDF content type, and prevent shared or persistent caching of private files.

### Database query scoping

Authorization predicates must be visible and testable at the query boundary. Tests must prove authenticated-owner success, cross-user denial, ownerless exclusion, missing-resource behavior, and lifecycle handling. Mocked UI behavior alone is insufficient evidence.

## Future Evolution

Future capabilities extend or replace the customer entry boundary through separate ADRs without weakening the ownership invariants established here.

### Public API

A future public API may call an extracted application service after authenticating an API principal and resolving it to an internal owner. API credentials, scopes, rate limits, and error contracts require a separate ADR. The internal endpoints are not the public API foundation.

### Organizations

A future organization model may allow an organization, rather than an individual user, to own conversions and usage. That requires an explicit ownership migration and authorization policy. Existing user ownership must not be silently reinterpreted.

### Teams

Team access may authorize members through organization membership while preserving an explicit resource owner. Membership changes, invitations, and team boundaries require separate decisions.

### Shared files

Sharing may introduce explicit grants separate from ownership. A grant must identify subject, resource, permissions, expiry, and revocation; knowledge of a conversion identifier is never a grant.

### Signed links

Short-lived signed downloads may be added through a separate ADR. A signature would represent a narrowly scoped delegated capability and must not expose storage keys or become an indefinite public URL.

### Administrative access

Administrative access requires an independently approved authorization model, audit evidence, purpose limitation, and least privilege. Administrative capability must not be inferred from ordinary customer routes or internal service credentials.

The emergence of a public API or second application consumer is the primary trigger to evaluate extracting the web-application service boundary into a dedicated package.

## Non-goals

This ADR does not define or authorize:

- a public API;
- API keys or API authentication;
- organizations;
- teams;
- role-based access control;
- file or conversion sharing;
- public or signed links;
- administrative access;
- subscriptions;
- billing;
- paid-plan entitlement;
- changes to the internal service authentication mechanism;
- implementation code, module names, route names, UI design, or deployment configuration; or
- quota reservation, consumption, release, retry, or reconciliation semantics.

These capabilities require future governed artifacts and approval.

## Open Questions

No unresolved architectural parameter blocks this ADR's boundary decision.

The exact default and maximum history page sizes, customer-safe error code names, and server module layout are implementation parameters to be fixed in the approved Specification or Implementation Tasks. If any parameter would change identity, ownership, trust-boundary separation, query scoping, or storage authorization, this ADR must be revised before implementation.
