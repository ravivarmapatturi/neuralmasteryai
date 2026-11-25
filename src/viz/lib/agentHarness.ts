export type HarnessMode = 'harness' | 'naked';

export type CommandCategory = 'safe-test' | 'credential-probe' | 'destructive-rm' | 'network-exfil' | 'timeout-loop';

export interface CommandPreset {
  id: string;
  label: string;
  command: string;
}

export const HARNESS_COMMAND_PRESETS: readonly CommandPreset[] = [
  { id: 'pytest', label: 'Run pytest suite', command: 'pytest tests/test_router.py -v' },
  { id: 'ssh', label: 'Read ~/.ssh key', command: 'cat ~/.ssh/id_ed25519' },
  { id: 'rm', label: 'Delete workspace', command: 'rm -rf /workspace/*' },
  { id: 'loop', label: 'Runaway fork loop', command: 'python -c "while True: pass"' },
];

export interface CommandVerdict {
  category: CommandCategory;
  blockedByGate: boolean;
  exitStatus: '0 (passed)' | '1 (test failed)' | 'Blocked before run' | 'Timed out safely' | 'Host exposed!';
  blastRadius: string;
  reason: string;
}

export interface HarnessStageStep {
  id: 'context' | 'model' | 'sandbox' | 'verifier' | 'state';
  label: string;
  shortRole: string;
  explain: string;
}

export interface HarnessArchitectureAnalysis {
  mode: HarnessMode;
  command: string;
  tokenBudget: number;
  timeoutSeconds: number;
  usedTokens: number;
  contextLoadPct: number;
  contextOverBudget: boolean;
  verdict: CommandVerdict;
  prematureVictoryRisk: '0% (checked by exit code)' | 'High (unverified model claim)';
  hostFilesAtRisk: number;
  trace: HarnessStageStep[];
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Classifies a model-proposed command using explicit safety patterns that a
 * pre-dispatch gate and sandbox enforce before anything touches the host.
 */
export function classifyProposedCommand(
  rawCommand: string,
  mode: HarnessMode,
  timeoutSeconds: number,
): CommandVerdict {
  const cmd = rawCommand.trim() || 'pytest tests/test_router.py -v';
  const lower = cmd.toLowerCase();

  const isCredentialProbe =
    lower.includes('.ssh') ||
    lower.includes('.aws') ||
    lower.includes('/etc/shadow') ||
    lower.includes('printenv') ||
    /\benv\b/.test(lower);

  const isDestructive =
    lower.includes('rm -rf') ||
    lower.includes('mkfs') ||
    lower.includes('dd if=') ||
    lower.includes('> /dev/');

  const isNetworkExfil =
    lower.includes('curl ') ||
    lower.includes('wget ') ||
    lower.includes('nc ');

  const isInfiniteLoop =
    lower.includes('while true') ||
    lower.includes('fork()') ||
    lower.includes(':(){');

  if (isCredentialProbe) {
    return mode === 'harness'
      ? {
          category: 'credential-probe',
          blockedByGate: true,
          exitStatus: 'Blocked before run',
          blastRadius: '0 host secrets (path unmapped)',
          reason: 'The pre-dispatch gate blocks credential paths (~/.ssh, ~/.aws, env) before the command starts.',
        }
      : {
          category: 'credential-probe',
          blockedByGate: false,
          exitStatus: 'Host exposed!',
          blastRadius: 'SSH/cloud secrets dumped into prompt',
          reason: 'With no sandbox jail, the shell reads your local keys and prints them straight out.',
        };
  }

  if (isDestructive) {
    return mode === 'harness'
      ? {
          category: 'destructive-rm',
          blockedByGate: true,
          exitStatus: 'Blocked before run',
          blastRadius: '0 host files (read-only root)',
          reason: 'The safety gate rejects recursive deletion (rm -rf), and root mounts stay read-only.',
        }
      : {
          category: 'destructive-rm',
          blockedByGate: false,
          exitStatus: 'Host exposed!',
          blastRadius: 'Host workspace files deleted',
          reason: 'Without a path jail, destructive cleanup runs directly on your machine.',
        };
  }

  if (isNetworkExfil) {
    return mode === 'harness'
      ? {
          category: 'network-exfil',
          blockedByGate: true,
          exitStatus: 'Blocked before run',
          blastRadius: '0 outbound bytes (network off)',
          reason: 'The sandbox disables outbound sockets, so external network calls fail before leaving the container.',
        }
      : {
          category: 'network-exfil',
          blockedByGate: false,
          exitStatus: 'Host exposed!',
          blastRadius: 'Outbound network call sent live',
          reason: 'Bare shell access allows unrestricted outbound connections to external servers.',
        };
  }

  if (isInfiniteLoop) {
    return mode === 'harness'
      ? {
          category: 'timeout-loop',
          blockedByGate: false,
          exitStatus: 'Timed out safely',
          blastRadius: `Stopped after ${timeoutSeconds}s limit`,
          reason: `The sandbox kills the whole process group once ${timeoutSeconds}s elapse, leaving the host responsive.`,
        }
      : {
          category: 'timeout-loop',
          blockedByGate: false,
          exitStatus: 'Host exposed!',
          blastRadius: 'Orphaned worker hangs CPU',
          reason: 'Without process-group supervision and timeouts, runaway loops tie up the host CPU.',
        };
  }

  return mode === 'harness'
    ? {
        category: 'safe-test',
        blockedByGate: false,
        exitStatus: '0 (passed)',
        blastRadius: 'Workspace only (isolated dir)',
        reason: 'Command passes schema check, runs inside the isolated workspace, and returns real exit code 0.',
      }
    : {
        category: 'safe-test',
        blockedByGate: false,
        exitStatus: '0 (passed)',
        blastRadius: 'Unsandboxed host execution',
        reason: 'The command runs directly on your host, and the model trusts its own text instead of verifying all layers.',
      };
}

export function analyzeAgentHarness({
  mode,
  command,
  tokenBudget,
  timeoutSeconds,
}: {
  mode: HarnessMode;
  command: string;
  tokenBudget: number;
  timeoutSeconds: number;
}): HarnessArchitectureAnalysis {
  const cleanMode: HarnessMode = mode === 'naked' ? 'naked' : 'harness';
  const cleanBudget = clampInt(tokenBudget, 4000, 128000);
  const cleanTimeout = clampInt(timeoutSeconds, 1, 60);
  const cleanCommand = command.trim() || HARNESS_COMMAND_PRESETS[0].command;

  const verdict = classifyProposedCommand(cleanCommand, cleanMode, cleanTimeout);

  // Scoped map + compacted state stays compact (~6,800 tokens); unmanaged logs bloat (~38,400 tokens).
  const usedTokens = cleanMode === 'harness' ? 6800 : 38400;
  const contextLoadPct = Math.round((usedTokens / cleanBudget) * 100);
  const contextOverBudget = usedTokens > cleanBudget;
  const hostFilesAtRisk = cleanMode === 'naked' ? (verdict.category === 'safe-test' ? 12 : 100) : 0;

  const trace: HarnessStageStep[] = cleanMode === 'harness'
    ? [
        {
          id: 'context',
          label: '1. Context assembler',
          shortRole: 'Scoped map + rules',
          explain: `Loads only the relevant repository map and task checklist (${usedTokens.toLocaleString('en-US')} of ${cleanBudget.toLocaleString('en-US')} tokens = ${contextLoadPct}%), preventing context rot.`,
        },
        {
          id: 'model',
          label: '2. AI model',
          shortRole: 'Proposes command',
          explain: `The model cannot touch your machine; it only proposes a structured command ("${cleanCommand}").`,
        },
        {
          id: 'sandbox',
          label: '3. Gate & sandbox',
          shortRole: 'Schema + jail',
          explain: verdict.blockedByGate
            ? verdict.reason
            : `Checks schema rules and runs "${cleanCommand}" inside a sealed workspace with a ${cleanTimeout}s timeout.`,
        },
        {
          id: 'verifier',
          label: '4. 3-layer verifier',
          shortRole: 'Static + tests + probe',
          explain: verdict.blockedByGate
            ? 'Blocked command produces a structured safety sensor message instead of letting the model claim success.'
            : 'Runs lint/typecheck, unit tests, and runtime checks. Real exit codes—never model promises—decide if the task passed.',
        },
        {
          id: 'state',
          label: '5. State compactor',
          shortRole: 'Save checklist + diff',
          explain: 'Saves verified pass/fail facts and summarizes long logs back to ~6,800 clean tokens for the next turn.',
        },
      ]
    : [
        {
          id: 'context',
          label: '1. Giant raw prompt',
          shortRole: 'Unbounded dump',
          explain: `Pastes full files and raw terminal output (${usedTokens.toLocaleString('en-US')} tokens vs ${cleanBudget.toLocaleString('en-US')} budget = ${contextLoadPct}%).`,
        },
        {
          id: 'model',
          label: '2. Bare AI model',
          shortRole: 'Unchecked call',
          explain: `Predicts "${cleanCommand}" directly with no structured safety gate or permission boundaries.`,
        },
        {
          id: 'sandbox',
          label: '3. Host shell (no jail)',
          shortRole: 'Direct machine access',
          explain: verdict.reason,
        },
        {
          id: 'verifier',
          label: '4. No verifier',
          shortRole: 'Model guesses "Done!"',
          explain: 'Premature victory: without automated test/lint checks, the model writes "All tests pass!" even when code is broken.',
        },
        {
          id: 'state',
          label: '5. Lost state',
          shortRole: 'Context amnesia',
          explain: 'No external checklist or compaction: after a few turns or a restart, the model forgets what broke and repeats mistakes.',
        },
      ];

  return {
    mode: cleanMode,
    command: cleanCommand,
    tokenBudget: cleanBudget,
    timeoutSeconds: cleanTimeout,
    usedTokens,
    contextLoadPct,
    contextOverBudget,
    verdict,
    prematureVictoryRisk: cleanMode === 'harness' ? '0% (checked by exit code)' : 'High (unverified model claim)',
    hostFilesAtRisk,
    trace,
  };
}
