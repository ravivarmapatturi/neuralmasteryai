import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Mode = 'chatbot' | 'agent';

/** The defining difference isn't the model -- it's whether there's a loop.
 * A chatbot call is a straight line: input -> output -> stop. An agent
 * wraps the SAME model in a loop that can call tools and observe results
 * before ever producing a final answer. */
export default function ChatbotVsAgentDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('agent');
  const color = mode === 'agent' ? getConceptColor(t, 'attention') : t.textMuted;
  const width = 560;
  const height = 150;

  return (
    <VisualizationContainer footer={mode === 'chatbot' ? 'A single LLM call: input, output, stop. No loop, no tools, no way to act on what it finds.' : 'The model can decide to call a tool, observe the result, and decide what to do next -- potentially many times -- before producing a final answer. The loop is the entire difference.'}>
      <PillSelect<Mode> label="Mode" value={mode} onChange={setMode} options={[{ value: 'chatbot', label: 'Chatbot' }, { value: 'agent', label: 'Agent' }]} />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 10 }}>
        <rect x={20} y={55} width={90} height={36} rx={7} fill={t.surfaceAlt} stroke="none" />
        <SketchRect x={20} y={55} width={90} height={36} color={t.textMuted} strokeWidth={1.5} id="cva-input" />
        <text x={65} y={77} textAnchor="middle" fontSize={11} fontFamily={HAND_FONT} fill={t.textSecondary}>Input</text>
        <SketchArrow points={[[110, 73], [155, 73]]} color={color} strokeWidth={2} id="cva-arrow-1" />
        <rect x={160} y={55} width={100} height={36} rx={7} fill={`${color}18`} stroke="none" />
        <SketchRect x={160} y={55} width={100} height={36} color={color} strokeWidth={2} id="cva-llm" />
        <text x={210} y={77} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily={HAND_FONT} fill={color}>LLM</text>
        {mode === 'chatbot' ? (
          <>
            <SketchArrow points={[[260, 73], [310, 73]]} color={color} strokeWidth={2} id="cva-arrow-2" />
            <rect x={315} y={55} width={90} height={36} rx={7} fill={t.surfaceAlt} stroke="none" />
            <SketchRect x={315} y={55} width={90} height={36} color={t.textMuted} strokeWidth={1.5} id="cva-output" />
            <text x={360} y={77} textAnchor="middle" fontSize={11} fontFamily={HAND_FONT} fill={t.textSecondary}>Output</text>
            <text x={430} y={77} fontSize={11} fontFamily={HAND_FONT} fill={t.textMuted}>→ stop</text>
          </>
        ) : (
          <>
            <SketchArrow points={[[210, 55], [240, 18], [310, 18], [340, 55]]} color={color} strokeWidth={2} id="cva-loop" />
            <rect x={295} y={55} width={90} height={36} rx={7} fill={`${color}18`} stroke="none" />
            <SketchRect x={295} y={55} width={90} height={36} color={color} strokeWidth={1.5} id="cva-tool" />
            <text x={340} y={73} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={color}>call tool</text>
            <text x={340} y={85} textAnchor="middle" fontSize={9} fontFamily={HAND_FONT} fill={color}>observe result</text>
            <text x={270} y={20} textAnchor="middle" fontSize={8} fontFamily={HAND_FONT} fill={color}>loop, N times</text>
            <SketchArrow points={[[385, 73], [430, 73]]} color={color} strokeWidth={2} id="cva-arrow-3" />
            <rect x={435} y={55} width={100} height={36} rx={7} fill={t.surfaceAlt} stroke="none" />
            <SketchRect x={435} y={55} width={100} height={36} color={t.textMuted} strokeWidth={1.5} id="cva-final" />
            <text x={485} y={77} textAnchor="middle" fontSize={10} fontFamily={HAND_FONT} fill={t.textSecondary}>Final answer</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same model underneath — the loop plus the ability to act on the outside world is the entire distinction.
      </div>
    </VisualizationContainer>
  );
}
