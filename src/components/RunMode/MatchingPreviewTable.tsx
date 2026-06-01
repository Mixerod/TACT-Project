import { useState, Fragment } from 'react';
import { useRunStore } from '../../stores/runStore';
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
      return (
        <span className="bg-rose-950/60 border border-rose-900 text-rose-400 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
          No ID
        </span>
      );
    }
    if (confidence === 'high') {
      return (
        <span className="bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
          High
        </span>
      );
    }
    return (
      <span className="bg-amber-950/60 border border-amber-900 text-amber-400 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
        Low
      </span>
    );
  };

  const getStatusColorClass = (status: 'ready' | 'warning' | 'error') => {
    if (status === 'error') return 'border-rose-950 hover:bg-rose-950/10';
    if (status === 'warning') return 'border-amber-950 hover:bg-amber-950/10';
    return 'border-slate-800/80 hover:bg-slate-850/30';
  };

  if (batchItems.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 shadow-xl">
        <HelpCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
        <p className="text-sm">
          No preview matching available. Please select files and check preview.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-bold text-slate-200">
          Batch Matching Preview ({batchItems.length} files)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-850 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="py-3 px-3 w-8">
                {/* Global checkbox or label */}
              </th>
              <th className="py-3 px-3">CSV Filename</th>
              <th className="py-3 px-3">Extracted Order ID</th>
              <th className="py-3 px-3">Color</th>
              <th className="py-3 px-3 text-center">Confidence</th>
              <th className="py-3 px-3">Output Check</th>
              <th className="py-3 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50">
            {batchItems.map((item) => {
              const hasOrder = !!item.identity.order;
              const isExcluded = excludedFiles.has(item.file_path);
              const isExpanded = expandedRows.has(item.file_path);
              
              return (
                <Fragment key={item.file_path}>
                  {/* Standard Row */}
                  <tr
                    onClick={() => toggleRow(item.file_path)}
                    className={`border-b cursor-pointer transition-all ${
                      isExcluded ? 'opacity-40 bg-slate-950/20' : getStatusColorClass(item.status)
                    }`}
                  >
                    {/* Checkbox cell */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleExclude(item.file_path)}
                        className="w-4 h-4 rounded border-slate-800 text-cyan-600 focus:ring-cyan-500 focus:ring-opacity-25 focus:ring-offset-slate-900 accent-cyan-500 cursor-pointer"
                      />
                    </td>
                    
                    {/* Filename cell */}
                    <td className="py-3.5 px-3 font-semibold text-slate-200 max-w-[200px] truncate" title={item.filename}>
                      {item.filename}
                    </td>
                    
                    {/* Order ID cell */}
                    <td className="py-3.5 px-3 font-mono text-xs">
                      {item.identity.order ? (
                        <span className="text-cyan-400 font-bold">{item.identity.order}</span>
                      ) : (
                        <span className="text-rose-400/80 italic font-sans text-xs">Unresolved</span>
                      )}
                    </td>
                    
                    {/* Color cell */}
                    <td className="py-3.5 px-3 font-semibold text-slate-300">
                      {item.identity.color || <span className="text-slate-600 font-normal italic">-</span>}
                    </td>
                    
                    {/* Confidence Cell */}
                    <td className="py-3.5 px-3 text-center">
                      {getConfidenceBadge(item.identity.confidence, hasOrder)}
                    </td>
                    
                    {/* Output check cell */}
                    <td className="py-3.5 px-3 text-xs">
                      {item.output_exists ? (
                        <span className="text-amber-400 font-semibold flex items-center gap-1.5" title="File already exists and will be updated.">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          File Exists (Update)
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          New File
                        </span>
                      )}
                    </td>
                    
                    {/* Expand/Collapse Trigger cell */}
                    <td className="py-3.5 px-3 text-right">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-950/40">
                      <td colSpan={7} className="px-6 py-4 border-b border-slate-850/80 text-xs">
                        <div className="space-y-3.5 animate-in slide-in-from-top-1 duration-200">
                          
                          {/* Warnings / logs panel */}
                          {item.identity.warnings.length > 0 ? (
                            <div className="bg-amber-950/20 border border-amber-900/60 text-amber-300 p-3.5 rounded-lg space-y-1">
                              <span className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                                Extraction Log Messages:
                              </span>
                              <ul className="list-disc pl-5 space-y-0.5 text-slate-300 font-medium">
                                {item.identity.warnings.map((warn, i) => (
                                  <li key={i}>{warn}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="bg-emerald-950/15 border border-emerald-900/40 text-emerald-400 p-3.5 rounded-lg flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              <span className="font-medium text-slate-300">
                                Identity successfully resolved from matching file names & Condition sheets with 100% confidence.
                              </span>
                            </div>
                          )}

                          {/* Detail fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-lg border border-slate-850">
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                Extraction Details
                              </span>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Target Output File:</span>
                                <span className="font-mono text-slate-300 truncate max-w-[200px]" title={item.output_file}>
                                  {item.output_file.split(/[/\\]/).pop()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Source Path:</span>
                                <span className="font-mono text-[9px] text-slate-500 truncate max-w-[200px]" title={item.file_path}>
                                  {item.file_path}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                  System Actions
                                </span>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {item.output_exists
                                    ? 'The report file already exists. The system will open the existing file in memory, update the mapped cells, and save it safely without locking or corrupting.'
                                    : 'No existing report file found. The system will create a fresh copy of the Excel template, apply mappings, and save it.'}
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
