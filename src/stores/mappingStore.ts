import { create } from 'zustand';
import { CsvPreviewData, ExcelPreviewData, IdentityResult, Mapping, MappingType } from '../types';

interface MappingStoreState {
  csvPreview: CsvPreviewData | null;
  excelPreview: ExcelPreviewData | null;
  identityResult: IdentityResult | null;
  
  activeMappingType: MappingType;
  selectedCsvColumn: string | null;
  selectedCsvColumns: string[]; // For range mapping support
  selectedExcelCellOrColumn: string | null; // e.g. "D" or "C5"
  excelStartRow: number; // For column mappings (default 10)
  excelStartCell: string; // For range mappings (default "B10")
  
  mappings: Mapping[];
  isDraft: boolean;

  setCsvPreview: (data: CsvPreviewData | null) => void;
  setExcelPreview: (data: ExcelPreviewData | null) => void;
  setIdentityResult: (res: IdentityResult | null) => void;
  
  setMappings: (mappings: Mapping[]) => void;
  addMapping: (mapping: Mapping) => void;
  removeMapping: (id: string) => void;
  
  setSelectedCsvColumn: (col: string | null) => void;
  setSelectedCsvColumns: (cols: string[]) => void;
  setSelectedExcelCellOrColumn: (target: string | null) => void;
  setExcelStartRow: (row: number) => void;
  setExcelStartCell: (cell: string) => void;
  setActiveMappingType: (type: MappingType) => void;
  
  clearEditor: () => void;
}

export const useMappingStore = create<MappingStoreState>((set) => ({
  csvPreview: null,
  excelPreview: null,
  identityResult: null,
  
  activeMappingType: 'column',
  selectedCsvColumn: null,
  selectedCsvColumns: [],
  selectedExcelCellOrColumn: null,
  excelStartRow: 10,
  excelStartCell: 'B10',
  
  mappings: [],
  isDraft: false,

  setCsvPreview: (csvPreview) => set({ csvPreview }),
  setExcelPreview: (excelPreview) => set({ excelPreview }),
  setIdentityResult: (identityResult) => set({ identityResult }),
  
  setMappings: (mappings) => set({ mappings, isDraft: false }),
  
  addMapping: (mapping) =>
    set((state) => ({
      mappings: [...state.mappings.filter((m) => m.id !== mapping.id), mapping],
      isDraft: true,
      selectedCsvColumn: null,
      selectedCsvColumns: [],
      selectedExcelCellOrColumn: null,
    })),
    
  removeMapping: (id) =>
    set((state) => ({
      mappings: state.mappings.filter((m) => m.id !== id),
      isDraft: true,
    })),

  setSelectedCsvColumn: (selectedCsvColumn) => set({ selectedCsvColumn }),
  setSelectedCsvColumns: (selectedCsvColumns) => set({ selectedCsvColumns }),
  setSelectedExcelCellOrColumn: (selectedExcelCellOrColumn) => set({ selectedExcelCellOrColumn }),
  setExcelStartRow: (excelStartRow) => set({ excelStartRow }),
  setExcelStartCell: (excelStartCell) => set({ excelStartCell }),
  setActiveMappingType: (activeMappingType) =>
    set({
      activeMappingType,
      selectedCsvColumn: null,
      selectedCsvColumns: [],
      selectedExcelCellOrColumn: null,
    }),

  clearEditor: () =>
    set({
      csvPreview: null,
      excelPreview: null,
      identityResult: null,
      selectedCsvColumn: null,
      selectedCsvColumns: [],
      selectedExcelCellOrColumn: null,
      excelStartRow: 10,
      excelStartCell: 'B10',
      mappings: [],
      isDraft: false,
    }),
}));
