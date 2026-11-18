import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type Schema = 'strict' | 'loose';

const SCHEMAS: Record<Schema, { def: string; call: string; valid: boolean; note: string }> = {
  strict: {
    def: '{ city: string (required), unit: "celsius" | "fahrenheit" (required) }',
    call: 'get_weather(city="Austin", unit="fahrenheit")',
    valid: true,
    note: 'Every field is typed and required — there\'s exactly one valid shape for a call, so the model produces it correctly.',
  },
  loose: {
    def: '{ location?: any, options?: object }',
    call: 'get_weather(location="Austin, TX, USA today please", options={celsius: "yes"})',
    valid: false,
    note: 'Untyped, optional fields with no enum — the model has to invent a shape, and this call fails to parse: options.celsius should be a boolean under a "unit" key that doesn\'t even exist here.',
  },
};

/** Same intent, two schema strictness levels -- a well-specified schema
 * has exactly one valid call shape; an ambiguous one leaves the model
 * guessing, and the guess is visibly, concretely wrong here. */
export default function ArgumentSchemaValidationDiagram() {
  const t = useVizTokens();
  const SCHEMAS_LIST: Schema[] = ['strict', 'loose'];
  const cyc = useAutoCycle(2, 3500);
  const schema = SCHEMAS_LIST[cyc.value];
  const setSchema = (s: Schema) => cyc.pick(SCHEMAS_LIST.indexOf(s));
  const s = SCHEMAS[schema];
  const color = s.valid ? t.accentPrimary : t.accentDanger;

  return (
    <VisualizationContainer footer={s.note}>
      <PillSelect<Schema> label="Schema" value={schema} onChange={setSchema} options={[{ value: 'strict', label: 'Well-specified' }, { value: 'loose', label: 'Ambiguous' }]} />
      <div style={{ marginTop: 10, fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>schema: {s.def}</div>
      <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: `${color}12`, border: `1.5px solid ${color}`, fontFamily: 'monospace', fontSize: 11, color: t.textSecondary }}>
        {s.call}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 8 }}>
        {s.valid ? '✓ parses and executes correctly' : '✗ malformed — doesn\'t match what the tool actually expects'}
      </div>
    </VisualizationContainer>
  );
}
