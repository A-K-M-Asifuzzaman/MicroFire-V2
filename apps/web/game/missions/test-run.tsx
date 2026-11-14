'use client';
// Mission 03 · run the B20 test before the reveal. The chamber replays a BASS-II-style sequence at B20's RECORDED
// settings (illustration, toy flame); at the end it sends the same OBSERVE_DOCUMENTED_RESULT intent as the reveal button,
// and the server still decides. Nothing here grades or invents a result.
import { useEffect, useRef, useState } from 'react';
import { LabChamber } from '../../components/lab/lab-chamber';
import { Gauge, ProtocolRail } from '../../components/lab/lab-viz';
import { B20_SETTINGS, PROTOCOL, type Phase } from '../../lib/lab-engine';
import { useLite } from '../lite-mode';
import '../../components/lab/lab.css';

export function TestRun({ revealed, onFinished }: { revealed: boolean; onFinished: () => void }) {
  const lite = useLite();
  const [phase, setPhase] = useState<Phase>(revealed ? 'record' : 'configure');
  const [clock, setClock] = useState(revealed ? 3.8 : 0);
  const timers = useRef<number[]>([]);
  const done = useRef(onFinished);
  useEffect(() => { done.current = onFinished; });
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const running = phase !== 'configure' && phase !== 'record';
  const start = () => {
    timers.current.forEach(clearTimeout); timers.current = []; setClock(0);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let at = 0;
    for (const p of PROTOCOL.slice(1)) { timers.current.push(window.setTimeout(() => setPhase(p.id), reduce ? 0 : at)); at += p.ms; }
    const observeAt = PROTOCOL.slice(1, PROTOCOL.findIndex((p) => p.id === 'observe')).reduce((a, p) => a + p.ms, 0);
    if (!reduce) for (let k = 0; k <= 38; k++) timers.current.push(window.setTimeout(() => setClock(k / 10), observeAt + k * 100));
    timers.current.push(window.setTimeout(() => { setClock(3.8); done.current(); }, reduce ? 0 : at));
  };
  const say = PROTOCOL.find((p) => p.id === phase)!.say;
  return <section className="mf-testrun" aria-labelledby="mf-testrun-h">
    <h4 id="mf-testrun-h">{revealed ? 'Your B20 test run' : 'Run the B20 test, then see what NASA recorded'}</h4>
    <ProtocolRail phase={phase} />
    <p className="lab2-say" aria-live="polite"><b>{PROTOCOL.find((p) => p.id === phase)!.label}:</b> {say}</p>
    <LabChamber s={B20_SETTINGS} phase={phase} flat={lite} />
    <div className="mf-testrun-gauges">
      <Gauge label="Gravity (ISS)" value={0} unit="g" min={0} max={1} display="micro-g" />
      <Gauge label="Calibrated oxygen" value={17.4} unit="vol%" min={15} max={30} />
      <Gauge label="Initial airflow" value={5} unit="cm/s" min={0} max={20} />
      <Gauge label="Pressure" value={null} unit="kPa" min={30} max={110} display="unknown" />
      <Gauge label="Burn clock" value={clock} unit="s" min={0} max={3.8} tone="clock" display={`${clock.toFixed(1)} s`} />
    </div>
    {!revealed && <button type="button" className="btn btn-primary" disabled={running} onClick={start}>{running ? 'Test running…' : 'Run the B20 test'}</button>}
    <p className="mf-fine">B20&apos;s recorded oxygen and airflow (BASS-II Summary Report, Table A.1, PDF page 112). The chamber and flame are an illustration, not B20 footage; pressure and the run&apos;s exact gravity were not reported.</p>
  </section>;
}
