/* Headless CPU smoke test for the 3D scene logic (no WebGL needed) */
import * as THREE from 'three';

// --- shim DOM canvas for procedural textures ---
const gradientStub = { addColorStop: () => {} };
const ctx2dStub = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradientStub;
      if (prop === 'canvas') return {};
      return () => {};
    },
    set: () => true,
  }
) as unknown as CanvasRenderingContext2D;

(globalThis as Record<string, unknown>).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return { width: 0, height: 0, getContext: () => ctx2dStub, style: {} };
    }
    return { style: {} };
  },
};

const { buildCity } = await import('../src/three/cityBuilder.ts');
const { buildHeroTowers } = await import('../src/three/heroTowers.ts');
const { SkyRig } = await import('../src/three/skyRig.ts');
const { CameraDirector } = await import('../src/three/cameraDirector.ts');
const { RESIDENCE_PROJECTS } = await import('../src/data/residences.ts');

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (!cond) {
    failures++;
    console.log('  ✗', name);
  } else {
    console.log('  ✓', name);
  }
};
const finiteVec = (v: THREE.Vector3) => isFinite(v.x) && isFinite(v.y) && isFinite(v.z);

console.log('== buildCity ==');
const scene = new THREE.Scene();
const city = buildCity(scene);
check('scene has children', scene.children.length > 20);
// simulate the full construction arc frame-by-frame
for (let f = 0; f <= 120; f++) {
  const buildT = f / 120;
  city.update(buildT, 0.016, f * 0.016);
}
city.update(1, 0.016, 3);
city.setDusk(0);
city.setDusk(0.55);
city.setDusk(1);
city.setConstructionFxVisible(false);
city.setConstructionFxVisible(true);
// reverse scroll (facades should reset)
for (let f = 120; f >= 0; f -= 4) city.update(f / 120, 0.016, 2);
city.update(0, 0.016, 1);
check('city update loop survived 150+ frames incl. scroll-back', true);

console.log('== heroTowers ==');
const specs = RESIDENCE_PROJECTS.map((p) => ({
  projectId: p.id,
  anchor: p.anchor,
  height: p.heightMeters,
  floors: p.floorsCount,
  listedFloors: p.floors.map((f) => f.floorNumber),
  floorMeta: new Map(p.floors.map((f) => [f.floorNumber, { name: f.name, price: f.price }])),
}));
const heroes = buildHeroTowers(scene, specs, city.glowMaterials);
check('3 hero towers built', heroes.length === 3);
for (const h of heroes) {
  for (let g = 0; g <= 10; g++) h.setGrowth(g / 10);
  for (let e = 0; e <= 10; e++) h.setExplode(e / 10);
  h.setHighlightFloor(3);
  h.setHighlightFloor(null);
  h.setDusk(1);
  check(`${h.projectId} anchor finite`, finiteVec(h.anchor));
  check(`${h.projectId} midY sane`, h.midY > 10 && h.midY < 200);
}
// picking with a real raycaster aimed at the spire slab stack
const spire = heroes.find((h) => h.projectId === 'spire')!;
spire.setGrowth(1);
scene.updateMatrixWorld(true);
const ray = new THREE.Raycaster();
const slabWorld = new THREE.Vector3();
{
  const mesh = spire.group.children.find((c) => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(33, m); // floor 34 — listed
  slabWorld.setFromMatrixPosition(m).applyMatrix4(spire.group.matrixWorld);
}
const cam = new THREE.PerspectiveCamera(44, 16 / 9, 0.5, 1400);
cam.position.copy(slabWorld).add(new THREE.Vector3(60, 10, 60));
cam.lookAt(slabWorld);
cam.updateMatrixWorld(true);
ray.setFromCamera(new THREE.Vector2(0, 0), cam);
const hit = spire.pick(ray);
check('raycast hits a spire slab', !!hit);
check('hit is listed floor 34', !!hit && hit.floorNumber === 34 && hit.listed);
check('hit label has name+price', !!hit && hit.label.length > 0 && hit.price.startsWith('€'));

console.log('== SkyRig ==');
const sky = new SkyRig(scene);
const sun = new THREE.DirectionalLight();
const hemi = new THREE.HemisphereLight();
scene.add(sun, sun.target, hemi);
for (const d of [0, 0.1, 0.3, 0.55, 0.75, 0.9, 1]) {
  sky.update(d, 12, scene, sun, hemi);
}
check('sun position finite across dusk', finiteVec(sun.position));
check('hemi dims at night', hemi.intensity < 0.4);
sky.update(0, 12, scene, sun, hemi);
check('hemi bright in day', hemi.intensity > 1);

console.log('== CameraDirector ==');
const director = new CameraDirector();
const tower = { anchor: new THREE.Vector3(0, 0, -16), midY: 90, height: 165 };
const buildFocus = new THREE.Vector3(0, 20, -10);
for (let i = 0; i < 300; i++) {
  const p = i / 300;
  const section = p < 0.1 ? 'hero' : p < 0.46 ? 'build' : p < 0.62 ? 'residences' : p < 0.76 ? 'district' : p < 0.88 ? 'record' : 'contact';
  director.update(cam, {
    section: section as never,
    sectionT: 0.5,
    buildT: Math.min(1, p * 2),
    time: i * 0.016,
    dt: 0.016,
    dragAz: 0.3,
    dragPol: 0.1,
    parX: 0.2,
    parY: -0.1,
    tower,
    buildFocus,
  });
}
check('camera finite after 300 frames across all sections', finiteVec(cam.position) && isFinite(cam.fov));
check('camera above ground', cam.position.y > 1);
check('fov in sane range', cam.fov > 30 && cam.fov < 60);

console.log('== data consistency ==');
check('3 projects', RESIDENCE_PROJECTS.length === 3);
check(
  'every floor has numeric price',
  RESIDENCE_PROJECTS.every((p) => p.floors.every((f) => f.priceEUR > 100000))
);
check(
  'rooms have valid plan rects',
  RESIDENCE_PROJECTS.every((p) => p.floors.every((f) => f.rooms.every((r) => r.size[0] > 0.5 && r.size[1] > 0.5)))
);

console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED ✔' : `\n${failures} FAILURES ✘`);
process.exit(failures === 0 ? 0 : 1);
