import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

interface StageDetail {
  id: string;
  name: string;
  category: 'context' | 'model' | 'sandbox' | 'verifier' | 'state';
  colorKey: 'accentPurple' | 'accentSecondary' | 'accentWarn' | 'accentPrimary' | 'accentTeal';
  shortDesc: string;
  fullDesc: string;
  codeSnippet: string;
  invariant: string;
}

const HARNESS_STAGES: StageDetail[] = [
  {
    id: 'context',
    name: '1. Context Assembler',
    category: 'context',
    colorKey: 'accentPurple',
    shortDesc: 'AGENTS.md & Scoped Instructions',
    fullDesc: 'Assembles the instruction budget, repository architecture map, and progressive tools in Python. Strips unnecessary prose to protect the model against attention dispersion and context rot.',
    codeSnippet: `# Python feed-forward context assembly
context = await harness.assemble_context(
    user_goal=goal,
    active_rules=load_scoped_rules("AGENTS.md"),
    state_checklist=load_artifact("feature_list.json"),
    token_budget=32_000,
)`,
    invariant: 'Instruction Budget Invariant: Core rules never exceed 8k tokens; dynamic docs loaded just-in-time.',
  },
  {
    id: 'model',
    name: '2. Reasoning Engine',
    category: 'model',
    colorKey: 'accentSecondary',
    shortDesc: 'Stochastic Next-Token Predictor',
    fullDesc: 'The raw foundation model (Claude, GPT, Gemini). Treated strictly as an internal inference engine: it proposes thoughts and Pydantic-validated tool calls, but has zero direct access to the host.',
    codeSnippet: `# Pure inference with strict Pydantic schemas
response = await client.beta.chat.completions.parse(
    model="claude-3-7-sonnet",
    messages=context.to_messages(),
    response_format=AgentTurnProposal,
    temperature=0.1,
)`,
    invariant: 'Isolation Invariant: Model never touches the host system directly; every action is a structured proposal.',
  },
  {
    id: 'sandbox',
    name: '3. Execution Sandbox',
    category: 'sandbox',
    colorKey: 'accentWarn',
    shortDesc: 'Isolated Boundary & Tool Dispatch',
    fullDesc: 'Validates tool schemas (Pydantic), enforces permission gates, sets resource caps (CPU/memory limits via setrlimit), and executes code in an isolated subprocess container.',
    codeSnippet: `# Python subprocess sandbox with resource boundaries
exec_result = await sandbox.run_command(
    cmd=step.tool_call.command,
    timeout_seconds=15.0,
    network_enabled=False,
    allowed_roots=["/workspace/repo"],
)`,
    invariant: 'Safety Invariant: Read/write limits, process sandboxing, and timeout guards prevent catastrophic blast radius.',
  },
  {
    id: 'verifier',
    name: '4. 3-Layer Verifier',
    category: 'verifier',
    colorKey: 'accentPrimary',
    shortDesc: 'Deterministic Automated Sensors',
    fullDesc: 'Eliminates premature victory. Executes Layer 1 (ruff & mypy --strict), Layer 2 (pytest test suites), and Layer 3 (runtime/browser smoke probes). Only genuine passing tests can advance state.',
    codeSnippet: `# Python 3-layer deterministic verification pipeline
audit = await verifier.audit(
    l1_static=await run_ruff_and_mypy(),
    l2_tests=await run_pytest_suite(),
    l3_runtime=await run_smoke_probes(),
)
if not audit.passed:
    return harness.feed_diagnostic(audit.format_feedback())`,
    invariant: 'Truth Invariant: Model assertions of success are ignored; verified evidence is the only proof of completion.',
  },
  {
    id: 'state',
    name: '5. State Compactor',
    category: 'state',
    colorKey: 'accentTeal',
    shortDesc: 'Continuity & Compaction',
    fullDesc: 'Updates persistent task state (feature_list.json, git diffs). Compresses lengthy tool logs and file reads into compact semantic notes so multi-session tasks never lose context.',
    codeSnippet: `# Structured state persistence & context compaction
await harness.persist_state(
    checklist=update_feature_checklist(audit),
    git_diff=await get_repo_diff(),
    compacted_log=summarize_turns(history, preserve_failures=True),
)`,
    invariant: 'Continuity Invariant: Every session can halt and resume cleanly without hallucinating its past.',
  },
];

export default function AgentHarnessArchitectureVisualizer() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'harness' | 'naked'>('harness');
  const [selectedStageId, setSelectedStageId] = useState<string>('verifier');

  const selectedStage = HARNESS_STAGES.find((s) => s.id === selectedStageId) ?? HARNESS_STAGES[3];

  return (
    <VisualizationContainer
      footer={
        mode === 'harness'
          ? "The cybernetic agent formula: Agent = Model + Harness. The Model provides reasoning; the Harness provides instructions, sandboxing, automated verification, and state persistence."
          : "Naked Model (Prompt Only): Open-loop execution without sandboxing or automated verification. 80%+ failure rate on non-trivial engineering tasks due to context rot and premature victory."
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <PillSelect<'harness' | 'naked'>
          label="Architecture"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'harness', label: 'Full Production Harness' },
            { value: 'naked', label: 'Naked Model (Prompt Only)' },
          ]}
        />
        <div style={{ fontSize: 12, fontFamily: HAND_FONT, color: t.textSecondary }}>
          Formula: <strong style={{ color: mode === 'harness' ? t.accentPrimary : t.accentDanger }}>
            {mode === 'harness' ? 'Agent = Model + Harness' : 'Agent = Prompt + Luck'}
          </strong>
        </div>
      </div>

      {mode === 'naked' ? (
        <div style={{ padding: '24px 16px', background: `${t.accentDanger}10`, borderRadius: 8, border: `1.5px dashed ${t.accentDanger}50` }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: t.accentDanger, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              The Open-Loop Prompt Trap
            </span>
            <p style={{ margin: '6px auto 0', maxWidth: 480, fontSize: 12, color: t.textSecondary }}>
              Sending raw user requests directly to an LLM without an execution boundary or automated verification sensors.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', margin: '20px 0' }}>
            <div style={{ padding: '12px 18px', background: t.surface, borderRadius: 6, border: `1.5px solid ${t.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: t.textMuted }}>INPUT</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>Giant 10K Prompt</div>
            </div>
            <span style={{ color: t.textMuted }}>➔</span>
            <div style={{ padding: '12px 18px', background: `${t.accentSecondary}20`, borderRadius: 6, border: `1.5px solid ${t.accentSecondary}`, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: t.accentSecondary }}>MODEL</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>Bare LLM Call</div>
            </div>
            <span style={{ color: t.accentDanger }}>➔</span>
            <div style={{ padding: '12px 18px', background: `${t.accentDanger}20`, borderRadius: 6, border: `1.5px solid ${t.accentDanger}`, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: t.accentDanger }}>UNVALIDATED</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>"I have fixed all issues!"</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
            <div style={{ padding: 12, background: t.surface, borderRadius: 6, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.accentDanger }}>Premature Victory</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Model declares victory without compiling, typechecking, or running a single test.</div>
            </div>
            <div style={{ padding: 12, background: t.surface, borderRadius: 6, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.accentDanger }}>Context Rot</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>Raw build logs and massive file dumps overflow the window; attention collapses.</div>
            </div>
            <div style={{ padding: 12, background: t.surface, borderRadius: 6, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.accentDanger }}>Unbounded Blast Radius</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>No sandbox protection; commands run unsafely with potential data loss or regression.</div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Production Harness Pipeline Flow */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
            {HARNESS_STAGES.map((s) => {
              const color = t[s.colorKey];
              const isSelected = selectedStageId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStageId(s.id)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 6,
                    border: isSelected ? `2px solid ${color}` : `1px solid ${t.border}`,
                    background: isSelected ? `${color}18` : t.surface,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase' }}>{s.category}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, marginTop: 2 }}>{s.name.split('. ')[1]}</div>
                  <div style={{ fontSize: 9.5, color: t.textMuted, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.shortDesc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Stage Inspector */}
          <div
            style={{
              padding: 16,
              background: t.surface,
              borderRadius: 8,
              border: `1.5px solid ${t[selectedStage.colorKey]}`,
              boxShadow: `0 2px 12px ${t[selectedStage.colorKey]}15`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 700,
                    background: `${t[selectedStage.colorKey]}25`,
                    color: t[selectedStage.colorKey],
                    marginBottom: 6,
                  }}
                >
                  HARNESS COMPONENT: {selectedStage.category.toUpperCase()}
                </span>
                <h3 style={{ margin: 0, fontSize: 16, color: t.textPrimary }}>{selectedStage.name}</h3>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: t.textSecondary, maxWidth: 640 }}>
                  {selectedStage.fullDesc}
                </p>
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: t.surfaceAlt,
                  border: `1px solid ${t.border}`,
                  fontSize: 11,
                  fontFamily: HAND_FONT,
                  color: t[selectedStage.colorKey],
                  fontWeight: 600,
                }}
              >
                ✓ Guaranteed Invariant
              </div>
            </div>

            <div style={{ margin: '14px 0 10px', padding: '10px 14px', borderRadius: 6, background: t.surfaceAlt, borderLeft: `3px solid ${t[selectedStage.colorKey]}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Critical Invariant</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: t.textPrimary, marginTop: 2 }}>{selectedStage.invariant}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>HARNESS IMPLEMENTATION PATTERN:</div>
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 6,
                  background: t.mode === 'dark' ? '#0E1017' : '#2D3139',
                  color: '#E6EDF3',
                  fontSize: 11.5,
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  lineHeight: 1.45,
                }}
              >
                <code>{selectedStage.codeSnippet}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
