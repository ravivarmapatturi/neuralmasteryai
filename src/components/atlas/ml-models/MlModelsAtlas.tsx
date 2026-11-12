import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import {
  mlModelsAtlas,
  mlModelCategories,
  mlModelEras,
  type MlModelCategory,
} from '../../../data/mlModelsAtlas';
import { atlasHashEntry, setAtlasHash } from '../useAtlasHash';
import { useVizTokens } from '../../../theme/vizTokens';
import MlModelVisual from './MlModelVisual';
import './ml-models-atlas.css';

const categoryLabel = (value: string) =>
  value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

function KatexDisplay({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
      return latex;
    }
  }, [latex]);

  return (
    <div
      style={{ overflowX: 'auto', padding: '0.2rem 0' }}
      // eslint-disable-next-line react/no-danger -- KaTeX escaped HTML
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function MlModelsAtlas() {
  const t = useVizTokens();
  const [query, setQuery] = useState('');
  const [linked] = useState(() => atlasHashEntry(mlModelsAtlas.map((e) => e.id)));

  useEffect(() => {
    if (linked) {
      document.getElementById(linked)?.scrollIntoView({ block: 'start' });
    }
  }, [linked]);

  const [category, setCategory] = useState<'all' | MlModelCategory>('all');

  const entries = useMemo(
    () =>
      mlModelsAtlas
        .filter((entry) => category === 'all' || entry.category === category)
        .filter((entry) => {
          const haystack = `${entry.name} ${entry.problem} ${entry.category} ${entry.cameBefore} ${entry.ledTo}`.toLowerCase();
          return haystack.includes(query.trim().toLowerCase());
        })
        .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name)),
    [category, query]
  );

  return (
    <section className="ml-models-atlas" aria-label="Machine learning models atlas">
      <div
        className="ml-models-atlas__controls"
        style={{ background: t.surface, borderColor: t.border }}
      >
        <label>
          Search models
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. clustering or boosting"
            style={{ background: t.background, color: t.textPrimary, borderColor: t.border }}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | MlModelCategory)}
            style={{ background: t.background, color: t.textPrimary, borderColor: t.border }}
          >
            <option value="all">All categories</option>
            {mlModelCategories.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <span aria-live="polite" style={{ color: t.textSecondary }}>
          {entries.length} models
        </span>
      </div>

      {mlModelEras.map((era) => {
        const eraEntries = entries.filter((entry) => entry.era === era.id);
        if (!eraEntries.length) return null;

        return (
          <section key={era.id} className="ml-models-atlas__era" aria-labelledby={`era-${era.id}`}>
            <header>
              <p style={{ color: t.accentPrimary }}>{era.years}</p>
              <h2 id={`era-${era.id}`} style={{ color: t.textPrimary }}>
                {era.label}
              </h2>
              <p style={{ color: t.textSecondary }}>{era.narrative}</p>
            </header>

            <div
              className="ml-models-atlas__table"
              role="table"
              aria-label={`${era.label} models`}
              style={{ borderColor: t.border }}
            >
              <div
                className="ml-models-atlas__head"
                role="row"
                style={{ background: t.surfaceAlt, color: t.textSecondary }}
              >
                <span role="columnheader">Year</span>
                <span role="columnheader">Model and progression</span>
                <span role="columnheader">Category</span>
              </div>

              {eraEntries.map((entry) => (
                <details
                  key={entry.id}
                  id={entry.id}
                  open={entry.id === linked || undefined}
                  onToggle={(e) => {
                    if (e.currentTarget.open) setAtlasHash(entry.id);
                  }}
                  className="ml-models-atlas__row"
                  style={{ borderColor: t.border }}
                >
                  <summary>
                    <span className="ml-models-atlas__year" style={{ color: t.accentPrimary }}>
                      {entry.year}
                    </span>
                    <span>
                      <strong style={{ color: t.textPrimary }}>{entry.name}</strong>
                      <small style={{ color: t.textSecondary }}>
                        {entry.cameBefore} → {entry.ledTo}
                      </small>
                    </span>
                    <span
                      className="ml-models-atlas__category"
                      style={{ color: t.accentSecondary }}
                    >
                      {categoryLabel(entry.category)}
                    </span>
                  </summary>

                  <div className="ml-models-atlas__detail">
                    {/* 1. What problem it was built to solve */}
                    <section className="ml-models-atlas__section" aria-label="1. Problem solved">
                      <h3 style={{ color: t.textPrimary }}>1. What problem it was built to solve</h3>
                      <p style={{ color: t.textSecondary }}>{entry.problem}</p>
                    </section>

                    {/* 2. What came before and what it fixed */}
                    <section className="ml-models-atlas__section" aria-label="2. What came before">
                      <h3 style={{ color: t.textPrimary }}>2. What came before and what it fixed</h3>
                      <p style={{ color: t.textSecondary }}>{entry.previousLimit}</p>
                    </section>

                    {/* 3. How it works — the maths */}
                    <section className="ml-models-atlas__section" aria-label="3. The maths">
                      <h3 style={{ color: t.textPrimary }}>3. How it works — the maths</h3>
                      <div
                        className="ml-models-atlas__math-box"
                        style={{ background: t.surface, borderColor: t.border }}
                      >
                        <div className="ml-models-atlas__math-item">
                          <span style={{ color: t.accentPrimary }}>Objective / Loss:</span>
                          <KatexDisplay latex={entry.maths.objective} />
                        </div>
                        <div className="ml-models-atlas__math-item">
                          <span style={{ color: t.accentPrimary }}>Update or Closed Form:</span>
                          <KatexDisplay latex={entry.maths.updateOrClosedForm} />
                        </div>
                        <div className="ml-models-atlas__math-item">
                          <span style={{ color: t.accentPrimary }}>Tiny Worked Example:</span>
                          <p style={{ margin: '0.2rem 0', color: t.textSecondary, fontSize: '0.85rem' }}>
                            {entry.maths.workedExample}
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* 4. Visualisation */}
                    <section className="ml-models-atlas__section" aria-label="4. Visualisation">
                      <h3 style={{ color: t.textPrimary }}>4. Visualisation</h3>
                      <div
                        className="ml-models-atlas__diagram"
                        style={{ background: t.surface, borderColor: t.border }}
                      >
                        <MlModelVisual diagram={entry.diagram} name={entry.name} />
                        <p style={{ color: t.textSecondary }}>
                          Figure: {entry.name} mechanism shown above; data and parameters match the worked example.
                        </p>
                      </div>
                    </section>

                    {/* 5. Evaluation metrics */}
                    <section className="ml-models-atlas__section" aria-label="5. Evaluation metrics">
                      <h3 style={{ color: t.textPrimary }}>5. Evaluation metrics</h3>
                      <p style={{ color: t.textSecondary }}>{entry.evaluationMetrics}</p>
                    </section>

                    {/* 6. Applications */}
                    <section className="ml-models-atlas__section" aria-label="6. Applications">
                      <h3 style={{ color: t.textPrimary }}>6. Applications</h3>
                      <ul style={{ color: t.textSecondary }}>
                        {entry.applications.map((app) => (
                          <li key={app}>{app}</li>
                        ))}
                      </ul>
                    </section>

                    {/* 7. Primary source and Learn page link */}
                    <section className="ml-models-atlas__section" aria-label="7. Primary source and Learn link">
                      <h3 style={{ color: t.textPrimary }}>7. Primary source and Learn page</h3>
                      <p className="ml-models-atlas__links">
                        <a
                          href={entry.source.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: t.accentPrimary }}
                        >
                          Primary paper: {entry.source.label}
                        </a>
                        <a href={entry.learnPath} style={{ color: t.accentSecondary }}>
                          Learn the underlying mechanism
                        </a>
                      </p>
                    </section>
                  </div>
                </details>
              ))}
            </div>
          </section>
        );
      })}

      {!entries.length && (
        <p role="status" style={{ color: t.textSecondary, marginTop: '2rem' }}>
          No machine learning models match this filter.
        </p>
      )}
    </section>
  );
}
