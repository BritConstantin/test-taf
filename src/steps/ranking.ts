import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { AcceptanceWorld } from '../support/world';
import {
  activityOrder,
  assertActivity,
  assertWeek,
  searchResponse,
} from '../contracts/validate';
import {
  HONOLULU_DATES,
  WARSAW_DATES,
  localToday,
  mild,
  weatherWeek,
} from '../provider/fixtures';
import { variedWeek } from '../provider/examples';

Given(
  'the second matching town has a complete mild forecast',
  function (this: AcceptanceWorld) {
    const second = this.candidates[1];
    assert.ok(second, 'Need at least two discovery candidates');
    this.selected = second;
    // The same fixed instant is already October 23 in both US candidate zones.
    this.dates = HONOLULU_DATES;
    this.resolution();
    this.forecast();
  },
);

When(
  'I select the second returned match and request its rankings',
  async function (this: AcceptanceWorld) {
    const matches = searchResponse(this.result()).locations;
    assert.deepEqual(
      matches.map((match) => match.id),
      this.candidates.map((candidate) => candidate.id),
    );
    const second = matches[1];
    assert.ok(second, 'Search must return the second candidate');
    assert.equal(second.id, this.selected.id);
    this.response = await this.client.get('/v1/activity-rankings', {
      locationId: String(second.id),
    });
  },
);

Given(
  'the selected town has the documented varied weather week',
  function (this: AcceptanceWorld) {
    this.weather = variedWeek.map((example) => ({ ...example.weather }));
    this.resolution();
    this.forecast();
  },
);

Given(
  'every forecast day has temperature {float} C, precipitation {float} mm, snowfall {float} cm and wind {float} km\\/h',
  function (
    this: AcceptanceWorld,
    temperatureMaxC: number,
    precipitationMm: number,
    snowfallCm: number,
    windMaxKmh: number,
  ) {
    this.weather = weatherWeek({
      temperatureMaxC,
      precipitationMm,
      snowfallCm,
      windMaxKmh,
    });
    this.resolution();
    this.forecast();
  },
);

Given(
  'the selected town has a complete mild forecast',
  function (this: AcceptanceWorld) {
    this.weather = weatherWeek(mild);
    this.resolution();
    this.forecast();
  },
);

When(
  'I request rankings for the selected town',
  async function (this: AcceptanceWorld) {
    this.response = await this.client.get('/v1/activity-rankings', {
      locationId: String(this.selected.id),
    });
  },
);

Then(
  'all seven local days contain four correctly ordered activities and weather facts',
  function (this: AcceptanceWorld) {
    assertWeek(this.result(), this.selected, this.dates, this.weather);
  },
);

Then(
  'every day gives {string} score {int} with reason {string}',
  function (this: AcceptanceWorld, id: string, score: number, code: string) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    assertActivity(week, id, score, code);
  },
);

Then(
  'the representative explanations describe the controlled weather and activity limitations',
  function (this: AcceptanceWorld) {
    // assertWeek checks each day's text when its weather matches a documented prose example.
    assertWeek(this.result(), this.selected, this.dates, this.weather);
  },
);

Then(
  'every activity matches the manually specified seven-day examples',
  function (this: AcceptanceWorld) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    week.days.forEach((day, dayIndex) => {
      const example = variedWeek[dayIndex];
      assert.ok(example, `Missing oracle for day ${dayIndex}`);
      activityOrder.forEach((id, activityIndex) => {
        const activity = day.activities.find((entry) => entry.id === id);
        assert.ok(activity, `Missing ${id} on ${day.date}`);
        assert.equal(
          activity.score,
          example.scores[activityIndex],
          `${day.date} ${id} score`,
        );
        assert.equal(
          activity.reason.code,
          example.reasons[activityIndex],
          `${day.date} ${id} meaning`,
        );
      });
    });
  },
);

Then(
  'the daily order is indoor sightseeing, skiing, surfing, outdoor sightseeing',
  function (this: AcceptanceWorld) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    for (const day of week.days)
      assert.deepEqual(
        day.activities.map((activity) => activity.id),
        ['indoor-sightseeing', 'skiing', 'surfing', 'outdoor-sightseeing'],
      );
  },
);

Then(
  'the three outdoor activities each score {int}',
  function (this: AcceptanceWorld, score: number) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    for (const id of ['skiing', 'surfing', 'outdoor-sightseeing']) {
      for (const day of week.days)
        assert.equal(
          day.activities.find((activity) => activity.id === id)?.score,
          score,
          `${day.date} ${id}`,
        );
    }
  },
);

Given(
  'only precipitation changes from 0 mm to 12 mm after the first mild day',
  function (this: AcceptanceWorld) {
    this.weather = [
      mild,
      ...Array.from({ length: 6 }, () => ({ ...mild, precipitationMm: 12 })),
    ];
    this.resolution();
    this.forecast();
  },
);

Then(
  'the dry day scores outdoor sightseeing 90 and indoor sightseeing 60',
  function (this: AcceptanceWorld) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    const first = week.days[0];
    assert.ok(first, 'Missing dry first day');
    assertActivity(
      { ...week, days: [first] },
      'outdoor-sightseeing',
      90,
      'OUTDOOR_MILD_DRY',
    );
    assertActivity(
      { ...week, days: [first] },
      'indoor-sightseeing',
      60,
      'INDOOR_AVAILABLE',
    );
  },
);

Then(
  'each rainy day scores outdoor sightseeing 10 and indoor sightseeing 85',
  function (this: AcceptanceWorld) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    const rainy = { ...week, days: week.days.slice(1) };
    assert.equal(rainy.days.length, 6);
    assertActivity(rainy, 'outdoor-sightseeing', 10, 'OUTDOOR_ADVERSE');
    assertActivity(rainy, 'indoor-sightseeing', 85, 'INDOOR_PREFERRED');
  },
);

Given(
  'the fixed instant is viewed in {string}',
  function (this: AcceptanceWorld, timezone: string) {
    assert.ok(['Europe/Warsaw', 'Pacific/Honolulu'].includes(timezone));
    if (timezone === 'Pacific/Honolulu') {
      this.selected = {
        id: 5856195,
        name: 'Honolulu',
        country: 'United States',
        country_code: 'US',
        admin1: 'Hawaii',
        latitude: 21.30694,
        longitude: -157.85833,
        timezone,
      };
      this.dates = HONOLULU_DATES;
    } else this.dates = WARSAW_DATES;
    assert.equal(
      this.dates[0],
      localToday(timezone),
      'Fixture must start on local today at the external SUT fixed instant',
    );
  },
);

Then(
  'the seven-day window runs from {string} through {string}',
  function (this: AcceptanceWorld, first: string, last: string) {
    const week = assertWeek(
      this.result(),
      this.selected,
      this.dates,
      this.weather,
    );
    assert.equal(week.days[0]?.date, first);
    assert.equal(week.days.at(-1)?.date, last);
  },
);
