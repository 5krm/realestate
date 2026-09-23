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

  // Camera targets & continuous smooth motion
  const currentCamPos = useRef(new THREE.Vector3(48, 22, 60));
  const currentLookAt = useRef(new THREE.Vector3(0, 14, -10));
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Store latest props in ref for render loop
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
    const skySunsetColor = new THREE.Color(0xe8d0ba);
    scene.background = skyDayColor.clone();
    scene.fog = new THREE.FogExp2(skyDayColor.clone(), 0.003);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.5,
      900
    );
    camera.position.set(48, 22, 60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    // Clamped pixel ratio prevents GPU fill-rate throttling on high-res displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // --- 2. Directional Sun & Ambient Lighting Rig ---
    const sunDayColor = new THREE.Color(0xfff8ee);
    const sunSunsetColor = new THREE.Color(0xffaa66);
    const sunLight = new THREE.DirectionalLight(sunDayColor.clone(), 2.4);
    sunLight.position.set(65, 95, 50);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xa5cbe8, 0xd4cebe, 1.2);
    scene.add(hemiLight);

    const fillLight = new THREE.DirectionalLight(0xc6d9ea, 0.8);
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
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xff1e00,
      transparent: true,
      opacity: 0.95,
    });
    const ballastMat = new THREE.MeshStandardMaterial({
      color: 0x474c56,
      roughness: 0.8,
    });
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.5,
    });

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

    // Arched Bridges over Canal
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
    const aveEW = new THREE.Mesh(new THREE.BoxGeometry(420, 0.05, 14), asphaltMat);
    aveEW.position.set(0, 0.04, -8);
    avenuesGroup.add(aveEW);

    [-65, 0, 65].forEach((ax) => {
      const aveNS = new THREE.Mesh(new THREE.BoxGeometry(14, 0.05, 280), asphaltMat);
      aveNS.position.set(ax, 0.04, 0);
      avenuesGroup.add(aveNS);
    });

    // Dashed centerlines
    for (let x = -190; x < 190; x += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.35), laneLineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.08, -8);
      avenuesGroup.add(dash);
    }
    scene.add(avenuesGroup);

    // Dynamic Traffic Simulation (10 sleek vehicles)
    const carsList: { mesh: THREE.Mesh; speed: number; minX: number; maxX: number }[] = [];
    const carMatList = [
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 }),
    ];
    for (let i = 0; i < 10; i++) {
      const cMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 1.2, 1.8),
        carMatList[i % carMatList.length]
      );
      const isEastbound = i % 2 === 0;
      cMesh.position.set(-160 + i * 36, 0.6, isEastbound ? -10.5 : -5.5);
      scene.add(cMesh);
      carsList.push({
        mesh: cMesh,
        speed: (isEastbound ? 1 : -1) * (0.35 + (i % 3) * 0.12),
        minX: -190,
        maxX: 190,
      });
    }

    // Waterfront Promenade Park & Trees
    const parkGroup = new THREE.Group();
    const parkLawn = new THREE.Mesh(new THREE.BoxGeometry(55, 0.1, 28), parkGrassMat);
    parkLawn.position.set(-32, 0.05, 10);
    parkGroup.add(parkLawn);

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.2, 5);
    const crownGeo = new THREE.SphereGeometry(1.2, 6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e5c38, roughness: 0.8 });

    [-50, -42, -34, -26, -18, -10].forEach((tx) => {
      [3, 17].forEach((tz) => {
        const tree = new THREE.Group();
        tree.position.set(tx, 0, tz);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.1;
        tree.add(trunk);
        const crown = new THREE.Mesh(crownGeo, leavesMat);
        crown.position.y = 2.6;
        tree.add(crown);
        parkGroup.add(tree);
      });
    });
    scene.add(parkGroup);

    // --- 5. INSTANCED-MESH SPRAWLING CITY GENERATOR ---
    const lots: GridLot[] = [];
    const gridCols = [-135, -105, -78, -52, -26, 26, 52, 78, 105, 135];
    const gridRows = [-130, -100, -72, -44, -20, 12, 64, 92, 120];

    // Seeded pseudo-random generator
    let seed = 1337;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    gridRows.forEach((rZ) => {
      gridCols.forEach((cX) => {
        // Skip grand canal corridor (Z between 18 and 50)
        if (rZ > 18 && rZ < 50) return;
        // Skip primary avenue intersections
        if (Math.abs(rZ + 8) < 10) return;
        if (Math.abs(cX) < 12) return;
        // Skip central waterfront park footprint
        if (cX > -58 && cX < -8 && rZ > -4 && rZ < 26) return;

        const offsetX = (random() - 0.5) * 5;
        const offsetZ = (random() - 0.5) * 5;
        const x = cX + offsetX;
        const z = rZ + offsetZ;

        const distFromCenter = Math.sqrt(x * x + z * z);
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
          fullHeight = 88;
          width = 20;
          depth = 20;
          hasCrown = true;
          projectId = 'obsidian-tower';
        } else if (Math.abs(cX + 26) < 6 && Math.abs(rZ + 20) < 6) {
          fullHeight = 60;
          width = 17;
          depth = 17;
          projectId = 'cloister-courtyard';
        } else if (isRiverfront && Math.abs(cX - 52) < 8) {
          fullHeight = 28;
          width = 26;
          depth = 18;
          projectId = 'horizon-terraces';
        }

        lots.push({
          id: `lot_${lots.length}`,
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

    // InstancedMesh using extruded 1x1x1 Unit Box Geometry
    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMesh = new THREE.InstancedMesh(unitBoxGeo, limestoneMat, totalLots);
    const glassMesh = new THREE.InstancedMesh(unitBoxGeo, glassMat, totalLots);

    const colorLimestone = new THREE.Color(0xede9e1);
    const colorConcrete = new THREE.Color(0xf4f2ee);
    const colorSandstone = new THREE.Color(0xdad4c8);
    const palette = [colorLimestone, colorConcrete, colorSandstone];

    const dummy = new THREE.Object3D();
    const dummyGlass = new THREE.Object3D();

    lots.forEach((lot, i) => {
      buildingMesh.setColorAt(i, palette[lot.colorType]);

      dummy.position.set(lot.x, lot.minHeight / 2, lot.z);
      dummy.scale.set(lot.width, lot.minHeight, lot.depth);
      dummy.updateMatrix();
      buildingMesh.setMatrixAt(i, dummy.matrix);

      dummyGlass.position.set(lot.x, lot.minHeight / 2, lot.z);
      dummyGlass.scale.set(lot.width - 0.7, lot.minHeight - 0.4, lot.depth - 0.7);
      dummyGlass.updateMatrix();
      glassMesh.setMatrixAt(i, dummyGlass.matrix);
    });

    buildingMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
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

    // --- 6. PROCEDURALLY DISTRIBUTE TOWER CRANES ACROSS GRID ---
    // Strategically place 8-10 high-impact tower cranes without visual clutter or draw-call lag
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

    const candidateLots = [...lots].sort((a, b) => {
      if (a.projectId && !b.projectId) return -1;
      if (!a.projectId && b.projectId) return 1;
      return b.fullHeight - a.fullHeight;
    });

    const selectedCranePlacements: { lot: GridLot; craneX: number; craneZ: number }[] = [];
    const minCraneSeparation = 32;

    candidateLots.forEach((lot) => {
      if (selectedCranePlacements.length >= 8) return;
      if (lot.fullHeight < 28) return;

      const craneX = lot.x > 0 ? lot.x + lot.width / 2 + 2.4 : lot.x - lot.width / 2 - 2.4;
      const craneZ = lot.z;

      const tooClose = selectedCranePlacements.some((p) => {
        return Math.hypot(p.craneX - craneX, p.craneZ - craneZ) < minCraneSeparation;
      });

      if (!tooClose) {
        selectedCranePlacements.push({ lot, craneX, craneZ });
      }
    });

    selectedCranePlacements.forEach((placement, cIdx) => {
      const { lot, craneX, craneZ } = placement;
      lot.craneIndex = cIdx;

      const craneRoot = new THREE.Group();
      craneRoot.position.set(craneX, 0, craneZ);

      const mastHeight = Math.max(lot.fullHeight + 9 + (cIdx % 3) * 3, 38);
      const jibLength = 24 + (cIdx % 4) * 4;

      // Mast & base
      const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, mastHeight, 1.2), craneOrangeMat);
      mast.position.y = mastHeight / 2;
      craneRoot.add(mast);

      const collar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), ballastMat);
      collar.position.y = 0.6;
      craneRoot.add(collar);

      // Slewing unit
      const slew = new THREE.Group();
      slew.position.y = mastHeight;

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.0), cabinMat);
      cabin.position.set(1.0, 1.2, 0.5);
      slew.add(cabin);

      const apex = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.8, 4), craneOrangeMat);
      apex.position.set(0, 3.0, 0);
      slew.add(apex);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), beaconMat);
      beacon.position.set(0, 5.0, 0);
      slew.add(beacon);

      const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLength, 0.8, 0.8), craneOrangeMat);
      jib.position.set(jibLength / 2, 1.2, 0);
      slew.add(jib);

      const cJib = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, 0.7), craneOrangeMat);
      cJib.position.set(-4, 1.2, 0);
      slew.add(cJib);

      const cWeight = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 1.3), ballastMat);
      cWeight.position.set(-6, 1.2, 0);
      slew.add(cWeight);

      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 16, 4), craneCableMat);
      cable.position.set(jibLength * 0.65, -7, 0);
      slew.add(cable);

      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), craneOrangeMat);
      hook.position.set(jibLength * 0.65, -15, 0);
      slew.add(hook);

      craneRoot.add(slew);
      scene.add(craneRoot);

      distributedCranes.push({
        root: craneRoot,
        slew,
        speed: 0.2 + (cIdx % 4) * 0.08,
        phase: cIdx * 1.5,
        sweepAngle: 0.85,
        baseRotY: (cIdx * 1.1) % (Math.PI * 2),
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

    const districtPins = [
      { id: 'waterfront-quay', x: 0, y: 1.5, z: 20 },
      { id: 'civic-colonnade', x: -28, y: 1.5, z: -8 },
      { id: 'grand-canal', x: 25, y: 1.5, z: 34 },
      { id: 'central-gardens', x: -32, y: 1.5, z: 10 },
    ];

    const pinMarkers: { id: string; mesh: THREE.Group; basePos: THREE.Vector3 }[] = [];
    districtPins.forEach((pin) => {
      const pinObj = new THREE.Group();
      pinObj.position.set(pin.x, pin.y, pin.z);

      const cone = new THREE.Mesh(pinGeo, pinMat);
      cone.rotation.x = Math.PI;
      cone.position.y = 1.6;
      pinObj.add(cone);

      const ring = new THREE.Mesh(pinRingGeo, pinRingMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.2;
      pinObj.add(ring);

      pinsGroup.add(pinObj);
      pinMarkers.push({ id: pin.id, mesh: pinObj, basePos: new THREE.Vector3(pin.x, pin.y, pin.z) });
    });
    scene.add(pinsGroup);
    pinMarkersRef.current = pinMarkers;

    // --- 8. Smooth Input & Raycasting ---
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.x = nx;
      pointer.y = ny;

      mousePos.current.targetX = nx * 3.5;
      mousePos.current.targetY = ny * 2.0;
    };

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', onResize);

    const onClick = () => {
      if (!cameraRef.current) return;
      raycaster.setFromCamera(pointer, cameraRef.current);

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

      if (buildingMeshRef.current) {
        const hits = raycaster.intersectObject(buildingMeshRef.current);
        if (hits.length > 0 && hits[0].instanceId !== undefined) {
          const lot = lotsRef.current[hits[0].instanceId];
          if (lot && lot.projectId) {
            onBuildingSelect(lot.projectId);
          } else {
            onBuildingSelect('obsidian-tower');
          }
        }
      }
    };
    container.addEventListener('click', onClick);

    // --- 9. CONTINUOUS CINEMATIC CAMERA TRAJECTORY SPLINE (0.0 to 1.0) ---
    // Smooth parametric waypoints ensuring zero abrupt jumps across all sections
    const cameraKeyframes = [
      { t: 0.00, pos: new THREE.Vector3(50, 22, 62), lookAt: new THREE.Vector3(0, 14, -10) },
      { t: 0.16, pos: new THREE.Vector3(38, 26, 50), lookAt: new THREE.Vector3(0, 16, -14) },
      { t: 0.34, pos: new THREE.Vector3(12, 44, 56), lookAt: new THREE.Vector3(0, 22, -16) },
      { t: 0.50, pos: new THREE.Vector3(-26, 52, 42), lookAt: new THREE.Vector3(0, 26, -18) },
      { t: 0.62, pos: new THREE.Vector3(24, 32, 32), lookAt: new THREE.Vector3(10, 22, -16) },
      { t: 0.74, pos: new THREE.Vector3(42, 70, 54), lookAt: new THREE.Vector3(0, 4, 10) },
      { t: 0.86, pos: new THREE.Vector3(22, 16, 44), lookAt: new THREE.Vector3(-8, 14, 6) },
      { t: 1.00, pos: new THREE.Vector3(56, 42, 74), lookAt: new THREE.Vector3(0, 18, -8) },
    ];

    const evaluateCameraSpline = (t: number) => {
      const clampedT = Math.min(Math.max(t, 0), 1);
      let seg = 0;
      for (let i = 0; i < cameraKeyframes.length - 1; i++) {
        if (clampedT >= cameraKeyframes[i].t && clampedT <= cameraKeyframes[i + 1].t) {
          seg = i;
          break;
        }
      }
      const k0 = cameraKeyframes[seg];
      const k1 = cameraKeyframes[seg + 1];
      const span = k1.t - k0.t;
      const localT = span > 0 ? (clampedT - k0.t) / span : 0;
      // Cubic Hermite smoothstep easing
      const ease = localT * localT * (3 - 2 * localT);

      const pos = new THREE.Vector3().lerpVectors(k0.pos, k1.pos, ease);
      const look = new THREE.Vector3().lerpVectors(k0.lookAt, k1.lookAt, ease);
      return { pos, look };
    };

    // --- 10. HIGH-PERFORMANCE RENDER LOOP ---
    const startTime = performance.now();
    let prevSp = -999;
    let hasInitializedHeights = false;

    const renderLoop = () => {
      animFrameId.current = requestAnimationFrame(renderLoop);
      const currentTime = performance.now();
      const elapsedTime = (currentTime - startTime) / 1000;

      const { scrollProgress: sp, activeProjectId: activeProj, activePinId: aPin } = propsRef.current;

      // Mouse smoothing
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      // Cars animation
      carsList.forEach((c) => {
        c.mesh.position.x += c.speed;
        if (c.mesh.position.x > c.maxX) c.mesh.position.x = c.minX;
        if (c.mesh.position.x < c.minX) c.mesh.position.x = c.maxX;
      });

      // Slewing tower cranes (active during construction phase)
      const cranesActive = sp < 0.52;
      allCranesRef.current.forEach((crane) => {
        if (cranesActive) {
          crane.root.visible = true;
          crane.slew.rotation.y = crane.baseRotY + Math.sin(elapsedTime * crane.speed + crane.phase) * crane.sweepAngle;
          if (crane.beaconMesh) {
            const pulse = (Math.sin(elapsedTime * 4.5 + crane.phase) + 1) * 0.5;
            (crane.beaconMesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.65;
          }
        } else {
          crane.root.visible = false;
        }
      });

      // Only recompute building instance matrices when scroll progress actually changes!
      // This eliminates the severe 60 FPS CPU-to-GPU bandwidth stall.
      const spDelta = Math.abs(sp - prevSp);
      if (spDelta > 0.0004 || !hasInitializedHeights) {
        prevSp = sp;
        hasInitializedHeights = true;

        let buildT = 0;
        if (sp < 0.12) {
          buildT = 0;
        } else if (sp >= 0.12 && sp < 0.50) {
          buildT = (sp - 0.12) / 0.38;
        } else {
          buildT = 1;
        }

        const bMesh = buildingMeshRef.current;
        const gMesh = glassMeshRef.current;
        const cMesh = crownsMeshRef.current;

        if (bMesh && gMesh) {
          lotsRef.current.forEach((lot, i) => {
            const localT = Math.min(Math.max((buildT - lot.staggerOffset) / (1 - lot.staggerOffset), 0), 1);
            const easeT = localT * localT * (3 - 2 * localT);

            const h = lot.minHeight + easeT * (lot.fullHeight - lot.minHeight);
            lot.currentHeight = h;

            dummy.position.set(lot.x, h / 2, lot.z);
            dummy.scale.set(lot.width, h, lot.depth);
            dummy.updateMatrix();
            bMesh.setMatrixAt(i, dummy.matrix);

            dummyGlass.position.set(lot.x, h / 2, lot.z);
            dummyGlass.scale.set(lot.width - 0.7, Math.max(h - 0.4, 0.5), lot.depth - 0.7);
            dummyGlass.updateMatrix();
            gMesh.setMatrixAt(i, dummyGlass.matrix);
          });

          bMesh.instanceMatrix.needsUpdate = true;
          gMesh.instanceMatrix.needsUpdate = true;
        }

        if (cMesh) {
          crownLotIndicesRef.current.forEach((lotIdx, cIdx) => {
            const lot = lotsRef.current[lotIdx];
            const h = lot.currentHeight;
            dummy.position.set(lot.x, h + 3.5, lot.z);
            dummy.scale.set(lot.width * 0.4, 7, lot.depth * 0.4);
            dummy.updateMatrix();
            cMesh.setMatrixAt(cIdx, dummy.matrix);
          });
          cMesh.instanceMatrix.needsUpdate = true;
        }

        // Atmosphere color shift towards golden sunset for final sections
        if (sp > 0.82) {
          const sunsetT = Math.min((sp - 0.82) / 0.18, 1);
          const currentSky = new THREE.Color().lerpColors(skyDayColor, skySunsetColor, sunsetT);
          scene.background = currentSky;
          if (scene.fog) (scene.fog as THREE.FogExp2).color.copy(currentSky);
          sunLight.color.lerpColors(sunDayColor, sunSunsetColor, sunsetT);
          sunLight.intensity = 2.4 - sunsetT * 0.5;
        } else {
          scene.background = skyDayColor;
          if (scene.fog) (scene.fog as THREE.FogExp2).color.copy(skyDayColor);
          sunLight.color.copy(sunDayColor);
          sunLight.intensity = 2.4;
        }
      }

      // Waypoint Pins
      const inNeighborhood = sp >= 0.66 && sp < 0.82;
      pinMarkersRef.current.forEach(({ id, mesh, basePos }) => {
        if (inNeighborhood) {
          mesh.visible = true;
          const isSelected = id === aPin;
          const bounce = Math.sin(elapsedTime * 3) * 0.35;
          mesh.position.y = basePos.y + (isSelected ? 0.9 + bounce : 0);
          mesh.scale.set(isSelected ? 1.25 : 1.0, isSelected ? 1.25 : 1.0, isSelected ? 1.25 : 1.0);
        } else {
          mesh.visible = false;
        }
      });

      // Continuous Spline Camera Evaluation
      const { pos: splinePos, look: splineLook } = evaluateCameraSpline(sp);

      // Blend active residence focus during residences section
      if (sp >= 0.50 && sp < 0.68) {
        const resWeight = Math.sin(((sp - 0.50) / 0.18) * Math.PI);
        if (activeProj === 'cloister-courtyard') {
          splinePos.lerp(new THREE.Vector3(-22, 34, 24), resWeight * 0.7);
          splineLook.lerp(new THREE.Vector3(-22, 24, -28), resWeight * 0.7);
        } else if (activeProj === 'horizon-terraces') {
          splinePos.lerp(new THREE.Vector3(44, 22, 44), resWeight * 0.7);
          splineLook.lerp(new THREE.Vector3(44, 10, 58), resWeight * 0.7);
        }
      }

      // Add gentle, non-jarring mouse parallax
      splinePos.x += mousePos.current.x * 0.4;
      splinePos.y += mousePos.current.y * 0.25;

      // Steadicam damping (0.055) for buttery smooth camera flythrough
      currentCamPos.current.lerp(splinePos, 0.055);
      currentLookAt.current.lerp(splineLook, 0.055);

      if (cameraRef.current) {
        cameraRef.current.position.copy(currentCamPos.current);
        cameraRef.current.lookAt(currentLookAt.current);
      }

      renderer.render(scene, camera);
    };

    renderLoop();

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
