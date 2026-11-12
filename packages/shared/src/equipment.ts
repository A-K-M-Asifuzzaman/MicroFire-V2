import type { PartId, TransitionCode } from './game';

type Copy = { symptom:string; interpretation:string; repair:string };
type Labels = { label:string; anchorLabel:string; missing:Copy; reversed?:Copy };
// One frozen table for schematic, bench, HUD, diagnostics, repair and accessibility.
export const equipmentCopy = {
  'flow-duct': {label:'Flow duct',anchorLabel:'Glovebox mounting point',missing:{symptom:'The flow duct is absent from the glovebox mounting point.',interpretation:'The training apparatus has no duct to contain its flow path.',repair:'Install the flow duct at the glovebox mounting point.'}},
  fan: {label:'Fan',anchorLabel:'Duct inlet',missing:{symptom:'The fan is absent from the duct inlet.',interpretation:'The training apparatus is missing the component that drives airflow through the duct.',repair:'Install the fan at the duct inlet, facing into the duct.'},reversed:{symptom:'The fan’s training direction marker points out of the duct.',interpretation:'This training orientation does not match airflow into the duct.',repair:'Remove the fan and reinstall it at the duct inlet, facing into the duct.'}},
  'flow-straightener': {label:'Honeycomb flow straightener',anchorLabel:'Honeycomb slot',missing:{symptom:'The honeycomb flow straightener is absent from the honeycomb slot.',interpretation:'The training apparatus is missing the component used to reduce swirl in the incoming flow.',repair:'Install the honeycomb flow straightener in the honeycomb slot.'}},
  'nitrogen-nozzle': {label:'Nitrogen nozzle',anchorLabel:'Test-section nitrogen port',missing:{symptom:'The nitrogen nozzle is absent from the test-section nitrogen port.',interpretation:'The training apparatus is missing its nitrogen-flow nozzle.',repair:'Install the nitrogen nozzle at the test-section nitrogen port.'}},
  'sample-holder': {label:'Sample holder',anchorLabel:'Sample mounting rail',missing:{symptom:'The sample holder is absent from the sample mounting rail.',interpretation:'The training apparatus has no holder for the solid sample.',repair:'Install the sample holder at the sample mounting rail.'},reversed:{symptom:'The sample holder’s training marker shows concurrent flow.',interpretation:'The B20 source record describes opposed flow, so this training orientation does not match its configuration.',repair:'Remove the sample holder and remount it for opposed flow at the sample mounting rail.'}},
  igniter: {label:'Igniter',anchorLabel:'Front-window igniter lever',missing:{symptom:'The igniter is absent from the front-window igniter lever.',interpretation:'The training apparatus is missing its ignition component; this check does not perform a live ignition.',repair:'Install the igniter at the front-window igniter lever after fitting the sample holder.'}},
  'still-camera': {label:'Still camera',anchorLabel:'Top viewing window',missing:{symptom:'The still camera is absent from the top viewing window.',interpretation:'The training apparatus is missing its still-image view through the top window.',repair:'Install the still camera at the top viewing window, looking toward the sample.'},reversed:{symptom:'The still camera’s training view marker points away from the top window.',interpretation:'The training view does not include the sample through the top window.',repair:'Remove the still camera and reinstall it looking through the top viewing window.'}},
  'video-camera': {label:'Video camera',anchorLabel:'Front-window turning mirror',missing:{symptom:'The video camera is absent from the front-window turning mirror.',interpretation:'The training apparatus is missing its video view through the front window.',repair:'Install the video camera facing the front-window turning mirror.'},reversed:{symptom:'The video camera’s training view marker points away from the turning mirror.',interpretation:'The training view does not look through the front window via the turning mirror.',repair:'Remove the video camera and reinstall it facing the front-window turning mirror.'}},
  radiometer: {label:'Radiometer',anchorLabel:'Downstream viewing mount',missing:{symptom:'The radiometer is absent from the downstream viewing mount.',interpretation:'The training apparatus is missing its upstream-viewing detector; no calibrated measurement is inferred.',repair:'Install the radiometer at the downstream viewing mount, looking upstream.'},reversed:{symptom:'The radiometer’s training view marker points downstream.',interpretation:'The documented detector viewed upstream; its signal was not calibrated.',repair:'Remove the radiometer and reinstall it at the downstream viewing mount, looking upstream.'}},
  'exit-plate': {label:'Exit plate and screen',anchorLabel:'Duct outlet',missing:{symptom:'The exit plate and screen are absent from the duct outlet.',interpretation:'The training apparatus is missing the documented exit plate and screen assembly.',repair:'Install the exit plate and screen at the duct outlet.'}}
} satisfies Record<PartId,Labels>;
export function findingCopy(partId:PartId,code:string):Copy {
  const p:Labels=equipmentCopy[partId];
  if(code==='MISSING')return p.missing;
  if(code==='REVERSED'&&p.reversed)return p.reversed;
  if(code==='WRONG_ANCHOR')return {symptom:`${p.label} is attached to a different training mount.`,interpretation:`The selected mount does not match ${p.label.toLowerCase()}.`,repair:`Remove ${p.label.toLowerCase()} and reinstall it at ${p.anchorLabel.toLowerCase()}.`};
  return {symptom:`An attachment needed by ${p.label.toLowerCase()} is missing.`,interpretation:'The training assembly order is incomplete.',repair:'Fit the required supporting equipment before reinstalling this component.'};
}
// Core failure codes remain stable; the future preview presentation adapter replaces raw-ID messages.
export const refusalCopy = {
  INVALID_ACTION:'Choose an action supported by this training step.', UNAVAILABLE:'This mission is not available for play.',
  PREREQUISITE_MISSING:'Complete the required source-reading step or fit the supporting equipment first.', WRONG_MISSION:'Return to the active training mission before using this action.',
  UNKNOWN_EXPERIMENT:'Open the admitted B20 source record to continue.', UNKNOWN_CLAIM:'Return to B20’s documented observation; this selection is not an admitted source observation.',
  NOT_INSPECTED:'Open the B20 source before collecting its documented observation.', NOT_AN_OBSERVATION:'Collect the documented observation; an interpretation is a different kind of statement.',
  WRONG_ANCHOR:'Choose the equipment’s named mounting point before installing it.', ALREADY_INSTALLED:'This component is already fitted. Remove it before changing its orientation.',
  NOT_INSTALLED:'This component is not fitted. Choose an installed component to remove.', HAS_DEPENDENTS:'Remove the attached equipment before removing its supporting component.',
  QUALIFICATION_FAILED:'The training apparatus still has faults. Review the Training check and repair them before qualifying it.',
  NOT_QUALIFIED:'Qualify the current training apparatus before opening the documented result.', PREDICTION_REQUIRED:'Record the required prediction before opening the documented result.',
  UNSUPPORTED_DECISION:'The admitted evidence cannot establish that this habitat is safe or unsafe.', COMPLETION_CRITERIA_UNMET:'Finish the remaining learning checks before completing this mission.',
  LIMIT_REACHED:'The permitted number of entries has been reached. Review the existing entries before continuing.', SAVE_LIMIT_REACHED:'This change would exceed the save budget. Your previous progress is unchanged.',
  INVARIANT_VIOLATION:'This change would create inconsistent progress and was not applied. Reload the current case before retrying.'
} satisfies Record<TransitionCode,string>;
export function placementMessage(code:TransitionCode,partId:PartId):string {
  const p:Labels=equipmentCopy[partId];
  return code==='WRONG_ANCHOR'?`The ${p.label.toLowerCase()} fits at the ${p.anchorLabel.toLowerCase()}. Choose that mount before installing it.`:refusalCopy[code];
}
export const learningDefinitions = [
  {id:'source-collected',label:'Collect the B20 source observation'},
  {id:'apparatus-qualified',label:'Qualify the current apparatus'},
  {id:'fault-diagnosed-and-repaired',label:'Diagnose and repair the training fault'},
  {id:'b20-lineage-matched',label:'Review the source-backed B20 result'},
  {id:'episode-completed',label:'Complete the training episode'}
] as const;
