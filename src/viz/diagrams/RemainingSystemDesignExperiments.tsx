import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type Row = { label: string; value: number };
/** Common axis and accessible numeric bars; each exported experiment owns its calculation. */
function Bars({title,description,footer,rows,max,unit,status,control}:{title:string;description:string;footer:string;rows:Row[];max:number;unit:string;status:string;control:React.ReactNode}) {
  const t=useVizTokens();
  return <VisualizationContainer footer={footer}><VisualizationHeader title={title} description={description}/>{control}
    <svg viewBox={`0 0 300 ${rows.length*62+35}`} width="100%" role="img" aria-label={rows.map(r=>`${r.label}: ${r.value} ${unit}`).join('; ')}>
      {rows.map((r,i)=><g key={r.label}><text x={8} y={20+i*62} fill={t.textPrimary} fontSize={13}>{r.label}: {r.value} {unit}</text><rect x={8} y={30+i*62} width={280} height={16} fill={t.surfaceAlt} stroke={t.border}/><rect x={8} y={30+i*62} width={280*Math.min(1,r.value/max)} height={16} fill={t.accentPrimary}/></g>)}
      <text x={8} y={rows.length*62+20} fill={t.textSecondary} fontSize={12}>Common axis: 0–{max} {unit}</text>
    </svg><p role="status">{status}</p></VisualizationContainer>;
}
export function RestConditionalWrite() {
  const [mode,setMode]=useState<'blind'|'guarded'>('blind');
  const guarded=mode==='guarded';
  return <Bars title="Which stale edit may replace version 8?" description="Both editors start at version 7. A commits price 12; B later submits its old full representation with price 10." footer="The calculated example compares blind replacement with an atomic If-Match check. A rejected second replacement preserves price 12; HTTP idempotence alone does not prevent a stale client overwriting another edit." rows={[{label:'Initial price',value:10},{label:'After A',value:12},{label:'After B attempt',value:guarded?12:10}]} max={14} unit="price units" status={guarded?'B receives 412; version 8 and price 12 survive.':'B overwrites price 12 with its stale price 10.'} control={<PillSelect label="Write policy" value={mode} onChange={setMode} options={[{value:'blind',label:'Blind replacement'},{value:'guarded',label:'If-Match version 7'}]}/>}/>;
}
export function GrpcDeadlineBudget() {
  const [mode,setMode]=useState<'fresh'|'remaining'>('fresh');
  const remaining=mode==='remaining';
  return <Bars title="A timeout does not restart the user's clock" description="A 200 ms request spends 30 ms at the gateway and 50 ms before the downstream call." footer="These illustrative allocations leave 120 ms for downstream work and return. A fresh 200 ms downstream timeout can extend the total path to 280 ms; propagating remaining time preserves the original 200 ms boundary." rows={[{label:'Already spent',value:80},{label:'Downstream allowance',value:remaining?120:200},{label:'Possible total',value:remaining?200:280}]} max={280} unit="ms" status={remaining?'120 ms remains; all work shares one deadline.':'Fresh timeout permits 80 ms beyond the original deadline.'} control={<PillSelect label="Propagation" value={mode} onChange={setMode} options={[{value:'fresh',label:'Fresh timeout'},{value:'remaining',label:'Remaining deadline'}]}/>}/>;
}
export function GraphqlResolverWork() {
  const [mode,setMode]=useState<'naive'|'batch'>('naive');
  const batched=mode==='batch';
  return <Bars title="One HTTP request can cause eleven backend calls" description="Ten orders refer alternately to two owners. Compare per-order owner resolution with one request-scoped batch." footer="The calculated example counts one order-list call and ten naive owner calls. Deduplicating the two owner IDs and fetching them in one batch reduces backend calls from eleven to two, while still returning ten owner fields." rows={[{label:'Order list calls',value:1},{label:'Owner fetch calls',value:batched?1:10},{label:'Total backend calls',value:batched?2:11}]} max={11} unit="calls" status={batched?'Two distinct owners, one batch, two total backend calls.':'Ten resolver invocations each make an owner call.'} control={<PillSelect label="Resolver strategy" value={mode} onChange={setMode} options={[{value:'naive',label:'Per-field fetch'},{value:'batch',label:'Request-scoped batch'}]}/>}/>;
}
export function StreamReplayWindow() {
  const [mode,setMode]=useState<'retained'|'gap'>('gap');
  const gap=mode==='gap';
  return <Bars title="Reconnect cannot recreate expired history" description="Cursor 41 needs events 42–45. Change the earliest retained event from 40 to 44." footer="The chosen four-event history needs four records. A retention floor of 44 leaves only two and requires snapshot repair; automatic reconnection alone cannot recover 42 and 43." rows={[{label:'Events required',value:4},{label:'Events available',value:gap?2:4},{label:'Missing events',value:gap?2:0}]} max={4} unit="events" status={gap?'Gap: repair 42 and 43 before claiming complete recovery.':'All four missing events can be replayed.'} control={<PillSelect label="Retention window" value={mode} onChange={setMode} options={[{value:'retained',label:'Retain from 40'},{value:'gap',label:'Retain from 44'}]}/>}/>;
}
export function QueueAcknowledgementEffects() {
  const [mode,setMode]=useState<'unguarded'|'guarded'>('unguarded');
  return <Bars title="A lost acknowledgement permits another delivery" description="Job 7 commits, its acknowledgement is lost, and a second delivery arrives." footer="The calculated two-attempt model executes the effect twice without durable deduplication. An atomic identity/effect guard reduces committed effects to one without pretending that delivery itself happened once." rows={[{label:'Delivery attempts',value:2},{label:'Committed effects',value:mode==='guarded'?1:2}]} max={2} unit="count" status={mode==='guarded'?'Two deliveries, one committed effect.':'Redelivery repeats the effect.'} control={<PillSelect label="Effect boundary" value={mode} onChange={setMode} options={[{value:'unguarded',label:'No effect guard'},{value:'guarded',label:'Atomic effect guard'}]}/>}/>;
}
export function KafkaOffsetBoundary() {
  const t=useVizTokens();
  const [mode,setMode]=useState<'effect'|'offset'>('effect');
  const effectFirst=mode==='effect';
  return <VisualizationContainer footer="Partition offsets 10,11,12 remain in the log. After an effect-first crash, committed next offset 11 replays the completed effect; an offset-first crash can skip the uncommitted effect for 11. An external sink needs its own safe commit protocol."><VisualizationHeader title="The bookmark and the effect can disagree" description="Change which record commits before a crash at offset 11."/><PillSelect label="Crash boundary" value={mode} onChange={setMode} options={[{value:'effect',label:'Effect before offset'},{value:'offset',label:'Offset before effect'}]}/>
    <svg viewBox="0 0 300 190" width="100%" role="img" aria-label={effectFirst?'Effect 11 exists; restart reads 11 again':'Effect 11 is missing; restart skips to 12'}>
      {[10,11,12].map((n,i)=><g key={n}><rect x={8+i*95} y={18} width={88} height={45} fill={n===(effectFirst?11:12)?t.accentPrimary:t.surfaceAlt} stroke={t.border}/><text x={52+i*95} y={46} textAnchor="middle" fill={n===(effectFirst?11:12)?t.background:t.textPrimary} fontSize={14}>{n}</text></g>)}
      <text x={8} y={92} fill={t.textPrimary} fontSize={14}>Committed next: {effectFirst?11:12}</text><text x={8} y={123} fill={t.textPrimary} fontSize={14}>Effect for 11: {effectFirst?'already committed':'not committed'}</text><text x={8} y={162} fill={t.textSecondary} fontSize={13}>Highlight = restart position in partition 0</text>
    </svg><p role="status">{effectFirst?'Replay can duplicate effect 11.':'Resume can lose effect 11.'}</p></VisualizationContainer>;
}
export function SubscriptionFanout() {
  const [mode,setMode]=useState<'workers'|'groups'>('workers');
  const groups=mode==='groups';
  return <Bars title="Independent subscriptions multiply obligations" description="Four events go either to competing workers or to two independent subscription groups." footer="The chosen successful-delivery model splits four jobs between workers, two each. Two independent subscriptions each receive all four, requiring eight logical deliveries before retries." rows={[{label:groups?'Accounting':'Worker A',value:groups?4:2},{label:groups?'Fulfilment':'Worker B',value:groups?4:2},{label:'Total deliveries',value:groups?8:4}]} max={8} unit="events" status={groups?'Each group receives all four events.':'Each worker receives only its share of one obligation.'} control={<PillSelect label="Consumer scope" value={mode} onChange={setMode} options={[{value:'workers',label:'Competing workers'},{value:'groups',label:'Independent subscriptions'}]}/>}/>;
}
export function IdempotentOperationBalance() {
  const [mode,setMode]=useState<'naive'|'keyed'>('naive');
  return <Bars title="Two attempts need not mean two debits" description="Operation k7 debits ten units from 100, then arrives again with the same scoped identity." footer="This calculated sequential model leaves 80 after two unguarded effects, or 90 when operation identity and the ten-unit debit share one atomic durable boundary. A new operation key would authorize a separate intent." rows={[{label:'Starting balance',value:100},{label:'After two attempts',value:mode==='keyed'?90:80}]} max={100} unit="units" status={mode==='keyed'?'Replay k7: balance remains 90.':'Two attempts debit twice; balance is 80.'} control={<PillSelect label="Intent recognition" value={mode} onChange={setMode} options={[{value:'naive',label:'Apply each attempt'},{value:'keyed',label:'Atomic operation identity'}]}/>}/>;
}
export function DeliveryEffectBoundary() {
  const [mode,setMode]=useState<'before'|'after'|'atomic'>('after');
  const effects=mode==='before'?0:mode==='after'?2:1;
  return <Bars title="Move the crash window or close the effect boundary" description="One input should create one effect. Compare progress-first, effect-first, and atomic identity/effect recovery." footer="The illustrative failure histories yield zero, two, or one committed effects. Exactly-once effects require both no loss and no repetition within the specified participants; suppressing retries alone does not provide both." rows={[{label:'Required effects',value:1},{label:'Effects after recovery',value:effects}]} max={2} unit="effects" status={effects===1?'Repeated attempts preserve one effect.':effects===0?'Progress-first crash loses the effect.':'Unguarded effect-first replay duplicates it.'} control={<PillSelect label="Commit boundary" value={mode} onChange={setMode} options={[{value:'before',label:'Progress first'},{value:'after',label:'Effect first'},{value:'atomic',label:'Atomic identity and effect'}]}/>}/>;
}
export function ConsensusMajority() {
  const [mode,setMode]=useState<'majority'|'minority'>('minority');
  const votes=mode==='majority'?3:2;
  return <Bars title="A local leader cannot manufacture missing votes" description="Five voters require three. Compare the two sides of a 3/2 partition under valid current-term protocol rules." footer="This calculated majority count assumes correct persistent voting, log eligibility, and current-term commit rules. Three reachable voters can form a majority; two cannot commit an independent conflicting history merely by choosing a local leader." rows={[{label:'Required majority',value:3},{label:'Reachable voters',value:votes}]} max={5} unit="voters" status={votes===3?'A majority exists under the stated protocol.':'No majority: required operations must wait or fail.'} control={<PillSelect label="Partition side" value={mode} onChange={setMode} options={[{value:'majority',label:'Three-voter side'},{value:'minority',label:'Two-voter side'}]}/>}/>;
}
