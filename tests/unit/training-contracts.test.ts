import { describe,it,expect } from 'vitest';
import { readFileSync,readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  canonicalJson,parsePreviewJson,requestIdentity,TrainingCaseSchema,CheckpointPayloadSchema,SnapshotSchema,
  StartRequestSchema,ActionRequestSchema,ResumeRequestSchema,StartResponseSchema,ActionResponseSchema,CapabilityResponseSchema,
  AuthorizeResponseSchema,RevokeResponseSchema,HttpFailureSchema,LocalSaveResultSchema,DiagnosticSuccessSchema,type DiagnosticSuccess,equipmentCopy,partDefinitions,findingCopy,noteIssue
} from '@microfire/shared';
const dir='docs/m2/fixtures/';
const read=(n:string)=>JSON.parse(readFileSync(dir+n+'.example.json','utf8'));
describe('M2 frozen shared contracts and identities',()=>{
  it('matches all independent canonical vectors using browser-compatible Web Crypto',async()=>{
    const vectors=JSON.parse(readFileSync(dir+'CANONICAL_JSON_VECTORS.json','utf8')) as {input:unknown;canonical:string;sha256:string}[];
    for(const v of vectors){expect(canonicalJson(v.input)).toBe(v.canonical);expect(createHash('sha256').update(canonicalJson(v.input)).digest('hex')).toBe(v.sha256);}
    const request=read('OBSERVATION_REQUEST');expect(await requestIdentity('action',request)).toBe('a0a190413768284c7b63632204e414d69aa0dbf42a4a93ac26a3263b3555117e');
    const changed=structuredClone(request);changed.action={type:'RUN_DIAGNOSTIC'};
    expect(await requestIdentity('action',changed)).toBe('66a4a707b79c3ec5cf46436be919a3c8c4e01c0faa7bbfcdfc5ba395030ccf5f');
    expect(await requestIdentity('action',{...request,expectedRevision:20})).not.toBe(request.commandId);
    expect(await requestIdentity('action',{...request,action:{type:'GAME',action:{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b19'}}})).not.toBe(request.commandId);
    expect(await requestIdentity('action',Object.fromEntries(Object.entries(request).reverse()))).toBe(request.commandId);
  });
  it('rejects ambiguous canonical inputs without invoking getters',()=>{
    const cycle:unknown[]=[];cycle.push(cycle);
    const accessor={get field(){throw Error('getter executed');}};
    for(const x of [undefined,NaN,Infinity,1.5,9007199254740992,1n,new Date(),new Map(),()=>0,Symbol(),{'a':undefined},'\ud800',{'\ud800':'key'},cycle,Array(1),accessor])expect(()=>canonicalJson(x)).toThrow();
    expect(canonicalJson({s:'e\u0301'})).not.toBe(canonicalJson({s:'é'}));
  });
  it('rejects nonplain or accessor request wrappers before spreading their fields',async()=>{
    let invoked=false;const request={get action(){invoked=true;return {type:'RUN_DIAGNOSTIC'};}};
    await expect(requestIdentity('action',request)).rejects.toThrow();expect(invoked).toBe(false);
    await expect(requestIdentity('action',new Date())).rejects.toThrow();
  });
  it('rejects duplicate JSON members including escape-equivalent and nested keys',()=>{
    for(const s of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"v":{"x":1,"x":2}}','[1,]','{"a":1,}','{}[]','{"a":01}'])expect(()=>parsePreviewJson(s)).toThrow();
    const value=parsePreviewJson('{"__proto__":{"polluted":true},"a":[true,null,"a\\tb"]}');
    expect(Object.hasOwn(value as object,'__proto__')).toBe(true);expect(({} as {polluted?:boolean}).polluted).toBeUndefined();
    expect(parsePreviewJson(' {"a": [1,2]} \n')).toEqual({a:[1,2]});
  });
  it('accepts all 33 complete approved wire/local examples and their checkpoint payloads',()=>{
    let count=0,snapshots=0;
    for(const f of readdirSync(dir).filter(f=>f.endsWith('.example.json'))){
      const value=JSON.parse(readFileSync(dir+f,'utf8'));let schema;
      if(f==='START_REQUEST.example.json')schema=StartRequestSchema;
      else if(f.includes('REQUEST'))schema=f.startsWith('RESUME')?ResumeRequestSchema:ActionRequestSchema;
      else if(f.startsWith('LOCAL_'))schema=LocalSaveResultSchema;
      else if(f==='DIAGNOSTIC_SUCCESS.example.json')schema=DiagnosticSuccessSchema;
      else if(value.error)schema=HttpFailureSchema;
      else if(f.startsWith('CAPABILITY'))schema=CapabilityResponseSchema;
      else if(f.startsWith('AUTHORIZE'))schema=AuthorizeResponseSchema;
      else if(f.startsWith('REVOKE'))schema=RevokeResponseSchema;
      else schema='ok' in value.data?ActionResponseSchema:StartResponseSchema;
      expect(schema.safeParse(value),f).toMatchObject({success:true});count++;
      const s=value.data?.snapshot??(value.data?.state?value.data:null);
      if(s){expect(SnapshotSchema.safeParse(s),f).toMatchObject({success:true});const p=JSON.parse(Buffer.from(s.checkpoint.split('.')[0],'base64url').toString());expect(CheckpointPayloadSchema.safeParse(p),f).toMatchObject({success:true});snapshots++;}
    }
    expect(count).toBe(33);expect(snapshots).toBe(14);
    const diagnostic:DiagnosticSuccess=DiagnosticSuccessSchema.parse(read('DIAGNOSTIC_SUCCESS'));expect(diagnostic.data.snapshot.diagnostic.findings).toHaveLength(1);
  });
  it('rejects isolated future diagnosis, orphan/future repair and invalid progress metadata',()=>{
    const snapshot=read('WRONG_ANCHOR_RESPONSE').data.snapshot;
    const bad=structuredClone(snapshot);bad.training.diagnosis={at:bad.state.updatedAt,faultyRevision:12};
    expect(TrainingCaseSchema.safeParse({state:bad.state,training:bad.training}).success).toBe(false);
    for(const name of ['PENDING_REPAIR_A','PASSPORT_REVIEW_RESPONSE']){
      const value=read(name).data;const s=value.snapshot??value;
      for(const field of ['diagnosticRevision','diagnosis','repair','pendingRepair']){
        const changed=structuredClone(s);const t=changed.training;
        if(field==='diagnosticRevision')t[field]=999;
        else if(field==='diagnosis')t[field]={at:s.state.updatedAt,faultyRevision:999};
        else if(field==='pendingRepair')t[field]={faultId:'training-fan-reversed-v1',partId:'fan',removedAtRevision:999,removedAt:s.state.updatedAt};
        else t[field]={faultId:'training-fan-reversed-v1',partId:'fan',removedAtRevision:998,reinstalledAtRevision:999,removedAt:s.state.updatedAt,at:s.state.updatedAt};
        expect(SnapshotSchema.safeParse(changed).success,field).toBe(false);
      }
    }
    const impossible=structuredClone(read('START_RESPONSE').data);impossible.state.activeMission=null;expect(SnapshotSchema.safeParse(impossible).success).toBe(false);
    const wrongChecks=structuredClone(snapshot);wrongChecks.progress.checks.reverse();expect(SnapshotSchema.safeParse(wrongChecks).success).toBe(false);
  });
  it('keeps all 10 labels and 15 frozen reachable diagnostic cases exact',()=>{
    const labels=JSON.parse(JSON.stringify(equipmentCopy));expect(Object.keys(labels)).toHaveLength(10);
    let cases=0;for(const p of partDefinitions){expect(p.label).toBe(labels[p.id].label);expect(p.anchorLabel).toBe(labels[p.id].anchorLabel);expect(findingCopy(p.id,'MISSING')).toEqual(labels[p.id].missing);cases++;if(p.orientationFault){expect(findingCopy(p.id,'REVERSED')).toEqual(labels[p.id].reversed);cases++;}}
    expect(cases).toBe(15);
  });
  it('preserves invalid-note precedence and exact valid Unicode content',()=>{
    expect(noteIssue('')).toBe('blank');expect(noteIssue(' x ')).toBe('outer-whitespace');expect(noteIssue('\ud800 ')).toBe('lone-surrogate');expect(noteIssue('x\ry')).toBe('control-character');expect(noteIssue('x'.repeat(501))).toBe('too-long');expect(noteIssue('a\tb\nc界')).toBe(null);
  });
});
