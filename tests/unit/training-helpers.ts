import { partDefinitions,type TrainingAction,type PartId,type TrainingCase } from '@microfire/shared';
import {createTrainingCase,transitionTraining} from '@microfire/game-core';
import {catalog} from '@microfire/science';
export const trainingTime='2026-10-16T10:00:00.000Z';
export const install=(partId:PartId,orientation:'correct'|'reversed'='correct'):TrainingAction=>({type:'GAME',action:{type:'INSTALL_PART',partId,anchorId:partDefinitions.find(p=>p.id===partId)!.anchorId,orientation}});
export const remove=(partId:PartId):TrainingAction=>({type:'GAME',action:{type:'REMOVE_PART',partId}});
export const sourceActions:TrainingAction[]=[{type:'GAME',action:{type:'INSPECT_EVIDENCE',experimentId:'bass2-b20'}},{type:'GAME',action:{type:'COLLECT_EVIDENCE',experimentId:'bass2-b20',claimId:'bass2-b20-burned-entire-sample'}},{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'station-arrival'}},{type:'GAME',action:{type:'START_MISSION',missionId:'bass-assembly'}}];
export const initialActions:TrainingAction[]=[...sourceActions,...partDefinitions.map(p=>install(p.id))];
export const diagnoseActions:TrainingAction[]=[{type:'RUN_DIAGNOSTIC'},{type:'SUBMIT_DIAGNOSIS',partId:'fan',faultCode:'REVERSED'}];
export const repairActions:TrainingAction[]=[remove('fan'),remove('exit-plate'),install('exit-plate'),install('fan')];
export const finishActions:TrainingAction[]=[{type:'GAME',action:{type:'QUALIFY_INSTRUMENT'}},{type:'GAME',action:{type:'OBSERVE_DOCUMENTED_RESULT',experimentId:'bass2-b20'}},{type:'GAME',action:{type:'COMPLETE_MISSION',missionId:'bass-assembly'}}];
export const episodeActions=[...initialActions,...diagnoseActions,...repairActions,...finishActions];
export function advance(actions:TrainingAction[],current:TrainingCase=createTrainingCase(catalog,trainingTime)):TrainingCase {
  return actions.reduce((c,a)=>{const r=transitionTraining(c,a,catalog,trainingTime);if(!r.ok)throw Error(JSON.stringify({action:a,code:r.code,message:r.message}));return r.current;},current);
}
