import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import SwaggerParser from '@apidevtools/swagger-parser';
import {
  assertError,
  searchResponse,
  rankingResponse,
  publicLocation,
} from '../src/contracts/validate';
import type { HttpResult } from '../src/api/client';
import {
  discoveryCandidates,
  forecast,
  localToday,
  location,
  WARSAW_DATES,
  HONOLULU_DATES,
  DAILY_FIELDS,
} from '../src/provider/fixtures';
import { variedWeek } from '../src/provider/examples';
import {
  config,
  FIXED_NOW,
  PROVIDER_DEADLINE_MS,
  STUB_DELAY_MS,
} from '../src/config';

function example(name: string, status: number): HttpResult {
  const rawBody = readFileSync(`contracts/examples/${name}.json`, 'utf8');
  const body: unknown = JSON.parse(rawBody);
  return {
    status,
    headers: { 'content-type': 'application/json' },
    rawBody,
    body,
  };
}

async function main(): Promise<void> {
  await SwaggerParser.validate('contracts/openapi.json');
  const search = example('locations', 200);
  searchResponse(search);
  const sample = example('rankings', 200);
  const ranking = rankingResponse(sample);
  const firstDay = ranking.days[0];
  assert.ok(firstDay, 'Static example needs a day');
  const firstActivity = firstDay.activities[0];
  assert.ok(firstActivity, 'Static example needs an activity');
  assert.throws(
    () =>
      rankingResponse({
        ...sample,
        body: {
          ...ranking,
          days: [
            {
              ...firstDay,
              activities: [
                { ...firstActivity, score: 101 },
                ...firstDay.activities.slice(1),
              ],
            },
            ...ranking.days.slice(1),
          ],
        },
      }),
    /Ranking schema/,
  );
  searchResponse({
    ...search,
    body: { locations: discoveryCandidates('minimal').map(publicLocation) },
  });
  assertError(example('error', 502), 502, 'UPSTREAM_DATA_INVALID');
  assert.throws(
    () =>
      searchResponse({
        ...search,
        body: { locations: [{ id: 'wrong-type' }] },
      }),
    /Search schema/,
  );
  const invalidDayCount = example('rankings', 200);
  assert.throws(
    () => rankingResponse({ ...invalidDayCount, body: { days: [] } }),
    /Ranking schema/,
  );

  assert.equal(localToday('Europe/Warsaw'), WARSAW_DATES[0]);
  assert.equal(localToday('Pacific/Honolulu'), HONOLULU_DATES[0]);
  assert.notEqual(localToday('Europe/Warsaw'), FIXED_NOW.slice(0, 10));
  for (const dates of [WARSAW_DATES, HONOLULU_DATES]) {
    assert.equal(new Set(dates).size, 7);
    dates.forEach((date, index) => {
      if (index === 0) return;
      const previous = dates[index - 1];
      assert.ok(previous);
      // A UTC calendar carrier is only for date arithmetic, never local elapsed-time arithmetic.
      const calendar = new Date(`${previous}T00:00:00Z`);
      calendar.setUTCDate(calendar.getUTCDate() + 1);
      assert.equal(date, calendar.toISOString().slice(0, 10));
    });
  }
  for (const candidate of [location(), ...discoveryCandidates('ambiguous')]) {
    const dates =
      candidate.timezone === 'Europe/Warsaw' ? WARSAW_DATES : HONOLULU_DATES;
    const fixture = forecast(
      candidate,
      dates,
      variedWeek.map((entry) => entry.weather),
    );
    assert.equal(fixture.timezone, candidate.timezone);
    assert.deepEqual(fixture.daily.time, dates);
    assert.deepEqual(
      Object.keys(fixture.daily)
        .filter((key) => key !== 'time')
        .sort(),
      [...DAILY_FIELDS].sort(),
    );
    for (const [field, values] of Object.entries(fixture.daily)) {
      assert.equal(values.length, 7, `${field} array alignment`);
      if (field !== 'time')
        assert.ok(
          values.every(
            (value) => typeof value === 'number' && Number.isFinite(value),
          ),
        );
    }
    assert.deepEqual(fixture.daily_units, {
      time: 'iso8601',
      temperature_2m_max: '°C',
      precipitation_sum: 'mm',
      snowfall_sum: 'cm',
      wind_speed_10m_max: 'km/h',
    });
  }
  assert.ok(
    PROVIDER_DEADLINE_MS < STUB_DELAY_MS &&
      STUB_DELAY_MS < config().requestTimeoutMs,
  );
  console.log(
    'OpenAPI, referenced response schemas, static examples, aligned provider fixtures and clock windows validated. No SUT behaviour was executed.',
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
