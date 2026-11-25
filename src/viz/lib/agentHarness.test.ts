import { describe, expect, it } from 'vitest';
import { analyzeAgentHarness, classifyProposedCommand } from './agentHarness';

describe('agentHarness pure calculations', () => {
  it('blocks credential reads and destructive rm commands in harness mode while exposing them in naked mode', () => {
    const sshSafe = classifyProposedCommand('cat ~/.ssh/id_ed25519', 'harness', 15);
    const sshNaked = classifyProposedCommand('cat ~/.ssh/id_ed25519', 'naked', 15);
    expect(sshSafe.blockedByGate).toBe(true);
    expect(sshSafe.exitStatus).toBe('Blocked before run');
    expect(sshNaked.blockedByGate).toBe(false);
    expect(sshNaked.exitStatus).toBe('Host exposed!');

    const rmSafe = classifyProposedCommand('rm -rf /workspace/*', 'harness', 15);
    expect(rmSafe.blockedByGate).toBe(true);
    expect(rmSafe.category).toBe('destructive-rm');
  });

  it('hand-checks context budget load percentages and runaway timeout protection', () => {
    const harness = analyzeAgentHarness({
      mode: 'harness',
      command: 'python -c "while True: pass"',
      tokenBudget: 32000,
      timeoutSeconds: 12,
    });
    // Hand-checked: 6800 / 32000 = 21.25% -> 21%
    expect(harness.usedTokens).toBe(6800);
    expect(harness.contextLoadPct).toBe(21);
    expect(harness.contextOverBudget).toBe(false);
    expect(harness.verdict.exitStatus).toBe('Timed out safely');
    expect(harness.verdict.blastRadius).toContain('12s');
    expect(harness.hostFilesAtRisk).toBe(0);

    const naked = analyzeAgentHarness({
      mode: 'naked',
      command: 'pytest tests/test_router.py -v',
      tokenBudget: 32000,
      timeoutSeconds: 12,
    });
    // Hand-checked: 38400 / 32000 = 120% -> over budget!
    expect(naked.usedTokens).toBe(38400);
    expect(naked.contextLoadPct).toBe(120);
    expect(naked.contextOverBudget).toBe(true);
    expect(naked.prematureVictoryRisk).toContain('High');
    expect(naked.trace).toHaveLength(5);
  });
});
