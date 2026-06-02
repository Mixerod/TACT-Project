import { vi } from 'vitest';
import { Profile, AppConfig } from '../../types';

/**
 * Stateful mock for the Tauri `invoke` bridge.
 *
 * The real Rust backend owns profiles + AppConfig persistence. Here we keep an
 * in-memory copy so store tests exercise realistic round-trips (save → reload).
 */

const DEFAULT_CONFIG: AppConfig = {
  app_version: '1.0.0',
  profiles_directory: 'C:\\Users\\test\\profiles',
  last_used_profile_id: '',
  python_port: 48921,
  theme: 'dark',
  language: 'en',
};

interface TauriMockState {
  profiles: Profile[];
  config: AppConfig;
  sidecarStatus: 'running' | 'starting' | 'dead';
}

export const tauriState: TauriMockState = {
  profiles: [],
  config: { ...DEFAULT_CONFIG },
  sidecarStatus: 'running',
};

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: overrides.id ?? `profile-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Tensile Test',
    method_code: 'ASTM-D5034',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    source: { sheet_name: 'Result', header_row: 0 },
    template: { path: 'C:\\templates\\report.xlsx', sheet_name: 'Sheet1' },
    output: {
      directory: 'C:\\reports',
      filename_pattern: 'Report_{order}_{color}_{date}.xlsx',
      date_format: 'YYYYMMDD',
    },
    identity: {
      order_source: 'both',
      color_source: 'both',
      filename_regex: '^([A-Z0-9\\-]+)_([A-Z]+)_',
      filename_order_group: 1,
      filename_color_group: 2,
      condition_sheet: 'Condition',
      condition_keys: ['Sample name'],
      output_cells: [
        { field: 'order', cell: 'B2' },
        { field: 'color', cell: 'B3' },
      ],
    },
    mappings: [],
    ...overrides,
  };
}

export function resetTauriMocks(): void {
  tauriState.profiles = [];
  tauriState.config = { ...DEFAULT_CONFIG };
  tauriState.sidecarStatus = 'running';
  invokeMock.mockClear();
}

/** Drop-in replacement for `@tauri-apps/api/core`'s `invoke`. */
export const invokeMock = vi.fn(async (cmd: string, args?: any): Promise<any> => {
  switch (cmd) {
    case 'load_profiles':
      return tauriState.profiles.map((p) => ({ ...p }));

    case 'get_app_config':
      return { ...tauriState.config };

    case 'save_app_config':
      tauriState.config = { ...args.config };
      return undefined;

    case 'save_profile': {
      const incoming: Profile = args.profile;
      if (incoming.id) {
        const exists = tauriState.profiles.some((p) => p.id === incoming.id);
        if (exists) {
          tauriState.profiles = tauriState.profiles.map((p) =>
            p.id === incoming.id ? { ...incoming } : p,
          );
        } else {
          tauriState.profiles.push({ ...incoming });
        }
      } else {
        // Rust assigns an id + timestamps for brand-new profiles.
        const created: Profile = {
          ...incoming,
          id: `profile-${tauriState.profiles.length + 1}`,
          updated_at: new Date().toISOString(),
        };
        tauriState.profiles.push(created);
      }
      return undefined;
    }

    case 'delete_profile':
      tauriState.profiles = tauriState.profiles.filter((p) => p.id !== args.profileId);
      return undefined;

    case 'get_sidecar_status':
      return tauriState.sidecarStatus;

    case 'restart_python_sidecar':
      return undefined;

    case 'open_folder_in_explorer':
      return undefined;

    case 'open_file_dialog':
    case 'open_folder_dialog':
      return null;

    default:
      throw new Error(`tauriMocks: unhandled invoke command "${cmd}"`);
  }
});
