@discovery
Feature: Discover cities and towns by name
  Candidates let a user choose a place without silently resolving ambiguity.

  @names
  Scenario Outline: Find a city or town using a supported name form
    Given location discovery has "<candidates>" matches for "<query>"
    When I search for "<query>"
    Then I receive the matching location candidates in provider order

    Examples:
      | query  | candidates |
      | Gdańsk | city       |
      | Gdan   | city       |
      | gdańsk | city       |
      | GDANSK | city       |
      | Sopot  | town       |
      | Bø     | short-town |

  @ambiguity
  Scenario: A full name can identify more than one town
    Given location discovery has "ambiguous" matches for "Springfield"
    When I search for "Springfield"
    Then I receive the matching location candidates in provider order
    And the candidates identify different administrative regions and coordinates

  @optional-metadata
  Scenario: Missing optional provider metadata remains explicit
    Given location discovery has "minimal" matches for "Sample"
    When I search for "Sample"
    Then I receive the matching location candidates in provider order
    And unavailable country and administrative metadata are null

  @no-results
  Scenario Outline: An unsuccessful name search is an empty successful result
    Given location discovery has no matches represented by "<representation>"
    When I search for "Qzxqzx"
    Then I receive an empty candidate list

    Examples:
      | representation |
      | missing        |
      | empty          |

  @trimming
  Scenario: Ignore surrounding search whitespace
    Given location discovery has "city" matches for "Gdan"
    When I search for "  Gdan  "
    Then I receive the matching location candidates in provider order

  @validation
  Scenario Outline: Reject invalid names before contacting a provider
    Given I have an invalid "<kind>" location query
    When I submit the invalid location query
    Then the API returns 400 with code "INVALID_INPUT"
    And no provider is contacted

    Examples:
      | kind      |
      | missing   |
      | blank     |
      | one-point |
      | too-long  |

  @limit
  Scenario: Bound the candidate list without inventing global ordering
    Given location discovery has "ten" matches for "Sample"
    When I search for "Sample"
    Then I receive the matching location candidates in provider order
    And there are exactly 10 candidates
