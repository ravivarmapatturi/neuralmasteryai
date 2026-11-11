import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Prec } from '@codemirror/state';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { tags as tg } from '@lezer/highlight';
import type { VizTokens } from '../../theme/vizTokens';

const MONO = 'var(--font-mono)';

const notebookChrome = EditorView.theme({
  '&': { fontSize: '13.5px', height: '100%', color: 'var(--nm-code-text)', backgroundColor: 'var(--nm-code-bg)' },
  '.cm-scroller': { fontFamily: MONO, lineHeight: '1.6', minHeight: '100%', overflow: 'auto' },
  '.cm-content': { fontFamily: MONO, minHeight: '96px', padding: '10px 0', caretColor: 'var(--nm-code-cursor)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--nm-code-cursor)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--nm-code-selection)',
  },
  '.cm-gutters': { backgroundColor: 'var(--nm-code-gutter-bg)', color: 'var(--nm-code-gutter-text)', border: 'none', borderRight: '1px solid var(--nm-code-rule)' },
  '.cm-gutterElement': { padding: '0 8px 0 12px' },
  '.cm-activeLine': { backgroundColor: 'var(--nm-code-active-line)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--nm-code-active-line)', color: 'var(--nm-code-text)' },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': { backgroundColor: 'var(--nm-code-selection)', outline: 'none' },
  '.cm-line': { padding: '0 12px' },
});

const notebookHighlight = HighlightStyle.define([
  { tag: [tg.keyword, tg.controlKeyword, tg.moduleKeyword, tg.operatorKeyword, tg.definitionKeyword], color: 'var(--nm-code-keyword)', fontWeight: '600' },
  { tag: [tg.string, tg.special(tg.string), tg.regexp], color: 'var(--nm-code-string)' },
  { tag: [tg.number, tg.bool, tg.null, tg.atom], color: 'var(--nm-code-number)' },
  { tag: [tg.comment, tg.lineComment, tg.blockComment, tg.docComment], color: 'var(--nm-code-comment)', fontStyle: 'italic' },
  { tag: [tg.function(tg.variableName), tg.function(tg.propertyName), tg.definition(tg.variableName)], color: 'var(--nm-code-function)' },
  { tag: [tg.className, tg.typeName, tg.namespace, tg.self], color: 'var(--nm-code-type)' },
  { tag: [tg.operator, tg.compareOperator, tg.arithmeticOperator, tg.logicOperator, tg.definitionOperator], color: 'var(--nm-code-operator)' },
  { tag: [tg.propertyName, tg.meta], color: 'var(--nm-code-property)' },
  { tag: tg.invalid, color: 'var(--nm-code-invalid)' },
]);

/**
 * Real CodeMirror 6 editor for Python practice-problem input -- replaces a
 * bare <textarea> (no highlighting, no indent handling) with real syntax
 * highlighting, bracket matching, and Python-correct Tab-inserts-4-spaces
 * behavior. Deliberately CodeMirror over Monaco: this only needs a real
 * code-input surface for a single language, not a full IDE, and CM6's
 * bundle is a fraction of Monaco's for that job (see RunnableCode.tsx,
 * which lazy-loads this file via React.lazy so its real ~155KB min+gzip (measured via `npm run build`) stays
 * out of the main bundle for every page that isn't a practice problem).
 *
 * Uncontrolled by design, like the textarea it replaces: `value` seeds the
 * editor once on mount and is re-synced only when it changes from OUTSIDE
 * (e.g. this problem's own "reset" affordance were one to exist), not on
 * every keystroke -- CodeMirror owns its own document, `onChange` is an
 * outward notification, not a two-way controlled-input binding (fighting
 * CM6's own cursor/selection state on every render is the real reason
 * every CM6 React wrapper does it this way, not just this one).
 */
export default function CodeEditor({
  value,
  onChange,
  tokens: _tokens,
}: {
  value: string;
  onChange: (next: string) => void;
  tokens: VizTokens;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          python(),
          indentUnit.of('    '), // real 4-space Python indent, not CM6's 2-space default
          Prec.highest(keymap.of([indentWithTab])), // Tab inserts indent -- a Python-only tool needs this more than the a11y default of tabbing focus away
          // Chrome and syntax colours are two separate CM6 systems and both
          // read the --nm-code-* variables from theme.css, so the editor is
          // light paper on the notebook themes and dark on the dark ones, and
          // follows a theme switch without being re-mounted.
          notebookChrome,
          syntaxHighlighting(notebookHighlight),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => view.destroy();
    // Deliberately mount once -- `tokens` (theme) changes are rare (a
    // manual light/dark toggle) and re-mounting the whole editor on every
    // theme flip would lose cursor position/undo history for a cosmetic
    // change; re-creating it below only when the identity actually
    // changes, not on every render, is the real fix rather than this
    // effect depending on `tokens`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (not from this editor's own typing) get synced
  // in without clobbering the user's cursor/selection when the content is
  // already identical -- the common no-op case on every parent re-render.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Same variable as the editor itself, so nothing flashes before it paints.
  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        background: 'var(--nm-code-bg)',
      }}
    />
  );
}
