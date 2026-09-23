import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeFacade, scaleBoxUVs, reseed } from './textures';

export interface CityHandles {
  /** buildT 0..1 drives construction growth */
  update: (buildT: number, dt: number, time: number) => void;
  setDusk: (dusk: number) => void;
  setConstructionFxVisible: (v: boolean) => void;
  dispose: () => void;
  glowMaterials: THREE.MeshStandardMaterial[];
  /** world position of construction focus (for camera) */
  focus: THREE.Vector3;
}

interface Lot {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  minH: number;
  stagger: number;
  bucket: number;
  variant: 0 | 1 | 2;
  tint: THREE.Color;
  idxInBucket: number;
}

const STREET_HALF = 6; // avenue z=-8 half-width
const CANAL_Z = 38;

export function buildCity(scene: THREE.Scene): CityHandles {
  reseed(20270915);
  const rng = () => Math.random();

  const HERO_ANCHORS: [number, number][] = [
    [0, -16],
    [-34, 2],
    [34, 26],
  ];

  // ---------- master materials ----------
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd6d2c7, roughness: 0.95 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.92 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xc9c5ba, roughness: 0.9 });
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xd8d5cc });
  const lawnMat = new THREE.MeshStandardMaterial({ color: 0x4c8a58, roughness: 0.95 });
  const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x9a6f4a, roughness: 0.75 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe0dccf, roughness: 0.8 });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xb9b2a4, roughness: 0.9 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x8f6a44, roughness: 0.4, metalness: 0.7 });
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.55, metalness: 0.35 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x272b31, roughness: 0.6, metalness: 0.4 });

  // ---------- ground ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- street network (merged → few draw calls) ----------
  const asphaltParts: THREE.BufferGeometry[] = [];
  const sidewalkParts: THREE.BufferGeometry[] = [];
  const laneParts: THREE.BufferGeometry[] = [];

  const addRoad = (cx: number, cz: number, len: number, w: number, ns: boolean) => {
    const g = new THREE.BoxGeometry(ns ? w : len, 0.08, ns ? len : w);
    g.translate(cx, 0.04, cz);
    asphaltParts.push(g);
    for (const side of [-1, 1]) {
      const sw = new THREE.BoxGeometry(ns ? 1.6 : len, 0.12, ns ? len : 1.6);
      sw.translate(ns ? cx + side * (w / 2 + 0.8) : cx, 0.06, ns ? cz : cz + side * (w / 2 + 0.8));
      sidewalkParts.push(sw);
    }
    // dashed center line
    const dashCount = Math.floor(len / 10);
    for (let i = 0; i < dashCount; i++) {
      const t = -len / 2 + i * 10 + 4;
      const dg = new THREE.PlaneGeometry(ns ? 0.3 : 4, ns ? 4 : 0.3);
      dg.rotateX(-Math.PI / 2);
      dg.translate(ns ? cx : cx + t, 0.1, ns ? cz + t : cz);
      laneParts.push(dg);
    }
  };

  addRoad(0, -8, 330, 12, false); // grand avenue EW
  addRoad(0, -58, 330, 9, false);
  addRoad(-58, -10, 220, 9, true);
  addRoad(58, -10, 220, 9, true);

  // canal quays + promenade
  const quayN = new THREE.Mesh(new THREE.BoxGeometry(430, 1.6, 2), stoneMat);
  quayN.position.set(0, 0.8, CANAL_Z - 9.5);
  quayN.castShadow = true;
  scene.add(quayN);
  const quayS = quayN.clone();
  quayS.position.z = CANAL_Z + 9.5;
  scene.add(quayS);

  const promenade = new THREE.Mesh(new THREE.BoxGeometry(430, 0.18, 6.5), woodDeckMat);
  promenade.position.set(0, 0.14, CANAL_Z - 13.5);
  promenade.receiveShadow = true;
  scene.add(promenade);

  // bridges at NS avenues
  for (const bx of [-58, 58]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(11, 1, 22), stoneMat);
    deck.position.set(bx, 1.35, CANAL_Z);
    deck.castShadow = true;
    scene.add(deck);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 22), bronzeMat);
      rail.position.set(bx + side * 5.2, 2.3, CANAL_Z);
      scene.add(rail);
    }
  }

  const streetsMerged = [
    mergeGeometries(asphaltParts)!,
    mergeGeometries(sidewalkParts)!,
    mergeGeometries(laneParts)!,
  ];
  const asphaltMesh = new THREE.Mesh(streetsMerged[0], asphaltMat);
  asphaltMesh.receiveShadow = true;
  scene.add(asphaltMesh);
  scene.add(new THREE.Mesh(streetsMerged[1], sidewalkMat));
  scene.add(new THREE.Mesh(streetsMerged[2], laneMat));

  // ---------- park ----------
  const park = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(46, 0.25, 30), lawnMat);
  lawn.position.set(-8, 0.12, -32);
  lawn.receiveShadow = true;
  park.add(lawn);
  const path = new THREE.Mesh(new THREE.BoxGeometry(44, 0.3, 2.2), sidewalkMat);
  path.position.set(-8, 0.16, -32);
  park.add(path);
  const path2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 28), sidewalkMat);
  path2.position.set(-8, 0.16, -32);
  park.add(path2);
  scene.add(park);

  // ---------- building lots ----------
  const lots: Lot[] = [];
  const xs = [-148, -122, -96, -82, -58, -32, -6, 20, 46, 72, 98, 124, 148];
  const zs = [-104, -80, -58, -34, -14, 14, 58, 80, 104];

  const nearHero = (x: number, z: number) =>
    HERO_ANCHORS.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 26);

  const inPark = (x: number, z: number) => x > -34 && x < 18 && z > -50 && z < -14;

  for (const bz of zs) {
    for (const bx of xs) {
      const x = bx + (rng() - 0.5) * 6;
      const z = bz + (rng() - 0.5) * 5;
      if (Math.abs(z - CANAL_Z) < 22) continue;
      if (Math.abs(z + 8) < STREET_HALF + 4) continue;
      if (Math.abs(z + 58) < 9) continue; // boulevard row
      if (Math.abs(Math.abs(x) - 58) < 9.5) continue; // NS avenues
      if (nearHero(x, z)) continue;
      if (inPark(x, z)) continue;

      const dist = Math.hypot(x * 0.85, z + 8);
      let h: number;
      let variant: 0 | 1 | 2;
      if (dist < 62) {
        h = 30 + rng() * 38;
        variant = rng() < 0.55 ? 0 : rng() < 0.5 ? 1 : 2;
      } else if (z > 52) {
        h = 9 + rng() * 12;
        variant = rng() < 0.4 ? 1 : 2;
      } else {
        h = 15 + rng() * 22;
        variant = rng() < 0.3 ? 0 : rng() < 0.55 ? 1 : 2;
      }

      lots.push({
        x,
        z,
        w: 12 + rng() * 7,
        d: 12 + rng() * 7,
        h,
        minH: 0.001,
        stagger: rng() * 0.55,
        bucket: Math.round(h / 8) * 8,
        variant,
        tint: new THREE.Color().setHSL(0.08 + rng() * 0.05, 0.05 + rng() * 0.12, 0.82 + rng() * 0.12),
        idxInBucket: 0,
      });
    }
  }

  // group into (variant, bucket) instanced meshes with pre-scaled UVs
  const facadeSets = [makeFacade('curtain'), makeFacade('stone'), makeFacade('grid')];
  const glowMaterials: THREE.MeshStandardMaterial[] = [];
  const bucketKey = (v: number, b: number) => `${v}:${b}`;
  const groups = new Map<string, Lot[]>();
  for (const lot of lots) {
    const k = bucketKey(lot.variant, lot.bucket);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(lot);
  }

  const facadeGroups: { mesh: THREE.InstancedMesh; lots: Lot[]; bucketH: number }[] = [];
  const dummy = new THREE.Object3D();
  const BASE_FOOT = 16;

  for (const [key, groupLots] of groups) {
    const [vStr, bStr] = key.split(':');
    const v = Number(vStr);
    const H = Number(bStr);
    const geo = new THREE.BoxGeometry(BASE_FOOT, H, BASE_FOOT);
    geo.translate(0, H / 2, 0);
    scaleBoxUVs(geo, BASE_FOOT, H, BASE_FOOT, 5.2, 3.6);
    const set = facadeSets[v];
    const mat = new THREE.MeshStandardMaterial({
      map: set.map,
      emissiveMap: set.emissive,
      emissive: new THREE.Color(0xffc890),
      emissiveIntensity: 0,
      roughness: v === 0 ? 0.25 : 0.8,
      metalness: v === 0 ? 0.5 : 0.05,
    });
    glowMaterials.push(mat);
    const mesh = new THREE.InstancedMesh(geo, mat, groupLots.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    groupLots.forEach((lot, i) => {
      lot.idxInBucket = i;
      dummy.position.set(lot.x, 0, lot.z);
      dummy.scale.set(0.0001, 0.0001, 0.0001);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, lot.tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    facadeGroups.push({ mesh, lots: groupLots, bucketH: H });
  }

  // construction cores (one instanced mesh for every lot)
  const coreGeo = new THREE.BoxGeometry(1, 1, 1);
  coreGeo.translate(0, 0.5, 0);
  const coreMesh = new THREE.InstancedMesh(coreGeo, coreMat, lots.length);
  coreMesh.castShadow = true;
  lots.forEach((lot, i) => {
    dummy.position.set(lot.x, 0, lot.z);
    dummy.scale.set(0.0001, 0.0001, 0.0001);
    dummy.updateMatrix();
    coreMesh.setMatrixAt(i, dummy.matrix);
  });
  scene.add(coreMesh);

  // rooftop props (AC units + tanks) — appear with the facade
  const acGeo = new THREE.BoxGeometry(2.2, 1.2, 2.2);
  const tankGeo = new THREE.CylinderGeometry(1, 1, 2.4, 8);
  const propMat = darkMetalMat;
  const acMesh = new THREE.InstancedMesh(acGeo, propMat, lots.length);
  const tankMesh = new THREE.InstancedMesh(tankGeo, propMat, lots.length);
  scene.add(acMesh);
  scene.add(tankMesh);
  let acCount = 0;
  let tankCount = 0;
  lots.forEach((lot, i) => {
    const hasAC = rng() < 0.5;
    dummy.position.set(lot.x + (rng() - 0.5) * lot.w * 0.4, 0, lot.z + (rng() - 0.5) * lot.d * 0.4);
    dummy.scale.set(0.0001, 0.0001, 0.0001);
    dummy.updateMatrix();
    if (hasAC && acCount < lots.length) {
      acMesh.setMatrixAt(acCount++, dummy.matrix);
      (lot as Lot & { acIdx?: number }).acIdx = acCount - 1;
    } else if (tankCount < lots.length) {
      tankMesh.setMatrixAt(tankCount++, dummy.matrix);
      (lot as Lot & { tankIdx?: number }).tankIdx = tankCount - 1;
    }
    void i;
  });
  acMesh.count = acCount;
  tankMesh.count = tankCount;

  // ---------- trees ----------
  const treeSpots: [number, number][] = [];
  for (let i = 0; i < 44; i++) {
    treeSpots.push([-29 + rng() * 42, -46 + rng() * 26]);
  }
  for (let x = -96; x <= 96; x += 13) {
    treeSpots.push([x + (rng() - 0.5) * 2, -8 + 8.4]);
    treeSpots.push([x + (rng() - 0.5) * 2, -8 - 8.4]);
  }
  for (let x = -84; x <= 84; x += 17) {
    treeSpots.push([x + (rng() - 0.5) * 2, CANAL_Z - 17.2]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.2, 2.4, 5);
  trunkGeo.translate(0, 1.2, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.5, 1);
  crownGeo.translate(0, 3.4, 0);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x57443a, roughness: 0.9 }), treeSpots.length);
  // white base — the instance color carries the green (instanceColor multiplies)
  const crownMesh = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), treeSpots.length);
  crownMesh.castShadow = true;
  treeSpots.forEach(([tx, tz], i) => {
    const s = 0.8 + rng() * 0.9;
    dummy.position.set(tx, 0, tz);
    dummy.scale.set(s, s + rng() * 0.5, s);
    dummy.rotation.y = rng() * Math.PI;
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    crownMesh.setMatrixAt(i, dummy.matrix);
    crownMesh.setColorAt(i, new THREE.Color().setHSL(0.3 + rng() * 0.08, 0.36 + rng() * 0.2, 0.4 + rng() * 0.18));
  });
  scene.add(trunkMesh, crownMesh);

  // ---------- street lamps ----------
  const lampSpots: [number, number][] = [];
  for (let x = -96; x <= 96; x += 16) lampSpots.push([x, -8 + 7.6]);
  for (let x = -80; x <= 80; x += 22) lampSpots.push([x, CANAL_Z - 11]);
  const lampPoleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6);
  lampPoleGeo.translate(0, 2.6, 0);
  const lampHeadGeo = new THREE.SphereGeometry(0.3, 8, 8);
  lampHeadGeo.translate(0, 5.1, 0);
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff2d8,
    emissive: new THREE.Color(0xffbe78),
    emissiveIntensity: 0,
  });
  glowMaterials.push(lampGlowMat);
  const lampPoles = new THREE.InstancedMesh(lampPoleGeo, darkMetalMat, lampSpots.length);
  const lampHeads = new THREE.InstancedMesh(lampHeadGeo, lampGlowMat, lampSpots.length);
  lampSpots.forEach(([lx, lz], i) => {
    dummy.position.set(lx, 0, lz);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    lampPoles.setMatrixAt(i, dummy.matrix);
    lampHeads.setMatrixAt(i, dummy.matrix);
  });
  scene.add(lampPoles, lampHeads);

  // ---------- traffic ----------
  interface Car {
    axis: 'x' | 'z';
    fixed: number;
    dir: 1 | -1;
    speed: number;
    pos: number;
    idx: number;
    min: number;
    max: number;
  }
  const cars: Car[] = [];
  for (let i = 0; i < 16; i++) {
    const ew = i < 10;
    cars.push({
      axis: ew ? 'x' : 'z',
      fixed: ew ? (i % 2 === 0 ? -4.6 : -11.4) : i % 2 === 0 ? 54.6 : 61.4,
      dir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
      speed: 9 + rng() * 8,
      pos: -160 + rng() * 320,
      idx: i,
      // NS avenue stops at the canal — loop back
      min: ew ? -175 : -160,
      max: ew ? 175 : 16,
    });
  }
  const carGeo = new THREE.BoxGeometry(3.9, 1.25, 1.9);
  carGeo.translate(0, 0.75, 0);
  const carPalette = [0x22262e, 0xb8bcc4, 0x7a2e1d, 0x2f4a68, 0xd8d3c8];
  const carMesh = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), cars.length);
  carMesh.castShadow = true;
  cars.forEach((c, i) => carMesh.setColorAt(i, new THREE.Color(carPalette[i % carPalette.length])));
  // head/tail glow spheres
  const headGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff6da, transparent: true, opacity: 0 });
  const tailGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0 });
  const glowGeo = new THREE.SphereGeometry(0.28, 6, 6);
  const headGlows = new THREE.InstancedMesh(glowGeo, headGlowMat, cars.length);
  const tailGlows = new THREE.InstancedMesh(glowGeo, tailGlowMat, cars.length);
  scene.add(carMesh, headGlows, tailGlows);

  // ---------- canal boats ----------
  const boats: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.1, 2.4), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.4 }));
    hull.position.y = 0.55;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1, 1.7), new THREE.MeshStandardMaterial({ color: 0x2b3a48, roughness: 0.3, metalness: 0.4 }));
    cabin.position.set(-0.6, 1.5, 0);
    boat.add(hull, cabin);
    boat.position.set(-80 + i * 70, 0.32, CANAL_Z + (i % 2 === 0 ? -3 : 3));
    boat.rotation.y = Math.PI / 2 + (i % 2 === 0 ? 0 : Math.PI);
    scene.add(boat);
    boats.push(boat);
  }

  // ---------- metro pavilion + roastery ----------
  const metro = new THREE.Group();
  const metroGlass = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x88a8c0, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.7 })
  );
  metroGlass.position.y = 1.6;
  const metroPylon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), darkMetalMat);
  metroPylon.position.set(6, 3.5, 0);
  const metroSignMat = new THREE.MeshStandardMaterial({
    color: 0xe65100,
    emissive: new THREE.Color(0xff6a1a),
    emissiveIntensity: 0,
  });
  glowMaterials.push(metroSignMat);
  const metroSign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.3), metroSignMat);
  metroSign.position.set(6, 6.4, 0);
  metro.add(metroGlass, metroPylon, metroSign);
  metro.position.set(-40, 0, -15.5);
  metro.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  scene.add(metro);

  const roastery = new THREE.Group();
  const roastBody = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 7), new THREE.MeshStandardMaterial({ color: 0xcabfae, roughness: 0.8 }));
  roastBody.position.y = 2;
  const roastWinMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f46,
    emissive: new THREE.Color(0xffc27a),
    emissiveIntensity: 0,
  });
  glowMaterials.push(roastWinMat);
  const roastWin = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2, 7.4), roastWinMat);
  roastWin.position.y = 1.8;
  const awning = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.3, 3), new THREE.MeshStandardMaterial({ color: 0xb33a21, roughness: 0.7 }));
  awning.position.set(0, 3.2, 4.6);
  roastery.add(roastBody, roastWin, awning);
  roastery.position.set(22, 0, -13);
  roastery.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  scene.add(roastery);

  // ---------- tower cranes at hero plots ----------
  interface Crane {
    root: THREE.Group;
    slew: THREE.Group;
    trolley: THREE.Object3D;
    hook: THREE.Object3D;
    cable: THREE.Mesh;
    beaconMat: THREE.MeshBasicMaterial;
    phase: number;
    doneAt: number;
    dead: boolean;
  }
  const cranes: Crane[] = [];
  const craneSpots: { x: number; z: number; h: number; doneAt: number }[] = [
    { x: 14, z: -24, h: 92, doneAt: 0.86 },
    { x: -46, z: 10, h: 62, doneAt: 0.72 },
    { x: 44, z: 18, h: 40, doneAt: 0.55 },
  ];
  craneSpots.forEach((cs, ci) => {
    const root = new THREE.Group();
    root.position.set(cs.x, 0, cs.z);
    const mastH = cs.h;
    const jibL = 26;

    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.1, mastH, 1.1), craneMat);
    mast.position.y = mastH / 2;
    mast.castShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 4.4), darkMetalMat);
    base.position.y = 0.7;
    root.add(mast, base);

    const slew = new THREE.Group();
    slew.position.y = mastH;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 1.6), darkMetalMat);
    cab.position.set(1.4, 0.9, 0);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(jibL, 0.7, 0.7), craneMat);
    jib.position.set(jibL / 2 - 1, 1.4, 0);
    const cjib = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 0.7), craneMat);
    cjib.position.set(-5.5, 1.4, 0);
    const weight = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 1.6), darkMetalMat);
    weight.position.set(-8, 0.4, 0);
    const apex = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.6, 4), craneMat);
    apex.position.set(0, 3.8, 0);
    // tie bars
    const tieMat = darkMetalMat;
    const tie1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 24, 4), tieMat);
    tie1.position.set(9.5, 3.6, 0);
    tie1.rotation.z = Math.PI / 2 - Math.atan2(5.6, 19);
    const tie2 = tie1.clone();
    tie2.scale.y = 0.45;
    tie2.position.set(-4, 3.4, 0);
    tie2.rotation.z = -(Math.PI / 2 - Math.atan2(5.2, 8));

    const beaconMatl = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), beaconMatl);
    beacon.position.set(0, 6.2, 0);

    const trolley = new THREE.Group();
    trolley.position.set(jibL * 0.6, 1.4, 0);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 10, 4), tieMat);
    cable.position.y = -5;
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), craneMat);
    hook.position.y = -10;
    const load = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), coreMat);
    load.position.y = -11;
    trolley.add(cable, hook, load);

    slew.add(cab, jib, cjib, weight, apex, tie1, tie2, beacon, trolley);
    root.add(slew);
    scene.add(root);
    cranes.push({ root, slew, trolley, hook, cable, beaconMat: beaconMatl, phase: ci * 2.1, doneAt: cs.doneAt, dead: false });
  });

  // ---------- ground-works site kit (visible before construction starts) ----------
  // excavation pits, retaining edges, site trailers, dirt mounds, safety fence
  const pitMat = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 1 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 1 });
  const trailerMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.6 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.7 });
  const siteKit = new THREE.Group();
  HERO_ANCHORS.forEach(([hx, hz]) => {
    // excavation pit + rim
    const pit = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 24), pitMat);
    pit.position.set(hx, 0.28, hz);
    siteKit.add(pit);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 26), dirtMat);
    rim.position.set(hx, 0.1, hz);
    siteKit.add(rim);
    // dirt mounds
    for (let m = 0; m < 3; m++) {
      const mound = new THREE.Mesh(new THREE.ConeGeometry(2.4 + rng() * 1.6, 2.2 + rng() * 1.4, 7), dirtMat);
      mound.position.set(hx + 16 + rng() * 6, 1, hz - 10 + rng() * 20);
      mound.castShadow = true;
      siteKit.add(mound);
    }
  });
  // site cabins row
  for (let t = 0; t < 4; t++) {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.6), trailerMat);
    cabin.position.set(-14 + t * 7, 1.3, 19);
    cabin.castShadow = true;
    siteKit.add(cabin);
  }
  // safety fence along the south district boundary
  const fenceParts: THREE.BufferGeometry[] = [];
  for (let x = -66; x <= 24; x += 5) {
    const post = new THREE.BoxGeometry(0.12, 1.1, 0.12);
    post.translate(x, 0.55, -52);
    fenceParts.push(post);
  }
  const rail = new THREE.BoxGeometry(92, 0.08, 0.08);
  rail.translate(-21, 1.0, -52);
  fenceParts.push(rail);
  const rail2 = new THREE.BoxGeometry(92, 0.08, 0.08);
  rail2.translate(-21, 0.45, -52);
  fenceParts.push(rail2);
  const fenceMesh = new THREE.Mesh(mergeGeometries(fenceParts)!, fenceMat);
  siteKit.add(fenceMesh);
  scene.add(siteKit);

  // ---------- construction dust particles ----------
  const DUST_COUNT = 260;
  const dustPos = new Float32Array(DUST_COUNT * 3);
  const dustLife = new Float32Array(DUST_COUNT).fill(1);
  const dustVel = new Float32Array(DUST_COUNT * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aLife', new THREE.BufferAttribute(dustLife, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uSize: { value: 5.5 } },
    vertexShader: /* glsl */ `
      attribute float aLife;
      varying float vLife;
      uniform float uSize;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (0.5 + aLife) * (120.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * (1.0 - vLife) * 0.5;
        gl_FragColor = vec4(0.82, 0.78, 0.7, a);
      }
    `,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);
  let dustCursor = 0;

  const focus = new THREE.Vector3(0, 20, -10);

  // ---------- per-frame update ----------
  const smooth = (t: number) => t * t * (3 - 2 * t);

  let lastBuildT = -1;

  const update = (buildT: number, dt: number, time: number) => {
    // --- lots growth (cores) ---
    const growingLots: { lot: Lot; top: number }[] = [];
    const lotsStable = buildT >= 1 && lastBuildT >= 1;
    lastBuildT = buildT;

    if (!lotsStable) {
      lots.forEach((lot, i) => {
      const raw = (buildT - lot.stagger) / Math.max(0.0001, 1 - lot.stagger - 0.15);
      const localT = Math.min(1, Math.max(0, raw));
      if (localT <= 0) {
        dummy.position.set(lot.x, 0, lot.z);
        dummy.scale.set(0.0001, 0.0001, 0.0001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        coreMesh.setMatrixAt(i, dummy.matrix);
        return;
      }
      const e = smooth(localT);
      const hNow = Math.max(0.02, e * lot.h);

      dummy.position.set(lot.x, 0, lot.z);
      dummy.rotation.set(0, 0, 0);
      if (localT < 1) {
        dummy.scale.set(lot.w, hNow, lot.d);
      } else {
        dummy.scale.set(0.0001, 0.0001, 0.0001);
      }
      dummy.updateMatrix();
      coreMesh.setMatrixAt(i, dummy.matrix);
      });
      coreMesh.instanceMatrix.needsUpdate = true;

      // facade + roof props reveal
      for (const fg of facadeGroups) {
        let dirty = false;
        for (const lot of fg.lots) {
          const raw = (buildT - lot.stagger) / Math.max(0.0001, 1 - lot.stagger - 0.15);
          const localT = Math.min(1, Math.max(0, raw));
          const done = (lot as Lot & { _done?: boolean })._done;
          if (localT >= 1 && !done) {
            (lot as Lot & { _done?: boolean })._done = true;
            dummy.position.set(lot.x, 0, lot.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(lot.w / BASE_FOOT, lot.h / fg.bucketH, lot.d / BASE_FOOT);
            dummy.updateMatrix();
            fg.mesh.setMatrixAt(lot.idxInBucket, dummy.matrix);
            dirty = true;
            const acIdx = (lot as Lot & { acIdx?: number }).acIdx;
            const tankIdx = (lot as Lot & { tankIdx?: number }).tankIdx;
            dummy.rotation.set(0, rng(), 0);
            if (acIdx !== undefined) {
              dummy.position.set(lot.x, lot.h + 0.6, lot.z);
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();
              acMesh.setMatrixAt(acIdx, dummy.matrix);
              acMesh.instanceMatrix.needsUpdate = true;
            } else if (tankIdx !== undefined) {
              dummy.position.set(lot.x, lot.h + 1.2, lot.z);
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();
              tankMesh.setMatrixAt(tankIdx, dummy.matrix);
              tankMesh.instanceMatrix.needsUpdate = true;
            }
          }
        }
        if (dirty) fg.mesh.instanceMatrix.needsUpdate = true;
      }
    } // end !lotsStable

    // emit dust from growing lots only when construction is active
    if (lotsStable) {
      growingLots.length = 0;
    } else {
      lots.forEach((lot) => {
        const raw = (buildT - lot.stagger) / Math.max(0.0001, 1 - lot.stagger - 0.15);
        const localT = Math.min(1, Math.max(0, raw));
        if (localT > 0.02 && localT < 1) {
          growingLots.push({ lot, top: lot.h * (localT * localT * (3 - 2 * localT)) });
        }
      });
    }

    // reset completion flags when scrolling back to start
    if (buildT < 0.02) {
      for (const fg of facadeGroups) {
        let any = false;
        for (const lot of fg.lots) {
          const l = lot as Lot & { _done?: boolean };
          if (l._done) {
            l._done = false;
            any = true;
            dummy.position.set(lot.x, 0, lot.z);
            dummy.scale.set(0.0001, 0.0001, 0.0001);
            dummy.updateMatrix();
            fg.mesh.setMatrixAt(lot.idxInBucket, dummy.matrix);
          }
        }
        if (any) fg.mesh.instanceMatrix.needsUpdate = true;
      }
      for (let i = 0; i < acCount; i++) {
        dummy.scale.set(0.0001, 0.0001, 0.0001);
        dummy.updateMatrix();
        acMesh.setMatrixAt(i, dummy.matrix);
        tankMesh.setMatrixAt(i, dummy.matrix);
      }
      acMesh.instanceMatrix.needsUpdate = true;
      tankMesh.instanceMatrix.needsUpdate = true;
    }

    // --- ground-works kit sinks away as the towers start rising ---
    const kitT = THREE.MathUtils.clamp((buildT - 0.02) / 0.07, 0, 1);
    if (kitT >= 1) {
      siteKit.visible = false;
    } else {
      siteKit.visible = true;
      siteKit.position.y = -smooth(kitT) * 3;
    }

    // --- cranes ---
    for (const crane of cranes) {
      if (buildT >= crane.doneAt) {
        if (!crane.dead) {
          crane.dead = true;
          crane.root.visible = false;
        }
        continue;
      }
      crane.root.visible = true;
      crane.slew.rotation.y = Math.sin(time * 0.16 + crane.phase) * 1.1 + crane.phase;
      const tx = 12 + Math.sin(time * 0.23 + crane.phase * 2) * 8;
      crane.trolley.position.x = tx;
      const hy = 8 + Math.sin(time * 0.31 + crane.phase) * 4;
      crane.hook.position.y = -hy;
      crane.cable.scale.y = hy / 10;
      crane.cable.position.y = -hy / 2;
      crane.beaconMat.opacity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 5 + crane.phase));
    }

    // --- traffic ---
    cars.forEach((c, i) => {
      c.pos += c.speed * c.dir * dt;
      if (c.pos > c.max) c.pos = c.min;
      if (c.pos < c.min) c.pos = c.max;
      if (c.axis === 'x') {
        dummy.position.set(c.pos, 0.1, c.fixed);
        dummy.rotation.set(0, c.dir === 1 ? 0 : Math.PI, 0);
      } else {
        dummy.position.set(c.fixed, 0.1, c.pos);
        dummy.rotation.set(0, c.dir === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
      }
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carMesh.setMatrixAt(i, dummy.matrix);

      // glow markers
      const forward = c.axis === 'x' ? new THREE.Vector3(c.dir, 0, 0) : new THREE.Vector3(0, 0, c.dir);
      const base = dummy.position.clone();
      dummy.position.copy(base).addScaledVector(forward, 2.0).setY(0.75);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      headGlows.setMatrixAt(i, dummy.matrix);
      dummy.position.copy(base).addScaledVector(forward, -2.0).setY(0.75);
      dummy.updateMatrix();
      tailGlows.setMatrixAt(i, dummy.matrix);
    });
    carMesh.instanceMatrix.needsUpdate = true;
    headGlows.instanceMatrix.needsUpdate = true;
    tailGlows.instanceMatrix.needsUpdate = true;

    // --- boats bob & drift ---
    boats.forEach((b, i) => {
      b.position.y = 0.32 + Math.sin(time * 0.9 + i * 2) * 0.08;
      b.position.x += Math.sin(time * 0.05 + i) * 0.01;
      b.rotation.z = Math.sin(time * 0.7 + i) * 0.02;
    });

    // --- dust ---
    const attr = dustGeo.attributes.position as THREE.BufferAttribute;
    const lifeAttr = dustGeo.attributes.aLife as THREE.BufferAttribute;
    const emitters = growingLots.slice(0, 6);
    for (let i = 0; i < DUST_COUNT; i++) {
      if (dustLife[i] >= 1 && emitters.length > 0 && i % 3 === 0) {
        const em = emitters[(i + dustCursor) % emitters.length];
        dustLife[i] = 0;
        dustPos[i * 3] = em.lot.x + (rng() - 0.5) * em.lot.w;
        dustPos[i * 3 + 1] = em.top + rng() * 2;
        dustPos[i * 3 + 2] = em.lot.z + (rng() - 0.5) * em.lot.d;
        dustVel[i * 3] = (rng() - 0.5) * 1.4;
        dustVel[i * 3 + 1] = 1.2 + rng() * 1.6;
        dustVel[i * 3 + 2] = (rng() - 0.5) * 1.4;
      }
      if (dustLife[i] < 1) {
        dustLife[i] = Math.min(1, dustLife[i] + dt * 0.55);
        dustPos[i * 3] += dustVel[i * 3] * dt;
        dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
        dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
      } else {
        dustPos[i * 3 + 1] = -50; // park below ground
      }
    }
    dustCursor++;
    attr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  };

  const setDusk = (dusk: number) => {
    const night = THREE.MathUtils.smoothstep(dusk, 0.42, 0.82);
    for (const mat of glowMaterials) {
      mat.emissiveIntensity = night * 1.9;
    }
    headGlowMat.opacity = night * 0.95;
    tailGlowMat.opacity = night * 0.9;
  };

  const dispose = () => {
    scene.remove(coreMesh, dust);
    facadeGroups.forEach((fg) => scene.remove(fg.mesh));
  };

  const setConstructionFxVisible = (v: boolean) => {
    // Points + scene.overrideMaterial don't mix — hide dust in blueprint mode
    dust.visible = v;
  };

  return { update, setDusk, setConstructionFxVisible, dispose, glowMaterials, focus };
}
