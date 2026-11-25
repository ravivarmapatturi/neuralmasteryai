import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  evaluateModelLicense,
  OPEN_MODEL_LICENSES,
  type LicenseRequirements,
} from './openModelLicenses';
import './playgroundTools.css';

export default function OpenModelLicenseChecker() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [req, setReq] = useState<LicenseRequirements>({
    commercialUse: true,
    saasHosting: true,
    redistributeFinetunes: false,
    noMauCap: false,
    osiOnly: false,
  });
  const [familyFilter, setFamilyFilter] = useState<string>('All');
  const [query, setQuery] = useState('');

  const families = useMemo(() => {
    const uniq = Array.from(new Set(OPEN_MODEL_LICENSES.map((m) => m.licenseFamily)));
    return ['All', ...uniq];
  }, []);

  const evaluated = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return OPEN_MODEL_LICENSES.filter((m) => {
      if (familyFilter !== 'All' && m.licenseFamily !== familyFilter) return false;
      if (!needle) return true;
      return `${m.model} ${m.provider} ${m.licenseName} ${m.category}`.toLowerCase().includes(needle);
    }).map((record) => evaluateModelLicense(record, req));
  }, [req, familyFilter, query]);

  const counts = useMemo(() => {
    let ok = 0;
    let cond = 0;
    let blocked = 0;
    for (const item of evaluated) {
      if (item.status === 'Compatible') ok += 1;
      else if (item.status === 'Compatible with conditions') cond += 1;
      else blocked += 1;
    }
    return { ok, cond, blocked };
  }, [evaluated]);

  const toggle = (key: keyof LicenseRequirements) => {
    setReq((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <VisualizationContainer
      title="Open-Source Model & License Checker"
      footer={`Evaluated ${evaluated.length} curated open models with cited license sources: ${counts.ok} permissive compatible, ${counts.cond} compatible with conditions, ${counts.blocked} blocked. Always review the linked license text directly; this tool is educational, not legal advice.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Weight license compatibility"
          title="Check commercial, SaaS, MAU, and redistribution constraints"
          description="Open weights are not automatically open-source. Toggle your deployment requirements to flag non-commercial licenses, MAU caps, and naming clauses before building."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 6 }}>
              Your deployment requirements
            </div>
            <div className="nm-pg__checks" role="group" aria-label="Deployment license requirements">
              <button type="button" className="nm-pg__chip-btn" aria-pressed={req.commercialUse} onClick={() => toggle('commercialUse')}>
                Commercial product
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={req.saasHosting} onClick={() => toggle('saasHosting')}>
                Hosted SaaS / API
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={req.redistributeFinetunes} onClick={() => toggle('redistributeFinetunes')}>
                Redistribute fine-tuned weights
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={req.noMauCap} onClick={() => toggle('noMauCap')}>
                No MAU user cap
              </button>
              <button type="button" className="nm-pg__chip-btn" aria-pressed={req.osiOnly} onClick={() => toggle('osiOnly')}>
                OSI-approved license only
              </button>
            </div>
          </div>

          <div className="nm-pg__grid-equal">
            <label className="nm-pg__field">
              <span>Search model or license</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try: Qwen, Llama, Mistral, MIT, FLUX..."
              />
            </label>
            <PillSelect<string>
              label="License family"
              value={familyFilter}
              onChange={setFamilyFilter}
              options={families.map((f) => ({ value: f, label: f }))}
            />
          </div>
        </div>

        <div className="nm-pg__kpis" aria-label="License filter counts">
          <div className="nm-pg__kpi nm-pg__kpi--good">
            Permissive compatible
            <strong>{counts.ok}</strong>
          </div>
          <div className="nm-pg__kpi nm-pg__kpi--warn">
            Compatible with conditions
            <strong>{counts.cond}</strong>
          </div>
          <div className="nm-pg__kpi nm-pg__kpi--bad">
            Blocked by constraints
            <strong>{counts.blocked}</strong>
          </div>
        </div>

        <div className="nm-pg__table-wrap">
          <table className="nm-pg__table">
            <thead>
              <tr>
                <th>Model & source</th>
                <th>License</th>
                <th>Verdict</th>
                <th>Requirements / blockers</th>
              </tr>
            </thead>
            <tbody>
              {evaluated.map(({ record, status, blockers, conditions }) => {
                const badgeClass =
                  status === 'Compatible'
                    ? 'nm-pg__badge--good'
                    : status === 'Compatible with conditions'
                      ? 'nm-pg__badge--warn'
                      : 'nm-pg__badge--bad';
                return (
                  <tr key={record.id}>
                    <td>
                      <strong style={{ color: t.textPrimary }}>{record.model}</strong>
                      <div style={{ fontSize: 13 }}>
                        {record.provider} · {record.params} · {record.category}
                      </div>
                      <a
                        className="nm-pg__link"
                        href={record.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verified license source ↗
                      </a>
                    </td>
                    <td>
                      <strong>{record.licenseName}</strong>
                      <div style={{ fontSize: 13 }}>{record.notes}</div>
                    </td>
                    <td>
                      <span className={`nm-pg__badge ${badgeClass}`}>{status}</span>
                    </td>
                    <td>
                      {blockers.length > 0 ? (
                        <ul className="nm-pg__list" style={{ margin: 0, color: t.accentDanger }}>
                          {blockers.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="nm-pg__list" style={{ margin: 0 }}>
                          {conditions.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </VisualizationContainer>
  );
}
