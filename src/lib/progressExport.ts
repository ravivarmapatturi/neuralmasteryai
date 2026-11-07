/** Back up and restore everything this site keeps in the browser (progress,
 * points, saved code, notes) as one JSON file. No account or email needed. */
const OWN_KEY = /^(neural-mastery-|nm_|nm-)/;
export const EXPORT_VERSION = 1;

export interface ProgressExport { app: 'neural-mastery'; version: number; exportedAt: string; data: Record<string, string> }

export function collectProgress(storage: Storage = window.localStorage, now = Date.now()): ProgressExport {
  const data: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && OWN_KEY.test(key)) data[key] = storage.getItem(key) ?? '';
  }
  return { app: 'neural-mastery', version: EXPORT_VERSION, exportedAt: new Date(now).toISOString(), data };
}

/** Writes a backup's keys back. Returns how many were restored; throws on a file that is not a backup. */
export function restoreProgress(text: string, storage: Storage = window.localStorage): number {
  const parsed = JSON.parse(text) as Partial<ProgressExport>;
  if (parsed.app !== 'neural-mastery' || typeof parsed.data !== 'object' || parsed.data === null) throw new Error('This file is not a Neural Mastery progress backup.');
  let n = 0;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (OWN_KEY.test(key) && typeof value === 'string') { storage.setItem(key, value); n++; }
  }
  return n;
}

export function downloadProgress() {
  const blob = new Blob([JSON.stringify(collectProgress(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neural-mastery-progress-${new Date(Date.now()).toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
