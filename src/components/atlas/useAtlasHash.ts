import { useEffect, useState } from 'react';

const readHash = () => (typeof window === 'undefined' ? '' : decodeURIComponent(window.location.hash.slice(1)));

/** The atlas entry named in the URL hash, if it is one of `ids`. */
export function atlasHashEntry(ids: readonly string[]) {
  const id = readHash();
  return ids.includes(id) ? id : null;
}

/** Points the URL at an entry without adding a history step. */
export function setAtlasHash(id: string | null) {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', id ? `${pathname}${search}#${id}` : `${pathname}${search}`);
}

/** Opens the entry named in the hash on load and scrolls it into view. */
export function useAtlasHashEntry(ids: readonly string[]) {
  const [open, setOpenState] = useState<string | null>(() => atlasHashEntry(ids));
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(open);
    el?.scrollIntoView({ block: 'start' });
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setOpen = (id: string | null) => {
    setOpenState(id);
    setAtlasHash(id);
  };
  return [open, setOpen] as const;
}
