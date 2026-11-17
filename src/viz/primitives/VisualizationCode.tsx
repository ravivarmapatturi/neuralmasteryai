import { useEffect, useState } from 'react';
import { useVizTokens, SPACING } from '../../theme/vizTokens';
import SketchBox from '../../components/notebook/SketchBox';

// Fine-grained Shiki bundle -- explicit lang/theme/engine imports, not the
// top-level `shiki` package's createHighlighter(), which bundles all ~200
// language grammars as build output regardless of which ones are actually
// requested (blew several chunks past 500kB-800kB in testing, including
// languages this site will never use). Only what's needed, code-split from
// the main bundle via the dynamic import below, loaded once on first use.
const LANGS = ['python', 'javascript', 'typescript', 'jsx', 'tsx', 'bash', 'json', 'yaml', 'sql', 'dockerfile', 'hcl', 'protobuf', 'wgsl'] as const;
type Lang = (typeof LANGS)[number];

async function createSiteHighlighter() {
  const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
  ]);
  const [python, javascript, typescript, jsx, tsx, bash, json, yaml, sql, dockerfile, hcl, protobuf, wgsl, githubDark, githubLight] = await Promise.all([
    import('shiki/langs/python.mjs'),
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/typescript.mjs'),
    import('shiki/langs/jsx.mjs'),
    import('shiki/langs/tsx.mjs'),
    import('shiki/langs/bash.mjs'),
    import('shiki/langs/json.mjs'),
    import('shiki/langs/yaml.mjs'),
    import('shiki/langs/sql.mjs'),
    import('shiki/langs/dockerfile.mjs'),
    import('shiki/langs/hcl.mjs'),
    import('shiki/langs/protobuf.mjs'),
    import('shiki/langs/wgsl.mjs'),
    import('shiki/themes/github-dark.mjs'),
    import('shiki/themes/github-light.mjs'),
  ]);
  return createHighlighterCore({
    langs: [python.default, javascript.default, typescript.default, jsx.default, tsx.default, bash.default, json.default, yaml.default, sql.default, dockerfile.default, hcl.default, protobuf.default, wgsl.default],
    themes: [githubDark.default, githubLight.default],
    engine: createJavaScriptRegexEngine(),
  });
}

type SiteHighlighter = Awaited<ReturnType<typeof createSiteHighlighter>>;
let highlighterPromise: Promise<SiteHighlighter> | null = null;

function getHighlighter(): Promise<SiteHighlighter> {
  if (!highlighterPromise) highlighterPromise = createSiteHighlighter();
  return highlighterPromise;
}

/**
 * Shiki-highlighted code, tied to whatever the visualization is currently
 * showing -- the "Code" step of Intuition -> Visualization -> Interaction
 * -> Experimentation -> Mathematics -> Code. Renders the raw text
 * immediately as a fallback (highlighter loads async, cached after first use)
 * so there's no blank flash.
 */
export default function VisualizationCode({
  code,
  lang = 'python',
}: {
  code: string;
  lang?: string;
}) {
  const t = useVizTokens();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const safeLang: Lang = (LANGS as readonly string[]).includes(lang) ? (lang as Lang) : 'python';
    getHighlighter().then((highlighter) => {
      if (cancelled) return;
      setHtml(highlighter.codeToHtml(code, { lang: safeLang, theme: t.mode === 'dark' ? 'github-dark' : 'github-light' }));
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang, t.mode]);

  // Page standard 2.7: code sits on light paper with a pen border and the
  // language written by hand at the top -- never a black slab.
  const label = lang === 'text' ? 'output' : lang;
  return (
    <SketchBox color={t.border} strokeWidth={1.3} style={{ marginTop: SPACING.sm }}>
      <div className="nm-code-paper" style={{ padding: '0.5rem 0.9rem 0.75rem' }}>
        <div style={{ fontFamily: "'Kalam', cursive", fontSize: 15, color: t.textMuted, marginBottom: 4 }}>{label}</div>
        {html ? (
          <div
            style={{ overflowX: 'auto', fontSize: 15 }}
            // eslint-disable-next-line react/no-danger -- Shiki's own escaped output
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre style={{ margin: 0, overflowX: 'auto', fontSize: 15, color: t.textPrimary, background: 'transparent' }}>
            <code>{code}</code>
          </pre>
        )}
      </div>
    </SketchBox>
  );
}
