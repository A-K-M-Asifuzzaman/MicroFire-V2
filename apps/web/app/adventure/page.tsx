import type { Metadata } from 'next';
import Link from 'next/link';
import { answerQuestion } from '@microfire/science';
import { AdventureGame, type AdventureFacts } from '../../game/adventure/adventure-game';
import { b20Facts } from '../../lib/lab-nasa';

export const metadata: Metadata = { title: 'ISS Adventure', description: 'A first-person microgravity adventure: float through a space-station lab, rebuild BASS-II, run test B20 and answer Mission Control with the evidence.' };

export default function Page() {
  const b = b20Facts();
  const refusal = answerQuestion({ question: 'Is a lunar habitat fire-safe?', targetConditions: {} });
  const facts: AdventureFacts = {
    observation: b.observation, citation: b.citation, href: b.href, conditions: b.conditions,
    oxygen: b.conditions.find((c) => c.label === 'Calibrated oxygen')?.value ?? 'unknown', flow: b.conditions.find((c) => c.label === 'Initial airflow')?.value ?? 'unknown',
    refusal: refusal.abstained ? refusal.reason : 'The validated catalog cannot assess or certify fire safety.',
  };
  return <div className="wrap page">
    <nav aria-label="Breadcrumb" className="crumbs"><Link href="/">Home</Link> / <Link href="/missions">Missions</Link> / ISS Adventure</nav>
    <header className="page-head">
      <p className="eyebrow">ISS Adventure · 3D game · about 5 minutes</p>
      <h1>Float in. Rebuild the experiment. Answer honestly.</h1>
      <p className="lede">A first-person microgravity adventure built on one real NASA test. The station and flame are illustrations; the record, its oxygen and airflow, and Mission Control&apos;s answer come from the cited NASA source and the MicroFire evidence engine.</p>
    </header>
    <AdventureGame facts={facts} />
  </div>;
}
