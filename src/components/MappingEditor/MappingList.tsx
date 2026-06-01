import { useState } from 'react';
import { useMappingStore } from '../../stores/mappingStore';
import { Mapping } from '../../types';
import {
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  Link,
} from 'lucide-react';

export default function MappingList() {
  const { mappings, removeMapping, addMapping } = useMappingStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleDelete = (m: Mapping) => {
    if (confirm(`Bạn có chắc chắn muốn xóa liên kết mapping "${m.label}"?`)) {
      removeMapping(m.id);
    }
  };

  const handleStartEdit = (m: Mapping) => {
    setEditingId(m.id);
    setEditLabel(m.label);
  };

  const handleSaveEdit = (m: Mapping) => {
    if (!editLabel.trim()) return;
    const updated = { ...m, label: editLabel.trim() };
    addMapping(updated);
    setEditingId(null);
  };

  const handleMouseEnter = (id: string) => {
    // Fire custom event to notify MappingLinkLayer to highlight the curve line
    const event = new CustomEvent('mapping-hover', { detail: id });
    window.dispatchEvent(event);
  };

  const handleMouseLeave = () => {
    const event = new CustomEvent('mapping-hover', { detail: null });
    window.dispatchEvent(event);
  };

  const getTypeBadge = (type: 'column' | 'cell' | 'range') => {
    if (type === 'column') {
      return (
        <span className="bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
          Column
        </span>
      );
    }
    if (type === 'cell') {
      return (
        <span className="bg-cyan-950/60 border border-cyan-900 text-cyan-400 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
          Cell
        </span>
      );
    }
    return (
      <span className="bg-indigo-950/60 border border-indigo-900 text-indigo-400 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
        Range
      </span>
    );
  };

  if (mappings.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-center text-slate-500 py-12 space-y-2">
        <Link className="w-8 h-8 text-slate-700 mx-auto" />
        <h4 className="font-bold text-slate-400 text-xs">Chưa có liên kết mappings</h4>
        <p className="text-[10px] text-slate-600 max-w-[200px] mx-auto leading-relaxed">
          Sử dụng bảng điều khiển bên trên để tạo các đường nối cột/ô dữ liệu.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
        <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Mappings Registry ({mappings.length})
        </h3>
      </div>

      {/* List items */}
      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {mappings.map((m) => {
          const isEditing = editingId === m.id;

          return (
            <div
              key={m.id}
              onMouseEnter={() => handleMouseEnter(m.id)}
              onMouseLeave={handleMouseLeave}
              className="bg-slate-950 border border-slate-850 hover:border-slate-700 p-3.5 rounded-lg flex flex-col justify-between gap-3 transition-all hover:shadow shadow-inner"
            >
              <div className="flex justify-between items-start">
                {/* Badge Type */}
                {getTypeBadge(m.type)}

                {/* CRUD Actions */}
                <div className="flex gap-2">
                  {!isEditing && (
                    <>
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="p-1 hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-500 hover:text-slate-300 rounded transition-all"
                        title="Sửa tên nhãn"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1 hover:bg-rose-950/60 border border-transparent hover:border-rose-900 text-slate-500 hover:text-rose-400 rounded transition-all"
                        title="Xóa mapping"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Label Info / Edit input */}
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs text-slate-200 outline-none font-sans"
                    required
                  />
                  <button
                    onClick={() => handleSaveEdit(m)}
                    className="p-1 bg-emerald-950/60 hover:bg-emerald-950 border border-emerald-900 text-emerald-400 rounded transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 bg-rose-950/60 hover:bg-rose-950 border border-rose-900 text-rose-400 rounded transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="font-bold text-xs text-slate-200 tracking-wide select-all truncate">
                  {m.label}
                </span>
              )}

              {/* Source -> Destination details */}
              <div className="bg-slate-950/40 border border-slate-900/60 p-2.5 rounded text-[10px] text-slate-500 space-y-1">
                {m.type === 'column' && (
                  <div className="flex justify-between">
                    <span>Cột CSV: <strong className="text-slate-400">{m.csv_column}</strong></span>
                    <span>→</span>
                    <span>Cột Excel: <strong className="text-emerald-400 font-mono font-bold uppercase">{m.excel_column} (Row {m.excel_start_row})</strong></span>
                  </div>
                )}
                
                {m.type === 'cell' && (
                  <div className="flex justify-between flex-wrap gap-1">
                    <span>Nguồn: <strong className="text-slate-400">{m.value_source.length > 20 ? `${m.value_source.substring(0, 18)}...` : m.value_source}</strong></span>
                    <span>→</span>
                    <span>Ô Excel: <strong className="text-cyan-400 font-mono font-bold uppercase">{m.excel_cell}</strong></span>
                  </div>
                )}

                {m.type === 'range' && (
                  <div className="flex flex-col gap-1 text-[9px]">
                    <div className="flex justify-between">
                      <span>Số cột CSV: <strong className="text-slate-400">{m.csv_columns.length} columns</strong></span>
                      <span>→</span>
                      <span>Ô bắt đầu: <strong className="text-indigo-400 font-mono font-bold uppercase">{m.excel_start_cell}</strong></span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
