import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import type { Weather } from '../provider/fixtures';

// Hand-written prose oracles for representative inputs, not a ranking algorithm or product code.
export const explanationExamples: readonly {
  weather: Weather;
  texts: Readonly<Record<string, string>>;
}[] = [
  {
    weather: {
      temperatureMaxC: 22,
      precipitationMm: 0,
      snowfallCm: 0,
      windMaxKmh: 10,
    },
    texts: {
      skiing:
        'Maximum temperature 22°C is above the skiing weather band. Resort availability and snowpack are not assessed.',
      surfing:
        'Weather proxy only: maximum temperature 22°C, precipitation 0 mm, maximum wind 10 km/h. Surfable waves and coastal access are not assessed.',
      'outdoor-sightseeing':
        'Mild, dry weather: maximum temperature 22°C, precipitation 0 mm, maximum wind 10 km/h.',
      'indoor-sightseeing':
        'Indoor sightseeing remains an option: maximum temperature 22°C and precipitation 0 mm.',
    },
  },
  {
    weather: {
      temperatureMaxC: -5,
      precipitationMm: 5,
      snowfallCm: 5,
      windMaxKmh: 10,
    },
    texts: {
      skiing:
        'Favourable skiing weather: maximum temperature -5°C, snowfall 5 cm, maximum wind 10 km/h. Resort availability and snowpack are not assessed.',
      surfing:
        'Cold weather proxy: maximum temperature -5°C. Surfable waves and coastal access are not assessed.',
      'outdoor-sightseeing': 'Cold outdoor weather: maximum temperature -5°C.',
      'indoor-sightseeing':
        'Indoor shelter is preferred: maximum temperature -5°C.',
    },
  },
  {
    weather: {
      temperatureMaxC: 22,
      precipitationMm: 12,
      snowfallCm: 0,
      windMaxKmh: 10,
    },
    texts: {
      skiing:
        'Maximum temperature 22°C is above the skiing weather band. Resort availability and snowpack are not assessed.',
      surfing:
        'Weather proxy only: precipitation 12 mm exceeds the mild-weather band. Surfable waves and coastal access are not assessed.',
      'outdoor-sightseeing':
        'Wet outdoor weather: precipitation 12 mm exceeds 10 mm.',
      'indoor-sightseeing':
        'Indoor shelter is preferred: precipitation 12 mm exceeds 5 mm.',
    },
  },
];

export function assertExplanation(
  id: string,
  text: string,
  weather: Weather,
  context: string,
): void {
  const example = explanationExamples.find((entry) =>
    isDeepStrictEqual(entry.weather, weather),
  );
  // Other inputs retain code/facts/nonblank validation; arbitrary prose is not semantically parsed.
  if (!example) return;
  const expected = example.texts[id];
  assert.ok(
    expected,
    `${context} ${id}: missing representative explanation oracle`,
  );
  assert.equal(
    text.trim().replace(/\s+/gu, ' '),
    expected,
    `${context} ${id}: explanation must match the documented weather facts and scope`,
  );
}
