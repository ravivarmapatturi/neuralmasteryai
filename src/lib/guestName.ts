import type { User } from 'firebase/auth';

// Friendly guest names: an adjective plus a pioneer of AI, maths or computing,
// e.g. "Curious Turing". Picked from the guest's id, so the same guest always
// keeps the same name. Guests are never shown on the public leaderboard, so
// these names are only seen by the guest themself.
const ADJ = ['Curious', 'Brave', 'Clever', 'Swift', 'Bright', 'Calm', 'Bold', 'Keen', 'Witty', 'Sharp', 'Steady', 'Eager', 'Lucky', 'Quiet', 'Sunny', 'Happy'];
const PIONEERS = ['Turing', 'Lovelace', 'Hopper', 'Shannon', 'Ramanujan', 'Noether', 'Gauss', 'Euler', 'Hinton', 'Bengio', 'LeCun', 'Fei-Fei', 'McCarthy', 'Minsky', 'Babbage', 'Boole', 'Hamilton', 'Johnson', 'Raman', 'Bose'];

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export function guestNameFor(uid: string): string {
  const h = hash(uid);
  return `${ADJ[h % ADJ.length]} ${PIONEERS[(h >>> 8) % PIONEERS.length]}`;
}

/** Saves the friendly name as the guest account's display name (once). */
export async function ensureGuestName(user: User): Promise<string | null> {
  if (!user.isAnonymous) return null;
  if (user.displayName && !/^Neural_Guest/.test(user.displayName)) return user.displayName;
  const { updateProfile } = await import('firebase/auth');
  const name = guestNameFor(user.uid);
  await updateProfile(user, { displayName: name });
  return name;
}
