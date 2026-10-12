import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Technique = 'hyde' | 'decomposition' | 'stepback' | 'multiquery';

const ORIGINAL = 'How did GDP growth affect inflation in tech-heavy economies post-2020?';

const TRANSFORMS: Record<Technique, { label: string; outputs: string[]; desc: string }> = {
  hyde: {
    label: 'HyDE',
    outputs: ['[LLM-generated hypothetical answer, embedded and searched instead of the raw question]'],
    desc: 'Generate a plausible hypothetical answer first -- it reads more like the documents you actually want than the terse question does.',
  },
  decomposition: {
    label: 'Decomposition',
    outputs: ['What was GDP growth in tech-heavy economies post-2020?', 'What was inflation in tech-heavy economies post-2020?', 'How does GDP growth typically relate to inflation?'],
    desc: 'Split into independent sub-questions, retrieve for each separately, then combine.',
  },
  stepback: {
    label: 'Step-back',
    outputs: ['What is the general relationship between GDP growth and inflation?'],
    desc: 'Ask a broader question first to retrieve general context, then answer the specific one.',
  },
  multiquery: {
    label: 'Multi-query',
    outputs: ['GDP growth impact on inflation in tech economies since 2020', 'Post-pandemic inflation drivers in technology-driven economies', 'Relationship between economic growth and price inflation, tech sector'],
    desc: 'Generate several rephrasings, retrieve for each, union the results -- hedges against one phrasing missing a relevant chunk.',
  },
};

/** The same original query, transformed 4 different ways -- select a
 * technique to see exactly what gets embedded/searched instead of (or in
 * addition to) the raw question. */
export default function QueryTransformationDiagram() {
  const t = useVizTokens();
  const [technique, setTechnique] = useState<Technique>('multiquery');
  const origColor = t.textMuted;
  const transformColor = getConceptColor(t, 'attention');
  const config = TRANSFORMS[technique];

  return (
    <VisualizationContainer footer={config.desc}>
      <PillSelect<Technique>
        label="Query transformation technique"
        value={technique}
        onChange={setTechnique}
        options={[
          { value: 'hyde', label: 'HyDE' },
          { value: 'decomposition', label: 'Decomposition' },
          { value: 'stepback', label: 'Step-back' },
          { value: 'multiquery', label: 'Multi-query' },
        ]}
      />
      <SketchBox color={origColor} style={{ marginTop: 10 }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: origColor }}>
          original: "{ORIGINAL}"
        </div>
      </SketchBox>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
        <div style={{ fontSize: 14.5, fontFamily: HAND_FONT, color: transformColor }}>↓ {config.label}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {config.outputs.map((o, i) => (
          <SketchBox key={i} color={transformColor}>
            <div style={{ padding: '8px 12px', background: `${transformColor}18`, fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>
              {o}
            </div>
          </SketchBox>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        {config.outputs.length} {config.outputs.length === 1 ? 'query' : 'queries'} actually embedded and searched, not the raw question above.
      </div>
    </VisualizationContainer>
  );
}
