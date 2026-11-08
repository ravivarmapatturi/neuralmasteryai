import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchEllipse, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Self-attention draws Q, K, V from the same source; cross-attention draws
 * Q from the decoder's own (masked) self-attention output, but K and V from
 * the encoder's output -- the one wiring that lets the decoder pull
 * information from the input sequence at every generation step. */
export default function CrossAttentionDiagram() {
  const t = useVizTokens();
  const qColor = getConceptColor(t, 'query');
  const kColor = getConceptColor(t, 'key');
  const vColor = getConceptColor(t, 'value');
  const attnColor = getConceptColor(t, 'attention');

  const panelW = 280;
  const panelH = 175;

  function Panel({ title, qFrom, kvFrom, crossWire }: { title: string; qFrom: string; kvFrom: string; crossWire: boolean }) {
    const srcX = 40;
    const srcY = panelH / 2;
    const attnX = panelW - 55;
    return (
      <div style={{ flex: '1 1 260px', minWidth: 240 }}>
        <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.label.size, fontWeight: DIAGRAM_TYPE.label.weight, color: t.textPrimary, marginBottom: 6 }}>{title}</div>
        <svg width="100%" viewBox={`0 0 ${panelW} ${panelH}`} style={{ display: 'block' }}>
          {crossWire ? (
            <>
              <SketchRect x={srcX - 32} y={18} width={64} height={32} color={t.textSecondary} strokeWidth={1.5} id={`ca-decoder-${title}`} />
              <text x={srcX} y={38} textAnchor="middle" fontSize={10.5} fontWeight={700} fontFamily={HAND_FONT} fill={t.textSecondary}>decoder</text>
              <SketchRect x={srcX - 32} y={panelH - 50} width={64} height={32} color={t.accentSecondary} strokeWidth={1.5} id={`ca-encoder-${title}`} />
              <text x={srcX} y={panelH - 30} textAnchor="middle" fontSize={10.5} fontWeight={700} fontFamily={HAND_FONT} fill={t.accentSecondary}>encoder</text>

              {/* Q arrow and label sitting strictly above line */}
              <SketchArrow points={[[srcX + 34, 34], [attnX - 35, srcY - 20]]} color={qColor} strokeWidth={2} id={`ca-q-${title}`} />
              <text x={115} y={32} textAnchor="middle" fontSize={11} fontWeight={700} fill={qColor}>Q</text>

              {/* K arrow and label sitting above line */}
              <SketchArrow points={[[srcX + 34, panelH - 42], [attnX - 35, srcY + 6]]} color={kColor} strokeWidth={2} id={`ca-k-${title}`} />
              <text x={108} y={104} textAnchor="middle" fontSize={11} fontWeight={700} fill={kColor}>K</text>

              {/* V arrow and label sitting below line */}
              <SketchArrow points={[[srcX + 34, panelH - 28], [attnX - 35, srcY + 18]]} color={vColor} strokeWidth={2} id={`ca-v-${title}`} />
              <text x={142} y={152} textAnchor="middle" fontSize={11} fontWeight={700} fill={vColor}>V</text>
            </>
          ) : (
            <>
              <SketchEllipse cx={srcX} cy={srcY} width={56} height={56} color={t.textSecondary} strokeWidth={1.5} id={`ca-x-${title}`} />
              <text x={srcX} y={srcY + 4} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="monospace" fill={t.textSecondary}>X</text>

              <SketchArrow points={[[srcX + 30, srcY - 15], [attnX - 35, srcY - 20]]} color={qColor} strokeWidth={2} id={`ca-sq-${title}`} />
              <text x={(srcX + attnX) / 2} y={srcY - 24} textAnchor="middle" fontSize={11} fontWeight={700} fill={qColor}>Q</text>

              <SketchArrow points={[[srcX + 30, srcY], [attnX - 35, srcY]]} color={kColor} strokeWidth={2} id={`ca-sk-${title}`} />
              <text x={(srcX + attnX) / 2} y={srcY - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={kColor}>K</text>

              <SketchArrow points={[[srcX + 30, srcY + 15], [attnX - 35, srcY + 20]]} color={vColor} strokeWidth={2} id={`ca-sv-${title}`} />
              <text x={(srcX + attnX) / 2} y={srcY + 34} textAnchor="middle" fontSize={11} fontWeight={700} fill={vColor}>V</text>
            </>
          )}

          {/* Plain backing ellipse for the Attn node's wash, SketchEllipse on top */}
          <ellipse cx={attnX} cy={srcY} rx={30} ry={30} fill={`${attnColor}22`} stroke="none" />
          <SketchEllipse cx={attnX} cy={srcY} width={60} height={60} color={attnColor} strokeWidth={2} id={`ca-attn-${title}`} />
          <text x={attnX} y={srcY - 2} textAnchor="middle" fontSize={10.5} fontWeight={700} fontFamily={HAND_FONT} fill={attnColor}>Attn</text>
          <text x={attnX} y={srcY + 12} textAnchor="middle" fontSize={9.5} fontFamily={HAND_FONT} fill={t.textMuted}>(Q,K,V)</text>
        </svg>
        <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 2 }}>
          Q from {qFrom}, K &amp; V from {kvFrom}
        </div>
      </div>
    );
  }

  return (
    <VisualizationContainer footer="Everything else about the attention computation -- QK^T, scale, softmax, weighted sum of V -- is identical between the two. The only thing that changes is where K and V come from.">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Panel title="SELF-ATTENTION" qFrom="X" kvFrom="the same X" crossWire={false} />
        <Panel title="CROSS-ATTENTION" qFrom="the decoder" kvFrom="the encoder's output" crossWire />
      </div>
    </VisualizationContainer>
  );
}
