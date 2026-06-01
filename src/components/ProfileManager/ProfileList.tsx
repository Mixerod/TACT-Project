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
  Link,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../stores/profileStore';
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
  const [searchTerm, setSearchTerm] = useState('');

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
      
      {/* Search and Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-cyan-500 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Create Trigger */}
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 w-full md:w-auto justify-center bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold py-2 px-5 rounded-lg text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('profile.create')}
        </button>
      </div>

      {/* Grid listing */}
      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProfiles.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 p-5 rounded-xl flex flex-col justify-between space-y-5 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className="space-y-3.5">
                {/* Brand Header */}
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-slate-200 truncate pr-2 text-sm tracking-wide" title={p.name}>
                    {p.name}
                  </h4>
                  <span className="bg-slate-950 text-[10px] text-cyan-400 font-bold font-mono px-2 py-0.5 rounded border border-slate-850">
                    {p.method_code}
                  </span>
                </div>

                {/* Meta details list */}
                <div className="space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Mappings: </span>
                    <span className="text-slate-300 font-bold ml-auto bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-[10px]">
                      {p.mappings.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="shrink-0">Output Path: </span>
                    <span className="text-slate-400 truncate max-w-[150px] font-mono text-[10px] ml-auto" title={p.output.directory}>
                      {p.output.directory.split(/[/\\]/).pop() || p.output.directory}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Updated: </span>
                    <span className="text-slate-400 font-medium ml-auto">
                      {formatDate(p.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons panel */}
              <div className="flex gap-2 border-t border-slate-850 pt-4">
                <button
                  onClick={() => onEdit(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-cyan-400 text-slate-300 font-bold py-2 rounded text-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>

                <button
                  onClick={() => onEditMappings(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-indigo-400 text-slate-300 font-bold py-2 rounded text-xs transition-colors"
                >
                  <Link className="w-3.5 h-3.5" />
                  Mappings
                </button>

                <button
                  onClick={() => onDuplicate(p)}
                  className="p-2 bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-indigo-400 text-slate-400 rounded transition-colors"
                  title="Duplicate configuration"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(p)}
                  className="p-2 bg-slate-950 border border-slate-850 hover:border-rose-900 hover:text-rose-400 text-slate-500 rounded transition-colors"
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
          <FileSpreadsheet className="w-14 h-14 text-slate-800 mx-auto mb-3" />
          <h4 className="font-bold text-slate-400 text-sm">Không tìm thấy phương pháp nào</h4>
          <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1 leading-relaxed">
            {searchTerm
              ? 'Thử thay đổi từ khóa tìm kiếm khác.'
              : 'Hãy click nút "Tạo Phương Pháp Mới" để bắt đầu xây dựng cấu hình đầu tiên.'}
          </p>
        </div>
      )}

    </div>
  );
}
