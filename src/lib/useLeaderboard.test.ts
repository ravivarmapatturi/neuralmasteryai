import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Real firebase.ts initializes a real Firebase App/Auth/Firestore at
// module load (initializeApp/getAuth/getFirestore), which rejects in
// jsdom -- silently caught by this hook's own catch-all, leaving
// `entries` empty with no test failure signal otherwise. Mock it away
// entirely rather than let the real module load.
vi.mock('../lib/firebase', () => ({ db: {} }))

// Overrides the global firebase/firestore mock (tests/unit/setup.ts) for
// THIS FILE ONLY -- that default mock has no collection/query/orderBy/
// limit exports at all (not needed by anything else that uses it) and a
// no-op onSnapshot, neither of which useLeaderboard.ts can run against.
// onSnapshot here synchronously invokes its callback with a fixed, real
// fake snapshot so the hook's real filtering logic actually runs.
const fakeDocs = [
  { id: 'uid-real-1', data: () => ({ displayName: 'Ada', allTimePoints: 500, weeklyPoints: 50 }) },
  { id: 'uid-test-1', data: () => ({ displayName: 'Batman', allTimePoints: 9000, weeklyPoints: 900 }) },
  { id: 'uid-test-2', data: () => ({ displayName: 'rule-test', allTimePoints: 8000, weeklyPoints: 800 }) },
  { id: 'uid-real-2', data: () => ({ displayName: 'Grace', allTimePoints: 300, weeklyPoints: 30 }) },
]

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  onSnapshot: vi.fn((_q, onNext: (snap: { docs: typeof fakeDocs }) => void) => {
    onNext({ docs: fakeDocs })
    return () => {}
  }),
}))

describe('useLeaderboard (C7 regression: known test accounts excluded)', () => {
  it('filters out Batman and rule-test, keeping real learners', async () => {
    const { useLeaderboard } = await import('./useLeaderboard')
    const { result } = renderHook(() => useLeaderboard('allTime'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const names = result.current.entries.map((e) => e.displayName)
    expect(names).toEqual(['Ada', 'Grace'])
    expect(names).not.toContain('Batman')
    expect(names).not.toContain('rule-test')
  })
})
