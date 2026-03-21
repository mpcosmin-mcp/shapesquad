import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Entry } from '../../lib/shape';

const Body3D = lazy(() => import('./Body3D'));

const AVG_HEIGHT = { M: 175, F: 162 };
const W = 520, H = 540, CX = W / 2;

interface Props { entries: Entry[]; gender: 'M' | 'F'; }

const REF = {
  M: { piept: 98, talie: 84, fesieri: 100, biceps: 32, spate: 104, coapse: 57, gambe: 38 },
  F: { piept: 90, talie: 72, fesieri: 98, biceps: 27, spate: 84, coapse: 54, gambe: 36 },
};

// Zone colors (matching 3D)
const Z = {
  piept:   '#a855f7',
  talie:   '#f59e0b',
  fesieri: '#ec4899',
  biceps:  '#06b6d4',
  spate:   '#10b981',
  coapse:  '#6366f1',
  gambe:   '#8b5cf6',
};

function scale(val: number | null, ref: number): number {
  if (val == null) return 1;
  return 0.75 + (val / ref) * 0.25;
}

function bmiScale(kg: number | null, gender: 'M' | 'F'): number {
  if (kg == null) return 1;
  const h = AVG_HEIGHT[gender] / 100;
  const bmi = kg / (h * h);
  return 0.82 + (bmi / 23) * 0.18;
}

function lerp(a: number | null, b: number | null, t: number): number | null {
  if (a == null && b == null) return null;
  const va = a ?? b!; const vb = b ?? a!;
  return va + (vb - va) * t;
}

function lerpEntry(a: Entry, b: Entry, t: number): Entry {
  return {
    name: t < 0.5 ? a.name : b.name, date: t < 0.5 ? a.date : b.date, gender: a.gender,
    kg: lerp(a.kg, b.kg, t), bodyFat: lerp(a.bodyFat, b.bodyFat, t),
    visceralFat: lerp(a.visceralFat, b.visceralFat, t), muscle: lerp(a.muscle, b.muscle, t),
    water: lerp(a.water, b.water, t), biceps: lerp(a.biceps, b.biceps, t),
    spate: lerp(a.spate, b.spate, t), piept: lerp(a.piept, b.piept, t),
    talie: lerp(a.talie, b.talie, t), fesieri: lerp(a.fesieri, b.fesieri, t),
  };
}

function estimateCoapse(entry: Entry, gender: 'M' | 'F'): number {
  const ref = REF[gender];
  if (entry.fesieri != null) {
    const ratio = gender === 'F' ? 0.56 : 0.55;
    let est = entry.fesieri * ratio;
    if (entry.bodyFat != null)
      est *= Math.max(0.9, Math.min(1.15, 1 + (entry.bodyFat - (gender === 'F' ? 25 : 18)) * 0.004));
    return est;
  }
  if (entry.kg != null) {
    const bmi = entry.kg / ((AVG_HEIGHT[gender] / 100) ** 2);
    return ref.coapse * (0.7 + (bmi / 25) * 0.3);
  }
  return ref.coapse;
}

function estimateGambe(entry: Entry, gender: 'M' | 'F'): number {
  const ref = REF[gender];
  if (entry.kg != null) {
    const est = Math.sqrt(entry.kg) * 2.1 + AVG_HEIGHT[gender] * 0.06;
    if (entry.bodyFat != null)
      return est * Math.max(0.92, Math.min(1.12, 1 + (entry.bodyFat - (gender === 'F' ? 25 : 18)) * 0.003));
    return est;
  }
  if (entry.fesieri != null) return entry.fesieri * 0.37;
  return ref.gambe;
}

// ── SVG Path Builder (T-pose: arms extend horizontally) ──

function buildTorso(entry: Entry, gender: 'M' | 'F', bfOverride?: number): string {
  const ref = REF[gender];
  const isFemale = gender === 'F';
  const height = AVG_HEIGHT[gender];

  const sChest = scale(entry.piept, ref.piept);
  const sWaist = scale(entry.talie, ref.talie);
  const sHips = scale(entry.fesieri, ref.fesieri);
  const sThigh = scale(estimateCoapse(entry, gender), ref.coapse);
  const sCalf = scale(estimateGambe(entry, gender), ref.gambe);

  const bfFactor = bfOverride ?? (entry.bodyFat != null ? 0.88 + (entry.bodyFat / 100) * 0.3 : 1);
  const bmiW = bfOverride != null ? 1 : bmiScale(entry.kg, gender);
  const bf = bfFactor * bmiW;

  const bodyH = H - 50;
  const pxPerCm = bodyH / height;
  const headH = height * 0.13 * pxPerCm;
  const torsoH = height * 0.30 * pxPerCm;
  const legH = height * 0.47 * pxPerCm;

  const headTop = 22;
  const headBot = headTop + headH * 0.72;
  const neckBot = headBot + headH * 0.28;
  const shoulderY = neckBot + 6;
  const chestY = shoulderY + torsoH * 0.25;
  const waistY = chestY + torsoH * (isFemale ? 0.36 : 0.32);
  const hipY = waistY + torsoH * (isFemale ? 0.30 : 0.24);
  const crotchY = hipY + torsoH * 0.14;
  const thighTopY = crotchY + 4;
  const midThighY = thighTopY + legH * 0.25;
  const kneeY = thighTopY + legH * 0.45;
  const midCalfY = kneeY + legH * 0.22;
  const ankleY = thighTopY + legH * 0.88;
  const footY = thighTopY + legH * 0.95;

  const headR = 22, neckR = isFemale ? 12 : 14;
  const shoulderR = (isFemale ? 56 : 66) * sChest * bf;
  const chestR = (isFemale ? 50 : 60) * sChest * bf;
  const waistR = (isFemale ? 36 : 46) * sWaist * bf;
  const hipR = (isFemale ? 56 : 50) * sHips * bf;
  const thighR = (isFemale ? 28 : 26) * sThigh * bf;
  const kneeR = (isFemale ? 14 : 15) * sCalf * bf * 0.95;
  const calfR = (isFemale ? 15 : 17) * sCalf * bf;
  const ankleR = 9;
  const legGap = 4;

  // ── HEAD ──
  let p = `M ${CX} ${headTop}`;
  p += ` C ${CX + headR * 1.15} ${headTop - 2}, ${CX + headR * 1.15} ${headBot + 2}, ${CX + neckR + 2} ${headBot}`;
  p += ` C ${CX + neckR + 1} ${neckBot - 4}, ${CX + neckR + 4} ${neckBot}, ${CX + shoulderR * 0.35} ${shoulderY - 3}`;
  p += ` C ${CX + shoulderR * 0.6} ${shoulderY - 1}, ${CX + shoulderR * 0.85} ${shoulderY}, ${CX + shoulderR} ${shoulderY + 2}`;

  // ── RIGHT ARMPIT → CHEST (connect shoulder to chest) ──
  p += ` C ${CX + shoulderR - 2} ${shoulderY + 8}, ${CX + chestR + 4} ${chestY - 8}, ${CX + chestR} ${chestY}`;

  // ── RIGHT TORSO ──
  if (isFemale) {
    p += ` C ${CX + chestR + 3} ${chestY + 12}, ${CX + waistR + 2} ${waistY - 25}, ${CX + waistR} ${waistY}`;
    p += ` C ${CX + waistR - 1} ${waistY + 14}, ${CX + hipR + 5} ${hipY - 18}, ${CX + hipR} ${hipY}`;
  } else {
    p += ` C ${CX + chestR - 1} ${chestY + 14}, ${CX + waistR + 6} ${waistY - 18}, ${CX + waistR} ${waistY}`;
    p += ` C ${CX + waistR + 1} ${waistY + 10}, ${CX + hipR + 2} ${hipY - 12}, ${CX + hipR} ${hipY}`;
  }

  // ── HIP → LEGS ──
  p += ` C ${CX + hipR - 2} ${hipY + 8}, ${CX + thighR + 8} ${crotchY - 8}, ${CX + thighR + 4} ${crotchY}`;
  p += ` C ${CX + thighR + 3} ${thighTopY - 2}, ${CX + thighR + 2} ${thighTopY + 8}, ${CX + thighR} ${midThighY}`;
  p += ` C ${CX + thighR - 1} ${midThighY + 18}, ${CX + kneeR + 3} ${kneeY - 12}, ${CX + kneeR} ${kneeY}`;
  p += ` C ${CX + kneeR + 1} ${kneeY + 8}, ${CX + calfR + 2} ${midCalfY - 8}, ${CX + calfR} ${midCalfY}`;
  p += ` C ${CX + calfR - 1} ${midCalfY + 16}, ${CX + ankleR + 2} ${ankleY - 16}, ${CX + ankleR} ${ankleY}`;
  p += ` C ${CX + ankleR + 1} ${ankleY + 4}, ${CX + ankleR + 6} ${footY - 2}, ${CX + ankleR + 5} ${footY}`;
  p += ` L ${CX + legGap} ${footY}`;
  p += ` C ${CX + legGap} ${footY - 3}, ${CX + legGap} ${ankleY + 2}, ${CX + legGap} ${ankleY}`;

  // ── LEFT FOOT ──
  p += ` C ${CX - legGap} ${ankleY + 2}, ${CX - legGap} ${footY - 3}, ${CX - legGap} ${footY}`;
  p += ` L ${CX - ankleR - 5} ${footY}`;
  p += ` C ${CX - ankleR - 6} ${footY - 2}, ${CX - ankleR - 1} ${ankleY + 4}, ${CX - ankleR} ${ankleY}`;

  // ── LEFT LEG ──
  p += ` C ${CX - ankleR - 2} ${ankleY - 16}, ${CX - calfR + 1} ${midCalfY + 16}, ${CX - calfR} ${midCalfY}`;
  p += ` C ${CX - calfR - 2} ${midCalfY - 8}, ${CX - kneeR - 1} ${kneeY + 8}, ${CX - kneeR} ${kneeY}`;
  p += ` C ${CX - kneeR - 3} ${kneeY - 12}, ${CX - thighR + 1} ${midThighY + 18}, ${CX - thighR} ${midThighY}`;
  p += ` C ${CX - thighR - 2} ${thighTopY + 8}, ${CX - thighR - 3} ${thighTopY - 2}, ${CX - thighR - 4} ${crotchY}`;

  // ── LEFT HIP → TORSO ──
  p += ` C ${CX - thighR - 8} ${crotchY - 8}, ${CX - hipR + 2} ${hipY + 8}, ${CX - hipR} ${hipY}`;

  if (isFemale) {
    p += ` C ${CX - hipR - 5} ${hipY - 18}, ${CX - waistR + 1} ${waistY + 14}, ${CX - waistR} ${waistY}`;
    p += ` C ${CX - waistR - 2} ${waistY - 25}, ${CX - chestR - 3} ${chestY + 12}, ${CX - chestR} ${chestY}`;
  } else {
    p += ` C ${CX - hipR - 2} ${hipY - 12}, ${CX - waistR - 1} ${waistY + 10}, ${CX - waistR} ${waistY}`;
    p += ` C ${CX - waistR - 6} ${waistY - 18}, ${CX - chestR + 1} ${chestY + 14}, ${CX - chestR} ${chestY}`;
  }

  // ── LEFT ARMPIT → SHOULDER ──
  p += ` C ${CX - chestR - 4} ${chestY - 8}, ${CX - shoulderR + 2} ${shoulderY + 8}, ${CX - shoulderR} ${shoulderY + 2}`;

  // ── LEFT SHOULDER → NECK → HEAD ──
  p += ` C ${CX - shoulderR * 0.85} ${shoulderY}, ${CX - shoulderR * 0.6} ${shoulderY - 1}, ${CX - shoulderR * 0.35} ${shoulderY - 3}`;
  p += ` C ${CX - neckR - 4} ${neckBot}, ${CX - neckR - 1} ${neckBot - 4}, ${CX - neckR - 2} ${headBot}`;
  p += ` C ${CX - headR * 1.15} ${headBot + 2}, ${CX - headR * 1.15} ${headTop - 2}, ${CX} ${headTop}`;
  p += ` Z`;

  return p;
}

// ── Arm path (separate from torso for T-pose) ──

function buildArm(entry: Entry, gender: 'M' | 'F', side: 1 | -1, bfOverride?: number): string {
  const ref = REF[gender];
  const isFemale = gender === 'F';
  const height = AVG_HEIGHT[gender];

  const sBicep = scale(entry.biceps, ref.biceps);
  const bfFactor = bfOverride ?? (entry.bodyFat != null ? 0.88 + (entry.bodyFat / 100) * 0.3 : 1);
  const bmiW = bfOverride != null ? 1 : bmiScale(entry.kg, gender);
  const bf = bfFactor * bmiW;
  const sChest = scale(entry.piept, ref.piept);

  const bodyH = H - 50;
  const pxPerCm = bodyH / height;
  const headH = height * 0.13 * pxPerCm;
  const torsoH = height * 0.30 * pxPerCm;

  const headTop = 22;
  const headBot = headTop + headH * 0.72;
  const neckBot = headBot + headH * 0.28;
  const shoulderY = neckBot + 6;

  const shoulderR = (isFemale ? 56 : 66) * sChest * bf;
  const armR = (isFemale ? 13 : 17) * sBicep * bf;
  const forearmR = (isFemale ? 10 : 13) * sBicep * bf * 0.85;
  const wristR = 7;

  // Arm extends horizontally from shoulder
  const armLen = 80;
  const elbowDist = armLen * 0.55;
  const wristDist = armLen * 0.88;
  const handDist = armLen + 8;

  const sX = CX + side * shoulderR; // shoulder edge X
  const armCY = shoulderY + 4; // arm center Y (just below shoulder top)

  const elbowX = sX + side * elbowDist;
  const wristX = sX + side * wristDist;
  const handX = sX + side * handDist;

  // Outer edge (top of arm going outward)
  let p = `M ${sX} ${armCY - armR * 0.3}`;
  // Deltoid → bicep
  p += ` C ${sX + side * 12} ${armCY - armR * 0.85}, ${sX + side * 20} ${armCY - armR}, ${sX + side * elbowDist * 0.5} ${armCY - armR}`;
  // Bicep → elbow
  p += ` C ${elbowX - side * 12} ${armCY - armR * 0.95}, ${elbowX - side * 4} ${armCY - forearmR * 0.7}, ${elbowX} ${armCY - forearmR * 0.5}`;
  // Forearm
  p += ` C ${elbowX + side * 8} ${armCY - forearmR * 0.75}, ${wristX - side * 10} ${armCY - wristR * 1.1}, ${wristX} ${armCY - wristR}`;
  // Hand tip
  p += ` C ${wristX + side * 4} ${armCY - wristR * 1.2}, ${handX - side * 2} ${armCY - wristR * 0.5}, ${handX} ${armCY}`;
  // Hand bottom
  p += ` C ${handX - side * 2} ${armCY + wristR * 0.5}, ${wristX + side * 4} ${armCY + wristR * 1.2}, ${wristX} ${armCY + wristR}`;
  // Inner forearm
  p += ` C ${wristX - side * 10} ${armCY + wristR * 1.1}, ${elbowX + side * 8} ${armCY + forearmR * 0.75}, ${elbowX} ${armCY + forearmR * 0.5}`;
  // Inner arm → armpit
  p += ` C ${elbowX - side * 4} ${armCY + forearmR * 0.7}, ${elbowX - side * 12} ${armCY + armR * 0.95}, ${sX + side * elbowDist * 0.5} ${armCY + armR}`;
  p += ` C ${sX + side * 20} ${armCY + armR}, ${sX + side * 12} ${armCY + armR * 0.85}, ${sX} ${armCY + armR * 0.3}`;
  p += ` Z`;

  return p;
}

function getPositions(gender: 'M' | 'F') {
  const isFemale = gender === 'F';
  const height = AVG_HEIGHT[gender];
  const bodyH = H - 50, pxPerCm = bodyH / height;
  const headH = height * 0.13 * pxPerCm, torsoH = height * 0.30 * pxPerCm, legH = height * 0.47 * pxPerCm;
  const headTop = 22, headBot = headTop + headH * 0.72, neckBot = headBot + headH * 0.28;
  const shoulderY = neckBot + 6;
  const chestY = shoulderY + torsoH * 0.25;
  const waistY = chestY + torsoH * (isFemale ? 0.36 : 0.32);
  const hipY = waistY + torsoH * (isFemale ? 0.30 : 0.24);
  const crotchY = hipY + torsoH * 0.14;
  const thighTopY = crotchY + 4;
  const midThighY = thighTopY + legH * 0.25;
  const kneeY = thighTopY + legH * 0.45;
  const midCalfY = kneeY + legH * 0.22;
  return { chestY, waistY, hipY, midThighY, kneeY, midCalfY, shoulderY };
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Component ──

export default function BodySilhouette({ entries, gender }: Props) {
  const maxIdx = entries.length - 1;
  const [sliderVal, setSliderVal] = useState(maxIdx);
  const [is3D, setIs3D] = useState(true);

  const interpolated = useMemo(() => {
    if (entries.length <= 1) return entries[0];
    const c = Math.max(0, Math.min(maxIdx, sliderVal));
    const lo = Math.floor(c), hi = Math.min(lo + 1, maxIdx);
    return lo === hi ? entries[lo] : lerpEntry(entries[lo], entries[hi], c - lo);
  }, [entries, sliderVal, maxIdx]);

  const snappedIdx = Math.round(sliderVal);
  const firstEntry = entries[0];

  // Torso paths
  const fatPath = useMemo(() => buildTorso(interpolated, gender), [interpolated, gender]);
  const leanPath = useMemo(() => buildTorso(interpolated, gender, 0.88), [interpolated, gender]);
  const firstPath = useMemo(() => entries.length > 1 ? buildTorso(firstEntry, gender) : null, [firstEntry, gender, entries.length]);
  // Arm paths (separate for T-pose)
  const fatArmR = useMemo(() => buildArm(interpolated, gender, 1), [interpolated, gender]);
  const fatArmL = useMemo(() => buildArm(interpolated, gender, -1), [interpolated, gender]);
  const leanArmR = useMemo(() => buildArm(interpolated, gender, 1, 0.88), [interpolated, gender]);
  const leanArmL = useMemo(() => buildArm(interpolated, gender, -1, 0.88), [interpolated, gender]);
  const firstArmR = useMemo(() => entries.length > 1 ? buildArm(firstEntry, gender, 1) : null, [firstEntry, gender, entries.length]);
  const firstArmL = useMemo(() => entries.length > 1 ? buildArm(firstEntry, gender, -1) : null, [firstEntry, gender, entries.length]);

  const positions = useMemo(() => getPositions(gender), [gender]);

  const height = AVG_HEIGHT[gender];
  const bf = interpolated.bodyFat;
  const vf = interpolated.visceralFat;
  const firstBf = firstEntry.bodyFat;
  const estCoapse = useMemo(() => estimateCoapse(interpolated, gender), [interpolated, gender]);
  const estGambe = useMemo(() => estimateGambe(interpolated, gender), [interpolated, gender]);
  const accentColor = gender === 'F' ? '#ec4899' : '#3b82f6';

  const onSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderVal(parseFloat(e.target.value));
  }, []);

  const bfDelta = bf != null && firstBf != null ? bf - firstBf : null;
  const kgDelta = interpolated.kg != null && firstEntry.kg != null ? interpolated.kg - firstEntry.kg : null;

  const fatOpacity = bf != null ? Math.min(0.35, Math.max(0.05, (bf / 100) * 0.8)) : 0.1;
  const vfIntensity = vf != null ? Math.min(0.6, Math.max(0, (vf / 15) * 0.6)) : 0;
  const vfRx = vf != null ? 20 + vf * 2.5 : 0;
  const vfRy = vf != null ? 25 + vf * 3 : 0;

  // Measurement band widths (based on actual torso body widths at each level)
  const sChest = scale(interpolated.piept, REF[gender].piept);
  const sWaist = scale(interpolated.talie, REF[gender].talie);
  const sHips = scale(interpolated.fesieri, REF[gender].fesieri);
  const sThigh = scale(estCoapse, REF[gender].coapse);
  const sCalf = scale(estGambe, REF[gender].gambe);
  const isFemale = gender === 'F';
  const bfF = bf != null ? 0.88 + (bf / 100) * 0.3 : 1;
  const bW = bmiScale(interpolated.kg, gender);
  const bfBW = bfF * bW;

  const bandChestR = (isFemale ? 50 : 60) * sChest * bfBW * 0.88;
  const bandWaistR = (isFemale ? 36 : 46) * sWaist * bfBW * 0.88;
  const bandHipR = (isFemale ? 56 : 50) * sHips * bfBW * 0.88;
  const bandThighR = (isFemale ? 28 : 26) * sThigh * bfBW * 0.88;
  const bandCalfR = (isFemale ? 15 : 17) * sCalf * bfBW * 0.88;

  // Bicep band position (middle of horizontal arm)
  const sBicep = scale(interpolated.biceps, REF[gender].biceps);
  const shoulderR = (isFemale ? 56 : 66) * sChest * bfBW;
  const bicepArmR = (isFemale ? 13 : 17) * sBicep * bfBW;
  const armBandX = shoulderR + 80 * 0.55 * 0.5; // middle of upper arm
  const armBandY = positions.shoulderY + 4;

  return (
    <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d5">
      {/* Header + Legend */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-black text-sm">Body Shape</h3>
          <button
            onClick={() => setIs3D(v => !v)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
            style={{
              background: is3D ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${is3D ? accentColor : 'rgba(255,255,255,0.08)'}`,
              color: is3D ? accentColor : '#64748b',
            }}
          >
            {is3D ? '3D' : '2D'}
          </button>
        </div>
        {!is3D && (
          <div className="flex items-center gap-2 flex-wrap">
            {firstPath && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
                <span className="text-[8px] text-slate-500 font-bold">First</span>
              </div>
            )}
            {[
              { c: Z.piept, l: 'Piept' }, { c: Z.talie, l: 'Talie' }, { c: Z.fesieri, l: 'Fesieri' },
              { c: Z.biceps, l: 'Biceps' }, { c: Z.coapse, l: 'Coapse' }, { c: Z.gambe, l: 'Gambe' },
            ].map(z => (
              <div key={z.l} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: z.c, opacity: 0.8 }} />
                <span className="text-[7px] text-slate-500 font-bold">{z.l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TIMELINE SLIDER */}
      {entries.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timeline</span>
            <span className="font-mono text-xs font-bold" style={{ color: accentColor }}>
              {fmtDate(entries[snappedIdx]?.date ?? '')}
            </span>
          </div>
          <div className="relative">
            <input type="range" min={0} max={maxIdx} step={0.01} value={sliderVal} onChange={onSlider}
              className="timeline-slider w-full"
              style={{ '--accent': accentColor, '--pct': `${(sliderVal / maxIdx) * 100}%` } as React.CSSProperties} />
            <div className="flex justify-between mt-1 px-0.5">
              {entries.map((e, i) => (
                <button key={i} onClick={() => setSliderVal(i)} className="flex flex-col items-center"
                  style={{ width: entries.length <= 8 ? 'auto' : 0 }}>
                  <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                    background: Math.abs(sliderVal - i) < 0.3 ? accentColor : 'rgba(255,255,255,0.15)',
                    transform: Math.abs(sliderVal - i) < 0.3 ? 'scale(1.5)' : 'scale(1)',
                  }} />
                  <span className="text-[8px] font-mono mt-1 whitespace-nowrap" style={{
                    color: Math.abs(sliderVal - i) < 0.3 ? accentColor : '#475569'
                  }}>
                    {entries.length <= 8 ? fmtDate(e.date) : (i === 0 || i === maxIdx ? fmtDate(e.date) : '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* ═══ BODY VISUALIZATION ═══ */}
        {is3D ? (
          <div className="flex-shrink-0" style={{ width: W, maxWidth: '100%' }}>
            <Suspense fallback={<div className="flex items-center justify-center" style={{ height: 420 }}>
              <span className="text-slate-500 text-sm font-mono animate-pulse">Loading 3D...</span>
            </div>}>
              <Body3D entry={interpolated} gender={gender} />
            </Suspense>
            <div className="text-center mt-1">
              <span className="text-[9px] text-slate-600 font-mono">Drag to rotate · Scroll to zoom</span>
            </div>
          </div>
        ) : (
        <div className="flex-shrink-0" style={{ width: W, maxWidth: '100%' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 460 }}>
            <defs>
              <linearGradient id="leanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="50%" stopColor={accentColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity={fatOpacity} />
                <stop offset="40%" stopColor="#ff4444" stopOpacity={fatOpacity * 0.8} />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity={fatOpacity * 0.3} />
              </linearGradient>
              <radialGradient id="viscGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff3b3b" stopOpacity={vfIntensity} />
                <stop offset="60%" stopColor="#ff6b35" stopOpacity={vfIntensity * 0.4} />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
              </radialGradient>
            </defs>

            {/* Grid lines */}
            {[positions.chestY, positions.waistY, positions.hipY, positions.kneeY].map(y => (
              <line key={y} x1={40} y1={y} x2={W - 40} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            ))}

            {/* First entry ghost */}
            {firstPath && snappedIdx > 0 && (
              <>
                <path d={firstPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} strokeDasharray="6 4" />
                {firstArmR && <path d={firstArmR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} strokeDasharray="6 4" />}
                {firstArmL && <path d={firstArmL} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} strokeDasharray="6 4" />}
              </>
            )}

            {/* FAT LAYERS */}
            {bf != null && (
              <>
                <path d={fatPath} fill="url(#fatGrad)" stroke="rgba(255,100,50,0.15)" strokeWidth={1} strokeLinejoin="round" />
                <path d={fatArmR} fill="url(#fatGrad)" stroke="rgba(255,100,50,0.15)" strokeWidth={1} strokeLinejoin="round" />
                <path d={fatArmL} fill="url(#fatGrad)" stroke="rgba(255,100,50,0.15)" strokeWidth={1} strokeLinejoin="round" />
              </>
            )}

            {/* LEAN LAYERS */}
            <path d={leanPath} fill="url(#leanGrad)" stroke={accentColor} strokeWidth={2} strokeLinejoin="round" />
            <path d={leanArmR} fill="url(#leanGrad)" stroke={accentColor} strokeWidth={2} strokeLinejoin="round" />
            <path d={leanArmL} fill="url(#leanGrad)" stroke={accentColor} strokeWidth={2} strokeLinejoin="round" />

            {/* VISCERAL FAT */}
            {vf != null && vf > 0 && (
              <ellipse cx={CX} cy={(positions.waistY + positions.hipY) / 2}
                rx={vfRx} ry={vfRy} fill="url(#viscGlow)" />
            )}

            {/* ── MEASUREMENT BANDS ── */}
            {/* Piept band */}
            {interpolated.piept != null && (
              <ellipse cx={CX} cy={positions.chestY + 5} rx={bandChestR} ry={5}
                fill="none" stroke={Z.piept} strokeWidth={3} opacity={0.6} />
            )}
            {/* Talie band */}
            {interpolated.talie != null && (
              <ellipse cx={CX} cy={positions.waistY} rx={bandWaistR} ry={4}
                fill="none" stroke={Z.talie} strokeWidth={3} opacity={0.6} />
            )}
            {/* Fesieri band */}
            {interpolated.fesieri != null && (
              <ellipse cx={CX} cy={positions.hipY} rx={bandHipR} ry={5}
                fill="none" stroke={Z.fesieri} strokeWidth={3} opacity={0.6} />
            )}
            {/* Coapse bands (both legs) */}
            <ellipse cx={CX + 18} cy={positions.midThighY} rx={bandThighR * 0.55} ry={4}
              fill="none" stroke={Z.coapse} strokeWidth={2.5} opacity={0.5} />
            <ellipse cx={CX - 18} cy={positions.midThighY} rx={bandThighR * 0.55} ry={4}
              fill="none" stroke={Z.coapse} strokeWidth={2.5} opacity={0.5} />
            {/* Gambe bands */}
            <ellipse cx={CX + 14} cy={positions.midCalfY} rx={bandCalfR * 0.5} ry={3}
              fill="none" stroke={Z.gambe} strokeWidth={2} opacity={0.5} />
            <ellipse cx={CX - 14} cy={positions.midCalfY} rx={bandCalfR * 0.5} ry={3}
              fill="none" stroke={Z.gambe} strokeWidth={2} opacity={0.5} />
            {/* Biceps bands (on horizontal arms) */}
            {interpolated.biceps != null && (
              <>
                <ellipse cx={CX + armBandX} cy={armBandY} rx={3} ry={bicepArmR * 0.7}
                  fill="none" stroke={Z.biceps} strokeWidth={3} opacity={0.6} />
                <ellipse cx={CX - armBandX} cy={armBandY} rx={3} ry={bicepArmR * 0.7}
                  fill="none" stroke={Z.biceps} strokeWidth={3} opacity={0.6} />
              </>
            )}

            {/* ── Measurement Labels ── */}
            {interpolated.piept != null && (
              <text x={CX} y={positions.chestY - 5} fill={Z.piept} fontSize={8}
                fontFamily="JetBrains Mono" fontWeight={700} textAnchor="middle" opacity={0.8}>
                Piept {interpolated.piept.toFixed(1)}cm
              </text>
            )}
            {interpolated.talie != null && (
              <text x={CX} y={positions.waistY - 8} fill={Z.talie} fontSize={8}
                fontFamily="JetBrains Mono" fontWeight={700} textAnchor="middle" opacity={0.8}>
                Talie {interpolated.talie.toFixed(1)}cm
              </text>
            )}
            {interpolated.fesieri != null && (
              <text x={CX} y={positions.hipY - 8} fill={Z.fesieri} fontSize={8}
                fontFamily="JetBrains Mono" fontWeight={700} textAnchor="middle" opacity={0.8}>
                Fesieri {interpolated.fesieri.toFixed(1)}cm
              </text>
            )}
            {interpolated.biceps != null && (
              <>
                <text x={CX + armBandX} y={armBandY - bicepArmR * 0.7 - 4} fill={Z.biceps} fontSize={7}
                  fontFamily="JetBrains Mono" fontWeight={700} textAnchor="middle" opacity={0.8}>
                  {interpolated.biceps.toFixed(1)}cm
                </text>
                <text x={CX - armBandX} y={armBandY - bicepArmR * 0.7 - 4} fill={Z.biceps} fontSize={7}
                  fontFamily="JetBrains Mono" fontWeight={700} textAnchor="middle" opacity={0.8}>
                  {interpolated.biceps.toFixed(1)}cm
                </text>
              </>
            )}

            {/* Height ruler */}
            <line x1={18} y1={22} x2={18} y2={H - 28} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <line x1={14} y1={22} x2={22} y2={22} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <line x1={14} y1={H - 28} x2={22} y2={H - 28} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <text x={18} y={H - 12} fill="#475569" fontSize={9} fontFamily="JetBrains Mono"
              textAnchor="middle" fontWeight={700}>{height}cm</text>

            {/* Bottom stats */}
            <text x={CX} y={H - 8} fill="#475569" fontSize={9} fontFamily="JetBrains Mono"
              textAnchor="middle" fontWeight={600}>
              {interpolated.kg?.toFixed(1) ?? '?'} kg · BMI {interpolated.kg ? (interpolated.kg / ((height / 100) ** 2)).toFixed(1) : '?'}
            </text>
          </svg>
        </div>
        )}

        {/* ═══ SIDE STATS ═══ */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          {/* Body Fat */}
          {bf != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,100,50,0.04)', border: '1px solid rgba(255,100,50,0.08)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#ff6b35' }}>Body Fat</div>
              <div className="flex items-end gap-2">
                <span className="font-mono text-2xl font-black" style={{
                  color: bf < 20 ? 'var(--neon-green)' : bf < 28 ? 'var(--neon-orange)' : 'var(--neon-red)'
                }}>{bf.toFixed(1)}%</span>
                {bfDelta != null && snappedIdx > 0 && (
                  <span className="font-mono text-xs mb-1" style={{
                    color: bfDelta < 0 ? 'var(--neon-green)' : bfDelta > 0 ? 'var(--neon-red)' : '#94a3b8'
                  }}>{bfDelta < 0 ? '↓' : bfDelta > 0 ? '↑' : '='} {Math.abs(bfDelta).toFixed(1)}% vs start</span>
                )}
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{
                  width: `${Math.min(100, (bf / 40) * 100)}%`,
                  background: bf < 20 ? 'var(--neon-green)' : bf < 28 ? 'var(--neon-orange)' : 'var(--neon-red)',
                }} />
              </div>
              {bf != null && interpolated.kg != null && (
                <div className="font-mono text-[10px] text-slate-400 mt-1.5">
                  {((bf / 100) * interpolated.kg).toFixed(1)} kg fat mass
                </div>
              )}
            </div>
          )}

          {/* Visceral Fat */}
          {vf != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,59,59,0.04)', border: '1px solid rgba(255,59,59,0.08)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#ff3b3b' }}>Visceral Fat</div>
              <div className="flex items-end gap-2">
                <span className="font-mono text-xl font-black" style={{
                  color: vf <= 5 ? 'var(--neon-green)' : vf <= 9 ? 'var(--neon-orange)' : 'var(--neon-red)'
                }}>{vf.toFixed(0)}</span>
                <span className="text-[10px] font-bold mb-0.5" style={{
                  color: vf <= 5 ? 'var(--neon-green)' : vf <= 9 ? 'var(--neon-orange)' : 'var(--neon-red)'
                }}>{vf <= 5 ? 'Low' : vf <= 9 ? 'Normal' : vf <= 14 ? 'High' : 'Very High'}</span>
              </div>
              <div className="progress-track mt-1.5">
                <div className="progress-fill" style={{
                  width: `${Math.min(100, (vf / 20) * 100)}%`,
                  background: vf <= 5 ? 'var(--neon-green)' : vf <= 9 ? 'var(--neon-orange)' : 'var(--neon-red)',
                }} />
              </div>
            </div>
          )}

          {/* Weight */}
          {interpolated.kg != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Weight</div>
              <div className="flex items-end gap-2">
                <span className="font-mono text-xl font-black">
                  {interpolated.kg.toFixed(1)} <span className="text-sm text-slate-500">kg</span>
                </span>
                {kgDelta != null && snappedIdx > 0 && (
                  <span className="font-mono text-[10px] mb-0.5" style={{
                    color: kgDelta < 0 ? 'var(--neon-green)' : kgDelta > 0 ? 'var(--neon-red)' : '#94a3b8'
                  }}>{kgDelta > 0 ? '+' : ''}{kgDelta.toFixed(1)}kg</span>
                )}
              </div>
              {bf != null && (
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px] font-mono" style={{ color: '#ff6b35' }}>
                    Fat: {((bf / 100) * interpolated.kg).toFixed(1)}kg
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: accentColor }}>
                    Lean: {(interpolated.kg - (bf / 100) * interpolated.kg).toFixed(1)}kg
                  </span>
                </div>
              )}
            </div>
          )}

          {/* BMI */}
          {interpolated.kg != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">BMI</div>
              {(() => {
                const bmi = interpolated.kg! / ((height / 100) ** 2);
                const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
                const col = bmi < 18.5 ? '#3b82f6' : bmi < 25 ? 'var(--neon-green)' : bmi < 30 ? 'var(--neon-orange)' : 'var(--neon-red)';
                return (
                  <div className="flex items-end gap-2">
                    <span className="font-mono text-xl font-black" style={{ color: col }}>{bmi.toFixed(1)}</span>
                    <span className="text-[10px] font-bold mb-1" style={{ color: col }}>{cat}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Lower body estimates */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Lower Body (Est.)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: Z.coapse, opacity: 0.7 }} />
                <span className="font-mono text-sm font-black text-slate-300">~{estCoapse.toFixed(0)}</span>
                <span className="text-[10px] text-slate-500 ml-1">cm coapse</span>
              </div>
              <div>
                <div className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: Z.gambe, opacity: 0.7 }} />
                <span className="font-mono text-sm font-black text-slate-300">~{estGambe.toFixed(0)}</span>
                <span className="text-[10px] text-slate-500 ml-1">cm gambe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
