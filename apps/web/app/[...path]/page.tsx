import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { features } from '@microfire/shared';
import { LabPage, MethodologyPage, RoadmapPage, SourcesPage, StatusPage } from '../../components/static-pages';

// Remaining registry routes without dedicated folders. Anything else is a real 404 (no streamed soft not-found).
const own = new Set(['/', '/atlas', '/experiments/[id]', '/dashboard', '/ask', '/gaps', '/compare', '/passport', '/missions', '/lab']);
const routes = features.filter((f) => !own.has(f.route) && !f.route.startsWith('/missions/'));
export const dynamicParams = false;
export function generateStaticParams() { return routes.map((f) => ({ path: f.route.slice(1).split('/') })); }
type Props = { params: Promise<{ path: string[] }> };
const find = async (params: Props['params']) => { const path = `/${(await params).path.join('/')}`; return routes.find((f) => f.route === path); };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const f = await find(params); return f ? { title: f.title } : {}; }
export default async function Page({ params }: Props) {
  const f = await find(params);
  if (!f) notFound();
  const pages: Record<string, () => React.ReactNode> = { '/sources': SourcesPage, '/methodology': MethodologyPage, '/roadmap': RoadmapPage, '/lab': LabPage };
  return Object.hasOwn(pages, f.route) ? pages[f.route]!() : <StatusPage f={f} />;
}
