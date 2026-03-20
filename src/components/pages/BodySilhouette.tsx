import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Entry } from '../../lib/shape';

const Body3D = lazy(() => import('./Body3D'));

const AVG_HEIGHT = { M: 175, F: 162 };
const W = 340, H = 540, CX = W / 2;

interface Props { entries: Entry[]; gender: 'M' | 'F'; }

const REF = {
  M: { piept: 98, talie: 84, fesieri: 100, biceps: 32, spate: 104, coapse: 57, gambe: 38 },
  F: { piept: 90, talie: 72, fesieri: 98, biceps: 27, spate: 84, coapse: 54, gambe: 36 },
};

// ── Helpers ──────────────────────────────────────────

function scale(val: number | null, ref: number): number {
  if (val == null) return 1;
  return 0.75 + (val / ref) * 0.25;
}

/** BMI-based global width multiplier — makes heavy people visually wider */
function bmiScale(kg: number | null, gender: 'M' | 'F'): number {
  if (kg == null) return 1;
  const h = AVG_HEIGHT[gender] / 100;
  const bmi = kg / (h * h);
  // baseline 23 => 1.0, scales up/down from there
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
    if (entry.bodyFat != null) {
      est *= Math.max(0.9, Math.min(1.15, 1 + (entry.bodyFat - (gender === 'F' ? 25 : 18)) * 0.004));
    }
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
    if (entry.bodyFat != null) {
      return est * Math.max(0.92, Math.min(1.12, 1 + (entry.bodyFat - (gender === 'F' ? 25 : 18)) * 0.003));
    }
    return est;
  }
  if (entry.fesieri != null) return entry.fesieri * 0.37;
  return ref.gambe;
}

// ── SVG Path Builder (accepts bfFactor override for lean/fat layers) ──

function buildBody(entry: Entry, gender: 'M' | 'F', bfOverride?: number): string {
  const ref = REF[gender];
  const isFemale = gender === 'F';
  const height = AVG_HEIGHT[gender];

  const sChest = scale(entry.piept, ref.piept);
  const sWaist = scale(entry.talie, ref.talie);
  const sHips = scale(entry.fesieri, ref.fesieri);
  const sBicep = scale(entry.biceps, ref.biceps);
  const sThigh = scale(estimateCoapse(entry, gender), ref.coapse);
  const sCalf = scale(estimateGambe(entry, gender), ref.gambe);

  // bfFactor: body fat adds puffiness; bmiW: overall mass adds width
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

  // Widths — note bf (combined bfFactor × bmiW) makes body wider for heavier people
  const headR = 22, neckR = isFemale ? 12 : 14;
  const shoulderR = (isFemale ? 56 : 66) * sChest * bf;
  const chestR = (isFemale ? 50 : 60) * sChest * bf;
  const waistR = (isFemale ? 36 : 46) * sWaist * bf;
  const hipR = (isFemale ? 56 : 50) * sHips * bf;
  const thighR = (isFemale ? 28 : 26) * sThigh * bf;
  const kneeR = (isFemale ? 14 : 15) * sCalf * bf * 0.95;
  const calfR = (isFemale ? 15 : 17) * sCalf * bf;
  const ankleR = 9;
  const armR = (isFemale ? 13 : 17) * sBicep * bf;
  const forearmR = (isFemale ? 10 : 13) * sBicep * bf * 0.85;
  const wristR = 7;

  const armElbowY = waistY + 8;
  const armWristY = hipY + 28;
  const legGap = 4;

  // Arm outer edge X at shoulder
  const armOutX = shoulderR + armR * 0.6;

  // ── HEAD (elliptical arc) ──
  let p = `M ${CX} ${headTop}`;
  // Right side of head
  p += ` C ${CX + headR * 1.15} ${headTop - 2}, ${CX + headR * 1.15} ${headBot + 2}, ${CX + neckR + 2} ${headBot}`;
  // Neck — gentle taper to shoulder
  p += ` C ${CX + neckR + 1} ${neckBot - 4}, ${CX + neckR + 4} ${neckBot}, ${CX + shoulderR * 0.35} ${shoulderY - 3}`;
  // Shoulder curve (trapezius slope)
  p += ` C ${CX + shoulderR * 0.6} ${shoulderY - 1}, ${CX + shoulderR * 0.85} ${shoulderY}, ${CX + shoulderR} ${shoulderY + 2}`;

  // ── RIGHT ARM (outer edge down, hand, inner edge up) ──
  // Deltoid → bicep → elbow
  p += ` C ${CX + armOutX} ${shoulderY + 6}, ${CX + armOutX + 2} ${shoulderY + 20}, ${CX + armOutX + 1} ${(shoulderY + armElbowY) / 2}`;
  // Elbow outer
  p += ` C ${CX + armOutX} ${armElbowY - 12}, ${CX + shoulderR * 0.55 + forearmR + 2} ${armElbowY + 5}, ${CX + shoulderR * 0.55 + forearmR} ${(armElbowY + armWristY) / 2}`;
  // Forearm → wrist
  p += ` C ${CX + shoulderR * 0.52 + forearmR - 1} ${armWristY - 15}, ${CX + shoulderR * 0.5 + wristR + 4} ${armWristY - 5}, ${CX + shoulderR * 0.5 + wristR + 2} ${armWristY}`;
  // Hand (small rounded end)
  p += ` C ${CX + shoulderR * 0.5 + wristR + 3} ${armWristY + 8}, ${CX + shoulderR * 0.5 - wristR - 1} ${armWristY + 8}, ${CX + shoulderR * 0.5 - wristR} ${armWristY}`;
  // Inner arm back up: wrist → elbow
  p += ` C ${CX + shoulderR * 0.5 - wristR + 1} ${armWristY - 8}, ${CX + shoulderR * 0.52 - forearmR + 6} ${(armElbowY + armWristY) / 2 + 5}, ${CX + shoulderR * 0.55 - forearmR * 0.3 + 2} ${armElbowY + 4}`;
  // Inner arm: elbow → armpit → chest
  p += ` C ${CX + shoulderR * 0.55 - forearmR * 0.2} ${armElbowY - 10}, ${CX + chestR + 4} ${chestY + 12}, ${CX + chestR} ${chestY}`;

  // ── RIGHT TORSO (chest → waist → hip) — all smooth cubics ──
  if (isFemale) {
    // Chest narrows in, slight breast curve
    p += ` C ${CX + chestR + 3} ${chestY + 12}, ${CX + waistR + 2} ${waistY - 25}, ${CX + waistR} ${waistY}`;
    // Waist flares to hips (hourglass)
    p += ` C ${CX + waistR - 1} ${waistY + 14}, ${CX + hipR + 5} ${hipY - 18}, ${CX + hipR} ${hipY}`;
  } else {
    // Male: V-taper, wider chest narrowing to waist
    p += ` C ${CX + chestR - 1} ${chestY + 14}, ${CX + waistR + 6} ${waistY - 18}, ${CX + waistR} ${waistY}`;
    // Waist to hips (slight flare or straight)
    p += ` C ${CX + waistR + 1} ${waistY + 10}, ${CX + hipR + 2} ${hipY - 12}, ${CX + hipR} ${hipY}`;
  }

  // ── HIP → CROTCH → INNER THIGH (smooth transition, no straight lines) ──
  p += ` C ${CX + hipR - 2} ${hipY + 8}, ${CX + thighR + 8} ${crotchY - 8}, ${CX + thighR + 4} ${crotchY}`;
  // Smooth into thigh top
  p += ` C ${CX + thighR + 3} ${thighTopY - 2}, ${CX + thighR + 2} ${thighTopY + 8}, ${CX + thighR} ${midThighY}`;

  // ── RIGHT LEG (thigh → knee → calf → ankle → foot) ──
  p += ` C ${CX + thighR - 1} ${midThighY + 18}, ${CX + kneeR + 3} ${kneeY - 12}, ${CX + kneeR} ${kneeY}`;
  p += ` C ${CX + kneeR + 1} ${kneeY + 8}, ${CX + calfR + 2} ${midCalfY - 8}, ${CX + calfR} ${midCalfY}`;
  p += ` C ${CX + calfR - 1} ${midCalfY + 16}, ${CX + ankleR + 2} ${ankleY - 16}, ${CX + ankleR} ${ankleY}`;
  // Right foot
  p += ` C ${CX + ankleR + 1} ${ankleY + 4}, ${CX + ankleR + 6} ${footY - 2}, ${CX + ankleR + 5} ${footY}`;
  p += ` L ${CX + legGap} ${footY}`;
  // Inner ankle
  p += ` C ${CX + legGap} ${footY - 3}, ${CX + legGap} ${ankleY + 2}, ${CX + legGap} ${ankleY}`;

  // ── LEFT FOOT (mirror) ──
  p += ` C ${CX - legGap} ${ankleY + 2}, ${CX - legGap} ${footY - 3}, ${CX - legGap} ${footY}`;
  p += ` L ${CX - ankleR - 5} ${footY}`;
  p += ` C ${CX - ankleR - 6} ${footY - 2}, ${CX - ankleR - 1} ${ankleY + 4}, ${CX - ankleR} ${ankleY}`;

  // ── LEFT LEG (up from ankle) ──
  p += ` C ${CX - ankleR - 2} ${ankleY - 16}, ${CX - calfR + 1} ${midCalfY + 16}, ${CX - calfR} ${midCalfY}`;
  p += ` C ${CX - calfR - 2} ${midCalfY - 8}, ${CX - kneeR - 1} ${kneeY + 8}, ${CX - kneeR} ${kneeY}`;
  p += ` C ${CX - kneeR - 3} ${kneeY - 12}, ${CX - thighR + 1} ${midThighY + 18}, ${CX - thighR} ${midThighY}`;
  p += ` C ${CX - thighR - 2} ${thighTopY + 8}, ${CX - thighR - 3} ${thighTopY - 2}, ${CX - thighR - 4} ${crotchY}`;

  // ── LEFT HIP → TORSO (up) ──
  p += ` C ${CX - thighR - 8} ${crotchY - 8}, ${CX - hipR + 2} ${hipY + 8}, ${CX - hipR} ${hipY}`;

  if (isFemale) {
    p += ` C ${CX - hipR - 5} ${hipY - 18}, ${CX - waistR + 1} ${waistY + 14}, ${CX - waistR} ${waistY}`;
    p += ` C ${CX - waistR - 2} ${waistY - 25}, ${CX - chestR - 3} ${chestY + 12}, ${CX - chestR} ${chestY}`;
  } else {
    p += ` C ${CX - hipR - 2} ${hipY - 12}, ${CX - waistR - 1} ${waistY + 10}, ${CX - waistR} ${waistY}`;
    p += ` C ${CX - waistR - 6} ${waistY - 18}, ${CX - chestR + 1} ${chestY + 14}, ${CX - chestR} ${chestY}`;
  }

  // ── LEFT ARM ──
  p += ` C ${CX - chestR - 4} ${chestY + 12}, ${CX - shoulderR * 0.55 + forearmR * 0.2} ${armElbowY - 10}, ${CX - shoulderR * 0.55 + forearmR * 0.3 - 2} ${armElbowY + 4}`;
  p += ` C ${CX - shoulderR * 0.52 + forearmR - 6} ${(armElbowY + armWristY) / 2 + 5}, ${CX - shoulderR * 0.5 + wristR - 1} ${armWristY - 8}, ${CX - shoulderR * 0.5 + wristR} ${armWristY}`;
  // Left hand
  p += ` C ${CX - shoulderR * 0.5 + wristR + 1} ${armWristY + 8}, ${CX - shoulderR * 0.5 - wristR - 3} ${armWristY + 8}, ${CX - shoulderR * 0.5 - wristR - 2} ${armWristY}`;
  // Outer left arm up
  p += ` C ${CX - shoulderR * 0.5 - wristR - 4} ${armWristY - 5}, ${CX - shoulderR * 0.52 - forearmR + 1} ${armWristY - 15}, ${CX - shoulderR * 0.55 - forearmR} ${(armElbowY + armWristY) / 2}`;
  p += ` C ${CX - shoulderR * 0.55 - forearmR - 2} ${armElbowY + 5}, ${CX - armOutX} ${armElbowY - 12}, ${CX - armOutX - 1} ${(shoulderY + armElbowY) / 2}`;
  p += ` C ${CX - armOutX - 2} ${shoulderY + 20}, ${CX - armOutX} ${shoulderY + 6}, ${CX - shoulderR} ${shoulderY + 2}`;

  // ── LEFT SHOULDER → NECK → HEAD ──
  p += ` C ${CX - shoulderR * 0.85} ${shoulderY}, ${CX - shoulderR * 0.6} ${shoulderY - 1}, ${CX - shoulderR * 0.35} ${shoulderY - 3}`;
  p += ` C ${CX - neckR - 4} ${neckBot}, ${CX - neckR - 1} ${neckBot - 4}, ${CX - neckR - 2} ${headBot}`;
  // Left side of head
  p += ` C ${CX - headR * 1.15} ${headBot + 2}, ${CX - headR * 1.15} ${headTop - 2}, ${CX} ${headTop}`;
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

// ── Component ────────────────────────────────────────

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

  // Fat layer = full body with BF puffiness
  const fatPath = useMemo(() => buildBody(interpolated, gender), [interpolated, gender]);
  // Lean layer = body without BF puffiness (bfFactor = 0.88 baseline "lean")
  const leanPath = useMemo(() => buildBody(interpolated, gender, 0.88), [interpolated, gender]);
  // First entry ghost
  const firstPath = useMemo(() => entries.length > 1 ? buildBody(firstEntry, gender) : null, [firstEntry, gender, entries.length]);
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

  // ── Heatmap zone deltas (vs first entry) ──
  const heatZones = useMemo(() => {
    if (snappedIdx === 0) return [];
    const zones: { cx: number; cy: number; rx: number; ry: number; delta: number; label: string; lowerBetter: boolean }[] = [];
    const cur = interpolated, fst = firstEntry;

    if (cur.piept != null && fst.piept != null)
      zones.push({ cx: CX, cy: positions.chestY + 10, rx: 55, ry: 22, delta: cur.piept - fst.piept, label: 'Piept', lowerBetter: false });
    if (cur.talie != null && fst.talie != null)
      zones.push({ cx: CX, cy: positions.waistY, rx: 42, ry: 18, delta: cur.talie - fst.talie, label: 'Talie', lowerBetter: true });
    if (cur.fesieri != null && fst.fesieri != null)
      zones.push({ cx: CX, cy: positions.hipY, rx: 50, ry: 20, delta: cur.fesieri - fst.fesieri, label: 'Fesieri', lowerBetter: true });
    if (cur.biceps != null && fst.biceps != null) {
      zones.push({ cx: CX + 68, cy: positions.shoulderY + 45, rx: 16, ry: 25, delta: cur.biceps - fst.biceps, label: 'Biceps R', lowerBetter: false });
      zones.push({ cx: CX - 68, cy: positions.shoulderY + 45, rx: 16, ry: 25, delta: cur.biceps - fst.biceps, label: 'Biceps L', lowerBetter: false });
    }
    return zones;
  }, [interpolated, firstEntry, snappedIdx, positions]);

  // Fat layer opacity scales with body fat (more fat = more visible orange)
  const fatOpacity = bf != null ? Math.min(0.35, Math.max(0.05, (bf / 100) * 0.8)) : 0.1;
  // Visceral fat glow intensity
  const vfIntensity = vf != null ? Math.min(0.6, Math.max(0, (vf / 15) * 0.6)) : 0;
  // Visceral fat ellipse dimensions (grows with level)
  const vfRx = vf != null ? 20 + vf * 2.5 : 0;
  const vfRy = vf != null ? 25 + vf * 3 : 0;

  return (
    <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d5">
      {/* Header + Legend */}
      <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center gap-3">
          {firstPath && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[9px] text-slate-500 font-bold">First</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: `rgba(255,100,50,${fatOpacity + 0.1})` }} />
            <span className="text-[9px] text-slate-500 font-bold">Fat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: accentColor, opacity: 0.5 }} />
            <span className="text-[9px] text-slate-500 font-bold">Lean</span>
          </div>
          {vf != null && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ff6b35', opacity: 0.5 }} />
              <span className="text-[9px] text-slate-500 font-bold">Visceral</span>
            </div>
          )}
          {heatZones.length > 0 && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#00ff88', opacity: 0.7 }} />
                <span className="text-[8px] text-slate-600 font-bold">-cm</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#ff3b3b', opacity: 0.7 }} />
                <span className="text-[8px] text-slate-600 font-bold">+cm</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── TIMELINE SLIDER ── */}
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
              {/* Lean body gradient */}
              <linearGradient id="leanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="50%" stopColor={accentColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.06} />
              </linearGradient>
              {/* Fat layer gradient */}
              <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity={fatOpacity} />
                <stop offset="40%" stopColor="#ff4444" stopOpacity={fatOpacity * 0.8} />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity={fatOpacity * 0.3} />
              </linearGradient>
              {/* Visceral fat radial glow */}
              <radialGradient id="viscGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff3b3b" stopOpacity={vfIntensity} />
                <stop offset="60%" stopColor="#ff6b35" stopOpacity={vfIntensity * 0.4} />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
              </radialGradient>
              {/* Heatmap zone glows */}
              {heatZones.map((z, i) => {
                const good = z.lowerBetter ? z.delta < 0 : z.delta > 0;
                const col = good ? '#00ff88' : '#ff3b3b';
                const intensity = Math.min(0.45, Math.abs(z.delta) * 0.08);
                return (
                  <radialGradient key={`hg${i}`} id={`heatZone${i}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={col} stopOpacity={intensity} />
                    <stop offset="70%" stopColor={col} stopOpacity={intensity * 0.3} />
                    <stop offset="100%" stopColor={col} stopOpacity={0} />
                  </radialGradient>
                );
              })}
            </defs>

            {/* Subtle grid */}
            {[positions.chestY, positions.waistY, positions.hipY, positions.kneeY].map(y => (
              <line key={y} x1={40} y1={y} x2={W - 40} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            ))}

            {/* First entry ghost (dashed) */}
            {firstPath && snappedIdx > 0 && (
              <path d={firstPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} strokeDasharray="6 4" />
            )}

            {/* ── FAT LAYER (outer) ── */}
            {bf != null && (
              <path d={fatPath} fill="url(#fatGrad)" stroke="rgba(255,100,50,0.15)" strokeWidth={1} strokeLinejoin="round" />
            )}

            {/* ── LEAN LAYER (inner) ── */}
            <path d={leanPath} fill="url(#leanGrad)" stroke={accentColor} strokeWidth={2} strokeLinejoin="round" />

            {/* ── VISCERAL FAT GLOW (belly zone) ── */}
            {vf != null && vf > 0 && (
              <ellipse cx={CX} cy={(positions.waistY + positions.hipY) / 2}
                rx={vfRx} ry={vfRy} fill="url(#viscGlow)" />
            )}

            {/* ── HEATMAP ZONES (delta vs first) ── */}
            {heatZones.map((z, i) => (
              <ellipse key={`hz${i}`} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                fill={`url(#heatZone${i})`} />
            ))}

            {/* ── Measurement Labels (right) ── */}
            {interpolated.piept != null && (() => {
              const d = firstEntry.piept != null && snappedIdx > 0 ? interpolated.piept! - firstEntry.piept! : null;
              const dCol = d != null && d !== 0 ? (d < 0 ? '#ff3b3b' : '#00ff88') : null;
              return (
                <>
                  <line x1={CX + 65} y1={positions.chestY} x2={W - 30} y2={positions.chestY}
                    stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <text x={W - 28} y={positions.chestY + 3} fill="#94a3b8" fontSize={9}
                    fontFamily="JetBrains Mono" fontWeight={600}>Piept {interpolated.piept!.toFixed(1)}cm</text>
                  {d != null && d !== 0 && (
                    <text x={W - 28} y={positions.chestY + 14} fill={dCol!} fontSize={8}
                      fontFamily="JetBrains Mono" fontWeight={700}>{d > 0 ? '+' : ''}{d.toFixed(1)}</text>
                  )}
                </>
              );
            })()}
            {interpolated.talie != null && (() => {
              const d = firstEntry.talie != null && snappedIdx > 0 ? interpolated.talie! - firstEntry.talie! : null;
              const dCol = d != null && d !== 0 ? (d < 0 ? '#00ff88' : '#ff3b3b') : null;
              return (
                <>
                  <line x1={CX + 50} y1={positions.waistY} x2={W - 30} y2={positions.waistY}
                    stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <text x={W - 28} y={positions.waistY + 3} fill="#94a3b8" fontSize={9}
                    fontFamily="JetBrains Mono" fontWeight={600}>Talie {interpolated.talie!.toFixed(1)}cm</text>
                  {d != null && d !== 0 && (
                    <text x={W - 28} y={positions.waistY + 14} fill={dCol!} fontSize={8}
                      fontFamily="JetBrains Mono" fontWeight={700}>{d > 0 ? '+' : ''}{d.toFixed(1)}</text>
                  )}
                </>
              );
            })()}
            {interpolated.fesieri != null && (() => {
              const d = firstEntry.fesieri != null && snappedIdx > 0 ? interpolated.fesieri! - firstEntry.fesieri! : null;
              const dCol = d != null && d !== 0 ? (d < 0 ? '#00ff88' : '#ff3b3b') : null;
              return (
                <>
                  <line x1={CX + 58} y1={positions.hipY} x2={W - 30} y2={positions.hipY}
                    stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <text x={W - 28} y={positions.hipY + 3} fill="#94a3b8" fontSize={9}
                    fontFamily="JetBrains Mono" fontWeight={600}>Fesieri {interpolated.fesieri!.toFixed(1)}cm</text>
                  {d != null && d !== 0 && (
                    <text x={W - 28} y={positions.hipY + 14} fill={dCol!} fontSize={8}
                      fontFamily="JetBrains Mono" fontWeight={700}>{d > 0 ? '+' : ''}{d.toFixed(1)}</text>
                  )}
                </>
              );
            })()}

            {/* Lower body estimated labels */}
            <line x1={CX + 35} y1={positions.midThighY} x2={W - 30} y2={positions.midThighY}
              stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 3" />
            <text x={W - 28} y={positions.midThighY + 3} fill="#64748b" fontSize={8}
              fontFamily="JetBrains Mono" fontWeight={600}>Coapse ~{estCoapse.toFixed(0)}cm</text>

            <line x1={CX + 20} y1={positions.midCalfY} x2={W - 30} y2={positions.midCalfY}
              stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} strokeDasharray="3 3" />
            <text x={W - 28} y={positions.midCalfY + 3} fill="#64748b" fontSize={8}
              fontFamily="JetBrains Mono" fontWeight={600}>Gambe ~{estGambe.toFixed(0)}cm</text>

            {/* Left: biceps */}
            {interpolated.biceps != null && (() => {
              const d = firstEntry.biceps != null && snappedIdx > 0 ? interpolated.biceps! - firstEntry.biceps! : null;
              const dCol = d != null && d !== 0 ? (d > 0 ? '#00ff88' : '#ff3b3b') : null;
              return (
                <>
                  <line x1={30} y1={positions.shoulderY + 40} x2={CX - 72} y2={positions.shoulderY + 40}
                    stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                  <text x={8} y={positions.shoulderY + 43} fill="#94a3b8" fontSize={9}
                    fontFamily="JetBrains Mono" fontWeight={600}>Biceps {interpolated.biceps!.toFixed(1)}cm</text>
                  {d != null && d !== 0 && (
                    <text x={8} y={positions.shoulderY + 54} fill={dCol!} fontSize={8}
                      fontFamily="JetBrains Mono" fontWeight={700}>{d > 0 ? '+' : ''}{d.toFixed(1)}</text>
                  )}
                </>
              );
            })()}

            {/* Height ruler */}
            <line x1={18} y1={22} x2={18} y2={H - 28} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <line x1={14} y1={22} x2={22} y2={22} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <line x1={14} y1={H - 28} x2={22} y2={H - 28} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
            <text x={18} y={H - 12} fill="#475569" fontSize={9} fontFamily="JetBrains Mono"
              textAnchor="middle" fontWeight={700}>{height}cm</text>

            {/* Bottom */}
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
                <span className="font-mono text-sm font-black text-slate-300">~{estCoapse.toFixed(0)}</span>
                <span className="text-[10px] text-slate-500 ml-1">cm coapse</span>
              </div>
              <div>
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
