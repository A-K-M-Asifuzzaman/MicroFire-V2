import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {admitLocalSave,admitLocalDiscard,inspectLocalSlot,canonicalJson,type Snapshot,type LocalAdmissionOptions,PREVIEW_SAVE_KEY} from '@microfire/shared';
const epoch='55555555-5555-4555-8555-555555555555',otherEpoch='66666666-6666-4666-8666-666666666666';
const fixture=(name:string):Snapshot=>{const d=JSON.parse(readFileSync('docs/m2/fixtures/'+name+'.example.json','utf8')).data;return d.snapshot??d;};
const pending=fixture('PENDING_REPAIR_A'),review=fixture('PASSPORT_REVIEW_RESPONSE');
const options:LocalAdmissionOptions={raw:null,expectedEpoch:null,expectedGeneration:0,newEpoch:epoch,engineConsistencyAccepted:true,storageAvailable:true};
const save=(s:Snapshot,o:Partial<LocalAdmissionOptions>={})=>admitLocalSave({...options,...o,candidate:s,serverVerifiedCheckpoint:s.checkpoint,catalogSha256:s.evidenceReview.catalogSha256});
function changed(s:Snapshot,edit:(p:Record<string,unknown>)=>void):Snapshot {
  const copy=structuredClone(s),p=JSON.parse(Buffer.from(s.checkpoint.split('.')[0]!,'base64url').toString());edit(p);
  const raw=Buffer.from(canonicalJson(p));copy.checkpoint=raw.toString('base64url')+'.'+createHmac('sha256',Buffer.alloc(32,7)).update('microfire-m2-checkpoint-v1\0').update(raw).digest('base64url');copy.sessionId=p.sessionId;return copy;
}
it('admits one isolated slot and does not claim I/O success; repeated exact save is idempotent',()=>{
  expect(PREVIEW_SAVE_KEY).toBe('microfire-v2:m2-preview:checkpoint:v1:demo');
  const first=save(pending);expect(first.ok).toBe(true);if(!first.ok)throw Error('save');
  expect(first.slot.generation).toBe(1);expect(inspectLocalSlot(first.serialized)).toEqual(first.slot);expect(first).not.toHaveProperty('savedOnDevice');
  const repeated=save(pending,{raw:first.serialized,expectedEpoch:null,expectedGeneration:0});expect(repeated.ok&&repeated.unchanged).toBe(true);expect(repeated.ok&&repeated.slot.generation).toBe(1);
});
it('refuses older revisions, same-revision competing tokens and stale generation without overwriting',()=>{
  const first=save(pending);if(!first.ok)throw Error('save');
  const next=save(review,{raw:first.serialized,expectedEpoch:epoch,expectedGeneration:1});expect(next.ok).toBe(true);if(!next.ok)throw Error('save');
  expect(save(pending,{raw:next.serialized,expectedEpoch:epoch,expectedGeneration:1})).toEqual({ok:false,code:'LOCAL_NEWER'});
  expect(save(review,{raw:first.serialized,expectedEpoch:epoch,expectedGeneration:0})).toEqual({ok:false,code:'LOCAL_GENERATION_CHANGED'});
  const competing=changed(pending,p=>{p.issuedAt='2026-10-16T10:00:01.000Z';});expect(save(competing,{raw:first.serialized,expectedEpoch:epoch,expectedGeneration:1})).toEqual({ok:false,code:'LOCAL_SAME_REVISION_CONFLICT'});
});
it('serializes simultaneous admission orders and requires raw-bound consent for a different case',()=>{
  const first=save(pending);if(!first.ok)throw Error('save');
  const o={raw:first.serialized,expectedEpoch:epoch,expectedGeneration:1};const newer=save(review,o);if(!newer.ok)throw Error('save');
  expect(save(review,{...o,raw:newer.serialized}).ok).toBe(true); // Exact same checkpoint is an idempotent read-back.
  const other=changed(review,p=>{p.sessionId='77777777-7777-4777-8777-777777777777';});
  expect(save(other,o)).toEqual({ok:false,code:'LOCAL_DIFFERENT_CASE'});
  const replace=admitLocalSave({...options,...o,candidate:other,serverVerifiedCheckpoint:other.checkpoint,catalogSha256:other.evidenceReview.catalogSha256,replaceConsent:{confirmation:'replace-after-backup',expectedRaw:first.serialized,expectedEpoch:epoch,expectedGeneration:1}});expect(replace.ok).toBe(true);
  if(!replace.ok)throw Error('replace');expect(save(pending,{...o,raw:replace.serialized})).toEqual({ok:false,code:'LOCAL_GENERATION_CHANGED'});
});
it('retains tombstones and blocks delayed autosave after discard or epoch rotation',()=>{
  const first=save(pending);if(!first.ok)throw Error('save');
  const discarded=admitLocalDiscard({...options,raw:first.serialized,expectedRaw:first.serialized,expectedEpoch:epoch,expectedGeneration:1,confirmation:'discard-preview-save-after-export'});expect(discarded.ok).toBe(true);if(!discarded.ok)throw Error('discard');expect(discarded.slot).toMatchObject({epoch,generation:2,head:null});
  expect(save(pending,{raw:discarded.serialized,expectedEpoch:epoch,expectedGeneration:1})).toEqual({ok:false,code:'LOCAL_GENERATION_CHANGED'});
  const corrupt='{corrupt raw';expect(save(pending,{raw:corrupt})).toEqual({ok:false,code:'LOCAL_NEEDS_REVIEW'});
  const recovery=admitLocalDiscard({...options,raw:corrupt,expectedRaw:corrupt,expectedEpoch:epoch,expectedGeneration:1,newEpoch:otherEpoch,confirmation:'discard-preview-save-after-export'});expect(recovery.ok&&recovery.slot).toEqual({storageVersion:1,epoch:otherEpoch,generation:1,head:null});
  if(!recovery.ok)throw Error('discard');expect(save(pending,{raw:recovery.serialized,expectedEpoch:epoch,expectedGeneration:1})).toEqual({ok:false,code:'LOCAL_GENERATION_CHANGED'});
  expect(admitLocalDiscard({...options,raw:corrupt,expectedRaw:'different',confirmation:'discard-preview-save-after-export'})).toEqual({ok:false,code:'LOCAL_NEEDS_REVIEW'});
});
it('uses read-only fallback, exact verified token/lineage and safe integer boundaries',()=>{
  expect(save(review,{engineConsistencyAccepted:false})).toEqual({ok:false,code:'LOCAL_READ_ONLY'});expect(save(review,{storageAvailable:false})).toEqual({ok:false,code:'LOCAL_STORAGE_UNAVAILABLE'});
  expect(admitLocalSave({...options,candidate:review,serverVerifiedCheckpoint:pending.checkpoint,catalogSha256:review.evidenceReview.catalogSha256})).toEqual({ok:false,code:'LOCAL_NEEDS_REVIEW'});
  const bad=structuredClone(review);bad.evidenceReview.status='rejected';expect(save(bad)).toEqual({ok:false,code:'LOCAL_NEEDS_REVIEW'});
  const omitted=changed(review,p=>{const state=p.state as {passport:{entries:{learnerNotes?:string[]}[]}};delete state.passport.entries[0]!.learnerNotes;});expect(save(omitted)).toEqual({ok:false,code:'LOCAL_NEEDS_REVIEW'});
  const wrong=structuredClone(review);wrong.training.diagnosis!.faultyRevision=999;expect(save(wrong)).toEqual({ok:false,code:'LOCAL_NEEDS_REVIEW'});
  const max=canonicalJson({storageVersion:1,epoch,generation:Number.MAX_SAFE_INTEGER,head:{sessionId:pending.sessionId,revision:pending.revision,checkpoint:pending.checkpoint}});
  expect(save(review,{raw:max,expectedEpoch:epoch,expectedGeneration:Number.MAX_SAFE_INTEGER})).toEqual({ok:false,code:'LOCAL_READ_ONLY'});
});
