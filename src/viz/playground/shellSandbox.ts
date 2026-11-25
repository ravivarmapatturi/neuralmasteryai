export interface SampleFile {
  name: string;
  description: string;
  content: string;
}

export const SAMPLE_WORKSPACE_FILES: SampleFile[] = [
  {
    name: 'api.log',
    description: 'HTTP gateway & inference error log (8 lines)',
    content: [
      '2026-11-25T10:01:02Z INFO POST /v1/chat 200 142ms model=llama3-8b',
      '2026-11-25T10:01:05Z WARN POST /v1/chat 429 18ms retry_after=2s',
      '2026-11-25T10:01:09Z ERROR POST /v1/embed 502 5003ms upstream=timeout',
      '2026-11-25T10:01:12Z INFO GET /health 200 4ms worker=gpu-01',
      '2026-11-25T10:01:18Z ERROR POST /v1/chat 503 1205ms oom=kv_cache',
      '2026-11-25T10:01:21Z info POST /v1/chat 200 98ms cache=hit',
      '2026-11-25T10:01:25Z ERROR POST /v1/rerank 500 842ms cuda_oom',
      '2026-11-25T10:01:30Z INFO POST /v1/chat 200 115ms cache=hit',
    ].join('\n'),
  },
  {
    name: 'metrics.jsonl',
    description: 'JSON Lines trace metrics (4 records)',
    content: [
      '{"route":"/v1/chat","status":200,"latency_ms":142,"cache":"hit"}',
      '{"route":"/v1/embed","status":502,"latency_ms":5003,"cache":"miss"}',
      '{"route":"/v1/chat","status":503,"latency_ms":1205,"cache":"miss"}',
      '{"route":"/v1/rerank","status":200,"latency_ms":89,"cache":"hit"}',
    ].join('\n'),
  },
  {
    name: 'eval_runs.csv',
    description: 'CSV evaluation suite history (5 rows)',
    content: [
      'run_id,model,pass_rate,cost_usd',
      'run_101,llama3-8b,0.81,1.40',
      'run_102,qwen2.5-7b,0.86,1.15',
      'run_103,llama3-8b-lora,0.91,1.45',
      'run_104,qwen2.5-7b-quant,0.84,0.65',
    ].join('\n'),
  },
  {
    name: 'containers.json',
    description: 'Simulated local container state for docker ps',
    content: JSON.stringify(
      [
        { id: 'c91a4f', image: 'vllm/vllm-openai:v0.6', status: 'Up 3 hours', state: 'running', name: 'vllm-prod' },
        { id: 'b42e09', image: 'qdrant/qdrant:v1.11', status: 'Up 3 hours', state: 'running', name: 'vec-db' },
        { id: 'a17d88', image: 'ghcr.io/eval-runner:latest', status: 'Exited (137) 10 mins ago', state: 'exited', name: 'eval-job' },
        { id: 'f03c11', image: 'redis:7.4-alpine', status: 'Up 2 days', state: 'running', name: 'prompt-cache' },
      ],
      null,
      2,
    ),
  },
  {
    name: 'pods.json',
    description: 'Simulated cluster pods for kubectl get pods',
    content: JSON.stringify(
      [
        { namespace: 'inference', name: 'vllm-worker-7c9f', ready: '1/1', phase: 'Running', restarts: 0, node: 'gpu-node-a' },
        { namespace: 'inference', name: 'vllm-worker-2a1d', ready: '0/1', phase: 'Pending', restarts: 0, node: 'unscheduled' },
        { namespace: 'kube-system', name: 'nvidia-device-plugin-8k2m', ready: '1/1', phase: 'Running', restarts: 1, node: 'gpu-node-a' },
        { namespace: 'evals', name: 'nightly-judge-4f8b', ready: '0/1', phase: 'Failed', restarts: 3, node: 'cpu-node-b' },
      ],
      null,
      2,
    ),
  },
];

export interface PipelineStageTrace {
  command: string;
  stdin: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PipelineRunResult {
  stages: PipelineStageTrace[];
  finalStdout: string;
  finalStderr: string;
  finalExitCode: number;
}

function tokenizeArgs(segment: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < segment.length; i += 1) {
    const ch = segment[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function getFileContent(filename: string): string | null {
  const found = SAMPLE_WORKSPACE_FILES.find((f) => f.name === filename);
  return found ? found.content : null;
}

function runSingleStage(commandLine: string, stdin: string, isFirstStage: boolean): PipelineStageTrace {
  const tokens = tokenizeArgs(commandLine.trim());
  if (tokens.length === 0) {
    return { command: commandLine, stdin, stdout: '', stderr: 'Empty pipeline stage.', exitCode: 2 };
  }

  const cmd = tokens[0];
  const args = tokens.slice(1);

  if (cmd === 'cat') {
    const file = args[0];
    if (!file) return { command: commandLine, stdin, stdout: stdin, stderr: '', exitCode: 0 };
    const content = getFileContent(file);
    if (content === null) {
      return { command: commandLine, stdin, stdout: '', stderr: `cat: ${file}: No such sample file`, exitCode: 1 };
    }
    return { command: commandLine, stdin, stdout: content, stderr: '', exitCode: 0 };
  }

  if (cmd === 'grep') {
    let ignoreCase = false;
    let invert = false;
    let lineNumbers = false;
    let countOnly = false;
    const positional: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        for (const flag of arg.slice(1)) {
          if (flag === 'i') ignoreCase = true;
          else if (flag === 'v') invert = true;
          else if (flag === 'n') lineNumbers = true;
          else if (flag === 'c') countOnly = true;
          else {
            return {
              command: commandLine,
              stdin,
              stdout: '',
              stderr: `grep: unsupported flag -${flag} in sandbox`,
              exitCode: 2,
            };
          }
        }
      } else {
        positional.push(arg);
      }
    }

    const pattern = positional[0] ?? '';
    const fileArg = positional[1];
    let source = stdin;
    if (fileArg) {
      const content = getFileContent(fileArg);
      if (content === null) {
        return { command: commandLine, stdin, stdout: '', stderr: `grep: ${fileArg}: No such sample file`, exitCode: 2 };
      }
      source = content;
    } else if (isFirstStage && !stdin) {
      return { command: commandLine, stdin, stdout: '', stderr: 'grep: missing file or piped stdin', exitCode: 2 };
    }

    if (!pattern) {
      return { command: commandLine, stdin, stdout: '', stderr: 'grep: missing search pattern', exitCode: 2 };
    }

    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ignoreCase ? 'i' : '');
    const lines = source ? source.split('\n') : [];
    const matched: string[] = [];

    lines.forEach((line, idx) => {
      const hit = regex.test(line);
      const keep = invert ? !hit : hit;
      if (keep) {
        matched.push(lineNumbers ? `${idx + 1}:${line}` : line);
      }
    });

    if (countOnly) {
      return {
        command: commandLine,
        stdin,
        stdout: String(matched.length),
        stderr: '',
        exitCode: matched.length > 0 ? 0 : 1,
      };
    }

    return {
      command: commandLine,
      stdin,
      stdout: matched.join('\n'),
      stderr: '',
      exitCode: matched.length > 0 ? 0 : 1,
    };
  }

  if (cmd === 'jq') {
    let rawOutput = false;
    let compact = false;
    const positional: string[] = [];
    for (const arg of args) {
      if (arg === '-r') rawOutput = true;
      else if (arg === '-c') compact = true;
      else if (arg === '-rc' || arg === '-cr') {
        rawOutput = true;
        compact = true;
      } else if (arg.startsWith('-')) {
        return { command: commandLine, stdin, stdout: '', stderr: `jq: unsupported flag ${arg}`, exitCode: 2 };
      } else {
        positional.push(arg);
      }
    }

    const filter = positional[0] ?? '.';
    let source = stdin;
    if (positional[1]) {
      const content = getFileContent(positional[1]);
      if (content === null) {
        return { command: commandLine, stdin, stdout: '', stderr: `jq: ${positional[1]}: No such sample file`, exitCode: 2 };
      }
      source = content;
    }

    try {
      const trimmed = source.trim();
      const objects: Record<string, unknown>[] = trimmed.startsWith('[')
        ? (JSON.parse(trimmed) as Record<string, unknown>[])
        : trimmed
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Record<string, unknown>);

      let items: unknown[] = objects;
      if (filter.includes('select(.latency_ms > 500)')) {
        items = objects.filter((o) => Number(o.latency_ms ?? 0) > 500);
      } else if (filter.includes('select(.status >= 500)')) {
        items = objects.filter((o) => Number(o.status ?? 0) >= 500);
      }

      const fieldMatch = filter.match(/\.([a-zA-Z0-9_]+)\s*$/);
      if (fieldMatch && filter !== '.') {
        const key = fieldMatch[1];
        items = items.map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>)[key] : null));
      }

      const formatted = items.map((val) => {
        if (rawOutput && typeof val === 'string') return val;
        return compact ? JSON.stringify(val) : JSON.stringify(val, null, 2);
      });

      return {
        command: commandLine,
        stdin,
        stdout: formatted.join('\n'),
        stderr: '',
        exitCode: 0,
      };
    } catch {
      return { command: commandLine, stdin, stdout: '', stderr: 'jq: invalid JSON input', exitCode: 5 };
    }
  }

  if (cmd === 'awk') {
    let delimiter: RegExp | string = /\s+/;
    const positional: string[] = [];
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === '-F' && args[i + 1]) {
        delimiter = args[i + 1];
        i += 1;
      } else if (args[i].startsWith('-F')) {
        delimiter = args[i].slice(2);
      } else {
        positional.push(args[i]);
      }
    }

    const program = positional[0] ?? '{print $1}';
    let source = stdin;
    if (positional[1]) {
      const content = getFileContent(positional[1]);
      if (content === null) {
        return { command: commandLine, stdin, stdout: '', stderr: `awk: ${positional[1]}: No such sample file`, exitCode: 2 };
      }
      source = content;
    }

    const cols = [...program.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    const lines = source ? source.split('\n').filter(Boolean) : [];
    const out = lines.map((line) => {
      const parts = typeof delimiter === 'string' ? line.split(delimiter) : line.trim().split(delimiter);
      if (cols.length === 0) return line;
      return cols.map((c) => (c === 0 ? line : parts[c - 1] ?? '')).join(' ');
    });
    return { command: commandLine, stdin, stdout: out.join('\n'), stderr: '', exitCode: 0 };
  }

  if (cmd === 'sort') {
    const reverse = args.includes('-r');
    const unique = args.includes('-u');
    let lines = stdin ? stdin.split('\n').filter(Boolean) : [];
    lines = [...lines].sort((a, b) => (reverse ? b.localeCompare(a) : a.localeCompare(b)));
    if (unique) lines = [...new Set(lines)];
    return { command: commandLine, stdin, stdout: lines.join('\n'), stderr: '', exitCode: 0 };
  }

  if (cmd === 'head') {
    let n = 5;
    const nIdx = args.indexOf('-n');
    if (nIdx !== -1 && args[nIdx + 1]) n = Math.max(1, Number(args[nIdx + 1]) || 5);
    const lines = stdin ? stdin.split('\n').filter(Boolean) : [];
    return { command: commandLine, stdin, stdout: lines.slice(0, n).join('\n'), stderr: '', exitCode: 0 };
  }

  if (cmd === 'wc') {
    const lines = stdin ? stdin.split('\n').filter(Boolean) : [];
    return { command: commandLine, stdin, stdout: String(lines.length), stderr: '', exitCode: 0 };
  }

  if (cmd === 'docker' && args[0] === 'ps') {
    const includeAll = args.includes('-a') || args.includes('--all');
    const filterExited = args.includes('status=exited');
    const formatJson = args.includes('json') || args.includes('--format=json');
    const containers = JSON.parse(getFileContent('containers.json') ?? '[]') as Array<{
      id: string;
      image: string;
      status: string;
      state: string;
      name: string;
    }>;
    const filtered = containers.filter((c) => {
      if (filterExited) return c.state === 'exited';
      return includeAll || c.state === 'running';
    });
    const out = formatJson
      ? filtered.map((c) => JSON.stringify(c)).join('\n')
      : [
          'CONTAINER   IMAGE                          STATUS                     NAMES',
          ...filtered.map((c) => `${c.id.padEnd(11)} ${c.image.padEnd(30)} ${c.status.padEnd(26)} ${c.name}`),
        ].join('\n');
    return { command: commandLine, stdin, stdout: out, stderr: '', exitCode: 0 };
  }

  if (cmd === 'kubectl' && args[0] === 'get' && args[1] === 'pods') {
    const allNs = args.includes('-A') || args.includes('--all-namespaces');
    const wide = args.includes('-o') && args.includes('wide');
    const nonRunning = args.some((a) => a.includes('status.phase!=Running'));
    const pods = JSON.parse(getFileContent('pods.json') ?? '[]') as Array<{
      namespace: string;
      name: string;
      ready: string;
      phase: string;
      restarts: number;
      node: string;
    }>;
    const filtered = pods.filter((p) => {
      if (!allNs && p.namespace !== 'inference') return false;
      if (nonRunning && p.phase === 'Running') return false;
      return true;
    });
    const header = allNs
      ? `NAMESPACE   NAME                 READY   STATUS    RESTARTS${wide ? '   NODE' : ''}`
      : `NAME                 READY   STATUS    RESTARTS${wide ? '   NODE' : ''}`;
    const rows = filtered.map((p) => {
      const core = `${p.name.padEnd(20)} ${p.ready.padEnd(7)} ${p.phase.padEnd(9)} ${String(p.restarts).padEnd(8)}${wide ? `   ${p.node}` : ''}`;
      return allNs ? `${p.namespace.padEnd(11)} ${core}` : core;
    });
    return { command: commandLine, stdin, stdout: [header, ...rows].join('\n'), stderr: '', exitCode: 0 };
  }

  return {
    command: commandLine,
    stdin,
    stdout: '',
    stderr: `${cmd}: command not permitted in read-only browser sandbox (allowed: cat, grep, jq, awk, sort, head, wc, docker ps, kubectl get pods)`,
    exitCode: 127,
  };
}

/**
 * Executes a simulated multi-stage shell pipeline purely in-browser over
 * the fixed sample workspace files. Never accesses any OS process or network.
 */
export function runSandboxPipeline(pipelineText: string): PipelineRunResult {
  const segments = pipelineText
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return {
      stages: [],
      finalStdout: '',
      finalStderr: 'Enter a pipeline command (e.g. cat api.log | grep -i error).',
      finalExitCode: 2,
    };
  }

  const stages: PipelineStageTrace[] = [];
  let currentStdin = '';

  for (let i = 0; i < segments.length; i += 1) {
    const trace = runSingleStage(segments[i], currentStdin, i === 0);
    stages.push(trace);
    currentStdin = trace.stdout;
  }

  const last = stages[stages.length - 1];
  return {
    stages,
    finalStdout: last.stdout,
    finalStderr: last.stderr,
    finalExitCode: last.exitCode,
  };
}
