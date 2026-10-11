'use client';
export default function ErrorBoundary({ reset }: { reset: () => void }) { return <><h1>Evidence could not be loaded</h1><p>The source catalog is temporarily unavailable.</p><button onClick={reset}>Retry</button></>; }
