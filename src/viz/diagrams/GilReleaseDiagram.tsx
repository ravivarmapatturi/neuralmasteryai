import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Code = 'python' | 'numpy';

export default function GilReleaseDiagram() {
  const t = useVizTokens();
  const [code, setCode] = useState<Code>('python');
  const colorA = getConceptColor(t, 'query');
  const colorB = getConceptColor(t, 'key');
  const gilColor = t.accentWarn;

  return (
    <VisualizationContainer
      footer={
        code === 'python'
          ? 'Pure-Python CPU work: only the thread currently holding the GIL (the lock icon) can execute Python bytecode. Thread B is blocked, waiting its turn -- two threads doing pure-Python computation get zero real speedup over one.'
          : 'A NumPy/PyTorch call (tensor_a @ tensor_b): the calling thread releases the GIL for the duration of the compiled C/CUDA kernel, letting another thread run Python bytecode in the meantime -- then reacquires the GIL once the kernel returns. This is exactly why vectorized numeric code isn\'t GIL-limited even though it\'s called from Python.'
      }
    >
      <div style={{ marginBottom: 12 }}>
        <VizButton variant={code === 'python' ? 'primary' : 'secondary'} onClick={() => setCode('python')}>
          Pure Python loop
        </VizButton>{' '}
        <VizButton variant={code === 'numpy' ? 'primary' : 'secondary'} onClick={() => setCode('numpy')}>
          NumPy/PyTorch call
        </VizButton>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: colorA }}>Thread A</div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 12px',
              borderRadius: 8,
              background: `${colorA}18`,
              border: `1.5px solid ${colorA}`,
              fontSize: 12,
              fontFamily: 'monospace',
            }}
          >
            {code === 'python' ? 'holds GIL\nrunning bytecode' : 'in kernel\n(GIL released)'}
          </div>
        </div>
        <div style={{ fontSize: 20 }}>{code === 'python' ? '' : ''}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: colorB }}>Thread B</div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 12px',
              borderRadius: 8,
              background: code === 'python' ? t.surfaceAlt : `${colorB}18`,
              border: `1.5px solid ${code === 'python' ? t.border : colorB}`,
              fontSize: 12,
              fontFamily: 'monospace',
              color: code === 'python' ? t.textMuted : t.textPrimary,
            }}
          >
            {code === 'python' ? 'blocked,\nwaiting for GIL' : 'holds GIL\nrunning bytecode'}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: gilColor, marginTop: 10 }}>
        {code === 'python' ? 'Only one thread ever holds the GIL at a time.' : 'The kernel doesn\'t touch Python objects, so it\'s safe to run without the GIL held.'}
      </div>
    </VisualizationContainer>
  );
}
