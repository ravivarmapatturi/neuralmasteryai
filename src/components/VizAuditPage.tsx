import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const diagramModules = import.meta.glob<{ default: React.ComponentType }>('../viz/diagrams/*.tsx');
const topVizModules = import.meta.glob<{ default: React.ComponentType }>('../viz/*.tsx');

export default function VizAuditPage() {
  const [params, setParams] = useSearchParams();
  const name = params.get('name') || '';
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setComp(null);
      setLoadError(null);
      return;
    }
    const keyDiagrams = `../viz/diagrams/${name}.tsx`;
    const keyTop = `../viz/${name}.tsx`;
    const loader = diagramModules[keyDiagrams] || topVizModules[keyTop];

    if (!loader) {
      setLoadError(`Diagram "${name}" not found`);
      setComp(null);
      return;
    }

    setLoadError(null);
    loader()
      .then((m) => {
        setComp(() => m.default);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(String(err));
      });
  }, [name]);

  const allNames = Object.keys(diagramModules)
    .map((k) => k.replace('../viz/diagrams/', '').replace('.tsx', ''))
    .concat(Object.keys(topVizModules).map((k) => k.replace('../viz/', '').replace('.tsx', '')))
    .filter((n) => !n.includes('.test') && !n.includes('diagramSystem') && !n.includes('architectureShapes'))
    .sort();

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Diagram Audit Viewer</h1>
        <select
          value={name}
          onChange={(e) => setParams({ name: e.target.value })}
          style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="">Select a diagram ({allNames.length} available)...</option>
          {allNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span style={{ fontSize: '13px', color: 'var(--text-muted, #888)' }}>
          Current: <strong>{name || 'None'}</strong>
        </span>
      </header>

      {loadError && (
        <div style={{ color: 'red', padding: '1rem', border: '1px solid red', borderRadius: '6px', marginBottom: '1rem' }}>
          {loadError}
        </div>
      )}

      {Comp && (
        <main
          id="diagram-stage"
          style={{
            padding: '1.5rem',
            background: 'var(--color-surface, #1e1e24)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <Comp />
        </main>
      )}
    </div>
  );
}
