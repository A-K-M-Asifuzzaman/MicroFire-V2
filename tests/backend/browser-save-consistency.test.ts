import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium, firefox, webkit, type Browser } from '@playwright/test';

// Native primitive smoke test only. Renderer/process isolation is not established and writable product saves stay off.
for (const engine of [chromium, firefox, webkit]) test(`${engine.name()}: two-page lock visibility, stale generation refusal and tombstone`, async () => {
  const server = createServer((_request, response) => { response.setHeader('content-type', 'text/html'); response.end('<!doctype html><title>Disposable save primitive test</title>'); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert(address && typeof address === 'object');
  let browser: Browser | undefined;
  try {
    browser = await engine.launch(engine.name() === 'chromium' ? { executablePath: path.resolve('../MicroFire-V2/.cache/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing') } : {});
    const context = await browser.newContext(), a = await context.newPage(), b = await context.newPage();
    await Promise.all([a.goto(`http://127.0.0.1:${address.port}`), b.goto(`http://127.0.0.1:${address.port}`)]);
    for (const page of [a, b]) assert(await page.evaluate(() => isSecureContext && !!navigator.locks?.request && !!crypto.subtle));
    await a.evaluate(() => localStorage.setItem('test-save', '0'));
    const prior = await Promise.all([a, b].map(p => p.evaluate(() => Number(localStorage.getItem('test-save')))));
    await Promise.all([a, b].map((p, i) => p.evaluate(n => localStorage.setItem('test-save', String(n + 1)), prior[i]!)));
    assert.equal(await a.evaluate(() => localStorage.getItem('test-save')), '1', 'Unlocked control must demonstrate the lost update');
    await a.evaluate(() => localStorage.setItem('test-save', '0'));
    await Promise.all([a, b].map(page => page.evaluate(async () => {
      for (let i = 0; i < 50; i++) await navigator.locks.request('test-save-lock', async () => {
        const n = Number(localStorage.getItem('test-save')); await new Promise(resolve => setTimeout(resolve, 1));
        localStorage.setItem('test-save', String(n + 1));
      });
    })));
    assert.equal(await b.evaluate(() => localStorage.getItem('test-save')), '100');
    const stale = await b.evaluate(() => localStorage.getItem('test-save'));
    await a.evaluate(async () => navigator.locks.request('test-save-lock', () => localStorage.setItem('test-save', '101:tombstone')));
    assert.equal(await b.evaluate(async expected => navigator.locks.request('test-save-lock', () => localStorage.getItem('test-save') === expected), stale), false);
    await a.close(); const reopened = await context.newPage(); await reopened.goto(`http://127.0.0.1:${address.port}`);
    assert.equal(await reopened.evaluate(() => localStorage.getItem('test-save')), '101:tombstone');
    console.log(`${engine.name()} ${browser.version()}: 100 serialized increments, zero lost updates; two pages, no renderer-isolation proof; product writes remain disabled.`);
    await context.close();
  } finally { await browser?.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
