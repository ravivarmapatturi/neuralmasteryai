import React, { isValidElement } from 'react';
import VisualizationCode from '../viz/primitives/VisualizationCode';

interface CodeChildProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Overrides MDX's default <pre><code> rendering for fenced code blocks
 * (```python ... ```) to route through the Shiki-backed VisualizationCode
 * primitive, so a lesson's code and a visualization's code look identical.
 */
export default function MDXCodeBlock({ children }: { children?: React.ReactNode }) {
  if (isValidElement<CodeChildProps>(children) && typeof children.props.children === 'string') {
    const lang = children.props.className?.replace('language-', '') || 'text';
    // VisualizationCode only sets a top margin (it's also used inside
    // widgets), so a fenced block in prose otherwise touched the paragraph
    // after it. The wrapper gives prose code blocks room on both sides.
    return (
      <div className="nm-prose-code">
        <VisualizationCode code={children.props.children.replace(/\n$/, '')} lang={lang} />
      </div>
    );
  }
  return <pre>{children}</pre>;
}
