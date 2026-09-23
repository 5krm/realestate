import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildCity, type CityHandles } from './cityBuilder';
import { buildHeroTowers, type HeroTowerHandle, type SlabPickInfo } from './heroTowers';
import { SkyRig } from './skyRig';
import { CameraDirector } from './cameraDirector';
import { makeCloudTexture, makeGlowSprite } from './textures';
import { RESIDENCE_PROJECTS, NEIGHBORHOOD_PINS, PROJECT_BY_ID } from '../data/residences';
import { store } from '../state/store';

export interface EngineCallbacks {
  onTip: (tip: { x: number; y: number; label: string; sub: string } | null) => void;
  onQualityChange: (q: 'high' | 'medium' | 'low') => void;
  onReady: () => void;
}

const BUILD_RANGE: [number, number] = [0.10, 0.46];

export class SceneEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass: ShaderPass | null = null;
  private city: CityHandles;
  private sky: SkyRig;
  private heroes: HeroTowerHandle[];
  private director = new CameraDirector();
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private fill: THREE.DirectionalLight;
  private clouds: THREE.Sprite[] = [];
  private glowSpriteTex: THREE.Texture;

  // interaction
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-10, -10);
  private pointerPx = { x: 0, y: 0 };
  private parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  private drag = { active: false, moved: 0, lastX: 0, lastY: 0, az: 0, pol: 0, tAz: 0, tPol: 0 };

  // runtime state
  private dusk = 0;
  private explodeVal = 0;
  private time = 0;
  private buildT = 0;
  private frameCount = 0;

  // pins & route
  private pinGroup = new THREE.Group();
  private pins: { id: string; root: THREE.Group; ring: THREE.Mesh; beam: THREE.Mesh; base: THREE.Vector3 }[] = [];
  private route: { curve: THREE.CatmullRomCurve3; tube: THREE.Mesh; mat: THREE.ShaderMaterial; pulse: THREE.Mesh } | null = null;
  private routeKey = '';

  // quality
  private quality: 'high' | 'medium' | 'low' = 'high';
  private emaDt = 16;
  private lastQualitySwitch = 0;

  // blueprint
  private blueprintOn = false;
  private savedBg: THREE.Color | null = null;
  private savedFog: THREE.FogExp2 | null = null;

  private resizeObserver: ResizeObserver;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.5, 1400);
    this.camera.position.set(-153, 95, -83);
    this.camera.lookAt(0, 26, -6);

    this.scene.fog = new THREE.FogExp2(0xdce7ee, 0.0016);

    // stylized sky environment for glass reflections (PMREM'd equirect gradient)
    this.scene.environment = this.makeSkyEnvironment();
    this.scene.environmentIntensity = 0.55;

    // lighting
    this.sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
    this.sun.position.set(90, 180, 60);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -200;
    this.sun.shadow.camera.right = 200;
    this.sun.shadow.camera.top = 200;
    this.sun.shadow.camera.bottom = -200;
    this.sun.shadow.camera.near = 40;
    this.sun.shadow.camera.far = 520;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfd9ec, 0xcfc4ae, 1.15);
    this.scene.add(this.hemi);
    this.fill = new THREE.DirectionalLight(0xdfeaf2, 0.5);
    this.fill.position.set(-80, 60, -70);
    this.scene.add(this.fill);

    // world
    this.sky = new SkyRig(this.scene);
    this.city = buildCity(this.scene);

    const specs = RESIDENCE_PROJECTS.map((p) => ({
      projectId: p.id,
      anchor: p.anchor,
      height: p.heightMeters,
      floors: p.floorsCount,
      listedFloors: p.floors.map((f) => f.floorNumber),
      floorMeta: new Map(p.floors.map((f) => [f.floorNumber, { name: f.name, price: f.price }])),
    }));
    this.heroes = buildHeroTowers(this.scene, specs, this.city.glowMaterials);

    // clouds
    const cloudTex = makeCloudTexture();
    for (let i = 0; i < 11; i++) {
      const mat = new THREE.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.32 + Math.random() * 0.22,
        depthWrite: false,
      });
      const s = new THREE.Sprite(mat);
      const scale = 70 + Math.random() * 90;
      s.scale.set(scale, scale * 0.42, 1);
      s.position.set(-260 + Math.random() * 520, 130 + Math.random() * 60, -120 + Math.random() * 240);
      this.scene.add(s);
      this.clouds.push(s);
    }

    this.glowSpriteTex = makeGlowSprite();

    // district pins
    this.buildPins();
    this.scene.add(this.pinGroup);

    // post-processing
    this.rebuildComposer();

    // events
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
    container.addEventListener('pointermove', this.onPointerMove, { passive: true });
    container.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    container.addEventListener('click', this.onClick);

    // signal ready after first frames
    requestAnimationFrame(() => this.callbacks.onReady());
  }

  // ---------------- pins & routes ----------------
  private buildPins() {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff6a1a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    NEIGHBORHOOD_PINS.forEach((p) => {
      const root = new THREE.Group();
      root.position.set(p.coordinates[0], 0, p.coordinates[1]);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: 0xe65100,
        emissive: new THREE.Color(0xff5a00),
        emissiveIntensity: 0.7,
        roughness: 0.3,
      });
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.5), diamondMat);
      diamond.position.y = 7;
      const ringGeo = new THREE.TorusGeometry(2.6, 0.16, 6, 28);
      const ring = new THREE.Mesh(ringGeo, diamondMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.5;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 60, 8, 1, true), beamMat.clone());
      beam.position.y = 30;
      root.add(diamond, ring, beam);
      root.userData.pinId = p.id;
      root.userData.clickable = true;
      this.pinGroup.add(root);
      this.pins.push({
        id: p.id,
        root,
        ring,
        beam,
        base: new THREE.Vector3(p.coordinates[0], 0, p.coordinates[1]),
      });
    });
    this.pinGroup.visible = false;
  }

  private rebuildRoute() {
    const s = store.get();
    const key = `${s.activeProjectId}->${s.activePinId}`;
    if (key === this.routeKey) return;
    this.routeKey = key;

    if (this.route) {
      this.scene.remove(this.route.tube, this.route.pulse);
      this.route.tube.geometry.dispose();
    }
    const proj = PROJECT_BY_ID[s.activeProjectId];
    const pin = NEIGHBORHOOD_PINS.find((p) => p.id === s.activePinId);
    if (!proj || !pin) {
      this.route = null;
      return;
    }
    const from = new THREE.Vector3(proj.anchor[0], 3, proj.anchor[1]);
    const to = new THREE.Vector3(pin.coordinates[0], 3, pin.coordinates[1]);
    // arc high over rooflines — reads as a rail ribbon in the sky
    const mid1 = from.clone().lerp(to, 0.33).add(new THREE.Vector3(0, 26, 0));
    const mid2 = from.clone().lerp(to, 0.66).add(new THREE.Vector3(0, 22, 0));
    const curve = new THREE.CatmullRomCurve3([from, mid1, mid2, to]);
    const geo = new THREE.TubeGeometry(curve, 72, 0.4, 6, false);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xff7a1a) }, uAlpha: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime, uAlpha;
        uniform vec3 uColor;
        void main() {
          float dash = step(0.45, fract(vUv.x * 26.0 - uTime * 1.4));
          gl_FragColor = vec4(uColor, dash * 0.85 * uAlpha);
        }
      `,
    });
    const tube = new THREE.Mesh(geo, mat);
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0 })
    );
    this.scene.add(tube, pulse);
    this.route = { curve, tube, mat, pulse };
  }

  // ---------------- post ----------------
  private makeSkyEnvironment(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#7fb2dd');
    grad.addColorStop(0.42, '#c8e0f0');
    grad.addColorStop(0.55, '#f2ede0');
    grad.addColorStop(0.62, '#d8cfba');
    grad.addColorStop(1, '#8f887a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    // warm sun blob
    const sg = ctx.createRadialGradient(340, 84, 4, 340, 84, 60);
    sg.addColorStop(0, 'rgba(255,244,214,0.95)');
    sg.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, 512, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
    return env;
  }

  private rebuildComposer() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;

    this.composer?.dispose();
    if (this.quality === 'low') {
      this.composer = null;
      this.bloomPass = null;
      this.gradePass = null;
      return;
    }

    const target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: this.quality === 'high' ? 4 : 0,
    });
    const composer = new EffectComposer(this.renderer, target);
    composer.setPixelRatio(this.renderer.getPixelRatio());
    composer.setSize(w, h);

    composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(w / 2), Math.floor(h / 2)),
      0.18,
      0.55,
      0.82
    );
    composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uVig: { value: 0.32 }, uWarm: { value: 0.0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float uVig, uWarm;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          vec2 d = vUv - 0.5;
          float vig = 1.0 - dot(d, d) * uVig * 2.2;
          c.rgb *= vig;
          c.rgb = mix(c.rgb, c.rgb * vec3(1.05, 0.97, 0.9), uWarm);
          gl_FragColor = c;
        }
      `,
    });
    composer.addPass(this.gradePass);

    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  private setQuality(q: 'high' | 'medium' | 'low') {
    if (q === this.quality) return;
    this.quality = q;
    this.lastQualitySwitch = this.time;
    const dpr = window.devicePixelRatio;
    if (q === 'high') {
      this.renderer.setPixelRatio(Math.min(dpr, 1.5));
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(dpr, 1.15));
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
    } else {
      this.renderer.setPixelRatio(1);
      this.sun.castShadow = false;
    }
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.rebuildComposer();
    this.onResize();
    this.callbacks.onQualityChange(q);
  }

  // ---------------- events ----------------
  private onResize = () => {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.pointerPx.x = e.clientX - rect.left;
    this.pointerPx.y = e.clientY - rect.top;
    this.parallax.tx = this.pointer.x;
    this.parallax.ty = this.pointer.y;

    if (this.drag.active) {
      const dx = e.clientX - this.drag.lastX;
      const dy = e.clientY - this.drag.lastY;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      this.drag.moved += Math.abs(dx) + Math.abs(dy);
      this.drag.tAz += dx * 0.0042;
      this.drag.tPol = THREE.MathUtils.clamp(this.drag.tPol - dy * 0.0032, -0.6, 0.75);
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    this.drag.active = true;
    this.drag.moved = 0;
    this.drag.lastX = e.clientX;
    this.drag.lastY = e.clientY;
  };

  private onPointerUp = () => {
    this.drag.active = false;
  };

  private onClick = () => {
    if (this.drag.moved > 7) return; // was a drag, not a click
    const s = store.get();

    if (s.section === 'residences') {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      for (const hero of this.heroes) {
        if (hero.projectId !== s.activeProjectId) continue;
        const hit = hero.pick(this.raycaster);
        if (hit && hit.listed) {
          store.set({ modalFloor: { projectId: hit.projectId, floorNumber: hit.floorNumber } });
        }
      }
    } else if (s.section === 'district') {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const roots = this.pins.map((p) => p.root);
      const hits = this.raycaster.intersectObjects(roots, true);
      if (hits.length) {
        let o: THREE.Object3D | null = hits[0].object;
        while (o && !o.userData.pinId) o = o.parent;
        if (o?.userData.pinId) store.set({ activePinId: o.userData.pinId });
      }
    }
  };

  // ---------------- blueprint ----------------
  private applyBlueprint(on: boolean) {
    if (on === this.blueprintOn) return;
    this.blueprintOn = on;
    if (on) {
      this.savedFog = this.scene.fog as THREE.FogExp2;
      this.scene.overrideMaterial = new THREE.MeshBasicMaterial({
        wireframe: true,
        color: 0x67d4ff,
        transparent: true,
        opacity: 0.55,
      });
      this.scene.background = new THREE.Color(0x071f3a);
      this.scene.fog = null;
      this.sky.dome.visible = false;
      this.sky.water.visible = false;
      this.clouds.forEach((c) => (c.visible = false));
      this.city.setConstructionFxVisible(false);
      if (this.bloomPass) this.bloomPass.strength = 0.28;
      document.body.classList.add('blueprint');
    } else {
      this.scene.overrideMaterial = null;
      this.scene.background = this.savedBg;
      this.scene.fog = this.savedFog;
      this.sky.dome.visible = true;
      this.sky.water.visible = true;
      this.clouds.forEach((c) => (c.visible = true));
      this.city.setConstructionFxVisible(true);
      document.body.classList.remove('blueprint');
    }
  }

  // ---------------- main frame ----------------
  update(progress: number, dt: number, time: number) {
    if (this.disposed) return;
    this.time = time;
    this.frameCount++;
    const s = store.get();

    // ---- adaptive quality (EMA frame time) ----
    this.emaDt = this.emaDt * 0.96 + dt * 1000 * 0.04;
    if (this.frameCount > 90 && time - this.lastQualitySwitch > 4) {
      if (this.emaDt > 27 && this.quality !== 'low') {
        this.setQuality(this.quality === 'high' ? 'medium' : 'low');
      }
    }

    // ---- build progress ----
    const buildT = THREE.MathUtils.clamp((progress - BUILD_RANGE[0]) / (BUILD_RANGE[1] - BUILD_RANGE[0]), 0, 1);
    this.buildT = buildT;
    this.city.update(buildT, dt, time);

    // ---- time of day ----
    let targetDusk: number;
    if (s.timePreference === 'auto') {
      if (progress < 0.10) targetDusk = 0.05;
      else if (progress < 0.46) targetDusk = THREE.MathUtils.lerp(0.05, 0.22, (progress - 0.1) / 0.36);
      else if (progress < 0.62) targetDusk = THREE.MathUtils.lerp(0.22, 0.5, (progress - 0.46) / 0.16);
      else if (progress < 0.76) targetDusk = THREE.MathUtils.lerp(0.5, 0.72, (progress - 0.62) / 0.14);
      else if (progress < 0.88) targetDusk = THREE.MathUtils.lerp(0.72, 0.88, (progress - 0.76) / 0.12);
      else targetDusk = 1;
    } else if (s.timePreference === 'day') targetDusk = 0.04;
    else if (s.timePreference === 'golden') targetDusk = 0.55;
    else targetDusk = 1;
    this.dusk = THREE.MathUtils.lerp(this.dusk, targetDusk, 1 - Math.exp(-dt * 2.2));

    this.sky.update(this.dusk, time, this.scene, this.sun, this.hemi);
    this.city.setDusk(this.dusk);
    this.heroes.forEach((h) => h.setDusk(this.dusk));
    const nightAmt = THREE.MathUtils.smoothstep(this.dusk, 0.5, 1);
    this.fill.intensity = 0.5 * (1 - nightAmt * 0.75);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.12, nightAmt);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 0.95, THREE.MathUtils.smoothstep(this.dusk, 0.6, 1));

    if (this.bloomPass) {
      const night = THREE.MathUtils.smoothstep(this.dusk, 0.45, 0.9);
      this.bloomPass.strength = this.blueprintOn ? 0.28 : 0.16 + night * 0.34;
    }
    if (this.gradePass) {
      this.gradePass.uniforms.uWarm.value = THREE.MathUtils.smoothstep(this.dusk, 0.25, 0.6) * 0.5;
      this.gradePass.uniforms.uVig.value = 0.3 + THREE.MathUtils.smoothstep(this.dusk, 0.5, 1) * 0.18;
    }

    // cloud drift
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.position.x += dt * (1.6 + i * 0.12);
      if (c.position.x > 300) c.position.x = -300;
      const mat = c.material as THREE.SpriteMaterial;
      mat.opacity = (0.32 + (i % 4) * 0.06) * (1 - THREE.MathUtils.smoothstep(this.dusk, 0.55, 0.9) * 0.75);
    }

    // blueprint mode
    this.applyBlueprint(s.blueprint);
    if (this.blueprintOn && this.bloomPass) this.bloomPass.strength = 0.3;

    // ---- hero towers growth & explode ----
    const explodeTarget = s.section === 'residences' && s.exploded ? 1 : 0;
    this.explodeVal = THREE.MathUtils.lerp(this.explodeVal, explodeTarget, 1 - Math.exp(-dt * 3.2));
    this.heroes.forEach((h, i) => {
      const gStart = 0.05 + i * 0.1;
      const growth = THREE.MathUtils.clamp((buildT - gStart) / 0.55, 0, 1);
      h.setGrowth(growth);
      h.setExplode(h.projectId === s.activeProjectId ? this.explodeVal : 0);
    });

    // ---- drag damping ----
    this.drag.az = THREE.MathUtils.lerp(this.drag.az, this.drag.tAz, 1 - Math.exp(-dt * 6));
    this.drag.pol = THREE.MathUtils.lerp(this.drag.pol, this.drag.tPol, 1 - Math.exp(-dt * 6));

    // parallax smoothing
    this.parallax.x = THREE.MathUtils.lerp(this.parallax.x, this.parallax.tx, 1 - Math.exp(-dt * 3));
    this.parallax.y = THREE.MathUtils.lerp(this.parallax.y, this.parallax.ty, 1 - Math.exp(-dt * 3));

    // ---- pins & routes (district section) ----
    const inDistrict = s.section === 'district';
    this.pinGroup.visible = inDistrict;
    if (inDistrict) {
      this.pins.forEach((p, i) => {
        const selected = p.id === s.activePinId;
        p.root.position.y = Math.sin(time * 1.6 + i * 1.3) * 0.35;
        const sc = THREE.MathUtils.lerp(p.root.scale.x, selected ? 1.35 : 0.9, 1 - Math.exp(-dt * 6));
        p.root.scale.set(sc, sc, sc);
        p.root.children[0].rotation.y = time * 1.1 + i;
        const ringMat = p.ring.material as THREE.MeshStandardMaterial;
        ringMat.emissiveIntensity = selected ? 1.6 + Math.sin(time * 4) * 0.6 : 0.5;
        (p.beam.material as THREE.MeshBasicMaterial).opacity = selected ? 0.2 : 0.07;
      });
      this.rebuildRoute();
      if (this.route) {
        this.route.mat.uniforms.uTime.value = time;
        this.route.mat.uniforms.uAlpha.value = THREE.MathUtils.lerp(
          this.route.mat.uniforms.uAlpha.value as number,
          1,
          1 - Math.exp(-dt * 3)
        );
        const t = (time * 0.14) % 1;
        this.route.pulse.position.copy(this.route.curve.getPointAt(t));
        (this.route.pulse.material as THREE.MeshBasicMaterial).opacity = 0.95;
      }
    } else if (this.route) {
      this.route.mat.uniforms.uAlpha.value = THREE.MathUtils.lerp(
        this.route.mat.uniforms.uAlpha.value as number,
        0,
        1 - Math.exp(-dt * 5)
      );
      (this.route.pulse.material as THREE.MeshBasicMaterial).opacity =
        this.route.mat.uniforms.uAlpha.value as number;
    }

    // ---- camera ----
    const activeHero = this.heroes.find((h) => h.projectId === s.activeProjectId) || this.heroes[0];
    const sectionT = this.sectionLocal(progress, s.section);
    this.director.update(this.camera, {
      section: s.section,
      sectionT,
      buildT,
      time,
      dt,
      dragAz: this.drag.az,
      dragPol: this.drag.pol,
      parX: this.parallax.x,
      parY: this.parallax.y,
      tower: {
        anchor: activeHero.anchor.clone().add(new THREE.Vector3(s.activeProjectId === 'skybridge' ? 0 : 0, 0, 0)),
        midY: activeHero.midY,
        height: activeHero.midHeight,
      },
      buildFocus: this.city.focus,
    });

    // ---- slab hover picking (residences only, every other frame) ----
    if (s.section === 'residences' && this.frameCount % 2 === 0 && !this.blueprintOn) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      let tip: { x: number; y: number; label: string; sub: string } | null = null;
      let hotFloor: number | null = s.selectedFloor;
      for (const hero of this.heroes) {
        if (hero.projectId !== s.activeProjectId) continue;
        const hit: SlabPickInfo | null = hero.pick(this.raycaster);
        if (hit && hit.listed) {
          hotFloor = hit.floorNumber;
          const v = hit.point.clone().project(this.camera);
          tip = {
            x: ((v.x + 1) / 2) * this.container.clientWidth,
            y: ((-v.y + 1) / 2) * this.container.clientHeight,
            label: hit.label,
            sub: `${hit.price} · Level ${hit.floorNumber}`,
          };
          this.container.style.cursor = 'pointer';
        }
        // keep non-active towers unhighlighted
        if (!hit || !hit.listed) this.container.style.cursor = '';
      }
      this.heroes.forEach((hero) => {
        hero.setHighlightFloor(hero.projectId === s.activeProjectId ? hotFloor : null);
      });
      this.callbacks.onTip(tip);
    } else if (s.section !== 'residences') {
      this.callbacks.onTip(null);
      this.container.style.cursor = '';
      this.heroes.forEach((hero) => hero.setHighlightFloor(null));
    }

    // ---- render ----
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private sectionLocal(p: number, id: string): number {
    const ranges: Record<string, [number, number]> = {
      hero: [0, 0.1],
      build: [0.1, 0.46],
      residences: [0.46, 0.62],
      district: [0.62, 0.76],
      record: [0.76, 0.88],
      contact: [0.88, 1],
    };
    const r = ranges[id] || [0, 1];
    return THREE.MathUtils.clamp((p - r[0]) / (r[1] - r[0]), 0, 1);
  }

  dispose() {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('click', this.onClick);
    document.body.classList.remove('blueprint');
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
