/* ==========================================================================
   Qualidados — hero 3D
   Nuvem de partículas que se transforma entre quatro formas:
   0 Engenharia (engrenagem) · 1 Presença (mapa do Brasil com arcos de dados)
   2 Inovação (hélice) · 3 Dados (gêmeo digital: planta física e réplica holográfica)
   Controlada pelo evento "qd:mode" disparado em main.js. Partículas "de fluxo"
   (arcos, pacotes de dados, plano de varredura, fumaça) são animadas na CPU.
   ========================================================================== */
import * as THREE from "three";

const mount = document.querySelector("[data-hero3d]");
// Modo reduzido: rotação mais lenta, sem jitter; a transição entre formas continua.
const reduce = document.documentElement.classList.contains("motion-reduced");

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

// Contorno do Brasil (lon, lat), simplificado
const BRAZIL = [[-51.6, 4.2], [-50.9, 3.3], [-50.0, 1.8], [-50.4, 0.3], [-49.0, -0.2], [-48.4, -0.8], [-47.8, -0.6], [-46.8, -0.9], [-45.3, -1.4], [-44.4, -2.3], [-43.4, -2.5], [-41.8, -2.9], [-39.9, -2.8], [-38.5, -3.7], [-37.3, -4.7], [-36.0, -5.1], [-35.2, -5.4], [-34.9, -6.9], [-34.8, -8.0], [-35.1, -9.0], [-35.8, -9.8], [-36.9, -10.8], [-37.6, -11.8], [-38.4, -12.9], [-38.9, -13.8], [-39.0, -15.0], [-38.9, -16.2], [-39.2, -17.6], [-39.7, -18.6], [-40.2, -20.0], [-40.9, -21.2], [-41.0, -22.0], [-42.0, -22.97], [-43.2, -23.05], [-44.6, -23.3], [-45.4, -23.8], [-46.4, -24.0], [-47.4, -24.7], [-48.3, -25.6], [-48.6, -26.4], [-48.6, -27.6], [-48.8, -28.5], [-49.7, -29.3], [-50.3, -30.5], [-51.0, -31.5], [-52.1, -32.3], [-53.4, -33.75], [-53.5, -33.1], [-53.2, -32.5], [-54.1, -31.9], [-55.5, -30.9], [-56.4, -30.4], [-57.6, -30.2], [-57.1, -29.8], [-56.0, -28.7], [-55.0, -27.8], [-54.0, -27.2], [-53.8, -26.3], [-54.1, -25.6], [-54.6, -25.55], [-54.3, -24.07], [-55.2, -24.0], [-55.7, -22.55], [-56.8, -22.3], [-57.9, -22.1], [-57.8, -20.0], [-57.7, -19.0], [-57.5, -18.2], [-58.4, -17.3], [-58.4, -16.3], [-60.2, -16.3], [-60.5, -15.1], [-60.3, -13.7], [-61.8, -13.5], [-63.0, -12.7], [-64.4, -12.4], [-65.3, -11.5], [-65.3, -10.8], [-66.6, -9.9], [-67.6, -10.6], [-68.6, -11.0], [-69.6, -11.0], [-70.6, -11.0], [-70.5, -9.5], [-72.2, -10.0], [-73.2, -9.2], [-73.0, -8.5], [-73.9, -7.3], [-73.1, -5.8], [-72.9, -5.1], [-69.95, -4.23], [-69.4, -1.3], [-69.6, -0.5], [-70.0, 0.6], [-69.2, 1.0], [-67.3, 2.0], [-66.8, 1.2], [-65.5, 0.8], [-64.2, 1.5], [-63.4, 2.2], [-64.0, 3.9], [-62.8, 4.0], [-61.0, 4.5], [-60.2, 5.2], [-59.9, 4.4], [-59.6, 2.8], [-59.8, 1.5], [-58.9, 1.3], [-56.5, 1.9], [-55.0, 2.5], [-54.0, 2.3], [-52.9, 2.2], [-52.3, 3.2]];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function init() {
  const isSmall = window.innerWidth < 768;
  const COUNT = isSmall ? 4200 : 9000;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // hi = 0: cores da marca (vinho); hi = 1: tom holográfico (dourado claro)
  function shapeBuilder() {
    const pos = new Float32Array(COUNT * 3);
    const hi = new Float32Array(COUNT);
    let i = 0;
    return {
      pos, hi, flows: [],
      put(x, y, z, h = 0) { if (i < COUNT) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; hi[i] = h; i++; } },
      get i() { return i; },
      n(f) { return Math.floor(COUNT * f); },
      fill(fn) { while (i < COUNT) fn(); }
    };
  }

  /* ---------- 0 · Engrenagem ---------- */
  function gear() {
    const S = shapeBuilder();
    const TEETH = 16, R_IN = 1.58, R_OUT = 1.92, R_RING = 1.22, R_HUB = 0.58, R_BORE = 0.32, H = 0.22;
    const tooth = (a) => {
      const f = ((((a * TEETH) / TAU) % 1) + 1) % 1;
      if (f < 0.34) return 1;
      if (f < 0.46) return (0.46 - f) / 0.12;
      if (f < 0.84) return 0;
      return (f - 0.84) / 0.16;
    };
    const face = () => (Math.random() < 0.5 ? -H : H);
    const j = () => rand(-0.008, 0.008);
    S.fill(() => {
      const k = Math.random();
      let r, a, y;
      if (k < 0.36) { a = Math.random() * TAU; r = R_IN + (R_OUT - R_IN) * tooth(a); y = face(); }
      else if (k < 0.46) { a = Math.random() * TAU; r = R_IN + (R_OUT - R_IN) * tooth(a); y = rand(-H, H); }
      else if (k < 0.56) { a = Math.random() * TAU; r = R_RING; y = Math.random() < 0.75 ? face() : rand(-H, H); }
      else if (k < 0.68) { a = Math.random() * TAU; r = Math.random() < 0.6 ? R_HUB : R_BORE; y = Math.random() < 0.7 ? face() * 1.4 : rand(-H * 1.4, H * 1.4); }
      else if (k < 0.84) {
        const s = Math.floor(Math.random() * 6), base = (s * TAU) / 6, len = rand(R_HUB, R_RING), w = (Math.random() < 0.5 ? -1 : 1) * 0.11;
        const cx = Math.cos(base) * len - Math.sin(base) * w, cz = Math.sin(base) * len + Math.cos(base) * w;
        r = Math.hypot(cx, cz); a = Math.atan2(cz, cx); y = face() * 0.8;
      } else if (k < 0.92) { do { a = Math.random() * TAU; } while (Math.floor((a * 36) / TAU) % 2); r = 2.42; y = 0; }
      else { a = Math.random() * TAU; r = rand(R_RING, R_IN); y = face(); }
      S.put(Math.cos(a) * r + j(), y + j(), Math.sin(a) * r + j());
    });
    return S;
  }

  /* ---------- 1 · Mapa do Brasil com arcos de dados ---------- */
  const LL = (lon, lat, y = 0) => V((lon + 52) * 0.095, y, -(lat + 14) * 0.095);
  function brazilMap() {
    const S = shapeBuilder();
    // Matriz de pontos
    const step = isSmall ? 0.62 : 0.44;
    const grid = [];
    for (let lat = 5.5; lat >= -34; lat -= step) for (let lon = -74.5; lon <= -34; lon += step) if (inPoly(lon, lat, BRAZIL)) grid.push([lon, lat]);
    const nDots = S.n(0.42);
    for (let k = 0; k < nDots; k++) {
      const g = grid[k % grid.length], extra = k >= grid.length;
      const v = LL(g[0] + (extra ? rand(-0.18, 0.18) : 0), g[1] + (extra ? rand(-0.18, 0.18) : 0));
      S.put(v.x, extra ? rand(-0.01, 0.01) : 0, v.z);
    }
    // Contorno
    const segs = [];
    let total = 0;
    for (let k = 0; k < BRAZIL.length; k++) {
      const a = BRAZIL[k], b = BRAZIL[(k + 1) % BRAZIL.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a, b, len, at: total });
      total += len;
    }
    const nOut = S.n(0.15);
    let sIdx = 0;
    for (let k = 0; k < nOut; k++) {
      const d = (k / nOut) * total;
      while (sIdx < segs.length - 1 && segs[sIdx].at + segs[sIdx].len < d) sIdx++;
      const sg = segs[sIdx], f = (d - sg.at) / (sg.len || 1);
      const v = LL(sg.a[0] + (sg.b[0] - sg.a[0]) * f, sg.a[1] + (sg.b[1] - sg.a[1]) * f);
      S.put(v.x + rand(-0.006, 0.006), 0.01, v.z + rand(-0.006, 0.006));
    }
    // Cidades (Salvador, Rio, Uberaba, P-58, RN/CE, Amazonas): disco + coluna de luz
    const CITIES = [[-38.5, -12.97, 0.72], [-43.2, -22.9, 0.46], [-47.93, -19.75, 0.46], [-39.6, -21.6, 0.4], [-37.34, -5.19, 0.4], [-65.33, -4.88, 0.4]];
    const nDisk = S.n(0.011), nBeam = S.n(0.008);
    CITIES.forEach(([lon, lat, h], ci) => {
      const p = LL(lon, lat);
      const rad = ci === 0 ? 0.09 : 0.06;
      for (let k = 0; k < nDisk; k++) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * rad; S.put(p.x + Math.cos(a) * r, 0.015, p.z + Math.sin(a) * r); }
      for (let k = 0; k < nBeam; k++) S.put(p.x + rand(-0.006, 0.006), rand(0, h), p.z + rand(-0.006, 0.006));
    });
    // Arcos de dados: Salvador → demais pontos (pacotes em movimento)
    const A = LL(CITIES[0][0], CITIES[0][1], 0.05);
    const nArc = S.n(0.034);
    CITIES.slice(1).forEach(([lon, lat]) => {
      const B = LL(lon, lat, 0.05);
      const mid = A.clone().add(B).multiplyScalar(0.5);
      const C = mid.clone().add(V(0, 0.22 + A.distanceTo(B) * 0.32, 0));
      const start = S.i;
      const params = new Float32Array(nArc * 4);
      for (let k = 0; k < nArc; k++) {
        const s0 = Math.floor(Math.random() * 7) / 7 + Math.random() * 0.045;
        params.set([s0, rand(-0.008, 0.008), rand(-0.008, 0.008), rand(-0.008, 0.008)], k * 4);
        const u = s0 % 1, w = 1 - u;
        S.put(w * w * A.x + 2 * w * u * C.x + u * u * B.x, w * w * A.y + 2 * w * u * C.y + u * u * B.y, w * w * A.z + 2 * w * u * C.z + u * u * B.z);
      }
      S.flows.push({ type: "bez", start, n: nArc, params, A, C, B, speed: 0.11 });
    });
    // Anel de radar tracejado ao redor
    S.fill(() => {
      let a;
      do { a = Math.random() * TAU; } while (Math.floor((a * 60) / TAU) % 2);
      const r = 2.25 + rand(-0.01, 0.01);
      S.put(Math.cos(a) * r - 0.2, 0, Math.sin(a) * r + 0.05);
    });
    return S;
  }

  /* ---------- 2 · Hélice ---------- */
  function helix() {
    const S = shapeBuilder();
    const HT = 4.6, R = 0.95, TURN = 2.3;
    S.fill(() => {
      const k = Math.random();
      let x, y, z;
      if (k < 0.7) {
        y = rand(-HT / 2, HT / 2);
        const a = y * TURN + (k < 0.35 ? 0 : Math.PI), j = 0.06;
        x = Math.cos(a) * R + rand(-j, j); z = Math.sin(a) * R + rand(-j, j); y += rand(-j, j);
      } else if (k < 0.92) {
        const yy = Math.round(rand(-HT / 2, HT / 2) / 0.2) * 0.2, a = yy * TURN, t = Math.random();
        x = Math.cos(a) * R * (1 - 2 * t); z = Math.sin(a) * R * (1 - 2 * t); y = yy + rand(-0.015, 0.015);
      } else {
        const a = Math.random() * TAU, r = rand(1.4, 2.4);
        x = Math.cos(a) * r; z = Math.sin(a) * r; y = rand(-HT / 2, HT / 2);
      }
      S.put(x, y, z);
    });
    return S;
  }

  /* ---------- 3 · Gêmeo digital ----------
     Embaixo, a planta física (galpão com telhado em shed, chaminés e tanque).
     Em cima, a mesma planta como holograma em arestas, com um plano de varredura.
     Entre as duas, pacotes de dados sobem (leituras) e descem (ajustes). */
  const FLOOR = -1.2, TWIN = 0.36;
  const SHED = { x0: -1.5, x1: 0.3, z: 0.45, h: 0.45, th: 0.22, tw: 0.45 };
  const roofAt = (x) => SHED.h + SHED.th * ((((x - SHED.x0) / SHED.tw) % 1 + 1) % 1);
  const CYLS = [
    { x: 0.55, z: -0.15, r: 0.075, h: 1.02, rings: [0, 0.86, 0.94, 1.02] },
    { x: 0.8, z: 0.15, r: 0.06, h: 0.82, rings: [0, 0.74, 0.82] },
    { x: 1.3, z: 0, r: 0.3, h: 0.5, rings: [0, 0.17, 0.34, 0.5], dome: 0.12 }
  ];
  const EDGES = (() => {
    const segs = [], L = (a, b) => segs.push([a, b]);
    const { x0, x1, z, h, th, tw } = SHED;
    for (const zz of [-z, z]) {
      L([x0, 0, zz], [x1, 0, zz]);
      L([x0, 0, zz], [x0, h, zz]);
      L([x1, 0, zz], [x1, h + th, zz]);
      for (let i = 0; i < 4; i++) { const a = x0 + i * tw; L([a, h, zz], [a + tw, h + th, zz]); if (i < 3) L([a + tw, h + th, zz], [a + tw, h, zz]); }
    }
    L([x0, 0, -z], [x0, 0, z]); L([x1, 0, -z], [x1, 0, z]);
    for (let i = 0; i <= 4; i++) { const a = x0 + i * tw; if (i < 4) L([a, h, -z], [a, h, z]); if (i > 0) L([a, h + th, -z], [a, h + th, z]); }
    L([x1, 0.28, 0], [1.0, 0.28, 0]); L([x1, 0.35, 0.07], [1.0, 0.35, 0.07]);
    return segs;
  })();
  const edgeLen = EDGES.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  const edgeTot = edgeLen.reduce((s, v) => s + v, 0);
  function onEdge(out) {
    let r = Math.random() * edgeTot, k = 0;
    while (k < edgeLen.length - 1 && r > edgeLen[k]) { r -= edgeLen[k]; k++; }
    const [a, b] = EDGES[k], f = r / edgeLen[k];
    out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f;
    return out;
  }
  // Cilindros: anéis e geratrizes (wire) ou superfície (solid)
  function onCyl(out, solid) {
    const c = CYLS[Math.random() < 0.55 ? 2 : Math.random() < 0.6 ? 0 : 1], a = rand(0, TAU);
    if (c.dome && Math.random() < 0.18) {
      const u = Math.random() * (solid ? 1 : 0.15) + (solid ? 0 : 0.85), rr = c.r * Math.sqrt(1 - u * u);
      out[0] = c.x + Math.cos(a) * rr; out[1] = c.h + c.dome * u; out[2] = c.z + Math.sin(a) * rr;
      return out;
    }
    let y;
    if (solid) y = Math.random() < 0.6 ? rand(0, c.h) : c.rings[Math.floor(Math.random() * c.rings.length)];
    else if (Math.random() < 0.6) y = c.rings[Math.floor(Math.random() * c.rings.length)];
    else { y = rand(0, c.h); const k = Math.floor(Math.random() * 8); out[0] = c.x + Math.cos((k * TAU) / 8) * c.r; out[1] = y; out[2] = c.z + Math.sin((k * TAU) / 8) * c.r; return out; }
    out[0] = c.x + Math.cos(a) * c.r; out[1] = y; out[2] = c.z + Math.sin(a) * c.r;
    return out;
  }
  // Superfícies do galpão (paredes e telhado)
  function onShed(out) {
    const { x0, x1, z, h } = SHED, k = Math.random();
    if (k < 0.5) { const x = rand(x0, x1); out[0] = x; out[1] = roofAt(x) - 0.001; out[2] = rand(-z, z); }
    else if (k < 0.85) { const x = rand(x0, x1); out[0] = x; out[1] = rand(0, roofAt(x)); out[2] = Math.random() < 0.5 ? -z : z; }
    else { out[0] = Math.random() < 0.5 ? x0 : x1; out[1] = rand(0, out[0] === x0 ? h : h + SHED.th); out[2] = rand(-z, z); }
    return out;
  }
  const LANES = [-1.275, -0.825, -0.375, 0.075, 1.3].map((x) => ({ x, y0: FLOOR + (x > 1 ? 0.64 : roofAt(x)) + 0.04, y1: TWIN - 0.03 }));

  function twin() {
    const S = shapeBuilder();
    const o = [0, 0, 0], j = (s) => rand(-s, s);
    // Piso pontilhado
    for (let k = 0, n = S.n(0.07); k < n; k++) {
      const t = Math.random();
      if (k % 2) S.put(-2 + Math.round(rand(0, 20)) * 0.2, FLOOR, -0.9 + t * 1.8);
      else S.put(-2 + t * 4, FLOOR, -0.9 + Math.round(rand(0, 9)) * 0.2);
    }
    // Planta física (sólida)
    for (let k = 0, n = S.n(0.2); k < n; k++) { onEdge(o); S.put(o[0] + j(0.006), FLOOR + o[1] + j(0.006), o[2] + j(0.006)); }
    for (let k = 0, n = S.n(0.14); k < n; k++) { onShed(o); S.put(o[0], FLOOR + o[1], o[2]); }
    for (let k = 0, n = S.n(0.12); k < n; k++) { onCyl(o, true); S.put(o[0], FLOOR + o[1], o[2]); }
    // Sensores no telhado e receptores na base do gêmeo
    for (let k = 0, n = S.n(0.015); k < n; k++) {
      const ln = LANES[k % LANES.length], a = rand(0, TAU), up = k % 2;
      S.put(ln.x + Math.cos(a) * 0.04, up ? ln.y1 : ln.y0, Math.sin(a) * 0.04, up);
    }
    // Gêmeo holográfico (arestas, vértices e um volume tênue)
    for (let k = 0, n = S.n(0.13); k < n; k++) { onEdge(o); S.put(o[0] + j(0.004), TWIN + o[1] + j(0.004), o[2] + j(0.004), 1); }
    for (let k = 0, n = S.n(0.05); k < n; k++) { onCyl(o, false); S.put(o[0], TWIN + o[1], o[2], 1); }
    for (let k = 0, n = S.n(0.02); k < n; k++) {
      const e = EDGES[k % EDGES.length][k % 2], a = rand(0, TAU), r = rand(0, 0.025);
      S.put(e[0] + Math.cos(a) * r, TWIN + e[1] + j(0.02), e[2] + Math.sin(a) * r, 1);
    }
    for (let k = 0, n = S.n(0.05); k < n; k++) { (Math.random() < 0.7 ? onShed : (q) => onCyl(q, true))(o); S.put(o[0] + j(0.02), TWIN + o[1] + j(0.02), o[2] + j(0.02), 1); }
    // Plano de varredura (contorno + leve preenchimento), percorre o gêmeo de baixo a cima
    {
      const n = S.n(0.04), start = S.i, params = new Float32Array(n * 2);
      for (let k = 0; k < n; k++) {
        const edge = Math.random() < 0.8;
        params.set([edge ? Math.random() : -1 - Math.random(), Math.random()], k * 2);
        S.put(0, TWIN, 0, 1);
      }
      S.flows.push({ type: "scan", start, n, params, box: [-1.62, 1.66, -0.56, 0.56], y0: TWIN + 0.02, y1: TWIN + 1.08 });
    }
    // Pacotes: leituras sobem (dourado), ajustes descem (vinho)
    const lane = (f, dir, hi, dx, packets, speed) => {
      const n = S.n(f), start = S.i, params = new Float32Array(n * 5);
      for (let k = 0; k < n; k++) {
        params.set([Math.floor(Math.random() * packets) / packets + Math.random() * 0.03, k % LANES.length, j(0.014), j(0.014), j(0.014)], k * 5);
        S.put(LANES[k % LANES.length].x + dx, 0, 0, hi);
      }
      S.flows.push({ type: "lane", start, n, params, dir, dx, speed });
    };
    lane(0.07, 1, 1, -0.05, 5, 0.32);
    lane(0.045, -1, 0, 0.05, 4, 0.24);
    // Fumaça da chaminé física
    {
      const n = S.n(0.03), start = S.i, params = new Float32Array(n * 4), c = CYLS[0];
      for (let k = 0; k < n; k++) { params.set([Math.random(), rand(-1, 1), rand(-1, 1), rand(0.6, 1.4)], k * 4); S.put(c.x, FLOOR + c.h, c.z); }
      S.flows.push({ type: "smoke", start, n, params, src: V(c.x, FLOOR + c.h + 0.02, c.z), rise: 0.32, drift: 0.5 });
    }
    // Restante: mais arestas do gêmeo
    S.fill(() => { onEdge(o); S.put(o[0] + j(0.005), TWIN + o[1] + j(0.005), o[2] + j(0.005), 1); });
    return S;
  }

  const SHAPES = [gear(), brazilMap(), helix(), twin()];

  /* ---------- Atributos ---------- */
  const geo = new THREE.BufferGeometry();
  const aFrom = new Float32Array(SHAPES[0].pos);
  const aTo = new Float32Array(SHAPES[0].pos);
  const aHiFrom = new Float32Array(SHAPES[0].hi);
  const aHiTo = new Float32Array(SHAPES[0].hi);
  const aRand = new Float32Array(COUNT);
  const aSize = new Float32Array(COUNT);
  const aColor = new Float32Array(COUNT * 3);
  const palette = [[0.68, 0.106, 0.22], [0.62, 0.133, 0.208], [0.85, 0.26, 0.35], [0.788, 0.663, 0.38], [0.918, 0.859, 0.71], [0.96, 0.93, 0.91]];
  for (let i = 0; i < COUNT; i++) {
    aRand[i] = Math.random();
    aSize[i] = rand(0.6, 1.5);
    const k = Math.random();
    const c = k < 0.34 ? palette[0] : k < 0.58 ? palette[1] : k < 0.72 ? palette[2] : k < 0.88 ? palette[3] : k < 0.96 ? palette[4] : palette[5];
    aColor[i * 3] = c[0]; aColor[i * 3 + 1] = c[1]; aColor[i * 3 + 2] = c[2];
  }
  geo.setAttribute("position", new THREE.BufferAttribute(aFrom, 3));
  geo.setAttribute("aTo", new THREE.BufferAttribute(aTo, 3));
  geo.setAttribute("aHi", new THREE.BufferAttribute(aHiFrom, 1));
  geo.setAttribute("aHiTo", new THREE.BufferAttribute(aHiTo, 1));
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);

  const uniforms = {
    uProgress: { value: 1 },
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) },
    uSize: { value: isSmall ? 22 : 25 },
    uMouse: { value: new THREE.Vector2(10, 10) },
    uAspect: { value: 1 },
    uOpacity: { value: isSmall ? 0.6 : 1 },
    uJitter: { value: reduce ? 0 : 1 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aTo;
      attribute float aHi, aHiTo;
      attribute float aRand;
      attribute float aSize;
      attribute vec3 aColor;
      uniform float uProgress, uTime, uPixelRatio, uSize, uAspect, uJitter;
      uniform vec2 uMouse;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float p = clamp((uProgress - aRand * 0.35) / 0.65, 0.0, 1.0);
        p = p * p * (3.0 - 2.0 * p);
        vec3 pos = mix(position, aTo, p);
        float hi = mix(aHi, aHiTo, p);
        float mid = sin(p * 3.14159);
        pos *= 1.0 + mid * 0.35 * aRand;
        pos += vec3(sin(uTime * 0.7 + aRand * 40.0), cos(uTime * 0.6 + aRand * 31.0), sin(uTime * 0.5 + aRand * 23.0)) * 0.008 * uJitter;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vec4 clip = projectionMatrix * mv;
        vec2 ndc = clip.xy / clip.w;
        vec2 dir = ndc - uMouse;
        float dist = length(dir * vec2(uAspect, 1.0));
        float force = smoothstep(0.32, 0.0, dist) * 0.16;
        clip.xy += normalize(dir + 1e-5) * force * clip.w;
        gl_Position = clip;
        gl_PointSize = uSize * aSize * uPixelRatio / -mv.z * (1.0 - hi * 0.18);
        vColor = mix(aColor, vec3(0.93, 0.8, 0.52), hi * 0.85) + force * 2.0;
        vAlpha = smoothstep(-11.0, -4.5, mv.z) * (0.55 + 0.45 * aRand);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
      }
    `
  });

  const points = new THREE.Points(geo, mat);

  const DUST = isSmall ? 260 : 600;
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dPos[i * 3] = rand(-9, 9); dPos[i * 3 + 1] = rand(-5, 5); dPos[i * 3 + 2] = rand(-6, 1); }
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xc9a961, size: 0.018, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));

  /* ---------- Cena ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  // Inclinação e rotação de cada forma (o mapa e o gêmeo digital oscilam em vez de girar)
  const MODES = [
    { tilt: 0.95, roll: 0, spin: 0.14 },
    { tilt: 1.02, roll: 0, osc: 0.16 },
    { tilt: 0.12, roll: -0.35, spin: 0.14 },
    { tilt: 0.24, roll: 0, osc: 0.34, yaw: -0.32, shift: -0.2, scale: 0.96 }
  ];
  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.x = MODES[0].tilt;
  const spinGroup = new THREE.Group();
  spinGroup.add(points);
  tiltGroup.add(spinGroup);
  scene.add(tiltGroup);
  scene.add(dust);

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  function layout() {
    const W = mount.clientWidth || window.innerWidth;
    const H = mount.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    uniforms.uAspect.value = W / H;
    const wide = W > 1024, mid = W > 720;
    tiltGroup.position.set(wide ? 1.95 * Math.min(1.25, camera.aspect / 1.6) : mid ? 1.3 : 0.4, wide ? 0.1 : 0.9, 0);
    tiltGroup.scale.setScalar(wide ? 0.92 : mid ? 0.8 : 0.7);
    uniforms.uOpacity.value = wide ? 1 : mid ? 0.75 : 0.55;
  }
  layout();
  window.addEventListener("resize", layout);

  /* ---------- Morph ---------- */
  let current = 0;
  let morphStart = -1;
  const MORPH = 2200;

  function snapshotFrom() {
    const prog = uniforms.uProgress.value;
    for (let i = 0; i < COUNT; i++) {
      let p = Math.min(1, Math.max(0, (prog - aRand[i] * 0.35) / 0.65));
      p = p * p * (3 - 2 * p);
      const j = i * 3;
      aFrom[j] += (aTo[j] - aFrom[j]) * p;
      aFrom[j + 1] += (aTo[j + 1] - aFrom[j + 1]) * p;
      aFrom[j + 2] += (aTo[j + 2] - aFrom[j + 2]) * p;
      aHiFrom[i] += (aHiTo[i] - aHiFrom[i]) * p;
    }
  }
  function morphTo(index) {
    if (index === current || !SHAPES[index]) return;
    snapshotFrom();
    aTo.set(SHAPES[index].pos);
    aHiTo.set(SHAPES[index].hi);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aTo.needsUpdate = true;
    geo.attributes.aHi.needsUpdate = true;
    geo.attributes.aHiTo.needsUpdate = true;
    uniforms.uProgress.value = 0;
    morphStart = performance.now();
    current = index;
  }
  window.addEventListener("qd:mode", (e) => morphTo(e.detail.index));
  if (typeof window.QD_MODE === "number") morphTo(window.QD_MODE);

  /* ---------- Partículas de fluxo ---------- */
  function updateFlows(t, dt) {
    const flows = SHAPES[current].flows;
    if (!flows.length) return;
    const speedMul = reduce ? 0.4 : 1;
    flows.forEach((f) => {
      if (f.flowT === undefined) f.flowT = 0;
      const p = f.params;
      if (f.type === "bez") {
        for (let k = 0; k < f.n; k++) {
          const o = k * 4, u = (p[o] + f.flowT) % 1, w = 1 - u, j = (f.start + k) * 3;
          aTo[j] = w * w * f.A.x + 2 * w * u * f.C.x + u * u * f.B.x + p[o + 1];
          aTo[j + 1] = w * w * f.A.y + 2 * w * u * f.C.y + u * u * f.B.y + p[o + 2];
          aTo[j + 2] = w * w * f.A.z + 2 * w * u * f.C.z + u * u * f.B.z + p[o + 3];
        }
      } else if (f.type === "lane") {
        for (let k = 0; k < f.n; k++) {
          const o = k * 5, ln = LANES[p[o + 1]], j = (f.start + k) * 3;
          const u = (p[o] + f.flowT) % 1, y = f.dir > 0 ? ln.y0 + (ln.y1 - ln.y0) * u : ln.y1 - (ln.y1 - ln.y0) * u;
          aTo[j] = ln.x + f.dx + p[o + 2]; aTo[j + 1] = y + p[o + 3]; aTo[j + 2] = p[o + 4];
        }
      } else if (f.type === "scan") {
        const [x0, x1, z0, z1] = f.box, w = x1 - x0, d = z1 - z0, per = 2 * (w + d);
        const y = f.y0 + (f.y1 - f.y0) * (0.5 - 0.5 * Math.cos(t * 0.75 * speedMul));
        for (let k = 0; k < f.n; k++) {
          const o = k * 2, j = (f.start + k) * 3, s = p[o];
          let x, z;
          if (s >= 0) {
            const q = s * per;
            if (q < w) { x = x0 + q; z = z0; }
            else if (q < w + d) { x = x1; z = z0 + q - w; }
            else if (q < 2 * w + d) { x = x1 - (q - w - d); z = z1; }
            else { x = x0; z = z1 - (q - 2 * w - d); }
          } else { x = x0 + (-1 - s) * w; z = z0 + p[o + 1] * d; }
          aTo[j] = x; aTo[j + 1] = y; aTo[j + 2] = z;
        }
      } else if (f.type === "smoke") {
        for (let k = 0; k < f.n; k++) {
          const o = k * 4, j = (f.start + k) * 3;
          const s = (p[o] + t * 0.12 * speedMul) % 1;
          aTo[j] = f.src.x + s * f.drift * p[o + 3] + p[o + 1] * s * 0.12;
          aTo[j + 1] = f.src.y + s * f.rise;
          aTo[j + 2] = f.src.z + p[o + 2] * s * 0.12;
        }
      }
      if (f.speed) f.flowT = (f.flowT + f.speed * speedMul * dt) % 1;
    });
    geo.attributes.aTo.needsUpdate = true;
  }

  /* ---------- Ponteiro ---------- */
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  const hero = mount.closest(".hero") || document.body;
  hero.addEventListener("pointermove", (e) => {
    const r = mount.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    target.x = nx; target.y = ny;
    uniforms.uMouse.value.set(nx, ny);
  });
  hero.addEventListener("pointerleave", () => { uniforms.uMouse.value.set(10, 10); target.x = 0; target.y = 0; });

  /* ---------- Loop ---------- */
  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(mount);
  }

  const clock = new THREE.Clock();
  let spin = 0;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    uniforms.uTime.value = reduce ? 0 : t;

    if (morphStart >= 0) {
      const k = window.__qdSnap ? 1 : Math.min(1, (now - morphStart) / MORPH); // __qdSnap: só para depuração
      uniforms.uProgress.value = k;
      if (k >= 1) morphStart = -1;
    }
    updateFlows(t, dt);

    eased.x += (target.x - eased.x) * 0.05;
    eased.y += (target.y - eased.y) * 0.05;
    const M = MODES[current], ease = window.__qdSnap ? 1 : 0.035;
    if (M.spin) spin += dt * M.spin * (reduce ? 0.35 : 1);
    else spin += wrap((M.yaw || 0) + Math.sin(t * 0.3) * M.osc * (reduce ? 0.3 : 1) - spin) * Math.min(1, ease * 1.15);
    spinGroup.rotation.y = spin + eased.x * 0.35;
    spinGroup.position.x += ((M.shift || 0) - spinGroup.position.x) * ease;
    spinGroup.scale.setScalar(spinGroup.scale.x + ((M.scale || 1) - spinGroup.scale.x) * ease);
    tiltGroup.rotation.x += (M.tilt - eased.y * 0.18 - tiltGroup.rotation.x) * ease;
    tiltGroup.rotation.z += (M.roll - tiltGroup.rotation.z) * ease;
    dust.rotation.y = t * 0.01;
    dust.position.x = -eased.x * 0.25;
    dust.position.y = -eased.y * 0.15;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  mount.classList.add("is-ready");
}

if (mount && supportsWebGL()) init();
