import { useEffect, useMemo, useRef, useState } from 'react';
import BrandMark from '../brand/BrandMark';
import {
  calculateTopicProgress,
  formatAccessibleTopicLabel,
  getBranchLevel,
  getBranchStrokeWidth,
} from './masteryScale';

export interface GraphTopic {
  id: string;
  title: string;
  group: string;
  count: number;
  done?: number;
}

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
const MAX_STAGE = 820;
// Below this stage width the map has no room for a card on each side, so the topics become a plain grid.
const MAP_MIN_WIDTH = 600;
const CARD_W = 158;
const CARD_H = 46;
const ROW_GAP = 10;
const SHORT_TITLES: Record<string, string> = {
  'math-classical-ml': 'Classical ML',
  'deep-learning': 'Deep Learning',
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
  debug: 'Debug',
};
// One small line icon per topic, drawn on a 24 by 24 grid.
const ICONS: Record<string, string> = {
  'math-classical-ml': 'M4 20L20 6M6 8h.01M10 13h.01M15 17h.01M18 11h.01',
  'deep-learning': 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  transformers: 'M4 6h16M4 12h16M4 18h16M8 6v12M16 6v12',
  'tokenization-decoding': 'M5 5h14M12 5v14M9 19h6',
  'post-training': 'M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4',
  'inference-serving': 'M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A4.5 4.5 0 0 1 17 18z',
  'gpu-memory-quantization': 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  rag: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3',
  'prompting-structured-output': 'M4 5h16v11H9l-5 4z',
  evaluation: 'M4 20h16M7 20v-6M12 20V8M17 20V11',
  multimodal: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  agents: 'M7 9h10v9H7zM12 9V5M12 5h.01M10 13h.01M14 13h.01M4 13v3M20 13v3',
  protocols: 'M9 15l6-6M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2',
  'multi-agent': 'M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 8v4M12 12l-5.5 4.5M12 12l5.5 4.5',
  sandboxes: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  'evidence-reverse-engineering': 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4',
  'production-mlops': 'M7 9a3 3 0 1 0 0 6c2.5 0 3.5-2 5-3s2.5-3 5-3a3 3 0 1 1 0 6c-2.5 0-3.5-2-5-3s-2.5-3-5-3z',
  'cost-capacity': 'M12 3v18M16 8c0-1.7-1.8-3-4-3s-4 1.1-4 3c0 4 8 2 8 6 0 1.9-1.8 3-4 3s-4-1.3-4-3',
  safety: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  'system-design': 'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
  coding: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  behavioral: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  debug: 'M3 12h4l2-6 4 12 2-6h6',
};
const FALLBACK_ICON = 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z';
// Every topic gets its own ink colour, like a hand-coloured mind map.
const INKS = [
  '#e4572e', '#f29e4c', '#e9b10a', '#8ac926', '#2a9d8f', '#1982c4', '#6a4c93', '#d81b60',
  '#ff6f59', '#43aa8b', '#577590', '#c77dff', '#f3722c', '#0fa3b1', '#b5179e', '#90be6d',
  '#ef476f', '#118ab2', '#9c6644', '#06d6a0', '#7209b7', '#f8961e', '#3a86ff',
];

interface Spot {
  side: 'left' | 'right';
  /** Where the branch ends and the card begins. */
  x: number;
  y: number;
  path: string;
}

// The first half of the topics runs down the right side and the rest runs back up the left,
// so groups stay together going clockwise. Rows are evenly spaced, so cards never overlap.
function layout(topics: GraphTopic[], width: number) {
  const w = Math.min(width, MAX_STAGE);
  const rightCount = Math.ceil(topics.length / 2);
  const leftCount = topics.length - rightCount;
  const h = rightCount * CARD_H + (rightCount - 1) * ROW_GAP + 16;
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - CARD_W - 22;
  const ry = h * 0.62;
  const top = 8 + CARD_H / 2;
  const span = h - 16 - CARD_H;
  const spots: Record<string, Spot> = {};
  topics.forEach((t, i) => {
    const right = i < rightCount;
    const rowShare = right
      ? (rightCount > 1 ? i / (rightCount - 1) : 0.5)
      : (leftCount > 1 ? 1 - (i - rightCount) / (leftCount - 1) : 0.5);
    const y = top + span * rowShare;
    const reach = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    const x = right ? cx + reach : cx - reach;
    const mid = cx + (x - cx) * 0.5;
    spots[t.id] = {
      side: right ? 'right' : 'left',
      x,
      y,
      path: `M${cx.toFixed(1)} ${cy.toFixed(1)}C${mid.toFixed(1)} ${cy.toFixed(1)} ${mid.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`,
    };
  });
  return { w, h, spots };
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
  const [width, setWidth] = useState(760);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' || theme === 'forest' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark' || theme === 'forest' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
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
    // A hidden or unmeasured stage reports 0; keep the last real width then.
    const measure = () => {
      if (stage.clientWidth > 0) setWidth(stage.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => observer.disconnect();
  }, []);

  const isMap = width >= MAP_MIN_WIDTH;
  const { w, h, spots } = useMemo(() => layout(topics, width), [topics, width]);

  return (
    <div className="si-graph" ref={stageRef}>
      <div className={`si-stage${isMap ? ' is-map' : ' is-grid'}`} style={isMap ? { width: w, height: h } : undefined}>
        {isMap && (
          <svg className="si-branches" width={w} height={h} aria-hidden="true">
            <defs>
              <filter id="si-pencil" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="4" />
              </filter>
            </defs>
            {topics.map((t, i) => {
              const level = getBranchLevel(progressMap[t.id]?.pct ?? 0);
              const spot = spots[t.id];
              return (
                <g key={t.id} className={`si-branch lvl-${level}`} data-topic={t.id} filter="url(#si-pencil)" style={{ ['--ink' as string]: INKS[i % INKS.length] }}>
                  <path d={spot.path} fill="none" strokeLinecap="round" style={{ strokeWidth: getBranchStrokeWidth(level) }} />
                  <circle cx={spot.x} cy={spot.y} r={5.5 + level * 0.6} />
                </g>
              );
            })}
          </svg>
        )}
        {isMap && (
          <div className="si-hub" aria-hidden="true">
            <BrandMark size={34} />
            <span>Interview practice</span>
          </div>
        )}
        {topics.map((t, i) => {
          const progress = progressMap[t.id] ?? calculateTopicProgress(t.done ?? 0, t.count);
          const level = getBranchLevel(progress.pct);
          const spot = spots[t.id];
          const position = isMap
            ? { left: spot.side === 'right' ? spot.x + 12 : spot.x - 12 - CARD_W, top: spot.y - CARD_H / 2, width: CARD_W, height: CARD_H }
            : undefined;
          return (
            <button
              key={t.id}
              type="button"
              className={`si-node lvl-${level}${t.id === activeId ? ' on' : ''}${progress.isComplete ? ' is-complete' : ''}`}
              style={{ ...position, ['--ink' as string]: INKS[i % INKS.length], ['--tilt' as string]: `${((i * 37) % 5) - 2}deg` }}
              aria-pressed={t.id === activeId}
              aria-label={formatAccessibleTopicLabel(t.title, progress.pct, t.done ?? 0, t.count)}
              onClick={() => onActivate(t.id)}
            >
              <svg className="si-node-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <path d={ICONS[t.id] ?? FALLBACK_ICON} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="si-node-text">
                <span className="si-label">{SHORT_TITLES[t.id] ?? t.title}</span>{' '}
                <span className="si-node-meter">
                  <span className="si-bar"><i style={{ width: `${progress.pct}%` }} /></span>
                  <span className="si-label-pct">{progress.pct}%</span>
                </span>
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
      <div className="si-mock-entry">
        <a href="/interview/mock" className="si-mock-link">
          Timed mock interview (30 or 60 min) →
        </a>
      </div>
    </div>
  );
}
