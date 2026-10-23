import Link from 'next/link';
export default function NotFound() {
  return <div className="wrap state-page">
    <p className="eyebrow">404 · No record at this address</p>
    <h1>Record or route not found</h1>
    <p className="lede">No scientific record was invented for this address. Quarantined legacy candidates are never served as evidence.</p>
    <div className="actions"><Link className="btn btn-primary" href="/atlas">Browse admitted experiments</Link><Link className="btn btn-quiet" href="/">Return home</Link></div>
  </div>;
}
