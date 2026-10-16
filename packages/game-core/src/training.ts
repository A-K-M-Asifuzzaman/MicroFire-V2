import {
  CatalogSchema,TrainingCaseSchema,TrainingActionSchema,canonicalJson,partDefinitions,findingCopy,placementMessage,refusalCopy,learningDefinitions,
  type Catalog,type Citation,type Training,type TrainingAction,type TrainingCase,type TrainingTransitionResult,type DiagnosticResult,type PassportPresentation,type Progress,type CorePreviewAction
} from '@microfire/shared';
import fixture from '../../../data/fixtures/catalog.json';
import {createGameState,transition,diagnose,loadProgress,saveKey} from './index';

// The admitted fixture is the same immutable catalog used by science; the launcher also verifies its byte hash.
const pinnedCatalog=JSON.stringify(CatalogSchema.parse(fixture));
export const TRAINING_PREVIEW_ID='bass-b20-training-v1' as const;
const options={isMissionAvailable:(id:string)=>id==='station-arrival'||id==='bass-assembly'};
export function emptyTraining():Training{return {scenarioVersion:TRAINING_PREVIEW_ID,fault:null,diagnosticRevision:null,diagnosis:null,pendingRepair:null,repair:null,diagnosisCounts:[],firstWrongDiagnosis:null,lastWrongDiagnosis:null};}
export function trainingCatalogMatches(dataset:Catalog):boolean {try{return JSON.stringify(CatalogSchema.parse(dataset))===pinnedCatalog;}catch{return false;}}
export function validateTrainingCase(input:unknown,dataset:Catalog):TrainingCase {
  if(!trainingCatalogMatches(dataset))throw Error('Training catalog mismatch');
  const c=TrainingCaseSchema.parse(input),s=c.state,t=c.training;
  if(s.datasetVersion!==dataset.datasetVersion)throw Error('Training dataset mismatch');
  const raw=JSON.stringify(s);
  const loaded=loadProgress({getItem:(key:string)=>key===saveKey('demo')?raw:null,setItem:()=>{throw Error('Read-only restore');},removeItem:()=>{throw Error('Read-only restore');}},'demo',dataset.datasetVersion);
  if(loaded.status!=='loaded')throw Error('Invalid nested core save');
  const e=dataset.experiments[0]!,claim=e.claims.find(c=>c.id==='bass2-b20-burned-entire-sample')!;
  for(const entry of s.passport.entries){
    if(!s.inspectedExperimentIds.includes(e.id))throw Error('Uninspected source');
    const assembly=entry.missionId==='bass-assembly';
    const expectedId=assembly?`bass-assembly-bass2-b20-r${s.setup.revision}`:'station-arrival-bass2-b20-burned-entire-sample';
    if(entry.id!==expectedId||entry.conclusion!==claim.text||canonicalJson(entry.citations)!==canonicalJson(claim.citations)||canonicalJson(entry.limitations)!==canonicalJson(e.limitations))throw Error('Noncanonical scientific content');
  }
  const station=s.passport.entries.find(e=>e.missionId==='station-arrival');
  const assembly=s.passport.entries.find(e=>e.missionId==='bass-assembly');
  if((s.setup.revision>0||s.activeMission==='bass-assembly'||assembly)&&(!station||!s.completedMissions.includes('station-arrival')))throw Error('Assembly before source completion');
  if(s.activeMission==='station-arrival'&&(s.setup.revision>0||t.fault))throw Error('Reentered source mission');
  if(!t.fault&&(t.diagnosis||t.pendingRepair||t.repair||assembly||s.setup.qualifiedRevision!==null))throw Error('Unearned training history');
  if(!t.fault&&s.setup.installedParts.length===10&&diagnose(s.setup.installedParts).qualified)throw Error('Missing atomic authored fault');
  if(t.fault&&!t.diagnosis&&!s.setup.installedParts.some(p=>p.partId==='fan'&&p.orientation==='reversed'))throw Error('Fault removed before diagnosis');
  if(t.diagnosis&&!t.repair&&!t.pendingRepair&&!s.setup.installedParts.some(p=>p.partId==='fan'&&p.orientation==='reversed'))throw Error('Missing repair provenance');
  const wrong=t.diagnosisCounts.some(c=>!(c.partId==='fan'&&c.faultCode==='REVERSED'));
  if(wrong!==!!t.firstWrongDiagnosis)throw Error('Missing wrong-choice history');
  if(assembly&&(!station||station.createdAt>assembly.createdAt))throw Error('Invalid source chronology');
  return c;
}
export function createTrainingCase(dataset:Catalog,at:string):TrainingCase {
  if(!trainingCatalogMatches(dataset))throw Error('Training catalog mismatch');
  const start=transition(createGameState(dataset.datasetVersion,'demo',at),{type:'START_MISSION',missionId:'station-arrival'},dataset,at,options);
  if(!start.ok)throw Error('Training start failed');
  return validateTrainingCase({state:start.state,training:emptyTraining()},dataset);
}
function repairEarned(c:TrainingCase):boolean{return !!(c.training.fault&&c.training.diagnosis&&c.training.repair&&!c.training.pendingRepair);}
function observed(c:TrainingCase):boolean{return c.state.passport.entries.some(e=>e.missionId==='bass-assembly');}
export function transitionTraining(current:TrainingCase,input:TrainingAction,dataset:Catalog,at:string):TrainingTransitionResult {
  const fail=(code:Extract<TrainingTransitionResult,{ok:false}>['code'],message:string):TrainingTransitionResult=>({ok:false,current,code,message});
  if(!trainingCatalogMatches(dataset))return fail('SCENARIO_MISMATCH','This training episode requires the admitted B20 source and its recorded conditions.');
  validateTrainingCase(current,dataset);
  const parsed=TrainingActionSchema.safeParse(input);
  if(!parsed.success)return fail('INVALID_ACTION','Choose a valid training action.');
  const action=parsed.data as TrainingAction;
  if(at<current.state.updatedAt)return fail('INVARIANT_VIOLATION','The local clock precedes the confirmed case time. Preserve the checkpoint and correct the clock.');
  const s=current.state,t=current.training;
  if(s.completedMissions.includes('bass-assembly'))return fail('WRONG_PHASE','This episode is complete. Read or save this case, or deliberately start a new one.');
  const c:TrainingCase=structuredClone(current);let feedback:{correct:boolean;hint:string}|undefined;
  const success=():TrainingTransitionResult=>{
    c.state={...c.state,updatedAt:at};
    try{validateTrainingCase(c,dataset);}catch{return fail('INVARIANT_VIOLATION','This change would create inconsistent training progress and was not applied.');}
    return {ok:true,current:c,...(feedback?{feedback}:{})};
  };
  const assembly=s.activeMission==='bass-assembly';
  if(action.type==='ADD_LEARNER_NOTE'){
    if(!assembly||!observed(current))return fail('WRONG_PHASE','Review the B20 observation before adding a learner note.');
    const entry=c.state.passport.entries.find(e=>e.missionId==='bass-assembly')!;
    if(entry.learnerNotes.length>=4)return fail('NOTE_LIMIT_REACHED','Four learner notes are already retained. Your existing notes and source limitations are unchanged.');
    entry.learnerNotes.push(action.text);return success();
  }
  if(action.type==='RUN_DIAGNOSTIC'){
    if(!assembly)return fail('WRONG_PHASE','Start the Assembly training mission before running a Training check.');
    c.training.diagnosticRevision=s.setup.revision;return success();
  }
  if(action.type==='SUBMIT_DIAGNOSIS'){
    if(!assembly||observed(current)||t.diagnosis)return fail('WRONG_PHASE','A new diagnosis is not required in this phase.');
    if(!t.fault)return fail('FAULT_NOT_INTRODUCED','Complete the initial training build before identifying its authored fault.');
    if(t.diagnosticRevision!==s.setup.revision||!s.setup.installedParts.some(p=>p.partId==='fan'&&p.orientation==='reversed'))return fail('DIAGNOSTIC_STALE','Run a current Training check before submitting a diagnosis.');
    const correct=action.partId==='fan'&&action.faultCode==='REVERSED';
    let cell=c.training.diagnosisCounts.find(n=>n.partId===action.partId&&n.faultCode===action.faultCode);
    if(!correct&&cell&&cell.count>=Number.MAX_SAFE_INTEGER-1)return fail('CHECKPOINT_LIMIT_REACHED','This optional count cannot advance safely. You can still identify and repair the training fault.');
    if(!cell){cell={partId:action.partId,faultCode:action.faultCode,count:0};c.training.diagnosisCounts.push(cell);}cell.count++;
    if(correct)c.training.diagnosis={at,faultyRevision:s.setup.revision};
    else {const choice={partId:action.partId,faultCode:action.faultCode,at};c.training.firstWrongDiagnosis??=choice;c.training.lastWrongDiagnosis=choice;}
    feedback={correct,hint:correct?'The training orientation check identifies the reversed fan. Remove it and reinstall it facing into the duct.':'The training orientation check identifies the fan; inspect its direction marker.'};
    return success();
  }
  const a=action.action;
  if(a.type==='START_MISSION'){
    if(a.missionId!=='bass-assembly')return fail('UNAVAILABLE','Only the two approved training missions can be used in this episode.');
    if(s.activeMission!==null||!s.completedMissions.includes('station-arrival'))return fail('WRONG_PHASE','Complete the source-reading mission before starting Assembly.');
  }else if(['INSPECT_EVIDENCE','COLLECT_EVIDENCE'].includes(a.type)){
    if(s.activeMission!=='station-arrival')return fail('WRONG_PHASE','Read and collect the source during Station Arrival.');
  }else if(a.type==='COMPLETE_MISSION'){
    if(a.missionId==='bass-assembly'&&(!repairEarned(current)||!observed(current)))return fail('COMPLETION_CRITERIA_UNMET','Diagnose and repair the training fault, qualify the rig and review the B20 source result first.');
  }else if(!assembly)return fail('WRONG_PHASE','Return to the active Assembly training mission.');
  if('experimentId' in a&&a.experimentId!=='bass2-b20')return fail(a.type==='OBSERVE_DOCUMENTED_RESULT'?'SCENARIO_MISMATCH':'UNKNOWN_EXPERIMENT',refusalCopy.UNKNOWN_EXPERIMENT);
  if(observed(current)&&a.type!=='COMPLETE_MISSION')return fail('WRONG_PHASE','The apparatus is locked after B20 observation. Review the Passport or complete the episode.');
  if(a.type==='REMOVE_PART'&&a.partId==='fan'&&t.fault&&!t.diagnosis)return fail('DIAGNOSIS_REQUIRED','Run the Training check and identify the authored fan fault before removing it.');
  if(a.type==='QUALIFY_INSTRUMENT'&&!repairEarned(current))return fail('REPAIR_REQUIRED','Diagnose and repair the authored fan fault before qualifying the training apparatus.');
  if(a.type==='OBSERVE_DOCUMENTED_RESULT'&&!repairEarned(current))return fail('REPAIR_REQUIRED','The authored fault must be diagnosed and repaired before the B20 source result is reviewed.');
  if((a.type==='INSTALL_PART'||a.type==='REMOVE_PART')&&s.setup.revision>Number.MAX_SAFE_INTEGER-32)return fail('CHECKPOINT_LIMIT_REACHED','Optional apparatus edits must preserve room to complete and recover this case.');
  const result=transition(s,a,dataset,at,options);
  if(!result.ok)return {ok:false,current,code:result.code,message:'partId' in a?placementMessage(result.code,a.partId):refusalCopy[result.code],...(result.faults?{faults:result.faults.map(f=>({partId:f.partId,code:f.code,message:findingCopy(f.partId,f.code).interpretation,repair:findingCopy(f.partId,f.code).repair}))}:{})};
  c.state=result.state;
  if(!t.repair&&a.type==='REMOVE_PART'&&a.partId==='fan'&&t.diagnosis)c.training.pendingRepair={faultId:'training-fan-reversed-v1',partId:'fan',removedAtRevision:c.state.setup.revision,removedAt:at};
  if(!t.repair&&a.type==='INSTALL_PART'&&a.partId==='fan'&&t.pendingRepair){
    if(a.orientation==='correct')c.training.repair={...t.pendingRepair,reinstalledAtRevision:c.state.setup.revision,at};
    c.training.pendingRepair=null;
  }
  if(!t.fault&&a.type==='INSTALL_PART'&&diagnose(c.state.setup.installedParts).qualified){
    for(const injection of [{type:'REMOVE_PART',partId:'fan'},{type:'INSTALL_PART',partId:'fan',anchorId:'duct-inlet',orientation:'reversed'}] as CorePreviewAction[]){
      const step=transition(c.state,injection,dataset,at,options);if(!step.ok)return fail('INVARIANT_VIOLATION','The authored fault could not be introduced atomically.');c.state=step.state;
    }
    c.training.fault={id:'training-fan-reversed-v1',origin:'authored-training',introducedAt:at,introducedRevision:c.state.setup.revision};
  }
  return success();
}
export function trainingDiagnostic(c:TrainingCase):DiagnosticResult {
  const revision=c.state.setup.revision,checked=c.training.diagnosticRevision;
  if(checked===null)return {status:'not-run',currentSetupRevision:revision};
  if(checked!==revision)return {status:'stale',checkedSetupRevision:checked,currentSetupRevision:revision};
  const result=diagnose(c.state.setup.installedParts);
  return {status:'current',checkedSetupRevision:revision,currentSetupRevision:revision,qualified:result.qualified,findings:result.faults.map(f=>{
    const def=partDefinitions.find(p=>p.id===f.partId)!,copy=findingCopy(f.partId,f.code);
    const pages=['sample-holder','igniter','video-camera','radiometer'].includes(f.partId)?[12,13]:[12];
    const citations:Citation[]=pages.map(page=>({sourceId:'nasa-bass-ii-20210011385',locator:{kind:'pdf',page,printedPage:page===12?'4':'5',section:'Section 1.2 Experiment Description, BASS–II hardware'}}));
    return {id:`${f.partId}:${f.code}`,partId:f.partId,partLabel:def.label,anchorId:def.anchorId,anchorLabel:def.anchorLabel,faultCode:f.code,symptom:{category:'authored-training-observation',text:copy.symptom},interpretation:{category:'educational-model-inference',text:copy.interpretation},repair:{text:copy.repair},purpose:{category:'source-supported-apparatus-description',text:def.sourceNote,citations}};
  })};
}
export function trainingPassport(c:TrainingCase):PassportPresentation {
  const t=c.training,r=t.repair,f=t.fault,d=t.diagnosis,q=c.state.setup.qualifiedRevision;
  const corrections:PassportPresentation['trainingHistory']['corrections']=[];
  if(observed(c)&&f&&d&&r&&q!==null)corrections.push({id:'training-fan-reversed-v1-repair',origin:'authored-training',evidenceLevel:'not-applicable',historicalNASAEvent:false,templateId:'fan-repair-v1',faultId:f.id,partId:'fan',introducedSetupRevision:f.introducedRevision,diagnosedSetupRevision:d.faultyRevision,removedSetupRevision:r.removedAtRevision,reinstalledSetupRevision:r.reinstalledAtRevision,qualifiedSetupRevision:q,at:r.at,previous:`The training fan was reversed at setup revision ${f.introducedRevision}.`,revised:`The training fan was removed at setup revision ${r.removedAtRevision} and reinstalled correctly at setup revision ${r.reinstalledAtRevision}; the training apparatus passed its configuration check at setup revision ${q}.`,reason:'Authored training exercise; this is not a historical NASA incident or a correction to the B20 observation.'});
  return {sourceEvidence:{origin:'research',passportEntryIds:c.state.passport.entries.map(e=>e.id),correctionPolicy:'none'},trainingHistory:{origin:'authored-training',evidenceLevel:'not-applicable',historicalNASAEvent:false,corrections},learnerConclusions:{origin:'learner-authored',scientificValidation:'not-assessed',notes:c.state.passport.entries.flatMap(e=>e.learnerNotes.map((text,noteIndex)=>({entryId:e.id,noteIndex,text})))}};
}
export function trainingProgress(c:TrainingCase):Progress {
  const s=c.state,t=c.training,repair=repairEarned(c),hasObserved=observed(c),complete=s.completedMissions.includes('bass-assembly');
  const healthy=diagnose(s.setup.installedParts).qualified,qualified=repair&&s.setup.qualifiedRevision===s.setup.revision&&healthy;
  const source=s.inspectedExperimentIds.includes('bass2-b20')&&s.passport.entries.some(e=>e.missionId==='station-arrival');
  const done=[source,qualified,repair,hasObserved,complete];
  const step:Progress['step']=complete?'complete':hasObserved?'passport-review':!s.completedMissions.includes('station-arrival')||s.activeMission!=='bass-assembly'?'source-orientation':!t.fault?'assembly':!t.diagnosis?(t.diagnosticRevision===s.setup.revision?'diagnosis-required':'diagnostic-required'):!repair||!healthy?'repair-required':!qualified?'qualification-required':'b20-inspection-required';
  const actions:Progress['allowedActionTypes']=complete?[]:['GAME',...(s.activeMission==='bass-assembly'?['RUN_DIAGNOSTIC' as const]:[]),...(step==='diagnosis-required'?['SUBMIT_DIAGNOSIS' as const]:[]),...(hasObserved?['ADD_LEARNER_NOTE' as const]:[])];
  const coreActions:Progress['allowedCoreActionTypes']=complete?[]:hasObserved?['COMPLETE_MISSION']:step==='source-orientation'?(s.completedMissions.includes('station-arrival')?['START_MISSION']:['INSPECT_EVIDENCE','COLLECT_EVIDENCE','COMPLETE_MISSION']):['INSTALL_PART','REMOVE_PART',...(repair?['QUALIFY_INSTRUMENT' as const]:[]),...(qualified?['OBSERVE_DOCUMENTED_RESULT' as const]:[])];
  const instructions:Record<Progress['step'],string>={'source-orientation':'Read the B20 conditions, source and documented observation, then collect it.','assembly':'Fit the equipment at its named mounts. Mounting order is an educational model.','diagnostic-required':'Run a Training check to inspect the authored configuration fault.','diagnosis-required':'Identify the part and fault shown by the current Training check.','repair-required':'Remove and reinstall faulty equipment; retain the authored fan repair history.','qualification-required':'Qualify the repaired training apparatus. This is not NASA certification.','b20-inspection-required':'Open the historical B20 result explicitly; the training rig does not measure its outcome.','passport-review':'Review the NASA observation, training history and your own notes in separate sections.','complete':'The training episode is complete. Save or download its checkpoint.'};
  return {step,checks:learningDefinitions.map((d,i)=>({...d,done:done[i]!})),completedChecks:done.filter(Boolean).length,totalChecks:5,allowedMissions:['station-arrival','bass-assembly'],allowedActionTypes:actions,allowedCoreActionTypes:coreActions,diagnosisReady:step==='diagnosis-required',repairReady:!!t.diagnosis&&!t.repair,qualificationReady:step==='qualification-required',nextInstruction:instructions[step]};
}
