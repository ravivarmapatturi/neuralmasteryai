/**
 * Blog posts written from the site (/blog/write), stored in Firestore at
 * blogPosts/{slug}. Posts in src/content/blog/*.mdx are the other kind;
 * the blog shows both.
 *
 * Who may write is enforced by firestore.rules, not here: a signed-in,
 * email-verified admin (ADMIN_EMAILS below, or an admins/{uid} document
 * added in the Firebase console). The client check in useIsAdmin only
 * decides whether to show the editor.
 *
 * Firebase is imported dynamically, like the leaderboard, so readers who
 * never open the blog don't download the Firestore SDK.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/** Must match isAdmin() in firestore.rules. */
export const ADMIN_EMAILS = ['ravivarmapatturi@gmail.com'];

export type PostStatus = 'draft' | 'published';

export interface StoredPost {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  /** Markdown: GFM, maths with $...$, fenced code. */
  body: string;
  status: PostStatus;
  /** YYYY-MM-DD, set when first published. */
  date: string | null;
  authorName: string;
  updatedAt: number;
}

const COLLECTION = 'blogPosts';

async function firestore() {
  const [{ db }, fs] = await Promise.all([import('./firebase'), import('firebase/firestore')]);
  return { db, ...fs };
}

export async function listPublishedPosts(): Promise<StoredPost[]> {
  const { db, collection, query, where, getDocs } = await firestore();
  const snap = await getDocs(query(collection(db, COLLECTION), where('status', '==', 'published')));
  return snap.docs.map((d) => d.data() as StoredPost);
}

/** Admins only (the rules refuse anyone else): drafts included. */
export async function listAllPosts(): Promise<StoredPost[]> {
  const { db, collection, getDocs } = await firestore();
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => d.data() as StoredPost);
}

/** A published post for anyone, or any post for an admin. null if missing or not allowed. */
export async function getStoredPost(slug: string): Promise<StoredPost | null> {
  const { db, doc, getDoc } = await firestore();
  try {
    const snap = await getDoc(doc(db, COLLECTION, slug));
    return snap.exists() ? (snap.data() as StoredPost) : null;
  } catch {
    return null; // permission denied for a draft
  }
}

export async function saveStoredPost(post: StoredPost): Promise<void> {
  const { db, doc, setDoc } = await firestore();
  await setDoc(doc(db, COLLECTION, post.slug), post);
}

export async function deleteStoredPost(slug: string): Promise<void> {
  const { db, doc, deleteDoc } = await firestore();
  await deleteDoc(doc(db, COLLECTION, slug));
}

/** Lowercase words joined by hyphens, as in the file-based post slugs. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** Whether to show the editor. The real check is in firestore.rules. */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [listedAdmin, setListedAdmin] = useState(false);
  const byEmail = Boolean(user?.emailVerified && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    if (!user || byEmail) return;
    let cancelled = false;
    firestore()
      .then(({ db, doc, getDoc }) => getDoc(doc(db, 'admins', user.uid)))
      .then((snap) => {
        if (!cancelled) setListedAdmin(snap.exists());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, byEmail]);

  return byEmail || listedAdmin;
}
