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
import './playground.css';

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
            <p className="playground-tool__idea">
              <strong>Idea it teaches:</strong> {tool.ideaTaught}
            </p>
          </header>

          <section className="playground-tool__stage" aria-label={`${tool.title} interactive workbench`}>
            <ErrorBoundary level="route">
              <Suspense
                fallback={
                  <p role="status" style={{ padding: '2rem', textAlign: 'center' }}>
                    Loading interactive workbench…
                  </p>
                }
              >
                <ToolComponent />
              </Suspense>
            </ErrorBoundary>
          </section>

          {tool.tryThis.length > 0 && (
            <section className="playground-tool__try-panel" aria-labelledby="try-this-heading">
              <h2 id="try-this-heading">Try this: predict, change, check</h2>
              <ol className="playground-tool__try-list">
                {tool.tryThis.map((item, idx) => (
                  <li key={idx} className="playground-tool__try-item">
                    <span>{item.prompt}</span>
                    <details>
                      <summary>Check what happens</summary>
                      <p className="playground-tool__try-check">{item.check}</p>
                    </details>
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
