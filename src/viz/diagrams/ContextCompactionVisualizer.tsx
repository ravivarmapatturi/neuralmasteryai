import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PillSelect } from '../primitives';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

export default function ContextCompactionVisualizer() {
  const t = useVizTokens();
  const [turns, setTurns] = useState<number>(12);
  const [mode, setMode] = useState<'naive' | 'compacted'>('compacted');

  // Model parameters
  const CONTEXT_LIMIT = 128000;
  const SYSTEM_PROMPT_TOKENS = 3500;
  const TOOL_SCHEMAS_TOKENS = 2200;

  // Uncompacted calculation: every turn adds ~8,000 tokens of file content, diffs, and tool output
  const naiveTurnTokens = turns * 8500;
  const naiveTotal = SYSTEM_PROMPT_TOKENS + TOOL_SCHEMAS_TOKENS + naiveTurnTokens;

  // Compacted calculation:
  // Every 4 turns, harness summarizes tool traces into a state checklist (`feature_list.json` ~1,200 tokens)
  // plus recent 2 turns of working context (~7,000 tokens)
  const compactedStateArtifact = Math.min(turns * 250, 2400); // structured state tracker
  const activeWorkingMemory = Math.min(turns, 3) * 3200; // only last 2-3 turns of active interaction
  const compactedTotal = SYSTEM_PROMPT_TOKENS + TOOL_SCHEMAS_TOKENS + compactedStateArtifact + activeWorkingMemory;

  const currentTotal = mode === 'naive' ? naiveTotal : compactedTotal;
  const percentageOfLimit = Math.min(100, (currentTotal / CONTEXT_LIMIT) * 100);
  const isOverflowing = currentTotal > CONTEXT_LIMIT;

  return (
    <VisualizationContainer
      footer={
        mode === 'compacted'
          ? "Harness Compaction: Old tool traces and raw file reads are pruned into a structured state artifact (feature_list.json) and recent working memory. Token usage stays bounded under 18k tokens across 20+ turns, preserving sharp model attention."
          : "Naive Accumulation: Without harness compaction, raw stdout, test logs, and whole-file reads compound quadratically, saturating the 128k context window and inducing severe attention rot by turn 15."
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <PillSelect<'compacted' | 'naive'>
          label="Strategy"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'compacted', label: 'Harness Compaction (State Artifacts)' },
            { value: 'naive', label: 'Naive (Full History Accumulation)' },
          ]}
        />
        <div style={{ fontSize: 12, fontFamily: HAND_FONT, color: t.textSecondary }}>
          Context Health: <strong style={{ color: isOverflowing ? t.accentDanger : percentageOfLimit > 60 ? t.accentWarn : t.accentPrimary }}>
            {isOverflowing ? 'Overflow / Failure' : percentageOfLimit > 60 ? 'Degraded Attention' : 'Optimal Focus'}
          </strong>
        </div>
      </div>

      <Slider
        label={`Agent Conversation Turn: ${turns} turns`}
        min={1}
        max={20}
        step={1}
        value={turns}
        onChange={setTurns}
      />

      {/* Context Window Capacity Bar */}
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4 }}>
          <span>CONTEXT USAGE: {currentTotal.toLocaleString()} / {CONTEXT_LIMIT.toLocaleString()} TOKENS ({percentageOfLimit.toFixed(1)}%)</span>
          <span>WINDOW LIMIT: 128K</span>
        </div>
        <div style={{ width: '100%', height: 26, background: t.surfaceAlt, borderRadius: 6, overflow: 'hidden', border: `1px solid ${t.border}`, display: 'flex' }}>
          <div
            style={{
              width: `${Math.min(100, (SYSTEM_PROMPT_TOKENS / CONTEXT_LIMIT) * 100)}%`,
              background: t.accentPurple,
              height: '100%',
            }}
            title={`System Prompt: ${SYSTEM_PROMPT_TOKENS} tokens`}
          />
          <div
            style={{
              width: `${Math.min(100, (TOOL_SCHEMAS_TOKENS / CONTEXT_LIMIT) * 100)}%`,
              background: t.accentSecondary,
              height: '100%',
            }}
            title={`Tool Schemas: ${TOOL_SCHEMAS_TOKENS} tokens`}
          />
          {mode === 'compacted' ? (
            <>
              <div
                style={{
                  width: `${Math.min(100, (compactedStateArtifact / CONTEXT_LIMIT) * 100)}%`,
                  background: t.accentTeal,
                  height: '100%',
                }}
                title={`State Artifact (feature_list.json): ${compactedStateArtifact} tokens`}
              />
              <div
                style={{
                  width: `${Math.min(100, (activeWorkingMemory / CONTEXT_LIMIT) * 100)}%`,
                  background: t.accentPrimary,
                  height: '100%',
                }}
                title={`Active Working Memory: ${activeWorkingMemory} tokens`}
              />
            </>
          ) : (
            <div
              style={{
                width: `${Math.min(100, (naiveTurnTokens / CONTEXT_LIMIT) * 100)}%`,
                background: isOverflowing ? t.accentDanger : t.accentWarn,
                height: '100%',
              }}
              title={`Raw Turn Churn: ${naiveTurnTokens} tokens`}
            />
          )}
        </div>
      </div>

      {/* Legend & Token Breakdown */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: t.textSecondary, marginTop: 10, marginBottom: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: t.accentPurple }} />
          System Rules ({SYSTEM_PROMPT_TOKENS} tok)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: t.accentSecondary }} />
          Tool Definitions ({TOOL_SCHEMAS_TOKENS} tok)
        </span>
        {mode === 'compacted' ? (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: t.accentTeal }} />
              State Artifacts ({compactedStateArtifact} tok)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: t.accentPrimary }} />
              Working Memory ({activeWorkingMemory} tok)
            </span>
          </>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: isOverflowing ? t.accentDanger : t.accentWarn }} />
            Accumulated Churn & Logs ({naiveTurnTokens.toLocaleString()} tok)
          </span>
        )}
      </div>

      {/* Comparison Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <div style={{ padding: 10, borderRadius: 6, background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted }}>EFFECTIVE ATTENTION RETENTION</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: mode === 'compacted' ? t.accentPrimary : percentageOfLimit > 80 ? t.accentDanger : t.accentWarn, marginTop: 2 }}>
            {mode === 'compacted' ? '98.5% (High)' : percentageOfLimit > 90 ? '14.2% (Severe Degradation)' : '58.0% (Distracted)'}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            {mode === 'compacted' ? 'Model attends sharply to current task constraints.' : 'Attention heads diffuse across dead terminal logs and file dumps.'}
          </div>
        </div>

        <div style={{ padding: 10, borderRadius: 6, background: t.surface, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted }}>ESTIMATED COST PER STEP</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: mode === 'compacted' ? t.accentPrimary : t.textPrimary, marginTop: 2 }}>
            {mode === 'compacted' ? '$0.04 / turn' : `$${((currentTotal / 1000) * 0.003).toFixed(2)} / turn`}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            {mode === 'compacted' ? 'Fixed predictable token budget.' : 'Cost accelerates linearly every single step.'}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
