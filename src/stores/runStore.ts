import { create } from 'zustand';
import { PreviewBatchItem, ProcessProgressUpdate } from '../hooks/usePythonApi';

export type RunState = 'IDLE' | 'PREVIEWING' | 'PROCESSING' | 'DONE' | 'ERROR';

export interface FileProgress {
  file: string;
  step: 'reading_csv' | 'writing_excel' | 'completed' | 'failed';
  status: 'pending' | 'processing' | 'success' | 'error';
  output?: string;
  rowsProcessed?: number;
  durationMs?: number;
  errorMessage?: string;
}

interface RunStoreState {
  state: RunState;
  selectedFiles: string[];
  batchItems: PreviewBatchItem[];
  progressUpdates: Record<string, FileProgress>;
  summary: { total: number; success: number; error: number } | null;
  errorMessage: string | null;

  setSelectedFiles: (files: string[]) => void;
  runPreview: (profileId: string) => Promise<void>;
  startProcessing: (profileId: string) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export const useRunStore = create<RunStoreState>((set, get) => ({
  state: 'IDLE',
  selectedFiles: [],
  batchItems: [],
  progressUpdates: {},
  summary: null,
  errorMessage: null,

  clearError: () => set({ errorMessage: null }),

  setSelectedFiles: (files: string[]) => {
    // Reset progress tracking when new files are selected
    const initialProgress: Record<string, FileProgress> = {};
    files.forEach((path) => {
      const filename = path.split(/[/\\]/).pop() || path;
      initialProgress[filename] = {
        file: filename,
        step: 'reading_csv',
        status: 'pending',
      };
    });

    set({
      selectedFiles: files,
      state: 'IDLE',
      batchItems: [],
      progressUpdates: initialProgress,
      summary: null,
      errorMessage: null,
    });
  },

  runPreview: async (profileId: string) => {
    const files = get().selectedFiles;
    if (files.length === 0) return;

    set({ state: 'PREVIEWING', errorMessage: null });
    try {
      const response = await fetch('http://localhost:48921/api/preview-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_paths: files,
          profile_id: profileId,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ message: 'Không thể tải preview batch' }));
        throw new Error(errJson.message || 'Error occurred during preview');
      }

      const data = await response.json();
      set({
        batchItems: data.items,
        state: 'PREVIEWING',
      });
    } catch (err: any) {
      console.error('runPreview failed:', err);
      set({
        state: 'ERROR',
        errorMessage: err.message || 'Lỗi kết nối khi tải preview file.',
      });
    }
  },

  startProcessing: async (profileId: string) => {
    const files = get().selectedFiles;
    if (files.length === 0) return;

    set({ state: 'PROCESSING', errorMessage: null, summary: null });

    // Initialize progress record
    const progress: Record<string, FileProgress> = {};
    files.forEach((path) => {
      const filename = path.split(/[/\\]/).pop() || path;
      progress[filename] = {
        file: filename,
        step: 'reading_csv',
        status: 'pending',
      };
    });
    set({ progressUpdates: progress });

    try {
      const response = await fetch('http://localhost:48921/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_paths: files,
          profile_id: profileId,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ message: 'Lỗi khởi chạy process' }));
        throw new Error(errJson.message || 'Xảy ra lỗi khi gửi yêu cầu xử lý.');
      }

      if (!response.body) {
        throw new Error('Không nhận được dữ liệu phản hồi từ server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update = JSON.parse(line) as ProcessProgressUpdate;
              
              if (update.type === 'progress') {
                set((state) => {
                  const updatedProgress = { ...state.progressUpdates };
                  updatedProgress[update.file] = {
                    ...updatedProgress[update.file],
                    step: update.step,
                    status: 'processing',
                  };
                  return { progressUpdates: updatedProgress };
                });
              } else if (update.type === 'result') {
                set((state) => {
                  const updatedProgress = { ...state.progressUpdates };
                  if (update.status === 'success') {
                    updatedProgress[update.file] = {
                      ...updatedProgress[update.file],
                      step: 'completed',
                      status: 'success',
                      output: update.output,
                      rowsProcessed: update.rows_processed,
                      durationMs: update.duration_ms,
                    };
                  } else {
                    updatedProgress[update.file] = {
                      ...updatedProgress[update.file],
                      step: 'failed',
                      status: 'error',
                      errorMessage: update.error_message,
                    };
                  }
                  return { progressUpdates: updatedProgress };
                });
              } else if (update.type === 'done') {
                set({
                  state: 'DONE',
                  summary: {
                    total: update.total,
                    success: update.success,
                    error: update.error,
                  },
                });
              }
            } catch (jsonErr) {
              console.error('Failed to parse NDJSON line inside runStore stream:', line, jsonErr);
            }
          }
        }
      }

      // Final remainder check
      if (buffer.trim()) {
        try {
          const update = JSON.parse(buffer) as ProcessProgressUpdate;
          if (update.type === 'done') {
            set({
              state: 'DONE',
              summary: {
                total: update.total,
                success: update.success,
                error: update.error,
              },
            });
          }
        } catch {}
      }

    } catch (err: any) {
      console.error('startProcessing failed:', err);
      set({
        state: 'ERROR',
        errorMessage: err.message || 'Lỗi kết nối mất tín hiệu trong khi đang xử lý.',
      });
    }
  },

  reset: () => {
    set({
      state: 'IDLE',
      selectedFiles: [],
      batchItems: [],
      progressUpdates: {},
      summary: null,
      errorMessage: null,
    });
  },
}));
