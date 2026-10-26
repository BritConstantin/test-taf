# Proposed suitability model: weather-only-v1

These are **proposed product decisions**, not employer acceptance criteria or scientific recommendations. Scores are ordinal suitability bands, not ranks or probabilities. Rank four activities **within each day**, highest score first. Ties use: Skiing, Surfing, Outdoor Sightseeing, Indoor Sightseeing. A best-day-per-activity view is deferred.

Use only daily Open-Meteo fields: T = `temperature_2m_max` (°C), P = `precipitation_sum` (mm, includes snow water equivalent), S = `snowfall_sum` (cm), W = `wind_speed_10m_max` (km/h). No extra aggregation. These are daily extremes/totals, not simultaneous conditions or full-day comfort guarantees. Request the units explicitly. Zero is valid; null, missing, negative P/S/W, non-finite values, incorrect units or misaligned arrays invalidate the whole forecast. Temperature may be negative.

Evaluate each activity independently, **top to bottom; first matching row wins**. Every finite, valid input has a result. All interval endpoints shown with ≤ are inclusive. No interpolation, rounding, bonuses or hidden rules.

| Activity            | Priority | Condition                             | Score | Reason code      |
| ------------------- | -------- | ------------------------------------- | ----- | ---------------- |
| Skiing              | 1        | W > 40 or T < -20 or T > 5 or S > 30  | 10    | SKI_ADVERSE      |
| Skiing              | 2        | -10 ≤ T ≤ 2 and 2 ≤ S ≤ 20 and W ≤ 25 | 90    | SKI_FAVOURABLE   |
| Skiing              | 3        | Otherwise                             | 40    | SKI_OTHER        |
| Surfing             | 1        | W > 35 or T < 10 or T > 35 or P > 20  | 10    | SURF_ADVERSE     |
| Surfing             | 2        | 18 ≤ T ≤ 28 and 5 ≤ W ≤ 20 and P ≤ 2  | 70    | SURF_MILD        |
| Surfing             | 3        | Otherwise                             | 40    | SURF_OTHER       |
| Outdoor Sightseeing | 1        | T < 0 or T > 35 or P > 10 or W > 40   | 10    | OUTDOOR_ADVERSE  |
| Outdoor Sightseeing | 2        | 15 ≤ T ≤ 25 and P ≤ 1 and W ≤ 20      | 90    | OUTDOOR_MILD_DRY |
| Outdoor Sightseeing | 3        | Otherwise                             | 50    | OUTDOOR_OTHER    |
| Indoor Sightseeing  | 1        | T < 0 or T > 30 or P > 5 or W > 30    | 85    | INDOOR_PREFERRED |
| Indoor Sightseeing  | 2        | Otherwise                             | 60    | INDOOR_AVAILABLE |

Indoor suitability describes the relative appeal of shelter; it is not the numerical inverse of outdoor suitability. Extreme weather does not imply travel or venue safety. Skiing can benefit from moderate snowfall/cold but heavy snow/wind/temperature extremes reduce suitability.

Surfing measures **only mild, relatively dry, moderate-wind weather near the selected town**. It does not measure waves, water temperature, wind direction relative to shore, coastal access or actual surfability. Even an inland town can receive this limited proxy score. Skiing similarly does not establish a resort, existing snowpack or adequate snow depth. These limitations are machine-readable in every ranking response (`SURF_WEATHER_PROXY_ONLY`, `SKI_WEATHER_ONLY`); reason text must describe weather, never promise surfable waves or an open resort. Credible surf conditions would need marine/wave data plus independently established location applicability; a marine grid cell alone would not prove coastal access. Marine API integration is deferred.

`reason.code` identifies the chosen row. Nonblank `reason.text` explains it. `reason.facts` provides all four actual daily numbers using unit-bearing keys (`temperatureMaxC`, `precipitationMm`, `snowfallCm`, `windMaxKmh`). Structured facts and codes are checked independently of prose. The proposed [representative explanation contract](explanations.md) pins short, factual text for mild, snowy and rainy examples; other inputs retain free wording and limited automated prose validation. Do not claim clear skies from these fields.

Expected examples are manually enumerated in [ranking.feature](../features/ranking.feature) and the [varied-week oracle](../src/provider/examples.ts). They cover all rows and selected boundaries; they do not implement this table as an expected-score function. The contrast scenario holds temperature, snow and wind constant while changing precipitation. Exhaustive Cartesian boundary coverage is deliberately deferred. All matching days receive the representative text checks; prose outside those three profiles still needs editorial review. There is no keyword ban: legitimate limitation statements such as “Surfable waves and coastal access are not assessed.” remain valid.
