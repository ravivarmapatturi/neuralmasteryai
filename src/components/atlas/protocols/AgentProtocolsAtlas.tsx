import { useMemo, useState } from 'react';
import VisualizationContainer from '../../../viz/primitives/VisualizationContainer';
import VisualizationHeader from '../../../viz/primitives/VisualizationHeader';
import { protocolEntries, protocolEras } from '../../../data/agentProtocolsAtlas';
import ProtocolDiagram from './ProtocolDiagram';
import '../inference/inferenceAtlas.css';

export default function AgentProtocolsAtlas() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => protocolEntries.filter((e) => !q || `${e.name} ${e.layer} ${e.limit} ${e.what}`.toLowerCase().includes(q)), [q]);

  return <div className="inference-atlas">
    <VisualizationContainer title="Agent protocols atlas" footer={`${filtered.length} of ${protocolEntries.length} entries shown, in date order within each era.`}>
      <VisualizationHeader title="From remote calls to agent standards" description="Search, or open a row to see the exchange, an example and the source." />
      <div role="search" aria-label="Filter protocols" style={{ margin: '1rem 0' }}>
        <label><span className="sr-only">Search protocols</span><input className="inference-atlas__search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search: OAuth, streaming, tools" /></label>
      </div>
    </VisualizationContainer>
    {protocolEras.map((era) => {
      const entries = filtered.filter((e) => e.era === era.id);
      if (!entries.length) return null;
      return <section className="inference-atlas__era" key={era.id}>
        <div className="inference-atlas__era-head"><span className="inference-atlas__years">{era.years}</span><h2>{era.id}</h2><p>{era.narrative}</p></div>
        <div className="inference-atlas__table">
          {entries.map((e) => {
            const isOpen = open === e.id;
            return <article className="inference-atlas__entry" key={e.id}>
              <button className="inference-atlas__summary" type="button" aria-expanded={isOpen} aria-controls={`${e.id}-details`} onClick={() => setOpen(isOpen ? null : e.id)}>
                <span className="inference-atlas__year">{e.year}</span><span className="inference-atlas__name">{e.name}</span><span className="inference-atlas__category">{e.layer}</span><span className="inference-atlas__limit">{e.limit}</span><span className="inference-atlas__chevron" data-open={isOpen} aria-hidden="true">›</span>
              </button>
              {isOpen && <div className="inference-atlas__details" id={`${e.id}-details`}>
                <div>
                  <h3>What changed</h3><p>{e.what}</p>
                  <h3>Example</h3><p className="inference-atlas__example">{e.example}</p>
                  <h3>Watch out</h3><p>{e.avoid}</p>
                  <h3>What it led to</h3><p>{e.ledTo}</p>
                  <div className="inference-atlas__links"><a href={e.source} target="_blank" rel="noreferrer">Primary source</a><a href={e.learnPath}>Open the related lesson</a></div>
                </div>
                <div className="inference-atlas__diagram"><ProtocolDiagram id={e.id} /></div>
              </div>}
            </article>;
          })}
        </div>
      </section>;
    })}
    {!filtered.length && <p className="inference-atlas__empty">No entry matches this search.</p>}
  </div>;
}
