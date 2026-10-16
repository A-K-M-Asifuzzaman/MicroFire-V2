// Run with: node --conditions=react-server --import tsx scripts/local-game-preview.ts
import {spawn,execFileSync} from 'node:child_process';
import path from 'node:path';
import {previewConfig} from '../apps/web/lib/game-preview-security';
const config=previewConfig(process.env);
if(!config)throw Error('Local preview configuration is incomplete or incompatible. No server was started.');
execFileSync(process.execPath,['--import','tsx','scripts/validate-sources.ts'],{stdio:'inherit'});
const child=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',config.port],{cwd:path.resolve('apps/web'),env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{child.kill(signal);});
child.on('error',()=>{console.error('The local preview server could not start.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??0;});
