import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/pythonApiMocks';
import { resetTauriMocks } from './mocks/tauriMocks';

// Mock the Tauri bridge for every test file. Async factory avoids hoisting issues
// (vi.mock is lifted above imports, so we import the mock lazily inside).
vi.mock('@tauri-apps/api/core', async () => {
  const { invokeMock } = await import('./mocks/tauriMocks');
  return { invoke: invokeMock };
});

// MSW server intercepts all fetch calls to the Python sidecar.
export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetTauriMocks();
});

afterAll(() => server.close());
