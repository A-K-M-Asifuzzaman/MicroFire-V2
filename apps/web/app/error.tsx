'use client';
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <div className="wrap state-page" role="alert">
    <p className="eyebrow">Something interrupted the evidence</p>
    <h1>Evidence could not be loaded</h1>
    <p className="lede">The source catalog is temporarily unavailable. Nothing was guessed in its place.</p>
    <button className="btn btn-primary" onClick={reset}>Retry</button>
  </div>;
}
