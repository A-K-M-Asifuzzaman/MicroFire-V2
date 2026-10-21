import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@microfire/shared', '@microfire/science', '@microfire/game-core'],
  poweredByHeader: false,
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ];
    return [
      // Pages: unchanged P0 policy. `next dev` alone also needs eval for its module loader; production builds never get it. (inline allowed for Next hydration until a nonce CSP is agreed with the UI owner).
      { source: '/((?!api/).*)', headers: [...common, { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` }] },
      // API: JSON data only, nothing to render or execute.
      { source: '/api/:path*', headers: [...common, { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" }, { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }] }
    ];
  }
};
export default config;
