import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../stores/profileStore';
import { useRunStore } from '../../stores/runStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { FolderOpen, FileSpreadsheet, X, UploadCloud } from 'lucide-react';

export default function FileSelector() {
  const { t } = useTranslation();
  const profileStore = useProfileStore();
  const runStore = useRunStore();
  const { openFileDialog, getAppConfig } = useTauriCommands();
  const [isDragOver, setIsDragOver] = useState(false);
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

  const handleBrowse = async () => {
    try {
      const paths = await openFileDialog(
        t('run.select_files'),
        [{ name: 'CSV Files', extensions: ['csv'] }],
        true
      );
      if (paths) {
        let filesList: string[] = [];
        if (Array.isArray(paths)) {
          filesList = paths;
        } else if (typeof paths === 'string') {
          filesList = [paths];
        }
        
        const combined = Array.from(new Set([...runStore.selectedFiles, ...filesList]));
        runStore.setSelectedFiles(combined);
      }
    } catch (err) {
      console.error('File browsing failed:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    const pathsList: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = (file as any).path || file.name;
      if (filePath.endsWith('.csv')) {
        pathsList.push(filePath);
      }
    }
    
    if (pathsList.length > 0) {
      const combined = Array.from(new Set([...runStore.selectedFiles, ...pathsList]));
      runStore.setSelectedFiles(combined);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updated = runStore.selectedFiles.filter((_, idx) => idx !== indexToRemove);
    runStore.setSelectedFiles(updated);
  };

  const clearAllFiles = () => {
    runStore.setSelectedFiles([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Profile Dropdown Card */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
      }`}>
        <div className={`flex items-center gap-2.5 border-b pb-3 ${
          theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <FileSpreadsheet className="w-5 h-5 text-cyan-500" />
          <h3 className={`text-xs font-black uppercase tracking-widest ${
            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
          }`}>
            1. {t('profile.title')}
          </h3>
        </div>

        <div className="space-y-3">
          <label className={`text-[10px] font-black uppercase tracking-wider block ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            QC Method Profile Configuration:
          </label>
          
          <select
            value={profileStore.currentProfile?.id || ''}
            onChange={(e) => profileStore.selectProfile(e.target.value)}
            className={`w-full border focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800'
            }`}
          >
            <option value="">-- Choose Profile --</option>
            {profileStore.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.method_code})
              </option>
            ))}
          </select>
          
          {profileStore.currentProfile && (
            <div className={`border p-4.5 rounded-xl text-xs space-y-3 animate-in slide-in-from-top-1 duration-200 leading-relaxed ${
              theme === 'dark' 
                ? 'bg-slate-950 border-slate-850/80 text-slate-400' 
                : 'bg-slate-50 border-slate-150 text-slate-650'
            }`}>
              <div className={`flex justify-between border-b pb-2 ${theme === 'dark' ? 'border-slate-900' : 'border-slate-150'}`}>
                <span className="font-semibold">Mã phương pháp:</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-extrabold">
                  {profileStore.currentProfile.method_code}
                </span>
              </div>
              <div className={`flex justify-between border-b pb-2 ${theme === 'dark' ? 'border-slate-900' : 'border-slate-150'}`}>
                <span className="font-semibold">Template mẫu:</span>
                <span className={`font-mono font-bold truncate max-w-[170px] ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                }`} title={profileStore.currentProfile.template.path}>
                  {profileStore.currentProfile.template.path.split(/[/\\]/).pop()}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-0.5">
                <span className="font-semibold">Thư mục đầu ra (Excel Output):</span>
                <span className={`font-mono text-[10px] truncate border p-2 rounded-lg break-all select-all ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-850 text-slate-500' 
                    : 'bg-white border-slate-200 text-slate-550'
                }`} title={profileStore.currentProfile.output.directory}>
                  {profileStore.currentProfile.output.directory}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Drag & Drop CSV Files Card */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
      }`}>
        <div className={`flex items-center justify-between border-b pb-3 ${
          theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-indigo-500" />
            <h3 className={`text-xs font-black uppercase tracking-widest ${
              theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
            }`}>
              2. {t('run.select_files')}
            </h3>
          </div>
          {runStore.selectedFiles.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-[10px] text-rose-500 hover:text-rose-600 font-extrabold uppercase hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Dropzone Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowse}
          className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5'
              : theme === 'dark'
                ? 'border-slate-800 bg-slate-950 hover:bg-slate-850/40 hover:border-slate-700'
                : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/40 hover:border-slate-300'
          }`}
        >
          <div className="flex flex-col items-center gap-2.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
              isDragOver 
                ? 'bg-cyan-500 text-white scale-110' 
                : theme === 'dark' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-650 shadow-sm border border-slate-100'
            }`}>
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className={`font-bold text-xs ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-850'
              }`}>
                Kéo thả file CSV dệt may tại đây
              </h4>
              <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-450'}`}>
                hoặc nhấp chuột để chọn từ Explorer
              </p>
            </div>
          </div>
        </div>

        {/* Selected files listing */}
        {runStore.selectedFiles.length > 0 && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-200">
            <span className={`text-[9px] font-black uppercase tracking-widest block ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
            }`}>
              Danh sách file chờ ({runStore.selectedFiles.length}):
            </span>
            <div className={`border rounded-xl max-h-52 overflow-y-auto divide-y shadow-inner ${
              theme === 'dark' 
                ? 'bg-slate-950 border-slate-850 divide-slate-900 shadow-slate-950' 
                : 'bg-slate-50/50 border-slate-200 divide-slate-150 shadow-slate-100'
            }`}>
              {runStore.selectedFiles.map((file, idx) => (
                <div key={idx} className={`flex justify-between items-center px-3.5 py-2 text-[11px] transition-all group ${
                  theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-white shadow-sm'
                }`}>
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className={`text-[9px] font-bold font-mono ${
                      theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className={`font-mono truncate ${
                      theme === 'dark' ? 'text-slate-300 font-medium' : 'text-slate-700 font-semibold'
                    }`} title={file}>
                      {file.split(/[/\\]/).pop()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className={`p-1 border rounded-lg transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'text-slate-600 border-transparent hover:text-rose-400 hover:bg-rose-950/20'
                        : 'text-slate-400 border-transparent hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
