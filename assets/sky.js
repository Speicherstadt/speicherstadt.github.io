/* Night sky over the warehouses, drawn with three.js (WebGL).
   Stars sit on several depth layers and stay where they are.
   Some stars fade out and come back elsewhere, a faint Milky Way crosses the sky,
   and now and then a shooting star falls. */
import * as THREE from './vendor/three-r170.module.min.js';

const hero = document.querySelector('.hero');
const canvas = hero && hero.querySelector('.sky');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) start();

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) { return; } // no WebGL: the plain gradient sky stays
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  // pixel space: x right, y down, origin top left of the hero
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uPx: { value: 1 },
    uHorizon: { value: 0.8 },                     // fraction of the hero where the city begins
  };

  const shared = /* glsl */`
    uniform float uTime; uniform vec2 uRes; uniform float uPx; uniform float uHorizon;
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    // place a star: fixed in the sky
    vec2 place(vec2 p) { return p * uRes; }
    // soften the top edge and let the sky thin out towards the haze above the roofs
    float edges(float y) {
      float top = smoothstep(0.0, 28.0, y);
      float hz = 1.0 - smoothstep(uHorizon * uRes.y - 260.0, uHorizon * uRes.y + 40.0, y) * 0.75;
      return top * hz;
    }
  `;

  /* ---------- Stars ---------- */
  const MAX = 1400;
  const pos = new Float32Array(MAX * 3), aSeed = new Float32Array(MAX * 4), aLook = new Float32Array(MAX * 4);
  const palette = [[1.0, 0.95, 0.85], [0.9, 0.86, 0.75], [0.84, 0.89, 1.0], [1.0, 1.0, 1.0], [1.0, 0.85, 0.66]];
  for (let i = 0; i < MAX; i++) {
    const depth = Math.pow(Math.random(), 1.8);           // most stars far away
    const bright = Math.random() < 0.06 ? 1 : 0;
    pos[i * 3] = Math.random(); pos[i * 3 + 1] = Math.random(); pos[i * 3 + 2] = depth;
    aSeed[i * 4] = Math.random() * 100;                    // phase
    aSeed[i * 4 + 1] = 0.6 + Math.random() * 2.2;          // twinkle speed
    aSeed[i * 4 + 2] = Math.random() < 0.4 ? 25 + Math.random() * 45 : 0; // life period (0 = permanent)
    aSeed[i * 4 + 3] = bright;
    const c = palette[Math.random() < 0.55 ? 0 : Math.floor(Math.random() * palette.length)];
    aLook[i * 4] = c[0]; aLook[i * 4 + 1] = c[1]; aLook[i * 4 + 2] = c[2];
    aLook[i * 4 + 3] = bright ? 2.6 + Math.random() * 1.6 : 0.7 + depth * 1.3 + Math.random() * 0.5; // size
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 4));
  starGeo.setAttribute('aLook', new THREE.BufferAttribute(aLook, 4));
  starGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

  const starMat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: shared + /* glsl */`
      attribute vec4 aSeed; attribute vec4 aLook;
      varying vec3 vColor; varying float vAlpha; varying float vBright;
      void main() {
        vec2 p = position.xy;
        float depth = position.z;
        float alpha = 0.55 + depth * 0.45;
        float period = aSeed.z;
        if (period > 0.0) {
          // born, shine, fade, and come back somewhere else
          float t = (uTime + aSeed.x * 7.0) / period;
          float cycle = floor(t), life = fract(t);
          p = fract(p + vec2(hash(cycle + aSeed.x), hash(cycle * 1.7 + aSeed.x * 3.1)));
          alpha *= smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.78, 1.0, life));
        }
        // scintillation: two beating waves, so it never looks like a metronome
        float tw = 0.62 + 0.38 * sin(uTime * aSeed.y + aSeed.x) * sin(uTime * aSeed.y * 0.37 + aSeed.x * 2.3);
        vec2 xy = place(p);
        alpha *= tw * edges(xy.y);
        vColor = aLook.rgb; vAlpha = alpha; vBright = aSeed.w * tw;
        gl_PointSize = aLook.w * uPx * (aSeed.w > 0.5 ? 4.5 : 2.8) * (0.85 + 0.15 * tw);
        gl_Position = projectionMatrix * vec4(xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor; varying float vAlpha; varying float vBright;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q) * 2.0;
        float core = exp(-d * d * 7.0) * 1.3;
        float halo = exp(-d * 3.2) * 0.35;
        // fine diffraction spikes on the brightest stars
        vec2 a = abs(q) * 2.0;
        float spikes = vBright * (exp(-a.x * 40.0) * (1.0 - a.y) + exp(-a.y * 40.0) * (1.0 - a.x)) * 0.8;
        float v = (core + halo + spikes) * vAlpha;
        if (v < 0.003) discard;
        gl_FragColor = vec4(vColor * v, v);
      }`,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- Milky Way: a faint diagonal band of dust ---------- */
  const DUST = 2600;
  const dPos = new Float32Array(DUST * 3), dSeed = new Float32Array(DUST * 2);
  for (let i = 0; i < DUST; i++) {
    const s = Math.random();                                // along the band
    const g = (Math.random() + Math.random() + Math.random() - 1.5) * 0.11; // gaussian-ish across it
    dPos[i * 3] = s * 1.15 - 0.05 + g * 0.5;
    dPos[i * 3 + 1] = 0.05 + s * 0.55 + g;                  // rises from top left to the right
    dPos[i * 3 + 2] = 0.05 + Math.random() * 0.1;
    dSeed[i * 2] = Math.random() * 100;
    dSeed[i * 2 + 1] = Math.exp(-Math.abs(g) * 14.0);       // denser in the middle of the band
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 2));
  dustGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const dustMat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: shared + /* glsl */`
      attribute vec2 aSeed; varying float vAlpha;
      void main() {
        vec2 xy = place(position.xy);
        vAlpha = (0.1 + 0.3 * aSeed.y) * edges(xy.y);
        gl_PointSize = (1.4 + aSeed.y * 2.2) * uPx;
        gl_Position = projectionMatrix * vec4(xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float v = exp(-d * d * 4.0) * vAlpha;
        gl_FragColor = vec4(vec3(0.82, 0.84, 0.95) * v, v);
      }`,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  /* ---------- Shooting stars ---------- */
  const shotUniforms = { uProgress: { value: 2 }, uLen: { value: 1 } };
  const shotMat = new THREE.ShaderMaterial({
    uniforms: shotUniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uProgress; varying vec2 vUv;
      void main() {
        float fade = smoothstep(0.0, 0.12, uProgress) * (1.0 - smoothstep(0.55, 1.0, uProgress));
        float along = pow(vUv.x, 2.6);                       // bright head on the right, long fading tail
        float across = exp(-pow((vUv.y - 0.5) * 2.0, 2.0) * 6.0);
        float head = exp(-pow((1.0 - vUv.x) * 18.0, 2.0)) * across;
        float v = (along * across + head * 1.5) * fade;
        vec3 col = mix(vec3(0.95, 0.75, 0.42), vec3(1.0, 0.97, 0.9), vUv.x);
        gl_FragColor = vec4(col * v, v);
      }`,
  });
  const shot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shotMat);
  shot.visible = false; shot.frustumCulled = false;
  scene.add(shot);
  let shotState = null, nextShot = 2.5;

  function launch(t, W, H) {
    const fromLeft = Math.random() < 0.5;
    const len = 160 + Math.random() * 160;
    const angle = (fromLeft ? 1 : -1) * (0.35 + Math.random() * 0.3);
    const x = fromLeft ? W * (0.08 + Math.random() * 0.45) : W * (0.47 + Math.random() * 0.45);
    const y = H * (0.06 + Math.random() * 0.3);
    const travel = 260 + Math.random() * 220;
    shotState = { t0: t, dur: 1.1 + Math.random() * 0.6, x, y, angle, len, travel, dir: fromLeft ? 1 : -1 };
  }
  function updateShot(t) {
    if (!shotState) { shot.visible = false; return; }
    const s = shotState, p = (t - s.t0) / s.dur;
    if (p >= 1) { shotState = null; shot.visible = false; return; }
    const ease = 1 - Math.pow(1 - p, 2);
    const dx = Math.cos(s.angle) * s.dir, dy = Math.abs(Math.sin(s.angle));
    const hx = s.x + dx * s.travel * ease, hy = s.y + dy * s.travel * ease;
    const L = s.len * (0.4 + 0.6 * Math.min(1, p * 3));
    shot.visible = true;
    shot.scale.set(L, 2.4, 1);
    shot.rotation.z = Math.atan2(dy, dx);
    shot.position.set(hx - dx * L / 2, hy - dy * L / 2, 0);
    shotUniforms.uProgress.value = p;
  }

  /* ---------- Size, input, loop ---------- */
  let W = 1, H = 1;
  function resize() {
    const r = hero.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const px = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(px);
    renderer.setSize(W, H, false);
    camera.right = W; camera.bottom = H; camera.updateProjectionMatrix();
    uniforms.uRes.value.set(W, H);
    uniforms.uPx.value = px;
    const sky = hero.querySelector('.skyline');
    if (sky) uniforms.uHorizon.value = Math.min(0.95, (sky.getBoundingClientRect().top - r.top + sky.getBoundingClientRect().height * 0.4) / H);
    // keep the density pleasant on every screen size
    starGeo.setDrawRange(0, Math.min(MAX, Math.round(W * H / 1100)));
    dustGeo.setDrawRange(0, Math.min(DUST, Math.round(W * H / 400)));
    if (still) render(40);
  }

  function render(t) {
    uniforms.uTime.value = t;
    renderer.render(scene, camera);
  }

  new ResizeObserver(resize).observe(hero);
  resize();
  if (still) return;

  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(hero);
  const clock = new THREE.Clock();
  // start a little into the night so stars are already scattered through their lives
  const offset = 40 + Math.random() * 400;
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const t = clock.getElapsedTime();
    if (!shotState && t > nextShot) { launch(t, W, H); nextShot = t + 8 + Math.random() * 12; }
    updateShot(t);
    render(t + offset);
  });
}
