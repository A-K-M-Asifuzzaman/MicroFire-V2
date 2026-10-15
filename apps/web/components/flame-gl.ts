// Progressive enhancement for the Gravity Lens: an illustrative flame shader (art, not a combustion model).
// Loaded with a dynamic import, so pages that never show the lens never download it.
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FRAG = `precision mediump float;
uniform vec2 res; uniform float t; uniform float g;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.; a *= .5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / res * 2. - 1.;
  float cy = mix(-.05, -.3, g);
  vec2 p = uv - vec2(0., cy);
  float rise = mix(.25, 2.6, g);
  float n1 = fbm(vec2(p.x * 3., p.y * 3. - t * rise));
  float n2 = fbm(vec2(p.x * 7. + 3., p.y * 7. - t * rise * 1.6));
  float above = max(p.y, 0.);
  p.x += (n1 - .5) * .3 * g * above + (n2 - .5) * .015;
  float r = mix(.3, .19, g) * (1. + .035 * sin(t * 1.2) * (1. - g));   // slow "breathing" in still air
  vec2 q = vec2(p.x, p.y > 0. ? p.y / mix(1., 3.4, g) : p.y * mix(1., 1.5, g)) / r;
  q.x *= 1. + g * above * 2.4;
  float d = length(q) + (n1 - .5) * mix(.12, .42, g) + (n2 - .5) * .06;
  float body = exp(-d * d * 2.2);                       // soft volumetric body
  float shell = exp(-pow((d - .84) * 3.4, 2.));         // reaction zone, soft edged
  float core = exp(-d * d * 7.);
  vec3 deep = vec3(.1, .2, .85), blue = vec3(.25, .5, 1.), cyan = vec3(.55, .85, 1.);
  vec3 orange = vec3(1., .45, .12), yellow = vec3(1., .8, .42), white = vec3(1., .96, .86);
  // Microgravity: a dim blue sphere with a faint warm heart.
  vec3 micro = mix(deep, cyan, shell * shell) * shell * .75 + mix(blue, cyan, body) * body * .6 + orange * core * .3;
  // Earth: buoyant teardrop of glowing soot over a blue base.
  float lum = smoothstep(-.35, .15, p.y + .05);
  vec3 earth = mix(orange, yellow, core) * body * lum * 1.55 + white * core * lum * .5
    + blue * body * smoothstep(0., -.3, p.y) * 1.1 + orange * shell * .2;
  vec3 col = mix(micro, earth, g) + mix(blue, orange, g) * exp(-d * 1.6) * .13;   // halo
  col = 1. - exp(-col * 1.7);                            // soft filmic clip, no hard edges
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));  // premultiplied, additive-looking
}`;

export type FlameRenderer = { draw(g: number): void; setAnimated(on: boolean): void; stop(): void };

export type FlameEvents = { onLost(): void; onRestored(): void };

/**
 * Returns null when WebGL is unavailable; the caller keeps the SVG illustration.
 * On context loss the loop stops at once and onLost fires so the caller can show the SVG again;
 * if the browser restores the context, GPU resources are rebuilt and onRestored fires.
 */
export function startFlame(canvas: HTMLCanvasElement, initialG: number, animated: boolean, events: FlameEvents): FlameRenderer | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  type Uniforms = { res: WebGLUniformLocation | null; t: WebGLUniformLocation | null; g: WebGLUniformLocation | null };
  const setup = (): Uniforms | null => {
    const shader = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return { res: gl.getUniformLocation(prog, 'res'), t: gl.getUniformLocation(prog, 't'), g: gl.getUniformLocation(prog, 'g') };
  };
  let u = setup();
  if (!u) return null;

  let g = initialG, shownG = initialG, frame = 0, running = animated, lost = false;
  const t0 = performance.now();
  const render = (uniforms: Uniforms) => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uniforms.res, w, h);
    gl.uniform1f(uniforms.t, running ? (performance.now() - t0) / 1000 : 0);
    gl.uniform1f(uniforms.g, shownG);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = () => {
    frame = 0;
    if (lost || !u) return;
    shownG += (g - shownG) * 0.12; // ease toward the chosen gravity so the morph is visible
    render(u);
    if (running || Math.abs(g - shownG) > 0.002) frame = requestAnimationFrame(loop);
  };
  const kick = () => { if (!frame && !lost) frame = requestAnimationFrame(loop); };
  const onLost = (e: Event) => {
    e.preventDefault(); // allow the browser to restore the context later
    lost = true; u = null;
    cancelAnimationFrame(frame); frame = 0;
    events.onLost();
  };
  const onRestored = () => {
    u = setup();
    if (!u) return; // stays on the SVG fallback
    lost = false; shownG = g;
    events.onRestored();
    kick();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  kick();
  return {
    draw(next) { g = next; if (!running) shownG = next; kick(); },
    setAnimated(on) { running = on; kick(); },
    stop() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      cancelAnimationFrame(frame); frame = 0; lost = true;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}
