# External-process dependency control

```text
Cucumber steps --HTTP--> future Activity Ranking SUT (port 3000)
                               |
                               +--HTTP--> provider stub (127.0.0.1:4400)
                                          /v1/search, /v1/get, /v1/forecast
```

The suite never stubs `/v1/locations` or `/v1/activity-rankings`. Each scenario's World owns a real Node HTTP stub, listens before Given steps, installs its own responses and closes connections/timers/listener afterwards, including on failures. Awaited `listen` is readiness; an occupied port fails setup. No Docker, sleeps, startup race or test-process-only interceptor. Harness probes use ephemeral ports and do not implement the product API.

Run one local SUT process beside one local Cucumber process. The fixed port allows configuring the SUT before Cucumber starts. Run serially (`parallel: 0`), with no retries and no caching in the SUT: concurrent scenarios would contend for the port and the same SUT could observe another scenario's fixtures. Port resets/lifecycle are not a parallel-isolation strategy. Multiple acceptance invocations against the same SUT are unsupported.

## Required future SUT seams

These are proposed integration requirements, **not implemented or verified product capabilities**. Configure the future SUT in its own terminal, then run Cucumber. Illustrative environment prefix (replace `<future-sut-command>` with the actual service command):

```sh
env OPEN_METEO_GEOCODING_BASE_URL=http://127.0.0.1:4400 \
  OPEN_METEO_FORECAST_BASE_URL=http://127.0.0.1:4400 \
  OPEN_METEO_TIMEOUT_MS=300 OPEN_METEO_RETRIES=0 APP_CACHE_ENABLED=false \
  APP_CLOCK_MODE=fixed APP_FIXED_NOW=2026-10-23T23:30:00Z \
  <future-sut-command>
```

Both provider clients must append the documented paths to these origins, with no real-provider fallback. Clock protocol: in `fixed` mode all application calls for current time return exactly the parsed RFC3339 `APP_FIXED_NOW` instant; invalid/missing values fail SUT startup. Convert this instant using the resolved location's IANA timezone to determine today. Freezing Cucumber's clock would not freeze another process. In ordinary deployment, the SUT would use its real clock; test mode is an explicit environment prerequisite.

At this instant Warsaw is October 24 and its seven-day window includes the October 25 DST transition. Honolulu and the selected US journey candidate are still October 23. Fixtures use explicit calendar date lists and daily arrays, not 24-hour increments or assumptions about hourly DST output. A provider response's fixed `utc_offset_seconds` is not a calendar timezone conversion rule.

For forecast requests require the resolved `latitude`, `longitude`, `timezone`, explicit `start_date` and `end_date`, `daily=temperature_2m_max,precipitation_sum,snowfall_sum,wind_speed_10m_max`, `temperature_unit=celsius`, `precipitation_unit=mm`, `wind_speed_unit=kmh`, `timeformat=iso8601`. Explicit dates make the requested window observable. Search/get query parameters are in [contract.md](contract.md). Additional harmless provider parameters are tolerated. Relevant values and HTTP method/path must match; query order and daily-field order do not matter. Each fixture must be consumed at least once, and every provider request must match. There are no brittle exact request-count assertions.

Timeout simulation delays a **valid** search result, resolved location or complete forecast by **900 ms**, exceeding the required **300 ms** SUT provider deadline. This isolates latency from invalid-data handling. The suite requires HTTP 504 / `PROVIDER_TIMEOUT` and a complete response within **600 ms**, measured by the client with monotonic `performance.now()` from immediately before fetch through body reading and JSON parsing. This is a proposed same-host acceptance budget: 300 ms provider deadline plus **300 ms tolerance** for HTTP, an immediate resolution call where needed, parsing and CI scheduling. It is not a new product latency SLA or proof of an exact 300 ms internal deadline. There is no exact-duration equality or lower-bound assertion.

The 600 ms ceiling remains 300 ms below the delayed valid response and at least 900 ms below the minimum test-client timeout. Test-client deadline defaults to **2500 ms** (validated range 1500–5000); Cucumber step timeout is 7000 ms. A late 504 fails even if its code is correct. Client deadline/refusal/DNS failures still throw `TransportError` and cannot satisfy an HTTP timeout assertion. Focused assertion probes use synthetic elapsed measurements to prove late responses fail without wall-clock sleeps. Aborted provider sockets cancel delayed timers. No retries or sleeps conceal failures; heavily stalled environments can legitimately fail the documented budget and need diagnosis rather than automatic reruns.

Unmatched requests return 501 and enter the scenario journal. Passing scenarios verify matching and consumption in the After hook; failures attach a bounded response excerpt and journal without overwriting the primary transport/assertion failure. Journal attachments also accompany successful scenarios. Input validation and failed resolution assert absence of provider/forecast access.

The default acceptance path uses no live providers. This harness cannot prevent a future SUT from ignoring its base URLs or calling a different host: its configuration/egress must be verified when that service exists. Empty stub journals and unconsumed fixtures expose missing expected traffic, but do not prove absence of extra off-stub calls. No container topology or live smoke command is included. A remote SUT cannot reach this loopback listener; use this documented same-host topology. The manual GitHub workflow deliberately performs no deployment, so its default absent-SUT run is red; a future CI integration must co-locate and start the actual SUT with these seams.
