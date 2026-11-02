import { useState, type ReactNode } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

// One teaching figure per part of "How US Healthcare Works". Facts and numbers
// come from the post each figure sits in; anything else is labelled illustrative.
type T = ReturnType<typeof useVizTokens>;

const Fig = ({ title, question, how, caption, children }: { title: string; question: string; how: string; caption: string; children: ReactNode }) => (
  <VisualizationContainer title={title} footer={caption}>
    <VisualizationHeader eyebrow="TRY IT" title={question} description={how} />
    {children}
  </VisualizationContainer>
);

const Choices = ({ t, items, value, onPick, label }: { t: T; items: string[]; value: number; onPick: (i: number) => void; label: string }) => (
  <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0.25rem 0 0.75rem' }}>
    {items.map((it, i) => <button key={it} type="button" aria-pressed={i === value} onClick={() => onPick(i)} style={{ minHeight: 40, padding: '4px 10px', borderRadius: 8, cursor: 'pointer', font: 'inherit', fontSize: 13, border: `1.5px solid ${i === value ? t.accentPrimary : t.border}`, background: i === value ? t.surfaceAlt : 'transparent', color: t.textPrimary, fontWeight: i === value ? 700 : 400 }}>{it}</button>)}
  </div>
);

const Say = ({ t, children }: { t: T; children: ReactNode }) => <p aria-live="polite" style={{ margin: '0.5rem 0 0', color: t.textPrimary, lineHeight: 1.5 }}>{children}</p>;

const HBars = ({ t, rows, max, unit, aria, hi }: { t: T; rows: [string, number][]; max: number; unit: string; aria: string; hi?: number }) => (
  <svg viewBox={`0 0 420 ${rows.length * 32 + 6}`} width="100%" role="img" aria-label={aria}>
    {rows.map(([l, v], i) => <g key={l} transform={`translate(0 ${i * 32})`}>
      <text x={136} y={20} textAnchor="end" fontSize={12} fill={t.textPrimary}>{l}</text>
      <rect x={142} y={6} width={Math.max(2, (v / max) * 215)} height={20} rx={3} fill={i === hi ? t.accentDanger : t.accentSecondary} />
      <text x={148 + (v / max) * 215} y={21} fontSize={12} fontWeight={700} fill={t.textPrimary}>{v}{unit}</text>
    </g>)}
  </svg>
);

/** Part 1: who is covered by whom. */
export function HcCoverageMap() {
  const t = useVizTokens();
  return <Fig title="Who covers America" question="Where do people get coverage?" how="Compare the groups in this post's table." caption="Figures from the table above: employer coverage under 65, Medicare Parts A and B, Medicaid and CHIP (June 2026), marketplace plans (2026), uninsured for all of 2025. Groups overlap and come from different years, so they do not add up to the population.">
    <HBars t={t} max={180} unit="M" hi={4} aria="Employer coverage is largest at about 166 million, then Medicaid and CHIP 73.2, Medicare 64.2, uninsured 26.7, and marketplace 19.2 million." rows={[['Employer', 166], ['Medicaid + CHIP', 73.2], ['Medicare A + B', 64.2], ['Marketplace', 19.2], ['Uninsured', 26.7]]} />
  </Fig>;
}

/** Part 2: fully insured vs self-funded. */
export function HcFundingToggle() {
  const t = useVizTokens();
  const [m, setM] = useState(0);
  const self = m === 1;
  return <Fig title="Who carries the risk" question="If a member has a very expensive year, who pays?" how="Switch the funding model and follow the money." caption="From the post's comparison: under full insurance the employer pays a fixed premium per employee and the state regulates; under self-funding the employer pays actual claims plus an admin fee, under federal ERISA rules.">
    <Choices t={t} label="Funding model" items={['Fully insured', 'Self-funded']} value={m} onPick={setM} />
    <svg viewBox="0 0 420 120" width="100%" role="img" aria-label={self ? 'The employer pays actual claims and an admin fee; the employer bears the risk.' : 'The employer pays a fixed premium; the insurer pays claims and bears the risk.'}>
      {[['Employer', 8, !self ? t.surfaceAlt : t.accentWarn], ['Insurer' + (self ? ' / TPA' : ''), 150, self ? t.surfaceAlt : t.accentWarn], ['Provider', 292, t.surfaceAlt]].map(([l, x, c]) => <g key={String(x)}><rect x={Number(x)} y={38} width={120} height={44} rx={6} fill={String(c)} stroke={t.border} /><text x={Number(x) + 60} y={65} textAnchor="middle" fontSize={13} fill={t.textPrimary}>{String(l)}</text></g>)}
      <line x1={128} y1={60} x2={150} y2={60} stroke={t.edge} strokeWidth={3} /><line x1={270} y1={60} x2={292} y2={60} stroke={t.edge} strokeWidth={3} />
      <text x={70} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>{self ? 'pays actual claims + fee' : 'pays a fixed premium'}</text>
      <text x={210} y={108} textAnchor="middle" fontSize={12} fill={t.accentDanger} fontWeight={700}>Risk sits with the {self ? 'employer' : 'insurer'}</text>
    </svg>
    <Say t={t}>Regulated by {self ? 'the federal government, under ERISA' : 'the state insurance department'}.</Say>
  </Fig>;
}

/** Member's share of one bill on the post's example plan: deductible, then 20% coinsurance, up to the out-of-pocket maximum. */
export function memberShare(allowed: number, deductibleLeft = 1500, oopLeft = 5000) {
  const ded = Math.min(allowed, deductibleLeft);
  const coins = Math.min((allowed - ded) * 0.2, Math.max(0, oopLeft - ded));
  return { ded, coins, member: ded + coins, plan: allowed - ded - coins };
}

/** Part 3: how a bill splits. */
export function HcCostShare() {
  const t = useVizTokens();
  const [a, setA] = useState(4000);
  const s = memberShare(a);
  const w = 400, x = (v: number) => (v / a) * w;
  return <Fig title="Splitting one bill" question="How much of a bill does the member actually pay?" how="Drag the allowed amount and watch the deductible, coinsurance and out-of-pocket maximum take over." caption={`On this post's example plan with nothing paid yet this year: $1,500 deductible, then 20% coinsurance, capped at the $5,000 out-of-pocket maximum. The member pays $${s.member.toLocaleString('en-US')}; the plan pays $${s.plan.toLocaleString('en-US')}.`}>
    <label style={{ display: 'block', color: t.textPrimary }}>Allowed amount: <strong>${a.toLocaleString('en-US')}</strong><input aria-label="Allowed amount" type="range" min={500} max={40000} step={500} value={a} onChange={e => setA(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
    <svg viewBox="0 0 420 70" width="100%" role="img" aria-label={`Member pays ${s.member} dollars, plan pays ${s.plan}.`} style={{ marginTop: 8 }}>
      <rect x={10} y={10} width={x(s.ded)} height={28} fill={t.accentWarn} /><rect x={10 + x(s.ded)} y={10} width={x(s.coins)} height={28} fill={t.accentDanger} /><rect x={10 + x(s.member)} y={10} width={x(s.plan)} height={28} fill={t.accentSecondary} />
      <text x={10} y={56} fontSize={12} fill={t.textPrimary}>deductible ${s.ded.toLocaleString('en-US')} · coinsurance ${s.coins.toLocaleString('en-US')} · plan ${s.plan.toLocaleString('en-US')}</text>
    </svg>
    {s.member >= 5000 && <Say t={t}>The out-of-pocket maximum is reached: the plan now pays 100% of anything further this year.</Say>}
  </Fig>;
}

/** Part 4: which code system answers which question. */
export function HcCodeSystems() {
  const t = useVizTokens();
  const rows = [['ICD-10-CM', 'Why was the patient seen?', 'diagnosis', 'CDC NCHS, with CMS'], ['CPT', 'What was done?', 'outpatient and physician services', 'American Medical Association'], ['HCPCS II', 'What was done?', 'what CPT does not cover', 'CMS'], ['ICD-10-PCS', 'What was done?', 'inpatient hospital procedures', 'CMS'], ['MS-DRG', 'How is the stay grouped for payment?', 'hospital stay grouping', 'CMS']];
  const [i, setI] = useState(0);
  return <Fig title="One claim, several code systems" question="Which code system answers which question?" how="Pick a code system and see where it sits on a claim." caption="From this post's table: every claim answers why the patient was seen and what was done. Inpatient and outpatient care use different systems for the second question.">
    <Choices t={t} label="Code system" items={rows.map(r => r[0])} value={i} onPick={setI} />
    <svg viewBox="0 0 420 96" width="100%" role="img" aria-label={`${rows[i][0]} answers: ${rows[i][1]} Maintained by ${rows[i][3]}.`}>
      <rect x={10} y={8} width={195} height={80} rx={6} fill={i === 0 ? t.accentWarn : t.surfaceAlt} stroke={t.border} /><text x={107} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>Why?</text><text x={107} y={62} textAnchor="middle" fontSize={12} fill={t.textPrimary}>diagnosis</text>
      <rect x={215} y={8} width={195} height={80} rx={6} fill={i > 0 && i < 4 ? t.accentWarn : t.surfaceAlt} stroke={t.border} /><text x={312} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>What?</text><text x={312} y={62} textAnchor="middle" fontSize={12} fill={t.textPrimary}>procedure or service</text>
    </svg>
    <Say t={t}><strong>{rows[i][0]}:</strong> {rows[i][2]}. Maintained by {rows[i][3]}.</Say>
  </Fig>;
}

/** Part 5: two independent tests. */
export function HcTwoTests() {
  const t = useVizTokens();
  const [b, setB] = useState(true);
  const [n, setN] = useState(false);
  const pay = b && n;
  return <Fig title="Two tests" question="Why can a covered service still go unpaid?" how="Turn each test on and off." caption="From the post: the plan document decides whether something is a covered benefit; medical necessity decides whether it was appropriate for this patient. A service must pass both.">
    <div style={{ display: 'grid', gap: 6, color: t.textPrimary, marginBottom: 8 }}>
      <label><input type="checkbox" checked={b} onChange={e => setB(e.target.checked)} /> Is it a covered benefit under the plan?</label>
      <label><input type="checkbox" checked={n} onChange={e => setN(e.target.checked)} /> Is it medically necessary for this patient?</label>
    </div>
    <svg viewBox="0 0 420 70" width="100%" role="img" aria-label={pay ? 'Both gates pass; the claim can be paid.' : 'A gate fails; the service is not paid.'}>
      <line x1={10} y1={35} x2={290} y2={35} stroke={t.edge} strokeWidth={3} />
      {[[100, b, 'benefit'], [210, n, 'necessity']].map(([x, ok, l]) => <g key={String(l)}><rect x={Number(x) - 6} y={ok ? 2 : 14} width={12} height={ok ? 14 : 42} fill={ok ? t.accentPrimary : t.accentDanger} /><text x={Number(x)} y={68} textAnchor="middle" fontSize={12} fill={t.textPrimary}>{String(l)}</text></g>)}
      <text x={300} y={40} fontSize={15} fontWeight={700} fill={pay ? t.accentPrimary : t.accentDanger}>{pay ? 'Paid' : 'Not paid'}</text>
    </svg>
  </Fig>;
}

/** Part 6: retroactive termination timeline. */
export function HcRetroTermination() {
  const t = useVizTokens();
  const [f, setF] = useState(false);
  const x = (m: number) => 30 + (m - 6) * 120;
  return <Fig title="Why “covered” isn't final" question="What happens when the termination file arrives late?" how="Deliver the employer's file and watch the July claim." caption="The post's example: an employee leaves on 30 June and the file arrives in August, dated back to 30 June. Claims paid for July were for someone not covered, so the payer recovers the money from the provider, who then bills the patient.">
    <Choices t={t} label="Termination file" items={['Before the file', 'File arrives in August']} value={f ? 1 : 0} onPick={i => setF(i === 1)} />
    <svg viewBox="0 0 420 110" width="100%" role="img" aria-label={f ? 'Coverage now ends 30 June, so the July claim paid earlier is recovered.' : 'The system shows coverage continuing and pays the July claim.'}>
      <rect x={x(6)} y={30} width={x(f ? 7 : 9) - x(6)} height={22} fill={t.accentSecondary} opacity={.7} />{f && <rect x={x(7)} y={30} width={x(9) - x(7)} height={22} fill="none" stroke={t.accentDanger} strokeDasharray="4 3" />}
      {[6, 7, 8].map((m, i) => <text key={m} x={x(m) + 60} y={72} textAnchor="middle" fontSize={12} fill={t.textSecondary}>{['June', 'July', 'August'][i]}</text>)}
      <circle cx={x(7) + 45} cy={41} r={8} fill={f ? t.accentDanger : t.accentPrimary} /><text x={x(7) + 45} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fill={f ? t.accentDanger : t.accentPrimary}>July claim: {f ? 'recovered' : 'paid'}</text>
      <text x={10} y={100} fontSize={12} fill={t.textPrimary}>{f ? 'Termination dated back to 30 June' : 'Payer still shows active coverage'}</text>
    </svg>
  </Fig>;
}

/** Part 7: the four jobs of a network team. */
export function HcNetworkJobs() {
  const t = useVizTokens();
  const jobs = [['Contracting', 'What will we pay this provider, and on what terms?'], ['Credentialing', 'Is this provider qualified, licensed and safe to be in our network?'], ['Provider data', 'Where do they practise, under which tax ID, accepting which patients?'], ['Network adequacy', 'Do our members have enough providers, close enough, of each kind?']];
  const [i, setI] = useState(0);
  const c = [[210, 28], [340, 75], [210, 122], [80, 75]][i];
  return <Fig title="Four jobs around one provider" question="What does a payer have to know about each provider?" how="Pick a job to see the question it answers." caption="The four jobs and their questions come from this post's table. Each feeds the claim system, so a mistake in any of them can surface later as a wrong payment or a misleading directory.">
    <Choices t={t} label="Network job" items={jobs.map(j => j[0])} value={i} onPick={setI} />
    <svg viewBox="0 0 420 150" width="100%" role="img" aria-label={`${jobs[i][0]} answers: ${jobs[i][1]}`}>
      {[[210, 28], [340, 75], [210, 122], [80, 75]].map(([x, y], k) => <g key={k}><line x1={210} y1={75} x2={x} y2={y} stroke={k === i ? t.accentPrimary : t.border} strokeWidth={k === i ? 3 : 1.5} /><circle cx={x} cy={y} r={14} fill={k === i ? t.accentPrimary : t.surfaceAlt} stroke={t.border} /></g>)}
      <circle cx={210} cy={75} r={30} fill={t.surface} stroke={t.textPrimary} /><text x={210} y={79} textAnchor="middle" fontSize={12} fill={t.textPrimary}>Provider</text>
      <circle cx={c[0]} cy={c[1]} r={5} fill={t.surface} />
    </svg>
    <Say t={t}>{jobs[i][1]}</Say>
  </Fig>;
}

/** Part 8: nested benefit layers. */
export function HcBenefitLayers() {
  const t = useVizTokens();
  const layers = [['Product', 'A commercial PPO product sold in one state'], ['Plan', 'The product with one set of cost sharing, such as the $1,500-deductible version'], ['Benefit package', 'The list of service categories and their rules'], ['Service category', '“Advanced imaging”, defined by codes and places of service'], ['Cost-share rule', 'Deductible applies, then 20%, per network tier']];
  const [i, setI] = useState(4);
  return <Fig title="What a benefit becomes" question="How does one sentence in a plan document turn into configuration?" how="Pick a layer. Each sits inside the one before it." caption="The layers and examples come from this post's table. One product can hold many plans, so a small difference at one layer multiplies across everything inside it.">
    <Choices t={t} label="Benefit layer" items={layers.map(l => l[0])} value={i} onPick={setI} />
    <svg viewBox="0 0 420 150" width="100%" role="img" aria-label={`${layers[i][0]}: ${layers[i][1]}`}>
      {layers.map(([l], k) => <g key={l}><rect x={6 + k * 22} y={4 + k * 22} width={408 - k * 44} height={142 - k * 22 * 1.2} rx={5} fill={k === i ? t.accentWarn : t.surfaceAlt} fillOpacity={k === i ? .75 : .45} stroke={k === i ? t.accentWarn : t.border} /><text x={14 + k * 22} y={18 + k * 22} fontSize={12} fontWeight={k === i ? 700 : 400} fill={t.textPrimary}>{l}</text></g>)}
    </svg>
    <Say t={t}>{layers[i][1]}.</Say>
  </Fig>;
}

/** Part 9: when review happens. */
export function HcReviewTimeline() {
  const t = useVizTokens();
  const rows = [['Prospective', 'Before the care', 'Prior authorization for a knee MRI or a planned surgery'], ['Concurrent', 'During the care', 'Daily review of whether a patient still needs to be in hospital'], ['Retrospective', 'After the care', 'Reviewing records to see if an emergency admission was needed']];
  const [i, setI] = useState(1);
  return <Fig title="Three moments of review" question="When can a payer review care?" how="Pick a review type and see where it falls on the patient's timeline." caption="The three review types and their examples come from this post's table. The stay on the timeline is schematic, not to scale.">
    <Choices t={t} label="Review type" items={rows.map(r => r[0])} value={i} onPick={setI} />
    <svg viewBox="0 0 420 86" width="100%" role="img" aria-label={`${rows[i][0]} review happens ${rows[i][1].toLowerCase()}.`}>
      <line x1={10} y1={44} x2={410} y2={44} stroke={t.textSecondary} /><rect x={140} y={28} width={140} height={32} rx={4} fill={t.accentSecondary} opacity={.6} /><text x={210} y={49} textAnchor="middle" fontSize={12} fill={t.textPrimary}>care happens</text>
      <rect x={[20, 142, 292][i]} y={22} width={[110, 136, 110][i]} height={44} rx={5} fill="none" stroke={t.accentDanger} strokeWidth={3} /><text x={[75, 210, 347][i]} y={82} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentDanger}>{rows[i][1]}</text>
    </svg>
    <Say t={t}>{rows[i][2]}.</Say>
  </Fig>;
}

/** Part 10: a prior authorization request. */
export function HcPriorAuthPath() {
  const t = useVizTokens();
  const steps = [['Check', 'The doctor’s office checks whether this MRI code needs PA for her plan.'], ['Gather', 'Notes showing knee pain, exam findings, X-ray result and weeks of physical therapy tried.'], ['Submit', 'Through a portal, or by fax or phone.'], ['Review', 'Auto-approved if it clearly meets criteria; otherwise a nurse reviews.'], ['Pend', 'If information is missing, the payer asks for more, and the clock may pause.'], ['Decide', 'Approve, partly approve, or deny.'], ['Notify', 'The provider gets an authorization number; the member gets a letter if denied.'], ['Use', 'The MRI is done within the approved dates, at the approved place.'], ['Claim', 'The claim must match the authorization, or it’s denied.']];
  const [i, setI] = useState(4);
  return <Fig title="One request, nine steps" question="Where does a prior authorization spend its time?" how="Step through Maria's knee MRI." caption="Steps come from this post's walkthrough. Note step 9: approval does not end the risk, because the later claim must still match what was authorized.">
    <svg viewBox="0 0 420 62" width="100%" role="img" aria-label={`Step ${i + 1} of 9: ${steps[i][0]}.`}>
      <line x1={22} y1={22} x2={398} y2={22} stroke={t.border} strokeWidth={2} />
      {steps.map(([l], k) => <g key={l} onClick={() => setI(k)} style={{ cursor: 'pointer' }}><circle cx={22 + k * 47} cy={22} r={k === i ? 13 : 9} fill={k === 4 ? t.accentWarn : k <= i ? t.accentPrimary : t.surfaceAlt} stroke={t.border} /><text x={22 + k * 47} y={26} textAnchor="middle" fontSize={11} fill={k <= i ? t.surface : t.textPrimary}>{k + 1}</text>{k === i && <text x={Math.min(390, Math.max(30, 22 + k * 47))} y={54} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.textPrimary}>{l}</text>}</g>)}
    </svg>
    <div style={{ display: 'flex', gap: 8 }}><button type="button" className="nm-button" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button><button type="button" className="nm-button" disabled={i === 8} onClick={() => setI(i + 1)}>Next</button></div>
    <Say t={t}>{steps[i][1]}</Say>
  </Fig>;
}

/** Part 11: cost concentration. */
export function HcCostConcentration() {
  const t = useVizTokens();
  const groups: [string, number, number][] = [['Top 1%', 1, 20.7], ['Top 5%', 5, 48.8], ['Bottom 50%', 50, 3]];
  const [i, setI] = useState(1);
  const [, pop, spend] = groups[i];
  return <Fig title="A few people, most of the cost" question="Why does care management focus on so few members?" how="Compare each group's share of people with its share of spending." caption="US health spending in 2019, from AHRQ's MEPS as cited in this post: the top 5% accounted for 48.8%, the top 1% for 20.7%, and the bottom half for about 3%.">
    <Choices t={t} label="Population group" items={groups.map(g => g[0])} value={i} onPick={setI} />
    <svg viewBox="0 0 420 92" width="100%" role="img" aria-label={`${groups[i][0]} of people account for ${spend} percent of spending.`}>
      {[['people', pop, t.accentSecondary, 6], ['spending', spend, t.accentDanger, 50]].map(([l, v, c, y]) => <g key={String(l)}><text x={62} y={Number(y) + 20} textAnchor="end" fontSize={12} fill={t.textPrimary}>{String(l)}</text><rect x={68} y={Number(y)} width={310} height={30} fill={t.surfaceAlt} stroke={t.border} /><rect x={68} y={Number(y)} width={Number(v) * 3.1} height={30} fill={String(c)} /><text x={72 + Number(v) * 3.1} y={Number(y) + 20} fontSize={12} fontWeight={700} fill={t.textPrimary}>{Number(v)}%</text></g>)}
    </svg>
  </Fig>;
}

/** Part 12: one surgery, many claims. */
export function HcOneSurgeryClaims() {
  const t = useVizTokens();
  const c = [['Hospital', '837I (institutional)', 'Revenue codes, ICD-10-PCS, DRG'], ['Surgeon', '837P', 'CPT 44970'], ['Anaesthesia', '837P', 'Anaesthesia code plus time units'], ['Pathology', '837P', 'Pathology CPT code']];
  const [i, setI] = useState(0);
  return <Fig title="One appendectomy, four claims" question="Why does one operation produce several bills?" how="Pick a biller to see its claim." caption="From this post's table: each organization that took part bills separately, on its own form, with its own codes.">
    <svg viewBox="0 0 420 130" width="100%" role="img" aria-label={`The appendectomy produces four claims. ${c[i][0]} bills on ${c[i][1]}.`}>
      <rect x={6} y={46} width={108} height={38} rx={6} fill={t.accentWarn} opacity={.75} /><text x={60} y={69} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Appendectomy</text>
      {c.map(([l], k) => <g key={l} onClick={() => setI(k)} style={{ cursor: 'pointer' }}><path d={`M114 65 C170 65 170 ${18 + k * 32} 226 ${18 + k * 32}`} fill="none" stroke={k === i ? t.accentPrimary : t.border} strokeWidth={k === i ? 3 : 1.5} /><rect x={226} y={4 + k * 32} width={186} height={28} rx={4} fill={k === i ? t.surfaceAlt : t.surface} stroke={k === i ? t.accentPrimary : t.border} /><text x={319} y={23 + k * 32} textAnchor="middle" fontSize={12} fill={t.textPrimary}>{l}</text></g>)}
    </svg>
    <Choices t={t} label="Biller" items={c.map(x => x[0])} value={i} onPick={setI} />
    <Say t={t}>{c[i][0]} bills on <strong>{c[i][1]}</strong> using {c[i][2]}.</Say>
  </Fig>;
}

/** Part 13: adjudication pipeline. */
export function HcAdjudicationPipeline() {
  const t = useVizTokens();
  const s = [['Member and eligibility', 'Was this person covered by this plan on each date of service?'], ['Provider', 'Who is the provider, and were they in network on that date?'], ['Duplicate check', 'Has this same service already been billed?'], ['Benefits', 'Which service category does each line fall into, and is it covered?'], ['Authorization', 'If it needs prior authorization, is there a matching one?'], ['Coverage policy', 'Do the diagnoses support medical necessity?'], ['Coding edits', 'Are the codes valid together, in these units, for this patient?'], ['Pricing', 'What is the allowed amount under the contract?'], ['Coordination of benefits', 'Is another plan primary? What did it pay?'], ['Cost sharing', 'How much is deductible, copay, coinsurance? Update the accumulators.'], ['Payment', 'Produce the payment, the remittance and the member’s EOB.']];
  const [i, setI] = useState(10);
  return <Fig title="The adjudication pipeline" question="What must a claim pass before it is paid?" how="Pick the step where a claim stops. Everything after it never runs." caption="The eleven steps are from this post's table. Where a claim stops depends on the claim; a failed step usually leads to a denial or a pend for a person to review.">
    <svg viewBox="0 0 420 92" width="100%" role="img" aria-label={`The claim stops or finishes at step ${i + 1}, ${s[i][0]}.`}>
      {s.map(([l], k) => { const x = 8 + (k % 6) * 69, y = k < 6 ? 8 : 52; return <g key={l} onClick={() => setI(k)} style={{ cursor: 'pointer' }}><rect x={x} y={y} width={60} height={32} rx={4} fill={k < i ? t.accentPrimary : k === i ? (i === 10 ? t.accentPrimary : t.accentDanger) : t.surfaceAlt} stroke={t.border} /><text x={x + 30} y={y + 21} textAnchor="middle" fontSize={13} fontWeight={700} fill={k <= i ? t.surface : t.textSecondary}>{k + 1}</text></g>; })}
    </svg>
    <label style={{ display: 'block', color: t.textPrimary }}>Step reached: <strong>{i + 1}. {s[i][0]}</strong><input aria-label="Step reached" type="range" min={0} max={10} value={i} onChange={e => setI(Number(e.target.value))} style={{ display: 'block', width: '100%' }} /></label>
    <Say t={t}>{s[i][1]}</Say>
  </Fig>;
}

/** Part 14: an examiner's authorization decision. */
export function HcAuthDecision() {
  const t = useVizTokens();
  const o = [['Exact match', 'Continue to the next SOP step.', true], ['Close match', 'Check the tolerance the SOP allows, such as a few extra days on a date span. Within it, continue.', true], ['No authorization', 'Deny with CO-197.', false], ['No authorization, emergency', 'Continue: an emergency never needs one.', true]] as const;
  const [i, setI] = useState(2);
  return <Fig title="An examiner's decision" question="What should the examiner do when checking authorization?" how="Pick what the examiner finds on the pended claim." caption="From the SOP in this post. Tolerances vary by payer, and the SOP states what each allows.">
    <Choices t={t} label="Authorization finding" items={o.map(x => x[0])} value={i} onPick={setI} />
    <svg viewBox="0 0 420 72" width="100%" role="img" aria-label={`${o[i][0]}: ${o[i][1]}`}>
      <polygon points="60,8 112,36 60,64 8,36" fill={t.accentWarn} opacity={.65} /><text x={60} y={40} textAnchor="middle" fontSize={11} fill={t.textPrimary}>auth?</text>
      <line x1={112} y1={36} x2={190} y2={36} stroke={o[i][2] ? t.accentPrimary : t.accentDanger} strokeWidth={3} />
      <rect x={190} y={14} width={222} height={44} rx={6} fill="none" stroke={o[i][2] ? t.accentPrimary : t.accentDanger} strokeWidth={2} /><text x={301} y={41} textAnchor="middle" fontSize={15} fontWeight={700} fill={o[i][2] ? t.accentPrimary : t.accentDanger}>{o[i][2] ? 'Continue' : 'Deny'}</text>
    </svg>
    <Say t={t}>{o[i][1]}</Say>
  </Fig>;
}

/** Part 15: improper payment rates. */
export function HcImproperPayments() {
  const t = useVizTokens();
  return <Fig title="Where improper payments concentrate" question="Which Medicare claims are most often paid improperly?" how="Compare the FY2025 rates from this post." caption="Medicare Fee-for-Service improper payment rates for FY2025, from the table above. Improper is not the same as fraud: it includes errors and missing documentation.">
    <HBars t={t} max={30} unit="%" hi={0} aria="Durable medical equipment has the highest rate at 24.12 percent, then Part B 8.44, other Part A 6.67, and hospital inpatient 3.15 percent." rows={[['Durable equipment', 24.12], ['Part B', 8.44], ['Other Part A', 6.67], ['Hospital inpatient', 3.15]]} />
  </Fig>;
}

/** Part 16: payment methods and who holds the risk. */
export function HcPaymentSpectrum() {
  const t = useVizTokens();
  const m = [['Fee-for-service', 'A price for each service', 'Almost none; more services, more payment'], ['Per diem', 'A fixed amount per day in hospital', 'The cost of each day'], ['Case rate / DRG', 'A fixed amount per hospital stay', 'Costs within the stay'], ['Bundled payment', 'A fixed budget for an episode', 'Costs across the episode, including other providers'], ['Shared savings', 'Fee-for-service, plus a share of savings', 'Some, if the contract also shares losses'], ['Capitation', 'A fixed amount per member per month', 'Nearly all, for the services included']];
  const [i, setI] = useState(2);
  return <Fig title="The payment spectrum" question="As payment gets more fixed, who carries the risk?" how="Move along the methods, in the order this post lists them." caption="Methods and risk descriptions are from this post's table. The rising line shows the broad direction only: the post gives no numeric risk score, and shared savings can carry less risk than a bundle.">
    <input aria-label="Payment method" type="range" min={0} max={5} value={i} onChange={e => setI(Number(e.target.value))} style={{ display: 'block', width: '100%' }} />
    <svg viewBox="0 0 420 80" width="100%" role="img" aria-label={`${m[i][0]}. Provider risk: ${m[i][2]}.`}>
      <polygon points="10,70 410,70 410,12" fill={t.accentWarn} opacity={.25} />
      {m.map(([l], k) => <circle key={l} cx={10 + k * 80} cy={70 - k * 11.6} r={k === i ? 8 : 4} fill={k === i ? t.accentDanger : t.textSecondary} />)}
      <text x={10} y={16} fontSize={12} fill={t.textSecondary}>provider risk, direction only →</text>
    </svg>
    <Say t={t}><strong>{m[i][0]}:</strong> paid {m[i][1].charAt(0).toLowerCase() + m[i][1].slice(1)}. Risk: {m[i][2].charAt(0).toLowerCase() + m[i][2].slice(1)}.</Say>
  </Fig>;
}

/** Part 17: a pharmacy claim in seconds. */
export function HcPharmacyClaim() {
  const t = useVizTokens();
  const s = ['The pharmacy enters the prescription and sends a claim to the PBM.', 'The PBM checks eligibility, the formulary, utilization rules and drug interactions.', 'Response in a few seconds: paid; plan pays $7.40, member copay $10.', 'The pharmacy collects the $10 and hands over the medicine.'];
  const [i, setI] = useState(0);
  const a = i === 0 ? [90, 310] : i === 1 ? [310, 310] : i === 2 ? [310, 90] : [90, 90];
  return <Fig title="A pharmacy claim, in seconds" question="What happens at the counter?" how="Step through the claim from this post." caption="The example from this post: the plan pays $7.40 and the member $10, so the pharmacy receives $17.40 for this fill.">
    <svg viewBox="0 0 420 92" width="100%" role="img" aria-label={s[i]}>
      {[['Pharmacy', 20], ['PBM', 240]].map(([l, x]) => <g key={String(l)}><rect x={Number(x)} y={16} width={160} height={46} rx={6} fill={t.surfaceAlt} stroke={t.border} /><text x={Number(x) + 80} y={44} textAnchor="middle" fontSize={13} fill={t.textPrimary}>{String(l)}</text></g>)}
      <line x1={180} y1={39} x2={240} y2={39} stroke={i === 0 || i === 2 ? t.accentPrimary : t.border} strokeWidth={3} /><circle cx={a[0] === a[1] ? a[0] : 210} cy={i === 0 || i === 2 ? 39 : 39} r={7} fill={t.accentWarn} />
      <text x={210} y={84} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>{i < 2 ? 'real time' : '$7.40 plan + $10 member'}</text>
    </svg>
    <div style={{ display: 'flex', gap: 8 }}><button type="button" className="nm-button" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button><button type="button" className="nm-button" disabled={i === 3} onClick={() => setI(i + 1)}>Next</button></div>
    <Say t={t}>{i + 1}. {s[i]}</Say>
  </Fig>;
}

/** Part 18: the transactions behind one year. */
export function HcTransactions() {
  const t = useVizTokens();
  const r = [['Enrollment', '834', 'X12', 6], ['Premium', '820', 'X12', 6], ['Eligibility', '270 / 271', 'X12', 6], ['Prior auth', '278, FHIR APIs from 2027', 'X12, HL7 FHIR', 10], ['Claim', '837P / 837I', 'X12', 12], ['Acknowledgement', '999, 277CA', 'X12', 12], ['Claim status', '276 / 277', 'X12', 12], ['Payment', '835, plus funds transfer', 'X12', 12], ['Pharmacy claim', 'Telecommunication D.0', 'NCPDP', 17]] as const;
  const [i, setI] = useState(4);
  return <Fig title="The messages underneath" question="Which transaction carries each step of the year?" how="Follow the chain and pick a step." caption="From this post's table of transactions. The order is roughly how a member's year unfolds; real systems send many of these repeatedly.">
    <svg viewBox="0 0 420 64" width="100%" role="img" aria-label={`${r[i][0]} uses ${r[i][1]}, standard ${r[i][2]}.`}>
      <line x1={18} y1={24} x2={402} y2={24} stroke={t.border} strokeWidth={2} />
      {r.map((x, k) => <g key={x[0]} onClick={() => setI(k)} style={{ cursor: 'pointer' }}><rect x={6 + k * 46} y={8} width={38} height={32} rx={4} fill={k === i ? t.accentPrimary : x[2] === 'NCPDP' ? t.accentWarn : t.surfaceAlt} stroke={t.border} /><text x={25 + k * 46} y={29} textAnchor="middle" fontSize={11} fontWeight={700} fill={k === i ? t.surface : t.textPrimary}>{String(x[1]).split(/[ ,/]/)[0].slice(0, 5)}</text></g>)}
      <text x={210} y={58} textAnchor="middle" fontSize={13} fontWeight={700} fill={t.textPrimary}>{r[i][0]}</text>
    </svg>
    <Choices t={t} label="Transaction" items={r.map(x => x[0])} value={i} onPick={setI} />
    <Say t={t}><strong>{r[i][1]}</strong>, standard {r[i][2]}. Explained in part {r[i][3]}.</Say>
  </Fig>;
}
