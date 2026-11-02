import { useMemo, useState } from 'react';
import VisualizationContainer from '../../../viz/primitives/VisualizationContainer';
import VisualizationHeader from '../../../viz/primitives/VisualizationHeader';
import { inferenceAtlasCategories, inferenceAtlasEntries, inferenceAtlasEras, type InferenceAtlasCategory } from '../../../data/inferenceAtlas';
import InferenceTechniqueDiagram from './InferenceTechniqueDiagram';
import './inferenceAtlas.css';

export default function InferenceAtlas() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | InferenceAtlasCategory>('All');
  const [open, setOpen] = useState<string | null>(null);
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => inferenceAtlasEntries.filter((entry) => {
    const categoryMatches = category === 'All' || entry.category === category;
    const text = `${entry.name} ${entry.category} ${entry.whatItIs} ${entry.previousLimit} ${entry.requestState} ${entry.metrics}`.toLowerCase();
    return categoryMatches && (!normalized || text.includes(normalized));
  }), [category, normalized]);

  return (
    <div className="inference-atlas">
      <VisualizationContainer title="Inference technique atlas" footer={`${filtered.length} of ${inferenceAtlasEntries.length} techniques shown. Entries remain in chronological order within each era.`}>
        <VisualizationHeader title="Trace the inference stack through time" description="Search the mechanism, runtime state, or metric; expand a row for its worked example and source." />
        <div className="inference-atlas__tools" role="search" aria-label="Filter inference techniques">
          <label><span className="sr-only">Search techniques</span><input className="inference-atlas__search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search: cache, latency, quantization…" /></label>
          <label><span className="sr-only">Filter by category</span><select className="inference-atlas__select" value={category} onChange={(event) => setCategory(event.target.value as 'All' | InferenceAtlasCategory)}>{inferenceAtlasCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </VisualizationContainer>

      {inferenceAtlasEras.map((era) => {
        const entries = filtered.filter((entry) => entry.era === era.id);
        if (!entries.length) return null;
        return <section className="inference-atlas__era" key={era.id} aria-labelledby={`era-${era.id.replace(/\W+/g, '-').toLowerCase()}`}>
          <div className="inference-atlas__era-head"><span className="inference-atlas__years">{era.years}</span><h2 id={`era-${era.id.replace(/\W+/g, '-').toLowerCase()}`}>{era.id}</h2><p>{era.narrative}</p></div>
          <div className="inference-atlas__table" role="table" aria-label={`${era.id} techniques`}>
            <div className="inference-atlas__header" role="row"><span role="columnheader">Year</span><span role="columnheader">Technique</span><span role="columnheader">Category</span><span role="columnheader">Limit it answered</span><span aria-hidden="true" /></div>
            {entries.map((entry) => {
              const isOpen = open === entry.id;
              return <article className="inference-atlas__entry" role="rowgroup" key={entry.id}>
                <button className="inference-atlas__summary" type="button" aria-expanded={isOpen} aria-controls={`${entry.id}-details`} onClick={() => setOpen(isOpen ? null : entry.id)}>
                  <span className="inference-atlas__year">{entry.year}</span><span className="inference-atlas__name">{entry.name}</span><span className="inference-atlas__category">{entry.category}</span><span className="inference-atlas__limit">{entry.previousLimit}</span><span className="inference-atlas__chevron" data-open={isOpen} aria-hidden="true">›</span>
                </button>
                {isOpen && <div className="inference-atlas__details" id={`${entry.id}-details`}>
                  <div>
                    <h3>What changed</h3><p>{entry.whatItIs}</p>
                    <h3>Request and runtime state</h3><p>{entry.requestState}</p>
                    <h3>Concrete trace</h3><p className="inference-atlas__example">{entry.example}</p>
                    <h3>Read the metrics</h3><p>{entry.metrics}</p>
                    <h3>When not to use it</h3><p>{entry.avoid} {entry.replacedBy}</p>
                    <div className="inference-atlas__lineage"><div><h3>Came before</h3><p>{entry.cameBefore}</p></div><div><h3>Led to</h3><p>{entry.ledTo}</p></div></div>
                    <div className="inference-atlas__links"><a href={entry.source.url} target="_blank" rel="noreferrer">Primary paper or documentation</a><a href={entry.learnPath}>Open the Learn chapter</a></div>
                  </div>
                  <VisualizationContainer title={`${entry.name} mechanism`} footer={entry.example}><div className="inference-atlas__diagram"><InferenceTechniqueDiagram kind={entry.diagram} /></div></VisualizationContainer>
                </div>}
              </article>;
            })}
          </div>
        </section>;
      })}
      {!filtered.length && <p className="inference-atlas__empty">No inference technique matches this search and category.</p>}
    </div>
  );
}
