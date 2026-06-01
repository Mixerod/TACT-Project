import {
  CsvPreviewData,
  ExcelPreviewData,
  IdentityResult,
  Profile,
} from '../types';

const BASE_URL = 'http://localhost:48921/api';

export interface ApiError {
  error: boolean;
  code: string;
  message: string;
  detail?: string;
}

export interface PreviewCsvParams {
  filePath: string;
  sheetName?: string;
  previewRows?: number;
}

export interface PreviewExcelParams {
  filePath: string;
  sheetName?: string;
}

export interface ExtractIdentityParams {
  filePath: string;
  identityConfig: any;
}

export interface PreviewBatchParams {
  filePaths: string[];
  profileId: string;
}

export interface PreviewBatchItem {
  file_path: string;
  filename: string;
  identity: {
    order: string | null;
    color: string | null;
    confidence: 'high' | 'low';
    warnings: string[];
  };
  output_file: string;
  output_exists: boolean;
  status: 'ready' | 'warning' | 'error';
}

export interface PreviewBatchResponse {
  items: PreviewBatchItem[];
}

export interface ValidateProfileResponse {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export type ProcessProgressUpdate =
  | { type: 'progress'; file: string; step: 'reading_csv' | 'writing_excel' }
  | {
      type: 'result';
      file: string;
      status: 'success' | 'error';
      output?: string;
      rows_processed?: number;
      duration_ms?: number;
      error_message?: string;
    }
  | { type: 'done'; total: number; success: number; error: number };

export const usePythonApi = () => {
  const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      let errData: ApiError;
      try {
        errData = await response.json();
      } catch {
        errData = {
          error: true,
          code: 'HTTP_ERROR',
          message: `Lỗi kết nối server Python (${response.status})`,
          detail: response.statusText,
        };
      }
      throw errData;
    }
    return response.json() as Promise<T>;
  };

  const checkHealth = async (): Promise<{ status: string; version: string }> => {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
    });
    return handleResponse<{ status: string; version: string }>(response);
  };

  const previewCsv = async (params: PreviewCsvParams): Promise<CsvPreviewData> => {
    const response = await fetch(`${BASE_URL}/preview-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: params.filePath,
        sheet_name: params.sheetName || 'Result',
        preview_rows: params.previewRows ?? 5,
      }),
    });
    return handleResponse<CsvPreviewData>(response);
  };

  const previewExcel = async (params: PreviewExcelParams): Promise<ExcelPreviewData> => {
    const response = await fetch(`${BASE_URL}/preview-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: params.filePath,
        sheet_name: params.sheetName,
      }),
    });
    return handleResponse<ExcelPreviewData>(response);
  };

  const extractIdentity = async (params: ExtractIdentityParams): Promise<IdentityResult> => {
    const response = await fetch(`${BASE_URL}/extract-identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: params.filePath,
        identity_config: params.identityConfig,
      }),
    });
    return handleResponse<IdentityResult>(response);
  };

  const previewBatch = async (params: PreviewBatchParams): Promise<PreviewBatchResponse> => {
    const response = await fetch(`${BASE_URL}/preview-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_paths: params.filePaths,
        profile_id: params.profileId,
      }),
    });
    return handleResponse<PreviewBatchResponse>(response);
  };

  const validateProfile = async (profile: Partial<Profile>): Promise<ValidateProfileResponse> => {
    const response = await fetch(`${BASE_URL}/validate-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    return handleResponse<ValidateProfileResponse>(response);
  };

  const processFiles = async (
    filePaths: string[],
    profileId: string,
    onUpdate: (update: ProcessProgressUpdate) => void
  ): Promise<void> => {
    const response = await fetch(`${BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_paths: filePaths,
        profile_id: profileId,
      }),
    });

    if (!response.ok) {
      let errData: ApiError;
      try {
        errData = await response.json();
      } catch {
        errData = {
          error: true,
          code: 'HTTP_ERROR',
          message: 'Lỗi khởi chạy tiến trình xử lý dữ liệu.',
          detail: response.statusText,
        };
      }
      throw errData;
    }

    if (!response.body) {
      throw {
        error: true,
        code: 'STREAM_ERROR',
        message: 'Server không trả về luồng dữ liệu (empty response body).',
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update = JSON.parse(line) as ProcessProgressUpdate;
              onUpdate(update);
            } catch (e) {
              console.error('Failed to parse NDJSON line:', line, e);
            }
          }
        }
      }

      // Process any remaining bytes in the buffer
      if (buffer.trim()) {
        try {
          const update = JSON.parse(buffer) as ProcessProgressUpdate;
          onUpdate(update);
        } catch (e) {
          console.error('Failed to parse NDJSON line at end of stream:', buffer, e);
        }
      }
    } catch (streamError) {
      console.error('Error reading process stream:', streamError);
      throw {
        error: true,
        code: 'STREAM_READ_FAILED',
        message: 'Lỗi mất kết nối giữa chừng khi đang nhận dữ liệu từ server.',
        detail: String(streamError),
      };
    }
  };

  return {
    checkHealth,
    previewCsv,
    previewExcel,
    extractIdentity,
    previewBatch,
    validateProfile,
    processFiles,
  };
};
