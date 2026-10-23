import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from './layout/Navbar';
import Markdown from './content/Markdown';
import { useAuth } from '../contexts/AuthContext';
import { getBlogPost } from '../lib/blog';
import { deleteStoredPost, getStoredPost, saveStoredPost, slugify, useIsAdmin, type StoredPost } from '../lib/blogStore';
import { useDocumentTitle } from '../lib/useDocumentTitle';

const field = {
  width: '100%',
  padding: '0.55rem 0.7rem',
  borderRadius: 8,
  border: '1px solid var(--nm-border)',
  background: 'var(--nm-surface)',
  color: 'var(--nm-text-primary)',
  font: 'inherit',
  fontSize: 15,
} as const;

const label = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--nm-text-secondary)', margin: '0 0 0.3rem' } as const;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * /blog/write and /blog/write/:slug: the admin editor. Markdown on the
 * left, and on the right a live preview rendered exactly as the published
 * post will be (same .prose styles and hand-written font as Learn pages).
 * Saving goes to Firestore; firestore.rules refuses anyone who isn't an
 * admin, whatever this page shows.
 */
export default function BlogEditorPage() {
  const { slug: editingSlug } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  useDocumentTitle(editingSlug ? 'Edit post' : 'Write a post');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');
  const [existing, setExisting] = useState<StoredPost | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editingSlug || !isAdmin) return;
    getStoredPost(editingSlug).then((post) => {
      if (!post) {
        setMessage({ kind: 'error', text: 'That post was not found.' });
        return;
      }
      setExisting(post);
      setTitle(post.title);
      setSlug(post.slug);
      setSlugTouched(true);
      setDescription(post.description);
      setTags(post.tags.join(', '));
      setBody(post.body);
    });
  }, [editingSlug, isAdmin]);

  if (loading) return <Shell><p>Loading…</p></Shell>;
  if (!user || !isAdmin) {
    return (
      <Shell>
        <h1 style={{ fontSize: '1.6rem' }}>Write a post</h1>
        <p style={{ color: 'var(--nm-text-secondary)' }}>
          Only admins can write blog posts. {user ? 'This account is not an admin.' : 'Sign in with an admin Google account to continue.'}
        </p>
      </Shell>
    );
  }

  const effectiveSlug = slugTouched ? slug : slugify(title);

  async function save(status: 'draft' | 'published') {
    setMessage(null);
    if (!title.trim() || !body.trim()) {
      setMessage({ kind: 'error', text: 'A post needs a title and some text.' });
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(effectiveSlug)) {
      setMessage({ kind: 'error', text: 'The URL slug can only use lowercase letters, numbers and single hyphens.' });
      return;
    }
    if (!existing && getBlogPost(effectiveSlug)) {
      setMessage({ kind: 'error', text: 'A post with that URL already exists. Change the slug.' });
      return;
    }
    if (existing && existing.slug !== effectiveSlug) {
      setMessage({ kind: 'error', text: "A saved post's URL can't change. Make a new post instead." });
      return;
    }
    setBusy(true);
    try {
      const post: StoredPost = {
        slug: effectiveSlug,
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        body,
        status,
        date: status === 'published' ? existing?.date ?? today() : existing?.date ?? null,
        authorName: user?.displayName ?? 'Neural Mastery',
        updatedAt: Date.now(),
      };
      await saveStoredPost(post);
      setExisting(post);
      setSlugTouched(true);
      setSlug(post.slug);
      setMessage({ kind: 'ok', text: status === 'published' ? 'Published.' : 'Draft saved.' });
      if (!editingSlug) navigate(`/blog/write/${post.slug}`, { replace: true });
    } catch (err) {
      setMessage({ kind: 'error', text: `Couldn't save: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing || !window.confirm(`Delete "${existing.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await deleteStoredPost(existing.slug);
      navigate('/blog');
    } catch (err) {
      setMessage({ kind: 'error', text: `Couldn't delete: ${(err as Error).message}` });
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '1.75rem 1.5rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--nm-text-primary)' }}>{existing ? 'Edit post' : 'Write a post'}</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--nm-text-muted)' }}>
            {existing ? (existing.status === 'published' ? 'Published' : 'Draft') : 'Not saved yet'}
            {existing?.status === 'published' && <> · <Link to={`/blog/${existing.slug}`} style={{ color: 'var(--nm-accent-primary)' }}>View post</Link></>}
            {' · '}<Link to="/blog" style={{ color: 'var(--nm-accent-primary)' }}>All posts</Link>
          </p>
        </div>

        <div className="nm-blog-editor">
          <section aria-label="Editor">
            <label style={label} htmlFor="post-title">Title</label>
            <input id="post-title" style={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What the post is about" />

            <label style={{ ...label, marginTop: '0.9rem' }} htmlFor="post-slug">URL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: 14, color: 'var(--nm-text-muted)' }}>/blog/</span>
              <input
                id="post-slug"
                style={field}
                value={effectiveSlug}
                disabled={Boolean(existing)}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </div>

            <label style={{ ...label, marginTop: '0.9rem' }} htmlFor="post-description">One-sentence summary (shown on the blog list and in search results)</label>
            <input id="post-description" style={field} value={description} onChange={(e) => setDescription(e.target.value)} />

            <label style={{ ...label, marginTop: '0.9rem' }} htmlFor="post-tags">Tags, comma-separated</label>
            <input id="post-tags" style={field} value={tags} onChange={(e) => setTags(e.target.value)} />

            <label style={{ ...label, marginTop: '0.9rem' }} htmlFor="post-body">
              Text, in Markdown: ## headings, **bold**, [links](https://…), lists, tables, ```code```, and $$maths$$ (a single $ is just a dollar sign)
            </label>
            <textarea id="post-body" style={{ ...field, minHeight: 460, fontFamily: 'var(--font-mono, monospace)', fontSize: 14, lineHeight: 1.6 }} value={body} onChange={(e) => setBody(e.target.value)} />

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button type="button" className="nm-button nm-button-secondary" disabled={busy} onClick={() => save('draft')}>
                {existing?.status === 'published' ? 'Unpublish (save as draft)' : 'Save draft'}
              </button>
              <button type="button" className="nm-button nm-button-primary" disabled={busy} onClick={() => save('published')}>
                {existing?.status === 'published' ? 'Update post' : 'Publish'}
              </button>
              {existing && (
                <button type="button" className="nm-button nm-button-secondary" disabled={busy} onClick={remove} style={{ marginLeft: 'auto' }}>
                  Delete
                </button>
              )}
            </div>
            {message && (
              <p role="status" style={{ marginTop: '0.8rem', color: message.kind === 'ok' ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)' }}>
                {message.text}
              </p>
            )}
          </section>

          <section aria-label="Preview">
            <p style={{ ...label, marginBottom: '0.6rem' }}>Preview</p>
            <article className="prose nm-blog-preview">
              {title && <h1>{title}</h1>}
              {body ? <Markdown source={body} /> : <p style={{ color: 'var(--nm-text-muted)' }}>The post will appear here as you write.</p>}
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
    </div>
  );
}
