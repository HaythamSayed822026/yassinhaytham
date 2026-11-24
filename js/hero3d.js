// Hero particle scene: points move between three shapes.
// 0 = scattered dust, 1 = six app tiles (the problem), 2 = one key (SchoolKey).
import * as THREE from "three";

const APP_COLORS = ["#4d7cff", "#ffb547", "#2de0a7", "#8b5cff", "#ff6b5b", "#25d366"];

function scatterShape(n) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 5 + Math.random() * 6;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    a.set([r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t) * 0.6, r * Math.cos(p) - 2], i * 3);
  }
  return a;
}

// Six rounded tiles in a ring, each in its own colour.
function appsShape(n) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  const size = 1.35, radius = 3.1, corner = 0.32;
  for (let i = 0; i < n; i++) {
    const app = i % 6;
    const ang = (app / 6) * Math.PI * 2 + Math.PI / 2;
    let x, y;
    // rejection sample a rounded square
    for (;;) {
      x = (Math.random() - 0.5) * size;
      y = (Math.random() - 0.5) * size;
      const dx = Math.max(Math.abs(x) - (size / 2 - corner), 0);
      const dy = Math.max(Math.abs(y) - (size / 2 - corner), 0);
      if (dx * dx + dy * dy <= corner * corner) break;
    }
    // brighter outline: push a third of points to the edge
    if (Math.random() < 0.35) {
      const s = 1 / Math.max(Math.abs(x), Math.abs(y)) * (size / 2) * 0.97;
      x *= s; y *= s;
    }
    pos.set([Math.cos(ang) * radius + x, Math.sin(ang) * radius + y, (Math.random() - 0.5) * 0.3], i * 3);
    c.set(APP_COLORS[app]);
    col.set([c.r, c.g, c.b], i * 3);
  }
  return { pos, col };
}

function insideKey(x, y) {
  const dx = x + 2.0, ring = Math.hypot(dx, y);
  if (ring > 0.72 && ring < 1.55) return true;
  if (x > -0.55 && x < 3.4 && Math.abs(y) < 0.28) return true;
  if (x > 2.0 && x < 2.45 && y < -0.2 && y > -1.05) return true;
  if (x > 2.85 && x < 3.3 && y < -0.2 && y > -0.8) return true;
  return false;
}

function keyShape(n) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const a = new THREE.Color("#4d7cff"), b = new THREE.Color("#8b5cff"), g = new THREE.Color("#ffb547");
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x, y;
    do { x = -3.6 + Math.random() * 7.1; y = -1.6 + Math.random() * 3.2; } while (!insideKey(x, y));
    pos.set([x - 0.3, y + 0.1, (Math.random() - 0.5) * 0.45], i * 3);
    const t = (x + 3.6) / 7.1;
    c.copy(t < 0.5 ? a : b).lerp(t < 0.5 ? b : g, t < 0.5 ? t * 2 : (t - 0.5) * 2);
    // a few white sparkles
    if (Math.random() < 0.06) c.set("#ffffff");
    col.set([c.r, c.g, c.b], i * 3);
  }
  return { pos, col };
}

const vertex = /* glsl */ `
  attribute vec3 aA; attribute vec3 aB; attribute vec3 aC;
  attribute vec3 cB; attribute vec3 cC; attribute float aRnd;
  uniform float uMorph; uniform float uTime; uniform float uSize; uniform float uPR;
  uniform vec3 uMouse; uniform float uRepel; uniform float uSweep;
  varying vec3 vColor; varying float vA;
  void main() {
    float m1 = clamp(uMorph, 0.0, 1.0);
    float m2 = clamp(uMorph - 1.0, 0.0, 1.0);
    float s1 = smoothstep(0.0, 1.0, clamp(m1 * 1.7 - aRnd * 0.7, 0.0, 1.0));
    float s2 = smoothstep(0.0, 1.0, clamp(m2 * 1.7 - aRnd * 0.7, 0.0, 1.0));
    vec3 p = mix(aA, aB, s1);
    p = mix(p, aC, s2);
    // swirl while travelling between shapes
    float travel = s1 * (1.0 - s1) * 4.0 + s2 * (1.0 - s2) * 4.0;
    p += vec3(sin(aRnd * 41.0 + uTime * 0.9), cos(aRnd * 29.0 + uTime * 0.7), sin(aRnd * 17.0 + uTime)) * travel * 0.9;
    // idle shimmer
    p += 0.025 * vec3(sin(uTime * 1.3 + aRnd * 50.0), cos(uTime * 1.1 + aRnd * 70.0), 0.0);
    // cursor ripple: points part around the pointer and lift towards the viewer
    vec2 away = p.xy - uMouse.xy;
    float near = smoothstep(1.7, 0.0, length(away)) * uRepel;
    p.xy += normalize(away + 0.0001) * near * (0.55 + aRnd * 0.6);
    p.z += near * 0.9;
    // light sweep across the finished key
    float glint = exp(-pow((aC.x - uSweep) * 1.3, 2.0)) * s2;
    vec3 col = mix(vec3(0.55, 0.6, 0.85), cB, s1);
    col = mix(col, cC, s2);
    col = mix(col, vec3(1.0, 0.9, 0.62), glint * 0.85);
    vColor = col;
    vA = 0.55 + 0.45 * s2 + glint * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPR * (0.5 + aRnd) * (1.0 + glint * 0.7 + near * 0.5) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor; varying float vA;
  uniform float uLight;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    // dark: glowing additive light; light: solid, slightly deeper colour so it reads on a pale page
    vec3 glow = vColor * (0.7 + a * 0.6);
    vec3 ink = vColor * 0.82;
    gl_FragColor = vec4(mix(glow, ink, uLight), a * mix(vA, 0.9, uLight));
  }
`;

export function initHero(canvas, light = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  const pr = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const small = window.innerWidth < 760;
  const n = small ? 3500 : 7000;
  const apps = appsShape(n);
  const key = keyShape(n);
  const rnd = new Float32Array(n).map(() => Math.random());

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(key.pos, 3)); // for bounds only
  geo.setAttribute("aA", new THREE.BufferAttribute(scatterShape(n), 3));
  geo.setAttribute("aB", new THREE.BufferAttribute(apps.pos, 3));
  geo.setAttribute("aC", new THREE.BufferAttribute(key.pos, 3));
  geo.setAttribute("cB", new THREE.BufferAttribute(apps.col, 3));
  geo.setAttribute("cC", new THREE.BufferAttribute(key.col, 3));
  geo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));

  const uniforms = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: small ? 62 : 80 },
    uPR: { value: pr },
    uLight: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uRepel: { value: 0 },
    uSweep: { value: 99 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0, last: -10, nx: 0, ny: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    const r = canvas.getBoundingClientRect();
    mouse.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    mouse.last = performance.now() / 1000;
  }, { passive: true });
  // find where the pointer meets the particles' plane, in the group's own (rotating) space
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const inv = new THREE.Matrix4();
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  function pointerOnPlane() {
    ndc.set(mouse.nx, mouse.ny);
    raycaster.setFromCamera(ndc, camera);
    group.updateMatrixWorld();
    inv.copy(group.matrixWorld).invert();
    raycaster.ray.applyMatrix4(inv);
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.lerp(hit, 0.25);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fit = Math.min(1, camera.aspect / 1.25);
    group.scale.setScalar(fit);
    group.position.y = camera.aspect < 1 ? 1.4 : 0.9;
  }
  resize();
  window.addEventListener("resize", resize);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  const startTime = performance.now() / 1000;
  let spinAngle = 0, keyTime = 0;
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const m = uniforms.uMorph.value;
    // the ring of apps spins; the key floats and faces the viewer
    const k = Math.min(Math.max(m - 1, 0), 1);
    // the ring spins only while it is fully a ring; then it unwinds the shortest way to upright
    if (k < 0.001) spinAngle = ((t * 0.15 + Math.PI) % (Math.PI * 2)) - Math.PI;
    group.rotation.z = spinAngle * (1 - k);
    group.rotation.y = mouse.x * 0.35 + Math.sin(t * 0.4) * 0.08;
    group.rotation.x = mouse.y * 0.2;
    // ripple fades in while the pointer moves and out 1.2 s after it stops
    const active = t - (mouse.last - startTime) < 1.2 ? 1 : 0;
    uniforms.uRepel.value += (active - uniforms.uRepel.value) * 0.06;
    if (uniforms.uRepel.value > 0.01) pointerOnPlane();
    // once the key is complete, a light sweeps across it every 4.5 s
    if (k > 0.98) {
      if (!keyTime) keyTime = t;
      const cyc = (t - keyTime) % 4.5;
      uniforms.uSweep.value = cyc < 1.5 ? -4.8 + 9.6 * (cyc / 1.5) : 99;
    } else { keyTime = 0; uniforms.uSweep.value = 99; }
    renderer.render(scene, camera);
  });

  function setTheme(isLight) {
    uniforms.uLight.value = isLight ? 1 : 0;
    mat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.needsUpdate = true;
  }
  setTheme(light);

  return { uniforms, setTheme };
}
