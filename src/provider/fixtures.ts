import assert from 'node:assert/strict';
import { FIXED_NOW } from '../config';

export interface ProviderLocation {
  id: number;
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface Weather {
  temperatureMaxC: number;
  precipitationMm: number;
  snowfallCm: number;
  windMaxKmh: number;
}

export const DAILY_FIELDS = [
  'temperature_2m_max',
  'precipitation_sum',
  'snowfall_sum',
  'wind_speed_10m_max',
];
export const WARSAW_DATES = [
  '2026-10-24',
  '2026-10-25',
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
];
export const HONOLULU_DATES = [
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
];
export const mild: Weather = {
  temperatureMaxC: 22,
  precipitationMm: 0,
  snowfallCm: 0,
  windMaxKmh: 10,
};

export function location(name = 'Gdańsk', id = 3099434): ProviderLocation {
  return {
    id,
    name,
    country: 'Poland',
    country_code: 'PL',
    admin1: 'Pomerania',
    latitude: 54.35205,
    longitude: 18.64637,
    timezone: 'Europe/Warsaw',
  };
}

export function discoveryCandidates(kind: string): ProviderLocation[] {
  switch (kind) {
    case 'city':
      return [location()];
    case 'town':
      return [
        {
          ...location('Sopot', 3085151),
          latitude: 54.4418,
          longitude: 18.5601,
        },
      ];
    case 'short-town':
      return [
        {
          id: 3160911,
          name: 'Bø',
          country: 'Norway',
          country_code: 'NO',
          admin1: 'Telemark',
          latitude: 59.41299,
          longitude: 9.0693,
          timezone: 'Europe/Oslo',
        },
      ];
    case 'ambiguous':
      return [
        {
          ...location('Springfield', 4250542),
          country: 'United States',
          country_code: 'US',
          admin1: 'Illinois',
          latitude: 39.8017,
          longitude: -89.6437,
          timezone: 'America/Chicago',
        },
        {
          ...location('Springfield', 4951788),
          country: 'United States',
          country_code: 'US',
          admin1: 'Massachusetts',
          latitude: 42.1015,
          longitude: -72.5898,
          timezone: 'America/New_York',
        },
      ];
    case 'minimal':
      return [
        {
          id: 1234567,
          name: 'Sample Town',
          latitude: 1,
          longitude: 2,
          timezone: 'Etc/UTC',
        },
      ];
    case 'ten':
      return Array.from({ length: 10 }, (_, index) =>
        location(`Sample ${index + 1}`, 8000000 + index),
      );
    case 'none':
      return [];
    default:
      throw new Error(`Unknown candidate fixture: ${kind}`);
  }
}

export function localToday(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(FIXED_NOW));
  const part = (type: string) => {
    const value = parts.find((item) => item.type === type)?.value;
    assert.ok(value, `Missing calendar part ${type}`);
    return value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function forecast(
  selected: ProviderLocation,
  days: readonly string[],
  weather: readonly Weather[],
) {
  assert.equal(
    weather.length,
    days.length,
    'Fixture weather/date arrays must align',
  );
  const zone = new Map([
    ['Europe/Warsaw', { offset: 7200, abbreviation: 'CEST' }],
    ['Pacific/Honolulu', { offset: -36000, abbreviation: 'HST' }],
    ['America/New_York', { offset: -14400, abbreviation: 'EDT' }],
    ['America/Chicago', { offset: -18000, abbreviation: 'CDT' }],
  ]).get(selected.timezone);
  assert.ok(
    zone,
    `Add fixed-instant fixture metadata for ${selected.timezone}`,
  );
  return {
    latitude: selected.latitude,
    longitude: selected.longitude,
    generationtime_ms: 0.1,
    utc_offset_seconds: zone.offset,
    timezone: selected.timezone,
    timezone_abbreviation: zone.abbreviation,
    elevation: 10,
    daily_units: {
      time: 'iso8601',
      temperature_2m_max: '°C',
      precipitation_sum: 'mm',
      snowfall_sum: 'cm',
      wind_speed_10m_max: 'km/h',
    },
    daily: {
      time: [...days],
      temperature_2m_max: weather.map((day) => day.temperatureMaxC),
      precipitation_sum: weather.map((day) => day.precipitationMm),
      snowfall_sum: weather.map((day) => day.snowfallCm),
      wind_speed_10m_max: weather.map((day) => day.windMaxKmh),
    },
  };
}

export function forecastQuery(
  selected: ProviderLocation,
  dates: readonly string[],
): Record<string, string> {
  const first = dates[0];
  const last = dates.at(-1);
  assert.ok(first && last, 'Forecast fixture needs a date window');
  return {
    latitude: String(selected.latitude),
    longitude: String(selected.longitude),
    timezone: selected.timezone,
    daily: DAILY_FIELDS.join(','),
    start_date: first,
    end_date: last,
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
    wind_speed_unit: 'kmh',
    timeformat: 'iso8601',
  };
}

export function weatherWeek(value: Weather): Weather[] {
  return Array.from({ length: 7 }, () => ({ ...value }));
}
