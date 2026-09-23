import * as THREE from 'three';
import { makeFacade, scaleBoxUVs, reseed } from './textures';

export interface SlabPickInfo {
  projectId: string;
  floorNumber: number;
  listed: boolean;
  label: string;
  price: string;
  point: THREE.Vector3;
}

export interface HeroTowerHandle {
  projectId: string;
  group: THREE.Group;
  /** set exploded factor 0..1 (damped by caller) */
  setExplode: (v: number) => void;
  /** set construction growth 0..1 */
  setGrowth: (v: number) => void;
  setHighlightFloor: (floorNumber: number | null) => void;
  pick: (raycaster: THREE.Raycaster) => SlabPickInfo | null;
  setDusk: (dusk: number) => void;
  anchor: THREE.Vector3;
  midHeight: number;
  midY: number;
  floorsCount: number;
}

interface HeroSpec {
  projectId: string;
  anchor: [number, number];
  height: number;
  floors: number;
  listedFloors: number[];
  floorMeta: Map<number, { name: string; price: string }>;
}

const FLOOR_H = 4.2;

function makeGlowStripMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2b3138,
    emissive: new THREE.Color(0xffc27a),
    emissiveIntensity: 0,
    roughness: 0.4,
  });
}

/**
 * Build the three marquee projects as fully-modelled towers with
 * clickable, exploding floor-slab stacks.
 */
export function buildHeroTowers(
  scene: THREE.Scene,
  specs: HeroSpec[],
  glowMaterials: THREE.MeshStandardMaterial[]
): HeroTowerHandle[] {
  reseed(4242);
  const handles: HeroTowerHandle[] = [];
  const rng = () => Math.random();

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x6d93ab,
    roughness: 0.08,
    metalness: 0.85,
    transparent: true,
    opacity: 1,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x9e7448, roughness: 0.32, metalness: 0.78 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.8 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xece7db, roughness: 0.62, metalness: 0.05 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x8a6748, roughness: 0.7 });
  const greenRoofMat = new THREE.MeshStandardMaterial({ color: 0x4f8a58, roughness: 0.9 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0.9 });

  specs.forEach((spec) => {
    const g = new THREE.Group();
    g.position.set(spec.anchor[0], 0, spec.anchor[1]);
    scene.add(g);

    const H = spec.height;
    const midY = H * 0.55;

    // ---------- shared slab stack (the exploded-view star) ----------
    const slabCount = spec.floors;
    const slabFootW = spec.projectId === 'spire' ? 19 : spec.projectId === 'skybridge' ? 15 : 17;
    const slabGeo = new THREE.BoxGeometry(slabFootW, 0.5, slabFootW);
    const slabsMesh = new THREE.InstancedMesh(slabGeo, slabMat.clone(), slabCount);
    slabsMesh.castShadow = true;
    slabsMesh.receiveShadow = true;
    g.add(slabsMesh);

    const dummy = new THREE.Object3D();
    const baseColor = new THREE.Color(0xffffff);
    const listedColor = new THREE.Color(0xffd9ad);
    const hotColor = new THREE.Color(0xff7a1a);
    for (let i = 0; i < slabCount; i++) {
      const floorNo = i + 1;
      const listed = spec.listedFloors.includes(floorNo);
      slabsMesh.setColorAt(i, listed ? listedColor : baseColor);
    }
    if (slabsMesh.instanceColor) slabsMesh.instanceColor.needsUpdate = true;

    // Which sub-meshes fade when exploding ("curtain" elements)
    const curtainMats: THREE.MeshStandardMaterial[] = [];

    // per-project signature architecture
    if (spec.projectId === 'spire') {
      // podium
      const podium = new THREE.Mesh(new THREE.BoxGeometry(26, 7, 26), concreteMat);
      podium.position.y = 3.5;
      podium.castShadow = true;
      podium.receiveShadow = true;
      const lobbyGlow = makeGlowStripMat();
      glowMaterials.push(lobbyGlow);
      const lobby = new THREE.Mesh(new THREE.BoxGeometry(26.4, 2.6, 26.4), lobbyGlow);
      lobby.position.y = 1.9;
      g.add(podium, lobby);

      // glass shaft
      const shaftH = H - 16;
      const shaftGeo = new THREE.BoxGeometry(17.6, shaftH, 17.6);
      shaftGeo.translate(0, shaftH / 2 + 7, 0);
      scaleBoxUVs(shaftGeo, 17.6, shaftH, 17.6, 4.4, 3.6);
      const curtainSet = makeFacade('curtain');
      const shaftMat = new THREE.MeshStandardMaterial({
        map: curtainSet.map,
        emissiveMap: curtainSet.emissive,
        emissive: new THREE.Color(0xffc890),
        emissiveIntensity: 0,
        roughness: 0.18,
        metalness: 0.65,
        transparent: true,
      });
      glowMaterials.push(shaftMat);
      curtainMats.push(shaftMat);
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.castShadow = true;
      g.add(shaft);

      // bronze fins on two corners
      const finGeo = new THREE.BoxGeometry(0.5, shaftH, 1.1);
      finGeo.translate(0, shaftH / 2 + 7, 0);
      const fins = new THREE.InstancedMesh(finGeo, bronzeMat, 10);
      for (let i = 0; i < 5; i++) {
        dummy.position.set(-9.4, 0, -7.2 + i * 3.6);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        fins.setMatrixAt(i, dummy.matrix);
        dummy.position.set(-7.2 + i * 3.6, 0, -9.4);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.updateMatrix();
        fins.setMatrixAt(5 + i, dummy.matrix);
      }
      fins.castShadow = true;
      g.add(fins);

      // golden crown: 3 setbacks + spire
      const cs1 = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), glassMat.clone());
      cs1.position.y = H - 10;
      const cs2 = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 7), glassMat.clone());
      cs2.position.y = H - 4.5;
      const spireFin = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 4), bronzeMat);
      spireFin.position.y = H + 2;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), beaconMat.clone());
      beacon.position.y = H + 6.8;
      beacon.name = 'beacon';
      g.add(cs1, cs2, spireFin, beacon);
      cs1.castShadow = cs2.castShadow = true;
      curtainMats.push(cs1.material as THREE.MeshStandardMaterial, cs2.material as THREE.MeshStandardMaterial);

      // slab gravity offset (podium levels start above podium)
      slabsMesh.userData.yOffset = 8.5;
      slabsMesh.userData.span = (shaftH - 4) / slabCount;
    } else if (spec.projectId === 'skybridge') {
      // twin towers ±8.5 on x axis
      const towerH = H;
      // twin facade materials tracked via curtainMats
      for (const side of [-1, 1]) {
        const tGeo = new THREE.BoxGeometry(11, towerH, 11);
        tGeo.translate(side * 8.7, towerH / 2, 0);
        scaleBoxUVs(tGeo, 11, towerH, 11, 4.2, 3.6);
        const set = makeFacade('stone');
        const m = new THREE.MeshStandardMaterial({
          map: set.map,
          emissiveMap: set.emissive,
          emissive: new THREE.Color(0xffc890),
          emissiveIntensity: 0,
          roughness: 0.75,
          transparent: true,
        });
        glowMaterials.push(m);
        curtainMats.push(m);
        const tower = new THREE.Mesh(tGeo, m);
        tower.castShadow = true;
        g.add(tower);
        const crown = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.6, 11.6), bronzeMat);
        crown.position.set(side * 8.7, towerH + 0.8, 0);
        g.add(crown);
      }
      // skybridge at level 20 (~84m)
      const bridgeGlow = makeGlowStripMat();
      glowMaterials.push(bridgeGlow);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(10.4, 5.6, 6.4), bridgeGlow);
      bridge.position.set(0, 88, 0);
      bridge.castShadow = true;
      const bridgeFloor = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.5, 6.4), concreteMat);
      bridgeFloor.position.set(0, 85.4, 0);
      g.add(bridge, bridgeFloor);

      slabsMesh.userData.yOffset = 3;
      slabsMesh.userData.span = (towerH - 10) / slabCount;
      slabsMesh.userData.twin = true;
    } else {
      // terraces: 6 cascading steps descending toward the canal (+z)
      const stepCount = 6;
      const stepDepth = 8;
      for (let s = 0; s < stepCount; s++) {
        const sh = H - s * 5.6;
        const zc = s * (stepDepth - 1.5) - 16; // cascade uphill → downhill toward water
        const step = new THREE.Mesh(new THREE.BoxGeometry(20, sh, stepDepth), concreteMat);
        step.position.set(0, sh / 2, zc);
        step.castShadow = true;
        step.receiveShadow = true;
        g.add(step);
        // green roof terrace on each step
        if (s > 0) {
          const lawn = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.4, 5.6), greenRoofMat);
          lawn.position.set(0, sh + 0.2, zc - 1);
          g.add(lawn);
        }
        // timber edge band
        const edge = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.5, 0.5), timberMat);
        edge.position.set(0, sh - 0.2, zc + stepDepth / 2 - 0.25);
        g.add(edge);
      }
      // glass lobby at the water end
      const terraceGlow = makeGlowStripMat();
      glowMaterials.push(terraceGlow);
      const lobbyGlowMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 2.6, 6), terraceGlow);
      lobbyGlowMesh.position.set(0, 1.3, -19);
      g.add(lobbyGlowMesh);

      slabsMesh.userData.yOffset = H - 3;
      slabsMesh.userData.span = -(FLOOR_H + 0.35); // stack downward cascade style
      slabsMesh.userData.terraces = true;
    }

    // helper: slab base position (un-exploded)
    const yOffset: number = slabsMesh.userData.yOffset;
    const span: number = slabsMesh.userData.span;
    const isTwin = !!slabsMesh.userData.twin;
    let explodeV = 0;
    let growthV = 0;

    const layoutSlabs = () => {
      const ev = explodeV;
      for (let i = 0; i < slabCount; i++) {
        let y = yOffset + i * span;
        // exploded: drift apart around mid
        const centerIdx = slabCount / 2;
        const gap = spec.projectId === 'terraces' ? 2.6 : 1.5;
        y += ev * (i - centerIdx) * gap;
        if (isTwin) {
          const side = i % 2 === 0 ? -8.7 : 8.7;
          dummy.position.set(side, y, 0);
        } else if (spec.projectId === 'terraces') {
          const out = ev * (i - centerIdx) * 1.9;
          dummy.position.set(0, y, -2 - out * 0.5);
        } else {
          dummy.position.set(0, y, 0);
        }
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        slabsMesh.setMatrixAt(i, dummy.matrix);
      }
      slabsMesh.instanceMatrix.needsUpdate = true;
    };
    layoutSlabs();

    const handle: HeroTowerHandle = {
      projectId: spec.projectId,
      group: g,
      setExplode: (v) => {
        explodeV = v;
        layoutSlabs();
        const ghost = 1 - v * 0.82;
        curtainMats.forEach((m) => {
          m.opacity = Math.max(0.14, ghost);
        });
      },
      setGrowth: (v) => {
        growthV = v;
        // whole tower rises as a mass; slabs pickable once complete
        const s = THREE.MathUtils.smoothstep(v, 0, 0.7);
        g.scale.set(1, Math.max(0.001, s), 1);
        g.visible = v > 0.005;
      },
      setHighlightFloor: (floorNumber) => {
        for (let i = 0; i < slabCount; i++) {
          const fn = i + 1;
          const listed = spec.listedFloors.includes(fn);
          const col = fn === floorNumber ? hotColor : listed ? listedColor : baseColor;
          slabsMesh.setColorAt(i, col);
        }
        if (slabsMesh.instanceColor) slabsMesh.instanceColor.needsUpdate = true;
      },
      pick: (raycaster) => {
        if (!slabsMesh.visible || growthV < 0.98) return null;
        const hits = raycaster.intersectObject(slabsMesh);
        if (!hits.length || hits[0].instanceId === undefined) return null;
        const i = hits[0].instanceId;
        const floorNumber = i + 1;
        const listed = spec.listedFloors.includes(floorNumber);
        const meta = spec.floorMeta.get(floorNumber);
        return {
          projectId: spec.projectId,
          floorNumber,
          listed,
          label: meta ? meta.name : `Level ${floorNumber}`,
          price: meta ? meta.price : '—',
          point: hits[0].point.clone(),
        };
      },
      setDusk: (dusk) => {
        const night = THREE.MathUtils.smoothstep(dusk, 0.5, 0.85);
        g.traverse((o) => {
          if (o.name === 'beacon' && o instanceof THREE.Mesh) {
            (o.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * night;
          }
        });
      },
      anchor: new THREE.Vector3(spec.anchor[0], 0, spec.anchor[1]),
      midHeight: H,
      midY,
      floorsCount: slabCount,
    };

    handles.push(handle);
    void rng;
  });

  return handles;
}
