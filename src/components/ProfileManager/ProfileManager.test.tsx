import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import ProfileManager from './index';
import ProfileForm from './ProfileForm';
import i18n, { initI18n } from '../../i18n';
import { useProfileStore } from '../../stores/profileStore';
import { makeProfile, tauriState } from '../../test/mocks/tauriMocks';
import { server } from '../../test/setup';

const VALIDATE_URL = 'http://localhost:48921/api/validate-profile';

// Shared i18n singleton, mirrors the convention used in the other component tests.
if (!i18n.isInitialized) {
  initI18n('en');
}

/** Reset the profile store to a clean slate between tests. */
function resetProfileStore() {
  useProfileStore.setState({
    profiles: [],
    currentProfile: null,
    isLoading: false,
    error: null,
  });
}

/** Seed a profile into BOTH the Zustand store and the stateful Tauri mock. */
function seedProfile(overrides = {}) {
  const profile = makeProfile({ id: 'p1', name: 'Tensile Test', method_code: 'ASTM-D5034', ...overrides });
  tauriState.profiles = [profile];
  useProfileStore.setState({ profiles: [profile] });
  return profile;
}

/** Fill every required field of the ProfileForm with valid values. */
async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { name?: string; methodCode?: string } = {},
) {
  await user.type(
    screen.getByPlaceholderText('e.g. Tensile ISO 13934-1'),
    overrides.name ?? 'Tensile New',
  );
  await user.type(
    screen.getByPlaceholderText('e.g. tensile_iso13934'),
    overrides.methodCode ?? 'tensile_new',
  );
  await user.type(
    screen.getByPlaceholderText('Select absolute path to Excel Template...'),
    'C:/templates/new.xlsx',
  );
  await user.type(screen.getByPlaceholderText('e.g. Results'), 'Results');
  await user.type(
    screen.getByPlaceholderText('Select output target directory...'),
    'C:/reports',
  );
}

describe('ProfileManager', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    resetProfileStore();
  });

  it('empty state: shows the placeholder UI when there are no profiles', () => {
    render(<ProfileManager />);

    expect(screen.getByText('Không tìm thấy phương pháp nào')).toBeInTheDocument();
    expect(
      screen.getByText(/Hãy click nút "Tạo Phương Pháp Mới"/),
    ).toBeInTheDocument();
  });

  it('create: filling the form and saving makes the profile appear in the list', async () => {
    const user = userEvent.setup();
    render(<ProfileManager />);

    // Navigate into the create form.
    await user.click(screen.getByRole('button', { name: /New Profile/i }));

    await fillRequiredFields(user, { name: 'Abrasion Test', methodCode: 'abrasion_01' });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Back on the list, the freshly created profile card is rendered.
    await waitFor(() =>
      expect(screen.getByText('Abrasion Test')).toBeInTheDocument(),
    );
    expect(screen.getByText('abrasion_01')).toBeInTheDocument();
  });

  it('validation: leaving the name empty shows a required-field error', async () => {
    const user = userEvent.setup();
    render(<ProfileForm initialProfile={null} onCancel={() => {}} onSave={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Tên phương pháp bắt buộc nhập'),
    ).toBeInTheDocument();
  });

  it('validation: a duplicate method_code is rejected with an error', async () => {
    seedProfile({ method_code: 'ASTM-D5034' });

    const user = userEvent.setup();
    render(<ProfileForm initialProfile={null} onCancel={() => {}} onSave={() => {}} />);

    // Reuse the existing method code (case-insensitive clash).
    await fillRequiredFields(user, { name: 'Clashing Profile', methodCode: 'ASTM-D5034' });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Mã phương pháp này đã tồn tại ở phương pháp khác'),
    ).toBeInTheDocument();
  });

  it('template path: a missing template surfaces a warning from validate-profile', async () => {
    // Backend reports the profile as invalid with a template-path warning.
    server.use(
      http.post(VALIDATE_URL, () =>
        HttpResponse.json({
          valid: false,
          errors: [],
          warnings: [
            { field: 'template.path', message: 'Template file không tồn tại trên ổ đĩa' },
          ],
        }),
      ),
    );

    const user = userEvent.setup();
    render(<ProfileForm initialProfile={null} onCancel={() => {}} onSave={() => {}} />);

    // Local validation must pass first so the request actually reaches the backend.
    await fillRequiredFields(user, { name: 'Ghost Template', methodCode: 'ghost_01' });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // The message renders next to a <strong>{field}</strong>, so match a substring.
    expect(
      await screen.findByText(/Template file không tồn tại trên ổ đĩa/),
    ).toBeInTheDocument();
  });

  it('duplicate: clicking Duplicate pre-fills the name with a copy suffix', async () => {
    seedProfile({ name: 'Tensile Test' });

    const user = userEvent.setup();
    render(<ProfileManager />);

    await user.click(screen.getByTitle('Duplicate configuration'));

    // The duplicated draft opens in the form with a copy-suffixed name.
    expect(screen.getByPlaceholderText('e.g. Tensile ISO 13934-1')).toHaveValue(
      'Tensile Test_Copy',
    );
  });

  it('delete: confirming the dialog removes the profile from the list', async () => {
    seedProfile({ name: 'Doomed Profile' });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(<ProfileManager />);

    expect(screen.getByText('Doomed Profile')).toBeInTheDocument();

    await user.click(screen.getByTitle('Delete profile'));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('Doomed Profile')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Không tìm thấy phương pháp nào')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it('cancel delete: dismissing the dialog keeps the profile in the list', async () => {
    seedProfile({ name: 'Survivor Profile' });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();
    render(<ProfileManager />);

    await user.click(screen.getByTitle('Delete profile'));

    expect(confirmSpy).toHaveBeenCalled();
    // Still present — cancellation short-circuits before any delete call.
    expect(screen.getByText('Survivor Profile')).toBeInTheDocument();

    confirmSpy.mockRestore();
  });
});
