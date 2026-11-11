// Turbines à gaz procédurales — recréations three.js des 4 visuels du dossier images/turbine
// (rotor nu, écorché 3/4, maquette en coupe, coupe longitudinale), aux couleurs de la charte Azito Energie.
// buildTurbine(config, style) → THREE.Group. `config` porte la variante et tout ce qui peut varier d'un schéma à l'autre.
import * as THREE from 'three';

export const PALETTE = {
  blue: 0x4d85d0,
  red: 0xc20e1a,
  white: 0xffffff,
  indigo: 0x313280,
  gray8: 0x868686,
  gray5: 0xb1b1b0,
  gray2: 0xd9d9d9,
};

// Les 4 turbines du jeu, une par visuel source.
export const VARIANTS = {
  rotor: { label: 'Le rotor nu', source: 'GT13E2 GasTurbineRotor.jpg' },
  ecorche: { label: 'L’écorché trois-quarts', source: 'content-GT13E2-turbine.webp' },
  maquette: { label: 'La maquette en coupe', source: 'gasturbine-model-gt13e2 turbine.jpg' },
  coupe: { label: 'La coupe longitudinale', source: 'hero-gas-turbine-gt13e2.webp' },
};

export const BASE_CONFIG = {
  variant: 'ecorche',
  turbineStages: 5,     // nombre d'étages de turbine
  turbineFlip: false,   // étages de turbine montés à l'envers (grand → petit)
  compSkip: [],         // étages de compresseur absents (indices 0–13)
  coupling: 'left',     // bride d'accouplement : 'left' (côté compresseur) | 'right'
  stub: 1.1,            // longueur du bout d'arbre côté compresseur
  supportX: null,       // position du support avant (null = valeur par défaut de la variante)
  bell: true,           // pavillon d'admission
  burners: null,        // nombre de brûleurs (null = tous)
  burnerTilt: 1,        // 1 | -1 — inclinaison des brûleurs
  pipeDir: 1,           // 1 | -1 — sens de la conduite de prélèvement
  portX: 1.75,          // position du piquage sur le carter turbine
  flangeSkip: null,     // index d'une bride de carter absente
};

const COMP_STAGES = 14;
const X = { stubEnd: -3.3, compEnd: -0.4, combEnd: 0.9, turbEnd: 2.5, aftEnd: 3.3 };

// Par variante : portion de carter conservée + angles (autour de l'axe) des accessoires visibles.
// Angle a → direction radiale y = cos(a), z = -sin(a). La caméra regarde depuis +z, légèrement au-dessus.
const SHELLS = {
  ecorche: { start: 0, len: Math.PI * 1.5, burners: [15, 50, 85, 215, 245], pipe: 40, port: 232 },
  maquette: { start: Math.PI / 2, len: Math.PI, burners: [6, 30, 54, 150, 174], pipe: 22, port: 14 },
  coupe: { start: 0, len: Math.PI, burners: [200, 222, 244, 266], pipe: 238, port: 228 },
};
const DEFAULT_SUPPORT = { rotor: -4.0, ecorche: -2.6, maquette: -2.4, coupe: -2.6 };

export function buildTurbine(config = {}, style = 'real') {
  const cfg = { ...BASE_CONFIG, ...config };
  const variant = VARIANTS[cfg.variant] ? cfg.variant : 'ecorche';
  const schema = style === 'schema';
  const mono = variant === 'coupe'; // coupe longitudinale : rendu monochrome gris, comme le visuel source
  const body = mono ? 'gray8' : 'blue';
  const trim = mono ? 'gray5' : 'indigo';
  const supportX = cfg.supportX ?? DEFAULT_SUPPORT[variant];
  const root = new THREE.Group();

  const cache = new Map();
  const mat = (key, opts = {}) => {
    const id = key + JSON.stringify(opts);
    if (cache.has(id)) return cache.get(id);
    const side = opts.double ? THREE.DoubleSide : THREE.FrontSide;
    const m = schema
      ? new THREE.MeshBasicMaterial({ color: PALETTE[key], side })
      : new THREE.MeshStandardMaterial({ color: PALETTE[key], metalness: opts.metal ?? 0.35, roughness: opts.rough ?? 0.45, side });
    cache.set(id, m);
    return m;
  };
  const part = (name, parent = root) => {
    const g = new THREE.Group();
    g.name = name;
    parent.add(g);
    return g;
  };
  const add = (parent, geo, material, x = 0, y = 0, z = 0, edge = true) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.userData.edge = edge;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent, w, h, d, material, x, y, z) => add(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  // Cylindre couché le long de X entre x0 et x1. r0 = rayon en x0, r1 = rayon en x1.
  const cylX = (parent, r0, r1, x0, x1, material, { open = false, start = 0, len = Math.PI * 2, seg = 40, edge = true } = {}) => {
    const geo = new THREE.CylinderGeometry(r1, r0, x1 - x0, seg, 1, open, start, len);
    geo.rotateZ(-Math.PI / 2);
    return add(parent, geo, material, (x0 + x1) / 2, 0, 0, edge);
  };
  // Groupe orienté radialement : son +Y local pointe vers l'extérieur à l'angle a (degrés).
  const radial = (parent, deg, x = 0) => {
    const g = new THREE.Group();
    g.rotation.x = (-deg * Math.PI) / 180;
    g.position.x = x;
    parent.add(g);
    return g;
  };
  const cylY = (parent, r0, r1, h, material, x, y, z, seg = 14) =>
    add(parent, new THREE.CylinderGeometry(r1, r0, h, seg), material, x, y, z);

  // ---------- Rotor ----------
  const rotor = part('rotor');
  root.userData.rotor = rotor;
  const steel = mat('gray5', { metal: 0.6, rough: 0.35 });

  const stub = part('stub', rotor);
  cylX(stub, 0.2, 0.2, X.stubEnd - cfg.stub, X.stubEnd, steel, { seg: 24 });
  cylX(stub, 0.3, 0.3, X.stubEnd - 0.28, X.stubEnd, steel, { seg: 24 });
  cylX(rotor, 0.36, 0.56, X.stubEnd, X.compEnd, steel);          // tambour compresseur
  cylX(rotor, 0.56, 0.56, X.compEnd, X.combEnd, steel);          // arbre intermédiaire
  cylX(rotor, 0.5, 0.6, X.combEnd, X.turbEnd, steel);            // tambour turbine
  cylX(rotor, 0.28, 0.28, X.turbEnd, X.aftEnd, steel, { seg: 24 });

  const coupling = part('coupling', rotor);
  const cx = cfg.coupling === 'right' ? X.aftEnd : X.stubEnd - cfg.stub;
  const cDir = cfg.coupling === 'right' ? 1 : -1;
  cylX(coupling, 0.52, 0.52, Math.min(cx, cx + cDir * 0.14), Math.max(cx, cx + cDir * 0.14), mat(mono ? 'gray8' : 'red'), { seg: 28 });

  const stage = (parent, x, tip, hub, blades, material, chord) => {
    const g = new THREE.Group();
    g.position.x = x;
    const len = tip - hub;
    const geo = new THREE.BoxGeometry(0.035, len, chord);
    for (let k = 0; k < blades; k++) {
      const pivot = new THREE.Group();
      pivot.rotation.x = (k / blades) * Math.PI * 2;
      const b = new THREE.Mesh(geo, material);
      b.position.y = hub + len / 2;
      b.rotation.y = 0.55;
      b.userData.edge = false;
      pivot.add(b);
      g.add(pivot);
    }
    parent.add(g);
  };

  const compressor = part('compressor', rotor);
  const compMat = mat('gray2', { metal: 0.55, rough: 0.35 });
  for (let i = 0; i < COMP_STAGES; i++) {
    if (cfg.compSkip.includes(i)) continue;
    const t = i / (COMP_STAGES - 1);
    stage(compressor, -3.15 + t * 2.6, 1.0 - t * 0.27, 0.37 + t * 0.18, 20, compMat, 0.12);
  }
  const turbine = part('turbine', rotor);
  const turbMat = mat(mono ? 'gray2' : 'gray8', { metal: 0.6, rough: 0.4 });
  for (let i = 0; i < cfg.turbineStages; i++) {
    const k = cfg.turbineFlip ? 4 - i : i;
    stage(turbine, 1.1 + i * 0.32, 0.8 + (k / 4) * 0.38, 0.52 + (i / 4) * 0.07, 18, turbMat, 0.17);
  }

  // ---------- Carter écorché (toutes variantes sauf rotor nu) ----------
  const shell = SHELLS[variant];
  if (shell) {
    const cut = { open: true, start: shell.start, len: shell.len };
    const skin = mat(body, { double: true });
    const liner = mat('gray2', { double: true });
    const casing = part('casing');
    const lined = (r0, r1, x0, x1) => {
      cylX(casing, r0, r1, x0, x1, skin, cut);
      cylX(casing, r0 - 0.07, r1 - 0.07, x0, x1, liner, { ...cut, edge: false });
    };
    lined(1.07, 0.8, X.stubEnd, X.compEnd);
    lined(1.38, 1.38, X.compEnd, X.combEnd);
    lined(0.9, 1.27, X.combEnd, X.turbEnd);
    cylX(casing, 1.27, 1.5, X.turbEnd, 3.45, mat('gray5', { double: true }), cut);
    cylX(casing, 1.56, 1.56, 3.45, 3.62, mat('gray8', { double: true }), cut);

    const inlet = part('inlet');
    if (cfg.bell) {
      cylX(inlet, 1.55, 1.07, -3.95, X.stubEnd, mat('gray5', { double: true }), cut);
      cylX(inlet, 1.6, 1.6, -4.05, -3.95, mat(trim, { double: true }), cut);
    }

    const flange = part('flange');
    [[X.stubEnd, 1.14], [-1.85, 1.0], [X.compEnd, 1.45], [X.combEnd, 1.45], [X.turbEnd, 1.34]].forEach(([x, r], i) => {
      if (cfg.flangeSkip === i) return;
      cylX(flange, r, r, x - 0.05, x + 0.05, mat(trim, { double: true }), cut);
    });

    // Brûleurs : fûts inclinés sur la chambre de combustion annulaire
    const burners = part('burners');
    const angles = cfg.burners == null ? shell.burners : shell.burners.slice(0, cfg.burners);
    for (const a of angles) {
      const g = radial(burners, a, 0.25);
      const can = cylY(g, 0.17, 0.14, 0.62, mat(trim), 0, 1.38 + 0.24, 0);
      can.rotation.z = 0.5 * cfg.burnerTilt;
      can.position.x = -0.16 * cfg.burnerTilt;
      const cap = cylY(g, 0.09, 0.09, 0.16, mat(mono ? 'gray2' : 'red'), -0.33 * cfg.burnerTilt, 1.38 + 0.58, 0, 12);
      cap.rotation.z = 0.5 * cfg.burnerTilt;
    }

    // Conduite de prélèvement : sort du carter compresseur puis longe la machine
    const pipe = part('pipe');
    const pg = radial(pipe, shell.pipe);
    const px = -1.7, run = 1.25 * cfg.pipeDir, rise = 1.62;
    cylY(pg, 0.085, 0.085, rise - 0.9, mat(body), px, (rise + 0.9) / 2, 0);
    const along = new THREE.CylinderGeometry(0.085, 0.085, Math.abs(run), 14);
    along.rotateZ(Math.PI / 2);
    add(pg, along, mat(body), px + run / 2, rise, 0);
    add(pg, new THREE.SphereGeometry(0.11, 12, 10), mat(body), px, rise, 0);
    cylY(pg, 0.14, 0.14, 0.08, mat(trim), px, 0.98, 0);
    cylY(pg, 0.13, 0.13, 0.1, mat(trim), px + run, rise, 0).rotation.z = Math.PI / 2;

    // Piquage sur le carter turbine
    const port = part('port');
    const og = radial(port, shell.port, cfg.portX);
    cylY(og, 0.2, 0.2, 0.34, mat(body), 0, 1.16, 0);
    cylY(og, 0.26, 0.26, 0.07, mat(trim), 0, 1.36, 0);
  }

  // ---------- Supports ----------
  const support = part('support');
  if (variant === 'rotor') {
    for (const x of [supportX, 3.0]) {
      box(support, 0.42, 1.5, 1.3, mat('indigo'), x, -1.0, 0);
      box(support, 0.7, 0.16, 1.7, mat('gray8'), x, -1.83, 0);
      box(support, 0.5, 0.22, 0.7, mat('blue'), x, -0.2, 0);
    }
  } else if (variant === 'maquette') {
    for (const x of [supportX, 1.9]) box(support, 1.5, 0.95, 1.7, mat('gray8'), x, -1.72, -0.25);
    box(root, 9.6, 0.24, 3.6, mat('indigo'), -0.2, -2.32, 0);
  } else {
    for (const x of [supportX, 1.9]) {
      box(support, 0.5, 0.95, 2.3, mat(body), x, -1.38, 0);
      box(support, 0.8, 0.14, 2.6, mat(trim), x, -1.92, 0);
    }
  }

  if (schema) addEdges(root);
  return root;
}

function addEdges(root) {
  const line = new THREE.LineBasicMaterial({ color: PALETTE.indigo });
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && o.userData.edge !== false) meshes.push(o); });
  for (const m of meshes) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), line));
}

// Éclairage commun (rendu « réaliste »)
export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb1b1b0, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7);
  fill.position.set(-7, 4, 5);
  scene.add(fill);
}

// Caméra 3/4 face, cadrée sur toute la machine quel que soit le ratio.
export function frameCamera(camera, aspect, margin = 1) {
  camera.aspect = aspect;
  const fitW = 10.2 * margin, fitH = 5.0 * margin;
  const vFov = (camera.fov * Math.PI) / 180;
  const dist = Math.max(fitH / 2 / Math.tan(vFov / 2), fitW / 2 / (Math.tan(vFov / 2) * aspect));
  const center = new THREE.Vector3(-0.3, -0.35, 0);
  const dir = new THREE.Vector3(0.3, 0.44, 1).normalize();
  camera.position.copy(dir.multiplyScalar(dist)).add(center);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

// Rendu fixe de schémas (aplats + arêtes) vers des images. Un contexte WebGL temporaire, libéré ensuite.
export function renderSchemas(configs, width = 1040, height = 520) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(PALETTE.white, 1);
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 200);
  frameCamera(camera, width / height, 1.06);
  const urls = configs.map((cfg) => {
    const scene = new THREE.Scene();
    const model = buildTurbine(cfg, 'schema');
    scene.add(model);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    disposeTree(model);
    return url;
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return urls;
}

export function disposeTree(root) {
  const mats = new Set();
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) mats.add(o.material);
  });
  mats.forEach((m) => m.dispose());
}

// Vue interactive : rotation tactile limitée + léger balancement automatique + rotor qui tourne.
export function mountViewer(container, { config = {}, autoSway = true, interactive = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  addLights(scene);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let model = buildTurbine(config);
  pivot.add(model);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let yaw = 0, userYaw = 0, dragging = false, lastX = 0, lastTouch = 0;
  let highlight = null, spin = true;

  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    frameCamera(camera, w / h, 1.14); // marge pour la rotation
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  if (interactive) {
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      try { el.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      userYaw = THREE.MathUtils.clamp(userYaw + (e.clientX - lastX) * 0.006, -0.95, 0.95);
      lastX = e.clientX;
      lastTouch = performance.now();
    });
    const end = () => { dragging = false; lastTouch = performance.now(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  let raf = 0, running = true;
  const clock = new THREE.Clock();
  const tick = () => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const idle = performance.now() - lastTouch > 2500;
    const sway = autoSway && !reduce && !dragging && idle ? Math.sin(t * 0.35) * 0.32 : 0;
    yaw += (userYaw + sway - yaw) * Math.min(1, dt * 4);
    pivot.rotation.y = yaw;
    if (spin && !reduce && model.userData.rotor) model.userData.rotor.rotation.x += dt * 1.2;
    if (highlight) {
      const k = 0.5 + 0.5 * Math.sin(t * 7);
      highlight.forEach((m) => { m.emissiveIntensity = 0.25 + k * 0.9; });
    }
    renderer.render(scene, camera);
  };
  tick();

  return {
    setConfig(next) {
      pivot.remove(model);
      disposeTree(model);
      highlight = null;
      spin = true;
      model = buildTurbine(next);
      pivot.add(model);
    },
    // Fait clignoter un sous-ensemble (nom de groupe) en rouge charte ; le rotor s'arrête pour qu'on le voie bien.
    highlight(name) {
      const group = model.getObjectByName(name);
      if (!group) return;
      spin = false;
      highlight = [];
      group.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(PALETTE.red);
        highlight.push(o.material);
      });
    },
    resetView() { userYaw = 0; },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposeTree(model);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
