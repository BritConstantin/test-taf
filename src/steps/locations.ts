import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { AcceptanceWorld } from '../support/world';
import { discoveryCandidates } from '../provider/fixtures';
import { publicLocation, searchResponse } from '../contracts/validate';

Given(
  'location discovery has {string} matches for {string}',
  function (this: AcceptanceWorld, kind: string, query: string) {
    this.candidates = discoveryCandidates(kind);
    this.stub.install({
      path: '/v1/search',
      query: { name: query, count: '10', language: 'en', format: 'json' },
      body: { results: this.candidates, generationtime_ms: 0.1 },
    });
  },
);

Given(
  'location discovery has no matches represented by {string}',
  function (this: AcceptanceWorld, representation: string) {
    assert.ok(['missing', 'empty'].includes(representation));
    this.stub.install({
      path: '/v1/search',
      query: { name: 'Qzxqzx', count: '10', language: 'en', format: 'json' },
      body:
        representation === 'missing'
          ? { generationtime_ms: 0.1 }
          : { results: [], generationtime_ms: 0.1 },
    });
  },
);

When(
  'I search for {string}',
  async function (this: AcceptanceWorld, query: string) {
    this.response = await this.client.get('/v1/locations', { query });
  },
);

Then(
  'I receive the matching location candidates in provider order',
  function (this: AcceptanceWorld) {
    assert.deepEqual(
      searchResponse(this.result()).locations,
      this.candidates.map(publicLocation),
    );
  },
);

Then(
  'the candidates identify different administrative regions and coordinates',
  function (this: AcceptanceWorld) {
    const candidates = searchResponse(this.result()).locations;
    assert.equal(candidates.length, 2);
    assert.equal(new Set(candidates.map((candidate) => candidate.id)).size, 2);
    assert.equal(
      new Set(candidates.map((candidate) => candidate.admin1)).size,
      2,
    );
    assert.equal(
      new Set(
        candidates.map(
          (candidate) => `${candidate.latitude},${candidate.longitude}`,
        ),
      ).size,
      2,
    );
  },
);

Then(
  'unavailable country and administrative metadata are null',
  function (this: AcceptanceWorld) {
    const first = searchResponse(this.result()).locations[0];
    assert.ok(first, 'Expected minimal candidate');
    assert.deepEqual(
      [first.country, first.countryCode, first.admin1],
      [null, null, null],
    );
  },
);

Then('I receive an empty candidate list', function (this: AcceptanceWorld) {
  assert.deepEqual(searchResponse(this.result()).locations, []);
});

Then(
  'there are exactly {int} candidates',
  function (this: AcceptanceWorld, count: number) {
    assert.equal(searchResponse(this.result()).locations.length, count);
  },
);

Given(
  'I have an invalid {string} location query',
  function (this: AcceptanceWorld, kind: string) {
    const values = new Map<string, Record<string, string>>([
      ['missing', {}],
      ['blank', { query: ' \t ' }],
      ['one-point', { query: 'Ł' }],
      ['too-long', { query: 'Ł'.repeat(81) }],
    ]);
    this.invalidParameters = values.get(kind);
    assert.ok(this.invalidParameters, `Unknown invalid-query case: ${kind}`);
  },
);

When(
  'I submit the invalid location query',
  async function (this: AcceptanceWorld) {
    assert.ok(this.invalidParameters, 'Missing invalid query setup');
    this.response = await this.client.get(
      '/v1/locations',
      this.invalidParameters,
    );
  },
);
