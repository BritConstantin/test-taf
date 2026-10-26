@ranking
Feature: Rank four activities within each of seven local days
  The proposed weather-only model explains suitability without promising venues or waves.

  @journey
  Scenario: Search a town name, select a returned match and obtain rankings
    Given location discovery has "ambiguous" matches for "Springfield"
    And the second matching town has a complete mild forecast
    When I search for "Springfield"
    And I select the second returned match and request its rankings
    Then all seven local days contain four correctly ordered activities and weather facts
    And every day gives "surfing" score 70 with reason "SURF_MILD"

  @week @oracle @explanations
  Scenario: Explain all four activities across a varied seven-day forecast
    Given the selected town has the documented varied weather week
    When I request rankings for the selected town
    Then all seven local days contain four correctly ordered activities and weather facts
    And every activity matches the manually specified seven-day examples
    And the representative explanations describe the controlled weather and activity limitations

  @skiing @boundaries
  Scenario Outline: Apply the skiing bands and adverse-weather precedence
    Given every forecast day has temperature <T> C, precipitation <P> mm, snowfall <S> cm and wind <W> km/h
    When I request rankings for the selected town
    Then every day gives "skiing" score <score> with reason "<reason>"

    Examples:
      | T     | P    | S    | W    | score | reason         |
      | -10   | 1    | 2    | 25   | 90    | SKI_FAVOURABLE |
      | 2     | 20   | 20   | 25   | 90    | SKI_FAVOURABLE |
      | 2.1   | 1    | 5    | 10   | 40    | SKI_OTHER      |
      | -5    | 1    | 1.9  | 10   | 40    | SKI_OTHER      |
      | -5    | 20.1 | 20.1 | 10   | 40    | SKI_OTHER      |
      | -5    | 1    | 5    | 25.1 | 40    | SKI_OTHER      |
      | -20   | 30   | 30   | 40   | 40    | SKI_OTHER      |
      | -20.1 | 1    | 5    | 10   | 10    | SKI_ADVERSE    |
      | 5     | 0    | 0    | 10   | 40    | SKI_OTHER      |
      | 5.1   | 0    | 0    | 10   | 10    | SKI_ADVERSE    |
      | -5    | 30.1 | 30.1 | 10   | 10    | SKI_ADVERSE    |
      | -5    | 1    | 5    | 40.1 | 10    | SKI_ADVERSE    |

  @surfing @boundaries
  Scenario Outline: Describe only a limited surfing weather proxy
    Given every forecast day has temperature <T> C, precipitation <P> mm, snowfall 0 cm and wind <W> km/h
    When I request rankings for the selected town
    Then every day gives "surfing" score <score> with reason "<reason>"

    Examples:
      | T    | P    | W    | score | reason       |
      | 18   | 2    | 5    | 70    | SURF_MILD    |
      | 28   | 2    | 20   | 70    | SURF_MILD    |
      | 17.9 | 0    | 10   | 40    | SURF_OTHER   |
      | 28.1 | 0    | 10   | 40    | SURF_OTHER   |
      | 22   | 2.1  | 10   | 40    | SURF_OTHER   |
      | 22   | 0    | 4.9  | 40    | SURF_OTHER   |
      | 22   | 0    | 20.1 | 40    | SURF_OTHER   |
      | 10   | 20   | 35   | 40    | SURF_OTHER   |
      | 9.9  | 0    | 10   | 10    | SURF_ADVERSE |
      | 35   | 0    | 10   | 40    | SURF_OTHER   |
      | 35.1 | 0    | 10   | 10    | SURF_ADVERSE |
      | 22   | 20.1 | 10   | 10    | SURF_ADVERSE |
      | 22   | 0    | 35.1 | 10    | SURF_ADVERSE |

  @outdoor @boundaries
  Scenario Outline: Prefer dry mild weather for outdoor sightseeing
    Given every forecast day has temperature <T> C, precipitation <P> mm, snowfall 0 cm and wind <W> km/h
    When I request rankings for the selected town
    Then every day gives "outdoor-sightseeing" score <score> with reason "<reason>"

    Examples:
      | T    | P    | W    | score | reason           |
      | 15   | 1    | 20   | 90    | OUTDOOR_MILD_DRY |
      | 25   | 1    | 20   | 90    | OUTDOOR_MILD_DRY |
      | 14.9 | 0    | 10   | 50    | OUTDOOR_OTHER    |
      | 25.1 | 0    | 10   | 50    | OUTDOOR_OTHER    |
      | 22   | 1.1  | 10   | 50    | OUTDOOR_OTHER    |
      | 22   | 0    | 20.1 | 50    | OUTDOOR_OTHER    |
      | 0    | 10   | 40   | 50    | OUTDOOR_OTHER    |
      | -0.1 | 0    | 10   | 10    | OUTDOOR_ADVERSE  |
      | 35   | 0    | 10   | 50    | OUTDOOR_OTHER    |
      | 35.1 | 0    | 10   | 10    | OUTDOOR_ADVERSE  |
      | 22   | 10.1 | 10   | 10    | OUTDOOR_ADVERSE  |
      | 22   | 0    | 40.1 | 10    | OUTDOOR_ADVERSE  |

  @indoor @boundaries
  Scenario Outline: Prefer indoor shelter independently of outdoor scores
    Given every forecast day has temperature <T> C, precipitation <P> mm, snowfall 0 cm and wind <W> km/h
    When I request rankings for the selected town
    Then every day gives "indoor-sightseeing" score <score> with reason "<reason>"

    Examples:
      | T    | P   | W    | score | reason           |
      | 0    | 5   | 30   | 60    | INDOOR_AVAILABLE |
      | 30   | 5   | 30   | 60    | INDOOR_AVAILABLE |
      | -0.1 | 0   | 10   | 85    | INDOOR_PREFERRED |
      | 30.1 | 0   | 10   | 85    | INDOOR_PREFERRED |
      | 22   | 5.1 | 10   | 85    | INDOOR_PREFERRED |
      | 22   | 0   | 30.1 | 85    | INDOOR_PREFERRED |

  @ties
  Scenario: Equal suitability has a deterministic activity order
    Given every forecast day has temperature 22 C, precipitation 0 mm, snowfall 0 cm and wind 41 km/h
    When I request rankings for the selected town
    Then the daily order is indoor sightseeing, skiing, surfing, outdoor sightseeing
    And the three outdoor activities each score 10

  @contrast
  Scenario: More rain changes the relative appeal of outdoor and indoor sightseeing
    Given only precipitation changes from 0 mm to 12 mm after the first mild day
    When I request rankings for the selected town
    Then the dry day scores outdoor sightseeing 90 and indoor sightseeing 60
    And each rainy day scores outdoor sightseeing 10 and indoor sightseeing 85

  @calendar @dst
  Scenario Outline: Use the location calendar rather than the UTC date or elapsed hours
    Given the fixed instant is viewed in "<timezone>"
    And the selected town has a complete mild forecast
    When I request rankings for the selected town
    Then the seven-day window runs from "<first>" through "<last>"

    Examples:
      | timezone         | first      | last       |
      | Europe/Warsaw    | 2026-10-24 | 2026-10-30 |
      | Pacific/Honolulu | 2026-10-23 | 2026-10-29 |
