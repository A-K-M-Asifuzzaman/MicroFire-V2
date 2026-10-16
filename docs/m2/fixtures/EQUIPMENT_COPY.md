# Frozen candidate3 equipment copy — PROPOSED

Generated from the single equipment-copy.ts table; never duplicate these labels in UI code. IDs and anchors are unchanged. All mounting descriptions/orientation symptoms are schematic authored training, not historical NASA malfunctions.

| partId | Part label | anchorId | Anchor label |
|---|---|---|---|
| flow-duct | Flow duct | msg-work-volume-mount | Glovebox mounting point |
| fan | Fan | duct-inlet | Duct inlet |
| flow-straightener | Honeycomb flow straightener | duct-honeycomb-slot | Honeycomb slot |
| nitrogen-nozzle | Nitrogen nozzle | test-section-n2-port | Test-section nitrogen port |
| sample-holder | Sample holder | top-mounting-rail | Sample mounting rail |
| igniter | Igniter | front-window-igniter-lever | Front-window igniter lever |
| still-camera | Still camera | top-window | Top viewing window |
| video-camera | Video camera | front-window-mirror | Front-window turning mirror |
| radiometer | Radiometer | downstream-top-back-corner | Downstream viewing mount |
| exit-plate | Exit plate and screen | duct-exit | Duct outlet |

Exactly15 reachable symptom records (10 MISSING,5 REVERSED):

| Finding ID | Symptom | Interpretation | Repair |
|---|---|---|---|
| flow-duct:MISSING | The flow duct is absent from the glovebox mounting point. | The training apparatus has no duct to contain its flow path. | Install the flow duct at the glovebox mounting point. |
| fan:MISSING | The fan is absent from the duct inlet. | The training apparatus is missing the component that drives airflow through the duct. | Install the fan at the duct inlet, facing into the duct. |
| fan:REVERSED | The fan’s training direction marker points out of the duct. | This training orientation does not match airflow into the duct. | Remove the fan and reinstall it at the duct inlet, facing into the duct. |
| flow-straightener:MISSING | The honeycomb flow straightener is absent from the honeycomb slot. | The training apparatus is missing the component used to reduce swirl in the incoming flow. | Install the honeycomb flow straightener in the honeycomb slot. |
| nitrogen-nozzle:MISSING | The nitrogen nozzle is absent from the test-section nitrogen port. | The training apparatus is missing its nitrogen-flow nozzle. | Install the nitrogen nozzle at the test-section nitrogen port. |
| sample-holder:MISSING | The sample holder is absent from the sample mounting rail. | The training apparatus has no holder for the solid sample. | Install the sample holder at the sample mounting rail. |
| sample-holder:REVERSED | The sample holder’s training marker shows concurrent flow. | The B20 source record describes opposed flow, so this training orientation does not match its configuration. | Remove the sample holder and remount it for opposed flow at the sample mounting rail. |
| igniter:MISSING | The igniter is absent from the front-window igniter lever. | The training apparatus is missing its ignition component; this check does not perform a live ignition. | Install the igniter at the front-window igniter lever after fitting the sample holder. |
| still-camera:MISSING | The still camera is absent from the top viewing window. | The training apparatus is missing its still-image view through the top window. | Install the still camera at the top viewing window, looking toward the sample. |
| still-camera:REVERSED | The still camera’s training view marker points away from the top window. | The training view does not include the sample through the top window. | Remove the still camera and reinstall it looking through the top viewing window. |
| video-camera:MISSING | The video camera is absent from the front-window turning mirror. | The training apparatus is missing its video view through the front window. | Install the video camera facing the front-window turning mirror. |
| video-camera:REVERSED | The video camera’s training view marker points away from the turning mirror. | The training view does not look through the front window via the turning mirror. | Remove the video camera and reinstall it facing the front-window turning mirror. |
| radiometer:MISSING | The radiometer is absent from the downstream viewing mount. | The training apparatus is missing its upstream-viewing detector; no calibrated measurement is inferred. | Install the radiometer at the downstream viewing mount, looking upstream. |
| radiometer:REVERSED | The radiometer’s training view marker points downstream. | The documented detector viewed upstream; its signal was not calibrated. | Remove the radiometer and reinstall it at the downstream viewing mount, looking upstream. |
| exit-plate:MISSING | The exit plate and screen are absent from the duct outlet. | The training apparatus is missing the documented exit plate and screen assembly. | Install the exit plate and screen at the duct outlet. |
