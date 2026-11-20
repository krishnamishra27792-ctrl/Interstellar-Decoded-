/**
 * Deep-Space 3D Diorama for "The Science Behind Interstellar"
 * Multi-layered universe with strong mouse-driven parallax, nebula clouds,
 * spiral galaxy, exoplanets, asteroid belt, shooting stars & Gargantua.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

(function () {
  const canvas = document.getElementById("cosmos");
  if (!canvas) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ---------- Scene & Camera ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    58, // Wider FOV for stronger 3D depth perception
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0.2, 16);

  // ---------- Theme colors ----------
  const themes = {
    light: {
      fog: new THREE.Color(0xf6f3ee),
      fogDensity: 0.0085,
      starBase: new THREE.Color(0x2a3048),
      starWarm: new THREE.Color(0x9a5818),
      starCool: new THREE.Color(0x3a5a88),
      diskInner: new THREE.Color(0xc87820),
      diskOuter: new THREE.Color(0xd4a060),
      halo: new THREE.Color(0xb86818),
      nebula1: new THREE.Color(0xd8b48a),
      nebula2: new THREE.Color(0x9cb4d0),
      planetMain: new THREE.Color(0x6e8299),
      planetRing: new THREE.Color(0xa88b68),
      dust: new THREE.Color(0x6a5040),
    },
    dark: {
      fog: new THREE.Color(0x090c18),
      fogDensity: 0.006,
      starBase: new THREE.Color(0xe8e4da),
      starWarm: new THREE.Color(0xffbe78),
      starCool: new THREE.Color(0x88b4ff),
      diskInner: new THREE.Color(0xf0a24a),
      diskOuter: new THREE.Color(0xffd68a),
      halo: new THREE.Color(0xf0a24a),
      nebula1: new THREE.Color(0x3b234a),
      nebula2: new THREE.Color(0x16325c),
      planetMain: new THREE.Color(0x4b6b8a),
      planetRing: new THREE.Color(0xc8a97e),
      dust: new THREE.Color(0xd8c0a0),
    },
  };

  let currentTheme = getThemeKey();
  let targetTheme = currentTheme;
  let themeT = 1;

  scene.fog = new THREE.FogExp2(themes[currentTheme].fog.getHex(), themes[currentTheme].fogDensity);

  function getThemeKey() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light") return "light";
    if (attr === "dark") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function lerpColor(a, b, t) {
    return a.clone().lerp(b, t);
  }

  // ---------- Procedural Soft Glow Texture ----------
  function makeRadialTexture(stops) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    const grd = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
    stops.forEach(([offset, color]) => grd.addColorStop(offset, color));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  const softGlowTex = makeRadialTexture([
    [0, "rgba(255,255,255,0.9)"],
    [0.25, "rgba(255,220,180,0.35)"],
    [0.6, "rgba(180,140,220,0.08)"],
    [1, "rgba(0,0,0,0)"],
  ]);

  // ---------- 1. Deep Multi-Layer Starfield (3D Parallax) ----------
  function createStarLayer(count, zMin, zMax, spreadX, spreadY, sizeMin, sizeMax, opacity) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const theme = themes[currentTheme];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
      positions[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);

      const temp = Math.random();
      const col =
        temp < 0.22
          ? theme.starWarm.clone()
          : temp > 0.78
          ? theme.starCool.clone()
          : theme.starBase.clone();

      const bright = 0.5 + Math.random() * 0.5;
      colors[i * 3] = col.r * bright;
      colors[i * 3 + 1] = col.g * bright;
      colors[i * 3 + 2] = col.b * bright;

      sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
      seeds[i] = Math.random() * 20;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float aSeed;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          float tw = sin(uTime * 1.4 + aSeed) * 0.22 + 0.78;
          vAlpha = tw;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (210.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uOpacity;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          // Star core + soft cross flare
          float core = smoothstep(0.5, 0.05, d);
          float flare = max(0.0, 1.0 - abs(uv.x * 9.0)) * max(0.0, 1.0 - abs(uv.y * 2.5))
                      + max(0.0, 1.0 - abs(uv.y * 9.0)) * max(0.0, 1.0 - abs(uv.x * 2.5));
          float a = (core + flare * 0.25) * vAlpha * uOpacity;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }

  const starsFar = createStarLayer(2600, -180, -70, 260, 160, 0.7, 1.8, 0.65);
  const starsMid = createStarLayer(1100, -70, -20, 130, 85, 1.0, 2.5, 0.8);
  const starsNear = createStarLayer(260, -18, 6, 48, 32, 0.8, 2.0, 0.55);
  scene.add(starsFar, starsMid, starsNear);

  // ---------- 2. Volumetric Cosmic Nebula Clouds ----------
  const nebulaGroup = new THREE.Group();
  const nebulaSprites = [];
  const nebulaConfigs = [
    { x: -16, y: 8, z: -55, scale: 48, colKey: "nebula1", rot: 0.2 },
    { x: 18, y: -9, z: -65, scale: 55, colKey: "nebula2", rot: -0.4 },
    { x: -4, y: -12, z: -48, scale: 42, colKey: "nebula1", rot: 0.8 },
    { x: 10, y: 12, z: -75, scale: 60, colKey: "nebula2", rot: 1.1 },
  ];

  nebulaConfigs.forEach((cfg) => {
    const mat = new THREE.SpriteMaterial({
      map: softGlowTex,
      color: themes[currentTheme][cfg.colKey],
      transparent: true,
      opacity: currentTheme === "dark" ? 0.32 : 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(cfg.x, cfg.y, cfg.z);
    sp.scale.set(cfg.scale, cfg.scale * 0.65, 1);
    sp.userData = { colKey: cfg.colKey, baseScale: cfg.scale, phase: Math.random() * 6 };
    nebulaGroup.add(sp);
    nebulaSprites.push(sp);
  });
  scene.add(nebulaGroup);

  // ---------- 3. Distant Spiral Galaxy ----------
  function createSpiralGalaxy() {
    const count = 1800;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const branches = 3;

    const cIn = new THREE.Color(0xffd29d);
    const cOut = new THREE.Color(0x6b93d6);

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * 7.5;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;
      const spinAngle = r * 0.85;

      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.65;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.25;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.65;

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      pos[i * 3 + 1] = randomY;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      const mixed = cIn.clone().lerp(cOut, r / 7.5);
      cols[i * 3] = mixed.r;
      cols[i * 3 + 1] = mixed.g;
      cols[i * 3 + 2] = mixed.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pts = new THREE.Points(geo, mat);
    pts.position.set(-19, 10, -52);
    pts.rotation.set(0.95, 0.3, -0.4);
    return pts;
  }

  const spiralGalaxy = createSpiralGalaxy();
  scene.add(spiralGalaxy);

  // ---------- 4. Exoplanet & Orbiting Moon (Left Mid-Deep Space) ----------
  const exoSystem = new THREE.Group();
  exoSystem.position.set(-10.5, -4.2, -26);
  exoSystem.rotation.z = 0.28;
  exoSystem.rotation.x = 0.22;

  const planetGeo = new THREE.SphereGeometry(1.45, 48, 36);
  const planetMat = new THREE.MeshStandardMaterial({
    color: themes[currentTheme].planetMain,
    roughness: 0.78,
    metalness: 0.08,
  });
  const exoPlanet = new THREE.Mesh(planetGeo, planetMat);
  exoSystem.add(exoPlanet);

  // Subtle atmospheric rim
  const atmoGeo = new THREE.SphereGeometry(1.54, 36, 24);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x88b8ff,
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide,
  });
  exoSystem.add(new THREE.Mesh(atmoGeo, atmoMat));

  // Delicate planetary ring
  const pRingGeo = new THREE.RingGeometry(1.9, 2.75, 72);
  const pRingMat = new THREE.MeshBasicMaterial({
    color: themes[currentTheme].planetRing,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pRing = new THREE.Mesh(pRingGeo, pRingMat);
  pRing.rotation.x = Math.PI / 2;
  exoSystem.add(pRing);

  // Orbiting Moon
  const moonPivot = new THREE.Group();
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.9 })
  );
  moonMesh.position.set(3.4, 0.2, 0);
  moonPivot.add(moonMesh);
  exoSystem.add(moonPivot);

  scene.add(exoSystem);

  // ---------- 5. Gargantua (Black Hole - Right Midground) ----------
  const gargantua = new THREE.Group();
  gargantua.position.set(6.8, 2.6, -21);
  gargantua.rotation.x = 0.34;
  gargantua.rotation.z = -0.2;
  scene.add(gargantua);

  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  gargantua.add(horizon);

  const haloMat = new THREE.MeshBasicMaterial({
    color: themes[currentTheme].halo,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.048, 16, 84), haloMat);
  halo.rotation.x = Math.PI / 2;
  gargantua.add(halo);

  // Gravitational lensed upper & lower vertical Einstein rings
  const lensVertical = new THREE.Mesh(
    new THREE.TorusGeometry(1.36, 0.032, 16, 84),
    haloMat
  );
  gargantua.add(lensVertical);

  const arcMat = new THREE.MeshBasicMaterial({
    color: themes[currentTheme].halo,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
  });
  const arc1 = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.02, 12, 64), arcMat);
  arc1.rotation.x = Math.PI / 2 + 0.08;
  gargantua.add(arc1);

  function makeDiskRing(inner, outer, opacity, color) {
    const geo = new THREE.RingGeometry(inner, outer, 96, 1);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  const diskGroup = new THREE.Group();
  const disk1 = makeDiskRing(1.45, 2.35, 0.62, themes[currentTheme].diskInner);
  const disk2 = makeDiskRing(2.3, 3.8, 0.36, themes[currentTheme].diskOuter);
  const disk3 = makeDiskRing(3.6, 5.4, 0.15, themes[currentTheme].diskOuter);
  diskGroup.add(disk1, disk2, disk3);
  gargantua.add(diskGroup);

  const glowMat = new THREE.SpriteMaterial({
    map: softGlowTex,
    color: themes[currentTheme].halo,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowSprite = new THREE.Sprite(glowMat);
  glowSprite.scale.set(11.5, 11.5, 1);
  glowSprite.position.z = -0.5;
  gargantua.add(glowSprite);

  // ---------- Lighting for 3D Planets & Asteroids ----------
  const keyLight = new THREE.DirectionalLight(0xffdfa8, 1.9);
  keyLight.position.set(8, 5, -14); // Light coming from Gargantua's direction
  scene.add(keyLight);

  const rimLight = new THREE.AmbientLight(0x4a5b7a, 0.65);
  scene.add(rimLight);

  // ---------- 6. 3D Floating Asteroid Belt ----------
  const asteroidGroup = new THREE.Group();
  const astGeo = new THREE.DodecahedronGeometry(0.16, 0);
  const astMat = new THREE.MeshStandardMaterial({
    color: 0x7c746c,
    roughness: 0.9,
    metalness: 0.1,
  });

  const asteroids = [];
  for (let i = 0; i < 42; i++) {
    const mesh = new THREE.Mesh(astGeo, astMat);
    const spread = 16 + Math.random() * 14;
    const angle = Math.random() * Math.PI * 2;
    mesh.position.set(
      Math.cos(angle) * spread,
      (Math.random() - 0.5) * 14,
      -8 - Math.random() * 26
    );
    const s = 0.35 + Math.random() * 1.35;
    mesh.scale.set(s, s * (0.6 + Math.random() * 0.6), s);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    asteroidGroup.add(mesh);
    asteroids.push({
      mesh,
      rx: (Math.random() - 0.5) * 0.6,
      ry: (Math.random() - 0.5) * 0.6,
      driftX: (Math.random() - 0.5) * 0.18,
      driftY: (Math.random() - 0.5) * 0.1,
    });
  }
  scene.add(asteroidGroup);

  // ---------- 7. Shooting Stars / Meteors ----------
  const meteors = [];
  function createMeteor() {
    const geo = new THREE.BufferGeometry();
    const pts = new Float32Array([0, 0, 0, -3.5, 1.4, -1.5]);
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffe4b5,
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return {
      line,
      mat,
      active: false,
      timer: 1.5 + Math.random() * 4,
      vel: new THREE.Vector3(),
      life: 0,
    };
  }
  for (let i = 0; i < 3; i++) meteors.push(createMeteor());

  // ---------- 8. Chapter-Reactive Geometry ----------
  // Spacetime geodesic grid (Gravity chapter)
  const gridGroup = new THREE.Group();
  gridGroup.visible = false;
  const gridMat = new THREE.LineBasicMaterial({
    color: 0xc89a4b,
    transparent: true,
    opacity: 0.22,
  });
  for (let i = -7; i <= 7; i++) {
    const ptsH = [];
    const ptsV = [];
    for (let j = -9; j <= 9; j++) {
      const x = i * 3.2;
      const z = j * 3.2;
      const y = -0.018 * (x * x + z * z);
      ptsH.push(new THREE.Vector3(x, y, z));
      ptsV.push(new THREE.Vector3(z, y, x));
    }
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsH), gridMat));
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsV), gridMat));
  }
  gridGroup.position.set(0, -5.2, -14);
  scene.add(gridGroup);

  // Wormhole portal (Wormholes chapter)
  const portal = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 28, 18),
    new THREE.MeshBasicMaterial({
      color: 0x8cc4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.24,
    })
  );
  portal.position.set(-5.2, 2.2, -16);
  portal.visible = false;
  scene.add(portal);

  // 4D Tesseract (Tesseract chapter)
  function createTesseract() {
    const group = new THREE.Group();
    const s = 1.5;
    const offsets = [
      [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
      [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
    ];
    const scaleInner = 0.6;
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const mat = new THREE.LineBasicMaterial({ color: 0xf0c270, transparent: true, opacity: 0.45 });

    [scaleInner, 1.0].forEach((sc) => {
      const pts = offsets.map(([x, y, z]) => new THREE.Vector3(x * sc, y * sc, z * sc));
      edges.forEach(([a, b]) => {
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pts[a], pts[b]]), mat));
      });
    });
    for (let i = 0; i < 8; i++) {
      const p1 = new THREE.Vector3(offsets[i][0] * scaleInner, offsets[i][1] * scaleInner, offsets[i][2] * scaleInner);
      const p2 = new THREE.Vector3(offsets[i][0], offsets[i][1], offsets[i][2]);
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), mat));
    }
    return group;
  }
  const tesseract = createTesseract();
  tesseract.position.set(-4.6, 2.4, -14);
  tesseract.visible = false;
  scene.add(tesseract);

  // ---------- 9. Foreground Cosmic Dust (Closest Z-Plane for Depth) ----------
  const dustCount = 240;
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = [];
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 32;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    dustPos[i * 3 + 2] = 3 + Math.random() * 10; // Very close to camera (Z: 3..13)
    dustVel.push({
      x: (Math.random() - 0.5) * 0.008,
      y: (Math.random() - 0.5) * 0.006,
      z: (Math.random() - 0.5) * 0.004,
    });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: themes[currentTheme].dust,
    size: 0.085,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ---------- Chapter State & Camera Fly-Through ----------
  const chapterState = {
    gargOpacity: 1,
    gridOpacity: 0,
    portalOpacity: 0,
    tesseractOpacity: 0,
    diskSpin: 0.12,
    timeStretch: 0,
    camZ: 16,
  };

  const chapterTargets = {
    title:      { garg: 1.0,  grid: 0, portal: 0, tess: 0, spin: 0.14, stretch: 0, camZ: 15.2 },
    intro:      { garg: 0.65, grid: 0, portal: 0, tess: 0, spin: 0.08, stretch: 0, camZ: 16.5 },
    gravity:    { garg: 0.75, grid: 1, portal: 0, tess: 0, spin: 0.09, stretch: 0, camZ: 15.8 },
    blackholes: { garg: 1.0,  grid: 0, portal: 0, tess: 0, spin: 0.18, stretch: 0, camZ: 14.5 },
    time:       { garg: 0.9,  grid: 0, portal: 0, tess: 0, spin: 0.10, stretch: 1, camZ: 15.5 },
    wormholes:  { garg: 0.5,  grid: 0, portal: 1, tess: 0, spin: 0.07, stretch: 0, camZ: 15.6 },
    travel:     { garg: 0.55, grid: 0, portal: 0, tess: 0, spin: 0.07, stretch: 0, camZ: 16.2 },
    tesseract:  { garg: 0.45, grid: 0, portal: 0, tess: 1, spin: 0.06, stretch: 0, camZ: 15.0 },
    earth:      { garg: 0.4,  grid: 0, portal: 0, tess: 0, spin: 0.05, stretch: 0, camZ: 16.8 },
    verdict:    { garg: 0.65, grid: 0, portal: 0, tess: 0, spin: 0.08, stretch: 0, camZ: 16.0 },
    glossary:   { garg: 0.4,  grid: 0, portal: 0, tess: 0, spin: 0.05, stretch: 0, camZ: 17.0 },
    reading:    { garg: 0.4,  grid: 0, portal: 0, tess: 0, spin: 0.05, stretch: 0, camZ: 17.0 },
  };

  window.setCosmosChapter = function (id) {
    if (!chapterTargets[id]) id = "intro";
    chapterState._target = chapterTargets[id];
  };
  window.setCosmosChapter("title");

  // ---------- Mouse, Touch & Scroll Parallax ----------
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const scroll = { y: 0, ty: 0 };

  window.addEventListener(
    "mousemove",
    (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 0) {
        mouse.tx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll.ty = max > 0 ? window.scrollY / max : 0;
    },
    { passive: true }
  );

  // ---------- Theme Observer ----------
  const themeObserver = new MutationObserver(() => {
    targetTheme = getThemeKey();
    themeT = 0;
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!document.documentElement.getAttribute("data-theme")) {
      targetTheme = getThemeKey();
      themeT = 0;
    }
  });

  // ---------- Resize ----------
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (w < 820) {
      gargantua.position.set(3.5, 4.2, -23);
      exoSystem.position.set(-4.5, -5.0, -28);
    } else {
      gargantua.position.set(6.8, 2.6, -21);
      exoSystem.position.set(-10.5, -4.2, -26);
    }
  }
  window.addEventListener("resize", onResize);
  onResize();

  // ---------- Apply Theme ----------
  function applyTheme(t) {
    const from = themes[currentTheme];
    const to = themes[targetTheme];
    scene.fog.color.copy(lerpColor(from.fog, to.fog, t));
    scene.fog.density = THREE.MathUtils.lerp(from.fogDensity, to.fogDensity, t);

    haloMat.color.copy(lerpColor(from.halo, to.halo, t));
    arcMat.color.copy(lerpColor(from.halo, to.halo, t));
    glowMat.color.copy(lerpColor(from.halo, to.halo, t));
    disk1.material.color.copy(lerpColor(from.diskInner, to.diskInner, t));
    disk2.material.color.copy(lerpColor(from.diskOuter, to.diskOuter, t));
    disk3.material.color.copy(lerpColor(from.diskOuter, to.diskOuter, t));
    planetMat.color.copy(lerpColor(from.planetMain, to.planetMain, t));
    pRingMat.color.copy(lerpColor(from.planetRing, to.planetRing, t));
    dustMat.color.copy(lerpColor(from.dust, to.dust, t));

    const targetNebulaOpacity = targetTheme === "dark" ? 0.32 : 0.16;
    const fromNebulaOpacity = currentTheme === "dark" ? 0.32 : 0.16;
    nebulaSprites.forEach((sp) => {
      const key = sp.userData.colKey;
      sp.material.color.copy(lerpColor(from[key], to[key], t));
      sp.material.opacity = THREE.MathUtils.lerp(fromNebulaOpacity, targetNebulaOpacity, t);
    });

    if (t >= 1) currentTheme = targetTheme;
  }

  // ---------- Animation Loop ----------
  let last = performance.now();
  let running = true;
  let time = 0;

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) last = performance.now();
  });

  function animate(now) {
    requestAnimationFrame(animate);
    if (!running && !prefersReduced) return;

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    if (themeT < 1) {
      themeT = Math.min(1, themeT + dt / 0.8);
      applyTheme(themeT);
    }

    const tgt = chapterState._target || chapterTargets.title;
    const k = 1 - Math.exp(-dt * 2.4);
    chapterState.gargOpacity += (tgt.garg - chapterState.gargOpacity) * k;
    chapterState.gridOpacity += (tgt.grid - chapterState.gridOpacity) * k;
    chapterState.portalOpacity += (tgt.portal - chapterState.portalOpacity) * k;
    chapterState.tesseractOpacity += (tgt.tess - chapterState.tesseractOpacity) * k;
    chapterState.diskSpin += (tgt.spin - chapterState.diskSpin) * k;
    chapterState.timeStretch += (tgt.stretch - chapterState.timeStretch) * k;
    chapterState.camZ += (tgt.camZ - chapterState.camZ) * k;

    const gOp = chapterState.gargOpacity;
    disk1.material.opacity = 0.62 * gOp;
    disk2.material.opacity = 0.36 * gOp;
    disk3.material.opacity = 0.15 * gOp;
    haloMat.opacity = 0.9 * gOp;
    arcMat.opacity = 0.36 * gOp;
    glowMat.opacity = 0.65 * gOp;
    horizon.visible = gOp > 0.05;

    gridGroup.visible = chapterState.gridOpacity > 0.02;
    gridMat.opacity = 0.22 * chapterState.gridOpacity;

    portal.visible = chapterState.portalOpacity > 0.02;
    portal.material.opacity = 0.24 * chapterState.portalOpacity;

    tesseract.visible = chapterState.tesseractOpacity > 0.02;
    tesseract.traverse((c) => {
      if (c.material) c.material.opacity = 0.45 * chapterState.tesseractOpacity;
    });

    if (!prefersReduced) {
      // 1. Gargantua & Accretion Disk Animation
      diskGroup.rotation.z += chapterState.diskSpin * dt;
      halo.rotation.z += chapterState.diskSpin * 0.45 * dt;
      lensVertical.rotation.z -= chapterState.diskSpin * 0.25 * dt;
      gargantua.position.y += Math.sin(time * 0.6) * 0.0018;

      if (chapterState.timeStretch > 0.01) {
        const s = 1 + Math.sin(time * 0.8) * 0.055 * chapterState.timeStretch;
        diskGroup.scale.set(s, 1, s);
      } else {
        diskGroup.scale.set(1, 1, 1);
      }

      // 2. Exoplanet & Moon Orbit
      exoPlanet.rotation.y += 0.08 * dt;
      moonPivot.rotation.y += 0.35 * dt;
      exoSystem.position.y += Math.cos(time * 0.5) * 0.0015;

      // 3. Spiral Galaxy Slow Cosmic Rotation
      spiralGalaxy.rotation.y += 0.025 * dt;

      // 4. Nebula Breathing Motion
      nebulaSprites.forEach((sp) => {
        const pulse = 1 + Math.sin(time * 0.35 + sp.userData.phase) * 0.04;
        sp.scale.set(sp.userData.baseScale * pulse, sp.userData.baseScale * 0.65 * pulse, 1);
      });

      // 5. Asteroid Belt Drift & Tumble
      asteroids.forEach((a) => {
        a.mesh.rotation.x += a.rx * dt;
        a.mesh.rotation.y += a.ry * dt;
        a.mesh.position.x += a.driftX * dt;
        a.mesh.position.y += a.driftY * dt;
        if (a.mesh.position.x > 26) a.mesh.position.x = -26;
        if (a.mesh.position.x < -26) a.mesh.position.x = 26;
      });

      // 6. Shooting Stars
      meteors.forEach((m) => {
        if (!m.active) {
          m.timer -= dt;
          if (m.timer <= 0) {
            m.active = true;
            m.life = 0;
            m.line.position.set(
              (Math.random() - 0.3) * 28,
              8 + Math.random() * 10,
              -15 - Math.random() * 35
            );
            m.vel.set(18 + Math.random() * 10, -7 - Math.random() * 4, 4);
          }
        } else {
          m.life += dt;
          m.line.position.addScaledVector(m.vel, dt);
          m.mat.opacity = Math.sin(Math.min(m.life / 0.75, 1) * Math.PI) * 0.75;
          if (m.life >= 0.75) {
            m.active = false;
            m.mat.opacity = 0;
            m.timer = 3 + Math.random() * 6;
          }
        }
      });

      // 7. Chapter Geometries
      if (portal.visible) {
        portal.rotation.y += 0.16 * dt;
        portal.rotation.x += 0.07 * dt;
      }
      if (tesseract.visible) {
        tesseract.rotation.y += 0.22 * dt;
        tesseract.rotation.x += 0.09 * dt;
      }

      // 8. Star Twinkle & Slow Cosmic Drift
      starsFar.material.uniforms.uTime.value = time;
      starsMid.material.uniforms.uTime.value = time * 1.2;
      starsNear.material.uniforms.uTime.value = time * 1.5;
      starsFar.rotation.y = time * 0.004;
      starsMid.rotation.y = time * 0.008;

      // 9. Foreground Dust Drift
      const pos = dust.geometry.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        pos[i * 3] += dustVel[i].x;
        pos[i * 3 + 1] += dustVel[i].y;
        pos[i * 3 + 2] += dustVel[i].z;
        if (pos[i * 3] > 16) pos[i * 3] = -16;
        if (pos[i * 3] < -16) pos[i * 3] = 16;
        if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = -10;
        if (pos[i * 3 + 1] < -10) pos[i * 3 + 1] = 10;
      }
      dust.geometry.attributes.position.needsUpdate = true;

      // 10. Strong 3D Mouse Parallax & Camera Orbit
      mouse.x += (mouse.tx - mouse.x) * 0.055;
      mouse.y += (mouse.ty - mouse.y) * 0.055;
      scroll.y += (scroll.ty - scroll.y) * 0.06;

      // Deep camera translation + subtle roll for true 3D window effect
      camera.position.x = mouse.x * 2.4;
      camera.position.y = 0.2 - mouse.y * 1.5 - scroll.y * 1.8;
      camera.position.z = chapterState.camZ - Math.abs(mouse.x) * 0.45;
      camera.rotation.z = -mouse.x * 0.025;
      camera.lookAt(mouse.x * 0.6, -mouse.y * 0.35 - scroll.y * 0.7, -14);
    }

    renderer.render(scene, camera);
  }

  if (prefersReduced) {
    applyTheme(1);
    renderer.render(scene, camera);
  } else {
    requestAnimationFrame(animate);
  }
})();
