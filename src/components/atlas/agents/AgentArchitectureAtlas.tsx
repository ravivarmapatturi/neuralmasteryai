import { useMemo, useState } from 'react';
import VisualizationContainer from '../../../viz/primitives/VisualizationContainer';
import VisualizationHeader from '../../../viz/primitives/VisualizationHeader';
import { architectureEntries, architectureEras } from '../../../data/agentArchitectureAtlas';
import ArchitectureDiagram from './ArchitectureDiagram';
import '../inference/inferenceAtlas.css';

export default function AgentArchitectureAtlas() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => architectureEntries.filter((entry) => !q || `${entry.name} ${entry.layer} ${entry.limit} ${entry.what}`.toLowerCase().includes(q)), [q]);

  return <div className="inference-atlas">
    <VisualizationContainer title="Agent architecture atlas" footer={`${filtered.length} of ${architectureEntries.length} entries shown, in date order within each era.`}>
      <VisualizationHeader title="From prompt chains to durable harnesses" description="Search, or open a row to inspect the control flow, a concrete example and the primary source." />
      <div role="search" aria-label="Filter agent architectures" style={{ margin: '1rem 0' }}>
        <label><span className="sr-only">Search agent architectures</span><input className="inference-atlas__search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search: planning, memory, supervisors" /></label>
      </div>
    </VisualizationContainer>
    {architectureEras.map((era) => {
      const entries = filtered.filter((entry) => entry.era === era.id);
      if (!entries.length) return null;
      return <section className="inference-atlas__era" key={era.id}>
        <div className="inference-atlas__era-head"><span className="inference-atlas__years">{era.years}</span><h2>{era.id}</h2><p>{era.narrative}</p></div>
        <div className="inference-atlas__table">
          {entries.map((entry) => {
            const isOpen = open === entry.id;
            return <article className="inference-atlas__entry" key={entry.id}>
              <button className="inference-atlas__summary" type="button" aria-expanded={isOpen} aria-controls={`${entry.id}-details`} onClick={() => setOpen(isOpen ? null : entry.id)}>
                <span className="inference-atlas__year">{entry.date}</span><span className="inference-atlas__name">{entry.name}</span><span className="inference-atlas__category">{entry.layer}</span><span className="inference-atlas__limit">{entry.limit}</span><span className="inference-atlas__chevron" data-open={isOpen} aria-hidden="true">›</span>
              </button>
              {isOpen && <div className="inference-atlas__details" id={`${entry.id}-details`}>
                <div>
                  <h3>What changed</h3><p>{entry.what}</p>
                  <h3>Example</h3><p className="inference-atlas__example">{entry.example}</p>
                  <h3>Watch out</h3><p>{entry.avoid}</p>
                  <h3>What it led to</h3><p>{entry.ledTo}</p>
                  <div className="inference-atlas__links"><a href={entry.source} target="_blank" rel="noreferrer">Primary source</a><a href={entry.learnPath}>Open the related lesson</a></div>
                </div>
                <div className="inference-atlas__diagram"><ArchitectureDiagram id={entry.id} /></div>
              </div>}
            </article>;
          })}
        </div>
      </section>;
    })}
    {!filtered.length && <p className="inference-atlas__empty">No entry matches this search.</p>}
  </div>;
}
