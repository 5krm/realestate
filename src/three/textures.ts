import * as THREE from 'three';

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { canvas: c, ctx: c.getContext('2d')! };
}

let seed = 7;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
export function reseed(s: number) {
  seed = s;
}

export interface FacadeSet {
  map: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
}

/**
 * Procedural curtain-wall / concrete facade atlas with a matching
 * emissive map of randomly-lit windows for the night phase.
 * Texture tiles every `cellW` x `cellH` meters via bucket UVs.
 */
export function makeFacade(variant: 'curtain' | 'stone' | 'grid'): FacadeSet {
  const W = 256;
  const H = 256;
  const day = canvas2d(W, H);
  const night = canvas2d(W, H);
  const d = day.ctx;
  const n = night.ctx;

  // --- Day base ---
  if (variant === 'curtain') {
    const g = d.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#9db8c9');
    g.addColorStop(0.5, '#7fa0b6');
    g.addColorStop(1, '#8fadc0');
    d.fillStyle = g;
    d.fillRect(0, 0, W, H);
  } else if (variant === 'stone') {
    d.fillStyle = '#ddd6c8';
    d.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) {
      d.fillStyle = `rgba(120,110,95,${0.03 + rand() * 0.05})`;
      d.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 1 + rand() * 3);
    }
  } else {
    d.fillStyle = '#e9e7e1';
    d.fillRect(0, 0, W, H);
  }

  n.fillStyle = '#000000';
  n.fillRect(0, 0, W, H);

  // Layout: slab band at top of each tile row (each tile = 1 floor, 4 cols)
  const cols = 4;
  const rows = 1; // texture is per-floor tile; repeat handled by UV scaling
  const cw = W / cols;
  const rh = H / rows;

  for (let x = 0; x < cols; x++) {
    const px = x * cw;
    if (variant === 'curtain') {
      // glass pane with mullion shading + sky reflection variance
      const shade = 0.85 + rand() * 0.3;
      d.fillStyle = `rgb(${Math.floor(120 * shade)},${Math.floor(150 * shade)},${Math.floor(170 * shade)})`;
      d.fillRect(px + 3, 8, cw - 6, rh - 14);
      d.fillStyle = 'rgba(255,255,255,0.18)';
      d.fillRect(px + 3, 8, cw - 6, 10);
    } else if (variant === 'stone') {
      // tall slot windows
      d.fillStyle = 'rgba(70,80,92,0.9)';
      d.fillRect(px + cw * 0.28, rh * 0.22, cw * 0.44, rh * 0.56);
      d.fillStyle = 'rgba(255,255,255,0.14)';
      d.fillRect(px + cw * 0.28, rh * 0.22, cw * 0.44, 6);
    } else {
      // grid windows
      d.fillStyle = 'rgba(88,104,118,0.92)';
      d.fillRect(px + 5, rh * 0.2, cw - 10, rh * 0.5);
      d.fillStyle = 'rgba(255,255,255,0.2)';
      d.fillRect(px + 5, rh * 0.2, cw - 10, 5);
    }

    // lit windows → emissive
    if (rand() < 0.32) {
      const warm = ['#ffd9a0', '#ffc873', '#ffedcb'][Math.floor(rand() * 3)];
      n.fillStyle = warm;
      if (variant === 'stone') {
        n.fillRect(px + cw * 0.28, rh * 0.22, cw * 0.44, rh * 0.56);
      } else if (variant === 'curtain') {
        n.fillRect(px + 3, 8, cw - 6, rh - 14);
      } else {
        n.fillRect(px + 5, rh * 0.2, cw - 10, rh * 0.5);
      }
    }
  }

  // slab shadow line at tile bottom
  d.fillStyle = 'rgba(40,40,45,0.35)';
  d.fillRect(0, H - 6, W, 6);

  const map = new THREE.CanvasTexture(day.canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  map.colorSpace = THREE.SRGBColorSpace;

  const emissive = new THREE.CanvasTexture(night.canvas);
  emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  emissive.anisotropy = 4;
  emissive.colorSpace = THREE.SRGBColorSpace;

  return { map, emissive };
}

/** Scale a BoxGeometry's UVs so the facade texture repeats in real meters */
export function scaleBoxUVs(geo: THREE.BoxGeometry, w: number, h: number, dep: number, cellW = 4, cellH = 3.4) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims: [number, number][] = [
    [dep, h],
    [dep, h],
    [w, dep],
    [w, dep],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [du, dv] = dims[f];
    const repeatU = Math.max(1, Math.round(du / cellW));
    const repeatV = Math.max(1, Math.round(dv / cellH));
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * repeatU, uv.getY(i) * repeatV);
    }
  }
  uv.needsUpdate = true;
}

export function makeGlowSprite(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(canvas);
  return t;
}

export function makeCloudTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 26; i++) {
    const x = 40 + rand() * 176;
    const y = 44 + rand() * 40;
    const r = 18 + rand() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(canvas);
  return t;
}
