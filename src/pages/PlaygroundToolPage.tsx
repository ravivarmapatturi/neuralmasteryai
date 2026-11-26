import { Suspense, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import NotFoundPage from '../components/NotFoundPage';
import Navbar from '../components/layout/Navbar';
import {
  getLazyPlaygroundComponent,
  getPlaygroundToolBySlug,
} from '../data/playgroundCatalog';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import StickyNote, { type StickyColor } from '../viz/primitives/StickyNote';
import TransformerBlockMap from '../viz/diagrams/TransformerBlockMap';
import { AutoplayDefaultContext } from '../viz/primitives/autoplayDefault';
import './playground.css';

const TRY_COLORS: StickyColor[] = ['blue', 'green', 'pink', 'orange'];

export default function PlaygroundToolPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const tool = useMemo(() => getPlaygroundToolBySlug(slug), [slug]);
  const ToolComponent = useMemo(() => (tool ? getLazyPlaygroundComponent(tool.slug) : undefined), [tool]);

  useDocumentTitle(tool ? `${tool.title} — Playground` : 'Playground Tool Not Found');
  useDocumentMeta(
    tool ? `${tool.title} — Interactive Playground` : 'Not Found',
    tool?.whatYouTry,
    tool
      ? [
          { label: 'Home', href: '/' },
          { label: 'Playground', href: '/playground' },
          { label: tool.title, href: `/playground/${tool.slug}` },
        ]
      : undefined,
  );

  if (!tool || !ToolComponent) {
    return <NotFoundPage />;
  }

  return (
    <div className="playground-tool nb-theme">
      <Navbar />
      <main>
        <div className="nm-notebook-sheet playground-tool__sheet">
          <div className="playground-tool__nav-row">
            <nav className="playground-tool__crumb" aria-label="Breadcrumb">
              <Link to="/playground">Playground</Link>
              <span aria-hidden="true">/</span>
              <span>{tool.sectionLabel}</span>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{tool.title}</span>
            </nav>

            <Link to={tool.learnPath} className="playground-tool__lesson-link">
              Learn the concept: {tool.learnTitle} →
            </Link>
          </div>

          <header className="playground-tool__head">
            <h1>{tool.title}</h1>
            <p className="playground-tool__summary">{tool.whatYouTry}</p>
            <div className="playground-tool__idea">
              <StickyNote title="The idea" color="yellow" tilt={-1}>{tool.ideaTaught}</StickyNote>
            </div>
          </header>

          <section className="playground-tool__stage" aria-label={`${tool.title} interactive workbench`}>
            <AutoplayDefaultContext.Provider value={false}>
            <ErrorBoundary level="route">
              <Suspense
                fallback={
                  <p role="status" style={{ padding: '2rem', textAlign: 'center' }}>
                    Loading interactive workbench…
                  </p>
                }
              >
                {tool.slug === 'attention-step-through' ? (
                  <div className="playground-tool__with-map">
                    <ToolComponent />
                    <TransformerBlockMap />
                  </div>
                ) : (
                  <ToolComponent />
                )}
              </Suspense>
            </ErrorBoundary>
            </AutoplayDefaultContext.Provider>
          </section>

          {tool.tryThis.length > 0 && (
            <section className="playground-tool__try-panel" aria-labelledby="try-this-heading">
              <h2 id="try-this-heading">Try this: predict, change, check</h2>
              <ol className="playground-tool__try-list">
                {tool.tryThis.map((item, idx) => (
                  <li key={idx} className="playground-tool__try-item">
                    <StickyNote title={`Try ${idx + 1}`} color={TRY_COLORS[idx % TRY_COLORS.length]} tilt={idx % 2 ? 1 : -1}>
                      <p>{item.prompt}</p>
                      <details>
                        <summary>Check what happens</summary>
                        <p className="playground-tool__try-check">{item.check}</p>
                      </details>
                    </StickyNote>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="playground-tool__footer-links">
            <Link to="/playground" className="playground__labs-link">
              ← Back to all playground tools
            </Link>
            <Link to={tool.learnPath} className="playground-tool__lesson-link">
              Read full lesson: {tool.learnTitle} →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
