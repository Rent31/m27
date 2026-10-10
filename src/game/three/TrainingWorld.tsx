import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Html } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { keys } from "../input";
import { audio } from "../audio";
import { useGame, type ActivityKind } from "../store";
import { Astronaut, type AstroMotion } from "./Astronaut";
import { floorTexture } from "./textures";

export const TRAINING_STATIONS: { kind: ActivityKind; name: string; color: string; x: number; z: number }[] = [
  { kind: "leak", name: "Life Support Lab", color: "#5ad6c4", x: -9, z: -6 },
  { kind: "power", name: "Power Lab", color: "#ffd166", x: 0, z: -10 },
  { kind: "radiation", name: "Radiation Safety Room", color: "#ff6b8b", x: 9, z: -6 },
  { kind: "greenhouse", name: "Greenhouse Lab", color: "#7bd96b", x: 10, z: 4 },
  { kind: "eva", name: "EVA Simulator", color: "#ff8a3d", x: 3, z: 10 },
  { kind: "wires", name: "Repair Bench", color: "#9bb7ff", x: -5, z: 10 },
  { kind: "command", name: "Command Room", color: "#9b8cff", x: -10, z: 3 },
];

export const trainingPlayer = { pos: new THREE.Vector3(0, 0, 2), yaw: Math.PI };

function Station({ s, done }: { s: (typeof TRAINING_STATIONS)[number]; done: boolean }) {
  const screen = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (screen.current) screen.current.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 2 + s.x) * 0.2; });
  const face = Math.atan2(-s.x, -s.z);
  return (
    <group position={[s.x, 0, s.z]} rotation-y={face}>
      <mesh position={[0, 0.05, 0]} receiveShadow><cylinderGeometry args={[2.2, 2.2, 0.1, 32]} /><meshStandardMaterial color={s.color} roughness={0.6} /></mesh>
      <mesh position={[0, 0.6, -0.6]} castShadow><boxGeometry args={[2.2, 1.1, 0.9]} /><meshStandardMaterial color="#e8ebef" /></mesh>
      <mesh position={[0, 1.6, -0.9]} rotation-x={-0.2} castShadow><boxGeometry args={[1.8, 1.1, 0.12]} /><meshStandardMaterial color="#1c2a40" /></mesh>
      <mesh position={[0, 1.6, -0.83]} rotation-x={-0.2}><planeGeometry args={[1.6, 0.9]} /><meshStandardMaterial ref={screen} color={s.color} emissive={s.color} emissiveIntensity={0.6} /></mesh>
      <Html position={[0, 2.9, -0.9]} center distanceFactor={12} zIndexRange={[5, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full bg-card/85 px-3 py-1 font-display text-sm text-foreground">
          {done ? "✓ " : ""}{s.name}
        </div>
      </Html>
    </group>
  );
}

function Walker() {
  const g = useRef<THREE.Group>(null);
  const motion = useRef<AstroMotion>({ speed: 0, wave: 0, work: 0, alert: 0 });
  const camera = useThree((s) => s.camera);
  const accent = useGame((s) => s.custom.accent);
  const stepAcc = useRef(0);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = useGame.getState();
    const p = trainingPlayer.pos;
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let iz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (s.activity || s.handbook) { ix = 0; iz = 0; }
    const len = Math.hypot(ix, iz);
    const speed = keys.run ? 7 : 4;
    if (len) {
      ix /= len; iz /= len;
      p.x += ix * speed * dt; p.z += iz * speed * dt;
      let diff = Math.atan2(ix, iz) - trainingPlayer.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      trainingPlayer.yaw += diff * (1 - Math.exp(-12 * dt));
      motion.current.speed = speed;
      stepAcc.current += speed * dt;
      if (stepAcc.current > 1.4) { stepAcc.current = 0; audio.sfx("step"); }
    } else motion.current.speed = 0;
    for (const st of TRAINING_STATIONS) {
      const back = new THREE.Vector3(st.x, 0, st.z).add(new THREE.Vector3(st.x, 0, st.z).normalize().multiplyScalar(0.7));
      const dx = p.x - back.x, dz = p.z - back.z, d = Math.hypot(dx, dz);
      if (d < 1.6) { p.x = back.x + (dx / d) * 1.6; p.z = back.z + (dz / d) * 1.6; }
    }
    p.x = THREE.MathUtils.clamp(p.x, -14, 14);
    p.z = THREE.MathUtils.clamp(p.z, -14, 14);
    if (g.current) { g.current.position.copy(p); g.current.rotation.y = trainingPlayer.yaw; }
    const desired = new THREE.Vector3(p.x, p.y + 9, p.z + 10);
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(p.x, 1.2, p.z);

    let best: { id: string; label: string; d: number } | null = null;
    for (const st of TRAINING_STATIONS) {
      const d = Math.hypot(p.x - st.x, p.z - st.z);
      if (d < 3 && (!best || d < best.d)) best = { id: st.kind, label: `START TRAINING · ${st.name.toUpperCase()}`, d };
    }
    const cur = s.prompt;
    if ((best?.id ?? null) !== (cur?.id ?? null)) s.setPrompt(best ? { id: best.id, label: best.label } : null);
  });
  return (
    <group ref={g}>
      <Astronaut accent={accent} motion={motion} />
    </group>
  );
}

function Instructor() {
  const motion = useRef<AstroMotion>({ speed: 0, wave: 0, work: 0, alert: 0 });
  useFrame(({ clock }) => { if (Math.floor(clock.elapsedTime) % 7 === 0) motion.current.wave = 0.6; });
  return (
    <group position={[0, 0, -3]} rotation-y={0}>
      <Astronaut accent="#9b8cff" motion={motion} />
      <Html position={[0, 3, 0]} center distanceFactor={12}>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-card/85 px-2 py-0.5 font-display text-xs text-foreground">Instructor Sam</div>
      </Html>
    </group>
  );
}

export function TrainingWorld() {
  const training = useGame((s) => s.training);
  return (
    <>
      <color attach="background" args={["#c9d6e6"]} />
      <fog attach="fog" args={["#c9d6e6", 30, 60]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#8a94a6", 0.6]} />
      <directionalLight position={[8, 18, 10]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer intensity={1} color="#bcd4ff" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[34, 34]} />
        <meshStandardMaterial map={floorTexture()} roughness={0.7} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[4, 4.3, 48]} />
        <meshStandardMaterial color="#ff8a3d" />
      </mesh>
      {/* walls */}
      {[[0, -17, 0], [0, 17, Math.PI], [-17, 0, Math.PI / 2], [17, 0, -Math.PI / 2]].map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={r}>
          <mesh position={[0, 3, 0]} receiveShadow><boxGeometry args={[34, 6, 0.4]} /><meshStandardMaterial color="#eef1f5" /></mesh>
          <mesh position={[0, 1, 0.25]}><boxGeometry args={[34, 0.3, 0.1]} /><meshStandardMaterial color="#5ad6c4" /></mesh>
          {i === 0 && (
            <mesh position={[0, 3.6, 0.22]}>
              <circleGeometry args={[1.8, 32]} />
              <meshStandardMaterial color="#1f5fa8" emissive="#1f5fa8" emissiveIntensity={0.3} />
            </mesh>
          )}
        </group>
      ))}
      {/* hanging model moon */}
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#cfcac0" roughness={1} />
      </mesh>
      {TRAINING_STATIONS.map((s) => <Station key={s.kind} s={s} done={!!training[s.kind]} />)}
      <Instructor />
      <Walker />
    </>
  );
}
