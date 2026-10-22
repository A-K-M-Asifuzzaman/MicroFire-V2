import {it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {randomBytes,createHmac} from 'node:crypto';
import {canonicalJson,type CheckpointPayload} from '@microfire/shared';
import {createTrainingCase,transitionTraining,validateTrainingCase} from '@microfire/game-core';
import {catalog,catalogSha256} from '@microfire/science';
import {previewConfig,localPreviewRequest,PreviewAuthority,CheckpointCodec,type PreviewConfig} from '../../apps/web/lib/game-preview-security';
import {trainingTime as at,advance,initialActions,episodeActions,sourceActions,diagnoseActions,repairActions,finishActions} from './training-helpers';
export function testPreviewEnv():NodeJS.ProcessEnv{return {MICROFIRE_LOCAL_GAME_PREVIEW:'1',MICROFIRE_PREVIEW_ORIGIN:'http://127.0.0.1:3247',MICROFIRE_PREVIEW_ACCESS_TOKEN:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_SIGNING_KEY:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_REALM_ID:'44444444-4444-4444-8444-444444444444',MICROFIRE_PREVIEW_KEY_ID:'test-only-key'};}
const request=(cookie?:string,headers:Record<string,string>={})=>new Request('http://127.0.0.1:3247/api/game/preview/action',{method:'POST',headers:{host:'127.0.0.1:3247',origin:'http://127.0.0.1:3247',...(cookie?{cookie}:{}),...headers}});
function payload(c:PreviewConfig):CheckpointPayload{return {...createTrainingCase(catalog,at),checkpointVersion:1,previewId:'bass-b20-training-v1',sessionId:'11111111-1111-4111-8111-111111111111',revision:0,catalogSha256,rulesVersion:'m2-training-r3',origin:c.origin,realmId:c.realmId,keyId:c.keyId,issuedAt:at,expiresAt:null,lastCommand:{endpoint:'start',commandId:'a'.repeat(64),expectedRevision:null}};}
function signed(p:unknown,c:PreviewConfig,canonical=true){const raw=Buffer.from(canonical?canonicalJson(p):JSON.stringify(p));return raw.toString('base64url')+'.'+createHmac('sha256',c.signingKey).update('microfire-m2-checkpoint-v1\0').update(raw).digest('base64url');}
it('fails closed without every local setting, on hosted environments, reused/public keys and malformed origins',()=>{
  const env=testPreviewEnv();expect(previewConfig({})).toBe(null);expect(previewConfig(env)).not.toBe(null);
  for(const key of Object.keys(env)){const missing={...env};delete missing[key];expect(previewConfig(missing)).toBe(null);}
  for(const values of [{VERCEL:'1'},{MICROFIRE_PREVIEW_ORIGIN:'https://example.com'},{MICROFIRE_PREVIEW_ORIGIN:'http://127.0.0.1:99999'},{MICROFIRE_PREVIEW_ORIGIN:'http://localhost:3247'},{MICROFIRE_PREVIEW_SIGNING_KEY:env.MICROFIRE_PREVIEW_ACCESS_TOKEN},{MICROFIRE_PREVIEW_SIGNING_KEY:Buffer.alloc(32,7).toString('base64url')}])expect(previewConfig({...env,...values})).toBe(null);
});
it('requires exact Host/Origin, rejects forwarded/cross-site metadata and permits exact Next loopback forwarding',()=>{
  const c=previewConfig(testPreviewEnv())!;expect(localPreviewRequest(request(),c)).toBe(true);
  const internal=new Request('http://localhost:3247/api/game/preview/action',{method:'POST',headers:{host:c.host,origin:c.origin}});expect(localPreviewRequest(internal,c)).toBe(true);
  for(const headers of [{host:'example.com'},{origin:'null'},{origin:'https://evil.test'},{forwarded:'for=127.0.0.1'},{'sec-fetch-site':'cross-site'},{'x-forwarded-for':'127.0.0.1, 1.2.3.4'},{'x-forwarded-proto':'https'}])expect(localPreviewRequest(request(undefined,headers),c)).toBe(false);
  expect(localPreviewRequest(request(undefined,{'x-forwarded-for':'127.0.0.1','x-forwarded-port':'3247','x-forwarded-proto':'http','x-forwarded-host':c.host}),c)).toBe(true);
  const noOrigin=new Request(request());noOrigin.headers.delete('origin');expect(localPreviewRequest(noOrigin,c)).toBe(false);
});
it('issues opaque HttpOnly Strict cookies, reuses grants, and denies copied revoked/expired/restarted grants',()=>{
  const env=testPreviewEnv(),c=previewConfig(env)!;let now=Date.parse(at);const authority=new PreviewAuthority(c,()=>now);
  expect(()=>authority.authorize(request(),'invalid')).toThrow();expect(()=>authority.require(request())).toThrow();
  const auth=authority.authorize(request(),env.MICROFIRE_PREVIEW_ACCESS_TOKEN!);expect(auth.cookie).toMatch(/HttpOnly; SameSite=Strict; Max-Age=3600/);expect(auth.cookie).not.toMatch(/Secure|Domain=/);
  const cookie=auth.cookie!.split(';')[0]!,req=request(cookie);expect(authority.require(req).runtimeId).toBe(authority.runtimeId);
  expect(authority.authorize(req,env.MICROFIRE_PREVIEW_ACCESS_TOKEN!)).toEqual({expiresAt:auth.expiresAt});
  expect(new PreviewAuthority(c,()=>now).current(req)).toBe(null);expect(authority.revoke(req)).toMatch(/Max-Age=0/);expect(authority.current(request(cookie))).toBe(null);expect(authority.revoke(req)).toMatch(/Max-Age=0/);
  const next=authority.authorize(request(),env.MICROFIRE_PREVIEW_ACCESS_TOKEN!).cookie!;now+=3600000;expect(authority.current(request(next.split(';')[0]))).toBe(null);
});
it('bounds absolute grant capacity and does not extend expiration on reuse',()=>{
  const env=testPreviewEnv(),c=previewConfig(env)!;let now=Date.parse(at);const auth=new PreviewAuthority(c,()=>now);let cookie='';
  for(let i=0;i<8;i++)cookie=auth.authorize(request(),env.MICROFIRE_PREVIEW_ACCESS_TOKEN!).cookie!.split(';')[0]!;
  const expiry=auth.current(request(cookie))!.expires;now+=1000;expect(auth.authorize(request(cookie),env.MICROFIRE_PREVIEW_ACCESS_TOKEN!).expiresAt).toBe(new Date(expiry).toISOString());expect(()=>auth.authorize(request(),env.MICROFIRE_PREVIEW_ACCESS_TOKEN!)).toThrow();
});
it('verifies signed canonical checkpoints and rejects MAC, encoding, key, scope, version and revision corruption',()=>{
  const c=previewConfig(testPreviewEnv())!,codec=new CheckpointCodec(c,()=>Date.parse(at));const p=payload(c),token=codec.sign(p);expect(codec.verify(token)).toEqual(p);
  for(const mutate of [(p:CheckpointPayload)=>{p.origin='http://127.0.0.1:3001';},(p:CheckpointPayload)=>{p.realmId='55555555-5555-4555-8555-555555555555';},(p:CheckpointPayload)=>{p.lastCommand.expectedRevision=2;},(p:CheckpointPayload)=>{p.training.diagnosis={faultyRevision:12,at};},(p:CheckpointPayload)=>{p.catalogSha256='0'.repeat(64);},(p:CheckpointPayload)=>{p.keyId='other';}]){const bad=structuredClone(p);mutate(bad);expect(()=>codec.verify(signed(bad,c))).toThrow();}
  expect(()=>codec.verify(token.slice(0,-4)+'AAAA')).toThrow();expect(()=>codec.verify(token+'=')).toThrow();expect(()=>codec.verify(signed({...p,checkpointVersion:2},c))).toThrow();expect(()=>codec.verify(signed(p,c,false))).toThrow();
  expect(()=>new CheckpointCodec({...c,keyId:'rotated'},()=>Date.parse(at)).verify(token)).toThrow();expect(()=>codec.verify('A'.repeat(27352))).toThrow();
});
it('rejects validly signed fabricated scientific text, missing limitations and isolated future diagnosis',()=>{
  const c=previewConfig(testPreviewEnv())!,codec=new CheckpointCodec(c,()=>Date.parse(at));
  for(const state of [advance(initialActions.slice(0,5)),advance(episodeActions.slice(0,-1))]){
    const p={...payload(c),...state,revision:state.training.repair?22:5,lastCommand:{endpoint:'action' as const,commandId:'b'.repeat(64),expectedRevision:state.training.repair?21:4}};
    expect(codec.verify(codec.sign(p)).state).toEqual(state.state);
    const omitted=JSON.parse(JSON.stringify(p));delete omitted.state.passport.entries[0].learnerNotes;expect(()=>codec.verify(signed(omitted,c))).toThrow();
    for(const alter of [(q:CheckpointPayload)=>{q.state.passport.entries[0]!.limitations=['Learner removed canonical source warnings.'];},(q:CheckpointPayload)=>{q.state.passport.entries[0]!.conclusion='NASA certified safe';},(q:CheckpointPayload)=>{q.training.diagnosis={at,faultyRevision:999};},(q:CheckpointPayload)=>{q.state.updatedAt='2026-10-16T10:00:00Z';},(q:CheckpointPayload)=>{q.state.passport.entries[0]!.createdAt='2026-10-16T10:00:00Z';}]){const bad=structuredClone(p);alter(bad);expect(()=>codec.verify(signed(bad,c))).toThrow();}
  }
});
it('rejects diagnostics before Assembly starts while allowing the initial Assembly check',()=>{
  const config=previewConfig(testPreviewEnv())!,codec=new CheckpointCodec(config,()=>Date.parse(at));
  for(const actions of [[],sourceActions.slice(0,3)]){
    const state=advance(actions),p={...payload(config),...state,revision:actions.length,lastCommand:actions.length?{endpoint:'action' as const,commandId:'c'.repeat(64),expectedRevision:actions.length-1}:{endpoint:'start' as const,commandId:'c'.repeat(64),expectedRevision:null}};
    expect(codec.verify(codec.sign(p)).training.diagnosticRevision).toBe(null);
    p.training.diagnosticRevision=0;
    expect(()=>validateTrainingCase({state:p.state,training:p.training},catalog)).toThrow();
    expect(()=>codec.sign(p)).toThrow();expect(()=>codec.verify(signed(p,config))).toThrow();
  }
  const c=advance([...sourceActions,{type:'RUN_DIAGNOSTIC'}]),p={...payload(config),...c,revision:5,lastCommand:{endpoint:'action' as const,commandId:'d'.repeat(64),expectedRevision:4}};
  expect(codec.verify(codec.sign(p)).training.diagnosticRevision).toBe(0);
});
it('rejects a source observation predating its completed repair without rewriting the checkpoint',()=>{
  const config=previewConfig(testPreviewEnv())!,codec=new CheckpointCodec(config,()=>Date.parse(at)+10000);
  let current=advance([...initialActions,...diagnoseActions]);let tick=1;
  for(const action of [...repairActions,...finishActions.slice(0,2)]){
    const result=transitionTraining(current,action,catalog,new Date(Date.parse(at)+1000*tick++).toISOString());
    if(!result.ok)throw Error(result.code);current=result.current;
  }
  const p={...payload(config),...current,revision:22,issuedAt:current.state.updatedAt,lastCommand:{endpoint:'action' as const,commandId:'e'.repeat(64),expectedRevision:21}};
  const good=codec.sign(p);expect(codec.verify(good)).toEqual(p);
  const corrupt=structuredClone(p);corrupt.state.passport.entries[1]!.createdAt=corrupt.training.pendingRepair?.removedAt??corrupt.training.diagnosis!.at;
  expect(corrupt.state.passport.entries[1]!.createdAt<corrupt.training.repair!.at).toBe(true);
  expect(()=>validateTrainingCase({state:corrupt.state,training:corrupt.training},catalog)).toThrow();
  expect(()=>codec.sign(corrupt)).toThrow();expect(()=>codec.verify(signed(corrupt,config))).toThrow();
  expect(codec.verify(good)).toEqual(p);
});
