import { useState, useEffect } from 'react';
import { useMappingStore } from '../../stores/mappingStore';
import { Mapping } from '../../types';
import {
  Plus,
  CheckCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function AddMappingPanel() {
  const {
    activeMappingType,
    setActiveMappingType,
    selectedCsvColumn,
    selectedCsvColumns,
    selectedExcelCellOrColumn,
    excelStartCell,
    excelStartRow,
    setExcelStartRow,
    addMapping,
  } = useMappingStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [label, setLabel] = useState('');
  
  // Custom cell mapping source parameter
  const [cellValueSourceType, setCellValueSourceType] = useState<'csv_column' | 'system_date' | 'csv_filename' | 'static'>('csv_column');
  const [staticValue, setStaticValue] = useState('');

  // Auto-advance stepper steps based on selection states
  useEffect(() => {
    if (step === 1) {
      setStep(2);
    }
  }, [activeMappingType]);

  useEffect(() => {
    if (step === 2) {
      if (activeMappingType === 'range' && selectedCsvColumns.length > 0) {
        setStep(3);
      } else if (activeMappingType !== 'range' && selectedCsvColumn) {
        setStep(3);
      }
    }
  }, [selectedCsvColumn, selectedCsvColumns]);

  useEffect(() => {
    if (step === 3) {
      if (activeMappingType === 'column' && selectedExcelCellOrColumn) {
        setStep(4);
      } else if (activeMappingType === 'cell' && selectedExcelCellOrColumn) {
        setStep(4);
      } else if (activeMappingType === 'range' && excelStartCell) {
        setStep(4);
      }
    }
  }, [selectedExcelCellOrColumn, excelStartCell]);

  const handleResetStep = () => {
    setStep(1);
    setLabel('');
    useMappingStore.getState().setSelectedCsvColumn(null);
    useMappingStore.getState().setSelectedCsvColumns([]);
    useMappingStore.getState().setSelectedExcelCellOrColumn(null);
    useMappingStore.getState().setExcelStartCell('B10');
  };

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      alert('Vui lòng điền tên nhãn cho mapping.');
      return;
    }

    const uuid = crypto.randomUUID();

    if (activeMappingType === 'column') {
      if (!selectedCsvColumn || !selectedExcelCellOrColumn) return;
      const newColMapping: Mapping = {
        id: uuid,
        type: 'column',
        label: label.trim(),
        csv_column: selectedCsvColumn,
        excel_column: selectedExcelCellOrColumn,
        excel_start_row: excelStartRow,
      };
      addMapping(newColMapping);
    } else if (activeMappingType === 'cell') {
      if (!selectedExcelCellOrColumn) return;
      
      let finalValueSource = '';
      if (cellValueSourceType === 'csv_column') {
        finalValueSource = selectedCsvColumn || '';
      } else if (cellValueSourceType === 'system_date') {
        finalValueSource = 'system_date';
      } else if (cellValueSourceType === 'csv_filename') {
        finalValueSource = 'csv_filename';
      } else if (cellValueSourceType === 'static') {
        finalValueSource = `static:${staticValue.trim()}`;
      }

      const newCellMapping: Mapping = {
        id: uuid,
        type: 'cell',
        label: label.trim(),
        value_source: finalValueSource,
        excel_cell: selectedExcelCellOrColumn,
      };
      addMapping(newCellMapping);
    } else if (activeMappingType === 'range') {
      if (selectedCsvColumns.length === 0 || !excelStartCell) return;
      const newRangeMapping: Mapping = {
        id: uuid,
        type: 'range',
        label: label.trim(),
        csv_columns: [...selectedCsvColumns],
        excel_start_cell: excelStartCell,
      };
      addMapping(newRangeMapping);
    }

    handleResetStep();
  };

  const getStepIndicatorClass = (currentStep: number) => {
    if (step === currentStep) return 'bg-cyan-500 text-slate-950 font-black shadow shadow-cyan-500/20';
    if (step > currentStep) return 'bg-emerald-950/80 text-emerald-400 border border-emerald-900 font-bold';
    return 'bg-slate-950 text-slate-600 border border-slate-850';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-850 pb-3">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Create Custom Mapping Link
          </h3>
        </div>
        <button
          onClick={handleResetStep}
          className="text-xs bg-slate-950 border border-slate-850 hover:border-slate-700 hover:text-cyan-400 font-bold px-2 py-1 rounded transition-colors text-slate-500"
          title="Reset stepper"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stepper Progress bar */}
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-slate-500 gap-1 border-b border-slate-850 pb-3.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${getStepIndicatorClass(1)}`}>1</span>
          <span className={step === 1 ? 'text-cyan-400 font-extrabold' : ''}>Type</span>
        </div>
        <ArrowRight className="w-3 h-3 text-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${getStepIndicatorClass(2)}`}>2</span>
          <span className={step === 2 ? 'text-cyan-400 font-extrabold' : ''}>Source</span>
        </div>
        <ArrowRight className="w-3 h-3 text-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${getStepIndicatorClass(3)}`}>3</span>
          <span className={step === 3 ? 'text-cyan-400 font-extrabold' : ''}>Target</span>
        </div>
        <ArrowRight className="w-3 h-3 text-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${getStepIndicatorClass(4)}`}>4</span>
          <span className={step === 4 ? 'text-cyan-400 font-extrabold' : ''}>Confirm</span>
        </div>
      </div>

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="space-y-3.5 animate-in slide-in-from-top-1 duration-200">
          <span className="text-xs text-slate-400 font-semibold block">
            Chọn loại mapping liên kết muốn tạo:
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => setActiveMappingType('column')}
              className={`p-3.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                activeMappingType === 'column'
                  ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300'
                  : 'border-slate-850 bg-slate-950 hover:bg-slate-850/50 hover:border-slate-750 text-slate-400'
              }`}
            >
              <div>
                <span className="font-extrabold block text-xs tracking-wide">Column Mapping (Cột → Cột)</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Xử lý lặp qua các dòng mẫu dữ liệu. Kết quả: A10, A11, A12...</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </button>

            <button
              onClick={() => setActiveMappingType('cell')}
              className={`p-3.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                activeMappingType === 'cell'
                  ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                  : 'border-slate-850 bg-slate-950 hover:bg-slate-850/50 hover:border-slate-750 text-slate-400'
              }`}
            >
              <div>
                <span className="font-extrabold block text-xs tracking-wide">Cell Mapping (Ghi Ô Cố Định)</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Điền các giá trị tĩnh hoặc thông tin chung vào ô cố định (e.g. C5).</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
            </button>

            <button
              onClick={() => setActiveMappingType('range')}
              className={`p-3.5 rounded-lg border text-left flex justify-between items-center transition-all ${
                activeMappingType === 'range'
                  ? 'border-indigo-500 bg-indigo-950/20 text-indigo-300'
                  : 'border-slate-850 bg-slate-950 hover:bg-slate-850/50 hover:border-slate-750 text-slate-400'
              }`}
            >
              <div>
                <span className="font-extrabold block text-xs tracking-wide">Range Mapping (Vùng → Vùng)</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Sao chép nguyên cụm các cột CSV vào vùng Excel bắt đầu từ ô C10.</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Source */}
      {step === 2 && (
        <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
          <div className="bg-indigo-950/20 border border-indigo-900/60 p-3.5 rounded-lg flex gap-2.5 text-slate-300 text-xs">
            <span className="text-base shrink-0">💡</span>
            <div className="space-y-1">
              <span className="font-bold text-indigo-400 uppercase tracking-wide">Hướng dẫn chọn Nguồn:</span>
              <p className="text-slate-400">
                {activeMappingType === 'range'
                  ? 'Click chuột chọn một hoặc nhiều Cột trong bảng "Source CSV Preview" ở bên trái để đưa vào vùng copy.'
                  : 'Click chuột chọn một Cột trong bảng "Source CSV Preview" ở bên trái để làm dữ liệu nguồn.'}
              </p>
            </div>
          </div>

          {activeMappingType === 'range' ? (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Cột CSV đã chọn ({selectedCsvColumns.length}):
              </span>
              {selectedCsvColumns.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                  {selectedCsvColumns.map((col, i) => (
                    <span key={i} className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded">
                      {col}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-rose-400/80 italic block">Vui lòng click chọn ít nhất một cột trong bảng CSV.</span>
              )}
            </div>
          ) : (
            <div className="space-y-1 bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs">
              <span className="text-slate-500">Cột CSV đã chọn:</span>
              {selectedCsvColumn ? (
                <span className="font-bold text-cyan-400 font-mono block mt-0.5">{selectedCsvColumn}</span>
              ) : (
                <span className="text-rose-400/80 italic block">Chưa chọn cột. Click một cột trên bảng CSV.</span>
              )}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-400 font-bold py-2 rounded text-xs transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={activeMappingType === 'range' ? selectedCsvColumns.length === 0 : !selectedCsvColumn}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-2 rounded text-xs transition-colors"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Target */}
      {step === 3 && (
        <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
          <div className="bg-indigo-950/20 border border-indigo-900/60 p-3.5 rounded-lg flex gap-2.5 text-slate-300 text-xs">
            <span className="text-base shrink-0">💡</span>
            <div className="space-y-1">
              <span className="font-bold text-indigo-400 uppercase tracking-wide">Hướng dẫn chọn Đích:</span>
              <p className="text-slate-400">
                {activeMappingType === 'column'
                  ? 'Click chuột chọn một Cột (nhãn chữ cái A, B, C...) trong bảng "Target Excel Template Preview" ở bên phải.'
                  : activeMappingType === 'cell'
                  ? 'Click chuột chọn một Ô cụ thể (ví dụ: B10, C5) trong bảng "Target Excel Template Preview" ở bên phải.'
                  : 'Click chuột chọn Ô bắt đầu (ô góc trên cùng bên trái của vùng copy, ví dụ: B10) trên bảng Excel.'}
              </p>
            </div>
          </div>

          <div className="space-y-1 bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs">
            <span className="text-slate-500">Đích Excel đã chọn:</span>
            {activeMappingType === 'column' && selectedExcelCellOrColumn && (
              <span className="font-bold text-emerald-400 block mt-0.5">Cột Excel: {selectedExcelCellOrColumn}</span>
            )}
            {activeMappingType === 'cell' && selectedExcelCellOrColumn && (
              <span className="font-bold text-cyan-400 block mt-0.5">Ô Excel: {selectedExcelCellOrColumn}</span>
            )}
            {activeMappingType === 'range' && excelStartCell && (
              <span className="font-bold text-indigo-400 block mt-0.5">Ô bắt đầu: {excelStartCell}</span>
            )}
            {!selectedExcelCellOrColumn && activeMappingType !== 'range' && (
              <span className="text-rose-400/80 italic block">Chưa chọn đích. Click bảng Excel.</span>
            )}
            {!excelStartCell && activeMappingType === 'range' && (
              <span className="text-rose-400/80 italic block">Chưa chọn ô bắt đầu. Click bảng Excel.</span>
            )}
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-400 font-bold py-2 rounded text-xs transition-colors"
            >
              Quay lại
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={
                activeMappingType === 'column' ? !selectedExcelCellOrColumn :
                activeMappingType === 'cell' ? !selectedExcelCellOrColumn :
                !excelStartCell
              }
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-2 rounded text-xs transition-colors"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm Mapping Form */}
      {step === 4 && (
        <form onSubmit={handleAddMapping} className="space-y-4 animate-in slide-in-from-top-1 duration-200">
          
          {/* Label Input */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-bold block">
              Tên nhãn Mapping (Label) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Max Force, Test Date..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all"
              required
            />
          </div>

          {/* Type specific parameters inside confirm step */}
          {activeMappingType === 'column' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                Dòng bắt đầu điền dữ liệu Excel (Default: 10)
              </label>
              <input
                type="number"
                min={1}
                value={excelStartRow}
                onChange={(e) => setExcelStartRow(parseInt(e.target.value) || 10)}
                className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
              />
            </div>
          )}

          {activeMappingType === 'cell' && (
            <div className="space-y-3.5 bg-slate-950 border border-slate-850 p-4 rounded-xl">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Value Source Type:
                </label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCellValueSourceType('csv_column')}
                    className={`py-1.5 px-2 rounded border font-semibold ${
                      cellValueSourceType === 'csv_column'
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    CSV Column
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellValueSourceType('system_date')}
                    className={`py-1.5 px-2 rounded border font-semibold ${
                      cellValueSourceType === 'system_date'
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    System Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellValueSourceType('csv_filename')}
                    className={`py-1.5 px-2 rounded border font-semibold ${
                      cellValueSourceType === 'csv_filename'
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    CSV Filename
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellValueSourceType('static')}
                    className={`py-1.5 px-2 rounded border font-semibold ${
                      cellValueSourceType === 'static'
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                  >
                    Static String
                  </button>
                </div>
              </div>

              {cellValueSourceType === 'static' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-xs text-slate-400 block font-bold">Giá trị Tĩnh (Static Value)</label>
                  <input
                    type="text"
                    placeholder="e.g. ISO 13934-1, Lab Tech A..."
                    value={staticValue}
                    onChange={(e) => setStaticValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Stepper controls */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-400 font-bold py-2 rounded text-xs transition-colors"
            >
              Quay lại
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 rounded text-xs transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Thêm Mapping
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
