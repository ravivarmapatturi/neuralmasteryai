import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const NODES = [
  { id: 'alexnet', year: 2012, label: 'AlexNet' },
  { id: 'seq2seq', year: 2014, label: 'Seq2Seq' },
  { id: 'resnet', year: 2015, label: 'ResNet', why: 'AlexNet showed depth helps; going much deeper hit a degradation problem that residual connections directly fixed.' },
  { id: 'transformer', year: 2017, label: 'Transformer', why: "Seq2Seq's fixed-size context vector bottlenecked long sequences; the Transformer showed attention alone, without recurrence, was sufficient and dramatically more parallelizable." },
  { id: 'bert', year: 2018, label: 'BERT', why: 'The original Transformer was encoder-decoder, built for translation. BERT kept only the encoder for understanding tasks.' },
  { id: 'vit', year: 2020, label: 'ViT', why: 'BERT proved bidirectional attention-based pretraining works for text; ViT asked whether the same recipe works for images too -- it does, given enough data.' },
  { id: 'gpt3', year: 2020, label: 'GPT-3', why: 'GPT kept only the decoder half of the Transformer for generation, and GPT-3 showed scale alone produces powerful few-shot capability.' },
  { id: 'ddpm', year: 2020, label: 'DDPM' },
  { id: 'chatgpt', year: 2022, label: 'ChatGPT', why: "GPT-3 showed scale produces capability, but the base model wasn't reliably instructable -- SFT and RLHF were the specific fix." },
  { id: 'llama', year: 2023, label: 'Llama' },
  { id: 'ragagents', year: 2024, label: 'RAG & Agents', why: 'A capable, instructable assistant still had frozen, incomplete knowledge and couldn\'t take action -- RAG and agentic tool use are the direct responses to those two gaps.' },
  { id: 'reasoning', year: 2025, label: 'Reasoning/GRPO', why: 'RLHF optimizes for human-judged response quality broadly; reasoning-focused RL narrows the same machinery toward specifically rewarding correct multi-step reasoning.' },
];

export default function PaperTimelineDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(NODES.length, 2800);
  const [userSelected, setUserSelected] = useState<string | null>(null);
  const selected = userSelected ?? NODES[autoIdx].id;
  const active = NODES.find((n) => n.id === selected)!;

  return (
    <VisualizationContainer footer={active.why ?? `${active.label} (${active.year}) -- a new lineage branch point; click a later node to see what specific limitation it responded to.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NODES.map((n) => (
          <div
            key={n.id}
            onClick={() => setUserSelected(n.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '5px 10px', borderRadius: 6,
              background: selected === n.id ? `${t.accentPrimary}18` : 'transparent',
              border: `1px solid ${selected === n.id ? t.accentPrimary : 'transparent'}`,
            }}
          >
            <span style={{ fontSize: 11, color: t.textMuted, fontFamily: 'monospace', width: 36 }}>{n.year}</span>
            <span style={{ fontSize: 13, fontWeight: selected === n.id ? 700 : 500, color: selected === n.id ? t.accentPrimary : t.textPrimary }}>{n.label}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click any paper to see the specific limitation of what came before it that this one directly responded to.
      </div>
    </VisualizationContainer>
  );
}
