import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';

export default function OpenAIEntropyVisualizer() {
  const t = useVizTokens();
  const [entropyLevel, setEntropyLevel] = useState<number>(35);
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweptMetrics, setSweptMetrics] = useState({
    deadFunctionsPruned: 0,
    unusedImportsRemoved: 0,
    typeSignaturesHealed: 0,
  });

  const handleSimulateEntropy = () => {
    setEntropyLevel((prev) => Math.min(100, prev + 25));
  };

  const handleRunSweeper = () => {
    setIsSweeping(true);
    setTimeout(() => {
      setSweptMetrics({
        deadFunctionsPruned: 8,
        unusedImportsRemoved: 23,
        typeSignaturesHealed: 14,
      });
      setEntropyLevel(12);
      setIsSweeping(false);
    }, 700);
  };

  const handleReset = () => {
    setEntropyLevel(35);
    setSweptMetrics({
      deadFunctionsPruned: 0,
      unusedImportsRemoved: 0,
      typeSignaturesHealed: 0,
    });
  };

  const getHealthColor = () => {
    if (entropyLevel > 70) return t.accentDanger;
    if (entropyLevel > 40) return t.accentWarn;
    return t.accentPrimary;
  };

  const healthColor = getHealthColor();

  return (
    <VisualizationContainer footer="Ryan Lopopolo's 1M LoC OpenAI study demonstrated that autonomous coding agents generate rapid architectural entropy: orphaned helpers, duplicate logic, and loose types. A dedicated background entropy agent continuously scans and cleans the codebase, keeping test runs fast and hallucinations low.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentSecondary }}>
            OpenAI Codex 1M LoC Findings
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            Continuous Codebase Entropy & Sweeper Agent
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <VizButton onClick={handleSimulateEntropy} disabled={isSweeping || entropyLevel >= 100}>
            + Add Code Iterations
          </VizButton>
          <VizButton variant="secondary" onClick={handleRunSweeper} disabled={isSweeping || entropyLevel <= 15}>
            {isSweeping ? 'Sweeping AST...' : 'Run Entropy Sweeper'}
          </VizButton>
          <VizButton variant="secondary" onClick={handleReset}>
            Reset
          </VizButton>
        </div>
      </div>

      {/* Entropy Gauge */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Codebase Entropy & Technical Debt Level:
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: healthColor }}>
            {entropyLevel}% {entropyLevel > 70 ? '(Critical Degradation)' : entropyLevel > 40 ? '(Moderate Drift)' : '(Clean & Stable)'}
          </span>
        </div>

        <div
          style={{
            height: 24,
            width: '100%',
            background: t.background,
            borderRadius: 6,
            overflow: 'hidden',
            border: `1px solid ${t.border}`,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${entropyLevel}%`,
              background: healthColor,
              transition: 'width 0.4s ease, background-color 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
            AST Structural Tests
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: entropyLevel > 70 ? t.accentDanger : t.accentPrimary }}>
            {entropyLevel > 70 ? '14 Violations' : '0 Violations'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 4 }}>
            Guarantees architectural boundaries and disallowed imports.
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
            Dead Code & Unused Imports
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: entropyLevel > 50 ? t.accentWarn : t.accentTeal }}>
            {sweptMetrics.unusedImportsRemoved > 0 ? `-${sweptMetrics.unusedImportsRemoved} Pruned` : `${Math.round(entropyLevel * 0.4)} Warnings`}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 4 }}>
            Automated AST sweepers eliminate unused symbols without human triage.
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
            Pytest Execution Velocity
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: entropyLevel > 60 ? t.accentWarn : t.accentPrimary }}>
            {entropyLevel > 60 ? '4.8s (Bloated)' : '0.6s (Optimized)'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 4 }}>
            Fast test feedback keeps autonomous agent self-correction under 15 seconds.
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
