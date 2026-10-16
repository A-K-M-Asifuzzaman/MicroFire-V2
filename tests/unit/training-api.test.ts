import {it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requestIdentity,type TrainingAction,type Snapshot,ActionResponseSchema,StartResponseSchema} from '@microfire/shared';
import {PreviewService,createPreviewHandler,readPreviewBody,previewResponse} from '../../apps/web/lib/game-preview';
import {previewConfig} from '../../apps/web/lib/game-preview-security';
import {createMemoryLimiter,LIMITS} from '../../apps/web/lib/api';
import {episodeActions,initialActions,diagnoseActions,repairActions,finishActions,trainingTime} from './training-helpers';
function harness(){
  const env={MICROFIRE_LOCAL_GAME_PREVIEW:'1',MICROFIRE_PREVIEW_ORIGIN:'http://127.0.0.1:3247',MICROFIRE_PREVIEW_ACCESS_TOKEN:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_SIGNING_KEY:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_REALM_ID:randomUUID(),MICROFIRE_PREVIEW_KEY_ID:'test-only-api'};
  let clock=Date.parse(trainingTime),cookie='';const limiter=createMemoryLimiter(LIMITS,()=>clock),service=new PreviewService(previewConfig(env)!,limiter,()=>clock);
  const req=(route:string,body?:unknown,headers:Record<string,string>={})=>new Request(env.MICROFIRE_PREVIEW_ORIGIN+'/api/game/preview/'+route,{method:body===undefined?'GET':'POST',headers:{host:'127.0.0.1:3247',origin:env.MICROFIRE_PREVIEW_ORIGIN,...(cookie?{cookie}:{}),'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const send=async(route:string,body?:unknown,pace=true)=>{if(body!==undefined&&pace)clock+=2101;return service.handle(route.split('/'),req(route,body));};
  const authorize=async()=>{const response=await send('authorize',{approvalToken:env.MICROFIRE_PREVIEW_ACCESS_TOKEN});expect(response.status).toBe(200);cookie=response.headers.get('set-cookie')!.split(';')[0]!;};
  const start=async()=>{const r={runtimeId:service.authority.runtimeId,sessionId:randomUUID(),previewId:'bass-b20-training-v1' as const,mode:'demo' as const};const body={...r,commandId:await requestIdentity('start',r)};const response=await send('start',body);expect(response.status).toBe(200);return {body,snapshot:StartResponseSchema.parse(await response.json()).data as Snapshot};};
  const action=async(s:Snapshot,a:TrainingAction)=>{const r={runtimeId:s.runtimeId,sessionId:s.sessionId,expectedRevision:s.revision,action:a};const body={...r,commandId:await requestIdentity('action',r)};const response=await send('action',body);return {body,response,result:ActionResponseSchema.parse(await response.clone().json()).data};};
  const advance=async(s:Snapshot,actions:TrainingAction[])=>{for(const a of actions){const r=await action(s,a);expect(r.response.status).toBe(200);expect(r.result.ok,JSON.stringify(r.result)).toBe(true);s=r.result.snapshot as Snapshot;}return s;};
  return {env,service,req,send,authorize,start,action,advance,tick:(ms:number)=>{clock+=ms;},getCookie:()=>cookie};
}
it('denies disabled, unauthorized, wrong-origin and query attempts without revealing a case',async()=>{
  const h=harness();const off=createPreviewHandler(createMemoryLimiter(LIMITS),()=>({}));expect((await off(['capability'],h.req('capability'))).status).toBe(404);
  expect((await h.send('session/'+randomUUID())).status).toBe(403);expect((await h.send('start',{})).status).toBe(403);
  expect((await h.service.handle(['authorize'],h.req('authorize',{approvalToken:h.env.MICROFIRE_PREVIEW_ACCESS_TOKEN},{origin:'https://evil.test'}))).status).toBe(403);
  expect((await h.service.handle(['capability'],h.req('capability?preview=true'))).status).toBe(400);
  const handler=createPreviewHandler(createMemoryLimiter(LIMITS),()=>h.env);expect((await handler(['capability'],h.req('capability'))).status).toBe(200);h.env.MICROFIRE_LOCAL_GAME_PREVIEW='0';expect((await handler(['capability'],h.req('capability'))).status).toBe(404);h.env.MICROFIRE_LOCAL_GAME_PREVIEW='1';expect((await handler(['capability'],h.req('capability'))).status).toBe(404);
});
it('executes the whole API episode and binds revision22 receipt to its actual observation request',async()=>{
  const h=harness();await h.authorize();let {snapshot:s}=await h.start();
  for(const a of episodeActions){const r=await h.action(s,a);expect(r.result.ok).toBe(true);s=r.result.snapshot as Snapshot;
    if(a.type==='GAME'&&a.action.type==='OBSERVE_DOCUMENTED_RESULT'){expect(s.revision).toBe(22);expect(h.service.codec.verify(s.checkpoint).lastCommand).toEqual({endpoint:'action',commandId:r.body.commandId,expectedRevision:21});}
  }
  expect(s.progress.completedChecks).toBe(5);expect(s.state.passport.entries).toHaveLength(2);expect(s.passportPresentation.trainingHistory.historicalNASAEvent).toBe(false);
});
it('deduplicates accepted commands before stale rejection, reconciles lost acknowledgements and refuses conflicting concurrency',async()=>{
  const h=harness();await h.authorize();const {body:start,snapshot:s}=await h.start();const first=await h.action(s,initialActions[0]!);
  const lost=await h.send('session/'+s.sessionId);expect(StartResponseSchema.parse(await lost.json()).data.revision).toBe(1);
  const duplicate=await h.send('action',first.body);expect((await duplicate.json()).data.snapshot.checkpoint).toBe(first.result.snapshot.checkpoint);
  const restarted=await h.send('start',start);expect((await restarted.json()).data.revision).toBe(1);
  const one=first.result.snapshot as Snapshot;
  const bodies=await Promise.all([initialActions[1]!,{type:'GAME',action:{type:'INSPECT_EVIDENCE',experimentId:'bass2-b20'}} as TrainingAction].map(async action=>{const r={runtimeId:one.runtimeId,sessionId:one.sessionId,expectedRevision:one.revision,action};return {...r,commandId:await requestIdentity('action',r)};}));
  const responses=await Promise.all(bodies.map(body=>h.send('action',body)));
  expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
  const head=StartResponseSchema.parse(await (await h.send('session/'+s.sessionId)).json()).data;expect(head.revision).toBe(2);
  const changed={...first.body,expectedRevision:2};expect((await h.send('action',changed)).status).toBe(409);
});
it('returns unchanged domain refusals and invalid-note400 before hashing, and retains all maximum notes through completion',async()=>{
  const h=harness();await h.authorize();const start=await h.start();let s=await h.advance(start.snapshot,initialActions);
  const refused=await h.action(s,finishActions[0]!);expect(refused.result.ok).toBe(false);if(!refused.result.ok)expect(refused.result.code).toBe('REPAIR_REQUIRED');expect(refused.result.snapshot.checkpoint).toBe(s.checkpoint);
  s=await h.advance(s,[...diagnoseActions,...repairActions,...finishActions.slice(0,2)]);
  const invalid={runtimeId:s.runtimeId,sessionId:s.sessionId,expectedRevision:s.revision,commandId:'0'.repeat(64),action:{type:'ADD_LEARNER_NOTE',text:'\ud800'}};
  const response=await h.send('action',invalid);expect(response.status).toBe(400);expect((await response.json()).error.noteIssue).toBe('lone-surrogate');
  s=await h.advance(s,Array.from({length:4},()=>({type:'ADD_LEARNER_NOTE',text:'界'.repeat(500)} as const)));
  const fifth=await h.action(s,{type:'ADD_LEARNER_NOTE',text:'fifth'});expect(!fifth.result.ok&&fifth.result.code).toBe('NOTE_LIMIT_REACHED');expect(fifth.result.snapshot.checkpoint).toBe(s.checkpoint);
  s=await h.advance(s,[finishActions[2]!]);expect(s.state.passport.entries[1]!.learnerNotes).toHaveLength(4);expect(s.state.passport.entries[1]!.limitations.length).toBeGreaterThan(0);expect(Buffer.byteLength(JSON.stringify(s))).toBeLessThan(65536);
});
it('restores exact signed progress after restart, denies old cookies/runtime and prevents live-head rollback',async()=>{
  const h=harness();await h.authorize();let {snapshot:s}=await h.start();s=await h.advance(s,initialActions);
  const oldToken=s.checkpoint;const r=await h.action(s,{type:'RUN_DIAGNOSTIC'});s=r.result.snapshot as Snapshot;
  const makeResume=async(token:string,runtimeId=s.runtimeId)=>{const body={runtimeId,checkpoint:token};return {...body,commandId:await requestIdentity('resume',body)};};
  expect((await h.send('resume',await makeResume(oldToken))).status).toBe(409);const resumed=await h.send('resume',await makeResume(s.checkpoint));expect((await resumed.json()).data.checkpoint).toBe(s.checkpoint);
  const restarted=new PreviewService(previewConfig(h.env)!,createMemoryLimiter(LIMITS),()=>Date.parse(trainingTime)+100000);
  expect((await restarted.handle(['resume'],h.req('resume',await makeResume(s.checkpoint)))).status).toBe(403);
  const auth=await restarted.handle(['authorize'],h.req('authorize',{approvalToken:h.env.MICROFIRE_PREVIEW_ACCESS_TOKEN}));const cookie=auth.headers.get('set-cookie')!.split(';')[0]!;
  const request=(body:unknown)=>h.req('resume',body,{cookie});expect((await restarted.handle(['resume'],request(await makeResume(s.checkpoint)))).status).toBe(409);
  const body=await makeResume(s.checkpoint,restarted.authority.runtimeId);const ok=await restarted.handle(['resume'],request(body));expect(ok.status).toBe(200);expect((await ok.json()).data.checkpoint).toBe(s.checkpoint);
  const tampered=s.checkpoint.slice(0,-4)+'AAAA';expect((await restarted.handle(['resume'],request(await makeResume(tampered,restarted.authority.runtimeId)))).status).toBe(400);
});
it('counts retries and invalid inputs against the unchanged shared POST window with Retry-After',async()=>{
  const h=harness();for(let i=0;i<30;i++)expect((await h.send('authorize',{approvalToken:'wrong'},false)).status).toBe(403);
  const limit=await h.send('authorize',{approvalToken:'wrong'},false);expect(limit.status).toBe(429);expect(limit.headers.get('retry-after')).toBe('60');expect((await limit.json()).error.retryable).toBe(true);
  h.tick(60000);expect((await h.send('authorize',{approvalToken:'wrong'},false)).status).toBe(403);
});
it('retains start tombstones after idle eviction and enforces active case capacity',async()=>{
  const h=harness();await h.authorize();const first=await h.start();for(let i=1;i<8;i++)await h.start();
  const extra={...first.body,sessionId:randomUUID()};extra.commandId=await requestIdentity('start',extra);expect((await h.send('start',extra)).status).toBe(503);
  h.tick(3600001);await h.authorize();expect((await h.send('start',first.body)).status).toBe(404);
  const req={runtimeId:h.service.authority.runtimeId,checkpoint:first.snapshot.checkpoint};const restored=await h.send('resume',{...req,commandId:await requestIdentity('resume',req)});expect(restored.status).toBe(200);expect((await restored.json()).data.revision).toBe(0);
});
it('enforces actual UTF8 request and response boundaries, duplicate JSON and malformed encoding',async()=>{
  const body=(raw:BodyInit)=>new Request('http://127.0.0.1/api',{method:'POST',headers:{'content-type':'application/json'},body:raw});
  for(const n of [32767,32768])expect(await readPreviewBody(body('{}'+' '.repeat(n-2)))).toEqual({});
  await expect(readPreviewBody(body('{}'+' '.repeat(32767)))) .rejects.toMatchObject({status:413});
  for(const raw of ['{"a":1,"a":2}',new Uint8Array([123,34,97,34,58,34,255,34,125])])await expect(readPreviewBody(body(raw))).rejects.toMatchObject({status:400});
  const chunked=(size:number)=>{const json='{"text":"界"}',encoded=new TextEncoder().encode(json+' '.repeat(size-new TextEncoder().encode(json).length));const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(encoded.slice(0,10));c.enqueue(encoded.slice(10,100));c.enqueue(encoded.slice(100));c.close();}});const init:RequestInit&{duplex:'half'}={method:'POST',headers:{'content-type':'application/json','content-length':'1'},body:stream,duplex:'half'};return new Request('http://127.0.0.1/api',init);};
  expect(await readPreviewBody(chunked(32768))).toEqual({text:'界'});
  await expect(readPreviewBody(chunked(32769))).rejects.toMatchObject({status:413});
  await expect(readPreviewBody(new Request('http://127.0.0.1/api',{method:'POST',body:'{}'}))).rejects.toMatchObject({status:415});
  for(const n of [65535,65536])expect(Buffer.byteLength(await previewResponse(z.string(),'x'.repeat(n-2)).text())).toBe(n);
  expect(()=>previewResponse(z.string(),'x'.repeat(65535))).toThrow();
  const h=harness();await h.authorize();const oversized={runtimeId:h.service.authority.runtimeId,checkpoint:'A'.repeat(27308)+'.'+'A'.repeat(43)};const response=await h.send('resume',{...oversized,commandId:await requestIdentity('resume',oversized)});expect(response.status).toBe(413);
});

it('rechecks revocation after an in-flight body read before any case mutation',async()=>{
  const h=harness();await h.authorize();const {snapshot}=await h.start();
  const r={runtimeId:snapshot.runtimeId,sessionId:snapshot.sessionId,expectedRevision:0,action:initialActions[0]!};const body={...r,commandId:await requestIdentity('action',r)};
  let controller!:ReadableStreamDefaultController<Uint8Array>;const stream=new ReadableStream<Uint8Array>({start(c){controller=c;}});
  const init:RequestInit&{duplex:'half'}={method:'POST',headers:{host:'127.0.0.1:3247',origin:h.env.MICROFIRE_PREVIEW_ORIGIN,'content-type':'application/json',cookie:h.getCookie()},body:stream,duplex:'half'};
  const pending=h.service.handle(['action'],new Request(h.env.MICROFIRE_PREVIEW_ORIGIN+'/api/game/preview/action',init));
  await h.send('revoke',{});controller.enqueue(new TextEncoder().encode(JSON.stringify(body)));controller.close();expect((await pending).status).toBe(403);
  await h.authorize();const head=StartResponseSchema.parse(await (await h.send('session/'+snapshot.sessionId)).json()).data;expect(head.checkpoint).toBe(snapshot.checkpoint);
});
it('bounds 256 issued-case tombstones without evicting identities and still resumes known cases',async()=>{
  const h=harness();await h.authorize();let first:Snapshot|undefined;
  for(let i=0;i<256;i++){
    if(i&&i%8===0){h.tick(3600001);await h.authorize();}
    const started=await h.start();first??=started.snapshot;
  }
  h.tick(3600001);await h.authorize();const r={runtimeId:h.service.authority.runtimeId,sessionId:randomUUID(),previewId:'bass-b20-training-v1',mode:'demo'};
  expect((await h.send('start',{...r,commandId:await requestIdentity('start',r)})).status).toBe(503);
  const resume={runtimeId:h.service.authority.runtimeId,checkpoint:first!.checkpoint};expect((await h.send('resume',{...resume,commandId:await requestIdentity('resume',resume)})).status).toBe(200);
});
it('preserves a 32-action completion reserve while allowing essential repair and completion',async()=>{
  const h=harness();await h.authorize();let {snapshot}=await h.start();snapshot=await h.advance(snapshot,[...initialActions,...diagnoseActions,repairActions[0]!]);
  const p=h.service.codec.verify(snapshot.checkpoint);p.sessionId=randomUUID();p.revision=Number.MAX_SAFE_INTEGER-32;p.lastCommand={endpoint:'action',commandId:'d'.repeat(64),expectedRevision:p.revision-1};
  const checkpoint=h.service.codec.sign(p),resume={runtimeId:snapshot.runtimeId,checkpoint};const response=await h.send('resume',{...resume,commandId:await requestIdentity('resume',resume)});expect(response.status).toBe(200);snapshot=StartResponseSchema.parse(await response.json()).data as Snapshot;
  const optional=await h.action(snapshot,{type:'RUN_DIAGNOSTIC'});expect(!optional.result.ok&&optional.result.code).toBe('CHECKPOINT_LIMIT_REACHED');expect(optional.result.snapshot.checkpoint).toBe(checkpoint);
  snapshot=await h.advance(snapshot,[repairActions[3]!,...finishActions]);expect(snapshot.progress.completedChecks).toBe(5);expect(Number.isSafeInteger(snapshot.revision)).toBe(true);
});
