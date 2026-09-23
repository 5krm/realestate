import * as THREE from 'three';
import type { SectionId } from '../types';

export interface CameraContext {
  section: SectionId;
  /** local progress 0..1 inside the section */
  sectionT: number;
  /** global build progress 0..1 */
  buildT: number;
  time: number;
  dt: number;
  /** drag orbit offsets (radians) accumulated by user */
  dragAz: number;
  dragPol: number;
  /** mouse parallax -1..1 */
  parX: number;
  parY: number;
  /** active tower anchor + height for residences orbit */
  tower: { anchor: THREE.Vector3; midY: number; height: number };
  buildFocus: THREE.Vector3;
}

/**
 * Section-aware cinematic camera. Each section defines an analytic
 * goal (position / lookAt / fov); heavy exponential damping turns
 * section switches into smooth crane moves.
 */
export class CameraDirector {
  private pos = new THREE.Vector3(150, 80, 165);
  private look = new THREE.Vector3(0, 25, 0);
  private fov = 44;
  private goalPos = new THREE.Vector3();
  private goalLook = new THREE.Vector3();
  private goalFov = 44;

  update(cam: THREE.PerspectiveCamera, ctx: CameraContext) {
    const { section, sectionT, buildT, time } = ctx;

    switch (section) {
      case 'hero': {
        // slow aerial establishing orbit, gently drifting left
        const az = -2.55 + sectionT * 0.35 + time * 0.008;
        const r = 185 - sectionT * 25;
        this.goalPos.set(Math.cos(az) * r, 95 - sectionT * 18, Math.sin(az) * r + 20);
        this.goalLook.set(0, 26, -6);
        this.goalFov = 46;
        // generous parallax on hero
        this.goalPos.x += ctx.parX * 10;
        this.goalPos.y += ctx.parY * 5;
        break;
      }
      case 'build': {
        // crane-shot rise: starts low over the pit, sweeps up & around as towers grow
        const t = ctx.sectionT;
        const az = 0.85 - t * 1.5;
        const r = 125 - t * 30;
        const h = 22 + t * 95;
        const f = ctx.buildFocus;
        this.goalPos.set(f.x + Math.cos(az) * r, h, f.z + Math.sin(az) * r);
        this.goalLook.set(f.x * 0.4, 6 + buildT * 85, f.z * 0.4);
        this.goalFov = 47;
        this.goalPos.x += ctx.parX * 5;
        break;
      }
      case 'residences': {
        // orbit the active tower; user drag adjusts azimuth/tilt
        const tw = ctx.tower;
        const az = 2.2 + sectionT * 0.6 + ctx.dragAz;
        const r = tw.height * 0.62 + 34;
        const polarH = THREE.MathUtils.clamp(tw.midY + ctx.dragPol * 46, 8, tw.height + 26);
        this.goalPos.set(tw.anchor.x + Math.cos(az) * r, polarH, tw.anchor.z + Math.sin(az) * r);
        this.goalLook.set(tw.anchor.x, tw.midY + ctx.dragPol * 20, tw.anchor.z);
        this.goalFov = 38;
        break;
      }
      case 'district': {
        // pull up into a masterplan "drone map" view with drag orbit
        const az = 0.5 + sectionT * 0.35 + ctx.dragAz * 0.6;
        const r = 205 - sectionT * 15;
        this.goalPos.set(Math.cos(az) * 40 + ctx.parX * 8, 195, Math.sin(az) * 60 + r * 0.35);
        this.goalLook.set(ctx.parX * 6, 0, 12);
        this.goalFov = 52;
        break;
      }
      case 'record': {
        // golden-hour hero dolly: slow sideways track past the skyline
        const t = ctx.sectionT;
        this.goalPos.set(150 - t * 45, 62 + t * 30, 148 - t * 22);
        this.goalLook.set(-10, 55 + t * 12, -5);
        this.goalFov = 42;
        break;
      }
      case 'contact': {
        // street-level night push toward the glowing tower entrance
        const t = ctx.sectionT;
        const sway = Math.sin(time * 0.4) * 1.6;
        this.goalPos.set(30 - t * 9, 7.5 + t * 4, 52 - t * 14);
        this.goalPos.x += sway + ctx.parX * 3;
        this.goalLook.set(2, 14 + t * 8 + ctx.parY * 4, -8);
        this.goalFov = 40;
        break;
      }
    }

    // exponential damping → buttery crane moves
    const k = 1 - Math.exp(-ctx.dt * 2.4);
    const kLook = 1 - Math.exp(-ctx.dt * 2.9);
    this.pos.lerp(this.goalPos, k);
    this.look.lerp(this.goalLook, kLook);
    this.fov = THREE.MathUtils.lerp(this.fov, this.goalFov, k);

    cam.position.copy(this.pos);
    cam.lookAt(this.look);
    if (Math.abs(cam.fov - this.fov) > 0.01) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }
}
