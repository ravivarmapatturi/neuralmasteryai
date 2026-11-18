import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const N_NODES = 5;
const PRESETS = [1, 0, 2, 3, 4];

export default function ConsensusQuorumDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(PRESETS.length, 3000, 0);
  const [userVal, setUserVal] = useState<number | null>(null);
  const unreachable = userVal ?? PRESETS[autoIdx];
  const reachable = N_NODES - unreachable;
  const majority = Math.floor(N_NODES / 2) + 1;
  const committed = reachable >= majority;
  const okColor = getConceptColor(t, 'attention');
  const errColor = t.accentDanger;

  return (
    <VisualizationContainer footer={`${N_NODES} nodes, ${unreachable} unreachable (crashed or network-partitioned away). ${reachable} of ${N_NODES} reachable -- a majority quorum needs at least ${majority}. ${committed ? `${reachable} ≥ ${majority}: the remaining nodes CAN still agree and commit a new value.` : `${reachable} < ${majority}: no majority exists -- the cluster cannot safely commit anything until enough nodes are reachable again, exactly the guarantee that prevents two different sides of a split from both thinking they're in charge.`}`}>
      <Slider label="Unreachable nodes" value={unreachable} onChange={(v) => { stop(); setUserVal(v); }} min={0} max={N_NODES - 1} format={(v) => `${v}`} />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {Array.from({ length: N_NODES }, (_, i) => {
          const isUnreachable = i < unreachable;
          return (
            <div
              key={i}
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isUnreachable ? `${errColor}18` : `${okColor}18`,
                border: `1.5px solid ${isUnreachable ? errColor : okColor}`,
                color: isUnreachable ? errColor : okColor,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {isUnreachable ? '✗' : '✓'}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 12,
          padding: '8px 14px',
          borderRadius: 8,
          display: 'inline-block',
          background: committed ? `${okColor}18` : `${errColor}18`,
          border: `1.5px solid ${committed ? okColor : errColor}`,
          color: committed ? okColor : errColor,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {committed ? 'Quorum reached — can commit' : 'No quorum — cannot commit'}
      </div>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 8 }}>
        Majority needed: ⌊{N_NODES}/2⌋ + 1 = {majority}
      </div>
    </VisualizationContainer>
  );
}
