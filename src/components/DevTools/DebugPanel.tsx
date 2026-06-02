import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, X, Server, Send, FileJson, ScrollText } from 'lucide-react';
import { initDevLogger } from '../../lib/devLogger';
import SidecarStatusSection from './SidecarStatusSection';
import ApiTesterSection from './ApiTesterSection';
import ProfileInspectorSection from './ProfileInspectorSection';
import LogViewerSection from './LogViewerSection';

type Tab = 'status' | 'api' | 'profile' | 'logs';

const TABS: Array<{ id: Tab; icon: typeof Server; labelKey: string }> = [
  { id: 'status', icon: Server, labelKey: 'devtools.tab_status' },
  { id: 'api', icon: Send, labelKey: 'devtools.tab_api' },
  { id: 'profile', icon: FileJson, labelKey: 'devtools.tab_profile' },
  { id: 'logs', icon: ScrollText, labelKey: 'devtools.tab_logs' },
];

/**
 * Dev-only floating debug panel. The default export already guards on
 * `import.meta.env.DEV`, so it is safe to mount unconditionally — it renders
 * nothing (and ships no UI) in a production build.
 */
function DebugPanelInner() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('status');

  useEffect(() => {
    initDevLogger();
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Debug Panel (dev only)"
        className="fixed bottom-4 right-4 z-[9999] flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 border border-slate-700 text-amber-400 shadow-2xl shadow-black/50 hover:bg-slate-800 hover:border-amber-600/60 transition-all"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[460px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-2rem)] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-slate-200">
            {t('devtools.title')}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/80 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded">
            DEV
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 shrink-0">
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-all border-b-2 ${
              tab === id
                ? 'text-cyan-400 border-cyan-500 bg-slate-900/60'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {tab === 'status' && <SidecarStatusSection />}
        {tab === 'api' && <ApiTesterSection />}
        {tab === 'profile' && <ProfileInspectorSection />}
        {tab === 'logs' && <LogViewerSection />}
      </div>
    </div>
  );
}

export default function DebugPanel() {
  if (!import.meta.env.DEV) return null;
  return <DebugPanelInner />;
}
