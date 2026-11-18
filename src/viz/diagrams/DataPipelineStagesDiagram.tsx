import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'crawl', label: 'Crawl', volume: 100, desc: 'Raw sources: Common Crawl, curated sources (Wikipedia, books, code), licensed data.' },
  { key: 'clean', label: 'Clean', volume: 78, desc: 'Strip HTML/boilerplate, fix encoding, remove non-natural-language garbage.' },
  { key: 'dedupe', label: 'Deduplicate', volume: 45, desc: 'Remove exact + near-duplicate documents -- training on duplicates wastes compute and causes verbatim memorization.' },
  { key: 'filter', label: 'Filter', volume: 30, desc: 'Remove low-quality/toxic content via heuristics + learned quality classifiers.' },
  { key: 'contam', label: 'Check contamination', volume: 29, desc: "Verify benchmark eval sets haven't leaked into training data." },
  { key: 'tokenize', label: 'Tokenize & pack', volume: 29, desc: 'Convert to token IDs, pack documents back-to-back into fixed-length sequences -- no wasted padding.' },
] as const;

/** The pretraining data pipeline as a shrinking funnel -- click a stage for
 * what it does, and watch the relative volume (illustrative, not exact)
 * actually drop at each filtering step, not just read as a flat list. */
export default function DataPipelineStagesDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(STAGES.length, 2600, 2);
  const selected = STAGES[cycle.value].key;
  const setSelected = (key: (typeof STAGES)[number]['key']) => cycle.pick(STAGES.findIndex((stage) => stage.key === key));
  const color = getConceptColor(t, 'embedding');
  const active = STAGES.find((s) => s.key === selected)!;
  const maxVolume = 100;

  return (
    <VisualizationContainer footer={active.desc}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130, justifyContent: 'center' }}>
        {STAGES.map((s) => {
          const h = (s.volume / maxVolume) * 110;
          const isSelected = selected === s.key;
          return (
            <div key={s.key} onClick={() => setSelected(s.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(s.key); } }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: 80 }}>
              <div style={{ fontSize: 9, color: isSelected ? color : t.textMuted, fontWeight: isSelected ? 700 : 400, marginBottom: 4 }}>{s.volume}%</div>
              <div style={{ width: 44, height: h, background: isSelected ? color : t.surfaceAlt, opacity: isSelected ? 0.85 : 0.6, border: `1.5px solid ${isSelected ? color : t.border}`, borderRadius: '4px 4px 0 0' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{ width: 80, textAlign: 'center', fontSize: 9, color: selected === s.key ? color : t.textSecondary, fontWeight: selected === s.key ? 700 : 400 }}>
            {i > 0 && <span style={{ color: t.textMuted }}>→ </span>}{s.label}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Illustrative relative volumes -- click any stage for what it does.
      </div>
    </VisualizationContainer>
  );
}
