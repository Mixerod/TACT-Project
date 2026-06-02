import { beforeEach, describe, expect, it } from 'vitest';
import { useProfileStore } from './profileStore';
import {
  invokeMock,
  makeProfile,
  tauriState,
} from '../test/mocks/tauriMocks';

/** Reset the singleton Zustand store between tests (mock state is reset in setup.ts). */
function resetStore() {
  useProfileStore.setState({
    profiles: [],
    currentProfile: null,
    isLoading: false,
    error: null,
  });
}

describe('profileStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('loadProfiles', () => {
    it('loads profiles from the backend on mount', async () => {
      tauriState.profiles = [
        makeProfile({ id: 'p1', name: 'Tensile' }),
        makeProfile({ id: 'p2', name: 'Color Fastness' }),
      ];

      await useProfileStore.getState().loadProfiles();

      const state = useProfileStore.getState();
      expect(state.profiles).toHaveLength(2);
      expect(state.profiles.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(invokeMock).toHaveBeenCalledWith('load_profiles');
    });

    it('auto-selects the last used profile from AppConfig', async () => {
      tauriState.profiles = [
        makeProfile({ id: 'p1' }),
        makeProfile({ id: 'p2' }),
      ];
      tauriState.config.last_used_profile_id = 'p2';

      await useProfileStore.getState().loadProfiles();

      expect(useProfileStore.getState().currentProfile?.id).toBe('p2');
    });

    it('records an error when the backend call fails', async () => {
      invokeMock.mockRejectedValueOnce(new Error('disk unreadable'));

      await useProfileStore.getState().loadProfiles();

      const state = useProfileStore.getState();
      expect(state.error).toContain('disk unreadable');
      expect(state.isLoading).toBe(false);
      expect(state.profiles).toHaveLength(0);
    });
  });

  describe('saveProfile', () => {
    it('adds a new profile to the list and selects it', async () => {
      const draft = makeProfile({ id: '', name: 'New Method' });

      await useProfileStore.getState().saveProfile(draft);

      const state = useProfileStore.getState();
      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].name).toBe('New Method');
      expect(state.profiles[0].id).not.toBe('');
      expect(state.currentProfile?.id).toBe(state.profiles[0].id);
      expect(invokeMock).toHaveBeenCalledWith('save_profile', { profile: draft });
    });

    it('updates an existing profile in place rather than duplicating', async () => {
      tauriState.profiles = [makeProfile({ id: 'p1', name: 'Old Name' })];
      await useProfileStore.getState().loadProfiles();

      const edited = makeProfile({ id: 'p1', name: 'Updated Name' });
      await useProfileStore.getState().saveProfile(edited);

      const state = useProfileStore.getState();
      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].name).toBe('Updated Name');
    });

    it('persists the saved profile as last used in AppConfig', async () => {
      await useProfileStore.getState().saveProfile(makeProfile({ id: '' }));

      const savedId = useProfileStore.getState().currentProfile?.id;
      expect(tauriState.config.last_used_profile_id).toBe(savedId);
    });
  });

  describe('deleteProfile', () => {
    it('removes the profile from the list', async () => {
      tauriState.profiles = [
        makeProfile({ id: 'p1' }),
        makeProfile({ id: 'p2' }),
      ];
      await useProfileStore.getState().loadProfiles();

      await useProfileStore.getState().deleteProfile('p1');

      const state = useProfileStore.getState();
      expect(state.profiles).toHaveLength(1);
      expect(state.profiles[0].id).toBe('p2');
      expect(invokeMock).toHaveBeenCalledWith('delete_profile', { profileId: 'p1' });
    });

    it('clears currentProfile when the deleted profile was selected', async () => {
      tauriState.profiles = [makeProfile({ id: 'p1' })];
      tauriState.config.last_used_profile_id = 'p1';
      await useProfileStore.getState().loadProfiles();
      expect(useProfileStore.getState().currentProfile?.id).toBe('p1');

      await useProfileStore.getState().deleteProfile('p1');

      const state = useProfileStore.getState();
      expect(state.currentProfile).toBeNull();
      expect(tauriState.config.last_used_profile_id).toBe('');
    });
  });
});
