@failures
Feature: Fail predictably when input or weather providers cannot be used

  @timeouts
  Scenario Outline: Map a provider deadline to a bounded public error
    Given the "<stage>" provider exceeds its deadline
    When I request the capability affected by "<stage>"
    Then the API returns a provider timeout within the response budget
    And failed discovery or resolution does not request a forecast

    Examples:
      | stage      |
      | discovery  |
      | resolution |
      | forecast   |

  @provider-errors
  Scenario Outline: Do not leak upstream failure diagnostics
    Given the "<stage>" provider returns an internal failure
    When I request the capability affected by "<stage>"
    Then the API returns 502 with code "PROVIDER_FAILURE"
    And failed discovery or resolution does not request a forecast

    Examples:
      | stage      |
      | discovery  |
      | resolution |
      | forecast   |

  @unknown-location
  Scenario: An unknown location ID cannot be ranked
    Given the location provider cannot resolve the selected ID
    When I request rankings for the selected town
    Then the API returns 404 with code "LOCATION_NOT_FOUND"
    And the forecast provider is not contacted

  @resolution-bad-request
  Scenario: A provider bad request does not mean the town is unknown
    Given location resolution rejects the provider request for a reason other than an unknown ID
    When I request rankings for the selected town
    Then the API returns 502 with code "PROVIDER_FAILURE"
    And the forecast provider is not contacted

  @invalid-forecast
  Scenario Outline: Reject invalid or incomplete forecast data instead of manufacturing scores
    Given the selected town has a forecast with "<defect>"
    When I request rankings for the selected town
    Then the API returns 502 with code "UPSTREAM_DATA_INVALID"

    Examples:
      | defect        |
      | null-value    |
      | missing-field |
      | missing-day   |
      | invalid-json  |
      | wrong-units   |
      | unaligned     |

  @invalid-discovery
  Scenario Outline: Malformed search data is not a no-results response
    Given discovery returns "<defect>" data
    When I search for "Gdan"
    Then the API returns 502 with code "UPSTREAM_DATA_INVALID"
    And the forecast provider is not contacted

    Examples:
      | defect           |
      | null-results     |
      | missing-timezone |

  @invalid-resolution
  Scenario: Invalid location resolution data stops the journey
    Given location resolution returns invalid JSON
    When I request rankings for the selected town
    Then the API returns 502 with code "UPSTREAM_DATA_INVALID"
    And the forecast provider is not contacted

  @validation
  Scenario Outline: Reject invalid location IDs before provider access
    Given I have an invalid "<kind>" location ID
    When I submit the invalid location ID
    Then the API returns 400 with code "INVALID_INPUT"
    And no provider is contacted

    Examples:
      | kind     |
      | missing  |
      | zero     |
      | negative |
      | letters  |
      | unsafe   |
