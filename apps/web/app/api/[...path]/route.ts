import { createPreviewHandler } from '../../../lib/game-preview';
import { apiLimiter, readApiLimited, writeApi } from '../../../lib/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const previewApi = createPreviewHandler(apiLimiter);
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, { params }: Context) {
  const path=(await params).path;
  if(path[0]==='game'&&path[1]==='preview')return previewApi(path.slice(2),request);
  return readApiLimited(path, new URL(request.url));
}
export async function POST(request: Request, { params }: Context) {
  const path=(await params).path;
  if(path[0]==='game'&&path[1]==='preview')return previewApi(path.slice(2),request);
  return writeApi(path, request);
}
