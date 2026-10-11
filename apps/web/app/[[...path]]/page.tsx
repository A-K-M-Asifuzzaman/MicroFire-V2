import { Foundation } from '../../components/foundation';
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  return <Foundation path={`/${path?.join('/') ?? ''}`} />;
}
