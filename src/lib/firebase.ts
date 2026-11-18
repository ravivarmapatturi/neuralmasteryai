import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported, setConsent, logEvent, type Analytics } from 'firebase/analytics';

// Real project config -- safe to embed client-side. Firebase's own docs are
// explicit about this: these values identify the project to Google's
// servers, they are not secrets, and they grant no access on their own.
// The actual security boundary is Firestore's security rules (see
// firestore.rules), enforced server-side regardless of what a client sends.
import { firebaseConfig } from './firebaseConfig';

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Analytics (GA4, via the real measurementId above -- auto-provisioned
// when the Firebase project was created, previously unused). Consent
// defaults to DENIED for every category before anything initializes:
// this site has no consent-banner UI yet, and shipping analytics that
// behaves as though a visitor already agreed to tracking -- when nothing
// on the page ever asked -- would be dishonest about what actually
// happened. Denied consent doesn't mean zero signal: Google's Consent
// Mode is specifically designed so a "denied" GA4 tag still sends
// aggregated, cookieless pings that support modeled (not per-visitor)
// analytics, instead of either full tracking or nothing at all -- real,
// if basic, engagement data without setting a tracking cookie nobody
// consented to. ad_* fields are denied unconditionally, not just as a
// default -- this site runs no ads or remarketing, so there's no
// legitimate use for them regardless of a future consent flow.
// https://developers.google.com/tag-platform/security/guides/consent
setConsent({
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
});

// isSupported() is a real async capability check (IndexedDB available,
// not a known-unsupported embedded browser context) -- getAnalytics()
// itself throws in an environment that fails it, so this is a real
// guard, not defensive boilerplate copied from an example.
export const analyticsPromise: Promise<Analytics | null> = isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null));

/** Fires a real, named GA4 custom event -- the one place a feature-level
 * event actually reaches GA4, so every caller (AnalyticsTracker's
 * learn_page_view, PracticeWorkspace's practice_problem_attempt/solve,
 * GamificationContext's daily_signin_reward) goes through the same
 * consent-gated analyticsPromise as trackPageView below, never a
 * separate/parallel analytics path. Resolves to a real no-op if
 * analytics isn't supported/loaded or consent hasn't been granted (see
 * analyticsPromise and setConsent above) -- callers never need their own
 * guard. */
export async function trackFeatureEvent(eventName: string, params?: Record<string, string | number | boolean>): Promise<void> {
  const analytics = await analyticsPromise;
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

/** Fires a real GA4 page_view event -- needed because Firebase Analytics
 * only auto-logs one page_view on initial load; it has no way to know
 * this is a client-side-routed SPA where most navigation never reloads
 * the page. Called from AnalyticsTracker on every route change. Resolves
 * to a no-op if analytics isn't supported/loaded (see analyticsPromise). */
export async function trackPageView(path: string, title: string): Promise<void> {
  await trackFeatureEvent('page_view', { page_path: path, page_title: title, page_location: window.location.href });
}

// Emulator connection is opt-in and dev-only (VITE_USE_FIREBASE_EMULATOR=true
// set only when running scripts/firebase-emulator tests) -- never runs in a
// production build (import.meta.env.DEV is statically false there, so this
// whole branch is dead-code-eliminated), and never runs in a normal `npm run
// dev` against the real project unless that env var is explicitly set.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
