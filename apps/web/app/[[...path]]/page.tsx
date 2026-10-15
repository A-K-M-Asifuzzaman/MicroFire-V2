import type { Metadata } from 'next';
import { RoutePage, titleFor } from '../../components/pages';

type Props = { params: Promise<{ path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const toPath = (path?: string[]) => `/${path?.join('/') ?? ''}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = titleFor(toPath((await params).path));
  return title ? { title } : {};
}
export default async function Page({ params, searchParams }: Props) {
  return <RoutePage path={toPath((await params).path)} searchParams={await searchParams} />;
}
