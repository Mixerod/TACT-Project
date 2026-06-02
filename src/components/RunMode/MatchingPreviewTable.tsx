import { useState, useEffect, Fragment } from 'react';
import { useRunStore } from '../../stores/runStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react';

interface MatchingPreviewTableProps {
  excludedFiles: Set<string>;
  onToggleExclude: (filePath: string) => void;
}

export default function MatchingPreviewTable({
  excludedFiles,
  onToggleExclude,
}: MatchingPreviewTableProps) {
  const { batchItems } = useRunStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { getAppConfig } = useTauriCommands();
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

  const toggleRow = (filePath: string) => {
    const updated = new Set(expandedRows);
    if (updated.has(filePath)) {
      updated.delete(filePath);
    } else {
      updated.add(filePath);
    }
    setExpandedRows(updated);
  };

  const getConfidenceBadge = (confidence: 'high' | 'low', hasOrder: boolean) => {
    if (!hasOrder) {
      return theme === 'dark' ? (
        <span className="bg-rose-950/60 border border-rose-900 text-rose-400 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] tracking-wider uppercase">
          No ID
        </span>
      ) : (
        <span className="bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] tracking-wider uppercase shadow-sm">
          No ID
        </span>
      );
    }
    if (confidence === 'high') {
      return theme === 'dark' ? (
        <span className="bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] tracking-wider uppercase">
          High
        </span>
      ) : (
        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] tracking-wider uppercase shadow-sm">
          High
        </span>
      );
    }
    return theme === 'dark' ? (
      <span className="bg-amber-950/60 border border-amber-900 text-amber-400 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] tracking-wider uppercase">
        Low
      </span>
    ) : (
      <span className="bg-amber-50 border border-amber-100 text-amber-700 font-extrabold px-2.5 py-0.5 rounded-lg text-[9px] tracking-wider uppercase shadow-sm">
        Low
      </span>
    );
  };

  const getStatusColorClass = (status: 'ready' | 'warning' | 'error') => {
    if (theme === 'dark') {
      if (status === 'error') return 'border-rose-950 hover:bg-rose-950/10';
      if (status === 'warning') return 'border-amber-950 hover:bg-amber-950/10';
      return 'border-slate-800/80 hover:bg-slate-850/20';
    } else {
      if (status === 'error') return 'border-rose-100 bg-rose-50/10 hover:bg-rose-50/30 text-slate-800';
      if (status === 'warning') return 'border-amber-150 bg-amber-50/10 hover:bg-amber-50/30 text-slate-850';
      return 'border-slate-100 hover:bg-slate-50/40 text-slate-800';
    }
  };

  if (batchItems.length === 0) {
    return (
      <div className={`border rounded-2xl p-8 text-center shadow-sm transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-500 shadow-slate-950' : 'bg-white border-slate-200/60 text-slate-400 shadow-slate-100'
      }`}>
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold">
          No preview matching available. Please select files and check preview.
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300 ${
      theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950' : 'bg-white border-slate-200/60 shadow-slate-100'
    }`}>
      <div className={`flex items-center gap-2.5 border-b pb-4.5 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
        <h3 className={`text-base font-black uppercase tracking-wider ${
          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
        }`}>
          Xem trước khớp mã đơn & màu ({batchItems.length} files)
        </h3>
      </div>

      <div className="overflow-x-auto rounded-xl border border-transparent">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
              theme === 'dark' ? 'border-slate-850 text-slate-500' : 'border-slate-150 text-slate-450 bg-slate-50/50'
            }`}>
              <th className="py-3 px-4.5 w-8">
                {/* Checkbox column */}
              </th>
              <th className="py-3 px-3">CSV Filename</th>
              <th className="py-3 px-3">Extracted Order ID</th>
              <th className="py-3 px-3">Color</th>
              <th className="py-3 px-3 text-center">Confidence</th>
              <th className="py-3 px-3">Output Check</th>
              <th className="py-3 px-4 w-8"></th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-850/50' : 'divide-slate-150'}`}>
            {batchItems.map((item) => {
              const hasOrder = !!item.identity.order;
              const isExcluded = excludedFiles.has(item.file_path);
              const isExpanded = expandedRows.has(item.file_path);
              
              return (
                <Fragment key={item.file_path}>
                  {/* Standard Row */}
                  <tr
                    onClick={() => toggleRow(item.file_path)}
                    className={`border-b cursor-pointer transition-all duration-200 ${
                      isExcluded 
                        ? theme === 'dark' 
                          ? 'opacity-40 bg-slate-950/20 text-slate-500' 
                          : 'opacity-45 bg-slate-50/50 text-slate-400' 
                        : getStatusColorClass(item.status)
                    }`}
                  >
                    {/* Checkbox cell */}
                    <td className="py-3.5 px-4.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleExclude(item.file_path)}
                        className={`w-4 h-4 rounded focus:ring-opacity-25 accent-cyan-500 cursor-pointer ${
                          theme === 'dark'
                            ? 'border-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900'
                            : 'border-slate-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-white'
                        }`}
                      />
                    </td>
                    
                    {/* Filename cell */}
                    <td className={`py-3.5 px-3 font-semibold max-w-[200px] truncate ${
                      theme === 'dark' ? 'text-slate-200' : 'text-slate-850'
                    }`} title={item.filename}>
                      {item.filename}
                    </td>
                    
                    {/* Order ID cell */}
                    <td className="py-3.5 px-3 font-mono text-xs font-bold">
                      {item.identity.order ? (
                        <span className="text-cyan-600 dark:text-cyan-400">{item.identity.order}</span>
                      ) : (
                        <span className="text-rose-500/80 italic font-sans text-[11px] font-normal">Unresolved</span>
                      )}
                    </td>
                    
                    {/* Color cell */}
                    <td className={`py-3.5 px-3 font-bold ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {item.identity.color || <span className="text-slate-400 font-normal italic">-</span>}
                    </td>
                    
                    {/* Confidence Cell */}
                    <td className="py-3.5 px-3 text-center">
                      {getConfidenceBadge(item.identity.confidence, hasOrder)}
                    </td>
                    
                    {/* Output check cell */}
                    <td className="py-3.5 px-3 text-xs font-semibold">
                      {item.output_exists ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5" title="File already exists and will be updated.">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-pulse" />
                          File Exists (Update)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          New File
                        </span>
                      )}
                    </td>
                    
                    {/* Expand/Collapse Trigger cell */}
                    <td className="py-3.5 px-4 text-right">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-450" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-450" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className={theme === 'dark' ? 'bg-slate-950/40' : 'bg-slate-50/40'}>
                      <td colSpan={7} className={`px-6 py-4.5 border-b text-[11px] ${
                        theme === 'dark' ? 'border-slate-850/80' : 'border-slate-150'
                      }`}>
                        <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                          
                          {/* Warnings / logs panel */}
                          {item.identity.warnings.length > 0 ? (
                            <div className={`border p-3.5 rounded-xl space-y-1.5 shadow-sm leading-relaxed ${
                              theme === 'dark' 
                                ? 'bg-amber-950/20 border-amber-900/60 text-amber-300' 
                                : 'bg-amber-50/70 border-amber-200/60 text-amber-800'
                            }`}>
                              <span className={`font-extrabold flex items-center gap-1.5 text-xs ${
                                theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                              }`}>
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                Extraction Log Messages:
                              </span>
                              <ul className="list-disc pl-5 space-y-1 font-semibold">
                                {item.identity.warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className={`border p-3.5 rounded-xl flex items-center gap-2.5 shadow-sm ${
                              theme === 'dark' 
                                ? 'bg-emerald-950/15 border-emerald-900/40 text-emerald-450' 
                                : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-800'
                            }`}>
                              <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-500" />
                              <span className="font-semibold">
                                Identity successfully resolved from matching file names & Condition sheets with 100% confidence.
                              </span>
                            </div>
                          )}

                          {/* Detail fields */}
                          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border leading-relaxed shadow-sm ${
                            theme === 'dark' 
                              ? 'bg-slate-950/80 border-slate-850' 
                              : 'bg-white border-slate-200/70'
                          }`}>
                            <div className="space-y-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                                theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
                              }`}>
                                Chi tiết đường dẫn tệp tin
                              </span>
                              <div className="flex justify-between border-b pb-1.5 border-transparent">
                                <span className={theme === 'dark' ? 'text-slate-450' : 'text-slate-500'}>Target Output File:</span>
                                <span className={`font-mono font-bold truncate max-w-[200px] ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                                }`} title={item.output_file}>
                                  {item.output_file.split(/[/\\]/).pop()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={theme === 'dark' ? 'text-slate-450' : 'text-slate-500'}>Source Path:</span>
                                <span className="font-mono text-[9px] text-slate-500 truncate max-w-[200px]" title={item.file_path}>
                                  {item.file_path}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 flex flex-col justify-between">
                              <div>
                                <span className={`text-[9px] font-black uppercase tracking-wider block ${
                                  theme === 'dark' ? 'text-slate-500' : 'text-slate-450'
                                }`}>
                                  Hành vi của hệ thống
                                </span>
                                <p className={`text-[10px] leading-relaxed mt-1.5 ${
                                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                  {item.output_exists
                                    ? 'Báo cáo Excel đã tồn tại. Hệ thống sẽ mở file hiện tại, ghi chèn bổ sung các cột dữ liệu theo đúng phương pháp dệt QC dệt may và lưu an toàn không gây khóa hỏng.'
                                    : 'Chưa có file báo cáo trước đó. Hệ thống sẽ tạo một bản sao mới từ file Excel Template, điền các giá trị dệt may theo định dạng chuẩn và lưu báo cáo mới.'}
                                </p>
                              </div>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
