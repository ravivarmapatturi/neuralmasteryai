import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { AtlasTimeline } from './atlas/AtlasTimeline';
import { CategoryWidgetCard } from './widgets/CategoryWidgetCard';
import './atlasHub.css';

// Counts and year ranges come from src/data/*Atlas.ts; update them when an atlas changes.
const ATLASES = [
  { to: '/docs/atlas/ml-models', title: 'Machine Learning Models', years: '1805–2026', count: 24, question: 'How did algorithms evolve from line fitting to scalable clustering?', body: 'From Legendre least squares through support vector machines, trees and boosting to e-means.' },
  { to: '/docs/atlas/agent-protocols', title: 'Agent Protocols', years: '1984–2025', count: 22, question: 'How did software learn to talk to software, and then to models?', body: 'From remote procedure calls through REST and OAuth to function calling, MCP and agent-to-agent protocols.' },
  { to: '/docs/atlas/agent-architecture', title: 'Agent Architecture', years: '2021–2025', count: 21, question: 'How did a chained prompt become a long-running agent?', body: 'From prompt chaining and ReAct through planning, memory and multi-agent systems to today\'s harnesses.' },
  { to: '/docs/atlas/training', title: 'Training', years: '1951–2024', count: 39, question: 'What made neural networks trainable at scale?', body: 'The techniques behind training, from data preparation and optimisation to evaluation.' },
  { to: '/docs/atlas/inference', title: 'Inference', years: '1977–2024', count: 30, question: 'How does a trained model answer quickly and cheaply?', body: 'From choosing the next token through quantization and caching to serving a fleet of requests.' },
];

/** /atlas: each atlas tells one field's history in date order. */
export default function AtlasHubPage() {
  useDocumentTitle('Atlas: how AI fields developed, in date order');
  useDocumentMeta('Atlas: how AI fields developed, in date order', 'Follow one AI field from its first technique to today: what each step fixed, what it led to, with a diagram and source for every entry.');
  return (
    <div className="nb-theme atlas-hub">
      <Navbar />
      <main className="nm-landing-shell">
        <header className="atlas-hub__head">
          <h1 className="nb-heading">Atlas</h1>
          <p className="nb-body">136 techniques across five fields, in date order. Lines show what led to what.</p>
        </header>
        <AtlasTimeline />
        <ul className="nm-category-widget-grid" style={{ marginTop: '2rem' }}>
          {ATLASES.map((atlas) => (
            <CategoryWidgetCard
              key={atlas.to}
              title={atlas.title}
              to={atlas.to}
              summary={atlas.body}
              level={atlas.years}
              countText={`${atlas.count} entries`}
              totalCount={atlas.count}
              topic={atlas.title.toLowerCase().replace(/\s+/g, '-')}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}
