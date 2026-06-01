import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTauriCommands } from "./hooks/useTauriCommands";
import { usePythonApi } from "./hooks/usePythonApi";
import Settings from "./components/Settings";
import RunMode from "./components/RunMode";
import ProfileManager from "./components/ProfileManager";
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
  } = useTauriCommands();

  const { checkHealth } = usePythonApi();

  const [activeTab, setActiveTab] = useState<"run" | "profiles" | "settings">("run");
  const [sidecarStatus, setSidecarStatus] = useState<"running" | "starting" | "dead">("starting");
  const [pythonHealth, setPythonHealth] = useState<any>(null);

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
    if (status === "running") return "bg-green-500 shadow-green-500/50";
    if (status === "starting") return "bg-yellow-500 shadow-yellow-500/50 animate-pulse";
    return "bg-red-500 shadow-red-500/50 animate-pulse";
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION (Obsidian-Dark Aesthetic) */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 shadow-2xl">
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-cyan-500/20">
              T
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent block">
                TACT REPORT
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest block uppercase">
                Automation
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("run")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === "run"
                  ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 border border-transparent"
              }`}
            >
              <Play className="w-4 h-4" />
              {t("nav.run")}
            </button>

            <button
              onClick={() => setActiveTab("profiles")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === "profiles"
                  ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 border border-transparent"
              }`}
            >
              <FileText className="w-4 h-4" />
              {t("nav.profiles")}
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 border border-transparent"
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              {t("nav.settings")}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Daemon Status Panel */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {t("sidecar.status")} {pythonHealth ? `(v${pythonHealth.version})` : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(sidecarStatus)}`}></span>
              <span className="text-xs font-bold uppercase text-slate-300">
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
            className="flex items-center justify-center gap-1.5 w-full bg-slate-900 border border-slate-850 hover:border-slate-700 hover:bg-slate-850 text-[10px] font-bold py-1.5 rounded transition-all text-slate-400 hover:text-cyan-400"
          >
            <RefreshCw className="w-3 h-3" />
            {t("sidecar.restart")}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950 p-8">
        
        {/* Tab 1: RUN MODE */}
        {activeTab === "run" && <RunMode />}

        {/* Tab 2: PROFILE MANAGER */}
        {activeTab === "profiles" && <ProfileManager />}

        {/* Tab 3: SETTINGS PANEL */}
        {activeTab === "settings" && <Settings />}

      </main>
    </div>
  );
}

export default App;
