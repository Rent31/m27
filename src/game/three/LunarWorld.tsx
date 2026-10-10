import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Stars, Html } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGame, OBJECTIVES } from "../store";
import { keys } from "../input";
import { audio } from "../audio";
import { BASE_RADIUS, CREW, STATIONS, collide, terrainHeight, world, targetPos, stationById, type CrewId } from "../world";
import { Astronaut, type AstroMotion } from "./Astronaut";
import { regolithTexture, planetTexture, panelTexture } from "./textures";

const tmp = new THREE.Vector3();

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/* ---------------- Terrain ---------------- */
function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(420, 420, 180, 180);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, terrainHeight(x, -y));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation-x={-Math.PI / 2} receiveShadow>
      <meshStandardMaterial map={regolithTexture()} color="#c9c5bc" roughness={1} />
    </mesh>
  );
}

function Rocks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 260;
  useLayoutEffect(() => {
    const r = seeded(42);
    const m = new THREE.Object3D();
    let i = 0;
    while (i < count) {
      const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300;
      if (Math.hypot(x, z) < 21) continue;
      const s = 0.2 + Math.pow(r(), 3) * 2.2;
      m.position.set(x, terrainHeight(x, z) + s * 0.25, z);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      m.scale.set(s, s * (0.6 + r() * 0.5), s);
      m.updateMatrix();
      ref.current!.setMatrixAt(i++, m.matrix);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8d8a84" roughness={0.95} flatShading />
    </instancedMesh>
  );
}

/* ---------------- Sky ---------------- */
function Sky() {
  const earth = useRef<THREE.Mesh>(null);
  const sat = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (earth.current) earth.current.rotation.y = t * 0.02;
    if (sat.current) { sat.current.position.set(Math.cos(t * 0.05) * 140, 70 + Math.sin(t * 0.05) * 10, Math.sin(t * 0.05) * 140); sat.current.rotation.y = t * 0.3; }
    if (ship.current) { ship.current.position.set(-200 + ((t * 4) % 400), 110, -160); }
  });
  return (
    <>
      <Stars radius={260} depth={60} count={4000} factor={5} fade speed={0.4} />
      <mesh ref={earth} position={[-110, 70, -230]}>
        <sphereGeometry args={[22, 48, 48]} />
        <meshStandardMaterial map={planetTexture("earth")} emissive="#2a5fa0" emissiveIntensity={0.35} roughness={0.8} />
      </mesh>
      <mesh position={[-110, 70, -230]}>
        <sphereGeometry args={[23.2, 32, 32]} />
        <meshBasicMaterial color="#7fb8ff" transparent opacity={0.12} />
      </mesh>
      <group ref={sat}>
        <mesh><boxGeometry args={[2, 1.2, 1.2]} /><meshStandardMaterial color="#d8c27a" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[3, 0, 0]}><boxGeometry args={[3.5, 0.08, 1.4]} /><meshStandardMaterial map={panelTexture()} /></mesh>
        <mesh position={[-3, 0, 0]}><boxGeometry args={[3.5, 0.08, 1.4]} /><meshStandardMaterial map={panelTexture()} /></mesh>
      </group>
      <group ref={ship}>
        <mesh rotation-z={-Math.PI / 2}><coneGeometry args={[1, 4, 8]} /><meshStandardMaterial color="#eeeeee" /></mesh>
        <mesh position={[-2.4, 0, 0]}><sphereGeometry args={[0.5, 8, 8]} /><meshBasicMaterial color="#ffb070" /></mesh>
      </group>
    </>
  );
}

/* ---------------- Base pieces ---------------- */
const WHITE = "#eceae5";
const TRIM = "#ff8a3d";

function Blinker({ position, color = "#6cf2c8", rate = 1.3, alertColor }: { position: [number, number, number]; color?: string; rate?: number; alertColor?: boolean }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const em = useGame.getState().mission.emergency;
    const c = alertColor && em ? "#ff4040" : color;
    ref.current.color.set(c);
    ref.current.emissive.set(c);
    ref.current.emissiveIntensity = (Math.sin(clock.elapsedTime * rate * (em && alertColor ? 4 : 1) * Math.PI) > 0 ? 2.5 : 0.3);
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial ref={ref} />
    </mesh>
  );
}

function Habitat() {
  return (
    <group position={[0, 0, -3.2]}>
      <mesh position={[0, 2.2, 0]} rotation-z={Math.PI / 2} castShadow receiveShadow>
        <cylinderGeometry args={[2.2, 2.2, 7.5, 32]} />
        <meshStandardMaterial color={WHITE} roughness={0.5} metalness={0.1} />
      </mesh>
      {[-3.75, 3.75].map((x) => (
        <mesh key={x} position={[x, 2.2, 0]} castShadow>
          <sphereGeometry args={[2.2, 32, 16]} />
          <meshStandardMaterial color={WHITE} roughness={0.5} />
        </mesh>
      ))}
      {[-2.4, 0, 2.4].map((x) => (
        <mesh key={x} position={[x, 2.2, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[2.25, 2.25, 0.25, 32]} />
          <meshStandardMaterial color={TRIM} roughness={0.6} />
        </mesh>
      ))}
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 2.6, 2.1]}>
          <circleGeometry args={[0.45, 20]} />
          <meshStandardMaterial color="#ffe2a8" emissive="#ffcc77" emissiveIntensity={0.9} />
        </mesh>
      ))}
      {/* legs */}
      {[-3, 3].map((x) => [-1.4, 1.4].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.4, z]}><cylinderGeometry args={[0.18, 0.25, 0.8]} /><meshStandardMaterial color="#7d8792" /></mesh>
      )))}
      {/* pressure panel */}
      <mesh position={[0, 1.2, 2.25]}>
        <boxGeometry args={[1.2, 1.4, 0.15]} />
        <meshStandardMaterial color="#2c3a52" />
      </mesh>
      <Blinker position={[0, 1.7, 2.35]} alertColor />
      {/* tunnel to command */}
      <mesh position={[0, 1.4, -4.5]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 5, 16]} />
        <meshStandardMaterial color="#d6d3cc" roughness={0.7} />
      </mesh>
      {/* tunnels to greenhouse / lab */}
      <mesh position={[-7, 1.4, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.9, 0.9, 3.2, 16]} /><meshStandardMaterial color="#d6d3cc" roughness={0.7} /></mesh>
      <mesh position={[7, 1.4, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.9, 0.9, 3.2, 16]} /><meshStandardMaterial color="#d6d3cc" roughness={0.7} /></mesh>
    </group>
  );
}

function CommandModule() {
  return (
    <group position={[0, 0, -13]}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow><cylinderGeometry args={[3.4, 3.6, 1.2, 32]} /><meshStandardMaterial color="#cfccc5" /></mesh>
      <mesh position={[0, 1.2, 0]} castShadow><sphereGeometry args={[3.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={WHITE} roughness={0.45} /></mesh>
      <mesh position={[0, 1.2, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[3.32, 0.12, 8, 40]} /><meshStandardMaterial color={TRIM} /></mesh>
      <mesh position={[0, 2.6, 2.6]} rotation-x={-0.6}><boxGeometry args={[2.4, 0.8, 0.1]} /><meshStandardMaterial color="#9fd9ff" emissive="#4aa3e0" emissiveIntensity={0.7} /></mesh>
      <mesh position={[0, 4.6, 0]}><cylinderGeometry args={[0.05, 0.05, 1.4]} /><meshStandardMaterial color="#888" /></mesh>
      <Blinker position={[0, 5.35, 0]} color="#ff6b5b" rate={0.8} />
      <mesh position={[0, 1, 3.45]}><boxGeometry args={[1.4, 1.8, 0.2]} /><meshStandardMaterial color="#5b6675" /></mesh>
    </group>
  );
}

function Greenhouse() {
  const plants = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const lamp = useRef<THREE.PointLight>(null);
  const items = useMemo(() => {
    const r = seeded(9);
    return Array.from({ length: 14 }, (_, i) => ({ x: (i % 5) * 1.3 - 2.6, z: Math.floor(i / 5) * 1.3 - 1.3, s: 0.6 + r() * 0.5, ph: r() * 6 }));
  }, []);
  useFrame(({ clock }) => {
    const st = useGame.getState().mission;
    const sick = st.emergency?.id === "greenhouse";
    const powerLow = st.emergency?.id === "power";
    const t = clock.elapsedTime;
    plants.current?.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 1.2 + items[i].ph) * 0.08; c.scale.y = items[i].s * (sick ? 0.7 : 1); });
    mats.current.forEach((m) => m && m.color.set(sick ? "#a39a4b" : "#4fbf5e"));
    if (lamp.current) lamp.current.intensity = powerLow ? 2 : 9;
  });
  return (
    <group position={[-13, 0, -4]}>
      <mesh position={[0, 0.3, 0]} receiveShadow><cylinderGeometry args={[4.2, 4.3, 0.6, 32]} /><meshStandardMaterial color="#cfccc5" /></mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#cfeee6" transparent opacity={0.22} roughness={0.05} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.6, 0]} rotation-y={(i * Math.PI) / 4}><torusGeometry args={[4, 0.06, 6, 32, Math.PI]} /><meshStandardMaterial color="#dcdad3" /></mesh>
      ))}
      <pointLight ref={lamp} position={[0, 3, 0]} color="#ff9adf" intensity={9} distance={8} />
      <group ref={plants} position={[0, 0.7, 0]}>
        {items.map((p, i) => (
          <group key={i} position={[p.x, 0, p.z]}>
            <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.8, 0.3, 0.8]} /><meshStandardMaterial color="#6b5137" /></mesh>
            <mesh position={[0, 0.6, 0]}>
              <sphereGeometry args={[0.38, 10, 8]} />
              <meshStandardMaterial ref={(m) => { if (m) mats.current[i] = m; }} color="#4fbf5e" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Lab() {
  const scanner = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (scanner.current) scanner.current.rotation.y = clock.elapsedTime * 1.5; });
  return (
    <group position={[13, 0, -4]}>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow><boxGeometry args={[6, 3.4, 5]} /><meshStandardMaterial color={WHITE} roughness={0.5} /></mesh>
      <mesh position={[0, 3.55, 0]}><boxGeometry args={[6.2, 0.15, 5.2]} /><meshStandardMaterial color="#5ad6c4" /></mesh>
      <mesh position={[-1.5, 2.2, 2.52]}><planeGeometry args={[1.8, 1]} /><meshStandardMaterial color="#bfe9ff" emissive="#7cc8ff" emissiveIntensity={0.6} /></mesh>
      <mesh position={[1.5, 1.3, 2.52]}><planeGeometry args={[1.2, 2.2]} /><meshStandardMaterial color="#606b78" /></mesh>
      <mesh ref={scanner} position={[2, 4.2, 0]}><octahedronGeometry args={[0.5]} /><meshStandardMaterial color="#5ad6c4" emissive="#5ad6c4" emissiveIntensity={0.6} /></mesh>
      <Blinker position={[-2.8, 3.2, 2.55]} color="#ffd166" />
    </group>
  );
}

function Airlock() {
  return (
    <group position={[6.5, 0, 3.6]}>
      <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[1.5, 1.5, 2.8, 24]} /><meshStandardMaterial color={WHITE} /></mesh>
      <mesh position={[0, 2.85, 0]}><cylinderGeometry args={[1.55, 1.55, 0.15, 24]} /><meshStandardMaterial color={TRIM} /></mesh>
      <mesh position={[0, 1.2, 1.48]}><boxGeometry args={[1.1, 2, 0.1]} /><meshStandardMaterial color="#59636f" /></mesh>
      <mesh position={[-2.5, 1.4, -3.6]} rotation-y={-0.9} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.8, 0.8, 5.5, 14]} /><meshStandardMaterial color="#d6d3cc" /></mesh>
      <Blinker position={[0, 2.5, 1.55]} color="#6cf2c8" alertColor />
    </group>
  );
}

function PowerStation() {
  const panels = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const pf = useGame.getState().mission.emergency?.id === "power";
    panels.current?.children.forEach((c, i) => { c.rotation.x = -0.5 + Math.sin(clock.elapsedTime * 0.1 + i * 0.05) * 0.12 + (pf && i % 3 === 0 ? 0.7 : 0); });
  });
  const tex = panelTexture();
  return (
    <>
      <group position={[16, 0, 8]}>
        <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[3, 2, 2.2]} /><meshStandardMaterial color="#d7d4cd" /></mesh>
        <mesh position={[0, 1.1, 1.12]}><planeGeometry args={[2, 1]} /><meshStandardMaterial color="#1c2a40" /></mesh>
        {[-0.6, 0, 0.6].map((x) => <Blinker key={x} position={[x, 1.3, 1.15]} color="#ffd166" rate={1 + x} alertColor />)}
        <mesh position={[2.2, 0.7, 0]} castShadow><boxGeometry args={[1, 1.4, 1.6]} /><meshStandardMaterial color={TRIM} /></mesh>
      </group>
      <group ref={panels} position={[22, 0, -10]}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} position={[(i % 4) * 2.8 - 4.2, 2, Math.floor(i / 4) * 4 - 2]}>
            <mesh castShadow><boxGeometry args={[2.5, 0.08, 3.2]} /><meshStandardMaterial map={tex} metalness={0.5} roughness={0.3} /></mesh>
          </group>
        ))}
      </group>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[22 + (i % 4) * 2.8 - 4.2, 1, -10 + Math.floor(i / 4) * 4 - 2]}><cylinderGeometry args={[0.08, 0.08, 2]} /><meshStandardMaterial color="#888" /></mesh>
      ))}
    </>
  );
}

function Comms() {
  const dish = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const fixed = useGame.getState().mission.commsFixed;
    if (dish.current) dish.current.rotation.y = fixed ? clock.elapsedTime * 0.4 : 0.6;
  });
  return (
    <group position={[-16, 0, 10]}>
      <mesh position={[0, 2.5, 0]} castShadow><cylinderGeometry args={[0.15, 0.3, 5]} /><meshStandardMaterial color="#9aa3ad" /></mesh>
      <group ref={dish} position={[0, 5, 0]}>
        <mesh rotation-x={-0.9} castShadow><sphereGeometry args={[1.4, 24, 12, 0, Math.PI * 2, 0, 1.0]} /><meshStandardMaterial color={WHITE} side={THREE.DoubleSide} /></mesh>
        <Blinker position={[0, 0.3, 0.6]} color="#6cf2c8" rate={2} />
      </group>
      <mesh position={[0.6, 0.4, 0.6]}><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#5b6675" /></mesh>
    </group>
  );
}

function Storage() {
  const crates = [[0, 0, 0], [1.1, 0, 0.2], [0.5, 1, 0.1], [-1.1, 0, -0.3]];
  return (
    <group position={[-7, 0, 9]}>
      {crates.map((c, i) => (
        <mesh key={i} position={[c[0], c[1] + 0.5, c[2]]} rotation-y={i * 0.3} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={i % 2 ? "#e9c46a" : "#d2d0ca"} />
        </mesh>
      ))}
    </group>
  );
}

function Lander() {
  return (
    <group position={[-30, terrainHeight(-30, 12), 12]}>
      <mesh position={[0, 2.4, 0]} castShadow><cylinderGeometry args={[1.8, 2.2, 2, 8]} /><meshStandardMaterial color="#d9b44a" metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, 4, 0]} castShadow><coneGeometry args={[1.5, 1.6, 8]} /><meshStandardMaterial color={WHITE} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.57) * 2.3, 0.9, Math.sin(i * 1.57) * 2.3]} rotation={[Math.sin(i * 1.57) * 0.5, 0, -Math.cos(i * 1.57) * 0.5]}>
          <cylinderGeometry args={[0.08, 0.08, 2.4]} />
          <meshStandardMaterial color="#999" />
        </mesh>
      ))}
    </group>
  );
}

function SampleSites() {
  const ids = ["rock1", "rock2", "rock3", "crater", "earthview"];
  return (
    <>
      {ids.map((id) => {
        const s = stationById[id];
        const y = terrainHeight(s.x, s.z);
        return (
          <group key={id} position={[s.x, y, s.z]}>
            {id.startsWith("rock") && (
              <mesh position={[0, 0.6, 0]} castShadow>
                <dodecahedronGeometry args={[1.1, 0]} />
                <meshStandardMaterial color={id === "rock1" ? "#4c4a4a" : id === "rock2" ? "#e0ddd5" : "#8a7d70"} flatShading roughness={0.9} />
              </mesh>
            )}
            <mesh position={[1.4, 1, 0]}><cylinderGeometry args={[0.03, 0.03, 2]} /><meshStandardMaterial color="#ddd" /></mesh>
            <mesh position={[1.7, 1.8, 0]}><boxGeometry args={[0.6, 0.35, 0.02]} /><meshStandardMaterial color="#ff8a3d" emissive="#ff8a3d" emissiveIntensity={0.4} /></mesh>
          </group>
        );
      })}
    </>
  );
}

function Perimeter() {
  const posts = useMemo(() => Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2; return [Math.cos(a) * BASE_RADIUS, Math.sin(a) * BASE_RADIUS] as const; }), []);
  return (
    <>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.07, 0.07, 0.8]} /><meshStandardMaterial color="#cccccc" /></mesh>
          <Blinker position={[0, 0.85, 0]} color="#ffb347" rate={0.5} />
        </group>
      ))}
      {/* landing pad / rover bay */}
      <mesh position={[9, 0.03, 17]} rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[3.6, 32]} /><meshStandardMaterial color="#6f737a" roughness={0.9} /></mesh>
      <mesh position={[9, 0.04, 17]} rotation-x={-Math.PI / 2}><ringGeometry args={[3.2, 3.45, 32]} /><meshStandardMaterial color="#ffb347" /></mesh>
    </>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) { arr[i * 3] = (Math.random() - 0.5) * 60; arr[i * 3 + 1] = Math.random() * 6; arr[i * 3 + 2] = (Math.random() - 0.5) * 60; }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.set(world.player.x, 0, world.player.z);
    ref.current.rotation.y = clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.3;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.06} color="#e8e2d4" transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

/* ---------------- Markers ---------------- */
function Marker({ kind }: { kind: "emergency" | "objective" }) {
  const g = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const m = useGame.getState().mission;
    let id: string | null = null;
    if (kind === "emergency") id = m.emergency?.station ?? null;
    else if (!m.emergency) id = OBJECTIVES.find((o) => !m.done.includes(o.id))?.target ?? null;
    const p = id ? targetPos(id) : null;
    if (!g.current) return;
    g.current.visible = !!p && !(m.inRover && id === "rover");
    if (p) {
      g.current.position.set(p.x, p.y + 4 + Math.sin(clock.elapsedTime * 2.5) * 0.3, p.z);
      g.current.rotation.y = clock.elapsedTime * 1.5;
    }
    if (light.current) light.current.intensity = kind === "emergency" ? 25 + Math.sin(clock.elapsedTime * 6) * 20 : 0;
  });
  const color = kind === "emergency" ? "#ff4d4d" : "#5ad6c4";
  return (
    <group ref={g}>
      <mesh rotation-x={Math.PI}><coneGeometry args={[0.45, 0.9, 4]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} /></mesh>
      {kind === "emergency" && <pointLight ref={light} color="#ff3030" distance={14} position={[0, -2, 0]} />}
    </group>
  );
}

/* ---------------- Crew ---------------- */
const WAYPOINTS: Record<CrewId, [number, number][]> = {
  maya: [[-9, 2], [14, 8], [-14, 7], [2, 5], [16, 11]],
  leo: [[10, 2], [13, 1.5], [6, 9], [-4, 6], [12, 1]],
  nova: [[-11, 3], [-1, 1], [-12, 1.5], [-5, 6], [-13, 1]],
  ari: [[-2, -7.2], [3, -7.4], [0, 2], [4, 5], [-3, 1]],
};

function CrewMember({ id, accent }: { id: CrewId; accent: string }) {
  const g = useRef<THREE.Group>(null);
  const motion = useRef<AstroMotion>({ speed: 0, wave: 0, work: 0, alert: 0 });
  const st = useRef({ wp: 0, wait: Math.random() * 3, greeted: false });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = useGame.getState();
    const m = s.mission;
    const pos = world.crew[id];
    const frozen = s.paused || !!s.activity;
    let target: [number, number] | null = null;
    const sheltered = m.time < m.shelterUntil || m.emergency?.id === "radiation";
    const idx = ["maya", "leo", "nova", "ari"].indexOf(id);
    if (sheltered) target = [-1.8 + idx * 1.2, -8];
    else if (m.emergency?.id === "conflict" && (id === "maya" || id === "leo")) target = id === "maya" ? [3.5, 1.5] : [5.5, 1.5];
    else {
      const w = WAYPOINTS[id][st.current.wp];
      target = w;
    }
    const dx = target[0] - pos.x, dz = target[1] - pos.z;
    const d = Math.hypot(dx, dz);
    const distP = pos.distanceTo(world.player);
    motion.current.alert = m.emergency ? 1 : 0;
    if (frozen) { motion.current.speed = 0; }
    else if (d > 0.3) {
      const sp = m.emergency ? 2.6 : 1.5;
      pos.x += (dx / d) * sp * dt; pos.z += (dz / d) * sp * dt;
      collide(pos, 0.4);
      motion.current.speed = sp; motion.current.work = 0;
      if (g.current) g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, Math.atan2(dx, dz), 0.15);
    } else {
      motion.current.speed = 0;
      motion.current.work = sheltered ? 0 : 1;
      st.current.wait -= dt;
      if (st.current.wait <= 0 && !sheltered) { st.current.wp = (st.current.wp + 1) % WAYPOINTS[id].length; st.current.wait = 4 + Math.random() * 5; }
      if (m.emergency?.id === "conflict" && (id === "maya" || id === "leo") && g.current) {
        g.current.rotation.y = id === "maya" ? Math.PI / 2 : -Math.PI / 2;
        motion.current.work = 0;
      }
    }
    if (distP < 4 && !frozen && d <= 0.3) {
      motion.current.work = 0;
      if (g.current) g.current.rotation.y = Math.atan2(world.player.x - pos.x, world.player.z - pos.z);
      if (!st.current.greeted) { st.current.greeted = true; motion.current.wave = 1.6; }
    } else if (distP > 8) st.current.greeted = false;
    if (g.current) g.current.position.set(pos.x, terrainHeight(pos.x, pos.z), pos.z);
  });
  const crew = CREW.find((c) => c.id === id)!;
  return (
    <group ref={g}>
      <Astronaut accent={accent} motion={motion} />
      <Html position={[0, 3, 0]} center distanceFactor={14} zIndexRange={[5, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full bg-card/80 px-2 py-0.5 font-display text-xs text-foreground">
          {crew.name}
        </div>
      </Html>
    </group>
  );
}

/* ---------------- Rover ---------------- */
function Rover() {
  const g = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = useGame.getState();
    const r = world.rover;
    if (s.mission.inRover && !s.paused && !s.activity && !s.dialogue) {
      const throttle = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
      const max = keys.run ? 14 : 10;
      r.speed += (throttle * max - r.speed) * (1 - Math.exp(-1.6 * dt));
      r.yaw += steer * 1.5 * dt * Math.sign(r.speed || 1) * Math.min(1, Math.abs(r.speed) / 3 + 0.3);
      r.pos.x += Math.sin(r.yaw) * r.speed * dt;
      r.pos.z += Math.cos(r.yaw) * r.speed * dt;
      if (!s.mission.evaReady) {
        const d = Math.hypot(r.pos.x, r.pos.z);
        if (d > BASE_RADIUS - 1) { r.pos.multiplyScalar((BASE_RADIUS - 1) / d); r.speed *= 0.3; }
      }
      collide(r.pos, 1.6);
      r.pos.x = THREE.MathUtils.clamp(r.pos.x, -190, 190);
      r.pos.z = THREE.MathUtils.clamp(r.pos.z, -190, 190);
      world.player.copy(r.pos);
    } else {
      r.speed *= Math.exp(-3 * dt);
    }
    if (g.current) {
      const y = terrainHeight(r.pos.x, r.pos.z);
      g.current.position.set(r.pos.x, y, r.pos.z);
      g.current.rotation.y = r.yaw;
      const ahead = terrainHeight(r.pos.x + Math.sin(r.yaw) * 1.5, r.pos.z + Math.cos(r.yaw) * 1.5);
      g.current.rotation.x = -Math.atan2(ahead - y, 1.5) * 0.8;
    }
    wheels.current?.children.forEach((w) => (w.rotation.x += r.speed * dt * 1.8));
  });
  const inRover = useGame((s) => s.mission.inRover);
  return (
    <group ref={g}>
      <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[2.2, 0.5, 3.4]} /><meshStandardMaterial color={WHITE} roughness={0.5} /></mesh>
      <mesh position={[0, 1.4, -1.2]} castShadow><boxGeometry args={[1.9, 0.5, 0.9]} /><meshStandardMaterial color="#ff8a3d" /></mesh>
      <mesh position={[0, 1.45, 0.3]}><boxGeometry args={[1.6, 0.1, 1.4]} /><meshStandardMaterial color="#3a4352" /></mesh>
      <mesh position={[0.6, 2.4, -1.4]}><cylinderGeometry args={[0.03, 0.03, 1.6]} /><meshStandardMaterial color="#aaa" /></mesh>
      <mesh position={[0.6, 3.2, -1.4]} rotation-x={-0.6}><sphereGeometry args={[0.35, 12, 6, 0, Math.PI * 2, 0, 1]} /><meshStandardMaterial color="#ddd" side={THREE.DoubleSide} /></mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 1.15, 1.72]}><circleGeometry args={[0.16, 12]} /><meshStandardMaterial color="#fff6d8" emissive="#fff0b0" emissiveIntensity={inRover ? 3 : 0.6} /></mesh>
      ))}
      {inRover && <spotLight position={[0, 1.3, 1.8]} target-position={[0, 0, 12]} angle={0.6} penumbra={0.6} intensity={40} distance={30} color="#fff3d0" />}
      {inRover && (
        <group position={[0, 1.35, 0.3]} scale={0.6}>
          <Astronaut accent={useGame.getState().custom.accent} motion={{ current: { speed: 0, wave: 0, work: 0, alert: 0 } }} castShadow={false} />
        </group>
      )}
      <group ref={wheels}>
        {[-1.3, 0, 1.3].map((z) => [-1.25, 1.25].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.5, z]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.4, 14]} />
            <meshStandardMaterial color="#3b3f46" roughness={0.9} />
          </mesh>
        )))}
      </group>
    </group>
  );
}

/* ---------------- Player ---------------- */
function Player() {
  const g = useRef<THREE.Group>(null);
  const motion = useRef<AstroMotion>({ speed: 0, wave: 0, work: 0, alert: 0 });
  const camera = useThree((s) => s.camera);
  const accent = useGame((s) => s.custom.accent);
  const inRover = useGame((s) => s.mission.inRover);
  const prints = useRef<THREE.InstancedMesh>(null);
  const printState = useRef({ i: 0, last: new THREE.Vector3(999, 0, 999), side: 1, stepAcc: 0, warnT: 0 });
  const camInit = useRef(false);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = useGame.getState();
    const m = s.mission;
    const blocked = s.paused || !!s.activity || !!s.dialogue || s.handbook;
    const p = world.player;
    if (!m.inRover) {
      let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      let iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (blocked) { ix = 0; iz = 0; }
      const len = Math.hypot(ix, iz);
      const speed = keys.run ? 7 : 4;
      if (len > 0) {
        ix /= len; iz /= len;
        p.x += ix * speed * dt; p.z += iz * speed * dt;
        const target = Math.atan2(ix, iz);
        let diff = target - world.playerYaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        world.playerYaw += diff * (1 - Math.exp(-12 * dt));
        motion.current.speed = speed;
        printState.current.stepAcc += speed * dt;
        if (printState.current.stepAcc > 1.4) { printState.current.stepAcc = 0; audio.sfx("step"); }
      } else motion.current.speed = 0;
      collide(p);
      const d = Math.hypot(p.x, p.z);
      if (!m.evaReady && d > BASE_RADIUS - 0.5) {
        p.multiplyScalar((BASE_RADIUS - 0.5) / d);
        printState.current.warnT -= dt;
        if (printState.current.warnT <= 0) { s.showToast("Suit not ready for EVA. Run suit checks at the Airlock first."); printState.current.warnT = 4; }
      }
      p.x = THREE.MathUtils.clamp(p.x, -190, 190);
      p.z = THREE.MathUtils.clamp(p.z, -190, 190);
      p.y = terrainHeight(p.x, p.z);
      if (g.current) { g.current.position.copy(p); g.current.rotation.y = world.playerYaw; }
      motion.current.alert = m.emergency ? 1 : 0;

      // footprints outside the base
      const ps = printState.current;
      if (prints.current && d > 18 && p.distanceTo(ps.last) > 0.8) {
        ps.last.copy(p);
        ps.side *= -1;
        const o = new THREE.Object3D();
        o.position.set(p.x + Math.cos(world.playerYaw) * 0.18 * ps.side, p.y + 0.03, p.z - Math.sin(world.playerYaw) * 0.18 * ps.side);
        o.rotation.set(-Math.PI / 2, 0, world.playerYaw);
        o.updateMatrix();
        prints.current.setMatrixAt(ps.i, o.matrix);
        ps.i = (ps.i + 1) % 400;
        prints.current.instanceMatrix.needsUpdate = true;
      }
    }

    // camera
    const focus = m.inRover ? world.rover.pos : p;
    const off = m.inRover ? tmp.set(0, 14, 17) : tmp.set(0, 9, 11.5);
    const desired = new THREE.Vector3(focus.x + off.x, focus.y + off.y, focus.z + off.z);
    if (!camInit.current) { camera.position.copy(desired); camInit.current = true; }
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(focus.x, focus.y + 1.2, focus.z);

    // interaction prompt
    let best: { id: string; label: string; d: number } | null = null;
    const consider = (id: string, label: string, x: number, z: number, r: number) => {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < r && (!best || d < best.d)) best = { id, label, d };
    };
    const em = m.emergency;
    if (m.inRover) {
      STATIONS.filter((st) => ["rock1", "rock2", "rock3", "crater", "earthview"].includes(st.id)).forEach((st) => consider(st.id, `${st.verb}`, st.x, st.z, st.r + 3));
      if (!best) best = { id: "rover", label: "EXIT ROVER", d: 0 };
    } else {
      STATIONS.forEach((st) => consider(st.id, em && em.station === st.id ? `RESPOND · ${st.name.toUpperCase()}` : `${st.verb} · ${st.name.toUpperCase()}`, st.x, st.z, st.r));
      CREW.forEach((c) => { const cp = world.crew[c.id]; consider(c.id, em && em.station === c.id ? `TALK TO ${c.name.toUpperCase()} (URGENT)` : `TALK TO ${c.name.toUpperCase()}`, cp.x, cp.z, 2.6); });
      consider("rover", "ENTER ROVER", world.rover.pos.x, world.rover.pos.z, 3.2);
    }
    const b = best as { id: string; label: string } | null;
    const cur = s.prompt;
    if ((b?.id ?? null) !== (cur?.id ?? null) || (b && cur && b.label !== cur.label)) s.setPrompt(b ? { id: b.id, label: b.label } : null);
  });

  return (
    <>
      <group ref={g} visible={!inRover}>
        <Astronaut accent={accent} motion={motion} />
      </group>
      <instancedMesh ref={prints} args={[undefined, undefined, 400]} frustumCulled={false}>
        <planeGeometry args={[0.22, 0.42]} />
        <meshStandardMaterial color="#6d6a64" transparent opacity={0.7} roughness={1} />
      </instancedMesh>
    </>
  );
}

function EmergencyLighting() {
  const amb = useRef<THREE.AmbientLight>(null);
  useFrame(({ clock }) => {
    const em = useGame.getState().mission.emergency;
    if (!amb.current) return;
    if (em) { amb.current.color.set("#ff6060"); amb.current.intensity = 0.25 + (Math.sin(clock.elapsedTime * 4) * 0.5 + 0.5) * 0.25; }
    else { amb.current.color.set("#b8c4ff"); amb.current.intensity = 0.35; }
  });
  return <ambientLight ref={amb} intensity={0.35} />;
}

export function LunarWorld() {
  return (
    <>
      <color attach="background" args={["#04060d"]} />
      <fog attach="fog" args={["#0a0e1a", 70, 220]} />
      <EmergencyLighting />
      <hemisphereLight args={["#8fa8ff", "#5a554c", 0.45]} />
      <directionalLight
        position={[40, 55, 25]}
        intensity={2.6}
        color="#fff4e2"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={160}
        shadow-bias={-0.0005}
      />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 8, 0]} scale={[12, 12, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.8} color="#88aaff" position={[-8, 2, -4]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={0.6} color="#ffcf9a" position={[8, 2, 4]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <Sky />
      <Terrain />
      <Rocks />
      <Perimeter />
      <Habitat />
      <CommandModule />
      <Greenhouse />
      <Lab />
      <Airlock />
      <PowerStation />
      <Comms />
      <Storage />
      <Lander />
      <SampleSites />
      <Dust />
      {CREW.map((c) => <CrewMember key={c.id} id={c.id} accent={c.accent} />)}
      <Rover />
      <Player />
      <Marker kind="emergency" />
      <Marker kind="objective" />
    </>
  );
}
