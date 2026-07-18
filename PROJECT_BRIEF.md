# Project Brief

## 1. Status

- **Status:** Proposed
- **Author:** Codex acting as Repository Engineer and Orchestrator support
- **Date:** 2026-07-18
- **Project:** HTML2PDF SaaS / HTML2PDF Pro
- **Repository:** `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`
- **Related Pilot Plan:** `PILOT_PLAN.md`
- **Related ADOS Foundation version:** Foundation Freeze commit `bc725b986befb25dbd11fdd8ed8dde1a84f213c3`, tag `v1.3.1-foundation-freeze`
- **Project baseline:** `main` at commit `86734592b71c3fc16d375d7c75e1886bee49b027`, tag `v0.1.1-alpha`

This Project Brief is proposed for Founder consideration. It does not approve architecture, pass Gate 1, or authorize implementation.

## 2. Problem Statement

Repository inspection established these problems:

1. The workspace package `packages/storage` exists in the local working directory, including its package manifest, source, types, path handling, and tests.
2. The `.gitignore` entry `storage/` matches `packages/storage`, so the package is unintentionally excluded from Git. `git check-ignore` identifies that rule as the exclusion source, and Git contains no tracked files under `packages/storage`.
3. Tracked web, worker, PDF-engine, Dockerfile, TypeScript, and lockfile content references `@html2pdf-pro/storage`. A fresh clone therefore lacks package and source files required by tracked repository content and is incomplete.
4. The local checkout can run its unit suite because the ignored package remains on disk. That local success does not prove that a fresh clone can reproduce the same result.
5. Separate Playwright verification currently depends on browser assets expected under `.cache/ms-playwright`. That repository-local browser cache was missing during inspection, and the Playwright verification failed with `PDF_GENERATION_FAILED`.
6. Repository reproducibility cannot yet be guaranteed because the authoritative Git state omits a required workspace package and the browser-verification prerequisites are not presently satisfied in the inspected environment.

The Playwright result is treated as an environment or dependency-preparation issue unless later evidence demonstrates an implementation defect.

## 3. Business Objective

A reproducible repository is necessary for:

- **Onboarding:** A new contributor must be able to obtain the complete project from the authoritative repository without relying on hidden files from another workstation.
- **CI/CD:** Automated environments begin from repository state and must receive every required package, source file, lockfile relationship, and documented prerequisite.
- **Contributor confidence:** Install, validation, and build results should depend on versioned inputs rather than undeclared local residue.
- **Long-term maintainability:** Required source packages and environment assumptions must remain visible, reviewable, and recoverable as machines, contributors, and tooling change.
- **Trustworthy releases:** A released commit and tag should be sufficient to reproduce the verified baseline and its evidence from a clean checkout.

The intended business outcome is a conversion foundation whose recorded repository state is complete enough for repeatable contribution, validation, and release work.

## 4. Pilot Objective

The primary objective is to validate ADOS governance through a real, bounded HTML2PDF repository milestone.

The implementation exists to exercise and evaluate artifact preparation, architecture analysis, Gate decisions, Context Pack sufficiency, bounded implementation, independent review, verification evidence, traceability, release discipline, and retrospective. Product repository correction is necessary Pilot activity, but ADOS validation remains the principal evaluation objective.

This Brief does not modify or expand the frozen ADOS Foundation.

## 5. Scope

The milestone includes only:

- intentional versioning of the required `packages/storage` workspace package;
- correction of the ignore boundary so the source package is trackable while intended runtime storage remains ignored;
- validation from a clean checkout that contains no hidden local source dependency;
- dependency-installation validation using the repository's declared package manager and lockfile;
- production build validation;
- TypeScript typecheck;
- lint validation;
- formatting validation;
- unit-test execution and preservation of exact results; and
- Playwright verification when its browser and environment prerequisites are satisfied, with preparation failures distinguished from application failures.

The later Specification and Architecture Proposal must define the exact file set, clean-checkout procedure, prerequisites, acceptance criteria, and required evidence before Gate 1 consideration.

## 6. Out of Scope

The milestone excludes:

- new product features;
- UI redesign;
- queue redesign;
- PDF engine redesign;
- infrastructure redesign;
- unrelated refactoring;
- authentication, payments, billing, API keys, public API, dashboard, template, or admin work;
- dependency upgrades not required by an approved reproducibility correction;
- production deployment or scaling; and
- changes to the ADOS Foundation or creation of new ADOS normative requirements.

## 7. Success Criteria

The milestone succeeds when:

1. A fresh clone of the approved repository state contains the intentionally versioned storage package and no required source package depends on untracked local files.
2. The fresh clone can reproduce the verified baseline using documented prerequisites and the repository's declared dependency-installation process.
3. Required typecheck, lint, formatting, production build, unit-test, and applicable Playwright results are executed and recorded accurately against the approved candidate.
4. Browser or other environment preparation is documented, and a missing prerequisite is not reported as an application pass or defect without supporting evidence.
5. All required verification evidence is preserved and traceable to the exact repository state evaluated.
6. Required ADOS project artifacts, independent review, Gate decisions, release evidence, metrics, and retrospective remain complete and internally consistent.
7. The mandatory repository closure sequence is completed only after approval: test, commit, tag, push, and remote verification.

Finding a verified defect or environment limitation does not by itself make the Pilot unsuccessful when it is recorded, routed, and dispositioned honestly.

## 8. Risks

Only observed risks are recorded here:

- **Hidden local dependencies:** The current checkout contains a required package that Git does not contain, allowing local success to mask fresh-clone incompleteness.
- **Ignored packages:** The broad `storage/` ignore rule excludes both runtime storage and the required `packages/storage` source package.
- **Environment-specific assumptions:** The default command environment did not expose Node on `PATH`; validation required an available workspace Node runtime.
- **Docker availability and access:** Docker and Docker Compose commands were installed, but the inspection context could not access the Docker engine. Real service validation was not established.
- **Browser dependency installation:** The expected repository-local Playwright browser cache was missing, and the separate Playwright verification failed before a reproducible passing result was established.
- **Configuration availability:** Prisma schema validation without injected configuration stopped because `DATABASE_URL` was absent.

These risks must remain separate from unverified causes or proposed solutions.

## 9. Assumptions

### Verified

- The canonical repository is `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`.
- The inspected baseline is commit `86734592b71c3fc16d375d7c75e1886bee49b027` on `main`, tagged `v0.1.1-alpha`.
- `packages/storage` exists locally and is excluded by the `.gitignore` rule `storage/`.
- Git tracks references to `@html2pdf-pro/storage` but no files under `packages/storage`.
- With an available Node runtime, 12 unit-test files and 40/40 unit tests passed in the current local checkout.
- Typecheck, lint, formatting verification, and the production build passed in the current local checkout.
- `.cache/ms-playwright` was absent, and the separate Playwright verification failed with `PDF_GENERATION_FAILED`.
- Docker-engine access was denied during inspection, and Prisma validation without `DATABASE_URL` did not complete.

### Assumed

- The existing local `packages/storage` content represents the intended source package, subject to Architecture Proposal, Specification, review, and Gate 1 approval.
- Correcting the ignore boundary and intentionally versioning the reviewed package is likely necessary for a complete fresh clone.
- A documented Playwright browser-preparation step is likely required before applicable Playwright verification can produce a meaningful application result.

Assumptions are not approved facts and must be validated or revised through the Architecture Proposal and Specification.

### Unknown

- Whether clean-checkout validation will reveal any additional hidden or ignored source dependency.
- Whether Playwright verification passes after the correct browser assets and environment prerequisites are prepared.
- Whether the observed Playwright failure contains any application defect in addition to the missing browser assets.
- Whether real PostgreSQL, Redis, web, worker, and Docker integration is required for this milestone's acceptance criteria.
- Whether the current local `packages/storage` contents require correction before intentional versioning.
- Whether the proposed ignore-boundary approach constitutes or modifies an architectural decision beyond the existing repository architecture.

Unknowns that affect scope, architecture, acceptance criteria, or evidence must be resolved or presented explicitly before Gate 1.

## 10. Deliverables

Expected later outputs are:

- an Architecture Proposal and ADR for the repository ignore, workspace-package, and reproducibility boundary;
- a milestone Specification with exact requirements, constraints, acceptance criteria, prerequisites, and evidence obligations;
- bounded Implementation Tasks and an Implementer Context Pack;
- a reviewed and intentionally versioned `packages/storage` package;
- a corrected ignore boundary that preserves intended runtime-data exclusion;
- clean-checkout dependency-installation evidence;
- typecheck, lint, formatting, build, unit-test, and applicable Playwright verification evidence;
- an information-isolated Reviewer Context Pack and independent Review Report;
- explicit Gate 1, Gate 2, Gate 3, release, and Pilot-closure decisions;
- a Release Note and verified commit, annotated tag, push, and remote state;
- a Pilot Retrospective, metrics summary, and traceable ADOS findings or observations; and
- non-binding improvement proposals when supported by Pilot evidence.

This Brief creates none of these outputs and authorizes no implementation.

## 11. Required Next Artifact

The required next architecture artifact is an **Architecture Decision Record (ADR)** containing the Architecture Proposal for the ignore boundary, storage-package ownership, clean-checkout reproducibility boundary, alternatives, trade-offs, and consequences.

The ADR must be evaluated with the milestone Specification at Gate 1. No implementation may begin until the Architecture Proposal, required Specification, and explicit Gate 1 decision are complete and recorded in the project Source of Truth.
