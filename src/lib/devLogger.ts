// Dev-only in-memory log store.
//
// Captures console output, uncaught errors, and Python sidecar API activity
// into a single ring buffer that the Debug Panel's Log Viewer can subscribe to.
// This module is only ever imported behind an `import.meta.env.DEV` guard.

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export type LogSource = 'console' | 'window' | 'python' | 'tauri' | 'devtools';

export interface DevLogEntry {
  id: number;
  timestamp: number; // epoch ms
  level: LogLevel;
  source: LogSource;
  message: string;
  detail?: string; // optional raw payload (stringified)
}

const MAX_ENTRIES = 500;

type Listener = (entries: ReadonlyArray<DevLogEntry>) => void;

let entries: DevLogEntry[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
let initialized = false;

const notify = (): void => {
  // Hand subscribers a frozen snapshot so they can't mutate the buffer.
  const snapshot = entries.slice();
  listeners.forEach((listener) => listener(snapshot));
};

const stringify = (value: unknown): string => {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const addDevLog = (
  level: LogLevel,
  source: LogSource,
  message: string,
  detail?: unknown
): void => {
  const entry: DevLogEntry = {
    id: nextId++,
    timestamp: Date.now(),
    level,
    source,
    message,
    detail: detail === undefined ? undefined : stringify(detail),
  };

  entries = [...entries, entry];
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES);
  }
  notify();
};

export const clearDevLogs = (): void => {
  entries = [];
  notify();
};

export const getDevLogs = (): ReadonlyArray<DevLogEntry> => entries;

export const subscribeDevLogs = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(entries.slice());
  return () => {
    listeners.delete(listener);
  };
};

const formatConsoleArgs = (args: unknown[]): string =>
  args
    .map((arg) => (typeof arg === 'string' ? arg : stringify(arg)))
    .join(' ');

// Patch console.* so anything the app already logs flows into the Log Viewer.
// Original methods are preserved and still called, so the devtools console is intact.
export const initDevLogger = (): void => {
  if (initialized) return;
  initialized = true;

  const original = {
    debug: console.debug.bind(console),
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const wrap =
    (level: LogLevel, native: (...args: unknown[]) => void) =>
    (...args: unknown[]): void => {
      native(...args);
      // Never let logging throw; that would be worse than a dropped log line.
      try {
        addDevLog(level, 'console', formatConsoleArgs(args));
      } catch {
        /* swallow: logging must never break the app */
      }
    };

  console.debug = wrap('DEBUG', original.debug);
  console.log = wrap('INFO', original.log);
  console.info = wrap('INFO', original.info);
  console.warn = wrap('WARNING', original.warn);
  console.error = wrap('ERROR', original.error);

  window.addEventListener('error', (event) => {
    addDevLog(
      'ERROR',
      'window',
      event.message || 'Uncaught error',
      event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : stringify(reason);
    addDevLog(
      'ERROR',
      'window',
      `Unhandled promise rejection: ${message}`,
      reason instanceof Error ? reason.stack : undefined
    );
  });

  addDevLog('INFO', 'devtools', 'Dev logger initialized');
};
