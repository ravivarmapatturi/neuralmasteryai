import { lazy, type ComponentType } from 'react';
import blogMeta from '../data/blogMeta.generated.json';

/** One blog post's metadata, from src/data/blogMeta.generated.json (written
 * by scripts/generate-page-meta.mjs from each post's frontmatter). */
export interface BlogPost {
  slug: string;
  title: string;
  description: string | null;
  date: string;
  tags: string[];
  readingMinutes: number;
}

const POSTS = blogMeta as BlogPost[];

/** Newest first. */
export function getBlogPosts(): BlogPost[] {
  return POSTS;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

const loaders = import.meta.glob<{ default: ComponentType }>('/src/content/blog/*.mdx');
const components = new Map<string, ComponentType>();

/** The post's compiled MDX, loaded only when the post is opened. */
export function getBlogComponent(slug: string): ComponentType | undefined {
  const loader = loaders[`/src/content/blog/${slug}.mdx`];
  if (!loader) return undefined;
  if (!components.has(slug)) components.set(slug, lazy(loader));
  return components.get(slug);
}

/** "22 October 2026" */
export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
