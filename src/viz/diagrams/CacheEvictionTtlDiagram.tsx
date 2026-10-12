import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const SLOT_COUNT = 8;
const CAPACITY = 4;
const TTL_FRACTIONS = [10, 20, 30, 40, 50, 60, 70, 80]; // staggered expiry, percent of elapsed time

/** Two different ways cache entries disappear -- drag to advance time
 * and watch TTL-based expiry, or switch to LRU and drag to simulate
 * new keys arriving once the cache is at capacity. */
export default function CacheEvictionTtlDiagram() {
  const t = useVizTokens();
  const [lru, setLru] = useState(false);
  const [elapsedPct, setElapsedPct] = useState(35);
  const [newKeys, setNewKeys] = useState(2);
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;

  return (
    <VisualizationContainer footer={lru ? `Cache capacity: ${CAPACITY} keys. As ${newKeys} new key(s) arrive, the least-recently-used entries (leftmost) are evicted to make room -- oldest access, not oldest write.` : `Each key was written with a staggered TTL. At ${elapsedPct}% elapsed time, any key whose TTL has passed expires and is removed -- independent of how full the cache is.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setLru(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !lru ? 700 : 500, background: !lru ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!lru ? color : t.border}`, color: !lru ? color : t.textSecondary, cursor: 'pointer' }}>
          TTL expiry
        </button>
        <button type="button" onClick={() => setLru(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: lru ? 700 : 500, background: lru ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${lru ? color : t.border}`, color: lru ? color : t.textSecondary, cursor: 'pointer' }}>
          LRU eviction (cache full)
        </button>
      </div>
      {lru
        ? <Slider label={`New keys arrived: ${newKeys}`} min={0} max={SLOT_COUNT - CAPACITY} step={1} value={newKeys} onChange={setNewKeys} />
        : <Slider label={`Elapsed time: ${elapsedPct}%`} min={0} max={100} step={5} value={elapsedPct} onChange={setElapsedPct} />}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const gone = lru ? i < newKeys : elapsedPct >= TTL_FRACTIONS[i];
          return (
            <SketchBox key={i} color={gone ? badColor : color} strokeWidth={1.5} style={{ width: 32, height: 32, opacity: gone ? 0.3 : 1 }}>
              <div style={{ width: 32, height: 32, background: gone ? 'none' : `${color}30` }} />
            </SketchBox>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
