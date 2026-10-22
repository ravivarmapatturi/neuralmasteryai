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

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkRehype).use(rehypeKatex);

/**
 * Renders markdown written in the blog editor with the same plugins
 * (GFM, maths) and the same code-block and link components as the MDX
 * pages, so a post written in the browser looks exactly like a Learn
 * page inside `.prose`. Raw HTML in the markdown is not rendered
 * (remark-rehype drops it by default), so a post can't inject markup.
 */
export default function Markdown({ source }: { source: string }) {
  const content = useMemo(() => {
    const tree = processor.runSync(processor.parse(source)) as Root;
    return toJsxRuntime(tree, { Fragment, jsx, jsxs, components: mdxComponents as never });
  }, [source]);
  return content;
}
