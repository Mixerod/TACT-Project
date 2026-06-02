import { useState, useEffect } from 'react';
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
  const { openFolderInExplorer, getAppConfig } = useTauriCommands();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Sync theme
  useEffect(() => {
    getAppConfig().then((config) => {
      if (config && config.theme) setTheme(config.theme);
    }).catch(console.error);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

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
    <div className={`border rounded-2xl p-6 shadow-sm space-y-6 transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950' : 'bg-white border-slate-200/60 shadow-slate-100'
    }`}>
      
      {/* Header & Control Actions */}
      <div className={`flex justify-between items-center border-b pb-4.5 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📊</span>
          <h3 className={`text-base font-black uppercase tracking-wider ${
            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
          }`}>
            Báo cáo kết quả xử lý (Process Reports)
          </h3>
        </div>
        <button
          onClick={reset}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all shadow-sm cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-950 border-slate-850 hover:border-slate-700 hover:text-cyan-400 text-slate-400'
              : 'bg-white border-slate-200 hover:border-slate-350 hover:text-cyan-600 text-slate-650'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('run.reset')}
        </button>
      </div>

      {/* Done summary Scorecard */}
      {summary && (
        <div className={`grid grid-cols-3 gap-4 border p-4.5 rounded-xl shadow-inner transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-950 border-slate-850/80' : 'bg-slate-50 border-slate-200/60'
        }`}>
          <div className={`text-center p-1 border-r ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}>
            <span className={`text-[9px] font-black uppercase tracking-widest block ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
            }`}>
              Tổng số hàng đợi
            </span>
            <span className={`text-2xl font-black mt-1.5 block ${
              theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {summary.total}
            </span>
          </div>
          
          <div className={`text-center p-1 border-r ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}>
            <span className={`text-[9px] font-black uppercase tracking-widest block ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
            }`}>
              {t('run.success_count')}
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block animate-pulse">
              {summary.success}
            </span>
          </div>

          <div className="text-center p-1">
            <span className={`text-[9px] font-black uppercase tracking-widest block ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
            }`}>
              {t('run.error_count')}
            </span>
            <span className={`text-2xl font-black mt-1.5 block ${
              summary.error > 0 
                ? 'text-rose-600 dark:text-rose-450 animate-bounce' 
                : theme === 'dark' ? 'text-slate-700' : 'text-slate-350'
            }`}>
              {summary.error}
            </span>
          </div>
        </div>
      )}

      {/* Detail list items */}
      <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
        {Object.values(progressUpdates).map((prog, idx) => {
          if (prog.status === 'pending') return null;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 shadow-sm ${
                prog.status === 'success'
                  ? theme === 'dark'
                    ? 'bg-emerald-950/10 border-emerald-950/80 text-slate-300'
                    : 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                  : theme === 'dark'
                    ? 'bg-rose-950/10 border-rose-950/80 text-slate-300'
                    : 'bg-rose-50/50 border-rose-200 text-slate-750'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                {prog.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                )}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className={`font-bold block truncate text-[13px] ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`} title={prog.file}>
                    {prog.file.split(/[/\\]/).pop()}
                  </span>
                  
                  {prog.status === 'success' ? (
                    <div className="flex flex-col gap-1 mt-1 text-[11px] leading-relaxed">
                      <div className={`flex items-center gap-1 font-mono break-all ${
                        theme === 'dark' ? 'text-slate-450' : 'text-slate-550'
                      }`}>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="font-semibold">Báo cáo: {prog.output?.split(/[/\\]/).pop()}</span>
                      </div>
                      <div className={`flex gap-4 pl-4.5 font-semibold ${
                        theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
                      }`}>
                        <span>✓ {prog.rowsProcessed} dòng dệt QC hoàn thành</span>
                        <span>⏱ {prog.durationMs}ms</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`font-semibold pl-4.5 border-l text-[10px] mt-1.5 break-words font-sans ${
                      theme === 'dark' ? 'border-rose-900 text-rose-400' : 'border-rose-200 text-rose-700'
                    }`}>
                      {prog.errorMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Action specific to item */}
              {prog.status === 'success' && prog.output && (
                <button
                  onClick={() => prog.output && openFolderInExplorer(prog.output)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm shrink-0 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-750 hover:text-cyan-400 text-slate-450'
                      : 'bg-white border-slate-200 hover:border-slate-350 hover:text-cyan-600 text-slate-650'
                  }`}
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
        <div className={`border p-4.5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-950 border-slate-850/80 shadow-slate-950' : 'bg-slate-50 border-slate-200/50'
        }`}>
          <div className="flex flex-col text-left space-y-1.5 w-full">
            <span className={`text-[9px] font-black uppercase tracking-widest ${
              theme === 'dark' ? 'text-slate-550' : 'text-slate-450'
            }`}>
              Thư mục lưu báo cáo dệt QC
            </span>
            <span className={`font-mono text-[10px] break-all select-all font-bold ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
            }`} title={currentProfile.output.directory}>
              {currentProfile.output.directory}
            </span>
          </div>
          
          <button
            onClick={handleOpenOutputFolder}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white font-extrabold py-3 px-5.5 rounded-xl text-xs transition-all shadow-sm hover:shadow-indigo-500/10 cursor-pointer shrink-0 active:scale-[0.99]"
          >
            <FolderOpen className="w-4 h-4" />
            {t('settings.open_in_explorer')}
          </button>
        </div>
      )}

    </div>
  );
}
