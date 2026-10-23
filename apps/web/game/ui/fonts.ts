import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';

// The training bay's type (from Design B): Bricolage Grotesque for names, headings and controls; Atkinson Hyperlegible
// Next for reading. Self-hosted by next/font at build time, so the page CSP (font-src 'self') is unchanged.
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--f-bricolage', display: 'swap', axes: ['wdth', 'opsz'] });
const body = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--f-atkinson', display: 'swap', adjustFontFallback: false }); // next/font has no fallback metrics for it
export const m2Fonts = `${display.variable} ${body.variable}`;
