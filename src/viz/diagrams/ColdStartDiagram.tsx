import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Approach = 'collab' | 'content' | 'explore';
const APPROACHES: Approach[] = ['collab', 'content', 'explore'];

/** A brand-new user has no interaction history -- click through the
 * three approaches to see what each one can actually work with when
 * collaborative filtering has nothing to go on. */
export function ColdStartDiagram() {
  const t = useVizTokens();
  const { value: approachIdx, pick, stop } = useAutoCycle(APPROACHES.length, 3000, 1);
  const approach = APPROACHES[approachIdx];
  const failColor = t.accentDanger;
  const okColor = getConceptColor(t, 'attention');

  const desc: Record<Approach, { works: boolean; text: string }> = {
    collab: { works: false, text: 'Collaborative filtering needs interaction history to find similar users/items -- a new user has none. Fails outright.' },
    content: { works: true, text: "Content-based fallback: recommend based on the NEW item/user's own attributes (category, stated preferences) instead of behavior history nobody has yet." },
    explore: { works: true, text: 'Exploration: deliberately show some uncertain-but-promising items to a new user specifically to gather the signal that lets collaborative filtering take over later.' },
  };

  return (
    <VisualizationContainer footer={desc[approach].text}>
      <PillSelect<Approach>
        label="Approach"
        value={approach}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(approach) : val;
          const idx = APPROACHES.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[{ value: 'collab', label: 'Collaborative filtering' }, { value: 'content', label: 'Content-based fallback' }, { value: 'explore', label: 'Exploration' }]}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <div style={{ padding: '0.7rem', borderRadius: 9, background: t.surfaceAlt, border: `1.5px solid ${t.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted }}>New user</div>
          <div style={{ fontSize: 9, color: t.textMuted }}>0 interactions</div>
        </div>
        <div style={{ fontSize: 18, color: desc[approach].works ? okColor : failColor }}>{desc[approach].works ? '✓' : '✗'}</div>
        <div style={{ flex: 1, padding: '0.7rem', borderRadius: 9, background: desc[approach].works ? `${okColor}15` : `${failColor}15`, border: `1.5px solid ${desc[approach].works ? okColor : failColor}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: desc[approach].works ? okColor : failColor }}>{desc[approach].works ? 'Produces a recommendation' : 'No signal to work with'}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Production systems combine content-based fallback AND exploration, transitioning to collaborative filtering as real signal accumulates.
      </div>
    </VisualizationContainer>
  );
}

export default ColdStartDiagram;
