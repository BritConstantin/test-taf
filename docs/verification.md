# Observed local verification

Run on 2026-10-26 using Node 24.19.0. These are local results, not a GitHub Actions run or independent review. The repository started empty; the product API remains absent.

| Executed command                                                             | Observed outcome                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                     | Exit 0; installed 193 packages from the repository lockfile                                                                                                                        |
| `npm run check`                                                              | Exit 0; strict TypeScript, typed ESLint and Prettier passed                                                                                                                        |
| `npm run test:harness` (also inside `check`)                                 | Five tests passed: semantic stub matching, unmatched/unused routes, reset, timeout/cleanup/port reuse, HTTP vs transport errors                                                    |
| `npm run validate` (inside `check`)                                          | Exit 0; OpenAPI structure, actual referenced response schemas, positive/null metadata and negative nested samples, provider array shape/units and local calendar windows validated |
| `npm run bdd:dry-run` (inside `check`)                                       | Exit 0; 86 expanded scenarios / 460 Cucumber steps reported skipped by design; no undefined, ambiguous or pending definitions. No runtime assertions executed by dry-run           |
| `timeout 60s env SUT_BASE_URL=http://127.0.0.1:3000 npm run test:acceptance` | Exit **1**, not timeout. All 86 scenarios failed at an HTTP When step with TransportError caused by ECONNREFUSED on port 3000                                                      |

The actual shell also prepended the installed Node directory to PATH. Acceptance console totals: `460 steps (261 passed, 113 skipped, 86 failed)`; that formatter's totals include 172 successful Before/After hooks. There were 89 successful non-hook setup steps, 86 failed request steps and 113 skipped downstream steps. All provider setup and lifecycle hooks passed. No acceptance failures originated in imports, undefined steps, fixture construction or hooks.

Reports generated: `reports/cucumber.json` and `reports/cucumber.html`; both are ignored, as are dependencies and compiled output. The final report is the real acceptance run, not a dry-run. Each failed scenario has request/transport context and an empty provider journal because the missing SUT never called the stub. The console log was inspected along with the machine-readable report.

This is **infrastructure-red**, not observed behaviour-red. It proves executable glue, fixture setup, clean lifecycle and reaching absent infrastructure. It does not establish scoring correctness, response validation against a real service, SUT deadline handling, fixed-clock support or provider URL routing. Static JSON samples validate contract shape; they are never served as a fake product API. The five green harness tests exercise only infrastructure.

The sandbox initially prohibited loopback `listen` with EPERM. Socket-based verification was rerun with the required execution permission; the successful check/acceptance observations above come from those reruns. npm registry access was similarly enabled after a sandbox DNS failure to verify/install exact compatible versions. The final plain `npm ci` succeeded from the available cache.

Self-review reconciled contract/fixtures/examples, removed a raw query length constraint that would precede trimming, corrected a Cucumber slash escape detected by dry-run, fixed schema-reference URI handling, replaced an overbroad prose keyword assertion with structured meaning checks, and corrected a two-character search fixture to an actual exact-name candidate (`Bø`). Free prose quality, all threshold combinations, real provider drift and external SUT seams remain the limits recorded in [traceability](traceability.md).

No product API, remote repository, push, visibility change, license or local commit was created. The submission is a set of new local files ready to review and commit.
