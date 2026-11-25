import { useCallback, useMemo, useRef, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  computePrefixCacheDiff,
  formatVisibleTokenText,
  preTokenizePreview,
  type InspectedToken,
} from './prefixCacheDiff';
import './playgroundTools.css';

interface PromptPairPreset {
  id: string;
  label: string;
  note: string;
  turn1: string;
  turn2: string;
}

const PRESETS: PromptPairPreset[] = [
  {
    id: 'timestamp-front',
    label: 'Timestamp at top (cache killer)',
    note: 'A single volatile timestamp before the static instructions invalidates every downstream token.',
    turn1:
      '[Time: 2026-11-25T18:00:00Z]\nSystem: You are a repository triage engineer. Always cite exact file paths and test exit codes before finishing. Never invent tool outputs or skip failing assertions.\nTools: read_file(path), grep(pattern), run_tests(suite)\nUser: Inspect auth/session.py for token expiry bugs.',
    turn2:
      '[Time: 2026-11-25T18:01:12Z]\nSystem: You are a repository triage engineer. Always cite exact file paths and test exit codes before finishing. Never invent tool outputs or skip failing assertions.\nTools: read_file(path), grep(pattern), run_tests(suite)\nUser: Now check tests/test_session.py.',
  },
  {
    id: 'timestamp-tail',
    label: 'Static prefix first (cache hit)',
    note: 'Moving the dynamic timestamp and recalled facts after the static prefix keeps all prefix blocks intact.',
    turn1:
      'System: You are a repository triage engineer. Always cite exact file paths and test exit codes before finishing. Never invent tool outputs or skip failing assertions.\nTools: read_file(path), grep(pattern), run_tests(suite)\n[Time: 2026-11-25T18:00:00Z]\nUser: Inspect auth/session.py for token expiry bugs.',
    turn2:
      'System: You are a repository triage engineer. Always cite exact file paths and test exit codes before finishing. Never invent tool outputs or skip failing assertions.\nTools: read_file(path), grep(pattern), run_tests(suite)\n[Time: 2026-11-25T18:01:12Z]\nUser: Now check tests/test_session.py.',
  },
  {
    id: 'memory-inject',
    label: 'Memory injected mid-system',
    note: 'Inserting recalled episodic facts before tool schemas breaks prefix alignment right where the facts enter.',
    turn1:
      'System: You are a Python build assistant.\nTools: read_file(path), edit_file(path), run_pytest(target)\nUser: Fix the import cycle in workers/loader.py.',
    turn2:
      'System: You are a Python build assistant.\nRecalled memory: Repo uses pnpm 8 and Python 3.12.\nTools: read_file(path), edit_file(path), run_pytest(target)\nUser: Fix the import cycle in workers/loader.py.',
  },
];

interface LoadedTokenizer {
  encode: (text: string, options?: { add_special_tokens?: boolean }) => number[];
  decode: (ids: number[], options?: { skip_special_tokens?: boolean; clean_up_tokenization_spaces?: boolean }) => string;
}

export default function TokenizerPrefixCacheInspector() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const tokenizerRef = useRef<LoadedTokenizer | null>(null);

  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [turn1, setTurn1] = useState(PRESETS[0].turn1);
  const [turn2, setTurn2] = useState(PRESETS[0].turn2);
  const [blockSize, setBlockSize] = useState<number>(16);
  const [tokenizerState, setTokenizerState] = useState<'preview' | 'loading' | 'ready' | 'error'>('preview');
  const [tokenizerStatus, setTokenizerStatus] = useState(
    'Running local pre-tokenizer preview. Click Load GPT-2 BPE tokenizer to run the real 50,257-token vocabulary.',
  );
  const [tokenizerVersion, setTokenizerVersion] = useState(0);

  const loadGpt2Tokenizer = useCallback(async () => {
    if (tokenizerRef.current) {
      setTokenizerState('ready');
      return;
    }
    setTokenizerState('loading');
    setTokenizerStatus('Loading Xenova/gpt2 BPE tokenizer vocabulary (~1.4 MB, cached in browser)…');
    try {
      const { AutoTokenizer, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const loaded = (await AutoTokenizer.from_pretrained('Xenova/gpt2')) as unknown as LoadedTokenizer;
      tokenizerRef.current = loaded;
      setTokenizerState('ready');
      setTokenizerStatus('Real Xenova/gpt2 BPE tokenizer loaded (50,257-token vocabulary).');
      setTokenizerVersion((v) => v + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTokenizerState('error');
      setTokenizerStatus(`Could not download Xenova/gpt2 tokenizer (${msg}). Continuing with local pre-tokenizer preview.`);
    }
  }, []);

  const tokenizePrompt = useCallback(
    (text: string): InspectedToken[] => {
      const tok = tokenizerRef.current;
      if (!tok || tokenizerState !== 'ready') {
        return preTokenizePreview(text);
      }
      const ids = tok.encode(text, { add_special_tokens: false });
      return ids.map((id) => ({
        id,
        text: tok.decode([id], { skip_special_tokens: false, clean_up_tokenization_spaces: false }) || `[${id}]`,
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenizerState, tokenizerVersion],
  );

  const tokens1 = useMemo(() => tokenizePrompt(turn1), [tokenizePrompt, turn1]);
  const tokens2 = useMemo(() => tokenizePrompt(turn2), [tokenizePrompt, turn2]);
  const diff = useMemo(
    () => computePrefixCacheDiff(tokens1, tokens2, blockSize),
    [tokens1, tokens2, blockSize],
  );

  const applyPreset = (id: string) => {
    const found = PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPresetId(id);
    setTurn1(found.turn1);
    setTurn2(found.turn2);
  };

  const activePreset = PRESETS.find((p) => p.id === presetId);

  return (
    <VisualizationContainer
      title="Tokenizer & Prefix-Cache Boundary Inspector"
      footer={`Comparing Turn 1 (${tokens1.length} tokens) against Turn 2 (${tokens2.length} tokens) with KV block size ${diff.blockSize}: ${diff.cachedPrefixTokens} tokens reused (${diff.hitRatePercent.toFixed(1)}% hit rate), ${diff.recomputedTurn2Tokens} tokens recomputed.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="KV prefix cache boundary"
          title="See exactly where a prompt edit invalidates the KV cache"
          description="Edit Turn 1 and Turn 2 prompts or switch layout presets to observe subword boundaries and the exact token where prefix caching breaks."
        />

        <div className="nm-pg__panel nm-pg__panel--alt" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, color: t.textPrimary }} role="status" aria-live="polite">
              <strong>Tokenizer:</strong> {tokenizerStatus}
            </div>
            <button
              type="button"
              className="nm-pg__chip-btn nm-pg__chip-btn--primary"
              disabled={tokenizerState === 'loading' || tokenizerState === 'ready'}
              onClick={loadGpt2Tokenizer}
            >
              {tokenizerState === 'loading'
                ? 'Loading GPT-2 BPE…'
                : tokenizerState === 'ready'
                  ? 'GPT-2 BPE loaded'
                  : 'Load GPT-2 BPE tokenizer'}
            </button>
          </div>
        </div>

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<string>
            label="Prompt ordering scenario"
            value={presetId}
            onChange={applyPreset}
            options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />
          {activePreset && <p className="nm-pg__sub" style={{ margin: 0 }}>{activePreset.note}</p>}

          <PillSelect<number>
            label="KV cache page / block size"
            value={blockSize}
            onChange={setBlockSize}
            options={[
              { value: 1, label: '1 token (exact radix)' },
              { value: 16, label: '16 tokens (paged block)' },
              { value: 32, label: '32 tokens (large page)' },
            ]}
          />
        </div>

        <div className="nm-pg__grid-equal" style={{ marginBottom: '1rem' }}>
          <label className="nm-pg__field">
            <span>Turn 1 prompt (cached baseline, {tokens1.length} tokens)</span>
            <textarea
              value={turn1}
              onChange={(e) => setTurn1(e.target.value)}
              rows={5}
            />
          </label>
          <label className="nm-pg__field">
            <span>Turn 2 prompt (incoming request, {tokens2.length} tokens)</span>
            <textarea
              value={turn2}
              onChange={(e) => setTurn2(e.target.value)}
              rows={5}
            />
          </label>
        </div>

        <div className="nm-pg__kpis" aria-label="Prefix cache metrics">
          <div className="nm-pg__kpi">
            Common prefix tokens
            <strong>{diff.commonPrefixTokens}</strong>
          </div>
          <div className={`nm-pg__kpi ${diff.cachedPrefixTokens > 0 ? 'nm-pg__kpi--good' : 'nm-pg__kpi--bad'}`}>
            Reusable cached tokens
            <strong>{diff.cachedPrefixTokens}</strong>
          </div>
          <div className="nm-pg__kpi nm-pg__kpi--warn">
            Recomputed tail tokens
            <strong>{diff.recomputedTurn2Tokens}</strong>
          </div>
          <div className={`nm-pg__kpi ${diff.hitRatePercent >= 50 ? 'nm-pg__kpi--good' : 'nm-pg__kpi--bad'}`}>
            Prefix hit rate
            <strong>{diff.hitRatePercent.toFixed(1)}%</strong>
          </div>
        </div>

        <div className="nm-pg__panel">
          <h3 className="nm-pg__panel-title">
            Turn 2 token stream ({diff.breakIndex === null ? '100% prefix match' : `cache breaks at token index ${diff.breakIndex}`})
          </h3>
          <p className="nm-pg__sub">
            Green tokens hit reusable KV cache blocks; the red token is the first divergence where all remaining amber tokens must be prefilled fresh.
          </p>
          <div className="nm-pg__token-row" aria-label="Turn 2 token cache status">
            {tokens2.map((tok, idx) => {
              const isCached = idx < diff.cachedPrefixTokens;
              const isAlignedTailCommon = idx >= diff.cachedPrefixTokens && idx < diff.commonPrefixTokens;
              const isBreak = diff.breakIndex !== null && idx === diff.breakIndex;
              const cls = isBreak
                ? 'nm-pg__token nm-pg__token--break'
                : isCached
                  ? 'nm-pg__token nm-pg__token--hit'
                  : 'nm-pg__token nm-pg__token--miss';
              const tag = isBreak
                ? 'Break'
                : isCached
                  ? 'Hit'
                  : isAlignedTailCommon
                    ? 'Partial block'
                    : 'Miss';
              return (
                <span
                  key={`${idx}-${tok.id ?? tok.text}`}
                  className={cls}
                  title={`Index ${idx} · ${tag}${tok.id !== null ? ` · ID ${tok.id}` : ''}`}
                >
                  <span>{formatVisibleTokenText(tok.text)}</span>
                  {tok.id !== null && (
                    <span style={{ color: t.textMuted, fontSize: 13 }}>#{tok.id}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
