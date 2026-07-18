# Gate 1 Decision: Fresh-Clone Reproducibility Pilot

## 1. Decision Summary

- Status: Approved
- Gate: Gate 1 — Design Approval
- Decision: Approved for implementation
- Decision Owner: Founder / Decider
- Founder decision date: 2026-07-18
- Repository: `C:\Users\tolga\Documents\Codex\active-projects\html2pdf-saas`

The Founder approves the identified Pilot Plan, Project Brief, ADR, and Specification as the governing design artifacts for the first HTML2PDF Pilot. Implementation is now authorized within the approved scope and constraints.

## 2. Approved Artifacts

Gate 1 approval applies only to the exact artifact versions identified below:

| Artifact                                  | Approved role                                                                                    | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `PILOT_PLAN.md`                           | Pilot lifecycle, governance, metrics, stop conditions, and exit criteria                         | `8486EEF2C125308FC959B3BDD3F616E4E5791080E2417DCBBA5C557AA298AB56` |
| `PROJECT_BRIEF.md`                        | Approved problem, objectives, scope, exclusions, risks, and intended outcome                     | `87B4FAFE793882A85BC8A9247E70795ABF7C0A8799679833C1C2A0AA27A65B23` |
| `ADR-001-FRESH-CLONE-REPRODUCIBILITY.md`  | Authoritative architectural decision direction and consequences                                  | `945BE97F33293973F9434AA71A285BBEC0F7AEA0AFB70B9B6100FC94BD7B4045` |
| `SPEC-001-FRESH-CLONE-REPRODUCIBILITY.md` | Authoritative requirements, constraints, acceptance criteria, protocol, and evidence obligations | `4D05B2FB734C3520F53AA5906443BA7059C9A3B3FBE4EA7DDD940DFDA014B139` |

ADR-001 and SPEC-001 remain authoritative throughout implementation. A material change to any approved artifact invalidates affected downstream authority and evidence and requires return to the appropriate ADOS stage, including renewed Gate 1 approval when required.

## 3. Scope Approved

The Founder approves implementation limited to:

- inspecting `packages/storage` and its tracked dependency relationships;
- correcting the relevant source-control ignore boundary with the smallest sufficient change;
- intentionally versioning the reviewed, required `packages/storage` contents;
- adding only necessary project documentation for environment prerequisites;
- validating installation and repository completeness from a clean checkout outside the active working directory;
- running typecheck, lint, formatting verification, production build, unit tests, and applicable Playwright verification;
- distinguishing repository defects from environment or dependency-preparation limitations; and
- collecting the complete implementation and verification evidence required by SPEC-001 for independent review.

Implementation tasks must trace to an approved SPEC-001 requirement or acceptance criterion and, where applicable, ADR-001.

## 4. Explicit Exclusions

This approval does not authorize:

- new user-facing or product features;
- UI or API redesign;
- queue, worker, PDF-engine, database, deployment, or infrastructure redesign;
- database migrations or broad Docker changes;
- unrelated dependency upgrades or refactoring;
- product behavior changes unsupported by a separately verified and approved defect;
- `README.md` roadmap correction unless separately approved;
- changes to the frozen ADOS Foundation;
- committing caches, browser binaries, databases, secrets, credentials, logs, temporary files, `node_modules`, build output, or runtime storage; or
- any scope or architecture expansion not explicitly approved by the Founder.

## 5. Gate 1 Decision

Gate 1 is **Approved** for the exact artifacts and repository baseline recorded in this decision.

The Founder determines that the approved Project Brief, ADR-001, and SPEC-001 provide sufficient scope, architecture, requirements, constraints, acceptance criteria, risks, and verification obligations for bounded implementation to begin.

Scope may not expand without Founder approval. The Implementer must stop and escalate ambiguity, contradiction, unexpected repository state, or a change that would invalidate an approved design input.

## 6. Authorization to Begin Implementation

Implementation is now authorized.

Authorized work must proceed against ADR-001 and SPEC-001 after bounded Implementation Tasks and the required Implementer Context Pack are prepared.

This authorization permits only mechanical implementation and verification within the approved scope. It does not transfer decision authority, approve implementation results, approve Gate 2 or Gate 3, or authorize release.

No commit, tag, or push is authorized by this Gate alone. Those repository operations require the applicable later Founder approval and mandatory closure sequence.

## 7. Required Evidence for Gate 2

All implementation evidence must satisfy SPEC-001. At minimum, the independent Reviewer must receive:

- Git status before and after implementation and from the separate clean checkout;
- the complete changed-file inventory and requirement traceability;
- ignore-rule source and evaluation evidence demonstrating that required package files are trackable while runtime storage remains ignored;
- the reviewed and tracked `packages/storage` file inventory;
- dependency-relationship evidence across relevant imports, manifests, workspace configuration, TypeScript mappings, Dockerfile references, and lockfile entries;
- the clean-checkout path and exact candidate commit or otherwise uniquely identified candidate state under review;
- runtime and package-manager versions and dependency-installation evidence;
- typecheck, lint, formatting, production-build, generated-route, and unit-test results;
- browser-preparation evidence and applicable Playwright results;
- explicit classification of unavailable services, credentials, runtimes, browser assets, Docker-engine access, or database configuration;
- security-boundary, prohibited-artifact, secret-safety, and scope-conformance evidence;
- rollback readiness evidence; and
- confirmation that no hidden repository-owned source outside Git is required by the clean-checkout path.

No check may be reported as passed when it was failed, blocked, skipped, not executed, or inconclusive. A material candidate change invalidates dependent evidence and requires renewed verification.

## 8. Founder Decision Date

The Founder / Decider recorded this approval on **2026-07-18**.

This date records the decision; it does not represent implementation completion, review approval, merge approval, or release authorization.

## 9. Repository Baseline

- Branch: `main`
- Baseline commit: `86734592b71c3fc16d375d7c75e1886bee49b027`
- Baseline tag: `v0.1.1-alpha`
- Remote: `https://github.com/okolbukol/html2pdf-saas.git`

Implementation must begin from this baseline and the exact approved artifact versions identified in Section 2. Any unexpected divergence must be reported before implementation continues.

## 10. ADOS Foundation Reference

- Foundation status: Foundation Freeze
- Foundation commit: `bc725b986befb25dbd11fdd8ed8dde1a84f213c3`
- Foundation tag: `v1.3.1-foundation-freeze`

The ADOS Foundation remains frozen and read-only. This project Gate decision applies the approved Foundation and does not amend it.
