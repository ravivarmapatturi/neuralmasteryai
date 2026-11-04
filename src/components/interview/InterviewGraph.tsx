import { useEffect, useMemo, useRef, useState } from 'react';
import { curveBundle, line } from 'd3-shape';

export interface GraphTopic {
  id: string;
  title: string;
  group: string;
  count: number;
}

// What builds on what, using the topic ids in interviewPractice.json.
const LINKS: [string, string][] = [
  ['math-classical-ml', 'deep-learning'],
  ['deep-learning', 'transformers'],
  ['transformers', 'tokenization-decoding'],
  ['deep-learning', 'post-training'],
  ['transformers', 'post-training'],
  ['transformers', 'inference-serving'],
  ['tokenization-decoding', 'inference-serving'],
  ['inference-serving', 'gpu-memory-quantization'],
  ['transformers', 'rag'],
  ['tokenization-decoding', 'prompting-structured-output'],
  ['post-training', 'evaluation'],
  ['rag', 'evaluation'],
  ['prompting-structured-output', 'evaluation'],
  ['transformers', 'multimodal'],
  ['prompting-structured-output', 'agents'],
  ['rag', 'agents'],
  ['agents', 'protocols'],
  ['agents', 'multi-agent'],
  ['agents', 'sandboxes'],
  ['sandboxes', 'evidence-reverse-engineering'],
  ['inference-serving', 'production-mlops'],
  ['evaluation', 'production-mlops'],
  ['gpu-memory-quantization', 'cost-capacity'],
  ['production-mlops', 'cost-capacity'],
  ['evaluation', 'safety'],
  ['sandboxes', 'safety'],
  ['production-mlops', 'system-design'],
  ['multi-agent', 'system-design'],
  ['safety', 'system-design'],
  ['math-classical-ml', 'coding'],
  ['system-design', 'behavioral'],
];

const GROUP_ORDER = ['foundations', 'models', 'applications', 'agents', 'production', 'rounds'];
const GROUP_COLOURS: Record<string, string> = {
  foundations: '#1d4fc4',
  models: '#0f7f8c',
  applications: '#b4540a',
  agents: '#7a3fc0',
  production: '#1b7856',
  rounds: '#b0296b',
};
const MAX_STAGE = 760;
const SHORT_TITLES: Record<string, string> = {
  'math-classical-ml': 'Classical ML',
  'tokenization-decoding': 'Tokenization',
  'post-training': 'Fine-tuning',
  'inference-serving': 'Serving',
  'gpu-memory-quantization': 'GPU memory',
  'prompting-structured-output': 'Prompting',
  protocols: 'MCP and A2A',
  'multi-agent': 'Multi-agent',
  'evidence-reverse-engineering': 'Evidence',
  'production-mlops': 'MLOps',
  'cost-capacity': 'Cost',
};
const bundle = line<[number, number]>().curve(curveBundle.beta(0.85));

interface NodeSpot {
  angle: number;
  group: string;
}

// Topics sit around a circle, grouped, with a small gap between groups.
function layout(topics: GraphTopic[], width: number) {
  const size = Math.min(width, MAX_STAGE);
  const margin = size < 480 ? 26 : 150;
  const radius = size / 2 - margin;
  const groups = GROUP_ORDER.map((g) => topics.filter((t) => t.group === g));
  const gap = 0.14;
  const step = (Math.PI * 2 - gap * groups.length) / topics.length;
  const spots: Record<string, NodeSpot> = {};
  const hubs: Record<string, number> = {};
  let angle = -Math.PI / 2;
  groups.forEach((group, i) => {
    const start = angle;
    group.forEach((t) => {
      spots[t.id] = { angle: angle + step / 2, group: GROUP_ORDER[i] };
      angle += step;
    });
    hubs[GROUP_ORDER[i]] = (start + angle) / 2;
    angle += gap;
  });
  return { size, radius, spots, hubs };
}

export function InterviewGraph({
  topics,
  activeId,
  onActivate,
}: {
  topics: GraphTopic[];
  activeId: string;
  onActivate: (id: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lineRefs = useRef<(SVGPathElement | null)[]>([]);
  const pausedRef = useRef(false);
  const [width, setWidth] = useState(760);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = new ResizeObserver(() => setWidth(stage.clientWidth));
    observer.observe(stage);
    setWidth(stage.clientWidth);
    return () => observer.disconnect();
  }, []);

  const { size, radius, spots, hubs } = useMemo(() => layout(topics, width), [topics, width]);

  useEffect(() => {
    const centre = size / 2;
    const toXY = (angle: number, r: number): [number, number] => [centre + Math.cos(angle) * r, centre + Math.sin(angle) * r];
    const place = (time: number) => {
      const moved: Record<string, [number, number]> = {};
      topics.forEach((t, i) => {
        const spot = spots[t.id];
        const r = radius + Math.sin(time * 0.0005 + i * 1.7) * 4;
        moved[t.id] = toXY(spot.angle + Math.cos(time * 0.0004 + i * 2.3) * 0.006, r);
        const node = nodeRefs.current[t.id];
        if (node) node.style.transform = `translate(${moved[t.id][0]}px, ${moved[t.id][1]}px)`;
      });
      LINKS.forEach(([a, b], i) => {
        const el = lineRefs.current[i];
        if (!el) return;
        const ga = spots[a].group;
        const gb = spots[b].group;
        const route: [number, number][] =
          ga === gb
            ? [moved[a], toXY(hubs[ga], radius * 0.62), moved[b]]
            : [moved[a], toXY(hubs[ga], radius * 0.5), [centre, centre], toXY(hubs[gb], radius * 0.5), moved[b]];
        el.setAttribute('d', bundle(route) ?? '');
      });
    };
    place(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    let clock = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // The clock stops while a node is hovered, so the target does not move under the cursor.
      if (!pausedRef.current) clock += now - last;
      last = now;
      place(clock);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [topics, size, radius, spots, hubs]);

  const near = new Set([activeId]);
  LINKS.forEach(([a, b]) => {
    if (a === activeId) near.add(b);
    if (b === activeId) near.add(a);
  });
  const isLit = (a: string, b: string) => a === activeId || b === activeId;

  return (
    <div className="si-graph" ref={stageRef} style={{ height: size }}>
      <div className="si-stage" style={{ width: size, height: size }}>
        <svg className="si-edges" width={size} height={size} aria-hidden="true">
          {LINKS.map(([a, b], i) => (
            <path
              key={`${a}-${b}`}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              fill="none"
              stroke={GROUP_COLOURS[spots[a]?.group]}
              className={isLit(a, b) ? 'on' : undefined}
            />
          ))}
        </svg>
        {topics.map((t) => {
          const angle = spots[t.id]?.angle ?? 0;
          const flip = Math.cos(angle) < 0;
          const degrees = (angle * 180) / Math.PI + (flip ? 180 : 0);
          return (
            <button
              key={t.id}
              type="button"
              ref={(el) => {
                nodeRefs.current[t.id] = el;
              }}
              className={`si-node${t.id === activeId ? ' on' : ''}${near.has(t.id) ? '' : ' far'}`}
              style={{ color: GROUP_COLOURS[t.group] }}
              aria-pressed={t.id === activeId}
              aria-label={`${t.title}, ${t.count} questions`}
              onMouseEnter={() => {
                pausedRef.current = true;
                onActivate(t.id);
              }}
              onMouseLeave={() => {
                pausedRef.current = false;
              }}
              onFocus={() => onActivate(t.id)}
              onClick={() => onActivate(t.id)}
            >
              <span className="si-dot" style={{ width: 8 + Math.sqrt(t.count) * 1.5, height: 8 + Math.sqrt(t.count) * 1.5 }} />
              <span
                className={`si-label${flip ? ' flip' : ''}`}
                style={{ transform: `rotate(${degrees}deg)` }}
              >
                {SHORT_TITLES[t.id] ?? t.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
