import { useTranslation } from 'react-i18next';
import { useRunStore } from '../../stores/runStore';
import { useProfileStore } from '../../stores/profileStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import {
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export default function ResultLog() {
  const { t } = useTranslation();
  const { progressUpdates, summary, reset } = useRunStore();
  const { currentProfile } = useProfileStore();
  const { openFolderInExplorer } = useTauriCommands();

  const handleOpenOutputFolder = async () => {
    if (!currentProfile) return;
    try {
      await openFolderInExplorer(currentProfile.output.directory);
    } catch (err) {
      alert(`Failed to open directory: ${err}`);
    }
  };

  const hasLogs = Object.keys(progressUpdates).length > 0;

  if (!hasLogs) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Control Actions */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <h3 className="text-lg font-bold text-slate-200">
            Process Execution Reports
          </h3>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-cyan-400 font-bold px-3 py-1.5 rounded transition-all text-slate-400"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('run.reset')}
        </button>
      </div>

      {/* Done summary Scorecard */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 bg-slate-950 border border-slate-850 p-4 rounded-xl shadow-inner">
          <div className="text-center p-2 border-r border-slate-900">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Total Queue
            </span>
            <span className="text-2xl font-black text-slate-200 mt-1 block">
              {summary.total}
            </span>
          </div>
          
          <div className="text-center p-2 border-r border-slate-900">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {t('run.success_count')}
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {summary.success}
            </span>
          </div>

          <div className="text-center p-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {t('run.error_count')}
            </span>
            <span className={`text-2xl font-black mt-1 block ${summary.error > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-600'}`}>
              {summary.error}
            </span>
          </div>
        </div>
      )}

      {/* Detail list items */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {Object.values(progressUpdates).map((prog, idx) => {
          if (prog.status === 'pending') return null;

          return (
            <div
              key={idx}
              className={`p-4 rounded-lg border text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 transition-all ${
                prog.status === 'success'
                  ? 'bg-emerald-950/10 border-emerald-950/80 text-slate-300'
                  : 'bg-rose-950/10 border-rose-950/80 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {prog.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="font-bold text-slate-200 block truncate" title={prog.file}>
                    {prog.file}
                  </span>
                  
                  {prog.status === 'success' ? (
                    <div className="flex flex-col gap-1 mt-1 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1 font-mono break-all text-slate-400">
                        <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                        <span>Report: {prog.output}</span>
                      </div>
                      <div className="flex gap-4 pl-4 text-slate-500">
                        <span>✓ {prog.rowsProcessed} rows completed</span>
                        <span>⏱ {prog.durationMs}ms</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-rose-400/90 font-medium pl-4 border-l border-rose-950 text-[10px] mt-1 break-words font-sans">
                      {prog.errorMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Action specific to item */}
              {prog.status === 'success' && prog.output && (
                <button
                  onClick={() => prog.output && openFolderInExplorer(prog.output)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-cyan-400 font-semibold text-[10px] transition-all text-slate-400"
                  title="Open report in folder"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Directory Action */}
      {currentProfile && (
        <div className="bg-slate-950 border border-slate-850/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Output Directory
            </span>
            <span className="font-mono text-[10px] text-slate-400 break-all select-all mt-0.5" title={currentProfile.output.directory}>
              {currentProfile.output.directory}
            </span>
          </div>
          
          <button
            onClick={handleOpenOutputFolder}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition-colors shrink-0"
          >
            <FolderOpen className="w-4 h-4" />
            {t('settings.open_in_explorer')}
          </button>
        </div>
      )}

    </div>
  );
}
