import { useTranslation } from 'react-i18next';
import { Play, Loader2 } from 'lucide-react';

interface ProcessButtonProps {
  disabled: boolean;
  isLoading: boolean;
  onClick: () => void;
  activeCount: number;
}

export default function ProcessButton({
  disabled,
  isLoading,
  onClick,
  activeCount,
}: ProcessButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-end pt-4">
      <button
        onClick={onClick}
        disabled={disabled || isLoading || activeCount === 0}
        className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-extrabold text-white transition-all shadow-lg ${
          isLoading
            ? 'bg-cyan-600 shadow-cyan-500/10 cursor-not-allowed'
            : disabled || activeCount === 0
            ? 'bg-slate-800 border border-slate-850 text-slate-500 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98] shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:shadow-xl'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="tracking-wide uppercase text-sm animate-pulse">
              Processing Batch...
            </span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5 fill-current" />
            <span className="tracking-wide font-bold">
              {t('run.process')} ({activeCount} {activeCount === 1 ? 'file' : 'files'})
            </span>
          </>
        )}
      </button>
    </div>
  );
}
