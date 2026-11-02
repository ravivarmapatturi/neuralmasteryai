import type { ReactNode } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';

type T = ReturnType<typeof useVizTokens>;
type Msg = [from: number, to: number, label: string, dashed?: boolean];

const Txt = ({ x, y, c, a = 'middle', s = 12, w = 400, children }: { x: number; y: number; c: string; a?: 'start' | 'middle' | 'end'; s?: number; w?: number; children: ReactNode }) => <text x={x} y={y} fill={c} textAnchor={a} fontSize={s} fontWeight={w}>{children}</text>;

const Arrow = ({ x1, y1, x2, y2, c, dashed }: { x1: number; y1: number; x2: number; y2: number; c: string; dashed?: boolean }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d: number) => `${x2 - 8 * Math.cos(a + d)},${y2 - 8 * Math.sin(a + d)}`;
  return <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={1.6} strokeDasharray={dashed ? '4 3' : undefined} /><polygon points={`${x2},${y2} ${p(.45)} ${p(-.45)}`} fill={c} /></g>;
};

const Box = ({ t, x, y, w, h, children, hi }: { t: T; x: number; y: number; w: number; h: number; children?: ReactNode; hi?: boolean }) => <g><rect x={x} y={y} width={w} height={h} rx={5} fill={hi ? t.accentPrimary : t.surfaceAlt} stroke={t.border} />{children != null && <Txt x={x + w / 2} y={y + h / 2 + 4} c={hi ? t.surface : t.textPrimary} w={600}>{children}</Txt>}</g>;

/** Sequence diagram: the field-standard form for a protocol exchange. */
function Seq({ t, actors, msgs }: { t: T; actors: string[]; msgs: Msg[] }) {
  const xs = actors.map((_, i) => actors.length === 1 ? 180 : 50 + i * (260 / (actors.length - 1)));
  const h = 46 + msgs.length * 34;
  return <svg viewBox={`0 0 360 ${h}`} width="100%" role="img" aria-label={`Sequence between ${actors.join(', ')}: ${msgs.map((m) => m[2]).join(', then ')}.`}>
    {actors.map((a, i) => <g key={a}><Box t={t} x={xs[i] - 44} y={4} w={88} h={26}>{a}</Box><line x1={xs[i]} y1={30} x2={xs[i]} y2={h} stroke={t.border} strokeDasharray="3 3" /></g>)}
    {msgs.map(([f, to, l, d], i) => { const y = 58 + i * 34; const m = (xs[f] + xs[to]) / 2; return <g key={l}><Txt x={m} y={y - 6} c={t.textPrimary} s={11}>{l}</Txt><Arrow x1={xs[f]} y1={y} x2={xs[to]} y2={y} c={d ? t.accentSecondary : t.accentPrimary} dashed={d} /></g>; })}
  </svg>;
}

/** M × N wires compared with M + N through one shared protocol. */
function Hub({ t, left, right, mid }: { t: T; left: string[]; right: string[]; mid: string }) {
  const y = (i: number) => 24 + i * 38;
  const col = (ox: number, hub: boolean) => <g transform={`translate(${ox} 0)`}>
    {!hub && left.flatMap((_, i) => right.map((__, j) => <line key={`${i}${j}`} x1={40} y1={y(i)} x2={132} y2={y(j)} stroke={t.accentDanger} />))}
    {hub && [...left.map((_, i) => <line key={`l${i}`} x1={40} y1={y(i)} x2={70} y2={62} stroke={t.accentPrimary} strokeWidth={1.6} />), ...right.map((_, j) => <line key={`r${j}`} x1={102} y1={62} x2={132} y2={y(j)} stroke={t.accentPrimary} strokeWidth={1.6} />)]}
    {left.map((n, i) => <Box key={n} t={t} x={0} y={y(i) - 12} w={42} h={24}>{n}</Box>)}
    {right.map((n, j) => <Box key={n} t={t} x={130} y={y(j) - 12} w={42} h={24}>{n}</Box>)}
    {hub && <Box t={t} x={62} y={44} w={48} h={36} hi>{mid}</Box>}
  </g>;
  const m = left.length; const n = right.length;
  return <svg viewBox="0 0 360 156" width="100%" role="img" aria-label={`Without a shared protocol there are ${m * n} custom links. With ${mid} there are ${m + n} connections.`}>
    {col(0, false)}{col(186, true)}
    <Txt x={86} y={146} c={t.accentDanger} w={700}>{m} × {n} = {m * n} custom links</Txt>
    <Txt x={272} y={146} c={t.accentPrimary} w={700}>{m} + {n} = {m + n} connections</Txt>
  </svg>;
}

const Code = ({ t, lines, aria }: { t: T; lines: [string, boolean?][]; aria: string }) => <svg viewBox={`0 0 360 ${lines.length * 22 + 16}`} width="100%" role="img" aria-label={aria}>
  <rect x={1} y={1} width={358} height={lines.length * 22 + 14} rx={6} fill={t.surfaceAlt} stroke={t.border} />
  {lines.map(([l, hi], i) => <text key={i} x={14} y={26 + i * 22} fontFamily="monospace" fontSize={12} xmlSpace="preserve" fontWeight={hi ? 700 : 400} fill={hi ? t.accentPrimary : t.textPrimary}>{l}</text>)}
</svg>;

const DIAGRAMS: Record<string, (t: T) => ReactNode> = {
  rpc: (t) => <svg viewBox="0 0 360 170" width="100%" role="img" aria-label="The caller and server each have a stub; the stubs turn a local-looking call into network messages.">
    <Txt x={85} y={16} c={t.textSecondary}>Your machine</Txt><Txt x={275} y={16} c={t.textSecondary}>Other machine</Txt>
    <Box t={t} x={25} y={26} w={120} h={32}>add(2, 3)</Box><Box t={t} x={25} y={100} w={120} h={32} hi>client stub</Box>
    <Box t={t} x={215} y={26} w={120} h={32}>add runs</Box><Box t={t} x={215} y={100} w={120} h={32} hi>server stub</Box>
    <Arrow x1={70} y1={58} x2={70} y2={98} c={t.edge} /><Arrow x1={100} y1={98} x2={100} y2={60} c={t.edge} /><Arrow x1={260} y1={98} x2={260} y2={60} c={t.edge} /><Arrow x1={290} y1={58} x2={290} y2={98} c={t.edge} />
    <Arrow x1={145} y1={108} x2={213} y2={108} c={t.accentPrimary} /><Arrow x1={215} y1={124} x2={147} y2={124} c={t.accentSecondary} dashed />
    <Txt x={180} y={102} c={t.textPrimary} s={11}>2, 3</Txt><Txt x={180} y={140} c={t.textPrimary} s={11}>5</Txt>
    <Txt x={180} y={162} c={t.textSecondary} s={11}>The stubs hide the network, not its failures.</Txt>
  </svg>,
  http10: (t) => <Code t={t} aria="An HTTP request with method and path, followed by a response with status code, headers and body." lines={[['GET /index.html HTTP/1.0', true], ['Accept: text/html'], [''], ['HTTP/1.0 200 OK', true], ['Content-Type: text/html'], [''], ['<html>…</html>']]} />,
  soap: (t) => <svg viewBox="0 0 360 160" width="100%" role="img" aria-label="A SOAP envelope containing a header with credentials and a body with the payment call.">
    <rect x={10} y={6} width={340} height={148} rx={6} fill="none" stroke={t.accentPrimary} strokeWidth={2} /><Txt x={22} y={26} a="start" c={t.accentPrimary} w={700}>Envelope</Txt>
    <rect x={26} y={36} width={308} height={44} rx={5} fill={t.surfaceAlt} stroke={t.border} /><Txt x={36} y={54} a="start" c={t.textPrimary} w={700}>Header (optional)</Txt><Txt x={36} y={71} a="start" c={t.textSecondary} s={11}>credentials, routing</Txt>
    <rect x={26} y={90} width={308} height={52} rx={5} fill={t.surfaceAlt} stroke={t.border} /><Txt x={36} y={109} a="start" c={t.textPrimary} w={700}>Body (required)</Txt><Txt x={36} y={127} a="start" c={t.textSecondary} s={11}>the call: MakePayment, amount = 100</Txt>
  </svg>,
  rest: (t) => <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="Four HTTP methods all act on one order resource.">
    <Box t={t} x={230} y={52} w={120} h={46} hi>/orders/42</Box>
    {[['GET', 'read'], ['PUT', 'replace'], ['PATCH', 'change part'], ['DELETE', 'remove']].map(([m, d], i) => <g key={m}><Box t={t} x={4} y={6 + i * 36} w={62} h={28}>{m}</Box><Txt x={74} y={24 + i * 36} a="start" c={t.textSecondary} s={11}>{d}</Txt><Arrow x1={150} y1={20 + i * 36} x2={228} y2={75} c={t.edge} /></g>)}
  </svg>,
  websocket: (t) => <Seq t={t} actors={['Client', 'Server']} msgs={[[0, 1, 'GET, Upgrade: websocket'], [1, 0, '101 Switching Protocols', true], [1, 0, 'new message'], [0, 1, 'reply'], [1, 0, 'new message']]} />,
  oauth2: (t) => <Seq t={t} actors={['App', 'Auth server', 'API']} msgs={[[0, 1, 'user approves scope'], [1, 0, 'code', true], [0, 1, 'code → token'], [1, 0, 'access token', true], [0, 2, 'request + token'], [2, 0, 'data', true]]} />,
  graphql: (t) => <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="A query names only the fields it wants, and the response has exactly the same shape.">
    <Txt x={85} y={14} c={t.textSecondary}>Query</Txt><Txt x={270} y={14} c={t.textSecondary}>Response, same shape</Txt>
    {[['user {', 0], ['name', 1], ['orders {', 1], ['total', 2], ['}', 1], ['}', 0]].map(([l, d], i) => <text key={i} x={18 + Number(d) * 16} y={38 + i * 18} fontFamily="monospace" fontSize={12} fill={t.textPrimary}>{l}</text>)}
    {[['user: {', 0], ['name: "Asha"', 1], ['orders: [{', 1], ['total: 40', 2], ['}]', 1], ['}', 0]].map(([l, d], i) => <text key={i} x={204 + Number(d) * 16} y={38 + i * 18} fontFamily="monospace" fontSize={12} fill={t.accentPrimary}>{l}</text>)}
    <Arrow x1={140} y1={78} x2={196} y2={78} c={t.edge} />
  </svg>,
  grpc: (t) => <svg viewBox="0 0 360 140" width="100%" role="img" aria-label="Three streams share one HTTP/2 connection as interleaved binary frames.">
    <Txt x={180} y={14} c={t.textSecondary}>One HTTP/2 connection, frames from 3 calls interleaved</Txt>
    <rect x={8} y={26} width={344} height={52} rx={6} fill="none" stroke={t.border} />
    {[0, 1, 2, 0, 2, 1, 0, 1, 2].map((s, i) => <g key={i}><rect x={16 + i * 37} y={36} width={32} height={32} rx={3} fill={[t.accentPrimary, t.accentSecondary, t.accentWarn][s]} /><Txt x={32 + i * 37} y={57} c={t.surface} w={700}>{s + 1}</Txt></g>)}
    <text x={8} y={102} fontFamily="monospace" fontSize={12} fill={t.textPrimary}>rpc Generate(Request)</text>
    <text x={8} y={122} fontFamily="monospace" fontSize={12} fill={t.textPrimary}>  returns (stream Token);</text>
  </svg>,
  lsp: (t) => <Hub t={t} left={['Ed1', 'Ed2', 'Ed3']} right={['Py', 'Go', 'TS']} mid="LSP" />,
  openapi: (t) => <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="One OpenAPI file generates documentation, client code and tests.">
    <Box t={t} x={8} y={45} w={120} h={60} hi>openapi.yaml</Box>
    {['Documentation', 'Client code', 'Contract tests'].map((l, i) => <g key={l}><Arrow x1={128} y1={75} x2={218} y2={25 + i * 50} c={t.edge} /><Box t={t} x={220} y={8 + i * 50} w={132} h={34}>{l}</Box></g>)}
  </svg>,
  react: (t) => <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="A loop of thought, action and observation that exits with an answer.">
    <Box t={t} x={20} y={12} w={96} h={34} hi>Thought</Box><Box t={t} x={230} y={12} w={96} h={34}>Action</Box><Box t={t} x={125} y={92} w={110} h={34}>Observation</Box>
    <Arrow x1={116} y1={29} x2={228} y2={29} c={t.edge} /><Arrow x1={278} y1={46} x2={210} y2={90} c={t.edge} /><Arrow x1={150} y1={90} x2={68} y2={48} c={t.edge} />
    <Txt x={172} y={23} c={t.textSecondary} s={11}>search(…)</Txt><Txt x={285} y={78} c={t.textSecondary} s={11}>program runs it</Txt><Txt x={72} y={84} c={t.textSecondary} s={11}>model reads it</Txt>
    <Txt x={180} y={146} c={t.accentPrimary} w={700}>Exits when the model gives an answer</Txt>
  </svg>,
  toolformer: (t) => <svg viewBox="0 0 360 130" width="100%" role="img" aria-label="Training text with an API call inserted, and its result, in the sentence.">
    <Txt x={8} y={20} a="start" c={t.textSecondary}>Training text, with a call inserted:</Txt>
    <rect x={8} y={34} width={344} height={38} rx={5} fill={t.surfaceAlt} stroke={t.border} />
    <text x={18} y={58} fontSize={12} fill={t.textPrimary}>… is <tspan fill={t.accentPrimary} fontWeight={700}>[Calculator(400/1400) → 0.29]</tspan> 29%</text>
    <Txt x={8} y={98} a="start" c={t.textPrimary}>Kept only when the call makes the</Txt><Txt x={8} y={116} a="start" c={t.textPrimary}>next tokens easier for the model to predict.</Txt>
  </svg>,
  plugins: (t) => <Seq t={t} actors={['ChatGPT', 'Your API']} msgs={[[0, 1, 'read manifest + OpenAPI'], [1, 0, 'tool descriptions', true], [0, 1, 'call flight search'], [1, 0, 'results', true]]} />,
  'function-calling': (t) => <Seq t={t} actors={['Your app', 'Model']} msgs={[[0, 1, 'prompt + function schemas'], [1, 0, 'get_weather("Pune")', true], [0, 0, ''], [0, 1, 'result: 31°C'], [1, 0, 'It is 31°C in Pune.', true]].filter((m) => m[2]) as Msg[]} />,
  'tool-use': (t) => <Code t={t} aria="Conversation messages: the assistant message has a tool_use block and the next user message has the matching tool_result." lines={[['assistant:'], ['  tool_use  id=t1  name=get_weather', true], ['  input: {"city":"Pune"}'], ['user:'], ['  tool_result  tool_use_id=t1', true], ['  content: "31°C"']]} />,
  'structured-outputs': (t) => <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="At the status field the schema allows only paid or denied; other tokens are blocked.">
    <text x={8} y={22} fontFamily="monospace" fontSize={12} fill={t.textPrimary}>{'schema: status ∈ {"paid","denied"}'}</text>
    <Txt x={8} y={50} a="start" c={t.textSecondary}>Next token, as the model would rank it:</Txt>
    {[['"maybe"', .5, false], ['"paid"', .3, true], ['"denied"', .15, true], ['"unknown"', .05, false]].map(([l, p, ok], i) => <g key={String(l)}><text x={8} y={74 + i * 22} fontFamily="monospace" fontSize={12} fill={t.textPrimary}>{l}</text><rect x={90} y={62 + i * 22} width={Number(p) * 340} height={15} rx={2} fill={ok ? t.accentPrimary : t.surfaceAlt} stroke={t.border} /><Txt x={352} y={74 + i * 22} a="end" c={ok ? t.accentPrimary : t.accentDanger} s={11} w={700}>{ok ? 'allowed' : 'blocked'}</Txt></g>)}
  </svg>,
  mcp: (t) => <Seq t={t} actors={['Host + client', 'MCP server', 'GitHub']} msgs={[[0, 1, 'initialize'], [0, 1, 'tools/list'], [1, 0, 'tools + schemas', true], [0, 1, 'tools/call'], [1, 2, 'API call'], [2, 1, 'data', true], [1, 0, 'result', true]]} />,
  'mcp-remote': (t) => <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="Local stdio serves one client as a subprocess; Streamable HTTP serves many clients at one endpoint with tokens.">
    <Txt x={85} y={16} c={t.textSecondary}>stdio: local</Txt><Txt x={265} y={16} c={t.textSecondary}>Streamable HTTP: remote</Txt>
    <Box t={t} x={35} y={28} w={100} h={30}>Client</Box><Box t={t} x={35} y={100} w={100} h={30}>Subprocess</Box><Arrow x1={85} y1={58} x2={85} y2={98} c={t.edge} />
    {[0, 1, 2].map((i) => <g key={i}><Box t={t} x={190 + i * 56} y={28} w={50} h={30}>{`C${i + 1}`}</Box><Arrow x1={215 + i * 56} y1={58} x2={270} y2={98} c={t.accentPrimary} /></g>)}
    <Box t={t} x={215} y={100} w={110} h={30} hi>POST /mcp</Box><Txt x={270} y={146} c={t.textSecondary} s={11}>each with a bearer token</Txt>
  </svg>,
  a2a: (t) => <Seq t={t} actors={['Hiring', 'Screening']} msgs={[[0, 1, 'GET Agent Card'], [1, 0, 'skills, auth, endpoint', true], [0, 1, 'send task'], [1, 0, 'status: working', true], [1, 0, 'completed + artifact', true]]} />,
  'ag-ui': (t) => <svg viewBox="0 0 360 130" width="100%" role="img" aria-label="A timeline of events streaming from an agent to the interface.">
    <Txt x={8} y={18} a="start" c={t.textSecondary}>Event stream, agent to user interface</Txt>
    <Arrow x1={8} y1={62} x2={352} y2={62} c={t.edge} />
    {['Run started', 'Tool call', 'Text', 'State', 'Run ended'].map((l, i) => <g key={l}><circle cx={30 + i * 72} cy={62} r={7} fill={t.accentPrimary} /><Txt x={30 + i * 72} y={i % 2 ? 94 : 44} c={t.textPrimary} s={11}>{l}</Txt></g>)}
  </svg>,
  'agents-md': (t) => <Code t={t} aria="A short AGENTS.md file with setup and test commands." lines={[['# AGENTS.md', true], ['## Setup'], ['npm ci'], ['## Before committing'], ['npm test'], ['Do not edit generated files.']]} />,
  aaif: (t) => <svg viewBox="0 0 360 140" width="100%" role="img" aria-label="MCP moves from one company to a neutral foundation under the Linux Foundation.">
    <Box t={t} x={8} y={50} w={110} h={40}>Anthropic</Box><Arrow x1={118} y1={70} x2={196} y2={70} c={t.accentPrimary} /><Txt x={156} y={62} c={t.textPrimary} s={11}>donates MCP</Txt>
    <rect x={198} y={14} width={154} height={112} rx={6} fill="none" stroke={t.border} /><Txt x={275} y={32} c={t.textSecondary} s={11}>Linux Foundation</Txt>
    <Box t={t} x={210} y={42} w={130} h={72} hi>AAIF</Box>
  </svg>,
};

export default function ProtocolDiagram({ id }: { id: string }) {
  const t = useVizTokens();
  return <>{DIAGRAMS[id]?.(t)}</>;
}

export const protocolDiagramIds = Object.keys(DIAGRAMS);
