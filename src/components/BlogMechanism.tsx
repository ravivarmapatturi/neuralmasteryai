import { useState } from 'react';
import { useVizTokens } from '../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../viz/primitives';

type Mechanism = { title: string; question: string; steps: string[]; notes: string[] };
const mechanisms: Record<string, Mechanism> = {
  'jeva-decision-models': { title: 'From a request to a decision', question: 'Where does a choice come from when the model never writes an answer?', steps: ['Read the request', 'Encode the options', 'Compare the set', 'Return a choice'], notes: ['A request describes the current situation: “I was charged twice.” No decision has been made yet.', 'Each candidate action has a text description. Encoding options separately allows their representations to be reused.', 'The decision head evaluates the request and candidate set. The available alternatives influence the decision.', 'The output is a structured choice with model probabilities. These probabilities still need evaluation on the task where you use them.'] },
  'from-classifiers-to-jepa': { title: 'Predict a representation', question: 'What does a joint embedding predictive architecture learn to predict?', steps: ['Visible context', 'Context encoder', 'Predictor', 'Target embedding'], notes: ['Show the model only part of an input, keeping another part as the target.', 'The context encoder maps the visible information to a representation.', 'The predictor uses that representation to predict the representation of the hidden target.', 'Training compares predicted and target representations, rather than requiring a reconstruction of every pixel.'] },
  'agent-skills-explained': { title: 'Instructions and tools have different jobs', question: 'How does an agent go from a task to a useful tool action?', steps: ['Receive a task', 'Load a skill', 'Call a tool', 'Check the result'], notes: ['The task states the outcome the user wants, such as preparing a report.', 'A skill supplies relevant instructions, examples, or supporting resources for doing that work.', 'A tool performs an action. MCP is one way for an application to expose tools and resources to the agent.', 'The agent compares the result with the task. Neither instructions nor tool access alone guarantees success.'] },
  'do-agents-need-a-memory-system': { title: 'Follow a fact across two turns', question: 'How can an agent use information from an earlier conversation?', steps: ['A fact is stated', 'Keep the history', 'Find the evidence', 'Build the prompt'], notes: ['A user mentions a preference. That information exists in the current interaction.', 'The application stores the conversation, or a derived memory. The model does not retain a private copy between calls.', 'A later request searches or selects relevant history. A summary can be cheaper to retrieve, but may omit details.', 'The selected evidence is included in the next prompt. Compare this approach with simply providing the original history.'] },
  'world-models-verify-gui-agents': { title: 'Predict before clicking', question: 'How can a GUI agent check whether an action is likely to help?', steps: ['Observe screen', 'Propose action', 'Predict outcome', 'Compare & verify'], notes: ['The current screen is the evidence for the agent’s next action.', 'The agent proposes a click, keystroke, or other interaction.', 'A world model estimates the resulting state. This is a prediction, not an observation of the real application.', 'After acting, compare the actual screen with the expected state. A plausible prediction is not enough to confirm success.'] },
};
export default function BlogMechanism({ slug }: { slug: string }) {
  const t = useVizTokens();
  const [step, setStep] = useState(0);
  const [tokens, setTokens] = useState(8);
  const attention = slug === 'kimi-k3-linear-attention';
  const m = mechanisms[slug] ?? (slug.startsWith('us-healthcare-') ? {
    title: 'Place this topic in the healthcare journey',
    question: 'Series overview: follow how coverage, care, and payment connect. The details vary by plan and service.',
    steps: ['Check coverage', 'Receive care', 'Review the claim', 'Explain payment'],
    notes: [
      'Enrollment and eligibility establish who is covered and when. Benefits, network rules, and coverage policies determine which questions to check before a service.',
      'A provider delivers and documents care. Some services require prior authorization; authorization alone does not guarantee payment.',
      'The claim describes the service using billing codes. The payer reviews eligibility, benefits, coverage rules, and contract terms to decide how it is processed.',
      'The payment or denial is explained in remittance and benefit documents. The member may owe a portion of the cost, and errors or denials may need correction or appeal.',
    ],
  } : undefined);
  if (!m && !attention) return null;
  if (attention) return <VisualizationContainer title="Growing history and fixed-size state" footer="Illustrative storage comparison: full attention retains token keys and values; a recurrent linear layer updates a state with fixed dimensions. Actual byte counts depend on the architecture, precision, and implementation.">
    <VisualizationHeader eyebrow="EXPLORE THE MECHANISM" title="More history. Two ways to store it." description="Move the slider and compare what each layer keeps. Fixed-size state compresses information; it does not preserve an exact copy of every token." />
    <label>Tokens in the example: {tokens}<input aria-label="Tokens in attention example" type="range" min="2" max="24" value={tokens} onChange={e => setTokens(Number(e.target.value))} style={{ display:'block',width:'100%' }} /></label>
    <svg viewBox="0 0 420 230" role="img" aria-label={`${tokens} token records in a full-attention cache, compared with one fixed-size recurrent state.`}>
      <text x="20" y="28" fill={t.textPrimary} fontSize="17">Full attention · a growing KV cache</text>
      {Array.from({ length:tokens }, (_,i) => <rect key={i} x={20+(i%12)*31} y={48+Math.floor(i/12)*38} width="24" height="27" rx="4" fill={t.accentSecondary} opacity=".7" />)}
      <text x="20" y="155" fill={t.textPrimary} fontSize="17">Recurrent linear layer · fixed-size state</text>
      <rect x="20" y="175" width="140" height="32" rx="5" fill={t.accentTeal} /><text x="190" y="196" fill={t.textSecondary} fontSize="16">Updated per token</text>
    </svg>
  </VisualizationContainer>;
  return <VisualizationContainer title={m.title} footer="Select a numbered step to inspect how the information moves through the system.">
    <VisualizationHeader eyebrow="FOLLOW THE IDEA" title={m.title} description={m.question} />
    <svg viewBox="0 0 420 280" role="img" aria-label={`Step ${step+1}: ${m.steps[step]}. ${m.notes[step]}`}>
      <path d="M100 55H320V180H100" stroke={t.border} strokeWidth="3" />
      {m.steps.map((label,i) => <g key={label}><circle cx={i === 0 || i === 3 ? 100 : 320} cy={i < 2 ? 55 : 180} r="28" fill={i <= step ? t.accentSecondary : t.surfaceAlt} stroke={t.border} strokeWidth="2" /><text x={i === 0 || i === 3 ? 100 : 320} y={i < 2 ? 61 : 186} textAnchor="middle" fontSize="18" fill={i <= step ? t.background : t.textPrimary}>{i+1}</text><text x={i === 0 || i === 3 ? 100 : 320} y={i < 2 ? 110 : 235} textAnchor="middle" fontSize="17" fill={t.textPrimary}>{label}</text></g>)}
    </svg>
    <div className="nm-mechanism-controls" aria-label="Diagram steps">{m.steps.map((label,i) => <button type="button" key={label} aria-pressed={step === i} onClick={() => setStep(i)}>{i+1}. {label}</button>)}</div>
    <p aria-live="polite" style={{ color:t.textSecondary }}>{m.notes[step]}</p>
  </VisualizationContainer>;
}
