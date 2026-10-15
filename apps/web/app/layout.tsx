import type { Metadata, Viewport } from 'next';
import { Shell } from '../components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'MicroFire · The Living Science Observatory', template: '%s · MicroFire' },
  description: 'Trace NASA combustion evidence from source page to observation to limitation. Independent educational project; not NASA-endorsed.'
};
export const viewport: Viewport = { themeColor: '#0b111a' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Shell>{children}</Shell></body></html>;
}
