import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeSceneProps {
  scrollProgress: number;
  activeProjectId: string;
  hoveredFloorIndex: number | null;
  activePinId: string | null;
  isExplodedView: boolean;
  onBuildingSelect: (projectId: string) => void;
  onFloorHover: (floorIdx: number | null) => void;
  onPinClick: (pinId: string) => void;
}

interface GridLot {
  id: string;
  projectId?: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  fullHeight: number;
  currentHeight: number;
  minHeight: number;
  staggerOffset: number;
  colorType: number; // 0: limestone, 1: white concrete, 2: warm sandstone
  hasCrown: boolean;
  craneIndex?: number;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({
  scrollProgress,
  activeProjectId,
  hoveredFloorIndex,
  activePinId,
  isExplodedView,
  onBuildingSelect,
  onFloorHover,
  onPinClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number>(0);

  // Instanced city grid references
  const lotsRef = useRef<GridLot[]>([]);
  const buildingMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const glassMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const crownsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const crownLotIndicesRef = useRef<number[]>([]);

  // Cranes distributed procedurally across the grid
  const allCranesRef = useRef<{
    root: THREE.Group;
    slew: THREE.Group;
    speed: number;
    phase: number;
    sweepAngle: number;
    baseRotY: number;
    basePos: THREE.Vector3;
    beaconMesh?: THREE.Mesh;
  }[]>([]);

  // Interactive markers & overlays
  const pinMarkersRef = useRef<{ id: string; mesh: THREE.Group; basePos: THREE.Vector3 }[]>([]);

  // Camera targets & mouse smoothing
  const currentCamPos = useRef(new THREE.Vector3(45, 24, 60));
  const targetCamPos = useRef(new THREE.Vector3(45, 24, 60));
  const currentLookAt = useRef(new THREE.Vector3(0, 14, -10));
  const targetLookAt = useRef(new THREE.Vector3(0, 14, -10));
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Store latest props in ref for render loop without re-triggering effects
  const propsRef = useRef({
    scrollProgress,
    activeProjectId,
    hoveredFloorIndex,
    activePinId,
    isExplodedView,
  });

  useEffect(() => {
    propsRef.current = {
      scrollProgress,
      activeProjectId,
      hoveredFloorIndex,
      activePinId,
      isExplodedView,
    };
  }, [scrollProgress, activeProjectId, hoveredFloorIndex, activePinId, isExplodedView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene & Crisp Sunlit Atmosphere ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const skyDayColor = new THREE.Color(0xdce8f4);
    scene.background = skyDayColor;
    scene.fog = new THREE.FogExp2(skyDayColor, 0.0032);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.5,
      850
    );
    camera.position.set(45, 24, 60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    // Clamped pixel ratio ensures smooth 60 FPS without retina fill-rate lag
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // --- 2. Sun-Drenched Daytime Lighting Rig ---
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.4);
    sunLight.position.set(65, 95, 50);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xa5cbe8, 0xd4cebe, 1.2);
    scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight(0xc6d9ea, 0.9);
    fillLight.position.set(-50, 50, -45);
    scene.add(fillLight);

    // --- 3. Shared Architectural Materials ---
    const limestoneMat = new THREE.MeshStandardMaterial({
      color: 0xede9e1,
      roughness: 0.65,
      metalness: 0.05,
    });
    const whiteConcreteMat = new THREE.MeshStandardMaterial({
      color: 0xf4f2ee,
      roughness: 0.7,
      metalness: 0.05,
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x9e7a52,
      roughness: 0.35,
      metalness: 0.75,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x5b8da8,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85,
    });
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x363942,
      roughness: 0.88,
    });
    const plazaPavingMat = new THREE.MeshStandardMaterial({
      color: 0xd9d5cc,
      roughness: 0.75,
    });
    const parkGrassMat = new THREE.MeshStandardMaterial({
      color: 0x478553,
      roughness: 0.9,
    });
    const waterCanalMat = new THREE.MeshStandardMaterial({
      color: 0x347c9d,
      roughness: 0.12,
      metalness: 0.8,
    });
    const laneLineMat = new THREE.MeshBasicMaterial({ color: 0xf2efe9 });
    const craneOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xe65100,
      roughness: 0.5,
      metalness: 0.4,
    });
    const craneCableMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

    // --- 4. Master City District Ground & Infrastructure ---
    const groundGeo = new THREE.PlaneGeometry(700, 700);
    const groundMesh = new THREE.Mesh(groundGeo, plazaPavingMat);
    groundMesh.rotation.x = -Math.PI / 2;
    scene.add(groundMesh);

    // The Grand River Canal running across the district at Z = 34
    const canalGeo = new THREE.BoxGeometry(400, 1.2, 26);
    const canalMesh = new THREE.Mesh(canalGeo, waterCanalMat);
    canalMesh.position.set(0, 0.4, 34);
    scene.add(canalMesh);

    // Granite Embankments
    const quayGeo = new THREE.BoxGeometry(400, 0.8, 2.5);
    const quayNorth = new THREE.Mesh(quayGeo, limestoneMat);
    quayNorth.position.set(0, 0.6, 20);
    scene.add(quayNorth);

    const quaySouth = new THREE.Mesh(quayGeo, limestoneMat);
    quaySouth.position.set(0, 0.6, 48);
    scene.add(quaySouth);

    // 2 Arched Bridges over Canal
    [-52, 52].forEach((bx) => {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(bx, 0, 34);
      const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(12, 1.3, 30), whiteConcreteMat);
      bridgeDeck.position.set(0, 1.4, 0);
      bridgeGroup.add(bridgeDeck);

      const railGeo = new THREE.BoxGeometry(0.5, 1.2, 30);
      const railL = new THREE.Mesh(railGeo, bronzeMat);
      railL.position.set(-5.6, 2.2, 0);
      bridgeGroup.add(railL);

      const railR = new THREE.Mesh(railGeo, bronzeMat);
      railR.position.set(5.6, 2.2, 0);
      bridgeGroup.add(railR);
      scene.add(bridgeGroup);
    });

    // Street Boulevard Grid Network
    const avenuesGroup = new THREE.Group();
    // Main East-West Boulevard
    const aveEW = new THREE.Mesh(new THREE.BoxGeometry(420, 0.05, 14), asphaltMat);
    aveEW.position.set(0, 0.04, -8);
    avenuesGroup.add(aveEW);

    // North-South Avenues
    [-65, 0, 65].forEach((ax) => {
      const aveNS = new THREE.Mesh(new THREE.BoxGeometry(14, 0.05, 280), asphaltMat);
      aveNS.position.set(ax, 0.04, 0);
      avenuesGroup.add(aveNS);

      for (let z = -120; z < 120; z += 9) {
        if (Math.abs(z - 34) < 16) continue;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 4), laneLineMat);
        stripe.position.set(ax, 0.06, z);
        avenuesGroup.add(stripe);
      }
    });
    scene.add(avenuesGroup);

    // Central Waterfront Urban Park with Lawns & Trees
    const parkGroup = new THREE.Group();
    parkGroup.position.set(-30, 0.1, 10);
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(44, 0.2, 28), parkGrassMat);
    lawn.position.set(0, 0.1, 0);
    parkGroup.add(lawn);

    const pool = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 8), waterCanalMat);
    pool.position.set(0, 0.2, 0);
    parkGroup.add(pool);

    const poolCoping = new THREE.Mesh(new THREE.BoxGeometry(19.4, 0.35, 9.4), limestoneMat);
    poolCoping.position.set(0, 0.18, 0);
    parkGroup.add(poolCoping);

    // Architectural Trees
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 2.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.9 });
    const canopyGeo = new THREE.SphereGeometry(1.6, 7, 7);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3d7847, roughness: 0.8 });

    const treePositions = [
      [-16, 0, -8], [-11, 0, -8], [-6, 0, -8], [6, 0, -8], [11, 0, -8], [16, 0, -8],
      [-16, 0, 8], [-11, 0, 8], [-6, 0, 8], [6, 0, 8], [11, 0, 8], [16, 0, 8],
      [-18, 0, 0], [18, 0, 0], [32, 0, -18], [37, 0, -18], [42, 0, -18],
      [32, 0, -2], [37, 0, -2], [42, 0, -2],
      [-40, 0, -4], [-45, 0, -4], [-50, 0, -4],
    ];
    treePositions.forEach(([tx, ty, tz]) => {
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.1;
      tree.add(trunk);
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = 2.8;
      tree.add(canopy);
      parkGroup.add(tree);
    });
    scene.add(parkGroup);

    // --- 5. INSTANCED-MESH SPRAWLING CITY GENERATOR (Grid of Varied-Height Extruded Box Geometries) ---
    // Create an expansive metropolitan grid with multiple city blocks, avenues, setbacks, and varied heights
    const lots: GridLot[] = [];
    const gridCols = [-135, -105, -78, -52, -26, 26, 52, 78, 105, 135];
    const gridRows = [-130, -100, -72, -44, -20, 12, 64, 92, 120];

    // Seeded pseudo-random function for deterministic procedural skyline
    let seed = 1337;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    gridRows.forEach((rZ) => {
      gridCols.forEach((cX) => {
        // Skip grand canal corridor (Z between 20 and 48)
        if (rZ > 18 && rZ < 50) return;
        // Skip primary avenue intersections
        if (Math.abs(rZ + 8) < 10) return;
        if (Math.abs(cX) < 12) return;
        // Skip central waterfront park footprint
        if (cX > -58 && cX < -8 && rZ > -4 && rZ < 26) return;

        // Add subtle organic offset within each city block
        const offsetX = (random() - 0.5) * 5;
        const offsetZ = (random() - 0.5) * 5;
        const x = cX + offsetX;
        const z = rZ + offsetZ;

        // Radial distance from district core
        const distFromCenter = Math.sqrt(x * x + z * z);

        // Core high-rises (55m - 92m), mid-rises (30m - 55m), riverfront villas (18m - 28m)
        const isCore = distFromCenter < 70;
        const isRiverfront = z >= 50 && z <= 75;

        let fullHeight = isCore
          ? 52 + random() * 40
          : isRiverfront
          ? 18 + random() * 18
          : 24 + random() * 32;

        let width = 14 + random() * 8;
        let depth = 14 + random() * 8;
        let hasCrown = isCore && random() > 0.35;
        let colorType = Math.floor(random() * 3);
        let projectId: string | undefined = undefined;

        // Specific landmark anchors tied to showcase developments
        if (Math.abs(cX - 26) < 6 && Math.abs(rZ + 20) < 6) {
          // The Obsidian Spire (Flagship Tower)
          fullHeight = 88;
          width = 20;
          depth = 20;
          hasCrown = true;
          projectId = 'obsidian-tower';
        } else if (Math.abs(cX + 26) < 6 && Math.abs(rZ + 20) < 6) {
          // Cloister Courtyard / Skybridge Twin
          fullHeight = 60;
          width = 17;
          depth = 17;
          projectId = 'cloister-courtyard';
        } else if (isRiverfront && Math.abs(cX - 52) < 8) {
          // Horizon Terraces (Cascading Riverfront Residences)
          fullHeight = 28;
          width = 26;
          depth = 18;
          projectId = 'horizon-terraces';
        }

        lots.push({
          id: `lot-${lots.length}`,
          projectId,
          x,
          z,
          width,
          depth,
          fullHeight,
          currentHeight: 3,
          minHeight: 3 + random() * 1.5,
          staggerOffset: random() * 0.28,
          colorType,
          hasCrown,
        });
      });
    });

    lotsRef.current = lots;
    const totalLots = lots.length;

    // InstancedMesh using extruded 1x1x1 Unit Box Geometry scaled per instance
    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMesh = new THREE.InstancedMesh(unitBoxGeo, limestoneMat, totalLots);
    const glassMesh = new THREE.InstancedMesh(unitBoxGeo, glassMat, totalLots);

    // Apply architectural materials to instances
    const colorLimestone = new THREE.Color(0xede9e1);
    const colorConcrete = new THREE.Color(0xf4f2ee);
    const colorSandstone = new THREE.Color(0xdad4c8);
    const palette = [colorLimestone, colorConcrete, colorSandstone];

    const dummy = new THREE.Object3D();
    const dummyGlass = new THREE.Object3D();

    lots.forEach((lot, i) => {
      buildingMesh.setColorAt(i, palette[lot.colorType]);

      // Base footprint matrix
      dummy.position.set(lot.x, lot.minHeight / 2, lot.z);
      dummy.scale.set(lot.width, lot.minHeight, lot.depth);
      dummy.updateMatrix();
      buildingMesh.setMatrixAt(i, dummy.matrix);

      dummyGlass.position.set(lot.x, lot.minHeight / 2, lot.z);
      dummyGlass.scale.set(lot.width - 0.7, lot.minHeight - 0.4, lot.depth - 0.7);
      dummyGlass.updateMatrix();
      glassMesh.setMatrixAt(i, dummyGlass.matrix);
    });

    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
    buildingMesh.instanceMatrix.needsUpdate = true;
    glassMesh.instanceMatrix.needsUpdate = true;
    scene.add(buildingMesh);
    scene.add(glassMesh);
    buildingMeshRef.current = buildingMesh;
    glassMeshRef.current = glassMesh;

    // Architectural crowns for prominent skyscraper spires
    const crownLots = lots.map((l, idx) => ({ lot: l, idx })).filter((item) => item.lot.hasCrown);
    crownLotIndicesRef.current = crownLots.map((item) => item.idx);
    const unitPyramidGeo = new THREE.ConeGeometry(0.7, 1, 4);
    const crownsMesh = new THREE.InstancedMesh(unitPyramidGeo, bronzeMat, crownLots.length);

    crownLots.forEach((item, cIdx) => {
      const { lot } = item;
      dummy.position.set(lot.x, lot.minHeight + 3, lot.z);
      dummy.scale.set(lot.width * 0.4, 7, lot.depth * 0.4);
      dummy.updateMatrix();
      crownsMesh.setMatrixAt(cIdx, dummy.matrix);
    });
    crownsMesh.instanceMatrix.needsUpdate = true;
    scene.add(crownsMesh);
    crownsMeshRef.current = crownsMesh;

    // --- 6. PROCEDURALLY DISTRIBUTE MULTIPLE CRANE MODELS ACROSS THE CITY GRID ---
    // Distribute realistic tower cranes procedurally across building construction lots
    const distributedCranes: {
      root: THREE.Group;
      slew: THREE.Group;
      speed: number;
      phase: number;
      sweepAngle: number;
      baseRotY: number;
      basePos: THREE.Vector3;
      beaconMesh?: THREE.Mesh;
    }[] = [];

    // Additional materials for detailed crane anatomy
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.5,
      metalness: 0.3,
    });
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xff1e00,
      transparent: true,
      opacity: 0.95,
    });
    const ballastMat = new THREE.MeshStandardMaterial({
      color: 0x474c56,
      roughness: 0.8,
    });

    // Procedural lot selection: prioritize named projects, tall core towers, and ensure spatial spread
    const candidateLots = [...lots].sort((a, b) => {
      if (a.projectId && !b.projectId) return -1;
      if (!a.projectId && b.projectId) return 1;
      return b.fullHeight - a.fullHeight;
    });

    const selectedCranePlacements: { lot: GridLot; craneX: number; craneZ: number; side: string }[] = [];
    const minCraneSeparation = 28;

    candidateLots.forEach((lot) => {
      // Allow up to 16 cranes across the sprawling city grid
      if (selectedCranePlacements.length >= 16) return;
      if (lot.fullHeight < 24) return;

      // Determine placement side based on surrounding layout
      let side = 'E';
      let craneX = lot.x + lot.width / 2 + 2.5;
      let craneZ = lot.z;

      if (lot.x > 35) {
        side = 'W';
        craneX = lot.x - lot.width / 2 - 2.5;
      } else if (lot.z > 25) {
        side = 'S';
        craneX = lot.x;
        craneZ = lot.z + lot.depth / 2 + 2.5;
      } else if (lot.z < -25) {
        side = 'N';
        craneX = lot.x;
        craneZ = lot.z - lot.depth / 2 - 2.5;
      }

      // Proximity check so cranes don't crowd or overlap
      const tooClose = selectedCranePlacements.some((p) => {
        return Math.hypot(p.craneX - craneX, p.craneZ - craneZ) < minCraneSeparation;
      });

      if (!tooClose) {
        selectedCranePlacements.push({ lot, craneX, craneZ, side });
      }
    });

    // Build procedural crane models for each placed crane
    selectedCranePlacements.forEach((placement, cIdx) => {
      const { lot, craneX, craneZ } = placement;
      lot.craneIndex = cIdx;

      const craneRoot = new THREE.Group();
      craneRoot.position.set(craneX, 0, craneZ);

      // Height scaled procedurally with lot target height
      const mastHeight = Math.max(lot.fullHeight + 9 + (cIdx % 4) * 3, 36);
      const jibLength = 22 + (cIdx % 5) * 4;

      // 1. Vertical lattice mast (box with diagonal structural cross bracing)
      const mast = new THREE.Mesh(new THREE.BoxGeometry(1.3, mastHeight, 1.3), craneOrangeMat);
      mast.position.y = mastHeight / 2;
      craneRoot.add(mast);

      // Mast foundation base collar
      const baseCollar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), ballastMat);
      baseCollar.position.y = 0.6;
      craneRoot.add(baseCollar);

      // 2. Slewing turntable unit mounted at top of mast
      const slew = new THREE.Group();
      slew.position.y = mastHeight;

      const slewRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 12), ballastMat);
      slewRing.position.y = 0.3;
      slew.add(slewRing);

      // Operator control cabin
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 1.1), cabinMat);
      cabin.position.set(1.1, 1.4, 0.6);
      slew.add(cabin);

      // A-frame tower peak (masthead)
      const apexPeak = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), craneOrangeMat);
      apexPeak.position.set(0, 3.2, 0);
      slew.add(apexPeak);

      // Aviation warning hazard beacon at the pinnacle
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), beaconMat);
      beacon.position.set(0, 5.4, 0);
      slew.add(beacon);

      // 3. Horizontal lattice working jib
      const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLength, 0.8, 0.8), craneOrangeMat);
      jib.position.set(jibLength / 2, 1.2, 0);
      slew.add(jib);

      // Jib suspension tie cable from apex
      const jibTie = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, jibLength * 0.7, 4), craneCableMat);
      jibTie.position.set(jibLength * 0.45, 3.0, 0);
      jibTie.rotation.z = -Math.atan2(2.5, jibLength * 0.45);
      slew.add(jibTie);

      // 4. Counter-jib & concrete ballast counterweights
      const cJibLength = 8.5;
      const cJib = new THREE.Mesh(new THREE.BoxGeometry(cJibLength, 0.75, 0.75), craneOrangeMat);
      cJib.position.set(-cJibLength / 2, 1.2, 0);
      slew.add(cJib);

      // Multi-slab counterweights
      const cWeight = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.8, 1.4), ballastMat);
      cWeight.position.set(-cJibLength + 1.8, 1.2, 0);
      slew.add(cWeight);

      // Counter-jib tie cable
      const cJibTie = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, cJibLength * 0.8, 4), craneCableMat);
      cJibTie.position.set(-cJibLength * 0.45, 2.8, 0);
      cJibTie.rotation.z = Math.atan2(2.4, cJibLength * 0.45);
      slew.add(cJibTie);

      // 5. Trolley, hoist cable, and lifting hook block
      const trolleyT = 0.5 + (cIdx % 4) * 0.12; // position along jib
      const cableDrop = 14 + (cIdx % 3) * 6;
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, cableDrop, 4), craneCableMat);
      cable.position.set(jibLength * trolleyT, 1.2 - cableDrop / 2, 0);
      slew.add(cable);

      const hookBlock = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), craneOrangeMat);
      hookBlock.position.set(jibLength * trolleyT, 1.2 - cableDrop, 0);
      slew.add(hookBlock);

      craneRoot.add(slew);
      scene.add(craneRoot);

      // Varied rotation parameters for organic site movement
      const speed = 0.22 + (cIdx % 5) * 0.09;
      const phase = (cIdx * 1.7) % (Math.PI * 2);
      const sweepAngle = 0.75 + (cIdx % 3) * 0.35;
      const baseRotY = (cIdx * 0.85) % (Math.PI * 2);

      distributedCranes.push({
        root: craneRoot,
        slew,
        speed,
        phase,
        sweepAngle,
        baseRotY,
        basePos: new THREE.Vector3(craneX, 0, craneZ),
        beaconMesh: beacon,
      });
    });

    allCranesRef.current = distributedCranes;

    // --- 7. Interactive District Waypoint Pins ---
    const pinsGroup = new THREE.Group();
    const pinGeo = new THREE.ConeGeometry(0.7, 2.2, 4);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xe65100 });
    const pinRingGeo = new THREE.TorusGeometry(1.2, 0.08, 4, 16);
    const pinRingMat = new THREE.MeshBasicMaterial({ color: 0xe65100 });

    const pinCoords: { id: string; pos: [number, number, number] }[] = [
      { id: 'metro', pos: [-22, 1.8, 14] },
      { id: 'park', pos: [-10, 1.8, -18] },
      { id: 'waterfront', pos: [18, 1.8, 24] },
      { id: 'cafe', pos: [10, 1.8, -6] },
    ];

    const pinList: { id: string; mesh: THREE.Group; basePos: THREE.Vector3 }[] = [];
    pinCoords.forEach(({ id, pos }) => {
      const pinObj = new THREE.Group();
      pinObj.position.set(...pos);

      const cone = new THREE.Mesh(pinGeo, pinMat);
      cone.rotation.x = Math.PI;
      cone.position.y = 1.2;
      pinObj.add(cone);

      const ring = new THREE.Mesh(pinRingGeo, pinRingMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.2;
      pinObj.add(ring);

      pinsGroup.add(pinObj);
      pinList.push({ id, mesh: pinObj, basePos: new THREE.Vector3(...pos) });
    });
    scene.add(pinsGroup);
    pinMarkersRef.current = pinList;

    // --- 8. Animated Avenue Traffic (Cruising Cars) ---
    const carsList: { mesh: THREE.Mesh; laneZ: number; speed: number; minX: number; maxX: number }[] = [];
    const carMatWhite = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    const carMatSilver = new THREE.MeshBasicMaterial({ color: 0x9099a2 });
    const carMatDark = new THREE.MeshBasicMaterial({ color: 0x22252a });
    const carColors = [carMatWhite, carMatSilver, carMatDark];

    for (let c = 0; c < 20; c++) {
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.2), carColors[c % 3]);
      const laneZ = c % 2 === 0 ? -6.5 : -9.5;
      const speed = c % 2 === 0 ? 0.35 + (c % 3) * 0.08 : -0.35 - (c % 3) * 0.08;
      cMesh.position.set((c - 10) * 18, 0.5, laneZ);
      scene.add(cMesh);
      carsList.push({ mesh: cMesh, laneZ, speed, minX: -170, maxX: 170 });
    }

    // --- 9. Mouse Parallax & Events ---
    const onMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mousePos.current.targetX = ((e.clientX - halfW) / halfW) * 4;
      mousePos.current.targetY = -((e.clientY - halfH) / halfH) * 2;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // --- 10. Raycasting for Clicking Buildings & Pins ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (!container || !cameraRef.current) return;
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, cameraRef.current);

      // Pins
      const pinMeshes = pinMarkersRef.current.map((p) => p.mesh);
      const pinHits = raycaster.intersectObjects(pinMeshes, true);
      if (pinHits.length > 0) {
        let hit: THREE.Object3D | null = pinHits[0].object;
        while (hit && hit.parent && hit.parent !== pinsGroup) {
          hit = hit.parent;
        }
        const matched = pinMarkersRef.current.find((p) => p.mesh === hit);
        if (matched) {
          onPinClick(matched.id);
          return;
        }
      }

      // Check click on InstancedMesh buildings
      if (buildingMeshRef.current) {
        const hits = raycaster.intersectObject(buildingMeshRef.current);
        if (hits.length > 0 && hits[0].instanceId !== undefined) {
          const lot = lotsRef.current[hits[0].instanceId];
          if (lot && lot.projectId) {
            onBuildingSelect(lot.projectId);
          } else {
            // Focus clicked district lot
            onBuildingSelect('obsidian-tower');
          }
        }
      }
    };
    container.addEventListener('click', onClick);

    // --- 11. Render Loop: Extrude Entire Grid & Animate Multiple Cranes ---
    const startTime = performance.now();
    let prevSp = -1;

    const renderLoop = () => {
      animFrameId.current = requestAnimationFrame(renderLoop);
      const currentTime = performance.now();
      const elapsedTime = (currentTime - startTime) / 1000;

      const { scrollProgress: sp, activeProjectId: activeProj, activePinId: aPin } = propsRef.current;

      // Mouse smoothing
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      // Animate traffic
      carsList.forEach((c) => {
        c.mesh.position.x += c.speed;
        if (c.mesh.position.x > c.maxX) c.mesh.position.x = c.minX;
        if (c.mesh.position.x < c.minX) c.mesh.position.x = c.maxX;
      });

      // Slew all distributed tower cranes procedurally across the grid during construction phase
      const cranesActive = sp < 0.54;
      allCranesRef.current.forEach((crane) => {
        if (cranesActive) {
          crane.root.visible = true;
          crane.slew.rotation.y = crane.baseRotY + Math.sin(elapsedTime * crane.speed + crane.phase) * crane.sweepAngle;
          if (crane.beaconMesh) {
            // Pulse aviation warning hazard beacon
            const pulse = (Math.sin(elapsedTime * 4.5 + crane.phase) + 1) * 0.5;
            (crane.beaconMesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.65;
          }
        } else {
          // Demobilize cranes when city finishes rising
          crane.root.visible = false;
        }
      });

      // --- DYNAMIC INSTANCED MESH CITY EXTRUSION DRIVEN BY SCROLL ---
      // Update building heights across the entire sprawling grid
      if (Math.abs(sp - prevSp) > 0.001 || sp < 0.54) {
        prevSp = sp;

        let buildT = 0;
        if (sp < 0.12) {
          buildT = 0;
        } else if (sp >= 0.12 && sp < 0.52) {
          buildT = (sp - 0.12) / 0.40;
        } else {
          buildT = 1;
        }

        const bMesh = buildingMeshRef.current;
        const gMesh = glassMeshRef.current;
        const cMesh = crownsMeshRef.current;

        if (bMesh && gMesh) {
          lotsRef.current.forEach((lot, i) => {
            // Staggered organic growth across the grid
            const localT = Math.min(Math.max((buildT - lot.staggerOffset) / (1 - lot.staggerOffset), 0), 1);
            const easeT = localT * localT * (3 - 2 * localT); // smooth cubic ease

            const h = lot.minHeight + easeT * (lot.fullHeight - lot.minHeight);
            lot.currentHeight = h;

            // Structure instance matrix
            dummy.position.set(lot.x, h / 2, lot.z);
            dummy.scale.set(lot.width, h, lot.depth);
            dummy.updateMatrix();
            bMesh.setMatrixAt(i, dummy.matrix);

            // Glass window band matrix
            dummyGlass.position.set(lot.x, h / 2, lot.z);
            dummyGlass.scale.set(lot.width - 0.6, Math.max(h - 0.4, 0.5), lot.depth - 0.6);
            dummyGlass.updateMatrix();
            gMesh.setMatrixAt(i, dummyGlass.matrix);
          });

          bMesh.instanceMatrix.needsUpdate = true;
          gMesh.instanceMatrix.needsUpdate = true;
        }

        // Crowns update
        if (cMesh) {
          crownLotIndicesRef.current.forEach((lotIdx, cIdx) => {
            const lot = lotsRef.current[lotIdx];
            const h = lot.currentHeight;
            dummy.position.set(lot.x, h + 3, lot.z);
            dummy.scale.set(lot.width * 0.4, 6, lot.depth * 0.4);
            dummy.updateMatrix();
            cMesh.setMatrixAt(cIdx, dummy.matrix);
          });
          cMesh.instanceMatrix.needsUpdate = true;
        }
      }

      // Animate Waypoint Pins in Neighborhood Section
      const inNeighborhood = sp >= 0.66 && sp < 0.84;
      pinMarkersRef.current.forEach(({ id, mesh, basePos }) => {
        if (inNeighborhood) {
          mesh.visible = true;
          const isSelected = id === aPin;
          const bounce = Math.sin(elapsedTime * 3) * 0.4;
          mesh.position.y = basePos.y + (isSelected ? 1.0 + bounce : 0);
          mesh.scale.set(isSelected ? 1.3 : 1.0, isSelected ? 1.3 : 1.0, isSelected ? 1.3 : 1.0);
        } else {
          mesh.visible = false;
        }
      });

      // --- PANORAMIC CAMERA TRAJECTORY FOR SPRAWLING METROPOLIS ---
      if (sp < 0.12) {
        // 1. Hero: Low dynamic wide shot across the crane-filled construction district
        targetCamPos.current.set(50 + mousePos.current.x, 26 + mousePos.current.y, 64);
        targetLookAt.current.set(0, 14, -12);
      } else if (sp >= 0.12 && sp < 0.52) {
        // 2. Timeline: Sweeping orbital crane trajectory that climbs high above the growing city
        const buildT = (sp - 0.12) / 0.40;
        const camHeight = 24 + buildT * 50;
        const camDist = 72 - buildT * 8;
        const orbitAngle = buildT * 0.95;
        targetCamPos.current.set(
          Math.cos(orbitAngle) * camDist + mousePos.current.x,
          camHeight + mousePos.current.y,
          Math.sin(orbitAngle) * camDist - 12
        );
        targetLookAt.current.set(0, camHeight * 0.45, -16);
      } else if (sp >= 0.52 && sp < 0.68) {
        // 3. Residences: Smoothly fly toward selected project lot
        if (activeProj === 'cloister-courtyard') {
          targetCamPos.current.set(-22 + mousePos.current.x * 0.6, 36 + mousePos.current.y, 22);
          targetLookAt.current.set(-22, 26, -28);
        } else if (activeProj === 'horizon-terraces') {
          targetCamPos.current.set(45 + mousePos.current.x * 0.6, 24 + mousePos.current.y, 45);
          targetLookAt.current.set(45, 12, 60);
        } else {
          // The Spire
          targetCamPos.current.set(22 + mousePos.current.x * 0.6, 36 + mousePos.current.y, 26);
          targetLookAt.current.set(22, 30, -28);
        }
      } else if (sp >= 0.68 && sp < 0.84) {
        // 4. Neighborhood: High-angle sweeping masterplan view of the entire city district & canal
        targetCamPos.current.set(48 + mousePos.current.x, 75 + mousePos.current.y, 65);
        targetLookAt.current.set(0, 2, 0);
      } else {
        // 5. Portfolio & Inquire: Panoramic skyline perspective
        targetCamPos.current.set(58 + mousePos.current.x, 40 + mousePos.current.y, 85);
        targetLookAt.current.set(0, 22, -12);
      }

      // Smooth Camera Lerping
      currentCamPos.current.lerp(targetCamPos.current, 0.055);
      currentLookAt.current.lerp(targetLookAt.current, 0.055);

      if (cameraRef.current) {
        cameraRef.current.position.copy(currentCamPos.current);
        cameraRef.current.lookAt(currentLookAt.current);
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('click', onClick);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [onBuildingSelect, onFloorHover, onPinClick]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-auto z-0 cursor-crosshair overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
};
