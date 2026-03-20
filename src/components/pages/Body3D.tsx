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
  const S = 12; // segments around limb

  for (let p = 0; p < path.length; p++) {
    const pt = path[p];
    // direction to next/prev for orientation
    const next = path[Math.min(p + 1, path.length - 1)];
    const prev = path[Math.max(p - 1, 0)];
    const dx = next.x - prev.x, dy = next.y - prev.y, dz = next.z - prev.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    // up direction
    const ux = dx / len, uy = dy / len, uz = dz / len;
    // perpendicular axes (crude but works)
    let px = -uz, py = 0, pz = ux;
    const pl = Math.sqrt(px * px + pz * pz) || 1;
    px /= pl; pz /= pl;
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

// ── Build torso cross-sections (feet → neck, NO head) ──

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

// ── Build arm path ──

function buildArmPath(d: BodyDims, side: 1 | -1): { x: number; y: number; z: number; r: number }[] {
  const h = d.height;
  const toY = (frac: number) => (frac - 0.5) * h;
  const shoulderX = side * d.shoulderR * 0.92;
  const shoulderY = toY(0.71);
  const elbowX = side * (d.shoulderR * 0.6);
  const elbowY = toY(0.52);
  const wristX = side * (d.shoulderR * 0.5);
  const wristY = toY(0.36);
  const handX = side * (d.shoulderR * 0.48);
  const handY = toY(0.32);

  return [
    { x: shoulderX, y: shoulderY, z: 0, r: d.bicepR * 1.1 },
    { x: shoulderX * 0.97, y: shoulderY - 5, z: 0, r: d.bicepR * 1.05 },
    { x: (shoulderX + elbowX) / 2, y: (shoulderY + elbowY) / 2, z: 1, r: d.bicepR },
    { x: elbowX * 1.02, y: elbowY + 3, z: 1, r: d.bicepR * 0.85 },
    { x: elbowX, y: elbowY, z: 1, r: d.forearmR * 1.05 },
    { x: elbowX * 0.99, y: elbowY - 4, z: 0.5, r: d.forearmR },
    { x: (elbowX + wristX) / 2, y: (elbowY + wristY) / 2, z: 0, r: d.forearmR * 0.9 },
    { x: wristX, y: wristY + 3, z: 0, r: d.wristR * 1.1 },
    { x: wristX, y: wristY, z: 0, r: d.wristR },
    // Hand (flattened)
    { x: handX, y: handY + 3, z: 0, r: d.wristR * 1.3 },
    { x: handX, y: handY, z: 0, r: d.wristR * 1.2 },
    { x: handX, y: handY - 3, z: 0, r: d.wristR * 0.5 },
  ];
}

// ── Head sections (neck top → crown) ──

function buildHeadSections(d: BodyDims): CS[] {
  const hr = d.headRx, hz = d.headRz;
  return [
    { y: 0.78, rx: d.neckR * 0.9, rz: d.neckR * 0.85 },
    { y: 0.80, rx: hr * 0.75, rz: hz * 0.7 },    // jaw narrow
    { y: 0.82, rx: hr * 0.88, rz: hz * 0.82 },    // jaw widen
    { y: 0.85, rx: hr * 0.98, rz: hz * 0.95 },    // cheeks
    { y: 0.88, rx: hr, rz: hz },                    // widest (ears)
    { y: 0.91, rx: hr * 0.98, rz: hz * 0.96 },    // temple
    { y: 0.94, rx: hr * 0.92, rz: hz * 0.9 },     // forehead
    { y: 0.97, rx: hr * 0.75, rz: hz * 0.7 },     // top
    { y: 1.00, rx: hr * 0.15, rz: hz * 0.15 },    // crown
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

  // Fat dims (full) and lean dims (slimmer)
  const fatDims = useMemo(() => getDims(entry, gender, 1), [entry, gender]);
  const leanDims = useMemo(() => getDims(entry, gender, 0.88), [entry, gender]);

  // Torso geometries
  const fatTorso = useMemo(() => buildGeo(buildTorsoSections(fatDims), height), [fatDims, height]);
  const leanTorso = useMemo(() => buildGeo(buildTorsoSections(leanDims), height), [leanDims, height]);

  // Head geometries
  const fatHead = useMemo(() => buildGeo(buildHeadSections(fatDims), height), [fatDims, height]);
  const leanHead = useMemo(() => buildGeo(buildHeadSections(leanDims), height), [leanDims, height]);

  // Arm geometries (fat + lean, both sides)
  const fatArmR = useMemo(() => buildLimbGeo(buildArmPath(fatDims, 1)), [fatDims]);
  const fatArmL = useMemo(() => buildLimbGeo(buildArmPath(fatDims, -1)), [fatDims]);
  const leanArmR = useMemo(() => buildLimbGeo(buildArmPath(leanDims, 1)), [leanDims]);
  const leanArmL = useMemo(() => buildLimbGeo(buildArmPath(leanDims, -1)), [leanDims]);

  const fatOp = bf != null ? Math.min(0.3, Math.max(0.05, (bf / 100) * 0.7)) : 0.08;
  const waistY = (0.56 - 0.5) * height;

  return (
    <group>
      {/* ── FAT LAYERS (outer) ── */}
      {bf != null && (
        <>
          <Layer geo={fatTorso} color="#ff6b35" opacity={fatOp} depthWrite={false} shininess={30} />
          <Layer geo={fatHead} color="#ff6b35" opacity={fatOp * 0.6} depthWrite={false} shininess={30} />
          <Layer geo={fatArmR} color="#ff6b35" opacity={fatOp} depthWrite={false} shininess={30} />
          <Layer geo={fatArmL} color="#ff6b35" opacity={fatOp} depthWrite={false} shininess={30} />
        </>
      )}

      {/* ── LEAN LAYERS (inner) ── */}
      <Layer geo={leanTorso} color={accent} opacity={0.35} shininess={80} specular={0x666666} />
      <Layer geo={leanHead} color={accent} opacity={0.35} shininess={80} specular={0x666666} />
      <Layer geo={leanArmR} color={accent} opacity={0.35} shininess={80} specular={0x666666} />
      <Layer geo={leanArmL} color={accent} opacity={0.35} shininess={80} specular={0x666666} />

      {/* ── WIREFRAME CONTOUR ── */}
      <Layer geo={leanTorso} color={accent} opacity={0.06} wireframe />
      <Layer geo={leanHead} color={accent} opacity={0.06} wireframe />
      <Layer geo={leanArmR} color={accent} opacity={0.06} wireframe />
      <Layer geo={leanArmL} color={accent} opacity={0.06} wireframe />

      {/* ── VISCERAL FAT ── */}
      {vf != null && vf > 0 && <VisceralGlow vf={vf} waistY={waistY} />}
    </group>
  );
}

// ── Measurement stat pill ──

function Pill({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[8px] text-slate-500 font-bold uppercase">{label}</span>
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
          camera={{ position: [0, 10, 220], fov: 32, near: 1, far: 600 }}
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
            minDistance={120}
            maxDistance={350}
            minPolarAngle={Math.PI * 0.2}
            maxPolarAngle={Math.PI * 0.8}
            autoRotate
            autoRotateSpeed={1.5}
          />
        </Canvas>
      </div>

      {/* ── Measurement pills below 3D view ── */}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        <Pill label="Piept" value={entry.piept} unit="cm" />
        <Pill label="Talie" value={entry.talie} unit="cm" />
        <Pill label="Fesieri" value={entry.fesieri} unit="cm" />
        <Pill label="Biceps" value={entry.biceps} unit="cm" />
        <Pill label="Spate" value={entry.spate} unit="cm" />
        <Pill label="Weight" value={entry.kg} unit="kg" />
        <Pill label="BF" value={entry.bodyFat} unit="%" />
      </div>
    </div>
  );
}
