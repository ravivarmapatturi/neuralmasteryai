import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Mode = 'compiled' | 'interpreted' | 'python' | 'pytorch';
const MODES: Mode[] = ['pytorch', 'python', 'compiled', 'interpreted'];

const STAGES: Record<Mode, { label: string; color: 'query' | 'attention' | 'key'; width: number }[]> = {
  compiled: [{ label: 'compile (once, ahead of time)', color: 'query', width: 35 }, { label: 'run machine code (fast)', color: 'attention', width: 65 }],
  interpreted: [{ label: 'interpret + execute line-by-line, every run', color: 'key', width: 100 }],
  python: [{ label: 'compile to bytecode (once, cached as .pyc)', color: 'query', width: 15 }, { label: 'CPython interpreter executes bytecode', color: 'key', width: 85 }],
  pytorch: [{ label: 'Python: orchestration only', color: 'key', width: 8 }, { label: 'pre-compiled C++/CUDA kernel does the real work', color: 'attention', width: 92 }],
};
const LABELS: Record<Mode, string> = {
  compiled: 'Compiled (C++, Rust)',
  interpreted: 'Purely interpreted (conceptual)',
  python: 'Python (actual)',
  pytorch: 'PyTorch tensor op',
};
const EXPLAIN: Record<Mode, string> = {
  compiled: 'All translation work happens once, ahead of time -- every subsequent run is just executing already-optimized machine code.',
  interpreted: 'A hypothetical purely line-by-line interpreter re-parses and re-executes source on every run, with no separate compile step at all.',
  python: "Python is actually a hybrid: source compiles to bytecode once (cached as .pyc), and the CPython interpreter executes that bytecode -- not machine code, so still slower than the compiled case, but not re-parsing raw source either.",
  pytorch: "A PyTorch tensor operation spends almost no time in the Python interpreter itself -- Python just calls into a pre-compiled CUDA/C++ kernel that does the actual numeric work at compiled-code speed. This is exactly why vectorized tensor code doesn't pay Python's per-element interpretation cost the way a Python for-loop over tensor elements would.",
};

export default function CompiledVsInterpretedDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick: setModeIdx, stop } = useAutoCycle(MODES.length, 3500, 0);
  const mode = MODES[modeIdx];

  return (
    <VisualizationContainer footer={EXPLAIN[mode]}>
      <PillSelect<Mode>
        label="Execution model"
        value={mode}
        onChange={(val) => {
          const v = typeof val === 'function' ? val(mode) : val;
          stop();
          setModeIdx(MODES.indexOf(v));
        }}
        options={(Object.keys(LABELS) as Mode[]).map((m) => ({ value: m, label: LABELS[m] }))}
      />
      <div style={{ display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
        {STAGES[mode].map((s, i) => (
          <div
            key={i}
            style={{
              width: `${s.width}%`,
              background: `${getConceptColor(t, s.color)}55`,
              border: `1px solid ${getConceptColor(t, s.color)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontFamily: 'monospace',
              color: getConceptColor(t, s.color),
              padding: '0 4px',
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
