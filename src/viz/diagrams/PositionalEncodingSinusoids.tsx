import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const D_MODEL = 512;
const POSITIONS = 40;
// A handful of dimension pairs spanning the full frequency range -- low
// indices oscillate fast (fine position detail), high indices oscillate
// slow (coarse position), exactly the claim the prose makes right above
// this diagram.
const DIM_PAIRS = [0, 4, 16, 64, 256];

// same formula, but for a fractional position (used only to draw a smooth curve)
function peAt(pos: number, dim: number): number {
  const i = Math.floor(dim / 2);
  const angle = pos / 10000 ** ((2 * i) / D_MODEL);
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
}

function pe(pos: number, dim: number): number {
  const i = Math.floor(dim / 2);
  const angle = pos / 10000 ** ((2 * i) / D_MODEL);
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
}

/** The sinusoidal positional-encoding formula, plotted for real -- every
 * point below is computed live from PE(pos, dim), not a static screenshot. */
export default function PositionalEncodingSinusoids() {
  const t = useVizTokens();
  const [hoveredDim, setHoveredDim] = useState<number | null>(null);
  const sweep = useAutoCycle(POSITIONS, 110); // a cursor walks along the positions
  const pos = sweep.value;

  // One row per dimension, with space between rows, so no wave sits on top of another.
  const width = 640;
  const padL = 118;
  const padR = 20;
  const laneH = 44;
  const laneGap = 18;
  const padT = 26;
  const height = padT + DIM_PAIRS.length * (laneH + laneGap) + 12;
  const plotW = width - padL - padR;
  const xFor = (p: number) => padL + (p / (POSITIONS - 1)) * plotW;
  const laneMid = (di: number) => padT + di * (laneH + laneGap) + laneH / 2;
  const yIn = (di: number, v: number) => laneMid(di) - v * (laneH / 2 - 3);
  const SPEED = ['fastest', 'fast', 'medium', 'slow', 'slowest'];

  const colors = [getConceptColor(t, 'embedding'), getConceptColor(t, 'attention'), getConceptColor(t, 'value'), getConceptColor(t, 'query'), getConceptColor(t, 'key')];

  return (
    <VisualizationContainer footer="Every dimension is a fixed sine or cosine wave of position -- no data, no training, just the formula. Low dimensions wiggle fast, high dimensions change slowly; read one position's values straight down the moving line.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <text x={padL} y={16} fontSize={14} fontFamily={HAND_FONT} fill={t.textMuted}>pos = 0</text>
        <text x={width - padR} y={16} textAnchor="end" fontSize={14} fontFamily={HAND_FONT} fill={t.textMuted}>pos = {POSITIONS - 1}</text>
        {DIM_PAIRS.map((dim, di) => {
          const c = colors[di % colors.length];
          const dimmed = hoveredDim !== null && hoveredDim !== dim;
          const d = Array.from({ length: (POSITIONS - 1) * 8 + 1 }, (_, k) => { const p = k / 8; return `${k === 0 ? 'M' : 'L'} ${xFor(p).toFixed(2)},${yIn(di, peAt(p, dim)).toFixed(2)}`; }).join(' ');
          return (
            <g key={dim} opacity={dimmed ? 0.2 : 1} onMouseEnter={() => setHoveredDim(dim)} onMouseLeave={() => setHoveredDim(null)} style={{ cursor: 'pointer' }}>
              <rect x={padL} y={laneMid(di) - laneH / 2} width={plotW} height={laneH} rx={6} fill={c} opacity={0.06} />
              <line x1={padL} y1={laneMid(di)} x2={width - padR} y2={laneMid(di)} stroke={t.border} strokeWidth={1} strokeDasharray="2 4" />
              <text x={padL - 12} y={laneMid(di) - 2} textAnchor="end" fontSize={15} fontWeight={700} fontFamily={HAND_FONT} fill={c}>dim {dim}</text>
              <text x={padL - 12} y={laneMid(di) + 15} textAnchor="end" fontSize={14} fontFamily={HAND_FONT} fill={t.textMuted}>{SPEED[di]}</text>
              <path d={d} fill="none" stroke={c} strokeWidth={hoveredDim === dim ? 3 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xFor(pos)} cy={yIn(di, pe(pos, dim))} r={5.5} fill={c} stroke={t.surface} strokeWidth={1.5} />
            </g>
          );
        })}
        {/* moving position cursor: the five dots on it are this position's fingerprint */}
        <line x1={xFor(pos)} y1={padT - 4} x2={xFor(pos)} y2={height - 10} stroke={t.textSecondary} strokeWidth={1.5} strokeDasharray="4 3" />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textSecondary, marginTop: 2 }}>
        position {pos} → [{DIM_PAIRS.map((d) => pe(pos, d).toFixed(2)).join(', ')}]
        {' '}<button type="button" onClick={() => (sweep.auto ? sweep.stop() : sweep.pick(pos))} style={{ marginLeft: 6, fontFamily: HAND_FONT, fontSize: 14, cursor: 'pointer', background: 'transparent', color: t.textPrimary, border: `1.5px solid ${t.textPrimary}`, borderRadius: 8, padding: '0 8px' }}>{sweep.auto ? 'pause' : 'paused'}</button>
      </div>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
        {DIM_PAIRS.map((dim, di) => (
          <div
            key={dim}
            onMouseEnter={() => setHoveredDim(dim)}
            onMouseLeave={() => setHoveredDim(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: DIAGRAM_TYPE.caption.size, color: hoveredDim === dim ? colors[di % colors.length] : t.textMuted, fontWeight: hoveredDim === dim ? 700 : 400 }}
          >
            <span style={{ width: 12, height: 3, background: colors[di % colors.length], display: 'inline-block', borderRadius: 2 }} />
            dim {dim}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
