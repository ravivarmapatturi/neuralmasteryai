import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const INPUT = ['your', 'cat', 'is', 'lovely'];
const OUTPUT = ['votre', 'chat', 'est', 'adorable'];

/** The whole input sequence is compressed into ONE fixed-size vector --
 * the encoder's final hidden state -- and that single vector is all the
 * decoder ever sees of the input. Every output token has to be generated
 * from that one bottleneck, no matter how long the input was. */
export default function Seq2SeqDiagram() {
  const t = useVizTokens();
  const [hoveredContext, setHoveredContext] = useState(false);
  const encColor = getConceptColor(t, 'embedding');
  const decColor = getConceptColor(t, 'attention');
  const ctxColor = t.accentDanger;

  const width = 600;
  const height = 170;
  const cellY = 60;
  const inputY = 130;
  const cellR = 18;
  const ctxX = width / 2;
  const encStep = (i: number) => 40 + i * 50;
  const decStep = (i: number) => ctxX + 60 + i * 50;

  return (
    <VisualizationContainer footer="Hover the context vector -- it's the entire bottleneck: no matter how long the input sentence is, everything the decoder knows about it has to fit through this one fixed-size vector.">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="s2s-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        <text x={encStep(1.5)} y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill={encColor}>ENCODER</text>
        <text x={decStep(1.5)} y={16} textAnchor="middle" fontSize={11} fontWeight={700} fill={decColor}>DECODER</text>

        {INPUT.map((w, i) => {
          const x = encStep(i);
          return (
            <g key={`enc-${i}`}>
              {i > 0 && <line x1={encStep(i - 1) + cellR} y1={cellY} x2={x - cellR - 6} y2={cellY} stroke={encColor} strokeWidth={1.5} markerEnd="url(#s2s-arrow)" />}
              <circle cx={x} cy={cellY} r={cellR} fill={`${encColor}18`} stroke={encColor} strokeWidth={1.5} />
              <line x1={x} y1={inputY - 12} x2={x} y2={cellY + cellR + 7} stroke={t.textMuted} strokeWidth={1.25} markerEnd="url(#s2s-arrow)" />
              <text x={x} y={inputY + 4} textAnchor="middle" fontSize={10} fill={t.textSecondary}>{w}</text>
            </g>
          );
        })}
        <line x1={encStep(INPUT.length - 1) + cellR} y1={cellY} x2={ctxX - 32} y2={cellY} stroke={encColor} strokeWidth={2} markerEnd="url(#s2s-arrow)" />

        <g onMouseEnter={() => setHoveredContext(true)} onMouseLeave={() => setHoveredContext(false)} style={{ cursor: 'pointer' }}>
          <rect x={ctxX - 26} y={cellY - 22} width={52} height={44} rx={8} fill={hoveredContext ? `${ctxColor}30` : `${ctxColor}18`} stroke={ctxColor} strokeWidth={hoveredContext ? 2.5 : 2} />
          <text x={ctxX} y={cellY - 2} textAnchor="middle" fontSize={9} fontWeight={700} fill={ctxColor}>context</text>
          <text x={ctxX} y={cellY + 12} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={ctxColor}>vector</text>
        </g>

        <line x1={ctxX + 26} y1={cellY} x2={decStep(0) - cellR - 6} y2={cellY} stroke={decColor} strokeWidth={2} markerEnd="url(#s2s-arrow)" />
        {OUTPUT.map((w, i) => {
          const x = decStep(i);
          return (
            <g key={`dec-${i}`}>
              {i > 0 && <line x1={decStep(i - 1) + cellR} y1={cellY} x2={x - cellR - 6} y2={cellY} stroke={decColor} strokeWidth={1.5} markerEnd="url(#s2s-arrow)" />}
              <circle cx={x} cy={cellY} r={cellR} fill={`${decColor}18`} stroke={decColor} strokeWidth={1.5} />
              <line x1={x} y1={cellY + cellR} x2={x} y2={inputY - 14} stroke={t.textMuted} strokeWidth={1.25} markerEnd="url(#s2s-arrow)" />
              <text x={x} y={inputY + 4} textAnchor="middle" fontSize={10} fill={t.textSecondary}>{w}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: hoveredContext ? ctxColor : t.textMuted, marginTop: 4, fontWeight: hoveredContext ? 700 : 400 }}>
        {hoveredContext ? 'One fixed-size vector -- the entire input sequence, compressed, is all the decoder gets.' : 'The encoder\'s final hidden state becomes the decoder\'s initial hidden state.'}
      </div>
    </VisualizationContainer>
  );
}
