// Visitor B for hosted acceptance: a separate, visible browser with its own cookie jar.
// The owner signs in to Vercel normally in this window (no bypass token, no copied cookies). Then the same in-page driver runs.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const URL = 'https://microfire-v2-campaign-security-stag.vercel.app/missions/play';
const ctx = await chromium.launchPersistentContext('/private/tmp/claude-501/mf-visitor-b', { headless: false, viewport: { width: 1280, height: 860 } });
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto(URL);
console.log('waiting for Vercel sign-in in the opened window (up to 10 min)…');
await page.waitForSelector('.mf-play[data-phase="ready"]', { timeout: 600000 });
console.log('visitor B case ready; running driver'); await page.waitForTimeout(8000);
await page.evaluate(readFileSync(new URL('./hosted-campaign-driver.js', import.meta.url), 'utf8'));
await page.waitForFunction(() => window.__mfRun.done || window.__mfRun.error, null, { timeout: 300000, polling: 1000 });
const r = await page.evaluate(() => window.__mfRun);
const cookieNames = (await ctx.cookies()).map((c) => c.name).filter((n) => n.includes('microfire'));
writeFileSync('/private/tmp/claude-501/visitor-b.json', JSON.stringify({ ...r, cookieNames }, null, 1));
console.log(JSON.stringify({ done: r.done, error: r.error, export: r.export, steps: r.log.length }));
await page.reload(); await page.waitForSelector('.mf-play[data-phase="ready"]');
console.log('after reload:', await page.evaluate(() => ({ revision: document.querySelector('.mf-play').dataset.revision, done: document.querySelectorAll('.mf-rail li[data-state=done]').length })));
await ctx.close();
