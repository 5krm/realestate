/**
 * Procedural ambient audio synthesizer using the Web Audio API.
 * Provides subtle wind, low harmonic drone, and gentle atmospheric tone.
 * Zero external audio files required.
 */
class ArchitecturalSoundscape {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private duskGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  public toggle(): boolean {
    this.initContext();
    if (!this.ctx) return false;

    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public getStatus(): boolean {
    return this.isPlaying;
  }

  private start() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 2.5);
    this.masterGain.connect(this.ctx.destination);

    // Filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(1.5, this.ctx.currentTime);
    this.filter.connect(this.masterGain);

    // Pink/Brownian noise for wind breeze
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    noise.connect(this.filter);
    this.filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    noise.start();

    // Gentle sub drone (architectural resonance)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
    const osc1Gain = this.ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    osc1.connect(osc1Gain);
    osc1Gain.connect(this.masterGain);
    osc1.start();

    // Warm dusk overtone (E2 / 82.4Hz)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(82.4, this.ctx.currentTime);
    this.duskGain = this.ctx.createGain();
    this.duskGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    osc2.connect(this.duskGain);
    this.duskGain.connect(this.masterGain);
    osc2.start();

    this.isPlaying = true;
  }

  public updateScroll(progress: number) {
    if (!this.isPlaying || !this.ctx || !this.filter || !this.duskGain) return;
    try {
      // Modulate frequency based on scroll
      const targetFreq = 300 + progress * 500;
      this.filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
      
      // Dusk hour boosts warm harmonic overtone
      if (progress > 0.75) {
        this.duskGain.gain.setTargetAtTime(0.09, this.ctx.currentTime, 0.3);
      } else {
        this.duskGain.gain.setTargetAtTime(0.03, this.ctx.currentTime, 0.3);
      }
    } catch {
      // Audio node cleanup safeguard
    }
  }

  public stop() {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        if (this.ctx && this.ctx.state !== 'closed') {
          this.ctx.suspend();
        }
        this.isPlaying = false;
      }, 800);
    } catch {
      this.isPlaying = false;
    }
  }
}

export const soundscape = new ArchitecturalSoundscape();
