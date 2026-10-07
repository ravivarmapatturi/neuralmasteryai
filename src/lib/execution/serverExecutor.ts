import type { CodeExecutor, ExecutionRequest, ExecutionResult, CaseExecutionResult, ExecutionStatus } from './types';
import { PyodideExecutor } from './pyodideExecutor';

export interface ServerExecutorOptions {
  /** Target server execution API endpoint URL. Defaults to environment variable
   * VITE_SERVER_EXECUTOR_URL or local server http://localhost:3001/api/execute */
  endpointUrl?: string;
  /** Hard HTTP network timeout in milliseconds. Default 6000ms. */
  timeoutMs?: number;
  /** If true, automatically falls back to local PyodideExecutor when server is unreachable or errors out. Default true. */
  enableFallback?: boolean;
}

export class ServerExecutor implements CodeExecutor {
  readonly mode = 'server' as const;
  private endpointUrl: string;
  private timeoutMs: number;
  private enableFallback: boolean;
  // True only when the caller (or VITE_SERVER_EXECUTOR_URL) explicitly
  // configured a real endpoint. This project ships as a static site with
  // no backend -- the un-configured default used to silently try
  // http://localhost:3001, fail every single time in production, and
  // leak that failure as a "[Server unreachable ...]" notice into every
  // learner's test-result stdout. Without a real endpoint, skip the
  // network attempt entirely and go straight to Pyodide with no notice,
  // since there's no actual error here, just this site's normal mode.
  private hasRealEndpoint: boolean;
  private fallbackExecutor: PyodideExecutor | null = null;
  private activeController: AbortController | null = null;

  constructor(options: ServerExecutorOptions = {}) {
    const envUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_SERVER_EXECUTOR_URL as string | undefined) : undefined;
    this.hasRealEndpoint = Boolean(options.endpointUrl || envUrl);
    this.endpointUrl = options.endpointUrl || envUrl || 'http://localhost:3001/api/execute';
    this.timeoutMs = options.timeoutMs ?? 6000;
    this.enableFallback = options.enableFallback ?? true;
  }

  private getFallback(): PyodideExecutor {
    if (!this.fallbackExecutor) {
      this.fallbackExecutor = new PyodideExecutor();
    }
    return this.fallbackExecutor;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!this.hasRealEndpoint && this.enableFallback) {
      // No real server was ever configured -- don't waste a network
      // round-trip on a connection nothing will answer, and don't print
      // a notice about it: this is this site's normal, expected mode.
      try {
        return await this.getFallback().execute(request);
      } catch (fallbackErr) {
        return {
          status: 'runtime_error',
          mode: 'local',
          stdout: '',
          caseResults: [],
          errorMessage: `Local execution unavailable: ${fallbackErr}`,
        };
      }
    }

    this.activeController = new AbortController();
    const signal = this.activeController.signal;

    const timeoutId = setTimeout(() => {
      this.activeController?.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        status: ExecutionStatus;
        stdout: string;
        caseResults: CaseExecutionResult[];
        errorMessage: string | null;
        totalExecutionTimeMs?: number;
        truncated?: boolean;
      };

      return {
        status: data.status,
        mode: 'server',
        stdout: data.stdout ?? '',
        caseResults: data.caseResults ?? [],
        errorMessage: data.errorMessage ?? null,
        totalExecutionTimeMs: data.totalExecutionTimeMs ?? 0,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';

      if (this.enableFallback) {
        // Silent, graceful fallback to Pyodide in browser
        try {
          const fallbackResult = await this.getFallback().execute(request);
          const fallbackNotice = isAbort
            ? '[Server execution timed out — executed locally via Pyodide]'
            : `[Server unreachable (${err instanceof Error ? err.message : String(err)}) — executed locally via Pyodide]`;

          return {
            ...fallbackResult,
            stdout: fallbackResult.stdout ? `${fallbackNotice}\n${fallbackResult.stdout}` : fallbackNotice,
          };
        } catch (fallbackErr) {
          return {
            status: 'runtime_error',
            mode: 'local',
            stdout: '',
            caseResults: [],
            errorMessage: `Server unreachable (${isAbort ? 'Timeout' : (err as Error).message}) and local fallback unavailable: ${fallbackErr}`,
          };
        }
      }

      return {
        status: isAbort ? 'timeout' : 'runtime_error',
        mode: 'server',
        stdout: '',
        caseResults: [],
        errorMessage: isAbort
          ? `Server execution timed out after ${this.timeoutMs}ms.`
          : `Server execution error: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      this.activeController = null;
    }
  }

  terminate(): void {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
    if (this.fallbackExecutor) {
      this.fallbackExecutor.terminate();
    }
  }
}
