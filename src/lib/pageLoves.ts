import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';

/**
 * Page loves, like social-media likes: anyone can love a page without a
 * sign-in step. Loving uses the visitor's one account (their real account, or
 * the guest account created on the spot by the first love), so one account =
 * one love per page.
 * Firestore layout (rules in firestore.rules, "pageLoves"):
 *   pageLoves/{pageId}            { count }          public read
 *   pageLoves/{pageId}/by/{uid}   { at }             only that account
 * The counter moves by exactly 1 together with the account's own marker,
 * enforced server-side by the rules.
 * Firebase is imported lazily so this module costs nothing at load time.
 */
export const pageIdFor = (route: string) => route.replace(/^\/+|\/+$/g, '').replace(/\//g, '__') || 'home';

async function fb() {
  const [{ auth, db }, fs, au] = await Promise.all([import('./firebase'), import('firebase/firestore'), import('firebase/auth')]);
  return { auth, db: db as Firestore, fs, au };
}

/** The visitor's account id, creating a guest account if they have none. */
export async function guestId(): Promise<string> {
  const { auth, au } = await fb();
  if (auth.currentUser) return auth.currentUser.uid;
  return (await au.signInAnonymously(auth)).user.uid;
}

export async function setLove(route: string, uid: string, love: boolean): Promise<void> {
  const { db, fs } = await fb();
  const id = pageIdFor(route);
  const pageRef = fs.doc(db, 'pageLoves', id);
  const byRef = fs.doc(db, 'pageLoves', id, 'by', uid);
  await fs.runTransaction(db, async (tx) => {
    const [page, by] = await Promise.all([tx.get(pageRef), tx.get(byRef)]);
    const count = page.exists() ? (page.data().count as number) ?? 0 : 0;
    if (love && !by.exists()) {
      tx.set(byRef, { at: fs.serverTimestamp() });
      tx.set(pageRef, { count: count + 1 });
    } else if (!love && by.exists()) {
      tx.delete(byRef);
      tx.set(pageRef, { count: Math.max(0, count - 1) });
    }
  });
}

function useAccountUid() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    let off: (() => void) | undefined; let dead = false;
    fb().then(({ auth, au }) => { if (!dead) off = au.onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)); }).catch(() => {});
    return () => { dead = true; off?.(); };
  }, []);
  return uid;
}

/** Live count for one page and whether this visitor has loved it. */
export function usePageLove(route: string) {
  const uid = useAccountUid();
  const id = pageIdFor(route);
  const [count, setCount] = useState<number | null>(null);
  const [loved, setLoved] = useState(false);
  useEffect(() => {
    setCount(null);
    let off: (() => void) | undefined; let dead = false;
    fb().then(({ db, fs }) => {
      if (dead) return;
      off = fs.onSnapshot(fs.doc(db, 'pageLoves', id), (s) => setCount(s.exists() ? (s.data().count as number) ?? 0 : 0), () => setCount(null));
    }).catch(() => {});
    return () => { dead = true; off?.(); };
  }, [id]);
  useEffect(() => {
    if (!uid) { setLoved(false); return; }
    let off: (() => void) | undefined; let dead = false;
    fb().then(({ db, fs }) => {
      if (dead) return;
      off = fs.onSnapshot(fs.doc(db, 'pageLoves', id, 'by', uid), (s) => setLoved(s.exists()), () => setLoved(false));
    }).catch(() => {});
    return () => { dead = true; off?.(); };
  }, [id, uid]);
  return { count, loved, setLoved };
}

/** Live total of loves across every page (for the home page). */
export function useTotalLoves() {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let off: (() => void) | undefined; let dead = false;
    fb().then(({ db, fs }) => {
      if (dead) return;
      off = fs.onSnapshot(fs.collection(db, 'pageLoves'),
        (snap) => setTotal(snap.docs.reduce((s, d) => s + ((d.data().count as number) ?? 0), 0)),
        () => setTotal(null));
    }).catch(() => {});
    return () => { dead = true; off?.(); };
  }, []);
  return total;
}
