# ADR-002: Authentication and User Identity

**Status:** Draft

**Date:** 2026-07-19

**Author:** Software Architect

**Related Specification:** `docs/sprints/revenue-sprint-1/SPEC.md`

**Related Brief:** `docs/sprints/revenue-sprint-1/PROJECT_BRIEF.md`

## Context

Revenue Sprint 1 moves the released conversion foundation toward a commercial product. The current application can create, process, list, and download PDF jobs through internal-only interfaces, but it does not authenticate customers or enforce customer ownership. Subscriptions and payments cannot be introduced safely until the product has a stable internal user identity to which sessions, conversion jobs, stored PDFs, usage, and later entitlements can be attached.

The existing database schema already separates `User`, provider `Account`, and `Session` records. `Conversion` has an optional `userId`, and `ConversionFile` belongs to a `Conversion`. These fields provide a starting structure, but no authentication lifecycle or user-facing authorization boundary is implemented.

The Founder has selected Google OAuth as the only authentication provider for this sprint and excluded email/password authentication. Revenue Sprint 1 also establishes a Free Plan of 20 PDFs per month with reset at 00:00 UTC, a maximum HTML size of 2 MB, a maximum PDF length of 20 pages, and seven-day PDF retention. Those product limits remain Specification and quota/storage concerns; this ADR defines the identity and ownership basis on which they are enforced.

Authentication must therefore provide:

- a verified external identity;
- a stable internal identity independent of email or provider tokens;
- revocable server-validated sessions;
- server-side route and data protection; and
- unambiguous ownership of conversion jobs and generated PDF files.

## Decision

### 1. Authentication provider

Revenue Sprint 1 will support Google OAuth only. The sign-in flow will use Google's identity assertions through its OAuth 2.0/OpenID Connect flow. No other sign-in provider or local credential flow will be exposed in this sprint.

The implementation library and adapter remain replaceable beneath this architecture, but the selection for Revenue Sprint 1 is recorded below.

### 2. Authentication library and database adapter

Revenue Sprint 1 will use Auth.js for Next.js through the `next-auth` package and the `@auth/prisma-adapter` database adapter. It will use Auth.js's database session strategy and the built-in Google provider. No credential provider or additional authentication service will be introduced.

This is the smallest compatible selection because:

- the web application already uses the Next.js App Router, which Auth.js supports through server handlers and server-side session access;
- the repository already uses Prisma and PostgreSQL;
- the existing `User`, `Account`, `Session`, and `VerificationToken` models follow the Auth.js adapter entity separation;
- the installed Prisma major version satisfies the adapter's documented Prisma baseline;
- database sessions preserve the required server-side validation and revocation behavior; and
- the selection adds an application library and one adapter without a new deployed service or component.

The Prisma adapter will be wrapped by a narrow repository-local mapping boundary rather than used as an unchecked record spread. That boundary will:

- persist only the Google provider identity fields required to resolve the `Account` mapping;
- discard Google access tokens, refresh tokens, and identity tokens before account persistence because no Google API access is required;
- map only fields supported by the existing Prisma models, including omitting an optional provider image unless a separately approved schema change adds one; and
- preserve the original session expiry instead of extending it through an adapter update.

This wrapper adapts library records to the existing schema and security requirements. It does not create a new service, identity model, or authentication method. Package versions must be pinned during the approved implementation and remain compatible with the repository's Next.js 15, React 19, and Prisma 6 baseline.

### 3. Verified Google identity

The authoritative external identifier is the stable Google subject identifier issued for the configured client, represented by the provider account key. Email is profile data and is not the primary identity key.

Sign-in will be accepted only when:

- the callback is valid for the configured Google client;
- OAuth state and OpenID Connect validation succeed;
- the issuer, audience, expiry, and signature are valid;
- the Google subject identifier is present; and
- Google asserts that the email is verified.

The application will not trust a client-supplied email, user ID, or provider account ID. It will not automatically link accounts solely because email strings match.

### 4. Persistent internal User entity

Every accepted Google identity maps to a persistent internal `User` record. The internal `User.id` is the canonical identity for all application authorization, ownership, usage, and future entitlement relationships.

The `User.id`:

- is generated and owned by the application database;
- remains stable when profile data such as name or email changes;
- is never replaced by a Google subject, email address, session token, or provider token; and
- is the only user identifier propagated into product-domain ownership checks.

The provider-neutral `User` entity remains separate from authentication-method records. Provider-specific identity data belongs to `Account`.

### 5. One internal user per Google account

For this sprint, one Google provider account maps to exactly one internal user, and first sign-in creates at most one internal user for that provider account.

The mapping is keyed by the unique pair of provider and provider account identifier. Creation and lookup must be atomic or transactionally safe so concurrent callbacks cannot create duplicate mappings.

Repeated sign-in with the same Google account resolves the existing internal user. A changed display name or email updates approved profile data without changing `User.id` or creating a new user.

Automatic account linking is not permitted in Revenue Sprint 1. If a new Google subject conflicts with an email already assigned to another user, sign-in fails closed and requires an explicitly designed future account-resolution flow. The implementation must not merge users based only on email equality.

### 6. Provider token handling

Google access tokens and refresh tokens are not application identities. Because this sprint uses Google only to authenticate and does not call Google APIs on the user's behalf, provider access and refresh tokens will not be retained beyond what the approved authentication flow strictly requires.

Authorization codes, identity tokens, access tokens, refresh tokens, session tokens, and provider secrets must not enter logs, client-readable application state, URLs after callback handling, queue payloads, or repository history.

### 7. User creation and login tracking

The first successful verified sign-in creates the internal `User` and its Google `Account` mapping as one safe unit of work. Later successful sign-ins resolve that mapping and update `lastLoginAt` only after authentication succeeds.

Existing released-baseline users remain valid. Existing conversions with no `userId` are not assigned to a newly authenticated user by inference.

### 8. Session lifecycle

The application will use persistent, database-backed sessions represented by an opaque, high-entropy session token held in a cookie and a corresponding server-side session record associated with `User.id`.

The lifecycle is:

1. A session is created only after successful verified Google sign-in and internal-user resolution.
2. The browser receives only the opaque session token in an HTTP-only cookie.
3. Every protected request validates the token against the server-side session record, its expiry, and its user.
4. A missing, invalid, expired, or revoked session fails closed.
5. Each session has a fixed absolute maximum lifetime of 30 days from creation.
6. Revenue Sprint 1 does not use sliding renewal; session access must not extend the stored expiry.
7. Expired sessions are rejected and may be removed through controlled cleanup.
8. A session is invalid when its server-side record expires, is explicitly revoked, or is deleted.

The production session cookie configuration is fixed:

- name: `__Host-html2pdf_session`;
- `Secure`: `true`;
- `HttpOnly`: `true`;
- `SameSite`: `Lax`;
- `Path`: `/`; and
- `Domain`: omitted.

Local development may set `Secure` to `false` only when HTTPS is unavailable. No other production cookie property may be weakened. Because browsers require the `Secure` attribute for a `__Host-` prefixed cookie, local HTTP compatibility must be verified during implementation; local HTTPS is required if the browser rejects the approved cookie name without `Secure`.

Server session validation is the authorization source. Middleware or client-side navigation may improve routing behavior but cannot be the sole protection.

### 9. Concurrent sessions and logout

Logout will revoke the current server-side session and clear the browser cookie. After logout, reuse of the previous cookie must not restore access.

Successful sign-in does not revoke previous valid sessions. Multiple browser and device sessions are allowed. Logout affects only the current application session; it does not revoke other valid sessions, the user's Google account, or the user's Google login.

A session must cease to authorize requests when its server-side record is explicitly revoked or deleted. Security-driven global revocation, all-device logout, and session-management UI are future administrative capabilities outside Revenue Sprint 1.

### 10. Callback policy

Google callback URLs must be exact, environment-specific allowlisted values. Wildcard callback URLs are prohibited. Redirect or callback URLs supplied by a customer are not trusted or used to select a destination.

Repository configuration establishes the local application origin as `http://localhost:3000`. The corresponding exact development callback is:

- `http://localhost:3000/api/auth/callback/google`

Review, staging, and production callbacks must use HTTPS and the same exact `/api/auth/callback/google` path on their approved application origins. The repository contains no authoritative review, staging, or production application domain, so those exact callback URLs cannot be recorded without external deployment configuration. This blocks provider registration and callback verification for those environments, but it does not change the architecture.

### 11. Protected routes and operations

The following Revenue Sprint 1 surfaces require a valid server session:

- dashboard;
- user profile;
- PDF job history;
- PDF status and detail reads;
- completed-PDF download;
- usage summary and remaining quota; and
- any customer conversion entry point introduced or exposed by the approved sprint scope.

Unauthenticated page requests may redirect to sign-in. Data and file operations must return an unauthenticated response and no private payload. Redirect behavior does not replace server-side authorization.

The existing internal conversion endpoints remain internal service boundaries protected by their existing mechanism. They are not converted into public customer APIs by this ADR.

### 12. PDF job ownership boundary

Every customer-created conversion must set `Conversion.userId` from the validated server session. A client request must not select or override the owner.

Reads and mutations for a customer conversion must include the authenticated `User.id` in the server-side query or equivalent authorization predicate. Fetching by conversion ID and filtering afterward is insufficient where a single ownership-scoped query is possible.

The system must not disclose whether another user's conversion identifier exists. Existing conversions whose `userId` is null remain invisible to customer history and customer download flows unless a future approved migration establishes ownership from authoritative evidence.

### 13. Stored PDF ownership boundary

Ownership of a generated PDF is derived from its `ConversionFile` relationship to the owning `Conversion`. A separate user identifier is not duplicated onto the stored file record for this sprint.

A download is authorized only when one server-side operation establishes that:

- the session resolves to the owning `User.id`;
- the requested conversion belongs to that user;
- the conversion status permits download;
- the related PDF record is valid and not deleted or expired; and
- the stored object is available within the seven-day retention rule.

The client never supplies or receives the storage key or filesystem path. Storage lookup occurs only after ownership and lifecycle checks. Missing, expired, non-completed, and non-owned PDFs fail without revealing cross-user existence.

### 14. Authorization identity boundary

All application authorization uses internal `User.id`. Google identity proves who may establish a session; it does not directly authorize product data after the session is created.

The following values must not be accepted as substitutes for the internal authorization identity:

- email address;
- Google subject supplied by a client;
- display name;
- provider access token;
- conversion owner supplied in request data; or
- file or storage identifier.

## Rationale

Separating external identity, internal user identity, and server session state prevents provider-specific details from spreading into product-domain records. A stable internal identifier supports current ownership and quota needs while allowing future authentication methods to attach to the same user.

Database-backed sessions add a server lookup but provide direct expiry and revocation, which are valuable before introducing billing and paid entitlements. Ownership derived through `Conversion.userId` and `ConversionFile → Conversion` preserves a single authorization chain and avoids trusting client identifiers or storage paths.

Refusing automatic email-based linking favors account safety over convenience. Account linking changes identity authority and therefore requires its own reviewed design.

## Consequences

### Positive

- Product data is owned by a stable internal identity rather than an email or vendor token.
- Logout and session expiry can be enforced server-side.
- Google-specific details remain isolated in provider-account records.
- Conversion history, PDF downloads, quota usage, and future entitlements share one ownership key.
- The existing `User`, `Account`, `Session`, `Conversion`, and `ConversionFile` direction can be evolved rather than replaced.
- Future providers can be added as authentication methods without redesigning product-domain ownership.

### Negative

- Google availability and correct OAuth configuration become sign-in dependencies.
- Users have no fallback sign-in method during this sprint.
- Database-backed sessions add a read and operational cleanup responsibility to authenticated requests.
- The selected Auth.js integration requires a narrow adapter mapping boundary rather than using every provider field unchanged.
- Exact review, staging, and production callback URLs remain dependent on external deployment domains not present in the repository.
- Strict refusal to auto-link matching emails can require manual resolution for rare identity conflicts.
- Existing unowned conversions are not visible to newly authenticated users.

### Trade-offs

- **Database sessions over stateless sessions:** More server state and database dependency are accepted in exchange for direct revocation and authoritative logout.
- **Adapter mapping over raw adapter persistence:** A small mapping boundary is accepted to preserve the existing schema, prevent unnecessary provider-token retention, and enforce fixed expiry without adding a service.
- **Provider subject over email:** A less human-readable key is accepted in exchange for stable, provider-issued identity that survives email changes.
- **No automatic account linking:** Additional future workflow is accepted to avoid account takeover through unsafe email matching.
- **Ownership through the conversion relationship:** An authorization join is accepted to avoid duplicating user ownership on file records and creating divergent sources of truth.
- **Google only:** Faster delivery and smaller test scope are gained at the cost of provider dependency and reduced user choice.

## Future Evolution

The internal `User` remains the stable product identity. New authentication methods extend provider or credential records around that entity; they do not replace `User.id` in conversions, usage, sessions, or future entitlements.

### GitHub login

A future ADR may add GitHub as another provider-account type. Its stable provider identifier maps to `Account` and then to an existing or new `User` through an explicit linking or onboarding flow.

### Microsoft login

A future ADR may add Microsoft identity using its stable subject and tenant/issuer context. Provider-account identity may need additional issuer or tenant metadata, but the internal `User` and domain ownership model remain unchanged.

### Email/password

A future credential ADR may add password-based authentication using a securely hashed credential associated with `User`. Password reset, email verification, breach controls, and credential lifecycle would be new responsibilities; product records would continue to reference `User.id`.

### Account linking

A future linking flow may allow one internal user to hold multiple provider accounts. Linking must require an already authenticated session, fresh proof of control for the new account, conflict detection, audit evidence, and a safe unlink policy. Matching email alone must not authorize linking.

### Enterprise SSO

A future ADR may map enterprise issuer, tenant, and subject identity to provider-account records and add organization membership separately. Enterprise identity changes the authentication source, not the internal `User` identity or existing product ownership key.

## Non-goals

This ADR does not define or authorize:

- subscriptions;
- billing;
- payment providers;
- API authentication or API keys;
- organizations;
- teams;
- role-based access control;
- paid-plan entitlement;
- email/password authentication;
- additional OAuth providers;
- automatic account linking;
- organization-owned conversions or files; or
- implementation code, route implementation, UI design, or deployment configuration beyond the callback policy recorded here.

Subscriptions, billing, payment providers, API authentication, organizations, teams, and role-based access control belong to future ADRs and governed milestones.

## Resolved Pre-Gate 1 Parameters

The Founder has resolved the authentication library and adapter family, fixed session lifetime, renewal mode, concurrent-session behavior, revocation conditions, production session cookie, and callback policy recorded in this ADR. No authentication architecture parameter remains open for Gate 1.

The exact review, staging, and production application domains are external deployment configuration inputs that are absent from repository evidence. Their callback URLs must be recorded and allowlisted before authentication is configured or verified in those environments. They must not be inferred or replaced by wildcard values.

## Compatibility References

- [Auth.js Next.js integration](https://authjs.dev/reference/nextjs)
- [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma)
- [Auth.js Google provider](https://authjs.dev/getting-started/providers/google)
- [Auth.js session and cookie configuration](https://authjs.dev/reference/core)
