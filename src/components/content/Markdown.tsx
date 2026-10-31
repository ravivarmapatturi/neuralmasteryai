import { Fragment, useMemo } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import { mdxComponents } from './mdxComponents';

// singleDollarTextMath off: in a blog post "$5" means money, so maths needs
// $$...$$ (inline or on its own line). MDX pages keep single-dollar maths.
const makeProcessor = (inlineMath: boolean) => unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath, { singleDollarTextMath: inlineMath })
  .use(remarkRehype)
  .use(rehypeKatex);

const processor = makeProcessor(false);
const inlineMathProcessor = makeProcessor(true);

/**
 * Renders markdown written in the blog editor with the same plugins
 * (GFM, maths) and the same code-block and link components as the MDX
 * pages, so a post written in the browser looks exactly like a Learn
 * page inside `.prose`. Raw HTML in the markdown is not rendered
 * (remark-rehype drops it by default), so a post can't inject markup.
 */
export default function Markdown({ source, inlineMath = false }: { source: string; inlineMath?: boolean }) {
  const content = useMemo(() => {
    const active = inlineMath ? inlineMathProcessor : processor;
    const tree = active.runSync(active.parse(source)) as Root;
    return toJsxRuntime(tree, { Fragment, jsx, jsxs, components: mdxComponents as never });
  }, [source, inlineMath]);
  return content;
}
