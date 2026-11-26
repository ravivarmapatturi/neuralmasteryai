import { createContext, useContext } from 'react';

/**
 * Whether animated diagrams start playing on their own. Learn pages keep the
 * default (true); the /playground tool pages set it to false so every tool
 * opens paused and the reader presses Play.
 */
export const AutoplayDefaultContext = createContext(true);
export const useAutoplayDefault = () => useContext(AutoplayDefaultContext);
