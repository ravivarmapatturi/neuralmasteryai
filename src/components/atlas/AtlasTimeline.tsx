import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trainingAtlas } from '../../data/trainingAtlas';
import { inferenceAtlasEntries } from '../../data/inferenceAtlas';
import { architectureEntries } from '../../data/agentArchitectureAtlas';
import { protocolEntries } from '../../data/agentProtocolsAtlas';

interface TimelineEntry {
  key: string;
  name: string;
  year: number;
  lane: number;
  about: string;
}

export const ATLAS_FIELDS = [
  { id: 't', name: 'Training', colour: '#1d4fc4', to: '/docs/atlas/training' },
  { id: 'i', name: 'Inference', colour: '#0f7f8c', to: '/docs/atlas/inference' },
  { id: 'a', name: 'Agent architecture', colour: '#7a3fc0', to: '/docs/atlas/agent-architecture' },
  { id: 'p', name: 'Agent protocols', colour: '#b4540a', to: '/docs/atlas/agent-protocols' },
];

export const atlasEntries: TimelineEntry[] = [
  ...trainingAtlas.map((e) => ({ key: `t:${e.id}`, name: e.name, year: e.year, lane: 0, about: e.whatItIs })),
  ...inferenceAtlasEntries.map((e) => ({ key: `i:${e.id}`, name: e.name, year: e.year, lane: 1, about: e.whatItIs })),
  ...architectureEntries.map((e) => ({ key: `a:${e.id}`, name: e.name, year: Number(e.date.slice(0, 4)), lane: 2, about: e.what })),
  ...protocolEntries.map((e) => ({ key: `p:${e.id}`, name: e.name, year: e.year, lane: 3, about: e.what })),
];

// Drawn from each entry's "came before" and "led to" text. Only direct, stated steps are linked.
export const atlasLinks: [string, string][] = [
  ['t:perceptron', 't:backprop'], ['t:sgd', 't:momentum'], ['t:momentum', 't:adam'], ['t:adam', 't:adamw'],
  ['t:regularization', 't:adamw'], ['t:backprop', 't:bptt'], ['t:initialization', 't:batch-norm'],
  ['t:batch-norm', 't:layer-norm'], ['t:cnn-training', 't:transfer-learning'], ['t:transfer-learning', 't:sft'],
  ['t:sft', 't:instruction-tuning'], ['t:instruction-tuning', 't:rlhf-ppo'], ['t:rlhf-ppo', 't:dpo'],
  ['t:dpo', 't:kto'], ['t:rlhf-ppo', 't:grpo'], ['t:prefix-tuning', 't:lora'], ['t:lora', 't:qlora'],
  ['t:data-augmentation', 't:contrastive-learning'], ['t:contrastive-learning', 't:mae'], ['t:mae', 't:jepa'],
  ['i:beam-search', 'i:greedy-decoding'], ['i:temperature', 'i:top-k'], ['i:top-k', 'i:top-p'],
  ['i:static-quantization', 'i:dynamic-quantization'], ['i:gptq', 'i:awq'], ['i:wasm', 'i:webgpu'],
  ['i:kv-cache', 'i:gqa'], ['i:kv-cache', 'i:paged-kv-cache'], ['i:kv-cache', 'i:prefix-caching'],
  ['i:static-batching', 'i:continuous-batching'], ['i:continuous-batching', 'i:paged-kv-cache'],
  ['i:roofline', 'i:flash-attention'], ['a:ai-chains', 'a:langgraph'], ['a:mrkl', 'a:react'],
  ['a:reflexion', 'a:lats'], ['a:tree-of-thoughts', 'a:lats'], ['a:react', 'a:reflexion'],
  ['a:react', 'a:plan-and-solve'], ['a:metagpt', 'a:orchestrator-workers'], ['a:autogen', 'a:orchestrator-workers'],
  ['a:langgraph', 'a:long-running-harness'], ['a:context-engineering', 'a:long-running-harness'],
  ['p:rpc', 'p:soap'], ['p:http10', 'p:soap'], ['p:http10', 'p:rest'], ['p:rest', 'p:openapi'], ['p:rest', 'p:graphql'],
  ['p:rpc', 'p:grpc'], ['p:openapi', 'p:plugins'], ['p:plugins', 'p:function-calling'], ['p:react', 'p:function-calling'],
  ['p:function-calling', 'p:tool-use'], ['p:function-calling', 'p:structured-outputs'], ['p:tool-use', 'p:mcp'],
  ['p:lsp', 'p:mcp'], ['p:oauth2', 'p:mcp-remote'], ['p:mcp', 'p:mcp-remote'], ['p:a2a', 'p:ag-ui'],
  ['p:mcp', 'p:aaif'], ['p:agents-md', 'p:aaif'], ['p:structured-outputs', 'i:structured-output'],
  ['a:react', 'p:react'], ['a:toolformer', 'p:toolformer'],
];

// Recent years hold most entries, so they get most of the width.
function scale(year: number) {
  if (year < 1990) return ((year - 1950) / 40) * 0.12;
  if (year < 2015) return 0.12 + ((year - 1990) / 25) * 0.3;
  return 0.42 + ((year - 2015) / 10.6) * 0.58;
}

const TICKS = [1950, 1980, 2000, 2010, 2015, 2018, 2020, 2022, 2024];
const byKey = new Map(atlasEntries.map((e) => [e.key, e]));

function layout(width: number) {
  const vertical = width < 640;
  const height = vertical ? 1240 : 600;
  const positions = new Map<string, { x: number; y: number }>();
  const counts = new Map<string, number>();
  const laneSize = vertical ? (width - 44) / 4 : height / 4;
  atlasEntries.forEach((e) => {
    const bucket = `${e.lane}:${e.year}`;
    const seen = (counts.get(bucket) ?? 0) + 1;
    counts.set(bucket, seen);
    const offset = (seen % 2 ? 1 : -1) * Math.ceil((seen - 1) / 2);
    const along = scale(e.year);
    positions.set(
      e.key,
      vertical
        ? { x: 44 + laneSize * (e.lane + 0.5) + offset * 9, y: 44 + along * (height - 70) + offset * 4 }
        : { x: 150 + along * (width - 180) + offset * 4, y: laneSize * (e.lane + 0.5) + offset * 15 }
    );
  });
  return { vertical, height, positions, laneSize };
}

export function AtlasTimeline() {
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const pausedRef = useRef(false);
  const [width, setWidth] = useState(1100);
  const [active, setActive] = useState('t:lora');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = new ResizeObserver(() => setWidth(stage.clientWidth));
    observer.observe(stage);
    setWidth(stage.clientWidth);
    return () => observer.disconnect();
  }, []);

  const { vertical, height, positions, laneSize } = useMemo(() => layout(width), [width]);

  useEffect(() => {
    const place = (clock: number) => {
      const moved = new Map<string, { x: number; y: number }>();
      atlasEntries.forEach((e, i) => {
        const p = positions.get(e.key)!;
        const at = { x: p.x + Math.sin(clock * 0.00045 + i * 1.7) * 2.5, y: p.y + Math.cos(clock * 0.00038 + i * 2.3) * 2.5 };
        moved.set(e.key, at);
        const node = nodeRefs.current.get(e.key);
        if (node) node.style.transform = `translate(${at.x}px, ${at.y}px)`;
      });
      atlasLinks.forEach(([a, b], i) => {
        const line = lineRefs.current[i];
        if (!line) return;
        line.setAttribute('x1', String(moved.get(a)!.x));
        line.setAttribute('y1', String(moved.get(a)!.y));
        line.setAttribute('x2', String(moved.get(b)!.x));
        line.setAttribute('y2', String(moved.get(b)!.y));
      });
    };
    place(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    let clock = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!pausedRef.current) clock += now - last;
      last = now;
      place(clock);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [positions]);

  const near = new Set([active]);
  atlasLinks.forEach(([a, b]) => {
    if (a === active) near.add(b);
    if (b === active) near.add(a);
  });
  const entry = byKey.get(active)!;
  const field = ATLAS_FIELDS[entry.lane];
  const namesOf = (keys: string[]) => keys.map((k) => byKey.get(k)!.name).join(', ') || 'No direct link shown';

  return (
    <section className="atlas-tl" aria-label="Timeline of all atlas entries">
      <div className="atlas-tl__stage" ref={stageRef} style={{ height }}>
        {ATLAS_FIELDS.map((f, i) => (
          <div
            key={f.id}
            className="atlas-tl__lane"
            style={
              vertical
                ? { left: 44 + laneSize * i, top: 0, width: laneSize, height }
                : { left: 0, top: laneSize * i, width: '100%', height: laneSize }
            }
          >
            <span style={{ color: f.colour }}>{f.name}</span>
          </div>
        ))}
        {TICKS.map((year) => {
          const along = scale(year);
          return (
            <span
              key={year}
              className="atlas-tl__tick"
              style={
                vertical
                  ? { left: 4, top: 44 + along * (height - 70) - 8 }
                  : { left: 150 + along * (width - 180) - 14, top: height - 18 }
              }
            >
              {year}
            </span>
          );
        })}
        <svg className="atlas-tl__edges" width={width} height={height} aria-hidden="true">
          {atlasLinks.map(([a, b], i) => (
            <line
              key={`${a}-${b}`}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={a === active || b === active ? 'on' : undefined}
              style={a === active || b === active ? { stroke: ATLAS_FIELDS[byKey.get(a)!.lane].colour } : undefined}
            />
          ))}
        </svg>
        {atlasEntries.map((e) => (
          <button
            key={e.key}
            type="button"
            ref={(el) => {
              if (el) nodeRefs.current.set(e.key, el);
            }}
            className={`atlas-tl__node${e.key === active ? ' on' : ''}${near.has(e.key) ? ' near' : ''}`}
            style={{ color: ATLAS_FIELDS[e.lane].colour }}
            aria-label={`${e.name}, ${e.year}, ${ATLAS_FIELDS[e.lane].name}`}
            aria-pressed={e.key === active}
            onMouseEnter={() => {
              pausedRef.current = true;
              setActive(e.key);
            }}
            onMouseLeave={() => {
              pausedRef.current = false;
            }}
            onFocus={() => setActive(e.key)}
            onClick={() => setActive(e.key)}
          >
            <span className="atlas-tl__dot" />
            {e.key === active && <span className={`atlas-tl__label${scale(e.year) > 0.7 && !vertical ? ' left' : ''}`}>{e.name}</span>}
          </button>
        ))}
      </div>
      <div className="atlas-tl__detail" aria-live="polite">
        <div className="atlas-tl__title">
          <p>
            {entry.year} · {field.name}
          </p>
          <h2>{entry.name}</h2>
          <Link to={field.to} className="atlas-tl__open">
            Open the {field.name} atlas
          </Link>
        </div>
        <p className="atlas-tl__about">{entry.about}</p>
        <div className="atlas-tl__links">
          <p>
            <strong>Came from:</strong> {namesOf(atlasLinks.filter((l) => l[1] === active).map((l) => l[0]))}
          </p>
          <p>
            <strong>Led to:</strong> {namesOf(atlasLinks.filter((l) => l[0] === active).map((l) => l[1]))}
          </p>
        </div>
      </div>
    </section>
  );
}
