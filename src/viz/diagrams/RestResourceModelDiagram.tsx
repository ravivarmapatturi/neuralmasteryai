import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Style = 'rest' | 'rpc' | 'graphql';
const STYLES: Style[] = ['rest', 'rpc', 'graphql'];
const EXAMPLES: Record<Style, { call: string; desc: string }> = {
  rest: { call: 'GET /users/123/conversations\nPOST /conversations\nDELETE /conversations/456', desc: 'Resources identified by URLs, standard verbs act on them. Predictable, cacheable, but the server dictates the response shape per endpoint.' },
  rpc: { call: 'POST /getUserConversations\nPOST /createConversation\nPOST /deleteConversation', desc: 'Actions modeled directly as function calls. Natural for operations that don\'t map cleanly to CRUD, but each endpoint is a one-off contract.' },
  graphql: { call: 'POST /graphql\n{ user(id: 123) { conversations { id, lastMessage } } }', desc: 'Client specifies exactly which fields it needs, in one request. Flexible when different clients need very different data, at the cost of REST\'s simplicity.' },
};

/** The same "get a user's conversations" operation, expressed 3 ways --
 * REST is the site's focus, but seeing the alternatives side by side
 * shows what REST's resource-and-verb convention is actually buying you. */
export default function RestResourceModelDiagram() {
  const t = useVizTokens();
  const { value: styleIdx, pick: setStyleIdx, stop } = useAutoCycle(STYLES.length, 3500, 0);
  const style = STYLES[styleIdx];
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={EXAMPLES[style].desc}>
      <PillSelect<Style>
        label="API style"
        value={style}
        onChange={(val) => {
          const v = typeof val === 'function' ? val(style) : val;
          stop();
          setStyleIdx(STYLES.indexOf(v));
        }}
        options={[
          { value: 'rest', label: 'REST' },
          { value: 'rpc', label: 'RPC-style' },
          { value: 'graphql', label: 'GraphQL' },
        ]}
      />
      <div style={{ marginTop: 10, padding: '0.7rem 0.9rem', borderRadius: 8, background: `${color}12`, border: `1px solid ${color}40`, fontFamily: 'monospace', fontSize: 11.5, color: t.textSecondary, whiteSpace: 'pre-wrap' }}>
        {EXAMPLES[style].call}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Same operation ("get user 123's conversations"), three conventions for expressing it.
      </div>
    </VisualizationContainer>
  );
}
