import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../stores/profileStore';
import { useRunStore } from '../../stores/runStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { FolderOpen, FileSpreadsheet, X } from 'lucide-react';

export default function FileSelector() {
  const { t } = useTranslation();
  const profileStore = useProfileStore();
  const runStore = useRunStore();
  const { openFileDialog } = useTauriCommands();
  const [isDragOver, setIsDragOver] = useState(false);

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
        
        // Merge with existing files to allow incremental additions
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
      // In Tauri, the absolute file path is exposed on the File object as 'path' or 'name' if local path
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            1. {t('profile.title')}
          </h3>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-semibold block">
            Select Configuration Method Profile
          </label>
          <select
            value={profileStore.currentProfile?.id || ''}
            onChange={(e) => profileStore.selectProfile(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-all cursor-pointer"
          >
            <option value="">-- Choose Profile --</option>
            {profileStore.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.method_code})
              </option>
            ))}
          </select>
          
          {profileStore.currentProfile && (
            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-lg text-xs space-y-2 text-slate-400 animate-in slide-in-from-top-1 duration-200">
              <div className="flex justify-between">
                <span>Method Code:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {profileStore.currentProfile.method_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Excel Template:</span>
                <span className="font-mono text-indigo-300 truncate max-w-[180px]" title={profileStore.currentProfile.template.path}>
                  {profileStore.currentProfile.template.path.split(/[/\\]/).pop()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span>Output Directory:</span>
                <span className="font-mono text-[10px] text-slate-500 truncate" title={profileStore.currentProfile.output.directory}>
                  {profileStore.currentProfile.output.directory}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Drag & Drop CSV Files Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              2. {t('run.select_files')}
            </h3>
          </div>
          {runStore.selectedFiles.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-extrabold hover:underline"
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
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-500/5'
              : 'border-slate-800 bg-slate-950 hover:bg-slate-850/50 hover:border-slate-700'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <span className={`text-3xl transition-transform ${isDragOver ? 'scale-110' : ''}`}>📂</span>
            <h4 className="font-semibold text-slate-200 text-sm mt-1">
              Drag & Drop TACT CSV files here
            </h4>
            <p className="text-xs text-slate-500">
              or click here to browse Windows Explorer
            </p>
          </div>
        </div>

        {/* Selected files listing */}
        {runStore.selectedFiles.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Queued Files ({runStore.selectedFiles.length}):
            </span>
            <div className="bg-slate-950 border border-slate-850 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-900 shadow-inner">
              {runStore.selectedFiles.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs hover:bg-slate-900 group">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-[10px] text-slate-600 font-mono">{idx + 1}.</span>
                    <span className="font-mono text-slate-300 truncate" title={file}>
                      {file.split(/[/\\]/).pop()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all opacity-0 group-hover:opacity-100"
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
