import type { Metadata, Viewport } from 'next';
import { features } from '@microfire/shared';
import { siteFonts } from '../components/fonts';
import { Shell } from '../components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'MicroFire · The Living Science Observatory', template: '%s · MicroFire' },
  description: 'Trace NASA combustion evidence from source page to observation to limitation. Independent educational project; not NASA-endorsed.'
};
export const viewport: Viewport = { themeColor: '#2a2bd6' };
// Destinations with no working tool yet say so in the navigation (research tools are implemented for review).
const tags = Object.fromEntries(['/lab', '/missions'].flatMap((route) => {
  const state = features.find((f) => f.route === route)?.state;
  return state === 'coming_soon' ? [[route, 'Soon']] : state === 'preview' ? [[route, 'Preview']] : [];
}));
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={siteFonts}><body><Shell tags={tags}>{children}</Shell></body></html>;
}
