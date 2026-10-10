import { useFrame, useThree } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { audio } from "../audio";
import { Astronaut, type AstroMotion } from "./Astronaut";
import { planetTexture, panelTexture, regolithTexture } from "./textures";

export interface HomeFx {
  /** 0 = reduced motion, 1 = normal */
  motion: number;
  /** 0..1 star warp during transitions */
  warp: number;
  /** -1 when a menu button is hovered (astronaut looks at it) */
  focus: number;
  lite: boolean;
}

function Parallax({ fx }: { fx: React.MutableRefObject<HomeFx> }) {
  const { camera, pointer } = useThree();
  useFrame((_, dt) => {
    const m = fx.current.motion;
    const k = 1 - Math.exp(-2 * dt);
    camera.position.x += (pointer.x * 0.8 * m - camera.position.x) * k;
    camera.position.y += (pointer.y * 0.4 * m + 0.6 - camera.position.y) * k;
    const fov = 50 - fx.current.warp * 14;
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov += (fov - pc.fov) * (1 - Math.exp(-8 * dt));
    pc.updateProjectionMatrix();
    camera.lookAt(0, 0, -6);
  });
  return null;
}

function StarLayer({ fx, radius, count, factor, speed }: { fx: React.MutableRefObject<HomeFx>; radius: number; count: number; factor: number; speed: number }) {
  const g = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    if (!g.current) return;
    const m = fx.current.motion;
    g.current.rotation.y += dt * speed * (m * 0.02 + fx.current.warp * 0.6);
    g.current.rotation.x = -pointer.y * 0.02 * m * (speed * 2);
  });
  return (
    <group ref={g}>
      <Stars radius={radius} depth={40} count={count} factor={factor} fade speed={0.4} />
    </group>
  );
}

function ShootingStar({ fx }: { fx: React.MutableRefObject<HomeFx> }) {
  const m = useRef<THREE.Mesh>(null);
  const st = useRef({ t: -3, from: new THREE.Vector3(), dir: new THREE.Vector3() });
  useFrame((_, dt) => {
    if (!m.current) return;
    const s = st.current;
    s.t += dt;
    if (s.t > 6 + Math.random() * 4 && fx.current.motion > 0) {
      s.t = 0;
      s.from.set(-10 + Math.random() * 25, 6 + Math.random() * 5, -30);
      s.dir.set(-1, -0.45, 0).normalize();
    }
    const active = s.t < 0.9;
    m.current.visible = active;
    if (active) {
      m.current.position.copy(s.from).addScaledVector(s.dir, s.t * 30);
      (m.current.material as THREE.MeshBasicMaterial).opacity = 1 - s.t / 0.9;
    }
  });
  return (
    <mesh ref={m} rotation-z={Math.atan2(-0.45, -1) + Math.PI}>
      <planeGeometry args={[3, 0.04]} />
      <meshBasicMaterial color="#fff6e0" transparent depthWrite={false} />
    </mesh>
  );
}

function OrbitLine({ r, tilt, color = "#7fd8ff", opacity = 0.18, center }: { r: number; tilt: number; color?: string; opacity?: number; center: [number, number, number] }) {
  const geo = useMemo(() => {
    const pts = Array.from({ length: 129 }, (_, i) => { const a = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [r]);
  return (
    <group position={center} rotation={[tilt, 0, 0.2]}>
      <lineLoop geometry={geo}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineLoop>
    </group>
  );
}

function Celestials({ fx, lite }: { fx: React.MutableRefObject<HomeFx>; lite: boolean }) {
  const mars = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const far = useRef<THREE.Group>(null);
  const belt = useRef<THREE.InstancedMesh>(null);
  const { pointer } = useThree();
  const n = lite ? 18 : 48;
  useMemo(() => null, []);
  useFrame(({ clock }) => {
    const m = fx.current.motion;
    const t = clock.elapsedTime * (m || 0.0001);
    if (mars.current) { mars.current.position.set(20 + Math.cos(t * 0.03) * 1.5, 4 + Math.sin(t * 0.03) * 0.6, -48); mars.current.rotation.y = t * 0.05; }
    if (moon.current) { moon.current.position.set(-1 + pointer.x * 0.4 * m, 7.5 + pointer.y * 0.2 * m, -24); moon.current.rotation.y = t * 0.02; }
    if (far.current) far.current.position.x = Math.sin(t * 0.01) * 2 - pointer.x * 0.3 * m;
    if (belt.current) belt.current.rotation.y = t * 0.008;
  });
  const setBelt = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh || mesh.userData.done) return;
    belt.current = mesh;
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.sin(i * 7.1) * 0.2;
      const r = 26 + Math.sin(i * 3.3) * 3;
      o.position.set(Math.cos(a) * r, 2 + Math.sin(i * 1.7) * 2.5, Math.sin(a) * r * 0.4);
      o.rotation.set(i, i * 2, i * 3);
      const s = 0.1 + ((i * 13) % 7) / 25;
      o.scale.set(s, s * 0.7, s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.done = true;
  };
  return (
    <>
      <group ref={mars}>
        <mesh><sphereGeometry args={[1.4, 32, 32]} /><meshStandardMaterial map={planetTexture("mars")} roughness={1} /></mesh>
        <mesh><sphereGeometry args={[1.5, 24, 24]} /><meshBasicMaterial color="#ff9b6b" transparent opacity={0.08} depthWrite={false} /></mesh>
        <mesh position={[2.4, 0.4, 0]}><sphereGeometry args={[0.15, 12, 12]} /><meshStandardMaterial color="#9a8a7a" /></mesh>
      </group>
      <mesh ref={moon}>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshStandardMaterial map={planetTexture("moon")} roughness={1} />
      </mesh>
      <group ref={far}>
        {/* ringed gas giant, far and soft */}
        <group position={[-30, 15, -80]} rotation={[0.4, 0, 0.3]}>
          <mesh><sphereGeometry args={[3.2, 32, 32]} /><meshStandardMaterial color="#c9a77c" roughness={1} transparent opacity={0.75} /></mesh>
          <mesh rotation-x={Math.PI / 2}><ringGeometry args={[4, 6, 64]} /><meshBasicMaterial color="#e8d3a8" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        </group>
        <mesh position={[26, 16, -85]}><sphereGeometry args={[1.6, 24, 24]} /><meshStandardMaterial color="#7fa2c9" roughness={1} transparent opacity={0.6} /></mesh>
        {!lite && <mesh position={[-40, 2, -90]}><sphereGeometry args={[0.8, 16, 16]} /><meshStandardMaterial color="#b7c4d6" transparent opacity={0.5} /></mesh>}
      </group>
      <group position={[0, 0, -40]}>
        <instancedMesh ref={setBelt} args={[undefined, undefined, n]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a756d" roughness={1} flatShading />
        </instancedMesh>
      </group>
    </>
  );
}

function Blink({ position, color, rate = 1 }: { position: [number, number, number]; color: string; rate?: number }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.opacity = Math.sin(clock.elapsedTime * rate * Math.PI * 2) > 0 ? 1 : 0.15; });
  return <mesh position={position}><sphereGeometry args={[0.045, 8, 8]} /><meshBasicMaterial ref={ref} color={color} transparent /></mesh>;
}

/** Miniature lunar outpost sitting on a curved Moon horizon. */
function MiniOutpost({ fx }: { fx: React.MutableRefObject<HomeFx> }) {
  const panels = useRef<THREE.Group>(null);
  const dish = useRef<THREE.Group>(null);
  const rover = useRef<THREE.Group>(null);
  const plants = useRef<THREE.Group>(null);
  const win = useRef<THREE.MeshStandardMaterial>(null);
  const moonGrp = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const W = "#eceae5";
  const T = "#ff8a3d";
  const rocks = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    x: Math.sin(i * 12.9898) * 9, z: Math.cos(i * 78.233) * 3.5, s: 0.06 + ((i * 37) % 10) / 45,
  })), []);
  const prints = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: 0.9 + i * 0.22, z: 1.2 + Math.sin(i * 0.6) * 0.25 + (i % 2) * 0.08 })), []);
  useFrame(({ clock }) => {
    const m = fx.current.motion;
    const t = clock.elapsedTime * (m || 0.0001);
    panels.current?.children.forEach((c, i) => (c.rotation.x = -0.6 + Math.sin(t * 0.2 + i * 0.1) * 0.15));
    if (dish.current) dish.current.rotation.y = t * 0.4;
    if (rover.current) {
      const a = t * 0.12;
      rover.current.position.set(2.2 + Math.cos(a) * 1.6, 0, 0.6 + Math.sin(a) * 0.8);
      rover.current.rotation.y = -a + Math.PI;
    }
    plants.current?.children.forEach((c, i) => (c.rotation.z = Math.sin(t * 1.3 + i) * 0.1));
    if (win.current) win.current.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 0.8) * 0.25;
    if (moonGrp.current) {
      moonGrp.current.position.x += (pointer.x * 0.25 * m - moonGrp.current.position.x) * 0.03;
    }
  });
  return (
    <group ref={moonGrp}>
      <directionalLight position={[6, 4, -2]} intensity={1.6} color="#cfe0ff" />
      <pointLight position={[-0.8, -2.6, -5]} intensity={6} distance={9} color="#ffd9a8" />
      {/* Moon horizon */}
      <mesh position={[0, -34, -9]} receiveShadow>
        <sphereGeometry args={[30, 96, 64]} />
        <meshStandardMaterial map={regolithTexture()} color="#cfcac0" roughness={1} />
      </mesh>
      <mesh position={[0, -34, -9]}>
        <sphereGeometry args={[30.4, 64, 32]} />
        <meshBasicMaterial color="#b8d4ff" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {/* craters */}
      {[[-5, -7, 1.1], [6.5, -8, 0.8], [-2, -5, 0.5]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, -4.0 + 0.02, z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[r * 0.7, r, 32]} />
          <meshStandardMaterial color="#e3ded4" transparent opacity={0.6} />
        </mesh>
      ))}
      <group position={[-0.8, -4, -6.6]} scale={0.72}>
        {/* rover tracks */}
        {Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2; return <mesh key={`tr${i}`} position={[2.2 + Math.cos(a) * 1.6, 0.015, 0.6 + Math.sin(a) * 0.8]} rotation={[-Math.PI / 2, 0, -a]}><planeGeometry args={[0.06, 0.2]} /><meshBasicMaterial color="#77736b" transparent opacity={0.6} /></mesh>; })}
        {/* equipment + mission markers */}
        <mesh position={[1.6, 0.2, 1.6]}><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#e9c46a" /></mesh>
        <mesh position={[2.0, 0.15, 1.8]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color="#d2d0ca" /></mesh>
        {[-8.5, 8.2].map((x) => <group key={x} position={[x, 0, 1.6]}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.02, 0.02, 0.6]} /><meshStandardMaterial color="#ccc" /></mesh><Blink position={[0, 0.62, 0]} color="#ffb347" rate={0.5} /></group>)}
        {rocks.map((r, i) => (
          <mesh key={i} position={[r.x, r.s * 0.4, r.z]} castShadow>
            <dodecahedronGeometry args={[r.s * 2, 0]} />
            <meshStandardMaterial color="#8d8a84" flatShading />
          </mesh>
        ))}
        {prints.map((p, i) => (
          <mesh key={i} position={[p.x, 0.02, p.z]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.08, 0.15]} /><meshBasicMaterial color="#6d6a64" /></mesh>
        ))}
        {/* habitat */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.9, 0]} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.9, 0.9, 3, 24]} /><meshStandardMaterial color={W} roughness={0.45} /></mesh>
          {[-1.5, 1.5].map((x) => <mesh key={x} position={[x, 0.9, 0]}><sphereGeometry args={[0.9, 24, 12]} /><meshStandardMaterial color={W} /></mesh>)}
          {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 0.9, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.93, 0.93, 0.1, 24]} /><meshStandardMaterial color={T} /></mesh>)}
          {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 1.05, 0.88]}><circleGeometry args={[0.16, 16]} /><meshStandardMaterial ref={x < 0 ? win : null} color="#ffe2a8" emissive="#ffcc77" emissiveIntensity={1} /></mesh>)}
          <Blink position={[0, 1.85, 0]} color="#6cf2c8" rate={0.7} />
        </group>
        {/* command dome */}
        <group position={[-3.2, 0, -0.6]}>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[1.2, 1.3, 0.5, 24]} /><meshStandardMaterial color="#cfccc5" /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><sphereGeometry args={[1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={W} /></mesh>
          <mesh position={[0, 1.1, 0.95]} rotation-x={-0.6}><boxGeometry args={[0.9, 0.3, 0.05]} /><meshStandardMaterial color="#9fd9ff" emissive="#4aa3e0" emissiveIntensity={0.8} /></mesh>
          <Blink position={[0, 1.9, 0]} color="#ff6b5b" rate={0.5} />
          <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.02, 0.02, 0.5]} /><meshStandardMaterial color="#999" /></mesh>
        </group>
        {/* greenhouse */}
        <group position={[-5.8, 0, 0.6]}>
          <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[1.2, 1.25, 0.2, 24]} /><meshStandardMaterial color="#cfccc5" /></mesh>
          <mesh position={[0, 0.2, 0]}><sphereGeometry args={[1.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#cfeee6" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          <pointLight position={[0, 0.8, 0]} color="#ff9adf" intensity={3} distance={3} />
          <group ref={plants} position={[0, 0.3, 0]}>
            {[-0.5, 0, 0.5].map((x) => [-0.35, 0.35].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.15, z]}><sphereGeometry args={[0.17, 8, 6]} /><meshStandardMaterial color="#4fbf5e" /></mesh>
            )))}
          </group>
        </group>
        {/* solar array */}
        <group ref={panels} position={[4.6, 0.9, -1.2]}>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} position={[(i % 2) * 1.3 - 0.65, 0, Math.floor(i / 2) * 1.4 - 0.7]}>
              <mesh castShadow><boxGeometry args={[1.15, 0.04, 1.2]} /><meshStandardMaterial map={panelTexture()} metalness={0.5} roughness={0.3} /></mesh>
            </group>
          ))}
        </group>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[4.6 + (i % 2) * 1.3 - 0.65, 0.45, -1.2 + Math.floor(i / 2) * 1.4 - 0.7]}><cylinderGeometry args={[0.03, 0.03, 0.9]} /><meshStandardMaterial color="#888" /></mesh>)}
        {/* comms */}
        <group position={[-7.6, 0, -1.2]}>
          <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.05, 0.1, 2.2]} /><meshStandardMaterial color="#9aa3ad" /></mesh>
          <group ref={dish} position={[0, 2.2, 0]}>
            <mesh rotation-x={-0.9}><sphereGeometry args={[0.55, 16, 8, 0, Math.PI * 2, 0, 1]} /><meshStandardMaterial color={W} side={THREE.DoubleSide} /></mesh>
          </group>
          <Blink position={[0, 2.45, 0]} color="#6cf2c8" rate={1.6} />
        </group>
        {/* landing pad */}
        <mesh position={[6.8, 0.02, 1.4]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.9, 24]} /><meshStandardMaterial color="#6f737a" /></mesh>
        <mesh position={[6.8, 0.03, 1.4]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.75, 0.82, 24]} /><meshBasicMaterial color="#ffb347" /></mesh>
        {/* rover */}
        <group ref={rover}>
          <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.5, 0.14, 0.8]} /><meshStandardMaterial color={W} /></mesh>
          <mesh position={[0, 0.42, -0.25]}><boxGeometry args={[0.42, 0.14, 0.22]} /><meshStandardMaterial color={T} /></mesh>
          {[-0.28, 0.28].map((x) => [-0.28, 0.28].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.13, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.12, 0.12, 0.1, 10]} /><meshStandardMaterial color="#3b3f46" /></mesh>
          )))}
          <mesh position={[0, 0.32, 0.41]}><circleGeometry args={[0.05, 8]} /><meshBasicMaterial color="#fff3c0" /></mesh>
          <pointLight position={[0, 0.4, 0.7]} color="#fff0c0" intensity={1.5} distance={2.5} />
        </group>
      </group>
    </group>
  );
}

function HeroAstronaut({ accent, fx, onPoke, bubble }: { accent: string; fx: React.MutableRefObject<HomeFx>; onPoke: () => void; bubble: boolean }) {
  const g = useRef<THREE.Group>(null);
  const motion = useRef<AstroMotion>({ speed: 0, wave: 0, work: 0, alert: 0 });
  const [hover, setHover] = useState(false);
  const nextWave = useRef(4);
  const { pointer, viewport } = useThree();
  const scale = viewport.width < 7 ? 0.7 : 1;
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    const m = fx.current.motion;
    g.current.position.y = -0.95 + Math.sin(t * 0.9) * 0.18 * m;
    // React to cursor proximity (astronaut sits on the right)
    const near = Math.max(0, 1 - Math.hypot(pointer.x - 0.55, pointer.y) * 1.5);
    const look = fx.current.focus < 0 ? -0.9 : pointer.x * 0.6 - 0.35;
    g.current.rotation.y += (look - g.current.rotation.y) * (1 - Math.exp(-4 * dt));
    g.current.rotation.x = -pointer.y * 0.15 - near * 0.1;
    g.current.rotation.z = Math.sin(t * 0.6) * 0.06 * m;
    const s = (hover ? 1.08 : 1) * scale;
    g.current.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-8 * dt));
    if (t > nextWave.current) { motion.current.wave = 1.4; nextWave.current = t + 9 + Math.random() * 6; }
  });
  return (
    <group
      ref={g}
      position={[viewport.width < 7 ? 1.4 : 2.5, -0.95, 0]}
      onPointerOver={() => { setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={() => { motion.current.wave = 1.8; audio.sfx("wave"); onPoke(); }}
    >
      <Astronaut accent={accent} motion={motion} />
      <pointLight position={[0, 1.6, 1.5]} intensity={3} color="#9ff5e4" distance={4} />
    </group>
  );
}

export function HomeBackdrop({ accent, fx, onPoke, bubble }: { accent: string; fx: React.MutableRefObject<HomeFx>; onPoke: () => void; bubble: boolean }) {
  const earth = useRef<THREE.Mesh>(null);
  const sat = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const lite = fx.current.lite;
  useFrame(({ clock }) => {
    const m = fx.current.motion;
    const t = clock.elapsedTime * (m || 0.0001);
    if (earth.current) earth.current.rotation.y = t * 0.04;
    if (sat.current) { sat.current.position.set(-3 + Math.cos(t * 0.1) * 5, 3.2 + Math.sin(t * 0.1) * 0.8, -10 + Math.sin(t * 0.1) * 2); sat.current.rotation.set(t * 0.2, t * 0.3, 0); }
    if (ship.current) ship.current.position.set(-30 + ((t * 2) % 60), 7, -32);
    if (key.current) key.current.intensity = 2.3 + Math.sin(clock.elapsedTime * 0.25) * 0.2;
  });
  return (
    <>
      <color attach="background" args={["#05070f"]} />
      <fog attach="fog" args={["#05070f", 40, 120]} />
      <ambientLight intensity={0.22} color="#b8c4ff" />
      <directionalLight ref={key} position={[-8, 6, 6]} intensity={2.4} color="#fff2df" />
      <StarLayer fx={fx} radius={140} count={lite ? 2000 : 5000} factor={3} speed={0.3} />
      <StarLayer fx={fx} radius={70} count={lite ? 500 : 1500} factor={5} speed={0.8} />
      {!lite && <Sparkles count={50} scale={[18, 6, 6]} position={[0, -1, -2]} size={2} speed={0.2} color="#ffe8c8" opacity={0.5} />}
      <ShootingStar fx={fx} />
      {/* nebula haze */}
      <mesh position={[-25, 12, -70]}><planeGeometry args={[70, 40]} /><meshBasicMaterial color="#3a2a6b" transparent opacity={0.07} depthWrite={false} /></mesh>
      <mesh position={[30, 4, -75]}><planeGeometry args={[70, 40]} /><meshBasicMaterial color="#1d4f6b" transparent opacity={0.07} depthWrite={false} /></mesh>
      {/* Earth in lunar sky */}
      <mesh ref={earth} position={[-10, 8, -36]}>
        <sphereGeometry args={[3.6, 64, 64]} />
        <meshStandardMaterial map={planetTexture("earth")} roughness={0.8} emissive="#16335c" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-10, 8, -36]}><sphereGeometry args={[3.9, 48, 48]} /><meshBasicMaterial color="#7fb8ff" transparent opacity={0.14} depthWrite={false} /></mesh>
      <OrbitLine r={6} tilt={1.25} center={[-10, 8, -36]} />
      <Celestials fx={fx} lite={lite} />
      <OrbitLine r={13} tilt={1.35} center={[0, -2, -12]} color="#ffb070" opacity={0.08} />
      {/* small distant worlds */}
      <group ref={sat} scale={0.35}>
        <mesh><boxGeometry args={[1, 0.7, 0.7]} /><meshStandardMaterial color="#d8c27a" metalness={0.6} roughness={0.35} /></mesh>
        <mesh position={[1.6, 0, 0]}><boxGeometry args={[2, 0.05, 0.8]} /><meshStandardMaterial map={panelTexture()} /></mesh>
        <mesh position={[-1.6, 0, 0]}><boxGeometry args={[2, 0.05, 0.8]} /><meshStandardMaterial map={panelTexture()} /></mesh>
      </group>
      <group ref={ship} scale={0.6}>
        <mesh rotation-z={-Math.PI / 2}><coneGeometry args={[0.6, 2.4, 8]} /><meshStandardMaterial color="#eee" /></mesh>
        <mesh position={[-1.4, 0, 0]}><sphereGeometry args={[0.3, 8, 8]} /><meshBasicMaterial color="#ffb070" /></mesh>
      </group>
      <MiniOutpost fx={fx} />
      <HeroAstronaut accent={accent} fx={fx} onPoke={onPoke} bubble={bubble} />
      <Parallax fx={fx} />
    </>
  );
}

export function MarsBackdrop() {
  const mars = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (mars.current) mars.current.rotation.y = clock.elapsedTime * 0.05; });
  return (
    <>
      <color attach="background" args={["#0b0608"]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-6, 4, 6]} intensity={2.4} color="#ffe2c8" />
      <Stars radius={120} depth={50} count={4000} factor={4} fade speed={0.5} />
      <mesh ref={mars} position={[3, -1, -6]}>
        <sphereGeometry args={[4.5, 64, 64]} />
        <meshStandardMaterial map={planetTexture("mars")} roughness={1} />
      </mesh>
      <mesh position={[3, -1, -6]}>
        <sphereGeometry args={[4.7, 48, 48]} />
        <meshBasicMaterial color="#ff9b6b" transparent opacity={0.08} />
      </mesh>
    </>
  );
}
