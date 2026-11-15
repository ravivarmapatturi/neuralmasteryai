export interface ChannelRanking {
  channel: string;
  weight: number;
  ranks: Record<string, number>; // docId -> 1-based rank
}

export interface HybridScoredDoc {
  id: string;
  title: string;
  lexicalRank: number;
  denseRank: number;
  channelScores: Record<string, number>;
  totalScore: number;
  fusedRank: number;
}

/**
 * Reciprocal Rank Fusion with optional channel weights:
 * RRF(d) = sum_{m in M} ( w_m / (k + r_m(d)) )
 */
export function computeRRFScore(
  rankings: { rank: number; weight?: number }[],
  k: number = 60
): number {
  return rankings.reduce((sum, item) => {
    const w = item.weight ?? 1.0;
    return sum + w / (k + item.rank);
  }, 0);
}

export function rankByRRF(
  docs: { id: string; title: string; lexicalRank: number; denseRank: number }[],
  k: number = 60,
  weightLex: number = 1.0,
  weightDense: number = 1.0
): HybridScoredDoc[] {
  const scored = docs.map((doc) => {
    const sLex = weightLex / (k + doc.lexicalRank);
    const sDense = weightDense / (k + doc.denseRank);
    const totalScore = sLex + sDense;
    return {
      ...doc,
      channelScores: {
        lexical: sLex,
        dense: sDense,
      },
      totalScore,
      fusedRank: 0,
    };
  });

  // Sort descending by total score
  scored.sort((a, b) => b.totalScore - a.totalScore);

  return scored.map((item, idx) => ({
    ...item,
    fusedRank: idx + 1,
  }));
}
