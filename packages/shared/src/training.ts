import type { Catalog, Citation } from './science';
import type { GameAction, GameState, PartId, Fault, TransitionCode } from './game';

export type PreviewId = 'bass-b20-training-v1';
export type FaultCode = Fault['code'];
export type CorePreviewAction = Extract<GameAction, { type:
  'START_MISSION' | 'INSPECT_EVIDENCE' | 'COLLECT_EVIDENCE' | 'INSTALL_PART' |
  'REMOVE_PART' | 'QUALIFY_INSTRUMENT' | 'OBSERVE_DOCUMENTED_RESULT' | 'COMPLETE_MISSION' }>;
export type TrainingAction = { type:'GAME'; action:CorePreviewAction }
  | { type:'RUN_DIAGNOSTIC' }
  | { type:'SUBMIT_DIAGNOSIS'; partId:PartId; faultCode:FaultCode }
  | { type:'ADD_LEARNER_NOTE'; text:string };
export type DiagnosisChoice = { partId:PartId; faultCode:FaultCode; at:string };
export type PendingRepair = { faultId:'training-fan-reversed-v1'; partId:'fan';
  removedAtRevision:number; removedAt:string };
export type RepairReceipt = PendingRepair & { reinstalledAtRevision:number; at:string };
export type Training = {
  scenarioVersion:PreviewId;
  fault:{ id:'training-fan-reversed-v1'; origin:'authored-training'; introducedAt:string; introducedRevision:number } | null;
  diagnosticRevision:number | null;
  diagnosis:{ at:string; faultyRevision:number } | null;
  pendingRepair:PendingRepair | null;
  repair:RepairReceipt | null;
  diagnosisCounts:{ partId:PartId; faultCode:FaultCode; count:number }[];
  firstWrongDiagnosis:DiagnosisChoice | null; lastWrongDiagnosis:DiagnosisChoice | null;
};
export type TrainingCase = { state:GameState; training:Training };
export type DiagnosticFinding = {
  id:`${PartId}:${FaultCode}`; partId:PartId; partLabel:string; anchorId:string; anchorLabel:string; faultCode:FaultCode;
  symptom:{ category:'authored-training-observation'; text:string };
  interpretation:{ category:'educational-model-inference'; text:string };
  repair:{ text:string };
  purpose:{ category:'source-supported-apparatus-description'; text:string; citations:Citation[] };
};
export type CurrentDiagnostic = { status:'current'; checkedSetupRevision:number;
  currentSetupRevision:number; qualified:boolean; findings:DiagnosticFinding[] };
export type DiagnosticResult = { status:'not-run'; currentSetupRevision:number }
  | { status:'stale'; checkedSetupRevision:number; currentSetupRevision:number }
  | CurrentDiagnostic;
export type TrainingCode = 'DIAGNOSIS_REQUIRED'|'DIAGNOSTIC_STALE'|'FAULT_NOT_INTRODUCED'
  | 'REPAIR_REQUIRED'|'WRONG_PHASE'|'SCENARIO_MISMATCH'|'NOTE_LIMIT_REACHED'
  | 'CHECKPOINT_LIMIT_REACHED'|'EVIDENCE_REJECTED';
export type DisplayFault = {partId:PartId;code:FaultCode;message:string;repair:string};
export type TrainingTransitionResult =
  | { ok:true; current:TrainingCase; feedback?:{ correct:boolean; hint:string } }
  | { ok:false; current:TrainingCase; code:TransitionCode|TrainingCode; message:string; faults?:DisplayFault[] };
// Pure coordinator declaration only: no implementation, network, cookie, storage or signer.
export type TrainingTransition = (current:TrainingCase, action:TrainingAction, catalog:Catalog, at:string)=>TrainingTransitionResult;
export type LastCommand = { endpoint:'start'|'action'; commandId:string; expectedRevision:number|null };
export type CheckpointPayload = TrainingCase & {
  checkpointVersion:1; previewId:PreviewId; sessionId:string; revision:number;
  catalogSha256:string; rulesVersion:'m2-training-r3'; origin:string; realmId:string;
  keyId:string; issuedAt:string; expiresAt:null; lastCommand:LastCommand;
};
export type EvidenceReview = {
  status:'empty'|'lineage-verified'|'not-validated'|'rejected';
  scope:'structure-and-citation-lineage-only'; certification:false; catalogSha256:string;
  entries:{ entryId:string; status:'lineage-verified'|'not-validated'|'rejected'; issues:string[] }[];
};
export type Step = 'source-orientation'|'assembly'|'diagnostic-required'|'diagnosis-required'
  | 'repair-required'|'qualification-required'|'b20-inspection-required'|'passport-review'|'complete';
export type LearningCheckId = 'source-collected'|'apparatus-qualified'|'fault-diagnosed-and-repaired'|'b20-lineage-matched'|'episode-completed';
export type LearningCheck = {id:LearningCheckId; label:string; done:boolean};
export type Progress = { step:Step; checks:LearningCheck[]; completedChecks:number; totalChecks:5;
  allowedMissions:('station-arrival'|'bass-assembly')[];
  allowedActionTypes:TrainingAction['type'][]; allowedCoreActionTypes:CorePreviewAction['type'][];
  diagnosisReady:boolean; repairReady:boolean; qualificationReady:boolean; nextInstruction:string };
export type TrainingCorrection = {
  id:'training-fan-reversed-v1-repair'; origin:'authored-training'; evidenceLevel:'not-applicable';
  historicalNASAEvent:false; templateId:'fan-repair-v1'; faultId:'training-fan-reversed-v1'; partId:'fan';
  introducedSetupRevision:number; diagnosedSetupRevision:number; removedSetupRevision:number;
  reinstalledSetupRevision:number; qualifiedSetupRevision:number; at:string;
  previous:string; revised:string; reason:string;
};
export type PassportPresentation = {
  sourceEvidence:{origin:'research'; passportEntryIds:string[]; correctionPolicy:'none'};
  trainingHistory:{origin:'authored-training'; evidenceLevel:'not-applicable'; historicalNASAEvent:false; corrections:TrainingCorrection[]};
  learnerConclusions:{origin:'learner-authored'; scientificValidation:'not-assessed'; notes:{entryId:string; noteIndex:number; text:string}[]};
};
export type CheckpointBudget = {payloadBytes:number; limitBytes:20480; remainingBytes:number; warningAtBytes:16384; optionalUpdatesRequireFinalizationCheck:true};
export type Snapshot = TrainingCase & { previewId:PreviewId; runtimeId:string; sessionId:string;
  revision:number; checkpoint:string; checkpointBudget:CheckpointBudget; passportPresentation:PassportPresentation; diagnostic:DiagnosticResult; progress:Progress; evidenceReview:EvidenceReview;
  access:{ scope:'local-gameplay-preview'; expiresAt:string; publicAvailabilityChanged:false; scientificApproval:false } };
// UUIDs identify runtime/case; commandId is 64 lowercase hex SHA-256 of the defined canonical intent.
export type StartRequest = { runtimeId:string; sessionId:string; previewId:PreviewId; mode:'demo'; commandId:string };
export type ActionRequest = { runtimeId:string; sessionId:string; expectedRevision:number; commandId:string; action:TrainingAction };
export type ResumeRequest = { runtimeId:string; checkpoint:string; commandId:string };
export type Wire<T> = { apiVersion:'1'; data:T };
export type StartResponse = Wire<Snapshot>;
export type ResumeResponse = Wire<Snapshot>;
export type DomainResult = { ok:true; snapshot:Snapshot; feedback?:{ correct:boolean; hint:string } }
  | { ok:false; code:TransitionCode|TrainingCode; message:string; faults?:DisplayFault[]; snapshot:Snapshot };
export type ActionResponse = Wire<DomainResult>;
export type DiagnosticSuccess = Wire<{ ok:true; snapshot:Snapshot & { diagnostic:CurrentDiagnostic } }>;
export type CapabilityResponse = Wire<{ enabled:true; authorization:'operator-token-required';
  previewId:PreviewId; runtimeId:string; grant:{status:'required'}|{status:'valid';expiresAt:string} }>;
export type AuthorizeRequest = { approvalToken:string };
export type AuthorizeResponse = Wire<{ authorized:true; expiresAt:string; runtimeId:string }>;
export type RevokeRequest = Record<string, never>;
export type RevokeResponse = Wire<{ authorized:false }>;
export type HttpCode = 'INVALID_REQUEST'|'NOT_FOUND'|'PAYLOAD_TOO_LARGE'|'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'|'INTERNAL_ERROR'|'PREVIEW_UNAUTHORIZED'|'SESSION_NOT_FOUND'|'STALE_SESSION'
  | 'COMMAND_ID_REUSED'|'CHECKPOINT_UNTRUSTED'|'CHECKPOINT_VERSION_UNSUPPORTED'
  | 'CHECKPOINT_KEY_UNAVAILABLE'|'DATASET_MISMATCH'|'PREVIEW_CAPACITY'|'RUNTIME_CHANGED'|'CASE_ID_REUSED';
export type NoteIssue = 'blank'|'outer-whitespace'|'lone-surrogate'|'control-character'|'too-long'|'too-many-bytes';
export type HttpFailure = { apiVersion:'1'; error:{ code:HttpCode; message:string; retryable:boolean; noteIssue?:NoteIssue; context?:{runtimeId:string;currentRevision?:number} } };
export type LocalSlot = { storageVersion:1; epoch:string; generation:number;
  head:{ sessionId:string; revision:number; checkpoint:string } | null };
export type SaveConflictCode = 'LOCAL_NEWER'|'LOCAL_GENERATION_CHANGED'|'LOCAL_SAME_REVISION_CONFLICT'
  | 'LOCAL_DIFFERENT_CASE'|'LOCAL_NEEDS_REVIEW'|'LOCAL_STORAGE_UNAVAILABLE'|'LOCAL_READ_ONLY'|'LOCAL_LOCK_BUSY'|'LOCAL_WRITE_FAILED';
export type LocalSaveResult = { ok:true; epoch:string; generation:number; savedOnDevice:true }
  | { ok:false; code:Exclude<SaveConflictCode,'LOCAL_WRITE_FAILED'>; savedOnDevice:false }
  | { ok:false; code:'LOCAL_WRITE_FAILED'; cause:'quota'|'permission'|'serialization'|'read-back-mismatch'|'read-back-unavailable'; writeOutcome:'not-written'|'unknown'; savedOnDevice:false };
