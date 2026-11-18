import React, { useState } from 'react';
import { useVizTokens, RADIUS, SPACING } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect, useAutoCycle } from '../primitives';

type SystemMode = 'search' | 'recommendation';

interface StageInfo {
  id: number;
  title: string;
  volume: string;
  latency: string;
  searchAction: string;
  recAction: string;
  exampleState: string;
}

const STAGES: StageInfo[] = [
  {
    id: 1,
    title: '1. Candidate Generation',
    volume: '1M → 1,000 items',
    latency: '~10–20 ms',
    searchAction: 'Sparse BM25 & dense vector ANN match explicit query tokens.',
    recAction: 'Two-tower embeddings & collaborative filtering match user history.',
    exampleState: 'Item H1 (Noise-Cancelling Headphones) retrieved in top 1,000 candidates.',
  },
  {
    id: 2,
    title: '2. Hard Filtering',
    volume: '1,000 → 400 items',
    latency: '~2–5 ms',
    searchAction: 'Enforce inventory availability, shipping radius, and age gates.',
    recAction: 'Enforce user blocklists, region licenses, and out-of-stock exclusions.',
    exampleState: 'Item H1 verified in-stock in user region (Cable C4 excluded: out of stock).',
  },
  {
    id: 3,
    title: '3. Ranking / Scoring',
    volume: '400 → 50 items',
    latency: '~15–25 ms',
    searchAction: 'GBDT / Neural Ranker predicts P(click) and relevance score.',
    recAction: 'Deep Ranking Network (DLRM) predicts P(conversion) and dwell time.',
    exampleState: 'Item H1 scores 0.94; H3 scores 0.88; Earbuds E2 scores 0.82; Speaker S5 scores 0.71.',
  },
  {
    id: 4,
    title: '4. Re-Ranking & Rules',
    volume: '50 → 10 items',
    latency: '~3–5 ms',
    searchAction: 'Enforce brand diversity, freshness boost, and sponsored disclosures.',
    recAction: 'Deduplicate series, balance category exploration, and cap same-creator items.',
    exampleState: 'H1 placed at rank 1; rank 2 allocated to E2 for brand diversity instead of H3.',
  },
  {
    id: 5,
    title: '5. Serving & UI',
    volume: '10 items',
    latency: '<5 ms',
    searchAction: 'Package final JSON payload with titles, snippets, and tracking tokens.',
    recAction: 'Package personalized carousel cards with recommendation attribution tags.',
    exampleState: 'H1 rendered at slot 1 with price, badges, and click telemetry tokens.',
  },
];

export default function SearchRecommendationPipelineDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<SystemMode>('search');
  const stageCycle = useAutoCycle(STAGES.length, 2200);
  const activeStageIndex = stageCycle.value;

  const activeStage = STAGES[activeStageIndex];
  const isSearch = mode === 'search';
  const accentColor = isSearch ? t.accentPrimary : t.accentTeal;

  return (
    <VisualizationContainer
      title="The Unified Search & Recommendation Pipeline"
      footer={
        `Both search and recommendations run through the same five-stage linear funnel: candidate generation reduces ` +
        `millions to hundreds, filtering drops invalid items, ranking scores survivors, re-ranking balances business ` +
        `rules, and serving packages the final payload. In ${isSearch ? 'search' : 'recommendation'} mode, ${activeStage.title} ` +
        `processes an illustrative ${activeStage.volume} within an illustrative ${activeStage.latency}. All stage counts, ` +
        `latencies, and candidate scores are illustrative walkthrough examples; production figures vary by system architecture and workload.`
      }
    >
      <VisualizationHeader
        eyebrow="Architectural Pattern · Illustrative Funnel"
        title="Unified Funnel: From Millions of Items to a Ranked Top-10"
        description="Search starts with an explicit query; recommendations start with a user context. Both flow through the same linear pipeline stages. All stage item counts and latency figures are illustrative examples; production numbers vary widely by system architecture, corpus scale, and workload."
      />

      <div style={{ marginBottom: SPACING.sm }}>
        <PillSelect<SystemMode>
          label="Pipeline Input Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'search', label: 'Search (Explicit Query: "wireless headphones")' },
            { value: 'recommendation', label: 'Recommendation (User Context: "Audio enthusiast")' },
          ]}
        />
      </div>

      {/* Prominent Illustrative Example Notice */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS.md,
          padding: '8px 12px',
          marginBottom: SPACING.sm,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          lineHeight: 1.4,
          color: t.textSecondary,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: RADIUS.sm,
            background: `${accentColor}20`,
            color: accentColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Illustrative Example
        </span>
        <span>
          Stage volume, latency, and candidate lifecycle values are illustrative walkthrough figures. Actual counts and latency vary by system and workload.
        </span>
      </div>

      {/* Stage Selection Steps */}
      <div
        role="tablist"
        aria-label="Pipeline stages"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 6,
          marginBottom: SPACING.md,
        }}
      >
        {STAGES.map((stage, idx) => {
          const isSelected = idx === activeStageIndex;
          return (
            <button
              key={stage.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => stageCycle.pick(idx)}
              style={{
                background: isSelected ? `${accentColor}18` : t.surfaceAlt,
                border: `1.5px solid ${isSelected ? accentColor : t.border}`,
                borderRadius: RADIUS.md,
                padding: '8px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isSelected ? accentColor : t.textPrimary,
                  lineHeight: 1.2,
                  marginBottom: 3,
                }}
              >
                {stage.title.split('. ')[1]}
              </div>
              <div style={{ fontSize: 10, color: t.textMuted }}>{stage.volume}</div>
            </button>
          );
        })}
      </div>

      {/* Stage Detail Card */}
      <div
        style={{
          background: t.surfaceAlt,
          border: `1px solid ${t.border}`,
          borderRadius: RADIUS.lg,
          padding: SPACING.md,
          marginBottom: SPACING.md,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
            Stage {activeStage.id}: {activeStage.title.split('. ')[1]}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: RADIUS.sm,
                background: `${accentColor}22`,
                color: accentColor,
                fontWeight: 600,
              }}
            >
              Illustrative Volume: {activeStage.volume}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: RADIUS.sm,
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.textSecondary,
                fontWeight: 600,
              }}
            >
              Illustrative Latency: {activeStage.latency}
            </span>
          </div>
        </div>

        <div style={{ fontSize: 13, color: t.textPrimary, lineHeight: 1.5, marginBottom: 10 }}>
          {isSearch ? activeStage.searchAction : activeStage.recAction}
        </div>

        {/* Candidate Item Journey Callout */}
        <div
          style={{
            background: t.surface,
            borderLeft: `3px solid ${accentColor}`,
            padding: '8px 12px',
            borderRadius: `0 ${RADIUS.sm}px ${RADIUS.sm}px 0`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
            Illustrative Item Lifecycle & Scores (Candidate H1)
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>
            {activeStage.exampleState}
          </div>
        </div>
      </div>

      {/* Linear Pipeline Progress Visual */}
      <div
        style={{
          padding: '10px 14px',
          background: t.surface,
          borderRadius: RADIUS.md,
          border: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: 11,
        }}
      >
        <span style={{ color: t.textMuted }}>Request Input</span>
        <span style={{ color: t.textMuted }}>→</span>
        {STAGES.map((s, i) => (
          <React.Fragment key={s.id}>
            <span
              style={{
                fontWeight: i === activeStageIndex ? 700 : 500,
                color: i === activeStageIndex ? accentColor : i < activeStageIndex ? t.textPrimary : t.textMuted,
              }}
            >
              {s.title.split('. ')[1]}
            </span>
            {i < STAGES.length - 1 && <span style={{ color: t.textMuted }}>→</span>}
          </React.Fragment>
        ))}
        <span style={{ color: t.textMuted }}>→</span>
        <span style={{ color: accentColor, fontWeight: 700 }}>Client UI</span>
      </div>
    </VisualizationContainer>
  );
}
