import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../stores/profileStore';
import { useRunStore } from '../../stores/runStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import FileSelector from './FileSelector';
import MatchingPreviewTable from './MatchingPreviewTable';
import ProcessButton from './ProcessButton';
import ResultLog from './ResultLog';
import { Play, Loader2, AlertCircle } from 'lucide-react';

export default function RunMode() {
  const { t } = useTranslation();
  const { currentProfile } = useProfileStore();
  const {
    state,
    selectedFiles,
    runPreview,
    startProcessing,
    errorMessage,
    reset,
  } = useRunStore();
  const { getSidecarStatus } = useTauriCommands();

  const [sidecarStatus, setSidecarStatus] = useState<'running' | 'starting' | 'dead'>('starting');
  const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Poll sidecar status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await getSidecarStatus();
        setSidecarStatus(status);
      } catch {
        setSidecarStatus('dead');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset local exclusions when selected files change
  useEffect(() => {
    setExcludedFiles(new Set());
  }, [selectedFiles]);

  const handleToggleExclude = (filePath: string) => {
    const updated = new Set(excludedFiles);
    if (updated.has(filePath)) {
      updated.delete(filePath);
    } else {
      updated.add(filePath);
    }
    setExcludedFiles(updated);
  };

  const handlePreviewMatching = async () => {
    if (!currentProfile || selectedFiles.length === 0) return;
    setIsPreviewLoading(true);
    try {
      await runPreview(currentProfile.id);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleProcessBatch = async () => {
    if (!currentProfile) return;
    
    // Filter out files that the user unticked/unchecked
    const filesToProcess = selectedFiles.filter((file) => !excludedFiles.has(file));
    if (filesToProcess.length === 0) {
      alert('Không có file nào được chọn để xử lý. Vui lòng tick chọn ít nhất một file.');
      return;
    }
    
    // 1. Set the runStore selection to only the included files
    useRunStore.getState().setSelectedFiles(filesToProcess);
    
    try {
      await startProcessing(currentProfile.id);
    } catch (err) {
      console.error('Process batch execution failed:', err);
    }
  };

  const activeCount = selectedFiles.filter((file) => !excludedFiles.has(file)).length;
  const isProcessButtonDisabled =
    sidecarStatus !== 'running' ||
    !currentProfile ||
    activeCount === 0 ||
    state === 'PROCESSING';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          {t('nav.run')}
        </h2>
        <p className="text-sm text-slate-400">
          Run laboratory data migrations from raw CSV files into custom report templates.
        </p>
      </div>

      {/* Sidecar Offline Warning Banner */}
      {sidecarStatus !== 'running' && (
        <div className="bg-rose-950/20 border border-rose-900/60 p-4 rounded-xl flex items-start gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <span className="font-bold text-slate-200">
              Python Sidecar Daemon is Offline ({sidecarStatus})
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              FastAPI operations are currently suspended. Please verify that port 48921 is free or click "Restart Sidecar" in the Settings panel or the sidebar to restore backend operations.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Setup & Files Selector */}
        <div className="lg:col-span-1 space-y-6">
          <FileSelector />

          {/* Verification matching trigger action */}
          {selectedFiles.length > 0 && currentProfile && state === 'IDLE' && (
            <button
              onClick={handlePreviewMatching}
              disabled={isPreviewLoading || sidecarStatus !== 'running'}
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/15"
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking Matching Matrix...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Check Matching Preview
                </>
              )}
            </button>
          )}

          {/* Quick reset inside setup column */}
          {state !== 'IDLE' && (
            <button
              onClick={reset}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-400 font-semibold py-2.5 rounded-xl text-xs transition-colors"
            >
              Back to Start
            </button>
          )}
        </div>

        {/* Right Side: Active State Panels */}
        <div className="lg:col-span-2 space-y-8">
          
          {errorMessage && (
            <div className="bg-rose-950/20 border border-rose-900 text-rose-300 p-4 rounded-xl text-xs">
              <span className="font-bold block mb-1">Xảy ra lỗi trong tiến trình:</span>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* State: IDLE & Pending */}
          {state === 'IDLE' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 shadow-xl py-28 space-y-4">
              <span className="text-4xl block animate-pulse">⚙️</span>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-300">Run Mode Ready</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Select an active test profile configuration, queue laboratory CSV raw files in step 2, and trigger the check preview matrix.
                </p>
              </div>
            </div>
          )}

          {/* State: PREVIEWING - show the matching table & final trigger button */}
          {(state === 'PREVIEWING' || state === 'PROCESSING') && (
            <div className="space-y-6">
              <MatchingPreviewTable
                excludedFiles={excludedFiles}
                onToggleExclude={handleToggleExclude}
              />
              
              <ProcessButton
                disabled={isProcessButtonDisabled}
                isLoading={state === 'PROCESSING'}
                onClick={handleProcessBatch}
                activeCount={activeCount}
              />
            </div>
          )}

          {/* State: DONE - show the execution log */}
          {state === 'DONE' && <ResultLog />}

        </div>

      </div>
    </div>
  );
}
