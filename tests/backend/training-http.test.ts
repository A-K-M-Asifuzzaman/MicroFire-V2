import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {requestIdentity,ActionResponseSchema,StartResponseSchema,type Snapshot,type TrainingAction,type CheckpointPayload,canonicalJson} from '@microfire/shared';
import {sourceActions,initialActions,diagnoseActions,repairActions,finishActions} from '../unit/training-helpers';

type Server={url:string;child:ChildProcess;env:NodeJS.ProcessEnv;stop:()=>Promise<void>};
async function server(requestedPort:number,enabled=true,settings?:NodeJS.ProcessEnv):Promise<Server>{
  const offset=Number(process.env.MICROFIRE_HTTP_TEST_PORT_OFFSET??0),port=requestedPort+offset;
  assert(Number.isSafeInteger(offset)&&offset>=0&&port<=65535,'Invalid isolated test port offset');
  const url=`http://127.0.0.1:${port}`;
  try{await fetch(url+'/api/health');throw Error('Refusing an occupied test port');}catch(e){if(e instanceof Error&&e.message==='Refusing an occupied test port')throw e;}
  const env:NodeJS.ProcessEnv={...process.env,NEXT_TELEMETRY_DISABLED:'1',MICROFIRE_LOCAL_GAME_PREVIEW:enabled?'1':'0',MICROFIRE_PREVIEW_ORIGIN:url,MICROFIRE_PREVIEW_ACCESS_TOKEN:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_SIGNING_KEY:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_REALM_ID:randomUUID(),MICROFIRE_PREVIEW_KEY_ID:'isolated-http-test',...settings};
  const args=enabled?['--conditions=react-server','--import','tsx',path.resolve('scripts/local-game-preview.ts')]:[path.resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)];
  const child=spawn(process.execPath,args,{cwd:enabled?process.cwd():path.resolve('apps/web'),env,stdio:'ignore'});
  const stop=()=>new Promise<void>(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',()=>resolve());child.kill('SIGTERM');});
  for(let i=0;i<150;i++){if(child.exitCode!==null)throw Error('Isolated server exited before startup');try{if((await fetch(url+'/api/health')).ok)return {url,child,env,stop};}catch{/* Startup polling tolerates connection refusal until the server binds. */}await delay(200);}
  await stop();throw Error('Isolated server startup timed out');
}
function client(s:Server){
  let cookie='',runtimeId='';
  const raw=(route:string,body?:unknown,extra:Record<string,string>={})=>fetch(s.url+'/api/game/preview/'+route,{method:body===undefined?'GET':'POST',headers:{origin:s.url,'content-type':'application/json',...(cookie?{cookie}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const auth=async()=>{const response=await raw('authorize',{approvalToken:s.env.MICROFIRE_PREVIEW_ACCESS_TOKEN});assert.equal(response.status,200);const set=response.headers.get('set-cookie')!;assert.match(set,/HttpOnly/);assert.match(set,/SameSite=Strict/);assert(!set.includes('Secure')&&!set.includes('Domain='));cookie=set.split(';')[0]!;runtimeId=(await response.json()).data.runtimeId;return set;};
  const start=async()=>{const r={runtimeId,sessionId:randomUUID(),previewId:'bass-b20-training-v1' as const,mode:'demo' as const};const body={...r,commandId:await requestIdentity('start',r)};const response=await raw('start',body);assert.equal(response.status,200);return {body,snapshot:StartResponseSchema.parse(await response.json()).data as Snapshot};};
  const actionBody=async(snapshot:Snapshot,action:TrainingAction)=>{const r={runtimeId,sessionId:snapshot.sessionId,expectedRevision:snapshot.revision,action};return {...r,commandId:await requestIdentity('action',r)};};
  let rateRecoveries=0;
  const action=async(snapshot:Snapshot,a:TrainingAction,allowRateRecovery=false)=>{
    const body=await actionBody(snapshot,a);let response=await raw('action',body);
    if(response.status===429&&allowRateRecovery){const seconds=Number(response.headers.get('retry-after'));assert(seconds>=1&&seconds<=60);rateRecoveries++;await delay(seconds*1000+50);const head=await raw('session/'+snapshot.sessionId);assert.equal(head.status,200);assert.equal((await head.json()).data.checkpoint,snapshot.checkpoint);response=await raw('action',body);}
    assert.equal(response.status,200);const result=ActionResponseSchema.parse(await response.json()).data;return {body,result,snapshot:result.snapshot as Snapshot};
  };
  const advance=async(snapshot:Snapshot,actions:TrainingAction[],backoff=false)=>{for(const a of actions){const r=await action(snapshot,a,backoff);assert(r.result.ok,JSON.stringify({code:!r.result.ok?r.result.code:null}));snapshot=r.snapshot;}return snapshot;};
  return {raw,auth,start,actionBody,action,advance,getCookie:()=>cookie,getRuntime:()=>runtimeId,getRateRecoveries:()=>rateRecoveries};
}

test('production HTTP: preview defaults off and research routes retain their contracts',async()=>{
  const s=await server(3247,false);try{const c=client(s);assert.equal((await c.raw('capability')).status,404);assert.equal((await c.raw('start',{})).status,404);const e=await fetch(s.url+'/api/experiments/bass2-b20');assert.equal(e.status,200);assert.equal((await e.json()).data.conditions.oxygenPct.value,17.4);const q=await fetch(s.url+'/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'Can this certify lunar fire safety?',targetConditions:{}})});assert.equal(q.status,200);assert.equal((await q.json()).data.abstained,true);}finally{await s.stop();}
});

test('production HTTP: full mission, invalid assembly, mandatory diagnosis/repair, exact observation receipt, duplicate and lost-response recovery',async()=>{
  const s=await server(3248);try{
    const c=client(s);assert.equal((await c.raw('session/'+randomUUID())).status,403);
    assert.equal((await c.raw('authorize',{approvalToken:s.env.MICROFIRE_PREVIEW_ACCESS_TOKEN},{origin:'https://evil.test'})).status,403);
    await c.auth();let {snapshot}=await c.start();
    snapshot=await c.advance(snapshot,sourceActions);
    const wrong=await c.action(snapshot,{type:'GAME',action:{type:'INSTALL_PART',partId:'fan',anchorId:'duct-exit',orientation:'correct'}});assert.equal(wrong.result.ok,false);assert.equal(wrong.snapshot.checkpoint,snapshot.checkpoint);
    snapshot=await c.advance(snapshot,initialActions.slice(4));assert(snapshot.training.fault);assert.equal(snapshot.state.setup.revision,12);
    const early=await c.action(snapshot,finishActions[0]!);assert(!early.result.ok);assert.equal(early.result.code,'REPAIR_REQUIRED');assert.equal(early.snapshot.checkpoint,snapshot.checkpoint);
    snapshot=await c.advance(snapshot,[...diagnoseActions,...repairActions,...finishActions.slice(0,1)]);
    const observed=await c.action(snapshot,finishActions[1]!);assert(observed.result.ok);snapshot=observed.snapshot;assert.equal(snapshot.revision,22);
    const payload=JSON.parse(Buffer.from(snapshot.checkpoint.split('.')[0]!,'base64url').toString());assert.equal(payload.lastCommand.commandId,observed.body.commandId);assert.equal(payload.lastCommand.expectedRevision,21);
    const recovered=StartResponseSchema.parse(await (await c.raw('session/'+snapshot.sessionId)).json()).data;assert.equal(recovered.checkpoint,snapshot.checkpoint);
    const duplicate=await c.raw('action',observed.body);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).data.snapshot.checkpoint,snapshot.checkpoint);
    assert(snapshot.state.passport.entries.every(e=>e.corrections.length===0&&e.limitations.length>0));assert.equal(snapshot.passportPresentation.trainingHistory.evidenceLevel,'not-applicable');
    snapshot=await c.advance(snapshot,finishActions.slice(2));assert.equal(snapshot.progress.completedChecks,5);
  }finally{await s.stop();}
});

test('production HTTP: restart requires reauthorization, resumes exact checkpoint and denies invalid signature',async()=>{
  const s=await server(3249);let token:string,sessionId:string,runtimeId:string,oldCookie:string;
  try{const c=client(s);await c.auth();const started=await c.start();const snapshot=await c.advance(started.snapshot,initialActions);token=snapshot.checkpoint;sessionId=snapshot.sessionId;runtimeId=snapshot.runtimeId;oldCookie=c.getCookie();}finally{await s.stop();}
  const next=await server(3249,true,s.env);try{
    const c=client(next);assert.equal((await c.raw('session/'+sessionId,undefined,{cookie:oldCookie})).status,403);await c.auth();assert.notEqual(c.getRuntime(),runtimeId);
    const resume=async(checkpoint:string,rt=c.getRuntime())=>{const body={runtimeId:rt,checkpoint};return c.raw('resume',{...body,commandId:await requestIdentity('resume',body)});};
    assert.equal((await resume(token,runtimeId)).status,409);const restored=await resume(token);assert.equal(restored.status,200);const snapshot=StartResponseSchema.parse(await restored.json()).data;assert.equal(snapshot.checkpoint,token);assert.equal(snapshot.sessionId,sessionId);
    assert.equal((await resume(token.slice(0,-4)+'AAAA')).status,400);assert.equal((await resume(token)).status,200);
    const body={runtimeId:c.getRuntime(),checkpoint:token};const encoded=JSON.stringify({...body,commandId:await requestIdentity('resume',body)});
    for(const size of [32767,32768]){const padded=await fetch(next.url+'/api/game/preview/resume',{method:'POST',headers:{origin:next.url,'content-type':'application/json',cookie:c.getCookie()},body:encoded+' '.repeat(size-Buffer.byteLength(encoded))});assert.equal(padded.status,200);}
    const revoke=await c.raw('revoke',{});assert.equal(revoke.status,200);assert.equal((await c.raw('session/'+sessionId)).status,403);assert.equal((await c.raw('revoke',{})).status,200);
  }finally{await next.stop();}
});

test('production HTTP: eight wrong diagnoses recover through real429/Retry-After and complete',async()=>{
  const s=await server(3250);try{
    const c=client(s);await c.auth();let {snapshot}=await c.start();snapshot=await c.advance(snapshot,[...initialActions,{type:'RUN_DIAGNOSTIC'}]);
    for(let i=0;i<8;i++){const wrong=await c.action(snapshot,{type:'SUBMIT_DIAGNOSIS',partId:'radiometer',faultCode:'MISSING'},true);assert(wrong.result.ok);assert.equal(wrong.result.feedback?.correct,false);snapshot=wrong.snapshot;}
    snapshot=await c.advance(snapshot,[{type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'},repairActions[0]!,repairActions[3]!,...finishActions],true);
    assert.equal(snapshot.progress.completedChecks,5);assert.equal(snapshot.training.diagnosisCounts.find(n=>n.partId==='radiometer')!.count,8);assert(c.getRateRecoveries()>=1);
  }finally{await s.stop();}
});

test('production HTTP: rejects ambiguous JSON, invalid notes and altered command identity without corrupting the head',async()=>{
  const s=await server(3251);try{
    const c=client(s);await c.auth();const {snapshot}=await c.start();
    const headers={origin:s.url,'content-type':'application/json',cookie:c.getCookie()};
    const duplicate=await fetch(s.url+'/api/game/preview/action',{method:'POST',headers,body:'{"runtimeId":"a","runtimeId":"b"}'});assert.equal(duplicate.status,400);
    const body=await c.actionBody(snapshot,initialActions[0]!);assert.equal((await c.raw('action',{...body,expectedRevision:2})).status,409);
    const note={...body,action:{type:'ADD_LEARNER_NOTE',text:' x '}};const invalid=await c.raw('action',note);assert.equal(invalid.status,400);assert.equal((await invalid.json()).error.noteIssue,'outer-whitespace');
    const over=await fetch(s.url+'/api/game/preview/action',{method:'POST',headers,body:' '.repeat(32769)});assert.equal(over.status,413);
    for(const size of [32768,32769]){
      const json=JSON.stringify({approvalToken:'wrong界'}),encoded=new TextEncoder().encode(json+' '.repeat(size-Buffer.byteLength(json)));
      const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(encoded.slice(0,25));controller.enqueue(encoded.slice(25));controller.close();}});
      const init:RequestInit&{duplex:'half'}={method:'POST',headers,body:stream,duplex:'half'};const chunked=await fetch(s.url+'/api/game/preview/authorize',init);assert.equal(chunked.status,size===32768?403:413);
    }
    const oversized={runtimeId:c.getRuntime(),checkpoint:'A'.repeat(27308)+'.'+'A'.repeat(43)};assert.equal((await c.raw('resume',{...oversized,commandId:await requestIdentity('resume',oversized)})).status,413);
    const safe=StartResponseSchema.parse(await (await c.raw('session/'+snapshot.sessionId)).json()).data;assert.equal(safe.checkpoint,snapshot.checkpoint);
    assert.equal(canonicalJson(safe.state),canonicalJson(snapshot.state));
  }finally{await s.stop();}
});

test('real Chromium uses the same canonical bytes and Web Crypto observation identity as Node',async()=>{
  const {chromium}=await import('@playwright/test');
  const {readFileSync}=await import('node:fs');const ts=await import('typescript');
  const s=await server(3252,false);let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  try{browser=await chromium.launch();const page=await browser.newPage();await page.goto(s.url+'/');
    const source=readFileSync('packages/shared/src/canonical.ts','utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
    await page.addScriptTag({content:'var exports = {};\n'+compiled+'\nwindow.canonicalTest = exports;'});
    const vectors=JSON.parse(readFileSync('docs/m2/fixtures/CANONICAL_JSON_VECTORS.json','utf8')) as {input:unknown;canonical:string;sha256:string}[];
    const observation=JSON.parse(readFileSync('docs/m2/fixtures/OBSERVATION_REQUEST.example.json','utf8'));
    const actual=await page.evaluate(async({vectors,observation})=>{
      const api=(window as unknown as {canonicalTest:{canonicalJson:(v:unknown)=>string;requestIdentity:(endpoint:'action',r:object)=>Promise<string>}}).canonicalTest;
      const texts=vectors.map(v=>api.canonicalJson(v.input));const digests=await Promise.all(texts.map(async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('')));
      return {texts,digests,commandId:await api.requestIdentity('action',observation)};
    },{vectors,observation});
    assert.deepEqual(actual.texts,vectors.map(v=>v.canonical));assert.deepEqual(actual.digests,vectors.map(v=>v.sha256));assert.equal(actual.commandId,'a0a190413768284c7b63632204e414d69aa0dbf42a4a93ac26a3263b3555117e');
  }finally{await browser?.close();await s.stop();}
});

test('production HTTP: four maximum legal notes preserve caveats and completion within all byte budgets',async()=>{
  const s=await server(3253);try{
    const c=client(s);await c.auth();let {snapshot}=await c.start();snapshot=await c.advance(snapshot,[...initialActions,...diagnoseActions,...repairActions,...finishActions.slice(0,2)]);
    const limits=canonicalJson(snapshot.state.passport.entries[1]!.limitations);
    snapshot=await c.advance(snapshot,Array.from({length:4},()=>({type:'ADD_LEARNER_NOTE',text:'界'.repeat(500)} as const)));
    const fifth=await c.action(snapshot,{type:'ADD_LEARNER_NOTE',text:'fifth'});assert(!fifth.result.ok);assert.equal(fifth.result.code,'NOTE_LIMIT_REACHED');assert.equal(fifth.snapshot.checkpoint,snapshot.checkpoint);
    snapshot=await c.advance(snapshot,finishActions.slice(2));assert.equal(snapshot.progress.completedChecks,5);assert.equal(snapshot.state.passport.entries[1]!.learnerNotes.length,4);assert.equal(canonicalJson(snapshot.state.passport.entries[1]!.limitations),limits);assert(snapshot.checkpointBudget.payloadBytes<=20480);assert(Buffer.byteLength(JSON.stringify(snapshot))<65536);
  }finally{await s.stop();}
});

test('production HTTP: research and preview POSTs share the same unchanged 30-request allowance',async()=>{
  const s=await server(3254);try{
    const c=client(s);
    for(let i=0;i<15;i++){
      assert.equal((await c.raw('authorize',{approvalToken:'invalid'})).status,403);
      const research=await fetch(s.url+'/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'What happened in B20?',targetConditions:{}})});assert.equal(research.status,200);
    }
    const limited=await c.raw('authorize',{approvalToken:'invalid'});assert.equal(limited.status,429);assert(Number(limited.headers.get('retry-after'))>=1);
  }finally{await s.stop();}
});

test('production HTTP: signing-key rotation preserves raw recovery and refuses the old checkpoint',async()=>{
  const first=await server(3255);let token:string;
  try{const c=client(first);await c.auth();token=(await c.start()).snapshot.checkpoint;}finally{await first.stop();}
  const rotated=await server(3255,true,{...first.env,MICROFIRE_PREVIEW_KEY_ID:'rotated-test-key',MICROFIRE_PREVIEW_SIGNING_KEY:randomBytes(32).toString('base64url')});
  try{const c=client(rotated);await c.auth();const r={runtimeId:c.getRuntime(),checkpoint:token};const response=await c.raw('resume',{...r,commandId:await requestIdentity('resume',r)});assert.equal(response.status,400);assert.equal((await response.json()).error.code,'CHECKPOINT_KEY_UNAVAILABLE');assert(token.length>0);}finally{await rotated.stop();}
});

test('production HTTP: signed restore rejects impossible phases, chronology and claimed achievements',async()=>{
  const first=await server(3260);let fresh:Snapshot,complete:Snapshot;
  try{const c=client(first);await c.auth();fresh=(await c.start()).snapshot;complete=await c.advance(fresh,[...initialActions,...diagnoseActions,...repairActions,...finishActions]);}finally{await first.stop();}
  const restarted=await server(3260,true,first.env);
  try{
    const c=client(restarted);await c.auth();
    const resume=async(checkpoint:string)=>{const body={runtimeId:c.getRuntime(),checkpoint};return c.raw('resume',{...body,commandId:await requestIdentity('resume',body)});};
    const decode=(s:Snapshot):CheckpointPayload=>JSON.parse(Buffer.from(s.checkpoint.split('.')[0]!,'base64url').toString());
    const resign=(p:CheckpointPayload)=>{const raw=Buffer.from(canonicalJson(p));return raw.toString('base64url')+'.'+createHmac('sha256',Buffer.from(first.env.MICROFIRE_PREVIEW_SIGNING_KEY!,'base64url')).update('microfire-m2-checkpoint-v1\0').update(raw).digest('base64url');};
    assert.equal((await resume(complete.checkpoint)).status,200);
    const early=decode(complete);early.sessionId=randomUUID();early.state.passport.entries[1]!.createdAt=new Date(Date.parse(early.training.repair!.at)-1).toISOString();
    const station=decode(fresh);station.sessionId=randomUUID();station.training.diagnosticRevision=0;
    const installed=decode(fresh);installed.sessionId=randomUUID();installed.state.setup=structuredClone(complete.state.setup);
    const diagnosed=decode(fresh);diagnosed.sessionId=randomUUID();diagnosed.training.diagnosis=structuredClone(complete.training.diagnosis);
    const repaired=decode(fresh);repaired.sessionId=randomUUID();repaired.training.repair=structuredClone(complete.training.repair);
    const qualified=decode(fresh);qualified.sessionId=randomUUID();qualified.state.setup.qualifiedRevision=0;
    for(const p of [early,station,installed,diagnosed,repaired,qualified]){
      const response=await resume(resign(p));assert.equal(response.status,400);assert.equal((await response.json()).error.code,'CHECKPOINT_UNTRUSTED');
    }
    const unsigned=decode(complete);unsigned.state.setup.qualifiedRevision=null;
    const tampered=Buffer.from(canonicalJson(unsigned)).toString('base64url')+'.'+complete.checkpoint.split('.')[1];assert.equal((await resume(tampered)).status,400);
    const good=StartResponseSchema.parse(await (await c.raw('session/'+complete.sessionId)).json()).data;assert.equal(good.checkpoint,complete.checkpoint);assert.equal(good.progress.completedChecks,5);
  }finally{await restarted.stop();}
});

test('production HTTP: distinct sessions retain separate heads through invalid identities and concurrent edits',async()=>{
  const s=await server(3261);
  try{
    const c=client(s);await c.auth();let a=(await c.start()).snapshot;const b=(await c.start()).snapshot;
    a=await c.advance(a,[...sourceActions,initialActions[4]!]);
    const duplicate=await c.action(a,initialActions[4]!);assert(!duplicate.result.ok);assert.equal(duplicate.result.code,'ALREADY_INSTALLED');assert.equal(duplicate.snapshot.checkpoint,a.checkpoint);
    const body=await c.actionBody(a,initialActions[5]!);
    for(const value of [
      {...body,sessionId:'constructor'},
      {...body,commandId:undefined},
      {...body,action:{type:'GAME',action:{type:'INSTALL_PART',partId:'__proto__',anchorId:'duct-inlet',orientation:'correct'}}},
      {...body,action:{type:'GAME',action:{type:'INSTALL_PART',partId:'fan',anchorId:'__proto__',orientation:'correct'}},commandId:'missing'}
    ])assert.equal((await c.raw('action',value)).status,400);
    assert.equal((await c.raw('action',{...body,sessionId:b.sessionId})).status,409);
    const competing=await c.actionBody(a,initialActions[6]!);
    const responses=await Promise.all([c.raw('action',body),c.raw('action',competing)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
    const one=StartResponseSchema.parse(await (await c.raw('session/'+a.sessionId)).json()).data;
    const two=StartResponseSchema.parse(await (await c.raw('session/'+b.sessionId)).json()).data;
    assert.equal(one.revision,a.revision+1);assert.equal(one.state.setup.installedParts.length,2);assert.equal(two.checkpoint,b.checkpoint);assert.equal(two.revision,0);
    await c.raw('revoke',{});assert.equal((await c.raw('session/'+a.sessionId)).status,403);assert.equal((await c.raw('session/'+b.sessionId)).status,403);
  }finally{await s.stop();}
});
