import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';

export interface StubRoute {
  path: string;
  query: Record<string, string>;
  body: unknown;
  status?: number;
  raw?: boolean;
  delayMs?: number;
}

interface JournalEntry {
  method: string;
  path: string;
  query: Record<string, string>;
  matched: boolean;
}

// Reachable HTTP server: a separate SUT process can call it. Not a fetch interceptor.
export class ProviderStub {
  private readonly server: Server;
  private routes: { route: StubRoute; hits: number }[] = [];
  private journal: JournalEntry[] = [];
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    this.server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://stub.local');
      const entry = this.routes.find(
        ({ route }) =>
          request.method === 'GET' &&
          url.pathname === route.path &&
          Object.entries(route.query).every(([key, value]) => {
            const values = url.searchParams.getAll(key);
            if (values.length !== 1) return false;
            // The daily field list is a set; query ordering has no meaning.
            return key === 'daily'
              ? values[0]?.split(',').sort().join(',') ===
                  value.split(',').sort().join(',')
              : values[0] === value;
          }),
      );
      this.journal.push({
        method: request.method ?? '',
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        matched: entry !== undefined,
      });
      if (!entry) {
        response.writeHead(501, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'Unmatched provider request' }));
        return;
      }
      entry.hits += 1;
      const send = () => {
        if (response.destroyed) return;
        response.writeHead(entry.route.status ?? 200, {
          'content-type': 'application/json',
        });
        response.end(
          entry.route.raw
            ? String(entry.route.body)
            : JSON.stringify(entry.route.body),
        );
      };
      if (entry.route.delayMs) {
        const timer = setTimeout(() => {
          this.timers.delete(timer);
          send();
        }, entry.route.delayMs);
        this.timers.add(timer);
        response.once('close', () => {
          clearTimeout(timer);
          this.timers.delete(timer);
        });
      } else send();
    });
    this.server.requestTimeout = 2000;
    this.server.headersTimeout = 2000;
  }

  async start(port = 0): Promise<string> {
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, '127.0.0.1', () => {
        this.server.off('error', reject);
        resolve();
      });
    });
    const address = this.server.address();
    if (!address || typeof address === 'string')
      throw new Error('Provider stub did not bind a TCP port');
    return `http://127.0.0.1:${address.port}`;
  }

  install(route: StubRoute): void {
    this.routes.push({ route, hits: 0 });
  }

  reset(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.server.closeAllConnections();
    this.routes = [];
    this.journal = [];
  }

  verify(): void {
    assert.deepEqual(
      this.journal.filter((entry) => !entry.matched),
      [],
      'Unmatched provider requests',
    );
    for (const { route, hits } of this.routes)
      assert.ok(
        hits > 0,
        `Unconsumed provider fixture: ${route.path} ${JSON.stringify(route.query)}`,
      );
  }

  assertNoCalls(path?: string): void {
    assert.deepEqual(
      this.journal.filter((entry) => path === undefined || entry.path === path),
      [],
      `Unexpected provider access${path ? ` to ${path}` : ''}`,
    );
  }

  diagnostics(): string {
    return JSON.stringify(this.journal, null, 2).slice(0, 6000);
  }

  async close(): Promise<void> {
    this.reset();
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
