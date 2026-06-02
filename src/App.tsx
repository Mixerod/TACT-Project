import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTauriCommands } from "./hooks/useTauriCommands";
import { usePythonApi } from "./hooks/usePythonApi";
import Settings from "./components/Settings";
import RunMode from "./components/RunMode";
import ProfileManager from "./components/ProfileManager";
import DebugPanel from "./components/DevTools/DebugPanel";
import {
  Play,
  FileText,
  Settings as SettingsIcon,
  RefreshCw,
} from "lucide-react";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const {
    restartPythonSidecar,
    getSidecarStatus,
    getAppConfig,
  } = useTauriCommands();

  const { checkHealth } = usePythonApi();

  const [activeTab, setActiveTab] = useState<"run" | "profiles" | "settings">("run");
  const [sidecarStatus, setSidecarStatus] = useState<"running" | "starting" | "dead">("starting");
  const [pythonHealth, setPythonHealth] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getAppConfig();
        if (config && config.theme) {
          setTheme(config.theme);
        }
      } catch (err) {
        console.error("Failed to load app config:", err);
      }
    };
    loadConfig();

    // Listen to custom theme events for instant style switching
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("theme-changed", handleThemeChange);
    return () => window.removeEventListener("theme-changed", handleThemeChange);
  }, []);

  // Poll sidecar status every 5 seconds
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const status = await getSidecarStatus();
        setSidecarStatus(status);
        if (status === "running") {
          const health = await checkHealth();
          setPythonHealth(health);
        } else {
          setPythonHealth(null);
        }
      } catch (err) {
        setPythonHealth(null);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartSidecar = async () => {
    setSidecarStatus("starting");
    try {
      await restartPythonSidecar();
    } catch (e: any) {
      alert(`Restart failed: ${e}`);
    }
  };

  const getStatusColor = (status: "running" | "starting" | "dead") => {
    if (status === "running") return "bg-emerald-500 shadow-emerald-500/50";
    if (status === "starting") return "bg-amber-500 shadow-amber-500/50 animate-pulse";
    return "bg-rose-500 shadow-rose-500/50 animate-pulse";
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${
      theme === "dark" 
        ? "bg-slate-950 text-slate-100" 
        : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* SIDEBAR NAVIGATION (Premium International Layout) */}
      <aside className={`w-64 flex flex-col justify-between shrink-0 shadow-xl border-r transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-slate-900 border-slate-800" 
          : "bg-white border-slate-200"
      }`}>
        <div className="flex flex-col">
          {/* Logo Brand Header with modern CSS gradient & subtle shadow */}
          <div className={`p-6 flex items-center gap-3 border-b transition-colors duration-300 ${
            theme === "dark" ? "border-slate-800/80" : "border-slate-100"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-md shadow-indigo-500/30 transform hover:scale-105 transition-transform">
              T
            </div>
            <div>
              <span className="font-black text-sm tracking-wider bg-gradient-to-r from-cyan-500 to-indigo-500 bg-clip-text text-transparent block">
                TACT REPORT
              </span>
              <span className={`text-[9px] font-mono tracking-widest block uppercase font-bold ${
                theme === "dark" ? "text-slate-500" : "text-slate-400"
              }`}>
                Automation UI
              </span>
            </div>
          </div>

          {/* Navigation Links with active/inactive responsive themes */}
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab("run")}
              className={`flex items-center gap-3.5 w-full px-4.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                activeTab === "run"
                  ? theme === "dark"
                    ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/40 shadow-inner"
                    : "bg-cyan-50/70 text-cyan-700 border-cyan-100/50 shadow-sm"
                  : theme === "dark"
                    ? "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Play className={`w-4 h-4 transition-transform duration-300 ${activeTab === "run" ? "scale-110" : ""}`} />
              {t("nav.run")}
            </button>

            <button
              onClick={() => setActiveTab("profiles")}
              className={`flex items-center gap-3.5 w-full px-4.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                activeTab === "profiles"
                  ? theme === "dark"
                    ? "bg-indigo-950/40 text-indigo-400 border-indigo-800/40 shadow-inner"
                    : "bg-indigo-50/70 text-indigo-700 border-indigo-100/50 shadow-sm"
                  : theme === "dark"
                    ? "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <FileText className={`w-4 h-4 transition-transform duration-300 ${activeTab === "profiles" ? "scale-110" : ""}`} />
              {t("nav.profiles")}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3.5 w-full px-4.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                activeTab === "settings"
                  ? theme === "dark"
                    ? "bg-purple-950/40 text-purple-400 border-purple-800/40 shadow-inner"
                    : "bg-purple-50/70 text-purple-700 border-purple-100/50 shadow-sm"
                  : theme === "dark"
                    ? "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40"
                    : "text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <SettingsIcon className={`w-4 h-4 transition-transform duration-300 ${activeTab === "settings" ? "rotate-45" : ""}`} />
              {t("nav.settings")}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Daemon Status Panel Redesigned */}
        <div className={`p-4 border-t transition-colors duration-300 ${
          theme === "dark" ? "border-slate-800 bg-slate-950/30" : "border-slate-100 bg-slate-50/50"
        } space-y-3.5`}>
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${
              theme === "dark" ? "text-slate-500" : "text-slate-400"
            }`}>
              {t("sidecar.status")} {pythonHealth ? `(v${pythonHealth.version})` : ""}
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(sidecarStatus)} shadow`}></span>
              <span className={`text-[11px] font-bold uppercase ${
                theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}>
                {sidecarStatus === "running"
                  ? t("sidecar.running")
                  : sidecarStatus === "starting"
                  ? t("sidecar.starting")
                  : t("sidecar.dead")}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleRestartSidecar}
            className={`flex items-center justify-center gap-2 w-full border text-[10px] font-bold py-2 rounded-xl transition-all shadow-sm ${
              theme === "dark"
                ? "bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/40"
                : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:text-cyan-600 hover:bg-slate-50"
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            {t("sidecar.restart")}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8 relative">
        <div className="max-w-7xl w-full mx-auto space-y-8 pb-12">
          {/* Tab 1: RUN MODE */}
          {activeTab === "run" && <RunMode />}

          {/* Tab 2: PROFILE MANAGER */}
          {activeTab === "profiles" && <ProfileManager />}

          {/* Tab 3: SETTINGS PANEL */}
          {activeTab === "settings" && <Settings />}
        </div>
      </main>

      {/* DEV-ONLY DEBUG PANEL */}
      <DebugPanel />
    </div>
  );
}

export default App;
