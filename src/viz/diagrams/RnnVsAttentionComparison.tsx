import { useEffect, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_OPACITY, getConceptColor } from './diagramSystem';
import { useAutoplayDefault } from '../primitives/autoplayDefault';

const WORDS = ['The', 'cat', 'sat', 'down'];
const NODE_R = 18;
const STEP_MS = 650;

/**
 * RNN panel: the real unrolled-cell structure -- each timestep's hidden
 * state h_t is a function of the input x_t AND the previous hidden state
 * h_{t-1}, so h_t (and everything downstream of it) literally cannot be
 * computed until h_{t-1} exists. Attention panel: the same sentence, but
 * every word has a direct edge to every other word -- selecting a word
 * shows exactly what "direct, parallel access" means: its real
 * relationship to every other position, not just its neighbors.
 */
export default function RnnVsAttentionComparison() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  // Live by default: the RNN lights up one word at a time while attention connects
  // all words at once, then it loops. Any click hands control to the reader.
  const [step, setStep] = useState(reducedMotion ? WORDS.length : 0);
  const autoplayDefault = useAutoplayDefault();
  const [playing, setPlaying] = useState(() => autoplayDefault && !reducedMotion);
  const [auto, setAuto] = useState(true);
  const [selectedToken, setSelectedToken] = useState<number | null>(1); // "cat" selected by default, so the arcs mean something on first paint

  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    if (step >= WORDS.length) {
      if (!auto) { setPlaying(false); return undefined; }
      const again = setTimeout(() => setStep(0), 2200);
      return () => clearTimeout(again);
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, step, reducedMotion, auto]);

  const play = () => {
    setAuto(false);
    setStep(0);
    setPlaying(true);
  };
  const reset = () => {
    setAuto(false);
    setPlaying(false);
    setStep(WORDS.length);
  };

  const panelW = 320;
  const panelH = 190;
  const hiddenY = 46;
  const inputY = 150;
  const h0X = 26;
  const cellX = (i: number) => 76 + i * ((panelW - 76 - 30) / (WORDS.length - 1));

  const tokenColor = getConceptColor(t, 'token');
  const rnnColor = t.accentDanger;
  const attnColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="RNNs: hidden state h_t depends on h_{t-1}, so step t literally cannot start until step t-1 finishes -- a real data dependency, not just a convention. Attention: every word has a direct edge to every other word, computed in parallel; click a word to see its real relationships.">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <VizButton onClick={play} disabled={playing}>
          {playing ? 'Playing…' : 'Play'}
        </VizButton>
        <VizButton variant="secondary" onClick={reset}>
          Reset
        </VizButton>
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* RNN panel -- real unrolled cell structure */}
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: DIAGRAM_TYPE.label.weight, color: rnnColor, marginBottom: 6, letterSpacing: '0.04em' }}>
            RNN — HIDDEN STATE DEPENDS ON THE LAST ONE
          </div>
          <svg width="100%" viewBox={`0 0 ${panelW} ${panelH}`} style={{ display: 'block' }}>
            <defs>
              <marker id="rnn-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={rnnColor} />
              </marker>
              <marker id="rnn-arrow-dim" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill={t.border} />
              </marker>
            </defs>

            {/* h0 -> h1 -> h2 -> h3 -> h4 recurrence */}
            {[h0X, ...WORDS.map((_, i) => cellX(i))].slice(0, -1).map((x0, i) => {
              const x1 = i === 0 ? cellX(0) : cellX(i);
              const active = i < step;
              return (
                <line
                  key={`rec-${i}`}
                  x1={x0 + NODE_R}
                  y1={hiddenY}
                  x2={x1 - NODE_R}
                  y2={hiddenY}
                  stroke={active ? rnnColor : t.border}
                  strokeWidth={2}
                  opacity={active ? DIAGRAM_OPACITY.active : DIAGRAM_OPACITY.inactive}
                  markerEnd={active ? 'url(#rnn-arrow)' : 'url(#rnn-arrow-dim)'}
                />
              );
            })}

            {/* h0 box */}
            <rect x={h0X - 16} y={hiddenY - 14} width={32} height={28} rx={5} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.5} />
            <text x={h0X} y={hiddenY + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={t.textMuted}>
              h₀
            </text>

            {WORDS.map((word, i) => {
              const active = i < step;
              const x = cellX(i);
              return (
                <g key={`rnn-cell-${i}`}>
                  {/* input x_t -> hidden h_t */}
                  <line
                    x1={x}
                    y1={inputY - NODE_R}
                    x2={x}
                    y2={hiddenY + 16}
                    stroke={active ? rnnColor : t.border}
                    strokeWidth={2}
                    opacity={active ? DIAGRAM_OPACITY.active : DIAGRAM_OPACITY.inactive}
                    markerEnd={active ? 'url(#rnn-arrow)' : 'url(#rnn-arrow-dim)'}
                  />
                  {/* hidden state h_t */}
                  <rect
                    x={x - 20}
                    y={hiddenY - 16}
                    width={40}
                    height={32}
                    rx={6}
                    fill={active ? rnnColor : t.surfaceAlt}
                    fillOpacity={active ? 0.18 : 1}
                    stroke={active ? rnnColor : t.border}
                    strokeWidth={2}
                  />
                  <text x={x} y={hiddenY + 4} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill={active ? rnnColor : t.textMuted}>
                    h{i + 1}
                  </text>
                  {!active && i === step && (
                    <text x={x} y={hiddenY - 24} textAnchor="middle" fontSize={9} fill={t.textMuted}>
                      waits for h{i}
                    </text>
                  )}
                  {/* input token x_t */}
                  <circle cx={x} cy={inputY} r={NODE_R} fill={tokenColor} fillOpacity={0.15} stroke={tokenColor} strokeWidth={1.5} />
                  <text x={x} y={inputY + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={tokenColor}>
                    {word}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Attention panel -- real words, direct edges to every other word */}
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: DIAGRAM_TYPE.label.weight, color: attnColor, marginBottom: 6, letterSpacing: '0.04em' }}>
            ATTENTION — DIRECT ACCESS TO ALL
          </div>
          <svg width="100%" viewBox={`0 0 ${panelW} ${panelH}`} style={{ display: 'block' }}>
            {WORDS.map((_, i) =>
              WORDS.map((_, j) => {
                if (j <= i) return null; // one arc per unordered pair, not two overlapping ones
                const revealed = step >= WORDS.length; // reveals all-at-once, unlike RNN's staged reveal
                const involved = selectedToken !== null && (i === selectedToken || j === selectedToken);
                const dimmed = selectedToken !== null && !involved;
                // Arcs above the row -- height grows with word distance, so
                // adjacent and far-apart connections are visually distinct
                // instead of collapsing onto the same straight line (every
                // node sits on one horizontal axis here).
                const dist = j - i;
                const arcHeight = 20 + dist * 20;
                const midX = (cellX(i) + cellX(j)) / 2;
                const controlY = inputY - NODE_R - arcHeight;
                return (
                  <path
                    key={`attn-edge-${i}-${j}`}
                    d={`M ${cellX(i)},${inputY - NODE_R} Q ${midX},${controlY} ${cellX(j)},${inputY - NODE_R}`}
                    fill="none"
                    stroke={attnColor}
                    strokeWidth={involved ? 2.5 : 1.5}
                    opacity={!revealed ? DIAGRAM_OPACITY.ghost : dimmed ? DIAGRAM_OPACITY.masked : involved ? DIAGRAM_OPACITY.active : DIAGRAM_OPACITY.inactive}
                  />
                );
              }),
            )}
            {WORDS.map((word, i) => {
              const isSelected = selectedToken === i;
              return (
                <g key={`attn-node-${i}`} onClick={() => { setAuto(false); setSelectedToken(isSelected ? null : i); }} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={cellX(i)}
                    cy={inputY}
                    r={NODE_R}
                    fill={attnColor}
                    fillOpacity={isSelected ? 0.35 : 0.18}
                    stroke={attnColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <text x={cellX(i)} y={inputY + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={attnColor}>
                    {word}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ textAlign: 'center', fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            Click a word to see its direct relationship to every other word{selectedToken !== null ? ` -- showing "${WORDS[selectedToken]}"` : ''}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
