import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

/* =====================================================================
   CẤU HÌNH — y hệt props trên alfari.my.id
   Muốn dùng ảnh của bạn: đổi frontImage / backImage / strapImage thành
   đường dẫn ảnh (vd "img/front.webp"). Tỉ lệ gợi ý: mặt thẻ 2:3
   (1024x1536), dây 1024x248 (chữ chạy ngang). Nếu dùng ảnh local hãy mở
   file bằng một local server (VS Code Live Server…).
   ===================================================================== */
const isMobile = () => window.matchMedia("(max-width: 767px), (max-width: 1023px) and (orientation: portrait)").matches;
const CONFIG = () => ({
  portraitImage: "assets/images/home/lanyard/portrait.jpg", // ảnh trong ô chân dung, không phải toàn mặt thẻ
  backLogoImage: "assets/images/home/lanyard/back-logo.png", // logo PNG trong khung 1:1 ở mặt sau
  frontImage: null,       // null => dùng thẻ mẫu vẽ bằng canvas bên dưới
  backImage: null,
  strapImage: null,
  imageFit: "cover",       // cover | contain
  cardColor: "#04010e09",
  imagePadding: 0.035,
  strapColor: "#111827",
  finish: "glossy",        // glossy | matte | holographic | metallic
  rightInset: 0.15,        // resting card edge is 15% of the screen from the right
  orientation: "portrait", // portrait | landscape
  size: isMobile() ? (window.innerHeight <= 740 ? 0.34 : 0.40) : 0.46,
  cornerRadius: 0.25,
  strapLength: isMobile() ? (window.innerHeight <= 740 ? 0.22 : 0.32) : 0.59,
  strapWidth: 0.62,
  gravity: 1.55,
  damping: 0.42,
  elasticity: 0.85,
  breeze: 0.1,
  interactive: true,
  autoFlip: true,
  metal: "silver",         // silver | gold | graphite
  intro: true,
});

/* =====================================================================
   ENGINE — adapted from the supplied demo (Three.js + rope / rigid-body physics)
   ===================================================================== */
const LAYOUTS = { portrait: [1.6, 2.4], landscape: [2.25, 1.6] };
const CARD_DEPTH = 0.018, BEVEL = 0.007;
// Keep artwork clear of the beveled shell, including low-precision mobile depth buffers.
const CARD_FACE_Z = CARD_DEPTH / 2 + BEVEL + .002;
const SEGMENTS = 4;            // số đoạn dây
const NODE_INV_MASS = 20;
const SUBSTEP = 1 / 960;
const ITERATIONS = 2;
const STRAP_POINTS = 72;
const FOV = 24;
const CLIP_WIDTH = 0.36, RING_RADIUS = 0.095, RING_TUBE = 0.0135, LOOP_RADIUS = 0.036;
const TEX_SIZE = 1024;
const FINISHES = {
  glossy:      { roughness: .42, metalness: 0,   clearcoat: 1,  clearcoatRoughness: .06, foil: 0, anisotropy: 0 },
  matte:       { roughness: .85, metalness: 0,   clearcoat: 0,  clearcoatRoughness: .6,  foil: 0, anisotropy: 0 },
  holographic: { roughness: .3,  metalness: 0,   clearcoat: 1,  clearcoatRoughness: .04, foil: 1, anisotropy: 0 },
  metallic:    { roughness: .36, metalness: .75, clearcoat: .5, clearcoatRoughness: .18, foil: 0, anisotropy: .7 },
};
const STRAP_U = [0, .07, .93, 1];
const STRAP_ANGLES = [-.95, -.28, .28, .95];
const FLIP_SPIN = 9;
const METALS = {
  silver:   { color: "#d9dce2", roughness: .16 },
  gold:     { color: "#e4b965", roughness: .2 },
  graphite: { color: "#4d4f55", roughness: .28 },
};

/* ---------- shader foil (holographic) ---------- */
const FOIL_VARYINGS = `
varying vec2 vFoilUv;
varying vec3 vFoilX;
varying vec3 vFoilY;
`;
const FOIL_VERTEX = `
vFoilUv = uv;
vFoilX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
vFoilY = normalize((modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
`;
const FOIL_COMMON = `
uniform float foilStrength;
uniform float foilAspect;
uniform vec3 foilKey;
uniform vec3 foilFill;
uniform vec3 foilTop;
varying vec2 vFoilUv;
varying vec3 vFoilX;
varying vec3 vFoilY;

float foilHash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float foilBump(float t, float center, float width) {
  float x = (t - center) / width;
  return max(0.0, 1.0 - x * x);
}
vec3 foilSpectrum(float t) {
  return vec3(
    foilBump(t, 0.82, 0.32) + 0.4 * foilBump(t, 0.02, 0.12),
    foilBump(t, 0.5, 0.26),
    foilBump(t, 0.18, 0.24)
  );
}
vec3 foilGrating(float u, float spacing) {
  vec3 color = vec3(0.0);
  for (int m = 1; m <= 2; m++) {
    float order = float(m);
    float t = (spacing * abs(u) / order - 0.38) / 0.32;
    color += foilSpectrum(t) / order;
  }
  return color;
}
vec3 foilShard(vec2 p) {
  vec2 base = floor(p);
  float best = 9.0;
  float edge = 9.0;
  vec2 id = base;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 cell = base + vec2(float(i), float(j));
      vec2 site = cell + vec2(foilHash(cell), foilHash(cell + 7.31)) * 0.9 + 0.05;
      float d = length(site - p);
      if (d < best) { edge = best; best = d; id = cell; }
      else if (d < edge) { edge = d; }
    }
  }
  return vec3(foilHash(id + 3.17), foilHash(id + 11.73), edge - best);
}
`;
const FOIL_FRAGMENT = `
if (foilStrength > 0.0) {
  vec3 foilView = normalize(vViewPosition);
  vec3 foilNormal = normalize(normal);
  vec2 foilP = vec2(vFoilUv.x, vFoilUv.y * foilAspect);
  vec3 shard = foilShard(foilP * 26.0);
  vec2 ray = foilP - vec2(-1.6, 2.6 * foilAspect);
  float angle = atan(ray.y, ray.x) + (shard.x - 0.5) * 0.16;
  vec3 grating = normalize(vFoilX * cos(angle) + vFoilY * sin(angle));
  float spacing = 1.7 * (0.95 + shard.y * 0.1);
  vec3 rainbow = foilGrating(dot(foilKey + foilView, grating), spacing);
  rainbow += 0.6 * foilGrating(dot(foilTop + foilView, grating), spacing);
  rainbow *= 0.8 + 0.2 * smoothstep(0.0, 0.04, shard.z);
  rainbow = max(rainbow - 0.35 * min(rainbow.r, min(rainbow.g, rainbow.b)), 0.0);
  vec2 grid = foilP * 64.0;
  vec2 cell = floor(grid);
  vec2 jitter = vec2(foilHash(cell + 1.7), foilHash(cell + 9.2));
  float flake = smoothstep(0.32, 0.06, length(fract(grid) - jitter * 0.6 - 0.2)) * step(0.45, foilHash(cell + 4.4));
  vec3 facet = normalize(foilNormal + (vFoilX * (jitter.x - 0.5) + vFoilY * (jitter.y - 0.5)) * 0.8);
  float glint = pow(max(dot(reflect(-foilKey, facet), foilView), 0.0), 28.0);
  glint += 0.7 * pow(max(dot(reflect(-foilTop, facet), foilView), 0.0), 28.0);
  float fine = 1.0 - smoothstep(0.35, 0.9, max(fwidth(grid.x), fwidth(grid.y)));
  vec3 sparkle = flake * glint * fine * (vec3(0.7) + foilGrating(dot(foilKey + foilView, grating) + jitter.x * 0.4, spacing));
  float ink = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float foil = foilStrength * (0.08 + 0.92 * smoothstep(0.04, 0.7, ink));
  float facing = clamp(dot(foilNormal, foilView), 0.0, 1.0);
  float tint = clamp(dot(rainbow, vec3(0.4)), 0.0, 1.0);
  outgoingLight = outgoingLight * (1.0 - foil * (0.3 + 0.32 * tint)) + (rainbow * 0.62 * (0.4 + 0.6 * facing) + sparkle * 1.6) * foil;
}
`;

/* ---------- helpers ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const parseColor = (str, fallback) => {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return fallback;
    ctx.fillStyle = "#000000"; ctx.fillStyle = str;
    const c = ctx.fillStyle;
    if (c.startsWith("#")) { const n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
    const m = c.match(/[\d.]+/g);
    return !m || m.length < 3 ? fallback : [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
  } catch { return fallback; }
};
const luminance = (c) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
const rgba = (c, a = 1) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
const rng = (seed) => { let s = seed >>> 0; return () => { s = s + 1831565813 >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const roundRectPath = (p, x, y, w, h, r) => {
  const o = Math.max(0, Math.min(r, w / 2, h / 2)), k = o * .4477;
  p.moveTo(x + o, y); p.lineTo(x + w - o, y);
  p.bezierCurveTo(x + w - k, y, x + w, y + k, x + w, y + o);
  p.lineTo(x + w, y + h - o);
  p.bezierCurveTo(x + w, y + h - k, x + w - k, y + h, x + w - o, y + h);
  p.lineTo(x + o, y + h);
  p.bezierCurveTo(x + k, y + h, x, y + h - k, x, y + h - o);
  p.lineTo(x, y + o);
  p.bezierCurveTo(x, y + k, x + k, y, x + o, y);
};
const loadImage = (cache, src) => {
  if (!src) return Promise.resolve(null);
  const hit = cache.get(src); if (hit) return hit;
  const p = new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; img.decoding = "async";
    img.onload = async () => {
      try { await img.decode(); res(img); } catch { res(null); }
    };
    img.onerror = () => res(null);
    img.src = src;
  });
  cache.set(src, p); return p;
};
const cardLayout = (orientation, corner) => {
  const [w, h] = LAYOUTS[orientation] || LAYOUTS.portrait;
  const radius = lerp(.03, Math.min(w, h) * .2, clamp(corner, 0, 1));
  const slot = { width: .34, height: .07, y: h / 2 - .13 };
  const ringY = h / 2 - .055;
  return { width: w, height: h, radius, slot, ringY, hangY: ringY + RING_RADIUS };
};
const buildCardGeometry = (L) => {
  const { width: w, height: h, radius: r, slot } = L;
  const shape = new THREE.Shape();
  roundRectPath(shape, -w / 2 + BEVEL, -h / 2 + BEVEL, w - BEVEL * 2, h - BEVEL * 2, Math.max(r - BEVEL, .005));
  const hole = new THREE.Path();
  roundRectPath(hole, -slot.width / 2 - BEVEL, slot.y - slot.height / 2 - BEVEL, slot.width + BEVEL * 2, slot.height + BEVEL * 2, slot.height / 2 + BEVEL);
  shape.holes.push(hole);
  const body = new THREE.ExtrudeGeometry(shape, { depth: CARD_DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 5, curveSegments: 24 });
  body.translate(0, 0, -CARD_DEPTH / 2);
  const face = new THREE.ShapeGeometry(shape, 24);
  const pos = face.getAttribute("position"), uv = face.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return { body, face };
};
const buildClipGeometry = (width) => {
  const s = new THREE.Shape(), w = width * 1.16;
  roundRectPath(s, -w / 2 + .014, -.061, w - .028, .122, .024);
  const g = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 6, curveSegments: 10 });
  g.translate(0, 0, -.01);
  return g;
};
const buildStrapGeometry = (n) => {
  const cols = STRAP_U.length, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * cols * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * cols * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * cols * 2), 2));
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j; idx.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1); }
  g.setIndex(idx);
  return g;
};
const buildEnvironment = (renderer) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(.035, .035, .04);
  const plane = new THREE.PlaneGeometry(1, 1), mats = [];
  const add = (v, pos, scale, rotZ = 0) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.set(...pos); mesh.scale.set(scale[0], scale[1], 1); mesh.lookAt(0, 0, 0); mesh.rotateZ(rotZ);
    scene.add(mesh);
  };
  add(2.6, [0, 4.5, 8], [9, 4]);
  add(6, [-5.5, .5, 7], [.9, 14]);
  add(4, [5, -.5, 8], [.6, 14]);
  add(3.5, [0, -1, 9], [24, .35], Math.PI / 3);
  add(2.5, [1, 2.5, 9], [24, .2], Math.PI / 3);
  add(1.4, [0, 6, -6], [12, 4]);
  add(.5, [0, -7, 1], [16, 6]);
  add(.9, [8, 0, -2], [4, 10]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, .035);
  pmrem.dispose(); plane.dispose(); mats.forEach((m) => m.dispose());
  return rt;
};
const canvasTexture = (c, aniso) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
const buildCardNormal = () => {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128;
  const ctx = c.getContext("2d"); if (!ctx) return new THREE.CanvasTexture(c);
  const r = rng(7), noise = Float32Array.from({ length: 16384 }, () => r());
  const blur = (x, y) => { let s = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) s += noise[(y + i + 128) % 128 * 128 + (x + j + 128) % 128]; return s / 9 * 1.6; };
  const img = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const dx = blur((x - 1 + 128) % 128, y) - blur((x + 1) % 128, y);
    const dy = blur(x, (y - 1 + 128) % 128) - blur(x, (y + 1) % 128);
    const l = Math.hypot(dx, dy, 1), i = (y * 128 + x) * 4;
    img.data[i] = (dx / l * .5 + .5) * 255; img.data[i + 1] = (dy / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 7);
  return t;
};
const buildStrapNormal = () => {
  const r = rng(19), noise = Float32Array.from({ length: 16384 }, () => r());
  const bump = (e) => Math.sqrt(Math.max(0, 1 - 4 * e * e));
  const height = (x, y) => {
    const i = (x % 128 + 128) % 128, a = (y % 128 + 128) % 128;
    const o = i / 128 * 8, s = a / 128 * 8, c = Math.floor(o), l = Math.floor(s), u = o - c - .5, d = s - l - .5;
    const even = (c + l) % 2 === 0;
    const p = bump(u) * (.55 + .45 * Math.cos(d * Math.PI * (even ? 1 : .6)));
    const m = bump(d) * (.55 + .45 * Math.cos(u * Math.PI * (even ? .6 : 1)));
    return (even ? Math.max(p, m * .7) : Math.max(m, p * .7)) + noise[a * 128 + i] * .08;
  };
  const data = new Uint8Array(65536);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const dx = (height(x - 1, y) - height(x + 1, y)) * 1.6, dy = (height(x, y - 1) - height(x, y + 1)) * 1.6;
    const l = Math.hypot(dx, dy, 1), i = (y * 128 + x) * 4;
    data[i] = (dx / l * .5 + .5) * 255; data[i + 1] = (dy / l * .5 + .5) * 255; data[i + 2] = (1 / l * .5 + .5) * 255; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, 128, 128);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
};
const drawFit = (ctx, img, w, h, fit) => {
  const s = (fit === "contain" ? Math.min : Math.max)(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};
const drawFace = (canvas, img, color, fit, pad) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = rgba(color); ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!img) return;
  const px = canvas.width * pad, py = canvas.height * pad;
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, canvas.width - px * 2, canvas.height - py * 2); ctx.clip();
  ctx.translate(px, py); drawFit(ctx, img, canvas.width - px * 2, canvas.height - py * 2, fit); ctx.restore();
};
const drawStrap = (canvas, img, color) => {
  const len = img ? Math.max(64, Math.round(img.width / img.height * 192)) : 384;
  canvas.width = 192; canvas.height = len;
  const ctx = canvas.getContext("2d");
  if (!ctx) return len / 192;
  ctx.fillStyle = rgba(color); ctx.fillRect(0, 0, 192, len);
  if (img) { ctx.save(); ctx.translate(192, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(img, 0, 0, len, 192); ctx.restore(); return len / 192; }
  const ink = luminance(color) > .5 ? [0, 0, 0] : [1, 1, 1];
  ctx.fillStyle = rgba(ink, .05); for (let y = 0; y < len; y += 4) ctx.fillRect(0, y, 192, 1);
  ctx.fillStyle = rgba(ink, .2);
  for (let y = 0; y < len; y += 14) { ctx.fillRect(192 * .075, y, 2, 8); ctx.fillRect(192 * .925 - 2, y, 2, 8); }
  return len / 192;
};

/* ---------- vật lý: dây (verlet) + thẻ (rigid body) ---------- */
const createRig = () => {
  const vecs = () => Array.from({ length: 5 }, () => new THREE.Vector3());
  return {
    nodes: vecs(), previous: vecs(), velocities: vecs(),
    lengths: new Float64Array(SEGMENTS), impulses: new Float64Array(SEGMENTS),
    rest: 1, anchor: new THREE.Vector3(),
    body: {
      position: new THREE.Vector3(), previous: new THREE.Vector3(), velocity: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(), previousQuaternion: new THREE.Quaternion(), angular: new THREE.Vector3(),
      mass: 1, inverseInertia: new THREE.Vector3(1, 1, 1), hang: new THREE.Vector3(),
    },
    grab: null, turn: 0, twist: 0, twistRaw: 0, calm: 0,
  };
};
const T = {
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(),
  e: new THREE.Vector3(), f: new THREE.Vector3(), g: new THREE.Vector3(), pin: new THREE.Vector3(),
  q: new THREE.Quaternion(), r: new THREE.Quaternion(),
};
const applyInvInertia = (b, v, out) => {
  T.r.copy(b.quaternion).invert();
  out.copy(v).applyQuaternion(T.r);
  out.set(out.x * b.inverseInertia.x, out.y * b.inverseInertia.y, out.z * b.inverseInertia.z);
  return out.applyQuaternion(b.quaternion);
};
const integrateQuat = (q, w) => {
  const { x, y, z, w: qw } = q;
  q.x += .5 * (w.x * qw + w.y * z - w.z * y);
  q.y += .5 * (w.y * qw + w.z * x - w.x * z);
  q.z += .5 * (w.z * qw + w.x * y - w.y * x);
  q.w += .5 * (-w.x * x - w.y * y - w.z * z);
  q.normalize();
};
const effectiveInvMass = (b, r, n) => { const rn = T.c.crossVectors(r, n); return 1 / b.mass + rn.dot(applyInvInertia(b, rn, T.d)); };
const applyImpulse = (b, r, j) => { b.position.addScaledVector(j, 1 / b.mass); integrateQuat(b.quaternion, applyInvInertia(b, T.e.crossVectors(r, j), T.f)); };
const solveSegment = (rig, i, h, p) => {
  const { nodes, body } = rig;
  const a = nodes[i], wA = i === 0 ? 0 : NODE_INV_MASS, last = i === 3, r = T.g;
  let b = nodes[i + 1];
  if (last) { r.copy(body.hang).applyQuaternion(body.quaternion); b = T.b.copy(body.position).add(r); }
  const d = T.a.subVectors(b, a), len = d.length(), stretch = len - rig.rest;
  if (stretch <= 0 || len < 1e-9) return;
  const n = d.divideScalar(len);
  const wB = last ? effectiveInvMass(body, r, n) : NODE_INV_MASS;
  const rate = (len - rig.lengths[i]) / h;
  const limit = (p.hold * Math.tanh(p.stiffness * stretch / p.hold) + p.spring * stretch + p.bandDamping * Math.max(0, rate)) * h * h - rig.impulses[i];
  if (limit <= 0) return;
  const lambda = Math.min(stretch / (wA + wB), limit);
  rig.impulses[i] += lambda;
  if (wA) a.addScaledVector(n, lambda * wA);
  if (last) applyImpulse(body, r, n.multiplyScalar(-lambda));
  else b.addScaledVector(n, -lambda * wB);
};
const solveGrab = (b, grab, pin) => {
  const r = T.g.copy(grab.local).applyQuaternion(b.quaternion);
  const d = T.a.copy(pin).sub(b.position).sub(r), len = d.length();
  if (len < 1e-9) return;
  const n = d.divideScalar(len), s = len / effectiveInvMass(b, r, n);
  applyImpulse(b, r, n.multiplyScalar(s));
};
const resetRig = (rig, L, intro) => {
  const { nodes, previous, velocities, body, anchor } = rig;
  nodes[0].copy(anchor);
  // Release the card above the fixed anchor with slack in the strap.
  // Gravity accelerates it until the strap catches; the solver handles recoil.
  for (let i = 1; i <= SEGMENTS; i++) {
    nodes[i].copy(nodes[i - 1]);
    nodes[i].y += intro ? rig.rest * .72 : -rig.rest;
  }
  body.quaternion.identity();
  if (intro) body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.14);
  body.hang.set(0, L.hangY, 0);
  const off = T.a.copy(body.hang).applyQuaternion(body.quaternion);
  body.position.copy(nodes[SEGMENTS]).sub(off);
  body.previous.copy(body.position); body.previousQuaternion.copy(body.quaternion);
  body.velocity.set(0, 0, 0); body.angular.set(0, 0, 0);
  if (intro) { body.velocity.set(.7, -1.3, .15); body.angular.set(.15, .1, -.55); }
  for (let i = 0; i <= SEGMENTS; i++) { previous[i].copy(nodes[i]); velocities[i].set(0, 0, 0); }
  rig.lengths.fill(rig.rest); rig.turn = 0; rig.twist = 0; rig.twistRaw = 0; rig.calm = 0;
};
const configureRig = (rig, L, length) => {
  rig.rest = length / SEGMENTS;
  const { width: w, height: h } = L, b = rig.body, t = .032;
  b.mass = 1;
  b.inverseInertia.set(12 / (h * h + t * t), 12 / (w * w + t * t), 12 / (w * w + h * h));
  b.hang.set(0, L.hangY, 0);
};
const stepRig = (rig, dt, p, time) => {
  const steps = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-6)), h = dt / steps;
  const { nodes, previous, velocities, body } = rig;
  const windX = p.breeze * (Math.sin(time * .53) * .7 + Math.sin(time * 1.31 + 1.7) * .3) * 3;
  const windZ = p.breeze * Math.sin(time * .37 + .6) * 2;
  const grab = rig.grab, pin = T.pin;
  const nodeDecay = Math.exp(-p.nodeDrag * h), linDecay = Math.exp(-p.linearDrag * h), angDecay = Math.exp(-p.angularDrag * h);
  for (let s = 0; s < steps; s++) {
    for (let i = 1; i < SEGMENTS; i++) {
      const v = velocities[i];
      v.y -= p.gravity * h; v.x += windX * h; v.z += windZ * h;
      previous[i].copy(nodes[i]); nodes[i].addScaledVector(v, h);
    }
    body.previous.copy(body.position); body.previousQuaternion.copy(body.quaternion);
    const q = body.quaternion;
    if (grab) {
      const dq = T.q.copy(grab.rotation).multiply(T.r.copy(q).invert());
      if (dq.w < 0) dq.set(-dq.x, -dq.y, -dq.z, -dq.w);
      const torque = T.a.set(dq.x, dq.y, dq.z).multiplyScalar(2 * p.grip);
      torque.addScaledVector(body.angular, -p.gripDamping);
      body.angular.addScaledVector(applyInvInertia(body, torque, T.b), h);
    }
    const up = T.a.set(0, 1, 0).applyQuaternion(q);
    const ref = T.b.set(-up.x * up.z, -up.y * up.z, 1 - up.z * up.z);
    if (ref.lengthSq() > .001) {
      const fwd = T.d.set(0, 0, 1).applyQuaternion(q);
      const ang = Math.atan2(T.e.crossVectors(ref, fwd).dot(up), ref.dot(fwd));
      let dlt = ang - rig.twistRaw;
      if (dlt > Math.PI) dlt -= Math.PI * 2; else if (dlt < -Math.PI) dlt += Math.PI * 2;
      rig.twist += dlt; rig.twistRaw = ang;
    }
    if (!grab) {
      const spin = body.angular.dot(up);
      body.angular.addScaledVector(up, (p.twist * (rig.turn - rig.twist) - p.twistDamping * spin) * h);
    }
    body.velocity.y -= p.gravity * h; body.velocity.x += windX * .35 * h; body.velocity.z += windZ * .35 * h;
    body.position.addScaledVector(body.velocity, h);
    integrateQuat(body.quaternion, T.f.copy(body.angular).multiplyScalar(h));
    rig.impulses.fill(0);
    if (grab) pin.lerpVectors(grab.from, grab.target, (s + 1) / steps);
    for (let k = 0; k < ITERATIONS; k++) {
      for (let i = 0; i < SEGMENTS; i++) solveSegment(rig, i, h, p);
      if (grab) solveGrab(body, grab, pin);
    }
    for (let i = 1; i < SEGMENTS; i++) {
      const v = velocities[i].subVectors(nodes[i], previous[i]).divideScalar(h).multiplyScalar(nodeDecay);
      v.multiplyScalar(1 / (1 + p.nodeAir * v.length() * h));
    }
    body.velocity.subVectors(body.position, body.previous).divideScalar(h);
    const dq = T.q.copy(body.previousQuaternion).invert().premultiply(body.quaternion);
    body.angular.set(dq.x, dq.y, dq.z).multiplyScalar(2 / h * (dq.w < 0 ? -1 : 1));
    const nrm = T.a.set(0, 0, 1).applyQuaternion(body.quaternion), vn = body.velocity.dot(nrm);
    const vt = T.b.copy(body.velocity).addScaledVector(nrm, -vn);
    vt.multiplyScalar(1 / (1 + p.air * vt.length() * h));
    body.velocity.copy(vt).addScaledVector(nrm, vn / (1 + p.broadside * Math.abs(vn) * h)).multiplyScalar(linDecay);
    body.angular.multiplyScalar(angDecay / (1 + p.spinAir * body.angular.length() * h));
    if (body.velocity.lengthSq() > 3600) body.velocity.setLength(60);
    if (body.angular.lengthSq() > 1600) body.angular.setLength(40);
    nodes[SEGMENTS].copy(body.hang).applyQuaternion(body.quaternion).add(body.position);
    for (let i = 0; i < SEGMENTS; i++) rig.lengths[i] = nodes[i].distanceTo(nodes[i + 1]);
  }
  if (grab) grab.from.copy(grab.target);
  let energy = body.velocity.lengthSq() + body.angular.lengthSq() * .3;
  for (let i = 1; i < SEGMENTS; i++) energy += velocities[i].lengthSq() * .05;
  rig.calm = energy < 2e-4 ? rig.calm + dt : 0;
};

/* ---------- component ---------- */
async function createLanyard(container, getProps) {
  let props = getProps();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.className = "lanyard-canvas";
  canvas.style.visibility = "hidden";
  canvas.setAttribute("role", "button");
  canvas.setAttribute("aria-label", "Thẻ đeo 3D: kéo để lắc, nhấn Enter hoặc Space để lật");
  canvas.tabIndex = 0;
  container.appendChild(canvas);

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  const env = buildEnvironment(renderer);
  scene.environment = env.texture;
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 200);
  const root = new THREE.Group(); scene.add(root);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2.5, 4, 6);
  const fill = new THREE.DirectionalLight(0xffffff, .35); fill.position.set(3, -1, 4);
  scene.add(key, fill);

  const imgCache = new Map(), images = { front: null, back: null, strap: null };
  const frontCanvas = document.createElement("canvas"), backCanvas = document.createElement("canvas"), strapCanvas = document.createElement("canvas");
  let frontTex = canvasTexture(frontCanvas, aniso), backTex = canvasTexture(backCanvas, aniso);
  const strapTex = canvasTexture(strapCanvas, aniso);
  strapTex.wrapS = THREE.ClampToEdgeWrapping; strapTex.wrapT = THREE.RepeatWrapping;
  const cardNormal = buildCardNormal(), strapNormal = buildStrapNormal();

  const foil = { foilStrength: { value: 0 }, foilAspect: { value: 1.4 }, foilKey: { value: new THREE.Vector3() }, foilFill: { value: new THREE.Vector3() }, foilTop: { value: new THREE.Vector3() } };
  const injectFoil = (sh) => {
    Object.assign(sh.uniforms, foil);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${FOIL_VARYINGS}`).replace("#include <project_vertex>", `#include <project_vertex>\n${FOIL_VERTEX}`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\n${FOIL_COMMON}`).replace("#include <opaque_fragment>", `${FOIL_FRAGMENT}\n#include <opaque_fragment>`);
  };
  const frontMat = new THREE.MeshPhysicalMaterial({ map: frontTex, normalMap: cardNormal, normalScale: new THREE.Vector2(.06, .06) });
  const backMat = new THREE.MeshPhysicalMaterial({ map: backTex, normalMap: cardNormal, normalScale: new THREE.Vector2(.06, .06) });
  frontMat.onBeforeCompile = injectFoil; backMat.onBeforeCompile = injectFoil;
  const bodyMat = new THREE.MeshPhysicalMaterial();
  const metalMat = new THREE.MeshStandardMaterial({ metalness: 1 });
  const strapMat = new THREE.MeshPhysicalMaterial({ map: strapTex, normalMap: strapNormal, normalScale: new THREE.Vector2(.7, .7), roughness: .68, sheen: 1, sheenRoughness: .42, sheenColor: new THREE.Color(.32, .32, .34), side: THREE.DoubleSide });

  const card = new THREE.Group();
  const bodyMesh = new THREE.Mesh(undefined, bodyMat);
  const frontMesh = new THREE.Mesh(undefined, frontMat);
  const backMesh = new THREE.Mesh(undefined, backMat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 18, 72), metalMat);
  ring.rotation.y = Math.PI / 2 - .7;
  card.add(bodyMesh, frontMesh, backMesh, ring); root.add(card);

  const strapGeo = buildStrapGeometry(STRAP_POINTS);
  const strapMesh = new THREE.Mesh(strapGeo, strapMat); strapMesh.frustumCulled = false; root.add(strapMesh);

  const clip = new THREE.Group();
  const clipMesh = new THREE.Mesh(buildClipGeometry(CLIP_WIDTH), metalMat); clipMesh.position.y = .107;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(LOOP_RADIUS, .0105, 14, 40), metalMat);
  clip.add(clipMesh, loop); root.add(clip);

  const rig = createRig();
  const curvePts = [], tailA = new THREE.Vector3(), tailB = new THREE.Vector3();
  const curve = new THREE.CatmullRomCurve3(curvePts, false, "centripetal");
  const view = { width: 1, height: 1, pixelRatio: 0 };
  let layout = cardLayout("portrait", .3), last = {}, strapScale = CLIP_WIDTH, strapAspect = 2;
  let raf = 0, lastTime = performance.now(), clock = 0, started = false;
  let imagesReady = Promise.resolve();
  let nextFlip = 6 + Math.random() * 6, flipping = false, visible = true, alive = true, placed = false, hovering = false, click = null, loadId = 0;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const redrawFaces = () => {
    const color = parseColor(props.cardColor, [1, 1, 1]);
    const w = TEX_SIZE, h = Math.round(TEX_SIZE * layout.height / layout.width);
    if (frontCanvas.width !== w || frontCanvas.height !== h) {
      frontCanvas.width = w; frontCanvas.height = h; backCanvas.width = w; backCanvas.height = h;
      frontTex.dispose(); backTex.dispose();
    }
    drawFace(frontCanvas, images.front, color, props.imageFit, props.imagePadding);
    drawFace(backCanvas, images.back || images.front, color, props.imageFit, props.imagePadding);
    frontTex.needsUpdate = true; backTex.needsUpdate = true;
    wake();
  };
  const redrawStrap = () => {
    strapAspect = drawStrap(strapCanvas, images.strap, parseColor(props.strapColor, [.07, .07, .07]));
    strapNormal.repeat.set(2, 2 * strapAspect);
    strapTex.dispose(); strapTex.needsUpdate = true;
    wake();
  };
  const frame = () => {
    const aspect = view.width / view.height;
    let height = layout.height / clamp(props.size, .15, .9);
    const minW = layout.width / .72;
    if (height * aspect < minW) height = minW / aspect;
    const width = height * aspect;
    camera.aspect = aspect;
    camera.position.set(0, 0, height / 2 / Math.tan(FOV * Math.PI / 360));
    // Use depth precision around the card rather than empty space near the camera.
    camera.near = camera.position.z / 2;
    camera.far = camera.position.z + height * 2;
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    foil.foilKey.value.set(-2.5, 4, 6).normalize().transformDirection(camera.matrixWorldInverse);
    foil.foilFill.value.set(3, -1, 4).normalize().transformDirection(camera.matrixWorldInverse);
    foil.foilTop.value.set(.5, 4.5, 8).normalize().transformDirection(camera.matrixWorldInverse);
    // Convert the screen inset to world units, including half the card width.
    const ax = isMobile() ? 0 : width / 2 - window.innerWidth * props.rightInset * height / view.height - layout.width / 2;
    const top = height / 2 + .05;
    const cardTop = height / 2 - height * lerp(.12, .42, clamp(props.strapLength, 0, 1)) + (layout.hangY - layout.height / 2);
    rig.anchor.set(ax, top, 0);
    configureRig(rig, layout, top - cardTop);
    rig.nodes[0].copy(rig.anchor); rig.previous[0].copy(rig.anchor);
  };
  const update = () => {
    props = getProps();
    if (props.intro && !last.intro && !reducedMotion) placed = false;
    const layoutKey = `${props.orientation}|${props.cornerRadius}`;
    if (layoutKey !== last.layoutKey) {
      layout = cardLayout(props.orientation, props.cornerRadius);
      const g = buildCardGeometry(layout);
      bodyMesh.geometry.dispose(); frontMesh.geometry.dispose(); backMesh.geometry.dispose();
      bodyMesh.geometry = g.body; frontMesh.geometry = g.face; backMesh.geometry = g.face.clone();
      frontMesh.position.z = CARD_FACE_Z; backMesh.rotation.y = Math.PI; backMesh.position.z = -CARD_FACE_Z;
      ring.position.set(0, layout.ringY, 0);
      last.framingKey = "";
    }
    const framingKey = `${layoutKey}|${props.size}|${props.rightInset}|${props.strapLength}|${props.intro}|${view.width}|${view.height}`;
    if (framingKey !== last.framingKey) {
      frame();
      if (placed) { if (layoutKey !== last.layoutKey) resetRig(rig, layout, false); }
      else { resetRig(rig, layout, props.intro && !reducedMotion); placed = true; }
    }
    const imageKey = `${props.frontImage}|${props.backImage}|${props.strapImage}`;
    if (imageKey !== last.imageKey) {
      const id = ++loadId;
      imagesReady = Promise.all([loadImage(imgCache, props.frontImage), loadImage(imgCache, props.backImage), loadImage(imgCache, props.strapImage)]).then(([f, b, s]) => {
        if (alive && id === loadId) { images.front = f; images.back = b; images.strap = s; redrawFaces(); redrawStrap(); }
      });
    }
    const faceKey = `${layoutKey}|${props.cardColor}|${props.imageFit}|${props.imagePadding}`;
    if (faceKey !== last.faceKey) redrawFaces();
    if (props.strapColor !== last.strapColor) redrawStrap();
    const fin = FINISHES[props.finish] || FINISHES.glossy, cc = parseColor(props.cardColor, [1, 1, 1]);
    [frontMat, backMat].forEach((m) => { m.roughness = fin.roughness; m.metalness = fin.metalness; m.clearcoat = fin.clearcoat; m.clearcoatRoughness = fin.clearcoatRoughness; m.anisotropy = fin.anisotropy; });
    foil.foilStrength.value = fin.foil; foil.foilAspect.value = layout.height / layout.width;
    bodyMat.color.setRGB(cc[0] * .92, cc[1] * .92, cc[2] * .92, THREE.SRGBColorSpace);
    bodyMat.roughness = Math.min(fin.roughness, .35); bodyMat.metalness = fin.metalness; bodyMat.clearcoat = 1; bodyMat.clearcoatRoughness = .08;
    const metal = METALS[props.metal] || METALS.silver;
    metalMat.color.set(metal.color); metalMat.roughness = metal.roughness;
    strapScale = CLIP_WIDTH * clamp(props.strapWidth, .4, 2);
    if (strapScale !== last.strapScale) { clipMesh.geometry.dispose(); clipMesh.geometry = buildClipGeometry(strapScale); }
    canvas.style.touchAction = props.interactive ? "pan-y" : "auto";
    last = { layoutKey, framingKey, imageKey, faceKey, strapColor: props.strapColor, strapScale, intro: props.intro };
    wake();
  };

  const samples = Array.from({ length: STRAP_POINTS }, () => new THREE.Vector3());
  const sides = Array.from({ length: STRAP_POINTS }, () => new THREE.Vector3());
  const ringDirs = STRAP_ANGLES.map((a) => [Math.cos(a), Math.sin(a)]);
  const V = { tangent: new THREE.Vector3(), toCamera: new THREE.Vector3(), basis: new THREE.Matrix4(), up: new THREE.Vector3(), across: new THREE.Vector3(), facing: new THREE.Vector3(), end: new THREE.Vector3() };
  const buildStrap = () => {
    const end = rig.nodes[SEGMENTS], tail = .236;
    let n = 3;
    while (n > 0 && rig.nodes[n].distanceTo(end) < tail * 1.1) n--;
    const up = V.up.subVectors(rig.nodes[n], end);
    if (up.lengthSq() < 1e-8) up.set(0, 1, 0).applyQuaternion(rig.body.quaternion);
    up.normalize();
    tailA.copy(end).addScaledVector(up, tail);
    tailB.copy(end).addScaledVector(up, .0885);
    curvePts.length = 0;
    for (let i = 0; i <= n; i++) curvePts.push(rig.nodes[i]);
    curvePts.push(tailA, tailB);
    curve.updateArcLengths();
    for (let i = 0; i < STRAP_POINTS; i++) curve.getPointAt(i / 71, samples[i]);
    const length = curve.getLength(), twistEnd = 1 - tailA.distanceTo(tailB) / Math.max(length, .001);
    const pos = strapGeo.getAttribute("position"), nor = strapGeo.getAttribute("normal"), uv = strapGeo.getAttribute("uv");
    const cols = STRAP_U.length, restLen = rig.rest * SEGMENTS, vScale = restLen / (strapScale * strapAspect);
    const width = strapScale / Math.max(1, length / Math.max(restLen, .001)) ** .35;
    const { tangent, toCamera, across, facing } = V;
    for (let i = 0; i < STRAP_POINTS; i++) {
      tangent.subVectors(samples[Math.min(71, i + 1)], samples[Math.max(0, i - 1)]);
      if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
      tangent.normalize();
      toCamera.subVectors(camera.position, samples[i]).normalize();
      const side = sides[i].crossVectors(toCamera, tangent);
      if (side.lengthSq() < 1e-10) side.copy(i > 0 ? sides[i - 1] : T.a.set(1, 0, 0));
      side.normalize();
      if (i > 0 && side.dot(sides[i - 1]) < 0) side.negate();
      const tw = -rig.twist * Math.min(1, i / 71 / twistEnd) ** 1.3;
      facing.crossVectors(tangent, side);
      across.copy(side).multiplyScalar(Math.cos(tw)).addScaledVector(facing, Math.sin(tw));
      facing.crossVectors(tangent, across);
      const p = samples[i], v = (1 - i / 71) * vScale;
      for (let j = 0; j < cols; j++) {
        const k = i * cols + j, off = (STRAP_U[j] - .5) * width, [c, d] = ringDirs[j];
        pos.setXYZ(k, p.x + across.x * off, p.y + across.y * off, p.z + across.z * off);
        nor.setXYZ(k, facing.x * c + across.x * d, facing.y * c + across.y * d, facing.z * c + across.z * d);
        uv.setXY(k, STRAP_U[j], v);
      }
    }
    V.end.copy(across);
    pos.needsUpdate = true; nor.needsUpdate = true; uv.needsUpdate = true;
    across.copy(V.end).addScaledVector(up, -V.end.dot(up)).normalize();
    facing.crossVectors(across, up).normalize();
    V.basis.makeBasis(across, up, facing);
    clip.quaternion.setFromRotationMatrix(V.basis);
    clip.position.copy(end);
  };
  const render = () => {
    card.position.copy(rig.body.position);
    card.quaternion.copy(rig.body.quaternion);
    buildStrap();
    renderer.render(scene, camera);
  };
  const physics = () => {
    const g = 40 * clamp(props.gravity, 0, 3), base = Math.max(g, 20);
    const el = clamp(props.elasticity, 0, 1), dm = clamp(props.damping, 0, 1);
    return {
      gravity: g, hold: base * lerp(2.2, 5.5, el), stiffness: base * 10 * SEGMENTS,
      spring: base * lerp(.1, .4, el) * SEGMENTS, bandDamping: base * lerp(.3, .08, el) * SEGMENTS,
      linearDrag: .25 * 16 ** dm, angularDrag: .5 * 12 ** dm,
      air: .15, broadside: .5, spinAir: .03, nodeDrag: 2, nodeAir: .2,
      twist: 30, twistDamping: 3, grip: 40, gripDamping: 6,
      breeze: reducedMotion ? 0 : clamp(props.breeze, 0, 1),
    };
  };
  const tick = (now) => {
    raf = 0;
    if (!started || !alive || document.hidden || !visible) return;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastTime) / 1000));
    lastTime = now; clock += dt;
    const p = physics();
    if (props.autoFlip && !reducedMotion && !rig.grab) {
      if (flipping && rig.twist * Math.sign(rig.turn) >= Math.PI * .85) {
        flipping = false; flip(rig.body.position, 3.5); nextFlip = clock + 8 + Math.random() * 12;
      } else if (!flipping && rig.turn === 0 && clock >= nextFlip) {
        flip(rig.body.position, 3.5); flipping = rig.turn !== 0;
      }
    }
    stepRig(rig, dt, p, clock);
    const b = rig.body;
    if (!Number.isFinite(b.position.x + b.position.y + b.position.z + b.quaternion.w)) { rig.grab = null; resetRig(rig, layout, false); }
    render();
    const auto = props.autoFlip && !reducedMotion;
    const sleeping = rig.calm > 1.2 && !rig.grab && p.breeze === 0 && !auto;
    if (visible && !sleeping) raf = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (started && !raf && visible && alive && !document.hidden) { rig.calm = 0; lastTime = performance.now(); raf = requestAnimationFrame(tick); }
  };

  /* ---------- tương tác chuột / cảm ứng ---------- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const setRay = (ev) => {
    const r = canvas.getBoundingClientRect();
    ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };
  const hit = () => { card.updateMatrixWorld(); return raycaster.intersectObjects([bodyMesh, frontMesh, backMesh], false)[0] || null; };
  const setCursor = (c) => { if (canvas.style.cursor !== c) canvas.style.cursor = c; };
  const flip = (point, strength = FLIP_SPIN) => {
    const b = rig.body, up = T.a.set(0, 1, 0).applyQuaternion(b.quaternion);
    let dir = rig.turn > 0 ? -1 : 1;
    if (rig.turn === 0) {
      const ray = T.c.subVectors(point, camera.position).normalize();
      dir = T.b.subVectors(point, b.position).cross(ray).dot(up) < 0 ? -1 : 1;
    }
    rig.turn = rig.turn === 0 ? Math.PI * dir : 0;
    b.angular.addScaledVector(up, strength * dir);
  };
  const onDown = (ev) => {
    if (!props.interactive || ev.button > 0) return;
    setRay(ev);
    const h = hit();
    if (!h) return;
    rig.grab = {
      local: h.point.clone().sub(rig.body.position).applyQuaternion(rig.body.quaternion.clone().invert()),
      rotation: rig.body.quaternion.clone(), reach: h.distance, from: h.point.clone(), target: h.point.clone(),
    };
    click = { x: ev.clientX, y: ev.clientY, time: performance.now(), point: h.point.clone() };
    canvas.setPointerCapture?.(ev.pointerId);
    setCursor("grabbing"); ev.preventDefault(); wake();
  };
  const onMove = (ev) => {
    if (!props.interactive) return;
    setRay(ev);
    if (rig.grab) {
      if (click && Math.hypot(ev.clientX - click.x, ev.clientY - click.y) > 6) click = null;
      raycaster.ray.at(rig.grab.reach, rig.grab.target);
      wake();
    } else if (ev.pointerType !== "touch") {
      hovering = !!hit(); setCursor(hovering ? "grab" : "");
    }
  };
  const onUp = (ev) => {
    if (!rig.grab) return;
    rig.grab = null;
    if (click && ev.type === "pointerup" && performance.now() - click.time < 450) flip(click.point);
    click = null;
    canvas.releasePointerCapture?.(ev.pointerId);
    setCursor(hovering && ev.pointerType !== "touch" ? "grab" : "");
    wake();
  };
  const onTouchStart = (ev) => {
    if (props.interactive && ev.touches.length === 1) { setRay(ev.touches[0]); if (hit()) ev.preventDefault(); }
  };
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip(rig.body.position);
      wake();
    }
  });
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("lostpointercapture", onUp);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });

  const resize = () => {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
    if (width === view.width && height === view.height && pixelRatio === view.pixelRatio) return;
    view.width = width;
    view.height = height;
    if (pixelRatio !== view.pixelRatio) renderer.setPixelRatio(pixelRatio);
    view.pixelRatio = pixelRatio;
    renderer.setSize(view.width, view.height, false);
    update();
    if (started) render();
  };
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }); io.observe(container);
  const onVis = () => { if (!document.hidden) wake(); };
  document.addEventListener("visibilitychange", onVis);
  resize();

  // Decode artwork, upload textures, and compile shaders before the first drop.
  await imagesReady;
  [frontTex, backTex, strapTex, cardNormal, strapNormal].forEach((texture) => renderer.initTexture(texture));
  await renderer.compileAsync(scene, camera);
  render();
  // Let the hidden warm-up frame finish before showing or advancing the rig.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  resetRig(rig, layout, props.intro && !reducedMotion);
  started = true;
  canvas.style.visibility = "visible";
  wake();

  return {
    update,
    destroy() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      [bodyMesh, frontMesh, backMesh, ring, clipMesh, loop, strapMesh].forEach((m) => m.geometry?.dispose());
      [frontMat, backMat, bodyMat, metalMat, strapMat].forEach((m) => m.dispose());
      [frontTex, backTex, strapTex, cardNormal, strapNormal].forEach((t) => t.dispose());
      env.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}

/* =====================================================================
   THẺ MẪU (vẽ bằng canvas) — thay bằng ảnh thật của bạn qua CONFIG
   ===================================================================== */
const NAVY = "#1b2340", CREAM = "#ece6d6";
function makeFront(portrait = null) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1536;
  const g = c.getContext("2d");
  g.fillStyle = CREAM; g.fillRect(0, 0, 1024, 1536);
  // lưới mờ
  g.strokeStyle = "rgba(27,35,64,.07)"; g.lineWidth = 2;
  for (let x = 0; x < 1024; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1536); g.stroke(); }
  for (let y = 0; y < 1536; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  // khung
  g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(70, 150, 884, 1150);
  [[70, 150], [954, 150], [70, 1300], [954, 1300]].forEach(([x, y]) => { g.fillStyle = NAVY; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); });
  // tag + logo
  g.fillStyle = NAVY; g.fillRect(110, 175, 250, 66);
  g.fillStyle = CREAM; g.font = "800 40px Inter"; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText("SENIOR", 235, 209);
  g.fillStyle = NAVY; g.beginPath(); g.arc(700, 208, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = CREAM; g.font = "800 30px Inter"; g.fillText("MARIA", 700, 209);
  g.fillStyle = NAVY; g.textAlign = "left"; g.font = "700 24px Inter"; g.fillText("Mỹ Phẩm", 748, 196); g.fillText("Maria", 748, 224);
  // tiêu đề lớn
  g.font = "700 190px 'Space Grotesk'"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = NAVY; g.fillText("ECOMMERCE", 512, 430, 860);
  // Ảnh chân dung được căn giữa và giữ tỷ lệ trong khung 730 x 800.
  if (portrait) {
    g.save();
    g.beginPath(); g.rect(110, 470, 730, 800); g.clip();
    g.translate(110, 470);
    drawFit(g, portrait, 730, 800, "cover");
    g.restore();
  } else {
    const grd = g.createLinearGradient(0, 470, 0, 1270);
    grd.addColorStop(0, "#2d4a6e"); grd.addColorStop(1, "#0d1a2c");
    g.fillStyle = grd; g.fillRect(110, 470, 730, 800);
    g.fillStyle = "rgba(236,230,214,.18)";
    g.beginPath(); g.arc(475, 745, 130, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(475, 1260, 290, 260, 0, Math.PI, 0); g.fill();
    g.fillStyle = "rgba(236,230,214,.55)"; g.font = "600 28px Inter"; g.textAlign = "center"; g.fillText("YOUR PHOTO", 475, 560);
  }
  // chữ dọc
  g.save(); g.translate(900, 870); g.rotate(-Math.PI / 2);
  g.fillStyle = NAVY; g.font = "700 84px 'Space Grotesk'"; g.fillText("Operation", 0, 28, 720); g.restore();
  // tên
  g.fillStyle = CREAM; g.fillRect(140, 1190, 670, 80);
  g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(140, 1190, 670, 80);
  g.fillStyle = NAVY; g.font = "800 44px Inter"; g.textBaseline = "middle"; g.fillText("NGUYỄN QUỐC ANH DUY", 475, 1232, 630);
  // dải dưới
  g.fillStyle = NAVY; g.fillRect(0, 1340, 1024, 196);
  g.fillStyle = CREAM; g.textAlign = "left"; g.font = "700 96px 'Space Grotesk'"; g.fillText("PORTFOLIO", 70, 1440);
  g.strokeStyle = CREAM; g.lineWidth = 3; g.beginPath(); g.roundRect(600, 1412, 130, 54, 27); g.stroke();
  g.font = "500 32px Inter"; g.fillText("Don't repeat", 760, 1424); g.fillText("yourself", 760, 1462);
  return c.toDataURL("image/png");
}
function makeBack(logo = null) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1536;
  const g = c.getContext("2d");
  g.fillStyle = NAVY; g.fillRect(0, 0, 1024, 1536);
  g.strokeStyle = "rgba(236,230,214,.08)"; g.lineWidth = 2;
  for (let x = 0; x < 1024; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1536); g.stroke(); }
  for (let y = 0; y < 1536; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = CREAM;
  // Khung logo 1:1 (400 x 400), giữ nguyên tỷ lệ PNG và nền trong suốt.
  if (logo) {
    g.save(); g.translate(312, 360);
    drawFit(g, logo, 400, 400, "contain");
    g.restore();
  } else {
    g.strokeStyle = "rgba(236,230,214,.3)"; g.lineWidth = 2;
    g.strokeRect(312, 360, 400, 400);
  }
  g.font = "700 72px 'Space Grotesk'"; g.fillText("NGUYỄN QUỐC ANH DUY", 512, 860);
  g.font = "500 36px Inter"; g.fillStyle = "rgba(236,230,214,.7)";
  g.fillText("Senior Ecommerce", 512, 930);
  g.fillText("NQAD667723@gmail.com", 512, 1150);
  g.fillText("trananhquoc.vn", 512, 1205);
  return c.toDataURL("image/png");
}
function makeStrap() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 248;
  const g = c.getContext("2d");
  g.fillStyle = "#111827"; g.fillRect(0, 0, 1024, 248);
  g.textBaseline = "middle"; g.fillStyle = "#ffffff";
  g.beginPath(); g.arc(150, 124, 56, 0, Math.PI * 2); g.lineWidth = 8; g.strokeStyle = "#fff"; g.stroke();
  g.font = "800 60px Inter"; g.textAlign = "center"; g.fillText("M", 150, 128);
  g.textAlign = "left"; g.font = "800 92px Inter"; g.fillText("Mỹ Phẩm Maria", 250, 128);
  return c.toDataURL("image/png");
}

/* ---------- khởi chạy ---------- */
async function initLanyard() {
  const pageLoaded = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
  const fontsReady = Promise.all([
    document.fonts.ready,
    document.fonts.load("700 100px 'Space Grotesk'"),
    document.fonts.load("800 40px Inter"),
    document.fonts.load("500 30px Inter"),
  ]).catch(() => {});
  await Promise.all([pageLoaded, fontsReady]);

  const config = CONFIG();
  const imageCache = new Map();
  const [portrait, backLogo] = await Promise.all([
    loadImage(imageCache, config.portraitImage),
    loadImage(imageCache, config.backLogoImage),
  ]);
  const demo = { front: makeFront(portrait), back: makeBack(backLogo), strap: makeStrap() };
  const props = () => {
    const c = CONFIG();
    return { ...c, frontImage: c.frontImage || demo.front, backImage: c.backImage || demo.back, strapImage: c.strapImage || demo.strap };
  };
  const lanyard = await createLanyard(document.getElementById("lanyard"), props);
  window.matchMedia("(max-width: 767px)").addEventListener("change", () => lanyard.update());
  return lanyard;
}

// Do not await at module scope: the browser must be free to fire window.load.
initLanyard().catch((error) => console.error("Không thể khởi tạo thẻ 3D:", error));
