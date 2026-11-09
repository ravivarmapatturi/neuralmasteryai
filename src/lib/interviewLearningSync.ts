import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { mergeInterviewLearning, type InterviewLearning } from './interviewLearning';

export async function syncInterviewLearning(uid: string, local: InterviewLearning[]) {
  return runTransaction(db, async tx => {
    const ref = doc(db, 'progress', uid);
    const snap = await tx.get(ref);
    const merged = mergeInterviewLearning(snap.data()?.interviewLearning, local);
    tx.set(ref, { interviewLearning: merged }, { merge: true });
    return merged;
  });
}
export function watchInterviewLearning(uid: string, next: (attempts: InterviewLearning[]) => void, failed: () => void) {
  return onSnapshot(doc(db, 'progress', uid), snap => next(mergeInterviewLearning(snap.data()?.interviewLearning)), failed);
}
