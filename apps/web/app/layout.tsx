import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'MicroFire-V2 · Phase Zero', description: 'A source-grounded combustion research foundation. Independent educational project.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip" href="#main">Skip to content</a>
    <header><Link className="brand" href="/">MicroFire <span>V2</span></Link><nav aria-label="Main navigation"><Link href="/atlas">Evidence</Link><Link href="/sources">Sources</Link><Link href="/roadmap">Progress</Link></nav></header>
    <main id="main">{children}</main>
    <footer>Independent educational research project. No NASA endorsement or operational fire-safety certification.</footer>
  </body></html>;
}
