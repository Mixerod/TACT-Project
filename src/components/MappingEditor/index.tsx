import { useState, useEffect } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { useMappingStore } from '../../stores/mappingStore';
import { Mapping } from '../../types';
import CsvPreviewTable from './CsvPreviewTable';
import ExcelPreviewTable from './ExcelPreviewTable';
import AddMappingPanel from './AddMappingPanel';
import MappingList from './MappingList';
import IdentityMappingPanel from './IdentityMappingPanel';
import MappingLinkLayer from './MappingLinkLayer';
import {
  ArrowLeft,
  Save,
  Link2,
  Fingerprint,
  FileText,
  AlertTriangle,
  CheckCircle,
  Undo,
  Redo,
  Loader2,
} from 'lucide-react';

interface MappingEditorProps {
  onClose: () => void;
}

export default function MappingEditor({ onClose }: MappingEditorProps) {
  const { currentProfile, saveProfile } = useProfileStore();
  const { mappings, setMappings, isDraft, clearEditor } = useMappingStore();
  
  const [activeTab, setActiveTab] = useState<'data' | 'identity' | 'list'>('data');
  const [isSaving, setIsSaving] = useState(false);

  // Undo/redo history state
  const [history, setHistory] = useState<Mapping[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Sync profile mappings into mappingStore draft mappings on mount
  useEffect(() => {
    if (currentProfile) {
      const initial = currentProfile.mappings || [];
      setMappings(initial);
      setHistory([initial]);
      setHistoryIndex(0);
    }
    return () => {
      clearEditor();
    };
  }, [currentProfile?.id]);

  // Undo/Redo state observer
  useEffect(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const currentHistoryStr = JSON.stringify(history[historyIndex]);
      const mappingsStr = JSON.stringify(mappings);
      if (currentHistoryStr !== mappingsStr) {
        const nextHistory = [...history.slice(0, historyIndex + 1), [...mappings]];
        if (nextHistory.length > 30) {
          nextHistory.shift();
        }
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
      }
    } else if (historyIndex === -1 && mappings.length > 0) {
      setHistory([[...mappings]]);
      setHistoryIndex(0);
    }
  }, [mappings]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setMappings(history[nextIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setMappings(history[nextIndex]);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getConflicts = () => {
    const targets: Record<string, string[]> = {};
    mappings.forEach((m) => {
      let dest = '';
      if (m.type === 'cell') {
        dest = `cell:${m.excel_cell}`;
      } else if (m.type === 'column') {
        dest = `column:${m.excel_column}`;
      } else if (m.type === 'range') {
        dest = `range:${m.excel_start_cell}`;
      }
      if (dest) {
        if (!targets[dest]) {
          targets[dest] = [];
        }
        targets[dest].push(m.label || m.id);
      }
    });

    const conflicts: string[] = [];
    Object.entries(targets).forEach(([dest, labels]) => {
      if (labels.length > 1) {
        const friendlyDest = dest
          .replace('cell:', 'Ô Excel ')
          .replace('column:', 'Cột Excel ')
          .replace('range:', 'Vùng Excel ');
        conflicts.push(`${friendlyDest} đang được sử dụng bởi nhiều mapping (${labels.join(', ')})`);
      }
    });
    return conflicts;
  };

  const conflicts = getConflicts();

  const handleSaveProfileMappings = async () => {
    if (!currentProfile || isSaving) return;
    setIsSaving(true);
    
    const updatedProfile = {
      ...currentProfile,
      mappings: [...mappings],
    };

    try {
      // 1. Call validation endpoint
      const validateResponse = await fetch('http://localhost:48921/api/validate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: updatedProfile,
        }),
      });

      if (!validateResponse.ok) {
        const errJson = await validateResponse.json().catch(() => ({ message: 'Không thể xác thực cấu hình profile' }));
        throw new Error(errJson.message || errJson.detail || 'Lỗi xác thực cấu hình mapping.');
      }

      // 2. Invoke save_profile if valid
      await saveProfile(updatedProfile);
      
      // 3. Show success toast and close after delay
      showToast('Lưu cấu hình mappings thành công!', 'success');
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Failed to validate or save profile mappings:', err);
      showToast(err.message || `Lưu thất bại: ${err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentProfile) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
        <h3 className="text-xl font-bold">Lỗi: Không tìm thấy Phương pháp Test</h3>
        <p className="text-slate-500 max-w-xs leading-relaxed text-sm">
          Vui lòng quay lại màn hình danh sách phương pháp và chọn chỉnh sửa một profile để bắt đầu mapping.
        </p>
        <button
          onClick={onClose}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 font-bold py-2 px-6 rounded-lg text-xs transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-300 relative">
      
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 animate-in slide-in-from-top duration-300 p-4 rounded-xl border shadow-2xl flex items-center gap-3 ${
          toastType === 'success'
            ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300 backdrop-blur'
            : 'bg-rose-950/90 border-rose-800 text-rose-300 backdrop-blur'
        }`}>
          {toastType === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-bold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-100">
                Mapping Config Editor
              </h2>
              {isDraft && (
                <span className="flex items-center gap-1 bg-amber-950/80 border border-amber-800/80 text-amber-400 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider animate-pulse mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Draft Unsaved
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Active Profile: <strong className="text-indigo-400">{currentProfile.name}</strong> ({currentProfile.method_code})
            </p>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex gap-3 w-full md:w-auto items-center">
          {/* Undo/Redo Buttons */}
          <div className="flex gap-1.5 bg-slate-900 border border-slate-850 p-1 rounded-lg shrink-0 mr-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-450 hover:text-slate-200 rounded transition-all"
              title="Undo mapping change"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-450 hover:text-slate-200 rounded transition-all"
              title="Redo mapping change"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 font-semibold py-2 px-5 rounded-lg text-xs transition-colors text-center"
          >
            Quay lại Profiles
          </button>
          
          <button
            onClick={handleSaveProfileMappings}
            disabled={!isDraft || isSaving}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-2 px-6 rounded-lg text-xs transition-colors shadow-lg hover:shadow-emerald-500/10"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu Config
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Core Content Container */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1 min-h-0">
        
        {/* Left Side: Steppers, Registry lists & Identity config selectors (Col-span-1) */}
        <div className="xl:col-span-1 flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-900 border border-slate-850 p-1.5 rounded-xl shadow-md shrink-0">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'data'
                  ? 'bg-slate-950 border border-slate-800 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Data
            </button>
            <button
              onClick={() => setActiveTab('identity')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'identity'
                  ? 'bg-slate-950 border border-slate-800 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              Identity
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-slate-950 border border-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              List ({mappings.length})
            </button>
          </div>

          {/* Conflict Warnings */}
          {conflicts.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-lg flex items-start gap-2.5 text-[11px] text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Xung đột Mapping phát hiện!</span>
                <ul className="list-disc pl-4 space-y-0.5 text-rose-400/90">
                  {conflicts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Conditional panels rendering */}
          {activeTab === 'data' ? (
            <AddMappingPanel />
          ) : activeTab === 'identity' ? (
            <IdentityMappingPanel />
          ) : (
            <MappingList />
          )}
        </div>

        {/* Right Side: Interactive Tables Preview with SVG Overlay (Col-span-3) */}
        <div className="xl:col-span-3 flex flex-col min-h-0">
          <div className="relative flex-1 min-h-0 grid grid-cols-1 md:grid-cols-10 gap-8 bg-slate-950 border border-slate-850 p-4 rounded-2xl shadow-2xl">
            
            {/* Left Column: Source CSV (40%) */}
            <div className="relative min-w-0 z-10 md:col-span-4 flex flex-col">
              <CsvPreviewTable />
            </div>

            {/* Right Column: Excel Target (60%) */}
            <div className="relative min-w-0 z-10 md:col-span-6 flex flex-col">
              <ExcelPreviewTable />
            </div>

            {/* Middle Layer: SVG Link lines overlay */}
            <MappingLinkLayer />
          </div>
        </div>

      </div>

    </div>
  );
}
