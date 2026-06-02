import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Activity } from 'lucide-react';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { usePythonApi } from '../../hooks/usePythonApi';
import { addDevLog } from '../../lib/devLogger';

type SidecarStatus = 'running' | 'starting' | 'dead';

const STATUS_DOT: Record<SidecarStatus, string> = {
  running: 'bg-green-500 shadow-green-500/50',
  starting: 'bg-yellow-500 shadow-yellow-500/50 animate-pulse',
  dead: 'bg-red-500 shadow-red-500/50 animate-pulse',
};

export default function SidecarStatusSection() {
  const { t } = useTranslation();
  const { getSidecarStatus, restartPythonSidecar } = useTauriCommands();
  const { checkHealth } = usePythonApi();

  const [status, setStatus] = useState<SidecarStatus>('starting');
  const [rawHealth, setRawHealth] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const next = await getSidecarStatus();
        if (active) setStatus(next);
      } catch {
        if (active) setStatus('dead');
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleRestart = async () => {
    setStatus('starting');
    addDevLog('INFO', 'tauri', 'Restarting Python sidecar…');
    try {
      await restartPythonSidecar();
      addDevLog('INFO', 'tauri', 'Sidecar restart command sent');
    } catch (err) {
      addDevLog('ERROR', 'tauri', 'Sidecar restart failed', err);
    }
  };

  const handleTestHealth = async () => {
    setIsTesting(true);
    const startedAt = performance.now();
    try {
      const health = await checkHealth();
      const ms = Math.round(performance.now() - startedAt);
      const text = JSON.stringify(health, null, 2);
      setRawHealth(text);
      addDevLog('INFO', 'python', `GET /health → 200 (${ms}ms)`, health);
    } catch (err) {
      const ms = Math.round(performance.now() - startedAt);
      const text =
        err instanceof Error ? err.message : JSON.stringify(err, null, 2);
      setRawHealth(text);
      addDevLog('ERROR', 'python', `GET /health failed (${ms}ms)`, err);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('sidecar.status')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
          <span className="text-xs font-bold uppercase text-slate-200">
            {status === 'running'
              ? t('sidecar.running')
              : status === 'starting'
                ? t('sidecar.starting')
                : t('sidecar.dead')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleRestart}
          className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold py-2 rounded transition-all text-slate-300 hover:text-cyan-400"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('sidecar.restart')}
        </button>
        <button
          onClick={handleTestHealth}
          disabled={isTesting}
          className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold py-2 rounded transition-all text-slate-300 hover:text-cyan-400 disabled:opacity-50"
        >
          <Activity className="w-3.5 h-3.5" />
          {t('devtools.test_health')}
        </button>
      </div>

      {rawHealth !== null && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
            {t('devtools.raw_response')}
          </p>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {rawHealth}
          </pre>
        </div>
      )}
    </div>
  );
}
