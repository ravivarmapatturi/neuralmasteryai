import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

// Loves work like social-media likes: anyone can love a page without signing in.
// Each browser gets a silent guest identity from a SEPARATE Firebase app
// instance, so the site's real sign-in state is never touched. The guest id
// is remembered by the browser, so one browser = one love per page.
const loveApp = initializeApp(firebaseConfig, 'loves');
const loveAuth = getAuth(loveApp);
const db = getFirestore(loveApp);

let guestPromise: Promise<string> | null = null;
export function guestId(): Promise<string> {
  if (loveAuth.currentUser) return Promise.resolve(loveAuth.currentUser.uid);
  guestPromise ??= signInAnonymously(loveAuth).then((c) => c.user.uid).finally(() => { guestPromise = null; });
  return guestPromise;
}

/** The guest id once the browser has one (null before the first love). */
function useGuestUid() {
  const [uid, setUid] = useState<string | null>(loveAuth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(loveAuth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

/**
 * Page loves. Firestore layout (rules in firestore.rules, "pageLoves"):
 *   pageLoves/{pageId}            { count }          public read
 *   pageLoves/{pageId}/by/{uid}   { at }             only that user
 * A signed-in reader can love a page once; the counter moves by exactly 1
 * together with their own marker, enforced server-side by the rules.
 */
export const pageIdFor = (route: string) => route.replace(/^\/+|\/+$/g, '').replace(/\//g, '__') || 'home';

export async function setLove(route: string, uid: string, love: boolean): Promise<void> {
  const id = pageIdFor(route);
  const pageRef = doc(db, 'pageLoves', id);
  const byRef = doc(db, 'pageLoves', id, 'by', uid);
  await runTransaction(db, async (tx) => {
    const [page, by] = await Promise.all([tx.get(pageRef), tx.get(byRef)]);
    const count = page.exists() ? (page.data().count as number) ?? 0 : 0;
    if (love && !by.exists()) {
      tx.set(byRef, { at: serverTimestamp() });
      tx.set(pageRef, { count: count + 1 });
    } else if (!love && by.exists()) {
      tx.delete(byRef);
      tx.set(pageRef, { count: Math.max(0, count - 1) });
    }
  });
}

/** Live count for one page and whether this browser has loved it. */
export function usePageLove(route: string) {
  const uid = useGuestUid();
  const id = pageIdFor(route);
  const [count, setCount] = useState<number | null>(null);
  const [loved, setLoved] = useState(false);
  useEffect(() => {
    setCount(null);
    return onSnapshot(doc(db, 'pageLoves', id), (s) => setCount(s.exists() ? (s.data().count as number) ?? 0 : 0), () => setCount(null));
  }, [id]);
  useEffect(() => {
    if (!uid) { setLoved(false); return; }
    return onSnapshot(doc(db, 'pageLoves', id, 'by', uid), (s) => setLoved(s.exists()), () => setLoved(false));
  }, [id, uid]);
  return { count, loved, setLoved };
}

/** Live total of loves across every page (for the home page). */
export function useTotalLoves() {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => onSnapshot(collection(db, 'pageLoves'),
    (snap) => setTotal(snap.docs.reduce((s, d) => s + ((d.data().count as number) ?? 0), 0)),
    () => setTotal(null)), []);
  return total;
}
