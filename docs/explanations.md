# Proposed representative explanation contract

This is a **product assumption added after review**, not a wording requirement from the ticket. For the three exact daily input profiles below, all four `reason.text` values must use the listed short templates. Compare after trimming and collapsing whitespace; punctuation, numbers, units and remaining wording are stable. No additional clauses are allowed for these profiles, so appending a contradictory claim cannot pass by retaining a correct clause elsewhere.

These are manually written expected examples, independent of any future product implementation. [Assertion oracles](../src/contracts/explanations.ts) match controlled fixture weather, not returned `reason.facts`; the existing facts/code/score checks remain separate. The common week assertion applies the prose check on every matching day, including the seventh day. [Gherkin](../features/ranking.feature) tags the varied week `@explanations`; the mild journey and precipitation contrast also exercise these profiles when a SUT exists.

T = daily maximum temperature (°C), P = daily precipitation (mm), S = daily snowfall (cm), W = daily maximum wind speed (km/h). The daily aggregates do not establish simultaneous conditions, clear skies, waves, coastal access, resort availability or snowpack adequacy.

| Profile | T   | P   | S   | W   |
| ------- | --- | --- | --- | --- |
| Mild    | 22  | 0   | 0   | 10  |
| Snowy   | -5  | 5   | 5   | 10  |
| Rainy   | 22  | 12  | 0   | 10  |

| Profile | Activity            | Required text                                                                                                                                |
| ------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Mild    | Skiing              | Maximum temperature 22°C is above the skiing weather band. Resort availability and snowpack are not assessed.                                |
| Mild    | Surfing             | Weather proxy only: maximum temperature 22°C, precipitation 0 mm, maximum wind 10 km/h. Surfable waves and coastal access are not assessed.  |
| Mild    | Outdoor Sightseeing | Mild, dry weather: maximum temperature 22°C, precipitation 0 mm, maximum wind 10 km/h.                                                       |
| Mild    | Indoor Sightseeing  | Indoor sightseeing remains an option: maximum temperature 22°C and precipitation 0 mm.                                                       |
| Snowy   | Skiing              | Favourable skiing weather: maximum temperature -5°C, snowfall 5 cm, maximum wind 10 km/h. Resort availability and snowpack are not assessed. |
| Snowy   | Surfing             | Cold weather proxy: maximum temperature -5°C. Surfable waves and coastal access are not assessed.                                            |
| Snowy   | Outdoor Sightseeing | Cold outdoor weather: maximum temperature -5°C.                                                                                              |
| Snowy   | Indoor Sightseeing  | Indoor shelter is preferred: maximum temperature -5°C.                                                                                       |
| Rainy   | Skiing              | Maximum temperature 22°C is above the skiing weather band. Resort availability and snowpack are not assessed.                                |
| Rainy   | Surfing             | Weather proxy only: precipitation 12 mm exceeds the mild-weather band. Surfable waves and coastal access are not assessed.                   |
| Rainy   | Outdoor Sightseeing | Wet outdoor weather: precipitation 12 mm exceeds 10 mm.                                                                                      |
| Rainy   | Indoor Sightseeing  | Indoor shelter is preferred: precipitation 12 mm exceeds 5 mm.                                                                               |

The explicit negative statements about surfable waves and resorts are valid: no generic keyword blacklist or NLP interpretation is used. [Focused harness checks](../test/harness.test.ts) accept the templates and harmless whitespace, reject the review's “Clear skies and 45°C; excellent surfing waves at the ski resort.” mutation, reject incorrect numeric facts and reject appended unsupported claims. These static assertion probes do not serve a fake product API or demonstrate SUT behaviour.

Trade-off: alternative paraphrases for these exact profiles require agreement and an intentional contract update. For other weather profiles the suite still checks nonblank prose, structured codes, numeric facts and limitation metadata, but does **not** establish free-text truthfulness. Full prose quality outside the three representative profiles, translations and editorial style remain deferred; this is not a general language validator.
