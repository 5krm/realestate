import * as THREE from 'three';

/**
 * Atmosphere rig: gradient sky dome (day → golden → night with stars),
 * sun/moon tracking, fog + light palettes, animated canal water.
 */
export class SkyRig {
  dome: THREE.Mesh;
  water: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private waterMat: THREE.ShaderMaterial;
  private sunDir = new THREE.Vector3(0.4, 0.7, 0.3);
  dusk = 0;

  // palettes
  private pZenDay = new THREE.Color(0x6fa8d8);
  private pMidDay = new THREE.Color(0xbfd9ec);
  private pHorDay = new THREE.Color(0xf2ede2);
  private pZenGold = new THREE.Color(0x5b7fb4);
  private pMidGold = new THREE.Color(0xe8a878);
  private pHorGold = new THREE.Color(0xffd9a0);
  private pZenNight = new THREE.Color(0x04060e);
  private pMidNight = new THREE.Color(0x0a1428);
  private pHorNight = new THREE.Color(0x1c2c46);
  private pFogDay = new THREE.Color(0xdce7ee);
  private pFogGold = new THREE.Color(0xe8c49a);
  private pFogNight = new THREE.Color(0x0a1322);

  constructor(scene: THREE.Scene) {
    // --- Sky dome ---
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: this.pZenDay.clone() },
        uMid: { value: this.pMidDay.clone() },
        uHorizon: { value: this.pHorDay.clone() },
        uSunDir: { value: this.sunDir.clone() },
        uSunColor: { value: new THREE.Color(0xfff2dd) },
        uDusk: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_Position.z = gl_Position.w; // pin to far plane
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        uniform vec3 uZenith, uMid, uHorizon, uSunColor, uSunDir;
        uniform float uDusk, uTime;

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec3 dir = normalize(vDir);
          float y = clamp(dir.y, -0.08, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, y));
          col = mix(col, uZenith, smoothstep(0.22, 0.75, y));

          // Sun disc + halo (hidden below horizon at night)
          float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
          float disc = smoothstep(0.9992, 0.99975, sunAmt);
          float halo = pow(sunAmt, 90.0) * 0.5 + pow(sunAmt, 8.0) * 0.12;
          float sunVis = 1.0 - smoothstep(0.55, 0.85, uDusk);
          col += uSunColor * (disc * 1.4 + halo) * sunVis;

          // Moon: dim disc opposite-ish
          if (uDusk > 0.55) {
            vec3 moonDir = normalize(vec3(-0.45, 0.62, -0.55));
            float m = max(dot(dir, moonDir), 0.0);
            float mdisc = smoothstep(0.9995, 0.99985, m);
            float mhalo = pow(m, 160.0) * 0.3;
            float mVis = smoothstep(0.55, 0.8, uDusk);
            col += vec3(0.82, 0.88, 1.0) * (mdisc * 1.1 + mhalo) * mVis;

            // Stars
            float starVis = smoothstep(0.6, 0.95, uDusk) * smoothstep(0.05, 0.3, dir.y);
            if (starVis > 0.001) {
              vec2 sp = dir.xz / max(dir.y, 0.12) * 36.0;
              vec2 cell = floor(sp);
              float h = hash21(cell);
              vec2 starPos = fract(sp) - 0.5;
              float star = smoothstep(0.10, 0.02, length(starPos + (vec2(h, fract(h * 7.0)) - 0.5) * 0.7));
              float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
              col += vec3(0.9, 0.95, 1.0) * star * step(0.82, h) * starVis * twinkle * 0.8;
            }
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(820, 32, 18), this.skyMat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // --- Canal water ---
    this.waterMat = new THREE.ShaderMaterial({
      transparent: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uDusk: { value: 0 },
        uSunDir: { value: this.sunDir.clone() },
        uShallow: { value: new THREE.Color(0x2e7f9e) },
        uDeep: { value: new THREE.Color(0x1b4b66) },
        uSkyNight: { value: new THREE.Color(0x0a1626) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vXZ;
        varying vec3 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vXZ = w.xz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vXZ;
        varying vec3 vWorld;
        uniform float uTime, uDusk;
        uniform vec3 uShallow, uDeep, uSkyNight, uSunDir;

        void main() {
          float t = uTime;
          float w1 = sin(vXZ.x * 0.22 + t * 1.1) * 0.5 + sin(vXZ.y * 0.31 - t * 0.7) * 0.5;
          float w2 = sin(vXZ.x * 0.05 - t * 0.35 + vXZ.y * 0.09) * 0.5;
          float rip = w1 * 0.5 + w2;

          vec3 day = mix(uDeep, uShallow, 0.5 + rip * 0.35);
          // sun glitter streak
          float glitter = pow(max(0.0, sin(vXZ.x * 0.8 + t * 2.0) * sin(vXZ.y * 1.1 - t * 1.4)), 6.0);
          day += vec3(1.0, 0.92, 0.75) * glitter * 0.35;

          vec3 night = uSkyNight + vec3(0.9, 0.7, 0.4) * glitter * 0.55;
          vec3 col = mix(day, night, smoothstep(0.45, 0.9, uDusk));
          // darken at golden
          col = mix(col, col * vec3(1.0, 0.82, 0.6), smoothstep(0.3, 0.6, uDusk) * (1.0 - smoothstep(0.6, 0.9, uDusk)) * 0.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(420, 17), this.waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, 0.32, 38);
    scene.add(this.water);
  }

  /** dusk: 0 = day, 0.55 = golden hour, 1 = night */
  update(dusk: number, time: number, scene: THREE.Scene, sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight) {
    this.dusk = dusk;
    const g = THREE.MathUtils.smoothstep(dusk, 0.22, 0.62);
    const ni = THREE.MathUtils.smoothstep(dusk, 0.62, 0.95);

    // sky colors: day → golden → night
    const zen = this.pZenDay.clone().lerp(this.pZenGold, g).lerp(this.pZenNight, ni);
    const mid = this.pMidDay.clone().lerp(this.pMidGold, g).lerp(this.pMidNight, ni);
    const hor = this.pHorDay.clone().lerp(this.pHorGold, g).lerp(this.pHorNight, ni);
    this.skyMat.uniforms.uZenith.value.copy(zen);
    this.skyMat.uniforms.uMid.value.copy(mid);
    this.skyMat.uniforms.uHorizon.value.copy(hor);
    this.skyMat.uniforms.uDusk.value = dusk;
    this.skyMat.uniforms.uTime.value = time;
    this.waterMat.uniforms.uTime.value = time;
    this.waterMat.uniforms.uDusk.value = dusk;

    // Sun path: high noon → low west → below horizon
    const el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(56, -8, THREE.MathUtils.smoothstep(dusk, 0, 0.85)));
    const az = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(35, -78, THREE.MathUtils.smoothstep(dusk, 0, 0.8)));
    this.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    this.skyMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.waterMat.uniforms.uSunDir.value.copy(this.sunDir);

    // smooth handoff: sun dives, moon rises — no shadow popping
    const moonPos = new THREE.Vector3(-80, 120, -90);
    const sunPos = this.sunDir.clone().multiplyScalar(220);
    sun.position.copy(sunPos.lerp(moonPos, THREE.MathUtils.smoothstep(dusk, 0.55, 0.8)));
    sun.intensity = THREE.MathUtils.lerp(2.6, 2.1, g) * (1 - THREE.MathUtils.smoothstep(dusk, 0.55, 0.85));
    // moonlight
    sun.intensity += ni * 0.35;
    sun.color.set(0xfff6e8).lerp(new THREE.Color(0xff9a45), g * (1 - ni)).lerp(new THREE.Color(0x8fa8d8), ni);

    hemi.intensity = THREE.MathUtils.lerp(1.15, 0.28, Math.max(g * 0.4, ni));
    hemi.color.copy(zen).lerp(new THREE.Color(0xffffff), 0.35);
    hemi.groundColor.set(0xcfc4ae).lerp(new THREE.Color(0x11161f), ni);

    // fog
    const fogC = this.pFogDay.clone().lerp(this.pFogGold, g).lerp(this.pFogNight, ni);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(fogC);
      scene.fog.density = THREE.MathUtils.lerp(0.0016, 0.0024, ni);
    }
  }

  get skyDusk() {
    return this.dusk;
  }
}
