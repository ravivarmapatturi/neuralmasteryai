import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { mergeInterviewAttempts, type InterviewAttempt } from './interviewAttempts';

export async function syncInterviewAttempts(uid: string, local: InterviewAttempt[]) {
  return runTransaction(db, async tx => {
    const ref = doc(db, 'progress', uid);
    const snap = await tx.get(ref);
    const merged = mergeInterviewAttempts(snap.data()?.interviewAttempts, local);
    tx.set(ref, { interviewAttempts: merged }, { merge: true });
    return merged;
  });
}
export function watchInterviewAttempts(uid: string, next: (attempts: InterviewAttempt[]) => void, failed: () => void) {
  return onSnapshot(doc(db, 'progress', uid), snap => next(mergeInterviewAttempts(snap.data()?.interviewAttempts)), failed);
}
