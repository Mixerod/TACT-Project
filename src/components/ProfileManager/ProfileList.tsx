import {
  FileSpreadsheet,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Calendar,
  Folder,
  Database,
  Search,
  Link as LinkIcon,
  Download,
  Upload,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../stores/profileStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { Profile } from '../../types';

interface ProfileListProps {
  onEdit: (profile: Profile) => void;
  onDuplicate: (profile: Profile) => void;
  onEditMappings: (profile: Profile) => void;
  onCreate: () => void;
}

export default function ProfileList({
  onEdit,
  onDuplicate,
  onEditMappings,
  onCreate,
}: ProfileListProps) {
  const { t } = useTranslation();
  const { profiles, deleteProfile } = useProfileStore();
  const { getAppConfig } = useTauriCommands();
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleExport = (profile: Profile) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `${profile.method_code}_profile.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(`Xuất profile thất bại: ${err.message || String(err)}`);
    }
  };

  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const importedProfile = JSON.parse(event.target.result) as Profile;
          
          if (!importedProfile.name || !importedProfile.method_code || !importedProfile.mappings) {
            alert("Tệp JSON không đúng cấu trúc Profile của phần mềm.");
            return;
          }
          
          const exists = profiles.some(p => p.id === importedProfile.id);
          if (exists) {
            if (confirm(`Phương pháp "${importedProfile.name}" đã tồn tại. Bạn có muốn tạo một bản sao mới không?`)) {
              importedProfile.id = '';
              importedProfile.name = `${importedProfile.name}_BảnSao`;
              importedProfile.method_code = `${importedProfile.method_code}_copy`;
            } else {
              return;
            }
          }
          
          const { saveProfile, loadProfiles } = useProfileStore.getState();
          await saveProfile(importedProfile);
          await loadProfiles();
          
          alert(`Nhập thành công phương pháp "${importedProfile.name}"!`);
        } catch (err: any) {
          alert(`Lỗi khi nhập profile: ${err.message || String(err)}`);
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  };

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

  const handleDelete = async (profile: Profile) => {
    if (confirm(`Bạn có chắc chắn muốn xóa phương pháp "${profile.name}"? Hành động này không thể hoàn tác.`)) {
      try {
        await deleteProfile(profile.id);
      } catch (err) {
        alert(`Không thể xóa profile: ${err}`);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.method_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Search and Action Header Card */}
      <div className={`flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-2xl border shadow-sm transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
      }`}>
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã phương pháp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold outline-none transition-all ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200 placeholder:text-slate-650'
                : 'bg-white border-slate-200 hover:border-slate-355 focus:border-cyan-500 text-slate-800 placeholder:text-slate-400 shadow-inner bg-slate-50/20'
            }`}
          />
        </div>

        {/* Create and Import Triggers */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleImport}
            className={`flex items-center gap-2 justify-center border font-extrabold py-3 px-5 rounded-xl text-xs transition-all shadow-sm cursor-pointer active:scale-[0.99] ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-850 hover:border-slate-700 hover:text-cyan-400 text-slate-300'
                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-cyan-600 text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Nhập Phương Pháp
          </button>
          
          <button
            onClick={onCreate}
            className="flex items-center gap-2 justify-center bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-600 hover:to-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl text-xs transition-all shadow-sm hover:shadow-indigo-500/10 cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            {t('profile.create')}
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProfiles.map((p) => (
            <div
              key={p.id}
              className={`border p-5 rounded-2xl flex flex-col justify-between space-y-5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800/80 hover:border-slate-700/80 shadow-slate-950'
                  : 'bg-white border-slate-200/60 hover:border-slate-350 shadow-slate-100/50'
              }`}
            >
              <div className="space-y-4">
                {/* Brand Header */}
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`font-extrabold truncate pr-1 text-sm tracking-wide leading-snug ${
                    theme === 'dark' ? 'text-slate-200 font-extrabold' : 'text-slate-800 font-black'
                  }`} title={p.name}>
                    {p.name}
                  </h4>
                  <span className={`text-[10px] font-extrabold font-mono px-2.5 py-0.5 rounded-lg border shrink-0 ${
                    theme === 'dark' 
                      ? 'bg-slate-950 text-cyan-400 border-slate-850' 
                      : 'bg-cyan-50 text-cyan-700 border-cyan-100/50 shadow-sm'
                  }`}>
                    {p.method_code}
                  </span>
                </div>

                {/* Meta details list */}
                <div className="space-y-2.5 text-xs">
                  <div className={`flex items-center gap-2 border-b pb-2 ${theme === 'dark' ? 'border-slate-850/30' : 'border-slate-50'}`}>
                    <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className={theme === 'dark' ? 'text-slate-500 font-semibold' : 'text-slate-500 font-semibold'}>Cột ánh xạ: </span>
                    <span className={`font-extrabold ml-auto text-[10px] px-2.5 py-0.5 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-slate-950 text-slate-300 border-slate-850' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100/50 shadow-sm'
                    }`}>
                      {p.mappings.length} items
                    </span>
                  </div>

                  <div className={`flex items-center gap-2 border-b pb-2 ${theme === 'dark' ? 'border-slate-850/30' : 'border-slate-50'}`}>
                    <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="shrink-0 font-semibold text-slate-500">Đầu ra báo cáo: </span>
                    <span className={`font-mono text-[10px] ml-auto font-bold truncate max-w-[130px] ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-700'
                    }`} title={p.output.directory}>
                      {p.output.directory.split(/[/\\]/).pop() || p.output.directory}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-500">Cập nhật lúc: </span>
                    <span className={`font-bold ml-auto ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      {formatDate(p.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons panel */}
              <div className={`flex gap-2 border-t pt-4 ${
                theme === 'dark' ? 'border-slate-850/60' : 'border-slate-100'
              }`}>
                <button
                  onClick={() => onEdit(p)}
                  className={`flex-1 flex items-center justify-center gap-1.5 border font-extrabold py-2 rounded-xl text-[11px] transition-all cursor-pointer shadow-sm ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-700 hover:text-cyan-400 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-cyan-600 text-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Cấu hình
                </button>

                <button
                  onClick={() => onEditMappings(p)}
                  className={`flex-1 flex items-center justify-center gap-1.5 border font-extrabold py-2 rounded-xl text-[11px] transition-all cursor-pointer shadow-sm ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-700 hover:text-indigo-400 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-indigo-600 text-slate-700'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Bản đồ
                </button>

                <button
                  onClick={() => handleExport(p)}
                  className={`p-2 border rounded-xl transition-all cursor-pointer shadow-sm ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-750 hover:text-cyan-400 text-slate-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-cyan-600 text-slate-600'
                  }`}
                  title="Export profile (Xuất phương pháp)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDuplicate(p)}
                  className={`p-2 border rounded-xl transition-all cursor-pointer shadow-sm ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-750 hover:text-indigo-400 text-slate-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-indigo-650 text-slate-600'
                  }`}
                  title="Duplicate configuration"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(p)}
                  className={`p-2 border rounded-xl transition-all cursor-pointer shadow-sm ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-rose-900 hover:text-rose-450 text-slate-550'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-rose-250 hover:text-rose-600 text-slate-600'
                  }`}
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-24 border rounded-2xl shadow-sm transition-all duration-300 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-500 shadow-slate-950' : 'bg-white border-slate-200/60 text-slate-400 shadow-slate-100'
        }`}>
          <FileSpreadsheet className="w-14 h-14 text-slate-400 mx-auto mb-3" />
          <h4 className={`font-black text-sm ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
          }`}>
            Không tìm thấy phương pháp nào
          </h4>
          <p className="text-xs max-w-xs mx-auto mt-1 leading-relaxed">
            {searchTerm
              ? 'Thử thay đổi từ khóa tìm kiếm khác.'
              : 'Hãy click nút "Tạo Phương Pháp Mới" để bắt đầu xây dựng cấu hình đầu tiên.'}
          </p>
        </div>
      )}

    </div>
  );
}
