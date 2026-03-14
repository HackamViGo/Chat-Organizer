/* eslint-disable no-console */
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (area: string, msg?: unknown, data?: unknown) => {
    const finalArea = msg !== undefined ? area : 'app';
    const finalMsg = msg !== undefined ? msg : area;
    if (isDev) console.debug(`%c[BrainBox:${finalArea}]`, 'color:#3b82f6;font-weight:bold;', finalMsg, data ?? '');
  },
  info: (area: string, msg?: unknown, data?: unknown) => {
    const finalArea = msg !== undefined ? area : 'app';
    const finalMsg = msg !== undefined ? msg : area;
    if (isDev) console.log(`[BrainBox:${finalArea}]`, finalMsg, data ?? '');
  },
  warn: (area: string, msg?: unknown, data?: unknown) => {
    const finalArea = msg !== undefined ? area : 'app';
    const finalMsg = msg !== undefined ? msg : area;
    if (isDev) console.warn(`[BrainBox:${finalArea}] ⚠️`, finalMsg, data ?? '');
  },
  error: (area: string, msg?: unknown, data?: unknown) => {
    const finalArea = msg !== undefined ? area : 'app';
    const finalMsg = msg !== undefined ? msg : area;
    console.error(`[BrainBox:${finalArea}] 🚨`, finalMsg, data ?? '');
  }
};
