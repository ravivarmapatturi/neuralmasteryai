# Task: new MLOps docs page -- Caching Strategies & Redis Patterns

You are working in an isolated git worktree on branch `agy-caching-strategies`, based on
`origin/main` at commit `80a0ba7`. Do all work in this worktree only.

## Why

The site has no dedicated page explaining cache read/write mechanics (cache-aside,
write-through/write-behind, TTL/LRU eviction, cache stampede) with Redis. Caching is
currently only name-dropped in `ai-cost-engineering.mdx` ("## Caching" section) and
`production-reliability.mdx` (one Redis idempotency-key snippet). This task creates the
real deep-dive page and wires it into the MLOps section's nav/roadmap.

## Exact files to create

### 1. `src/viz/diagrams/CacheAsideFlowDiagram.tsx` (new file, exact content below)

```tsx
import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Click Hit vs Miss to see the two paths a cache-aside read can
 * take -- a miss falls through to the database and writes the
 * result back into the cache before returning it. */
export default function CacheAsideFlowDiagram() {
  const t = useVizTokens();
  const [hit, setHit] = useState(false);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;

  const STEPS = hit
    ? ['Request', 'Check cache', 'Hit -- return cached value']
    : ['Request', 'Check cache', 'Miss -- query database', 'Write result to cache (TTL)', 'Return value'];

  return (
    <VisualizationContainer footer={hit ? 'Cache hit: no database round-trip at all -- the fastest possible path.' : 'Cache miss: the request falls through to the database, then writes the result back into the cache so the next request for the same key is a hit.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setHit(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !hit ? 700 : 500, background: !hit ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!hit ? color : t.border}`, color: !hit ? color : t.textSecondary, cursor: 'pointer' }}>
          Cache miss
        </button>
        <button type="button" onClick={() => setHit(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: hit ? 700 : 500, background: hit ? `${okColor}20` : t.surfaceAlt, border: `1.25px solid ${hit ? okColor : t.border}`, color: hit ? okColor : t.textSecondary, cursor: 'pointer' }}>
          Cache hit
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          const stepColor = last ? (hit ? okColor : color) : t.border;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SketchBox color={stepColor} strokeWidth={last ? 2 : 1.3} style={{ maxWidth: 120 }}>
                <div style={{ padding: '0.5rem 0.6rem', background: last ? `${stepColor}18` : t.surfaceAlt }}>
                  <span style={{ fontSize: 9, fontWeight: last ? 700 : 500, fontFamily: HAND_FONT, color: last ? stepColor : t.textPrimary }}>{s}</span>
                </div>
              </SketchBox>
              {!last && <span style={{ color: t.textMuted, fontSize: 11 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
```

### 2. `src/viz/diagrams/WriteThroughVsWriteBehindDiagram.tsx` (new file, exact content below)

```tsx
import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Click to compare write-through (cache and database updated
 * synchronously, before acking) against write-behind (cache updated
 * and acked immediately, database catches up asynchronously). */
export default function WriteThroughVsWriteBehindDiagram() {
  const t = useVizTokens();
  const [behind, setBehind] = useState(false);
  const color = getConceptColor(t, 'attention');

  const STEPS = behind
    ? ['App writes', 'Cache updated', 'Ack returned', '(async) DB flush later']
    : ['App writes', 'Cache + DB updated', 'Ack returned'];

  return (
    <VisualizationContainer footer={behind ? 'Write-behind: the write is acked as soon as the cache is updated -- fast, but a cache crash before the async flush to the database loses that write.' : 'Write-through: cache and database are updated together before acking -- never stale, but write latency is at least as slow as the database write itself.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setBehind(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !behind ? 700 : 500, background: !behind ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!behind ? color : t.border}`, color: !behind ? color : t.textSecondary, cursor: 'pointer' }}>
          Write-through
        </button>
        <button type="button" onClick={() => setBehind(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: behind ? 700 : 500, background: behind ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${behind ? color : t.border}`, color: behind ? color : t.textSecondary, cursor: 'pointer' }}>
          Write-behind
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SketchBox color={last ? color : t.border} strokeWidth={last ? 2 : 1.3} style={{ maxWidth: 130 }}>
                <div style={{ padding: '0.5rem 0.6rem', background: last ? `${color}18` : t.surfaceAlt }}>
                  <span style={{ fontSize: 9, fontWeight: last ? 700 : 500, fontFamily: HAND_FONT, color: last ? color : t.textPrimary }}>{s}</span>
                </div>
              </SketchBox>
              {!last && <span style={{ color: t.textMuted, fontSize: 11 }}>→</span>}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
```

### 3. `src/viz/diagrams/CacheEvictionTtlDiagram.tsx` (new file, exact content below)

```tsx
import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const SLOT_COUNT = 8;
const CAPACITY = 4;
const TTL_FRACTIONS = [10, 20, 30, 40, 50, 60, 70, 80]; // staggered expiry, percent of elapsed time

/** Two different ways cache entries disappear -- drag to advance time
 * and watch TTL-based expiry, or switch to LRU and drag to simulate
 * new keys arriving once the cache is at capacity. */
export default function CacheEvictionTtlDiagram() {
  const t = useVizTokens();
  const [lru, setLru] = useState(false);
  const [elapsedPct, setElapsedPct] = useState(35);
  const [newKeys, setNewKeys] = useState(2);
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;

  return (
    <VisualizationContainer footer={lru ? `Cache capacity: ${CAPACITY} keys. As ${newKeys} new key(s) arrive, the least-recently-used entries (leftmost) are evicted to make room -- oldest access, not oldest write.` : `Each key was written with a staggered TTL. At ${elapsedPct}% elapsed time, any key whose TTL has passed expires and is removed -- independent of how full the cache is.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setLru(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !lru ? 700 : 500, background: !lru ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!lru ? color : t.border}`, color: !lru ? color : t.textSecondary, cursor: 'pointer' }}>
          TTL expiry
        </button>
        <button type="button" onClick={() => setLru(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: lru ? 700 : 500, background: lru ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${lru ? color : t.border}`, color: lru ? color : t.textSecondary, cursor: 'pointer' }}>
          LRU eviction (cache full)
        </button>
      </div>
      {lru
        ? <Slider label={`New keys arrived: ${newKeys}`} min={0} max={SLOT_COUNT - CAPACITY} step={1} value={newKeys} onChange={setNewKeys} />
        : <Slider label={`Elapsed time: ${elapsedPct}%`} min={0} max={100} step={5} value={elapsedPct} onChange={setElapsedPct} />}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const gone = lru ? i < newKeys : elapsedPct >= TTL_FRACTIONS[i];
          return (
            <SketchBox key={i} color={gone ? badColor : color} strokeWidth={1.5} style={{ width: 32, height: 32, opacity: gone ? 0.3 : 1 }}>
              <div style={{ width: 32, height: 32, background: gone ? 'none' : `${color}30` }} />
            </SketchBox>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
```

**Before writing these 3 files**, open `src/viz/primitives.tsx` (or wherever `Slider` and
`VisualizationContainer` are actually exported from -- check the import path other diagrams
use, e.g. `src/viz/diagrams/HpaAutoscalingDiagram.tsx` and
`src/viz/diagrams/GovernanceApprovalFlowDiagram.tsx`) and confirm the `Slider` prop names
(`label`, `min`, `max`, `step`, `value`, `onChange`) and `VizTokens` fields used above
(`t.accentPrimary`, `t.accentDanger`, `t.border`, `t.surfaceAlt`, `t.textPrimary`,
`t.textSecondary`, `t.textMuted`) actually exist with those exact names. Also confirm
`SketchBox`'s props (`color`, `strokeWidth`, `style`, children) match
`src/components/notebook/SketchBox.tsx`'s actual signature. These names were taken directly
from existing working diagrams in this repo, so they should match exactly -- if any name is
slightly different in the real source, fix the diagram file to use the real name, don't
invent a new prop.

### 4. `src/content/docs/mlops/caching-strategies.mdx` (new file, exact content below)

```mdx
---
title: "Caching Strategies & Redis Patterns"
sidebar_position: 22.35
description: "Cache-aside reads, write-through vs. write-behind writes, TTL/LRU eviction, and cache stampede -- the mechanics behind every 'add a Redis cache' decision, with real code."
---

import CacheAsideFlowDiagram from '../../../viz/diagrams/CacheAsideFlowDiagram';
import WriteThroughVsWriteBehindDiagram from '../../../viz/diagrams/WriteThroughVsWriteBehindDiagram';
import CacheEvictionTtlDiagram from '../../../viz/diagrams/CacheEvictionTtlDiagram';

# Caching Strategies & Redis Patterns

[AI Cost Engineering](/docs/mlops/ai-cost-engineering#caching) already leans on "a cache hit is free," and [Production Reliability](/docs/mlops/production-reliability#idempotency-and-distributed-locks) already uses Redis for idempotency keys -- both assume a cache without explaining how one actually reads, writes, and forgets data. This page is that mechanics, with the real Redis code behind each pattern.

## Cache Reads: Cache-Aside (Lazy Loading)

**Cache-aside** (also called lazy loading) is the default pattern for reads: the application checks the cache first; on a hit, it returns immediately with no database round-trip. On a miss, it reads from the actual source of truth (a database, an API), then writes that result back into the cache -- with a TTL -- before returning it. The cache only ever holds data that's actually been requested, and if the cache is unavailable entirely, every request just falls through to the database: the system gets slower, not broken.

<CacheAsideFlowDiagram />

```python
def get_user_profile(user_id: str) -> dict:
    cached = redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)          # cache hit -- no DB round-trip

    profile = db.query_user(user_id)        # cache miss -- fall through to source of truth
    redis.set(f"user:{user_id}", json.dumps(profile), ex=300)   # write-back, 5 min TTL
    return profile
```

## Cache Writes: Write-Through vs. Write-Behind

Reads have one dominant pattern; writes split into two genuinely different philosophies for keeping a cache correct as the underlying data changes:

- **Write-through**: every write updates the cache and the database synchronously, before acking the caller. The cache is never stale, but write latency is at least as slow as the database write itself -- no speedup on the write path.
- **Write-behind (write-back)**: the write updates the cache and acks immediately; the database update happens asynchronously afterward, often batched. Writes are much faster, but a cache crash before that async flush loses the write -- a durability-for-latency tradeoff, not a strict improvement.

<WriteThroughVsWriteBehindDiagram />

```python
def update_user_profile(user_id: str, profile: dict) -> None:
    db.save_user(user_id, profile)                              # source of truth first
    redis.set(f"user:{user_id}", json.dumps(profile), ex=300)    # cache kept in lockstep
```

## Eviction: TTL and LRU

A cache entry disappears for two independent reasons. **TTL (time-to-live)** expiry removes a key once a fixed amount of time has passed, regardless of how full the cache is -- set per-write (the `ex=300` above). **LRU (least-recently-used) eviction** only kicks in once the cache hits a configured memory limit, and then removes whichever entries haven't been accessed in the longest time to make room for new ones -- Redis enables this with `maxmemory` and a policy like `maxmemory-policy allkeys-lru`. Both mechanisms run at once in a real deployment; TTL bounds staleness, LRU bounds memory.

<CacheEvictionTtlDiagram />

## Cache Invalidation and Stampede

TTL alone means a key can serve stale data for up to its full TTL window after the underlying data changes. **Explicit invalidation** (deleting or overwriting the cached key on every write to the source of truth) fixes that staleness immediately, but adds a real failure mode: a write path that forgets to invalidate every cached representation of that data leaves it silently stale with no error to notice.

A **cache stampede** (thundering herd) happens when a hot key expires and many concurrent requests miss at the same instant, all hitting the database simultaneously to repopulate it -- enough to take down a database that was otherwise healthy. The standard fix is a short-lived lock so only one request repopulates the key while the rest wait briefly or serve the stale value, plus jittered TTLs so many keys don't expire in the same instant:

```python
def get_with_stampede_protection(key: str) -> dict:
    cached = redis.get(key)
    if cached:
        return json.loads(cached)

    if redis.set(f"lock:{key}", "1", nx=True, ex=10):   # only one caller wins the lock
        value = recompute_expensive_value(key)
        redis.set(key, json.dumps(value), ex=300)
        redis.delete(f"lock:{key}")
        return value

    time.sleep(0.05)                                     # lost the lock -- brief wait, then retry
    return get_with_stampede_protection(key)
```

The same cache-aside idea shows up at other layers of this platform too, at different granularity: [prompt/response caching](/docs/mlops/ai-cost-engineering#caching) caches whole LLM responses, and [KV/prefix caching](/docs/mlops/llm-inference-optimization#kv-cache) caches intermediate attention state inside a single model -- same hit-avoids-recompute idea, applied at the request level versus inside the forward pass.

Next: [Legal, Licensing & Governance](/docs/mlops/legal-licensing-and-governance) — the non-technical constraints that shape which of these tradeoffs are even legally available to make.
```

Note: when actually writing this file, use real triple-backtick fences for the `python`
code blocks as shown -- the nesting above is just this spec's own markdown escaping, do not
include literal backslashes or extra fencing artifacts in the real `.mdx` file.

## Exact edits to existing files

### `src/content/docs/mlops/roadmap.mdx`

Find this block (currently ~line 149-153):

```
## 20.3. [AI Cost Engineering](/docs/mlops/ai-cost-engineering)
- [x] Training cost, inference cost (cost per 1M tokens)
- [x] GPU/memory utilization, caching, batching, quantization
- [x] Model routing, distillation, prompt/context compression
- [x] The quality vs. latency vs. cost tradeoff
```

Immediately after it (before `## 20.4. [Legal, Licensing & Governance]`), insert:

```
## 20.35. [Caching Strategies & Redis Patterns](/docs/mlops/caching-strategies)
- [x] Cache-aside (lazy loading) reads, write-through vs. write-behind writes
- [x] TTL and LRU eviction
- [x] Cache invalidation, stampede/thundering herd mitigation
```

### `src/content/docs/mlops/ai-cost-engineering.mdx`

Find the final line of the file:

```
Next: [Legal, Licensing & Governance](/docs/mlops/legal-licensing-and-governance) — the non-technical constraints that shape which of these tradeoffs are even legally available to make.
```

Replace it with:

```
Next: [Caching Strategies & Redis Patterns](/docs/mlops/caching-strategies) — the caching technique introduced above as a cost lever, worked through in full: cache-aside reads, write-through/write-behind writes, eviction, and invalidation.
```

Do not change anything else in that file. Do not change `legal-licensing-and-governance.mdx`
at all (it already correctly points to `mlops-architecture-and-roadmap` next, which stays
correct).

## Verification (required, in this order, do not skip or shortcut any step)

1. `npx tsc -b` -- must pass with zero errors.
2. `npm run test:unit` -- full unit suite must pass (473+ tests as of this writing; it's fine
   if the count has grown since).
3. `npm run build` -- must succeed and must NOT report broken MDX/import errors for the new
   page or the 3 new diagram files.
4. `npm run check:links` -- must pass. This is what catches a wrong anchor slug
   (`#caching`, `#idempotency-and-distributed-locks`, `#kv-cache`) or a wrong `/docs/...`
   path -- if it fails on one of this task's own new links, fix the link, don't suppress
   the checker.
5. `npm run pagefind` -- prerenders all routes; can take several minutes. Poll its log file
   directly with plain `tail`/`kill -0` rather than a long blocking foreground wait if it
   runs long.
6. `npm run test:smoke` (Playwright) -- full suite must pass. If 1-2 tests flake under
   parallel load (this has happened before with Pyodide-dependent tests unrelated to this
   change), re-run just that failing spec file with `--workers=1` to confirm it's not a real
   regression before concluding it's flaky. Do not ship if a failure is actually caused by
   this change.

## Commit, push, and report

Once all of the above is green:

- `git add` only the files this task actually touched (the 3 new diagram `.tsx` files, the
  new `.mdx` page, `roadmap.mdx`, `ai-cost-engineering.mdx`, and this spec file under
  `helpers/`). Do not run a broad `git add -A`.
- Commit with a message describing what shipped (new Caching Strategies & Redis Patterns
  page, 3 new hand-drawn interactive diagrams, roadmap + ai-cost-engineering cross-link
  updates). End the commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- Push the branch `agy-caching-strategies` to origin and open a PR against `main` (or push
  directly to `main` if that is this repo's normal flow for this kind of change -- check
  recent `git log --oneline -20` on `main` to see whether direct-to-main pushes are the
  norm; if so, rebase this branch onto latest `main` first, then push to `main` directly
  rather than opening a PR, matching the existing pattern).
- After pushing, check CI/Deploy status with a single `gh run list --limit 5` read (not a
  polling loop) -- if still in progress, check again once after a reasonable wait, but do
  not sit in a continuous watch loop.
- Write a short final summary at the end of your own output: which files were created/
  changed, confirmation that every verification step passed (or an honest note if something
  didn't and what you did about it), and the final CI/Deploy status.

## Constraints

- Visual-layer and content-only change. Do not touch any unrelated file.
- Do not install new npm dependencies -- everything needed (SketchBox, VisualizationContainer,
  Slider, getConceptColor, useVizTokens) already exists in this repo.
- Follow this repo's existing conventions exactly as shown in the reference files named
  above (`HpaAutoscalingDiagram.tsx`, `GovernanceApprovalFlowDiagram.tsx`,
  `TerraformVsPulumiDiagram.tsx`, `IdempotencyKeyDiagram.tsx`, `production-reliability.mdx`,
  `ai-cost-engineering.mdx`) -- read them first if anything above is ambiguous.
