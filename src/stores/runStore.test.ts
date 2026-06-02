import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { useRunStore } from './runStore';
import { server } from '../test/setup';

const PROCESS_URL = 'http://localhost:48921/api/process';
const PREVIEW_URL = 'http://localhost:48921/api/preview-batch';

const SAMPLE_FILES = ['C:\\data\\ORD2024001_RED_sample.csv'];

function resetStore() {
  useRunStore.setState({
    state: 'IDLE',
    selectedFiles: [],
    batchItems: [],
    progressUpdates: {},
    summary: null,
    errorMessage: null,
  });
}

describe('runStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('state transitions', () => {
    it('walks IDLE -> PREVIEWING -> PROCESSING -> DONE', async () => {
      const store = useRunStore.getState();

      // IDLE: selecting files keeps us idle and seeds progress slots.
      store.setSelectedFiles(SAMPLE_FILES);
      expect(useRunStore.getState().state).toBe('IDLE');
      expect(Object.keys(useRunStore.getState().progressUpdates)).toEqual([
        'ORD2024001_RED_sample.csv',
      ]);

      // PREVIEWING: preview batch loads matching results.
      await useRunStore.getState().runPreview('p1');
      expect(useRunStore.getState().state).toBe('PREVIEWING');
      expect(useRunStore.getState().batchItems).toHaveLength(1);

      // PROCESSING -> DONE: streamed NDJSON drives to completion.
      await useRunStore.getState().startProcessing('p1');
      const finalState = useRunStore.getState();
      expect(finalState.state).toBe('DONE');
      expect(finalState.summary).toEqual({ total: 1, success: 1, error: 0 });
    });

    it('marks each file as success in progressUpdates after a successful run', async () => {
      useRunStore.getState().setSelectedFiles(SAMPLE_FILES);
      await useRunStore.getState().startProcessing('p1');

      const progress = useRunStore.getState().progressUpdates['ORD2024001_RED_sample.csv'];
      expect(progress.status).toBe('success');
      expect(progress.step).toBe('completed');
      expect(progress.rowsProcessed).toBe(42);
    });
  });

  describe('error handling', () => {
    it('transitions PROCESSING -> ERROR when the process API fails', async () => {
      server.use(
        http.post(PROCESS_URL, () =>
          HttpResponse.json({ message: 'Sidecar crashed' }, { status: 500 }),
        ),
      );

      useRunStore.getState().setSelectedFiles(SAMPLE_FILES);
      await useRunStore.getState().startProcessing('p1');

      const state = useRunStore.getState();
      expect(state.state).toBe('ERROR');
      expect(state.errorMessage).toBe('Sidecar crashed');
    });

    it('transitions to ERROR when preview fails', async () => {
      server.use(
        http.post(PREVIEW_URL, () =>
          HttpResponse.json({ message: 'Bad profile' }, { status: 400 }),
        ),
      );

      useRunStore.getState().setSelectedFiles(SAMPLE_FILES);
      await useRunStore.getState().runPreview('p1');

      const state = useRunStore.getState();
      expect(state.state).toBe('ERROR');
      expect(state.errorMessage).toBe('Bad profile');
    });

    it('does nothing when no files are selected', async () => {
      await useRunStore.getState().startProcessing('p1');
      expect(useRunStore.getState().state).toBe('IDLE');
    });
  });

  describe('reset', () => {
    it('returns the store to IDLE and clears all run data', async () => {
      useRunStore.getState().setSelectedFiles(SAMPLE_FILES);
      await useRunStore.getState().startProcessing('p1');
      expect(useRunStore.getState().state).toBe('DONE');

      useRunStore.getState().reset();

      const state = useRunStore.getState();
      expect(state.state).toBe('IDLE');
      expect(state.selectedFiles).toEqual([]);
      expect(state.batchItems).toEqual([]);
      expect(state.progressUpdates).toEqual({});
      expect(state.summary).toBeNull();
      expect(state.errorMessage).toBeNull();
    });
  });
});
