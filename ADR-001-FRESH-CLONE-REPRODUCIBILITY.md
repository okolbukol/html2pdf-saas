# ADR-001: Fresh-Clone Reproducibility for the Conversion Foundation

## 1. Status

- Status: Proposed
- Date: 2026-07-18
- Decision Owner: Founder / Decider
- Related Pilot Plan: `PILOT_PLAN.md`
- Related Project Brief: `PROJECT_BRIEF.md`
- Repository: `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`
- Baseline commit: `86734592b71c3fc16d375d7c75e1886bee49b027`
- Baseline tag: `v0.1.1-alpha`
- ADOS Foundation reference: Foundation Freeze commit `bc725b986befb25dbd11fdd8ed8dde1a84f213c3`, tag `v1.3.1-foundation-freeze`

This ADR is a proposal for Gate 1 consideration. It records no approval and authorizes no implementation.

## 2. Context

### Repository facts

- The workspace package `packages/storage` exists in the inspected local working directory with its package manifest, implementation, types, path handling, and tests.
- The broad `.gitignore` rule `storage/` matches `packages/storage`, so Git excludes the package together with the intended root runtime-data directory.
- Git contains no tracked files under `packages/storage`.
- Tracked web, worker, PDF-engine, Dockerfile, TypeScript, and lockfile content depends on `@html2pdf-pro/storage`.
- A fresh clone therefore omits package and source files required by tracked repository content and is incomplete.
- The existing checkout can build and run tests because the ignored local package remains present. Those results do not demonstrate clean-checkout reproducibility.
- Repository reproducibility cannot currently be demonstrated from a clean checkout.

These are repository defects: the source-control boundary excludes a required workspace package, and the resulting authoritative repository state is incomplete.

### Environment prerequisites observed during inspection

- Separate Playwright verification expected browser assets under `.cache/ms-playwright`. Those repository-local browser assets were absent, and verification failed with `PDF_GENERATION_FAILED`.
- Node execution initially depended on an available workspace-provided runtime because the default command environment did not expose Node on `PATH`.
- Docker and Docker Compose commands were installed, but the inspection context could not access the Docker engine.
- Prisma schema validation without injected configuration did not complete because `DATABASE_URL` was absent.

These observations identify environment or dependency-preparation prerequisites. They are not repository defects unless later evidence establishes a repository cause. The Playwright result in particular must not be classified as an implementation defect or a pass without further evidence after browser preparation.

## 3. Decision Drivers

- Fresh-clone completeness
- Explicit source-control boundaries
- Reproducible dependency installation
- CI/CD readiness
- Low-risk change scope
- No product redesign
- Verifiable clean-checkout workflow
- Compatibility with the existing package and workspace structure

## 4. Considered Options

### Option A — Keep `packages/storage` ignored

This option leaves the authoritative repository incomplete. Tracked dependants would continue to reference a package that is available only through local residue, so clean checkout, onboarding, automated validation, and release reproduction could not be trusted. It fails the Pilot objective.

### Option B — Narrow the ignore rule and version `packages/storage`

This option distinguishes the required source package from intended runtime storage and makes the package available through Git.

Benefits:

- A fresh clone receives the required workspace package without manual copying.
- The source-control boundary becomes explicit and reviewable.
- Existing package and workspace relationships can remain intact.
- Clean-checkout installation, build, and verification become testable against repository-backed inputs.

Risks:

- The local package contents require review before they become authoritative.
- An incorrectly narrowed boundary could expose runtime data or continue to ignore required source.
- Clean-checkout validation may reveal additional hidden assumptions.

Expected impact:

- The repository gains the currently missing package source and a corrected ignore boundary.
- Product behavior and broader architecture remain unchanged unless later evidence identifies a defect requiring a separately approved decision.

### Option C — Remove `packages/storage` and refactor dependants

This option would change tracked dependants and the existing package structure to eliminate the package. The verified problem is omission from source control, not a demonstrated defect in the package responsibility. Removing it would expand the Pilot into architectural and implementation refactoring without evidence that such change is necessary. It is disproportionate to the approved milestone.

### Option D — Generate `packages/storage` during setup

This option would replace a visible source package with setup-time generation. It would introduce a generated source or package boundary, require a new authoritative generator and generation contract, and add a hidden preparation dependency if generation were missed. No repository evidence shows that the package is intended to be generated. This option would make the reproducibility path more complex and less explicit.

## 5. Proposed Decision

For Founder consideration at Gate 1, propose that the project:

- narrow the broad `storage/` ignore boundary so intended runtime storage remains excluded without excluding the required source package;
- intentionally version the reviewed contents of `packages/storage`;
- preserve the package's current responsibility unless later inspection proves a defect requiring a separately governed change;
- document the runtime, browser, service, and configuration prerequisites required by the approved verification workflow;
- validate dependency installation and required checks from a clean checkout; and
- classify repository reproducibility failures separately from unavailable external services or local tooling prerequisites.

This proposal defines the decision boundary, not exact file edits or implementation instructions. It remains non-binding until the Founder explicitly approves it through Gate 1.

## 6. Consequences

### Positive consequences

- The authoritative repository can contain the workspace package required by tracked dependants.
- Fresh-clone completeness becomes directly verifiable.
- The intended distinction between source files and runtime storage becomes explicit.
- Installation, validation, and release evidence can be tied to repository-backed inputs rather than hidden local files.
- Environment-preparation failures can be reported separately from repository or application defects.

### Negative consequences

- The local package contents must be reviewed before versioning.
- Clean-checkout preparation and evidence collection add work to the milestone.
- Environment prerequisites must be documented and prepared before all applicable checks can produce conclusive results.

### Risks

- Runtime data could be exposed if the ignore boundary is narrowed incorrectly.
- Required package files could remain excluded if the boundary is still too broad.
- The local package could contain defects or unintended content not visible in the current tracked baseline.
- Additional hidden local dependencies could appear during clean-checkout validation.
- Missing browsers, services, runtime access, or configuration could make checks inconclusive.

### Mitigations

- Review the complete package and intended source-control manifest before implementation approval and staging.
- Verify both sides of the boundary: required package source is tracked and intended runtime data remains excluded.
- Perform installation and verification in a clean checkout outside the existing working directory.
- Record prerequisites, environment preparation, exact repository state, and every pass, failure, or inconclusive result.
- Route newly discovered scope or architecture issues back through the appropriate ADOS stage rather than expanding implementation silently.

## 7. Verification Strategy

Gate 2 evidence must demonstrate all of the following against the exact reviewed candidate:

1. A clean checkout is created outside the existing working directory.
2. Dependencies are installed from repository-declared package and lock files without copying local source into the checkout.
3. `packages/storage` is present after checkout and installation without manual copying or generation from an unrecorded source.
4. Typecheck passes.
5. Lint passes.
6. The formatting check passes.
7. The production build passes.
8. Unit tests pass, with exact test-file and test counts recorded.
9. Playwright verification passes when required browser and environment prerequisites are installed.
10. When external services or other prerequisites are unavailable, affected checks are explicitly classified as failed, blocked, or not executed as appropriate and are not falsely reported as passed.
11. The clean checkout has no hidden reliance on required files outside Git.
12. The ignore boundary continues to exclude intended runtime storage while allowing the required package source to be versioned.

Evidence must include the evaluated repository identity, environment and prerequisite preparation, commands or equivalent checks performed, complete outcomes, and limitations. A material change to the candidate invalidates dependent evidence and requires renewed verification.

## 8. Rollback Strategy

If implementation fails before approval or release, stop the milestone and return the candidate to the last approved repository state without changing that baseline. Remove only the proposed candidate changes from the implementation workspace, preserve the failure evidence, and route the finding to the responsible stage for reassessment.

If failure is discovered after a repository change has been approved and recorded, prepare a separately reviewed reversal that restores the prior ignore boundary and package state together. The reversal must not leave tracked dependants pointing to an absent package, expose runtime data, discard evidence, or bypass the applicable ADOS approval and verification sequence.

Rollback does not authorize deletion of local evidence or alteration of published history.

## 9. Scope Boundaries

This ADR does not authorize:

- new product features;
- UI changes;
- queue redesign;
- PDF engine redesign;
- broad infrastructure changes;
- unrelated refactoring;
- dependency upgrades not required by the approved reproducibility correction;
- product behavior changes unsupported by verified evidence; or
- changes to the frozen ADOS Foundation.

## 10. Gate 1 Conditions

Gate 1 may pass only when:

- the Project Brief is approved;
- this ADR is reviewed;
- the milestone scope and boundaries are understood;
- the recorded risks, consequences, and verification strategy are accepted;
- the required Specification is complete and consistent with this ADR; and
- the Founder explicitly records the Gate 1 decision for the governed artifacts.

The Founder may approve, reject, or return the proposal. Proposed status, review completion, or specialist recommendation does not constitute Gate approval. No implementation may begin before explicit Gate 1 approval is recorded.
