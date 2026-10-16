import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  getStoredSheetsUrl,
  setStoredSheetsUrl,
  callGoogleSheets
} from '../services/googleSheetsService';

export default function GoogleSheetsModal({
  isOpen,
  onClose,
  onSyncAll,
  onBulkUpload,
  showToast
}) {
  const [sheetsUrl, setSheetsUrl] = useState(getStoredSheetsUrl());
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('connect'); // 'connect' | 'guide' | 'code'

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showToast('Google Apps Script code copied to clipboard!', 'success');
    } catch (e) {
      showToast('Failed to copy. Please manually select and copy.', 'error');
    }
  };

  const handleSaveAndTest = async () => {
    const url = sheetsUrl.trim();
    if (!url) {
      setStoredSheetsUrl('');
      setTestResult({ success: false, message: 'Google Sheets URL cleared. Operating in local mode.' });
      showToast('Google Sheets URL removed.', 'info');
      return;
    }

    if (!url.startsWith('https://script.google.com/')) {
      setTestResult({
        success: false,
        message: 'Invalid URL. It must start with https://script.google.com/macros/s/.../exec'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await callGoogleSheets({ action: 'ping' }, url);
      setStoredSheetsUrl(url);
      setTestResult({
        success: true,
        message: `Connected successfully! Spreadsheet: "${res.sheetName || 'Atta Tuck Shop Pos DB'}"`
      });
      showToast('Google Sheets database connected successfully!', 'success');
    } catch (err) {
      console.error('Test error:', err);
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message || 'Make sure web app is deployed with access set to "Anyone"'}`
      });
      showToast('Connection failed. Check instructions in Guide tab.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!sheetsUrl) {
      showToast('Please connect a Google Sheet URL first.', 'error');
      return;
    }
    setSyncing(true);
    try {
      await onSyncAll(sheetsUrl);
      showToast('All data synchronized from Google Sheet!', 'success');
    } catch (err) {
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleTriggerExport = async () => {
    if (!sheetsUrl) {
      showToast('Please connect a Google Sheet URL first.', 'error');
      return;
    }
    setSyncing(true);
    try {
      await onBulkUpload(sheetsUrl);
      showToast('Local database uploaded to Google Sheet!', 'success');
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Google Sheets Database Sync
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                  Atta Tuck Shop Pos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Use Google Sheets as your live online cloud database and authentication provider.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'connect'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Connect & Sync
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" /> 2-Minute Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Copy className="w-3.5 h-3.5" /> View Apps Script Code
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'connect' && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  sheetsUrl
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                }`}
              >
                {sheetsUrl ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-sm">
                    {sheetsUrl
                      ? 'Google Sheet API Configured'
                      : 'Operating in Local Storage Mode'}
                  </div>
                  <p className="text-slate-300">
                    {sheetsUrl
                      ? 'All sales, products, khata ledgers, expenses, and staff accounts sync directly to your spreadsheet in real time.'
                      : 'Paste your deployed Google Apps Script Web App URL below to activate live multi-device Google Sheet syncing.'}
                  </p>
                </div>
              </div>

              {/* URL Input Form */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Google Apps Script Web App URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <button
                    onClick={handleSaveAndTest}
                    disabled={testing}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    {testing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    {testing ? 'Testing...' : 'Test & Save'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ensure deployment access is set to <span className="text-slate-300 font-semibold">"Anyone"</span> in Google Apps Script.
                </p>
              </div>

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Action Buttons for Sync */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleTriggerSync}
                  disabled={syncing || !sheetsUrl}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <DownloadCloud className={`w-4 h-4 text-emerald-400 ${syncing ? 'animate-bounce' : ''}`} />
                  Download / Refresh Data From Sheet
                </button>
                <button
                  onClick={handleTriggerExport}
                  disabled={syncing || !sheetsUrl}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <UploadCloud className={`w-4 h-4 text-sky-400 ${syncing ? 'animate-bounce' : ''}`} />
                  Upload Local Data to Sheet
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">1</span>
                  Create Your Google Spreadsheet
                </h3>
                <p className="text-slate-400 mb-2">
                  Go to <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">sheets.new</a> and create a new spreadsheet named <span className="text-white font-semibold">"Atta Tuck Shop Pos DB"</span>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">2</span>
                  Open Apps Script & Paste Code
                </h3>
                <p className="text-slate-400 mb-2">
                  In your Google Sheet menu, click on <span className="text-white font-semibold">Extensions &gt; Apps Script</span>.
                </p>
                <p className="text-slate-400 mb-3">
                  Erase any default code, click the <span className="text-emerald-400 font-semibold">"View Apps Script Code"</span> tab here to copy our complete script, and paste it into the editor. Click Save (floppy disk icon).
                </p>
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Code Copied!' : 'Copy Apps Script Code Now'}
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">3</span>
                  Deploy as Web App
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                  <li>Click <span className="text-white font-semibold">Deploy &gt; New deployment</span> (top right).</li>
                  <li>Click the gear icon next to "Select type" and choose <span className="text-white font-semibold">Web app</span>.</li>
                  <li>Description: <span className="text-white">Atta Tuck Shop Pos API</span>.</li>
                  <li>Execute as: <span className="text-white font-semibold">Me (your email)</span>.</li>
                  <li>Who has access: <span className="text-emerald-400 font-bold">Anyone</span> (vital for POS sync).</li>
                  <li>Click <span className="text-white font-semibold">Deploy</span>, authorize permissions if prompted.</li>
                  <li>Copy the <span className="text-white font-semibold">Web app URL</span> and paste it in the "Connect & Sync" tab!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Ready-to-use Google Apps Script code for your Google Sheet:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied to Clipboard' : 'Copy All Code'}
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-80 select-all">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-500">
          <span>Atta Tuck Shop Pos &bull; Google Sheets Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
}
