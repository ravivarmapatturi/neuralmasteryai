import { useState, useEffect } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Scenario = 'normal' | 'cycle';

interface Step {
  label: string;
  refcount: number;
  freed: boolean;
  gcNeeded?: boolean;
}

const NORMAL: Step[] = [
  { label: 'tensor = load_batch()', refcount: 1, freed: false },
  { label: 'model_input = tensor  # second reference', refcount: 2, freed: false },
  { label: 'del tensor', refcount: 1, freed: false },
  { label: 'del model_input  # refcount hits 0', refcount: 0, freed: true },
];
const CYCLE: Step[] = [
  { label: 'a = Node(); b = Node()', refcount: 1, freed: false },
  { label: 'a.next = b; b.prev = a  # each other', refcount: 2, freed: false },
  { label: 'del a; del b  # external refs gone', refcount: 1, freed: false, gcNeeded: true },
  { label: 'cyclic GC runs periodically -> detects the cycle -> frees both', refcount: 0, freed: true, gcNeeded: true },
];

export default function RefCountingDiagram() {
  const t = useVizTokens();
  const prefersReduced = usePrefersReducedMotion();
  const [scenario, setScenario] = useState<Scenario>('cycle');
  const steps = scenario === 'normal' ? NORMAL : CYCLE;
  const [stepIdx, setStepIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const color = getConceptColor(t, 'attention');
  const warnColor = t.accentWarn;

  useEffect(() => {
    if (prefersReduced || isPaused) return;
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % steps.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [prefersReduced, isPaused, steps.length]);

  return (
    <VisualizationContainer
      footer={
        scenario === 'normal'
          ? 'Reference counting alone: the object is freed the instant its refcount hits zero -- immediate, deterministic, no separate collection pass needed.'
          : "A reference cycle: even after every external reference is dropped, a and b still reference each other, so neither's count ever reaches zero through counting alone. CPython's cyclic garbage collector runs periodically specifically to find and free cycles like this -- which is why an object involved in a cycle isn't necessarily freed the instant you'd expect, a real thing to check if GPU memory creeps up with no obvious leak."
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <VizButton
          variant={scenario === 'normal' ? 'primary' : 'secondary'}
          onClick={() => {
            setIsPaused(true);
            setScenario('normal');
            setStepIdx(0);
          }}
        >
          Normal Reference
        </VizButton>
        <VizButton
          variant={scenario === 'cycle' ? 'primary' : 'secondary'}
          onClick={() => {
            setIsPaused(true);
            setScenario('cycle');
            setStepIdx(0);
          }}
        >
          Reference Cycle
        </VizButton>
      </div>
      <div>
        {steps.map((s, i) => (
          <div
            key={i}
            onClick={() => {
              setIsPaused(true);
              setStepIdx(i);
            }}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: stepIdx === i ? `${color}18` : 'transparent',
              border: `1px solid ${stepIdx === i ? `${color}40` : 'transparent'}`,
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: t.textSecondary, flex: 1 }}>{s.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: s.freed ? color : s.gcNeeded ? warnColor : t.textPrimary, minWidth: 60, textAlign: 'right' }}>
              refcount={s.refcount}
            </div>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
