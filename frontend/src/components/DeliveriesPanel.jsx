import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { fetchDeliveries, testActionDispatch } from '../api/graphs';

export default function DeliveriesPanel({ isOpen, onClose }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Manual Test Action State
  const [testType, setTestType] = useState('webhook');
  const [testTarget, setTestTarget] = useState('https://httpbin.org/post');
  const [testTesting, setTestTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeliveries({
        status: filterStatus || undefined,
        limit: 50,
      });
      setDeliveries(data.deliveries || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (isOpen) {
      loadDeliveries();
      const interval = setInterval(loadDeliveries, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadDeliveries]);

  const handleRunTest = async (e) => {
    e.preventDefault();
    setTestTesting(true);
    setTestResult(null);

    try {
      const result = await testActionDispatch({
        actionType: testType,
        target: testTarget,
        payload: {
          testMessage: 'Manual diagnostic trigger from NexusFlow Deliveries panel',
          sensor: 'turbine-01',
          value: 94.2,
        },
      });
      setTestResult(result);
      loadDeliveries();
    } catch (err) {
      setTestResult({
        success: false,
        status: err.response?.data?.status || 'failed',
        error: err.response?.data?.error || err.message,
        details: err.response?.data?.details || '',
      });
      loadDeliveries();
    } finally {
      setTestTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Outbound Action Deliveries</h2>
            <p className="text-xs text-slate-400">Webhook retries, SMS alerts & SSRF audit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDeliveries}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh deliveries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Manual Diagnostic Trigger Accordion */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800/80">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-cyan-400" />
          Test Outbound Dispatch
        </h3>
        <form onSubmit={handleRunTest} className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={testType}
              onChange={(e) => {
                setTestType(e.target.value);
                if (e.target.value === 'sms') setTestTarget('+1-555-019-2834');
                else setTestTarget('https://httpbin.org/post');
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="webhook">Webhook (HTTP)</option>
              <option value="sms">Mock SMS</option>
            </select>
            <input
              type="text"
              value={testTarget}
              onChange={(e) => setTestTarget(e.target.value)}
              placeholder={testType === 'webhook' ? 'https://...' : '+1-555-...'}
              className="col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">
              {testType === 'webhook' ? 'Protected by SSRF firewall' : 'Format: +E.164'}
            </span>
            <button
              type="submit"
              disabled={testTesting}
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-medium text-white transition flex items-center gap-1.5"
            >
              {testTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {testTesting ? 'Sending...' : 'Dispatch Test'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-lg border text-xs mt-2 ${
                testResult.status === 'blocked'
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  : testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1">
                  {testResult.status === 'blocked' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  ) : testResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  Status: {testResult.status?.toUpperCase()}
                </span>
                <span className="text-[10px] opacity-80">{testResult.executionTimeMs}ms</span>
              </div>
              {testResult.error && <p className="text-[11px] mt-1">{testResult.error}</p>}
              {testResult.details && <p className="text-[10px] opacity-75 mt-0.5">{testResult.details}</p>}
              {testResult.responseBody && (
                <pre className="mt-1 p-1 bg-black/40 rounded text-[10px] font-mono overflow-x-auto max-h-16">
                  {testResult.responseBody}
                </pre>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px]">Filter:</span>
          {['', 'success', 'failed', 'blocked'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2 py-0.5 rounded capitalize text-[11px] transition ${
                filterStatus === st
                  ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-500">{deliveries.length} entries</span>
      </div>

      {/* Deliveries List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <p className="text-xs">Loading delivery log...</p>
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Send className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-medium text-slate-400">No delivery logs recorded yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              When an Action Trigger node executes, outgoing webhooks and SMS alerts appear here in real time.
            </p>
          </div>
        ) : (
          deliveries.map((del) => {
            const isExpanded = expandedId === del._id;
            return (
              <div
                key={del._id}
                className={`rounded-lg border text-xs transition ${
                  del.status === 'blocked'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : del.status === 'success'
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    : 'bg-amber-950/20 border-amber-500/30'
                }`}
              >
                <div
                  className="p-3 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : del._id)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          del.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : del.status === 'blocked'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {del.status === 'success' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : del.status === 'blocked' ? (
                          <ShieldAlert className="w-2.5 h-2.5" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5" />
                        )}
                        {del.status}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-mono">
                        {del.actionType}
                      </span>
                      <span className="font-medium text-white truncate max-w-[150px]">{del.ruleName}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(del.sentAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
                    <span className="truncate max-w-[340px]" title={del.target}>
                      {del.target}
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      {del.responseStatus && (
                        <span className="text-slate-300">HTTP {del.responseStatus}</span>
                      )}
                      <span>{del.executionTimeMs}ms</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {del.error && (
                    <p className="text-[11px] text-rose-400 mt-1.5 bg-rose-950/40 p-1.5 rounded border border-rose-500/20">
                      {del.error}
                    </p>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/40 space-y-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">
                        Attempts & Execution:
                      </span>
                      <p className="text-slate-300 font-mono">
                        Attempts: {del.attempts} / {del.maxAttempts || 3} • Duration: {del.executionTimeMs}ms
                      </p>
                    </div>

                    {del.responseBody && (
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">
                          Response Body:
                        </span>
                        <pre className="p-2 rounded bg-black/50 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-24">
                          {del.responseBody}
                        </pre>
                      </div>
                    )}

                    {del.payload && (
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider block mb-0.5">
                          Payload Dispatched:
                        </span>
                        <pre className="p-2 rounded bg-black/50 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-24">
                          {JSON.stringify(del.payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
