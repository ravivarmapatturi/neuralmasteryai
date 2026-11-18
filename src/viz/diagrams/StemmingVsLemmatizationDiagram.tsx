import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { stem, lemmatize } from '../lib/classicalNlp';

const WORDS = ['running', 'universities', 'better', 'studies', 'mice', 'runs'];

export default function StemmingVsLemmatizationDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(WORDS.length, 2200);
  const [userWord, setUserWord] = useState<number | null>(null);
  const activeIdx = userWord ?? autoIdx;

  return (
    <VisualizationContainer footer="Stemming is blind suffix-stripping (real rules, applied live) -- fast but sometimes produces a non-word or misses irregular forms entirely. Lemmatization uses an actual vocabulary lookup -- slower to build, but always returns a real dictionary form, including irregulars a suffix rule can never catch.">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${t.border}` }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textMuted, fontWeight: 600 }}>word</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: t.textSecondary, fontWeight: 600 }}>stem()</th>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: t.accentPrimary, fontWeight: 600 }}>lemmatize()</th>
          </tr>
        </thead>
        <tbody>
          {WORDS.map((w, idx) => {
            const isSelected = idx === activeIdx;
            const s = stem(w);
            const l = lemmatize(w);
            const stemLooksWrong = s !== l.toLowerCase();
            return (
              <tr key={w} onClick={() => setUserWord(idx)} style={{ borderBottom: `1px solid ${t.border}`, background: isSelected ? `${t.accentPrimary}15` : 'transparent', cursor: 'pointer' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{w}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: stemLooksWrong ? t.accentDanger : t.textSecondary }}>{s}</td>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: t.accentPrimary, fontWeight: 700 }}>{l}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Watch "mice" and "better" -- no suffix rule connects them to "mouse" or "good," so the stemmer leaves them untouched while the lemmatizer, backed by real vocabulary knowledge, gets them right.
      </div>
    </VisualizationContainer>
  );
}
