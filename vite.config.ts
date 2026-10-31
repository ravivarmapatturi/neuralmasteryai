import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'

// https://vite.dev/config/
export default defineConfig({
  // Served from the custom domain's own root (neuralmasteryai.com), not a
  // GitHub Pages project-site subpath -- was '/NeuralMastery-vite/' before
  // the custom domain went live (see public/CNAME).
  base: '/',
  // Nested agent worktrees are separate apps and can exhaust OS file watchers.
  server: { watch: { ignored: ['**/.claude/**', '**/scratch/**'] } },
  plugins: [
    // MDX must run before the React plugin's JSX transform sees .mdx files
    mdx({
      // remarkGfm enables GitHub-Flavored Markdown -- tables, strikethrough,
      // task lists, autolinks. Without it, `| a | b |` pipe tables (used
      // across ~25 migrated docs) silently fall back to plain paragraph
      // text instead of parsing as a table.
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
      providerImportSource: '@mdx-js/react',
    }),
    // Default include (.jsx/.tsx only) -- must NOT also match .mdx, since
    // mdx()'s transform (above) has to run on the raw MDX source first and
    // hand off compiled JSX; pointing react()'s babel step at the raw .mdx
    // text directly (its frontmatter block especially) fails to parse.
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@site': __dirname,
    },
  },
})
