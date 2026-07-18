Status: Approved

# 1. Objective

Make the HTML2PDF conversion foundation reproducible from a fresh Git clone by correcting the source-control ignore boundary, intentionally versioning the reviewed `packages/storage` source package, documenting necessary environment prerequisites, and proving the result through the verification and evidence obligations in `SPEC-001-FRESH-CLONE-REPRODUCIBILITY.md`.

This task implements only the design approved by `GATE-1-DECISION.md`. `ADR-001-FRESH-CLONE-REPRODUCIBILITY.md` and `SPEC-001-FRESH-CLONE-REPRODUCIBILITY.md` remain authoritative. This task does not authorize commit, tag, push, Gate 2, Gate 3, or release.

# 2. Scope

Implementation is limited to the scope approved in SPEC-001:

- inspect `packages/storage` and its dependency relationships;
- correct the relevant ignore boundary with the smallest sufficient change;
- intentionally version required `packages/storage` contents after inspection;
- add only necessary project documentation for environment prerequisites;
- validate the result from a clean checkout outside the active working directory;
- run typecheck;
- run lint;
- run the formatting check;
- run the production build;
- run unit tests;
- run applicable Playwright verification after documented browser preparation; and
- collect complete implementation and verification evidence for independent review.

Scope may not expand without explicit Founder approval.

# 3. Files to Inspect

The Implementer must inspect the following before editing. Inclusion in this list does not imply that a file will change.

## Governance and task authority

- `PILOT_PLAN.md`
- `PROJECT_BRIEF.md`
- `ADR-001-FRESH-CLONE-REPRODUCIBILITY.md`
- `SPEC-001-FRESH-CLONE-REPRODUCIBILITY.md`
- `GATE-1-DECISION.md`
- `IMPLEMENTATION_TASK.md`

## Source-control and workspace boundaries

- `.gitignore`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `tsconfig.json`
- current Git status, ignored-file evaluation, tracked-file inventory, branch, commit, and tag state

## Storage package

- `packages/storage/package.json`
- `packages/storage/src/index.ts`
- `packages/storage/src/types.ts`
- `packages/storage/src/paths.ts`
- `packages/storage/src/local-source-storage.ts`
- `packages/storage/src/local-output-storage.ts`
- `packages/storage/src/local-storage.test.ts`

The complete package directory must also be inspected for ignored, generated, temporary, sensitive, or unexpected content before any file is made trackable.

## Tracked dependency relationships

- `apps/web/package.json`
- `apps/worker/package.json`
- `packages/pdf-engine/package.json`
- tracked imports of `@html2pdf-pro/storage` under `apps/web` and `apps/worker`
- `docker/web.Dockerfile`
- `docker/worker.Dockerfile`
- `docs/ARCHITECTURE.md`
- `README.md`

## Verification and prerequisites

- repository validation scripts in `package.json`
- `scripts/run-playwright-tests.mjs`
- `vitest.playwright.config.mjs`
- `packages/pdf-engine/src/playwright-pdf-engine.ts`
- `packages/pdf-engine/src/playwright-pdf-engine.pw.test.ts`
- existing runtime, browser, database, Docker, and configuration instructions

# 4. Files Potentially Allowed to Change

Only the following files may reasonably change under this task:

- `.gitignore` — only the smallest sufficient correction that makes required `packages/storage` source trackable while preserving exclusion of root runtime storage and other prohibited artifacts;
- `packages/storage/package.json`;
- `packages/storage/src/index.ts`;
- `packages/storage/src/types.ts`;
- `packages/storage/src/paths.ts`;
- `packages/storage/src/local-source-storage.ts`;
- `packages/storage/src/local-output-storage.ts`;
- `packages/storage/src/local-storage.test.ts`; and
- `README.md` — only if necessary to document environment or Playwright prerequisites; roadmap correction remains excluded.

The storage-package files are candidates for intentional addition to source control. Their contents must not be changed merely because they are currently ignored. A content change is allowed only when it is necessary to satisfy an approved SPEC-001 requirement without changing package responsibility or public behavior.

No listed file is required to change solely because it appears above. Any additional file, new implementation artifact, deletion, rename, move, generated source, package-behavior change, or broader documentation change requires explicit Founder approval before work continues.

# 5. Explicitly Forbidden Changes

This task forbids:

- product features;
- API redesign;
- UI redesign;
- queue redesign;
- worker redesign;
- PDF-engine redesign;
- database redesign or migration;
- infrastructure or deployment redesign;
- broad Docker changes;
- unrelated dependency upgrades;
- unrelated refactoring or formatting rewrites;
- changes to package responsibility or public product behavior without separate verified authority;
- README roadmap correction;
- generated-source substitution for `packages/storage`;
- committing caches, browser binaries, databases, secrets, credentials, private configuration, logs, temporary files, `node_modules`, build output, or runtime storage; and
- modification of ADOS artifacts or the frozen ADOS Foundation.

# 6. Implementation Sequence

## 1. Repository inspection

- Confirm the canonical path, branch, baseline commit, baseline tag, remote, Git status, staged state, and the exact approved artifact hashes recorded by Gate 1.
- Confirm no unexpected tracked or untracked state exists.
- Read the approved ADR, Specification, Gate decision, and this task before proceeding.

## 2. Dependency inspection

- Trace `@html2pdf-pro/storage` through tracked application and package manifests, imports, workspace configuration, TypeScript paths, Dockerfiles, documentation, and lockfile entries.
- Confirm which repository-owned package files are required by those relationships.
- Record any discrepancy before editing.

## 3. Ignore-rule inspection

- Identify the exact rule that excludes `packages/storage`.
- Evaluate how the rule applies to both the package path and intended root runtime storage.
- Determine the smallest sufficient boundary correction without globally unignoring unrelated storage or runtime artifacts.

## 4. Storage package inspection

- Inspect the complete local package manifest, source, types, paths, and tests.
- Check for generated, temporary, sensitive, unrelated, or unexpected files.
- Compare package identity, exports, imports, behavior, tests, and lockfile representation with tracked dependants.
- Stop if contents differ materially from the approved expectations.

## 5. Minimal implementation

- Apply only the approved ignore-boundary correction.
- Make only reviewed, required storage-package source trackable.
- Preserve current package responsibility, interfaces, behavior, security boundaries, and repository conventions.
- Add prerequisite documentation only when required by SPEC-001 and only within the allowed documentation boundary.

## 6. Verification

- Verify the active working tree and ignore behavior before creating a separate clean checkout.
- Execute the complete clean-checkout protocol in SPEC-001.
- Run dependency installation, typecheck, lint, formatting verification, production build, unit tests, and applicable Playwright verification against the uniquely identified candidate.
- Classify every result accurately and do not claim unavailable Docker, database, browser, runtime, service, credential, or configuration checks as passed.

## 7. Evidence collection

- Preserve all evidence listed in Section 7 of this task and SPEC-001.
- Tie evidence to the exact candidate state, environment, commands or equivalent operations, prerequisites, and results.
- Exclude secrets and sensitive values from evidence.

## 8. Prepare for independent review

- Confirm the candidate remains within scope and that every changed file traces to an approved requirement.
- Confirm prohibited artifacts and unrelated changes are absent.
- Prepare an information-isolated Reviewer Context Pack and the complete evidence set without private implementation reasoning.
- Stop without approving the work, Gate 2, Gate 3, commit, tag, push, or release.

# 7. Required Evidence

The Implementer must provide all evidence required by SPEC-001:

- Git status before implementation, after implementation, and in the clean checkout;
- a complete changed-file inventory;
- traceability from every changed file to an approved requirement or acceptance criterion;
- ignore-rule source and evaluation evidence for required package source and intended runtime storage;
- the reviewed, tracked-file inventory for `packages/storage`;
- dependency-relationship evidence covering imports, manifests, workspace configuration, TypeScript mappings, Dockerfile references, documentation, and lockfile entries as applicable;
- the absolute clean-checkout path and the exact candidate state evaluated;
- runtime and package-manager versions;
- dependency-installation command or equivalent operation and complete result;
- proof that no manual file copying, generated-source substitution, or external source injection occurred;
- typecheck result;
- lint result;
- formatting-check result;
- production-build result and generated-route count;
- unit-test command, test-file count, test count, and result compared with the 12-file, 40/40 baseline;
- Playwright browser-preparation evidence and applicable Playwright result;
- explicit external prerequisite limitations and accurate result classifications;
- proof that no hidden repository-owned source outside Git is required;
- security-boundary, safeguard, prohibited-artifact, secret-safety, and scope-conformance review;
- rollback readiness evidence;
- final uniquely identified candidate state or commit identifier supplied for review; and
- confirmation that any material candidate change invalidates dependent evidence and triggers renewed verification.

Evidence must not contain secrets, credentials, private configuration values, database content, or sensitive runtime data.

# 8. Completion Conditions

Implementation is complete only when all applicable acceptance criteria in SPEC-001 are satisfied and supported by evidence suitable for independent review.

Completion additionally requires:

- AC-001 through AC-013 are each mapped to a recorded result and evidence;
- all changed files remain within the allowed boundary and trace to approved requirements;
- no mandatory check is misreported or left without an explicit disposition;
- the candidate is uniquely identified and unchanged since its evidence was collected;
- rollback readiness is recorded; and
- the Reviewer Context Pack and evidence are ready for information-isolated review.

Implementation completion does not constitute independent review, Gate 2 approval, Gate 3 approval, commit authorization, tag authorization, push authorization, or release approval.

# 9. Stop Conditions

Implementation must stop immediately and route the issue to the Founder or appropriate governed stage if:

- scope expands or an unlisted file appears necessary to change;
- repository assumptions are incorrect;
- required package contents differ materially from expectations;
- package responsibility, public behavior, architecture, or approved acceptance criteria would need to change;
- security, privacy, credential, sensitive-data, SSRF, queue, worker, PDF-engine, or runtime-storage concerns appear;
- an unexpected tracked, untracked, ignored, staged, generated, or sensitive file is discovered;
- the approved baseline or governing artifact hashes do not match Gate 1;
- a material change invalidates Gate 1 inputs or verification evidence;
- a required check fails or cannot be classified accurately;
- ambiguity or contradiction exists among ADR-001, SPEC-001, the Gate decision, and repository evidence; or
- Founder approval becomes necessary for scope, architecture, file boundaries, exceptions, repository operations, or any final decision.

The Implementer must not guess, silently repair governance conflicts, approve its own work, or continue beyond the recorded authority.
