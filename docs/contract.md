# Proposed public contract

The ticket requires name input, partial matches, seven-day Open-Meteo forecasts and daily activity suitability with explanations. Everything below refines unspecified behaviour for review; it needs product agreement before implementation. [OpenAPI](../contracts/openapi.json) is the single runtime response-schema source. Semantic checks supplement it.

## Discovery

`GET /v1/locations?query=Gdan` returns `{ "locations": [...] }` (200). Trim surrounding whitespace; require 2–80 Unicode code points after trimming. Missing, blank, too short or too long is 400 `INVALID_INPUT`, before provider access. Pass the trimmed name to `/v1/search` with `count=10&language=en&format=json`. Preserve provider order; cap at 10; no global alphabetical/relevance guarantee. Full names can still produce multiple candidates: never auto-select one. No results (provider missing `results` or `results: []`) maps to an empty public array. `results: null` or malformed candidate data is invalid upstream data, not no results.

Matching follows the provider: 2 characters use exact name matching; 3+ use normalized prefix matching, case and diacritic insensitive. This does not promise arbitrary substring search or typo correction. Preserve Unicode in transport and display names. Tests control provider matches rather than reimplementing its index. Postal codes, qualifiers and advanced filters are outside this contract's tested scope.

Each candidate has `id`, `name`, `country`, `countryCode`, `admin1`, `latitude`, `longitude`, `timezone`. IDs are positive safe integers, opaque to consumers. Required name, coordinates and IANA timezone must be usable; missing these invalidates the response. Optional upstream `country`, `country_code`, `admin1` map to explicit public nulls when absent. Other administrative levels are deferred. Coordinates are WGS84; timezone is an IANA identifier, not a fixed offset. Provider fields not in this contract are not exposed.

## Ranking

`GET /v1/activity-rankings?locationId=3099434`. Require a positive safe integer represented as decimal digits; invalid/missing input is 400 before provider access. Resolve arbitrary returned IDs using `/v1/get?id=...&language=en&format=json`; no previous search or local location database is required. The ID does not encode coordinates/timezone. Resolve first, then fetch forecast for those coordinates/timezone.

Return seven consecutive **local calendar dates, including today** (assumption), ordered oldest first. `date` is ISO date-only on the parent day and applies to every nested activity. Include the selected location with timezone. Exactly four distinct activities per day, stable IDs and exact ticket names, integer score 0–100, structured reason and nonblank prose. The proposed [explanation templates](explanations.md) additionally specify wording, facts with units and limitations for three representative weather profiles; other profiles retain the documented prose-validation limit. Descending score and the stable tie order are defined in [suitability.md](suitability.md). Include model `weather-only-v1` and the two scope limitation codes. [README](../README.md) has representative payloads.

Require seven aligned daily arrays, exact expected dates, declared units, timezone and valid finite values. A missing day/value, null, invalid JSON or invalid units fails the entire request with `UPSTREAM_DATA_INVALID`; no invented zeroes, reduced window or partial scores. Grid coordinates may differ from the requested town coordinates: do not require exact grid echo equality. Cache and retry behaviour are not proposed; deterministic test mode must disable both.

## Errors

All responses are JSON with `Content-Type: application/json` (optional charset). Error envelope: `{ "error": { "code": "...", "message": "..." } }`. Message is nonblank and user-appropriate; do not include credentials, stack traces or arbitrary upstream diagnostic text. Exact prose is not prescribed.

| Situation                                         | HTTP | Code                  |
| ------------------------------------------------- | ---- | --------------------- |
| Missing/invalid public parameter                  | 400  | INVALID_INPUT         |
| `/v1/get` says ID not found                       | 404  | LOCATION_NOT_FOUND    |
| Provider exceeds 300 ms deadline                  | 504  | PROVIDER_TIMEOUT      |
| Provider non-success, other than known missing ID | 502  | PROVIDER_FAILURE      |
| Invalid JSON/data, missing forecast values/dates  | 502  | UPSTREAM_DATA_INVALID |

The controlled missing-ID response is Open-Meteo's observed HTTP 400 `{ "error": true, "reason": "Location ID not found." }`. Do not map every upstream 400 to 404 or blindly expose its text. The separate `@resolution-bad-request` scenario injects a synthetic HTTP 400 with a different parameter-error diagnostic and expects 502 / `PROVIDER_FAILURE`, no diagnostic leakage and no forecast call. The genuine missing-ID case remains 404. Provider errors during discovery use the same 502/504 envelope; an empty successful search is not an error.

In the local acceptance environment, a provider timeout must produce the complete 504 / `PROVIDER_TIMEOUT` HTTP response within 600 ms (300 ms deadline plus 300 ms HTTP/scheduling tolerance), before the 900 ms delayed valid provider body and the client timeout. This test-environment budget uses monotonic elapsed time, separately from the fixed application clock. [Timing rationale and limits](provider-control.md) apply; transport errors never count as a public timeout response.
