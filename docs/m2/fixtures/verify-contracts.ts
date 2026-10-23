// Documentation proof harness only. No coordinator, HTTP endpoint, browser adapter or authorization bypass.
import assert from 'node:assert/strict';
import { equipmentCopy, equipmentDefinitions, findingCopy, placementMessage, refusalCopy, learningDefinitions } from './equipment-copy';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGameState, transition, diagnose, partDefinitions, saveProgress, loadProgress } from '@microfire/game-core';
import { catalog, catalogSha256, validatePassport } from '@microfire/science';
import { GameStateSchema, type GameAction, type PartId } from '@microfire/shared';
import type { ActionRequest, ActionResponse, CheckpointPayload, DiagnosticResult, DiagnosticSuccess,
  LocalSlot, Snapshot, StartRequest, StartResponse, Training, TrainingCase, ResumeRequest, TrainingAction, PassportPresentation, LearningCheck, CheckpointBudget, NoteIssue, LocalSaveResult, HttpFailure } from './contract-types';

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
let rig=structuredClone(source);for(const p of partDefinitions)rig=core(rig,install(p.id));
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
    const p=equipmentDefinitions.find(p=>p.id===f.partId)!; const copy=findingCopy(f.partId,f.code);
    const page=['igniter','sample-holder','video-camera','radiometer'].includes(f.partId)?13:12;
    return {id:`${f.partId}:${f.code}` as const,partId:f.partId,partLabel:p.label,anchorId:p.anchorId,anchorLabel:p.anchorLabel,faultCode:f.code,
      symptom:{category:'authored-training-observation' as const,text:copy.symptom},
      interpretation:{category:'educational-model-inference' as const,text:copy.interpretation},repair:{text:copy.repair},
      purpose:{category:'source-supported-apparatus-description' as const,text:p.sourceNote,citations:[{sourceId:'nasa-bass-ii-20210011385',locator:{kind:'pdf' as const,page,printedPage:page===12?'4':'5',section:'Section 1.2 Experiment Description, BASS–II hardware'}}]}};
  })};
}
const startRequest:StartRequest=identified('start',{runtimeId,sessionId,previewId:'bass-b20-training-v1' as const,mode:'demo' as const});
// A receipt is supplied by the accepted request, never guessed from its resulting state.
const actionId=(expectedRevision:number,action:TrainingAction)=>identified('action',{runtimeId,sessionId,expectedRevision,action}).commandId;
const ductCommand=actionId(4,{type:'GAME',action:install('flow-duct')});
const injectedCommand=actionId(13,{type:'GAME',action:install('exit-plate')});
const pendingACommand=actionId(18,{type:'GAME',action:install('exit-plate')});
const pendingBCommand=actionId(18,{type:'GAME',action:remove('fan')});
function payload(c:TrainingCase,revision:number,commandId:string,endpoint:'start'|'action'=revision===0?'start':'action'):CheckpointPayload {
  return {...c,checkpointVersion:1,previewId:'bass-b20-training-v1',sessionId,revision,catalogSha256,rulesVersion:'m2-training-r3',origin,realmId,keyId,issuedAt:at,expiresAt:null,lastCommand:{endpoint,commandId,expectedRevision:endpoint==='start'?null:revision-1}};
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
// Reference presentation/validation oracles only, not the gameplay coordinator.
function noteIssue(text:unknown):NoteIssue|null {
  if(typeof text!=='string'||!text.trim())return 'blank';
  if(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text))return 'lone-surrogate';
  if(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/u.test(text))return 'control-character';
  if(text!==text.trim())return 'outer-whitespace';
  if(text.length>500)return 'too-long';
  if(Buffer.byteLength(JSON.stringify(text))>2048)return 'too-many-bytes';
  return null;
}
function noteActionExpected(c:TrainingCase,action:Extract<TrainingAction,{type:'ADD_LEARNER_NOTE'}>):TrainingCase {
  assert.equal(noteIssue(action.text),null,'INVALID_REQUEST');
  assert(c.state.activeMission==='bass-assembly','WRONG_PHASE');
  const entry=c.state.passport.entries.find(e=>e.missionId==='bass-assembly'&&e.status==='current');assert(entry,'WRONG_PHASE');assert(entry.learnerNotes.length<4,'NOTE_LIMIT_REACHED');
  // Expected immutable output of the proposed action; no direct fixture edits to scientific fields.
  return {...c,state:GameStateSchema.parse({...c.state,passport:{...c.state.passport,entries:c.state.passport.entries.map(e=>e.id===entry.id?{...e,learnerNotes:[...e.learnerNotes,action.text]}:e)}})};
}
function passportPresentation(c:TrainingCase):PassportPresentation {
  validatePassport(c.state.passport);
  for(const e of c.state.passport.entries){assert.equal(e.corrections.length,0,'Research entries cannot contain training corrections');assert.equal(e.conclusion,catalog.experiments[0]!.claims[0]!.text);}
  const assembly=c.state.passport.entries.find(e=>e.missionId==='bass-assembly'&&e.status==='current');
  const corrections:PassportPresentation['trainingHistory']['corrections']=[];
  if(assembly){
    const f=c.training.fault,d=c.training.diagnosis,r=c.training.repair,q=c.state.setup.qualifiedRevision;
    assert(f&&d&&r&&q!==null&&!c.training.pendingRepair);assert(d.faultyRevision>=f.introducedRevision);assert(r.removedAtRevision>d.faultyRevision);assert(r.reinstalledAtRevision>r.removedAtRevision);assert(q>=r.reinstalledAtRevision&&q===c.state.setup.revision);assert(diagnose(c.state.setup.installedParts).qualified);assert.equal(assembly.setupRevision,q);
    corrections.push({id:'training-fan-reversed-v1-repair',origin:'authored-training',evidenceLevel:'not-applicable',historicalNASAEvent:false,templateId:'fan-repair-v1',faultId:f.id,partId:'fan',introducedSetupRevision:f.introducedRevision,diagnosedSetupRevision:d.faultyRevision,removedSetupRevision:r.removedAtRevision,reinstalledSetupRevision:r.reinstalledAtRevision,qualifiedSetupRevision:q,at:r.at,
      previous:`The training fan was reversed at setup revision ${f.introducedRevision}.`,
      revised:`The training fan was removed at setup revision ${r.removedAtRevision} and reinstalled correctly at setup revision ${r.reinstalledAtRevision}; the training apparatus passed its configuration check at setup revision ${q}.`,
      reason:'Authored training exercise; this is not a historical NASA incident or a correction to the B20 observation.'});
  }
  return {sourceEvidence:{origin:'research',passportEntryIds:c.state.passport.entries.map(e=>e.id),correctionPolicy:'none'},trainingHistory:{origin:'authored-training',evidenceLevel:'not-applicable',historicalNASAEvent:false,corrections},learnerConclusions:{origin:'learner-authored',scientificValidation:'not-assessed',notes:c.state.passport.entries.flatMap(e=>e.learnerNotes.map((text,noteIndex)=>({entryId:e.id,noteIndex,text})))}};
}
function checks(c:TrainingCase):LearningCheck[] {
  const view=passportPresentation(c),r=c.training.repair;
  const source=c.state.inspectedExperimentIds.includes('bass2-b20')&&c.state.passport.entries.some(e=>e.missionId==='station-arrival'&&e.status==='current');
  const repair=!!(c.training.fault&&c.training.diagnosis&&r&&!c.training.pendingRepair);
  const qualified=repair&&c.state.setup.qualifiedRevision===c.state.setup.revision&&diagnose(c.state.setup.installedParts).qualified;
  const observed=view.trainingHistory.corrections.length===1;
  const done=[source,qualified,repair,observed,observed&&c.state.completedMissions.includes('bass-assembly')];
  return learningDefinitions.map((d,i)=>({...d,done:done[i]!}));
}
function budget(p:CheckpointPayload):CheckpointBudget {const payloadBytes=bytes(p);return {payloadBytes,limitBytes:20480,remainingBytes:20480-payloadBytes,warningAtBytes:16384,optionalUpdatesRequireFinalizationCheck:true};}
function snapshot(c:TrainingCase,revision:number,step:Snapshot['progress']['step'],commandId:string):Snapshot {
  c=structuredClone(c);const p=payload(c,revision,commandId),named=checks(c);
  const allowedCore:Snapshot['progress']['allowedCoreActionTypes']=step==='source-orientation'?(c.state.completedMissions.includes('station-arrival')?['START_MISSION']:['INSPECT_EVIDENCE','COLLECT_EVIDENCE','COMPLETE_MISSION']):step==='passport-review'?['COMPLETE_MISSION']:step==='complete'?[]:step==='b20-inspection-required'?['OBSERVE_DOCUMENTED_RESULT','INSTALL_PART','REMOVE_PART']:step==='qualification-required'?['QUALIFY_INSTRUMENT','INSTALL_PART','REMOVE_PART']:['INSTALL_PART','REMOVE_PART'];
  return {...c,previewId:p.previewId,runtimeId,sessionId,revision,checkpoint:token(p),checkpointBudget:budget(p),passportPresentation:passportPresentation(c),diagnostic:diagnostic(c),
    progress:{step,checks:named,completedChecks:named.filter(c=>c.done).length,totalChecks:5,allowedMissions:['station-arrival','bass-assembly'],allowedActionTypes:step==='complete'?[]:step==='source-orientation'?['GAME']:step==='passport-review'?['GAME','RUN_DIAGNOSTIC','ADD_LEARNER_NOTE']:step==='diagnosis-required'?['GAME','RUN_DIAGNOSTIC','SUBMIT_DIAGNOSIS']:['GAME','RUN_DIAGNOSTIC'],allowedCoreActionTypes:allowedCore,diagnosisReady:step==='diagnosis-required',repairReady:step==='repair-required',qualificationReady:step==='qualification-required',nextInstruction:step==='source-orientation'?(c.state.completedMissions.includes('station-arrival')?'Start the assembly workshop.':c.state.passport.entries.length?'Complete the source-reading step.':'Read B20’s conditions and source, then collect its documented observation.'):step==='passport-review'?'Review the NASA observation, training history and your own notes in separate sections.':step==='complete'?'The training episode is complete. Save or download your case.':'Inspect the training configuration and follow the current diagnostic or repair step.'},
    evidenceReview:{status:c.state.passport.entries.length?'lineage-verified':'empty',scope:'structure-and-citation-lineage-only',certification:false,catalogSha256,entries:c.state.passport.entries.map(e=>({entryId:e.id,status:'lineage-verified',issues:[]}))},access:{scope:'local-gameplay-preview',expiresAt:expires,publicAvailabilityChanged:false,scientificApproval:false}};
}
function checkSnapshot(s:Snapshot) {
  assert(!s.training.fault||s.training.fault.introducedRevision<=s.state.setup.revision);
  assert(s.training.diagnosticRevision===null||s.training.diagnosticRevision<=s.state.setup.revision);
  assert('diagnostic' in s);const p=verify(s.checkpoint);assert.deepEqual(p.state,s.state);assert.deepEqual(p.training,s.training);assert.equal(p.revision,s.revision);assert.deepEqual(s.checkpointBudget,budget(p));assert.deepEqual(s.passportPresentation,passportPresentation(s));assert.deepEqual(s.progress.checks,checks(s));assert.equal(s.progress.completedChecks,s.progress.checks.filter(c=>c.done).length);
  const d=s.diagnostic;assert.deepEqual(d,diagnostic(s));
  if(d.status==='current'){
    assert.equal(d.qualified,d.findings.length===0);const faults=diagnose(s.state.setup.installedParts).faults;
    assert.deepEqual(d.findings.map(f=>[f.partId,f.faultCode]),faults.map(f=>[f.partId,f.code]));
    for(const f of d.findings){assert.equal(f.symptom.category,'authored-training-observation');assert.equal(f.interpretation.category,'educational-model-inference');assert.equal(f.purpose.category,'source-supported-apparatus-description');assert(f.repair.text.length>0);assert(f.purpose.citations.every(c=>c.sourceId===catalog.sources[0]!.id));}
  }
}
const wrongRequest:ActionRequest=identified('action',{runtimeId,sessionId,expectedRevision:5,action:{type:'GAME' as const,action:{type:'INSTALL_PART' as const,partId:'fan' as const,anchorId:'duct-exit',orientation:'correct' as const}}});
const refusal=transition(duct.state,wrongRequest.action.type==='GAME'?wrongRequest.action.action:null,catalog,at,options);assert(!refusal.ok);
const wrongResponse:ActionResponse={apiVersion:'1',data:{ok:false,code:refusal.code,message:placementMessage(refusal.code,'fan'),snapshot:snapshot(duct,5,'assembly',ductCommand)}};
const diagnosticRequest:ActionRequest=identified('action',{runtimeId,sessionId,expectedRevision:14,action:{type:'RUN_DIAGNOSTIC' as const}});
const ds=snapshot(checked,15,'diagnosis-required',diagnosticRequest.commandId);assert(ds.diagnostic.status==='current');
const diagnosticSuccess:DiagnosticSuccess={apiVersion:'1',data:{ok:true,snapshot:{...ds,diagnostic:ds.diagnostic}}};
const diagnosticError:ActionResponse={apiVersion:'1',data:{ok:false,code:'DIAGNOSTIC_STALE',message:'Run a current Training check before submitting a diagnosis.',snapshot:snapshot(unchecked,14,'diagnostic-required',injectedCommand)}};
const wrongChoice=structuredClone(checked);wrongChoice.training.diagnosisCounts=[{partId:'radiometer',faultCode:'MISSING',count:1}];wrongChoice.training.firstWrongDiagnosis=wrongChoice.training.lastWrongDiagnosis={partId:'radiometer',faultCode:'MISSING',at};
const examples:Record<string,unknown>={START_REQUEST:startRequest,START_RESPONSE:{apiVersion:'1',data:snapshot(fresh,0,'source-orientation',startRequest.commandId)} satisfies StartResponse,
  WRONG_ANCHOR_REQUEST:wrongRequest,WRONG_ANCHOR_RESPONSE:wrongResponse,
  UNAUTHORIZED_RESPONSE:{apiVersion:'1',error:{code:'PREVIEW_UNAUTHORIZED',message:'Authorize this local preview before reading, changing or resuming a case.',retryable:false}},
  DIAGNOSTIC_REQUEST:diagnosticRequest,DIAGNOSTIC_SUCCESS:diagnosticSuccess,DIAGNOSTIC_ERROR:diagnosticError,
  STALE_DIAGNOSTIC_RESPONSE:{apiVersion:'1',data:{ok:true,snapshot:snapshot(a,19,'repair-required',pendingACommand)}},
  WRONG_DIAGNOSIS_RESPONSE:{apiVersion:'1',data:{ok:true,feedback:{correct:false,hint:'The training orientation check identifies the fan; inspect its direction marker.'},snapshot:snapshot(wrongChoice,16,'diagnosis-required',actionId(15,{type:'SUBMIT_DIAGNOSIS',partId:'radiometer',faultCode:'MISSING'}))}},
  PENDING_REPAIR_A:{apiVersion:'1',data:snapshot(a,19,'repair-required',pendingACommand)},PENDING_REPAIR_B:{apiVersion:'1',data:snapshot(b,19,'repair-required',pendingBCommand)},
  CAPABILITY_RESPONSE:{apiVersion:'1',data:{enabled:true,authorization:'operator-token-required',previewId:'bass-b20-training-v1',runtimeId,grant:{status:'required'}}},
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
proof('12 key rotation, MAC tamper and scope fields',()=>{const t=token(payload(a,19,pendingACommand));verify(t);assert.throws(()=>verify(t,Buffer.alloc(32,8)));assert.throws(()=>verify(t.slice(0,-1)+(t.endsWith('a')?'b':'a')));for(const field of ['realmId','origin','rulesVersion']){const p=payload(a,19,pendingACommand) as any;p[field]='different';assert.notEqual(token(p),t);}assert.equal(verify(t).expiresAt,null);});
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

const qualifiedCase=core(repairedA,{type:'QUALIFY_INSTRUMENT'});
// Research entries are generated by the actual existing reducer action, never edited with correction strings.
const observationRequest:ActionRequest=identified('action',{runtimeId,sessionId,expectedRevision:21,action:{type:'GAME' as const,action:{type:'OBSERVE_DOCUMENTED_RESULT' as const,experimentId:'bass2-b20'}}});
assert(observationRequest.action.type==='GAME');
const passportCase=core(qualifiedCase,observationRequest.action.action);
const completedCase=core(passportCase,{type:'COMPLETE_MISSION',missionId:'bass-assembly'});
examples.FAULT_INJECTED_RESPONSE={apiVersion:'1',data:{ok:true,snapshot:snapshot(unchecked,14,'diagnostic-required',injectedCommand)}};
examples.PASSPORT_REVIEW_RESPONSE={apiVersion:'1',data:{ok:true,snapshot:snapshot(passportCase,22,'passport-review',observationRequest.commandId)}};
examples.COMPLETE_RESPONSE={apiVersion:'1',data:{ok:true,snapshot:snapshot(completedCase,23,'complete',actionId(22,{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'bass-assembly'}}))}};
examples.DIAGNOSIS_REQUEST=identified('action',{runtimeId,sessionId,expectedRevision:15,action:{type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'}});
examples.OBSERVATION_REQUEST=observationRequest;
// Missing mandatory repair is the coordinator's first qualification guard; do not expose the raw core result.
examples.QUALIFICATION_REPAIR_REQUIRED_RESPONSE={apiVersion:'1',data:{ok:false,code:'REPAIR_REQUIRED',message:'Diagnose and repair the authored fan fault before qualifying the training apparatus.',snapshot:snapshot(unchecked,14,'diagnostic-required',injectedCommand)}} satisfies ActionResponse;
examples.LOCAL_LOCK_BUSY_RESULT={ok:false,code:'LOCAL_LOCK_BUSY',savedOnDevice:false} satisfies LocalSaveResult;
examples.LOCAL_WRITE_FAILED_RESULT={ok:false,code:'LOCAL_WRITE_FAILED',cause:'read-back-mismatch',writeOutcome:'unknown',savedOnDevice:false} satisfies LocalSaveResult;
examples.NOTE_INVALID_RESPONSE={apiVersion:'1',error:{code:'INVALID_REQUEST',noteIssue:'outer-whitespace',message:'Remove spaces or line breaks at the beginning and end. Your submitted text is still in the editor.',retryable:false}} satisfies HttpFailure;
examples.REVISION_CONFLICT_RESPONSE={apiVersion:'1',error:{code:'STALE_SESSION',message:'This case changed. Read the current revision before continuing.',retryable:false,context:{runtimeId,currentRevision:19}}} satisfies HttpFailure;
examples.RUNTIME_CHANGED_RESPONSE={apiVersion:'1',error:{code:'RUNTIME_CHANGED',message:'The local server restarted. Reauthorize and resume your saved checkpoint.',retryable:false,context:{runtimeId:'66666666-6666-4666-8666-666666666666'}}} satisfies HttpFailure;
examples.COMMAND_REUSED_RESPONSE={apiVersion:'1',error:{code:'COMMAND_ID_REUSED',message:'The request identity does not match its contents. Reconcile before retrying.',retryable:false}} satisfies HttpFailure;
examples.RATE_LIMITED_RESPONSE={apiVersion:'1',error:{code:'RATE_LIMITED',message:'Wait for the Retry-After delay before retrying. Your progress is unchanged.',retryable:true}} satisfies HttpFailure;
examples.CHECKPOINT_KEY_FAILURE_RESPONSE={apiVersion:'1',error:{code:'CHECKPOINT_KEY_UNAVAILABLE',message:'This checkpoint uses an unavailable signing key. Keep a raw backup; trusted continuation is paused.',retryable:false}} satisfies HttpFailure;
const restartId='66666666-6666-4666-8666-666666666666';
examples.RESUME_AFTER_RESTART_REQUEST=identified('resume',{runtimeId:restartId,checkpoint:(examples.PENDING_REPAIR_A as StartResponse).data.checkpoint});
examples.RESUME_AFTER_RESTART_RESPONSE={apiVersion:'1',data:{...(examples.PENDING_REPAIR_A as StartResponse).data,runtimeId:restartId}};
let noteFilled=passportCase;
for(let i=0;i<4;i++)noteFilled=noteActionExpected(noteFilled,{type:'ADD_LEARNER_NOTE',text:'界'.repeat(500)});
let complete=core(noteFilled,{type:'COMPLETE_MISSION',missionId:'bass-assembly'});
const entry=complete.state.passport.entries.find(e=>e.missionId==='bass-assembly')!;
const codes=['MISSING','WRONG_ANCHOR','MISSING_PREREQUISITE','REVERSED'] as const;
const wrongCells=partDefinitions.flatMap(p=>codes.filter(c=>!(p.id==='fan'&&c==='REVERSED')).map(faultCode=>({partId:p.id,faultCode,count:Math.floor((Number.MAX_SAFE_INTEGER-100)/39)})));
complete.training.diagnosisCounts=[...wrongCells,{partId:'fan',faultCode:'REVERSED',count:1}];complete.training.firstWrongDiagnosis=complete.training.lastWrongDiagnosis={partId:'radiometer',faultCode:'MISSING',at};
const representative=payload(complete,Number.MAX_SAFE_INTEGER,'f'.repeat(64));representative.keyId='k'.repeat(32);representative.origin='http://127.0.0.1:65535';
const maxResume=identified('resume',{runtimeId,checkpoint:token(representative)});
const mathematicalToken=Buffer.alloc(20480).toString('base64url')+'.'+Buffer.alloc(32).toString('base64url');
const boundaryResume=identified('resume',{runtimeId,checkpoint:mathematicalToken});
proof('19 payload/request boundaries and legal Unicode notes',()=>{assert(entry.learnerNotes.every(n=>n.length===500&&Buffer.byteLength(JSON.stringify(n))===1502));assert(bytes(representative)<20480);assert(bytes(maxResume)<32768);assert.equal(mathematicalToken.length,27351);for(const n of [20479,20480,20481])assert.equal(n<=20480,n!==20481);const body=canonical(boundaryResume);for(const n of [32767,32768,32769]){const padded=body+' '.repeat(n-Buffer.byteLength(body));assert.equal(Buffer.byteLength(padded),n);assert.equal(n<=32768,n!==32769);}assert.throws(()=>canonical('x\ud800x'));},'serialization/boundary arithmetic, not streaming runtime parser');
proof('20 canonical scientific invariants and examples',()=>{validatePassport(complete.state.passport);assert.equal(catalog.experiments.length,1);assert.equal(catalog.experiments[0]!.conditions.oxygenPct.value,17.4);for(const e of complete.state.passport.entries)for(const l of catalog.experiments[0]!.limitations)assert(e.limitations.includes(l));for(const v of Object.values(examples)){const d=(v as any).data;if(d?.snapshot)checkSnapshot(d.snapshot);else if(d?.state)checkSnapshot(d);}});
proof('21 R1 all labels and fifteen reachable diagnostic strings',()=>{
  assert.equal(equipmentDefinitions.length,10);let symptoms=0;
  for(const p of equipmentDefinitions){const copy=equipmentCopy[p.id];assert(p.label&&p.anchorLabel);assert.equal(p.anchorId,partDefinitions.find(x=>x.id===p.id)!.anchorId);assert.equal(findingCopy(p.id,'MISSING').symptom,copy.missing.symptom);symptoms++;if(p.orientationFault){assert(findingCopy(p.id,'REVERSED').symptom);symptoms++;}
    for(const code of ['MISSING',...(p.orientationFault?['REVERSED']:[])]){const texts=findingCopy(p.id,code);for(const machine of partDefinitions.flatMap(x=>[x.id,x.anchorId]).filter(id=>id.includes('-')))for(const value of Object.values(texts))assert(!value.includes(machine),`${p.id} exposes ${machine}`);}
  }assert.equal(symptoms,15);assert.equal(placementMessage('WRONG_ANCHOR','fan'),'The fan fits at the duct inlet. Choose that mount before installing it.');
});
proof('22 R2 source/training/learner separation and action provenance',()=>{
  const view=passportPresentation(passportCase);assert.equal(view.trainingHistory.corrections.length,1);assert.equal(view.trainingHistory.evidenceLevel,'not-applicable');assert.equal(view.trainingHistory.historicalNASAEvent,false);const correction=view.trainingHistory.corrections[0]!;assert.equal(correction.removedSetupRevision,13);assert.equal(correction.reinstalledSetupRevision,16);assert.equal(correction.origin,'authored-training');assert(correction.revised.includes('setup revision 16'));
  assert.equal(passportPresentation(unchecked).trainingHistory.corrections.length,0);
  for(const c of [passportCase,completedCase,complete])for(const e of c.state.passport.entries)assert.deepEqual(e.corrections,[]);
  const old=structuredClone(passportCase);old.state.passport.entries[0]!.corrections=[{previous:'NASA source',revised:'Training fan repaired',reason:'prefix is not provenance',at}];assert.throws(()=>passportPresentation(old));
  const forged=structuredClone(passportCase);forged.training.repair!.removedAtRevision=17;assert.throws(()=>passportPresentation(forged));
  const falseStamp=structuredClone(examples.PASSPORT_REVIEW_RESPONSE) as ActionResponse;assert(falseStamp.data.ok);(falseStamp.data.snapshot.passportPresentation.trainingHistory as any).evidenceLevel='direct';assert.throws(()=>checkSnapshot(falseStamp.data.snapshot));
  assert.equal(passportPresentation(complete).learnerConclusions.notes.length,4);assert.equal(passportPresentation(complete).learnerConclusions.scientificValidation,'not-assessed');
});
proof('23 R3 named checks/count/reversibility/reload',()=>{
  for(const c of [fresh,source,unchecked,checked,diagnosed,a,repairedA,qualifiedCase,passportCase,completedCase]){const named=checks(c);assert.deepEqual(named.map(x=>x.id),learningDefinitions.map(x=>x.id));assert.equal(named.length,5);assert.deepEqual(checks(roundTrip(c)),named);}
  assert.equal(checks(completedCase).filter(x=>x.done).length,5);assert.equal(checks(passportCase).filter(x=>x.done).length,4);
  const changed=core(qualifiedCase,remove('fan'));assert.equal(checks(changed).find(x=>x.id==='apparatus-qualified')!.done,false);assert.equal(checks(changed).find(x=>x.id==='fault-diagnosed-and-repaired')!.done,true);
  const corrupted=structuredClone(examples.COMPLETE_RESPONSE) as ActionResponse;assert(corrupted.data.ok);corrupted.data.snapshot.progress.completedChecks=4;assert.throws(()=>checkSnapshot(corrupted.data.snapshot));
});
proof('24 R4 local error completeness and invalid notes preserve state',()=>{
  const failures:LocalSaveResult[]=[{ok:false,code:'LOCAL_LOCK_BUSY',savedOnDevice:false},{ok:false,code:'LOCAL_WRITE_FAILED',cause:'quota',writeOutcome:'not-written',savedOnDevice:false},{ok:false,code:'LOCAL_WRITE_FAILED',cause:'read-back-mismatch',writeOutcome:'unknown',savedOnDevice:false}];assert(failures.every(x=>!x.savedOnDevice));
  const invalid:[string,NoteIssue][]=[['','blank'],['  ','blank'],[' padded','outer-whitespace'],['padded\n','outer-whitespace'],['x\ud800x','lone-surrogate'],['x\u0000x','control-character'],['x\rx','control-character'],['x'.repeat(501),'too-long']];
  const before=canonical(passportCase);for(const [text,issue] of invalid){assert.equal(noteIssue(text),issue);assert.throws(()=>noteActionExpected(passportCase,{type:'ADD_LEARNER_NOTE',text}));assert.equal(canonical(passportCase),before);}
  const exact='A\tB\nC';assert.equal(noteIssue(exact),null);const accepted=noteActionExpected(passportCase,{type:'ADD_LEARNER_NOTE',text:exact});assert.equal(accepted.state.passport.entries.at(-1)!.learnerNotes[0],exact);assert.throws(()=>noteActionExpected(noteFilled,{type:'ADD_LEARNER_NOTE',text:'fifth'}),/NOTE_LIMIT_REACHED/);
});
proof('25 R5 guided source reading without invented claims',()=>{
  assert.equal(catalog.experiments[0]!.claims.length,1);assert.equal(source.state.passport.entries[0]!.claimIds[0],'bass2-b20-burned-entire-sample');assert.equal(source.state.passport.entries[0]!.corrections.length,0);
  const notInspected=transition(fresh.state,{type:'COLLECT_EVIDENCE',experimentId:'bass2-b20',claimId:'bass2-b20-burned-entire-sample'},catalog,at,options);assert(!notInspected.ok);assert.equal(notInspected.code,'NOT_INSPECTED');assert.equal(notInspected.state,fresh.state);
  assert(refusalCopy.UNKNOWN_CLAIM.includes('not an admitted source observation'));
});
proof('26 N1-N8 and response/request limit separation',()=>{
  const completeResponse=bytes(examples.COMPLETE_RESPONSE);assert(completeResponse<65536);assert(bytes({apiVersion:'1',data:{ok:true,snapshot:snapshot(complete,27,'complete',actionId(26,{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'bass-assembly'}}))}})<65536);
  for(const n of [65535,65536,65537]){const padded='x'.repeat(n);assert.equal(Buffer.byteLength(padded)<=65536,n!==65537);}assert(32.785*1000>32768);assert(32785<65536);
  const vectors=[{input:{b:2,a:1},canonical:'{"a":1,"b":2}'},{input:{text:'界',missing:null},canonical:'{"missing":null,"text":"界"}'},{input:{text:'e\u0301'},canonical:'{"text":"é"}'}];for(const v of vectors)assert.equal(canonical(v.input),v.canonical);
},'model/arithmetic/spec gates; no new browser cross-process tests');
const measuredDiagnosticCase=structuredClone(source);measuredDiagnosticCase.training.diagnosticRevision=0;const diagnosticResponseBytes=bytes({apiVersion:'1',data:{ok:true,snapshot:snapshot(measuredDiagnosticCase,5,'assembly',actionId(4,{type:'RUN_DIAGNOSTIC'}))}});
const measurements={diagnosticResponseBytes,scope:'planning serialization only; no M2 runtime implemented',canonicalCheckpointBytes:bytes(representative),signedTokenBytes:token(representative).length,resumeBodyBytes:bytes(maxResume),largestPendingHistoryBytes:Math.max(bytes(payload(a,19,pendingACommand)),bytes(payload(b,19,pendingBCommand))),maxTokenBytes:mathematicalToken.length,maxResumeBodyBytes:bytes(boundaryResume),localSlotAtMaxTokenBytes:bytes({storageVersion:1,epoch,generation:Number.MAX_SAFE_INTEGER,head:{sessionId,revision:Number.MAX_SAFE_INTEGER,checkpoint:mathematicalToken}}),legalNoteBytes:1502,legacyInvalidSurrogateNoteBytes:2048,sourcePassportBytes:bytes(complete.state.passport),idempotencyReceiptBytes:bytes(representative.lastCommand),addedEnvelopeBytes:bytes(representative)-bytes({state:representative.state,training:representative.training}),fixtureCount:Object.keys(examples).length};
assert(measurements.localSlotAtMaxTokenBytes<=28000);assert(measurements.maxResumeBodyBytes<=32768);
const maxSnapshot=snapshot(complete,Number.MAX_SAFE_INTEGER,'complete','f'.repeat(64));maxSnapshot.checkpoint=token(representative);maxSnapshot.checkpointBudget=budget(representative);checkSnapshot(maxSnapshot);
const measurementsWithResponse={...measurements,ordinaryCompleteResponseBytes:bytes(examples.COMPLETE_RESPONSE),fullCompleteResponseBytes:bytes({apiVersion:'1',data:{ok:true,snapshot:maxSnapshot}})};assert(measurementsWithResponse.fullCompleteResponseBytes<65536);assert(diagnosticResponseBytes<65536);
const canonicalVectors=[{input:{b:2,a:1}},{input:{text:'界',missing:null}},{input:{text:'e\u0301'}},{input:{array:[true,null,'a\tb'],revision:Number.MAX_SAFE_INTEGER}}].map(v=>({...v,canonical:canonical(v.input),sha256:digest(v.input)}));
const copyRows=equipmentDefinitions.map(p=>`| ${p.id} | ${p.label} | ${p.anchorId} | ${p.anchorLabel} |`).join('\n');
const symptomRows=equipmentDefinitions.flatMap(p=>['MISSING',...(p.orientationFault?['REVERSED']:[])].map(code=>{const c=findingCopy(p.id,code);return `| ${p.id}:${code} | ${c.symptom} | ${c.interpretation} | ${c.repair} |`;})).join('\n');
const copyDocument='# Frozen candidate3 equipment copy — PROPOSED\n\nGenerated from the single equipment-copy.ts table; never duplicate these labels in UI code. IDs and anchors are unchanged. All mounting descriptions/orientation symptoms are schematic authored training, not historical NASA malfunctions.\n\n| partId | Part label | anchorId | Anchor label |\n|---|---|---|---|\n'+copyRows+'\n\nExactly15 reachable symptom records (10 MISSING,5 REVERSED):\n\n| Finding ID | Symptom | Interpretation | Repair |\n|---|---|---|---|\n'+symptomRows+'\n';
if(process.argv.includes('--write')) {
  for(const [name,value] of Object.entries(examples))writeFileSync(path.join(dir,`${name}.example.json`),JSON.stringify(value,null,2)+'\n');
  writeFileSync(path.join(dir,'MEASUREMENTS.json'),JSON.stringify(measurementsWithResponse,null,2)+'\n');
  writeFileSync(path.join(dir,'CANONICAL_JSON_VECTORS.json'),JSON.stringify(canonicalVectors,null,2)+'\n');
  writeFileSync(path.join(dir,'EQUIPMENT_COPY.md'),copyDocument);
} else {
  for(const [name,value] of Object.entries(examples))assert.deepEqual(JSON.parse(readFileSync(path.join(dir,`${name}.example.json`),'utf8')),value,`${name} fixture drift`);
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir,'MEASUREMENTS.json'),'utf8')),measurementsWithResponse,'measurement drift');
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir,'CANONICAL_JSON_VECTORS.json'),'utf8')),canonicalVectors,'canonical vector drift');
  assert.equal(readFileSync(path.join(dir,'EQUIPMENT_COPY.md'),'utf8'),copyDocument);
}
console.log(JSON.stringify({proofs:results.length,results,measurements:measurementsWithResponse},null,2));

const typeOutput=process.argv.indexOf('--emit-types');
if(typeOutput>=0){
  const output=process.argv[typeOutput+1];assert(output,'--emit-types requires an output path');
  const fixtureTypes:Record<string,string>={START_REQUEST:'StartRequest',START_RESPONSE:'StartResponse',UNAUTHORIZED_RESPONSE:'HttpFailure',WRONG_ANCHOR_REQUEST:'ActionRequest',WRONG_ANCHOR_RESPONSE:'ActionResponse',DIAGNOSTIC_REQUEST:'ActionRequest',DIAGNOSTIC_SUCCESS:'DiagnosticSuccess',DIAGNOSTIC_ERROR:'ActionResponse',STALE_DIAGNOSTIC_RESPONSE:'ActionResponse',WRONG_DIAGNOSIS_RESPONSE:'ActionResponse',PENDING_REPAIR_A:'StartResponse',PENDING_REPAIR_B:'StartResponse',CAPABILITY_RESPONSE:'CapabilityResponse',AUTHORIZE_RESPONSE:'AuthorizeResponse',REVOKE_RESPONSE:'RevokeResponse',RESUME_REQUEST:'ResumeRequest',RESUME_RESPONSE:'ResumeResponse',FAULT_INJECTED_RESPONSE:'ActionResponse',PASSPORT_REVIEW_RESPONSE:'ActionResponse',COMPLETE_RESPONSE:'ActionResponse',DIAGNOSIS_REQUEST:'ActionRequest',QUALIFICATION_REPAIR_REQUIRED_RESPONSE:'ActionResponse',OBSERVATION_REQUEST:'ActionRequest',LOCAL_LOCK_BUSY_RESULT:'LocalSaveResult',LOCAL_WRITE_FAILED_RESULT:'LocalSaveResult',NOTE_INVALID_RESPONSE:'HttpFailure',REVISION_CONFLICT_RESPONSE:'HttpFailure',RUNTIME_CHANGED_RESPONSE:'HttpFailure',COMMAND_REUSED_RESPONSE:'HttpFailure',RATE_LIMITED_RESPONSE:'HttpFailure',CHECKPOINT_KEY_FAILURE_RESPONSE:'HttpFailure',RESUME_AFTER_RESTART_REQUEST:'ResumeRequest',RESUME_AFTER_RESTART_RESPONSE:'ResumeResponse'};
  let text='import type * as C from '+JSON.stringify(path.join(dir,'contract-types'))+';\n';
  for(const [name,type] of Object.entries(fixtureTypes))text+='const '+name+' = '+readFileSync(path.join(dir,name+'.example.json'),'utf8').trim()+' satisfies C.'+type+';\n';
  text+='// @ts-expect-error a current diagnostic requires findings\nconst absent: C.DiagnosticSuccess = {apiVersion:"1",data:{ok:true,snapshot:{...DIAGNOSTIC_SUCCESS.data.snapshot,diagnostic:{status:"current",checkedSetupRevision:12,currentSetupRevision:12,qualified:false}}}};\n';
  text+='// @ts-expect-error historical symptom categories are forbidden\nconst historical: C.DiagnosticFinding = {...DIAGNOSTIC_SUCCESS.data.snapshot.diagnostic.findings[0],symptom:{category:"historical-nasa-observation",text:"fake"}};\n';
  text+='// @ts-expect-error client availability is never accepted\nconst availability: C.StartRequest = {...START_REQUEST,isMissionAvailable:true};\n';
  text+='// @ts-expect-error normal is not the local preview mode\nconst normal: C.StartRequest = {...START_REQUEST,mode:"normal"};\n';
  text+='// @ts-expect-error training repair is never direct research evidence\nconst trainingAsDirect: C.TrainingCorrection = {...PASSPORT_REVIEW_RESPONSE.data.snapshot.passportPresentation.trainingHistory.corrections[0],evidenceLevel:"direct"};\n';
  writeFileSync(output,text);
}
