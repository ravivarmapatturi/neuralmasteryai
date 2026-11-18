import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Choice = 'cp' | 'ap';

const STATES: { choice: Choice; partitioned: boolean }[] = [
  { choice: 'ap', partitioned: true },
  { choice: 'cp', partitioned: true },
  { choice: 'ap', partitioned: false },
];

export default function CapTheoremDiagram() {
  const t = useVizTokens();
  const { value: stateIdx, stop } = useAutoCycle(STATES.length, 3500, 0);
  const [userChoice, setUserChoice] = useState<Choice | null>(null);
  const [userPartitioned, setUserPartitioned] = useState<boolean | null>(null);
  const choice = userChoice ?? STATES[stateIdx].choice;
  const partitioned = userPartitioned ?? STATES[stateIdx].partitioned;
  const okColor = getConceptColor(t, 'attention');
  const errColor = t.accentDanger;

  const nodeA = { data: 'v3' };
  const nodeB = partitioned && choice === 'ap' ? { data: 'v2 (stale)' } : partitioned && choice === 'cp' ? { data: 'unavailable' } : { data: 'v3' };

  return (
    <VisualizationContainer
      footer={
        !partitioned
          ? 'No partition: both nodes agree, both are available. The interesting behavior only shows up once the network splits -- toggle the partition switch.'
          : choice === 'cp'
            ? 'CP (Consistency + Partition tolerance): during the partition, Node B refuses to answer rather than risk serving stale data -- consistency is preserved, availability is sacrificed.'
            : 'AP (Availability + Partition tolerance): during the partition, Node B keeps answering with whatever it last had -- availability is preserved, at the cost of possibly serving a stale value (v2, not the current v3).'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <VizButton variant={partitioned ? 'primary' : 'secondary'} onClick={() => { stop(); setUserPartitioned(!partitioned); }}>
          {partitioned ? 'Partition active' : 'No partition'}
        </VizButton>
        <VizButton variant={choice === 'cp' ? 'primary' : 'secondary'} onClick={() => { stop(); setUserChoice('cp'); }}>
          CP
        </VizButton>
        <VizButton variant={choice === 'ap' ? 'primary' : 'secondary'} onClick={() => { stop(); setUserChoice('ap'); }}>
          AP
        </VizButton>
      </div>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: okColor, fontFamily: HAND_FONT }}>Node A</div>
          <SketchBox color={okColor} strokeWidth={1.5} style={{ marginTop: 6 }}>
            <div style={{ padding: '8px 12px', background: `${okColor}18`, fontFamily: 'monospace', fontSize: 12 }}>{nodeA.data}</div>
          </SketchBox>
        </div>
        <div style={{ fontSize: 20, color: partitioned ? errColor : t.textMuted }}>{partitioned ? '✗ ✗' : '——'}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: nodeB.data === 'unavailable' ? errColor : okColor, fontFamily: HAND_FONT }}>Node B</div>
          <SketchBox color={nodeB.data === 'unavailable' ? errColor : okColor} strokeWidth={1.5} style={{ marginTop: 6 }}>
            <div
              style={{
                padding: '8px 12px',
                background: nodeB.data === 'unavailable' ? `${errColor}18` : `${okColor}18`,
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              {nodeB.data}
            </div>
          </SketchBox>
        </div>
      </div>
    </VisualizationContainer>
  );
}
