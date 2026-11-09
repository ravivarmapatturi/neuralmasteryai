import type { Firestore } from 'firebase/firestore';
// This alias replaces src/lib/firebase before module evaluation. No production
// configuration or Analytics module is imported by the emulator harness.
export let db: Firestore;
export function useEmulatorDatabase(next: Firestore) {
  if (next.app.options.projectId !== 'demo-neuralmastery') throw new Error('Demo project required');
  db = next;
}
