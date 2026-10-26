import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { ApiClient, TransportError } from '../src/api/client';
import type { HttpResult } from '../src/api/client';
import { ProviderStub } from '../src/provider/stub';
import {
  assertProviderTimeout,
  assertWeek,
  rankingResponse,
} from '../src/contracts/validate';
import {
  assertExplanation,
  explanationExamples,
} from '../src/contracts/explanations';
import {
  location,
  mild,
  WARSAW_DATES,
  weatherWeek,
} from '../src/provider/fixtures';
import {
  PROVIDER_TIMEOUT_RESPONSE_BUDGET_MS,
  STUB_DELAY_MS,
} from '../src/config';

// Harness and assertion probes only: no server here implements product API endpoints.
void test('stub matches HTTP semantics independently of parameter/field order and journals mismatches', async (context) => {
  const stub = new ProviderStub();
  const origin = await stub.start();
  context.after(() => stub.close());
  stub.install({
    path: '/provider-probe',
    query: { name: 'Łódź', daily: 'a,b' },
    body: { ok: true },
  });
  const client = new ApiClient(origin, 500);
  assert.equal(
    (await client.get('/provider-probe', { daily: 'b,a', name: 'Łódź' }))
      .status,
    200,
  );
  stub.verify();
  const wrongQuery = await client.get('/provider-probe', {
    name: 'Lodz',
    daily: 'a,b',
  });
  assert.equal(wrongQuery.status, 501);
  const wrongMethod = await fetch(
    new URL('/provider-probe?name=Łódź&daily=a,b', origin),
    { method: 'POST', signal: AbortSignal.timeout(500) },
  );
  assert.equal(wrongMethod.status, 501);
  await wrongMethod.text();
  assert.throws(() => stub.verify(), /Unmatched provider/);
  assert.match(stub.diagnostics(), /POST/);
});

void test('unconsumed fixtures fail, while reset removes scenario data', async (context) => {
  const stub = new ProviderStub();
  await stub.start();
  context.after(() => stub.close());
  stub.install({ path: '/unused-provider', query: {}, body: {} });
  assert.throws(() => stub.verify(), /Unconsumed provider fixture/);
  stub.reset();
  stub.verify();
  assert.equal(stub.diagnostics(), '[]');
});

void test('a request deadline is a transport error and delayed sockets/timers close cleanly', async () => {
  const stub = new ProviderStub();
  const origin = await stub.start();
  try {
    stub.install({
      path: '/slow-provider',
      query: {},
      body: {},
      delayMs: 10000,
    });
    await assert.rejects(
      new ApiClient(origin, 40).get('/slow-provider'),
      (error: unknown) => {
        assert.ok(error instanceof TransportError);
        assert.equal(error.timedOut, true);
        assert.equal(error.method, 'GET');
        assert.equal(error.url, `${origin}/slow-provider`);
        assert.ok(error.cause);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
  // Binding the same port proves shutdown released the listener even with a delayed request.
  const replacement = new ProviderStub();
  try {
    await replacement.start(Number(new URL(origin).port));
  } finally {
    await replacement.close();
  }
});

void test('an HTTP error and invalid JSON remain observable responses', async (context) => {
  const stub = new ProviderStub();
  const origin = await stub.start();
  context.after(() => stub.close());
  stub.install({
    path: '/broken-provider',
    query: {},
    body: '{bad-json',
    raw: true,
    status: 503,
  });
  const result = await new ApiClient(origin, 500).get('/broken-provider');
  assert.equal(result.status, 503);
  assert.match(result.headers['content-type'] ?? '', /application\/json/);
  assert.equal(result.rawBody, '{bad-json');
  assert.equal(result.body, undefined);
  assert.ok(
    Number.isFinite(result.elapsedMs) && result.elapsedMs >= 0,
    'HTTP responses retain monotonic elapsed time',
  );
  stub.verify();
});

void test('timeout assertion accepts a prompt HTTP 504 but rejects a late 504 or a different error', () => {
  // Direct assertion inputs, not a fake SUT. Synthetic elapsed values avoid scheduler-dependent waits.
  const body = {
    error: {
      code: 'PROVIDER_TIMEOUT',
      message: 'Weather service timed out. Please try again.',
    },
  };
  const response: HttpResult = {
    status: 504,
    headers: { 'content-type': 'application/json' },
    body,
    rawBody: JSON.stringify(body),
    elapsedMs: PROVIDER_TIMEOUT_RESPONSE_BUDGET_MS - 50,
  };
  assertProviderTimeout(response);
  for (const elapsedMs of [
    PROVIDER_TIMEOUT_RESPONSE_BUDGET_MS + 50,
    STUB_DELAY_MS,
    2000,
    Number.NaN,
    -1,
  ]) {
    assert.throws(
      () => assertProviderTimeout({ ...response, elapsedMs }),
      /Provider timeout response took/,
    );
  }
  assert.throws(
    () => assertProviderTimeout({ ...response, status: 503 }),
    /HTTP status/,
  );
  const differentError = {
    error: { code: 'PROVIDER_FAILURE', message: 'Provider failed.' },
  };
  assert.throws(
    () =>
      assertProviderTimeout({
        ...response,
        body: differentError,
        rawBody: JSON.stringify(differentError),
      }),
    /PROVIDER_TIMEOUT/,
  );
});

void test('representative explanation templates accept correct facts and legitimate limitation statements', () => {
  for (const example of explanationExamples) {
    for (const [id, text] of Object.entries(example.texts)) {
      assertExplanation(id, text, example.weather, 'documented example');
      assertExplanation(
        id,
        `  ${text.replaceAll(' ', '\n')}  `,
        example.weather,
        'whitespace only',
      );
    }
  }
});

void test('week assertions reject contradictory explanation mutations, including on the seventh day', () => {
  const rawBody = readFileSync('contracts/examples/rankings.json', 'utf8');
  const body: unknown = JSON.parse(rawBody);
  const sample: HttpResult = {
    status: 200,
    headers: { 'content-type': 'application/json' },
    rawBody,
    body,
    elapsedMs: 50,
  };
  assertWeek(sample, location(), WARSAW_DATES, weatherWeek(mild));
  const valid = rankingResponse(sample);
  const allContradictory = structuredClone(valid);
  for (const day of allContradictory.days)
    for (const activity of day.activities) {
      activity.reason.text =
        'Clear skies and 45°C; excellent surfing waves at the ski resort.';
    }
  assert.throws(
    () =>
      assertWeek(
        {
          ...sample,
          body: allContradictory,
          rawBody: JSON.stringify(allContradictory),
        },
        location(),
        WARSAW_DATES,
        weatherWeek(mild),
      ),
    /explanation must match/,
  );

  const lastDay = valid.days.at(-1);
  assert.ok(lastDay, 'Static example needs its seventh day');
  const outdoor = lastDay.activities.find(
    (activity) => activity.id === 'outdoor-sightseeing',
  );
  assert.ok(outdoor, 'Static example needs outdoor sightseeing');
  for (const text of [
    outdoor.reason.text.replace('22°C', '45°C'),
    outdoor.reason.text.replace('0 mm', '12 mm'),
    `${outdoor.reason.text} Excellent surfing waves at the ski resort.`,
  ]) {
    const mutated = structuredClone(valid);
    const finalActivity = mutated.days
      .at(-1)
      ?.activities.find((activity) => activity.id === outdoor.id);
    assert.ok(finalActivity);
    finalActivity.reason.text = text;
    assert.throws(
      () =>
        assertWeek(
          { ...sample, body: mutated, rawBody: JSON.stringify(mutated) },
          location(),
          WARSAW_DATES,
          weatherWeek(mild),
        ),
      /2026-10-30 outdoor-sightseeing: explanation must match/,
    );
  }
});

void test('connection refused retains its cause and differs from an HTTP error/deadline', async () => {
  const stub = new ProviderStub();
  const origin = await stub.start();
  await stub.close();
  await assert.rejects(
    new ApiClient(origin, 500).get('/absent-probe'),
    (error: unknown) => {
      assert.ok(error instanceof TransportError);
      assert.equal(error.timedOut, false);
      assert.ok(error.cause);
      assert.match(error.message, /external SUT may be absent/);
      return true;
    },
  );
});
