import 'server-only';
import {createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {CheckpointPayloadSchema,canonicalJson,parsePreviewJson,type CheckpointPayload,type HttpCode} from '@microfire/shared';
import {validateTrainingCase} from '@microfire/game-core';
import {catalog,catalogSha256,validatePassport} from '@microfire/science';

export class PreviewFailure extends Error {
  constructor(readonly status:number,readonly code:HttpCode,message:string){super(message);}
}
export type PreviewConfig={origin:string;host:string;port:string;realmId:string;keyId:string;accessToken:Buffer;signingKey:Buffer};
const decodeSecret=(s:string|undefined):Buffer|null=>{
  if(!s||!/^[A-Za-z0-9_-]{43}$/.test(s))return null;const value=Buffer.from(s,'base64url');
  return value.length===32&&value.toString('base64url')===s?value:null;
};
export function previewConfig(env:NodeJS.ProcessEnv):PreviewConfig|null {
  if(env.MICROFIRE_LOCAL_GAME_PREVIEW!=='1'||['VERCEL','NETLIFY','CF_PAGES','AWS_LAMBDA_FUNCTION_NAME','K_SERVICE','RENDER','FLY_APP_NAME'].some(k=>!!env[k]))return null;
  const origin=env.MICROFIRE_PREVIEW_ORIGIN??'';
  if(!/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/.test(origin)||origin.length>64)return null;
  let url:URL;try{url=new URL(origin);}catch{return null;}if(url.origin!==origin||!url.port||Number(url.port)>65535)return null;
  const accessToken=decodeSecret(env.MICROFIRE_PREVIEW_ACCESS_TOKEN),signingKey=decodeSecret(env.MICROFIRE_PREVIEW_SIGNING_KEY);
  const realmId=env.MICROFIRE_PREVIEW_REALM_ID??'',keyId=env.MICROFIRE_PREVIEW_KEY_ID??'';
  if(!accessToken||!signingKey||timingSafeEqual(accessToken,signingKey)||signingKey.equals(Buffer.alloc(32,7))||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(realmId)||! /^[a-z0-9_-]{1,32}$/.test(keyId))return null;
  return {origin,host:url.host,port:url.port,realmId,keyId,accessToken,signingKey};
}
export function localPreviewRequest(request:Request,c:PreviewConfig):boolean {
  const url=new URL(request.url),h=request.headers,origin=h.get('origin');
  if(url.origin!==c.origin||h.get('host')!==c.host||h.has('forwarded')||h.get('sec-fetch-site')==='cross-site')return false;
  if(request.method==='POST'?origin!==c.origin:origin!==null&&origin!==c.origin)return false;
  for(const [name,value] of [['x-forwarded-host',c.host],['x-forwarded-proto','http'],['x-forwarded-port',c.port]])if(h.has(name!)&&h.get(name!)!==value)return false;
  const forwarded=h.get('x-forwarded-for');if(forwarded!==null&&!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(forwarded))return false;
  return true;
}
export const GRANT_COOKIE='microfire_m2_grant';
export function grantCookie(value:string,maxAge=3600):string{return `${GRANT_COOKIE}=${value}; Path=/api/game/preview; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;}
function presentedGrant(request:Request):string|null {
  const values=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(GRANT_COOKIE+'='));
  if(values.length!==1)return null;const value=values[0]!.slice(GRANT_COOKIE.length+1);return decodeSecret(value)?value:null;
}
type Grant={issuedAt:number;expires:number;realmId:string;origin:string;runtimeId:string};
export class PreviewAuthority {
  readonly runtimeId=randomUUID();
  private readonly grants=new Map<string,Grant>();
  constructor(readonly config:PreviewConfig,private readonly now:()=>number=Date.now){}
  private digest(value:string):string{return createHash('sha256').update(value).digest('hex');}
  private sweep(){for(const [id,g]of this.grants)if(g.expires<=this.now())this.grants.delete(id);}
  current(request:Request):Grant|null {
    this.sweep();const value=presentedGrant(request);if(!value)return null;
    const g=this.grants.get(this.digest(value));return g&&g.realmId===this.config.realmId&&g.origin===this.config.origin&&g.runtimeId===this.runtimeId?g:null;
  }
  require(request:Request):Grant {const g=this.current(request);if(!g)throw new PreviewFailure(403,'PREVIEW_UNAUTHORIZED','Authorize this local preview before reading, changing or resuming a case.');return g;}
  authorize(request:Request,approvalToken:string):{expiresAt:string;cookie?:string} {
    const token=decodeSecret(approvalToken);
    if(!token||!timingSafeEqual(token,this.config.accessToken))throw new PreviewFailure(403,'PREVIEW_UNAUTHORIZED','Operator authorization was not accepted.');
    const existing=this.current(request);if(existing)return {expiresAt:new Date(existing.expires).toISOString()};
    if(this.grants.size>=8)throw new PreviewFailure(503,'PREVIEW_CAPACITY','The local grant capacity is full.');
    const value=randomBytes(32).toString('base64url'),issuedAt=this.now();
    const grant={issuedAt,expires:issuedAt+3600000,realmId:this.config.realmId,origin:this.config.origin,runtimeId:this.runtimeId};
    this.grants.set(this.digest(value),grant);return {expiresAt:new Date(grant.expires).toISOString(),cookie:grantCookie(value)};
  }
  revoke(request:Request):string {const value=presentedGrant(request);if(value)this.grants.delete(this.digest(value));return grantCookie('',0);}
  clear(){this.grants.clear();}
}
const PREFIX='microfire-m2-checkpoint-v1\0';
export class CheckpointCodec {
  constructor(private readonly config:PreviewConfig,private readonly now:()=>number=Date.now){}
  sign(payload:CheckpointPayload):string {
    this.validate(payload);const raw=Buffer.from(canonicalJson(payload));
    if(raw.byteLength>20480)throw new PreviewFailure(413,'PAYLOAD_TOO_LARGE','The checkpoint exceeds its byte budget.');
    return raw.toString('base64url')+'.'+createHmac('sha256',this.config.signingKey).update(PREFIX).update(raw).digest('base64url');
  }
  private validate(input:unknown):CheckpointPayload {
    const parsed=CheckpointPayloadSchema.safeParse(input);
    if(!parsed.success)throw new PreviewFailure(400,'CHECKPOINT_UNTRUSTED','Checkpoint structure or history is invalid.');
    const p=parsed.data;
    if(p.keyId!==this.config.keyId)throw new PreviewFailure(400,'CHECKPOINT_KEY_UNAVAILABLE','This checkpoint requires an unavailable signing key. Preserve its raw bytes.');
    if(p.catalogSha256!==catalogSha256||p.state.datasetVersion!==catalog.datasetVersion)throw new PreviewFailure(409,'DATASET_MISMATCH','The checkpoint belongs to a different admitted dataset.');
    if(p.realmId!==this.config.realmId||p.origin!==this.config.origin||Date.parse(p.issuedAt)>this.now()+300000)throw new PreviewFailure(400,'CHECKPOINT_UNTRUSTED','Checkpoint realm, origin or clock is incompatible.');
    try{validateTrainingCase({state:p.state,training:p.training},catalog);validatePassport(p.state.passport);}
    catch{throw new PreviewFailure(400,'CHECKPOINT_UNTRUSTED','Checkpoint scientific content or training history is invalid.');}
    return p;
  }
  verify(token:string):CheckpointPayload {
    const untrusted=()=>new PreviewFailure(400,'CHECKPOINT_UNTRUSTED','Checkpoint signature or encoding is invalid. Preserve its raw bytes.');
    if(token.length>27351)throw new PreviewFailure(413,'PAYLOAD_TOO_LARGE','The checkpoint token is oversized.');
    const parts=token.split('.');if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(parts[0]!)||!/^[A-Za-z0-9_-]{43}$/.test(parts[1]!))throw untrusted();
    const raw=Buffer.from(parts[0]!,'base64url'),sig=Buffer.from(parts[1]!,'base64url');
    if(raw.byteLength>20480||raw.toString('base64url')!==parts[0]||sig.length!==32||sig.toString('base64url')!==parts[1])throw untrusted();
    let value:unknown;try{const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);value=parsePreviewJson(text);if(canonicalJson(value)!==text)throw untrusted();}catch{throw untrusted();}
    if(!value||typeof value!=='object')throw untrusted();
    const fields=value as Record<string,unknown>;
    if(fields.checkpointVersion!==1)throw new PreviewFailure(400,'CHECKPOINT_VERSION_UNSUPPORTED','This checkpoint version is not supported. Preserve the raw token.');
    if(fields.keyId!==this.config.keyId)throw new PreviewFailure(400,'CHECKPOINT_KEY_UNAVAILABLE','This checkpoint requires an unavailable signing key.');
    const expected=createHmac('sha256',this.config.signingKey).update(PREFIX).update(raw).digest();if(!timingSafeEqual(expected,sig))throw untrusted();
    return this.validate(value);
  }
}
