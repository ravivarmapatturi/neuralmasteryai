import { useMemo, useState, useEffect } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { playMatch, type EloModel } from '../lib/humanEval';

const INITIAL: EloModel[] = [
  { name: 'Model A', trueSkill: 220, rating: 1200 },
  { name: 'Model B', trueSkill: 80, rating: 1200 },
  { name: 'Model C', trueSkill: -150, rating: 1200 },
];

export default function EloRatingDiagram() {
  const t = useVizTokens();
  const prefersReduced = usePrefersReducedMotion();
  const [matchCount, setMatchCount] = useState(0);
  const [models, setModels] = useState(INITIAL);
  const [autoSim, setAutoSim] = useState(!prefersReduced);

  const trueOrder = useMemo(() => [...INITIAL].sort((a, b) => b.trueSkill - a.trueSkill).map((m) => m.name), []);
  const currentOrder = [...models].sort((a, b) => b.rating - a.rating).map((m) => m.name);
  const orderMatches = trueOrder.every((name, i) => name === currentOrder[i]);

  const runMatches = (n: number) => {
    let current = models;
    for (let i = 0; i < n; i++) current = playMatch(current, matchCount + i + 1);
    setModels(current);
    setMatchCount((c) => c + n);
  };

  useEffect(() => {
    if (!autoSim || prefersReduced) return;
    const timer = setInterval(() => {
      setMatchCount((c) => {
        if (c >= 40) {
          setModels(INITIAL);
          return 0;
        }
        let next = models;
        for (let i = 0; i < 5; i++) next = playMatch(next, c + i + 1);
        setModels(next);
        return c + 5;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [autoSim, prefersReduced, models]);

  const maxRating = Math.max(...models.map((m) => m.rating), 1300);
  const minRating = Math.min(...models.map((m) => m.rating), 1100);

  return (
    <VisualizationContainer footer={`${matchCount} real pairwise matches played (each with a real, hidden win probability derived from true skill, and a real Elo update after every result: rating += K·(actual − expected)). Current Elo order ${orderMatches ? 'matches' : 'does not yet match'} the real hidden skill order (${trueOrder.join(' > ')}) -- Elo needs enough real match volume to converge, exactly like the statistical-power point above applied to ranking instead of A/B testing.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {models.map((m) => (
          <div key={m.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: t.textPrimary, fontWeight: 700 }}>{m.name}</span>
              <span style={{ color: t.textMuted, fontFamily: 'monospace' }}>{m.rating.toFixed(0)}</span>
            </div>
            <div style={{ background: t.surfaceAlt, borderRadius: 4, height: 14 }}>
              <div style={{ width: `${((m.rating - minRating + 50) / (maxRating - minRating + 100)) * 100}%`, height: '100%', background: t.accentPrimary, borderRadius: 4, transition: 'width 200ms ease' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        <VizButton onClick={() => { setAutoSim(false); runMatches(10); }}>Play 10 matches</VizButton>
        <VizButton variant="secondary" onClick={() => { setAutoSim(false); setModels(INITIAL); setMatchCount(0); }}>Reset</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Pairwise comparisons update ratings incrementally: true skill differences require sufficient match volume to emerge reliably from stochastic match outcomes. The exact rating-system math chess (Elo) uses, and directly what LMSYS's Chatbot Arena runs at scale on real human pairwise preferences.
      </div>
    </VisualizationContainer>
  );
}
