import { apiError, readApi, writeApi } from '../../../lib/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, { params }: Context) {
  try { return readApi((await params).path, new URL(request.url)); }
  catch { return apiError(500, 'INTERNAL_ERROR', 'The catalog could not be read.'); }
}
export async function POST(request: Request, { params }: Context) {
  return writeApi((await params).path, request);
}
