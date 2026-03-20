import { useMemo } from 'react';
import { Entry } from '../../lib/shape';

// Average heights Romania
const AVG_HEIGHT = { M: 174, F: 162 };

// SVG canvas
const W = 300;
const H = 500;
const CX = W / 2; // center x

interface Props {
  current: Entry;
  previous: Entry | null;
  gender: 'M' | 'F';
}

// Reference values (cm) for "average" Romanian body
const REF = {
  M: { piept: 98, talie: 84, fesieri: 100, biceps: 32, spate: 104 },
  F: { piept: 90, talie: 72, fesieri: 98, biceps: 27, spate: 84 },
};

// Map a measurement to a width scale factor
function scale(val: number | null, ref: number): number {
  if (val == null) return 1;
  return 0.7 + (val / ref) * 0.3; // 0.7 at 0cm, 1.0 at ref, >1.0 above ref
}

// Generate body silhouette path points
function buildBody(entry: Entry, gender: 'M' | 'F'): string {
  const ref = REF[gender];
  const isFemale = gender === 'F';

  // Scale factors from measurements
  const sChest = scale(entry.piept, ref.piept);
  const sWaist = scale(entry.talie, ref.talie);
  const sHips = scale(entry.fesieri, ref.fesieri);
  const sBicep = scale(entry.biceps, ref.biceps);

  // Body fat affects overall "puffiness"
  const bfFactor = entry.bodyFat != null ? 0.85 + (entry.bodyFat / 100) * 0.35 : 1;

  // Key widths (half-widths from center)
  const headW = 22;
  const neckW = 14;
  const shoulderW = (isFemale ? 58 : 68) * sChest * bfFactor;
  const chestW = (isFemale ? 52 : 62) * sChest * bfFactor;
  const waistW = (isFemale ? 38 : 48) * sWaist * bfFactor;
  const hipW = (isFemale ? 58 : 52) * sHips * bfFactor;
  const thighW = (isFemale ? 32 : 30) * sHips * bfFactor * 0.9;
  const kneeW = 16 * bfFactor;
  const ankleW = 10;
  const bicepW = (isFemale ? 14 : 18) * sBicep * bfFactor;
  const wristW = 8;

  // Y positions (top to bottom)
  const headTop = 20;
  const headBot = headTop + 44;
  const neckBot = headBot + 16;
  const shoulderY = neckBot + 8;
  const chestY = shoulderY + 40;
  const waistY = chestY + (isFemale ? 50 : 45);
  const hipY = waistY + (isFemale ? 40 : 30);
  const crotchY = hipY + 20;
  const thighY = crotchY + 10;
  const kneeY = thighY + 80;
  const ankleY = kneeY + 80;
  const footY = ankleY + 15;

  // Arm positions
  const armStartY = shoulderY;
  const armElbowY = waistY + 10;
  const armWristY = hipY + 30;

  // Build right side path (will mirror for left)
  // Body outline: head → neck → shoulder → arm gap → chest → waist → hip → leg → foot
  // Then up the left side

  const path = `
    M ${CX} ${headTop}
    C ${CX + headW} ${headTop}, ${CX + headW} ${headBot}, ${CX + neckW} ${headBot}
    L ${CX + neckW} ${neckBot}
    L ${CX + shoulderW} ${shoulderY}
    L ${CX + shoulderW + bicepW} ${armStartY + 5}
    C ${CX + shoulderW + bicepW + 2} ${armElbowY}, ${CX + shoulderW * 0.7 + bicepW} ${armElbowY}, ${CX + shoulderW * 0.6 + wristW + 4} ${armWristY}
    L ${CX + shoulderW * 0.6 + wristW} ${armWristY + 5}
    L ${CX + shoulderW * 0.6} ${armWristY}
    C ${CX + shoulderW * 0.6} ${armElbowY - 10}, ${CX + shoulderW - bicepW + 4} ${armElbowY - 20}, ${CX + chestW} ${chestY}
    ${isFemale ?
      `C ${CX + chestW + 4} ${chestY + 15}, ${CX + waistW - 4} ${waistY - 20}, ${CX + waistW} ${waistY}` :
      `C ${CX + chestW} ${chestY + 10}, ${CX + waistW + 4} ${waistY - 10}, ${CX + waistW} ${waistY}`
    }
    ${isFemale ?
      `C ${CX + waistW} ${waistY + 10}, ${CX + hipW + 4} ${hipY - 15}, ${CX + hipW} ${hipY}` :
      `C ${CX + waistW + 2} ${waistY + 8}, ${CX + hipW} ${hipY - 8}, ${CX + hipW} ${hipY}`
    }
    L ${CX + thighW + 6} ${crotchY}
    L ${CX + thighW} ${thighY}
    C ${CX + thighW} ${kneeY - 30}, ${CX + kneeW + 4} ${kneeY - 10}, ${CX + kneeW} ${kneeY}
    C ${CX + kneeW} ${kneeY + 20}, ${CX + ankleW + 2} ${ankleY - 20}, ${CX + ankleW} ${ankleY}
    L ${CX + ankleW + 6} ${footY}
    L ${CX + 3} ${footY}
    L ${CX + 3} ${ankleY}

    L ${CX - 3} ${ankleY}
    L ${CX - 3} ${footY}
    L ${CX - ankleW - 6} ${footY}
    L ${CX - ankleW} ${ankleY}
    C ${CX - ankleW - 2} ${ankleY - 20}, ${CX - kneeW} ${kneeY + 20}, ${CX - kneeW} ${kneeY}
    C ${CX - kneeW - 4} ${kneeY - 10}, ${CX - thighW} ${kneeY - 30}, ${CX - thighW} ${thighY}
    L ${CX - thighW - 6} ${crotchY}
    L ${CX - hipW} ${hipY}
    ${isFemale ?
      `C ${CX - hipW - 4} ${hipY - 15}, ${CX - waistW} ${waistY + 10}, ${CX - waistW} ${waistY}` :
      `C ${CX - hipW} ${hipY - 8}, ${CX - waistW - 2} ${waistY + 8}, ${CX - waistW} ${waistY}`
    }
    ${isFemale ?
      `C ${CX - waistW + 4} ${waistY - 20}, ${CX - chestW - 4} ${chestY + 15}, ${CX - chestW} ${chestY}` :
      `C ${CX - waistW - 4} ${waistY - 10}, ${CX - chestW} ${chestY + 10}, ${CX - chestW} ${chestY}`
    }
    C ${CX - shoulderW + bicepW - 4} ${armElbowY - 20}, ${CX - shoulderW * 0.6} ${armElbowY - 10}, ${CX - shoulderW * 0.6} ${armWristY}
    L ${CX - shoulderW * 0.6 - wristW} ${armWristY + 5}
    L ${CX - shoulderW * 0.6 - wristW - 4} ${armWristY}
    C ${CX - shoulderW * 0.7 - bicepW} ${armElbowY}, ${CX - shoulderW - bicepW - 2} ${armElbowY}, ${CX - shoulderW - bicepW} ${armStartY + 5}
    L ${CX - shoulderW} ${shoulderY}
    L ${CX - neckW} ${neckBot}
    L ${CX - neckW} ${headBot}
    C ${CX - headW} ${headBot}, ${CX - headW} ${headTop}, ${CX} ${headTop}
    Z
  `;

  return path;
}

export default function BodySilhouette({ current, previous, gender }: Props) {
  const currentPath = useMemo(() => buildBody(current, gender), [current, gender]);
  const previousPath = useMemo(() => previous ? buildBody(previous, gender) : null, [previous, gender]);

  const height = AVG_HEIGHT[gender];
  const bf = current.bodyFat;
  const prevBf = previous?.bodyFat;

  return (
    <div className="glass rounded-[var(--r-lg)] p-5 anim-fade d5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-sm">🧍 Body Shape</h3>
        <div className="flex items-center gap-3">
          {previousPath && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[9px] text-slate-500 font-bold">Previous</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t-2" style={{ borderColor: gender === 'F' ? '#ec4899' : '#3b82f6' }} />
            <span className="text-[9px] text-slate-500 font-bold">Current</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* SVG */}
        <div className="flex-shrink-0" style={{ width: W, maxWidth: '100%' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 420 }}>
            {/* Grid lines for reference */}
            {[100, 160, 220, 300, 380].map(y => (
              <line key={y} x1={40} y1={y} x2={W - 40} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            ))}

            {/* Previous silhouette (dashed) */}
            {previousPath && (
              <path d={previousPath} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5}
                strokeDasharray="6 4" />
            )}

            {/* Current silhouette */}
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0.25} />
                <stop offset="100%" stopColor={gender === 'F' ? '#ec4899' : '#3b82f6'} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <path d={currentPath} fill="url(#bodyGrad)"
              stroke={gender === 'F' ? '#ec4899' : '#3b82f6'} strokeWidth={2} />

            {/* Labels */}
            {current.piept != null && (
              <>
                <line x1={CX + 60} y1={155} x2={W - 30} y2={155} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                <text x={W - 28} y={158} fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" fontWeight={600}>
                  Piept {current.piept}cm
                </text>
              </>
            )}
            {current.talie != null && (
              <>
                <line x1={CX + 45} y1={220} x2={W - 30} y2={220} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                <text x={W - 28} y={223} fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" fontWeight={600}>
                  Talie {current.talie}cm
                </text>
              </>
            )}
            {current.fesieri != null && (
              <>
                <line x1={CX + 55} y1={268} x2={W - 30} y2={268} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                <text x={W - 28} y={271} fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" fontWeight={600}>
                  Fesieri {current.fesieri}cm
                </text>
              </>
            )}
            {current.biceps != null && (
              <>
                <line x1={30} y1={180} x2={CX - 70} y2={180} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
                <text x={8} y={183} fill="#94a3b8" fontSize={9} fontFamily="JetBrains Mono" fontWeight={600}>
                  Biceps {current.biceps}cm
                </text>
              </>
            )}

            {/* Height indicator */}
            <text x={CX} y={H - 10} fill="#475569" fontSize={9} fontFamily="JetBrains Mono" textAnchor="middle" fontWeight={600}>
              Est. {height}cm · {current.kg?.toFixed(1) ?? '?'} kg
            </text>
          </svg>
        </div>

        {/* Side stats */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          {bf != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Body Fat Impact</div>
              <div className="flex items-end gap-2">
                <span className="font-mono text-2xl font-black" style={{ color: bf < 20 ? 'var(--neon-green)' : bf < 28 ? 'var(--neon-orange)' : 'var(--neon-red)' }}>
                  {bf.toFixed(1)}%
                </span>
                {prevBf != null && (
                  <span className="font-mono text-xs mb-1" style={{ color: bf < prevBf ? 'var(--neon-green)' : bf > prevBf ? 'var(--neon-red)' : '#94a3b8' }}>
                    {bf < prevBf ? '↓' : bf > prevBf ? '↑' : '='} {Math.abs(bf - prevBf).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{
                  width: `${Math.min(100, (bf / 40) * 100)}%`,
                  background: bf < 20 ? 'var(--neon-green)' : bf < 28 ? 'var(--neon-orange)' : 'var(--neon-red)',
                }} />
              </div>
            </div>
          )}

          {current.kg != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Weight</div>
              <div className="font-mono text-xl font-black">{current.kg.toFixed(1)} <span className="text-sm text-slate-500">kg</span></div>
              {current.kg && bf != null && (
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px] font-mono text-slate-400">Fat: {((bf / 100) * current.kg).toFixed(1)} kg</span>
                  <span className="text-[10px] font-mono text-slate-400">Lean: {(current.kg - (bf / 100) * current.kg).toFixed(1)} kg</span>
                </div>
              )}
            </div>
          )}

          {/* BMI estimate */}
          {current.kg != null && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Est. BMI</div>
              {(() => {
                const bmi = current.kg / ((height / 100) ** 2);
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
        </div>
      </div>
    </div>
  );
}