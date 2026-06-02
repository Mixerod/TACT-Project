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
  ArrowUpCircle,
  CloudDownload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const {
    getAppConfig,
    saveAppConfig,
    openFolderInExplorer,
    restartPythonSidecar,
    getSidecarStatus,
    installUpdateAndExit,
  } = useTauriCommands();
  const { checkHealth, checkUpdates, downloadUpdate } = usePythonApi();

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [sidecarStatus, setSidecarStatus] = useState<'running' | 'starting' | 'dead'>('starting');
  const [pythonHealth, setPythonHealth] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-updater states
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest' | 'downloading' | 'error' | 'offline'>('idle');
  const [updateInfo, setUpdateInfo] = useState<{
    available: boolean;
    latest_version: string;
    release_notes: string;
    download_url: string;
    publish_date?: string;
  } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    percentage: number;
    downloaded: number;
    total: number;
  }>({ percentage: 0, downloaded: 0, total: 0 });
  const [updaterError, setUpdaterError] = useState<string | null>(null);

  const handleCheckUpdates = async () => {
    if (!appConfig) return;
    setUpdateStatus('checking');
    setUpdaterError(null);
    try {
      const res = await checkUpdates(appConfig.app_version || '1.0.3');
      if (res.error === 'offline') {
        setUpdateStatus('offline');
        return;
      }
      if (res.available) {
        setUpdateInfo(res);
        setUpdateStatus('available');
      } else {
        setUpdateInfo(res);
        setUpdateStatus('latest');
      }
    } catch (err: any) {
      console.error('Failed to check for updates:', err);
      setUpdateStatus('error');
      setUpdaterError(err.message || 'Unknown error occurred');
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo || !updateInfo.download_url) return;
    setUpdateStatus('downloading');
    setUpdaterError(null);
    setDownloadProgress({ percentage: 0, downloaded: 0, total: 0 });
    try {
      await downloadUpdate(updateInfo.download_url, (progress) => {
        if (progress.type === 'progress') {
          setDownloadProgress({
            percentage: progress.percentage,
            downloaded: progress.downloaded_bytes || 0,
            total: progress.total_bytes || 0,
          });
        } else if (progress.type === 'success') {
          const path = progress.installer_path;
          installUpdateAndExit(path).catch((err) => {
            console.error('Failed to launch installer:', err);
            setUpdateStatus('error');
            setUpdaterError(err.message || String(err));
          });
        } else if (progress.type === 'error') {
          setUpdateStatus('error');
          setUpdaterError(progress.message || 'Tải xuống thất bại');
        }
      });
    } catch (err: any) {
      console.error('Download error:', err);
      setUpdateStatus('error');
      setUpdaterError(err.message || 'Lỗi kết nối tải xuống bản cập nhật.');
    }
  };

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

          {/* Software Update Card (Premium One-click Auto-updater) */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-5 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-105'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <ArrowUpCircle className="w-5 h-5 text-indigo-500" />
              <h3 className={`text-base font-bold uppercase tracking-wider ${
                theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {t('settings.update_title')}
              </h3>
            </div>

            <div className="space-y-4">
              {updateStatus === 'idle' && (
                <div className="flex flex-col gap-3">
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Hãy kiểm tra để cập nhật phiên bản mới nhất từ GitHub.
                  </p>
                  <button
                    onClick={handleCheckUpdates}
                    className={`flex items-center justify-center gap-2 w-full border text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:bg-slate-800 hover:text-cyan-400 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:text-cyan-600 hover:border-slate-305 text-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('settings.update_check')}
                  </button>
                </div>
              )}

              {updateStatus === 'checking' && (
                <div className="flex flex-col items-center justify-center py-4 space-y-3">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('settings.update_checking')}
                  </span>
                </div>
              )}

              {updateStatus === 'latest' && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                    theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-emerald-50/50 border-emerald-100/50 text-emerald-700'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{t('settings.update_latest')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>Phiên bản hiện tại:</span>
                    <span className="font-mono font-bold">v{appConfig?.app_version}</span>
                  </div>
                  <button
                    onClick={handleCheckUpdates}
                    className={`flex items-center justify-center gap-2 w-full border text-xs font-bold py-2 rounded-xl transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t('settings.update_check')}
                  </button>
                </div>
              )}

              {updateStatus === 'offline' && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                    theme === 'dark' ? 'bg-amber-950/20 border-amber-900/30 text-amber-400' : 'bg-amber-50/50 border-amber-100/50 text-amber-700'
                  }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold">{t('settings.update_offline')}</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('settings.update_no_conn')}
                  </p>
                  <button
                    onClick={handleCheckUpdates}
                    className={`flex items-center justify-center gap-2 w-full border text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:bg-slate-800 hover:text-cyan-400 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:text-cyan-600 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('settings.update_check')}
                  </button>
                </div>
              )}

              {updateStatus === 'available' && updateInfo && (
                <div className="space-y-4.5">
                  <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border ${
                    theme === 'dark'
                      ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-350'
                      : 'bg-indigo-50/50 border-indigo-100/50 text-indigo-850'
                  }`}>
                    <CloudDownload className="w-5 h-5 shrink-0 text-indigo-500 animate-bounce" />
                    <div className="flex-1">
                      <span className="text-xs font-black block">
                        {t('settings.update_available', { version: updateInfo.latest_version })}
                      </span>
                      <span className={`text-[10px] mt-0.5 block ${theme === 'dark' ? 'text-indigo-400/80' : 'text-indigo-600/80'}`}>
                        Phát hành: {updateInfo.publish_date ? new Date(updateInfo.publish_date).toLocaleDateString() : 'gần đây'}
                      </span>
                    </div>
                  </div>

                  {updateInfo.release_notes && (
                    <div className="space-y-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('settings.update_notes', { version: updateInfo.latest_version })}
                      </span>
                      <div className={`text-xs max-h-36 overflow-y-auto p-3 rounded-xl font-mono leading-relaxed border whitespace-pre-line ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-850 text-slate-300'
                          : 'bg-slate-50 border-slate-150 text-slate-600'
                      }`}>
                        {updateInfo.release_notes}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleDownloadUpdate}
                    className="flex items-center justify-center gap-2 w-full text-xs font-extrabold py-3 rounded-xl transition-all shadow-md text-white bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-indigo-500/20 active:scale-[0.98] transform"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    {t('settings.update_btn')}
                  </button>
                </div>
              )}

              {updateStatus === 'downloading' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                      {downloadProgress.percentage === 100 
                        ? t('settings.update_download_success').split('!')[0] + '!' 
                        : t('settings.update_downloading', { percent: downloadProgress.percentage })}
                    </span>
                    <span className="font-mono text-[10px] font-bold">
                      {downloadProgress.total > 0 
                        ? `${(downloadProgress.downloaded / (1024 * 1024)).toFixed(1)}MB / ${(downloadProgress.total / (1024 * 1024)).toFixed(1)}MB`
                        : `${(downloadProgress.downloaded / (1024 * 1024)).toFixed(1)}MB`}
                    </span>
                  </div>

                  <div className={`w-full h-2 rounded-full overflow-hidden border ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-150 rounded-full shadow-inner" 
                      style={{ width: `${downloadProgress.percentage}%` }}
                    />
                  </div>

                  {downloadProgress.percentage === 100 && (
                    <p className="text-[10px] text-emerald-500 font-bold leading-normal animate-pulse text-center">
                      {t('settings.update_download_success')}
                    </p>
                  )}
                </div>
              )}

              {updateStatus === 'error' && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                    theme === 'dark' ? 'bg-rose-950/20 border-rose-900/30 text-rose-400' : 'bg-rose-50/50 border-rose-100/50 text-rose-700'
                  }`}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">Lỗi Cập Nhật</span>
                  </div>
                  <p className={`text-[11px] leading-relaxed break-all ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {updaterError || 'Đã xảy ra lỗi không xác định.'}
                  </p>
                  <button
                    onClick={handleCheckUpdates}
                    className={`flex items-center justify-center gap-2 w-full border text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:bg-slate-800 hover:text-cyan-400 text-slate-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:text-cyan-600 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Thử lại
                  </button>
                </div>
              )}
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
