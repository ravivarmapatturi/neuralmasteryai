import { useMemo, useState } from 'react';
import { trainingAtlas, trainingCategories, trainingEras, type TrainingCategory } from '../../../data/trainingAtlas';
import { useVizTokens } from '../../../theme/vizTokens';
import TrainingTechniqueDiagram from './TrainingTechniqueDiagram';
import './training-atlas.css';

const categoryLabel = (value: string) => value.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function TrainingAtlas() {
  const t = useVizTokens();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | TrainingCategory>('all');
  const entries = useMemo(() => trainingAtlas
    .filter((entry) => category === 'all' || entry.category === category)
    .filter((entry) => `${entry.name} ${entry.whatItIs} ${entry.category}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)), [category, query]);

  return <section className="training-atlas" aria-label="Training technique atlas">
    <div className="training-atlas__controls" style={{ background: t.surface, borderColor: t.border }}>
      <label>Search techniques<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. normalization" style={{ background:t.background, color:t.textPrimary, borderColor:t.border }}/></label>
      <label>Category<select value={category} onChange={(e) => setCategory(e.target.value as 'all' | TrainingCategory)} style={{ background:t.background, color:t.textPrimary, borderColor:t.border }}><option value="all">All categories</option>{trainingCategories.map((item)=><option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
      <span aria-live="polite" style={{ color:t.textSecondary }}>{entries.length} techniques</span>
    </div>

    {trainingEras.map((era) => {
      const eraEntries = entries.filter((entry) => entry.era === era.id);
      if (!eraEntries.length) return null;
      return <section key={era.id} className="training-atlas__era" aria-labelledby={`era-${era.id}`}>
        <header><p style={{ color:t.accentPrimary }}>{era.years}</p><h2 id={`era-${era.id}`}>{era.label}</h2><p>{era.narrative}</p></header>
        <div className="training-atlas__table" role="table" aria-label={`${era.label} techniques`} style={{ borderColor:t.border }}>
          <div className="training-atlas__head" role="row" style={{ background:t.surfaceAlt, color:t.textSecondary }}><span role="columnheader">Year</span><span role="columnheader">Technique and progression</span><span role="columnheader">Category</span></div>
          {eraEntries.map((entry) => <details key={entry.id} className="training-atlas__row" style={{ borderColor:t.border }}>
            <summary>
              <span className="training-atlas__year">{entry.year}</span>
              <span><strong>{entry.name}</strong><small style={{ color:t.textSecondary }}>{entry.cameBefore} → {entry.ledTo}</small></span>
              <span className="training-atlas__category" style={{ color:t.accentSecondary }}>{categoryLabel(entry.category)}</span>
            </summary>
            <div className="training-atlas__detail">
              <div className="training-atlas__story"><p><strong>Why it appeared.</strong> {entry.previousLimit}</p><p>{entry.whatItIs}</p></div>
              <div className="training-atlas__diagram" style={{ background:t.surface, borderColor:t.border }}><TrainingTechniqueDiagram kind={entry.diagram} name={entry.name}/><p style={{ color:t.textSecondary }}>Figure: {entry.name} changes the training signal or update shown above; labels use the concrete example below.</p></div>
              <dl>
                <div><dt>Data preparation</dt><dd>{entry.dataPreparation}</dd></div>
                <div><dt>Tiny example</dt><dd>{entry.example}</dd></div>
                <div><dt>Metrics</dt><dd>{entry.metrics}</dd></div>
                <div><dt>When not to use it</dt><dd>{entry.whenNotToUse}</dd></div>
                <div><dt>What followed</dt><dd>{entry.replacedBy}</dd></div>
              </dl>
              <p className="training-atlas__links"><a href={entry.source.url} target="_blank" rel="noreferrer">Primary paper or documentation</a><a href={entry.learnPath}>Learn the underlying mechanism</a></p>
            </div>
          </details>)}
        </div>
      </section>;
    })}
    {!entries.length && <p role="status">No training techniques match this filter.</p>}
  </section>;
}
