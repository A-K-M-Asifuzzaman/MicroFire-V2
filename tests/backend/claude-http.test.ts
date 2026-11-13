import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn,type ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {ActionResponseSchema,AuthorizeResponseSchema,CapabilityResponseSchema,HttpFailureSchema,RevokeResponseSchema,StartResponseSchema,requestIdentity,noteIssue,type Snapshot,type TrainingAction} from '@microfire/shared';
import {sourceActions,initialActions,diagnoseActions,finishActions,install,remove} from '../unit/training-helpers';

const frontend=process.env.MICROFIRE_CLAUDE_WORKTREE;
test('Claude actual transport/controller consume real backend responses, recover lost acknowledgement and complete', {skip:!frontend},async()=>{
  const root=path.resolve(frontend!),sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','Consumer source must be pinned and clean.');
  const load=(file:string)=>import(pathToFileURL(path.join(root,'apps/web/game',file)).href);
  const {createHttpTransport}=await load('transport.ts'),{createController}=await load('controller.ts'),{faultCategoryLabels}=await load('view-model.ts');
  assert.deepEqual(faultCategoryLabels,{MISSING:'Missing',WRONG_ANCHOR:'Wrong mount',MISSING_PREREQUISITE:'Missing supporting part',REVERSED:'Reversed orientation'});
  const offset=Number(process.env.MICROFIRE_HTTP_TEST_PORT_OFFSET??0);assert(Number.isSafeInteger(offset)&&offset>=0&&3268+offset<=65535);
  const url=`http://127.0.0.1:${3268+offset}`;
  try{await fetch(url+'/api/health');throw Error('Refusing an occupied consumer test port');}catch(e){if(e instanceof Error&&e.message==='Refusing an occupied consumer test port')throw e;}
  const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',MICROFIRE_LOCAL_GAME_PREVIEW:'1',MICROFIRE_PREVIEW_ORIGIN:url,MICROFIRE_PREVIEW_ACCESS_TOKEN:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_SIGNING_KEY:randomBytes(32).toString('base64url'),MICROFIRE_PREVIEW_REALM_ID:randomUUID(),MICROFIRE_PREVIEW_KEY_ID:'consumer-http-only'};
  const child:ChildProcess=spawn(process.execPath,['--conditions=react-server','--import','tsx',path.resolve('scripts/local-game-preview.ts')],{env,stdio:'ignore'});
  try{
    let ready=false;
    for(let i=0;i<150;i++){if(child.exitCode!==null)throw Error('Consumer test server exited');try{if((await fetch(url+'/api/health')).ok){ready=true;break;}}catch{/* Wait for the isolated server to bind. */}await delay(200);}
    assert(ready,'Consumer test server startup timed out');
    let cookie='',loseNextAction=false,posts=0;
    const runtime={parse:{capability:(v:unknown)=>CapabilityResponseSchema.parse(v),authorize:(v:unknown)=>AuthorizeResponseSchema.parse(v),revoke:(v:unknown)=>RevokeResponseSchema.parse(v),snapshot:(v:unknown)=>StartResponseSchema.parse(v),action:(v:unknown)=>ActionResponseSchema.parse(v),failure:(v:unknown)=>HttpFailureSchema.parse(v)},identify:requestIdentity,noteIssue};
    const fetchImpl:typeof fetch=async(input,init)=>{
      const headers=new Headers(init?.headers);headers.set('origin',url);if(cookie)headers.set('cookie',cookie);
      if(init?.method==='POST')posts++;
      const response=await fetch(input,{...init,headers});
      const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0]!;
      // Only the response is lost. The real server has already processed the actual HTTP command.
      if(loseNextAction&&String(input).endsWith('/action')){loseNextAction=false;await response.arrayBuffer();throw new TypeError('Simulated lost acknowledgement');}
      return response;
    };
    const transport=createHttpTransport(runtime,{base:url+'/api/game/preview',fetchImpl});
    const controller=createController({transport,identify:requestIdentity,minPostGapMs:0});
    const head=():Snapshot=>{const s=controller.getState().snapshot;assert(s);return s;};
    const send=async(action:TrainingAction)=>{await controller.send(action,action.type);assert.equal(controller.getState().link.status,'confirmed');};
    await controller.boot();assert.equal(controller.getState().link.status,'authorization-required');
    await controller.authorize(env.MICROFIRE_PREVIEW_ACCESS_TOKEN);await controller.start();assert.equal(head().revision,0);
    const initial=head().checkpoint;loseNextAction=true;await controller.send(sourceActions[0]!, 'Inspect B20');
    assert.equal(controller.getState().link.status,'outcome-unknown');assert.equal(head().checkpoint,initial);
    await controller.reconcile();assert.equal(head().revision,1);assert.equal(controller.getState().link.status,'confirmed');
    for(const action of sourceActions.slice(1))await send(action);
    await send(initialActions[4]!);
    const before=head().checkpoint;
    await send({type:'GAME',action:{type:'INSTALL_PART',partId:'fan',anchorId:'duct-exit',orientation:'correct'}});
    assert.equal(controller.getState().event.code,'WRONG_ANCHOR');assert.equal(head().checkpoint,before);
    for(const action of initialActions.slice(5))await send(action);
    assert.equal(head().state.setup.revision,12);assert.equal(head().training.fault?.id,'training-fan-reversed-v1');
    await send(finishActions[0]!);assert.equal(controller.getState().event.code,'REPAIR_REQUIRED');
    await send(diagnoseActions[0]!);await send({type:'SUBMIT_DIAGNOSIS',partId:'radiometer',faultCode:'MISSING'});
    assert.equal(controller.getState().event.feedback.correct,false);assert.equal(head().training.diagnosis,null);
    await send(diagnoseActions[1]!);await send(remove('fan'));assert.equal(head().training.pendingRepair?.removedAtRevision,13);
    await send(install('fan'));assert.equal(head().training.repair?.removedAtRevision,13);
    await send(finishActions[0]!);assert.equal(head().state.setup.qualifiedRevision,head().state.setup.revision);
    await send(finishActions[1]!);assert.equal(head().passportPresentation.trainingHistory.evidenceLevel,'not-applicable');
    const limitations=JSON.stringify(head().state.passport.entries[1]!.limitations);
    await send({type:'ADD_LEARNER_NOTE',text:'My learner conclusion remains unassessed.'});await send(finishActions[2]!);
    assert.equal(head().progress.completedChecks,5);assert.equal(JSON.stringify(head().state.passport.entries[1]!.limitations),limitations);assert(head().state.passport.entries.every(e=>e.corrections.length===0));
    await controller.save();assert.equal(controller.getState().save.result.code,'LOCAL_READ_ONLY');
    const complete=head().checkpoint;await controller.resume(complete);assert.equal(head().checkpoint,complete);
    await controller.revoke();await controller.refresh();assert.equal(controller.getState().link.status,'authorization-required');
    await controller.authorize(env.MICROFIRE_PREVIEW_ACCESS_TOKEN);await controller.refresh();assert.equal(head().checkpoint,complete);assert.equal(controller.getState().link.status,'confirmed');assert(posts<=30);
    // Transport-only failures: malformed or wrongly unwrapped responses remain unknown, never accepted progress.
    for(const body of ['{"apiVersion":',JSON.stringify({apiVersion:'1',...head()})]){
      const malformed=createHttpTransport(runtime,{fetchImpl:async()=>new Response(body,{status:200,headers:{'content-type':'application/json'}})});
      assert.deepEqual(await malformed.session(head().sessionId),{kind:'unknown',reason:'malformed'});
    }
    assert.equal(head().checkpoint,complete);
    console.log(`Claude ${sha}: actual transport/controller, real mission, lost-response recovery, read-only save and JSON envelopes passed (${posts} POSTs).`);
  }finally{if(child.exitCode===null)await new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill('SIGTERM');});}
});
