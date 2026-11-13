// Hosted acceptance driver: runs INSIDE a normally signed-in browser tab on the protected staging origin.
// It only operates the app's own controls (no direct API writes, no tokens); every step must be accepted by the server
// (revision +1). The tester-side rubric below mirrors tests/unit/campaign-helpers; the browser app never sees it.
window.__mfRun = { log: [], done: false, error: null };
(async () => {
  const PARTS = {"flow-duct":"msg-work-volume-mount","fan":"duct-inlet","flow-straightener":"duct-honeycomb-slot","nitrogen-nozzle":"test-section-n2-port","sample-holder":"top-mounting-rail","igniter":"front-window-igniter-lever","still-camera":"top-window","video-camera":"front-window-mirror","radiometer":"downstream-top-back-corner","exit-plate":"duct-exit"};
  const CLAIMS = [{"id":"trial-b20-burned-sample","kind":"observed","evidenceLevel":"direct","support":"supports","confounders":[]},{"id":"trial-b20-thickness","kind":"derived","evidenceLevel":"analogous","support":"supports","confounders":[]},{"id":"trial-flow-caused-burnout","kind":"hypothesis","evidenceLevel":"gap","support":"insufficient","confounders":["flow-history"]},{"id":"trial-ai-lunar-claim","kind":"unknown","evidenceLevel":"gap","support":"insufficient","confounders":["gravity","pressure"]}];
  const KIND = { observed: 'Observed in the source', derived: 'Derived from recorded values', interpretation: 'Interpretation', hypothesis: 'Hypothesis', unknown: 'Unknown / not established' };
  const LEVEL = { direct: 'Direct evidence', analogous: 'Analogous evidence', mechanistic: 'Mechanistic reasoning', gap: 'Evidence gap' };
  const SUPPORT = { supports: 'The evidence supports it', contradicts: 'The evidence contradicts it', insufficient: 'The evidence is insufficient' };
  const CONF = { 'flow-history': 'Airflow changed during the run', gravity: 'Gravity differs or is unknown', pressure: 'Pressure differs or is unknown' };
  const R = window.__mfRun, log = (m) => R.log.push(`${new Date().toISOString().slice(11, 19)} ${m}`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const play = () => document.querySelector('.mf-play');
  const rev = () => Number(play().getAttribute('data-revision'));
  async function until(fn, ms = 25000, what = 'condition') { const t = Date.now(); while (Date.now() - t < ms) { const v = fn(); if (v) return v; await sleep(120); } throw Error('timeout: ' + what); }
  const ready = () => until(() => play()?.getAttribute('data-phase') === 'ready', 25000, 'phase ready');
  const txt = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const ltxt = (l) => { const c = l.cloneNode(true); c.querySelectorAll('select,option,textarea').forEach((x) => x.remove()); return txt(c); };
  const button = (name, scope = document) => until(() => [...scope.querySelectorAll('button')].find((b) => txt(b) === name || b.getAttribute('aria-label') === name), 15000, 'button ' + name);
  const group = (start) => until(() => [...document.querySelectorAll('fieldset,[role=group]')].find((g) => { const l = g.querySelector('legend'); return (l && txt(l).startsWith(start)) || (g.getAttribute('aria-label') || '').startsWith(start); }), 15000, 'group ' + start);
  const labelInput = async (text, scope = document) => {
    const l = await until(() => [...scope.querySelectorAll('label')].find((x) => ltxt(x) === text), 15000, 'label ' + text);
    return l.control || l.querySelector('input,select,textarea') || document.getElementById(l.htmlFor);
  };
  const setChecked = async (input, on = true) => { if (input.checked !== on) { input.click(); await sleep(60); } };
  const setValue = async (el, v) => { const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); await sleep(80); };
  const spot = async (re) => { const g = await until(() => document.querySelector('[role=group][aria-label="Station hotspots"]'), 15000, 'hotspots'); const b = await until(() => [...g.querySelectorAll('button')].find((x) => re.test(txt(x))), 15000, 'spot ' + re); b.click(); await sleep(250); };
  async function accepted(name, scope) { await ready(); const before = rev(); (await button(name, scope)).click(); await until(() => rev() === before + 1 && play().getAttribute('data-phase') === 'ready', 25000, 'server accept ' + name); log(`OK ${name} (rev ${rev()})`); }
  try {
    await ready(); log(`start: revision ${rev()}`);
    if (rev() !== 0) throw Error('expected a fresh case (revision 0); use Start over first');
    // Mission 1
    await spot(/Research terminal/); await accepted('Open the source record');
    await spot(/Evidence scanner/);
    await setChecked(await labelInput('Documented research', await group('The B20 observation is')));
    await setChecked(await labelInput('Authored fiction', await group('The station fire alarm in this story is')));
    await accepted('Submit the source review');
    await spot(/Evidence lockers/); await accepted('Collect the documented observation');
    await spot(/Training-bay hatch/); await accepted('Complete Station Arrival');
    // Mission 2
    await accepted('Enter the training bay');
    for (const [id, anchor] of Object.entries(PARTS)) {
      const row = await until(() => document.querySelector(`tr[data-part="${id}"]`), 15000, 'row ' + id);
      await setValue(row.querySelector('select'), anchor); await accepted('Fit', row);
    }
    await accepted('Run a Training check');
    if (!/found 1 issue/.test(txt(document.querySelector('.mf-findings') || document.body))) throw Error('training check did not report the authored fault');
    await setValue(await labelInput('Part'), 'fan'); await setValue(await labelInput('Fault'), 'REVERSED'); await accepted('Submit diagnosis');
    for (const p of ['fan', 'exit-plate']) await accepted('Remove', document.querySelector(`tr[data-part="${p}"]`));
    for (const p of ['exit-plate', 'fan']) { const row = document.querySelector(`tr[data-part="${p}"]`); await setValue(row.querySelector('select'), PARTS[p]); await accepted('Fit', row); }
    await accepted('Qualify the training rig'); await accepted('Open the B20 result'); await accepted('Complete the training bay');
    // Mission 3
    await accepted('Start Flame Detective');
    await spot(/Test selector/); await setValue(await labelInput('Oxygen (vol%)'), '17.4'); await accepted('Select this test');
    await spot(/Prediction panel/); await setValue(await labelInput('What do you predict happened to the sample?'), 'Some of the sample may remain.'); await accepted('Lock my prediction');
    await spot(/Observation window/); await accepted('Reveal the documented result');
    await spot(/Analysis bench/);
    for (const l of ['The source documents this observation', 'One run cannot show what caused the outcome', 'Pressure for this run is unknown', 'This is not evidence about a lunar habitat']) await setChecked(await labelInput(l));
    await accepted('Submit my explanation');
    if (!document.querySelector('.mf-verdict[data-kind="correct"]')) throw Error('explanation not graded correct');
    await spot(/Case report/); await accepted('Complete Flame Detective');
    // Mission 4
    await accepted('Start Claim Trial'); await spot(/Review desk/);
    for (const c of CLAIMS) {
      (await until(() => document.querySelector(`[aria-label="Statement on trial"] button[data-statement="${c.id}"]`), 15000, 'exhibit ' + c.id)).click(); await sleep(200);
      await setChecked(await labelInput(KIND[c.kind])); await setChecked(await labelInput(LEVEL[c.evidenceLevel]));
      const ev = await group('Which source evidence applies'); for (const b of ev.querySelectorAll('input[type=checkbox]')) await setChecked(b, false);
      await setChecked(await labelInput(c.id === 'trial-b20-thickness' ? 'B20 sample thickness (recorded condition)' : 'B20 observation log (Table A.1)'));
      await setChecked(await labelInput(SUPPORT[c.support]));
      for (const [k, l] of Object.entries(CONF)) await setChecked(await labelInput(l), c.confounders.includes(k));
      await accepted('Submit appraisal');
      if (!document.querySelector('.mf-verdict[data-kind="correct"]')) throw Error('appraisal not correct: ' + c.id);
    }
    await spot(/Case lectern/); await accepted('File the case report');
    // Mission 5 (fictional habitat): first prove the server refuses a safety verdict, then the defensible assessment
    await accepted('Start Lunar Habitat'); await spot(/Life-support bay/);
    const verdict = await group('What can the evidence conclude');
    await setChecked(await labelInput('The habitat is fire safe', verdict));
    for (const d of ['Gravity', 'Pressure']) await setChecked(await labelInput(d, await group('Which measurements should come next')));
    await accepted('Submit assessment');
    const refusal = document.querySelector('.mf-verdict'); log('safety verdict feedback: ' + (refusal ? txt(refusal).slice(0, 160) : 'none'));
    if (!refusal || refusal.getAttribute('data-kind') === 'correct') throw Error('server did not refuse the safety verdict');
    await setChecked(await labelInput('Insufficient evidence to decide', verdict));
    for (const d of ['Gravity', 'Oxygen', 'Pressure', 'Ventilation', 'Material']) await setChecked(await labelInput(d, await group('Where does B20 not apply')));
    await accepted('Submit assessment');
    await spot(/Decision station/); await setChecked(await labelInput('Insufficient evidence to decide', await group('Provisional decision'))); await accepted('Record decision');
    await spot(/Airlock log/); await setValue(await labelInput('Proposed next test'), 'Measure PMMA flame spread at lunar gravity and habitat pressure.'); await accepted('Propose this test');
    await accepted('File the case report');
    await until(() => document.querySelector('[aria-label="Campaign complete"], section[aria-labelledby]') && /complete/i.test(txt(document.body)), 15000, 'campaign complete');
    // Passport export (read-only GET with the campaign header; no CSRF needed)
    const ex = await (await fetch('/api/game/public-campaign/v1/export', { headers: { 'X-MicroFire-Campaign': '1' } })).json();
    R.export = { sessionId: ex.data?.sessionId?.slice(0, 8), entries: ex.data?.passport?.entries?.length, missions: ex.data?.passport?.entries?.map((e) => e.scenario ?? e.missionId ?? e.title) };
    log(`export: ${R.export.entries} passport entries`);
    R.done = true;
  } catch (e) { R.error = String(e && e.message || e); log('FAIL ' + R.error); }
})();
'driver started';
