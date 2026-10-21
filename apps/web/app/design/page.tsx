import Link from 'next/link';

export const metadata = { title: 'Choose a direction' };
/** Review index: two complete alternatives on the same real content. Neither replaces the current site yet. */
export default function Page() {
  const cell = { display: 'grid', gap: 6, padding: 24, borderRadius: 10, textDecoration: 'none', color: '#111', background: '#fff', border: '1px solid #ddd' } as const;
  return <div style={{ minHeight: '100svh', padding: '8vh 24px', background: '#f3f4f6', font: '16px/1.5 system-ui, sans-serif', color: '#111' }}>
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 18 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>MicroFire art direction: two alternatives</h1>
      <p style={{ margin: 0, color: '#555' }}>Both use the real B20 record, the real equipment specification and the current Meshy models. Pick one to propagate across the site.</p>
      {([['a', 'A · Cinematic orbital observatory', 'A 3D-first exhibit hall in titanium and graphite. Light carries meaning; the interface is engraved plates.'],
        ['b', 'B · Living science adventure', 'A bright illustrated 2D/3D hybrid. Expressive PIX, sticker-like components, an accessible bold type system.']] as const).map(([v, t, d]) =>
        <div key={v} style={{ ...cell }}>
          <b style={{ fontSize: 20 }}>{t}</b><span style={{ color: '#555' }}>{d}</span>
          <span style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <Link href={`/design/${v}`}>Home</Link><Link href={`/design/${v}/lab`}>Laboratory</Link><Link href={`/design/${v}/b20`}>B20 research</Link>
          </span>
        </div>)}
    </div>
  </div>;
}
