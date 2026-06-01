import { useState, useEffect } from 'react';
import { useMappingStore } from '../../stores/mappingStore';
import { useProfileStore } from '../../stores/profileStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { usePythonApi } from '../../hooks/usePythonApi';
import { FolderOpen, Grid } from 'lucide-react';

export default function ExcelPreviewTable() {
  const { currentProfile } = useProfileStore();
  const {
    excelPreview,
    setExcelPreview,
    selectedExcelCellOrColumn,
    setSelectedExcelCellOrColumn,
    excelStartCell,
    setExcelStartCell,
    activeMappingType,
  } = useMappingStore();

  const { openFileDialog } = useTauriCommands();
  const { previewExcel } = usePythonApi();
  
  const [filePath, setFilePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('');

  // Auto-load template if a profile is active
  useEffect(() => {
    if (currentProfile?.template.path) {
      setFilePath(currentProfile.template.path);
      setSelectedSheet(currentProfile.template.sheet_name);
      loadExcelPreview(currentProfile.template.path, currentProfile.template.sheet_name);
    }
  }, [currentProfile?.template.path]);

  const handleBrowse = async () => {
    try {
      const path = await openFileDialog(
        'Chọn file Excel Template',
        [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        false
      );
      if (path && typeof path === 'string') {
        const cleanPath = path.replace(/\\/g, '/');
        setFilePath(cleanPath);
        await loadExcelPreview(cleanPath);
      }
    } catch (err) {
      console.error('Failed to browse Excel:', err);
    }
  };

  const loadExcelPreview = async (path: string, sheetName?: string) => {
    setIsLoading(true);
    try {
      const data = await previewExcel({
        filePath: path,
        sheetName: sheetName,
      });
      setExcelPreview(data);
      setSelectedSheet(data.sheet_name);
    } catch (err: any) {
      alert(`Đọc Excel template preview thất bại: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (filePath) {
      await loadExcelPreview(filePath, sheetName);
    }
  };

  const handleCellClick = (address: string, colLetter: string) => {
    if (activeMappingType === 'column') {
      // Column selection highlights the column letter
      setSelectedExcelCellOrColumn(colLetter);
    } else if (activeMappingType === 'cell') {
      // Cell selection highlights the coordinate
      setSelectedExcelCellOrColumn(address);
    } else if (activeMappingType === 'range') {
      // Range selection defines the start coordinate
      setExcelStartCell(address);
    }
  };

  const isCellSelected = (address: string, colLetter: string) => {
    if (activeMappingType === 'column') {
      return selectedExcelCellOrColumn === colLetter;
    } else if (activeMappingType === 'cell') {
      return selectedExcelCellOrColumn === address;
    } else if (activeMappingType === 'range') {
      return excelStartCell === address;
    }
    return false;
  };

  const getCellClassName = (styleHint: string, isSelected: boolean) => {
    let base = 'py-2 px-3 border-r border-b border-slate-900 font-mono text-[11px] min-w-[100px] h-[34px] truncate cursor-pointer transition-all ';
    
    if (isSelected) {
      return base + 'bg-indigo-950/80 text-indigo-300 font-bold border-indigo-700 shadow-inner z-20 relative';
    }

    if (styleHint === 'header') {
      return base + 'bg-slate-850 text-indigo-400 font-bold text-[10px] uppercase';
    }
    if (styleHint === 'formula') {
      return base + 'bg-slate-950 text-emerald-400 italic font-semibold border-l-2 border-l-emerald-600/80';
    }
    if (styleHint === 'data') {
      return base + 'bg-slate-900/60 text-slate-300 hover:bg-slate-800/30';
    }
    return base + 'bg-slate-950/40 text-slate-600 hover:bg-slate-900/20'; // empty
  };

  const getColHeaderName = (colIdx: number) => {
    // Return letter (A, B, C...) based on 1-based index
    let temp = colIdx;
    let letter = '';
    while (temp > 0) {
      let modulo = (temp - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      temp = Math.floor((temp - modulo) / 26);
    }
    return letter;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 animate-in fade-in duration-300 flex flex-col h-[480px]">
      
      {/* Title and controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-3">
        <div className="flex items-center gap-2">
          <Grid className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Target Excel Template Preview
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Sheet select */}
          {excelPreview && excelPreview.sheets.length > 1 && (
            <select
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded px-2.5 py-1 text-xs text-slate-300 outline-none"
            >
              {excelPreview.sheets.map((sheet, i) => (
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

      {/* Grid rendering container */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-950 rounded-lg border border-slate-850/80 shadow-inner relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-xs text-indigo-400 font-bold">
            <span className="animate-spin text-lg mr-2">🔄</span> Đang đọc template...
          </div>
        ) : excelPreview ? (
          <div className="inline-block align-top">
            <table className="border-collapse text-xs text-left z-0 relative table-fixed">
              
              {/* Frozen column letters header */}
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-850 shadow z-30">
                <tr className="h-[34px]">
                  {/* Left-top corner spacing cell */}
                  <th className="sticky left-0 bg-slate-900 py-2 px-3 border-r border-b border-slate-800 text-[10px] text-slate-600 font-bold text-center w-[50px] shrink-0 z-40">
                    Row
                  </th>
                  {Array.from({ length: excelPreview.col_count }).map((_, colIdx) => {
                    const letter = getColHeaderName(colIdx + 1);
                    const active = activeMappingType === 'column' && selectedExcelCellOrColumn === letter;
                    return (
                      <th
                        key={colIdx}
                        id={`excel-col-${letter}`}
                        className={`py-2 px-3 border-r border-slate-800/60 text-[10px] text-center w-[100px] select-none font-bold transition-colors ${
                          active
                            ? 'bg-indigo-950/80 text-indigo-400 font-black border-indigo-700'
                            : 'text-slate-500 bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {letter}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Rows */}
              <tbody>
                {Array.from({ length: excelPreview.row_count }).map((_, rowIdx) => {
                  const rowNumber = rowIdx + 1;
                  return (
                    <tr key={rowIdx} className="hover:bg-slate-900/15">
                      
                      {/* Frozen row number on the left */}
                      <td className="sticky left-0 bg-slate-900 border-r border-b border-slate-800 text-[10px] text-slate-500 font-bold text-center font-mono w-[50px] shrink-0 z-10 shadow-md">
                        {rowNumber}
                      </td>

                      {/* Columns */}
                      {Array.from({ length: excelPreview.col_count }).map((_, colIdx) => {
                        const colNumber = colIdx + 1;
                        const cell = excelPreview.cells[rowIdx]?.[colIdx] || {
                          address: `${getColHeaderName(colNumber)}${rowNumber}`,
                          value: null,
                          row: rowNumber,
                          col: colNumber,
                          col_letter: getColHeaderName(colNumber),
                          is_empty: true,
                          style_hint: 'empty',
                        };

                        const active = isCellSelected(cell.address, cell.col_letter);
                        return (
                          <td
                            key={colIdx}
                            id={`excel-cell-${cell.address}`}
                            onClick={() => handleCellClick(cell.address, cell.col_letter)}
                            className={getCellClassName(cell.style_hint, active)}
                            title={`${cell.address} [${cell.style_hint}]`}
                          >
                            {cell.value !== null && cell.value !== undefined ? String(cell.value) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <Grid className="w-10 h-10 text-slate-800" />
            <span className="text-xs">Chưa có dữ liệu. Hãy chọn một Excel Template mẫu để bắt đầu.</span>
          </div>
        )}
      </div>

      {/* Grid footer summary */}
      {excelPreview && (
        <div className="text-[10px] text-slate-500 font-semibold flex justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-850/30">
          <span>Sheet: <strong className="text-slate-400">{excelPreview.sheet_name}</strong></span>
          <span>Kích thước: <strong className="text-slate-400">{excelPreview.row_count}R x {excelPreview.col_count}C</strong></span>
          {activeMappingType === 'column' && selectedExcelCellOrColumn && (
            <span>Selected Column: <strong className="text-indigo-400 font-bold uppercase">{selectedExcelCellOrColumn}</strong></span>
          )}
          {activeMappingType === 'cell' && selectedExcelCellOrColumn && (
            <span>Selected Cell: <strong className="text-indigo-400 font-bold uppercase">{selectedExcelCellOrColumn}</strong></span>
          )}
          {activeMappingType === 'range' && excelStartCell && (
            <span>Selected Start Cell: <strong className="text-indigo-400 font-bold uppercase">{excelStartCell}</strong></span>
          )}
        </div>
      )}

    </div>
  );
}
