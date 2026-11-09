import { useEffect, useMemo, useRef, useState } from 'react';
import { curveBundle, line } from 'd3-shape';
import {
  calculateTopicProgress,
  calculateEdgeProgress,
  getEdgeStrokeWidth,
  getEdgeOpacity,
  getNodeDotSize,
  getNodeRingSize,
  getNodeRingStrokeWidth,
  getNodeOpacity,
  formatAccessibleTopicLabel,
} from './masteryScale';

export interface GraphTopic {
  id: string;
  title: string;
  group: string;
  count: number;
  done?: number;
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
const GROUP_LABELS: Record<string, string> = {
  foundations: 'Foundations',
  models: 'Models',
  applications: 'Applications',
  agents: 'Agents',
  production: 'Production',
  rounds: 'Rounds',
};
const GROUP_COLOURS_LIGHT: Record<string, string> = {
  foundations: '#1d4fc4',
  models: '#0f7f8c',
  applications: '#935e06',
  agents: '#6d3fb8',
  production: '#1b7856',
  rounds: '#ad3427',
};
const GROUP_COLOURS_DARK: Record<string, string> = {
  foundations: '#8fb0ff',
  models: '#4dd4c6',
  applications: '#e7b65c',
  agents: '#bda2ff',
  production: '#6fd3a8',
  rounds: '#f39a8e',
};
const MAX_STAGE = 780;
const SHORT_TITLES: Record<string, string> = {
  'math-classical-ml': 'Classical ML',
  'tokenization-decoding': 'Tokenization',
  'post-training': 'Fine-tuning',
  'inference-serving': 'Serving',
  'gpu-memory-quantization': 'GPU memory',
  'prompting-structured-output': 'Prompting',
  protocols: 'MCP & A2A',
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
  const margin = size < 480 ? 36 : size < 600 ? 92 : 102;
  const radius = Math.max(90, size / 2 - margin);
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
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
    };
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', checkTheme);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', checkTheme);
    };
  }, []);

  const groupColours = isDark ? GROUP_COLOURS_DARK : GROUP_COLOURS_LIGHT;
  const activeTopic = topics.find((t) => t.id === activeId) ?? topics[0];

  const progressMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateTopicProgress>> = {};
    for (const t of topics) {
      map[t.id] = calculateTopicProgress(t.done ?? 0, t.count);
    }
    return map;
  }, [topics]);

  const groupSummaries = useMemo(() => {
    return GROUP_ORDER.map((groupKey) => {
      const groupTopics = topics.filter((t) => t.group === groupKey);
      const count = groupTopics.reduce((acc, t) => acc + t.count, 0);
      const done = groupTopics.reduce((acc, t) => acc + (t.done ?? 0), 0);
      const progress = calculateTopicProgress(done, count);
      return {
        id: groupKey,
        label: GROUP_LABELS[groupKey] ?? groupKey,
        count,
        done,
        pct: progress.pct,
        isComplete: progress.isComplete,
        color: groupColours[groupKey],
        firstTopicId: groupTopics[0]?.id,
      };
    });
  }, [topics, groupColours]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return undefined;
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
    <div className="si-graph" ref={stageRef}>
      <div className="si-stage" style={{ width: size, height: size }}>
        <svg className="si-edges" width={size} height={size} aria-hidden="true">
          {LINKS.map(([a, b], i) => {
            const edgeProg = calculateEdgeProgress(
              progressMap[a]?.ratio ?? 0,
              progressMap[b]?.ratio ?? 0
            );
            const strokeWidth = getEdgeStrokeWidth(edgeProg, isLit(a, b));
            const opacity = getEdgeOpacity(edgeProg, isLit(a, b), isDark);
            return (
              <path
                key={`${a}-${b}`}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                fill="none"
                stroke={groupColours[spots[a]?.group]}
                style={{
                  strokeWidth,
                  opacity,
                }}
                className={isLit(a, b) ? 'on' : undefined}
              />
            );
          })}
        </svg>
        {width < 640 && activeTopic && (() => {
          const activeProgress = progressMap[activeTopic.id] ?? calculateTopicProgress(activeTopic.done, activeTopic.count);
          const activeGroup = groupSummaries.find((g) => g.id === activeTopic.group);
          return (
            <div
              className="si-graph-hud"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                maxWidth: Math.max(120, radius * 1.3),
                zIndex: 1,
              }}
            >
              <span
                className="si-hud-group"
                style={{
                  color: groupColours[activeTopic.group],
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'block',
                }}
              >
                {activeGroup && activeGroup.pct > 0
                  ? `${activeGroup.label} · ${activeGroup.pct}%`
                  : activeTopic.group}
              </span>
              <span
                className="si-hud-title"
                style={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: width < 400 ? '0.86rem' : '0.96rem',
                  lineHeight: 1.2,
                  color: 'var(--fg)',
                  margin: '2px 0 3px',
                }}
              >
                {activeTopic.title}{activeProgress.pct > 0 ? ` ${activeProgress.pct}%` : ''}
              </span>
              <span
                className="si-hud-count"
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--soft)',
                  display: 'block',
                }}
              >
                {activeTopic.count} Qs{activeTopic.done ? ` · ${activeTopic.done} done` : ''}
              </span>
            </div>
          );
        })()}
        {topics.map((t) => {
          const angle = spots[t.id]?.angle ?? 0;
          const flip = Math.cos(angle) < 0;
          const degrees = (angle * 180) / Math.PI + (flip ? 180 : 0);
          const progress = progressMap[t.id] ?? calculateTopicProgress(t.done ?? 0, t.count);
          const isNear = near.has(t.id);
          const isFar = !isNear;
          const nodeOpacity = getNodeOpacity(progress.ratio, isFar);
          const dotSize = getNodeDotSize(t.count, progress.ratio);
          const ringStroke = getNodeRingStrokeWidth(progress.ratio);
          const ringSize = getNodeRingSize(dotSize, progress.ratio);
          const isComplete = progress.isComplete;
          const baseTitle = SHORT_TITLES[t.id] ?? t.title;
          const ariaLabel = formatAccessibleTopicLabel(t.title, progress.pct, t.done ?? 0, t.count);

          return (
            <button
              key={t.id}
              type="button"
              ref={(el) => {
                nodeRefs.current[t.id] = el;
              }}
              className={`si-node${t.id === activeId ? ' on' : ''}${isFar ? ' far' : ''}${isComplete ? ' is-complete' : ''}`}
              style={{
                color: groupColours[t.group],
                opacity: nodeOpacity,
              }}
              aria-pressed={t.id === activeId}
              aria-label={ariaLabel}
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
              <span
                className="si-dot"
                style={{
                  width: dotSize,
                  height: dotSize,
                }}
              />
              {progress.pct > 0 && (
                <span
                  className={`si-ring${isComplete ? ' is-complete' : ''}`}
                  style={{
                    width: ringSize,
                    height: ringSize,
                    background: isComplete
                      ? 'currentColor'
                      : `conic-gradient(currentColor ${progress.pct * 3.6}deg, var(--line) 0deg)`,
                    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ringStroke}px), #000 calc(100% - ${ringStroke - 0.5}px))`,
                    mask: `radial-gradient(farthest-side, transparent calc(100% - ${ringStroke}px), #000 calc(100% - ${ringStroke - 0.5}px))`,
                  }}
                />
              )}
              <span
                className={`si-label${flip ? ' flip' : ''}${isComplete ? ' is-complete' : ''}`}
                style={{ transform: `rotate(${degrees}deg)` }}
              >
                <span className="si-label-title">{baseTitle}</span>
                {progress.pct > 0 && <span className="si-label-pct"> {progress.pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="si-group-totals" role="region" aria-label="Topic group totals">
        {groupSummaries.map((g) => {
          const isGroupActive = activeTopic?.group === g.id;
          return (
            <button
              key={g.id}
              type="button"
              className={`si-group-pill${isGroupActive ? ' active' : ''}${g.isComplete ? ' is-complete' : ''}`}
              onClick={() => g.firstTopicId && onActivate(g.firstTopicId)}
              aria-label={`${g.label} group: ${g.done} of ${g.count} questions completed (${g.pct}%)`}
              title={`${g.label}: ${g.done} of ${g.count} questions completed (${g.pct}%)`}
            >
              <span className="si-group-pill-dot" style={{ backgroundColor: g.color }} />
              <span className="si-group-pill-label">{g.label}</span>
              <span className="si-group-pill-stat">
                {g.done}/{g.count}
                {g.pct > 0 && <span className="si-group-pill-pct"> ({g.pct}%)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
