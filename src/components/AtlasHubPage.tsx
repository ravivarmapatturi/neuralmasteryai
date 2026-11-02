import { Link } from 'react-router-dom';
import InformationPage from './InformationPage';

const LIVE = [
  { to: '/docs/atlas/agent-protocols', title: 'Agent Protocols Atlas', body: '22 steps from remote procedure calls and REST to function calling, MCP and agent-to-agent protocols.' },
  { to: '/docs/atlas/training', title: 'Training Atlas', body: '39 techniques for training models, from data preparation to evaluation.' },
  { to: '/docs/atlas/inference', title: 'Inference Atlas', body: '30 techniques for serving models, from choosing the next token to running a fleet.' },
];
const COMING = ['Agent Architecture', 'RAG and Retrieval', 'LLM Architecture', 'Prompt to Context', 'Evaluation and Observability', 'AI Safety and Security', 'On-Device AI', 'Vision and Multimodal', 'Speech and Audio', 'MLOps to LLMOps', 'AI Hardware'];

/** /atlas: maps of whole fields, each told in date order. */
export default function AtlasHubPage() {
  return <InformationPage title="Atlas" description="Maps of whole AI fields in date order: what each technique fixed, and what it led to.">
    <p className="nm-information-lead">Each atlas follows one field in date order, so you can see what problem each technique solved and what came next.</p>
    <h2>Available now</h2>
    {LIVE.map((atlas) => <p key={atlas.to}><Link to={atlas.to}><strong>{atlas.title}</strong></Link><br />{atlas.body}</p>)}
    <h2>Coming next</h2>
    <ul>{COMING.map((name) => <li key={name}>{name}</li>)}</ul>
  </InformationPage>;
}
