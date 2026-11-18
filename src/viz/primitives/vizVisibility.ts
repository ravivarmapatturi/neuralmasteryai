import { createContext, useContext } from 'react';

/** True while the surrounding diagram frame is on screen. Live diagrams pause
 * when it is false, so nothing above or below the reader changes while they
 * read (which would make the page jump). Defaults to true outside a frame. */
export const VizVisibleContext = createContext(true);
export const useVizVisible = () => useContext(VizVisibleContext);
