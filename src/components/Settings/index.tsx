import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { usePythonApi } from '../../hooks/usePythonApi';
import { AppConfig } from '../../types';
import {
  FolderOpen,
  Info,
  Languages,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const {
    getAppConfig,
    saveAppConfig,
    openFolderInExplorer,
    restartPythonSidecar,
    getSidecarStatus,
  } = useTauriCommands();
  const { checkHealth } = usePythonApi();

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [sidecarStatus, setSidecarStatus] = useState<'running' | 'starting' | 'dead'>('starting');
  const [pythonHealth, setPythonHealth] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load config and status on mount
  useEffect(() => {
    getAppConfig().then(setAppConfig).catch(console.error);

    const checkStatus = async () => {
      try {
        const status = await getSidecarStatus();
        setSidecarStatus(status);
        if (status === 'running') {
          const health = await checkHealth();
          setPythonHealth(health);
        } else {
          setPythonHealth(null);
        }
      } catch {
        setPythonHealth(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLanguageChange = async (lang: 'en' | 'vi') => {
    if (!appConfig) return;
    setIsSaving(true);
    try {
      // 1. Update i18n local instance immediately
      await i18n.changeLanguage(lang);
      
      // 2. Persist to AppConfig disk
      const updatedConfig = { ...appConfig, language: lang };
      setAppConfig(updatedConfig);
      await saveAppConfig(updatedConfig);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    if (!appConfig) return;
    setIsSaving(true);
    try {
      const updatedConfig = { ...appConfig, theme };
      setAppConfig(updatedConfig);
      await saveAppConfig(updatedConfig);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to change theme:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartSidecar = async () => {
    setSidecarStatus('starting');
    try {
      await restartPythonSidecar();
    } catch (err) {
      alert(`Restart sidecar failed: ${err}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <SettingsIcon className="w-8 h-8 text-cyan-400" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            {t('settings.title')}
          </h2>
          <p className="text-sm text-slate-400">
            Configure default variables, system localizations, and daemon backend behaviors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Localization & Personalization settings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Language Selection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-2">
              <Languages className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-slate-200">
                {t('settings.language')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={isSaving}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                  appConfig?.language === 'en'
                    ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-bold block">English</span>
                  <span className="text-xs text-slate-500">System default English language packs</span>
                </div>
                {appConfig?.language === 'en' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow shadow-cyan-400"></span>
                )}
              </button>

              <button
                onClick={() => handleLanguageChange('vi')}
                disabled={isSaving}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                  appConfig?.language === 'vi'
                    ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-bold block">Tiếng Việt</span>
                  <span className="text-xs text-slate-500">Gói ngôn ngữ tiếng Việt phòng QC Lab</span>
                </div>
                {appConfig?.language === 'vi' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow shadow-cyan-400"></span>
                )}
              </button>
            </div>
            
            {saveSuccess && (
              <p className="text-emerald-400 text-xs font-semibold animate-pulse">
                ✓ {t('settings.saved')}
              </p>
            )}
          </div>

          {/* Theme Selection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-2">
              <span className="text-indigo-400 text-lg font-bold">🎨</span>
              <h3 className="text-lg font-bold text-slate-200">
                {t('settings.theme')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                  appConfig?.theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300 shadow-md shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-bold block">{t('settings.theme_dark')}</span>
                  <span className="text-xs text-slate-500">Sleek obsidian premium interface</span>
                </div>
                {appConfig?.theme === 'dark' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow shadow-indigo-400"></span>
                )}
              </button>

              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                  appConfig?.theme === 'light'
                    ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300 shadow-md shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-bold block">{t('settings.theme_light')}</span>
                  <span className="text-xs text-slate-500">Classic high-contrast light mode</span>
                </div>
                {appConfig?.theme === 'light' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow shadow-indigo-400"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* About & System Daemon Status Column */}
        <div className="space-y-8">
          
          {/* About Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-2">
              <Info className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-200">
                {t('settings.about')}
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">{t('settings.app_version')}</span>
                <span className="font-bold text-slate-300">v{appConfig?.app_version || '1.0.0'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">{t('settings.sidecar_port')}</span>
                <span className="font-mono text-cyan-400 font-bold">48921</span>
              </div>
              <div className="flex flex-col gap-2 border-b border-slate-800 pb-2">
                <span className="text-slate-400">{t('settings.profiles_dir')}</span>
                <span className="font-mono text-[10px] bg-slate-950 p-2 rounded text-slate-400 break-all select-all">
                  {appConfig?.profiles_directory}
                </span>
                <button
                  onClick={() => appConfig && openFolderInExplorer(appConfig.profiles_directory)}
                  className="flex items-center justify-center gap-2 w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-semibold py-1.5 rounded transition-all"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {t('settings.open_in_explorer')}
                </button>
              </div>
            </div>
          </div>

          {/* Backend Controller Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-2">
              <span className="text-emerald-400 text-lg font-bold">⚙️</span>
              <h3 className="text-lg font-bold text-slate-200">
                {t('sidecar.status')}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-lg">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Process:
                </span>
                <div className="flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${
                    sidecarStatus === 'running'
                      ? 'bg-green-500 shadow shadow-green-500/50'
                      : sidecarStatus === 'starting'
                      ? 'bg-yellow-500 shadow shadow-yellow-500/50 animate-pulse'
                      : 'bg-red-500 shadow shadow-red-500/50 animate-pulse'
                  }`}></span>
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {sidecarStatus === 'running'
                      ? t('sidecar.running')
                      : sidecarStatus === 'starting'
                      ? t('sidecar.starting')
                      : t('sidecar.dead')}
                  </span>
                </div>
              </div>

              {pythonHealth && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">FastAPI State</span>
                    <span className="text-emerald-400 font-bold">200 OK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Python Version</span>
                    <span className="text-slate-400 font-semibold">3.12.x</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleRestartSidecar}
                className="flex items-center justify-center gap-2 w-full bg-slate-950 hover:bg-slate-850 hover:text-cyan-400 border border-slate-800 hover:border-slate-700 text-xs font-bold py-2 rounded transition-all text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                {t('sidecar.restart')}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
