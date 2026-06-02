import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useProfileStore } from '../../stores/profileStore';
import { usePythonApi, ValidateProfileResponse } from '../../hooks/usePythonApi';
import { addDevLog } from '../../lib/devLogger';

export default function ProfileInspectorSection() {
  const { t } = useTranslation();
  const { profiles, loadProfiles } = useProfileStore();
  const { validateProfile } = usePythonApi();

  const [selectedId, setSelectedId] = useState<string>('');
  const [validation, setValidation] = useState<ValidateProfileResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  const handleValidate = async () => {
    if (!selected) return;
    setIsValidating(true);
    setValidation(null);
    try {
      const result = await validateProfile(selected);
      setValidation(result);
      addDevLog(
        result.valid ? 'INFO' : 'WARNING',
        'python',
        `validate-profile "${selected.name}" → valid=${result.valid}, ${result.errors.length} errors, ${result.warnings.length} warnings`,
        result
      );
    } catch (err) {
      addDevLog('ERROR', 'python', 'validate-profile failed', err);
      setValidation({
        valid: false,
        errors: [
          {
            field: '_request',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
            {t('devtools.select_profile')}
          </label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setValidation(null);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-600 focus:outline-none"
          >
            <option value="">— {t('profile.no_profiles')} —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.method_code})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => loadProfiles()}
          title={t('devtools.reload')}
          className="flex items-center justify-center bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 p-2 rounded transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {selected && (
        <>
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center justify-center gap-2 w-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 hover:border-cyan-600 text-xs font-bold py-2 rounded transition-all text-cyan-300 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isValidating ? t('common.loading') : t('devtools.validate_profile')}
          </button>

          {validation && (
            <div className="space-y-2 text-[11px]">
              <span
                className={`inline-block px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  validation.valid
                    ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'
                    : 'bg-red-950/50 text-red-400 border border-red-800/50'
                }`}
              >
                {validation.valid ? t('devtools.valid') : t('devtools.invalid')}
              </span>
              {validation.errors.map((e, i) => (
                <p key={`err-${i}`} className="text-red-400">
                  ✕ <span className="font-mono">{e.field}</span>: {e.message}
                </p>
              ))}
              {validation.warnings.map((w, i) => (
                <p key={`warn-${i}`} className="text-amber-400">
                  ⚠ <span className="font-mono">{w.field}</span>: {w.message}
                </p>
              ))}
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              {t('devtools.raw_json')}
            </p>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all max-h-64 overflow-auto">
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
