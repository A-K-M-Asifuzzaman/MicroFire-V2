import Link from 'next/link';

export const metadata = { title: 'Mission Guide · MicroFire' };
const missions = [
  { n:'01', title:'Station Arrival', goal:'Learn to distinguish real research from the station story.', steps:['Open the Research Terminal and inspect BASS-II B20.','Use the Evidence Scanner to classify where each statement comes from.','Collect the cited observation in the Evidence Lockers.','Use the Training-bay Hatch to finish.'] },
  { n:'02', title:'BASS-II Training Bay', goal:'Explore a schematic instrument, diagnose an authored fault, and learn what the source supports.', steps:['Enter the bay and fit the parts in a sensible order and orientation.','Run a Training check and inspect its findings.','Submit a diagnosis, repair the indicated setup, and run the check again.','Qualify the fictional training rig, inspect B20, then complete the mission.'] },
  { n:'03', title:'Flame Detective', goal:'Separate a prediction from what NASA actually recorded.', steps:['Select the admitted experiment and read its recorded conditions.','Lock a prediction before revealing the observation.','Reveal the cited experimental result.','Explain the result with its uncertainty and complete the case report.'] },
  { n:'04', title:'Claim Trial', goal:'Recognize claims stronger than the evidence allows.', steps:['Visit the claim stations one at a time.','Read the actual NASA source and the wording of each claim.','Classify each claim by its evidence support.','Review the feedback and file the trial.'] },
  { n:'05', title:'Lunar Habitat', goal:'Compare a fictional scenario with orbital evidence without inventing a safety certification.', steps:['Inspect the habitat and the B20 source context.','Set proposed habitat conditions.','Identify mismatches, unknowns, and measurements still needed.','Record a provisional research decision and propose a follow-up test.'] }
];
export default function Page() {
  return <div className="wrap page">
    <header className="page-head"><p className="eyebrow">Interactive campaign / how to play</p><h1>Mission control: your field guide</h1>
      <p className="lede">Five missions, one continuous case. Read the goal, use the scene's highlighted hotspot, complete the action panel below the scene, and follow PIX's next instruction. You can return to this guide without losing your case.</p>
      <div className="actions"><Link className="btn btn-primary" href="/missions/play">Enter or resume the five missions</Link><Link className="btn btn-quiet" href="/lab">Explore the Flame Lab first</Link></div>
    </header>
    <section className="panel frame stack" style={{padding:24,marginBlock:'24px 36px'}}>
      <h2>Four things to know before playing</h2>
      <ol className="steps">
        <li><b>Follow the current objective</b><span>Look at PIX's instruction and the objectives list; completed objectives are checked automatically from the server.</span></li>
        <li><b>Select the highlighted station</b><span>Choose the 3D scene hotspot or its accessible control, then use the opened panel to submit your action.</span></li>
        <li><b>Move forward in order</b><span>When a mission is complete, the server unlocks the next. A rejected action gives feedback—read it and correct your reasoning.</span></li>
        <li><b>Save your Passport</b><span>Your anonymous case persists in this browser for a limited time. Download the five-entry JSON Passport when you finish. Clearing cookies loses the case.</span></li>
      </ol>
    </section>
    <div style={{display:'grid',gap:24}}>
      {missions.map(m => <section key={m.n} className="panel frame" style={{padding:24}} aria-labelledby={`mission-${m.n}`}>
        <p className="eyebrow">Mission {m.n}</p><h2 id={`mission-${m.n}`}>{m.title}</h2><p>{m.goal}</p>
        <ol style={{paddingLeft:24}}>{m.steps.map(s => <li key={s} style={{marginBlock:8}}>{s}</li>)}</ol>
      </section>)}
    </div>
    <div className="panel stack frame" style={{padding:24,marginTop:32}}>
      <h2>Where do I see the actual science?</h2>
      <p>The game teaches evidence evaluation. The <Link href="/dashboard">Evidence Workstation</Link>, <Link href="/atlas">NASA Atlas</Link>, <Link href="/ask">Ask PIX</Link> and <Link href="/lab">interactive Flame Lab</Link> show the source and comparison tools. PIX currently uses deterministic source-grounded responses; it is not a trained LLM.</p>
      <p><strong>Important:</strong> The lab and mission animations are educational. BASS-II B20 is the admitted NASA observation. The missions cannot predict or certify lunar fire safety.</p>
      <Link className="btn btn-primary" href="/missions/play">Return to my case</Link>
    </div>
  </div>;
}
