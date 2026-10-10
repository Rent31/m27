import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import * as THREE from "three";

export interface AstroMotion { speed: number; wave: number; work: number; alert: number }

export function Astronaut({
  accent = "#ff8a3d",
  motion,
  castShadow = true,
}: {
  accent?: string;
  motion: MutableRefObject<AstroMotion>;
  castShadow?: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 10);
  const t0 = useRef(Math.random() * 10);

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const m = motion.current;
    t0.current += dt;
    const t = t0.current;
    const moving = Math.min(m.speed / 4, 1.6);
    phase.current += dt * (3 + m.speed * 1.4);
    const p = phase.current;
    const swing = Math.sin(p) * 0.7 * Math.min(moving, 1);
    if (legL.current && legR.current) { legL.current.rotation.x = swing; legR.current.rotation.x = -swing; }
    if (body.current) {
      // low-gravity hop
      body.current.position.y = moving > 0.05 ? Math.abs(Math.sin(p)) * 0.18 * moving : Math.sin(t * 1.6) * 0.03;
      body.current.rotation.x = moving * 0.08;
      body.current.rotation.z = m.alert > 0 ? Math.sin(t * 18) * 0.04 : 0;
    }
    if (armL.current && armR.current) {
      armL.current.rotation.x = -swing * 0.8 + (m.work > 0 ? -1.1 + Math.sin(t * 8) * 0.25 : 0);
      armL.current.rotation.z = 0.25 + Math.sin(t * 1.3) * 0.04;
      if (m.wave > 0) {
        m.wave = Math.max(0, m.wave - dt);
        armR.current.rotation.z = -2.5 + Math.sin(t * 14) * 0.35;
        armR.current.rotation.x = 0;
      } else {
        armR.current.rotation.z = -0.25 - Math.sin(t * 1.3) * 0.04;
        armR.current.rotation.x = swing * 0.8 + (m.work > 0 ? -1.1 + Math.cos(t * 8) * 0.25 : 0);
      }
    }
    if (head.current) head.current.rotation.y = moving > 0.1 ? 0 : Math.sin(t * 0.5) * 0.35;
    if (eyes.current) {
      const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
      eyes.current.scale.y = m.alert > 0 ? 1.3 : blink;
    }
  });

  const white = <meshStandardMaterial color="#f4f2ee" roughness={0.55} />;
  const acc = <meshStandardMaterial color={accent} roughness={0.5} />;
  const grey = <meshStandardMaterial color="#9aa3ad" roughness={0.6} />;

  return (
    <group ref={body}>
      {/* legs */}
      {[[-0.2, legL], [0.2, legR]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.62, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow={castShadow}>
            <capsuleGeometry args={[0.16, 0.3, 6, 12]} />
            {white}
          </mesh>
          <mesh position={[0, -0.52, 0.06]} castShadow={castShadow}>
            <boxGeometry args={[0.3, 0.14, 0.42]} />
            {grey}
          </mesh>
        </group>
      ))}
      {/* torso */}
      <mesh position={[0, 1.0, 0]} castShadow={castShadow}>
        <capsuleGeometry args={[0.44, 0.42, 8, 16]} />
        {white}
      </mesh>
      <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.44, 0.06, 8, 24]} />
        {acc}
      </mesh>
      {/* chest panel */}
      <mesh position={[0, 1.05, 0.42]}>
        <boxGeometry args={[0.32, 0.2, 0.06]} />
        <meshStandardMaterial color="#2c3a52" roughness={0.4} />
      </mesh>
      <mesh position={[-0.08, 1.06, 0.46]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#6cf2c8" emissive="#6cf2c8" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.06, 1.06, 0.46]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} />
      </mesh>
      {/* mission patch */}
      <group position={[-0.3, 1.22, 0.33]} rotation={[0, -0.6, 0]}>
        <mesh><circleGeometry args={[0.09, 16]} /><meshStandardMaterial color="#1f3a6b" /></mesh>
        <mesh position={[0, 0, 0.002]}><ringGeometry args={[0.07, 0.09, 16]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} /></mesh>
        <mesh position={[0.02, 0.01, 0.004]}><circleGeometry args={[0.03, 12]} /><meshStandardMaterial color="#e8e4dc" /></mesh>
      </group>
      {/* backpack */}
      <mesh position={[0, 1.1, -0.42]} castShadow={castShadow}>
        <boxGeometry args={[0.66, 0.78, 0.3]} />
        {grey}
      </mesh>
      <mesh position={[0, 1.38, -0.58]}>
        <boxGeometry args={[0.4, 0.12, 0.04]} />
        {acc}
      </mesh>
      {/* arms */}
      {[[-0.55, armL], [0.55, armR]].map(([x, ref], i) => (
        <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 1.32, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow={castShadow}>
            <capsuleGeometry args={[0.14, 0.38, 6, 12]} />
            {white}
          </mesh>
          <mesh position={[0, -0.6, 0]}>
            <sphereGeometry args={[0.13, 10, 10]} />
            {acc}
          </mesh>
        </group>
      ))}
      {/* helmet */}
      <group ref={head} position={[0, 1.88, 0]}>
        <mesh castShadow={castShadow}>
          <sphereGeometry args={[0.52, 24, 24]} />
          {white}
        </mesh>
        <mesh position={[0, 0.02, 0.2]} scale={[1, 0.82, 0.8]}>
          <sphereGeometry args={[0.42, 24, 24]} />
          <meshPhysicalMaterial color="#17223a" roughness={0.08} metalness={0.3} clearcoat={1} />
        </mesh>
        <group ref={eyes} position={[0, 0.04, 0.53]}>
          <mesh position={[-0.12, 0, 0]}>
            <capsuleGeometry args={[0.04, 0.07, 4, 8]} />
            <meshStandardMaterial color="#d8fff6" emissive="#9ff5e4" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <capsuleGeometry args={[0.04, 0.07, 4, 8]} />
            <meshStandardMaterial color="#d8fff6" emissive="#9ff5e4" emissiveIntensity={2} />
          </mesh>
        </group>
        <mesh position={[0.36, 0.3, -0.05]}>
          <cylinderGeometry args={[0.02, 0.02, 0.35]} />
          {grey}
        </mesh>
        <mesh position={[0.36, 0.5, -0.05]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
