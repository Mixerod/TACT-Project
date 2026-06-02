import { http, HttpResponse } from 'msw';
import type { ProcessProgressUpdate } from '../../hooks/usePythonApi';

/**
 * MSW handlers for the Python FastAPI sidecar (localhost:48921).
 * Defaults model the happy path; tests override per-case with `server.use(...)`.
 */

const BASE = 'http://localhost:48921/api';

/** Serialize update objects into the NDJSON stream the backend emits for /process. */
export function ndjson(updates: ProcessProgressUpdate[]): string {
  return updates.map((u) => JSON.stringify(u)).join('\n') + '\n';
}

/** Build a streamed Response body from NDJSON text (mirrors the real chunked stream). */
export function streamingResponse(body: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}

const defaultBatchItem = (filePath: string) => ({
  file_path: filePath,
  filename: filePath.split(/[/\\]/).pop() ?? filePath,
  identity: {
    order: 'ORD2024001',
    color: 'RED',
    confidence: 'high' as const,
    warnings: [],
  },
  output_file: 'C:\\reports\\Report_ORD2024001_RED_20260101.xlsx',
  output_exists: false,
  status: 'ready' as const,
});

export const handlers = [
  http.get(`${BASE}/health`, () =>
    HttpResponse.json({ status: 'ok', version: '1.0.0' }),
  ),

  http.post(`${BASE}/preview-batch`, async ({ request }) => {
    const body = (await request.json()) as { file_paths: string[] };
    return HttpResponse.json({
      items: (body.file_paths ?? []).map(defaultBatchItem),
    });
  }),

  http.post(`${BASE}/process`, async ({ request }) => {
    const body = (await request.json()) as { file_paths: string[] };
    const files = body.file_paths ?? [];
    const updates: ProcessProgressUpdate[] = [];
    for (const path of files) {
      const file = path.split(/[/\\]/).pop() ?? path;
      updates.push({ type: 'progress', file, step: 'reading_csv' });
      updates.push({ type: 'progress', file, step: 'writing_excel' });
      updates.push({
        type: 'result',
        file,
        status: 'success',
        output: `C:\\reports\\${file}.xlsx`,
        rows_processed: 42,
        duration_ms: 120,
      });
    }
    updates.push({
      type: 'done',
      total: files.length,
      success: files.length,
      error: 0,
    });
    return streamingResponse(ndjson(updates));
  }),

  http.post(`${BASE}/preview-csv`, () =>
    HttpResponse.json({
      sheet_name: 'Result',
      headers: ['Sample ID', 'Max Force (N)'],
      rows: [{ 'Sample ID': 'S1', 'Max Force (N)': 100 }],
      total_rows: 1,
      all_sheets: ['Result'],
    }),
  ),

  http.post(`${BASE}/preview-excel`, () =>
    HttpResponse.json({
      sheet_name: 'Sheet1',
      sheets: ['Sheet1'],
      cells: [],
      row_count: 0,
      col_count: 0,
    }),
  ),

  http.post(`${BASE}/extract-identity`, () =>
    HttpResponse.json({
      order: 'ORD2024001',
      color: 'RED',
      order_source: 'filename',
      color_source: 'filename',
      confidence: 'high',
      warnings: [],
    }),
  ),

  http.post(`${BASE}/validate-profile`, () =>
    HttpResponse.json({ valid: true, errors: [], warnings: [] }),
  ),
];
