import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { describe, expect, it, vi } from 'vitest';

const workflow = load(readFileSync('.github/workflows/deploy.yml', 'utf8'));
const deploy = workflow.jobs.deploy;
const script = deploy.steps.find(step => step.id === 'current').with.script;
const runGuard = new Function('context', 'github', 'core', `return (async () => {${script}})()`);

describe('deployment queue and freshness', () => {
  it('queues only eligible jobs without replacing pending deployments', () => {
    expect(workflow.concurrency).toBeUndefined();
    expect(deploy.concurrency).toEqual({ group: 'pages-vite', 'cancel-in-progress': false, queue: 'max' });
    expect(deploy.if).toContain("needs.promote.result == 'success' || needs.manual-build.result == 'success'");
    expect(deploy.steps.find(step => step.id === 'deployment').if).toBe("steps.current.outputs.deploy == 'true'");
  });

  it.each([
    ['workflow_run', 'latest', 'latest', 'true'],
    ['workflow_run', 'older', 'latest', 'false'],
    ['workflow_dispatch', 'older', 'latest', 'true'],
  ])('%s tested=%s main=%s allows=%s', async (eventName, tested, latest, expected) => {
    const getBranch = vi.fn().mockResolvedValue({ data: { commit: { sha: latest } } });
    const core = { setOutput: vi.fn(), notice: vi.fn() };
    await runGuard({ eventName, repo: { owner: 'owner', repo: 'repo' }, payload: { workflow_run: { head_sha: tested } } },
      { rest: { repos: { getBranch } } }, core);
    expect(core.setOutput).toHaveBeenCalledWith('deploy', expected);
    expect(getBranch).toHaveBeenCalledTimes(eventName === 'workflow_dispatch' ? 0 : 1);
  });

  it('fails closed when main cannot be checked', async () => {
    const core = { setOutput: vi.fn() };
    await expect(runGuard({ eventName: 'workflow_run', repo: {} }, {
      rest: { repos: { getBranch: vi.fn().mockRejectedValue(new Error('API unavailable')) } },
    }, core)).rejects.toThrow('API unavailable');
    expect(core.setOutput).not.toHaveBeenCalled();
  });
});
