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
  const { getSidecarStatus, getAppConfig } = useTauriCommands();

  const [sidecarStatus, setSidecarStatus] = useState<'running' | 'starting' | 'dead'>('starting');
  const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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

  // Helper to check what is the current active step in the onboarding progress
  const getCurrentStep = () => {
    if (!currentProfile) return 1;
    if (selectedFiles.length === 0) return 2;
    if (state === 'IDLE') return 3;
    return 4;
  };

  const activeStep = getCurrentStep();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* View Header */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {t('nav.run')}
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Run laboratory data migrations from raw CSV files into custom report templates.
          </p>
        </div>
      </div>

      {/* Modern Visual Progressive Step Guide (Onboarding) */}
      <div className={`p-5 rounded-2xl border shadow-sm transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100/50'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🗺️</span>
          <h3 className={`text-xs font-black uppercase tracking-widest ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Hướng dẫn quy trình làm việc (Progressive Workflow)
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
            activeStep === 1
              ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 dark:text-cyan-400 font-bold'
              : activeStep > 1
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400/80 font-medium'
                : 'border-transparent text-slate-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              activeStep === 1
                ? 'bg-cyan-500 text-white'
                : activeStep > 1
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-450'
            }`}>
              1
            </div>
            <div>
              <span className={`text-[11px] block uppercase tracking-wide font-black ${
                activeStep === 1 ? 'text-cyan-500' : activeStep > 1 ? 'text-emerald-500' : 'text-slate-400'
              }`}>
                Chọn cấu hình
              </span>
              <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                Chọn phương pháp (Profile) phù hợp của QC Lab.
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
            activeStep === 2
              ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 dark:text-cyan-400 font-bold'
              : activeStep > 2
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400/80 font-medium'
                : 'border-transparent text-slate-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              activeStep === 2
                ? 'bg-cyan-500 text-white'
                : activeStep > 2
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-450'
            }`}>
              2
            </div>
            <div>
              <span className={`text-[11px] block uppercase tracking-wide font-black ${
                activeStep === 2 ? 'text-cyan-500' : activeStep > 2 ? 'text-emerald-500' : 'text-slate-400'
              }`}>
                Thêm CSV raw
              </span>
              <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                Kéo thả hoặc nhấn chọn các file dữ liệu CSV.
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
            activeStep === 3
              ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 dark:text-cyan-400 font-bold'
              : activeStep > 3
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400/80 font-medium'
                : 'border-transparent text-slate-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              activeStep === 3
                ? 'bg-cyan-500 text-white'
                : activeStep > 3
                  ? 'bg-emerald-500 text-white'
                  : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-450'
            }`}>
              3
            </div>
            <div>
              <span className={`text-[11px] block uppercase tracking-wide font-black ${
                activeStep === 3 ? 'text-cyan-500' : activeStep > 3 ? 'text-emerald-500' : 'text-slate-400'
              }`}>
                Kiểm tra khớp
              </span>
              <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                Nhấn Check Matching Preview để soát thông tin đơn + màu.
              </span>
            </div>
          </div>

          {/* Step 4 */}
          <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
            activeStep === 4
              ? 'border-cyan-500 bg-cyan-500/5 text-cyan-700 dark:text-cyan-400 font-bold'
              : 'border-transparent text-slate-400'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              activeStep === 4
                ? 'bg-cyan-500 text-white'
                : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-450'
            }`}>
              4
            </div>
            <div>
              <span className={`text-[11px] block uppercase tracking-wide font-black ${
                activeStep === 4 ? 'text-cyan-500' : 'text-slate-400'
              }`}>
                Ghi báo cáo
              </span>
              <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                Nhấp Start Process để tạo các file báo cáo Excel tự động.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidecar Offline Warning Banner */}
      {sidecarStatus !== 'running' && (
        <div className="bg-rose-50 border border-rose-250 dark:bg-rose-950/20 dark:border-rose-900/60 p-4.5 rounded-2xl flex items-start gap-3.5 text-rose-800 dark:text-rose-300 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
              Python Sidecar Daemon is Offline ({sidecarStatus})
            </span>
            <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
              FastAPI operations are currently suspended. Please verify that port 48921 is free or click "Restart Sidecar" in the Settings panel or the sidebar to restore backend operations.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Setup & Files Selector */}
        <div className="lg:col-span-1 space-y-6">
          <FileSelector />

          {/* Verification matching trigger action */}
          {selectedFiles.length > 0 && currentProfile && state === 'IDLE' && (
            <button
              onClick={handlePreviewMatching}
              disabled={isPreviewLoading || sidecarStatus !== 'running'}
              className="flex items-center justify-center gap-2.5 w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-850 disabled:to-slate-850 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 cursor-pointer active:scale-[0.99]"
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
              className={`w-full font-bold py-3 rounded-2xl text-xs transition-all border shadow-sm cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350 text-slate-600 hover:text-slate-900'
              }`}
            >
              ← Back to Start
            </button>
          )}
        </div>

        {/* Right Side: Active State Panels */}
        <div className="lg:col-span-2 space-y-8">
          
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 p-4.5 rounded-2xl text-xs shadow-sm">
              <span className="font-extrabold text-sm block mb-1">Xảy ra lỗi trong tiến trình:</span>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* State: IDLE & Pending */}
          {state === 'IDLE' && (
            <div className={`border rounded-2xl p-8 text-center shadow-sm py-24 space-y-6 transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-slate-900/40 border-slate-800 text-slate-500 shadow-slate-950' 
                : 'bg-white border-slate-200/60 text-slate-400 shadow-slate-100/50'
            }`}>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
                ⚙️
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h4 className={`font-black text-base ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  Run Mode Ready
                </h4>
                <p className="text-xs leading-relaxed">
                  Select an active test profile configuration, queue laboratory CSV raw files in step 2, and trigger the check preview matrix.
                </p>
              </div>

              {/* Simple Help Onboarding tips in the empty state */}
              <div className={`max-w-md mx-auto p-4 rounded-xl border text-left space-y-2 ${
                theme === 'dark'
                  ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                  : 'bg-slate-50/50 border-slate-100 text-slate-650'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 block mb-1">
                  💡 QC Mẹo nhanh (Lab Quick Tips):
                </span>
                <div className="flex gap-2 items-start text-[11px] leading-tight">
                  <span className="text-indigo-500">▶</span>
                  <span>Nếu chưa có **Phương Pháp Xử Lý**, hãy chuyển sang mục **Quản Lý Phương Pháp** ở thanh bên để tạo và thiết lập cột ánh xạ Excel.</span>
                </div>
                <div className="flex gap-2 items-start text-[11px] leading-tight">
                  <span className="text-indigo-500">▶</span>
                  <span>Tên file CSV raw dệt may nên tuân theo định dạng của lab (Mã đơn và Màu sắc) để ứng dụng có thể nhận diện và điền tự động chính xác nhất.</span>
                </div>
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
