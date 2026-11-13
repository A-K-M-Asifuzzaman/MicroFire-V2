import Link from 'next/link';
import { campaignPlayable } from '../../lib/campaign-flags';
import styles from './page.module.css';

export const metadata = {
  title: 'Start Here · Judge Guide',
  description: 'A clear, source-first route through MicroFire for NASA Space Apps judges and first-time visitors.'
};

const steps = [
  {
    number: '01', title: 'Understand the scientific question',
    purpose: 'Why flames in microgravity matter, and why a single experiment cannot settle every question.',
    href: '/', action: 'Open the Gravity Lens',
    note: 'The gravity visual is an educational illustration, not a measured flame.'
  },
  {
    number: '02', title: 'Inspect NASA evidence',
    purpose: 'See admitted BASS-II test B20, its 17.4 vol% calibrated oxygen value, and the primary-source citation.',
    href: '/experiments/bass2-b20', action: 'Open the B20 dossier',
    note: 'One experiment admitted; 55 legacy records quarantined pending verification.'
  },
  {
    number: '03', title: 'Try the evidence dashboard',
    purpose: 'Ask a research question, compare conditions, inspect ranked support and understand where the evidence stops.',
    href: '/dashboard', action: 'Open Evidence Workstation',
    note: 'Try the Moon-habitat example: the system must not claim safety certification.'
  },
  {
    number: '04', title: 'Play five different scientific tasks',
    purpose: 'Investigate a source, repair a training apparatus, lock a prediction, evaluate claims and assess a fictional habitat.',
    href: '/missions/play', action: 'Start the five missions',
    note: 'Follow the mission-by-mission guide above each interactive scene; progress is saved for this anonymous visitor.'
  },
  {
    number: '05', title: 'Read the evidence trail',
    purpose: 'After the final mission, review five source-linked Passport entries and download the case as JSON.',
    href: '/missions/play', action: 'View your Research Passport',
    note: 'The Passport records educational decisions, not an operational fire-safety approval.'
  }
] as const;

export default function JudgeGuidePage() {
  const playable = campaignPlayable();
  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.eyebrow}>NASA Space Apps Challenge 2026 · Team MicroFire</div>
      <h1>Start here. Explore fire science with confidence.</h1>
      <p>MicroFire connects real NASA combustion records, evidence-aware dashboard tools and a five-mission learning experience. This tour shows what is real, what is illustrated and what remains unknown.</p>
      <div className={styles.actions}>
        <Link className="btn btn-primary" href="/dashboard">Explore the science dashboard</Link>
        <Link className="btn" href={playable ? '/missions/play' : '/missions'}>{playable ? 'Play the five missions' : 'See the mission map'}</Link>
      </div>
      <p className={styles.truth}><b>Evidence status:</b> 1 admitted B20 test; 55 quarantined legacy records. PIX is a deterministic citation guide, not a generative AI model. This project is not NASA-endorsed.</p>
    </header>
    <section className={styles.route} aria-labelledby="judge-path">
      <div className={styles.sectionHead}>
        <h2 id="judge-path">Follow the research journey</h2>
        <p>Each stop explains what to do, what to notice and which conclusions the evidence can support. You can explore the research tools without finishing the game.</p>
      </div>
      <ol className={styles.steps}>
        {steps.map((step) => {
          const href = !playable && step.href === '/missions/play' ? '/missions' : step.href;
          return <li key={step.number} className={styles.step}>
            <span className={styles.number} aria-hidden="true">{step.number}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.purpose}</p>
              <p className={styles.note}><b>Look for:</b> {step.note}</p>
              <Link href={href} className={styles.stepLink}>{!playable && step.href === '/missions/play' ? 'See the mission map' : step.action} →</Link>
            </div>
          </li>;
        })}
      </ol>
    </section>
    <section className={styles.guidance} aria-labelledby="judge-how">
      <h2 id="judge-how">How to play without getting lost</h2>
      <div className={styles.rules}>
        <div><h3>Follow the highlighted next task</h3><p>Each mission has a visible objective list. In 3D scenes, select the glowing station label to open its controls; a 2D fallback offers the same buttons.</p></div>
        <div><h3>Read PIX's feedback</h3><p>Correct and incorrect actions receive server-checked feedback. The guide explains the task but does not give away the answers.</p></div>
        <div><h3>Watch the Passport grow</h3><p>Every completed mission adds a source-linked entry. Reloading the same visitor case restores server-saved progress until the anonymous session expires.</p></div>
      </div>
    </section>
    <section className={styles.guidance} aria-labelledby="judge-science">
      <h2 id="judge-science">Scientific honesty is part of the product</h2>
      <p>NASA's BASS-II observation belongs to an orbital experiment. A hypothetical Moon habitat is not that experiment. Missing pressure, gravity and other conditions remain unknown where the primary record does not report them. The application must refuse to certify a fictional habitat as safe or unsafe.</p>
      <div className={styles.actions}><Link className="btn" href="/atlas">Explore evidence status</Link><Link className="btn" href="/ask">Ask PIX with citations</Link><Link className="btn" href="/methodology">Read methodology</Link></div>
    </section>
  </div>;
}
