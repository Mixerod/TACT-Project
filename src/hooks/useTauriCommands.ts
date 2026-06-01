import { invoke } from '@tauri-apps/api/core';
import { Profile, AppConfig } from '../types';

export interface FileDialogFilter {
  name: string;
  extensions: string[];
}

export const useTauriCommands = () => {
  const openFileDialog = async (
    title?: string,
    filters?: FileDialogFilter[],
    multiple?: boolean
  ): Promise<string | string[] | null> => {
    try {
      return await invoke<string | string[] | null>('open_file_dialog', {
        title,
        filters,
        multiple,
      });
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      throw error;
    }
  };

  const openFolderDialog = async (title?: string): Promise<string | null> => {
    try {
      return await invoke<string | null>('open_folder_dialog', { title });
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
      throw error;
    }
  };

  const loadProfiles = async (): Promise<Profile[]> => {
    try {
      return await invoke<Profile[]>('load_profiles');
    } catch (error) {
      console.error('Failed to load profiles:', error);
      throw error;
    }
  };

  const saveProfile = async (profile: Profile): Promise<void> => {
    try {
      await invoke<void>('save_profile', { profile });
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  };

  const deleteProfile = async (profileId: string): Promise<void> => {
    try {
      await invoke<void>('delete_profile', { profileId });
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  };

  const getAppConfig = async (): Promise<AppConfig> => {
    try {
      return await invoke<AppConfig>('get_app_config');
    } catch (error) {
      console.error('Failed to get app config:', error);
      throw error;
    }
  };

  const saveAppConfig = async (config: AppConfig): Promise<void> => {
    try {
      await invoke<void>('save_app_config', { config });
    } catch (error) {
      console.error('Failed to save app config:', error);
      throw error;
    }
  };

  const openFolderInExplorer = async (path: string): Promise<void> => {
    try {
      await invoke<void>('open_folder_in_explorer', { path });
    } catch (error) {
      console.error('Failed to open folder in explorer:', error);
      throw error;
    }
  };

  const restartPythonSidecar = async (): Promise<void> => {
    try {
      await invoke<void>('restart_python_sidecar');
    } catch (error) {
      console.error('Failed to restart Python sidecar:', error);
      throw error;
    }
  };

  const getSidecarStatus = async (): Promise<'running' | 'starting' | 'dead'> => {
    try {
      return await invoke<'running' | 'starting' | 'dead'>('get_sidecar_status');
    } catch (error) {
      console.error('Failed to get sidecar status:', error);
      return 'dead';
    }
  };

  return {
    openFileDialog,
    openFolderDialog,
    loadProfiles,
    saveProfile,
    deleteProfile,
    getAppConfig,
    saveAppConfig,
    openFolderInExplorer,
    restartPythonSidecar,
    getSidecarStatus,
  };
};
