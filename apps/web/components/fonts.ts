import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';

// Design B type, site-wide: Bricolage Grotesque (condensed, heavy) for headings, names and controls; Atkinson
// Hyperlegible Next for reading. Self-hosted by next/font at build time, so the page CSP (font-src 'self') is unchanged.
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--f-bricolage', display: 'swap', axes: ['wdth', 'opsz'] });
const body = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--f-atkinson', display: 'swap', adjustFontFallback: false }); // next/font has no fallback metrics for it
export const siteFonts = `${display.variable} ${body.variable}`;
