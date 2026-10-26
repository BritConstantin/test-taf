import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { AcceptanceWorld } from '../support/world';
import { STUB_DELAY_MS } from '../config';
import { forecast, forecastQuery } from '../provider/fixtures';
import { assertError } from '../contracts/validate';

function installFailure(
  world: AcceptanceWorld,
  stage: string,
  timeout: boolean,
): void {
  assert.ok(['discovery', 'resolution', 'forecast'].includes(stage));
  world.failedStage = stage;
  if (stage === 'forecast') world.resolution();
  const path =
    stage === 'discovery'
      ? '/v1/search'
      : stage === 'resolution'
        ? '/v1/get'
        : '/v1/forecast';
  const query =
    stage === 'discovery'
      ? { name: 'Gdan', count: '10', language: 'en', format: 'json' }
      : stage === 'resolution'
        ? { id: String(world.selected.id), language: 'en', format: 'json' }
        : forecastQuery(world.selected, world.dates);
  world.stub.install({
    path,
    query,
    status: timeout ? 200 : 503,
    delayMs: timeout ? STUB_DELAY_MS : 0,
    body: timeout
      ? {}
      : {
          error: true,
          reason: 'UPSTREAM_INTERNAL_MARKER secret-token stack trace',
        },
  });
}

Given(
  'the {string} provider exceeds its deadline',
  function (this: AcceptanceWorld, stage: string) {
    installFailure(this, stage, true);
  },
);
Given(
  'the {string} provider returns an internal failure',
  function (this: AcceptanceWorld, stage: string) {
    installFailure(this, stage, false);
  },
);

When(
  'I request the capability affected by {string}',
  async function (this: AcceptanceWorld, stage: string) {
    assert.equal(stage, this.failedStage);
    this.response =
      stage === 'discovery'
        ? await this.client.get('/v1/locations', { query: 'Gdan' })
        : await this.client.get('/v1/activity-rankings', {
            locationId: String(this.selected.id),
          });
  },
);

Then(
  'the API returns {int} with code {string}',
  function (this: AcceptanceWorld, status: number, code: string) {
    assertError(this.result(), status, code);
  },
);
Then('no provider is contacted', function (this: AcceptanceWorld) {
  this.stub.assertNoCalls();
});
Then(
  'the forecast provider is not contacted',
  function (this: AcceptanceWorld) {
    this.stub.assertNoCalls('/v1/forecast');
  },
);
Then(
  'failed discovery or resolution does not request a forecast',
  function (this: AcceptanceWorld) {
    assert.ok(this.failedStage, 'Missing provider-failure setup');
    if (this.failedStage !== 'forecast')
      this.stub.assertNoCalls('/v1/forecast');
  },
);

Given(
  'the location provider cannot resolve the selected ID',
  function (this: AcceptanceWorld) {
    this.selected = { ...this.selected, id: 999999999 };
    this.stub.install({
      path: '/v1/get',
      query: { id: String(this.selected.id), language: 'en', format: 'json' },
      status: 400,
      body: { error: true, reason: 'Location ID not found.' },
    });
  },
);

Given(
  'the selected town has a forecast with {string}',
  function (this: AcceptanceWorld, defect: string) {
    this.resolution();
    const valid = forecast(this.selected, this.dates, this.weather);
    let body: unknown;
    switch (defect) {
      case 'null-value':
        body = {
          ...valid,
          daily: {
            ...valid.daily,
            temperature_2m_max: [22, 22, 22, null, 22, 22, 22],
          },
        };
        break;
      case 'missing-field': {
        const { snowfall_sum: omitted, ...remaining } = valid.daily;
        void omitted;
        body = { ...valid, daily: remaining };
        break;
      }
      case 'missing-day':
        body = forecast(
          this.selected,
          this.dates.slice(0, 6),
          this.weather.slice(0, 6),
        );
        break;
      case 'invalid-json':
        body = '{"daily":';
        break;
      case 'wrong-units':
        body = {
          ...valid,
          daily_units: { ...valid.daily_units, snowfall_sum: 'mm' },
        };
        break;
      case 'unaligned':
        body = {
          ...valid,
          daily: { ...valid.daily, precipitation_sum: [0, 0] },
        };
        break;
      default:
        throw new Error(`Unknown forecast defect: ${defect}`);
    }
    this.stub.install({
      path: '/v1/forecast',
      query: forecastQuery(this.selected, this.dates),
      body,
      raw: defect === 'invalid-json',
    });
  },
);

Given(
  'discovery returns {string} data',
  function (this: AcceptanceWorld, defect: string) {
    assert.ok(['null-results', 'missing-timezone'].includes(defect));
    this.stub.install({
      path: '/v1/search',
      query: { name: 'Gdan', count: '10', language: 'en', format: 'json' },
      body:
        defect === 'null-results'
          ? { results: null }
          : {
              results: [
                { id: 3099434, name: 'Gdańsk', latitude: 54, longitude: 18 },
              ],
            },
    });
  },
);

Given(
  'location resolution returns invalid JSON',
  function (this: AcceptanceWorld) {
    this.stub.install({
      path: '/v1/get',
      query: { id: String(this.selected.id), language: 'en', format: 'json' },
      raw: true,
      body: '{"id":',
    });
  },
);

Given(
  'I have an invalid {string} location ID',
  function (this: AcceptanceWorld, kind: string) {
    const values = new Map<string, Record<string, string>>([
      ['missing', {}],
      ['zero', { locationId: '0' }],
      ['negative', { locationId: '-1' }],
      ['letters', { locationId: 'Gdan' }],
      ['unsafe', { locationId: '9007199254740992' }],
    ]);
    this.invalidParameters = values.get(kind);
    assert.ok(this.invalidParameters, `Unknown invalid-ID case: ${kind}`);
  },
);

When(
  'I submit the invalid location ID',
  async function (this: AcceptanceWorld) {
    assert.ok(this.invalidParameters, 'Missing invalid-ID setup');
    this.response = await this.client.get(
      '/v1/activity-rankings',
      this.invalidParameters,
    );
  },
);
