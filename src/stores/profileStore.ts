import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Profile, AppConfig } from '../types';

interface ProfileState {
  profiles: Profile[];
  currentProfile: Profile | null;
  isLoading: boolean;
  error: string | null;

  loadProfiles: () => Promise<void>;
  selectProfile: (profileId: string | null) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  createEmptyProfile: () => Profile;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  currentProfile: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await invoke<Profile[]>('load_profiles');
      set({ profiles, isLoading: false });

      // Automatically select the last used profile if set in AppConfig
      const config = await invoke<AppConfig>('get_app_config');
      if (config.last_used_profile_id) {
        const lastProfile = profiles.find((p) => p.id === config.last_used_profile_id);
        if (lastProfile) {
          set({ currentProfile: lastProfile });
        }
      }
    } catch (err: any) {
      console.error('Zustand loadProfiles error:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  selectProfile: async (profileId: string | null) => {
    try {
      if (!profileId) {
        set({ currentProfile: null });
        return;
      }

      const target = get().profiles.find((p) => p.id === profileId) || null;
      set({ currentProfile: target });

      if (target) {
        // Sync with AppConfig last_used_profile_id
        const config = await invoke<AppConfig>('get_app_config');
        config.last_used_profile_id = target.id;
        await invoke('save_app_config', { config });
      }
    } catch (err) {
      console.error('Zustand selectProfile error:', err);
    }
  },

  saveProfile: async (profile: Profile) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('save_profile', { profile });
      
      // Reload profiles to sync state
      const profiles = await invoke<Profile[]>('load_profiles');
      
      // Find the updated profile (if it was a new profile, it now has an ID)
      let updatedProfile: Profile | null = null;
      if (profile.id) {
        updatedProfile = profiles.find((p) => p.id === profile.id) || null;
      } else {
        // If it was a new profile, find the one with the newest timestamp or matching name/method_code
        // However, save_profile returns nothing, but it generates an ID inside Rust.
        // Let's find by matching method_code and name that wasn't in old profiles list,
        // or just the one with the latest updated_at.
        updatedProfile = profiles.reduce<Profile | null>((latest, current) => {
          if (!latest) return current;
          return new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest;
        }, null);
      }

      set({ profiles, isLoading: false });
      
      if (updatedProfile) {
        set({ currentProfile: updatedProfile });
        // Also save as last used profile
        const config = await invoke<AppConfig>('get_app_config');
        config.last_used_profile_id = updatedProfile.id;
        await invoke('save_app_config', { config });
      }
    } catch (err: any) {
      console.error('Zustand saveProfile error:', err);
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  deleteProfile: async (profileId: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('delete_profile', { profileId });
      
      const profiles = await invoke<Profile[]>('load_profiles');
      set({ profiles, isLoading: false });

      if (get().currentProfile?.id === profileId) {
        set({ currentProfile: null });
        
        // Remove from last_used_profile_id in config
        const config = await invoke<AppConfig>('get_app_config');
        if (config.last_used_profile_id === profileId) {
          config.last_used_profile_id = '';
          await invoke('save_app_config', { config });
        }
      }
    } catch (err: any) {
      console.error('Zustand deleteProfile error:', err);
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  createEmptyProfile: (): Profile => {
    return {
      id: '',
      name: '',
      method_code: '',
      created_at: '',
      updated_at: '',
      source: {
        sheet_name: 'Result',
        header_row: 0,
      },
      template: {
        path: '',
        sheet_name: '',
      },
      output: {
        directory: '',
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
        condition_keys: ['Sample name', 'Submission'],
        output_cells: [
          { field: 'order', cell: '' },
          { field: 'color', cell: '' },
        ],
      },
      mappings: [],
    };
  },
}));
