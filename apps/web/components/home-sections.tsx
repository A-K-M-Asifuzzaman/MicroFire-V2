// Home page story sections below the observatory. Server-rendered; all motion is CSS (and stops under reduced motion).
import Link from 'next/link';
import { flamePath } from './flame-shape';
import { PixStage } from './pix-stage';
import { BAY_TOUR } from './routes';

export { BAY_TOUR };

/** Earth vs microgravity, side by side. Shapes are the same illustrative outlines as the Gravity Lens. */
export function GravityDuel({ recordHref }: { recordHref: string }) {
  const sparks = [[150, 0], [210, 0.6], [178, 1.2], [232, 1.8], [196, 2.4]] as const;
  return <section className="duel" aria-labelledby="duel-title">
    <div className="wrap">
      <header className="duel-head" data-reveal>
        <p className="eyebrow">Two teaching views · still-air illustration</p>
        <h2 id="duel-title">On Earth, hot gas rises. <em>In still microgravity air, it can&apos;t.</em></h2>
        <p className="lede">Without buoyancy-driven flow, a flame in still air can become rounder and bluer. These drawings leave out forced airflow, and real microgravity flames vary with fuel, flow and soot. The B20 test you can inspect used opposed airflow.</p>
      </header>
      <div className="duel-stage">
        <figure className="duel-card duel-earth" data-reveal>
          <svg viewBox="0 0 400 400" role="img" aria-label="Teaching illustration: in still air on Earth, buoyancy lifts hot gas and can stretch a candle-like flame into a tall yellow teardrop.">
            <defs>
              <radialGradient id="duel-e-core" cx="50%" cy="68%" r="62%"><stop offset="0" stopColor="#fff6dc" /><stop offset=".45" stopColor="#ffc06a" /><stop offset="1" stopColor="#ff6a1a" stopOpacity=".1" /></radialGradient>
              <radialGradient id="duel-e-glow"><stop offset="0" stopColor="#ff8738" stopOpacity=".55" /><stop offset="1" stopColor="#ff8738" stopOpacity="0" /></radialGradient>
            </defs>
            <circle cx="200" cy="215" r="170" fill="url(#duel-e-glow)" className="duel-pulse" />
            <g className="duel-flicker"><path d={flamePath(1)} fill="url(#duel-e-core)" /><path d={flamePath(1, 0.55, 22)} fill="#4f8dff" opacity=".55" transform="translate(0 40) scale(1 .45)" style={{ transformOrigin: '200px 285px' }} /></g>
            {sparks.map(([x, d]) => <circle key={x} className="duel-spark" cx={x} cy="250" r="2.6" fill="#ffc06a" style={{ animationDelay: `${d}s` }} />)}
            <g stroke="#ffb06a" strokeWidth="2" fill="none" opacity=".7" className="duel-rise"><path d="M110 330 C100 250 112 170 128 100" /><path d="M290 330 C300 250 288 170 272 100" /></g>
            <rect x="186" y="280" width="28" height="6" rx="2" fill="#c9d4dd" />
          </svg>
          <figcaption><b>1 g · Earth, still air</b><span>Hot gas is lighter, so buoyancy lifts it and can stretch the flame into a tall, bright teardrop.</span></figcaption>
        </figure>
        <div className="duel-vs" aria-hidden="true"><span>1 g</span><i /><b>vs</b><i /><span>0 g</span></div>
        <figure className="duel-card duel-micro" data-reveal>
          <svg viewBox="0 0 400 400" role="img" aria-label="Teaching illustration: in still air with almost no buoyancy, a flame can become rounder, dimmer and bluer, fed by slow diffusion.">
            <defs>
              <radialGradient id="duel-m-env" cx="50%" cy="55%" r="58%"><stop offset="0" stopColor="#2a5fbf" stopOpacity=".15" /><stop offset=".7" stopColor="#5d9bf5" stopOpacity=".55" /><stop offset=".9" stopColor="#bfe2ff" /><stop offset="1" stopColor="#2a5fbf" stopOpacity="0" /></radialGradient>
              <radialGradient id="duel-m-glow"><stop offset="0" stopColor="#5d9bf5" stopOpacity=".5" /><stop offset="1" stopColor="#5d9bf5" stopOpacity="0" /></radialGradient>
            </defs>
            <circle cx="200" cy="215" r="170" fill="url(#duel-m-glow)" className="duel-pulse" />
            <g className="duel-breathe"><path d={flamePath(0)} fill="url(#duel-m-env)" /><circle cx="200" cy="222" r="16" fill="#ff9a4a" opacity=".35" /></g>
            <g stroke="#9fd8ef" strokeWidth="2" fill="none" className="duel-diffuse">
              <path d="M40 215H120" /><path d="M360 215H280" /><path d="M200 50V130" /><path d="M200 380V300" /><path d="M85 100L140 155" /><path d="M315 100L260 155" /><path d="M85 330L140 275" /><path d="M315 330L260 275" />
            </g>
            <rect x="186" y="236" width="28" height="6" rx="2" fill="#c9d4dd" />
          </svg>
          <figcaption><b>~0 g · still air, no fan</b><span>With almost no buoyancy, oxygen arrives mainly by slow diffusion, so the flame can become rounder, dimmer and bluer.</span></figcaption>
        </figure>
      </div>
      <p className="duel-note" data-reveal>Both drawings are teaching illustrations of still air, not NASA footage or simulations. For a real recorded test with opposed airflow, see <Link href={recordHref}>the B20 exhibit</Link>.</p>
    </div>
  </section>;
}

/** Invitation into the 3D training bay (home, mission map, BASS-II briefings). The mission stays gated; the tour is labelled illustrative. */
export function BayTeaser({ compact = false }: { compact?: boolean }) {
  return <section className="bay-teaser" data-compact={compact || undefined} aria-labelledby="bay-teaser-title">
    <div className="bay-teaser-scene" aria-hidden="true"><i /></div>
    <div className={compact ? 'bay-teaser-body' : 'wrap bay-teaser-body'}>
      <div className="bay-teaser-copy" data-reveal>
        <p className="eyebrow">Mission 02 · BASS-II training bay</p>
        <h2 id="bay-teaser-title">Step inside the <em>training bay.</em></h2>
        <p className="lede">A cinematic 3D bay built around a schematic model of the BASS-II flow duct, with an open chamber gantry, a jointed inspection arm, an astronaut at the window and PIX as your guide. Tour it now. The mission&apos;s gameplay opens once its server integration is approved.</p>
        <ul className="bay-teaser-chips"><li>Real-time 3D</li><li>Full-screen inspection</li><li>Optional lab sound and narration</li></ul>
        <div className="actions">
          <Link className="btn btn-primary" href={BAY_TOUR}>Tour the training bay <span aria-hidden="true">→</span></Link>
          {!compact && <Link className="text-link" href="/missions/bass-assembly">Mission briefing</Link>}
        </div>
        <p className="bay-teaser-note">Illustrative scene rendered from MicroFire&apos;s own 3D bench. Not NASA imagery.</p>
      </div>
    </div>
  </section>;
}

export function PixIntro() {
  return <section className="pix-intro" aria-labelledby="pix-intro-title">
    <div className="wrap pix-intro-grid">
      <div className="pix-orbit" data-reveal aria-hidden="true">
        <i className="orbit o1" /><i className="orbit o2" /><i className="orbit o3" />
        <PixStage className="pix-stage-hero" />
      </div>
      <div data-reveal>
        <p className="eyebrow">Your evidence companion</p>
        <h2 id="pix-intro-title">Meet PIX. <em>It shows its sources.</em></h2>
        <p className="lede">PIX is a small, curious research robot. Ask it about fire in space and it answers only from admitted NASA records, with the exact page each fact came from. When the evidence runs out, PIX says so.</p>
        <ul className="pix-promises">
          <li><b>Cites every fact</b><span>Page-level NASA citations</span></li>
          <li><b>Admits gaps</b><span>“Not established” is a real answer</span></li>
          <li><b>Never guesses</b><span>No AI model invents the answer</span></li>
        </ul>
        <div className="actions"><Link className="btn btn-primary" href="/ask">Ask PIX a question <span aria-hidden="true">→</span></Link></div>
      </div>
    </div>
  </section>;
}

export function TrustStrip({ admitted, sources, quarantined }: { admitted: number; sources: number; quarantined: number }) {
  return <section className="trust-strip" aria-label="What the observatory holds today">
    <div className="wrap">
      <dl data-reveal>
        <div><dt>Admitted experiment</dt><dd>{admitted}</dd></div>
        <div><dt>NASA source</dt><dd>{sources}</dd></div>
        <div><dt>Legacy records in quarantine</dt><dd>{quarantined}</dd></div>
      </dl>
      <p data-reveal>Everything you can open here is traced to a NASA page. Records that have not been checked stay locked away, never shown as evidence. <Link href="/methodology">How we check</Link></p>
    </div>
  </section>;
}
