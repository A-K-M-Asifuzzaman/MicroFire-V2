import {canonicalJson,parsePreviewJson} from './canonical';
import {CheckpointPayloadSchema,LocalSlotSchema,SnapshotSchema,PreviewUuidSchema} from './training-schemas';
import type {CheckpointPayload,LocalSlot,SaveConflictCode,Snapshot} from './training';

export const PREVIEW_SAVE_KEY='microfire-v2:m2-preview:checkpoint:v1:demo';
export const PREVIEW_SAVE_LOCK='microfire-v2:m2-preview:save:v1';
type Refused={ok:false;code:Exclude<SaveConflictCode,'LOCAL_WRITE_FAILED'|'LOCAL_LOCK_BUSY'>};
export type LocalAdmissionResult={ok:true;slot:LocalSlot;serialized:string;unchanged:boolean}|Refused;
export type LocalAdmissionOptions={
  raw:string|null;expectedEpoch:string|null;expectedGeneration:number;newEpoch:string;
  engineConsistencyAccepted:boolean;storageAvailable:boolean;
};
export type ReplaceConsent={confirmation:'replace-after-backup';expectedRaw:string;expectedEpoch:string;expectedGeneration:number};
const bytes=(text:string)=>new TextEncoder().encode(text).byteLength;
const no=(code:Refused['code']):Refused=>({ok:false,code});
/** Structural inspection only. A browser cannot verify the MAC; the resume endpoint is the trust boundary. */
export function inspectPreviewCheckpoint(token:string):CheckpointPayload {
  if(token.length>27351)throw Error('Oversized checkpoint');const [body,mac,...extra]=token.split('.');
  if(!body||!mac||extra.length||!/^[A-Za-z0-9_-]+$/.test(body)||!/^[A-Za-z0-9_-]{43}$/.test(mac))throw Error('Invalid checkpoint encoding');
  const binary=atob(body.replace(/-/g,'+').replace(/_/g,'/'));
  if(binary.length>20480||btoa(binary).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')!==body)throw Error('Noncanonical checkpoint');
  const signature=atob(mac.replace(/-/g,'+').replace(/_/g,'/'));if(signature.length!==32||btoa(signature).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')!==mac)throw Error('Noncanonical signature');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0))),value=parsePreviewJson(text);
  if(canonicalJson(value)!==text)throw Error('Noncanonical JSON');const parsed=CheckpointPayloadSchema.parse(value);if(canonicalJson(parsed)!==text)throw Error('Checkpoint validation changed saved fields');return parsed;
}
export function inspectLocalSlot(raw:string):LocalSlot {
  if(bytes(raw)>28000)throw Error('Oversized local slot');const slot=LocalSlotSchema.parse(parsePreviewJson(raw));
  if(slot.head){const p=inspectPreviewCheckpoint(slot.head.checkpoint);if(p.sessionId!==slot.head.sessionId||p.revision!==slot.head.revision)throw Error('Head mismatch');}
  return slot;
}
function capability(o:LocalAdmissionOptions):Refused|null {
  if(!o.engineConsistencyAccepted)return no('LOCAL_READ_ONLY');
  if(!o.storageAvailable)return no('LOCAL_STORAGE_UNAVAILABLE');
  if(!Number.isSafeInteger(o.expectedGeneration)||o.expectedGeneration<0)return no('LOCAL_GENERATION_CHANGED');
  return null;
}
function admitted(slot:LocalSlot,unchanged:boolean):LocalAdmissionResult {
  const serialized=canonicalJson(slot);if(bytes(serialized)>28000)return no('LOCAL_NEEDS_REVIEW');
  return {ok:true,slot,serialized,unchanged};
}
/** Call only under the exclusive Web Lock, using a freshly confirmed server response, never local JSON. */
export function admitLocalSave(o:LocalAdmissionOptions&{candidate:Snapshot;serverVerifiedCheckpoint:string;catalogSha256:string;replaceConsent?:ReplaceConsent}):LocalAdmissionResult {
  const unavailable=capability(o);if(unavailable)return unavailable;
  let slot:LocalSlot|null;
  try{slot=o.raw===null?null:inspectLocalSlot(o.raw);}catch{return no('LOCAL_NEEDS_REVIEW');}
  const parsed=SnapshotSchema.safeParse(o.candidate);if(!parsed.success)return no('LOCAL_NEEDS_REVIEW');const s=parsed.data;
  if(o.serverVerifiedCheckpoint!==s.checkpoint||s.evidenceReview.catalogSha256!==o.catalogSha256||!['empty','lineage-verified'].includes(s.evidenceReview.status)||s.evidenceReview.entries.some(e=>e.status!=='lineage-verified'||e.issues.length))return no('LOCAL_NEEDS_REVIEW');
  if(canonicalJson(s.evidenceReview.entries.map(e=>e.entryId))!==canonicalJson(s.state.passport.entries.map(e=>e.id)))return no('LOCAL_NEEDS_REVIEW');
  try{const p=inspectPreviewCheckpoint(s.checkpoint);if(p.sessionId!==s.sessionId||p.revision!==s.revision||p.catalogSha256!==o.catalogSha256||canonicalJson(p.state)!==canonicalJson(s.state)||canonicalJson(p.training)!==canonicalJson(s.training))return no('LOCAL_NEEDS_REVIEW');}catch{return no('LOCAL_NEEDS_REVIEW');}
  const current=slot?.head;
  if(current?.sessionId===s.sessionId){
    if(current.revision>s.revision)return no('LOCAL_NEWER');
    if(current.revision===s.revision)return current.checkpoint===s.checkpoint?admitted(slot!,true):no('LOCAL_SAME_REVISION_CONFLICT');
  }
  if((slot?.epoch??null)!==o.expectedEpoch||(slot?.generation??0)!==o.expectedGeneration)return no('LOCAL_GENERATION_CHANGED');
  if(current&&current.sessionId!==s.sessionId){const consent=o.replaceConsent;if(!consent||consent.confirmation!=='replace-after-backup'||consent.expectedRaw!==o.raw||consent.expectedEpoch!==slot!.epoch||consent.expectedGeneration!==slot!.generation)return no('LOCAL_DIFFERENT_CASE');}
  if(slot?.generation===Number.MAX_SAFE_INTEGER)return no('LOCAL_READ_ONLY');
  const epoch=slot?.epoch??o.newEpoch;if(!PreviewUuidSchema.safeParse(epoch).success)return no('LOCAL_NEEDS_REVIEW');
  return admitted({storageVersion:1,epoch,generation:(slot?.generation??0)+1,head:{sessionId:s.sessionId,revision:s.revision,checkpoint:s.checkpoint}},false);
}
/** This produces a tombstone only; Claude's adapter must write and verify it before reporting Saved. */
export function admitLocalDiscard(o:LocalAdmissionOptions&{confirmation:'discard-preview-save-after-export';expectedRaw:string|null}):LocalAdmissionResult {
  const unavailable=capability(o);if(unavailable)return unavailable;
  if(o.confirmation!=='discard-preview-save-after-export'||o.expectedRaw!==o.raw)return no('LOCAL_NEEDS_REVIEW');
  let slot:LocalSlot|null;try{slot=o.raw===null?null:inspectLocalSlot(o.raw);}catch{
    if(!PreviewUuidSchema.safeParse(o.newEpoch).success||o.newEpoch===o.expectedEpoch)return no('LOCAL_NEEDS_REVIEW');
    return admitted({storageVersion:1,epoch:o.newEpoch,generation:1,head:null},false);
  }
  if((slot?.epoch??null)!==o.expectedEpoch||(slot?.generation??0)!==o.expectedGeneration)return no('LOCAL_GENERATION_CHANGED');
  if(slot?.generation===Number.MAX_SAFE_INTEGER)return no('LOCAL_READ_ONLY');
  const epoch=slot?.epoch??o.newEpoch;if(!PreviewUuidSchema.safeParse(epoch).success)return no('LOCAL_NEEDS_REVIEW');
  return admitted({storageVersion:1,epoch,generation:(slot?.generation??0)+1,head:null},false);
}
