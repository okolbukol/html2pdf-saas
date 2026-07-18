# SPEC-001: Fresh-Clone Reproducibility for the Conversion Foundation

## 1. Document Control

- Status: Proposed
- Date: 2026-07-18
- Owner: Founder / Decider
- Responsible Role: Project Architect
- Repository: `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`
- Baseline commit: `86734592b71c3fc16d375d7c75e1886bee49b027`
- Baseline tag: `v0.1.1-alpha`
- Related Pilot Plan: `PILOT_PLAN.md`
- Related Project Brief: `PROJECT_BRIEF.md`
- Related ADR: `ADR-001-FRESH-CLONE-REPRODUCIBILITY.md`
- ADOS Foundation reference: Foundation Freeze commit `bc725b986befb25dbd11fdd8ed8dde1a84f213c3`, tag `v1.3.1-foundation-freeze`

This Specification is proposed for review. It records no Gate approval and authorizes no implementation.

## 2. Purpose

This Specification defines the binding technical requirements for making the current HTML2PDF conversion foundation reproducible from a fresh Git clone.

- This Specification does not approve implementation.
- This Specification becomes implementation-authoritative only after explicit Gate 1 approval by the Founder.
- `ADR-001-FRESH-CLONE-REPRODUCIBILITY.md` defines the proposed decision direction.
- This Specification defines the required observable behavior, constraints, acceptance criteria, and verification evidence.

## 3. Verified Current State

### Repository defects

- The workspace package `packages/storage` exists in the current local working tree with a package manifest, implementation, types, path handling, and tests.
- The broad `.gitignore` rule `storage/` matches and excludes `packages/storage`.
- Git contains no tracked files under `packages/storage`.
- Tracked web, worker, PDF-engine, Dockerfile, TypeScript, documentation, workspace, and lockfile content references the package or its path. Direct package dependencies use `@html2pdf-pro/storage`, the workspace includes `packages/*`, and the lockfile contains a `packages/storage` importer.
- A fresh clone is therefore incomplete because it omits repository-owned source required by tracked components.
- The existing checkout can build and test because the ignored package remains on disk. That local result does not establish clean-checkout reproducibility.

### Environment prerequisites and inspection limitations

- All 12 unit-test files and 40/40 unit tests passed using the available workspace-provided Node runtime.
- Typecheck, lint, formatting verification, and the production build passed in the inspected local checkout. The production build generated seven routes.
- The default command environment did not expose Node on `PATH`; execution initially depended on the available workspace-provided runtime.
- Separate Playwright verification failed with `PDF_GENERATION_FAILED` while the expected repository-local browser cache `.cache/ms-playwright` was absent.
- Docker and Docker Compose commands were installed, but the inspection context could not access the Docker engine.
- Prisma validation without injected configuration did not complete because `DATABASE_URL` was absent.

The missing browser assets, default runtime availability, Docker-engine access, and database configuration are environment or dependency-preparation conditions. They must not be silently classified as repository defects, application failures, or successful checks without supporting evidence.

### Documentation discrepancy

- `README.md` states that the repository contains the MVP Phase 1, Phase 2, and early Phase 3 conversion foundation, while its Roadmap still recommends implementing Phase 3 foundations already represented by tracked conversion, queue, worker, SSRF, and PDF-engine content.

This discrepancy does not affect the verified source-control defect and is outside this Specification unless the Founder approves a separate documentation task.

## 4. Functional Requirements

- **FR-001 — Ignore boundary:** The source-control ignore configuration MUST NOT unintentionally exclude `packages/storage`.
- **FR-002 — Intentional package versioning:** `packages/storage` MUST be intentionally versioned if implementation-time repository inspection confirms that its existing local contents are required repository-owned source. Its complete intended manifest MUST be reviewed before versioning.
- **FR-003 — Fresh-clone completeness:** A fresh clone MUST contain every repository-owned package required by tracked applications, workers, builds, workspace configuration, and lockfile relationships.
- **FR-004 — Repository-declared installation:** Dependency installation MUST use repository-declared package manifests, workspace configuration, package-manager declaration, and lockfile without manual copying or source injection from another working directory.
- **FR-005 — Behavioral preservation:** The current responsibility and public behavior of `packages/storage` MUST remain unchanged unless a verified defect requires a separately authorized change.
- **FR-006 — Playwright prerequisites:** The repository MUST expose or document the prerequisites necessary to install the expected Playwright browser assets and run applicable Playwright verification.
- **FR-007 — Failure classification:** Verification output MUST distinguish repository failures from unavailable external services, credentials, local runtimes, browser binaries, Docker-engine access, and database configuration.
- **FR-008 — No generated-source substitution:** Implementation MUST NOT introduce a generated-source dependency for `packages/storage` unless Gate 1 explicitly changes the proposed ADR decision before implementation.
- **FR-009 — No hidden source dependency:** No hidden dependency on repository-owned files outside Git MAY remain in the clean-checkout validation path.
- **FR-010 — Product behavior preservation:** The milestone MUST preserve existing product behavior and MUST NOT introduce product features or architectural redesign.

## 5. Non-Functional Requirements

- **NFR-001 — Reproducibility:** The approved verification workflow MUST be repeatable from a separate fresh checkout using only repository-owned inputs and documented prerequisites.
- **NFR-002 — Traceability:** Each changed file, requirement, acceptance result, finding, and evidence item MUST trace to the approved Brief, ADR, Specification, or Gate decision.
- **NFR-003 — Minimal change surface:** Implementation MUST make the smallest sufficient change to correct the ignore boundary, version required source, document prerequisites where necessary, and produce evidence.
- **NFR-004 — Backward compatibility:** Existing package interfaces, conversion behavior, workspace relationships, and supported validation surfaces MUST remain compatible with the approved baseline.
- **NFR-005 — Deterministic dependency resolution:** Installation MUST use the repository-declared `pnpm` version and lockfile in a mode that does not silently rewrite dependency resolution.
- **NFR-006 — Clear failure classification:** Every required check MUST be recorded as passed, failed, blocked, or not executed with a reason; an unavailable prerequisite MUST NOT be reported as an application pass or defect without evidence.
- **NFR-007 — Maintainability:** The final ignore boundary and prerequisite documentation MUST be understandable from repository artifacts without relying on private context or workstation history.
- **NFR-008 — Security boundary preservation:** Runtime storage and other intentionally excluded operational data MUST remain excluded unless separately approved.
- **NFR-009 — Secret safety:** No secret, credential, private configuration value, database content, or sensitive runtime artifact MAY be committed or included in evidence.
- **NFR-010 — Safeguard preservation:** Implementation MUST NOT weaken existing SSRF, worker, queue, PDF-engine, source validation, or resource-limit safeguards.

## 6. Scope

This Specification includes only:

- inspection of `packages/storage` and its dependency relationships;
- correction of the relevant ignore boundary;
- intentional versioning of required package contents after inspection;
- necessary project documentation for environment prerequisites;
- clean-checkout validation outside the active working directory;
- typecheck;
- lint;
- formatting check;
- production build;
- unit tests;
- applicable Playwright verification; and
- evidence collection for independent review.

## 7. Out of Scope

This Specification excludes:

- new user-facing features;
- UI redesign;
- API redesign;
- queue architecture redesign;
- worker architecture redesign;
- PDF-engine redesign;
- database redesign or migration;
- deployment redesign;
- broad Docker changes;
- unrelated dependency upgrades;
- unrelated refactoring;
- `README.md` roadmap correction unless required by a separately approved task;
- changes to existing product behavior not required by a separately verified and authorized defect; and
- ADOS Foundation changes.

## 8. Required Implementation Constraints

An authorized implementation MUST comply with all of the following:

1. Inspect the current repository and complete `packages/storage` contents before editing.
2. Do not recreate, replace, or infer `packages/storage` contents from assumptions.
3. Compare the package contents with tracked imports, package manifests, workspace configuration, TypeScript mappings, Dockerfile references, documentation, and lockfile relationships.
4. Preserve existing repository naming, package, workspace, formatting, and source conventions.
5. Make the smallest sufficient ignore-rule correction.
6. Do not globally unignore unrelated storage directories, generated files, or runtime data.
7. Do not commit caches, browser binaries, databases, secrets, credentials, logs, temporary files, `node_modules`, build output, or runtime storage.
8. Do not treat a locally available but undeclared tool as a repository prerequisite without documenting the dependency and its role in verification.
9. Do not change package responsibility or public behavior without verified evidence and separate Founder authorization.
10. Do not broaden scope without explicit Founder approval and any required return to architecture, specification, or Gate review.
11. Do not report a check as passed when it was blocked, skipped, or made inconclusive by a missing prerequisite.
12. Preserve evidence without exposing secrets or private configuration values.

## 9. Acceptance Criteria

- **AC-001 — Package present after clone:** A separate clean clone contains the reviewed `packages/storage` source from Git without manual copying, generation, or external source injection.
- **AC-002 — Correct ignore evaluation:** Ignore evaluation demonstrates that all intended `packages/storage` source files are trackable while unrelated root runtime storage and prohibited runtime artifacts remain ignored.
- **AC-003 — Reproducible installation:** Dependency installation completes using repository-declared manifests, workspace configuration, `pnpm@11.7.0`, and the existing lockfile in the documented supported runtime without an unapproved lockfile rewrite.
- **AC-004 — Typecheck:** Typecheck passes in the clean checkout.
- **AC-005 — Lint:** Lint passes in the clean checkout.
- **AC-006 — Formatting:** The formatting check passes in the clean checkout.
- **AC-007 — Production build:** The production build passes and generates the routes expected by the approved candidate; any difference from the verified seven-route baseline is explained and authorized.
- **AC-008 — Unit tests:** Unit tests pass with no regression from the verified baseline of 12 test files and 40/40 tests.
- **AC-009 — Playwright:** Applicable Playwright verification passes after documented browser prerequisites are installed. Any remaining failure is recorded with evidence and classified accurately rather than reported as success or attributed to code without support.
- **AC-010 — No unversioned owned source:** No tracked application, worker, package, build, workspace, or lockfile relationship relies on unversioned repository-owned source files.
- **AC-011 — Scoped change inventory:** No unrelated tracked file is changed, and every changed file traces to an approved requirement.
- **AC-012 — Prohibited artifacts absent:** No cache, browser binary, database, secret, credential, log, temporary file, `node_modules`, build output, or runtime storage is added to Git.
- **AC-013 — Repeatability outside original workspace:** The full approved verification can be repeated in a separate clean checkout outside the original working directory, with external limitations recorded separately.

## 10. Clean-Checkout Verification Protocol

The Gate 2 candidate MUST be evaluated using this implementation-neutral protocol:

1. Record the exact implementation commit under review and its relationship to the approved baseline.
2. Create a separate clean checkout outside the active repository working directory.
3. Confirm the checkout begins with no tracked modifications, staged changes, or unexpected untracked files.
4. Confirm `packages/storage` is present from Git and inventory its tracked files.
5. Confirm no manual copying, generated-source substitution, or external source injection occurred.
6. Install dependencies using the repository-declared package manager and lockfile without an unapproved lockfile change.
7. Prepare only the documented runtime, configuration, browser, and service prerequisites required by the approved checks.
8. Run typecheck and record the result.
9. Run lint and record the result.
10. Run formatting verification and record the result.
11. Run the production build and record the generated-route result.
12. Run unit tests and record exact test-file and test counts.
13. Install or confirm the documented Playwright browser prerequisites.
14. Run applicable Playwright verification and record the complete result.
15. Record unavailable external services, credentials, engine access, or configuration separately from repository and application results.
16. Produce evidence containing the evaluated commit, clean-checkout path, commands or equivalent checks, versions, prerequisite preparation, results, assumptions, limitations, and failure classifications.

Docker-backed, database-backed, or other service integration MUST NOT be reported as successful unless it was actually executed against the recorded candidate and environment.

## 11. Evidence Requirements

The independent Gate 2 Reviewer MUST receive:

- Git status before implementation, after implementation, and in the clean checkout;
- a complete changed-file inventory;
- ignore-rule source and evaluation evidence for package source and runtime storage;
- the tracked-file inventory for `packages/storage`;
- dependency-relationship evidence covering imports, manifests, workspace configuration, TypeScript mappings, Dockerfile references, and lockfile entries as applicable;
- the absolute clean-checkout path and evaluated commit;
- runtime and package-manager versions;
- dependency-installation command or equivalent operation and complete result;
- typecheck result;
- lint result;
- formatting-check result;
- production-build and generated-route result;
- unit-test command, test-file count, test count, and result;
- browser-preparation evidence and Playwright result;
- explicit external prerequisite limitations and their classifications;
- security-boundary, prohibited-artifact, and scope-conformance review;
- rollback readiness evidence;
- final candidate commit identifier; and
- confirmation that a material change invalidates evidence that depended on the earlier candidate.

Evidence MUST NOT contain secrets, credentials, private configuration values, database content, or sensitive runtime data.

## 12. Risks and Controls

| Risk                                     | Required control                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Accidentally unignoring runtime storage  | Test ignore evaluation for both required package source and unrelated runtime storage before review.                                    |
| Committing generated or sensitive files  | Inspect the complete staged inventory and verify prohibited artifacts and secrets are absent.                                           |
| Treating local state as repository state | Use a separate clean checkout and prove package origin through Git.                                                                     |
| Hidden runtime dependency                | Document prerequisites and classify every unavailable runtime, service, browser, engine, credential, or configuration dependency.       |
| Lockfile inconsistency                   | Install with the declared package manager and existing lockfile; reject unapproved resolution changes.                                  |
| Environment-specific false negatives     | Record environment preparation and distinguish blocked prerequisites from repository or application defects.                            |
| Scope expansion                          | Trace every changed file to an approved requirement and stop for Founder approval when scope would broaden.                             |
| Product regression                       | Preserve interfaces and behavior; run typecheck, lint, formatting, build, unit, and applicable Playwright checks against the candidate. |

## 13. Rollback Requirements

Rollback MUST:

- reverse the milestone's implementation commit or commits through normal Git history;
- restore the previous ignore behavior only when necessary to return to the approved pre-milestone state;
- remove newly tracked package files through the same history reversal rather than ad hoc deletion;
- avoid manual destructive cleanup outside Git;
- preserve verification evidence, findings, decisions, and review records;
- avoid leaving tracked dependants pointing to an absent package or runtime data exposed; and
- be validated with the same baseline checks where applicable.

Rollback execution requires the applicable ADOS authority and does not itself transfer decision authority.

## 14. Traceability Matrix

### Functional traceability

| Problem statement                                                                           | ADR decision element                            | Requirement | Acceptance criteria    | Required evidence                                                                    |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------- | ---------------------- | ------------------------------------------------------------------------------------ |
| Broad `storage/` rule excludes required package source                                      | Narrow the ignore boundary                      | FR-001      | AC-002                 | Ignore-rule source and evaluation for package source and runtime storage             |
| Required local package is absent from Git                                                   | Intentionally version reviewed package contents | FR-002      | AC-001, AC-012         | Package inspection and tracked-file inventory; prohibited-artifact review            |
| Tracked components depend on an omitted package                                             | Make fresh clones complete                      | FR-003      | AC-001, AC-010         | Git-origin proof and dependency-relationship inventory                               |
| Local success depends on existing workspace residue                                         | Validate repository-declared installation       | FR-004      | AC-003, AC-013         | Clean-checkout path, versions, install operation, lockfile status                    |
| No package behavior defect is verified                                                      | Preserve current package responsibility         | FR-005      | AC-007, AC-008, AC-011 | Changed-file traceability, build routes, unit results                                |
| Browser cache was missing during Playwright verification                                    | Document browser prerequisites                  | FR-006      | AC-009                 | Browser preparation and Playwright result                                            |
| Runtime, services, engine access, and configuration were unavailable in parts of inspection | Separate failure classifications                | FR-007      | AC-009, AC-013         | Environment record and explicit pass, fail, blocked, or not-executed classifications |
| No evidence supports generated package source                                               | Prohibit generated-source substitution          | FR-008      | AC-001, AC-010         | Package Git-origin proof and clean-checkout source inventory                         |
| Current checkout masks required untracked source                                            | Remove hidden source dependence                 | FR-009      | AC-010, AC-013         | Clean-checkout status, dependency evidence, repeatability result                     |
| Pilot is limited to reproducibility                                                         | Preserve product behavior and scope             | FR-010      | AC-007, AC-008, AC-011 | Build and test results; scoped changed-file inventory                                |

### Non-functional traceability

| Requirement | Acceptance criteria    | Required evidence                                                        |
| ----------- | ---------------------- | ------------------------------------------------------------------------ |
| NFR-001     | AC-003, AC-013         | Clean-checkout installation and repeatability record                     |
| NFR-002     | AC-011                 | Requirement-to-file and evidence traceability inventory                  |
| NFR-003     | AC-002, AC-011         | Focused ignore evaluation and changed-file inventory                     |
| NFR-004     | AC-007, AC-008         | Build routes, unit-test baseline comparison, and interface review        |
| NFR-005     | AC-003                 | Package-manager version, install result, and unchanged lockfile evidence |
| NFR-006     | AC-009, AC-013         | Explicit result classifications and prerequisite limitations             |
| NFR-007     | AC-002, AC-013         | Reviewable ignore rule and prerequisite documentation                    |
| NFR-008     | AC-002, AC-012         | Runtime-storage ignore evidence and prohibited-artifact review           |
| NFR-009     | AC-012                 | Secret and sensitive-artifact review                                     |
| NFR-010     | AC-007, AC-008, AC-011 | Safeguard scope review, build result, tests, and changed-file inventory  |

## 15. Gate 1 Entry Conditions

Gate 1 review may begin only when:

- `PILOT_PLAN.md` is available;
- `PROJECT_BRIEF.md` is reviewed and ready for approval;
- `ADR-001-FRESH-CLONE-REPRODUCIBILITY.md` is reviewed and ready for decision;
- this Specification is reviewed;
- scope, risks, requirements, acceptance criteria, and the clean-checkout verification protocol are understood;
- no unresolved contradiction exists among the Project Brief, ADR, and Specification; and
- the Founder explicitly records approval for the governed artifacts and Gate 1.

No implementation may begin before explicit Founder Gate 1 approval. Proposed artifacts, completed review, or specialist recommendations do not constitute approval.

## 16. Post-Gate Required Artifacts

After Gate 1 approval, the workflow requires these later artifacts, none of which is created by this Specification:

- Gate 1 Decision Record
- Implementation Task
- Context Pack
- Implementation evidence
- Independent Review Report
- Gate 2 Decision Record
- Release Note
- Gate 3 Decision Record
- Pilot Retrospective
