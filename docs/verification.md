# Observed local verification after review

This revision addresses the three supplied findings on `b20b3db`. Node 24.19.0 and the existing lockfile/dependencies were used; no dependencies were added and installation was not rerun. These are local observations, not a GitHub Actions run or independent validation of the product. The working tree was clean before changes; no applicable AGENTS.md was found.

| Executed command                                                             | Observed outcome                                                                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                              | Exit 0 outside the socket-restricted sandbox; strict TypeScript, typed ESLint and Prettier passed                                           |
| `npm run test:harness` (inside `check`)                                      | Eight tests passed: five existing infrastructure probes and three new timeout/prose assertion probes                                        |
| `npm run validate` (inside `check`)                                          | Exit 0; OpenAPI, actual referenced response schemas, static examples, provider fixtures, clock windows and timing-budget ordering validated |
| `npm run bdd:dry-run` (inside `check`)                                       | Exit 0; 24 definitions expand to 87 scenarios / 467 Cucumber steps skipped by design; no undefined, ambiguous or pending definitions        |
| `timeout 60s env SUT_BASE_URL=http://127.0.0.1:3000 npm run test:acceptance` | Exit **1**, not timeout; all 87 scenarios failed in HTTP When steps with TransportError caused by ECONNREFUSED on port 3000                 |

The shell prepended `/home/kbrit/.nvm/versions/node/v24.19.0/bin` to PATH. Acceptance console totals: `467 steps (264 passed, 116 skipped, 87 failed)`. The formatter includes 174 successful Before/After hooks; the other 90 successful steps set up scenario context. The new provider-400 Given and all delayed-payload setup steps passed. No failure originated in imports, undefined steps, fixture construction or lifecycle hooks.

The added static probes accept a prompt 504, reject a 504 measured beyond the 600 ms budget (including 900 ms and 2000 ms), and reject wrong status/code or invalid elapsed measurements. They accept the representative explanation templates, including legitimate limitation statements and whitespace variation. The common week assertion rejects the review's full contradictory-text mutation, incorrect temperature/precipitation and an appended unsupported claim on the seventh day. These probes exercise assertion logic directly; no product endpoint or fake SUT was served.

The first sandboxed `npm run check` stopped at the Node HTTP harness phase. A direct diagnostic invocation (`node dist/test/harness.test.js`) confirmed `listen EPERM` for the five socket-based probes; the three assertion-only probes passed there. With the required execution permission, all eight passed in the full quality gate. Acceptance also ran with local socket permission. No failures were suppressed, converted to success or retried to hide a behavioural failure.

Reports generated: `reports/cucumber.json` and `reports/cucumber.html`, both ignored. The final report is the actual acceptance run, not a dry-run. Inspection found 87 TransportError/ECONNREFUSED failures, 174 successful hooks and empty provider journals because the absent SUT never called the stub. The console log and machine-readable report were inspected.

This remains **infrastructure-red**, not observed behaviour-red. Actual SUT deadline enforcement, error mapping, prose generation, fixed-clock support and provider routing are unverified. The 600 ms budget intentionally includes tolerance and cannot prove an exact internal 300 ms deadline. Prose outside the three representative profiles still lacks semantic validation; see [explanation limits](explanations.md) and [traceability](traceability.md). Static samples and green harness assertions do not establish product correctness.

Final review reconciled timing constants/docs, prose templates/static examples, the new resolution-400 scenario and traceability. No product API, fake SUT, dependency, commit or push was added; changes remain a local diff against `b20b3db`.
