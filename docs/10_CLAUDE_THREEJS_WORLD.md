# 10 — CLAUDE: THREE.JS / MESHY IMPLEMENTATION STRATEGY

## Separate science and views
`packages/game-core` owns reducer/gates; 3D scene is presentation only. Avoid game rules embedded in three render loops; use visual events -> dispatched typed actions -> reducer -> UI feedback. Use React Three Fiber only if it measurably reduces complexity; project's initial Next.js setup can also use Three.js directly. No runtime paid asset generation.

## Rendering/experience
- Cinematic landing route, scalable full viewport with isolated research routes; central interactive scientific apparatus. World environments: station observation, compact glovebox lab, evidence forensic room, illustrative lunar-habitat inspection. Do not create every room as a gigantic GPU scene.
- GLB loading via cached assets, Draco/Meshopt if supported after actual tests, consistent coordinate units, pivots, material conventions and manifest. Never stretch the 7.6cm flow duct into a giant 'reactor'.
- Mechanical precision from Blender procedural geometry for critical parts; Meshy for PIX, astronaut, environmental set dressing, generic props. Every apparatus GLB reviewed against NASA drawings and anchors. Attachment/part IDs must exactly match shared contract.
- Raycast drag/place + keyboard/tap-to-place alternative. Highlight valid slot only when correct, show failed attempt and why. 10-part completion deterministic. Orbit controls bounded and dynamic framing. Multi-camera lab preview with no false empirical measurement claims.
- Flame visuals explicitly authored illustrative presets; separate read-only footage/data pane for actual NASA result. Labels never read 'real-time experimental sensor' without live verified feed.
- PIX rig/animation states (idle, hint, concern, celebrate); text caption primary. Minimize overlap and overlay. Voice optional with mute, avoid forced audio.
- Performance: adaptive DPR <= 1.5 on mobile, lazy scenes, instancing, reasonable texture sizes, disposal on unmount, reduced-motion branch, non-WebGL 2D schematic with valid game interactions, no loading >10s without progress/fallback. Benchmark honest on 390px mobile and typical laptop, record median FPS if measured.

## Per-asset handoff
`id`, file, source/prompt/license, dimensions units, coordinate orientation, pivot, rough poly count, texture budget, LOD availability, render thumbnail, test in GLTF viewer, collision/interaction regions, credit spent. Reject malformed/inverted/missing-UV results; automate Blender conversion where safe, have humans review.

## No fake 'complete'
A model placed in scene is not an implemented mission. Complete = player can accomplish objective, fail, retry, evidence updates and persists, actual browser test, UX accessibility and performance pass. All work tied to issue/PR and release flags.
