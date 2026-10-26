export interface HttpResult {
  status: number;
  headers: Record<string, string>;
  rawBody: string;
  body: unknown;
}

export class TransportError extends Error {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly timedOut: boolean,
    cause: unknown,
  ) {
    super(
      `${method} ${url}: ${timedOut ? 'request deadline exceeded' : 'transport failure; the external SUT may be absent'}`,
      { cause },
    );
    this.name = 'TransportError';
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async get(
    path: string,
    query: Record<string, string> = {},
  ): Promise<HttpResult> {
    const url = new URL(path, this.baseUrl);
    url.search = new URLSearchParams(query).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'error',
      });
      const rawBody = await response.text();
      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = undefined;
      }
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        rawBody,
        body,
      };
    } catch (cause) {
      throw new TransportError(
        'GET',
        url.toString(),
        controller.signal.aborted,
        cause,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
