// Independent fixture conformance checks: no import of the fixture builder or its identity/presentation helpers.
import assert from 'node:assert/strict';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transition } from '@microfire/game-core';
import { GameStateSchema, type GameAction, type GameState } from '@microfire/shared';
import { catalog, validatePassport } from '@microfire/science';
import type { ActionRequest, ActionResponse, CheckpointPayload, Snapshot, StartResponse } from './contract-types';

const dir=fileURLToPath(new URL('.',import.meta.url));
const read=<T>(name:string):T=>JSON.parse(readFileSync(dir+name+'.example.json','utf8')) as T;
const fixed={runtimeId:'33333333-3333-4333-8333-333333333333',sessionId:'11111111-1111-4111-8111-111111111111'};
const observation={...fixed,expectedRevision:21,action:{type:'GAME',action:{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b20'}}} as const;
// Literal canonical bytes are an oracle for these fixed inputs, not a second runtime serializer.
const observationIntent='{"endpoint":"action","request":{"action":{"action":{"experimentId":"bass2-b20","type":"OBSERVE_DOCUMENTED_RESULT"},"type":"GAME"},"expectedRevision":21,"runtimeId":"33333333-3333-4333-8333-333333333333","sessionId":"11111111-1111-4111-8111-111111111111"}}';
const diagnosticIntent='{"endpoint":"action","request":{"action":{"type":"RUN_DIAGNOSTIC"},"expectedRevision":21,"runtimeId":"33333333-3333-4333-8333-333333333333","sessionId":"11111111-1111-4111-8111-111111111111"}}';
const completionIntent='{"endpoint":"action","request":{"action":{"action":{"missionId":"bass-assembly","type":"COMPLETE_MISSION"},"type":"GAME"},"expectedRevision":22,"runtimeId":"33333333-3333-4333-8333-333333333333","sessionId":"11111111-1111-4111-8111-111111111111"}}';
const injectionIntent='{"endpoint":"action","request":{"action":{"action":{"anchorId":"duct-exit","orientation":"correct","partId":"exit-plate","type":"INSTALL_PART"},"type":"GAME"},"expectedRevision":13,"runtimeId":"33333333-3333-4333-8333-333333333333","sessionId":"11111111-1111-4111-8111-111111111111"}}';
const hash=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
const key=Buffer.alloc(32,7); // Public example key only, never accepted by a future preview runtime.
const mac=(raw:Buffer)=>createHmac('sha256',key).update('microfire-m2-checkpoint-v1\0').update(raw).digest();
function checkpoint(s:Snapshot):CheckpointPayload {
  const segments=s.checkpoint.split('.');assert.equal(segments.length,2);
  const [body,signature]=segments as [string,string];
  assert(/^[A-Za-z0-9_-]+$/.test(body));assert(/^[A-Za-z0-9_-]{43}$/.test(signature));
  const raw=Buffer.from(body,'base64url'),sig=Buffer.from(signature,'base64url');
  assert.equal(raw.toString('base64url'),body);assert.equal(sig.toString('base64url'),signature);
  assert.equal(sig.length,32);assert(timingSafeEqual(mac(raw),sig));
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)) as CheckpointPayload;
  GameStateSchema.parse(p.state);validatePassport(p.state.passport);
  assert.deepEqual(p.state,s.state);assert.deepEqual(p.training,s.training);
  assert.equal(p.sessionId,s.sessionId);assert.equal(p.revision,s.revision);
  return p;
}
function successful(name:string):Snapshot {
  const response=read<ActionResponse>(name);assert(response.data.ok);return response.data.snapshot;
}
function core(state:GameState,action:GameAction):GameState {
  const result=transition(state,action,catalog,'2026-10-16T10:00:00.000Z',{isMissionAvailable:()=>true});
  assert(result.ok);return result.state;
}
function observationReceipt(s:Snapshot) {
  const p=checkpoint(s);
  assert.equal(s.runtimeId,fixed.runtimeId);assert.equal(s.sessionId,fixed.sessionId);
  assert.equal(p.revision,22);assert.equal(p.lastCommand.endpoint,'action');
  assert.equal(p.lastCommand.expectedRevision,21);assert.equal(p.lastCommand.commandId,hash(observationIntent));
  assert.notEqual(p.lastCommand.commandId,hash(diagnosticIntent));
  return p;
}
function replaceReceipt(s:Snapshot,change:(p:CheckpointPayload)=>void):Snapshot {
  const copy=structuredClone(s),p=checkpoint(copy);change(p);
  // A valid test MAC must not hide a false command receipt; JSON order is immaterial to this negative test.
  const raw=Buffer.from(JSON.stringify(p));copy.checkpoint=raw.toString('base64url')+'.'+mac(raw).toString('base64url');return copy;
}
const results:string[]=[];
function check(name:string,fn:()=>void){fn();results.push(name);}
const review=successful('PASSPORT_REVIEW_RESPONSE');
check('independent literal observation request, digest, signature and revision22',()=>{
  assert.deepEqual(JSON.parse(observationIntent),{endpoint:'action',request:observation});
  const p=observationReceipt(review);assert.equal(p.state.setup.revision,16);
  assert.deepEqual(read<ActionRequest>('OBSERVATION_REQUEST'),{...observation,commandId:hash(observationIntent)});
  const pending=read<StartResponse>('PENDING_REPAIR_A').data;
  let state=core(pending.state,{type:'INSTALL_PART',partId:'fan',anchorId:'duct-inlet',orientation:'correct'});
  state=core(state,{type:'QUALIFY_INSTRUMENT'});state=core(state,observation.action.action);
  assert.deepEqual(p.state,state);assert.equal(p.training.repair?.removedAtRevision,13);
  assert.equal(p.training.repair?.reinstalledAtRevision,16);
  assert(p.state.passport.entries.every(e=>e.corrections.length===0));
  assert.equal(review.passportPresentation.trainingHistory.evidenceLevel,'not-applicable');
  assert.equal(review.passportPresentation.trainingHistory.corrections.length,1);
});
check('previous command, changed request, wrong revision/state and bad signature are rejected',()=>{
  assert.throws(()=>observationReceipt(replaceReceipt(review,p=>{p.lastCommand.commandId=hash(diagnosticIntent)})));
  const altered=observationIntent.replace('OBSERVE_DOCUMENTED_RESULT','QUALIFY_INSTRUMENT');
  assert.throws(()=>observationReceipt(replaceReceipt(review,p=>{p.lastCommand.commandId=hash(altered)})));
  assert.throws(()=>observationReceipt(replaceReceipt(review,p=>{p.lastCommand.expectedRevision=20})));
  assert.throws(()=>observationReceipt(replaceReceipt(review,p=>{p.revision=21})));
  const wrongState=structuredClone(review);wrongState.state.setup.qualifiedRevision=null;
  assert.throws(()=>observationReceipt(wrongState));
  const badMac=structuredClone(review);badMac.checkpoint=badMac.checkpoint.slice(0,-1)+(badMac.checkpoint.endsWith('A')?'B':'A');
  assert.throws(()=>observationReceipt(badMac));
});
check('subsequent completion receipt and state match explicit COMPLETE action',()=>{
  const action={type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'bass-assembly'}} as const;
  assert.deepEqual(JSON.parse(completionIntent),{endpoint:'action',request:{...fixed,expectedRevision:22,action}});
  const complete=successful('COMPLETE_RESPONSE'),p=checkpoint(complete);
  assert.deepEqual(p.lastCommand,{endpoint:'action',commandId:hash(completionIntent),expectedRevision:22});
  assert.equal(p.revision,23);assert.deepEqual(p.state,core(review.state,action.action));
});
check('early qualification refusal preserves the accepted injection checkpoint and awards no progress',()=>{
  const refused=read<ActionResponse>('QUALIFICATION_REPAIR_REQUIRED_RESPONSE');assert(!refused.data.ok);
  assert.equal(refused.data.code,'REPAIR_REQUIRED');
  const injected=successful('FAULT_INJECTED_RESPONSE');assert.deepEqual(refused.data.snapshot,injected);
  const early=read<ActionResponse>('WRONG_ANCHOR_RESPONSE');assert(!early.data.ok);
  assert.equal(early.data.snapshot.training.fault,null);assert.equal(early.data.snapshot.training.diagnosticRevision,null);
  assert.equal(early.data.snapshot.diagnostic.status,'not-run');
  const p=checkpoint(refused.data.snapshot);
  assert.equal(p.revision,14);assert.equal(p.training.diagnosis,null);assert.equal(p.training.repair,null);
  assert.equal(p.state.setup.qualifiedRevision,null);assert(!p.state.completedMissions.includes('bass-assembly'));
  assert.deepEqual(p.lastCommand,{endpoint:'action',commandId:hash(injectionIntent),expectedRevision:13});
  // These are contract preconditions, not an implemented coordinator: the physical core alone lacks this guard.
  const coreRefusal=transition(p.state,{type:'QUALIFY_INSTRUMENT'},catalog,'2026-10-16T10:00:00.000Z');
  assert(!coreRefusal.ok);assert.equal(coreRefusal.code,'QUALIFICATION_FAILED');assert.equal(coreRefusal.state,p.state);
});
check('resume retains the original accepted receipt instead of recording a new command',()=>{
  const pending=read<StartResponse>('PENDING_REPAIR_A').data;
  for(const name of ['RESUME_RESPONSE','RESUME_AFTER_RESTART_RESPONSE']){
    const resumed=read<StartResponse>(name).data;assert.equal(resumed.checkpoint,pending.checkpoint);
    assert.deepEqual(checkpoint(resumed).lastCommand,checkpoint(pending).lastCommand);
  }
});
check('pending repair cannot qualify; physical qualification failure remains reachable after completed repair',()=>{
  const pending=read<StartResponse>('PENDING_REPAIR_A').data;
  assert(pending.training.diagnosis&&pending.training.pendingRepair);assert.equal(pending.training.repair,null);
  assert.equal(pending.progress.qualificationReady,false);
  const repaired=core(pending.state,{type:'INSTALL_PART',partId:'fan',anchorId:'duct-inlet',orientation:'correct'});
  assert.equal(repaired.setup.revision,review.training.repair?.reinstalledAtRevision);
  assert.equal(pending.training.pendingRepair.removedAtRevision,review.training.repair?.removedAtRevision);
  const damaged=core(repaired,{type:'REMOVE_PART',partId:'exit-plate'});
  const refused=transition(damaged,{type:'QUALIFY_INSTRUMENT'},catalog,'2026-10-16T10:00:00.000Z');
  assert(!refused.ok);assert.equal(refused.code,'QUALIFICATION_FAILED');assert.equal(refused.state,damaged);
  assert.equal(damaged.setup.qualifiedRevision,null);assert(!damaged.completedMissions.includes('bass-assembly'));
});
console.log(JSON.stringify({checks:results.length,results,observationCommandId:hash(observationIntent),scope:'independent fixture conformance, not runtime gameplay'},null,2));
