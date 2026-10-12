import { Link } from 'react-router-dom';
import { SECTION_META, SECTION_ORDER, groupLandingRoute, timeEstimate, TOTAL_PAGES } from '../data/sectionMeta';
import { DomainIcon } from './icons/DomainIcons';

const STATS = [
  { value: SECTION_ORDER.length, label: 'sections' },
  { value: '28', label: 'sub-topics' },
  { value: `${TOTAL_PAGES}+`, label: 'in-depth pages' },
];

/** A full, structured breakdown of the curriculum: 7 groups, each with its
 * real sub-sections listed and linked -- the "table of contents" the site's
 * flat sidebar doesn't otherwise surface in one place. */
export default function CurriculumBreakdown() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: '8px 0 28px' }}>
        {STATS.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--nm-accent-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--nm-text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {SECTION_ORDER.map((key) => {
          const meta = SECTION_META[key];
          return (
            <div
              key={key}
              style={{
                border: '1px solid var(--nm-border)',
                borderTop: `3px solid ${meta.color}`,
                borderRadius: 10,
                padding: 18,
                background: 'var(--nm-surface)',
              }}
            >
              <Link to={groupLandingRoute(key)} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <DomainIcon groupKey={key} color={meta.color} size={22} />
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{meta.label}</span>
                </div>
              </Link>
              <p style={{ fontSize: 13.5, color: 'var(--nm-text-secondary)', margin: '0 0 10px' }}>{meta.description}</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--nm-text-secondary)', marginBottom: 12 }}>
                <span>⏱ {timeEstimate(meta.pageCount)}</span>
                <span>⭐ {meta.difficulty}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                {meta.subsections.map((s) => (
                  <li key={s.dir} style={{ marginBottom: 3 }}>
                    <Link to={s.landing || `/docs/${s.dir}/roadmap`}>{s.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
