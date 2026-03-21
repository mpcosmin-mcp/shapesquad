import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Entry } from '../../lib/shape';

const AVG_HEIGHT = { M: 175, F: 162 };
const REF = {
  M: { piept: 98, talie: 84, fesieri: 100, biceps: 32, spate: 104, coapse: 57, gambe: 38 },
  F: { piept: 90, talie: 72, fesieri: 98, biceps: 27, spate: 84, coapse: 54, gambe: 36 },
};

// ── Measurement zone colors ──
const Z = {
  piept:   '#a855f7',  // purple
  talie:   '#f59e0b',  // amber
  fesieri: '#ec4899',  // pink
  biceps:  '#06b6d4',  // cyan
  spate:   '#10b981',  // emerald
  coapse:  '#6366f1',  // indigo
  gambe:   '#8b5cf6',  // violet
};

function sc(val: number | null, ref: number): number {
  if (val == null) return 1;
  return 0.75 + (val / ref) * 0.25;
}

function estThigh(entry: Entry, gender: 'M' | 'F'): number {
  if (entry.fesieri != null) return entry.fesieri * (gender === 'F' ? 0.56 : 0.55);
  return REF[gender].coapse;
}

function estCalf(entry: Entry, gender: 'M' | 'F'): number {
  if (entry.kg != null) return Math.sqrt(entry.kg) * 2.1 + AVG_HEIGHT[gender] * 0.06;
  return REF[gender].gambe;
}

// ── Cross-section geometry builder ──

interface CS { y: number; rx: number; rz: number; }
const SEG = 28;

function buildGeo(sections: CS[], heightCm: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  const rings = sections.length;
  for (let r = 0; r < rings; r++) {
    const s = sections[r];
    const y = (s.y - 0.5) * heightCm;
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      pos.push(c * s.rx, y, sn * s.rz);
      const nx = c / (s.rx || 1), nz = sn / (s.rz || 1);
      const len = Math.sqrt(nx * nx + nz * nz) || 1;
      nrm.push(nx / len, 0, nz / len);
    }
  }
  const stride = SEG + 1;
  for (let r = 0; r < rings - 1; r++)
    for (let i = 0; i < SEG; i++) {
      const a = r * stride + i, b = a + stride;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── Limb (arm/leg) tube from path of points ──

function buildLimbGeo(path: { x: number; y: number; z: number; r: number }[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  const S = 12;

  for (let p = 0; p < path.length; p++) {
    const pt = path[p];
    const next = path[Math.min(p + 1, path.length - 1)];
    const prev = path[Math.max(p - 1, 0)];
    const dx = next.x - prev.x, dy = next.y - prev.y, dz = next.z - prev.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const ux = dx / len, uy = dy / len, uz = dz / len;
    let px = -uz, py = 0, pz = ux;
    const pl = Math.sqrt(px * px + py * py + pz * pz) || 1;
    px /= pl; pz /= pl;
    // If arm is mostly horizontal, use Y-up as reference
    if (Math.abs(uy) < 0.3) {
      // cross product of dir with Y-up
      const cx = uz, cz = -ux;
      const cl = Math.sqrt(cx * cx + cz * cz) || 1;
      px = cx / cl; py = 0; pz = cz / cl;
    }
    const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;

    for (let i = 0; i <= S; i++) {
      const t = (i / S) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      const nx = px * c + qx * s;
      const ny = py * c + qy * s;
      const nz = pz * c + qz * s;
      pos.push(pt.x + nx * pt.r, pt.y + ny * pt.r, pt.z + nz * pt.r);
      nrm.push(nx, ny, nz);
    }
  }

  const stride = S + 1;
  for (let p = 0; p < path.length - 1; p++)
    for (let i = 0; i < S; i++) {
      const a = p * stride + i, b = a + stride;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── Body data extraction ──

interface BodyDims {
  height: number;
  shoulderR: number; chestRx: number; chestRz: number;
  waistRx: number; waistRz: number; hipRx: number; hipRz: number;
  thighR: number; kneeR: number; calfR: number; ankleR: number;
  neckR: number; headRx: number; headRz: number;
  bicepR: number; forearmR: number; wristR: number;
  bellyPush: number; isFemale: boolean;
}

function getDims(entry: Entry, gender: 'M' | 'F', bfMult: number): BodyDims {
  const ref = REF[gender];
  const isFemale = gender === 'F';
  const h = AVG_HEIGHT[gender];
  const sChest = sc(entry.piept, ref.piept), sWaist = sc(entry.talie, ref.talie);
  const sHips = sc(entry.fesieri, ref.fesieri), sBicep = sc(entry.biceps, ref.biceps);
  const sThigh = sc(estThigh(entry, gender), ref.coapse);
  const sCalf = sc(estCalf(entry, gender), ref.gambe);
  const bfBase = entry.bodyFat != null ? 0.88 + (entry.bodyFat / 100) * 0.3 : 1;
  const bmiW = entry.kg != null ? 0.82 + ((entry.kg / ((h / 100) ** 2)) / 23) * 0.18 : 1;
  const bf = bfBase * bmiW * bfMult;
  const bellyPush = entry.bodyFat != null ? 1 + (entry.bodyFat / 100) * 0.6 : 1;

  return {
    height: h, isFemale,
    shoulderR: (isFemale ? 18 : 22) * sChest * bf,
    chestRx: (isFemale ? 16 : 19) * sChest * bf,
    chestRz: (isFemale ? 12 : 13) * sChest * bf,
    waistRx: (isFemale ? 12 : 15) * sWaist * bf,
    waistRz: (isFemale ? 10 : 13) * sWaist * bf * bellyPush,
    hipRx: (isFemale ? 18 : 16) * sHips * bf,
    hipRz: (isFemale ? 13 : 12) * sHips * bf * (bellyPush * 0.7 + 0.3),
    thighR: (isFemale ? 9 : 8.5) * sThigh * bf,
    kneeR: (isFemale ? 5.5 : 6) * sCalf * bf * 0.95,
    calfR: (isFemale ? 5.8 : 6.5) * sCalf * bf,
    ankleR: 3.5,
    neckR: isFemale ? 5.5 : 6.5,
    headRx: 9.5, headRz: 8.5,
    bicepR: (isFemale ? 4.5 : 6) * sBicep * bf,
    forearmR: (isFemale ? 3.5 : 4.5) * sBicep * bf,
    wristR: isFemale ? 2.5 : 3,
    bellyPush,
  };
}

// ── Build torso cross-sections (feet to neck) ──

function buildTorsoSections(d: BodyDims): CS[] {
  return [
    { y: 0.00, rx: 4.5, rz: 8 },
    { y: 0.02, rx: d.ankleR, rz: d.ankleR * 0.9 },
    { y: 0.12, rx: d.calfR, rz: d.calfR * 0.85 },
    { y: 0.22, rx: d.calfR * 0.9, rz: d.calfR * 0.8 },
    { y: 0.27, rx: d.kneeR, rz: d.kneeR * 0.9 },
    { y: 0.32, rx: d.kneeR * 1.05, rz: d.kneeR },
    { y: 0.40, rx: d.thighR, rz: d.thighR * 0.9 },
    { y: 0.46, rx: d.thighR * 1.05, rz: d.thighR * 0.95 },
    { y: 0.48, rx: d.hipRx * 0.85, rz: d.hipRz * 0.7 },
    { y: 0.50, rx: d.hipRx, rz: d.hipRz },
    { y: 0.53, rx: d.hipRx * 0.95, rz: d.hipRz * 0.98 },
    { y: 0.56, rx: d.waistRx, rz: d.waistRz },
    { y: 0.60, rx: d.waistRx * 1.02, rz: d.waistRz * 0.95 },
    { y: 0.65, rx: d.chestRx, rz: d.chestRz },
    { y: 0.68, rx: d.chestRx * 0.98, rz: d.chestRz * 0.9 },
    { y: 0.71, rx: d.shoulderR, rz: d.chestRz * 0.75 },
    { y: 0.73, rx: d.shoulderR * 0.45, rz: d.chestRz * 0.45 },
    { y: 0.75, rx: d.neckR, rz: d.neckR },
    { y: 0.78, rx: d.neckR * 0.9, rz: d.neckR * 0.85 },
  ];
}

// ── Build arm path — T-POSE (horizontal) ──

function buildArmPath(d: BodyDims, side: 1 | -1): { x: number; y: number; z: number; r: number }[] {
  const h = d.height;
  const toY = (frac: number) => (frac - 0.5) * h;
  const shoulderY = toY(0.71);
  const shoulderX = side * d.shoulderR * 0.92;

  // Arm extends horizontally from shoulder
  const upperLen = h * 0.17;
  const foreLen = h * 0.14;
  const handLen = h * 0.04;

  const elbowX = shoulderX + side * upperLen;
  const wristX = elbowX + side * foreLen;
  const handX = wristX + side * handLen;

  // Very slight natural droop toward hand
  const drop = -1.5;

  return [
    // Shoulder cap
    { x: shoulderX, y: shoulderY, z: 0, r: d.bicepR * 1.15 },
    { x: shoulderX + side * 3, y: shoulderY, z: 0, r: d.bicepR * 1.1 },
    // Upper arm (biceps zone)
    { x: shoulderX + side * upperLen * 0.2, y: shoulderY + drop * 0.1, z: 0.5, r: d.bicepR * 1.05 },
    { x: shoulderX + side * upperLen * 0.4, y: shoulderY + drop * 0.2, z: 0.8, r: d.bicepR },
    { x: shoulderX + side * upperLen * 0.6, y: shoulderY + drop * 0.35, z: 0.8, r: d.bicepR * 0.95 },
    { x: shoulderX + side * upperLen * 0.8, y: shoulderY + drop * 0.5, z: 0.5, r: d.bicepR * 0.88 },
    // Elbow
    { x: elbowX, y: shoulderY + drop * 0.6, z: 0.3, r: d.forearmR * 1.05 },
    // Forearm
    { x: elbowX + side * foreLen * 0.2, y: shoulderY + drop * 0.65, z: 0, r: d.forearmR },
    { x: elbowX + side * foreLen * 0.5, y: shoulderY + drop * 0.75, z: 0, r: d.forearmR * 0.9 },
    { x: elbowX + side * foreLen * 0.8, y: shoulderY + drop * 0.85, z: 0, r: d.forearmR * 0.8 },
    // Wrist
    { x: wristX, y: shoulderY + drop * 0.9, z: 0, r: d.wristR * 1.1 },
    { x: wristX + side * 1, y: shoulderY + drop * 0.92, z: 0, r: d.wristR },
    // Hand
    { x: handX - side * 2, y: shoulderY + drop * 0.95, z: 0, r: d.wristR * 1.3 },
    { x: handX, y: shoulderY + drop, z: 0, r: d.wristR * 1.1 },
    { x: handX + side * 2, y: shoulderY + drop, z: 0, r: d.wristR * 0.4 },
  ];
}

// ── Head sections ──

function buildHeadSections(d: BodyDims): CS[] {
  const hr = d.headRx, hz = d.headRz;
  return [
    { y: 0.78, rx: d.neckR * 0.9, rz: d.neckR * 0.85 },
    { y: 0.80, rx: hr * 0.75, rz: hz * 0.7 },
    { y: 0.82, rx: hr * 0.88, rz: hz * 0.82 },
    { y: 0.85, rx: hr * 0.98, rz: hz * 0.95 },
    { y: 0.88, rx: hr, rz: hz },
    { y: 0.91, rx: hr * 0.98, rz: hz * 0.96 },
    { y: 0.94, rx: hr * 0.92, rz: hz * 0.9 },
    { y: 0.97, rx: hr * 0.75, rz: hz * 0.7 },
    { y: 1.00, rx: hr * 0.15, rz: hz * 0.15 },
  ];
}

// ── Visceral fat glow ──

function VisceralGlow({ vf, waistY }: { vf: number; waistY: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const intensity = Math.min(0.6, (vf / 15) * 0.6);
  const rx = 5 + vf * 1.0, ry = 6 + vf * 1.2, rz = 4 + vf * 0.8;

  useFrame(({ clock }) => {
    if (ref.current) {
      const p = 1 + Math.sin(clock.elapsedTime * 2) * 0.04;
      ref.current.scale.set(rx * p, ry * p, rz * p);
    }
  });

  return (
    <mesh ref={ref} position={[0, waistY, 2]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color="#ff3b3b" transparent opacity={intensity} depthWrite={false} />
    </mesh>
  );
}

// ── Measurement band ring (horizontal ring around body) ──

function BodyBand({ yFrac, rx, rz, color, height }: {
  yFrac: number; rx: number; rz: number; color: string; height: number;
}) {
  const y = (yFrac - 0.5) * height;
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, rz / (rx || 1), 1]}>
      <ringGeometry args={[rx * 0.92, rx * 1.02, 48]} />
      <meshPhongMaterial
        color={color} transparent opacity={0.65}
        side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.25}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Arm measurement band (ring perpendicular to horizontal arm) ──

function ArmBand({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <mesh position={[x, y, 0]} rotation={[0, 0, Math.PI / 2]}>
      <ringGeometry args={[r * 0.88, r * 1.05, 32]} />
      <meshPhongMaterial
        color={color} transparent opacity={0.65}
        side={THREE.DoubleSide} emissive={color} emissiveIntensity={0.25}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Reusable mesh layer ──

function Layer({ geo, color, opacity, wireframe, specular, shininess, depthWrite }: {
  geo: THREE.BufferGeometry; color: string; opacity: number;
  wireframe?: boolean; specular?: number; shininess?: number; depthWrite?: boolean;
}) {
  return (
    <mesh geometry={geo}>
      {wireframe ? (
        <meshBasicMaterial color={color} transparent opacity={opacity} wireframe />
      ) : (
        <meshPhongMaterial
          color={color} transparent opacity={opacity}
          side={THREE.DoubleSide} depthWrite={depthWrite ?? true}
          shininess={shininess ?? 60}
          specular={new THREE.Color(specular ?? 0x444444)}
        />
      )}
    </mesh>
  );
}

// ── Main body mesh ──

function BodyMesh({ entry, gender }: { entry: Entry; gender: 'M' | 'F' }) {
  const height = AVG_HEIGHT[gender];
  const accent = gender === 'F' ? '#ec4899' : '#3b82f6';
  const bf = entry.bodyFat;
  const vf = entry.visceralFat;

  const fatDims = useMemo(() => getDims(entry, gender, 1), [entry, gender]);
  const leanDims = useMemo(() => getDims(entry, gender, 0.88), [entry, gender]);

  const fatTorso = useMemo(() => buildGeo(buildTorsoSections(fatDims), height), [fatDims, height]);
  const leanTorso = useMemo(() => buildGeo(buildTorsoSections(leanDims), height), [leanDims, height]);
  const fatHead = useMemo(() => buildGeo(buildHeadSections(fatDims), height), [fatDims, height]);
  const leanHead = useMemo(() => buildGeo(buildHeadSections(leanDims), height), [leanDims, height]);
  const fatArmR = useMemo(() => buildLimbGeo(buildArmPath(fatDims, 1)), [fatDims]);
  const fatArmL = useMemo(() => buildLimbGeo(buildArmPath(fatDims, -1)), [fatDims]);
  const leanArmR = useMemo(() => buildLimbGeo(buildArmPath(leanDims, 1)), [leanDims]);
  const leanArmL = useMemo(() => buildLimbGeo(buildArmPath(leanDims, -1)), [leanDims]);

  const fatOp = bf != null ? Math.min(0.3, Math.max(0.05, (bf / 100) * 0.7)) : 0.08;
  const waistY = (0.56 - 0.5) * height;

  // Arm bicep band position (middle of upper arm, at shoulder height)
  const toY = (frac: number) => (frac - 0.5) * height;
  const shoulderY = toY(0.71);
  const bicepBandX = leanDims.shoulderR * 0.92 + height * 0.17 * 0.4;

  return (
    <group>
      {/* FAT LAYERS */}
      {bf != null && (
        <>
          <Layer geo={fatTorso} color="#ff6b35" opacity={fatOp} depthWrite={false} shininess={30} />
          <Layer geo={fatHead} color="#ff6b35" opacity={fatOp * 0.6} depthWrite={false} shininess={30} />
          <Layer geo={fatArmR} color="#ff6b35" opacity={fatOp} depthWrite={false} shininess={30} />
          <Layer geo={fatArmL} color="#ff6b35" opacity={fatOp} depthWrite={false} shininess={30} />
        </>
      )}

      {/* LEAN LAYERS */}
      <Layer geo={leanTorso} color={accent} opacity={0.35} shininess={80} specular={0x666666} />
      <Layer geo={leanHead} color={accent} opacity={0.35} shininess={80} specular={0x666666} />
      <Layer geo={leanArmR} color={accent} opacity={0.35} shininess={80} specular={0x666666} />
      <Layer geo={leanArmL} color={accent} opacity={0.35} shininess={80} specular={0x666666} />

      {/* WIREFRAME */}
      <Layer geo={leanTorso} color={accent} opacity={0.06} wireframe />
      <Layer geo={leanHead} color={accent} opacity={0.06} wireframe />
      <Layer geo={leanArmR} color={accent} opacity={0.06} wireframe />
      <Layer geo={leanArmL} color={accent} opacity={0.06} wireframe />

      {/* VISCERAL FAT */}
      {vf != null && vf > 0 && <VisceralGlow vf={vf} waistY={waistY} />}

      {/* ── MEASUREMENT BANDS ── */}
      {/* Piept (chest) — purple */}
      {entry.piept != null && (
        <BodyBand yFrac={0.65} rx={leanDims.chestRx} rz={leanDims.chestRz} color={Z.piept} height={height} />
      )}
      {/* Talie (waist) — amber */}
      {entry.talie != null && (
        <BodyBand yFrac={0.56} rx={leanDims.waistRx} rz={leanDims.waistRz} color={Z.talie} height={height} />
      )}
      {/* Fesieri (hips) — pink */}
      {entry.fesieri != null && (
        <BodyBand yFrac={0.50} rx={leanDims.hipRx} rz={leanDims.hipRz} color={Z.fesieri} height={height} />
      )}
      {/* Coapse (thighs) — indigo */}
      <BodyBand yFrac={0.40} rx={leanDims.thighR} rz={leanDims.thighR * 0.9} color={Z.coapse} height={height} />
      {/* Gambe (calves) — violet */}
      <BodyBand yFrac={0.12} rx={leanDims.calfR} rz={leanDims.calfR * 0.85} color={Z.gambe} height={height} />
      {/* Biceps — cyan (both arms) */}
      {entry.biceps != null && (
        <>
          <ArmBand x={bicepBandX} y={shoulderY - 0.3} r={leanDims.bicepR} color={Z.biceps} />
          <ArmBand x={-bicepBandX} y={shoulderY - 0.3} r={leanDims.bicepR} color={Z.biceps} />
        </>
      )}
    </group>
  );
}

// ── Colored measurement pill ──

function Pill({ label, value, unit, color }: { label: string; value: number | null; unit: string; color?: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{
        background: color ? `${color}12` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${color ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
      }}>
      {color && <div className="w-2 h-2 rounded-full" style={{ background: color, opacity: 0.8 }} />}
      <span className="text-[8px] font-bold uppercase" style={{ color: color || '#64748b' }}>{label}</span>
      <span className="font-mono text-[11px] font-black text-slate-300">{value.toFixed(1)}</span>
      <span className="text-[8px] text-slate-600">{unit}</span>
    </div>
  );
}

// ── Exported Component ──

interface Props { entry: Entry; gender: 'M' | 'F'; }

export default function Body3D({ entry, gender }: Props) {
  const height = AVG_HEIGHT[gender];

  return (
    <div className="w-full">
      <div style={{ height: 380 }}>
        <Canvas
          camera={{ position: [0, 15, 300], fov: 34, near: 1, far: 600 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[50, 80, 60]} intensity={0.8} />
          <directionalLight position={[-40, 20, -50]} intensity={0.3} color="#4488ff" />
          <pointLight position={[0, -height * 0.3, 40]} intensity={0.2} color="#ff6b35" />

          <BodyMesh entry={entry} gender={gender} />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={150}
            maxDistance={450}
            minPolarAngle={Math.PI * 0.2}
            maxPolarAngle={Math.PI * 0.8}
            autoRotate
            autoRotateSpeed={1.5}
          />
        </Canvas>
      </div>

      {/* ── Measurement pills with zone colors ── */}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        <Pill label="Piept" value={entry.piept} unit="cm" color={Z.piept} />
        <Pill label="Talie" value={entry.talie} unit="cm" color={Z.talie} />
        <Pill label="Fesieri" value={entry.fesieri} unit="cm" color={Z.fesieri} />
        <Pill label="Biceps" value={entry.biceps} unit="cm" color={Z.biceps} />
        <Pill label="Spate" value={entry.spate} unit="cm" color={Z.spate} />
        <Pill label="Weight" value={entry.kg} unit="kg" />
        <Pill label="BF" value={entry.bodyFat} unit="%" />
      </div>
    </div>
  );
}
