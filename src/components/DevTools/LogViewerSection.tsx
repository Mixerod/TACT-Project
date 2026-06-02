import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import {
  DevLogEntry,
  LogLevel,
  clearDevLogs,
  subscribeDevLogs,
} from '../../lib/devLogger';
import { LOG_LEVELS, LEVEL_STYLES } from './constants';

type Filter = LogLevel | 'ALL';

const formatTime = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3
  )}`;
};

export default function LogViewerSection() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ReadonlyArray<DevLogEntry>>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => subscribeDevLogs(setLogs), []);

  const visible =
    filter === 'ALL' ? logs : logs.filter((l) => l.level === filter);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, autoScroll]);

  return (
    <div className="space-y-2 flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 flex-wrap">
        {(['ALL', ...LOG_LEVELS] as Filter[]).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
              filter === level
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-700/60'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {level}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setAutoScroll((v) => !v)}
          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
            autoScroll
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
        >
          {t('devtools.autoscroll')}
        </button>
        <button
          onClick={clearDevLogs}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border bg-slate-950 text-slate-400 border-slate-800 hover:text-red-400 hover:border-red-800/50 transition-all"
        >
          <Trash2 className="w-3 h-3" />
          {t('devtools.clear')}
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-auto font-mono text-[11px] leading-relaxed">
        {visible.length === 0 ? (
          <p className="text-slate-600 text-center py-4">{t('devtools.no_logs')}</p>
        ) : (
          visible.map((entry) => (
            <div key={entry.id} className="py-0.5 border-b border-slate-900/60">
              <div className="flex items-start gap-2">
                <span className="text-slate-600 shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <span
                  className={`shrink-0 font-bold w-12 ${LEVEL_STYLES[entry.level]}`}
                >
                  {entry.level}
                </span>
                <span className="text-slate-500 shrink-0 w-14">
                  [{entry.source}]
                </span>
                <span className="text-slate-200 whitespace-pre-wrap break-all">
                  {entry.message}
                </span>
              </div>
              {entry.detail && (
                <pre className="ml-[6.5rem] mt-0.5 text-slate-400 whitespace-pre-wrap break-all">
                  {entry.detail}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
