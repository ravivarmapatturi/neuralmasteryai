import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Store = 'offline' | 'online';
const INFO: Record<Store, { backend: string; scale: string; use: string }> = {
  offline: { backend: 'Data warehouse / lake', scale: 'Massive, historical', use: 'Generating training datasets -- can afford to be slow, needs to be comprehensive.' },
  online: { backend: 'Redis or similar fast KV store', scale: 'Small, current only', use: 'Real-time inference -- must return in single-digit milliseconds.' },
};

/** Same feature values, two structurally different stores for two
 * structurally different access patterns -- click either. */
export default function OfflineVsOnlineStoreDiagram() {
  const t = useVizTokens();
  const [store, setStore] = useState<Store>('online');
  const offlineColor = getConceptColor(t, 'query');
  const onlineColor = getConceptColor(t, 'attention');
  const info = INFO[store];

  return (
    <VisualizationContainer footer={info.use}>
      <div style={{ display: 'flex', gap: 8 }}>
        <SketchBox color={store === 'offline' ? offlineColor : t.border} strokeWidth={store === 'offline' ? 2 : 1.3} style={{ flex: 1 }}>
          <div onClick={() => setStore('offline')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStore('offline'); } }} onMouseEnter={() => setStore('offline')} style={{ cursor: 'pointer', padding: '0.7rem', borderRadius: 9, background: store === 'offline' ? `${offlineColor}18` : t.surfaceAlt, textAlign: 'center' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: store === 'offline' ? offlineColor : t.textPrimary, fontFamily: HAND_FONT }}>Offline store</div>
            <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3, fontFamily: HAND_FONT }}>{INFO.offline.backend}</div>
          </div>
        </SketchBox>
        <SketchBox color={store === 'online' ? onlineColor : t.border} strokeWidth={store === 'online' ? 2 : 1.3} style={{ flex: 1 }}>
          <div onClick={() => setStore('online')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStore('online'); } }} onMouseEnter={() => setStore('online')} style={{ cursor: 'pointer', padding: '0.7rem', borderRadius: 9, background: store === 'online' ? `${onlineColor}18` : t.surfaceAlt, textAlign: 'center' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: store === 'online' ? onlineColor : t.textPrimary, fontFamily: HAND_FONT }}>Online store</div>
            <div style={{ fontSize: 9, color: t.textMuted, marginTop: 3, fontFamily: HAND_FONT }}>{INFO.online.backend}</div>
          </div>
        </SketchBox>
      </div>
    </VisualizationContainer>
  );
}
