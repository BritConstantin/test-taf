export const FIXED_NOW = '2026-10-23T23:30:00Z';
export const PROVIDER_DEADLINE_MS = 300;
export const STUB_DELAY_MS = 900;

function integer(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  name: string,
): number {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new Error(`${name} must be an integer in [${min}, ${max}]`);
  }
  return result;
}

export function config(env: NodeJS.ProcessEnv = process.env) {
  const sut = new URL(env.SUT_BASE_URL ?? 'http://127.0.0.1:3000');
  if (
    !['http:', 'https:'].includes(sut.protocol) ||
    sut.username ||
    sut.password ||
    sut.search ||
    sut.hash ||
    sut.pathname !== '/'
  ) {
    throw new Error(
      'SUT_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment',
    );
  }
  return {
    sutBaseUrl: sut.origin,
    stubPort: integer(
      env.PROVIDER_STUB_PORT,
      4400,
      1024,
      65535,
      'PROVIDER_STUB_PORT',
    ),
    requestTimeoutMs: integer(
      env.API_REQUEST_TIMEOUT_MS,
      2500,
      1500,
      5000,
      'API_REQUEST_TIMEOUT_MS',
    ),
  };
}
