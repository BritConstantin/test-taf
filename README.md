# Activity Ranking API — specification-first acceptance tests

**There is no product API in this repository. Acceptance tests are expected to fail until an external implementation exists.** The submission contains proposed Gherkin criteria, runnable TypeScript/Cucumber-JS HTTP tests and their contract. No reference service or fake SUT is supplied.

The ticket's explicit requirements are name/partial-name input, Open-Meteo seven-day weather, four activities and daily suitability with explanations. The endpoints, score bands, tie rules and error policy below are **proposals**, not additional employer requirements.

## Quick start

Use Node **24.19.0** (`nvm use`; see [.nvmrc](.nvmrc)) and npm. No Docker, API key or live provider is needed. Dependencies are exact-pinned with [package-lock.json](package-lock.json).

```sh
npm ci
npm run check
npm run test:acceptance
```

Expected: install and quality checks pass; acceptance exits **non-zero** with `TransportError` when nothing listens at `http://127.0.0.1:3000`. Run in an environment that permits loopback TCP listening for the stub. `npm test` also runs real acceptance, not harness checks.

| Command                                      | Purpose                                                              |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `npm run typecheck`                          | Strict TypeScript checking                                           |
| `npm run lint` / `npm run format:check`      | Typed ESLint / Prettier                                              |
| `npm run test:harness`                       | Five infrastructure probes; no product behaviour                     |
| `npm run validate`                           | OpenAPI, referenced schemas, static samples and fixture/clock checks |
| `npm run bdd:dry-run`                        | Detect undefined/ambiguous steps without executing hooks/assertions  |
| `npm run test:acceptance -- --tags @journey` | Run the complete name → selection → ranking scenario                 |

To test a compatible implementation, first start it with the exact [provider/clock prerequisites](docs/provider-control.md), then:

```sh
SUT_BASE_URL=http://127.0.0.1:3000 npm run test:acceptance
```

[.env.example](.env.example) documents all runner settings and the separate future-SUT settings. `.env` is not auto-loaded. Stub port defaults to 4400; if changed, change both SUT provider URLs too. The suite and SUT must be local processes on the same host. Execution is serial and has no retries.

## Proposed API

[OpenAPI](contracts/openapi.json) supplies the actual runtime response schemas; [contract details](docs/contract.md) define semantics.

`GET /v1/locations?query=Gdan` → 200:

```json
{
  "locations": [
    {
      "id": 3099434,
      "name": "Gdańsk",
      "country": "Poland",
      "countryCode": "PL",
      "admin1": "Pomerania",
      "latitude": 54.35205,
      "longitude": 18.64637,
      "timezone": "Europe/Warsaw"
    }
  ]
}
```

Trim search whitespace; accept 2–80 Unicode code points. Provider matching is case/diacritic insensitive: exact name for 2 characters, normalized prefix for 3+. No typo/substrings promise. Preserve provider candidate order, at most 10; full names may be ambiguous. No matches returns `locations: []`; optional country/admin metadata becomes null.

`GET /v1/activity-rankings?locationId=3099434` → 200: [complete seven-day example](contracts/examples/rankings.json). Resolve the ID through Open-Meteo `/v1/get`, then request weather using its coordinates/timezone. No preloaded town database or previous search is required. A parent `days[].date` applies to all four entries in that day's `activities`. One activity entry looks like:

```json
{
  "id": "outdoor-sightseeing",
  "name": "Outdoor Sightseeing",
  "score": 90,
  "reason": {
    "code": "OUTDOOR_MILD_DRY",
    "text": "Mild maximum temperature of 22°C with 0 mm precipitation and wind up to 10 km/h.",
    "facts": {
      "temperatureMaxC": 22,
      "precipitationMm": 0,
      "snowfallCm": 0,
      "windMaxKmh": 10
    }
  }
}
```

Seven chronological local calendar dates include **today** (assumption). Rank the four activities within each day by descending integer score 0–100; score is suitability, not probability or rank. Ties: Skiing, Surfing, Outdoor Sightseeing, Indoor Sightseeing. [Decision table](docs/suitability.md) defines fields, units, precedence and exhaustive bands. Reason codes and numeric facts are checked; prose need only be nonblank and consistent.

Every ranking declares model `weather-only-v1` and limitations `SURF_WEATHER_PROXY_ONLY`, `SKI_WEATHER_ONLY`. Surfing describes a limited weather proxy, not waves, coastal access or safety; skiing does not imply a resort or sufficient existing snowpack. Missing/invalid forecast data fails the entire request, with no invented scores.

Example error (502):

```json
{
  "error": {
    "code": "UPSTREAM_DATA_INVALID",
    "message": "Weather information is incomplete. Please try again later."
  }
}
```

Other mappings: invalid public input 400; unknown ID 404; provider failure 502; provider timeout 504. Error messages must not expose provider internals. See the [error table](docs/contract.md#errors).

## Dependency control and results

Cucumber calls the external SUT over HTTP. Only upstream `/v1/search`, `/v1/get`, `/v1/forecast` are stubbed by a reachable, scenario-owned HTTP server. The future SUT must support two provider base URLs, a 300 ms provider deadline and a fixed clock at `2026-10-23T23:30:00Z`. Those seams are specified, **not yet verified against a SUT**. [Topology and startup example](docs/provider-control.md) explain isolation, deadlines, clock conversion and the remaining egress limitation.

Console failures include request context; `reports/cucumber.html` and `reports/cucumber.json` contain bounded response/journal attachments. Reports are ignored by Git. A dry-run reports skipped execution intentionally: it verifies bindings only. Acceptance failures are never converted to passes or rerun automatically.

Connection refused is **infrastructure-red**: it proves runnable invocation reaches the missing SUT, not that scoring assertions have executed. **Behaviour-red** can only be observed with a reachable implementation. [Local verification evidence](docs/verification.md) records what actually ran. Quality CI checks the harness without a SUT; the separate manual acceptance workflow executes the real failing command and uploads reports even on failure. No remote GitHub run is claimed.

## Review guide and scope

- [Features](features) — 23 scenario definitions, including focused outlines.
- [Automation](src) — typed World, HTTP client, provider fixtures/stub, contracts and domain steps.
- [Traceability and deferred risks](docs/traceability.md) — implemented specifications versus execution evidence.
- [Engineering notes](docs/engineering-notes.md) — ten interview decisions, rationale and alternatives.
- [Official sources](docs/sources.md) — checked provider/tooling details.

Trade-offs: daily weather bands favour explainability over meteorological precision; structured reasoning avoids brittle prose equality; serial execution keeps a fixed-port external-process topology small. Representative malformed data and boundaries are covered, not every combination. Marine integration/location applicability, best-day views, advanced search, full egress enforcement and broader resilience are deferred. Auth, load, persistence and UI testing are outside the ticket.

AI disclosure: Codex helped draft and implement the proposed contract, decision table, Gherkin, harness and documentation, and ran the checks recorded in the evidence file. Provider/tool APIs were checked against official sources. No human review, independent review or correctness guarantee is claimed. Product agreement on the proposals and real SUT integration/behaviour validation remain necessary. Everything is prepared locally; publishing a public GitHub repository is a separate user action.
