// 光之巨人 · 怪兽讨伐战 3D —— 全部模型/贴图/音效均为程序化生成，无任何外部素材
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ───────────── 1. 工具 ───────────── */
const $ = s => document.querySelector(s);
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const QS = new URLSearchParams(location.search);
const TMP = V3(), TMP2 = V3();
const ARENA = 300, CELL = 36;

/* ───────────── 2. 渲染器 / 场景 / 后期 ───────────── */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b0f24, 0.0021);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 4000);
camera.position.set(0, 60, 140);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

/* ───────────── 3. 环境：天空 / 星月 / 群山 / 地面 / 城市 ───────────── */
scene.add(new THREE.HemisphereLight(0x8094ff, 0x3a2030, 1.25));
const moonLight = new THREE.DirectionalLight(0xbfd2ff, 2.1);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -170, right: 170, top: 170, bottom: -170, near: 10, far: 700 });
moonLight.shadow.bias = -0.0006; moonLight.shadow.normalBias = 0.6;
scene.add(moonLight, moonLight.target);
const fireGlow = new THREE.PointLight(0xff6a2a, 0, 500, 1.4); scene.add(fireGlow);   // 爆炸闪光
const beamGlow = new THREE.PointLight(0x55d8ff, 0, 320, 1.3); scene.add(beamGlow);   // 光线照明

const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: 0 } },
  vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `varying vec3 vP;uniform float uT;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    void main(){float y=vP.y;
      vec3 c=mix(vec3(.055,.03,.12),vec3(.006,.012,.045),smoothstep(0.,.55,y));
      c+=vec3(.75,.22,.10)*pow(1.-clamp(y,0.,1.),7.)*.55;                       // 地平线火光
      vec2 q=vP.xz/(abs(y)+.25)*1.6+uT*.012;                                    // 流云
      float cl=n(q)*.6+n(q*2.3)*.3+n(q*5.1)*.1;
      c+=vec3(.16,.10,.22)*smoothstep(.5,.95,cl)*smoothstep(0.,.3,y);
      gl_FragColor=vec4(c,1.);}`
}));
scene.add(sky);
{ // 星空
  const N = 1800, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = V3().randomDirection(); v.y = Math.abs(v.y) * .9 + .06; v.normalize().multiplyScalar(2300); p.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.45, 1.25), fog: false }));
  moon.position.set(-900, 760, -1700); scene.add(moon);
  moonLight.userData.dir = moon.position.clone().normalize();
}
{ // 远山剪影
  const N = 160, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, hgt = 70 + 60 * Math.abs(Math.sin(a * 7.3)) + 50 * Math.abs(Math.sin(a * 17.1 + 1)) + 25 * Math.sin(a * 41);
    pos.push(Math.cos(a) * 1300, -5, Math.sin(a) * 1300, Math.cos(a) * 1300, hgt, Math.sin(a) * 1300);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x05060f, side: THREE.DoubleSide, fog: false })));
}
function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
{ // 地面：街区 + 马路
  const tex = canvasTex(256, (g, s) => {
    g.fillStyle = '#14161c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${rnd(.015, .05)})`; g.fillRect(rnd(s), rnd(s), 2, 2); }
    const r = s * 5 / CELL; g.fillStyle = '#23262e'; g.fillRect(r, r, s - 2 * r, s - 2 * r);
    g.fillStyle = '#1a1c22'; g.fillRect(r + 6, r + 6, s - 2 * r - 12, s - 2 * r - 12);
    g.fillStyle = '#c9a53a'; for (let i = 0; i < 8; i++) { g.fillRect(i * 32 + 8, 0, 16, 2); g.fillRect(0, i * 32 + 8, 2, 16); g.fillRect(i * 32 + 8, s - 2, 16, 2); g.fillRect(s - 2, i * 32 + 8, 2, 16); }
  });
  tex.repeat.set(60, 60); tex.offset.set(.5, .5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 60, CELL * 60), new THREE.MeshStandardMaterial({ map: tex, roughness: .92, metalness: .05 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
}
// 楼房：窗户贴图既是底色也是自发光
const winTex = [['#ffd88a', '#ffb347', '#fff2c4'], ['#9fd8ff', '#d7f0ff', '#6fb6ff'], ['#ffe9b0', '#a8e0ff', '#ff9c6b']].map(pal => canvasTex(128, (g, s) => {
  g.fillStyle = '#0b0d14'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const lit = Math.random() < .42; g.fillStyle = lit ? pal[(Math.random() * pal.length) | 0] : '#161a26';
    g.globalAlpha = lit ? rnd(.55, 1) : 1; g.fillRect(x * 16 + 4, y * 16 + 4, 9, 10);
  }
  g.globalAlpha = 1;
}));
const bMats = winTex.map((t, i) => new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: .7, metalness: .2, color: [0x8f97ad, 0x7f8fb5, 0xa59a8f][i] }));
const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x24262d, roughness: 1, flatShading: true });
const buildings = [];
for (let gx = -8; gx <= 8; gx++) for (let gz = -8; gz <= 8; gz++) {
  const x = gx * CELL, z = gz * CELL, r = Math.hypot(x, z);
  if (r < 60 || r > ARENA - 8 || Math.random() < .14) continue;
  const w = rnd(14, 24), d = rnd(14, 24), h = Math.random() < .12 ? rnd(46, 70) : rnd(10, 38);
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const f = (i / 4) | 0;
    if (f === 2 || f === 3) uv.setXY(i, 0, 0);
    else uv.setXY(i, uv.getX(i) * Math.round((f < 2 ? d : w) / 5) / 8, uv.getY(i) * Math.round(h / 5) / 8);
  }
  const mesh = new THREE.Mesh(geo, bMats[(Math.random() * 3) | 0]);
  mesh.position.set(x, h / 2, z); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
  buildings.push({ mesh, mat: mesh.material, x, z, w, d, h, alive: true, t: -1 });
}
function collapse(b, byHero) {
  if (!b.alive) return; b.alive = false; b.t = 0;
  SFX.crumble(); G.shake = Math.max(G.shake, .5);
  if (G.state === 'playing') { G.cityLost++; if (!byHero) G.score += 0; }
}
function updateBuildings(dt) {
  for (const b of buildings) {
    if (b.t < 0) continue;
    b.t += dt; const k = Math.min(b.t / 1.3, 1), s = lerp(1, .07, k * k);
    b.mesh.scale.y = s; b.mesh.position.set(b.x + (k < 1 ? rnd(-.6, .6) : 0), b.h * s / 2, b.z);
    if (k < 1) for (let i = 0; i < 3; i++) smoke.spawn(b.x + rnd(-b.w, b.w) * .6, rnd(2, b.h * s + 4), b.z + rnd(-b.d, b.d) * .6, rnd(-9, 9), rnd(4, 16), rnd(-9, 9), rnd(1, 2.2), rnd(35, 70), .35, .33, .32, .28, 1.5, -2);
    else { b.mesh.material = rubbleMat; b.t = -1; }
  }
}
function crush(x, z, r, byHero) {       // 圆与楼房 AABB 相交即压垮
  for (const b of buildings) {
    if (!b.alive) continue;
    const dx = Math.abs(x - b.x) - b.w / 2, dz = Math.abs(z - b.z) - b.d / 2;
    if (dx < r && dz < r && (dx < 0 || dz < 0 || dx * dx + dz * dz < r * r)) collapse(b, byHero);
  }
}

/* ───────────── 4. 粒子 / 冲击波环 ───────────── */
class Particles {
  constructor(n, blending) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.c = new Float32Array(n * 4); this.s = new Float32Array(n);
    this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.s0 = new Float32Array(n); this.a0 = new Float32Array(n); this.drag = new Float32Array(n); this.grav = new Float32Array(n);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    g.setAttribute('pc', new THREE.BufferAttribute(this.c, 4));
    g.setAttribute('ps', new THREE.BufferAttribute(this.s, 1));
    this.mesh = new THREE.Points(g, new THREE.ShaderMaterial({
      blending, transparent: true, depthWrite: false, uniforms: { uS: { value: innerHeight }, uK: { value: blending === THREE.AdditiveBlending ? .42 : 1 } },
      vertexShader: 'attribute vec4 pc;attribute float ps;varying vec4 vC;uniform float uS;void main(){vC=pc;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=ps*uS/max(1.,-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec4 vC;uniform float uK;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.0,d)*vC.a;if(a<.004)discard;gl_FragColor=vec4(vC.rgb*uK,a);}'
    }));
    this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  spawn(x, y, z, vx, vy, vz, life, size, r, g, b, a = 1, drag = 1, grav = 0) {
    const i = this.i; this.i = (i + 1) % this.n;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3); this.c.set([r, g, b, a], i * 4);
    this.life[i] = this.max[i] = life; this.s0[i] = size; this.a0[i] = a; this.drag[i] = drag; this.grav[i] = grav;
  }
  update(dt) {
    const { p, v, c, s, life, max, s0, a0, drag, grav } = this;
    for (let i = 0; i < this.n; i++) {
      if (life[i] <= 0) { s[i] = 0; continue; }
      life[i] -= dt; const k = Math.max(life[i] / max[i], 0), j = i * 3, f = Math.exp(-drag[i] * dt);
      v[j] *= f; v[j + 1] = v[j + 1] * f - grav[i] * dt; v[j + 2] *= f;
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      if (p[j + 1] < .3 && grav[i] > 0) { p[j + 1] = .3; v[j + 1] *= -.35; }
      s[i] = s0[i] * (this.grow ? 1.8 - k * .8 : .3 + k * .7); c[i * 4 + 3] = a0[i] * k;
    }
    this.geo.attributes.position.needsUpdate = this.geo.attributes.pc.needsUpdate = this.geo.attributes.ps.needsUpdate = true;
    this.mesh.material.uniforms.uS.value = innerHeight;
  }
}
const sparks = new Particles(5000, THREE.AdditiveBlending);
const smoke = new Particles(1400, THREE.NormalBlending); smoke.grow = true;

function burst(pos, n, speed, size, col, life = .7, grav = 40) {
  for (let i = 0; i < n; i++) {
    TMP.randomDirection().multiplyScalar(speed * rnd(.25, 1));
    sparks.spawn(pos.x, pos.y, pos.z, TMP.x, TMP.y + speed * .25, TMP.z, life * rnd(.5, 1.2), size * rnd(.5, 1.3), col[0], col[1], col[2], 1, 2.2, grav);
  }
}
function explosion(pos, scale = 1) {
  burst(pos, 160 * scale, 95 * scale, 5.5 * scale, [3, 1.3, .3], 1.1, 55);
  burst(pos, 70 * scale, 45 * scale, 11 * scale, [2.6, .7, .15], .8, 10);
  burst(pos, 10 * scale, 22, 14 * scale, [3, 2.6, 2], .35, 0);
  for (let i = 0; i < 40 * scale; i++) smoke.spawn(pos.x + rnd(-8, 8), pos.y + rnd(-6, 8), pos.z + rnd(-8, 8), rnd(-14, 14), rnd(8, 30), rnd(-14, 14), rnd(1.5, 3.2), rnd(40, 80) * scale, .16, .14, .14, .22, 1.2, -3);
  ring(pos.x, pos.z, 90 * scale, 150, [3, 1.2, .3]);
  fireGlow.position.copy(pos); fireGlow.intensity = 2200 * scale;
  G.shake = Math.max(G.shake, 1.6 * scale); SFX.boom(scale);
}
const rings = [];
const ringGeo = new THREE.RingGeometry(.86, 1, 72).rotateX(-Math.PI / 2);
function ring(x, z, max, speed, col, dmg = 0, y = .6) {
  let r = rings.find(r => !r.mesh.visible);
  if (!r) { r = { mesh: new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })) }; scene.add(r.mesh); rings.push(r); }
  Object.assign(r, { r: 2, max, speed, dmg, hit: false }); r.mesh.visible = true; r.mesh.position.set(x, y, z); r.mesh.material.color.setRGB(col[0], col[1], col[2]);
  return r;
}
function updateRings(dt) {
  for (const r of rings) {
    if (!r.mesh.visible) continue;
    r.r += r.speed * dt; r.mesh.scale.setScalar(r.r); r.mesh.material.opacity = clamp(1 - r.r / r.max, 0, 1);
    if (r.dmg && !r.hit && hero.y < 4) {          // Boss 震地波：跳起来可以躲
      const d = Math.hypot(hero.pos.x - r.mesh.position.x, hero.pos.z - r.mesh.position.z);
      if (Math.abs(d - r.r) < 7) { r.hit = true; hurtHero(r.dmg, hero.pos.x - r.mesh.position.x, hero.pos.z - r.mesh.position.z); }
    }
    if (r.r >= r.max) r.mesh.visible = false;
  }
}

/* ───────────── 5. 音频：WebAudio 实时合成 ───────────── */
const SFX = {
  ctx: null, muted: false,
  init() {
    if (this.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC(); this.out = c.createGain(); this.out.gain.value = .55;
    const comp = c.createDynamicsCompressor(); this.out.connect(comp).connect(c.destination);
    const len = c.sampleRate * 2, buf = this.nbuf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.music();
  },
  noise(dur, f0, f1, vol, type = 'lowpass', q = 1) {
    const c = this.ctx; if (!c) return; const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.nbuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  swing() { this.noise(.16, 900, 3200, .16, 'bandpass', 1.5); },
  hit(big) { this.noise(big ? .32 : .18, big ? 2600 : 1800, 120, big ? .7 : .45); this.tone('sine', big ? 150 : 190, 42, big ? .3 : .16, big ? .8 : .5); },
  boom(s = 1) { this.noise(1.3 * s, 1400, 40, .95); this.tone('sine', 95, 24, 1.1, .9); this.tone('triangle', 60, 20, 1.4, .5); },
  crumble() { this.noise(.9, 700, 60, .28); },
  roar(p = 1) { this.tone('sawtooth', 210 * p, 62 * p, 1.15, .32); this.tone('square', 147 * p, 48 * p, 1.2, .16, .04); this.noise(1.1, 900, 180, .22, 'bandpass', 3); },
  fire() { this.noise(.5, 500, 2400, .3, 'bandpass', 2); this.tone('sawtooth', 320, 90, .4, .12); },
  disc() { this.tone('sawtooth', 700, 2400, .3, .16); this.noise(.3, 3000, 6000, .15, 'highpass'); },
  jump() { this.tone('sine', 180, 520, .22, .2); },
  dash() { this.noise(.22, 3000, 500, .25, 'bandpass', 1); },
  pick() { this.tone('sine', 880, 1760, .14, .22); this.tone('sine', 1320, 2640, .2, .18, .08); },
  beep() { this.tone('square', 1480, 1480, .09, .1); },
  shout() { this.tone('sawtooth', 520, 330, .32, .16); this.tone('square', 780, 500, .3, .07); },
  fanfare(win) { (win ? [523, 659, 784, 1047, 1319] : [392, 330, 262, 196]).forEach((f, i) => this.tone(win ? 'square' : 'sawtooth', f, f, .5, .16, i * .16)); },
  beam(on) {
    const c = this.ctx; if (!c) return;
    if (on && !this.bm) {
      const g = c.createGain(), f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.2, c.currentTime + .15);
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2; l.frequency.value = 23; lg.gain.value = 700; l.connect(lg).connect(f.frequency); l.start();
      const os = [220, 331, 443, 1108].map((fr, i) => { const o = c.createOscillator(); o.type = i < 3 ? 'sawtooth' : 'square'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
      f.connect(g).connect(this.out); this.bm = { g, os: [...os, l] };
    } else if (!on && this.bm) { const b = this.bm; this.bm = null; b.g.gain.linearRampToValueAtTime(0, c.currentTime + .15); b.os.forEach(o => o.stop(c.currentTime + .2)); }
  },
  music() {                                   // 16 分音符步进音序器：鼓 + 贝斯 + 琶音 + 主旋律
    const c = this.ctx, mg = this.mg = c.createGain(); mg.gain.value = .5; mg.connect(this.out);
    const roots = [45, 45, 41, 43, 45, 45, 48, 43], arp = [0, 7, 12, 15, 19, 15, 12, 7], lead = [69, 0, 72, 0, 76, 0, 74, 72, 69, 0, 67, 0, 69, 0, 0, 0, 65, 0, 69, 0, 72, 0, 77, 76, 74, 0, 72, 0, 74, 0, 0, 0];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12), step = 60 / 132 / 4; let next = c.currentTime + .1, n = 0;
    const voice = (type, f, t, dur, vol, cut) => { const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(fl).connect(g).connect(mg); o.start(t); o.stop(t + dur + .02); };
    const drum = (t, kick) => {
      if (kick) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); g.gain.setValueAtTime(.7, t); g.gain.exponentialRampToValueAtTime(.001, t + .16); o.connect(g).connect(mg); o.start(t); o.stop(t + .2); }
      else { const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); s.buffer = this.nbuf; f.type = 'highpass'; f.frequency.value = 6500; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); s.connect(f).connect(g).connect(mg); s.start(t, Math.random()); s.stop(t + .07); }
    };
    setInterval(() => {
      if (c.state !== 'running') { next = c.currentTime + .1; return; }
      while (next < c.currentTime + .25) {
        const bar = (n >> 4) % 8, s = n % 16, root = roots[bar], hot = G.state === 'playing';
        if (s % 4 === 0) drum(next, true); if (hot && s % 2 === 1) drum(next, false);
        if (s % 2 === 0) voice('sawtooth', hz(root - 12), next, step * 1.8, .2, 420);
        voice('square', hz(root + 12 + arp[s % 8]), next, step * .9, hot ? .05 : .03, 1800);
        const L = lead[n % 32]; if (hot && L && (n >> 5) % 2 === 1) voice('sawtooth', hz(L), next, step * 2.6, .07, 2600);
        next += step; n++;
      }
    }, 60);
  },
  toggle() { this.muted = !this.muted; if (this.ctx) this.out.gain.value = this.muted ? 0 : .55; }
};

/* ───────────── 6. 巨人（程序化骨架 + 姿态插值动画） ───────────── */
function cap(r, len, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(.01, len - 2 * r), 6, 14), mat); m.position.y = -len / 2; return m; }
const HM = {
  silver: new THREE.MeshStandardMaterial({ color: 0xe6eaf2, metalness: .35, roughness: .36, emissive: 0x23293a }),
  red: new THREE.MeshStandardMaterial({ color: 0xd40f2c, metalness: .45, roughness: .34, emissive: 0x30030a }),
  eye: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.8, 1.3) }),
  timer: new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 1.7, 3.2) }),
  dark: new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: .6 })
};
function buildHero() {
  const root = new THREE.Group(), rig = new THREE.Group(), hips = new THREE.Group(), torso = new THREE.Group();
  root.add(rig); rig.add(hips); hips.position.y = 18; hips.add(torso);
  const add = (p, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { m.position.set(x, y, z); m.scale.set(sx, sy, sz); p.add(m); return m; };
  const S = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
  const B = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  add(hips, S(4, HM.red), 0, .4, 0, 1.06, .62, .78);                                      // 骨盆
  const body = cap(4.3, 13, HM.silver); body.position.y = 6.5; body.scale.set(1.12, 1, .72); torso.add(body);
  add(torso, new THREE.Mesh(new THREE.SphereGeometry(4.65, 20, 12, 0, Math.PI * 2, 0, Math.PI * .47), HM.red), 0, 8, 0, 1.15, 1, .78); // 红色胸甲
  add(torso, B(1.7, 6.5, .5, HM.silver), 0, 7.2, 3.15);
  add(torso, B(1.2, 5, .5, HM.red), -2.6, 3.4, 2.9).rotation.z = .35; add(torso, B(1.2, 5, .5, HM.red), 2.6, 3.4, 2.9).rotation.z = -.35;
  add(torso, new THREE.Mesh(new THREE.TorusGeometry(1.15, .3, 8, 20), HM.silver), 0, 9.6, 3.55);
  const timer = add(torso, S(1, HM.timer), 0, 9.6, 3.6, 1, 1, .7);
  add(torso, new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.7, 2.2, 12), HM.silver), 0, 13.6, 0);
  const head = new THREE.Group(); head.position.y = 16.4; torso.add(head);
  add(head, S(2.9, HM.silver), 0, 0, 0, .86, 1.08, .96);
  const fin = add(head, new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, .42, 20, 1, false, 0, Math.PI), HM.silver), 0, .7, -.2); fin.rotation.z = Math.PI / 2; fin.rotation.y = 0; fin.scale.set(1.25, 1, 1.05);
  for (const s of [-1, 1]) { const e = add(head, S(1, HM.eye), s * 1.12, .35, 2.2, 1, .6, .5); e.rotation.z = s * .5; add(head, S(.9, HM.silver), s * 2.5, 0, 0, .3, 1, .7); }
  add(head, B(1, .14, .2, HM.dark), 0, -1.45, 2.45);
  const J = { rig, hips, torso, head, timer };
  for (const [k, s] of [['A', 1], ['B', -1]]) {
    const sh = new THREE.Group(); sh.position.set(s * 5.7, 11.3, 0); torso.add(sh);
    add(sh, S(2.05, HM.red)); sh.add(cap(1.55, 7.5, HM.silver));
    const el = new THREE.Group(); el.position.y = -7.5; sh.add(el); el.add(cap(1.42, 7, HM.red)); add(el, S(1.65, HM.silver), 0, -7.4, 0);
    const hip = new THREE.Group(); hip.position.set(s * 2.5, 0, 0); hips.add(hip); hip.add(cap(2.1, 9.5, HM.silver));
    const kn = new THREE.Group(); kn.position.y = -9.5; hip.add(kn); kn.add(cap(1.8, 8.5, HM.red)); add(kn, B(2.7, 1.5, 5.2, HM.red), 0, -7.75, 1.2);
    Object.assign(J, { ['s' + k]: sh, ['e' + k]: el, ['h' + k]: hip, ['k' + k]: kn });
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);
  return { root, J };
}
const hero = Object.assign(buildHero(), {
  pos: V3(), y: 0, vy: 0, vel: V3(), heading: 0, hp: 100, en: 100, action: 'none', at: 0, dur: 0, didHit: false, queue: false, comboN: 0,
  dashCd: 0, discCd: 0, inv: 0, walk: 0, dead: false, pose: {}, beamOn: false, intro: 0, hitAcc: 0, hitAccT: 0
});
// 姿态参数：s=肩 e=肘 h=髋 k=膝；A 为 +X 侧，B 为 -X 侧；x 负值 = 向前摆
const POSE0 = { sAx: -.45, sAz: .18, eAx: -1.55, eAz: 0, sBx: -.3, sBz: -.18, eBx: -1.75, eBz: 0, hA: -.28, hB: .22, kA: .35, kB: .3, tx: .08, ty: -.25, hy: .2, bob: -.6 };
function heroPose(h, t) {
  const p = { ...POSE0 }, a = h.action, k = h.dur ? h.at / h.dur : 0;
  p.bob += Math.sin(t * 2.4) * .25;
  if (h.dead) return Object.assign(p, { sAx: -.2, sAz: 1.2, sBx: -.2, sBz: -1.2, eAx: -.3, eBx: -.3, hA: -.1, hB: .1, kA: .2, kB: .1, tx: 0, ty: 0, hy: 0 });
  if (h.y > .5) Object.assign(p, { sAx: -2.6, sBx: -2.6, eAx: -.5, eBx: -.5, hA: -.9, hB: .3, kA: 1.4, kB: .9, tx: .15, ty: 0, hy: 0 });
  else if (a === 'none' && h.speed > 3) {
    const s = Math.sin(h.walk), c = Math.cos(h.walk);
    Object.assign(p, { hA: -s * .75, hB: s * .75, kA: Math.max(0, c) * 1.1 + .1, kB: Math.max(0, -c) * 1.1 + .1, sAx: s * .8 - .2, sBx: -s * .8 - .2, eAx: -1.3, eBx: -1.3, tx: .22, ty: s * .14, hy: 0, bob: -Math.abs(c) * .9 });
  }
  if (a === 'punch') {
    const out = k < .55 ? 1 : 1 - (k - .55) / .45, A = h.comboN % 2 === 1;
    if (h.comboN === 3) Object.assign(p, { sAx: -1.2 - out * .5, sAz: -.25, eAx: -.25, sBx: -1.2 - out * .5, sBz: .25, eBx: -.25, tx: .3 * out, ty: 0, hA: -.6, kA: .7, hB: .5, kB: .2 });
    else if (A) Object.assign(p, { sAx: -.5 - out * 1.1, sAz: -.2 * out, eAx: -1.5 + out * 1.45, ty: -.55 * out, tx: .18, hy: .4 * out });
    else Object.assign(p, { sBx: -.5 - out * 1.1, sBz: .2 * out, eBx: -1.5 + out * 1.45, ty: .55 * out, tx: .18, hy: -.4 * out });
  } else if (a === 'kick') {
    const out = Math.sin(Math.min(k / .75, 1) * Math.PI);
    Object.assign(p, { hB: -1.75 * out, kB: .9 * (1 - out), tx: -.3 * out, ty: .5 * out, hA: .15, kA: .25, sAx: .5, sBx: -.9, hy: -.3 });
  } else if (a === 'beam') {          // 十字交叉必杀姿势
    Object.assign(p, { sBx: -.55, sBz: .32, eBx: -2.15, eBz: 0, sAx: -1.05, sAz: -.1, eAx: -.15, eAz: -1.5, tx: .06, ty: 0, hy: 0, hA: -.42, kA: .5, hB: .38, kB: .25, bob: -1 });
  } else if (a === 'disc') {
    const out = Math.sin(k * Math.PI);
    Object.assign(p, { sAx: -2.9 + out * 1.7, sAz: -.2, eAx: -.3, ty: -.6 * out + .3, tx: .2 * out });
  } else if (a === 'hit') Object.assign(p, { tx: -.45, sAx: .3, sBx: .3, sAz: .7, sBz: -.7, hA: .3, hB: -.2 });
  else if (a === 'dash') Object.assign(p, { tx: .7, sAx: .9, sBx: .9, hA: -1.1, kA: 1.3, hB: .7, kB: .3, bob: -3 });
  return p;
}
function applyPose(h, p, dt) {
  const J = h.J, q = h.pose, k = (h.action === 'punch' || h.action === 'kick' || h.action === 'disc') ? 30 : 13;
  for (const key in p) q[key] = q[key] === undefined ? p[key] : damp(q[key], p[key], k, dt);
  J.sA.rotation.set(q.sAx, 0, q.sAz); J.eA.rotation.set(q.eAx, 0, q.eAz); J.sB.rotation.set(q.sBx, 0, q.sBz); J.eB.rotation.set(q.eBx, 0, q.eBz);
  J.hA.rotation.x = q.hA; J.hB.rotation.x = q.hB; J.kA.rotation.x = q.kA; J.kB.rotation.x = q.kB;
  J.torso.rotation.set(q.tx, q.ty, 0); J.head.rotation.y = q.hy - q.ty * .6; J.hips.position.y = 18 + q.bob;
}

/* 必杀光线 */
const beam = new THREE.Group(); beam.visible = false; scene.add(beam);
{
  const g = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, .5);
  const outer = new THREE.Mesh(g, new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uL: { value: 1 } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vU;uniform float uT,uL;void main(){float s=.55+.45*sin(vU.y*uL*.9-uT*46.)*sin(vU.x*37.7+uT*11.);float e=smoothstep(0.,.03,vU.y);gl_FragColor=vec4(vec3(.12,.6,1.5)*s*e,1.);}'
  }));
  const core = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.3, 2.8) }));
  core.scale.set(.42, .42, 1); beam.add(outer, core); beam.userData = { outer, core }; outer.frustumCulled = core.frustumCulled = false;
}
/* 光轮 */
const discs = [];
const discGeo = new THREE.TorusGeometry(5.2, .55, 6, 28).rotateX(Math.PI / 2);
const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 3.2, 4) });

/* ───────────── 7. 怪兽 ───────────── */
const TYPES = {
  rock: { name: '岩角兽', hp: 190, speed: 16, scale: 1, dmg: 11, score: 1000, skin: 0x9a6a3e, belly: 0xb09060, glow: [3, .5, .1], horns: 3, pitch: 1 },
  fire: { name: '炎棘兽', hp: 150, speed: 12, scale: .95, dmg: 9, score: 1500, skin: 0x8a2a22, belly: 0xc2571c, glow: [3.4, 1.3, .15], horns: 2, ranged: true, pitch: 1.25 },
  swift: { name: '迅爪兽', hp: 110, speed: 31, scale: .74, dmg: 8, score: 1200, skin: 0x2f8a96, belly: 0x7fd0c0, glow: [.4, 3, 1.2], horns: 1, pitch: 1.7 },
  boss: { name: '冥帝兽', hp: 1100, speed: 14, scale: 1.55, dmg: 19, score: 8000, skin: 0x3a2a55, belly: 0x49206b, glow: [3.2, .35, 2.6], horns: 5, ranged: true, boss: true, pitch: .62 }
};
const WAVES = [[['rock', 2]], [['rock', 2], ['fire', 1]], [['swift', 3], ['fire', 1]], [['rock', 2], ['swift', 2], ['fire', 2]], [['boss', 1], ['swift', 2]]];
const hash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
function rough(geo, amp, f = .35) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = 1 + amp * (Math.sin(x * f * 3.1 + 1.3) * Math.sin(y * f * 2.7 + .7) * Math.sin(z * f * 3.3 + 2.1) + (hash(x, y, z) - .5) * .6);
    p.setXYZ(i, x * s, y * s, z * s);
  }
  geo.computeVertexNormals(); return geo;
}
const monsters = [];
function buildMonster(key) {
  const T = TYPES[key];
  const skin = new THREE.MeshStandardMaterial({ color: T.skin, roughness: .85, metalness: .1, flatShading: true });
  const belly = new THREE.MeshStandardMaterial({ color: T.belly, roughness: .8, flatShading: true });
  const bone = new THREE.MeshStandardMaterial({ color: 0xe6dcc0, roughness: .5, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(...T.glow) });
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig); root.scale.setScalar(T.scale);
  const M = (g, m, x = 0, y = 0, z = 0, p = rig) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o; };
  const ico = (r, d = 2) => new THREE.IcosahedronGeometry(r, d);
  M(rough(ico(10, 3), .16), skin, 0, 17, 0).scale.set(1, 1.22, 1.08);                      // 躯干
  M(rough(ico(7.6, 2), .08), belly, 0, 16, 3.6).scale.set(.95, 1.25, .8);                    // 腹甲
  const neck = M(rough(ico(5.5, 2), .12), skin, 0, 26.5, 3);
  const head = new THREE.Group(); head.position.set(0, 30, 6); rig.add(head);
  M(rough(ico(5, 2), .14), skin, 0, 0, 0, head).scale.set(1, .92, 1.15);
  M(rough(new THREE.BoxGeometry(5.2, 3, 6.5, 3, 2, 3), .1), skin, 0, -.2, 5.4, head);        // 上颚
  const jaw = new THREE.Group(); jaw.position.set(0, -2.1, 2.2); head.add(jaw);
  M(rough(new THREE.BoxGeometry(4.6, 1.5, 6.6, 3, 1, 3), .1), skin, 0, -.5, 3.2, jaw);
  for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1; M(new THREE.ConeGeometry(.42, 1.5, 4), bone, s * 1.75, .9, 1.2 + (i >> 1) * 2, jaw); M(new THREE.ConeGeometry(.42, 1.5, 4), bone, s * 2, -2.1, 3.6 + (i >> 1) * 2, head).rotation.x = Math.PI; }
  for (const s of [-1, 1]) M(new THREE.SphereGeometry(.85, 8, 6), glow, s * 2.7, 1.5, 4, head);
  const hornG = new THREE.ConeGeometry(1.1, 7, 6);
  if (T.horns % 2) M(hornG, bone, 0, 2.2, 7.6, head).rotation.x = .7;
  if (T.horns >= 2) for (const s of [-1, 1]) { const h = M(hornG, bone, s * 3.6, 4.6, -.5, head); h.rotation.z = -s * .55; h.scale.setScalar(1.25); }
  if (T.horns >= 4) for (const s of [-1, 1]) { const h = M(hornG, bone, s * 5, 1.5, -1.5, head); h.rotation.z = -s * 1.2; h.scale.setScalar(.9); }
  const spikes = [];
  for (let i = 0; i < 7; i++) {                                                            // 背棘
    const a = i / 6, sp = M(new THREE.ConeGeometry(1.5 + Math.sin(a * Math.PI) * 1.3, 6 + Math.sin(a * Math.PI) * 6, 4), T.ranged ? glow : bone, 0, 28 - a * 17, -6.8 - Math.sin(a * Math.PI) * 4.5);
    sp.rotation.x = -1.1 - a * .5; spikes.push(sp);
  }
  const limbs = {};
  for (const [k, s] of [['A', 1], ['B', -1]]) {
    const leg = new THREE.Group(); leg.position.set(s * 6, 13, 0); rig.add(leg);
    M(rough(new THREE.CylinderGeometry(4.4, 3.4, 13, 8, 3), .1), skin, 0, -6, 0, leg); M(rough(new THREE.BoxGeometry(7.5, 3, 11, 2, 1, 2), .08), skin, 0, -11.5, 2.5, leg);
    for (let i = -1; i <= 1; i++) M(new THREE.ConeGeometry(.8, 3, 4), bone, i * 2.4, -12.2, 8.6, leg).rotation.x = Math.PI / 2;
    const arm = new THREE.Group(); arm.position.set(s * 9.2, 23.5, 3); rig.add(arm);
    M(rough(new THREE.CylinderGeometry(2.3, 1.7, 10, 7, 2), .1), skin, 0, -4.5, 0, arm);
    for (let i = -1; i <= 1; i++) M(new THREE.ConeGeometry(.6, 3.4, 4), bone, i * 1.2, -10.5, .4, arm).rotation.x = Math.PI;
    limbs['leg' + k] = leg; limbs['arm' + k] = arm;
  }
  const tail = []; let parent = rig;
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); g.position.set(0, i ? 0 : 10, i ? -4.6 : -7); parent.add(g);
    M(rough(ico(5.4 - i * .52, 1), .12), skin, 0, 0, -1.5, g).scale.z = 1.4;
    if (i > 5 && T.boss) M(new THREE.ConeGeometry(.9, 4, 4), glow, 0, 2.5, -1.5, g);
    tail.push(g); parent = g;
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, rig, head, jaw, neck, tail, spikes, glow, mats: [skin, belly], ...limbs };
}
function spawnMonster(key) {
  const T = TYPES[key], m = Object.assign(buildMonster(key), {
    key, T, hp: T.hp, maxHp: T.hp, radius: 10.5 * T.scale, state: 'spawn', t: 0, heading: 0, vel: V3(), walk: rnd(6), flash: 0,
    atkCd: rnd(1, 2.5), fireCd: rnd(2.5, 4.5), specCd: 5, armRaise: 0, jawOpen: 0, charge: 0, beamDmg: 0, beamT: 0
  });
  const a = rnd(Math.PI * 2), r = rnd(130, 190), p = TMP.set(hero.pos.x + Math.cos(a) * r, 0, hero.pos.z + Math.sin(a) * r);
  if (p.length() > ARENA - 40) p.setLength(ARENA - 40);
  m.root.position.set(p.x, -46 * T.scale, p.z); m.heading = Math.atan2(hero.pos.x - p.x, hero.pos.z - p.z); m.root.rotation.y = m.heading;
  m.bar = document.createElement('div'); m.bar.innerHTML = `<span>${T.name}</span><i></i>`; if (T.boss) m.bar.className = 'boss'; $('#bars').appendChild(m.bar);
  scene.add(m.root); monsters.push(m); return m;
}
function removeMonster(m) { scene.remove(m.root); m.bar.remove(); m.root.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); monsters.splice(monsters.indexOf(m), 1); }

const fireballs = [];
const fbGeo = new THREE.SphereGeometry(3.2, 10, 8);
function shootFire(m, spread = 0) {
  const from = m.head.getWorldPosition(V3()), to = TMP.set(hero.pos.x + hero.vel.x * .45, hero.y + 22, hero.pos.z + hero.vel.z * .45);
  const v = to.clone().sub(from).normalize().applyAxisAngle(V3(0, 1, 0), spread).multiplyScalar(m.T.boss ? 120 : 95);
  const mesh = new THREE.Mesh(fbGeo, m.glow); mesh.position.copy(from); scene.add(mesh);
  fireballs.push({ mesh, v, life: 4, col: m.T.glow, dmg: m.T.boss ? 13 : 10 }); SFX.fire();
}
function updateFireballs(dt) {
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const f = fireballs[i], p = f.mesh.position; p.addScaledVector(f.v, dt); f.life -= dt;
    for (let k = 0; k < 2; k++) sparks.spawn(p.x + rnd(-1, 1), p.y + rnd(-1, 1), p.z + rnd(-1, 1), rnd(-6, 6), rnd(-2, 8), rnd(-6, 6), .4, 9, f.col[0], f.col[1], f.col[2], .9, 1, 0);
    const hitHero = !hero.dead && Math.hypot(p.x - hero.pos.x, p.z - hero.pos.z) < 8.5 && p.y > hero.y - 2 && p.y < hero.y + 42;
    if (hitHero || p.y < 1 || f.life <= 0) {
      if (hitHero) hurtHero(f.dmg, f.v.x, f.v.z);
      burst(p, 50, 50, 5, f.col, .6); fireGlow.position.copy(p); fireGlow.intensity = 800; SFX.hit(true); crush(p.x, p.z, 6, false);
      scene.remove(f.mesh); fireballs.splice(i, 1);
    }
  }
}
function updateMonster(m, dt, t) {
  const T = m.T, P = m.root.position, dx = hero.pos.x - P.x, dz = hero.pos.z - P.z, dist = Math.hypot(dx, dz), reach = m.radius + 15;
  const want = Math.atan2(dx, dz); let moving = 0, armT = 0, jawT = .08, lean = 0;
  m.flash = Math.max(0, m.flash - dt * 5); m.t += dt; m.atkCd -= dt; m.fireCd -= dt; m.specCd -= dt;
  const turn = r => { m.heading += clamp(angDiff(m.heading, want), -r * dt, r * dt); };
  switch (m.state) {
    case 'spawn': {
      const k = Math.min(m.t / 1.5, 1); P.y = lerp(-46 * T.scale, 0, k * (2 - k)); jawT = .7;
      for (let i = 0; i < 3; i++) smoke.spawn(P.x + rnd(-14, 14), 1, P.z + rnd(-14, 14), rnd(-12, 12), rnd(6, 20), rnd(-12, 12), rnd(1, 2), rnd(40, 80), .3, .26, .22, .28, 1.5, -2);
      if (m.t < .05) { crush(P.x, P.z, m.radius, false); SFX.roar(T.pitch); G.shake = Math.max(G.shake, .8); }
      if (k >= 1) { m.state = 'chase'; m.t = 0; }
      break;
    }
    case 'chase': {
      turn(T.boss ? 1.6 : 2.4);
      const far = T.ranged && !T.boss ? 105 : reach - 4, facing = Math.abs(angDiff(m.heading, want)) < .5;
      if (hero.dead) { jawT = .5 + Math.sin(t * 9) * .3; break; }
      if (dist > far) moving = 1; else if (T.ranged && !T.boss && dist < 60) moving = -.6;
      if (dist < reach && m.atkCd <= 0 && facing) { m.state = 'windup'; m.t = 0; }
      else if (T.ranged && m.fireCd <= 0 && facing && dist > 40) { m.state = 'charge'; m.t = 0; m.shots = T.boss ? 3 : 1; }
      else if (T.boss && m.specCd <= 0 && dist < 150) { m.state = 'stomp'; m.t = 0; }
      break;
    }
    case 'windup': turn(1.2); armT = -2.7; jawT = .6; lean = -.12; if (m.t > (T.boss ? .6 : .5)) { m.state = 'strike'; m.t = 0; m.did = false; SFX.swing(); } break;
    case 'strike':
      armT = -.5; lean = .3; jawT = .9;
      if (!m.did && m.t > .08) { m.did = true; if (dist < reach + 5 && Math.abs(angDiff(m.heading, want)) < 1 && hero.y < 22) hurtHero(T.dmg, dx, dz); }
      if (m.t > .45) { m.state = 'chase'; m.atkCd = rnd(1.3, 2.3) * (T.boss ? .8 : 1); }
      break;
    case 'charge': {
      turn(2); jawT = 1; m.charge = Math.min(m.t / .7, 1);
      const hp = m.head.getWorldPosition(TMP2); sparks.spawn(hp.x + rnd(-9, 9), hp.y + rnd(-9, 9), hp.z + rnd(-9, 9), 0, 0, 0, .25, 7, T.glow[0], T.glow[1], T.glow[2], 1, 0, 0);
      if (m.t > .75) { shootFire(m, m.shots > 1 ? (2 - m.shots) * .22 : 0); if (--m.shots > 0) m.t = .5; else { m.state = 'chase'; m.fireCd = T.boss ? rnd(3.2, 4.6) : rnd(2.6, 4); m.charge = 0; } }
      break;
    }
    case 'stomp':
      lean = -.25; armT = -2.9; jawT = .8;
      if (m.t > .9) { ring(P.x, P.z, 190, 85, [3.2, .4, 2.6], 15); G.shake = 1.4; SFX.boom(.7); m.state = 'chase'; m.specCd = rnd(6, 9); for (let i = 0; i < 30; i++) smoke.spawn(P.x + rnd(-20, 20), 1, P.z + rnd(-20, 20), rnd(-30, 30), rnd(5, 20), rnd(-30, 30), 1.6, 70, .3, .25, .3, .28, 1.5, -2); }
      break;
    case 'stagger': lean = -.4; jawT = .9; armT = .5; if (m.t > (m.long ? .8 : .32)) { m.state = 'chase'; m.t = 0; } break;
    case 'dead': {
      const k = Math.min(m.t / 1.5, 1); m.rig.rotation.x = -1.45 * k * k; m.rig.position.y = -3 * k; jawT = 1;
      if (Math.random() < .5) { m.root.getWorldPosition(TMP2); burst(TMP2.set(P.x + rnd(-10, 10), rnd(8, 30) * T.scale, P.z + rnd(-10, 10)), 6, 30, 5, T.glow, .5); }
      if (m.t > 1.7) {
        explosion(TMP2.set(P.x, 14 * T.scale, P.z), T.boss ? 1.9 : 1.1); if (T.boss) { $('#flash').style.opacity = .9; G.slow = .25; }
        crush(P.x, P.z, 26 * T.scale, false); spawnOrb(P.x, P.z, Math.random() < .5 ? 'hp' : 'en'); if (T.boss) spawnOrb(P.x + 12, P.z, 'hp');
        removeMonster(m); return;
      }
      break;
    }
  }
  if (m.state !== 'dead') {
    const sp = T.speed * moving * (m.state === 'chase' ? 1 : 0);
    m.vel.x = damp(m.vel.x, 0, 4, dt); m.vel.z = damp(m.vel.z, 0, 4, dt);
    P.x += (Math.sin(m.heading) * sp + m.vel.x) * dt; P.z += (Math.cos(m.heading) * sp + m.vel.z) * dt;
    if (P.length() > ARENA) P.setLength(ARENA);
    for (const o of monsters) if (o !== m && o.state !== 'dead') { const ox = P.x - o.root.position.x, oz = P.z - o.root.position.z, d = Math.hypot(ox, oz), min = m.radius + o.radius; if (d < min && d > .01) { P.x += ox / d * (min - d) * .5; P.z += oz / d * (min - d) * .5; } }
    if (m.state !== 'spawn') crush(P.x, P.z, m.radius * .9, false);
    m.walk += Math.abs(sp) * dt * .2;
    if (sp && Math.sin(m.walk) * Math.sin(m.walk - Math.abs(sp) * dt * .2) < 0) { G.shake = Math.max(G.shake, clamp(.5 - dist / 400, 0, .5) * T.scale); }
    m.rig.rotation.x = damp(m.rig.rotation.x, lean, 9, dt);
  }
  const sw = Math.sin(m.walk) * (moving ? .5 : 0);
  m.legA.rotation.x = damp(m.legA.rotation.x, sw, 12, dt); m.legB.rotation.x = damp(m.legB.rotation.x, -sw, 12, dt);
  m.armRaise = damp(m.armRaise, armT, m.state === 'strike' ? 30 : 9, dt);
  m.armA.rotation.x = m.armRaise - .5 + sw * .5; m.armB.rotation.x = m.armRaise - .5 - sw * .5; m.armA.rotation.z = .25; m.armB.rotation.z = -.25;
  m.jawOpen = damp(m.jawOpen, jawT, 10, dt); m.jaw.rotation.x = m.jawOpen * .7;
  m.head.rotation.y = Math.sin(t * 1.3 + m.walk) * .12; m.rig.position.y = m.state === 'dead' ? m.rig.position.y : Math.abs(Math.cos(m.walk)) * (moving ? 1.2 : 0) + Math.sin(t * 2 + m.walk) * .3;
  m.tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 2.2 + m.walk - i * .55) * (.1 + (moving ? .08 : 0)); g.rotation.x = i ? .06 : -.25; });
  m.root.rotation.y = m.heading;
  for (const mat of m.mats) { mat.emissive.setRGB(m.flash * .45 + m.charge * T.glow[0] * .08, m.flash * .45 + m.charge * T.glow[1] * .08, m.flash * .45 + m.charge * T.glow[2] * .08); }
  const gs = 1 + m.charge * 1.5 + (m.state === 'windup' ? 1.2 : 0); m.glow.color.setRGB(T.glow[0] * gs, T.glow[1] * gs, T.glow[2] * gs);
}
function hitMonster(m, dmg, kx, kz, crit, pt, quiet) {
  if (m.state === 'dead' || m.state === 'spawn') return;
  m.hp -= dmg; m.flash = 1; const kb = m.T.boss ? .25 : 1; m.vel.x += kx * kb; m.vel.z += kz * kb;
  G.score += Math.round(dmg * 10 * (1 + G.combo * .05));
  if (!quiet) {
    G.combo++; G.comboT = 2.6; const c = $('#combo'); c.firstChild.nodeValue = G.combo; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    burst(pt, crit ? 46 : 22, crit ? 75 : 50, crit ? 5.5 : 4, [3, 2.2, .8], .45); burst(pt, 6, 12, 16, [3, 3, 2.5], .16, 0);
    dmgText(pt, Math.round(dmg), crit ? 'crit' : ''); SFX.hit(crit); G.hitstop = crit ? .11 : .05; G.shake = Math.max(G.shake, crit ? .9 : .4);
    if ((!m.T.boss || crit) && m.state !== 'strike') { m.state = 'stagger'; m.t = 0; m.long = crit && !m.T.boss; m.charge = 0; }
  }
  if (m.hp <= 0) { m.hp = 0; m.state = 'dead'; m.t = 0; m.charge = 0; G.score += m.T.score; G.kills++; SFX.roar(m.T.pitch * .8); G.slow = Math.max(G.slow, .12); banner(`击破 ${m.T.name}`, `+${m.T.score}`, true); }
}

/* 光球掉落 */
const orbs = [];
function spawnOrb(x, z, kind) {
  const col = kind === 'hp' ? [.5, 3, 1.2] : [.5, 1.8, 3.4];
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(3.4, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(...col) })); mesh.position.set(x, 12, z); scene.add(mesh);
  orbs.push({ mesh, kind, col, life: 25 });
}
function updateOrbs(dt, t) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i], p = o.mesh.position, dx = hero.pos.x - p.x, dz = hero.pos.z - p.z, d = Math.hypot(dx, dz);
    o.life -= dt; o.mesh.rotation.y += dt * 3; p.y = 14 + Math.sin(t * 3 + i) * 2;
    if (d < 70 && !hero.dead) { p.x += dx / d * 90 * dt; p.z += dz / d * 90 * dt; }
    if (Math.random() < .4) sparks.spawn(p.x, p.y, p.z, rnd(-5, 5), rnd(4, 14), rnd(-5, 5), .6, 5, o.col[0], o.col[1], o.col[2], 1, 1, 0);
    if (d < 9 && !hero.dead) {
      if (o.kind === 'hp') { hero.hp = Math.min(100, hero.hp + 22); dmgText(TMP.set(hero.pos.x, 44, hero.pos.z), '+22', 'heal'); } else hero.en = Math.min(100, hero.en + 40);
      burst(p, 30, 40, 5, o.col, .5, 0); SFX.pick(); o.life = 0;
    }
    if (o.life <= 0) { scene.remove(o.mesh); orbs.splice(i, 1); }
  }
}

/* ───────────── 8. 输入 ───────────── */
const keys = {}, pressed = {}, stick = { x: 0, y: 0 };
const cam = { yaw: Math.PI, pitch: .2, dist: 96, pos: V3(0, 60, 140), look: V3(0, 26, 0) };
const down = c => { if (!keys[c]) pressed[c] = true; keys[c] = true; }, up = c => { keys[c] = false; };
addEventListener('keydown', e => {
  if (e.repeat) return; down(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); if (e.code === 'KeyM') SFX.toggle();
  if (e.code === 'Enter' && G.state === 'menu') startGame(false);
});
addEventListener('keyup', e => up(e.code));
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('contextmenu', e => e.preventDefault());
let dragId = null, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') {
    if (G.state === 'playing' && !G.auto && document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => { });
    if (e.button === 0) down('KeyJ'); if (e.button === 2) down('KeyL');
  }
  dragId = e.pointerId; lx = e.clientX; ly = e.clientY;
});
addEventListener('pointerup', e => { if (e.pointerType === 'mouse') { if (e.button === 0) up('KeyJ'); if (e.button === 2) up('KeyL'); } if (e.pointerId === dragId) dragId = null; });
addEventListener('pointermove', e => {
  let dx = 0, dy = 0;
  if (document.pointerLockElement === canvas) { dx = e.movementX; dy = e.movementY; }
  else if (e.pointerId === dragId) { dx = (e.clientX - lx) * 1.6; dy = (e.clientY - ly) * 1.6; lx = e.clientX; ly = e.clientY; } else return;
  cam.yaw -= dx * .0026; cam.pitch = clamp(cam.pitch + dy * .002, -.12, 1.05);
});
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window) {
  document.body.classList.add('touch');
  const st = $('#stick'), nub = st.firstElementChild; let sid = null;
  const mv = e => { const r = st.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stick.x = x; stick.y = -y; nub.style.transform = `translate(${x * 38}px,${y * 38}px)`; };
  st.addEventListener('pointerdown', e => { sid = e.pointerId; st.setPointerCapture(sid); mv(e); e.stopPropagation(); });
  st.addEventListener('pointermove', e => { if (e.pointerId === sid) mv(e); });
  const end = e => { if (e.pointerId === sid) { sid = null; stick.x = stick.y = 0; nub.style.transform = ''; } };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  document.querySelectorAll('.tb').forEach(b => {
    b.addEventListener('pointerdown', e => { down(b.dataset.k); b.classList.add('on'); b.setPointerCapture(e.pointerId); e.stopPropagation(); });
    const off = () => { up(b.dataset.k); b.classList.remove('on'); }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
  });
}

/* ───────────── 9. 游戏状态 / HUD ───────────── */
const G = { state: 'menu', auto: false, score: 0, combo: 0, comboT: 0, maxCombo: 0, wave: 0, waveT: 0, queue: [], spawnT: 0, shake: 0, hitstop: 0, slow: 0, time: 0, kills: 0, cityLost: 0, endT: 0, best: +(localStorage.getItem('ukb_best') || 0), aiT: 0, aiBeam: false };
const el = { hp: $('#hp i'), en: $('#en i'), score: $('#score'), wave: $('#wave'), combo: $('#combo'), timer: $('#timer'), city: $('#city'), vig: $('#vig'), flash: $('#flash'), fps: $('#fps'), best: $('#best') };
function banner(text, sub = '', small) { const b = $('#banner'); b.innerHTML = `${text}<small>${sub}</small>`; b.style.fontSize = small ? 'clamp(20px,3.4vw,38px)' : ''; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function toScreen(v) { TMP2.copy(v).project(camera); return TMP2.z < 1 ? [(TMP2.x * .5 + .5) * innerWidth, (-TMP2.y * .5 + .5) * innerHeight] : null; }
function dmgText(pos, txt, cls = '') {
  const s = toScreen(pos); if (!s) return; const d = document.createElement('div'); d.className = 'dmg ' + cls; d.textContent = txt;
  d.style.left = s[0] + rnd(-20, 20) + 'px'; d.style.top = s[1] + rnd(-10, 10) + 'px'; $('#dmgs').appendChild(d); setTimeout(() => d.remove(), 820);
}
function hurtHero(dmg, kx, kz) {
  const h = hero; if (h.dead || h.inv > 0 || G.state !== 'playing') return;
  h.hp -= dmg; h.inv = .7; const l = Math.hypot(kx, kz) || 1; h.vel.set(kx / l * 60, 0, kz / l * 60);
  if (h.action === 'beam') stopBeam(); h.action = 'hit'; h.at = 0; h.dur = .38; G.combo = 0;
  G.shake = Math.max(G.shake, 1.1); el.vig.style.opacity = .85; SFX.hit(true);
  TMP.set(h.pos.x, h.y + 26, h.pos.z); burst(TMP, 30, 55, 5, [3, .6, .3], .5); dmgText(TMP, '-' + dmg, 'hurt');
  if (h.hp <= 0) { h.hp = 0; h.dead = true; h.action = 'none'; G.endT = 2.6; SFX.boom(.8); banner('光之巨人倒下了…', '', true); }
}
function resetGame() {
  [...monsters].forEach(removeMonster); fireballs.splice(0).forEach(f => scene.remove(f.mesh)); orbs.splice(0).forEach(o => scene.remove(o.mesh)); discs.splice(0).forEach(d => scene.remove(d.mesh));
  for (const b of buildings) { b.alive = true; b.t = -1; b.mesh.material = b.mat; b.mesh.scale.y = 1; b.mesh.position.set(b.x, b.h / 2, b.z); }
  Object.assign(hero, { y: 0, vy: 0, heading: 0, hp: 100, en: 100, action: 'none', at: 0, dead: false, inv: 0, dashCd: 0, discCd: 0, comboN: 0, intro: 1.4 });
  hero.pos.set(0, 0, 0); hero.vel.set(0, 0, 0); hero.J.rig.rotation.set(0, 0, 0); hero.J.rig.position.y = 0; stopBeam();
  Object.assign(G, { score: 0, combo: 0, comboT: 0, maxCombo: 0, wave: 0, waveT: 1.6, queue: [], time: 0, kills: 0, cityLost: 0, endT: 0, slow: 0, hitstop: 0 });
  cam.yaw = Math.PI; cam.pitch = .3;
}
function startGame(auto) {
  SFX.init(); SFX.ctx?.resume(); resetGame(); G.auto = auto; G.state = 'playing';
  $('#menu').classList.add('hide'); $('#end').classList.add('hide'); $('#hud').classList.add('on');
  el.flash.style.opacity = 1; SFX.shout(); SFX.boom(.5);
  for (let i = 0; i < 300; i++) { const a = rnd(Math.PI * 2), r = rnd(4, 16); sparks.spawn(Math.cos(a) * r, rnd(0, 120), Math.sin(a) * r, 0, rnd(20, 90), 0, rnd(.6, 1.6), rnd(4, 10), .6, 2, 3.4, 1, .3, 0); }
  ring(0, 0, 150, 170, [.5, 1.8, 3.2]);
  if (!auto && !document.body.classList.contains('touch')) canvas.requestPointerLock?.()?.catch?.(() => { });
}
function endGame(win) {
  G.state = 'over'; document.exitPointerLock?.(); SFX.beam(false); SFX.fanfare(win);
  const city = 1 - G.cityLost / buildings.length, pts = hero.hp * .4 + city * 30 + clamp(1 - (G.time - 150) / 300, 0, 1) * 30;
  const rank = !win ? 'D' : pts >= 78 ? 'S' : pts >= 62 ? 'A' : pts >= 46 ? 'B' : 'C';
  if (win) G.score += Math.round(hero.hp * 100 + city * 5000);
  if (G.score > G.best && !G.auto) { G.best = G.score; localStorage.setItem('ukb_best', G.best); }
  $('#endTitle').textContent = win ? '城市得救了' : '战斗失败'; $('#rank').textContent = rank;
  $('#endStat').innerHTML = `得分 <b>${G.score}</b>　最高纪录 ${G.best}<br>击破 ${G.kills} 只　最大连击 ${G.maxCombo}　用时 ${G.time.toFixed(0)} 秒　城市完好 ${(city * 100).toFixed(0)}%`;
  $('#end').classList.remove('hide');
}
function togglePause() {
  if (G.state === 'playing') { G.state = 'paused'; $('#pause').classList.remove('hide'); document.exitPointerLock?.(); SFX.beam(false); SFX.ctx?.suspend(); }
  else if (G.state === 'paused') { G.state = 'playing'; $('#pause').classList.add('hide'); SFX.ctx?.resume(); }
}
$('#start').onclick = () => startGame(false); $('#demo').onclick = () => startGame(true); $('#again').onclick = () => startGame(G.auto); $('#pause').onclick = togglePause;
document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'playing' && !G.auto) togglePause(); });

function updateWaves(dt) {
  if (hero.dead) return;
  if (G.queue.length) { G.spawnT -= dt; if (G.spawnT <= 0) { spawnMonster(G.queue.shift()); G.spawnT = 1.1; } return; }
  if (monsters.length) return;
  G.waveT -= dt; if (G.waveT > 0) return;
  if (G.wave >= WAVES.length) { endGame(true); return; }
  for (const [k, n] of WAVES[G.wave]) for (let i = 0; i < n; i++) G.queue.push(k);
  G.wave++; G.waveT = 3; G.spawnT = 1.2; const boss = G.wave === WAVES.length;
  banner(boss ? '最终决战' : `第 ${G.wave} 波`, boss ? 'WARNING · 冥帝兽 降临' : `怪兽 × ${G.queue.length} 出现`); el.wave.textContent = boss ? '最终决战' : `第 ${G.wave} / ${WAVES.length} 波`;
  if (G.wave > 1) { hero.en = Math.min(100, hero.en + 25); }
}

/* ───────────── 10. 巨人逻辑 ───────────── */
function nearest(maxD = 1e9, cone = -1) {
  let best = null, bd = maxD; const fx = Math.sin(hero.heading), fz = Math.cos(hero.heading);
  for (const m of monsters) {
    if (m.state === 'dead' || m.state === 'spawn') continue; const dx = m.root.position.x - hero.pos.x, dz = m.root.position.z - hero.pos.z, d = Math.hypot(dx, dz) - m.radius;
    if (d < bd && (cone < -.99 || (dx * fx + dz * fz) / (d + m.radius + .01) > cone)) { bd = d; best = m; }
  }
  return best;
}
function faceTarget(maxD) { const m = nearest(maxD); if (m) hero.heading = Math.atan2(m.root.position.x - hero.pos.x, m.root.position.z - hero.pos.z); }
function melee(range, arc, dmg, kb, crit, hy) {
  const h = hero, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
  for (const m of [...monsters]) {
    const dx = m.root.position.x - h.pos.x, dz = m.root.position.z - h.pos.z, d = Math.hypot(dx, dz);
    if (d > range + m.radius || (d > 1 && (dx * fx + dz * fz) / d < arc)) continue;
    const r = Math.max(d - m.radius * .7, 4); hitMonster(m, dmg, fx * kb, fz * kb, crit, TMP.set(h.pos.x + dx / d * r, h.y + hy, h.pos.z + dz / d * r).clone());
  }
  crush(h.pos.x + fx * 16, h.pos.z + fz * 16, 5, true);
}
function stopBeam() { hero.beamOn = false; beam.visible = false; beamGlow.intensity = 0; SFX.beam(false); }
function act(name, dur) { hero.action = name; hero.at = 0; hero.dur = dur; hero.didHit = false; hero.queue = false; }
function updateHero(dt, t) {
  const h = hero, J = h.J;
  h.inv -= dt; h.dashCd -= dt; h.discCd -= dt;
  if (h.intro > 0) { h.intro -= dt; const k = clamp(1 - h.intro / 1.4, 0.02, 1); h.root.scale.setScalar(k * (2 - k)); } else h.root.scale.setScalar(1);
  // —— 输入 → 世界方向 ——
  let mx = 0, mz = 0; const P = pressed, K = keys;
  if (G.auto && !h.dead) autopilot(dt, t);
  if (!h.dead && h.intro <= 0) {
    let ix = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + stick.x, iz = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + stick.y;
    const l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; }
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw); mx = fx * iz - fz * ix; mz = fz * iz + fx * ix;
    if (G.auto) { mx = G.aiMx; mz = G.aiMz; }
  }
  const moving = Math.hypot(mx, mz) > .1, ground = h.y <= 0;
  if (h.dead) {
    J.rig.rotation.x = damp(J.rig.rotation.x, -Math.PI / 2, 4, dt); J.rig.position.y = damp(J.rig.position.y, -14, 4, dt);
  } else if (h.intro <= 0) {
    if (h.action === 'none') {
      if (P.KeyJ) { faceTarget(55); h.comboN = 1; act('punch', .3); SFX.swing(); }
      else if (P.KeyK) { faceTarget(60); act('kick', .55); SFX.swing(); }
      else if (P.KeyU && h.en >= 14 && h.discCd <= 0) { faceTarget(260); act('disc', .42); h.en -= 14; h.discCd = .8; }
      else if (K.KeyL && h.en > 8 && ground) { faceTarget(320); act('beam', 0); SFX.shout(); }
      else if ((P.ShiftLeft || P.ShiftRight) && h.dashCd <= 0) { act('dash', .24); h.dashCd = .9; h.inv = .38; const d = moving ? Math.atan2(mx, mz) : h.heading + Math.PI; h.vel.set(Math.sin(d) * 150, 0, Math.cos(d) * 150); SFX.dash(); }
      if (P.Space && ground && h.action === 'none') { h.vy = 64; h.y = .01; SFX.jump(); }
    } else if (h.action === 'punch' && P.KeyJ) h.queue = true;
    h.at += dt;
    switch (h.action) {
      case 'punch': {
        const fin = h.comboN === 3;
        if (!h.didHit && h.at >= h.dur * .42) { h.didHit = true; melee(fin ? 27 : 23, .25, fin ? 24 : 11 + h.comboN * 2, fin ? 75 : 22, fin, 27); }
        if (h.at >= h.dur) { if (h.queue && h.comboN < 3) { h.comboN++; faceTarget(55); act('punch', h.comboN === 3 ? .46 : .3); SFX.swing(); } else act('none', 0); }
        break;
      }
      case 'kick': if (!h.didHit && h.at >= .2) { h.didHit = true; melee(29, .3, 20, 95, true, 20); } if (h.at >= h.dur) act('none', 0); break;
      case 'disc':
        if (!h.didHit && h.at >= .2) {
          h.didHit = true; const mesh = new THREE.Mesh(discGeo, discMat); mesh.position.set(h.pos.x + Math.sin(h.heading) * 8, h.y + 30, h.pos.z + Math.cos(h.heading) * 8); scene.add(mesh);
          const tg = nearest(260, .3), dir = tg ? TMP.set(tg.root.position.x, 20 * tg.T.scale, tg.root.position.z).sub(mesh.position).normalize().clone() : V3(Math.sin(h.heading), -.05, Math.cos(h.heading));
          discs.push({ mesh, v: dir.multiplyScalar(190), life: 2.2, hit: new Set() }); SFX.disc();
        }
        if (h.at >= h.dur) act('none', 0); break;
      case 'beam': {
        const tg = nearest(340, .2);
        if (tg) h.heading += clamp(angDiff(h.heading, Math.atan2(tg.root.position.x - h.pos.x, tg.root.position.z - h.pos.z)), -1.6 * dt, 1.6 * dt);
        if (moving) h.heading += clamp(angDiff(h.heading, Math.atan2(mx, mz)), -1.1 * dt, 1.1 * dt);
        if (!K.KeyL || h.en <= 0) { stopBeam(); act('recover', .22); break; }
        if (h.at > .3) fireBeam(dt, t, tg);
        break;
      }
      case 'hit': case 'dash': case 'recover': if (h.at >= h.dur) act('none', 0); break;
    }
  }
  // —— 移动 / 物理 ——
  const ctl = h.dead || h.intro > 0 ? 0 : h.action === 'none' ? 1 : h.action === 'punch' ? .2 : 0, sp = 44;
  if (moving && ctl === 1) h.heading += clamp(angDiff(h.heading, Math.atan2(mx, mz)), -11 * dt, 11 * dt);
  h.vel.x = damp(h.vel.x, 0, h.action === 'dash' ? .5 : 6, dt); h.vel.z = damp(h.vel.z, 0, h.action === 'dash' ? .5 : 6, dt);
  const vx = mx * sp * ctl + h.vel.x, vz = mz * sp * ctl + h.vel.z;
  h.pos.x += vx * dt; h.pos.z += vz * dt; h.speed = Math.hypot(mx, mz) * sp * ctl; h.walk += h.speed * dt * .17;
  if (h.y > 0 || h.vy > 0) {
    h.vy -= 135 * dt; h.y += h.vy * dt;
    if (h.y <= 0) {                                               // 落地冲击波
      h.y = 0; if (h.vy < -30) { ring(h.pos.x, h.pos.z, 62, 130, [.5, 1.8, 3.2]); G.shake = Math.max(G.shake, .8); SFX.boom(.35); for (const m of [...monsters]) { const d = Math.hypot(m.root.position.x - h.pos.x, m.root.position.z - h.pos.z); if (d < 36 + m.radius) hitMonster(m, 14, (m.root.position.x - h.pos.x) / d * 40, (m.root.position.z - h.pos.z) / d * 40, true, TMP.set(m.root.position.x, 12, m.root.position.z).clone()); } for (let i = 0; i < 24; i++) smoke.spawn(h.pos.x + rnd(-8, 8), 1, h.pos.z + rnd(-8, 8), rnd(-40, 40), rnd(3, 12), rnd(-40, 40), 1.2, 55, .32, .3, .3, .28, 2, -1); }
      h.vy = 0;
    }
  }
  if (h.pos.length() > ARENA) h.pos.setLength(ARENA);
  for (const m of monsters) { if (m.state === 'dead' || m.state === 'spawn' || h.y > 30 * m.T.scale) continue; const dx = h.pos.x - m.root.position.x, dz = h.pos.z - m.root.position.z, d = Math.hypot(dx, dz), min = m.radius + 5.5; if (d < min && d > .01) { h.pos.x += dx / d * (min - d); h.pos.z += dz / d * (min - d); } }
  if (h.y < 12) crush(h.pos.x, h.pos.z, 5, true);
  if (!h.dead) h.en = Math.min(100, h.en + (h.action === 'beam' ? 0 : 3.2) * dt);
  h.root.position.set(h.pos.x, h.y, h.pos.z); h.root.rotation.y = h.heading;
  applyPose(h, heroPose(h, t), dt);
  // —— 胸口计时器 ——
  const low = h.hp < 35 && !h.dead, bl = low ? (Math.sin(t * 14) > 0 ? 1 : .08) : 1;
  HM.timer.color.setRGB(low ? 3.4 * bl : .3, low ? .25 * bl : 1.7, low ? .25 * bl : 3.2); if (h.dead) HM.timer.color.setRGB(.05, .05, .05);
  HM.eye.color.setRGB(h.dead ? .2 : 3.2, h.dead ? .2 : 2.8, h.dead ? .15 : 1.3);
  if (low && Math.sin(t * 14) > 0 && Math.sin((t - dt) * 14) <= 0) SFX.beep();
  el.timer.classList.toggle('low', low);
  h.root.visible = !(h.inv > 0 && h.action !== 'dash' && !h.dead && Math.sin(t * 60) > .3);
  if (h.action === 'dash') for (let i = 0; i < 4; i++) sparks.spawn(h.pos.x + rnd(-4, 4), h.y + rnd(4, 36), h.pos.z + rnd(-4, 4), 0, 0, 0, .3, 9, .4, 1.6, 3, .8, 0, 0);
}
function fireBeam(dt, t, tg) {
  const h = hero; h.en -= 21 * dt;
  if (!h.beamOn) { h.beamOn = true; beam.visible = true; SFX.beam(true); G.shake = Math.max(G.shake, .7); }
  const fx = Math.sin(h.heading), fz = Math.cos(h.heading), o = V3(h.pos.x + fx * 7.5, h.y + 28.5, h.pos.z + fz * 7.5);
  const dir = V3(fx, 0, fz); if (tg) { const d = Math.hypot(tg.root.position.x - o.x, tg.root.position.z - o.z); dir.y = clamp((20 * tg.T.scale - o.y) / Math.max(d, 1), -.4, .3); dir.normalize(); }
  let len = 420, hitM = null;
  for (const m of monsters) {                                     // 射线 vs 怪兽包围球
    if (m.state === 'dead' || m.state === 'spawn') continue; TMP.set(m.root.position.x, 20 * m.T.scale, m.root.position.z).sub(o);
    const tt = TMP.dot(dir); if (tt < 0 || tt > len) continue; const perp = TMP.addScaledVector(dir, -tt).length(); if (perp < m.radius * 1.25) { len = Math.max(tt - m.radius * .6, 4); hitM = m; }
  }
  for (const b of buildings) { if (!b.alive) continue; TMP.set(b.x - o.x, 0, b.z - o.z); const tt = TMP.x * dir.x + TMP.z * dir.z; if (tt < 6 || tt > len) continue; if (Math.abs(TMP.x * dir.z - TMP.z * dir.x) < Math.max(b.w, b.d) * .5 + 2 && o.y + dir.y * tt < b.h + 2) collapse(b, true); }
  const end = o.clone().addScaledVector(dir, len), pulse = 2.5 + Math.sin(t * 55) * .35;
  beam.position.copy(o); beam.lookAt(end); beam.scale.set(pulse, pulse, len); beam.userData.outer.material.uniforms.uT.value = t; beam.userData.outer.material.uniforms.uL.value = len;
  beamGlow.position.copy(hitM ? end : o).y += 4; beamGlow.intensity = 700; G.shake = Math.max(G.shake, .3);
  for (let i = 0; i < 3; i++) sparks.spawn(o.x + rnd(-2, 2), o.y + rnd(-2, 2), o.z + rnd(-2, 2), dir.x * 90 + rnd(-25, 25), rnd(-25, 25), dir.z * 90 + rnd(-25, 25), .35, 7, .5, 1.8, 3.2, 1, 1, 0);
  if (hitM) {
    burst(end, 7, 70, 5.5, [1, 2.4, 3.4], .5, 20); burst(end, 1, 5, 14, [1.2, 1.6, 2], .1, 0);
    const d = 68 * dt; hitM.beamDmg += d; hitM.beamT += dt; hitMonster(hitM, d, dir.x * 60 * dt, dir.z * 60 * dt, false, end, true);
    if (hitM.beamT > .22) { dmgText(end, Math.round(hitM.beamDmg), 'crit'); hitM.beamDmg = 0; hitM.beamT = 0; G.combo++; G.comboT = 2.6; el.combo.firstChild.nodeValue = G.combo; }
  }
}
function updateDiscs(dt) {
  for (let i = discs.length - 1; i >= 0; i--) {
    const d = discs[i], p = d.mesh.position; p.addScaledVector(d.v, dt); d.mesh.rotation.y += dt * 40; d.life -= dt; if (p.y < 4) { p.y = 4; d.v.y = 0; }
    sparks.spawn(p.x, p.y, p.z, rnd(-8, 8), rnd(-8, 8), rnd(-8, 8), .3, 8, .5, 2, 3.2, .9, 1, 0);
    for (const m of [...monsters]) { if (d.hit.has(m)) continue; const P = m.root.position; if (Math.hypot(P.x - p.x, P.z - p.z) < m.radius + 5 && p.y < 44 * m.T.scale) { d.hit.add(m); hitMonster(m, 38, d.v.x * .25, d.v.z * .25, true, p.clone()); } }
    if (d.life <= 0 || p.length() > ARENA + 150) { scene.remove(d.mesh); discs.splice(i, 1); }
  }
}
function autopilot(dt, t) {                                        // 观战模式 AI
  const h = hero, m = nearest(); G.aiMx = G.aiMz = 0; G.aiT -= dt; keys.KeyL = false; cam.yaw += dt * .22; cam.pitch = .26 + Math.sin(t * .3) * .1;
  if (h.intro > 0 || !m) return;
  const dx = m.root.position.x - h.pos.x, dz = m.root.position.z - h.pos.z, d = Math.hypot(dx, dz), gap = d - m.radius;
  if (h.en > 75) G.aiBeam = true; if (h.en < 6) G.aiBeam = false;
  for (const f of fireballs) if (f.mesh.position.distanceTo(TMP.set(h.pos.x, h.y + 22, h.pos.z)) < 36 && h.dashCd <= 0 && h.action === 'none') { G.aiMx = -dz / d; G.aiMz = dx / d; pressed.ShiftLeft = true; return; }
  if (G.aiBeam && gap > 22 && gap < 240) { keys.KeyL = true; return; }
  if (gap > 15) { G.aiMx = dx / d; G.aiMz = dz / d; if (gap > 60 && h.en > 30 && h.discCd <= 0 && G.aiT <= 0) { pressed.KeyU = true; G.aiT = 1.2; } if (gap > 30 && gap < 46 && h.y <= 0 && Math.random() < .02) pressed.Space = true; }
  else if (m.state === 'windup' && h.dashCd <= 0 && h.action === 'none' && Math.random() < .5) { G.aiMx = -dx / d; G.aiMz = -dz / d; pressed.ShiftLeft = true; }
  else if (G.aiT <= 0) { pressed[Math.random() < .2 ? 'KeyK' : 'KeyJ'] = true; G.aiT = .17; }
}

/* ───────────── 11. 主循环 ───────────── */
const mapCtx = $('#map').getContext('2d');
function drawMap() {
  const g = mapCtx, S = 150, k = S / 2 / (ARENA + 20); g.clearRect(0, 0, S, S); g.save(); g.translate(S / 2, S / 2); g.rotate(cam.yaw - Math.PI);
  g.fillStyle = '#ffffff14'; for (const b of buildings) if (b.alive) g.fillRect(-b.x * k - 1.5, b.z * k * -1 - 1.5, 3, 3);
  for (const o of orbs) { g.fillStyle = o.kind === 'hp' ? '#7dffb0' : '#39d0ff'; g.fillRect(-o.mesh.position.x * k - 2, -o.mesh.position.z * k - 2, 4, 4); }
  for (const m of monsters) { g.fillStyle = m.T.boss ? '#ff4dff' : '#ff3b4e'; g.beginPath(); g.arc(-m.root.position.x * k, -m.root.position.z * k, m.T.boss ? 6 : 4, 0, 7); g.fill(); }
  g.translate(-hero.pos.x * k, -hero.pos.z * k); g.rotate(-hero.heading); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.fill(); g.restore();
}
function updateHud(dt) {
  el.hp.style.transform = `scaleX(${hero.hp / 100})`; el.en.style.transform = `scaleX(${clamp(hero.en, 0, 100) / 100})`;
  el.score.textContent = G.score.toLocaleString(); el.city.textContent = `城市完好 ${((1 - G.cityLost / buildings.length) * 100).toFixed(0)}%`;
  el.best.textContent = G.best ? `最高纪录 ${G.best.toLocaleString()}` : '';
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; G.maxCombo = Math.max(G.maxCombo, G.combo); el.combo.style.opacity = G.combo > 1 ? 1 : 0;
  el.vig.style.opacity = Math.max(0, el.vig.style.opacity - dt * 2.2) + (hero.hp < 35 && !hero.dead ? .25 : 0) * (el.vig.style.opacity < .25 ? 1 : 0);
  el.flash.style.opacity = Math.max(0, el.flash.style.opacity - dt * 2);
  for (const m of monsters) {
    const s = m.state === 'spawn' ? null : toScreen(TMP.set(m.root.position.x, 46 * m.T.scale, m.root.position.z));
    if (!s) { m.bar.style.display = 'none'; continue; }
    m.bar.style.display = ''; m.bar.style.left = s[0] + 'px'; m.bar.style.top = s[1] + 'px'; m.bar.lastElementChild.style.transform = `scaleX(${m.hp / m.maxHp})`;
  }
  drawMap();
}
function updateCamera(dt, t) {
  const h = hero, menu = G.state === 'menu';
  if (menu && !QS.get("pose")) cam.yaw += dt * .25;
  const dist = menu ? 78 : h.action === 'beam' ? 112 : 96, pitch = menu ? .12 : cam.pitch; cam.dist = damp(cam.dist, dist, 3, dt);
  const fx = Math.sin(h.heading), fz = Math.cos(h.heading), ahead = h.action === 'beam' ? 26 : 0;
  TMP.set(h.pos.x + fx * ahead, h.y * .6 + 27, h.pos.z + fz * ahead); cam.look.lerp(TMP, 1 - Math.exp(-9 * dt));
  TMP.set(cam.look.x + Math.sin(cam.yaw) * Math.cos(pitch) * cam.dist, Math.max(4, cam.look.y + Math.sin(pitch) * cam.dist), cam.look.z + Math.cos(cam.yaw) * Math.cos(pitch) * cam.dist);
  cam.pos.lerp(TMP, 1 - Math.exp(-12 * dt)); camera.position.copy(cam.pos);
  if (G.shake > .01) { const s = G.shake * 2.2; camera.position.x += rnd(-s, s); camera.position.y += rnd(-s, s); camera.position.z += rnd(-s, s); }
  camera.lookAt(cam.look); G.shake = damp(G.shake, 0, 6, dt);
  sky.position.copy(camera.position);
  moonLight.target.position.copy(h.pos); moonLight.position.copy(h.pos).addScaledVector(moonLight.userData.dir, 400);
}
let last = performance.now(), fpsN = 0, fpsT = 0, T = 0, lowN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min((now - last) / 1000, .05); last = now;
  fpsN++; fpsT += raw;
  if (fpsT >= 1) {                                                  // 帧率自适应降画质
    const fps = fpsN / fpsT; el.fps.textContent = `${fps.toFixed(0)} FPS`;
    if (fps < 30 && ++lowN >= 2 && pixelRatio > .6) { pixelRatio = Math.max(.6, pixelRatio * .8); renderer.setPixelRatio(pixelRatio); composer.setPixelRatio(pixelRatio); lowN = 0; if (pixelRatio < .8) renderer.shadowMap.enabled = false; }
    if (fps >= 30) lowN = 0; fpsN = fpsT = 0;
  }
  if (G.state === 'paused') return;
  let dt = raw;
  if (G.hitstop > 0) { G.hitstop -= raw; dt *= .04; } else if (G.slow > 0) { G.slow -= raw; dt *= .3; }
  T += dt;
  if (G.state === 'playing') {
    G.time += dt; updateWaves(dt); updateHero(dt, T);
    for (const m of [...monsters]) updateMonster(m, dt, T);
    updateFireballs(dt); updateDiscs(dt); updateOrbs(dt, T); updateHud(dt);
    if (hero.dead) { G.endT -= raw; if (G.endT <= 0) endGame(false); }
  } else {
    hero.root.position.set(hero.pos.x, hero.y, hero.pos.z); hero.root.rotation.y = hero.heading; applyPose(hero, heroPose(hero, T), dt);
    if (G.state === 'over') for (const m of [...monsters]) updateMonster(m, dt, T);
  }
  updateBuildings(dt); updateRings(dt); sparks.update(dt); smoke.update(dt);
  fireGlow.intensity = damp(fireGlow.intensity, 0, 7, dt); if (!hero.beamOn) beamGlow.intensity = 0;
  sky.material.uniforms.uT.value = T;
  updateCamera(raw, T);
  composer.render();
  for (const k in pressed) delete pressed[k];
}
window.__game = { G, hero, monsters, cam, startGame, spawnMonster, hurtHero, act, keys, pressed, TYPES, endGame, buildings };
if (QS.get('pose')) { hero.action = QS.get('pose'); hero.dur = 1; hero.at = .5; }
renderer.compile(scene, camera);
$('#load').classList.add('hide');
requestAnimationFrame(frame);
if (QS.get('auto')) addEventListener('pointerdown', () => { }, { once: true }), setTimeout(() => startGame(true), 300);
