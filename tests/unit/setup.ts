import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Every unit test runs against a mocked Firebase, never the real SDK --
// jsdom has no real network, and even if it did, a unit test should never
// depend on a live Firebase project. Defaults to "no signed-in user" (the
// overwhelming majority of tests never touch auth at all, and this keeps
// ProgressContext's signed-out/localStorage-only path exercised, matching
// pre-Firebase behavior exactly). Any test that specifically needs a
// signed-in user or particular Firestore data imports these same mocked
// functions from 'firebase/auth'/'firebase/firestore' and overrides them
// with vi.mocked(...).mockImplementation(...) for that file.
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider(this: unknown) {
    return this
  }),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null)
    return () => {}
  }),
  signInWithPopup: vi.fn().mockResolvedValue({ user: null }),
  signInWithRedirect: vi.fn().mockResolvedValue(undefined),
  getRedirectResult: vi.fn().mockResolvedValue(null),
  signOut: vi.fn().mockResolvedValue(undefined),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: null }),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({ user: null }),
}))
const mockGetDoc = vi.fn().mockResolvedValue({ exists: () => false, data: () => undefined })
const mockSetDoc = vi.fn().mockResolvedValue(undefined)

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn(() => ({})),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  runTransaction: vi.fn(async (_db: unknown, updateFunction: (tx: { get: (ref: unknown) => Promise<unknown>; set: (ref: unknown, data: unknown, opts?: unknown) => void }) => Promise<unknown>) => {
    return updateFunction({
      get: (ref: unknown) => mockGetDoc(ref as never),
      set: (ref: unknown, data: unknown, opts?: unknown) => mockSetDoc(ref as never, data as never, opts as never),
    });
  }),
  onSnapshot: vi.fn(() => () => {}),
  enableNetwork: vi.fn().mockResolvedValue(undefined),
  disableNetwork: vi.fn().mockResolvedValue(undefined),
}))
// isSupported() defaults to false here -- jsdom has no real IndexedDB, so
// this matches what the real check would conclude in this environment
// anyway, and keeps trackPageView's analyticsPromise resolving to null
// (a real no-op) rather than a test depending on a fully-mocked Analytics
// instance it doesn't actually need.
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  isSupported: vi.fn().mockResolvedValue(false),
  setConsent: vi.fn(),
  logEvent: vi.fn(),
}))

// @testing-library/react auto-registers afterEach(cleanup) for Jest, but
// not for Vitest -- without this, each test's rendered DOM accumulates in
// the shared jsdom document body across the whole file, and a later test's
// screen.getByText() ambiguously matches leftover nodes from an earlier one.
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement IntersectionObserver at all (a known, long-standing
// gap -- it has no concept of layout/viewport geometry to compute
// intersections from). A minimal no-op stub is enough for components that
// construct one (e.g. TableOfContents's scroll-spy) to render without
// throwing; tests that need real intersection callbacks invoke them
// directly rather than relying on this stub to fire.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
// @ts-expect-error -- intentionally partial, see comment above
globalThis.IntersectionObserver = MockIntersectionObserver

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- intentionally partial
globalThis.ResizeObserver = globalThis.ResizeObserver || MockResizeObserver

// jsdom also doesn't implement window.matchMedia (it has no real rendering
// engine to evaluate media queries against) -- ThemeProvider's
// prefers-color-scheme fallback needs SOME implementation to not throw.
// Always reports no-match (light mode / no reduced-motion preference);
// tests that need a specific match should override window.matchMedia
// themselves rather than relying on this default.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
}

// jsdom has no real layout engine, so Range.getClientRects()/getBoundingClientRect()
// don't exist at all -- CodeMirror 6 (CodeEditor.tsx) calls these on every
// measure pass to lay out text, and throws without them. Real zero-rects
// (not real geometry, since jsdom can't produce that) are enough for CM6 to
// render and accept input in tests; a well-known, widely-used workaround for
// testing CM6/ProseMirror-style editors under jsdom, not specific to this repo.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({
    item: () => null,
    length: 0,
    [Symbol.iterator]: function* () {},
  }) as unknown as DOMRectList
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => '' }) as DOMRect
}
