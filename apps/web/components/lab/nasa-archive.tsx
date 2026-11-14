// NASA material behind the Flame Lab, in three labelled tiers (server component).
import Link from 'next/link';
import type { B20Facts, Investigation, NasaMedia } from '../../lib/lab-nasa';

const PHASE: Record<string, string> = { solid: 'Solid fuel', 'liquid-droplet': 'Liquid droplets', gas: 'Gaseous fuel' };

export function NasaArchive({ b20, media, programs }: { b20: B20Facts; media: NasaMedia[]; programs: Investigation[] }) {
  const o2 = b20.conditions.find((c) => c.label === 'Calibrated oxygen'), flow = b20.conditions.find((c) => c.label === 'Initial airflow');
  return <section className="nasa" aria-labelledby="nasa-h">
    <header className="nasa-head">
      <p className="eyebrow">NASA data behind the lab</p>
      <h2 id="nasa-h">From real space experiments to the toy chamber</h2>
      <p className="lede">Three kinds of NASA material, never mixed: one <b>verified observation</b>, NASA <b>descriptions</b> of what each investigation studied, and NASA <b>photos and video</b> of real space fires with NASA&apos;s own captions.</p>
      <ul className="nasa-key" aria-label="How to read this section">
        <li><span className="lab-kind" data-kind="observed">verified observation</span> checked cell by cell against the NASA report</li>
        <li><span className="lab-kind" data-kind="description">NASA description</span> what an investigation set out to study; not a measured result</li>
        <li><span className="lab-kind" data-kind="media">NASA media</span> photo or video with NASA&apos;s caption; not measured by MicroFire</li>
      </ul>
    </header>

    <article className="nasa-hero" aria-labelledby="nasa-b20-h">
      <div>
        <span className="lab-kind" data-kind="observed">verified observation</span>
        <h3 id="nasa-b20-h">BASS-II test B20, International Space Station</h3>
        <p className="nasa-quote">{b20.observation}</p>
        <p className="mf-fine">Source: <a href={b20.href} target="_blank" rel="noreferrer">{b20.citation}</a></p>
      </div>
      <dl className="nasa-stats">
        <div><dt>Calibrated oxygen</dt><dd>{o2?.value ?? 'unknown'}</dd></div>
        <div><dt>Initial airflow</dt><dd>{flow?.value ?? 'unknown'}</dd></div>
        <div><dt>Recorded conditions</dt><dd>{b20.conditions.filter((c) => c.known).length} of {b20.conditions.length}</dd></div>
        <div><dt>Pressure and run gravity</dt><dd>not reported</dd></div>
      </dl>
      <div className="actions"><Link className="btn btn-primary btn-sm" href="/experiments/bass2-b20">Open the full B20 record</Link><Link className="btn btn-sm" href="/proof">60-second proof</Link></div>
    </article>

    <div className="nasa-programs">
      <h3>Four NASA investigations in the library</h3>
      <ol className="nasa-timeline">
        {programs.map((p) => <li key={p.id} data-phase={p.fuelPhase}>
          <span className="nasa-dot" aria-hidden="true" />
          <div className="nasa-card">
            <p className="nasa-card-top"><b>{p.program}</b><span className="lab-kind" data-kind="description">NASA description</span>{p.admitted > 0 && <span className="lab-kind" data-kind="observed">{p.admitted} verified record</span>}</p>
            <p className="nasa-card-title">{p.title}</p>
            <p>{p.focus}</p>
            <p className="mf-fine">{PHASE[p.fuelPhase] ?? p.fuelPhase} · {p.platform} · <a href={p.href} target="_blank" rel="noreferrer">NASA report ↗</a></p>
          </div>
        </li>)}
      </ol>
      <p className="mf-fine">Only BASS-II test B20 is admitted as evidence today. 55 legacy rows stay quarantined until each is checked against its NASA source, and three FLEX rows await independent review. <Link href="/investigations">Open the investigation library</Link>.</p>
    </div>

    <div className="nasa-media">
      <h3>Real fires in space: NASA photos and video</h3>
      <div className="nasa-gallery">
        {media.map((m) => <figure key={m.slug} className="nasa-item" data-kind={m.kind}>
          {m.kind === 'video'
            ? <video controls preload="none" playsInline poster={m.poster ?? undefined} width={m.width} height={m.height} aria-label={`NASA video: ${m.title}`}><source src={m.src} type="video/mp4" /></video>
            : <img src={m.src} alt={`NASA photo: ${m.title}`} width={m.width} height={m.height} loading="lazy" />}
          <figcaption>
            <p className="nasa-card-top"><b>{m.title}</b><span className="lab-kind" data-kind="media">NASA media</span></p>
            <p className="nasa-cap">{m.caption}</p>
            <p className="mf-fine">{m.date} · Credit: NASA · <a href={m.page} target="_blank" rel="noreferrer">images.nasa.gov ↗</a></p>
          </figcaption>
        </figure>)}
      </div>
      <p className="mf-fine">NASA media is used for education under NASA&apos;s media guidelines; no endorsement implied. These pictures show real experiments, but MicroFire takes no measurements from them.</p>
    </div>
  </section>;
}
