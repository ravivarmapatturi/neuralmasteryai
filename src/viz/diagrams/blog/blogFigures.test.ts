import { describe, expect, it } from 'vitest';
import { sessionCost } from './AgentTurnCost';
import { recallError } from './DeltaRuleMemory';
import { positions } from './EmbeddingCollapse';
import { suspicion } from './TransitionSuspicion';

describe('blog figure maths matches the posts', () => {
  it('session cost reproduces the numbers printed by the post\'s session_cost()', () => {
    expect(sessionCost(40).total).toBeCloseTo(0.135, 3);
    expect(sessionCost(40, 200, false).total).toBeCloseTo(0.690, 3);
    expect(sessionCost(40, 100).total).toBeCloseTo(0.124, 3);
    expect(sessionCost(30).total).toBeCloseTo(0.095, 3);
  });
  it('the delta rule returns the new value; plain linear attention keeps the old one', () => {
    const plain = recallError(20, false), delta = recallError(20, true);
    expect(delta.err).toBeLessThan(1e-6);
    expect(plain.err).toBeGreaterThan(0.9);
    expect(plain.oldLeft).toBeGreaterThan(0.8);
  });
  it('collapse happens only without the variance term', () => {
    const spread = (p: ReturnType<typeof positions>) => Math.hypot(p[0].a.x - p[4].a.x, p[0].a.y - p[4].a.y);
    expect(spread(positions(1, false))).toBeLessThan(0.1);
    expect(spread(positions(1, true))).toBeGreaterThan(1);
  });
  it('an expected screen scores low, an unexpected one high', () => {
    expect(suspicion('order', 'order')).toBeCloseTo(0, 5);
    expect(suspicion('order', 'login')).toBeGreaterThan(0.3);
  });
});
