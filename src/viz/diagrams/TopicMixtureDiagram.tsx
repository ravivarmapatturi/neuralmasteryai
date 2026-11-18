import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { estimateTopicMixture } from '../lib/unsupervisedMisc';

const DOCS: { key: string; label: string; words: string[] }[] = [
  { key: 'doc1', label: 'Doc 1: "team score game player"', words: ['team', 'score', 'game', 'player'] },
  { key: 'doc2', label: 'Doc 2: "stock market price invest"', words: ['stock', 'market', 'price', 'invest'] },
  { key: 'doc3', label: 'Doc 3: "team invest patient game"', words: ['team', 'invest', 'patient', 'game'] },
];
const TOPIC_COLORS: Record<string, 'accentPrimary' | 'accentSecondary' | 'accentWarn'> = { sports: 'accentPrimary', finance: 'accentSecondary', health: 'accentWarn' };

export default function TopicMixtureDiagram() {
  const t = useVizTokens();
  const docCycle = useAutoCycle(DOCS.length, 3000, 2);
  const docKey = DOCS[docCycle.value].key;
  const doc = DOCS.find((d) => d.key === docKey)!;

  const mixture = useMemo(() => estimateTopicMixture(doc.words), [doc]);

  return (
    <VisualizationContainer footer={`Real per-topic word likelihoods (fixed toy topic-word distributions), combined via real Bayes-style posterior estimation given this document's actual words. This is a simplified stand-in for LDA's real inference (Gibbs sampling/variational inference is more sophisticated), but the core idea is identical: a document's estimated topic mixture comes directly from which topic's word distribution its actual words fit best.`}>
      <PillSelect label="Document" value={docKey} onChange={(v) => docCycle.pick(DOCS.findIndex((d) => d.key === v))} options={DOCS.map((d) => ({ value: d.key, label: d.label }))} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {Object.entries(mixture).map(([topic, prob]) => (
          <div key={topic}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: t[TOPIC_COLORS[topic]], fontWeight: 700, textTransform: 'capitalize' }}>{topic}</span>
              <span style={{ color: t.textMuted }}>{(prob * 100).toFixed(1)}%</span>
            </div>
            <div style={{ background: t.surfaceAlt, borderRadius: 4, height: 16 }}>
              <div style={{ width: `${prob * 100}%`, height: '100%', background: t[TOPIC_COLORS[topic]], borderRadius: 4, transition: docCycle.auto ? 'width 700ms ease' : undefined }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Doc 3 mixes "team"/"game" (sports) with "invest" (finance) and "patient" (health) -- watch its real estimated mixture spread across topics instead of committing to just one, exactly the "document is a mixture of topics" generative story.
      </div>
    </VisualizationContainer>
  );
}
