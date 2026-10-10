import * as THREE from "three";

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, r: () => number) => void, seed = 7) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cache: Record<string, THREE.Texture> = {};

export function regolithTexture() {
  if (cache.reg) return cache.reg;
  const t = canvasTex(512, (ctx, r) => {
    ctx.fillStyle = "#a9a59d";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const v = 120 + r() * 90;
      ctx.fillStyle = `rgba(${v},${v - 3},${v - 8},${0.25 + r() * 0.4})`;
      const s = r() * 2.5;
      ctx.fillRect(r() * 512, r() * 512, s, s);
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * 512, y = r() * 512, rad = 3 + r() * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(70,68,64,0.35)");
      g.addColorStop(0.8, "rgba(90,88,84,0.15)");
      g.addColorStop(1, "rgba(220,215,205,0.25)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 36);
  return (cache.reg = t);
}

export function planetTexture(kind: "earth" | "moon" | "mars") {
  if (cache[kind]) return cache[kind];
  const t = canvasTex(1024, (ctx, r) => {
    const W = 1024, H = 1024;
    if (kind === "earth") {
      ctx.fillStyle = "#1f5fa8"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = r() > 0.5 ? "#3f8f4a" : "#8a7a45";
        ctx.beginPath();
        const x = r() * W, y = 200 + r() * 600;
        for (let k = 0; k < 9; k++) ctx.ellipse(x + (r() - 0.5) * 120, y + (r() - 0.5) * 80, 30 + r() * 70, 20 + r() * 50, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#eef4f8"; ctx.fillRect(0, 0, W, 70); ctx.fillRect(0, H - 70, W, 70);
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`;
        ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 40 + r() * 120, 6 + r() * 14, r() * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      const base = kind === "moon" ? "#b9b5ad" : "#c2603a";
      ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = kind === "moon" ? "rgba(90,90,95,0.35)" : "rgba(120,45,25,0.35)";
        ctx.beginPath(); ctx.ellipse(r() * W, 200 + r() * 600, 60 + r() * 160, 40 + r() * 90, r() * 3, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 220; i++) {
        const x = r() * W, y = r() * H, rad = 3 + r() * 22;
        ctx.strokeStyle = kind === "moon" ? "rgba(235,232,225,0.5)" : "rgba(240,170,120,0.35)";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = kind === "moon" ? "rgba(80,80,80,0.25)" : "rgba(90,30,15,0.25)";
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (kind === "mars") { ctx.fillStyle = "rgba(250,245,240,0.8)"; ctx.fillRect(0, 0, W, 40); }
    }
  }, kind === "earth" ? 3 : kind === "moon" ? 11 : 21);
  return (cache[kind] = t);
}

export function floorTexture() {
  if (cache.floor) return cache.floor;
  const t = canvasTex(256, (ctx) => {
    ctx.fillStyle = "#d9dde3"; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#b8bfc9"; ctx.lineWidth = 3; ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeStyle = "#c9cfd8"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  return (cache.floor = t);
}

export function panelTexture() {
  if (cache.panel) return cache.panel;
  const t = canvasTex(256, (ctx) => {
    ctx.fillStyle = "#14254a"; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#5b7bb8"; ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 256); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(256, i * 32); ctx.stroke(); }
  });
  return (cache.panel = t);
}
