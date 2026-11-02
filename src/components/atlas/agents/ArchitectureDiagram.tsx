import type { ReactNode } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';

type T = ReturnType<typeof useVizTokens>;
const Txt = ({ x, y, c, children, a = 'middle', s = 12, w = 400 }: { x: number; y: number; c: string; children: ReactNode; a?: 'start' | 'middle' | 'end'; s?: number; w?: number }) => <text x={x} y={y} fill={c} textAnchor={a} fontSize={s} fontWeight={w}>{children}</text>;
const Box = ({ t, x, y, width, height, children, accent = false }: { t: T; x: number; y: number; width: number; height: number; children: ReactNode; accent?: boolean }) => <g><rect x={x} y={y} width={width} height={height} rx={5} fill={accent ? t.accentPrimary : t.surfaceAlt} stroke={t.border} /><Txt x={x + width / 2} y={y + height / 2 + 4} c={accent ? t.surface : t.textPrimary} w={600}>{children}</Txt></g>;
const Arrow = ({ x1, y1, x2, y2, c, dashed = false }: { x1: number; y1: number; x2: number; y2: number; c: string; dashed?: boolean }) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const point = (offset: number) => `${x2 - 8 * Math.cos(angle + offset)},${y2 - 8 * Math.sin(angle + offset)}`;
  return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={1.7} strokeDasharray={dashed ? '4 3' : undefined} /><polygon points={`${x2},${y2} ${point(.45)} ${point(-.45)}`} fill={c} /></g>;
};

const DIAGRAMS: Record<string, (t: T) => ReactNode> = {
  'ai-chains': (t) => <svg viewBox="0 0 360 166" width="100%" role="img" aria-label="A prompt chain extracts claims, verifies them in parallel and passes only verified claims to a writing prompt.">
    <Box t={t} x={8} y={58} width={82} height={38}>source text</Box><Arrow x1={90} y1={77} x2={122} y2={77} c={t.edge} /><Box t={t} x={124} y={58} width={82} height={38} accent>extract</Box>
    <Arrow x1={206} y1={70} x2={238} y2={36} c={t.edge} /><Arrow x1={206} y1={84} x2={238} y2={118} c={t.edge} />
    <Box t={t} x={240} y={18} width={104} height={34}>verify claim 1</Box><Box t={t} x={240} y={102} width={104} height={34}>verify claim 2</Box>
    <Arrow x1={292} y1={52} x2={292} y2={78} c={t.accentSecondary} /><Arrow x1={292} y1={102} x2={292} y2={78} c={t.accentSecondary} /><Txt x={292} y={94} c={t.textPrimary} w={700}>write</Txt>
    <Txt x={180} y={158} c={t.textSecondary}>Each intermediate value is visible and editable.</Txt>
  </svg>,
  mrkl: (t) => <svg viewBox="0 0 360 174" width="100%" role="img" aria-label="A router sends arithmetic to a calculator and policy questions to a document retriever before composing an answer.">
    <Box t={t} x={8} y={66} width={84} height={38}>request</Box><Arrow x1={92} y1={85} x2={132} y2={85} c={t.edge} /><path d="M132 85 L158 59 L184 85 L158 111 Z" fill={t.accentPrimary} stroke={t.border} /><Txt x={158} y={89} c={t.surface} w={700}>route</Txt>
    <Arrow x1={174} y1={69} x2={225} y2={34} c={t.edge} /><Box t={t} x={228} y={16} width={122} height={34}>calculator: 142.8</Box>
    <Arrow x1={174} y1={101} x2={225} y2={136} c={t.edge} /><Box t={t} x={228} y={118} width={122} height={34}>policy retriever</Box>
    <Txt x={158} y={150} c={t.textSecondary}>language selects</Txt><Txt x={158} y={166} c={t.textSecondary}>specialists compute</Txt>
  </svg>,
  react: (t) => <svg viewBox="0 0 360 178" width="100%" role="img" aria-label="A ReAct loop moves from reasoning to an action, reads the observation and returns to reasoning until it can answer.">
    <circle cx={180} cy={84} r={66} fill="none" stroke={t.border} strokeWidth={2} />
    <Box t={t} x={126} y={4} width={108} height={34} accent>reason</Box><Box t={t} x={244} y={66} width={104} height={34}>search film</Box><Box t={t} x={124} y={130} width={112} height={34}>release: 1984</Box><Box t={t} x={10} y={66} width={100} height={34}>revise query</Box>
    <Arrow x1={229} y1={31} x2={270} y2={64} c={t.edge} /><Arrow x1={268} y1={100} x2={224} y2={130} c={t.edge} /><Arrow x1={130} y1={143} x2={91} y2={102} c={t.edge} /><Arrow x1={91} y1={66} x2={134} y2={36} c={t.edge} />
    <Txt x={180} y={87} c={t.textPrimary} w={700}>observation</Txt><Txt x={180} y={103} c={t.textPrimary} w={700}>changes action</Txt>
  </svg>,
  toolformer: (t) => <svg viewBox="0 0 360 160" width="100%" role="img" aria-label="Toolformer proposes an inline calculator call and keeps it only when the returned value improves token prediction.">
    <Txt x={10} y={20} c={t.textSecondary} a="start">training sentence</Txt><rect x={8} y={31} width={344} height={34} rx={5} fill={t.surfaceAlt} stroke={t.border} /><Txt x={18} y={53} c={t.textPrimary} a="start">17% of 840 is [ Calculator(…)</Txt>
    <Arrow x1={180} y1={66} x2={180} y2={91} c={t.edge} /><Box t={t} x={111} y={93} width={138} height={32} accent>result: 142.8</Box>
    <Arrow x1={111} y1={109} x2={54} y2={138} c={t.accentSecondary} /><Arrow x1={249} y1={109} x2={306} y2={138} c={t.accentSecondary} />
    <Txt x={54} y={154} c={t.accentDanger} w={700}>discard if no help</Txt><Txt x={306} y={154} c={t.accentPrimary} w={700}>keep if loss falls</Txt>
  </svg>,
  reflexion: (t) => <svg viewBox="0 0 360 184" width="100%" role="img" aria-label="A failed attempt is evaluated, converted into a verbal reflection and supplied as episodic memory to the next attempt.">
    <Box t={t} x={10} y={12} width={104} height={36}>attempt 1</Box><Arrow x1={114} y1={30} x2={160} y2={30} c={t.edge} /><Box t={t} x={162} y={12} width={84} height={36}>test fails</Box><Arrow x1={246} y1={30} x2={282} y2={66} c={t.edge} />
    <path d="M282 64 L348 96 L282 128 L216 96 Z" fill={t.surfaceAlt} stroke={t.border} /><Txt x={282} y={91} c={t.textPrimary} w={700}>reflect</Txt><Txt x={282} y={107} c={t.textSecondary}>missed serializer</Txt>
    <Arrow x1={216} y1={96} x2={148} y2={135} c={t.accentSecondary} /><Box t={t} x={48} y={132} width={102} height={38} accent>episodic note</Box><Arrow x1={48} y1={151} x2={10} y2={72} c={t.accentPrimary} /><Box t={t} x={10} y={62} width={104} height={36}>attempt 2</Box>
  </svg>,
  autogpt: (t) => <svg viewBox="0 0 360 190" width="100%" role="img" aria-label="Auto-GPT turns a user goal into self-assigned tasks, tool actions and persistent files inside an autonomous loop with an external budget gate.">
    <Box t={t} x={10} y={12} width={122} height={38} accent>user goal</Box><Arrow x1={132} y1={31} x2={179} y2={31} c={t.edge} /><Box t={t} x={182} y={12} width={166} height={38}>create next task</Box>
    <Arrow x1={265} y1={50} x2={265} y2={78} c={t.edge} /><Box t={t} x={202} y={80} width={126} height={36}>browse / write</Box><Arrow x1={202} y1={98} x2={139} y2={98} c={t.edge} /><Box t={t} x={30} y={80} width={110} height={36}>memory files</Box>
    <Arrow x1={85} y1={116} x2={85} y2={145} c={t.edge} /><Box t={t} x={22} y={147} width={126} height={34}>inspect progress</Box><path d="M148 164 C230 181 340 157 312 52" fill="none" stroke={t.accentSecondary} strokeWidth={1.7} /><polygon points="312,52 305,60 316,61" fill={t.accentSecondary} />
    <Txt x={266} y={138} c={t.accentDanger} w={700}>budget and approval outside loop</Txt>
  </svg>,
  'generative-agents': (t) => <svg viewBox="0 0 360 184" width="100%" role="img" aria-label="An observation stream enters memory, retrieval scores events by recency, importance and relevance, and reflections feed a daily plan.">
    <Box t={t} x={8} y={16} width={98} height={36}>observations</Box><Arrow x1={106} y1={34} x2={145} y2={34} c={t.edge} /><rect x={148} y={8} width={94} height={112} rx={7} fill={t.surfaceAlt} stroke={t.border} />
    <Txt x={195} y={28} c={t.textPrimary} w={700}>memory stream</Txt><Txt x={195} y={51} c={t.textSecondary}>met Sam today</Txt><Txt x={195} y={73} c={t.textSecondary}>party invitation</Txt><Txt x={195} y={95} c={t.textSecondary}>likes music</Txt>
    <Arrow x1={242} y1={42} x2={286} y2={42} c={t.edge} /><Box t={t} x={276} y={56} width={76} height={48} accent>retrieve</Box><Txt x={314} y={122} c={t.textSecondary}>recent</Txt><Txt x={314} y={138} c={t.textSecondary}>important</Txt><Txt x={314} y={154} c={t.textSecondary}>relevant</Txt>
    <Arrow x1={276} y1={80} x2={208} y2={150} c={t.accentSecondary} /><Box t={t} x={102} y={142} width={108} height={34}>reflection</Box><Arrow x1={102} y1={159} x2={48} y2={132} c={t.accentSecondary} /><Txt x={46} y={145} c={t.textPrimary} w={700}>plan</Txt>
  </svg>,
  'plan-and-solve': (t) => <svg viewBox="0 0 360 162" width="100%" role="img" aria-label="Plan-and-Solve separates a numbered plan from execution so missing steps can be found before calculations begin.">
    <rect x={8} y={12} width={154} height={132} rx={6} fill={t.surfaceAlt} stroke={t.border} /><Txt x={20} y={34} c={t.textPrimary} a="start" w={700}>PLAN</Txt><Txt x={20} y={60} c={t.textPrimary} a="start">1. find unit price</Txt><Txt x={20} y={84} c={t.textPrimary} a="start">2. multiply by 7</Txt><Txt x={20} y={108} c={t.textPrimary} a="start">3. subtract coupon</Txt>
    <Arrow x1={162} y1={78} x2={200} y2={78} c={t.edge} /><rect x={202} y={12} width={150} height={132} rx={6} fill={t.surfaceAlt} stroke={t.border} /><Txt x={214} y={34} c={t.accentPrimary} a="start" w={700}>EXECUTE</Txt><Txt x={214} y={60} c={t.textPrimary} a="start">£4 each</Txt><Txt x={214} y={84} c={t.textPrimary} a="start">£4 × 7 = £28</Txt><Txt x={214} y={108} c={t.textPrimary} a="start">£28 − £3 = £25</Txt><Txt x={277} y={134} c={t.accentPrimary} w={700}>answer: £25</Txt>
  </svg>,
  'tree-of-thoughts': (t) => <svg viewBox="0 0 360 190" width="100%" role="img" aria-label="Tree of Thoughts expands several candidate arithmetic states, scores them and prunes weak branches before continuing the best branch.">
    <Box t={t} x={130} y={6} width={100} height={32} accent>4, 7, 8, 8</Box><Arrow x1={180} y1={38} x2={75} y2={70} c={t.edge} /><Arrow x1={180} y1={38} x2={180} y2={70} c={t.edge} /><Arrow x1={180} y1={38} x2={285} y2={70} c={t.edge} />
    <Box t={t} x={22} y={72} width={106} height={32}>11, 8, 8</Box><Box t={t} x={127} y={72} width={106} height={32}>28, 8, 8</Box><Box t={t} x={232} y={72} width={106} height={32}>4, 15, 8</Box>
    <Txt x={75} y={123} c={t.accentDanger} w={700}>score 0.2, prune</Txt><Txt x={180} y={123} c={t.accentPrimary} w={700}>score 0.9</Txt><Txt x={285} y={123} c={t.accentDanger} w={700}>score 0.3, prune</Txt>
    <Arrow x1={180} y1={126} x2={180} y2={150} c={t.accentPrimary} /><Box t={t} x={125} y={152} width={110} height={32} accent>expand best</Box>
  </svg>,
  voyager: (t) => <svg viewBox="0 0 360 188" width="100%" role="img" aria-label="Voyager’s curriculum proposes a task, code is tested in Minecraft, failures trigger repair and successful programs enter a reusable skill library.">
    <Box t={t} x={8} y={12} width={118} height={38} accent>curriculum</Box><Arrow x1={126} y1={31} x2={174} y2={31} c={t.edge} /><Box t={t} x={176} y={12} width={176} height={38}>task: mine iron</Box>
    <Arrow x1={264} y1={50} x2={264} y2={78} c={t.edge} /><Box t={t} x={200} y={80} width={128} height={36}>write program</Box><Arrow x1={200} y1={98} x2={142} y2={98} c={t.edge} /><Box t={t} x={24} y={80} width={120} height={36}>run in world</Box>
    <Arrow x1={84} y1={116} x2={84} y2={146} c={t.accentDanger} /><Txt x={84} y={163} c={t.accentDanger} w={700}>failure → repair</Txt><path d="M84 146 C150 178 238 170 264 118" fill="none" stroke={t.accentDanger} strokeWidth={1.7} />
    <Arrow x1={144} y1={93} x2={200} y2={145} c={t.accentPrimary} /><Box t={t} x={202} y={140} width={144} height={36} accent>tested skill library</Box>
  </svg>,
  metagpt: (t) => <svg viewBox="0 0 360 174" width="100%" role="img" aria-label="MetaGPT passes structured software artifacts from a product manager to an architect, project manager and engineer.">
    <Box t={t} x={8} y={10} width={102} height={34}>product role</Box><Arrow x1={59} y1={44} x2={59} y2={72} c={t.edge} /><rect x={8} y={74} width={102} height={38} rx={4} fill={t.surfaceAlt} stroke={t.accentPrimary} /><Txt x={59} y={98} c={t.accentPrimary} w={700}>requirements</Txt>
    <Arrow x1={110} y1={93} x2={140} y2={93} c={t.edge} /><Box t={t} x={142} y={74} width={82} height={38}>architect</Box><Arrow x1={183} y1={112} x2={183} y2={140} c={t.edge} /><Txt x={183} y={158} c={t.accentPrimary} w={700}>system design</Txt>
    <Arrow x1={224} y1={93} x2={252} y2={93} c={t.edge} /><Box t={t} x={254} y={10} width={98} height={34}>project role</Box><Arrow x1={303} y1={44} x2={303} y2={72} c={t.edge} /><Box t={t} x={254} y={74} width={98} height={38} accent>engineer</Box>
    <Txt x={180} y={132} c={t.textSecondary}>structured artifacts carry the work</Txt>
  </svg>,
  autogen: (t) => <svg viewBox="0 0 360 190" width="100%" role="img" aria-label="An AutoGen group-chat manager selects a planner, executor or critic, and each response returns to the shared conversation.">
    <circle cx={180} cy={88} r={43} fill={t.accentPrimary} stroke={t.border} /><Txt x={180} y={83} c={t.surface} w={700}>group-chat</Txt><Txt x={180} y={100} c={t.surface} w={700}>manager</Txt>
    <Box t={t} x={8} y={14} width={102} height={36}>planner</Box><Box t={t} x={250} y={14} width={102} height={36}>critic</Box><Box t={t} x={129} y={148} width={102} height={36}>executor</Box>
    <Arrow x1={145} y1={57} x2={105} y2={45} c={t.edge} /><Arrow x1={110} y1={31} x2={151} y2={57} c={t.accentSecondary} /><Arrow x1={215} y1={57} x2={250} y2={45} c={t.edge} /><Arrow x1={250} y1={31} x2={209} y2={57} c={t.accentSecondary} /><Arrow x1={180} y1={131} x2={180} y2={146} c={t.edge} /><Arrow x1={164} y1={148} x2={164} y2={131} c={t.accentSecondary} />
    <Txt x={180} y={18} c={t.textSecondary}>manager chooses the next speaker</Txt>
  </svg>,
  lats: (t) => <svg viewBox="0 0 360 194" width="100%" role="img" aria-label="Language Agent Tree Search tries an action, scores its observation, reflects on failure and backtracks to explore another action.">
    <Box t={t} x={126} y={6} width={108} height={32} accent>agent state</Box><Arrow x1={180} y1={38} x2={72} y2={72} c={t.edge} /><Arrow x1={180} y1={38} x2={288} y2={72} c={t.edge} />
    <Box t={t} x={18} y={74} width={108} height={34}>search A</Box><Box t={t} x={234} y={74} width={108} height={34}>search B</Box><Arrow x1={72} y1={108} x2={72} y2={134} c={t.edge} /><Arrow x1={288} y1={108} x2={288} y2={134} c={t.edge} />
    <Txt x={72} y={151} c={t.accentDanger} w={700}>value 0.1</Txt><Txt x={288} y={151} c={t.accentPrimary} w={700}>value 0.8</Txt><path d="M72 155 C90 190 160 184 168 42" fill="none" stroke={t.accentDanger} strokeDasharray="4 3" /><polygon points="168,42 162,51 173,50" fill={t.accentDanger} />
    <Box t={t} x={238} y={160} width={100} height={28} accent>continue B</Box><Txt x={109} y={183} c={t.textSecondary}>reflect and backtrack</Txt>
  </svg>,
  langgraph: (t) => <svg viewBox="0 0 360 184" width="100%" role="img" aria-label="A LangGraph state machine sends shared state from a model node to a tool node, an approval node or an explicit end node.">
    <rect x={8} y={8} width={344} height={168} rx={8} fill="none" stroke={t.border} /><Txt x={18} y={28} c={t.textSecondary} a="start">shared state: messages, plan, approved</Txt>
    <Box t={t} x={22} y={64} width={92} height={36} accent>model node</Box><Arrow x1={114} y1={82} x2={150} y2={82} c={t.edge} /><path d="M150 82 L184 55 L218 82 L184 109 Z" fill={t.surfaceAlt} stroke={t.border} /><Txt x={184} y={86} c={t.textPrimary} w={700}>route</Txt>
    <Arrow x1={205} y1={65} x2={254} y2={45} c={t.edge} /><Box t={t} x={256} y={28} width={82} height={34}>tool node</Box><path d="M297 62 C293 134 83 145 68 102" fill="none" stroke={t.accentSecondary} /><polygon points="68,102 66,113 76,108" fill={t.accentSecondary} />
    <Arrow x1={218} y1={82} x2={254} y2={118} c={t.edge} /><Box t={t} x={244} y={120} width={102} height={34}>human approval</Box><Arrow x1={184} y1={109} x2={184} y2={146} c={t.accentPrimary} /><Txt x={184} y={165} c={t.accentPrimary} w={700}>END</Txt>
  </svg>,
  'swe-agent': (t) => <svg viewBox="0 0 360 178" width="100%" role="img" aria-label="SWE-agent places a compact agent-computer interface between the model and a repository, exposing bounded search, file-window, edit and test commands.">
    <Box t={t} x={8} y={62} width={88} height={42} accent>model</Box><Arrow x1={96} y1={83} x2={126} y2={83} c={t.edge} /><rect x={128} y={10} width={112} height={156} rx={7} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} /><Txt x={184} y={31} c={t.accentPrimary} w={700}>agent-computer</Txt><Txt x={184} y={48} c={t.accentPrimary} w={700}>interface</Txt>
    <Box t={t} x={142} y={62} width={84} height={26}>search</Box><Box t={t} x={142} y={94} width={84} height={26}>file window</Box><Box t={t} x={142} y={126} width={84} height={26}>edit + test</Box>
    <Arrow x1={240} y1={83} x2={270} y2={83} c={t.edge} /><Box t={t} x={272} y={62} width={80} height={42}>repository</Box><Txt x={304} y={132} c={t.textSecondary}>bounded output</Txt><Txt x={304} y={150} c={t.textSecondary}>clear feedback</Txt>
  </svg>,
  'computer-use': (t) => <svg viewBox="0 0 360 184" width="100%" role="img" aria-label="A computer-use loop gives the model a screenshot, executes one pointer or keyboard action in an isolated desktop and returns the next screenshot.">
    <rect x={12} y={12} width={148} height={104} rx={6} fill={t.surfaceAlt} stroke={t.border} /><rect x={24} y={26} width={124} height={16} fill={t.border} /><rect x={36} y={58} width={86} height={28} rx={4} fill={t.surface} stroke={t.accentPrimary} /><Txt x={79} y={77} c={t.textPrimary}>email field</Txt><circle cx={116} cy={92} r={5} fill={t.accentDanger} /><Txt x={86} y={139} c={t.textSecondary}>screenshot pixels</Txt>
    <Arrow x1={160} y1={64} x2={205} y2={64} c={t.edge} /><Box t={t} x={208} y={42} width={140} height={44} accent>model chooses action</Box><Arrow x1={278} y1={86} x2={278} y2={120} c={t.edge} /><Box t={t} x={208} y={122} width={140} height={40}>click(116, 92)</Box>
    <path d="M208 142 C170 180 65 174 64 118" fill="none" stroke={t.accentSecondary} strokeWidth={1.7} /><polygon points="64,118 59,128 70,126" fill={t.accentSecondary} /><Txt x={139} y={178} c={t.textSecondary}>harness executes one action, then observes again</Txt>
  </svg>,
  'deep-research': (t) => <svg viewBox="0 0 360 190" width="100%" role="img" aria-label="A Deep Research loop plans several questions, searches and reads sources, checks evidence gaps and iterates before writing a cited report.">
    <Box t={t} x={8} y={12} width={102} height={36} accent>research plan</Box><Arrow x1={110} y1={30} x2={148} y2={30} c={t.edge} /><Box t={t} x={150} y={12} width={98} height={36}>search web</Box><Arrow x1={248} y1={30} x2={286} y2={30} c={t.edge} /><Box t={t} x={286} y={12} width={66} height={36}>read</Box>
    <Arrow x1={319} y1={48} x2={319} y2={83} c={t.edge} /><path d="M319 82 L350 105 L319 128 L288 105 Z" fill={t.surfaceAlt} stroke={t.border} /><Txt x={319} y={101} c={t.textPrimary} w={700}>gaps?</Txt><Txt x={319} y={116} c={t.textPrimary}>conflict?</Txt>
    <path d="M288 105 C220 80 164 82 198 50" fill="none" stroke={t.accentDanger} strokeDasharray="4 3" /><polygon points="198,50 188,56 199,61" fill={t.accentDanger} /><Txt x={226} y={92} c={t.accentDanger} w={700}>yes: refine query</Txt>
    <Arrow x1={319} y1={128} x2={235} y2={156} c={t.accentPrimary} /><rect x={72} y={142} width={164} height={38} rx={5} fill={t.surfaceAlt} stroke={t.accentPrimary} /><Txt x={154} y={166} c={t.accentPrimary} w={700}>report + source links</Txt>
  </svg>,
  'routing-workflow': (t) => <svg viewBox="0 0 360 174" width="100%" role="img" aria-label="A routing workflow classifies one request and sends it to a billing, coding or safe fallback workflow with different prompts and tools.">
    <Box t={t} x={8} y={66} width={88} height={38}>request</Box><Arrow x1={96} y1={85} x2={132} y2={85} c={t.edge} /><path d="M132 85 L170 47 L208 85 L170 123 Z" fill={t.accentPrimary} stroke={t.border} /><Txt x={170} y={80} c={t.surface} w={700}>intent</Txt><Txt x={170} y={97} c={t.surface} w={700}>router</Txt>
    <Arrow x1={190} y1={64} x2={244} y2={29} c={t.edge} /><Box t={t} x={246} y={12} width={106} height={34}>billing + policy</Box><Arrow x1={208} y1={85} x2={244} y2={85} c={t.edge} /><Box t={t} x={246} y={68} width={106} height={34}>code + repo</Box><Arrow x1={190} y1={106} x2={244} y2={141} c={t.edge} /><Box t={t} x={246} y={124} width={106} height={34}>safe fallback</Box>
    <Txt x={92} y={151} c={t.textSecondary}>fixed destinations</Txt><Txt x={92} y={167} c={t.textSecondary}>measurable misroutes</Txt>
  </svg>,
  'orchestrator-workers': (t) => <svg viewBox="0 0 360 196" width="100%" role="img" aria-label="An orchestrator dynamically creates repository, tests and API subtasks, runs workers in parallel and synthesizes their structured findings.">
    <Box t={t} x={111} y={8} width={138} height={38} accent>orchestrator</Box><Txt x={180} y={62} c={t.textSecondary}>decompose after reading task</Txt>
    <Arrow x1={145} y1={46} x2={60} y2={88} c={t.edge} /><Arrow x1={180} y1={46} x2={180} y2={88} c={t.edge} /><Arrow x1={215} y1={46} x2={300} y2={88} c={t.edge} />
    <Box t={t} x={8} y={90} width={104} height={36}>repo worker</Box><Box t={t} x={128} y={90} width={104} height={36}>test worker</Box><Box t={t} x={248} y={90} width={104} height={36}>API worker</Box>
    <Arrow x1={60} y1={126} x2={134} y2={158} c={t.accentSecondary} /><Arrow x1={180} y1={126} x2={180} y2={154} c={t.accentSecondary} /><Arrow x1={300} y1={126} x2={226} y2={158} c={t.accentSecondary} /><Box t={t} x={104} y={156} width={152} height={34} accent>synthesize findings</Box>
  </svg>,
  'context-engineering': (t) => <svg viewBox="0 0 360 190" width="100%" role="img" aria-label="Context engineering selects a compact working set of instructions, current plan, relevant evidence and tool schemas while leaving old logs in durable storage.">
    <rect x={8} y={10} width={114} height={168} rx={6} fill={t.surfaceAlt} stroke={t.border} /><Txt x={65} y={31} c={t.textPrimary} w={700}>durable state</Txt><Txt x={20} y={57} c={t.textSecondary} a="start">all tool logs</Txt><Txt x={20} y={79} c={t.textSecondary} a="start">source files</Txt><Txt x={20} y={101} c={t.textSecondary} a="start">test history</Txt><Txt x={20} y={123} c={t.textSecondary} a="start">prior summaries</Txt>
    <path d="M144 38 L194 38 L218 94 L194 150 L144 150 L168 94 Z" fill={t.accentPrimary} stroke={t.border} /><Txt x={181} y={89} c={t.surface} w={700}>select +</Txt><Txt x={181} y={106} c={t.surface} w={700}>compact</Txt><Arrow x1={122} y1={94} x2={158} y2={94} c={t.edge} /><Arrow x1={208} y1={94} x2={244} y2={94} c={t.edge} />
    <rect x={246} y={26} width={106} height={136} rx={7} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} /><Txt x={299} y={47} c={t.accentPrimary} w={700}>active context</Txt><Txt x={258} y={73} c={t.textPrimary} a="start">task</Txt><Txt x={258} y={95} c={t.textPrimary} a="start">current plan</Txt><Txt x={258} y={117} c={t.textPrimary} a="start">relevant diff</Txt><Txt x={258} y={139} c={t.textPrimary} a="start">tool schemas</Txt>
  </svg>,
  'long-running-harness': (t) => <svg viewBox="0 0 360 216" width="100%" role="img" aria-label="A long-running harness lets three separate context windows continue one task through a shared progress file, commits and verification commands.">
    <Txt x={58} y={20} c={t.textSecondary}>context 1</Txt><Txt x={180} y={20} c={t.textSecondary}>context 2</Txt><Txt x={302} y={20} c={t.textSecondary}>context 3</Txt>
    <Box t={t} x={8} y={32} width={100} height={36}>inspect</Box><Box t={t} x={130} y={32} width={100} height={36}>continue</Box><Box t={t} x={252} y={32} width={100} height={36}>finish slice</Box><Arrow x1={108} y1={50} x2={128} y2={50} c={t.edge} /><Arrow x1={230} y1={50} x2={250} y2={50} c={t.edge} />
    <line x1={58} y1={68} x2={58} y2={116} stroke={t.border} strokeDasharray="4 3" /><line x1={180} y1={68} x2={180} y2={116} stroke={t.border} strokeDasharray="4 3" /><line x1={302} y1={68} x2={302} y2={116} stroke={t.border} strokeDasharray="4 3" />
    <rect x={8} y={116} width={344} height={70} rx={7} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} /><Txt x={180} y={136} c={t.accentPrimary} w={700}>durable harness</Txt><Box t={t} x={20} y={146} width={94} height={28}>progress.md</Box><Box t={t} x={133} y={146} width={94} height={28}>git commits</Box><Box t={t} x={246} y={146} width={94} height={28}>tests</Box>
    <Txt x={180} y={199} c={t.textSecondary}>read evidence, change one slice, verify</Txt><Txt x={180} y={213} c={t.textSecondary}>then leave a durable handoff</Txt>
  </svg>,
};

export default function ArchitectureDiagram({ id }: { id: string }) {
  const t = useVizTokens();
  return <>{DIAGRAMS[id]?.(t)}</>;
}

export const architectureDiagramIds = Object.keys(DIAGRAMS);
