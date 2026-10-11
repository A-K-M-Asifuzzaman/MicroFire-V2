import { readApiLimited, writeApi } from '../../../lib/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, { params }: Context) {
  return readApiLimited((await params).path, new URL(request.url));
}
export async function POST(request: Request, { params }: Context) {
  return writeApi((await params).path, request);
}
