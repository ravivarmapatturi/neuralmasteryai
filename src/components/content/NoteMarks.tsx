import type { ReactNode } from 'react';

/**
 * <Mark> renders an explicit soft highlighter stroke over key phrases or results,
 * simulating a student highlighting an important finding in their notebook.
 */
export function Mark({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <mark className="nm-mark-highlight" style={color ? { background: color } : undefined}>
      {children}
    </mark>
  );
}

/**
 * <Key> renders a coloured pen underline under a term being defined,
 * matching handwritten margin / study notes.
 */
export function Key({ children }: { children: ReactNode }) {
  return <span className="nm-mark-key">{children}</span>;
}

export default { Mark, Key };
