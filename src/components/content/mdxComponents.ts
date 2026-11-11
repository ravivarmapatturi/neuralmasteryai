import ThemedImage from '../ThemedImage';
import MDXCodeBlock from '../MDXCodeBlock';
import MDXLink from '../MDXLink';
import { Mark, Key } from './NoteMarks';

/** The components every MDX page and every editor-written blog post render
 * with: Shiki code blocks, router-aware links, theme-aware images, note marks. */
export const mdxComponents = {
  ThemedImage,
  pre: MDXCodeBlock,
  a: MDXLink,
  Mark,
  Key,
};
