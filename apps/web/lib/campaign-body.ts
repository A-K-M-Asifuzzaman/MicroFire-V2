import 'server-only';
import { campaignJson, parsePreviewJson } from '@microfire/shared';
import { PreviewFailure } from './game-preview-security';

// Private transport candidate only; no route imports this reader before credential/HTTP review.
export const CAMPAIGN_BODY_LIMITS = { authorize: 1024, revoke: 1024, start: 1024, action: 65536, resume: 176128 } as const;
export async function readCampaignBody(request: Request, route: keyof typeof CAMPAIGN_BODY_LIMITS): Promise<unknown> {
  if (!Object.hasOwn(CAMPAIGN_BODY_LIMITS, route)) throw new PreviewFailure(404, 'NOT_FOUND', 'Unknown campaign body route.');
  const limit = CAMPAIGN_BODY_LIMITS[route];
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json')
    throw new PreviewFailure(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.');
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length))))
    throw new PreviewFailure(400, 'INVALID_REQUEST', 'Invalid body length.');
  if (length !== null && Number(length) > limit) throw new PreviewFailure(413, 'PAYLOAD_TOO_LARGE', 'Campaign request exceeds its byte budget.');
  const reader = request.body?.getReader();
  if (!reader) throw new PreviewFailure(400, 'INVALID_REQUEST', 'A JSON body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) { await reader.cancel(); throw new PreviewFailure(413, 'PAYLOAD_TOO_LARGE', 'Campaign request exceeds its byte budget.'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value = parsePreviewJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    campaignJson(value); // Reject overflowed numbers without rejecting calibrated decimal conditions.
    return value;
  } catch { throw new PreviewFailure(400, 'INVALID_REQUEST', 'Malformed or ambiguous campaign JSON.'); }
}
