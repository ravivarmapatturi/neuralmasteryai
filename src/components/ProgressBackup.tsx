import { useRef, useState } from 'react';
import { downloadProgress, restoreProgress } from '../lib/progressExport';

/** Download or restore a JSON backup of everything saved in this browser. */
export default function ProgressBackup() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  async function restore(file: File) {
    try {
      const n = restoreProgress(await file.text());
      setMessage(`Restored ${n} saved items. Reloading…`);
      window.setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setMessage(e instanceof Error && e.message.startsWith('This file') ? e.message : 'Could not read that file.');
    }
  }
  return (
    <section aria-labelledby="backup-heading" className="nm-progress-backup">
      <h2 id="backup-heading">Back up your progress</h2>
      <p>Download a file with your completed pages, points, saved code and notes from this browser. Restore it here on another device or browser. No account or email needed.</p>
      <div>
        <button type="button" onClick={downloadProgress}>Download backup</button>
        <button type="button" onClick={() => input.current?.click()}>Restore from file</button>
        <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ''; }} />
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
