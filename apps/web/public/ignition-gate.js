// Operation Ignition gate (homepage only). Loaded synchronously right after the film's <dialog>, so it runs before the
// page below it paints. Plays on the first eligible visit (never under reduced motion, without a hardware GPU, or when storage is
// unavailable, never for a #fragment deep link or a scrolled restore), or on ?intro=1; ?intro=0 never plays. Marks the
// film seen as soon as it starts, so a refresh does not replay it. Skip works from this moment, before React or WebGL.
// The storage key must match IGNITION_KEY in components/ignition/state.ts.
(function () {
  var d = document, h = d.documentElement, k = 'microfire.ignition.v1', q = location.search;
  var seen = true;
  try { seen = localStorage.getItem(k) === 'seen'; } catch (e) { /* storage unavailable: never play */ }
  var force = /[?&]intro=1(&|$)/.test(q), never = /[?&]intro=0(&|$)/.test(q), rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dl = d.getElementById('ignition');
  if (!dl || never || rm || d.hidden || !(force || (!seen && !location.hash && scrollY < 40))) { h.dataset.ignition = 'off'; return; }
  // No WebGL, or a software rasteriser: the film would only delay the site. One throwaway context, released at once.
  var gpu = false;
  try {
    var c = d.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      var x = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = !/swiftshader|llvmpipe|softpipe|software/i.test(x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) : '');
      var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    }
  } catch (e) { gpu = false; }
  if (!gpu) { h.dataset.ignition = 'off'; return; }
  try { localStorage.setItem(k, 'seen'); } catch (e) { /* best effort */ }
  h.dataset.ignition = 'play';
  try { performance.mark('ignition:gate'); } catch (e) { /* timing evidence only */ }
  try { dl.showModal(); } catch (e) { dl.setAttribute('open', ''); }
  var end = function () {
    if (h.dataset.ignition !== 'play') return;
    if (!h.dataset.ignitionLive) { try { dl.close(); } catch (e) { dl.removeAttribute('open'); } h.dataset.ignition = 'off'; return; }
    d.dispatchEvent(new Event('ignition:skip'));
  };
  var b = d.getElementById('ignition-skip');
  if (b) { b.focus(); b.addEventListener('click', end); }
  dl.addEventListener('cancel', function (e) { e.preventDefault(); end(); });
})();
