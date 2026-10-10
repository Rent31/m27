// Simulation speed: simulated mission minutes per real second (4 => 27h ≈ 6.75 min).
export const MIN_PER_SEC = 4;
export const MISSION_END_MIN = 27 * 60;
export const SAVE_KEY = "mission27-save-v1";
export const SETTINGS_KEY = "mission27-settings-v1";

export const SUIT_ACCENTS = ["#ff8a3d", "#5ad6c4", "#ffd166", "#9b8cff", "#ff6b8b"];

export function fmtClock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `H${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const LEVELS = [
  { xp: 0, name: "Trainee" },
  { xp: 150, name: "Junior Astronaut" },
  { xp: 400, name: "Flight Specialist" },
  { xp: 800, name: "Mission Commander" },
];
export function levelFor(xp: number) {
  let i = 0;
  LEVELS.forEach((l, idx) => { if (xp >= l.xp) i = idx; });
  const next = LEVELS[i + 1];
  return { name: LEVELS[i].name, index: i, next: next?.xp ?? null, base: LEVELS[i].xp };
}
