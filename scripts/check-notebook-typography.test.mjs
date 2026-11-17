import { describe, expect, it } from 'vitest';
import { checkJsxTypography, checkCssTypography, scanTypographyFiles } from './check-notebook-typography.mjs';

describe('Static Typography Guard (JSX/TSX)', () => {
  it('rejects inline fontSize on heading elements', () => {
    const code = `
      export function BadHeading() {
        return <h1 style={{ fontSize: '2.5rem', color: 'red' }}>Title</h1>;
      }
    `;
    const violations = checkJsxTypography(code, 'BadHeading.tsx');
    expect(violations.length).toBe(1);
    expect(violations[0].property).toBe('font-size');
    expect(violations[0].role).toBe('h1');
  });

  it('rejects inline fontWeight on heading elements', () => {
    const code = `
      export function BadH2() {
        return <h2 style={{ fontWeight: 800 }}>Subtitle</h2>;
      }
    `;
    const violations = checkJsxTypography(code, 'BadH2.tsx');
    expect(violations.length).toBe(1);
    expect(violations[0].property).toBe('font-weight');
    expect(violations[0].role).toBe('h2');
  });

  it('rejects inline fontSize on table headers and cells', () => {
    const code = `
      export function BadTable() {
        return (
          <table>
            <thead>
              <tr><th style={{ fontSize: '12px' }}>Header</th></tr>
            </thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Cell</td></tr>
            </tbody>
          </table>
        );
      }
    `;
    const violations = checkJsxTypography(code, 'BadTable.tsx');
    expect(violations.length).toBe(2);
    expect(violations.some((v) => v.role === 'th' && v.property === 'font-size')).toBe(true);
    expect(violations.some((v) => v.role === 'td' && v.property === 'font-weight')).toBe(true);
  });

  it('accepts shared tokens var(--nm-type-*) on headings', () => {
    const code = `
      export function GoodHeading() {
        return <h1 style={{ fontSize: 'var(--nm-type-h1-size)', fontWeight: 'var(--nm-type-h1-weight)' }}>Title</h1>;
      }
    `;
    const violations = checkJsxTypography(code, 'GoodHeading.tsx');
    expect(violations).toEqual([]);
  });

  it('accepts non-typography styles on headings', () => {
    const code = `
      export function ColoredHeading() {
        return <h3 style={{ color: 'var(--nm-heading-3)', marginTop: '1rem' }}>Section</h3>;
      }
    `;
    const violations = checkJsxTypography(code, 'ColoredHeading.tsx');
    expect(violations).toEqual([]);
  });

  it('allows styles on code, controls, diagram labels, and navigation', () => {
    const code = `
      export function ToolingComponent() {
        return (
          <div>
            <pre style={{ fontSize: 13 }}>console.log(1);</pre>
            <code style={{ fontSize: '0.88em' }}>foo()</code>
            <button style={{ fontSize: 14, fontWeight: 600 }}>Submit</button>
            <input style={{ fontSize: '14px' }} />
            <select style={{ fontSize: 13 }} />
            <svg>
              <text style={{ fontSize: 12 }}>Diagram Label</text>
            </svg>
            <nav style={{ fontSize: 14, fontWeight: 500 }}>Nav Link</nav>
          </div>
        );
      }
    `;
    const violations = checkJsxTypography(code, 'ToolingComponent.tsx');
    expect(violations).toEqual([]);
  });
});

describe('Static Typography Guard (CSS)', () => {
  it('rejects hardcoded font-size/font-weight on headings and tables', () => {
    const css = `
      .article h1 { font-size: 2.5rem; margin: 0; }
      .article h2 { font-weight: 800; }
      .article h3 { font-size: 1.25rem; font-weight: 700; }
      .article th { font-size: 12px; font-weight: 600; }
      .article td { font-size: 13px; }
    `;
    const violations = checkCssTypography(css, 'article.css');
    expect(violations.length).toBe(7);
  });

  it('accepts shared tokens var(--nm-type-*) in CSS', () => {
    const css = `
      .labs__head h1 {
        font-size: var(--nm-type-h1-size);
        font-weight: var(--nm-type-h1-weight);
        color: var(--nm-type-h1-color);
      }
      .labs__table th {
        font-size: var(--nm-type-th-size);
        font-weight: var(--nm-type-th-weight);
      }
      .labs__table td {
        font-size: var(--nm-type-td-size);
        font-weight: var(--nm-type-td-weight);
      }
    `;
    const violations = checkCssTypography(css, 'labs.css');
    expect(violations).toEqual([]);
  });

  it('allows font-size/font-weight on controls, code, diagrams, and nav in CSS', () => {
    const css = `
      .labs__tabs button { font-size: 14px; font-weight: 600; }
      .labs__search input { font-size: 0.95rem; }
      .code-pre code { font-size: 12.5px; }
      .axis-label text { font-size: 11px; }
      .sidebar-nav a { font-size: 13px; font-weight: 500; }
      .toc-link { font-size: 12px; }
    `;
    const violations = checkCssTypography(css, 'controls.css');
    expect(violations).toEqual([]);
  });
});

describe('Static Typography Guard (Repository Content)', () => {
  it('passes on all content and notebook components in the repository', () => {
    const { filesScanned, violations } = scanTypographyFiles();
    expect(filesScanned).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
});
