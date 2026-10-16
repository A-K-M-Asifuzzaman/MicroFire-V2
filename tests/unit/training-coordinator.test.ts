import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {partDefinitions,TrainingCaseSchema,DiagnosticResultSchema,ProgressSchema,PassportPresentationSchema,type TrainingAction} from '@microfire/shared';
import {createTrainingCase,transitionTraining,trainingDiagnostic,trainingPassport,trainingProgress,validateTrainingCase} from '@microfire/game-core';
import {catalog,validatePassport} from '@microfire/science';
import {advance,initialActions,diagnoseActions,repairActions,finishActions,episodeActions,install,remove,sourceActions,trainingTime as at} from './training-helpers';

it('executes every real transition with exact revision22 observation state and separate provenance',()=>{
  let c=createTrainingCase(catalog,at);
  for(const action of episodeActions){
    const before=structuredClone(c);const r=transitionTraining(c,action,catalog,at);expect(r.ok,JSON.stringify(r)).toBe(true);expect(c).toEqual(before);
    if(!r.ok)throw Error(r.code);c=r.current;expect(TrainingCaseSchema.safeParse(c).success).toBe(true);
    expect(ProgressSchema.safeParse(trainingProgress(c)).success).toBe(true);expect(DiagnosticResultSchema.safeParse(trainingDiagnostic(c)).success).toBe(true);expect(PassportPresentationSchema.safeParse(trainingPassport(c)).success).toBe(true);
    validateTrainingCase(JSON.parse(JSON.stringify(c)),catalog);validatePassport(c.state.passport);
    if(action.type==='GAME'&&action.action.type==='OBSERVE_DOCUMENTED_RESULT'){
      const expected=JSON.parse(readFileSync('docs/m2/fixtures/PASSPORT_REVIEW_RESPONSE.example.json','utf8')).data.snapshot;
      expect(c.state).toEqual(expected.state);expect(c.training).toEqual(expected.training);expect(trainingPassport(c)).toEqual(expected.passportPresentation);
    }
  }
  expect(trainingProgress(c).completedChecks).toBe(5);expect(c.state.schemaVersion).toBe(2);expect(c.state.passport.schemaVersion).toBe(1);expect(c.state.passport.entries.every(e=>e.corrections.length===0)).toBe(true);
});
it('enforces source, phase, availability and canonical observation gates without mutation',()=>{
  const c=createTrainingCase(catalog,at);
  const invalid:TrainingAction[]=[{type:'GAME',action:{type:'COLLECT_EVIDENCE',experimentId:'bass2-b20',claimId:'bass2-b20-burned-entire-sample'}},{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'station-arrival'}},{type:'GAME',action:{type:'START_MISSION',missionId:'lunar-habitat'}},{type:'RUN_DIAGNOSTIC'},{type:'ADD_LEARNER_NOTE',text:'valid note'},install('fan')];
  for(const a of invalid){const r=transitionTraining(c,a,catalog,at);expect(r.ok).toBe(false);expect(r.current).toBe(c);}
  const built=advance(initialActions);const errors=[remove('fan'),{type:'GAME',action:{type:'QUALIFY_INSTRUMENT'}},{type:'GAME',action:{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b20'}}] as TrainingAction[];
  for(const a of errors){const r=transitionTraining(built,a,catalog,at);expect(r.ok).toBe(false);expect(r.current).toBe(built);}
  const q=transitionTraining(built,{type:'GAME',action:{type:'QUALIFY_INSTRUMENT'}},catalog,at);expect(!q.ok&&q.code).toBe('REPAIR_REQUIRED');
  const bad=structuredClone(catalog);const flow=bad.experiments[0]!.conditions.flowDirection;if(flow.status==='known')flow.value='concurrent';
  const mismatch=transitionTraining(built,{type:'GAME',action:{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b20'}},bad,at);expect(!mismatch.ok&&mismatch.code).toBe('SCENARIO_MISMATCH');
  expect(()=>validateTrainingCase({...built,state:{...built.state,passport:{...built.state.passport,entries:built.state.passport.entries.map(e=>({...e,conclusion:'invented'}))}}},catalog)).toThrow();
});
it('keeps invalid assembly refusals and injects exactly one fault only after a healthy build',()=>{
  let c=advance(sourceActions);
  for(const a of [install('fan'),remove('fan')]){const r=transitionTraining(c,a,catalog,at);expect(r.ok).toBe(false);expect(r.current).toBe(c);}
  c=advance([install('flow-duct')],c);
  const wrong:TrainingAction={type:'GAME',action:{type:'INSTALL_PART',partId:'fan',anchorId:'duct-exit',orientation:'correct'}};
  const refused=transitionTraining(c,wrong,catalog,at);expect(!refused.ok&&refused.code).toBe('WRONG_ANCHOR');expect(!refused.ok&&refused.message).toBe('The fan fits at the duct inlet. Choose that mount before installing it.');
  c=advance(partDefinitions.slice(1).map(p=>install(p.id,p.id==='still-camera'?'reversed':'correct')),c);expect(c.training.fault).toBe(null);
  c=advance([remove('still-camera'),install('still-camera')],c);expect(c.training.fault?.introducedRevision).toBe(14);expect(c.state.setup.installedParts.find(p=>p.partId==='fan')?.orientation).toBe('reversed');
  c=advance(diagnoseActions,c);c=advance([remove('fan'),install('fan')],c);const first=structuredClone(c.training.repair);
  c=advance([remove('fan'),install('fan','reversed'),remove('fan'),install('fan')],c);expect(c.training.repair).toEqual(first);expect(c.training.fault?.introducedRevision).toBe(14);
});
it('returns all 15 reachable diagnostic cases with exact frozen categories and source purpose',()=>{
  const c=advance(sourceActions);c.training.diagnosticRevision=0;
  const d=trainingDiagnostic(c);expect(d.status).toBe('current');if(d.status!=='current')throw Error('diagnostic');expect(d.findings).toHaveLength(10);
  let reversed=0;
  for(const p of partDefinitions.filter(p=>p.orientationFault)){
    const value=advance(initialActions.slice(0,4).concat(partDefinitions.map(x=>install(x.id,x.id===p.id?'reversed':'correct'))));
    const checked=advance([{type:'RUN_DIAGNOSTIC'}],value);const diag=trainingDiagnostic(checked);expect(diag.status).toBe('current');if(diag.status!=='current')throw Error('diagnostic');
    const f=diag.findings.find(f=>f.partId===p.id&&f.faultCode==='REVERSED')!;expect(f.symptom.category).toBe('authored-training-observation');expect(f.purpose.category).toBe('source-supported-apparatus-description');expect(f.purpose.citations.length).toBeGreaterThan(0);reversed++;
  }expect(reversed).toBe(5);
});
it('retains pending removal history across both orderings, interruptions and 30 legal permutations',()=>{
  const c=advance([...initialActions,...diagnoseActions]);
  const a=advance([remove('fan'),remove('exit-plate'),install('exit-plate')],c),b=advance([remove('exit-plate'),install('exit-plate'),remove('fan')],c);
  expect(a.state).toEqual(b.state);expect(a.training.pendingRepair?.removedAtRevision).toBe(13);expect(b.training.pendingRepair?.removedAtRevision).toBe(15);
  for(const value of [a,b]){const restored=validateTrainingCase(JSON.parse(JSON.stringify(value)),catalog);const repaired=advance([install('fan')],restored);expect(repaired.training.repair?.removedAtRevision).toBe(value.training.pendingRepair?.removedAtRevision);}
  for(let i=0;i<30;i++){
    const leaf=partDefinitions.filter(p=>!['flow-duct','sample-holder','fan'].includes(p.id))[i%7]!;
    const prefix=i%2?[remove(leaf.id),install(leaf.id),remove('fan')]:[remove('fan'),remove(leaf.id),install(leaf.id)];
    const pending=advance(prefix,c);const stored=validateTrainingCase(JSON.parse(JSON.stringify(pending)),catalog);expect(advance([install('fan')],stored).training.repair?.removedAtRevision).toBe(pending.training.pendingRepair?.removedAtRevision);
  }
  const wrong=advance([remove('fan'),install('fan','reversed')],c);expect(wrong.training.pendingRepair).toBe(null);expect(wrong.training.repair).toBe(null);expect(advance([remove('fan'),install('fan')],wrong).training.repair).not.toBe(null);
});
it('allows correction after 1000 wrong diagnoses and reload, with stale checks and later damage handled',()=>{
  let c=advance([...initialActions,{type:'RUN_DIAGNOSTIC'}]);
  for(let i=0;i<1000;i++)c=advance([{type:'SUBMIT_DIAGNOSIS',partId:'radiometer',faultCode:'MISSING'}],c);
  expect(c.training.diagnosisCounts).toHaveLength(1);expect(c.training.diagnosisCounts[0]!.count).toBe(1000);
  c=validateTrainingCase(JSON.parse(JSON.stringify(c)),catalog);c=advance([{type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'},...repairActions],c);
  expect(trainingDiagnostic(c).status).toBe('stale');c=advance([finishActions[0]!],c);expect(trainingProgress(c).completedChecks).toBe(3);
  c=advance([remove('exit-plate')],c);expect(trainingProgress(c).checks[1]!.done).toBe(false);expect(trainingProgress(c).checks[2]!.done).toBe(true);
  const bad=transitionTraining(c,finishActions[0]!,catalog,at);expect(!bad.ok&&bad.code).toBe('QUALIFICATION_FAILED');expect(bad.current).toBe(c);
  c=advance([install('exit-plate'),...finishActions],c);expect(trainingProgress(c).completedChecks).toBe(5);
});
it('keeps notes separate, rejects fifth/invalid notes and locks rig edits after observation/completion',()=>{
  let c=advance(episodeActions.slice(0,-1));
  const limits=structuredClone(c.state.passport.entries[1]!.limitations);
  for(let i=0;i<4;i++)c=advance([{type:'ADD_LEARNER_NOTE',text:'界'.repeat(500)}],c);
  const fifth=transitionTraining(c,{type:'ADD_LEARNER_NOTE',text:'fifth'},catalog,at);expect(!fifth.ok&&fifth.code).toBe('NOTE_LIMIT_REACHED');expect(fifth.current).toBe(c);
  expect(transitionTraining(c,{type:'ADD_LEARNER_NOTE',text:' bad '},catalog,at).ok).toBe(false);expect(c.state.passport.entries[1]!.limitations).toEqual(limits);expect(trainingPassport(c).learnerConclusions.scientificValidation).toBe('not-assessed');
  for(const a of [remove('fan'),finishActions[1]!])expect(transitionTraining(c,a,catalog,at).ok).toBe(false);
  c=advance([finishActions[2]!],c);expect(transitionTraining(c,{type:'RUN_DIAGNOSTIC'},catalog,at).ok).toBe(false);
});
it('requires a fresh diagnostic before diagnosis and preserves later earned diagnosis on stale displays',()=>{
  const built=advance(initialActions),choice:TrainingAction={type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'};
  const missing=transitionTraining(built,choice,catalog,at);expect(!missing.ok&&missing.code).toBe('DIAGNOSTIC_STALE');expect(missing.current).toBe(built);
  const stale=advance([{type:'RUN_DIAGNOSTIC'},remove('exit-plate')],built);const refused=transitionTraining(stale,choice,catalog,at);expect(!refused.ok&&refused.code).toBe('DIAGNOSTIC_STALE');expect(refused.current).toBe(stale);
  const diagnosed=advance([{type:'RUN_DIAGNOSTIC'},choice],stale);const repeated=transitionTraining(diagnosed,choice,catalog,at);expect(!repeated.ok&&repeated.code).toBe('WRONG_PHASE');expect(repeated.current).toBe(diagnosed);
  const pending=advance([remove('fan')],diagnosed);expect(trainingDiagnostic(pending).status).toBe('stale');expect(pending.training.diagnosis).toEqual(diagnosed.training.diagnosis);
  const duplicate=transitionTraining(pending,remove('fan'),catalog,at);expect(!duplicate.ok&&duplicate.code).toBe('NOT_INSTALLED');expect(duplicate.current).toBe(pending);
});
