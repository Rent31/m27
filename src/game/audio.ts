import { SETTINGS_KEY } from "./config";

export type SceneName = "home" | "training" | "lunar" | "mars" | "none";
export type Sfx = "click" | "success" | "fail" | "alarm" | "step" | "collect" | "beep" | "wave" | "photo";

const CHORDS: Record<Exclude<SceneName, "none">, number[]> = {
  home: [110, 164.81, 220, 277.18, 329.63],
  training: [130.81, 196, 246.94, 329.63],
  lunar: [98, 146.83, 196, 233.08, 293.66],
  mars: [87.31, 130.81, 174.61, 207.65],
};
const PENTA: Record<Exclude<SceneName, "none">, number[]> = {
  home: [659.25, 739.99, 880, 987.77, 1108.73],
  training: [523.25, 587.33, 659.25, 783.99, 880],
  lunar: [587.33, 698.46, 783.99, 880, 1046.5],
  mars: [523.25, 622.25, 698.46, 830.61],
};

export interface AudioSettings { music: boolean; sfx: boolean; musicVol: number; sfxVol: number }

function loadSettings(): AudioSettings {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s) return { music: true, sfx: true, musicVol: 0.5, sfxVol: 0.6, ...s };
  } catch { /* ignore */ }
  return { music: true, sfx: true, musicVol: 0.5, sfxVol: 0.6 };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  music!: GainNode;
  sfxBus!: GainNode;
  settings: AudioSettings = typeof window !== "undefined" ? loadSettings() : { music: true, sfx: true, musicVol: 0.5, sfxVol: 0.6 };
  scene: SceneName = "none";
  private layer: { gain: GainNode; stop: () => void } | null = null;
  private listeners = new Set<() => void>();

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((f) => f()); try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* */ } }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const master = this.ctx.createGain();
      master.gain.value = 0.9;
      master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.music.connect(master);
      this.sfxBus.connect(master);
      this.applyVolumes();
      const s = this.scene;
      this.scene = "none";
      if (s !== "none") this.setScene(s);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.settings.music ? this.settings.musicVol : 0, t, 0.4);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx ? this.settings.sfxVol : 0, t, 0.05);
  }

  update(p: Partial<AudioSettings>) { this.settings = { ...this.settings, ...p }; this.applyVolumes(); this.emit(); }
  toggleMusic() { this.update({ music: !this.settings.music }); }

  setScene(name: SceneName) {
    if (name === this.scene) return;
    this.scene = name;
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.layer) {
      const old = this.layer;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + 1.6);
      setTimeout(() => old.stop(), 1800);
      this.layer = null;
    }
    if (name === "none") return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(1, t + 2.5);
    gain.connect(this.music);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = name === "lunar" ? 700 : 1000;
    filter.Q.value = 0.6;
    filter.connect(gain);
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoG.gain.value = 350;
    lfo.connect(lfoG).connect(filter.frequency);
    lfo.start();
    const nodes: (OscillatorNode | AudioBufferSourceNode)[] = [lfo];
    CHORDS[name].forEach((f, i) => {
      [0, 1].forEach((d) => {
        const o = ctx.createOscillator();
        o.type = d ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = d ? 7 : -5;
        const g = ctx.createGain();
        g.gain.value = 0.028 / (1 + i * 0.25);
        // slow swell per voice
        const sw = ctx.createOscillator();
        const swg = ctx.createGain();
        sw.frequency.value = 0.03 + i * 0.017;
        swg.gain.value = 0.012;
        sw.connect(swg).connect(g.gain);
        sw.start();
        o.connect(g).connect(filter);
        o.start();
        nodes.push(o, sw);
      });
    });
    if (name === "training" || name === "lunar") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = name === "lunar" ? 320 : 520;
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.value = name === "lunar" ? 0.05 : 0.03;
      src.connect(bp).connect(ng).connect(gain);
      src.start();
      nodes.push(src);
    }
    // gentle twinkles
    let alive = true;
    const notes = PENTA[name];
    const twinkle = () => {
      if (!alive || !this.ctx) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)] / (Math.random() < 0.5 ? 2 : 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.025, now + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 4);
      o.connect(g).connect(gain);
      o.start(now);
      o.stop(now + 4.2);
      setTimeout(twinkle, 2500 + Math.random() * 4000);
    };
    setTimeout(twinkle, 1500);
    this.layer = {
      gain,
      stop: () => { alive = false; nodes.forEach((n) => { try { n.stop(); } catch { /* */ } }); gain.disconnect(); },
    };
  }

  sfx(kind: Sfx) {
    if (!this.ctx || !this.settings.sfx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const tone = (f: number, start: number, dur: number, vol = 0.12, type: OscillatorType = "sine", f2?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t + start);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(vol, t + start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g).connect(this.sfxBus);
      o.start(t + start);
      o.stop(t + start + dur + 0.05);
    };
    switch (kind) {
      case "click": tone(880, 0, 0.08, 0.08, "triangle"); break;
      case "beep": tone(1200, 0, 0.1, 0.06); break;
      case "success": tone(523, 0, 0.18, 0.1); tone(659, 0.1, 0.18, 0.1); tone(784, 0.2, 0.35, 0.1); break;
      case "fail": tone(300, 0, 0.25, 0.1, "triangle", 200); break;
      case "alarm": tone(660, 0, 0.22, 0.07, "triangle"); tone(520, 0.25, 0.22, 0.07, "triangle"); break;
      case "step": tone(140 + Math.random() * 40, 0, 0.06, 0.03, "triangle", 80); break;
      case "collect": tone(700, 0, 0.12, 0.09); tone(1050, 0.08, 0.2, 0.09); break;
      case "wave": tone(600, 0, 0.12, 0.08, "sine", 900); tone(900, 0.12, 0.15, 0.08, "sine", 700); break;
      case "photo": tone(2000, 0, 0.04, 0.08, "square"); tone(1200, 0.06, 0.08, 0.05, "square"); break;
    }
  }
}

export const audio = new AudioEngine();
