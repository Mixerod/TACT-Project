import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { addDevLog } from '../../lib/devLogger';
import { API_ENDPOINTS, SIDECAR_BASE_URL, ApiEndpoint } from './constants';

interface ResponseState {
  ok: boolean;
  status: number;
  durationMs: number;
  body: string;
}

const prettyJson = (raw: string): string => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

export default function ApiTesterSection() {
  const { t } = useTranslation();

  const [endpointId, setEndpointId] = useState<string>(API_ENDPOINTS[0].id);
  const endpoint = useMemo<ApiEndpoint>(
    () => API_ENDPOINTS.find((e) => e.id === endpointId) ?? API_ENDPOINTS[0],
    [endpointId]
  );

  const [body, setBody] = useState<string>(API_ENDPOINTS[0].defaultBody);
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleEndpointChange = (id: string) => {
    setEndpointId(id);
    const next = API_ENDPOINTS.find((e) => e.id === id);
    setBody(next?.defaultBody ?? '');
    setResponse(null);
  };

  const readStream = async (res: Response): Promise<string> => {
    if (!res.body) return '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
    }
    return acc;
  };

  const handleSend = async () => {
    setIsSending(true);
    setResponse(null);
    const url = `${SIDECAR_BASE_URL}${endpoint.path}`;
    const startedAt = performance.now();

    try {
      const init: RequestInit = { method: endpoint.method };
      if (endpoint.method === 'POST') {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = body.trim() ? body : '{}';
      }

      addDevLog('DEBUG', 'python', `→ ${endpoint.method} ${endpoint.path}`, body);

      const res = await fetch(url, init);
      const rawText = endpoint.isStream
        ? await readStream(res)
        : await res.text();
      const durationMs = Math.round(performance.now() - startedAt);
      const formatted = endpoint.isStream ? rawText : prettyJson(rawText);

      setResponse({
        ok: res.ok,
        status: res.status,
        durationMs,
        body: formatted,
      });

      addDevLog(
        res.ok ? 'INFO' : 'ERROR',
        'python',
        `← ${endpoint.method} ${endpoint.path} ${res.status} (${durationMs}ms)`,
        formatted
      );
    } catch (err) {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = err instanceof Error ? err.message : String(err);
      setResponse({
        ok: false,
        status: 0,
        durationMs,
        body: `Network error: ${message}\n\n(Is the sidecar running on port 48921?)`,
      });
      addDevLog(
        'ERROR',
        'python',
        `✕ ${endpoint.method} ${endpoint.path} failed (${durationMs}ms)`,
        message
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
          {t('devtools.endpoint')}
        </label>
        <select
          value={endpointId}
          onChange={(e) => handleEndpointChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-600 focus:outline-none"
        >
          {API_ENDPOINTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {endpoint.method === 'POST' && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
            {t('devtools.request_body')}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            rows={6}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-200 focus:border-cyan-600 focus:outline-none resize-y"
          />
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={isSending}
        className="flex items-center justify-center gap-2 w-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 hover:border-cyan-600 text-xs font-bold py-2 rounded transition-all text-cyan-300 disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" />
        {isSending ? t('devtools.sending') : t('devtools.send')}
      </button>

      {response && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className={response.ok ? 'text-emerald-400' : 'text-red-400'}>
              {response.status === 0 ? 'NETWORK ERROR' : `HTTP ${response.status}`}
            </span>
            <span className="text-slate-500">
              {t('devtools.response_time')}: {response.durationMs}ms
            </span>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap break-all max-h-56 overflow-auto">
            {response.body}
          </pre>
        </div>
      )}
    </div>
  );
}
