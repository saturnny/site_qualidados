/* ==========================================================================
   Qualidados — missão drone
   Cena 3D com luz de dia: a sede em Salvador (orla, morros e casario do Rio
   Vermelho) e os locais de contratos (Camaçari, Refinaria de Mataripe, FPSO P-58
   e CBMM). Ao escolher um destino (evento "qd:drone-dest", disparado por main.js),
   o drone sobe e voa até lá. Cenas ilustrativas: não representam as plantas reais.
   Desempenho: resolução adaptativa e sombras recalculadas só ao trocar de destino.
   ========================================================================== */
import * as THREE from "three";

const root = document.querySelector("[data-drone]");
const state = (window.QDDrone = window.QDDrone || { dest: 0 });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

if (root) {
  if (!hasWebGL()) root.classList.add("no-webgl");
  else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((en) => {
      if (en[0].isIntersecting) { io.disconnect(); build(); }
    }, { rootMargin: "1400px 0px" });
    io.observe(root);
  } else build();
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function build() {
  const stage = root.querySelector(".drone__stage");
  const reduce = document.documentElement.classList.contains("motion-reduced");
  const small = window.innerWidth < 768;

  let seed = 20260922;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rand = (a, b) => a + rnd() * (b - a);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  /* ---------- Renderer, cena, câmera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  // Resolução adaptativa: começa no teto e cai se o quadro ficar lento
  const DPR_MAX = Math.min(small ? 1.25 : 1.5, window.devicePixelRatio || 1);
  let dpr = DPR_MAX;
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // cena estática: sombras só quando o destino muda
  renderer.domElement.className = "drone__canvas";
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 1, 40000);

  // Luz de dia, céu azul e névoa atmosférica leve (referência: vista aérea real de Salvador)
  const HAZE = new THREE.Color("#cdd9e4");
  const FOG_NEAR = 1500, FOG_FAR = 9000;
  scene.fog = new THREE.Fog(HAZE, FOG_NEAR, FOG_FAR);
  const SUN_DIR = V(-0.62, 0.64, 0.46).normalize();
  const ZENITH = new THREE.Color("#3a76bf");
  const HORIZON = new THREE.Color("#dde7ef");

  /* ---------- Céu + mapa de ambiente para reflexos ---------- */
  const skyVS = "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
  const skyFS = `
    uniform vec3 uSunDir, uZenith, uHorizon, uHaze; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir);
      float h = max(d.y, 0.0);
      vec3 col = mix(uHorizon, uZenith, pow(h, 0.5));
      col = mix(uHaze, col, smoothstep(0.0, 0.07, h));
      float s = max(dot(d, uSunDir), 0.0);
      col += vec3(1.0, 0.95, 0.85) * pow(s, 8.0) * 0.25;
      col += vec3(1.0, 0.97, 0.9) * pow(s, 64.0) * 0.6;
      col += vec3(1.0, 0.98, 0.94) * smoothstep(0.9993, 0.9997, s) * 7.0;
      if (d.y < 0.0) col = uHaze;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const skyUniforms = () => ({ uSunDir: { value: SUN_DIR }, uZenith: { value: ZENITH }, uHorizon: { value: HORIZON }, uHaze: { value: HAZE } });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyUniforms(), vertexShader: skyVS, fragmentShader: skyFS, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -1;
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.ShaderMaterial({ uniforms: skyUniforms(), vertexShader: skyVS, fragmentShader: skyFS, side: THREE.BackSide, depthWrite: false })));
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;

  /* ---------- Sol (~40° de elevação), com sombras ---------- */
  scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x6f6250, 0.32));
  const sun = new THREE.DirectionalLight(0xfff2de, 2.5);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.8;
  scene.add(sun, sun.target);
  function aimSun(center, size) {
    const sc = sun.shadow.camera;
    sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size;
    sc.near = 10; sc.far = 5000;
    sc.updateProjectionMatrix();
    sun.target.position.copy(center);
    sun.position.copy(center).addScaledVector(SUN_DIR, 2000);
    sun.target.updateMatrixWorld();
    renderer.shadowMap.needsUpdate = true;
  }

  /* ---------- Destinos ---------- */
  const SITES = [
    { key: "SSA", name: "Sede · Salvador", label: "ALVO · ED. QUALIDADOS EMPRESARIAL", center: V(0, 0, 0), r: 132, h: 54, lookY: 10, hero: 1.18, shadow: 380, box: [[-24, 24], [0, 26], [-16, 20]], lat: -13.0112, lon: -38.4905 },
    { key: "CAM", name: "Polo de Camaçari", label: "ALVO · POLO PETROQUÍMICO DE CAMAÇARI", center: V(2400, 0, -3600), r: 540, h: 240, lookY: 18, hero: 2.3, shadow: 520, box: [[-330, 330], [0, 80], [-230, 230]], lat: -12.672, lon: -38.302 },
    { key: "MAT", name: "Refinaria de Mataripe", label: "ALVO · REFINARIA DE MATARIPE", center: V(-2350, 0, -3180), r: 820, h: 300, lookY: -60, hero: 1.42, shadow: 560, box: [[-360, 360], [0, 110], [-250, 250]], lat: -12.716, lon: -38.572 },
    { key: "P58", name: "Plataforma P-58", label: "ALVO · FPSO P-58 · PETROBRAS", center: V(1800, 0, 5200), r: 340, h: 118, lookY: 20, hero: 0.55, shadow: 320, box: [[-158, 158], [-2, 64], [-30, 30]], lat: -21.21, lon: -40.05 },
    { key: "ARX", name: "CBMM · Araxá", label: "ALVO · CBMM · ARAXÁ", center: V(-7000, 0, 1800), r: 760, h: 340, lookY: -30, hero: 1.95, shadow: 700, box: [[-600, 420], [-140, 60], [-400, 400]], lat: -19.66, lon: -46.94 }
  ];
  const BAY = { x: -2300, z: -1300, rx: 700, rz: 1500 };
  const PIT = { x: -7250, z: 1800, r: 380 };

  /* ---------- Materiais e geometrias base ---------- */
  const std = (color, rough = 0.8, metal = 0, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra));
  const M = {
    concrete: std(0xa29d94, 0.95), asphalt: std(0x3a3a3d, 0.92), tank: std(0xffffff, 0.55, 0.15), white: std(0xece9e2, 0.6, 0.05),
    steel: std(0xffffff, 0.38, 0.75), steelDark: std(0x6c7075, 0.5, 0.7), red: std(0xb8262e, 0.55, 0.1), stackMat: std(0xcdc9c1, 0.8),
    alu: std(0xc9ccd0, 0.35, 0.85), roof: std(0x6a6662, 0.9), tankBlue: std(0x3b7bbd, 0.45, 0.1), sand: std(0xd9c39c, 1), sidewalk: std(0xbab2a5, 0.9),
    glass: std(0x2b4a57, 0.06, 0.92, { envMapIntensity: 1.3 }), glassWarm: std(0x3b4a4f, 0.08, 0.85, { emissive: 0xffc98a, emissiveIntensity: 0.18, envMapIntensity: 1.2 }),
    slab: std(0xe9e5de, 0.7), hull: std(0x7c2127, 0.6, 0.25), deck: std(0x8a8d90, 0.8, 0.3), mod: std(0xffffff, 0.6, 0.4), yellow: std(0xd9a21c, 0.55, 0.2),
    earth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }), ore: std(0x5e2e22, 1),
    crown: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), trunk: std(0x5a4431, 1), car: std(0xffffff, 0.35, 0.6)
  };
  const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 28).translate(0, 0.5, 0);
  const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0);
  const SPH = new THREE.SphereGeometry(1, 28, 18);
  const DOME = new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const TOR = new THREE.TorusGeometry(1, 0.05, 5, 28).rotateX(Math.PI / 2);
  const CONE = new THREE.ConeGeometry(1, 1, 18).translate(0, 0.5, 0);
  const CROWN = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  function place(list, geo, mat, parent, opts = {}) {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      dummy.position.set(it.p[0], it.p[1], it.p[2]);
      dummy.rotation.set(...(it.r || [0, 0, 0]));
      dummy.scale.set(...(it.s || [1, 1, 1]));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (it.c) m.setColorAt(i, col.set(it.c));
    });
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    if (m.computeBoundingSphere) m.computeBoundingSphere();
    (parent || scene).add(m);
    return m;
  }

  // Janelas procedurais (escala real: 3 m × 3,2 m) que refletem o céu
  const qdTime = { value: 0 };
  function windowed(base) {
    const m = base.clone();
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = qdTime;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vQW;\nvarying vec3 vQN;")
        .replace("#include <project_vertex>", `#include <project_vertex>
          vec4 qw = vec4(transformed, 1.0);
          vec3 qn = objectNormal;
          #ifdef USE_INSTANCING
            qw = instanceMatrix * qw;
            qn = mat3(instanceMatrix) * qn;
          #endif
          vQW = (modelMatrix * qw).xyz;
          vQN = normalize(mat3(modelMatrix) * qn);`);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vQW; varying vec3 vQN; uniform float uTime;
          float qHash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float qPane = 0.0; float qLit = 0.0;
          if (abs(vQN.y) < 0.5 && vQW.y > 2.6) {
            float u = abs(vQN.x) > 0.5 ? vQW.z : vQW.x;
            vec2 f = vec2(fract(u / 3.0), fract(vQW.y / 3.2));
            qPane = step(0.12, f.x) * step(f.x, 0.88) * step(0.22, f.y) * step(f.y, 0.84);
            vec2 cell = vec2(floor(u / 3.0), floor(vQW.y / 3.2));
            qLit = step(0.9, qHash(vec3(cell, floor(vQW.x * 0.02) + floor(vQW.z * 0.02))));
          }
          float qFar = smoothstep(450.0, 1400.0, length(cameraPosition - vQW));
          qPane *= 1.0 - qFar;
          diffuseColor.rgb *= mix(1.0, 0.8, qFar * step(abs(vQN.y), 0.5));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.08, 0.1), qPane * 0.92);`)
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.07, qPane);")
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, qPane);")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += qPane * qLit * vec3(0.7, 0.8, 0.9) * 0.05;");
    };
    return m;
  }
  const cityMat = windowed(std(0xffffff, 0.85, 0));

  /* ---------- Terreno, orla, baía e mar ---------- */
  const shore = (x) => 64 + 12 * Math.sin(x * 0.0065 + 1.2) + 5 * Math.sin(x * 0.019) + 5200 * smooth(-3200, -5600, x);

  // Relevo de Salvador: orla plana e morros logo atrás (até ~75 m), só na região da sede
  const HILL = { x: 2400, z0: -2600 };
  function elev(x, z) {
    if (Math.abs(x) >= HILL.x || z <= HILL.z0) return 0;
    const coast = smooth(130, 520, shore(x) - z);
    if (coast <= 0) return 0;
    const fade = smooth(HILL.x, HILL.x - 700, Math.abs(x)) * smooth(HILL.z0, HILL.z0 + 700, z) * smooth(150, 380, Math.hypot(x, z));
    const n = 0.55 + 0.4 * Math.sin(x * 0.0042 + 0.6) * Math.cos(z * 0.0051 - 0.9) + 0.22 * Math.sin(x * 0.011 + z * 0.008) + 0.1 * Math.sin(x * 0.023 - z * 0.019);
    return Math.max(0, 72 * n) * coast * fade;
  }
  // Manchas de mata atlântica entre os bairros
  const veg = (x, z) => Math.sin(x * 0.0061 + 1.3) * Math.sin(z * 0.0073 - 0.4) + 0.5 * Math.sin(x * 0.017 - z * 0.013 + 2.1);

  function strip(x0, x1, seg, zA, zB, y, mat, receive = true) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const x = x0 + (x1 - x0) * (i / seg);
      pos.push(x, y, zA(x), x, y, zB(x));
      uv.push(i / seg, 0, i / seg, 1);
      if (i < seg) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = receive;
    scene.add(m);
    return m;
  }

  const landMat = std(0xffffff, 1, 0);
  landMat.onBeforeCompile = (sh) => {
    sh.uniforms.uBay = { value: new THREE.Vector4(BAY.x, BAY.z, BAY.rx, BAY.rz) };
    sh.uniforms.uPit = { value: new THREE.Vector3(PIT.x, PIT.z, PIT.r) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vQW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvQW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vQW; uniform vec4 uBay; uniform vec3 uPit;
        float lH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float lN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(lH(i), lH(i + vec2(1.0, 0.0)), u.x), mix(lH(i + vec2(0.0, 1.0)), lH(i + vec2(1.0, 1.0)), u.x), u.y); }
        float lF(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * lN(p); p *= 2.03; a *= 0.5; } return s; }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec2 qb = (vQW.xz - uBay.xy) / uBay.zw;
        if (dot(qb, qb) < 1.0) discard;
        float dp = length(vQW.xz - uPit.xy);
        if (dp < uPit.z) discard;
        float n1 = lF(vQW.xz * 0.0032);
        float n2 = lF(vQW.xz * 0.021 + 13.1);
        vec3 grass = mix(vec3(0.075, 0.13, 0.045), vec3(0.14, 0.19, 0.07), n2);
        vec3 c = mix(grass, vec3(0.26, 0.23, 0.15), smoothstep(0.5, 0.75, n1));
        c = mix(c, vec3(0.2, 0.12, 0.07), smoothstep(0.64, 0.82, n2) * 0.45);
        float urban = 1.0 - smoothstep(1100.0, 1800.0, length(vQW.xz));
        c = mix(c, vec3(0.115, 0.11, 0.105) + (n2 - 0.5) * 0.05, urban * 0.9); // cor linear: asfalto/calçada
        float red = 1.0 - smoothstep(uPit.z * 1.05, uPit.z * 2.6, dp);
        c = mix(c, vec3(0.24, 0.07, 0.03) + (n2 - 0.5) * 0.05, red);
        diffuseColor.rgb = c;`);
  };
  // Terra plana fora da região da sede + malha com relevo em volta dela
  strip(-14000, -HILL.x, 260, () => -14000, (x) => shore(x) - 40, 0.4, landMat);
  strip(HILL.x, 9000, 150, () => -14000, (x) => shore(x) - 40, 0.4, landMat);
  strip(-HILL.x, HILL.x, 60, () => -14000, () => HILL.z0, 0.4, landMat);
  {
    const NX = small ? 120 : 200, NZ = small ? 70 : 115;
    const pos = [], idx = [];
    for (let i = 0; i <= NX; i++) {
      const x = -HILL.x + (2 * HILL.x * i) / NX, zEnd = shore(x) - 40;
      for (let j = 0; j <= NZ; j++) {
        const z = HILL.z0 + (zEnd - HILL.z0) * (j / NZ);
        pos.push(x, 0.4 + elev(x, z), z);
        if (i < NX && j < NZ) { const a = i * (NZ + 1) + j, b = a + NZ + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const hills = new THREE.Mesh(g, landMat);
    hills.receiveShadow = true;
    scene.add(hills);
  }
  strip(-14000, 9000, 520, (x) => shore(x) - 48, (x) => shore(x) + 5, 0.3, M.sand);
  strip(-1700, 1700, 170, (x) => shore(x) - 62, (x) => shore(x) - 52, 0.55, M.sidewalk);
  strip(-1700, 1700, 170, (x) => shore(x) - 52, (x) => shore(x) - 40, 0.56, M.asphalt);
  strip(-1700, 1700, 170, (x) => shore(x) - 40, (x) => shore(x) - 33, 0.6, M.sidewalk);

  const dashPts = [];
  for (let i = 0; i <= 340; i++) { const x = -1700 + i * 10; dashPts.push(V(x, 0.75, shore(x) - 46)); }
  const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dashPts), new THREE.LineDashedMaterial({ color: 0xf2efe6, dashSize: 4, gapSize: 5 }));
  dash.computeLineDistances();
  scene.add(dash);

  const oceanUniforms = {
    uTime: qdTime,
    uDeep: { value: new THREE.Color("#0b4868") },
    uShallow: { value: new THREE.Color("#23a2a4") },
    uSun: { value: new THREE.Color("#fff6e6") },
    uSunDir: { value: SUN_DIR },
    uZenith: { value: ZENITH }, uHorizon: { value: HORIZON }, uHaze: { value: HAZE },
    uFogNear: { value: FOG_NEAR }, uFogFar: { value: FOG_FAR },
    uBay: { value: new THREE.Vector4(BAY.x, BAY.z, BAY.rx, BAY.rz) },
    uPit: { value: new THREE.Vector3(PIT.x, PIT.z, PIT.r + 40) },
    uHull: { value: new THREE.Vector4(SITES[3].center.x, SITES[3].center.z, 152, 29) }
  };
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(80000, 80000),
    new THREE.ShaderMaterial({
      extensions: { derivatives: true },
      uniforms: oceanUniforms,
      vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `
        uniform float uTime, uFogNear, uFogFar; uniform vec3 uDeep, uShallow, uSun, uSunDir, uZenith, uHorizon, uHaze;
        uniform vec4 uBay, uHull; uniform vec3 uPit; varying vec3 vW;
        float shoreZ(float x){ float t = clamp((-3200.0 - x) / 2400.0, 0.0, 1.0); t = t * t * (3.0 - 2.0 * t);
          return 64.0 + 12.0 * sin(x * 0.0065 + 1.2) + 5.0 * sin(x * 0.019) + 5200.0 * t; }
        vec3 skyCol(vec3 d){ float h = max(d.y, 0.0); vec3 c = mix(uHorizon, uZenith, pow(h, 0.5)); return mix(uHaze, c, smoothstep(0.0, 0.07, h)); }
        void main(){
          if (length(vW.xz - uPit.xy) < uPit.z) discard;
          vec2 p = vW.xz; float t = uTime;
          // Soma de ondas em direções variadas; as mais finas somem quando ficam menores que o pixel
          float fp = max(length(fwidth(p)), 1e-3);
          vec2 g = vec2(0.0);
          #define WAVE(ang, k, a, s) { vec2 dd = vec2(cos(ang), sin(ang)); float lam = 6.2831 / k; float fd = smoothstep(3.0 * fp, 7.0 * fp, lam); g += dd * (a * k * cos(dot(dd, p) * k + t * s)) * fd; }
          WAVE(0.35, 0.018, 1.0, 0.7)
          WAVE(1.27, 0.027, 0.72, 0.9)
          WAVE(2.11, 0.041, 0.52, 1.2)
          WAVE(2.93, 0.063, 0.36, 1.5)
          WAVE(3.83, 0.097, 0.24, 1.9)
          WAVE(4.61, 0.151, 0.15, 2.4)
          WAVE(5.47, 0.233, 0.1, 2.9)
          WAVE(0.93, 0.357, 0.065, 3.4)
          WAVE(3.31, 0.55, 0.04, 4.1)
          float dist = length(cameraPosition - vW);
          vec3 N = normalize(vec3(-g.x * 2.2, 1.0, -g.y * 2.2));
          vec3 Vv = normalize(cameraPosition - vW);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, Vv), 0.0), 5.0);
          float dsh = vW.z - shoreZ(vW.x);
          vec2 qb = (vW.xz - uBay.xy) / uBay.zw; float qq = dot(qb, qb); float inBay = step(qq, 1.0);
          float shallow = max((1.0 - smoothstep(0.0, 240.0, dsh)) * (1.0 - inBay), inBay * 0.55);
          vec3 water = mix(uDeep, uShallow, shallow * 0.8);
          vec3 R = reflect(-Vv, N); R.y = abs(R.y);
          vec3 col = mix(water, skyCol(R), fres);
          float s = max(dot(R, uSunDir), 0.0);
          col += uSun * (pow(s, 380.0) * 7.0 + pow(s, 38.0) * 0.3);
          float foam = 0.0;
          if (inBay < 0.5) foam = (1.0 - smoothstep(0.0, 16.0, dsh)) * step(-2.0, dsh);
          foam = max(foam, (1.0 - smoothstep(0.0, 0.05, abs(1.0 - qq))) * 0.8);
          vec2 hq = abs(vW.xz - uHull.xy) - uHull.zw;
          float hd = length(max(hq, 0.0)) + min(max(hq.x, hq.y), 0.0);
          foam = max(foam, (1.0 - smoothstep(0.0, 12.0, hd)) * step(0.0, hd) * 0.9);
          foam *= 0.55 + 0.45 * sin(dsh * 0.8 - t * 2.4 + p.x * 0.05);
          col = mix(col, vec3(0.95, 0.96, 0.95), clamp(foam, 0.0, 1.0) * 0.6);
          col = mix(col, uHaze, smoothstep(uFogNear, uFogFar, dist));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-2000, 0, 5000);
  scene.add(ocean);

  /* ---------- Árvores (instanciadas) ---------- */
  const trees = [], trunks = [];
  const greens = ["#3b6a2c", "#4a7a33", "#2f5b27", "#56803a", "#3f6f3a"];
  function addTree(x, z, s = 1) {
    const h = rand(4, 7) * s, y = elev(x, z);
    trunks.push({ p: [x, y - 0.5, z], s: [0.35 * s, h * 0.55 + 0.9, 0.35 * s] });
    trees.push({ p: [x, y + h * 0.55 + h * 0.35, z], s: [h * 0.55, h * 0.45, h * 0.55], r: [0, rand(0, 6), 0], c: pick(greens) });
  }

  /* ---------- Sede: Edifício Qualidados Empresarial (representação) ---------- */
  const sede = new THREE.Group();
  scene.add(sede);
  const HW = 34, HD = 20, G = 4.6, F = 3.5, N = 4, TOP = 0.6 + G + N * F;
  function hbox(w, h, d, x, y, z, mat, cast = true) {
    const m = new THREE.Mesh(BOX, mat);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = true;
    sede.add(m);
    return m;
  }
  hbox(HW + 14, 0.5, HD + 40, 0, 0.35, 8, M.concrete, false);
  hbox(HW - 3, G, HD - 3, 0, 0.6, 0, M.glass);
  const cols = [];
  for (let i = 0; i <= 6; i++) for (const pz of [-HD / 2 + 0.8, HD / 2 - 0.8]) cols.push({ p: [-HW / 2 + 1 + i * ((HW - 2) / 6), 0.6, pz], s: [0.8, G, 0.8] });
  place(cols, BOX, M.slab, sede);
  const mullions = [];
  for (let i = 0; i < N; i++) {
    const y0 = 0.6 + G + i * F;
    hbox(HW + 0.8, 0.45, HD + 0.8, 0, y0, 0, M.slab);
    hbox(HW, F - 0.45, HD, 0, y0 + 0.45, 0, i === N - 1 ? M.glassWarm : M.glass);
    for (let k = 0; k <= 17; k++) {
      const x = -HW / 2 + k * (HW / 17);
      mullions.push({ p: [x, y0 + 0.45, HD / 2 + 0.05], s: [0.16, F - 0.45, 0.22] });
      mullions.push({ p: [x, y0 + 0.45, -HD / 2 - 0.05], s: [0.16, F - 0.45, 0.22] });
    }
    for (let k = 0; k <= 10; k++) {
      const z = -HD / 2 + k * (HD / 10);
      mullions.push({ p: [HW / 2 + 0.05, y0 + 0.45, z], s: [0.22, F - 0.45, 0.16] });
      mullions.push({ p: [-HW / 2 - 0.05, y0 + 0.45, z], s: [0.22, F - 0.45, 0.16] });
    }
  }
  place(mullions, BOX, M.alu, sede, { cast: false });
  hbox(HW + 1, 0.8, HD + 1, 0, TOP, 0, M.slab);
  hbox(HW + 1, 1.1, 0.3, 0, TOP + 0.8, HD / 2 + 0.35, M.slab);
  hbox(HW + 1, 1.1, 0.3, 0, TOP + 0.8, -HD / 2 - 0.35, M.slab);
  hbox(7, 2.2, 5, -8, TOP + 0.8, -3, M.roof);
  hbox(4.5, 1.8, 4.5, 9, TOP + 0.8, -4, M.roof);
  hbox(3.2, 2.2, 2.4, 12, TOP + 0.8, 3, M.tankBlue);
  hbox(3.2, 2.2, 2.4, 7.6, TOP + 0.8, 3, M.tankBlue);
  hbox(6, 3.4, 1.6, 0, 0.6, HD / 2 + 3.5, M.slab);

  function signTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 180;
    const x = c.getContext("2d");
    x.fillStyle = "#6b1520"; x.fillRect(0, 20, 1024, 124);
    x.fillStyle = "#c9a961"; x.fillRect(0, 144, 1024, 6);
    x.fillStyle = "#ffffff";
    x.font = "italic 700 86px Poppins, 'Segoe UI', Arial, sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("QUALIDADOS", 512, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.5), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.4, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
  sign.position.set(0, TOP + 3.2, HD / 2 + 0.55);
  sede.add(sign);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { sign.material.map = signTexture(); sign.material.needsUpdate = true; });

  // Carros estacionados na frente
  const parked = [];
  const carCols = ["#d9d6d0", "#1d1d20", "#7a1f26", "#8b9096", "#c7c9cc", "#2f3a4a", "#f2f2f2"];
  for (let i = 0; i < 12; i++) parked.push({ p: [-HW / 2 + 3 + i * 2.9, 0.6, HD / 2 + 12 + (i % 2) * 7], s: [1.9, 1.45, 4.3], c: pick(carCols) });
  place(parked, BOX, M.car, sede);

  // Cidade ao redor (Rio Vermelho): torres brancas na orla e casario subindo os morros
  const city = [], tanksBlue = [];
  const tones = ["#eeece7", "#e5e2db", "#f3f1eb", "#dbd6cc", "#e9e3d7", "#d1ccc2", "#ddd4c5", "#f0ece4"];
  const occupied = new Set();
  const CELL = 34;
  const inBay = (x, z, m) => { const qx = (x - BAY.x) / (BAY.rx + m), qz = (z - BAY.z) / (BAY.rz + m); return qx * qx + qz * qz < 1; };
  for (let gx = -46; gx <= 46; gx++) {
    for (let gz = -46; gz <= 3; gz++) {
      const x = gx * CELL + rand(-5, 5), z = gz * CELL + rand(-5, 5);
      if (z > shore(x) - 80 || inBay(x, z, 60)) continue;
      if (Math.abs(x) < 50 && z > -46) continue;
      const d0 = Math.hypot(x, z);
      if (d0 > 1650) continue;
      const nearHQ = d0 < 200; // vizinhança baixa: a órbita do drone passa por aqui
      let h;
      if (shore(x) - z < 230) { if (rnd() < 0.15) continue; h = nearHQ ? rand(7, 16) : rnd() < 0.6 ? rand(32, 78) : rand(14, 30); }
      else if (!nearHQ && rnd() < 0.06) h = rand(18, 50);
      else continue;
      const w = rand(14, 24), d = rand(14, 22), y = elev(x, z);
      city.push({ p: [x, y - 3, z], s: [w, h + 3, d], c: pick(tones) });
      occupied.add(gx + "," + gz);
      if (rnd() < 0.5) tanksBlue.push({ p: [x + rand(-w / 4, w / 4), y + h, z + rand(-d / 4, d / 4)], s: [2.6, 1.6, 2] });
    }
  }
  if (small) city.length = Math.min(city.length, 420);
  place(city, BOX, cityMat, scene);
  place(tanksBlue, BOX, M.tankBlue, scene, { cast: false });

  // Casario: 1 a 3 pavimentos, telhado cerâmico ou laje com caixa d'água azul, ruas sinuosas e manchas de mata
  const houses = [], gables = [], lajes = [], caixas = [];
  const wallTones = ["#efe9dc", "#e8dcc4", "#f1e3b5", "#e9c9b4", "#d5e2dc", "#d9d2c4", "#b9785a", "#c4876a", "#a8694e", "#f4f1ea"];
  const tileTones = ["#b0603c", "#a2553a", "#bf7048", "#94503a", "#c27a52", "#8c4a34"];
  const isStreet = (x, z) => {
    const u = x + 38 * Math.sin(z * 0.0041), v = z + 26 * Math.sin(x * 0.0053 + 1.1);
    return ((u % 92) + 92) % 92 < 9 || ((v % 66) + 66) % 66 < 8;
  };
  const HS = small ? 18 : 15, HR = small ? 900 : 1350;
  for (let x0 = -HR; x0 <= HR; x0 += HS) {
    for (let z0 = -HR; z0 <= 0; z0 += HS) {
      const x = x0 + rand(-3, 3), z = z0 + rand(-3, 3), d0 = Math.hypot(x, z);
      if (d0 > HR || z > shore(x) - 92 || inBay(x, z, 80) || (Math.abs(x) < 60 && z > -60)) continue;
      if (d0 > HR * 0.72 && rnd() < (d0 - HR * 0.72) / (HR * 0.28)) continue;
      if (occupied.has(Math.round(x / CELL) + "," + Math.round(z / CELL)) || isStreet(x, z)) continue;
      if (veg(x, z) > 0.62 || rnd() < 0.06) { addTree(x + rand(-4, 4), z + rand(-4, 4), rand(1, 1.5)); if (rnd() < 0.6) addTree(x + rand(-6, 6), z + rand(-6, 6), rand(0.9, 1.4)); continue; }
      const w = rand(7, 11.5), d = rand(8, 13), y = elev(x, z), ry = rand(-0.12, 0.12);
      const h = (rnd() < 0.5 ? 1 : rnd() < 0.7 ? 2 : 3) * 3 + rand(0, 0.6);
      houses.push({ p: [x, y - 2.5, z], s: [w, h + 2.5, d], r: [0, ry, 0], c: pick(wallTones) });
      if (rnd() < 0.64) {
        const along = w > d;
        gables.push({ p: [x, y + h, z], s: along ? [d + 0.8, rand(1.6, 2.6), w + 0.8] : [w + 0.8, rand(1.6, 2.6), d + 0.8], r: [0, ry + (along ? Math.PI / 2 : 0), 0], c: pick(tileTones) });
      } else {
        lajes.push({ p: [x, y + h, z], s: [w + 0.3, 0.35, d + 0.3], r: [0, ry, 0], c: pick(["#a49e94", "#b3ada2", "#8f8a82", "#9a948b"]) });
        if (rnd() < 0.7) caixas.push({ p: [x + rand(-w / 4, w / 4), y + h + 0.35, z + rand(-d / 4, d / 4)], s: [0.8, 1.2, 0.8] });
      }
    }
  }
  // Prisma unitário (base 0, cumeeira 1, ao longo de z) para telhados de duas águas
  const GABLE = new THREE.CylinderGeometry(1, 1, 1, 3).rotateX(-Math.PI / 2).scale(1 / 1.732, 1 / 1.5, 1).translate(0, 1 / 3, 0);
  place(houses, BOX, windowed(std(0xffffff, 0.92, 0)), scene);
  place(gables, GABLE, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), scene);
  place(lajes, BOX, std(0xffffff, 0.95), scene, { cast: false });
  place(caixas, CYL8, M.tankBlue, scene, { cast: false });

  // Pedras escuras nos trechos rochosos da linha d'água
  const rocks = [];
  for (let x = -3000; x <= 3000; x += rand(3, 7)) {
    if (Math.sin(x * 0.0037 + 0.8) + 0.4 * Math.sin(x * 0.013) < 0.35) continue;
    const s = rand(1.4, 4.6);
    rocks.push({ p: [x, rand(-1.2, 0.3), shore(x) + rand(-4, 22)], s: [s * rand(1, 1.8), s * rand(0.5, 0.9), s * rand(1, 1.6)], r: [rand(0, 3), rand(0, 6), rand(0, 3)], c: pick(["#4f4842", "#5d554c", "#433d38", "#6a6056"]) });
  }
  place(rocks, CROWN, M.crown, scene, { cast: false });
  const palms = [];
  for (let x = -1600; x <= 1600; x += rand(16, 26)) palms.push(x);
  const palmTrunk = [], palmCrown = [];
  palms.forEach((x) => {
    const z = shore(x) - 36.5, h = rand(8, 11);
    palmTrunk.push({ p: [x, 0.6, z], s: [0.28, h, 0.28], r: [rand(-0.1, 0.1), 0, rand(-0.1, 0.1)] });
    palmCrown.push({ p: [x, h + 0.4, z], s: [3.4, 1.1, 3.4], r: [0, rand(0, 6), 0], c: pick(greens) });
  });
  place(palmTrunk, CYL8, M.trunk, scene);
  place(palmCrown, CROWN, M.crown, scene);

  // Carros circulando na Av. Oceânica
  const CARS = small ? 30 : 64;
  const cars = new THREE.InstancedMesh(BOX, M.car, CARS);
  const carState = [];
  for (let i = 0; i < CARS; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    carState.push({ x: rand(-1600, 1600), dir, lane: dir > 0 ? -49 : -43, v: rand(10, 16) });
    cars.setColorAt(i, col.set(pick(carCols)));
  }
  scene.add(cars);

  /* ---------- Plantas industriais: Camaçari e Mataripe ---------- */
  const flames = [], emitters = [];
  function buildPlant(cx, cz, cfg) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    scene.add(g);
    const W = cfg.w, D = cfg.d;
    const pad = new THREE.Mesh(BOX, M.concrete);
    pad.scale.set(W, 0.5, D); pad.position.y = 0.25; pad.receiveShadow = true;
    g.add(pad);
    const roads = [];
    for (let i = -1; i <= 1; i++) { roads.push({ p: [0, 0.76, (i * D) / 3], s: [W, 0.08, 9] }); roads.push({ p: [(i * W) / 3, 0.76, 0], s: [9, 0.08, D] }); }
    place(roads, BOX, M.asphalt, g, { cast: false });

    const tanks = [], roofs = [], columns = [], rings = [], caps = [], spheres = [], legs = [], equip = [], stacks = [], bands = [], racks = [], pipes = [], offices = [];
    // Parque de tanques
    const tx0 = -W / 2 + 40, tz0 = -D / 2 + 40;
    for (let i = 0; i < cfg.tankCols; i++) for (let j = 0; j < cfg.tankRows; j++) {
      const r = rand(11, 18), h = rand(11, 17);
      const x = tx0 + i * 52, z = tz0 + j * 52;
      tanks.push({ p: [x, 0.5, z], s: [r, h, r], c: pick(["#eeebe4", "#e1ddd4", "#f4f1ea", "#d6d2c9"]) });
      roofs.push({ p: [x, h + 0.5, z], s: [r, r * 0.14, r] });
    }
    // Unidades de processo
    cfg.units.forEach(([ux, uz]) => {
      const n = 3 + Math.floor(rnd() * 4);
      for (let c = 0; c < n; c++) {
        const r = rand(2, 4.2), h = rand(28, 74);
        const x = ux + rand(-20, 20), z = uz + rand(-16, 16);
        columns.push({ p: [x, 0.5, z], s: [r, h, r], c: pick(["#b3b8bd", "#c9ccd0", "#e8e6e0", "#9fa4a9"]) });
        for (let y = 9; y < h - 3; y += 9) rings.push({ p: [x, y, z], s: [r * 1.45, 1, r * 1.45] });
        caps.push({ p: [x, h + 0.5, z], s: [r, r * 0.55, r] });
      }
      for (let k = 0; k < 3; k++) equip.push({ p: [ux + rand(-26, 26), 0.5, uz + rand(-22, 22)], s: [rand(12, 22), rand(8, 18), rand(9, 16)], c: pick(["#8e9296", "#a7abaf", "#7d8286", "#b9b4a8"]) });
    });
    // Esferas de GLP
    cfg.spheres.forEach(([sx, sz]) => {
      const r = 8.5;
      spheres.push({ p: [sx, 12, sz], s: [r, r, r] });
      for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; legs.push({ p: [sx + Math.cos(a) * r * 0.82, 0.5, sz + Math.sin(a) * r * 0.82], s: [0.42, 12, 0.42] }); }
    });
    // Fornos e chaminés
    cfg.stacks.forEach(([sx, sz]) => {
      equip.push({ p: [sx + 14, 0.5, sz], s: [22, 13, 12], c: "#8b8f93" });
      const sh = rand(55, 88);
      stacks.push({ p: [sx, 0.5, sz], s: [1.9, sh, 1.9] });
      bands.push({ p: [sx, sh - 7, sz], s: [1.95, 3, 1.95] });
      bands.push({ p: [sx, sh - 14, sz], s: [1.95, 3, 1.95] });
      emitters.push(V(cx + sx, sh + 1, cz + sz));
    });
    // Racks de tubulação
    const rackLen = W * 0.62;
    for (const rz of cfg.racksZ) {
      racks.push({ p: [0, 7.5, rz], s: [rackLen, 0.7, 8] });
      for (let x = -rackLen / 2; x <= rackLen / 2; x += 12) { legs.push({ p: [x, 0.5, rz - 3.5], s: [0.35, 7.2, 0.35] }); legs.push({ p: [x, 0.5, rz + 3.5], s: [0.35, 7.2, 0.35] }); }
      for (let k = 0; k < 5; k++) pipes.push({ p: [rackLen / 2, 8.6 + (k % 2) * 0.9, rz - 3 + k * 1.5], s: [0.45, rackLen, 0.45], r: [0, 0, Math.PI / 2] });
    }
    // Prédios administrativos
    cfg.offices.forEach(([ox, oz]) => offices.push({ p: [ox, 0.5, oz], s: [rand(26, 40), rand(8, 13), rand(14, 20)], c: "#e7e3dc" }));
    // Tocha
    const [fx, fz] = cfg.flare;
    stacks.push({ p: [fx, 0.5, fz], s: [1.2, 104, 1.2] });
    bands.push({ p: [fx, 96, fz], s: [1.25, 4, 1.25] });
    flames.push(V(cx + fx, 107, cz + fz));

    place(tanks, CYL, M.tank, g);
    place(roofs, DOME, M.white, g, { cast: false });
    place(columns, CYL, M.steel, g);
    place(rings, TOR, M.steelDark, g, { cast: false });
    place(caps, DOME, M.steel, g, { cast: false });
    place(spheres, SPH, M.white, g);
    place(legs, CYL8, M.steelDark, g, { cast: false });
    place(equip, BOX, M.mod, g);
    place(stacks, CYL, M.stackMat, g);
    place(bands, CYL, M.red, g, { cast: false });
    place(racks, BOX, M.steelDark, g);
    place(pipes, CYL8, M.alu, g, { cast: false });
    place(offices, BOX, cityMat, g);
    const tr = [];
    for (let i = 0; i < 160; i++) {
      const a = rand(0, Math.PI * 2), rr = rand(Math.max(W, D) * 0.62, Math.max(W, D) * 1.2);
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      const qx = (x - BAY.x) / BAY.rx, qz = (z - BAY.z) / BAY.rz;
      if (qx * qx + qz * qz < 1.1) continue;
      addTree(x, z, rand(0.9, 1.4));
    }
    return g;
  }

  buildPlant(SITES[1].center.x, SITES[1].center.z, {
    w: 640, d: 440, tankCols: 4, tankRows: 3,
    units: [[40, -120], [150, -60], [60, 60], [220, 110], [-80, 140]],
    spheres: [[-220, 150], [-195, 150], [-170, 150], [-220, 180], [-195, 180]],
    stacks: [[110, -150], [230, 10]], racksZ: [-40, 90], offices: [[-60, -190], [-10, -190]], flare: [280, 180]
  });
  const mat = buildPlant(SITES[2].center.x, SITES[2].center.z, {
    w: 720, d: 480, tankCols: 6, tankRows: 4,
    units: [[80, -100], [190, -40], [110, 80], [250, 120], [-40, 160], [20, 40]],
    spheres: [[-250, 170], [-226, 170], [-202, 170]],
    stacks: [[150, -170], [260, -20], [60, 170]], racksZ: [-30, 110], offices: [[-80, -210], [-30, -210]], flare: [320, -200]
  });
  // Píer e navio-tanque na baía
  const pierZ = 240;
  const pier = new THREE.Mesh(BOX, M.concrete);
  pier.scale.set(14, 1.2, 280); pier.position.set(-120, 0.2, pierZ + 140); pier.castShadow = true;
  mat.add(pier);
  const tanker = new THREE.Group();
  const tHull = new THREE.Mesh(BOX, M.hull); tHull.scale.set(36, 14, 190); tHull.position.y = -6; tHull.castShadow = true;
  const tDeck = new THREE.Mesh(BOX, M.deck); tDeck.scale.set(34, 1, 186); tDeck.position.y = 8;
  const tBridge = new THREE.Mesh(BOX, M.white); tBridge.scale.set(28, 16, 18); tBridge.position.set(0, 9, -80); tBridge.castShadow = true;
  tanker.add(tHull, tDeck, tBridge);
  tanker.position.set(-86, 0, pierZ + 190);
  mat.add(tanker);

  /* ---------- FPSO P-58 (Petrobras) em alto-mar ---------- */
  const fpso = new THREE.Group();
  fpso.position.copy(SITES[3].center);
  scene.add(fpso);
  {
    const s = new THREE.Shape();
    s.moveTo(-150, -28); s.lineTo(118, -28); s.quadraticCurveTo(152, -24, 156, 0); s.quadraticCurveTo(152, 24, 118, 28); s.lineTo(-150, 28); s.lineTo(-150, -28);
    const hg = new THREE.ExtrudeGeometry(s, { depth: 26, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -10, 0);
    const hull = new THREE.Mesh(hg, M.hull); hull.castShadow = true; hull.receiveShadow = true;
    fpso.add(hull);
    const band = new THREE.Mesh(BOX, M.white); band.scale.set(300, 1.6, 57); band.position.set(0, 14.2, 0); fpso.add(band);
    const deck = new THREE.Mesh(BOX, M.deck); deck.scale.set(296, 1, 54); deck.position.set(0, 15.8, 0); deck.receiveShadow = true; fpso.add(deck);
    const mods = [];
    for (let i = 0; i < 9; i++) for (let j = -1; j <= 1; j += 2) mods.push({ p: [-80 + i * 22, 16.8, j * 13], s: [rand(15, 19), rand(8, 20), rand(16, 20)], c: pick(["#9aa0a6", "#c7c9cc", "#e3e1dc", "#b98b3a", "#5f7c8e", "#8f959a"]) });
    place(mods, BOX, M.mod, fpso);
    const pipesF = [];
    for (let k = 0; k < 4; k++) pipesF.push({ p: [120, 19 + k * 0.9, -1.5 + k], s: [0.5, 220, 0.5], r: [0, 0, Math.PI / 2] });
    place(pipesF, CYL8, M.alu, fpso, { cast: false });
    const acc = new THREE.Mesh(BOX, cityMat); acc.scale.set(26, 28, 46); acc.position.set(-134, 16.3, 0); acc.castShadow = true; fpso.add(acc);
    const heliTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const x = c.getContext("2d");
      x.fillStyle = "#3d4a44"; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = "#e8c33a"; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 84, 0, Math.PI * 2); x.stroke();
      x.fillStyle = "#ffffff"; x.font = "700 120px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("H", 128, 134);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const heli = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.2, 8), [M.steelDark, new THREE.MeshStandardMaterial({ map: heliTex, roughness: 0.8 }), M.steelDark]);
    heli.position.set(-134, 45, 0); fpso.add(heli);
    const flareBoom = new THREE.Mesh(CYL8, M.steelDark); flareBoom.scale.set(1.4, 92, 1.4); flareBoom.position.set(138, 16, 0); flareBoom.rotation.z = -0.42; flareBoom.castShadow = true; fpso.add(flareBoom);
    flames.push(V(SITES[3].center.x + 138 + Math.sin(0.42) * 92, 16 + Math.cos(0.42) * 92 + 3, SITES[3].center.z));
    const cranes = [];
    cranes.push({ p: [40, 16, 24], s: [2.4, 12, 2.4] }, { p: [-60, 16, -24], s: [2.4, 12, 2.4] });
    place(cranes, CYL, M.yellow, fpso);
    const booms = [];
    booms.push({ p: [40, 28, 24], s: [44, 1.6, 1.6], r: [0, 0.6, 0.35] }, { p: [-60, 28, -24], s: [44, 1.6, 1.6], r: [0, -2.4, 0.35] });
    place(booms, BOX, M.yellow, fpso);
  }
  const boat = new THREE.Group();
  { const b1 = new THREE.Mesh(BOX, std(0x24313f, 0.6, 0.3)); b1.scale.set(14, 7, 62); b1.position.y = -3; const b2 = new THREE.Mesh(BOX, M.white); b2.scale.set(12, 8, 14); b2.position.set(0, 4, 16); boat.add(b1, b2); }
  scene.add(boat);

  /* ---------- CBMM: mina a céu aberto e planta ---------- */
  {
    const pts = [];
    let r = PIT.r, y = 0.4;
    for (let k = 0; k < 10; k++) {
      pts.push(new THREE.Vector2(r, y));
      pts.push(new THREE.Vector2(r - 12, y));
      r -= 32; y -= 14;
    }
    pts.push(new THREE.Vector2(r, y));
    pts.push(new THREE.Vector2(0, y));
    const lg = new THREE.LatheGeometry(pts.reverse(), 64);
    const cattr = [];
    const pa = lg.getAttribute("position");
    for (let i = 0; i < pa.count; i++) {
      const yy = pa.getY(i);
      const f = Math.abs(((yy % 14) + 14) % 14) < 1 ? 1 : 0;
      const base = new THREE.Color().setRGB(0.52 + 0.08 * f, 0.27 + 0.05 * f, 0.16 + 0.03 * f, THREE.SRGBColorSpace);
      base.offsetHSL(0, 0, (yy / 140) * 0.08 + (Math.random() - 0.5) * 0.03);
      cattr.push(base.r, base.g, base.b);
    }
    lg.setAttribute("color", new THREE.Float32BufferAttribute(cattr, 3));
    const pit = new THREE.Mesh(lg, M.earth);
    pit.position.set(PIT.x, 0, PIT.z);
    pit.receiveShadow = true;
    scene.add(pit);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 40), std(0x3d5a4c, 0.2, 0.3));
    pond.rotation.x = -Math.PI / 2; pond.position.set(PIT.x, y + 0.5, PIT.z);
    scene.add(pond);
    const plantX = PIT.x + PIT.r + 260;
    const blds = [], silos = [], piles = [], stacksM = [], bandsM = [], conv = [];
    for (let i = 0; i < 12; i++) blds.push({ p: [plantX + rand(-120, 140), 0.4, PIT.z + rand(-170, 170)], s: [rand(24, 60), rand(10, 28), rand(20, 44)], c: pick(["#d8d4cc", "#b8bcc0", "#9aa3ab", "#e6e2da", "#8b6f5a"]) });
    for (let i = 0; i < 6; i++) silos.push({ p: [plantX - 40 + (i % 3) * 18, 0.4, PIT.z + 120 + Math.floor(i / 3) * 18], s: [7, 26, 7] });
    for (let i = 0; i < 4; i++) piles.push({ p: [plantX - 150 + i * 46, 0.4, PIT.z - 210 + rand(-10, 10)], s: [rand(20, 30), rand(14, 22), rand(20, 30)] });
    for (let i = 0; i < 2; i++) {
      const sx = plantX + 60 + i * 30, sz = PIT.z - 40;
      stacksM.push({ p: [sx, 0.4, sz], s: [2.2, 70, 2.2] });
      bandsM.push({ p: [sx, 62, sz], s: [2.25, 3, 2.25] });
      emitters.push(V(sx, 72, sz));
    }
    conv.push({ p: [PIT.x + PIT.r * 0.7, 18, PIT.z - 20], s: [300, 3, 4], r: [0, 0, 0.1] });
    place(blds, BOX, cityMat, scene);
    place(silos, CYL, M.white, scene);
    place(piles, CONE, M.ore, scene);
    place(stacksM, CYL, M.stackMat, scene);
    place(bandsM, CYL, M.red, scene, { cast: false });
    place(conv, BOX, M.steelDark, scene);
    for (let i = 0; i < 260; i++) {
      const a = rand(0, Math.PI * 2), rr = rand(PIT.r * 1.5, PIT.r * 3.2);
      addTree(SITES[4].center.x + Math.cos(a) * rr, SITES[4].center.z + Math.sin(a) * rr, rand(0.9, 1.4));
    }
  }
  const TRUCKS = 8;
  const trucks = new THREE.InstancedMesh(BOX, M.yellow, TRUCKS);
  scene.add(trucks);

  place(trunks, CYL8, M.trunk, scene, { cast: false });
  place(trees, CROWN, M.crown, scene);

  /* ---------- Chamas, fumaça e nuvens (sprites) ---------- */
  function radialTex(stops, size = 128) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, cstr]) => g.addColorStop(o, cstr));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const flameTex = radialTex([[0, "rgba(255,255,240,1)"], [0.25, "rgba(255,214,120,0.95)"], [0.55, "rgba(255,120,30,0.55)"], [1, "rgba(255,60,0,0)"]]);
  const flameSprites = flames.map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.copy(p); s.scale.set(16, 26, 1);
    scene.add(s);
    return s;
  });

  const smokeTex = radialTex([[0, "rgba(235,232,228,0.55)"], [0.6, "rgba(215,210,205,0.25)"], [1, "rgba(200,200,200,0)"]]);
  const SMOKE = small ? 60 : 140;
  const smoke = [];
  for (let i = 0; i < SMOKE; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { life: 1, emitter: i % Math.max(1, emitters.length), age: rnd() };
    scene.add(s);
    smoke.push(s);
  }

  const cloudTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d");
    for (let i = 0; i < 22; i++) {
      const cx = 128 + rand(-70, 70), cy = 140 + rand(-30, 30), r = rand(26, 60);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  // Poucos cúmulos, acima da altitude de cruzeiro (menos sobreposição de transparências)
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.85 });
  for (let i = 0; i < (small ? 18 : 36); i++) {
    const s = new THREE.Sprite(cloudMat);
    const w = rand(700, 1600);
    s.scale.set(w, w * 0.4, 1);
    s.position.set(rand(-11000, 7000), rand(1000, 1400), rand(-7500, 8000));
    scene.add(s);
  }

  // Anéis de "realidade aumentada" que marcam o alvo
  const arRings = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(1, 1.03, 128), new THREE.MeshBasicMaterial({ color: 0xc9a961, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    r.rotation.x = -Math.PI / 2;
    r.userData.phase = i / 2;
    arRings.add(r);
  }
  scene.add(arRings);

  /* ---------- HUD ---------- */
  const hud = {};
  root.querySelectorAll("[data-hud]").forEach((el) => { hud[el.getAttribute("data-hud")] = el; });
  const setText = (k, v) => { const el = hud[k]; if (el && el.textContent !== v) el.textContent = v; };
  if (hud.compass && !hud.compass.childElementCount) {
    const labels = { 0: "N", 45: "NE", 90: "L", 135: "SE", 180: "S", 225: "SO", 270: "O", 315: "NO" };
    let html = "";
    for (let a = -180; a <= 540; a += 15) {
      const n = ((a % 360) + 360) % 360;
      html += `<span style="left:${(a + 180) * 3}px"${labels[n] !== undefined ? ' class="major"' : ""}>${labels[n] !== undefined ? labels[n] : n % 45 === 0 ? n : "·"}</span>`;
    }
    hud.compass.innerHTML = html;
  }
  const dms = (v, pos, neg) => {
    const a = Math.abs(v);
    const d = Math.floor(a), m = Math.floor((a - d) * 60), s = Math.round(((a - d) * 60 - m) * 60) % 60;
    return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″${v >= 0 ? pos : neg}`;
  };

  /* ---------- Voo ---------- */
  let mode = "idle", cur = -1, orbitA = 0, flight = null, fov = 46, roll = 0, dragV = 0;
  // Navegação: zoom (distância da órbita), altura (arrastar na vertical), órbita automática e recentralização
  let zoomF = 1, zoomCur = 1, heightF = 1, heightCur = 1, autoOrbit = !reduce, recenterTo = null;
  const look = V(0, 0, 0), tmp = V(), tmp2 = V(), fwd = V(), right = V(), lastPos = V();
  let from = { lat: SITES[0].lat, lon: SITES[0].lon };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const interact = () => window.dispatchEvent(new CustomEvent("qd:drone-interact"));

  function sitePose(s, a, outPos, outLook) {
    const r = s.r * zoomCur;
    const hh = Math.max(s.key === "P58" ? 22 : 26, s.h * zoomCur * heightCur);
    const px = s.center.x + Math.cos(a) * r, pz = s.center.z + Math.sin(a) * r;
    outPos.set(px, Math.max(hh, elev(px, pz) + 30), pz);
    outLook.set(s.center.x, s.lookY, s.center.z);
  }

  // Rota desenhada no céu durante o voo
  const ROUTE_N = 80;
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ROUTE_N * 3), 3));
  const routeMat = new THREE.LineDashedMaterial({ color: 0xe8c77a, dashSize: 46, gapSize: 30, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const route = new THREE.Line(routeGeo, routeMat);
  route.frustumCulled = false;
  scene.add(route);
  function bez(a, b, c, d, t, out) {
    const u = 1 - t;
    return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  }
  function flyTo(i) {
    const s = SITES[i];
    if (!s || (i === cur && mode === "orbit") || (flight && flight.i === i)) return;
    const p0 = camera.position.clone(), l0 = look.clone();
    const p3 = V(), l3 = V();
    sitePose(s, s.hero, p3, l3);
    const dist = p0.distanceTo(p3);
    const cruise = Math.max(p0.y, p3.y, Math.min(780, 260 + dist * 0.085));
    const p1 = p0.clone().lerp(p3, 0.16); p1.y = cruise;
    const p2 = p0.clone().lerp(p3, 0.84); p2.y = cruise;
    from = cur >= 0 ? { lat: SITES[cur].lat, lon: SITES[cur].lon } : { lat: s.lat, lon: s.lon };
    flight = { i, p0, p1, p2, p3, l0, l3, t: 0, dur: reduce ? 0.001 : Math.min(7.5, Math.max(3.4, 2.4 + dist / 1500)) };
    if (!reduce) {
      const ra = routeGeo.attributes.position;
      for (let k = 0; k < ROUTE_N; k++) {
        bez(p0, p1, p2, p3, k / (ROUTE_N - 1), tmp2);
        ra.setXYZ(k, tmp2.x, tmp2.y - 28, tmp2.z);
      }
      ra.needsUpdate = true;
      route.computeLineDistances();
      routeMat.opacity = 0.9;
    }
    recenterTo = null;
    mode = "transit";
    aimSun(s.center, s.shadow);
    root.classList.add("is-transit");
    if (reduce) { root.classList.remove("is-cut"); void root.offsetWidth; root.classList.add("is-cut"); }
  }

  // Posição inicial: sobre o mar, chegando a Salvador
  camera.position.set(-900, 620, 2100);
  look.set(0, 10, 0);
  camera.lookAt(look);
  aimSun(SITES[0].center, SITES[0].shadow);
  flyTo(state.dest || 0);
  window.addEventListener("qd:drone-dest", (e) => flyTo(e.detail.index));

  // Arrastar: horizontal gira a órbita, vertical sobe/desce o drone
  let dragging = false, lastX = 0, lastY = 0;
  stage.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    root.classList.add("is-dragging");
    interact();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dragV = (e.clientX - lastX) * -0.004;
    heightF = clamp(heightF + (e.clientY - lastY) * 0.005, 0.35, 2.4);
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = () => { dragging = false; root.classList.remove("is-dragging"); };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // Botões de controle
  root.querySelectorAll("[data-drone-zoom]").forEach((b) => b.addEventListener("click", () => {
    zoomF = clamp(zoomF * (b.getAttribute("data-drone-zoom") === "in" ? 0.75 : 1.32), 0.42, 2.3);
    interact();
  }));
  const orbitBtn = root.querySelector("[data-drone-orbit]");
  const syncOrbitBtn = () => { if (orbitBtn) { orbitBtn.classList.toggle("is-on", autoOrbit); orbitBtn.setAttribute("aria-pressed", String(autoOrbit)); } };
  syncOrbitBtn();
  if (orbitBtn) orbitBtn.addEventListener("click", () => { autoOrbit = !autoOrbit; syncOrbitBtn(); interact(); });
  const recBtn = root.querySelector("[data-drone-recenter]");
  if (recBtn) recBtn.addEventListener("click", () => { zoomF = 1; heightF = 1; if (cur >= 0) recenterTo = SITES[cur].hero; });
  window.addEventListener("qd:drone-zoom", (e) => { zoomF = clamp(zoomF * (e.detail.dir === "in" ? 0.75 : 1.32), 0.42, 2.3); });

  /* ---------- Resize, visibilidade ---------- */
  function resize() {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w > 900;
    camera.setViewOffset(w, h, wide ? -w * 0.17 : 0, wide ? 0 : h * 0.14, w, h);
    camera.updateProjectionMatrix();
  }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  let visible = true;
  if ("IntersectionObserver" in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(root);

  function project(v, w, h) {
    tmp.copy(v).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, z: tmp.z };
  }

  /* ---------- Minimapa (norte para cima, clicável) ---------- */
  const MM = { x0: -8400, x1: 3800, z0: -5400, z1: 6800, S: 200 };
  const mmX = (x) => ((x - MM.x0) / (MM.x1 - MM.x0)) * MM.S;
  const mmY = (z) => ((z - MM.z0) / (MM.z1 - MM.z0)) * MM.S;
  let mmCtx = null, mmStatic = null, mmFrame = 0;
  if (hud.minimap) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    hud.minimap.width = MM.S * dpr; hud.minimap.height = MM.S * dpr;
    mmCtx = hud.minimap.getContext("2d");
    mmCtx.scale(dpr, dpr);
    mmStatic = document.createElement("canvas");
    mmStatic.width = MM.S * dpr; mmStatic.height = MM.S * dpr;
    const c = mmStatic.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = "#1c0c10"; c.fillRect(0, 0, MM.S, MM.S);
    c.strokeStyle = "rgba(234,219,181,.06)"; c.lineWidth = 1;
    for (let g = 0; g <= MM.S; g += 20) { c.beginPath(); c.moveTo(g, 0); c.lineTo(g, MM.S); c.stroke(); c.beginPath(); c.moveTo(0, g); c.lineTo(MM.S, g); c.stroke(); }
    c.beginPath();
    c.moveTo(0, mmY(shore(MM.x0)));
    for (let x = MM.x0; x <= MM.x1; x += 80) c.lineTo(mmX(x), mmY(shore(x)));
    c.lineTo(MM.S, MM.S); c.lineTo(0, MM.S); c.closePath();
    c.fillStyle = "rgba(16,74,96,.9)"; c.fill();
    c.beginPath();
    c.ellipse(mmX(BAY.x), mmY(BAY.z), (BAY.rx / (MM.x1 - MM.x0)) * MM.S, (BAY.rz / (MM.z1 - MM.z0)) * MM.S, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(201,169,97,.45)"; c.beginPath();
    for (let x = MM.x0; x <= MM.x1; x += 80) { const px = mmX(x), py = mmY(shore(x)); if (x === MM.x0) c.moveTo(px, py); else c.lineTo(px, py); }
    c.stroke();
    c.fillStyle = "rgba(160,80,48,.85)"; c.beginPath(); c.arc(mmX(PIT.x), mmY(PIT.z), 4, 0, Math.PI * 2); c.fill();
    hud.minimap.addEventListener("click", (e) => {
      const r = hud.minimap.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * MM.S, py = ((e.clientY - r.top) / r.height) * MM.S;
      let best = -1, bd = 26;
      SITES.forEach((s, i) => { const d = Math.hypot(mmX(s.center.x) - px, mmY(s.center.z) - py); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) window.dispatchEvent(new CustomEvent("qd:drone-go", { detail: { index: best } }));
    });
  }
  function drawMinimap(t) {
    if (!mmCtx || (mmFrame++ % 2)) return;
    const c = mmCtx;
    c.clearRect(0, 0, MM.S, MM.S);
    c.drawImage(mmStatic, 0, 0, MM.S, MM.S);
    if (flight) {
      c.setLineDash([4, 4]); c.strokeStyle = "rgba(232,199,122,.9)"; c.lineWidth = 1.4; c.beginPath();
      c.moveTo(mmX(flight.p0.x), mmY(flight.p0.z)); c.lineTo(mmX(flight.p3.x), mmY(flight.p3.z)); c.stroke(); c.setLineDash([]);
    }
    c.font = "500 9.5px 'IBM Plex Mono', monospace";
    SITES.forEach((s, i) => {
      const x = mmX(s.center.x), y = mmY(s.center.z);
      const here = i === cur && !flight, target = flight && flight.i === i;
      if (here || target) {
        const pr = (t * 0.9) % 1;
        c.strokeStyle = target ? `rgba(224,64,90,${1 - pr})` : `rgba(201,169,97,${1 - pr})`;
        c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 5 + pr * 10, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = target ? "#E0405A" : here ? "#EADBB5" : "#C9A961";
      c.beginPath(); c.arc(x, y, here || target ? 4 : 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = here || target ? "#F6EEE9" : "rgba(246,238,233,.7)";
      c.fillText(s.key, x + 6, y - 5);
    });
    // Drone e campo de visão
    const dx = mmX(camera.position.x), dy = mmY(camera.position.z);
    const ang = Math.atan2(fwd.z, fwd.x);
    c.fillStyle = "rgba(234,219,181,.12)";
    c.beginPath(); c.moveTo(dx, dy); c.arc(dx, dy, 34, ang - 0.42, ang + 0.42); c.closePath(); c.fill();
    c.save(); c.translate(dx, dy); c.rotate(ang);
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(7, 0); c.lineTo(-5, -4.5); c.lineTo(-3, 0); c.lineTo(-5, 4.5); c.closePath(); c.fill();
    c.restore();
  }

  const clock = new THREE.Clock();
  let recStart = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    qdTime.value = t;
    lastPos.copy(camera.position);

    let e = 0;
    if (mode === "transit" && flight) {
      flight.t = state.snap ? 1 : Math.min(1, flight.t + dt / flight.dur); // snap: só para depuração
      e = easeInOut(flight.t);
      bez(flight.p0, flight.p1, flight.p2, flight.p3, e, camera.position);
      bez(flight.p0, flight.p1, flight.p2, flight.p3, Math.min(1, e + 0.02), tmp2);
      tmp2.sub(camera.position);
      if (tmp2.lengthSq() > 1e-6) tmp2.normalize(); else tmp2.set(0, 0, -1);
      tmp2.multiplyScalar(600).add(camera.position);
      tmp2.y -= 160;
      look.copy(flight.l0).lerp(tmp2, smooth(0, 0.3, e)).lerp(flight.l3, smooth(0.62, 1, e));
      fov = 46 + Math.sin(e * Math.PI) * 12;
      if (flight.t >= 1) {
        cur = flight.i;
        orbitA = SITES[cur].hero;
        mode = "orbit";
        flight = null;
        root.classList.remove("is-transit");
      }
    } else if (mode === "orbit") {
      const s = SITES[cur];
      const k = 1 - Math.exp(-dt * 4);
      zoomCur += (zoomF - zoomCur) * k;
      heightCur += (heightF - heightCur) * k;
      if (recenterTo !== null) {
        const d = wrapA(recenterTo - orbitA);
        orbitA += d * 0.06;
        if (Math.abs(d) < 0.005) recenterTo = null;
      } else {
        orbitA += dt * (autoOrbit ? (reduce ? 0.012 : 0.045) : 0) + dragV;
      }
      dragV *= 0.9;
      sitePose(s, orbitA, camera.position, look);
      if (!reduce) { camera.position.y += Math.sin(t * 1.1) * 0.5; camera.position.x += Math.sin(t * 0.7) * 0.4; }
      fov += (46 - fov) * 0.1;
    }
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }

    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    const vel = tmp2.copy(camera.position).sub(lastPos).divideScalar(Math.max(dt, 1e-3));
    camera.getWorldDirection(fwd);
    right.crossVectors(fwd, camera.up).normalize();
    roll += (Math.max(-0.2, Math.min(0.2, -vel.dot(right) * 0.0011)) - roll) * 0.06;
    if (!reduce) camera.rotateZ(roll);
    sky.position.copy(camera.position);

    // Visibilidade por distância (economia de desenho)
    const spd = vel.length();

    // Vida da cena
    for (let i = 0; i < CARS; i++) {
      const c = carState[i];
      c.x += c.dir * c.v * dt;
      if (c.x > 1600) c.x = -1600; else if (c.x < -1600) c.x = 1600;
      const slope = (shore(c.x + 1) - shore(c.x - 1)) / 2;
      dummy.position.set(c.x, 0.6, shore(c.x) + c.lane);
      dummy.rotation.set(0, -Math.atan(slope) + (c.dir < 0 ? Math.PI : 0) + Math.PI / 2, 0);
      dummy.scale.set(1.9, 1.45, 4.3);
      dummy.updateMatrix();
      cars.setMatrixAt(i, dummy.matrix);
    }
    cars.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < TRUCKS; i++) {
      const bench = 1 + (i % 6);
      const rr = PIT.r - bench * 32 + 6;
      const a = t * (0.05 + (i % 3) * 0.01) * (i % 2 ? 1 : -1) + i * 0.8;
      dummy.position.set(PIT.x + Math.cos(a) * rr, 0.4 - bench * 14 + 0.3, PIT.z + Math.sin(a) * rr);
      dummy.rotation.set(0, -a + (i % 2 ? 0 : Math.PI), 0);
      dummy.scale.set(4.5, 4, 9);
      dummy.updateMatrix();
      trucks.setMatrixAt(i, dummy.matrix);
    }
    trucks.instanceMatrix.needsUpdate = true;

    const ba = t * 0.035;
    boat.position.set(SITES[3].center.x + Math.cos(ba) * 420, 0, SITES[3].center.z + Math.sin(ba) * 300);
    boat.rotation.y = -ba;

    flameSprites.forEach((s, i) => {
      const k = 1 + Math.sin(t * 13 + i) * 0.12 + Math.sin(t * 7.3 + i * 2) * 0.1;
      s.scale.set(15 * k, 26 * k, 1);
    });
    for (let i = 0; i < smoke.length && emitters.length; i++) {
      const s = smoke[i], u = s.userData;
      u.age += dt * 0.09;
      if (u.age >= 1) { u.age = 0; u.emitter = Math.floor(rnd() * emitters.length); }
      const em = emitters[u.emitter];
      const a = u.age;
      s.position.set(em.x + a * 90, em.y + a * 70, em.z - a * 20);
      const sc = 8 + a * 60;
      s.scale.set(sc, sc, 1);
      s.material.opacity = Math.sin(a * Math.PI) * 0.45;
    }

    const target = cur >= 0 && mode === "orbit" ? SITES[cur] : flight ? SITES[flight.i] : SITES[0];
    arRings.position.set(target.center.x, (target.key === "P58" ? 0.6 : 1.2), target.center.z);
    arRings.children.forEach((r) => {
      const k = (t * 0.25 + r.userData.phase) % 1;
      const base = target.r * 0.35;
      const s = base * (0.7 + k * 0.8);
      r.scale.set(s, s, s);
      r.material.opacity = (mode === "orbit" ? 0.5 : 0.15) * (1 - k);
    });

    if (!flight && routeMat.opacity > 0) routeMat.opacity = Math.max(0, routeMat.opacity - dt * 0.6);
    route.visible = routeMat.opacity > 0.01;

    renderer.render(scene, camera);
    drawMinimap(t);
    adaptQuality(now);

    /* HUD */
    const w = stage.clientWidth, h = stage.clientHeight;
    const hdg = ((Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI + 360) % 360;
    const ref = flight ? SITES[flight.i] : SITES[Math.max(0, cur)];
    const dist = Math.hypot(camera.position.x - ref.center.x, camera.position.z - ref.center.z);
    setText("alt", String(Math.round(camera.position.y)).padStart(3, "0"));
    setText("dst", String(Math.round(dist)).padStart(3, "0"));
    setText("hdg", String(Math.round(hdg)).padStart(3, "0") + "°");
    setText("spd", String(Math.min(120, Math.round(spd * 0.36))).padStart(2, "0"));
    let lat, lon;
    if (flight) {
      lat = from.lat + (SITES[flight.i].lat - from.lat) * e;
      lon = from.lon + (SITES[flight.i].lon - from.lon) * e;
    } else {
      lat = ref.lat - (camera.position.z - ref.center.z) / 111000;
      lon = ref.lon + (camera.position.x - ref.center.x) / 108000;
    }
    setText("lat", dms(lat, "N", "S"));
    setText("lon", dms(lon, "L", "O"));
    const secs = Math.floor((performance.now() - recStart) / 1000);
    setText("rec", `00:${String(Math.floor(secs / 60) % 60).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`);
    if (flight) {
      setText("mode", `EM ROTA → ${SITES[flight.i].key}`);
      setText("eta", `ETA 00:${String(Math.ceil((1 - flight.t) * flight.dur)).padStart(2, "0")}`);
    } else if (cur >= 0) {
      setText("mode", `ÓRBITA · ${SITES[cur].key}`);
      setText("eta", "ALVO TRAVADO");
    }
    if (hud.compass) hud.compass.style.transform = `translateX(${-(hdg + 180) * 3}px)`;
    if (hud.horizon) hud.horizon.style.transform = `translate(-50%, ${Math.max(-60, Math.min(60, fwd.y * 160))}px) rotate(${(-roll * 180) / Math.PI}deg)`;

    // Caixa de alvo
    if (hud.target) {
      let show = mode === "orbit" && cur >= 0;
      if (show) {
        const s = SITES[cur], b = s.box;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const bx of b[0]) for (const by of b[1]) for (const bz of b[2]) {
          const p = project(tmp2.set(s.center.x + bx, by, s.center.z + bz), w, h);
          if (p.z > 1) show = false;
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        minX = Math.max(8, minX); minY = Math.max(8, minY); maxX = Math.min(w - 8, maxX); maxY = Math.min(h - 8, maxY);
        if (show && maxX - minX > 10 && maxY - minY > 10) {
          hud.target.style.transform = `translate(${minX}px, ${minY}px)`;
          hud.target.style.width = `${maxX - minX}px`;
          hud.target.style.height = `${maxY - minY}px`;
        } else show = false;
      }
      hud.target.style.opacity = show ? "1" : "0";
    }
  }

  // Resolução adaptativa: se a média entre quadros passar de ~24 ms (< 40 fps), reduz o pixel ratio
  let qT0 = 0, qN = 0, qSum = 0, qLast = 0;
  function adaptQuality(now) {
    const iv = qLast ? now - qLast : 0;
    qLast = now;
    if (!iv || iv > 120) return; // ignora pausas e abas em segundo plano
    qSum += iv; qN++;
    if (!qT0) qT0 = now;
    if (now - qT0 < 1500) return;
    if (qSum / qN > 24 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
    qT0 = now; qN = 0; qSum = 0;
  }
  requestAnimationFrame(frame);
  root.classList.add("is-ready");
}
