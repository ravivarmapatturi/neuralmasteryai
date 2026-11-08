import { useId, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

const cases = {
  'url-shortener': {title:'Redirect miss versus revoked link',normal:['Browser → Edge: GET /abc','Edge → Cache: lookup abc (miss)','Service → Store: read active destination','Service → Browser: 302 + bounded cache policy'],failure:['Browser → Edge: GET /abc','Edge → Cache: tombstone for abc','Edge → Browser: 410; do not serve old destination'],note:'A revocation tombstone must override an older cached destination within the deletion contract.'},
  'rate-limiter': {title:'One atomic admission decision',normal:['Client → Gateway: tenant A request','Gateway → Limiter: refill and spend atomically','Limiter → Gateway: one token spent','Gateway → Service: admit request'],failure:['Client → Gateway: tenant A request','Gateway → Limiter: store unavailable','Gateway → Client: 503 under fail-closed policy'],note:'The failure policy is explicit; a store timeout is different from a known quota rejection.'},
  'news-feed': {title:'Publish and merge a hybrid feed',normal:['Author → Post store: persist post p9','Outbox → Fan-out worker: post p9','Worker → Inbox: append ordinary-author reference','Reader → Feed: merge inbox + celebrity posts'],failure:['Author → Post store: persist post p9','Fan-out worker → Inbox: delayed','Reader → Feed: merge authoritative recent posts','Feed → Reader: bounded stale page with cursor'],note:'Fan-out lag affects freshness. The durable post remains the authority, while inboxes are derived views.'},
  'chat-system': {title:'A durable message before delivery',normal:['Sender → Chat owner: message m17','Owner → Log: commit conversation sequence 418','Owner → Sender: durable acceptance ACK','Log → Gateway: deliver 418 to online receiver'],failure:['Sender → Chat owner: retry m17 after ACK loss','Owner → Log: m17 already has sequence 418','Owner → Sender: return existing sequence 418','Receiver → History: resume after cursor 417'],note:'The sender ID deduplicates retries; a conversation sequence supports ordered replay.'},
  'notification-system': {title:'Intent, preference, provider outcome',normal:['Event → Planner: invoice-ready e17','Planner → Store: unique recipient/channel intent','Worker → Provider: stable idempotency key','Provider → Worker: accepted; await delivery receipt'],failure:['Event → Planner: invoice-ready e17','Worker → Provider: request times out','Worker → Status API: reconcile by stable key','Worker → Store: unknown until authoritative outcome'],note:'Provider acceptance is not device delivery. Ambiguous sends must be reconciled rather than blindly marked successful.'},
  'video-streaming': {title:'Publish only a complete playable version',normal:['Uploader → Object store: resumable chunks','Encoder → Store: renditions and segments','Validator → Catalog: publish manifest version v8','Player → CDN: fetch v8 segments'],failure:['Uploader → Object store: resumable chunks','Encoder → Store: one rendition incomplete','Validator → Catalog: keep v8 unpublished','Player → CDN: continue previous published version'],note:'An atomic catalog pointer prevents players from seeing a manifest for missing segments.'},
  'search-autocomplete': {title:'Serve a versioned prefix index',normal:['Client → Edge: prefix ca + generation 8','Edge → Index: top candidates for ca','Policy → Results: remove blocked terms','Server → Client: candidates for generation 8'],failure:['Client → Edge: prefix cat + generation 9','Server → Client: delayed generation 8 response','Client → UI: discard old generation 8','Server → Client: render generation 9 results'],note:'A client generation number prevents a slower old request from replacing the latest prefix results.'},
  'ride-sharing': {title:'Candidate discovery versus assignment',normal:['Driver → Location index: position update','Rider → Matcher: nearby available candidates','Matcher → Trip store: conditional driver reservation','Trip store → Rider: one confirmed assignment'],failure:['Two matchers → Trip store: reserve same driver','Trip store → Matcher A: compare-and-set succeeds','Trip store → Matcher B: version conflict','Matcher B → Index: choose another candidate'],note:'A stale location index may discover candidates, but only the authoritative reservation can assign a driver.'},
  'payment-system': {title:'An ambiguous charge is a state',normal:['Client → Payment API: key k17 + amount','API → Store: persist pending operation k17','Worker → Provider: authorize with stable key','Worker → Ledger: commit balanced result + outbox'],failure:['Client → Payment API: key k17 + amount','Provider → Worker: response lost','Worker → Store: mark outcome unknown','Reconciler → Provider: query k17 before retry'],note:'Unknown is preserved until reconciliation; a lost response does not prove the provider did not charge.'},
  'distributed-file-storage': {title:'Chunks first, manifest commit last',normal:['Client → Chunk store: content-addressed chunks','Chunk store → Client: durability ACKs','Client → Metadata: compare-and-set manifest v8','Metadata → Reader: published immutable chunk list'],failure:['Client → Chunk store: content-addressed chunks','Metadata → Client: stale version; reject commit','Reader → Metadata: previous complete manifest','GC → Chunk store: reclaim unreferenced chunks after grace'],note:'A failed metadata commit leaves orphan chunks, not a partially published file. Garbage collection must allow in-flight uploads.'},
};
export type SoftwareCase = keyof typeof cases;
export default function SoftwareCaseTrace({scenario}:{scenario:SoftwareCase}) {
  const t = useVizTokens();
  const [mode,setMode] = useState<'normal'|'failure'>('failure');
  const data = cases[scenario];
  const marker = useId().replace(/:/g, '');
  const aliases:Record<string,string> = {Owner:'Chat owner',History:'Log'};
  const canonical = (name:string) => {
    if (scenario === 'chat-system') return aliases[name] ?? name;
    if (scenario === 'payment-system' && name === 'API') return 'Payment API';
    if (scenario === 'news-feed' && name === 'Fan-out worker') return 'Worker';
    if (scenario === 'video-streaming' && name === 'Store') return 'Object store';
    if (scenario === 'ride-sharing' && name === 'Index') return 'Location index';
    return name;
  };
  const messages = data[mode].map(step => {
    const [from, rest] = step.split(' → ');
    const separator = rest.indexOf(':');
    return {from:canonical(from), to: canonical(rest.slice(0,separator)), event: rest.slice(separator+1).trim()};
  });
  const actors = [...new Set(messages.flatMap(message => [message.from,message.to]))];
  const x = (actor:string) => 35 + actors.indexOf(actor) * 230 / Math.max(1,actors.length-1);
  const height = 100 + messages.length*65;
  const wrap = (text:string, max:number) => text.split(' ').reduce<string[]>((lines,word) => {
    if (lines.length && lines[lines.length-1].length + word.length < max) lines[lines.length-1] += ' '+word;
    else lines.push(word);
    return lines;
  }, []);
  return <VisualizationContainer footer={data.note}>
    <VisualizationHeader title={data.title}/>
    <PillSelect value={mode} onChange={setMode} options={[{value:'normal',label:'Normal path'},{value:'failure',label:'Failure path'}]}/>
    <svg viewBox={`0 0 300 ${height}`} width="100%" role="img" aria-label={data[mode].join('. ')}>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={t.edge}/></marker></defs>
      {actors.map((actor,index)=><g key={actor}>
        <text x={x(actor)} y={index % 2 ? 47 : 15} textAnchor="middle" fill={t.textPrimary} fontSize={13}>{wrap(actor,9).map((line,i)=><tspan key={i} x={x(actor)} dy={i ? 15 : 0}>{line}</tspan>)}</text>
        <line x1={x(actor)} x2={x(actor)} y1={index % 2 ? 78 : 48} y2={height-10} stroke={t.border} strokeDasharray="3 4"/>
      </g>)}
      {messages.map((message,i)=><g key={i}>
        <line x1={x(message.from)} x2={x(message.to)} y1={95+i*65} y2={95+i*65} stroke={t.edge} strokeWidth={2} markerEnd={`url(#${marker})`}/>
        <rect x={0} y={101+i*65} width={300} height={39} fill={t.surface}/>
        <text x={150} y={117+i*65} textAnchor="middle" fill={t.textPrimary} fontSize={13}>{wrap(`${i+1}. ${message.event}`,39).map((line,j)=><tspan key={j} x={150} dy={j ? 15 : 0}>{line}</tspan>)}</text>
      </g>)}
    </svg>
    <details><summary>Read the message trace</summary><ol>{data[mode].map(step=><li key={step}>{step}</li>)}</ol></details>
  </VisualizationContainer>;
}
