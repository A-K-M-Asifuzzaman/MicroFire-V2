export default function Loading() {
  return <div className="wrap state-page" role="status" aria-live="polite">
    <p className="eyebrow">Opening the record</p>
    <p>Loading the local evidence catalog…</p>
    <div className="loading-bar" aria-hidden="true" />
  </div>;
}
