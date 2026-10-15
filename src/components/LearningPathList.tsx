import { Link } from 'react-router-dom';
import { SECTION_META, SECTION_ORDER, groupLandingRoute, groupPageRoutes } from '../data/sectionMeta';
import { getFlatPages } from '../lib/contentTree';
import { useProgress } from '../contexts/ProgressContext';

/** The curriculum as one numbered reading order: each section with its
 * topics linked, its real page count, and how many of those pages this
 * visitor has marked understood. */
export default function LearningPathList() {
  const { countWithin } = useProgress();
  const routes = getFlatPages().map((page) => page.route);

  return (
    <ol className="nm-path-list">
      {SECTION_ORDER.map((key) => {
        const meta = SECTION_META[key];
        const pages = groupPageRoutes(key, routes);
        const done = countWithin(pages);
        return (
          <li key={key} style={{ '--path-color': meta.color } as React.CSSProperties}>
            <h3>
              <Link to={groupLandingRoute(key)}>{meta.label}</Link>
            </h3>
            <p>{meta.description}</p>
            <p className="nm-path-topics">
              {meta.subsections.map((s, i) => (
                <span key={s.dir}>
                  {i > 0 && ' · '}
                  <Link to={s.landing ?? `/docs/${s.dir}/roadmap`}>{s.label}</Link>
                </span>
              ))}
            </p>
            <p className="nm-path-count">
              {pages.length} page{pages.length === 1 ? '' : 's'}
              {done > 0 && <> · {done} understood</>}
            </p>
            {done > 0 && (
              <div className="nm-path-bar" aria-hidden="true">
                <div style={{ width: `${Math.min(100, (done / pages.length) * 100)}%` }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
