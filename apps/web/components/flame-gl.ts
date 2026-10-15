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
  float cy = mix(-.075, -.25, g);
  vec2 p = uv - vec2(0., cy);
  float n = fbm(vec2(uv.x * 2.5, uv.y * 2.5 - t * mix(.15, 1.8, g)));
  float above = max(p.y, 0.);
  p.x += (n - .5) * .36 * g * above;
  float r = mix(.31, .21, g);
  vec2 q = vec2(p.x, p.y > 0. ? p.y / mix(1., 3.2, g) : p.y * mix(1., 1.4, g)) / r;
  q.x *= 1. + g * above * 2.2;
  float d = length(q) + (n - .5) * mix(.06, .35, g);
  float shell = exp(-pow((d - .8) * 5., 2.));            // thin reaction zone
  float fill = smoothstep(1., .55, d);
  float core = smoothstep(.75, .15, d);
  vec3 blue = vec3(.32, .58, 1.), orange = vec3(1., .47, .16), yellow = vec3(1., .84, .48);
  vec3 col = blue * shell * mix(1.05, .5, g) + blue * fill * .16 * (1. - g);          // still air: dim blue shell
  col += orange * core * .22 * (1. - g);                                                   // faint soot glow
  col += mix(orange, yellow, core) * g * fill * smoothstep(-.3, .2, p.y + .05) * 1.25;    // buoyant: luminous soot
  col += blue * fill * .8 * g * smoothstep(.05, -.25, p.y);                                 // blue base at 1 g
  col += mix(blue, orange, g) * exp(-d * 2.) * .2;                                          // halo
  col = clamp(col, 0., 1.);
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));  // premultiplied, additive-looking
}`;

export type FlameRenderer = { draw(g: number): void; setAnimated(on: boolean): void; stop(): void };

/** Returns null when WebGL is unavailable; the caller keeps the SVG illustration. */
export function startFlame(canvas: HTMLCanvasElement, initialG: number, animated: boolean): FlameRenderer | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
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
  const u = { res: gl.getUniformLocation(prog, 'res'), t: gl.getUniformLocation(prog, 't'), g: gl.getUniformLocation(prog, 'g') };

  let g = initialG, shownG = initialG, frame = 0, running = animated;
  const t0 = performance.now();
  const render = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(u.res, w, h);
    gl.uniform1f(u.t, running ? (performance.now() - t0) / 1000 : 0);
    gl.uniform1f(u.g, shownG);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = () => {
    shownG += (g - shownG) * 0.12; // ease toward the chosen gravity so the morph is visible
    render();
    frame = running || Math.abs(g - shownG) > 0.002 ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(loop); };
  kick();
  return {
    draw(next) { g = next; if (!running) shownG = next; kick(); },
    setAnimated(on) { running = on; kick(); },
    stop() { cancelAnimationFrame(frame); frame = 0; gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  };
}
