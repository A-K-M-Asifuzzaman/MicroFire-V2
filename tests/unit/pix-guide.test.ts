import { describe, expect, it } from 'vitest';
import { guideFor } from '../../apps/web/components/pix-guide';

const ROUTES = ['/', '/judge-guide', '/proof', '/lab', '/experiments/bass2-b20', '/dashboard', '/missions', '/missions/play', '/adventure', '/missions/bass-assembly/tour',
  '/missions/station-arrival', '/ask', '/atlas', '/gaps', '/investigations', '/compare', '/passport', '/sources', '/methodology', '/roadmap', '/somewhere-else'];

describe('PIX guide', () => {
  it('gives every page a place, at least one concrete action and a next stop on a real route', () => {
    for (const r of ROUTES) {
      const g = guideFor(r);
      expect(g.where.length, r).toBeGreaterThan(10);
      expect(g.now.length, r).toBeGreaterThan(0);
      expect(g.next?.href, r).toMatch(/^\/[a-z0-9/-]*$/);
      expect(g.next?.href, `${r} should not point at itself`).not.toBe(r);
    }
  });
  it('follows the judge path: lab → B20 → workstation → missions', () => {
    expect(guideFor('/judge-guide').next?.href).toBe('/lab');
    expect(guideFor('/lab').next?.href).toBe('/experiments/bass2-b20');
    expect(guideFor('/experiments/bass2-b20').next?.href).toBe('/dashboard');
    expect(guideFor('/dashboard').next?.href).toBe('/missions/play');
  });
  it('guides without stating evidence values or verdicts (the pages own those)', () => {
    for (const r of ROUTES) {
      const text = [guideFor(r).where, ...guideFor(r).now].join(' ');
      expect(text, r).not.toMatch(/\d+(\.\d+)?\s*(vol%|%|cm\/s|kPa)/);
      expect(text, r).not.toMatch(/\b(is|are) (fire-)?safe\b/i);
    }
  });
});
