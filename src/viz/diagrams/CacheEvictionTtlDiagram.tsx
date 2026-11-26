import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  parseCacheRequests,
  simulateCache,
  type CachePolicy,
  type CacheSimulationConfig,
} from '../lib/cacheEvictionTtl';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const POLICY_NAME: Record<CachePolicy, string> = {
  lru: 'LRU (remove least recently used)',
  lfu: 'LFU (remove least frequently used)',
  ttl: 'TTL (expire after a fixed time)',
};

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 132, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>{label}</span>
      <input
        aria-label={label}
        type="number"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min))))}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }}
      />
    </label>
  );
}

const FORMULA: Record<CachePolicy, string> = {
  lru: String.raw`k^*=\arg\min_k\;t_{\text{last use}}(k)`,
  lfu: String.raw`k^*=\arg\min_k\;f(k)`,
  ttl: String.raw`\text{expire }k\text{ when }t\ge t_{\text{write}}(k)+\mathrm{TTL}`,
};

function CachePlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [requestText, setRequestText] = useState('A B A C A D B A');
  const [config, setConfig] = useState<Omit<CacheSimulationConfig, 'requests'>>({
    capacity: 3,
    policy: 'lru',
    ttlSeconds: 4,
    secondsPerRequest: 1,
  });
  const [prediction, setPrediction] = useState<'hit' | 'miss'>('hit');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const requests = useMemo(() => {
    const parsed = parseCacheRequests(requestText);
    return parsed.length > 0 ? parsed : ['A'];
  }, [requestText]);
  const trace = useMemo(() => simulateCache({ ...config, requests }), [config, requests]);
  const playback = usePlaygroundPlayback(trace.length, 1250);
  const step = trace[playback.step] ?? trace[0];
  const nextIndex = (playback.step + 1) % trace.length;
  const nextStep = trace[nextIndex];

  const hitColor = t.accentPrimary;
  const missColor = t.accentDanger;
  const entryColor = t.accentSecondary;
  const expiredColor = t.accentWarn;
  const W = 760;
  const slotGap = 12;
  const slotWidth = Math.min(160, (660 - (config.capacity - 1) * slotGap) / config.capacity);
  const slotsWidth = config.capacity * slotWidth + (config.capacity - 1) * slotGap;
  const slotsLeft = (W - slotsWidth) / 2;

  const update = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setPredictionResult(null);
    playback.reset();
  };

  const happened = step.hit
    ? `Request “${step.request}” was a hit, so the cache returned it without loading it again.`
    : step.expiredKeys.includes(step.request)
      ? `“${step.request}” expired at ${step.timeSeconds}s, so this request became a miss and wrote a fresh copy.`
      : step.evictedKey
        ? `Request “${step.request}” missed. The full cache removed “${step.evictedKey}” before inserting it.`
        : `Request “${step.request}” missed, so it was loaded and placed in an empty cache slot.`;

  const runPrediction = () => {
    const answer = nextStep.hit ? 'hit' : 'miss';
    setPredictionResult(prediction === answer);
    playback.setStep(nextIndex);
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="A cache must decide what to keep and when data is too old"
            description="This solves two problems: eviction chooses what leaves a full cache, while time to live (TTL) removes a value after it has been stored for too long."
          />
          <label style={{ display: 'block', minWidth: 0, marginBottom: 8, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>Requests in order (type keys)</span>
              <input
                aria-label="Cache request sequence"
                value={requestText}
                onChange={(event) => { setRequestText(event.target.value); setPredictionResult(null); playback.reset(); }}
                style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }}
              />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            <NumberInput label="Cache slots" value={config.capacity} min={1} max={6} onChange={(value) => update('capacity', value)} />
            <NumberInput label="TTL seconds" value={config.ttlSeconds} min={1} max={20} onChange={(value) => update('ttlSeconds', value)} />
            <NumberInput label="Seconds / request" value={config.secondsPerRequest} min={0} max={10} onChange={(value) => update('secondsPerRequest', value)} />
          </div>
          <PillSelect<CachePolicy>
            label="Removal rule (how a key leaves)"
            value={config.policy}
            onChange={(next) => update('policy', typeof next === 'function' ? next(config.policy) : next)}
            options={[
              { value: 'lru', label: 'LRU recency' },
              { value: 'lfu', label: 'LFU frequency' },
              { value: 'ttl', label: 'TTL age' },
            ]}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: 15 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span aria-live="polite">Request <strong>{playback.step + 1}</strong> of {trace.length} · hit rate <strong style={{ color: step.hitRate >= 0.5 ? hitColor : missColor }}>{(step.hitRate * 100).toFixed(0)}%</strong></span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginBottom: 4, fontSize: 15 }} aria-label="Cache result legend">
            <span><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: hitColor }} />Hit</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: missColor }} />Miss</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 6, background: expiredColor }} />Expired or evicted</span>
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 310" role="img" aria-label={`${POLICY_NAME[config.policy]} cache after request ${step.request}; ${step.hits} hits and ${step.misses} misses`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id="cache-request-clip"><rect x={22} y={32} width={716} height={76} /></clipPath>
        </defs>
        <text x={22} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>Request stream</text>
        <g clipPath="url(#cache-request-clip)">
          {requests.map((request, index) => {
            const x = 34 + index * 43;
            const revealed = index <= playback.step;
            const result = trace[index];
            return (
              <g key={`${request}-${index}`} opacity={revealed ? 1 : 0.25}>
                <rect x={x} y={46} width={28} height={28} rx={4} fill={revealed ? (result.hit ? hitColor : missColor) : t.surfaceAlt} />
                <text x={x + 14} y={65} textAnchor="middle" fontSize={15} fontWeight={700} fill={revealed ? t.background : t.textSecondary}>{request.slice(0, 3)}</text>
                <text x={x + 14} y={94} textAnchor="middle" fontSize={14} fill={revealed ? (result.hit ? hitColor : missColor) : t.textMuted}>{revealed ? (result.hit ? 'hit' : 'miss') : 'later'}</text>
              </g>
            );
          })}
        </g>
        <text x={22} y={132} fontSize={16} fontWeight={700} fill={entryColor}>Cache after “{step.request}” at {step.timeSeconds}s</text>
        <text x={738} y={132} textAnchor="end" fontSize={14} fill={t.textSecondary}>{config.policy === 'lru' ? 'oldest use → newest use' : config.policy === 'lfu' ? 'frequency is written in each slot' : 'seconds left are written in each slot'}</text>

        {Array.from({ length: config.capacity }, (_, index) => {
          const entry = step.entries[index];
          const x = slotsLeft + index * (slotWidth + slotGap);
          const ttlLeft = entry ? Math.max(0, entry.expiresAt - step.timeSeconds) : 0;
          return (
            <g key={index}>
              <rect x={x} y={154} width={slotWidth} height={82} rx={8} fill={entry ? `${entryColor}20` : t.surfaceAlt} stroke={entry ? entryColor : t.border} strokeWidth={entry ? 2 : 1.5} strokeDasharray={entry ? undefined : '6 5'} />
              <text x={x + slotWidth / 2} y={181} textAnchor="middle" fontSize={16} fontWeight={700} fill={entry ? entryColor : t.textMuted}>{entry ? `key “${entry.key.slice(0, 5)}”` : 'empty slot'}</text>
              {entry && <text x={x + slotWidth / 2} y={208} textAnchor="middle" fontSize={14} fill={t.textPrimary}>{config.policy === 'lfu' ? `used ${entry.frequency} time${entry.frequency === 1 ? '' : 's'}` : config.policy === 'ttl' ? `${ttlLeft}s until expiry` : `last used at ${entry.lastUsedAt}s`}</text>}
            </g>
          );
        })}

        <text x={22} y={274} fontSize={15} fontWeight={700} fill={step.hit ? hitColor : missColor}>{step.hit ? 'Cache hit: no origin load' : 'Cache miss: load from the origin'}</text>
        {(step.evictedKey || step.expiredKeys.length > 0) && <text x={738} y={274} textAnchor="end" fontSize={15} fontWeight={700} fill={expiredColor}>{step.expiredKeys.length > 0 ? `Expired: ${step.expiredKeys.join(', ')}` : `Evicted: ${step.evictedKey}`}</text>}
        <text x={22} y={300} fontSize={14} fill={t.textSecondary}>Hits {step.hits} · misses {step.misses} · total {step.hits + step.misses} · hit rate {(step.hitRate * 100).toFixed(1)}%</text>
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title={POLICY_NAME[config.policy]} latex={FORMULA[config.policy]} color="yellow" tilt={-1}><p>{config.policy === 'ttl' ? 'A hit does not restart this fixed write-time TTL.' : 'Ties are broken by the older last-use time.'}</p></StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${trace.length}`} color="blue" tilt={1} live><p>{happened}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {(['lru', 'lfu', 'ttl'] as const).map((policy, index) => (
              <StickyNote key={policy} title={POLICY_NAME[policy]} latex={FORMULA[policy]} color={index === 0 ? 'yellow' : index === 1 ? 'pink' : 'orange'} tilt={index % 2 ? 1 : -1} active={config.policy === policy} onSelect={() => update('policy', policy)}>
                <p>{policy === 'lru' ? 'k is a cache key; remove the key with the oldest last-use time.' : policy === 'lfu' ? 'f(k) is key k’s use count; remove the smallest count and use recency to break ties.' : 't is the current time; remove key k when its write time plus TTL has arrived.'}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p>{step.hits} hits ÷ {step.hits + step.misses} requests = <strong>{(step.hitRate * 100).toFixed(1)}% hit rate</strong>. The picture contains {step.entries.length} of {config.capacity} slots.</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live><p>{happened}</p></StickyNote>
          </StickyRow>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px dashed ${t.border}`, fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>Will the next request “{nextStep.request}” be a hit or a miss?</span>
            <select aria-label="Predicted next cache result" value={prediction} onChange={(event) => { setPrediction(event.target.value as 'hit' | 'miss'); setPredictionResult(null); }} style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }}>
              <option value="hit">Hit</option>
              <option value="miss">Miss</option>
            </select>
            <VizButton onClick={runPrediction}>Run next request</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? hitColor : missColor, fontWeight: 700 }}>{predictionResult ? 'Correct.' : `It was a ${nextStep.hit ? 'hit' : 'miss'}.`}</span>}
          </div>
        </>
      )}
    </>
  );
}

export default function CacheEvictionTtlDiagram({ compact = false }: { compact?: boolean }) {
  return (
    <VisualizationContainer
      title="Cache eviction and TTL playground"
      footer="Every hit, miss, eviction, and expiry is computed from the typed request sequence. TTL is fixed from write time; LRU and LFU use the exact recency and frequency values shown in the cache slots."
    >
      <CachePlayground compact={compact} />
    </VisualizationContainer>
  );
}
