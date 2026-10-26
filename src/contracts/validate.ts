import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { HttpResult } from '../api/client';
import type { Weather, ProviderLocation } from '../provider/fixtures';

export interface Location {
  id: number;
  name: string;
  country: string | null;
  countryCode: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
}
export interface SearchResponse {
  locations: Location[];
}
export interface Activity {
  id: string;
  name: string;
  score: number;
  reason: { code: string; text: string; facts: Weather };
}
export interface RankingResponse {
  location: Location;
  model: string;
  limitations: string[];
  days: { date: string; activities: Activity[] }[];
}
export interface ErrorResponse {
  error: { code: string; message: string };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const document: unknown = JSON.parse(
  readFileSync('contracts/openapi.json', 'utf8'),
);
assert.ok(
  isRecord(document) && isRecord(document.components),
  'Invalid OpenAPI components',
);
// A root containing the original components preserves local $ref resolution.
// nullable is supported by Ajv for OpenAPI 3.0 schemas; only the container keyword is ignored.
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addKeyword({ keyword: 'components', valid: true });
ajv.addSchema({
  $id: 'urn:activity:contract',
  components: document.components,
});
const searchValidator = ajv.compile<SearchResponse>({
  $ref: 'urn:activity:contract#/components/schemas/SearchResponse',
});
const rankingValidator = ajv.compile<RankingResponse>({
  $ref: 'urn:activity:contract#/components/schemas/RankingResponse',
});
const errorValidator = ajv.compile<ErrorResponse>({
  $ref: 'urn:activity:contract#/components/schemas/Error',
});

function assertHttp(result: HttpResult, status: number): void {
  assert.equal(
    result.status,
    status,
    `HTTP status; body=${result.rawBody.slice(0, 1500)}`,
  );
  assert.match(
    result.headers['content-type'] ?? '',
    /^application\/json(?:\s*;|$)/i,
    'JSON Content-Type required',
  );
}

export function searchResponse(result: HttpResult): SearchResponse {
  assertHttp(result, 200);
  assert.ok(
    searchValidator(result.body),
    `Search schema: ${ajv.errorsText(searchValidator.errors)}; body=${result.rawBody.slice(0, 1500)}`,
  );
  return result.body;
}

export function rankingResponse(result: HttpResult): RankingResponse {
  assertHttp(result, 200);
  assert.ok(
    rankingValidator(result.body),
    `Ranking schema: ${ajv.errorsText(rankingValidator.errors)}; body=${result.rawBody.slice(0, 1500)}`,
  );
  return result.body;
}

export function assertError(
  result: HttpResult,
  status: number,
  code: string,
): void {
  assertHttp(result, status);
  assert.ok(
    errorValidator(result.body),
    `Error schema: ${ajv.errorsText(errorValidator.errors)}`,
  );
  assert.equal(result.body.error.code, code);
  assert.doesNotMatch(
    result.body.error.message,
    /UPSTREAM_INTERNAL_MARKER|secret-token|stack trace|\bat\s+\S+\s*\([^)]*:\d+:\d+\)/i,
    'Error must not leak provider diagnostics',
  );
}

export function publicLocation(value: ProviderLocation): Location {
  return {
    id: value.id,
    name: value.name,
    country: value.country ?? null,
    countryCode: value.country_code ?? null,
    admin1: value.admin1 ?? null,
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: value.timezone,
  };
}

export const activityOrder = [
  'skiing',
  'surfing',
  'outdoor-sightseeing',
  'indoor-sightseeing',
];
const names = new Map([
  ['skiing', 'Skiing'],
  ['surfing', 'Surfing'],
  ['outdoor-sightseeing', 'Outdoor Sightseeing'],
  ['indoor-sightseeing', 'Indoor Sightseeing'],
]);

export function assertWeek(
  result: HttpResult,
  selected: ProviderLocation,
  dates: readonly string[],
  weather: readonly Weather[],
): RankingResponse {
  const ranking = rankingResponse(result);
  assert.deepEqual(
    ranking.location,
    publicLocation(selected),
    'Selected location and timezone',
  );
  assert.equal(ranking.model, 'weather-only-v1');
  assert.deepEqual([...ranking.limitations].sort(), [
    'SKI_WEATHER_ONLY',
    'SURF_WEATHER_PROXY_ONLY',
  ]);
  assert.deepEqual(
    ranking.days.map((day) => day.date),
    dates,
    'All seven unique consecutive local dates, including today',
  );
  ranking.days.forEach((day, index) => {
    assert.deepEqual(
      day.activities.map((activity) => activity.id).sort(),
      [...activityOrder].sort(),
      `${day.date}: exactly four distinct activities`,
    );
    const sorted = [...day.activities].sort(
      (left, right) =>
        right.score - left.score ||
        activityOrder.indexOf(left.id) - activityOrder.indexOf(right.id),
    );
    assert.deepEqual(
      day.activities,
      sorted,
      `${day.date}: descending scores and stable ties`,
    );
    day.activities.forEach((activity) => {
      assert.equal(
        activity.name,
        names.get(activity.id),
        `${day.date}: stable ID/display name pairing`,
      );
      assert.deepEqual(
        activity.reason.facts,
        weather[index],
        `${day.date} ${activity.id}: numeric facts with documented units`,
      );
    });
  });
  return ranking;
}

export function assertActivity(
  ranking: RankingResponse,
  id: string,
  score: number,
  code: string,
): void {
  for (const day of ranking.days) {
    const activity = day.activities.find((entry) => entry.id === id);
    assert.ok(activity, `${day.date}: missing ${id}`);
    assert.equal(activity.score, score, `${day.date}: ${id} suitability`);
    assert.equal(
      activity.reason.code,
      code,
      `${day.date}: ${id} explanatory meaning`,
    );
  }
}
