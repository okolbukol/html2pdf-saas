# HTML2PDF ADOS Pilot Plan

## 1. Document Status

- **Status:** Proposed
- **Pilot project:** HTML2PDF SaaS / HTML2PDF Pro
- **Canonical repository path:** `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`
- **Repository remote:** `https://github.com/okolbukol/html2pdf-saas.git`
- **ADOS Foundation reference:** Foundation Freeze commit `bc725b986befb25dbd11fdd8ed8dde1a84f213c3`
- **Foundation Freeze tag:** `v1.3.1-foundation-freeze`
- **Pilot owner:** Founder acting as the permanent human Decider
- **Current project baseline:** `main` at commit `86734592b71c3fc16d375d7c75e1886bee49b027`
- **Latest verified project tag:** `v0.1.1-alpha`
- **Date prepared:** 2026-07-18

This plan is proposed for Founder consideration. It is not approved, does not pass any Gate, and does not authorize implementation.

### Verified baseline

- The working tree was clean and synchronized with `origin/main` when this plan was prepared.
- The repository is a pnpm workspace with Next.js web, worker, PostgreSQL/Prisma, Redis/BullMQ, Playwright PDF generation, conversion-domain, queue, configuration, database, and local-storage components.
- Internal conversion create, status, list, and download routes are present, together with cleanup, reconciliation, health, and readiness surfaces.
- SSRF validation, deterministic queue job IDs, optimistic state transitions, compensating cleanup, and worker terminal-state idempotency are implemented.
- `pnpm test` could not start on the default command environment because `node` was absent from `PATH`. With the workspace-provided Node runtime and the repository's existing test binary, all 12 unit-test files passed: **40/40 tests**.
- TypeScript typecheck passed.
- Lint passed.
- Prettier formatting check passed.
- The production web build passed and generated seven routes.
- The separate Playwright verification ran but failed with `PDF_GENERATION_FAILED`. The expected repository-local browser cache, `.cache/ms-playwright`, was missing. This is recorded as an environment or dependency-preparation issue unless later repository evidence proves a code defect.
- Docker and Docker Compose commands are installed, and local ports `5432` and `6379` responded, but access to the Docker engine was denied in the inspection environment. Real service integration was therefore not claimed as verified.
- Prisma schema validation without injected configuration failed because `DATABASE_URL` was not set. This is an environment-preparation result, not a schema verdict.

### Verified repository defect

The required workspace package `packages/storage` is present locally with its manifest, implementation, and five storage tests, but it is absent from Git. The `.gitignore` entry `storage/` matches both the intended root runtime-data directory and `packages/storage`, so Git ignores the package unintentionally.

Tracked web, worker, PDF-engine, Dockerfile, TypeScript, and lockfile content references `@html2pdf-pro/storage`. A fresh clone therefore lacks source and package files required by those tracked references. The current checkout can still build and test because the ignored local package remains on disk, which masks the repository-integrity defect.

## 2. Pilot Purpose

The primary purpose of this pilot is to validate ADOS through real, bounded project work. Product work is necessary to generate credible implementation, review, verification, decision, and closure evidence, but evaluation of ADOS is the principal objective.

The pilot will test whether approved artifacts can move one concrete repository defect through role-separated architecture analysis, explicit Gates, implementation, independent review, verification, release discipline, and retrospective without changing the frozen ADOS Foundation.

## 3. Pilot Scope

### Selected milestone

**Fresh-clone reproducibility for the HTML2PDF conversion foundation.**

The milestone will:

1. correct the ignore boundary so runtime output under the repository-root `storage` directory remains ignored while the source package `packages/storage` can be versioned;
2. intentionally add the existing `packages/storage` manifest, implementation, types, path handling, and tests to the project repository after their contents are reviewed against the approved project Specification;
3. verify that the pnpm workspace and frozen lockfile resolve from a clean checkout without relying on untracked local package files;
4. run typecheck, lint, formatting verification, production build, unit tests, and applicable Playwright verification from a prepared clean-checkout environment;
5. record Playwright browser installation and cache preparation separately from application correctness; and
6. preserve evidence for every result, limitation, finding, Gate, repository operation, and closure step.

### Why this milestone is appropriate

- It resolves an observed defect in the authoritative repository rather than inventing a feature.
- It is technically meaningful because tracked production code, Docker builds, TypeScript aliases, and the lockfile depend on the missing package.
- It is narrow enough to complete through all ADOS stages without a product redesign.
- It exercises Architect analysis of repository and packaging boundaries, Implementer work, independent Reviewer isolation, verification evidence, all three Gates, and mandatory repository closure.
- It produces a clear before-and-after result: a fresh clone either contains and resolves the storage package or it does not.
- It creates useful Pilot evidence about Context Packs, material-change judgment, Runtime value, role boundaries, and Founder arbitration.

The exact file set, acceptance criteria, and verification environment must be defined in the Project Brief and Specification before Gate 1. This plan does not authorize the probable implementation or predetermine the Architect's recommendation.

## 4. Out of Scope

The pilot excludes:

- changes to the ADOS Foundation or its repository;
- new ADOS normative documents, Roles, Gates, authority, or governance layers;
- authentication, payments, billing, entitlements, API keys, public API v1, dashboard workflows, templates, or admin features;
- redesign of the web/worker/queue/PostgreSQL/Redis/Playwright architecture;
- changes to conversion behavior not required for repository reproducibility;
- unrelated refactoring, dependency upgrades, formatting rewrites, or documentation expansion;
- premature production deployment, scaling, cloud storage, or production egress design;
- treating Docker-engine access, PostgreSQL/Redis availability, or browser installation as product implementation unless the approved Specification requires a bounded correction;
- resolving unrelated known limitations; and
- work not necessary to validate and close the selected reproducibility milestone.

## 5. ADOS Roles and Tool Assignment

| Pilot assignment    | Tool or actor                                     | Responsibility                                                                                                                   | Authority boundary                                                                                                          |
| ------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Founder / Decider   | Human Founder                                     | Makes all final ADR, Gate, merge, release, exception, and pilot-closure decisions                                                | Final authority; specialist work and passing evidence do not replace an explicit decision                                   |
| Architect           | Claude                                            | Analyzes the ignore/package/reproducibility defect, alternatives, trade-offs, and ADR need; prepares architecture recommendation | Recommends architecture but does not implement, independently review, or approve                                            |
| Implementer         | Codex                                             | Implements only Gate 1-approved tasks and preserves implementation and verification evidence                                     | Does not expand scope, approve its own work, or decide a Gate, merge, or release                                            |
| Reviewer            | ChatGPT in a fresh isolated review context        | Evaluates the deliverable only against approved artifacts and evidence; records findings and Gate 2 readiness                    | Does not receive private implementation reasoning, modify the deliverable, or grant approval                                |
| Orchestrator        | ChatLLM or the active AI coordination workspace   | Routes artifacts and decisions, prepares bounded Context Packs, tracks dependencies, blockers, metrics, and lifecycle order      | No technical, implementation, review, or approval authority                                                                 |
| Repository Engineer | Codex operating within the Implementer assignment | Inspects repository state and mechanically executes explicitly approved Git operations                                           | This is an operational assignment, not a new permanent ADOS Role; mechanical execution does not transfer decision authority |
| Source of Truth     | GitHub repository and its versioned history       | Preserves approved artifacts, decisions, evidence, commit, tag, and authoritative remote state                                   | Repository state records authority; it does not create approval                                                             |

### Activity distinctions

- **Recommendation:** A specialist's evidence-based proposed direction. It is non-binding until the Founder makes the required decision.
- **Implementation:** Production of the approved change by the Implementer within Gate 1 scope.
- **Review:** Contextually independent evaluation against approved artifacts by the Reviewer.
- **Verification:** Execution and preservation of defined checks and observed results. Passing checks are not approval.
- **Approval:** An explicit, scoped Founder decision recorded in the project Source of Truth.
- **Mechanical Git execution:** Status, add, commit, tag, branch, push, or related commands performed only after explicit Founder authorization. Execution is not decision authority.

## 6. Pilot Lifecycle

No Gate has passed. Each stage below remains pending until its entry condition is satisfied and the responsible output is recorded.

| Stage                       | Responsible role                                                       | Required input                                                                                           | Required output                                                                                              | Entry condition                                                             | Exit condition                                                                       | Blocking condition                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 1. Current-state inspection | Repository Engineer                                                    | Clean repository, baseline commit/tag, tracked and ignored file state                                    | Reproducible baseline report and discrepancy list                                                            | Founder authorizes Pilot preparation                                        | Baseline evidence identifies repository, defect, commands, and limitations           | Unexpected changes, wrong repository, missing history, or unverifiable state                                         |
| 2. Project Brief            | Orchestrator drafts; Founder decides readiness to continue preparation | Approved Pilot Plan and baseline evidence                                                                | Proposed Project Brief using the ADOS Brief template                                                         | This Pilot Plan receives explicit Founder approval                          | Need, outcome, boundaries, assumptions, and dependencies are reviewable              | Scope ambiguity, missing owner, or conflict with product Specification                                               |
| 3. Project Specification    | Architect and Orchestrator prepare; Founder later decides at Gate 1    | Proposed Brief, project product Specification, baseline evidence                                         | Proposed milestone Specification with scope, requirements, acceptance criteria, evidence, and ADR references | Brief is available and relevant uncertainty is explicit                     | Implementer and Reviewer can evaluate the same objective independently               | Missing acceptance evidence, unbounded clean-checkout definition, or hidden feature work                             |
| 4. Architecture proposal    | Architect                                                              | Brief, proposed Specification, repository architecture, ignore/package evidence                          | Alternatives, trade-offs, recommendation, and an ADR if the decision is architecturally significant          | Specification is sufficiently bounded for analysis                          | ADR need is explicit; any ADR is ready for Gate 1 consideration                      | Architect cannot establish package ownership, ignore semantics, or clean-checkout boundary                           |
| 5. Gate 1 decision          | Founder / Decider                                                      | Exact Specification, applicable ADR or authoritative no-ADR statement, risks and open questions          | Explicit approve, reject, or return decision with rationale                                                  | Design inputs are proposed and traceable                                    | Approval is recorded for exact versions, or work is returned                         | Missing artifact, unresolved design conflict, insufficient acceptance criteria, or unclear decision                  |
| 6. Implementation plan      | Orchestrator with Implementer input                                    | Gate 1-approved Specification and ADRs                                                                   | Bounded Implementation Tasks, ordered verification plan, and file scope                                      | Gate 1 approval is recorded                                                 | Every task traces to an approved requirement and evidence obligation                 | Task expands scope, changes architecture, or lacks traceability                                                      |
| 7. Context Pack             | Orchestrator                                                           | Approved artifacts, tasks, baseline, decisions, boundaries, known environment limitations                | Implementer Context Pack; later a separately isolated Reviewer Context Pack                                  | Receiving Role and authorized work are known                                | Context is current, bounded, traceable, and contains the repository-authority notice | Stale sources, missing decision, excessive context, or information-isolation risk                                    |
| 8. Implementation           | Implementer / Repository Engineer                                      | Gate 1 approval, tasks, Implementer Context Pack                                                         | Minimal approved repository changes and traceability record                                                  | Exact task is authorized and working tree matches baseline                  | All scoped changes are complete and no unrelated file changed                        | Scope expansion, architectural uncertainty, unexpected state, or unapproved material change                          |
| 9. Verification evidence    | Implementer                                                            | Approved acceptance criteria, changed state, prepared clean-checkout environment                         | Command log, versions, outputs, pass/fail results, limitations, and repository-state evidence                | Implementation is ready for its assigned checks                             | Every required check has an honest result and preserved evidence                     | Failed or inconclusive mandatory check, missing dependency evidence, or result tied only to contaminated local state |
| 10. Independent review      | Reviewer in isolated context                                           | Reviewer Context Pack, approved Specification/ADR, deliverable diff, traceability, verification evidence | Review Report with independence confirmation, findings, severity, defect class, and Gate 2 readiness         | Review inputs are complete and private implementation reasoning is excluded | Review is complete and findings are routed                                           | Compromised independence, missing authority, missing evidence, or conflicting governing artifacts                    |
| 11. Gate 2 decision         | Founder / Decider                                                      | Review Report, verification evidence, findings, dispositions, exact deliverable state                    | Explicit approve, reject, or return decision                                                                 | Required review and verification are complete                               | Gate 2 approval is recorded for the exact state, or work returns                     | Any required check fails, blocking finding remains, or reviewed state changed materially                             |
| 12. Release preparation     | Orchestrator and Repository Engineer                                   | Gate 2-approved state, proposed version, Release Note draft, closure checklist                           | Exact commit candidate, proposed tag, Release Note, and final evidence inventory                             | Gate 2 approval applies to current state                                    | Merge/commit candidate and release scope are unambiguous                             | Divergence after review, unrelated change, missing release evidence, or version conflict                             |
| 13. Gate 3 decision         | Founder / Decider                                                      | Gate 2 approval, exact candidate, repository status, release preparation                                 | Explicit approve or reject merge/commit execution                                                            | Candidate matches reviewed and verified state                               | Approval is recorded for the exact candidate                                         | Candidate mismatch, repository divergence, or missing Gate 2 approval                                                |
| 14. Final test              | Repository Engineer                                                    | Gate 3-approved candidate and prepared dependencies                                                      | Final test, typecheck, lint, format, build, unit, and applicable Playwright results                          | Gate 3 approval authorizes closure execution                                | Mandatory checks pass or Founder returns work through the appropriate stage          | Failed test, missing browser/dependency preparation, evidence loss, or changed candidate                             |
| 15. Commit                  | Repository Engineer                                                    | Explicit Gate 3 approval and passing final evidence                                                      | One scoped commit with verified file manifest                                                                | Approved candidate is unchanged and only intended files are staged          | Commit hash and message are recorded                                                 | Staging includes unrelated files, commit fails, or state differs from approval                                       |
| 16. Release decision        | Founder / Decider                                                      | Commit hash, Release Note, final evidence, proposed tag                                                  | Explicit approve, reject, or return release decision                                                         | Commit matches approved candidate                                           | Release authorization is recorded separately from merge approval                     | Missing Release Note, failed final evidence, or unclear release scope                                                |
| 17. Tag                     | Repository Engineer                                                    | Explicit release decision and approved commit                                                            | Annotated project version tag pointing to the approved commit                                                | Tag is absent locally and remotely                                          | Local annotated tag and peeled commit are verified                                   | Tag collision, wrong target, or tag creation failure                                                                 |
| 18. Push                    | Repository Engineer                                                    | Approved commit and tag, configured origin                                                               | Branch and tag on GitHub with remote object verification                                                     | Founder has authorized mechanical push                                      | Remote branch and peeled tag match local approved commit                             | Authentication, permission, network, rejection, or remote divergence failure                                         |
| 19. Pilot retrospective     | Orchestrator coordinates; all roles contribute                         | Complete lifecycle evidence, metrics, findings, decisions, friction, and outcomes                        | Proposed Pilot Retrospective, metrics summary, and ADOS observations                                         | Milestone is released or formally stopped                                   | Lessons and proposals are recorded without silently changing ADOS                    | Missing evidence, unsupported conclusions, or proposed Foundation change presented as binding                        |
| 20. Pilot closure decision  | Founder / Decider                                                      | Retrospective, metrics, findings register or equivalent, repository closure evidence                     | Explicit close, return, or formally stop decision                                                            | All required Pilot outputs are available                                    | Founder decision is recorded and repository closure state verified                   | Unresolved finding without disposition, incomplete metrics, dirty repository, or unverifiable remote state           |

Material changes return work to the stage that owns the affected requirement or decision. Dependent review, verification, and Gate evidence must be treated as invalid when it no longer applies.

## 7. Pilot Artifacts

This task creates none of the artifacts below. It identifies their expected use after the Pilot Plan is approved.

| Artifact                                      | Need                                             | When and why                                                                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project Brief                                 | Required                                         | Prepared immediately after Pilot Plan approval to define the reproducibility need, intended outcome, and boundaries without prescribing implementation                                                                                               |
| Specification                                 | Required                                         | Defines exact file scope, clean-checkout conditions, acceptance criteria, commands, evidence, and Playwright dependency-preparation expectations for Gate 1                                                                                          |
| ADR                                           | Conditional                                      | Required if the Architect determines that ignore-boundary ownership, workspace packaging, or reproducibility policy constitutes a significant architectural decision; otherwise the Specification must state authoritatively that no ADR is required |
| Implementation Plan / Implementation Tasks    | Required                                         | Decomposes Gate 1-approved work into bounded tasks using the ADOS task template and links every task to acceptance criteria                                                                                                                          |
| Context Pack                                  | Required                                         | One bounded pack prepares the Implementer; a separate information-isolated pack prepares the Reviewer without private implementation reasoning                                                                                                       |
| Verification Evidence                         | Required                                         | Preserves environment versions, dependency preparation, clean-checkout method, command outputs, failures, limitations, and repository states                                                                                                         |
| Review Report                                 | Required                                         | Records independent conformance findings, verification assessment, independence, and Gate 2 readiness                                                                                                                                                |
| Release Note                                  | Required if the milestone is tagged and released | Identifies the approved commit/tag, included change, effects, verification, and known limitations                                                                                                                                                    |
| Retrospective                                 | Required for Pilot closure                       | Records outcomes, governance friction, metrics, lessons, and non-binding improvement proposals                                                                                                                                                       |
| Decision Log entries                          | Required for formal decisions                    | Project-level records must preserve Gate 1, Gate 2, Gate 3, release, material-change, exception, and Pilot-closure decisions as applicable; no ADOS Foundation decision is created by this Pilot                                                     |
| ADOS Findings Register or equivalent evidence | Required as Pilot evidence                       | May be represented through traceable Review Report, Retrospective, metrics, and decision records unless a separately approved project artifact is needed; it must not become a new ADOS Foundation requirement                                       |

## 8. ADOS Assumptions to Validate

The Pilot must collect evidence for these questions:

1. Is the Context Pack sufficient for a fresh implementation context to continue without conversation history?
2. Can the Reviewer remain contextually independent from the Implementer while receiving enough evidence to evaluate reproducibility?
3. Are Gate 1, Gate 2, and Gate 3 understandable, distinct, and usable in real repository work?
4. Are Architect, Implementer, Reviewer, Orchestrator, Repository Engineer, and Founder boundaries clear in practice?
5. Is traceability preserved from the repository defect and Founder decisions through implementation, verification, release, and closure?
6. Does the Process create excessive Founder arbitration for a small but cross-cutting repository defect?
7. Does Runtime add operational value through state, entry, exit, invalidation, and recovery clarity, or merely repeat Process?
8. Can material changes be identified consistently, especially if clean-checkout validation exposes additional missing tracked files or dependency issues?
9. Are verification evidence and independent review evidence distinguishable to every participant?
10. Does the mandatory `test → commit → tag → push` closure discipline work without ambiguity?
11. Can dependency preparation failures, such as a missing Playwright browser cache, be separated reliably from implementation defects?
12. Does a fresh clone contain enough repository-backed context and source to run the approved workflow without hidden local files?

## 9. Pilot Metrics

Metrics are recorded as observed counts, elapsed effort where practical, and short categorical assessments. They must not imply artificial precision.

| Indicator                                                                    | Practical measurement                                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Number of Founder escalations                                                | Count each distinct question routed for final decision; record stage, cause, and disposition                                                               |
| Number of blocked transitions                                                | Count each attempted lifecycle transition that stops; record missing condition and recovery stage                                                          |
| Number of context gaps                                                       | Count missing, stale, ambiguous, or excessive Context Pack items discovered by Implementer or Reviewer                                                     |
| Number of review findings by severity                                        | Count Critical, Major, Minor, and Observation findings and record authority source and disposition                                                         |
| Rework caused by incomplete artifacts                                        | Count returned tasks or repeated checks caused by Brief, Specification, ADR, task, or Context Pack omissions                                               |
| Time or effort spent preparing Context Packs                                 | Record approximate elapsed preparation time and number of source artifacts referenced                                                                      |
| Gate decision clarity                                                        | For each Gate record `clear`, `clarification required`, or `returned`, with the reason                                                                     |
| Number of rule conflicts or ambiguous authority sources                      | Count conflicts and identify the artifacts and Founder arbitration required                                                                                |
| Number of material-change disputes                                           | Count cases where roles disagree whether evidence or approval was invalidated; record resolution                                                           |
| Test results                                                                 | Record commands, environment, test-file/test counts, passes, failures, and not-executed checks separately                                                  |
| Playwright preparation                                                       | Record whether the browser cache was prepared, how it was prepared, and whether failure persisted afterward                                                |
| Clean-checkout completeness                                                  | Record whether install, package resolution, typecheck, build, unit tests, and applicable Playwright verification run without untracked source dependencies |
| Closure completeness                                                         | Record completion of test, commit, tag, push, remote verification, Release Note, Retrospective, and closure decision                                       |
| Whether a fresh AI context could continue work using only approved artifacts | Have a fresh AI context state whether it can continue using only approved repository artifacts; record missing information verbatim                        |

## 10. Success Criteria

The Pilot is successful only if:

- one real reproducibility milestone completes end-to-end or reaches an explicit, evidence-supported formal stop;
- all required project-level ADOS artifacts are created, used, versioned, and traceable;
- Gate 1, Gate 2, and Gate 3 each receive an explicit Founder decision;
- implementation is evaluated through contextually independent review;
- verification evidence is preserved separately from recommendations, findings, and approval;
- applicable mandatory tests pass for the approved release state;
- the storage package and ignore-boundary outcome are verified from a clean checkout rather than inferred from the existing local workspace;
- Playwright dependency preparation is recorded accurately, and an unresolved failure is not represented as a pass;
- the mandatory closure sequence is completed: `test → commit → tag → push`;
- GitHub reflects the approved final commit and annotated tag;
- Pilot observations and metrics are recorded honestly;
- ADOS weaknesses become non-binding backlog proposals through the appropriate process instead of being silently corrected during the Pilot; and
- the Pilot produces sufficient evidence for a Foundation Review recommendation.

Finding weaknesses in ADOS does not mean the Pilot failed. A Pilot that exposes real governance defects, ambiguity, excessive overhead, or invalid assumptions can be successful when those findings are evidenced, classified, routed, and preserved honestly.

## 11. Failure and Stop Conditions

The affected Pilot activity must stop or return to an earlier stage when:

- a Founder decision is missing, ambiguous, unrecorded, or does not identify the applicable scope and state;
- a required Brief, Specification, ADR decision, task, Context Pack, Review Report, Release Note, Retrospective, or evidence set is missing;
- mandatory verification fails, is inconclusive, or cannot be tied to the current deliverable;
- Reviewer contextual independence is compromised or private implementation reasoning enters the review context;
- repository identity, branch, baseline, worktree, staged set, commit, tag, or remote state is unexpected;
- implementation expands beyond the approved reproducibility scope;
- governing artifacts conflict or their precedence cannot be established;
- a material change is made without returning to the responsible stage and renewing affected evidence and approvals;
- unit, typecheck, lint, format, build, clean-checkout, or applicable Playwright checks fail;
- Playwright failure is attributed to code without separating browser/dependency preparation, or an environment failure is dismissed without evidence;
- Git commit, tag, push, authentication, permission, or remote verification fails;
- evidence is lost, overwritten, stale, or dependent on untracked local state;
- the clean checkout still lacks a required workspace package or source file; or
- resolving the issue would require ADOS Foundation change, large product redesign, unrelated refactoring, or unapproved production work.

A failure must retain its evidence and route work to the stage owning the requirement, architecture, implementation, review, decision, or repository action. Retrying does not restore invalidated evidence automatically.

## 12. Pilot Exit Criteria

The Pilot may close only when:

- the selected milestone is completed or formally stopped by the Founder;
- every review finding is resolved, rejected, or deferred through an explicit recorded decision;
- the Pilot Retrospective is complete;
- all Pilot metrics are recorded with known limitations;
- ADOS observations are classified as supported findings, non-blocking observations, or proposals;
- any recommended ADOS Foundation change remains a proposal and is not applied during the Pilot;
- the Founder records the Pilot closure decision;
- required commit and annotated tag exist when the milestone is released;
- local and remote repository states are verified and synchronized;
- the working tree is clean; and
- the closure record distinguishes completed, failed, deferred, and not-executed verification accurately.

## 13. Post-Pilot Outputs

Expected outputs are:

- the completed or formally stopped HTML2PDF fresh-clone reproducibility milestone;
- Project Brief, Specification, any required ADR, Implementation Tasks, Context Packs, Verification Evidence, Review Report, Release Note, and decision records used during the Pilot;
- Pilot Retrospective;
- Pilot Metrics Summary;
- ADOS Findings Register or equivalent traceable evidence record;
- Foundation Review recommendation;
- non-binding backlog proposals for supported ADOS weaknesses;
- recommendation on Runtime's operational value;
- recommendation on Context Pack sufficiency;
- evidence-based assessment of Reviewer isolation;
- evidence-based assessment of material-change handling;
- evidence-based assessment of Gate usability and Founder arbitration load; and
- evidence-based assessment of dependency-preparation versus implementation-failure classification.

These outputs do not create, amend, or approve an ADOS Foundation requirement. Any Foundation change must remain a proposal until processed through the frozen Foundation's governing rules and explicit Founder authority.

## 14. Immediate Next Step

After explicit Founder approval of this `PILOT_PLAN.md`, the immediate next step is:

> Prepare the Project Brief for the selected HTML2PDF fresh-clone reproducibility milestone.

Implementation must not begin until the Project Brief, Specification, applicable ADR decision, and Gate 1 approval have been completed and recorded through the ADOS lifecycle.
