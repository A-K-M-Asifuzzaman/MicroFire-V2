import 'server-only';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {
  ActionRequestSchema,StartRequestSchema,ResumeRequestSchema,AuthorizeRequestSchema,RevokeRequestSchema,PreviewUuidSchema,
  ActionResponseSchema,StartResponseSchema,CapabilityResponseSchema,AuthorizeResponseSchema,RevokeResponseSchema,HttpFailureSchema,
  SnapshotSchema,canonicalJson,parsePreviewJson,noteIssue,partDefinitions,
  type CheckpointPayload,type Snapshot,type TrainingCase,type ActionRequest,type LastCommand,type HttpFailure,type TrainingAction
} from '@microfire/shared';
import {createTrainingCase,transitionTraining,trainingDiagnostic,trainingPassport,trainingProgress} from '@microfire/game-core';
import {catalog,catalogSha256} from '@microfire/science';
import {PreviewAuthority,CheckpointCodec,PreviewFailure,previewConfig,localPreviewRequest,type PreviewConfig} from './game-preview-security';
import {type RateLimiter} from './api';

const HEADERS={'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Cross-Origin-Resource-Policy':'same-origin','Content-Type':'application/json'};
export const PREVIEW_RESPONSE_LIMIT=65536;
export function previewResponse(schema:z.ZodType,value:unknown,status=200):Response {
  const body=canonicalJson(schema.parse(value));
  if(Buffer.byteLength(body)>PREVIEW_RESPONSE_LIMIT)throw new PreviewFailure(413,'PAYLOAD_TOO_LARGE','The response exceeds its byte budget; the candidate was not committed.');
  return new Response(body,{status,headers:HEADERS});
}
const success=(schema:z.ZodType,data:unknown)=>previewResponse(schema,{apiVersion:'1',data});
function failure(error:PreviewFailure,context?:HttpFailure['error']['context'],issue?:HttpFailure['error']['noteIssue']):Response {
  return previewResponse(HttpFailureSchema,{apiVersion:'1',error:{code:error.code,message:error.message,retryable:error.status===429||error.status===503,...(context?{context}:{}),...(issue?{noteIssue:issue}:{})}},error.status);
}
export async function readPreviewBody(request:Request):Promise<unknown> {
  if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')throw new PreviewFailure(415,'UNSUPPORTED_MEDIA_TYPE','Use application/json.');
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length))))throw new PreviewFailure(400,'INVALID_REQUEST','Invalid body length.');
  if(length!==null&&Number(length)>32768)throw new PreviewFailure(413,'PAYLOAD_TOO_LARGE','Request exceeds 32 KiB.');
  const reader=request.body?.getReader();if(!reader)throw new PreviewFailure(400,'INVALID_REQUEST','A JSON body is required.');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();throw new PreviewFailure(413,'PAYLOAD_TOO_LARGE','Request exceeds 32 KiB.');}chunks.push(part.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return parsePreviewJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new PreviewFailure(400,'INVALID_REQUEST','Malformed or ambiguous JSON.');}
}
type CaseHead={payload:CheckpointPayload;checkpoint:string;feedback?:{correct:boolean;hint:string};lastUsed:number};
const digest=(endpoint:string,body:Record<string,unknown>):string=>{const {commandId:_id,...request}=body;void _id;return createHash('sha256').update(canonicalJson({endpoint,request})).digest('hex');};
function essential(c:TrainingCase,a:TrainingAction):boolean {
  const s=c.state,t=c.training,p=trainingProgress(c);
  if(a.type==='RUN_DIAGNOSTIC')return !!t.fault&&!t.diagnosis&&t.diagnosticRevision!==s.setup.revision;
  if(a.type==='SUBMIT_DIAGNOSIS')return !t.diagnosis&&a.partId==='fan'&&a.faultCode==='REVERSED';
  if(a.type!=='GAME')return false;
  const x=a.action;
  switch(x.type){
    case 'START_MISSION':return x.missionId==='bass-assembly'&&s.activeMission===null;
    case 'INSPECT_EVIDENCE':return !s.inspectedExperimentIds.includes('bass2-b20');
    case 'COLLECT_EVIDENCE':return !s.passport.entries.some(e=>e.missionId==='station-arrival');
    case 'COMPLETE_MISSION':return !s.completedMissions.includes(x.missionId);
    case 'QUALIFY_INSTRUMENT':return p.qualificationReady;
    case 'OBSERVE_DOCUMENTED_RESULT':return p.step==='b20-inspection-required';
    case 'INSTALL_PART':return x.orientation==='correct'&&!s.setup.installedParts.some(p=>p.partId===x.partId);
    case 'REMOVE_PART':{
      const p=s.setup.installedParts.find(p=>p.partId===x.partId);if(!p)return false;
      if(p.orientation==='reversed'&&partDefinitions.find(d=>d.id===p.partId)!.orientationFault)return true;
      // Correctly mounted children may have to be removed to repair a reversed holder.
      return partDefinitions.find(d=>d.id===x.partId)!.requires.some(id=>s.setup.installedParts.some(p=>p.partId===id&&p.orientation==='reversed'));
    }
  }
}
// Upper-bound finalization shape: both reducer-produced source entries, all notes/counts and maximum-width revisions.
function completionBound(payload:CheckpointPayload):number {
  const p=structuredClone(payload),at=p.issuedAt;
  let c=createTrainingCase(catalog,at);
  const actions:TrainingAction[]=[{type:'GAME',action:{type:'INSPECT_EVIDENCE',experimentId:'bass2-b20'}},{type:'GAME',action:{type:'COLLECT_EVIDENCE',experimentId:'bass2-b20',claimId:'bass2-b20-burned-entire-sample'}},{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'station-arrival'}},{type:'GAME',action:{type:'START_MISSION',missionId:'bass-assembly'}},...partDefinitions.map(d=>({type:'GAME' as const,action:{type:'INSTALL_PART' as const,partId:d.id,anchorId:d.anchorId,orientation:'correct' as const}})),{type:'RUN_DIAGNOSTIC'},{type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'},{type:'GAME',action:{type:'REMOVE_PART',partId:'fan'}},{type:'GAME',action:{type:'INSTALL_PART',partId:'fan',anchorId:'duct-inlet',orientation:'correct'}},{type:'GAME',action:{type:'QUALIFY_INSTRUMENT'}},{type:'GAME',action:{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b20'}},{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'bass-assembly'}}];
  for(const action of actions){const r=transitionTraining(c,action,catalog,at);if(!r.ok)throw Error('Completion budget template failed');c=r.current;}
  const notes=p.state.passport.entries.flatMap(e=>e.learnerNotes);
  const counts=p.training.diagnosisCounts.map(n=>({...n,count:Number.MAX_SAFE_INTEGER}));
  if(!counts.some(n=>n.partId==='fan'&&n.faultCode==='REVERSED'))counts.push({partId:'fan',faultCode:'REVERSED',count:1});
  c.training.diagnosisCounts=counts;c.training.firstWrongDiagnosis=p.training.firstWrongDiagnosis;c.training.lastWrongDiagnosis=p.training.lastWrongDiagnosis;
  const max=Number.MAX_SAFE_INTEGER;
  c.state.setup.revision=max;c.state.setup.qualifiedRevision=max;
  const entry=c.state.passport.entries.find(e=>e.missionId==='bass-assembly')!;entry.setupRevision=max;entry.id=`bass-assembly-bass2-b20-r${max}`;entry.learnerNotes=notes;
  c.training.fault!.introducedRevision=max-3;c.training.diagnosis!.faultyRevision=max-3;c.training.diagnosticRevision=max-3;c.training.repair!.removedAtRevision=max-2;c.training.repair!.reinstalledAtRevision=max;
  const final={...p,...c,revision:max,lastCommand:{endpoint:'action',commandId:'f'.repeat(64),expectedRevision:max-1}};
  return Buffer.byteLength(canonicalJson(final));
}
export class PreviewService {
  readonly authority:PreviewAuthority;
  readonly codec:CheckpointCodec;
  private readonly cases=new Map<string,CaseHead>();
  private readonly issued=new Map<string,string|null>();
  private readonly locks=new Map<string,Promise<void>>();
  constructor(readonly config:PreviewConfig,private readonly limiter:RateLimiter,private readonly now:()=>number=Date.now){this.authority=new PreviewAuthority(config,now);this.codec=new CheckpointCodec(config,now);}
  private async locked<T>(key:string,fn:()=>T):Promise<T>{
    const before=this.locks.get(key)??Promise.resolve();let unlock!:()=>void;
    const tail=new Promise<void>(resolve=>{unlock=resolve;});this.locks.set(key,tail);
    await before;try{return fn();}finally{unlock();if(this.locks.get(key)===tail)this.locks.delete(key);}
  }
  private sweep(){for(const [id,head]of this.cases)if(head.lastUsed+3600000<=this.now())this.cases.delete(id);}
  private snapshot(head:CaseHead,request:Request):Snapshot {
    const grant=this.authority.require(request),p=head.payload,size=Buffer.byteLength(canonicalJson(p));
    return SnapshotSchema.parse({state:p.state,training:p.training,previewId:p.previewId,runtimeId:this.authority.runtimeId,sessionId:p.sessionId,revision:p.revision,checkpoint:head.checkpoint,checkpointBudget:{payloadBytes:size,limitBytes:20480,remainingBytes:20480-size,warningAtBytes:16384,optionalUpdatesRequireFinalizationCheck:true},passportPresentation:trainingPassport(p),diagnostic:trainingDiagnostic(p),progress:trainingProgress(p),evidenceReview:{status:p.state.passport.entries.length?'lineage-verified':'empty',scope:'structure-and-citation-lineage-only',certification:false,catalogSha256,entries:p.state.passport.entries.map(e=>({entryId:e.id,status:'lineage-verified',issues:[]}))},access:{scope:'local-gameplay-preview',expiresAt:new Date(grant.expires).toISOString(),publicAvailabilityChanged:false,scientificApproval:false}});
  }
  private candidate(c:TrainingCase,sessionId:string,revision:number,lastCommand:LastCommand):CaseHead {
    const payload:CheckpointPayload={...c,checkpointVersion:1,previewId:'bass-b20-training-v1',sessionId,revision,catalogSha256,rulesVersion:'m2-training-r3',origin:this.config.origin,realmId:this.config.realmId,keyId:this.config.keyId,issuedAt:new Date(this.now()).toISOString(),expiresAt:null,lastCommand};
    return {payload,checkpoint:this.codec.sign(payload),lastUsed:this.now()};
  }
  private context(sessionId?:string):HttpFailure['error']['context'] {const head=sessionId?this.cases.get(sessionId):undefined;return {runtimeId:this.authority.runtimeId,...(head?{currentRevision:head.payload.revision}:{})};}
  private capacity(sessionId:string){if(this.cases.size>=8||(!this.issued.has(sessionId)&&this.issued.size>=256))throw new PreviewFailure(503,'PREVIEW_CAPACITY','The local case capacity is full. Retain checkpoints and retry after capacity is available.');}
  private action(body:ActionRequest,request:Request):Response {
    this.authority.require(request);const head=this.cases.get(body.sessionId);if(!head)throw new PreviewFailure(404,'SESSION_NOT_FOUND','This case is absent. Explicitly resume its saved checkpoint.');
    const previous=head.payload.lastCommand;
    if(previous.endpoint==='action'&&previous.commandId===body.commandId&&head.payload.revision===body.expectedRevision+1){const response=success(ActionResponseSchema,{ok:true,snapshot:this.snapshot(head,request),...(head.feedback?{feedback:head.feedback}:{})});head.lastUsed=this.now();return response;}
    if(head.payload.revision!==body.expectedRevision)throw new PreviewFailure(409,'STALE_SESSION','The case revision changed. Read its current head before deciding what to do.');
    const refused=(code:'CHECKPOINT_LIMIT_REACHED',message:string)=>success(ActionResponseSchema,{ok:false,code,message,snapshot:this.snapshot(head,request)});
    if(head.payload.revision===Number.MAX_SAFE_INTEGER||(!essential(head.payload,body.action)&&head.payload.revision>=Number.MAX_SAFE_INTEGER-32))return refused('CHECKPOINT_LIMIT_REACHED','This optional action would consume the case completion reserve. Your previous checkpoint is unchanged.');
    const result=transitionTraining({state:head.payload.state,training:head.payload.training},body.action,catalog,new Date(this.now()).toISOString());
    if(!result.ok){const {current:_current,...feedback}=result;void _current;return success(ActionResponseSchema,{...feedback,snapshot:this.snapshot(head,request)});}
    let candidate:CaseHead,response:Response;
    try{
      candidate=this.candidate(result.current,body.sessionId,head.payload.revision+1,{endpoint:'action',commandId:body.commandId,expectedRevision:body.expectedRevision});
      if(!essential(head.payload,body.action)&&completionBound(candidate.payload)+4096>20480)return refused('CHECKPOINT_LIMIT_REACHED','This optional update would leave insufficient completion headroom. Your previous checkpoint is unchanged.');
      if(result.feedback)candidate.feedback=result.feedback;
      response=success(ActionResponseSchema,{ok:true,snapshot:this.snapshot(candidate,request),...(result.feedback?{feedback:result.feedback}:{})});
    }catch(error){if(error instanceof PreviewFailure&&error.code==='PAYLOAD_TOO_LARGE')return refused('CHECKPOINT_LIMIT_REACHED','This action exceeds the case byte budget. Your previous checkpoint remains recoverable.');throw error;}
    this.authority.require(request);this.cases.set(body.sessionId,candidate);return response;
  }
  async handle(path:string[],request:Request):Promise<Response> {
    let sessionId:string|undefined;
    try{
      const rate=this.limiter.take(request.method==='GET'?'read':'write');
      if(!rate.allowed){const r=failure(new PreviewFailure(429,'RATE_LIMITED','Local request budget reached; retry after the indicated delay.'));r.headers.set('Retry-After',String(rate.retryAfterSeconds));return r;}
      if(request.headers.get('host')!==this.config.host)throw new PreviewFailure(404,'NOT_FOUND','API route not found.');
      if(!localPreviewRequest(request,this.config))throw new PreviewFailure(403,'PREVIEW_UNAUTHORIZED','This request is not from the authorized local origin.');
      if(new URL(request.url).search)throw new PreviewFailure(400,'INVALID_REQUEST','Preview endpoints do not accept query parameters.');
      this.sweep();const route=path.join('/');
      if(request.method==='GET'&&route==='capability'){
        const grant=this.authority.current(request);return success(CapabilityResponseSchema,{enabled:true,authorization:'operator-token-required',previewId:'bass-b20-training-v1',runtimeId:this.authority.runtimeId,grant:grant?{status:'valid',expiresAt:new Date(grant.expires).toISOString()}:{status:'required'}});
      }
      const publicPost=request.method==='POST'&&(route==='authorize'||route==='revoke');
      if(!publicPost)this.authority.require(request);
      if(request.method==='GET'&&path.length===2&&path[0]==='session'){
        const parsed=PreviewUuidSchema.safeParse(path[1]);if(!parsed.success)throw new PreviewFailure(400,'INVALID_REQUEST','Invalid case identifier.');
        const head=this.cases.get(parsed.data);if(!head)throw new PreviewFailure(404,'SESSION_NOT_FOUND','This case is absent. Explicitly resume its saved checkpoint.');
        const response=success(StartResponseSchema,this.snapshot(head,request));head.lastUsed=this.now();return response;
      }
      if(request.method!=='POST')throw new PreviewFailure(404,'NOT_FOUND','API route not found.');
      const raw=await readPreviewBody(request);
      if(route==='authorize'){
        const p=AuthorizeRequestSchema.safeParse(raw);if(!p.success)throw new PreviewFailure(400,'INVALID_REQUEST','Invalid authorization request.');
        const auth=this.authority.authorize(request,p.data.approvalToken),response=success(AuthorizeResponseSchema,{authorized:true,expiresAt:auth.expiresAt,runtimeId:this.authority.runtimeId});if(auth.cookie)response.headers.set('Set-Cookie',auth.cookie);return response;
      }
      if(route==='revoke'){
        if(!RevokeRequestSchema.safeParse(raw).success)throw new PreviewFailure(400,'INVALID_REQUEST','Revocation requires an empty JSON object.');
        const response=success(RevokeResponseSchema,{authorized:false});response.headers.set('Set-Cookie',this.authority.revoke(request));return response;
      }
      this.authority.require(request);
      const schema=route==='start'?StartRequestSchema:route==='action'?ActionRequestSchema:route==='resume'?ResumeRequestSchema:null;
      if(!schema)throw new PreviewFailure(404,'NOT_FOUND','API route not found.');
      // Content failures precede intent hashing, including strings canonical JSON cannot encode.
      if(route==='action'&&raw&&typeof raw==='object'&&'action' in raw){const a=(raw as {action:unknown}).action;if(a&&typeof a==='object'&&'type' in a&&a.type==='ADD_LEARNER_NOTE'&&'text' in a&&typeof a.text==='string'){const issue=noteIssue(a.text);if(issue)return failure(new PreviewFailure(400,'INVALID_REQUEST','Edit the learner note before submitting it again. Your previous progress is unchanged.'),undefined,issue);}}
      if(route==='resume'&&raw&&typeof raw==='object'&&'checkpoint' in raw&&typeof raw.checkpoint==='string'&&raw.checkpoint.length>27351)throw new PreviewFailure(413,'PAYLOAD_TOO_LARGE','The checkpoint token is oversized. Preserve its raw bytes.');
      const parsed=schema.safeParse(raw);if(!parsed.success)throw new PreviewFailure(400,'INVALID_REQUEST','Request does not match the training contract.');
      const body=parsed.data;
      if('sessionId' in body)sessionId=body.sessionId;
      if(digest(route,body)!==body.commandId)throw new PreviewFailure(409,'COMMAND_ID_REUSED','The command identity does not match the exact request.');
      if(body.runtimeId!==this.authority.runtimeId)throw new PreviewFailure(409,'RUNTIME_CHANGED','The local server restarted. Reauthorize and explicitly resume a saved checkpoint.');
      if(route==='action')return await this.locked('case:'+sessionId,()=>this.action(ActionRequestSchema.parse(body),request));
      return await this.locked('realm',()=>{
        this.authority.require(request);this.sweep();
        if(route==='start'){
          const start=StartRequestSchema.parse(body),old=this.cases.get(start.sessionId);
          if(this.issued.has(start.sessionId)){
            if(this.issued.get(start.sessionId)!==start.commandId)throw new PreviewFailure(409,'CASE_ID_REUSED','This case identifier belongs to a different start intent.');
            if(!old)throw new PreviewFailure(404,'SESSION_NOT_FOUND','This issued case is no longer active. Resume its checkpoint; starting cannot reset it.');
            const response=success(StartResponseSchema,this.snapshot(old,request));old.lastUsed=this.now();return response;
          }
          this.capacity(start.sessionId);const c=createTrainingCase(catalog,new Date(this.now()).toISOString()),head=this.candidate(c,start.sessionId,0,{endpoint:'start',commandId:start.commandId,expectedRevision:null});
          const response=success(StartResponseSchema,this.snapshot(head,request));this.authority.require(request);this.cases.set(start.sessionId,head);this.issued.set(start.sessionId,start.commandId);return response;
        }
        const resume=ResumeRequestSchema.parse(body),payload=this.codec.verify(resume.checkpoint),old=this.cases.get(payload.sessionId);sessionId=payload.sessionId;
        if(old){if(old.payload.revision!==payload.revision||old.checkpoint!==resume.checkpoint)throw new PreviewFailure(409,'STALE_SESSION','Resume cannot replace a different live case head.');const response=success(StartResponseSchema,this.snapshot(old,request));old.lastUsed=this.now();return response;}
        this.capacity(payload.sessionId);const head:CaseHead={payload,checkpoint:resume.checkpoint,lastUsed:this.now()};const response=success(StartResponseSchema,this.snapshot(head,request));this.authority.require(request);this.cases.set(payload.sessionId,head);if(!this.issued.has(payload.sessionId))this.issued.set(payload.sessionId,null);return response;
      });
    }catch(error){if(error instanceof PreviewFailure)return failure(error,error.status===409&&this.authority.current(request)?this.context(sessionId):undefined);return failure(new PreviewFailure(500,'INTERNAL_ERROR','The preview request could not be processed. Preserve its intent and reconcile the current case.'));}
  }
  disable(){this.authority.clear();this.cases.clear();this.issued.clear();}
}
export function createPreviewHandler(limiter:RateLimiter,env:()=>NodeJS.ProcessEnv=()=>process.env,now:()=>number=Date.now){
  const config=previewConfig(env()),fingerprint=JSON.stringify(config),service=config?new PreviewService(config,limiter,now):null;let invalidated=false;
  return async(path:string[],request:Request):Promise<Response>=>{
    if(invalidated||!service||JSON.stringify(previewConfig(env()))!==fingerprint){invalidated=true;service?.disable();return failure(new PreviewFailure(404,'NOT_FOUND','API route not found.'));}
    return service.handle(path,request);
  };
}
