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
  Palette,
  Server,
  Activity,
  Cpu,
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

  const theme = appConfig?.theme || 'dark';

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
      await i18n.changeLanguage(lang);
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

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (!appConfig) return;
    setIsSaving(true);
    try {
      const updatedConfig = { ...appConfig, theme: newTheme };
      setAppConfig(updatedConfig);
      await saveAppConfig(updatedConfig);
      
      // Dispatch custom event to notify parent App container
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
      
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
      {/* Title Header */}
      <div className={`flex items-center gap-4 border-b pb-6 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className={`p-3 rounded-2xl ${
          theme === 'dark' ? 'bg-slate-900 text-cyan-400' : 'bg-white text-cyan-600 shadow-sm border border-slate-100'
        }`}>
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {t('settings.title')}
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Configure default variables, system localizations, and daemon backend behaviors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Preferences */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Language Selection Card */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <Languages className="w-5 h-5 text-indigo-500" />
              <h3 className={`text-base font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {t('settings.language')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={isSaving}
                className={`flex items-center justify-between p-4.5 rounded-xl border text-left transition-all duration-200 ${
                  appConfig?.language === 'en'
                    ? theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-950/20 text-indigo-300 shadow-md shadow-indigo-500/5'
                      : 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-md shadow-indigo-500/5'
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold block text-sm">English</span>
                  <span className={`text-xs mt-0.5 block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    System default English language packs
                  </span>
                </div>
                {appConfig?.language === 'en' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow shadow-indigo-400"></span>
                )}
              </button>

              <button
                onClick={() => handleLanguageChange('vi')}
                disabled={isSaving}
                className={`flex items-center justify-between p-4.5 rounded-xl border text-left transition-all duration-200 ${
                  appConfig?.language === 'vi'
                    ? theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-950/20 text-indigo-300 shadow-md shadow-indigo-500/5'
                      : 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-md shadow-indigo-500/5'
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold block text-sm">Tiếng Việt</span>
                  <span className={`text-xs mt-0.5 block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Gói ngôn ngữ tiếng Việt phòng QC Lab
                  </span>
                </div>
                {appConfig?.language === 'vi' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow shadow-indigo-400"></span>
                )}
              </button>
            </div>
            
            {saveSuccess && (
              <p className="text-emerald-500 text-xs font-semibold animate-pulse flex items-center gap-1.5">
                <span>✓</span> {t('settings.saved')}
              </p>
            )}
          </div>

          {/* Theme Selection Card */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <Palette className="w-5 h-5 text-indigo-500" />
              <h3 className={`text-base font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {t('settings.theme')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-between p-4.5 rounded-xl border text-left transition-all duration-200 ${
                  appConfig?.theme === 'dark'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300 shadow-md shadow-cyan-500/5'
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-55 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold block text-sm">{t('settings.theme_dark')}</span>
                  <span className={`text-xs mt-0.5 block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sleek obsidian premium interface
                  </span>
                </div>
                {appConfig?.theme === 'dark' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow shadow-cyan-400"></span>
                )}
              </button>

              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-between p-4.5 rounded-xl border text-left transition-all duration-200 ${
                  appConfig?.theme === 'light'
                    ? 'border-cyan-500 bg-cyan-50/50 text-cyan-700 shadow-md shadow-cyan-500/5'
                    : theme === 'dark'
                      ? 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700 text-slate-400'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <span className="font-bold block text-sm">{t('settings.theme_light')}</span>
                  <span className={`text-xs mt-0.5 block ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Classic clean, high-contrast light mode
                  </span>
                </div>
                {appConfig?.theme === 'light' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow shadow-cyan-400"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Server & Info */}
        <div className="space-y-8">
          
          {/* About Section */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <Info className="w-5 h-5 text-purple-500" />
              <h3 className={`text-base font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {t('settings.about')}
              </h3>
            </div>

            <div className="space-y-4.5 text-sm">
              <div className={`flex justify-between border-b pb-2.5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t('settings.app_version')}</span>
                <span className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                  v{appConfig?.app_version || '1.0.0'}
                </span>
              </div>
              <div className={`flex justify-between border-b pb-2.5 ${
                theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t('settings.sidecar_port')}</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-black">48921</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t('settings.profiles_dir')}</span>
                <span className={`font-mono text-[10px] p-3 rounded-xl break-all select-all border ${
                  theme === 'dark' 
                    ? 'bg-slate-950 border-slate-800 text-slate-400' 
                    : 'bg-slate-50 border-slate-100 text-slate-600'
                }`}>
                  {appConfig?.profiles_directory}
                </span>
                <button
                  onClick={() => appConfig && openFolderInExplorer(appConfig.profiles_directory)}
                  className={`flex items-center justify-center gap-2 w-full border text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  {t('settings.open_in_explorer')}
                </button>
              </div>
            </div>
          </div>

          {/* Backend Sidecar Daemon Controller Card */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <Server className="w-5 h-5 text-emerald-500" />
              <h3 className={`text-base font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                Backend Server
              </h3>
            </div>

            <div className="space-y-4">
              <div className={`flex items-center justify-between border p-3.5 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-slate-950 border-slate-850' 
                  : 'bg-slate-50/50 border-slate-150'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Daemon status:
                </span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    sidecarStatus === 'running'
                      ? 'bg-emerald-500 shadow shadow-emerald-500/40'
                      : sidecarStatus === 'starting'
                      ? 'bg-amber-500 shadow shadow-amber-500/40 animate-pulse'
                      : 'bg-rose-500 shadow shadow-rose-500/40 animate-pulse'
                  }`}></span>
                  <span className={`text-xs font-black uppercase tracking-wide ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {sidecarStatus === 'running'
                      ? t('sidecar.running')
                      : sidecarStatus === 'starting'
                      ? t('sidecar.starting')
                      : t('sidecar.dead')}
                  </span>
                </div>
              </div>

              {pythonHealth && (
                <div className={`p-3 rounded-xl border space-y-2 text-xs leading-relaxed ${
                  theme === 'dark' 
                    ? 'bg-slate-950/60 border-slate-850 text-slate-400' 
                    : 'bg-slate-50/40 border-slate-150 text-slate-600'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" /> API State
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">200 OK</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Sidecar Engine
                    </span>
                    <span className="font-semibold">Python {pythonHealth.python_version || '3.11'}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleRestartSidecar}
                className={`flex items-center justify-center gap-2 w-full border text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-850 hover:bg-slate-800 hover:text-cyan-400 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-55 hover:text-cyan-600 hover:border-slate-300 text-slate-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('sidecar.restart')}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
