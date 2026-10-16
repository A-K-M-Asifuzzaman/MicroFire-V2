// Documentation proof harness only. No coordinator, HTTP endpoint, browser adapter or authorization bypass.
import assert from 'node:assert/strict';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGameState, transition, diagnose, partDefinitions, saveProgress, loadProgress } from '@microfire/game-core';
import { catalog, catalogSha256, validatePassport } from '@microfire/science';
import { GameStateSchema, type GameAction, type PartId } from '@microfire/shared';
import type { ActionRequest, ActionResponse, CheckpointPayload, DiagnosticResult, DiagnosticSuccess,
  LocalSlot, Snapshot, StartRequest, StartResponse, Training, TrainingCase, ResumeRequest, TrainingAction } from './contract-types';

const dir=path.dirname(fileURLToPath(import.meta.url));
const at='2026-10-16T10:00:00.000Z',expires='2026-10-16T11:00:00.000Z';
const runtimeId='33333333-3333-4333-8333-333333333333',sessionId='11111111-1111-4111-8111-111111111111';
const realmId='44444444-4444-4444-8444-444444444444',epoch='55555555-5555-4555-8555-555555555555';
const origin='http://127.0.0.1:3102',keyId='public-example-key-r2';
const exampleKey=Buffer.alloc(32,7); // Deliberately public fixture key, never a grant or runtime secret.
const options={isMissionAvailable:(id:string)=>['station-arrival','bass-assembly'].includes(id)};
const results:{name:string;result:'pass';scope:string}[]=[];
function proof(name:string,fn:()=>void,scope='contract model / current core, not M2 runtime') { fn();results.push({name,result:'pass',scope}); }
export function canonical(v:unknown):string {
  if(v===null||typeof v==='boolean')return JSON.stringify(v);
  if(typeof v==='string') {assert(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(v));return JSON.stringify(v);}
  if(typeof v==='number'){assert(Number.isSafeInteger(v));return JSON.stringify(v);}
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  assert(v && Object.getPrototypeOf(v)===Object.prototype);
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';
}
const bytes=(v:unknown)=>Buffer.byteLength(canonical(v));
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
function identified<T extends object>(endpoint:'start'|'action'|'resume',request:T):T&{commandId:string} {
  return {...request,commandId:digest({endpoint,request})};
}
function identity(endpoint:string,request:Record<string,unknown>) {const {commandId,...intent}=request;return commandId===digest({endpoint,request:intent});}
function core(current:TrainingCase,action:GameAction):TrainingCase {
  const r=transition(current.state,action,catalog,at,options);assert(r.ok,JSON.stringify(r));return {...current,state:r.state};
}
const install=(id:PartId,orientation:'correct'|'reversed'='correct'):Extract<GameAction,{type:'INSTALL_PART'}>=>({type:'INSTALL_PART',partId:id,anchorId:partDefinitions.find(p=>p.id===id)!.anchorId,orientation});
const remove=(id:PartId):Extract<GameAction,{type:'REMOVE_PART'}>=>({type:'REMOVE_PART',partId:id});
const emptyTraining=():Training=>({scenarioVersion:'bass-b20-training-v1',fault:null,diagnosticRevision:null,diagnosis:null,pendingRepair:null,repair:null,diagnosisCounts:[],firstWrongDiagnosis:null,lastWrongDiagnosis:null});
let source:TrainingCase={state:createGameState(catalog.datasetVersion,'demo',at),training:emptyTraining()};
source=core(source,{type:'START_MISSION',missionId:'station-arrival'});
const fresh=structuredClone(source);
for(const action of [{type:'INSPECT_EVIDENCE',experimentId:'bass2-b20'},{type:'COLLECT_EVIDENCE',experimentId:'bass2-b20',claimId:'bass2-b20-burned-entire-sample'},{type:'COMPLETE_MISSION',missionId:'station-arrival'},{type:'START_MISSION',missionId:'bass-assembly'}] as GameAction[])source=core(source,action);
const duct=core(source,install('flow-duct'));
let rig=source;for(const p of partDefinitions)rig=core(rig,install(p.id));
rig=core(core(rig,remove('fan')),install('fan','reversed'));
rig.training.fault={id:'training-fan-reversed-v1',origin:'authored-training',introducedAt:at,introducedRevision:12};
const unchecked=structuredClone(rig);
rig.training.diagnosticRevision=12;
const checked=structuredClone(rig);
rig.training.diagnosis={at,faultyRevision:12};
rig.training.diagnosisCounts=[{partId:'fan',faultCode:'REVERSED',count:1}];
const diagnosed=structuredClone(rig);

// Independent receipt oracle only: it delegates every physical edit to existing core.
// It is not transitionTraining and does not implement authorization/progression/API behavior.
function receiptEdit(c:TrainingCase,action:GameAction):TrainingCase {
  const n=core(structuredClone(c),action);
  if(!n.training.repair && action.type==='REMOVE_PART' && action.partId==='fan') {
    assert(n.training.diagnosis);n.training.pendingRepair={faultId:'training-fan-reversed-v1',partId:'fan',removedAtRevision:n.state.setup.revision,removedAt:at};
  }
  if(!n.training.repair && action.type==='INSTALL_PART' && action.partId==='fan') {
    assert(n.training.pendingRepair);
    if(action.orientation==='correct')n.training.repair={...n.training.pendingRepair,reinstalledAtRevision:n.state.setup.revision,at};
    n.training.pendingRepair=null;
  }
  return n;
}
const a=[remove('fan'),remove('exit-plate'),install('exit-plate')].reduce(receiptEdit,diagnosed);
const b=[remove('exit-plate'),install('exit-plate'),remove('fan')].reduce(receiptEdit,diagnosed);
const repairedA=receiptEdit(a,install('fan')),repairedB=receiptEdit(b,install('fan'));
function roundTrip(c:TrainingCase) {
  const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}};
  assert(saveProgress(storage,c.state).ok);const r=loadProgress(storage,'demo',catalog.datasetVersion);assert(r.status==='loaded');
  const t:Training=JSON.parse(JSON.stringify(c.training));assert.deepEqual(t,c.training);return {state:r.state,training:t};
}
function diagnostic(c:TrainingCase):DiagnosticResult {
  const rev=c.state.setup.revision,check=c.training.diagnosticRevision;
  if(check===null)return {status:'not-run',currentSetupRevision:rev};
  if(check!==rev)return {status:'stale',checkedSetupRevision:check,currentSetupRevision:rev};
  const d=diagnose(c.state.setup.installedParts);
  return {status:'current',checkedSetupRevision:rev,currentSetupRevision:rev,qualified:d.qualified,findings:d.faults.map(f=>{
    const p=partDefinitions.find(p=>p.id===f.partId)!;
    const page=['igniter','sample-holder','video-camera','radiometer'].includes(f.partId)?13:12;
    return {id:`${f.partId}:${f.code}` as const,partId:f.partId,faultCode:f.code,
      symptom:{category:'authored-training-observation' as const,text:f.code==='MISSING'?`Training mount ${p.anchorId} is empty.`:`Training orientation marker for ${p.id} points away from its intended view or flow direction.`},
      interpretation:{category:'educational-model-inference' as const,text:f.message},repair:{text:f.repair},
      purpose:{category:'source-supported-apparatus-description' as const,text:p.sourceNote,citations:[{sourceId:'nasa-bass-ii-20210011385',locator:{kind:'pdf' as const,page,printedPage:page===12?'4':'5',section:'Section 1.2 Experiment Description, BASS–II hardware'}}]}};
  })};
}
const startRequest:StartRequest=identified('start',{runtimeId,sessionId,previewId:'bass-b20-training-v1' as const,mode:'demo' as const});
function payload(c:TrainingCase,revision:number,commandId?:string,endpoint:'start'|'action'=revision===0?'start':'action'):CheckpointPayload {
  let action:TrainingAction={type:'RUN_DIAGNOSTIC'};
  if(c.state.completedMissions.includes('bass-assembly'))action={type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'bass-assembly'}};
  else if(c.training.pendingRepair)action={type:'GAME',action:c.training.pendingRepair.removedAtRevision===c.state.setup.revision?remove('fan'):install('exit-plate')};
  else if(c.training.lastWrongDiagnosis&&!c.training.diagnosis)action={type:'SUBMIT_DIAGNOSIS',partId:c.training.lastWrongDiagnosis.partId,faultCode:c.training.lastWrongDiagnosis.faultCode};
  else if(c.training.diagnosticRevision===null)action={type:'GAME',action:install(c.state.setup.revision===1?'flow-duct':'exit-plate')};
  const resolvedCommand=commandId??(endpoint==='start'?startRequest.commandId:identified('action',{runtimeId,sessionId,expectedRevision:revision-1,action}).commandId);
  return {...c,checkpointVersion:1,previewId:'bass-b20-training-v1',sessionId,revision,catalogSha256,rulesVersion:'m2-training-r2',origin,realmId,keyId,issuedAt:at,expiresAt:null,lastCommand:{endpoint,commandId:resolvedCommand,expectedRevision:endpoint==='start'?null:revision-1}};
}
function token(p:CheckpointPayload,key=exampleKey) {
  const raw=Buffer.from(canonical(p));return raw.toString('base64url')+'.'+createHmac('sha256',key).update('microfire-m2-checkpoint-v1\0').update(raw).digest('base64url');
}
function verify(t:string,key=exampleKey) {
  assert(t.length<=27351);const parts=t.split('.');assert.equal(parts.length,2);const [body,mac]=parts as [string,string];
  assert(/^[A-Za-z0-9_-]+$/.test(body));assert(/^[A-Za-z0-9_-]{43}$/.test(mac));
  const raw=Buffer.from(body,'base64url'),m=Buffer.from(mac,'base64url');assert(raw.length<=20480);assert.equal(raw.toString('base64url'),body);assert.equal(m.toString('base64url'),mac);
  const expected=createHmac('sha256',key).update('microfire-m2-checkpoint-v1\0').update(raw).digest();assert(timingSafeEqual(expected,m));
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));assert.equal(canonical(p),raw.toString());GameStateSchema.parse(p.state);validatePassport(p.state.passport);return p as CheckpointPayload;
}
function snapshot(c:TrainingCase,revision:number,step:Snapshot['progress']['step'],commandId?:string):Snapshot {
  const p=payload(c,revision,commandId);
  return {...c,previewId:p.previewId,runtimeId,sessionId,revision,checkpoint:token(p),diagnostic:diagnostic(c),
    progress:{step,completedChecks:c.state.completedMissions.length?1:0,totalChecks:5,allowedMissions:['station-arrival','bass-assembly'],allowedActionTypes:step==='source-orientation'?['GAME']:step==='diagnosis-required'?['GAME','RUN_DIAGNOSTIC','SUBMIT_DIAGNOSIS']:['GAME','RUN_DIAGNOSTIC'],allowedCoreActionTypes:step==='source-orientation'?['INSPECT_EVIDENCE','COLLECT_EVIDENCE','COMPLETE_MISSION']:['INSTALL_PART','REMOVE_PART'],diagnosisReady:step==='diagnosis-required',repairReady:step==='repair-required',qualificationReady:false,nextInstruction:step==='source-orientation'?'Open B20 and collect the canonical source observation.':'Inspect the training configuration and follow the current diagnostic/repair step.'},
    evidenceReview:{status:c.state.passport.entries.length?'lineage-verified':'empty',scope:'structure-and-citation-lineage-only',certification:false,catalogSha256,entries:c.state.passport.entries.map(e=>({entryId:e.id,status:'lineage-verified',issues:[]}))},access:{scope:'local-gameplay-preview',expiresAt:expires,publicAvailabilityChanged:false,scientificApproval:false}};
}
function checkSnapshot(s:Snapshot) {
  assert('diagnostic' in s);const p=verify(s.checkpoint);assert.deepEqual(p.state,s.state);assert.deepEqual(p.training,s.training);assert.equal(p.revision,s.revision);
  const d=s.diagnostic;assert.deepEqual(d,diagnostic(s));
  if(d.status==='current'){
    assert.equal(d.qualified,d.findings.length===0);const faults=diagnose(s.state.setup.installedParts).faults;
    assert.deepEqual(d.findings.map(f=>[f.partId,f.faultCode]),faults.map(f=>[f.partId,f.code]));
    for(const f of d.findings){assert.equal(f.symptom.category,'authored-training-observation');assert.equal(f.interpretation.category,'educational-model-inference');assert.equal(f.purpose.category,'source-supported-apparatus-description');assert(f.repair.text.length>0);assert(f.purpose.citations.every(c=>c.sourceId===catalog.sources[0]!.id));}
  }
}
const wrongRequest:ActionRequest=identified('action',{runtimeId,sessionId,expectedRevision:5,action:{type:'GAME' as const,action:{type:'INSTALL_PART' as const,partId:'fan' as const,anchorId:'duct-exit',orientation:'correct' as const}}});
const refusal=transition(duct.state,wrongRequest.action.type==='GAME'?wrongRequest.action.action:null,catalog,at,options);assert(!refusal.ok);
const wrongResponse:ActionResponse={apiVersion:'1',data:{ok:false,code:refusal.code,message:refusal.message,snapshot:snapshot(duct,5,'assembly')}};
const diagnosticRequest:ActionRequest=identified('action',{runtimeId,sessionId,expectedRevision:14,action:{type:'RUN_DIAGNOSTIC' as const}});
const ds=snapshot(checked,15,'diagnosis-required',diagnosticRequest.commandId);assert(ds.diagnostic.status==='current');
const diagnosticSuccess:DiagnosticSuccess={apiVersion:'1',data:{ok:true,snapshot:{...ds,diagnostic:ds.diagnostic}}};
const diagnosticError:ActionResponse={apiVersion:'1',data:{ok:false,code:'DIAGNOSTIC_STALE',message:'Run a current Training check before submitting a diagnosis.',snapshot:snapshot(unchecked,14,'diagnostic-required')}};
const wrongChoice=structuredClone(checked);wrongChoice.training.diagnosisCounts=[{partId:'radiometer',faultCode:'MISSING',count:1}];wrongChoice.training.firstWrongDiagnosis=wrongChoice.training.lastWrongDiagnosis={partId:'radiometer',faultCode:'MISSING',at};
const examples:Record<string,unknown>={START_REQUEST:startRequest,START_RESPONSE:{apiVersion:'1',data:snapshot(fresh,0,'source-orientation')} satisfies StartResponse,
  WRONG_ANCHOR_REQUEST:wrongRequest,WRONG_ANCHOR_RESPONSE:wrongResponse,
  UNAUTHORIZED_RESPONSE:{apiVersion:'1',error:{code:'PREVIEW_UNAUTHORIZED',message:'Authorize this local preview before reading, changing or resuming a case.',retryable:false}},
  DIAGNOSTIC_REQUEST:diagnosticRequest,DIAGNOSTIC_SUCCESS:diagnosticSuccess,DIAGNOSTIC_ERROR:diagnosticError,
  STALE_DIAGNOSTIC_RESPONSE:{apiVersion:'1',data:{ok:true,snapshot:snapshot(a,19,'repair-required')}},
  WRONG_DIAGNOSIS_RESPONSE:{apiVersion:'1',data:{ok:true,feedback:{correct:false,hint:'The training orientation check identifies the fan; inspect its direction marker.'},snapshot:snapshot(wrongChoice,16,'diagnosis-required')}},
  PENDING_REPAIR_A:{apiVersion:'1',data:snapshot(a,19,'repair-required')},PENDING_REPAIR_B:{apiVersion:'1',data:snapshot(b,19,'repair-required')},
  CAPABILITY_RESPONSE:{apiVersion:'1',data:{enabled:true,authorization:'operator-token-required',previewId:'bass-b20-training-v1',runtimeId}},
  AUTHORIZE_RESPONSE:{apiVersion:'1',data:{authorized:true,expiresAt:expires,runtimeId}},REVOKE_RESPONSE:{apiVersion:'1',data:{authorized:false}}};
const resumeRequest:ResumeRequest=identified('resume',{runtimeId,checkpoint:(examples.PENDING_REPAIR_A as StartResponse).data.checkpoint});examples.RESUME_REQUEST=resumeRequest;examples.RESUME_RESPONSE=examples.PENDING_REPAIR_A;

proof('01 typed diagnostic success and source consistency',()=>checkSnapshot(diagnosticSuccess.data.snapshot));
proof('02 missing/malformed/inconsistent diagnostic rejected',()=>{
  for(const mutate of [(s:any)=>{delete s.diagnostic},(s:any)=>{s.diagnostic.findings=[]},(s:any)=>{s.diagnostic.qualified=true},(s:any)=>{s.diagnostic.checkedSetupRevision=11},(s:any)=>{s.diagnostic.findings[0].symptom.category='historical-nasa-observation'},(s:any)=>{s.diagnostic.findings[0].purpose.citations[0].locator.page=112}]){const s=structuredClone(ds);mutate(s);assert.throws(()=>checkSnapshot(s));}
});
proof('03 typed diagnostic refusal and stale restore',()=>{assert(!diagnosticError.data.ok);assert.equal(diagnosticError.data.code,'DIAGNOSTIC_STALE');assert.equal(diagnostic(roundTrip(a)).status,'stale');});
proof('04 ambiguous histories now distinct',()=>{assert.deepEqual(a.state,b.state);assert.equal(a.training.pendingRepair!.removedAtRevision,13);assert.equal(b.training.pendingRepair!.removedAtRevision,15);assert.notDeepEqual(a.training,b.training);});
proof('05 pending repair round-trips and sufficient future state',()=>{
  for(const c of [diagnosed,a,b,repairedA,repairedB])assert.deepEqual(roundTrip(c),c);
  assert.deepEqual(receiptEdit(roundTrip(a),install('fan')),repairedA);assert.deepEqual(receiptEdit(roundTrip(b),install('fan')),repairedB);
  assert.equal(repairedA.training.repair!.removedAtRevision,13);assert.equal(repairedB.training.repair!.removedAtRevision,15);
  const ops=[remove('fan'),remove('exit-plate'),install('exit-plate'),remove('nitrogen-nozzle'),install('nitrogen-nozzle')];
  const permutations=(xs:number[]):number[][]=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(t=>[x,...t])):[[]];
  let histories=0;
  for(const order of permutations([0,1,2,3,4]).filter(o=>o.indexOf(1)<o.indexOf(2)&&o.indexOf(3)<o.indexOf(4))){
    let c=structuredClone(diagnosed),removed=0;
    for(const i of order){c=receiptEdit(c,ops[i]!);if(i===0)removed=c.state.setup.revision;c=roundTrip(c);}
    assert.equal(c.training.pendingRepair!.removedAtRevision,removed);
    assert.deepEqual(receiptEdit(roundTrip(c),install('fan')),receiptEdit(c,install('fan')));histories++;
  }
  assert.equal(histories,30);
});
proof('06 wrong reinstall and duplicate physical repair',()=>{const bad=receiptEdit(a,install('fan','reversed'));assert.equal(bad.training.pendingRepair,null);assert.equal(bad.training.repair,null);assert(!diagnose(bad.state.setup.installedParts).qualified);const retried=receiptEdit(receiptEdit(bad,remove('fan')),install('fan'));assert(retried.training.repair);const duplicate=transition(repairedA.state,install('fan'),catalog,at,options);assert(!duplicate.ok);assert.equal(duplicate.state,repairedA.state);});

// Abstract lock-serialized local admission oracle, not navigator.locks/localStorage implementation.
function admit(slot:LocalSlot,candidate:LocalSlot['head'],expected:{epoch:string;generation:number}) {
  assert(candidate);assert.equal(slot.epoch,expected.epoch,'LOCAL_GENERATION_CHANGED');
  if(slot.head?.sessionId===candidate.sessionId){assert(candidate.revision>=slot.head.revision,'LOCAL_NEWER');if(candidate.revision===slot.head.revision){assert.equal(candidate.checkpoint,slot.head.checkpoint,'LOCAL_SAME_REVISION_CONFLICT');return slot;}}
  assert.equal(slot.generation,expected.generation,'LOCAL_GENERATION_CHANGED');assert(!slot.head||slot.head.sessionId===candidate.sessionId,'LOCAL_DIFFERENT_CASE');return {...slot,generation:slot.generation+1,head:candidate};
}
const slot:LocalSlot={storageVersion:1,epoch,generation:1,head:{sessionId,revision:10,checkpoint:'opaque-contract-token-N'}};
const newer={sessionId,revision:11,checkpoint:'opaque-contract-token-N+1'};
proof('07 stale tab cannot overwrite N+1',()=>{const next=admit(slot,newer,{epoch,generation:1});assert.throws(()=>admit(next,slot.head,{epoch,generation:1}),/LOCAL_NEWER/);assert.equal(next.head!.revision,11);});
proof('08 both simultaneous write serializations preserve one head',()=>{for(const order of [[11,12],[12,11]]){const first=admit(slot,{...newer,revision:order[0]!},{epoch,generation:1});assert.throws(()=>admit(first,{...newer,revision:order[1]!},{epoch,generation:1}));assert.equal(first.generation,2);}});
proof('09 crash old-or-new slot, no partial checkpoint accepted',()=>{const next=admit(slot,newer,{epoch,generation:1});for(const complete of [false,true]){const raw=JSON.stringify(complete?next:slot);assert.deepEqual(JSON.parse(raw),complete?next:slot);}assert.throws(()=>JSON.parse(JSON.stringify(next).slice(0,12)));},'assumed single-storage-operation atomicity; browser/power loss not tested');
proof('10 stale resume / case / tombstone / epoch conflicts',()=>{const next=admit(slot,newer,{epoch,generation:1});assert.throws(()=>admit(next,slot.head,{epoch,generation:2}),/LOCAL_NEWER/);assert.throws(()=>admit(slot,{...newer,sessionId:realmId},{epoch,generation:1}),/LOCAL_DIFFERENT_CASE/);const tomb={...slot,generation:2,head:null};assert.throws(()=>admit(tomb,newer,{epoch,generation:1}));assert.throws(()=>admit({...tomb,epoch:realmId,generation:1},newer,{epoch,generation:1}));});

// Finite bearer-grant lifecycle truth table, not an authentication service or real cookies.
proof('11 absent/expired/revoked/restarted grants deny',()=>{
  const grants=new Map<string,{runtime:string;expires:number}>();let runtime=runtimeId;
  const allowed=(grant:string,now:number)=>{const g=grants.get(grant);return !!g&&g.runtime===runtime&&now<g.expires;};
  assert(!allowed('public-proof-grant',0));grants.set('public-proof-grant',{runtime,expires:3600});assert(allowed('public-proof-grant',3599));assert(!allowed('public-proof-grant',3600));grants.delete('public-proof-grant');assert(!allowed('public-proof-grant',1));grants.set('public-proof-grant',{runtime,expires:3600});runtime=realmId;assert(!allowed('public-proof-grant',1));
});
proof('12 key rotation, MAC tamper and scope fields',()=>{const t=token(payload(a,19));verify(t);assert.throws(()=>verify(t,Buffer.alloc(32,8)));assert.throws(()=>verify(t.slice(0,-1)+(t.endsWith('a')?'b':'a')));for(const field of ['realmId','origin','rulesVersion']){const p=payload(a,19) as any;p[field]='different';assert.notEqual(token(p),t);}assert.equal(verify(t).expiresAt,null);});
proof('13 request intent key ordering and different payload detection',()=>{assert(identity('action',wrongRequest));assert(identity('start',startRequest));assert(identity('resume',resumeRequest));assert.equal(digest({b:2,a:1}),digest({a:1,b:2}));assert(!identity('action',{...wrongRequest,expectedRevision:6}));assert(!identity('start',{...startRequest,mode:'normal'}));});
proof('14 start retry cannot allocate a second same-runtime case',()=>{
  const issued=new Map<string,{digest:string;live:boolean}>();let allocations=0;
  const start=(r:StartRequest)=>{assert.equal(r.runtimeId,runtimeId,'RUNTIME_CHANGED');assert(identity('start',r));const old=issued.get(r.sessionId);if(old){assert.equal(old.digest,r.commandId,'CASE_ID_REUSED');assert(old.live,'SESSION_NOT_FOUND');return;}assert(issued.size<256,'PREVIEW_CAPACITY');issued.set(r.sessionId,{digest:r.commandId,live:true});allocations++;};
  start(startRequest);start(startRequest);assert.equal(allocations,1);
  const altered=identified('start',{runtimeId,sessionId,previewId:'bass-b20-training-v1' as const,mode:'demo' as const,unexpected:1});assert.throws(()=>start(altered),/CASE_ID_REUSED/);
  issued.get(sessionId)!.live=false;assert.throws(()=>start(startRequest),/SESSION_NOT_FOUND/);assert.equal(allocations,1);
  assert.throws(()=>start({...startRequest,runtimeId:realmId}),/RUNTIME_CHANGED/);
},'bounded identity/tombstone model; not HTTP issuance');
proof('15 action retry precedence, old replay and refusal',()=>{
  const request=identified('action',{runtimeId,sessionId,expectedRevision:18,action:{type:'GAME' as const,action:install('fan')}});let head=18,applications=0,last='';
  const deliver=(r:ActionRequest,authorized=true)=>{assert(authorized,'PREVIEW_UNAUTHORIZED');assert(identity('action',r),'COMMAND_ID_REUSED');if(r.commandId===last&&head===r.expectedRevision+1)return head;assert.equal(r.expectedRevision,head,'STALE_SESSION');head++;applications++;last=r.commandId;return head;};
  assert.equal(deliver(request),19);assert.equal(deliver(request),19);assert.equal(applications,1);assert.throws(()=>deliver(request,false),/PREVIEW_UNAUTHORIZED/);assert.throws(()=>deliver({...request,action:{type:'RUN_DIAGNOSTIC'}}),/COMMAND_ID_REUSED/);
  const next=identified('action',{...(({commandId,...r})=>r)(request),expectedRevision:19});deliver(next);assert.throws(()=>deliver(request),/STALE_SESSION/);assert.equal(applications,2);assert.equal(refusal.state,duct.state);
},'monotonic revision/receipt oracle, no gameplay coordinator');
proof('16 resume duplicate/equal-token/newer-head policy',()=>{
  let head:{revision:number;checkpoint:string}|null=null,creations=0;
  const resume=(r:ResumeRequest)=>{assert(identity('resume',r));const p=verify(r.checkpoint);if(head){assert.equal(head.revision,p.revision,'STALE_SESSION');assert.equal(head.checkpoint,r.checkpoint,'STALE_SESSION');return head;}head={revision:p.revision,checkpoint:r.checkpoint};creations++;return head;};
  const first=resume(resumeRequest);assert.deepEqual(resume(resumeRequest),first);assert.equal(creations,1);head={revision:20,checkpoint:'different'};assert.throws(()=>resume(resumeRequest),/STALE_SESSION/);assert.equal(head.revision,20);
},'head-equality/creation oracle, not a resume endpoint');
proof('17 out-of-order/429/403/restart policy vectors',()=>{
  const recover=(status:number,sameRuntime=true)=>status===429?'wait-same-intent':status===403?(sameRuntime?'reauthorize-get':'resume-saved-not-replay'):status===409?'reconcile':'get-unknown-commit';
  assert.equal(recover(429),'wait-same-intent');assert.equal(recover(403),'reauthorize-get');assert.equal(recover(403,false),'resume-saved-not-replay');assert.equal(recover(409),'reconcile');assert.equal(recover(500),'get-unknown-commit');
  const apply=(confirmed:number,incoming:number)=>{assert(incoming>=confirmed,'OUT_OF_ORDER');return incoming;};assert.throws(()=>apply(11,10),/OUT_OF_ORDER/);assert.equal(apply(11,12),12);assert(!identity('action',{...wrongRequest,runtimeId:realmId}));
},'controller decision oracle, not network/browser execution');
proof('18 1000 mistakes bounded, correct choice stays available',()=>{const c=structuredClone(checked);for(let i=0;i<1000;i++){const cell=c.training.diagnosisCounts[0]??{partId:'radiometer' as const,faultCode:'MISSING' as const,count:0};cell.count++;c.training.diagnosisCounts=[cell];}assert.equal(c.training.diagnosisCounts.length,1);c.training.diagnosis={at,faultyRevision:12};assert(c.training.diagnosis);});

let complete=core(repairedA,{type:'QUALIFY_INSTRUMENT'});complete=core(complete,{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b20'});
const entry=complete.state.passport.entries.find(e=>e.missionId==='bass-assembly')!;
entry.corrections=[{previous:'[Training simulation] fan reversed at revision 12.',revised:'[Training simulation] fan removed at revision 13, reinstalled correctly at revision 16; training check passed at revision 16.',reason:'Authored training fault and repair, not a documented NASA incident or a validation of a combustion outcome.',at}];
entry.learnerNotes=Array.from({length:4},()=> '界'.repeat(500));
complete=core(complete,{type:'COMPLETE_MISSION',missionId:'bass-assembly'});
const codes=['MISSING','WRONG_ANCHOR','MISSING_PREREQUISITE','REVERSED'] as const;
const wrongCells=partDefinitions.flatMap(p=>codes.filter(c=>!(p.id==='fan'&&c==='REVERSED')).map(faultCode=>({partId:p.id,faultCode,count:Math.floor((Number.MAX_SAFE_INTEGER-100)/39)})));
complete.training.diagnosisCounts=[...wrongCells,{partId:'fan',faultCode:'REVERSED',count:1}];complete.training.firstWrongDiagnosis=complete.training.lastWrongDiagnosis={partId:'radiometer',faultCode:'MISSING',at};
const representative=payload(complete,Number.MAX_SAFE_INTEGER,'f'.repeat(64));representative.keyId='k'.repeat(32);representative.origin='http://127.0.0.1:65535';
const maxResume=identified('resume',{runtimeId,checkpoint:token(representative)});
const mathematicalToken=Buffer.alloc(20480).toString('base64url')+'.'+Buffer.alloc(32).toString('base64url');
const boundaryResume=identified('resume',{runtimeId,checkpoint:mathematicalToken});
proof('19 payload/request boundaries and legal Unicode notes',()=>{assert(entry.learnerNotes.every(n=>n.length===500&&Buffer.byteLength(JSON.stringify(n))===1502));assert(bytes(representative)<20480);assert(bytes(maxResume)<32768);assert.equal(mathematicalToken.length,27351);for(const n of [20479,20480,20481])assert.equal(n<=20480,n!==20481);const body=canonical(boundaryResume);for(const n of [32767,32768,32769]){const padded=body+' '.repeat(n-Buffer.byteLength(body));assert.equal(Buffer.byteLength(padded),n);assert.equal(n<=32768,n!==32769);}assert.throws(()=>canonical('x\ud800x'));},'serialization/boundary arithmetic, not streaming runtime parser');
proof('20 canonical scientific invariants and examples',()=>{validatePassport(complete.state.passport);assert.equal(catalog.experiments.length,1);assert.equal(catalog.experiments[0]!.conditions.oxygenPct.value,17.4);for(const e of complete.state.passport.entries)for(const l of catalog.experiments[0]!.limitations)assert(e.limitations.includes(l));for(const v of Object.values(examples)){const d=(v as any).data;if(d?.snapshot)checkSnapshot(d.snapshot);else if(d?.state)checkSnapshot(d);}});
const measuredDiagnosticCase=structuredClone(source);measuredDiagnosticCase.training.diagnosticRevision=0;const diagnosticResponseBytes=bytes({apiVersion:'1',data:{ok:true,snapshot:snapshot(measuredDiagnosticCase,5,'assembly')}});
const measurements={diagnosticResponseBytes,scope:'planning serialization only; no M2 runtime implemented',canonicalCheckpointBytes:bytes(representative),signedTokenBytes:token(representative).length,resumeBodyBytes:bytes(maxResume),largestPendingHistoryBytes:Math.max(bytes(payload(a,19)),bytes(payload(b,19))),maxTokenBytes:mathematicalToken.length,maxResumeBodyBytes:bytes(boundaryResume),localSlotAtMaxTokenBytes:bytes({storageVersion:1,epoch,generation:Number.MAX_SAFE_INTEGER,head:{sessionId,revision:Number.MAX_SAFE_INTEGER,checkpoint:mathematicalToken}}),legalNoteBytes:1502,legacyInvalidSurrogateNoteBytes:2048,sourcePassportBytes:bytes(complete.state.passport),idempotencyReceiptBytes:bytes(representative.lastCommand),addedEnvelopeBytes:bytes(representative)-bytes({state:representative.state,training:representative.training}),fixtureCount:Object.keys(examples).length};
assert(measurements.localSlotAtMaxTokenBytes<=28000);assert(measurements.maxResumeBodyBytes<=32768);
const maxSnapshot=snapshot(complete,Number.MAX_SAFE_INTEGER,'complete','f'.repeat(64));maxSnapshot.checkpoint=token(representative);maxSnapshot.progress={...maxSnapshot.progress,completedChecks:5,allowedActionTypes:[],allowedCoreActionTypes:[]};
const measurementsWithResponse={...measurements,fullCompleteResponseBytes:bytes({apiVersion:'1',data:{ok:true,snapshot:maxSnapshot}})};assert(measurementsWithResponse.fullCompleteResponseBytes<65536);assert(diagnosticResponseBytes<65536);
if(process.argv.includes('--write')) {
  for(const [name,value] of Object.entries(examples))writeFileSync(path.join(dir,`${name}.example.json`),JSON.stringify(value,null,2)+'\n');
  writeFileSync(path.join(dir,'MEASUREMENTS.json'),JSON.stringify(measurementsWithResponse,null,2)+'\n');
} else {
  for(const [name,value] of Object.entries(examples))assert.deepEqual(JSON.parse(readFileSync(path.join(dir,`${name}.example.json`),'utf8')),value,`${name} fixture drift`);
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir,'MEASUREMENTS.json'),'utf8')),measurementsWithResponse,'measurement drift');
}
console.log(JSON.stringify({proofs:results.length,results,measurements:measurementsWithResponse},null,2));

const typeOutput=process.argv.indexOf('--emit-types');
if(typeOutput>=0){
  const output=process.argv[typeOutput+1];assert(output,'--emit-types requires an output path');
  const fixtureTypes:Record<string,string>={START_REQUEST:'StartRequest',START_RESPONSE:'StartResponse',UNAUTHORIZED_RESPONSE:'HttpFailure',WRONG_ANCHOR_REQUEST:'ActionRequest',WRONG_ANCHOR_RESPONSE:'ActionResponse',DIAGNOSTIC_REQUEST:'ActionRequest',DIAGNOSTIC_SUCCESS:'DiagnosticSuccess',DIAGNOSTIC_ERROR:'ActionResponse',STALE_DIAGNOSTIC_RESPONSE:'ActionResponse',WRONG_DIAGNOSIS_RESPONSE:'ActionResponse',PENDING_REPAIR_A:'StartResponse',PENDING_REPAIR_B:'StartResponse',CAPABILITY_RESPONSE:'CapabilityResponse',AUTHORIZE_RESPONSE:'AuthorizeResponse',REVOKE_RESPONSE:'RevokeResponse',RESUME_REQUEST:'ResumeRequest',RESUME_RESPONSE:'ResumeResponse'};
  let text='import type * as C from '+JSON.stringify(path.join(dir,'contract-types'))+';\n';
  for(const [name,type] of Object.entries(fixtureTypes))text+='const '+name+' = '+readFileSync(path.join(dir,name+'.example.json'),'utf8').trim()+' satisfies C.'+type+';\n';
  text+='// @ts-expect-error a current diagnostic requires findings\nconst absent: C.DiagnosticSuccess = {apiVersion:"1",data:{ok:true,snapshot:{...DIAGNOSTIC_SUCCESS.data.snapshot,diagnostic:{status:"current",checkedSetupRevision:12,currentSetupRevision:12,qualified:false}}}};\n';
  text+='// @ts-expect-error historical symptom categories are forbidden\nconst historical: C.DiagnosticFinding = {...DIAGNOSTIC_SUCCESS.data.snapshot.diagnostic.findings[0],symptom:{category:"historical-nasa-observation",text:"fake"}};\n';
  text+='// @ts-expect-error client availability is never accepted\nconst availability: C.StartRequest = {...START_REQUEST,isMissionAvailable:true};\n';
  text+='// @ts-expect-error normal is not the local preview mode\nconst normal: C.StartRequest = {...START_REQUEST,mode:"normal"};\n';
  writeFileSync(output,text);
}
