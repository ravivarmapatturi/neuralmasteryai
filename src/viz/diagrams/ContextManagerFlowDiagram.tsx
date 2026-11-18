import { useState, useEffect } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

interface Step {
  label: string;
  outcome?: 'ok' | 'error';
}

const NORMAL: Step[] = [
  { label: '__enter__() runs' },
  { label: 'block body runs' },
  { label: 'block finishes normally' },
  { label: '__exit__() runs', outcome: 'ok' },
];
const WITH_EXCEPTION: Step[] = [
  { label: '__enter__() runs' },
  { label: 'block body runs' },
  { label: 'an exception is raised mid-block', outcome: 'error' },
  { label: '__exit__() still runs (guaranteed)', outcome: 'ok' },
];

export default function ContextManagerFlowDiagram() {
  const t = useVizTokens();
  const prefersReduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<'normal' | 'exception'>('exception');
  const [activeStep, setActiveStep] = useState(3);
  const [isPaused, setIsPaused] = useState(false);

  const steps = mode === 'normal' ? NORMAL : WITH_EXCEPTION;
  const okColor = getConceptColor(t, 'attention');
  const errColor = t.accentDanger;

  useEffect(() => {
    if (prefersReduced || isPaused) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [prefersReduced, isPaused, steps.length]);

  const colorFor = (o?: Step['outcome']) => (o === 'error' ? errColor : o === 'ok' ? okColor : t.textPrimary);

  return (
    <VisualizationContainer
      footer={
        mode === 'exception'
          ? "This is the entire point of a context manager: __exit__() is guaranteed to run whether the block finished cleanly or blew up partway through. `with open(f) as file:` closes the file either way; `with torch.no_grad():` re-enables gradient tracking either way."
          : 'The clean path: setup, body, teardown, in order. The interesting behavior only shows up once something goes wrong mid-block -- switch to "With Exception" to see it.'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <VizButton variant={mode === 'normal' ? 'primary' : 'secondary'} onClick={() => { setIsPaused(true); setMode('normal'); setActiveStep(0); }}>
          Normal Completion
        </VizButton>
        <VizButton variant={mode === 'exception' ? 'primary' : 'secondary'} onClick={() => { setIsPaused(true); setMode('exception'); setActiveStep(0); }}>
          With Exception
        </VizButton>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, background: t.surfaceAlt, borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: t.textSecondary }}>
        with resource() as r:{'\n'}    ... work with r ...
      </div>
      <div>
        {steps.map((s, i) => {
          const isActive = activeStep === i;
          return (
            <div
              key={i}
              onClick={() => { setIsPaused(true); setActiveStep(i); }}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 6,
                borderLeft: `3px solid ${isActive ? okColor : t.border}`,
                marginLeft: 8,
                background: isActive ? `${okColor}15` : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: isActive ? okColor : t.textMuted, minWidth: 16 }}>{i + 1}</div>
              <div style={{ fontSize: 13, color: colorFor(s.outcome), fontWeight: s.outcome || isActive ? 700 : 400 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
