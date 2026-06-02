import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './index';
import i18n, { initI18n } from '../../i18n';
import { invokeMock } from '../../test/mocks/tauriMocks';

// Initialize the shared i18n singleton once; reset to EN before each test.
if (!i18n.isInitialized) {
  initI18n('en');
}

describe('Settings', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders in the default language (EN)', async () => {
    render(<Settings />);

    expect(screen.getByText('Application Settings')).toBeInTheDocument();
    expect(screen.getByText('Language Settings')).toBeInTheDocument();

    // Wait for the config-dependent content to confirm mount effects settled.
    await waitFor(() =>
      expect(screen.getByText('C:\\Users\\test\\profiles')).toBeInTheDocument(),
    );
  });

  it('calls i18n.changeLanguage("vi") when the Vietnamese option is clicked', async () => {
    const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage');
    const user = userEvent.setup();
    render(<Settings />);

    // Ensure AppConfig has loaded (otherwise the handler returns early).
    await waitFor(() =>
      expect(screen.getByText('C:\\Users\\test\\profiles')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Tiếng Việt/ }));

    expect(changeLanguageSpy).toHaveBeenCalledWith('vi');
  });

  it('invokes save_app_config with the new language', async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await waitFor(() =>
      expect(screen.getByText('C:\\Users\\test\\profiles')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Tiếng Việt/ }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        'save_app_config',
        { config: expect.objectContaining({ language: 'vi' }) },
      ),
    );
  });
});
