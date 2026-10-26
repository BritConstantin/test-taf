import type { Weather } from './fixtures';

// Hand-written examples of the decision table, never a scoring implementation.
export const variedWeek: {
  weather: Weather;
  scores: readonly number[];
  reasons: readonly string[];
}[] = [
  {
    weather: {
      temperatureMaxC: 22,
      precipitationMm: 0,
      snowfallCm: 0,
      windMaxKmh: 10,
    },
    scores: [10, 70, 90, 60],
    reasons: [
      'SKI_ADVERSE',
      'SURF_MILD',
      'OUTDOOR_MILD_DRY',
      'INDOOR_AVAILABLE',
    ],
  },
  {
    weather: {
      temperatureMaxC: -5,
      precipitationMm: 5,
      snowfallCm: 5,
      windMaxKmh: 10,
    },
    scores: [90, 10, 10, 85],
    reasons: [
      'SKI_FAVOURABLE',
      'SURF_ADVERSE',
      'OUTDOOR_ADVERSE',
      'INDOOR_PREFERRED',
    ],
  },
  {
    weather: {
      temperatureMaxC: 22,
      precipitationMm: 12,
      snowfallCm: 0,
      windMaxKmh: 10,
    },
    scores: [10, 40, 10, 85],
    reasons: [
      'SKI_ADVERSE',
      'SURF_OTHER',
      'OUTDOOR_ADVERSE',
      'INDOOR_PREFERRED',
    ],
  },
  {
    weather: {
      temperatureMaxC: 10,
      precipitationMm: 2,
      snowfallCm: 0,
      windMaxKmh: 25,
    },
    scores: [10, 40, 50, 60],
    reasons: ['SKI_ADVERSE', 'SURF_OTHER', 'OUTDOOR_OTHER', 'INDOOR_AVAILABLE'],
  },
  {
    weather: {
      temperatureMaxC: 36,
      precipitationMm: 0,
      snowfallCm: 0,
      windMaxKmh: 10,
    },
    scores: [10, 10, 10, 85],
    reasons: [
      'SKI_ADVERSE',
      'SURF_ADVERSE',
      'OUTDOOR_ADVERSE',
      'INDOOR_PREFERRED',
    ],
  },
  {
    weather: {
      temperatureMaxC: 2,
      precipitationMm: 2,
      snowfallCm: 0,
      windMaxKmh: 10,
    },
    scores: [40, 10, 50, 60],
    reasons: ['SKI_OTHER', 'SURF_ADVERSE', 'OUTDOOR_OTHER', 'INDOOR_AVAILABLE'],
  },
  {
    weather: {
      temperatureMaxC: -5,
      precipitationMm: 31,
      snowfallCm: 31,
      windMaxKmh: 41,
    },
    scores: [10, 10, 10, 85],
    reasons: [
      'SKI_ADVERSE',
      'SURF_ADVERSE',
      'OUTDOOR_ADVERSE',
      'INDOOR_PREFERRED',
    ],
  },
];
