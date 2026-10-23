import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Next, Big_Shoulders, Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google';
import { ProtoSwitch } from '../../components/proto/switch';
import { requireReviewRoute } from '../../lib/review-routes';

// Art-direction review surfaces for the owner: two complete alternatives built from real MicroFire content.
// Local review only: MICROFIRE_DESIGN_REVIEW=1 on a loopback, non-hosted server (lib/review-routes.ts; every page
// re-checks). Never indexed, not linked from the site. Fonts are self-hosted by next/font at build time, so the page
// CSP (font-src 'self') is unchanged.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Design review', template: '%s · Design review' }, robots: { index: false, follow: false } };

const shoulders = Big_Shoulders({ subsets: ['latin'], variable: '--f-shoulders', display: 'swap' });
const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-plex', display: 'swap' });
const plexCond = IBM_Plex_Sans_Condensed({ subsets: ['latin'], weight: ['500', '600'], variable: '--f-plex-cond', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-plex-mono', display: 'swap' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--f-bricolage', display: 'swap', axes: ['wdth', 'opsz'] });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--f-atkinson', display: 'swap' });

export default async function DesignLayout({ children }: { children: React.ReactNode }) {
  await requireReviewRoute('MICROFIRE_DESIGN_REVIEW');
  return <div className={[shoulders, plex, plexCond, plexMono, bricolage, atkinson].map((f) => f.variable).join(' ')}>
    {children}
    <ProtoSwitch />
  </div>;
}
