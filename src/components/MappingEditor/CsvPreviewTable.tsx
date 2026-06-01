import { useState } from 'react';
import { useMappingStore } from '../../stores/mappingStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { usePythonApi } from '../../hooks/usePythonApi';
import { FolderOpen, Table, Database, Check } from 'lucide-react';

export default function CsvPreviewTable() {
  const {
    csvPreview,
    setCsvPreview,
    selectedCsvColumn,
    setSelectedCsvColumn,
    selectedCsvColumns,
    setSelectedCsvColumns,
    activeMappingType,
  } = useMappingStore();

  const { openFileDialog } = useTauriCommands();
  const { previewCsv } = usePythonApi();
  
  const [filePath, setFilePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('Result');

  const handleBrowse = async () => {
    try {
      const path = await openFileDialog(
        'Chọn file CSV mẫu',
        [{ name: 'CSV & Excel Files', extensions: ['csv', 'xlsx'] }],
        false
      );
      if (path && typeof path === 'string') {
        const cleanPath = path.replace(/\\/g, '/');
        setFilePath(cleanPath);
        await loadCsvPreview(cleanPath, 'Result');
      }
    } catch (err) {
      console.error('Failed to browse CSV:', err);
    }
  };

  const loadCsvPreview = async (path: string, sheetName: string) => {
    setIsLoading(true);
    try {
      const data = await previewCsv({
        filePath: path,
        sheetName: sheetName,
        previewRows: 5,
      });
      setCsvPreview(data);
      setSelectedCsvColumn(null);
      setSelectedCsvColumns([]);
    } catch (err: any) {
      alert(`Đọc CSV preview thất bại: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (filePath) {
      await loadCsvPreview(filePath, sheetName);
    }
  };

  const handleColumnClick = (header: string) => {
    if (activeMappingType === 'range') {
      // Toggle in range select columns list
      const updated = [...selectedCsvColumns];
      const idx = updated.indexOf(header);
      if (idx > -1) {
        updated.splice(idx, 1);
      } else {
        updated.push(header);
      }
      setSelectedCsvColumns(updated);
    } else {
      // Single select column
      if (selectedCsvColumn === header) {
        setSelectedCsvColumn(null);
      } else {
        setSelectedCsvColumn(header);
      }
    }
  };

  const isColumnSelected = (header: string) => {
    if (activeMappingType === 'range') {
      return selectedCsvColumns.includes(header);
    }
    return selectedCsvColumn === header;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 animate-in fade-in duration-300 flex flex-col h-[480px]">
      
      {/* Search & Loader Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-3">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Source CSV Preview
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Sheet Selector */}
          {csvPreview && csvPreview.all_sheets.length > 1 && (
            <select
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded px-2.5 py-1 text-xs text-slate-300 outline-none"
            >
              {csvPreview.all_sheets.map((sheet, i) => (
                <option key={i} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleBrowse}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Chọn file mẫu
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-950 rounded-lg border border-slate-850/80 shadow-inner relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-xs text-cyan-400 font-bold">
            <span className="animate-spin text-lg mr-2">🔄</span> Đang đọc file gốc...
          </div>
        ) : csvPreview ? (
          <table className="w-full border-collapse text-xs text-left">
            <thead className="sticky top-0 bg-slate-900 z-10 border-b border-slate-850 shadow-md">
              <tr>
                {csvPreview.headers.map((header, i) => {
                  const active = isColumnSelected(header);
                  return (
                    <th
                      key={i}
                      id={`csv-col-${header.replace(/\s+/g, '-')}`}
                      onClick={() => handleColumnClick(header)}
                      className={`py-3 px-4 font-bold border-r border-slate-850/40 cursor-pointer select-none transition-colors ${
                        active
                          ? 'bg-cyan-950/80 text-cyan-400 font-black border-cyan-800'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate pr-1">{header}</span>
                        {active && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {csvPreview.rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-slate-900 hover:bg-slate-900/35 transition-colors"
                >
                  {csvPreview.headers.map((header, colIdx) => {
                    const active = isColumnSelected(header);
                    return (
                      <td
                        key={colIdx}
                        className={`py-2 px-4 border-r border-slate-900 font-mono text-[11px] ${
                          active
                            ? 'bg-cyan-950/15 text-cyan-300 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        {row[header] !== undefined && row[header] !== null
                          ? String(row[header])
                          : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <Database className="w-10 h-10 text-slate-800" />
            <span className="text-xs">Chưa có dữ liệu. Hãy chọn một file mẫu CSV để bắt đầu.</span>
          </div>
        )}
      </div>

      {/* Grid footer summary */}
      {csvPreview && (
        <div className="text-[10px] text-slate-500 font-semibold flex justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-850/30">
          <span>Tên sheet: <strong className="text-slate-400">{csvPreview.sheet_name}</strong></span>
          <span>Dòng xem trước: <strong className="text-slate-400">{csvPreview.rows.length}/5</strong></span>
          <span>Tổng số dòng dữ liệu: <strong className="text-cyan-400">{csvPreview.total_rows}</strong></span>
        </div>
      )}

    </div>
  );
}
