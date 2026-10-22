import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * Real, honest "what is this" page -- reuses the same description already
 * established on the homepage (ChooserPage's own useDocumentMeta call)
 * rather than inventing new marketing language that would need to be kept
 * in sync separately. Contact is folded in here rather than a separate
 * page: this is a solo, single-maintainer project with no support
 * inbox/contact form set up, so the real, honest channel is the public
 * GitHub repo -- not a fabricated email address or form.
 */
export default function AboutPage() {
  useDocumentTitle('About');
  useDocumentMeta('About Neural Mastery', 'What Neural Mastery is, how it works, and how to reach the person building it.');

  return (
    <div style={{ minHeight: '100%', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main>
        <section style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, color: 'var(--nm-text-primary)', marginBottom: '1.25rem' }}>
            About Neural Mastery
          </h1>
          <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--nm-text-secondary)' }}>
            <p>
              Neural Mastery teaches AI engineering from the maths up to LLMs and agents. Many lessons include a widget
              you can change to see the computation respond, and the practice problems run Python in your browser (via
              Pyodide) against test cases.
            </p>
            <p>
              One person builds and maintains it, and new lessons, problems and blog posts are added regularly.
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nm-text-primary)', marginTop: '2rem', marginBottom: '0.75rem' }}>
              Questions, feedback, or found a bug?
            </h2>
            <p>
              There's no separate support inbox or contact form — the real, honest channel is the project's public GitHub
              repository. Open an issue there for a bug report, a content correction, or a feature request, or check the
              repo's own commit history to see exactly what's shipped and when.
            </p>
            <p>
              <a
                href="https://github.com/ravivarmapatturi/NeuralMastery-vite/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--nm-accent-primary)' }}
              >
                Open an issue on GitHub →
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
