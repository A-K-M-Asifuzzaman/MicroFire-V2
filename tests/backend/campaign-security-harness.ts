import { createServer as httpServer, request as httpRequest, type RequestListener } from 'node:http';
import { createServer as httpsServer, request as httpsRequest } from 'node:https';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';

export async function testDatabase() {
  const directory = mkdtempSync('/tmp/microfire-campaign-db-'), data = directory + '/data';
  execFileSync('/opt/homebrew/bin/initdb', ['-D', data, '-A', 'trust', '-U', 'microfire_test', '--no-locale', '-E', 'UTF8'], { stdio: 'ignore' });
  execFileSync('/opt/homebrew/bin/pg_ctl', ['-D', data, '-o', `-k ${directory} -h '' -p 5432`, '-l', directory + '/postgres.log', '-w', 'start'], { stdio: 'ignore' });
  const options = { host: directory, port: 5432, user: 'microfire_test', database: 'postgres', max: 4 };
  const pool = new Pool(options); pool.on('error', () => {});
  await pool.query(readFileSync('data/migrations/campaign-public-v1.sql', 'utf8'));
  return { pool, options, restart() { execFileSync('/opt/homebrew/bin/pg_ctl', ['-D', data, '-m', 'fast', '-w', 'restart'], { stdio: 'ignore' }); }, async close() { await pool.end(); execFileSync('/opt/homebrew/bin/pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore' }); rmSync(directory, { recursive: true, force: true }); } };
}
type Handler = (request: Request, trustedAddress: string) => Promise<Response>;
type Factory = (origin: string) => Handler;
export async function testServer(factory: Factory, secure = false) {
  let origin = '', handle: Handler;
  const events: { path: string; method: string; status: number; campaignCookie: boolean; site: string | undefined }[] = [];
  const directory = secure ? mkdtempSync('/tmp/microfire-campaign-tls-') : null;
  if (directory) execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', directory + '/key.pem', '-out', directory + '/cert.pem'], { stdio: 'ignore' });
  const listener: RequestListener = async (incoming, outgoing) => {
    if (incoming.url === '/') { outgoing.setHeader('Content-Type', 'text/html'); outgoing.end('<!doctype html><title>Campaign security test origin</title>'); return; }
    let response: Response;
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join('; ') : value);
      const request = new Request(new URL(incoming.url!, origin), { method: incoming.method, headers,
        ...(!['GET', 'HEAD'].includes(incoming.method!) ? { body: Readable.toWeb(incoming) as ReadableStream<Uint8Array>, duplex: 'half' } : {}) } as RequestInit);
      response = await handle(request, incoming.socket.remoteAddress!);
    } catch { response = new Response('Harness request failed', { status: 500 }); }
    events.push({ path: incoming.url!.split('?')[0]!, method: incoming.method!, status: response.status, campaignCookie: incoming.headers.cookie?.includes('microfire_campaign_grant=') ?? false, site: incoming.headers['sec-fetch-site'] as string | undefined });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
  };
  const server = directory ? httpsServer({ key: readFileSync(directory + '/key.pem'), cert: readFileSync(directory + '/cert.pem') }, listener) : httpServer(listener);
  server.requestTimeout = 5000; server.headersTimeout = 5000;
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); if (!address || typeof address === 'string') throw Error('Invalid test address');
  origin = `${secure ? 'https' : 'http'}://127.0.0.1:${address.port}`; handle = factory(origin);
  return { origin, events, replace(factory: Factory) { handle = factory(origin); }, async close() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); if (directory) rmSync(directory, { recursive: true, force: true }); } };
}
export function wire(origin: string, path: string, body?: unknown, headers: Record<string, string> = {}, method = body === undefined ? 'GET' : 'POST') {
  return new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: unknown }>((resolve, reject) => {
    const bytes = body === undefined ? undefined : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    // Only this disposable TLS fixture uses a self-signed certificate. Production PostgreSQL always verifies certificates.
    const req = (origin.startsWith('https:') ? httpsRequest : httpRequest)(origin + path, { method, rejectUnauthorized: false,
      headers: { 'x-microfire-campaign': '1', ...(method === 'POST' ? { origin, 'content-type': 'application/json' } : {}), ...(bytes ? { 'content-length': String(bytes.length) } : {}), ...headers } }, response => {
        const chunks: Buffer[] = []; response.on('data', chunk => chunks.push(Buffer.from(chunk))); response.on('end', () => {
          const text = Buffer.concat(chunks).toString(); let value: unknown = text; try { value = JSON.parse(text); } catch { /* Non-JSON harness response stays observable. */ }
          resolve({ status: response.statusCode!, headers: response.headers, body: value });
        });
      });
    req.on('error', reject); req.end(bytes);
  });
}
