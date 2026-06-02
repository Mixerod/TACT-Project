// Shared constants for the dev-only Debug Panel.

import { LogLevel } from '../../lib/devLogger';

export const SIDECAR_BASE_URL = 'http://localhost:48921/api';

export interface ApiEndpoint {
  id: string;
  label: string;
  method: 'GET' | 'POST';
  path: string; // appended to SIDECAR_BASE_URL
  isStream?: boolean;
  defaultBody: string; // pretty-printed JSON, empty for GET
}

const pretty = (value: unknown): string => JSON.stringify(value, null, 2);

// Mirrors docs/API_CONTRACTS.md section B. Bodies are editable templates.
export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'health',
    label: 'GET /health',
    method: 'GET',
    path: '/health',
    defaultBody: '',
  },
  {
    id: 'preview-csv',
    label: 'POST /preview-csv',
    method: 'POST',
    path: '/preview-csv',
    defaultBody: pretty({ file_path: '', sheet_name: 'Result', preview_rows: 5 }),
  },
  {
    id: 'preview-excel',
    label: 'POST /preview-excel',
    method: 'POST',
    path: '/preview-excel',
    defaultBody: pretty({ file_path: '', sheet_name: null }),
  },
  {
    id: 'extract-identity',
    label: 'POST /extract-identity',
    method: 'POST',
    path: '/extract-identity',
    defaultBody: pretty({ file_path: '', identity_config: {} }),
  },
  {
    id: 'preview-batch',
    label: 'POST /preview-batch',
    method: 'POST',
    path: '/preview-batch',
    defaultBody: pretty({ file_paths: [], profile_id: '' }),
  },
  {
    id: 'process',
    label: 'POST /process (stream)',
    method: 'POST',
    path: '/process',
    isStream: true,
    defaultBody: pretty({ file_paths: [], profile_id: '' }),
  },
  {
    id: 'validate-profile',
    label: 'POST /validate-profile',
    method: 'POST',
    path: '/validate-profile',
    defaultBody: pretty({ profile: {} }),
  },
];

export const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];

export const LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: 'text-slate-400',
  INFO: 'text-cyan-400',
  WARNING: 'text-amber-400',
  ERROR: 'text-red-400',
};
