import { World, setWorldConstructor } from '@cucumber/cucumber';
import { ApiClient } from '../api/client';
import type { HttpResult } from '../api/client';
import { config } from '../config';
import { ProviderStub } from '../provider/stub';
import {
  forecast,
  forecastQuery,
  location,
  mild,
  WARSAW_DATES,
  weatherWeek,
} from '../provider/fixtures';
import type { ProviderLocation, Weather } from '../provider/fixtures';

export class AcceptanceWorld extends World {
  readonly settings = config();
  readonly client = new ApiClient(
    this.settings.sutBaseUrl,
    this.settings.requestTimeoutMs,
  );
  readonly stub = new ProviderStub();
  stubStarted = false;
  response: HttpResult | undefined;
  candidates: ProviderLocation[] = [];
  selected: ProviderLocation = location();
  dates: readonly string[] = WARSAW_DATES;
  weather: Weather[] = weatherWeek(mild);
  invalidParameters: Record<string, string> | undefined;
  failedStage: string | undefined;

  result(): HttpResult {
    if (!this.response)
      throw new Error('No API response: a successful When request is required');
    return this.response;
  }

  resolution(): void {
    this.stub.install({
      path: '/v1/get',
      query: { id: String(this.selected.id), language: 'en', format: 'json' },
      body: this.selected,
    });
  }

  forecast(): void {
    this.stub.install({
      path: '/v1/forecast',
      query: forecastQuery(this.selected, this.dates),
      body: forecast(this.selected, this.dates, this.weather),
    });
  }
}

setWorldConstructor(AcceptanceWorld);
