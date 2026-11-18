import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const GOOD_ORDER = ['FROM python:3.12-slim', 'COPY requirements.txt .', 'RUN pip install -r requirements.txt', 'COPY app/ .', 'CMD ["python", "app.py"]'];
const BAD_ORDER = ['FROM python:3.12-slim', 'COPY app/ .', 'RUN pip install -r requirements.txt', 'CMD ["python", "app.py"]'];

/** Changing application code invalidates every layer AFTER it in the
 * Dockerfile -- ordering rarely-changing layers first keeps the
 * dependency-install layer cached across code changes. Toggle order,
 * simulate an app-code edit, watch which layers actually rebuild. */
export default function DockerfileLayerCachingDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const [manualOrder, setManualOrder] = useState<'good' | 'bad' | null>(null);
  const [manualCodeChanged, setManualCodeChanged] = useState<boolean | null>(null);

  // 4 states: good+changed, good+unchanged, bad+changed, bad+unchanged
  const cyc = useAutoCycle(4, 3000);
  const autoOrder: 'good' | 'bad' = cyc.value < 2 ? 'good' : 'bad';
  const autoCodeChanged = cyc.value % 2 === 0;

  const order = manualOrder ?? autoOrder;
  const codeChanged = manualCodeChanged ?? autoCodeChanged;

  const cachedColor = getConceptColor(t, 'attention');
  const rebuildColor = t.accentDanger;

  const lines = order === 'good' ? GOOD_ORDER : BAD_ORDER;
  const codeLineIdx = order === 'good' ? 3 : 1;
  const invalidated = (i: number) => codeChanged && i >= codeLineIdx;

  return (
    <VisualizationContainer footer={order === 'good' ? 'Dependencies installed BEFORE app code is copied -- an app-code-only change invalidates just the last 2 layers, the (often slow) pip install layer stays cached.' : 'App code copied BEFORE dependencies are installed -- an app-code-only change invalidates the pip install layer too, forcing a full reinstall on every code edit.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => { setManualOrder('good'); }}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: order === 'good' ? 700 : 500,
            background: order === 'good' ? `${cachedColor}20` : t.surfaceAlt,
            border: `1.25px solid ${order === 'good' ? cachedColor : t.border}`,
            color: order === 'good' ? cachedColor : t.textSecondary,
            boxShadow: order === 'good' && !reducedMotion ? `0 0 6px ${cachedColor}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Good order
        </button>
        <button
          type="button"
          onClick={() => { setManualOrder('bad'); }}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: order === 'bad' ? 700 : 500,
            background: order === 'bad' ? `${rebuildColor}20` : t.surfaceAlt,
            border: `1.25px solid ${order === 'bad' ? rebuildColor : t.border}`,
            color: order === 'bad' ? rebuildColor : t.textSecondary,
            boxShadow: order === 'bad' && !reducedMotion ? `0 0 6px ${rebuildColor}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Bad order
        </button>
        <button
          type="button"
          onClick={() => setManualCodeChanged((c) => !(c ?? codeChanged))}
          style={{
            marginLeft: 'auto',
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 11,
            background: 'transparent',
            border: `1.25px solid ${t.border}`,
            color: t.textSecondary,
            cursor: 'pointer',
          }}
        >
          {codeChanged ? 'app code: changed' : 'app code: unchanged'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 10px',
              borderRadius: 5,
              background: invalidated(i) ? `${rebuildColor}15` : `${cachedColor}15`,
              fontFamily: 'monospace',
              fontSize: 10.5,
              transition: 'background 0.3s ease',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: invalidated(i) ? rebuildColor : cachedColor, width: 60, flexShrink: 0 }}>
              {invalidated(i) ? 'REBUILD' : 'cached'}
            </span>
            <span style={{ color: t.textSecondary }}>{line}</span>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}