/** The B20 "Air" display log, entry by entry (report Table A.1). Wording only restates the record and its limitations. */
export type FlowEntry = { raw: string; speed: number | null; title: string; detail: string };

export function flowEntries(raw: string[]): FlowEntry[] {
  return raw.map((r, i) => {
    const pot = /^pot\b/i.test(r), n = Number(r);
    if (pot) return { raw: r, speed: null, title: r, detail: 'A potentiometer setting, not a speed. Nothing can be drawn for it, and 0.5 is not 0.5 cm/s.' };
    if (i === 0) return { raw: r, speed: n, title: `${r} cm/s`, detail: 'The first Air display entry. This is the value the catalog uses as the initial airflow.' };
    return { raw: r, speed: Number.isFinite(n) ? n : null, title: r, detail: 'A later Air display entry. The record keeps it, but does not use it as the initial airflow.' };
  });
}

/** The adjacent uncalibrated oxygen reading, read from the canonical condition note (never typed in by hand). */
export const uncalibrated = (note: string) => /uncalibrated[^.]*?(\d+(?:\.\d+)?)/i.exec(note)?.[1] ?? null;
