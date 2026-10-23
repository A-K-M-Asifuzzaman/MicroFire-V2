'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './switch.css';

const screens = [['', 'Home'], ['/lab', 'Laboratory'], ['/b20', 'B20 research']] as const;

/** Review chrome, not part of either design: flip between A and B on the same screen. */
export function ProtoSwitch() {
  const path = usePathname() ?? '/design';
  const m = /^\/design\/(a|b)(\/lab|\/b20)?/.exec(path);
  const variant = m?.[1], screen = m?.[2] ?? '';
  return <nav className="proto-switch" aria-label="Design review">
    <span className="proto-switch-tag">Design review</span>
    {(['a', 'b'] as const).map((v) => <Link key={v} href={`/design/${v}${screen}`} aria-current={v === variant ? 'page' : undefined}>{v === 'a' ? 'A · Orbital' : 'B · Adventure'}</Link>)}
    <span className="proto-switch-sep" aria-hidden="true" />
    {variant && screens.map(([s, label]) => <Link key={s} href={`/design/${variant}${s}`} aria-current={s === screen ? 'page' : undefined}>{label}</Link>)}
    <Link href="/">Current site</Link>
  </nav>;
}
