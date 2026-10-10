import * as THREE from "three";

export const BASE_RADIUS = 24;

export const CRATERS = [
  { x: -40, z: -55, r: 13, depth: 3.5 },
  { x: 55, z: 30, r: 9, depth: 2 },
  { x: -62, z: 40, r: 15, depth: 3.5 },
  { x: 22, z: 74, r: 8, depth: 2 },
  { x: 72, z: -52, r: 18, depth: 4 },
  { x: -15, z: 95, r: 20, depth: 4 },
];

export function terrainHeight(x: number, z: number) {
  let h =
    Math.sin(x * 0.05) * Math.cos(z * 0.04) * 1.4 +
    Math.sin(x * 0.13 + z * 0.07) * 0.45 +
    Math.cos(z * 0.11 - x * 0.03) * 0.55;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) h += -c.depth * (1 - d * d) + c.depth * 0.35;
    else if (d < 1.45) h += c.depth * 0.35 * Math.max(0, 1 - Math.abs(d - 1.0) / 0.45);
  }
  const r = Math.hypot(x, z);
  return h * THREE.MathUtils.smoothstep(r, 20, 34);
}

export type Zone = "base" | "surface";
export interface Station {
  id: string;
  name: string;
  verb: string;
  x: number;
  z: number;
  r: number;
}

export const STATIONS: Station[] = [
  { id: "cmd", name: "Command Module", verb: "USE CONSOLE", x: 0, z: -9.2, r: 2.2 },
  { id: "habitat", name: "Habitat Pressure Panel", verb: "INSPECT", x: 0, z: -0.2, r: 2.2 },
  { id: "greenhouse", name: "Greenhouse", verb: "INSPECT", x: -13, z: 0.8, r: 2.4 },
  { id: "lab", name: "Science Lab", verb: "USE", x: 13, z: 0.2, r: 2.4 },
  { id: "airlock", name: "Airlock", verb: "USE", x: 6.5, z: 6.4, r: 2 },
  { id: "power", name: "Power Station", verb: "INSPECT", x: 16, z: 10.8, r: 2.2 },
  { id: "comms", name: "Comms Antenna", verb: "REPAIR", x: -16, z: 12.4, r: 2 },
  { id: "storage", name: "Supply Storage", verb: "ORGANIZE", x: -7, z: 11.6, r: 2 },
  { id: "rock1", name: "Basalt Outcrop", verb: "COLLECT SAMPLE", x: 38, z: 22, r: 3 },
  { id: "rock2", name: "Highland Anorthosite", verb: "COLLECT SAMPLE", x: -42, z: 28, r: 3 },
  { id: "rock3", name: "Regolith Breccia", verb: "COLLECT SAMPLE", x: 8, z: 54, r: 3 },
  { id: "crater", name: "Crater Rim", verb: "SCAN CRATER", x: -36, z: -38, r: 3.5 },
  { id: "earthview", name: "Earthrise Ridge", verb: "PHOTOGRAPH EARTH", x: 34, z: -36, r: 3.5 },
];
export const stationById = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

export const CREW = [
  { id: "maya", name: "Maya", role: "Systems Engineer", accent: "#5ad6c4" },
  { id: "leo", name: "Leo", role: "Science Specialist", accent: "#ffd166" },
  { id: "nova", name: "Nova", role: "Life Support Specialist", accent: "#ff6b8b" },
  { id: "ari", name: "Ari", role: "Mission Commander", accent: "#9b8cff" },
] as const;
export type CrewId = (typeof CREW)[number]["id"];

// Circle colliders for modules
export const COLLIDERS = [
  { x: -3.2, z: -3.2, r: 2.5 },
  { x: 0, z: -3.2, r: 2.5 },
  { x: 3.2, z: -3.2, r: 2.5 },
  { x: 0, z: -13, r: 3.6 },
  { x: -13, z: -4, r: 4.3 },
  { x: 13, z: -4, r: 3.8 },
  { x: 6.5, z: 3.6, r: 1.7 },
  { x: 16, z: 8, r: 2 },
  { x: 22, z: -10, r: 5.5 },
  { x: -16, z: 10, r: 1.1 },
  { x: -7, z: 9, r: 1.8 },
  { x: -30, z: 12, r: 3 },
];

export function collide(p: THREE.Vector3, extra = 0.45) {
  for (const c of COLLIDERS) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + extra;
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
}

// Mutable per-frame world state (not React state)
export const world = {
  player: new THREE.Vector3(2, 0, 3),
  playerYaw: Math.PI,
  rover: { pos: new THREE.Vector3(9, 0, 17), yaw: 0, speed: 0 },
  crew: {
    maya: new THREE.Vector3(-9, 0, 2),
    leo: new THREE.Vector3(10, 0, 2),
    nova: new THREE.Vector3(-11, 0, 3),
    ari: new THREE.Vector3(-2, 0, -7),
  } as Record<CrewId, THREE.Vector3>,
};

export function resetWorld(px = 2, pz = 3) {
  world.player.set(px, 0, pz);
  world.playerYaw = Math.PI;
  world.rover.pos.set(9, 0, 17);
  world.rover.yaw = 0;
  world.rover.speed = 0;
  world.crew.maya.set(-9, 0, 2);
  world.crew.leo.set(10, 0, 2);
  world.crew.nova.set(-11, 0, 3);
  world.crew.ari.set(-2, 0, -7);
}

export function targetPos(id: string): THREE.Vector3 | null {
  if (id in world.crew) return world.crew[id as CrewId];
  if (id === "rover") return world.rover.pos;
  const s = stationById[id];
  return s ? new THREE.Vector3(s.x, terrainHeight(s.x, s.z), s.z) : null;
}
