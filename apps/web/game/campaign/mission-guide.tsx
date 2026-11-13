'use client';
// Contextual, answer-free navigation. All science decisions and completion remain server-authoritative.
import Link from 'next/link';
import { useState } from 'react';
import type { MissionId } from './view-adapter';

type Brief = {
  type: string;
  heading: string;
  objective: string;
  method: string;
  why: string;
  steps: readonly string[];
};

const BRIEFS: Record<MissionId, Brief> = {
  'station-arrival': {
    type: 'Evidence exploration', heading: 'Become a source investigator',
    objective: 'Find the real NASA observation and separate it from the fictional station story.',
    method: 'Explore the highlighted terminals and collect your first sourced finding.',
    why: 'Science starts by distinguishing documented observations from narrative assumptions.',
    steps: [
      'Select the glowing research terminal and inspect the B20 evidence.',
      'Visit the scanner and classify what is real and what belongs to the game story.',
      'Collect a cited observation and use the hatch to finish this mission.'
    ]
  },
  'bass-assembly': {
    type: 'Equipment troubleshooting', heading: 'Build, diagnose, repair',
    objective: 'Learn how an apparatus is assembled and why a fault must be diagnosed before qualification.',
    method: 'Choose mounts and orientations, fit the parts, run the training check and correct the fault.',
    why: 'A training assembly is not a NASA measurement or a fire-safety certification.',
    steps: [
      'Enter the training bay and fit each component at a selected mount.',
      'Run the Training check; read its findings before choosing a diagnosis.',
      'Repair the setup, qualify the training rig, inspect B20 and file the mission.'
    ]
  },
  'flame-detective': {
    type: 'Predict → observe → explain', heading: 'Investigate the flame result',
    objective: 'Make a prediction before seeing the documented B20 outcome.',
    method: 'Use the observation lab hotspots in order; your prediction is locked before reveal.',
    why: 'One observation can support a documented outcome without proving its cause.',
    steps: [
      'Choose the recorded test and its calibrated condition.',
      'Write your own prediction, lock it, then reveal the real observation.',
      'Explain what the source actually supports and what it cannot establish.'
    ]
  },
  'claim-trial': {
    type: 'Evidence courtroom', heading: 'Put scientific claims on trial',
    objective: 'Appraise four claims by type, strength of evidence, support and limitations.',
    method: 'Read each statement, consult the NASA archive, and submit a reasoned appraisal.',
    why: 'A plausible explanation is not automatically a supported experimental conclusion.',
    steps: [
      'Inspect the four statements on the statement board.',
      'Use the source archive and review desk to classify each statement.',
      'Correct appraisals with the server feedback, then file your case report.'
    ]
  },
  'lunar-habitat': {
    type: 'Fictional mission decision', heading: 'Advise a lunar research team',
    objective: 'Decide what a single orbital record can and cannot tell us about a fictional Moon habitat.',
    method: 'Compare conditions, identify evidence gaps and propose measurements before making a provisional decision.',
    why: 'Do not certify a habitat as safe or unsafe using an unrelated orbital observation.',
    steps: [
      'Read the orbital B20 record, then inspect the hypothetical habitat conditions.',
      'Identify which conditions are missing or different; propose useful next measurements.',
      'Record a provisional, evidence-limited decision and file the report.'
    ]
  }
};

export function MissionGuide({ mission, completed, passportCount }: {
  mission: MissionId; completed: number; passportCount: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const b = BRIEFS[mission];
  return <aside className="mf-guide" aria-label="How to play this mission">
    <div className="mf-guide-top">
      <div className="mf-guide-copy">
        <span className="mf-guide-type">{b.type}</span>
        <h2>{b.heading}</h2>
        <p className="mf-guide-goal"><b>Your mission:</b> {b.objective}</p>
        <p className="mf-guide-progress">{completed}/5 missions complete · {passportCount} evidence Passport {passportCount === 1 ? 'entry' : 'entries'} saved</p>
      </div>
      <button type="button" className="btn mf-guide-toggle" aria-expanded={expanded} aria-controls="mf-guide-details" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Hide instructions' : 'Show instructions'}
      </button>
    </div>
    {expanded && <div id="mf-guide-details" className="mf-guide-details">
      <div className="mf-guide-steps">
        <h3>How to play</h3>
        <ol>{b.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p className="mf-guide-control"><b>Control tip:</b> In a 3D room, choose the highlighted station label to open an interaction. On mobile or without WebGL, the same controls remain available. Follow PIX and the mission objective list.</p>
      </div>
      <div className="mf-guide-context">
        <h3>Why it matters</h3>
        <p>{b.why}</p>
        <p><b>What you will do:</b> {b.method}</p>
        <Link href="/experiments/bass2-b20" target="_blank" rel="noopener noreferrer">Open the NASA-sourced B20 dossier ↗</Link>
      </div>
    </div>}
  </aside>;
}
