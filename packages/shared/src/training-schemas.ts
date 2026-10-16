import { z } from 'zod';
import { GameActionSchema, GameStateSchema, PartIdSchema } from './game';
import { CitationSchema } from './science';
import { learningDefinitions } from './equipment';
import { partDefinitions } from './apparatus';
import type { CorePreviewAction, NoteIssue } from './training';

export const PreviewIdSchema = z.literal('bass-b20-training-v1');
export const SafeCounterSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const PreviewUuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const CommandIdSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const PreviewTimeSchema = z.iso.datetime().length(24);
export const FaultCodeSchema = z.enum(['MISSING','WRONG_ANCHOR','MISSING_PREREQUISITE','REVERSED']);
export const TransitionCodeSchema = z.enum(['INVALID_ACTION','UNAVAILABLE','PREREQUISITE_MISSING','WRONG_MISSION','UNKNOWN_EXPERIMENT','UNKNOWN_CLAIM','NOT_INSPECTED','NOT_AN_OBSERVATION','WRONG_ANCHOR','ALREADY_INSTALLED','NOT_INSTALLED','HAS_DEPENDENTS','QUALIFICATION_FAILED','NOT_QUALIFIED','PREDICTION_REQUIRED','UNSUPPORTED_DECISION','COMPLETION_CRITERIA_UNMET','LIMIT_REACHED','SAVE_LIMIT_REACHED','INVARIANT_VIOLATION']);
export const TrainingCodeSchema = z.enum(['DIAGNOSIS_REQUIRED','DIAGNOSTIC_STALE','FAULT_NOT_INTRODUCED','REPAIR_REQUIRED','WRONG_PHASE','SCENARIO_MISMATCH','NOTE_LIMIT_REACHED','CHECKPOINT_LIMIT_REACHED','EVIDENCE_REJECTED']);
export const TrainingResultCodeSchema = z.union([TransitionCodeSchema, TrainingCodeSchema]);
export const hasLoneSurrogate = (s:string) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(s);
export function noteIssue(text:string):NoteIssue|null {
  if (!text.trim()) return 'blank';
  if (hasLoneSurrogate(text)) return 'lone-surrogate';
  if (Array.from(text).some(ch=>{const n=ch.charCodeAt(0);return (n<32&&n!==9&&n!==10)||(n>=127&&n<=159);})) return 'control-character';
  if (text !== text.trim()) return 'outer-whitespace';
  if (text.length > 500) return 'too-long';
  if (new TextEncoder().encode(JSON.stringify(text)).byteLength > 2048) return 'too-many-bytes';
  return null;
}
export const LearnerNoteSchema = z.string().refine(s=>noteIssue(s)===null,'Invalid learner note');
const choice = z.strictObject({ partId:PartIdSchema, faultCode:FaultCodeSchema, at:PreviewTimeSchema });
const pending = z.strictObject({ faultId:z.literal('training-fan-reversed-v1'),partId:z.literal('fan'),removedAtRevision:SafeCounterSchema,removedAt:PreviewTimeSchema });
export const TrainingSchema = z.strictObject({
  scenarioVersion:PreviewIdSchema,
  fault:z.strictObject({id:z.literal('training-fan-reversed-v1'),origin:z.literal('authored-training'),introducedAt:PreviewTimeSchema,introducedRevision:SafeCounterSchema}).nullable(),
  diagnosticRevision:SafeCounterSchema.nullable(), diagnosis:z.strictObject({at:PreviewTimeSchema,faultyRevision:SafeCounterSchema}).nullable(),
  pendingRepair:pending.nullable(),repair:pending.extend({reinstalledAtRevision:SafeCounterSchema,at:PreviewTimeSchema}).nullable(),
  diagnosisCounts:z.array(z.strictObject({partId:PartIdSchema,faultCode:FaultCodeSchema,count:SafeCounterSchema.min(1)})).max(40),
  firstWrongDiagnosis:choice.nullable(),lastWrongDiagnosis:choice.nullable()
});
export const TrainingCaseSchema = z.strictObject({state:GameStateSchema,training:TrainingSchema}).superRefine(({state:s,training:t},ctx)=>{
  const errors:string[]=[]; const r=s.setup.revision;
  const fail=(ok:unknown,message:string)=>{if(!ok)errors.push(message);};
  fail(s.mode==='demo'&&s.guidance==='guided','Training must be guided demo');
  fail(PreviewTimeSchema.safeParse(s.updatedAt).success,'Noncanonical state timestamp');
  fail(!(s.activeMission===null&&s.completedMissions.length===0)&&!(s.activeMission==='station-arrival'&&s.completedMissions.length>0)&&(!s.completedMissions.includes('bass-assembly')||s.activeMission===null),'Unreachable mission phase');
  fail(s.completedMissions.length<=2&&(!s.activeMission||['station-arrival','bass-assembly'].includes(s.activeMission)),'Unsupported mission');
  fail(s.predictions.length===0&&s.classifications.length===0&&s.proposals.length===0&&s.decision===null,'Later mission state');
  fail(s.inspectedExperimentIds.every(id=>id==='bass2-b20'),'Unknown inspected experiment');
  fail(Number.isSafeInteger(r)&&Number.isSafeInteger(s.setup.qualifiedRevision??0),'Unsafe setup revision');
  fail(r>=s.setup.installedParts.length&&(r-s.setup.installedParts.length)%2===0,'Unreachable edit count');
  const stateTime=Date.parse(s.updatedAt);
  for(const p of s.setup.installedParts){const d=partDefinitions.find(d=>d.id===p.partId)!;fail(p.anchorId===d.anchorId&&d.requires.every(id=>s.setup.installedParts.some(p=>p.partId===id)),'Unreachable apparatus');}
  const countKeys=t.diagnosisCounts.map(c=>c.partId+':'+c.faultCode);
  fail(new Set(countKeys).size===countKeys.length,'Duplicate diagnosis cell');
  fail(t.diagnosisCounts.filter(c=>c.partId==='fan'&&c.faultCode==='REVERSED').every(c=>c.count===1),'Repeated correct diagnosis');
  fail((t.firstWrongDiagnosis===null)===(t.lastWrongDiagnosis===null),'Incomplete wrong-choice history');
  for(const c of [t.firstWrongDiagnosis,t.lastWrongDiagnosis]) if(c) {
    fail(!(c.partId==='fan'&&c.faultCode==='REVERSED'),'Correct choice labeled wrong');
    fail(t.diagnosisCounts.some(n=>n.partId===c.partId&&n.faultCode===c.faultCode),'Uncounted wrong choice');
    fail(Date.parse(c.at)<=stateTime&&(!t.fault||t.fault.introducedAt<=c.at)&&(!t.diagnosis||c.at<=t.diagnosis.at),'Future or pre-fault wrong diagnosis');
  }
  if(t.firstWrongDiagnosis&&t.lastWrongDiagnosis)fail(t.firstWrongDiagnosis.at<=t.lastWrongDiagnosis.at,'Wrong diagnosis chronology');
  if(!t.fault)fail(!t.diagnosis&&!t.pendingRepair&&!t.repair&&t.diagnosisCounts.length===0&&!t.firstWrongDiagnosis&&!t.lastWrongDiagnosis,'Metadata before authored fault');
  if(t.fault)fail(t.fault.introducedRevision>=12&&t.fault.introducedRevision%2===0&&t.fault.introducedRevision<=r&&Date.parse(t.fault.introducedAt)<=stateTime,'Future or impossible introduction');
  if(t.diagnosticRevision!==null)fail(t.diagnosticRevision<=r,'Future diagnostic');
  if(t.diagnosis){
    fail(t.fault&&t.fault.introducedRevision<=t.diagnosis.faultyRevision&&t.diagnosis.faultyRevision<=r&&t.diagnosticRevision!==null&&t.diagnosticRevision>=t.diagnosis.faultyRevision,'Future or orphan diagnosis');
    fail(t.fault&&t.fault.introducedAt<=t.diagnosis.at&&Date.parse(t.diagnosis.at)<=stateTime,'Diagnosis chronology');
    fail(t.diagnosisCounts.some(c=>c.partId==='fan'&&c.faultCode==='REVERSED'&&c.count===1),'Uncounted correct diagnosis');
  } else fail(!t.diagnosisCounts.some(c=>c.partId==='fan'&&c.faultCode==='REVERSED'),'Unearned correct diagnosis');
  if(t.pendingRepair||t.repair){
    const p=t.pendingRepair??t.repair!;
    fail(t.diagnosis&&t.diagnosis.faultyRevision<p.removedAtRevision&&p.removedAtRevision<=r&&t.diagnosis.at<=p.removedAt&&Date.parse(p.removedAt)<=stateTime,'Repair before diagnosis or future removal');
  }
  if(t.pendingRepair)fail(!t.repair&&!s.setup.installedParts.some(p=>p.partId==='fan'),'Invalid pending fan removal');
  if(t.repair)fail(!t.pendingRepair&&t.repair.removedAtRevision<t.repair.reinstalledAtRevision&&t.repair.reinstalledAtRevision<=r&&t.repair.removedAt<=t.repair.at&&Date.parse(t.repair.at)<=stateTime,'Invalid completed repair');
  const healthy=s.setup.installedParts.length===10&&s.setup.installedParts.every(p=>p.orientation==='correct'||!partDefinitions.find(d=>d.id===p.partId)!.orientationFault);
  if(s.setup.qualifiedRevision!==null)fail(t.repair&&!t.pendingRepair&&healthy,'Qualification before repair or with faults');
  fail(s.passport.entries.length<=2,'Extra Passport entries');
  for(const e of s.passport.entries){
    fail(['station-arrival','bass-assembly'].includes(e.missionId)&&e.experimentIds.length===1&&e.experimentIds[0]==='bass2-b20'&&e.claimIds.length===1&&e.claimIds[0]==='bass2-b20-burned-entire-sample','Unknown evidence');
    fail(e.status==='current'&&e.scenario==='research'&&e.observationType==='observed'&&e.evidenceLevel==='direct'&&e.corrections.length===0,'Invalid research provenance');
    fail(e.learnerNotes.length<=4&&e.learnerNotes.every(n=>noteIssue(n)===null),'Invalid notes');
    fail(PreviewTimeSchema.safeParse(e.createdAt).success&&Date.parse(e.createdAt)<=stateTime,'Future or noncanonical source timestamp');
    if(e.missionId==='bass-assembly')fail(t.repair&&!t.pendingRepair&&s.setup.qualifiedRevision===r&&healthy&&e.setupRevision===r,'Observation before repaired qualification');
    else fail(e.setupRevision===null&&e.learnerNotes.length===0,'Invalid Station source entry');
  }
  for(const message of errors)ctx.addIssue({code:'custom',message});
});
const previewCoreTypes=new Set(['START_MISSION','INSPECT_EVIDENCE','COLLECT_EVIDENCE','INSTALL_PART','REMOVE_PART','QUALIFY_INSTRUMENT','OBSERVE_DOCUMENTED_RESULT','COMPLETE_MISSION']);
export const CorePreviewActionSchema=GameActionSchema.refine(a=>previewCoreTypes.has(a.type),'Unsupported training action').transform(a=>a as CorePreviewAction);
export const TrainingActionSchema=z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('GAME'),action:CorePreviewActionSchema}),z.strictObject({type:z.literal('RUN_DIAGNOSTIC')}),
  z.strictObject({type:z.literal('SUBMIT_DIAGNOSIS'),partId:PartIdSchema,faultCode:FaultCodeSchema}),
  z.strictObject({type:z.literal('ADD_LEARNER_NOTE'),text:LearnerNoteSchema})
]);
const finding=z.strictObject({id:z.templateLiteral([PartIdSchema,':',FaultCodeSchema]),partId:PartIdSchema,partLabel:z.string().min(1).max(100),anchorId:z.string().min(1).max(100),anchorLabel:z.string().min(1).max(100),faultCode:FaultCodeSchema,
  symptom:z.strictObject({category:z.literal('authored-training-observation'),text:z.string().min(1).max(240)}),
  interpretation:z.strictObject({category:z.literal('educational-model-inference'),text:z.string().min(1).max(500)}),
  repair:z.strictObject({text:z.string().min(1).max(500)}),purpose:z.strictObject({category:z.literal('source-supported-apparatus-description'),text:z.string().min(1).max(500),citations:z.array(CitationSchema).min(1).max(2)})
}).refine(f=>f.id===f.partId+':'+f.faultCode,'Finding identity');
export const DiagnosticResultSchema=z.discriminatedUnion('status',[
  z.strictObject({status:z.literal('not-run'),currentSetupRevision:SafeCounterSchema}),
  z.strictObject({status:z.literal('stale'),checkedSetupRevision:SafeCounterSchema,currentSetupRevision:SafeCounterSchema}).refine(d=>d.checkedSetupRevision<d.currentSetupRevision),
  z.strictObject({status:z.literal('current'),checkedSetupRevision:SafeCounterSchema,currentSetupRevision:SafeCounterSchema,qualified:z.boolean(),findings:z.array(finding).max(10)}).refine(d=>d.checkedSetupRevision===d.currentSetupRevision&&d.qualified===(d.findings.length===0)&&new Set(d.findings.map(f=>f.id)).size===d.findings.length)
]);
const correction=z.strictObject({id:z.literal('training-fan-reversed-v1-repair'),origin:z.literal('authored-training'),evidenceLevel:z.literal('not-applicable'),historicalNASAEvent:z.literal(false),templateId:z.literal('fan-repair-v1'),faultId:z.literal('training-fan-reversed-v1'),partId:z.literal('fan'),introducedSetupRevision:SafeCounterSchema,diagnosedSetupRevision:SafeCounterSchema,removedSetupRevision:SafeCounterSchema,reinstalledSetupRevision:SafeCounterSchema,qualifiedSetupRevision:SafeCounterSchema,at:PreviewTimeSchema,previous:z.string().max(500),revised:z.string().max(500),reason:z.string().max(500)});
export const PassportPresentationSchema=z.strictObject({sourceEvidence:z.strictObject({origin:z.literal('research'),passportEntryIds:z.array(z.string()).max(2),correctionPolicy:z.literal('none')}),trainingHistory:z.strictObject({origin:z.literal('authored-training'),evidenceLevel:z.literal('not-applicable'),historicalNASAEvent:z.literal(false),corrections:z.array(correction).max(1)}),learnerConclusions:z.strictObject({origin:z.literal('learner-authored'),scientificValidation:z.literal('not-assessed'),notes:z.array(z.strictObject({entryId:z.string(),noteIndex:SafeCounterSchema,text:LearnerNoteSchema})).max(4)})});
export const ProgressSchema=z.strictObject({step:z.enum(['source-orientation','assembly','diagnostic-required','diagnosis-required','repair-required','qualification-required','b20-inspection-required','passport-review','complete']),checks:z.array(z.strictObject({id:z.enum(['source-collected','apparatus-qualified','fault-diagnosed-and-repaired','b20-lineage-matched','episode-completed']),label:z.string().max(100),done:z.boolean()})).length(5),completedChecks:SafeCounterSchema.max(5),totalChecks:z.literal(5),allowedMissions:z.array(z.enum(['station-arrival','bass-assembly'])).length(2),allowedActionTypes:z.array(z.enum(['GAME','RUN_DIAGNOSTIC','SUBMIT_DIAGNOSIS','ADD_LEARNER_NOTE'])).max(4),allowedCoreActionTypes:z.array(z.enum(['START_MISSION','INSPECT_EVIDENCE','COLLECT_EVIDENCE','INSTALL_PART','REMOVE_PART','QUALIFY_INSTRUMENT','OBSERVE_DOCUMENTED_RESULT','COMPLETE_MISSION'])).max(8),diagnosisReady:z.boolean(),repairReady:z.boolean(),qualificationReady:z.boolean(),nextInstruction:z.string().min(1).max(500)}).refine(p=>p.completedChecks===p.checks.filter(c=>c.done).length&&p.checks.every((c,i)=>c.id===learningDefinitions[i]!.id&&c.label===learningDefinitions[i]!.label)&&new Set(p.allowedActionTypes).size===p.allowedActionTypes.length&&new Set(p.allowedCoreActionTypes).size===p.allowedCoreActionTypes.length&&p.allowedMissions[0]==='station-arrival'&&p.allowedMissions[1]==='bass-assembly','Inconsistent learning checks');
export const CheckpointBudgetSchema=z.strictObject({payloadBytes:SafeCounterSchema.max(20480),limitBytes:z.literal(20480),remainingBytes:SafeCounterSchema,warningAtBytes:z.literal(16384),optionalUpdatesRequireFinalizationCheck:z.literal(true)}).refine(b=>b.remainingBytes===20480-b.payloadBytes);
export const EvidenceReviewSchema=z.strictObject({status:z.enum(['empty','lineage-verified','not-validated','rejected']),scope:z.literal('structure-and-citation-lineage-only'),certification:z.literal(false),catalogSha256:CommandIdSchema,entries:z.array(z.strictObject({entryId:z.string(),status:z.enum(['lineage-verified','not-validated','rejected']),issues:z.array(z.string().max(500)).max(20)})).max(2)});
export const LastCommandSchema=z.strictObject({endpoint:z.enum(['start','action']),commandId:CommandIdSchema,expectedRevision:SafeCounterSchema.nullable()});
export const CheckpointPayloadSchema=TrainingCaseSchema.safeExtend({checkpointVersion:z.literal(1),previewId:PreviewIdSchema,sessionId:PreviewUuidSchema,revision:SafeCounterSchema,catalogSha256:CommandIdSchema,rulesVersion:z.literal('m2-training-r3'),origin:z.string().min(1).max(64).regex(/^http:\/\/127\.0\.0\.1:\d{1,5}$/),realmId:PreviewUuidSchema,keyId:z.string().regex(/^[a-z0-9_-]{1,32}$/),issuedAt:PreviewTimeSchema,expiresAt:z.null(),lastCommand:LastCommandSchema}).superRefine((p,ctx)=>{
  if(p.lastCommand.endpoint==='start'?p.revision!==0||p.lastCommand.expectedRevision!==null:p.revision===0||p.lastCommand.expectedRevision!==p.revision-1)ctx.addIssue({code:'custom',message:'Receipt revision mismatch'});
  const counts=p.training.diagnosisCounts.reduce((n,c)=>n+BigInt(c.count),0n);
  const s=p.state,t=p.training;
  const assembly=s.activeMission==='bass-assembly'||s.setup.revision>0||s.completedMissions.includes('bass-assembly');
  const source=s.passport.entries.some(e=>e.missionId==='station-arrival');
  const observed=s.passport.entries.some(e=>e.missionId==='bass-assembly');
  const minimum=assembly?BigInt(s.setup.revision)+4n-(t.fault?2n:0n)+(t.diagnosticRevision!==null?1n:0n)+counts+(s.setup.qualifiedRevision!==null?1n:0n)+(observed?1n:0n)+(s.completedMissions.includes('bass-assembly')?1n:0n):BigInt((s.inspectedExperimentIds.length?1:0)+(source?1:0)+(s.completedMissions.includes('station-arrival')?1:0));
  if(minimum>BigInt(p.revision)||(p.revision===0&&(s.activeMission!=='station-arrival'||s.inspectedExperimentIds.length||s.passport.entries.length)))ctx.addIssue({code:'custom',message:'Impossible session revision'});
  if(counts>BigInt(p.revision)||Date.parse(p.state.updatedAt)>Date.parse(p.issuedAt))ctx.addIssue({code:'custom',message:'Impossible checkpoint chronology'});
});
export const CheckpointTokenSchema=z.string().max(27351).regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
export const SnapshotSchema=TrainingCaseSchema.safeExtend({previewId:PreviewIdSchema,runtimeId:PreviewUuidSchema,sessionId:PreviewUuidSchema,revision:SafeCounterSchema,checkpoint:CheckpointTokenSchema,checkpointBudget:CheckpointBudgetSchema,passportPresentation:PassportPresentationSchema,diagnostic:DiagnosticResultSchema,progress:ProgressSchema,evidenceReview:EvidenceReviewSchema,access:z.strictObject({scope:z.literal('local-gameplay-preview'),expiresAt:PreviewTimeSchema,publicAvailabilityChanged:z.literal(false),scientificApproval:z.literal(false)})});
export const StartRequestSchema=z.strictObject({runtimeId:PreviewUuidSchema,sessionId:PreviewUuidSchema,previewId:PreviewIdSchema,mode:z.literal('demo'),commandId:CommandIdSchema});
export const ActionRequestSchema=z.strictObject({runtimeId:PreviewUuidSchema,sessionId:PreviewUuidSchema,expectedRevision:SafeCounterSchema,commandId:CommandIdSchema,action:TrainingActionSchema});
export const ResumeRequestSchema=z.strictObject({runtimeId:PreviewUuidSchema,checkpoint:CheckpointTokenSchema,commandId:CommandIdSchema});
export const AuthorizeRequestSchema=z.strictObject({approvalToken:z.string().max(100)});
export const RevokeRequestSchema=z.strictObject({});
const wire=<T extends z.ZodType>(data:T)=>z.strictObject({apiVersion:z.literal('1'),data});
const feedback=z.strictObject({correct:z.boolean(),hint:z.string().min(1).max(500)});
const displayFault=z.strictObject({partId:PartIdSchema,code:FaultCodeSchema,message:z.string().max(500),repair:z.string().max(500)});
export const StartResponseSchema=wire(SnapshotSchema);
export const ResumeResponseSchema=StartResponseSchema;
export const ActionResponseSchema=wire(z.discriminatedUnion('ok',[z.strictObject({ok:z.literal(true),snapshot:SnapshotSchema,feedback:feedback.optional()}),z.strictObject({ok:z.literal(false),code:TrainingResultCodeSchema,message:z.string().min(1).max(500),faults:z.array(displayFault).max(10).optional(),snapshot:SnapshotSchema})]));
export const CapabilityResponseSchema=wire(z.strictObject({enabled:z.literal(true),authorization:z.literal('operator-token-required'),previewId:PreviewIdSchema,runtimeId:PreviewUuidSchema,grant:z.discriminatedUnion('status',[z.strictObject({status:z.literal('required')}),z.strictObject({status:z.literal('valid'),expiresAt:PreviewTimeSchema})])}));
export const AuthorizeResponseSchema=wire(z.strictObject({authorized:z.literal(true),expiresAt:PreviewTimeSchema,runtimeId:PreviewUuidSchema}));
export const RevokeResponseSchema=wire(z.strictObject({authorized:z.literal(false)}));
export const NoteIssueSchema=z.enum(['blank','outer-whitespace','lone-surrogate','control-character','too-long','too-many-bytes']);
export const HttpFailureSchema=z.strictObject({apiVersion:z.literal('1'),error:z.strictObject({code:z.enum(['INVALID_REQUEST','NOT_FOUND','PAYLOAD_TOO_LARGE','UNSUPPORTED_MEDIA_TYPE','RATE_LIMITED','INTERNAL_ERROR','PREVIEW_UNAUTHORIZED','SESSION_NOT_FOUND','STALE_SESSION','COMMAND_ID_REUSED','CHECKPOINT_UNTRUSTED','CHECKPOINT_VERSION_UNSUPPORTED','CHECKPOINT_KEY_UNAVAILABLE','DATASET_MISMATCH','PREVIEW_CAPACITY','RUNTIME_CHANGED','CASE_ID_REUSED']),message:z.string().min(1).max(500),retryable:z.boolean(),noteIssue:NoteIssueSchema.optional(),context:z.strictObject({runtimeId:PreviewUuidSchema,currentRevision:SafeCounterSchema.optional()}).optional()})});
export const LocalSlotSchema=z.strictObject({storageVersion:z.literal(1),epoch:PreviewUuidSchema,generation:SafeCounterSchema,head:z.strictObject({sessionId:PreviewUuidSchema,revision:SafeCounterSchema,checkpoint:CheckpointTokenSchema}).nullable()});
export const LocalSaveResultSchema=z.union([z.strictObject({ok:z.literal(true),epoch:PreviewUuidSchema,generation:SafeCounterSchema,savedOnDevice:z.literal(true)}),z.strictObject({ok:z.literal(false),code:z.enum(['LOCAL_NEWER','LOCAL_GENERATION_CHANGED','LOCAL_SAME_REVISION_CONFLICT','LOCAL_DIFFERENT_CASE','LOCAL_NEEDS_REVIEW','LOCAL_STORAGE_UNAVAILABLE','LOCAL_READ_ONLY','LOCAL_LOCK_BUSY']),savedOnDevice:z.literal(false)}),z.strictObject({ok:z.literal(false),code:z.literal('LOCAL_WRITE_FAILED'),cause:z.enum(['quota','permission','serialization','read-back-mismatch','read-back-unavailable']),writeOutcome:z.enum(['not-written','unknown']),savedOnDevice:z.literal(false)})]);

export const FaultSchema=z.strictObject({partId:PartIdSchema,code:FaultCodeSchema,message:z.string().min(1).max(500),repair:z.string().min(1).max(500)});
export const TrainingTransitionResultSchema=z.discriminatedUnion('ok',[z.strictObject({ok:z.literal(true),current:TrainingCaseSchema,feedback:feedback.optional()}),z.strictObject({ok:z.literal(false),current:TrainingCaseSchema,code:TrainingResultCodeSchema,message:z.string().min(1).max(500),faults:z.array(displayFault).max(10).optional()})]);
export const CurrentDiagnosticSchema=DiagnosticResultSchema.options[2];
export const DiagnosticSuccessSchema=wire(z.strictObject({ok:z.literal(true),snapshot:SnapshotSchema.safeExtend({diagnostic:CurrentDiagnosticSchema})}));
