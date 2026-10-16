import React, { useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Code2,
  Trash2,
  Sparkles,
  Info,
  Save,
  ShieldCheck,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import {
  getStoredSheetsUrl,
  setStoredSheetsUrl,
  callGoogleSheets,
  isValidGoogleSheetsUrl,
  GOOGLE_APPS_SCRIPT_CODE
} from '../services/googleSheetsService';
import { saveStoreInfo } from '../config/storeConfig';

const CURRENCY_PRESETS = ['Rs.', '$', '€', '£', 'AED', 'SAR', '₹', 'PKR'];

export default function StoreSettingsTab({
  storeInfo,
  setStoreInfo,
  showToast,
  hasGoogleSheetsUrl,
  setHasGoogleSheetsUrl,
  onSyncAll,
  onBulkUpload,
  onLoadStarterPack,
  onResetDatabase
}) {
  const [formData, setFormData] = useState({ ...storeInfo });
  const [sheetUrlInput, setSheetUrlInput] = useState(() => getStoredSheetsUrl());
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const envSheetUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEETS_URL;
  const isUsingEnvUrl = !!(envSheetUrl && isValidGoogleSheetsUrl(envSheetUrl));
  const activeSheetUrl = getStoredSheetsUrl();

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Store name is required.', 'error');
      return;
    }
    setStoreInfo(formData);
    saveStoreInfo(formData);
    showToast('Store profile & branding saved successfully!', 'success');
  };

  const handleDisconnectSheet = () => {
    setStoredSheetsUrl('');
    setSheetUrlInput('');
    if (setHasGoogleSheetsUrl) setHasGoogleSheetsUrl(false);
    showToast('Disconnected from Google Sheets! POS is now in fast local offline mode.', 'info');
  };

  const handleSaveSheetUrl = async (e) => {
    e.preventDefault();
    const clean = sheetUrlInput.trim();
    if (!clean) {
      handleDisconnectSheet();
      return;
    }

    if (!isValidGoogleSheetsUrl(clean)) {
      showToast('Invalid Google Apps Script URL. Must start with https://script.google.com/macros/s/', 'error');
      return;
    }

    setIsTestingUrl(true);
    try {
      const res = await callGoogleSheets({ action: 'ping' }, clean);
      if (res.success) {
        setStoredSheetsUrl(clean);
        if (setHasGoogleSheetsUrl) setHasGoogleSheetsUrl(true);
        showToast(`Connected to Google Sheets: ${res.sheetName || 'Active'}`, 'success');
      } else {
        throw new Error(res.error || 'Connection test failed.');
      }
    } catch (err) {
      showToast(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncAll();
      showToast('Synced all data with Google Sheet Cloud DB!', 'success');
    } catch (err) {
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualUpload = async () => {
    setIsSyncing(true);
    try {
      await onBulkUpload();
      showToast('Uploaded local database to Google Sheets!', 'success');
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1">
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Multi-Store White-Label Configuration
          </div>
          <h2 className="text-base sm:text-xl font-bold tracking-tight">Store Profile & Cloud Database Settings</h2>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
            Customize branding, currency, receipt notes, and manage your Google Sheets database connection.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasGoogleSheetsUrl ? (
            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Cloud DB: Connected</span>
            </div>
          ) : (
            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] sm:text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Offline Local Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
        {/* Left Column: Store Profile Customization */}
        <div className="lg:col-span-7 bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6 space-y-3.5 sm:space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-xs sm:text-base">Store Identity & Branding</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Active: {storeInfo.name}
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Store / Shop Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Atta Tuck Shop, Metro Mart, City Pharmacy"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This appears on your top bar, sidebar, login portal, and printed customer receipts.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Store Slogan / Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Fresh Groceries, Cold Drinks & Daily Essentials"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Currency Symbol
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="Rs."
                    className="w-24 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex-1 flex gap-1 overflow-x-auto">
                    {CURRENCY_PRESETS.map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setFormData({ ...formData, currency: curr })}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition shrink-0 ${
                          formData.currency === curr
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Store Physical Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Shop #1, Main Commercial Market"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-slate-400" /> Thermal Receipt Footer Note
              </label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                placeholder="e.g. Thank You For Shopping With Us!"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition"
              >
                <Save className="w-4 h-4" /> Save Store Profile
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Google Sheets Cloud Database Integration */}
        <div className="lg:col-span-5 space-y-3 sm:space-y-6">
          {/* Cloud DB Connection Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Google Sheets Database</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptCode((prev) => !prev)}
                className="text-[11px] sm:text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showScriptCode ? 'Hide Script' : 'View Script'}
              </button>
            </div>

            {/* Inline Apps Script Code Drawer */}
            {showScriptCode && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">
                    Google Apps Script Code
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2500);
                        showToast('Copied Apps Script code to clipboard!', 'success');
                      } catch {
                        showToast('Failed to copy code.', 'error');
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-950 rounded-lg text-[10px] font-mono text-emerald-300 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            )}

            {isUsingEnvUrl ? (
              <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Configured via Environment Variable (.env)</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1 break-all font-mono">
                  {envSheetUrl}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  All users and terminals automatically sync to this cloud sheet.
                </p>
              </div>
            ) : hasGoogleSheetsUrl && activeSheetUrl ? (
              <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">Cloud Database Connected</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectSheet}
                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold transition shrink-0"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-700 break-all font-mono">
                  {activeSheetUrl}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span><strong>Offline Mode Active:</strong> Operating in local browser storage mode.</span>
                </div>

                <form onSubmit={handleSaveSheetUrl} className="space-y-2.5 sm:space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Connect Google Apps Script URL
                    </label>
                    <input
                      type="url"
                      value={sheetUrlInput}
                      onChange={(e) => setSheetUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg sm:rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                      Paste Web App URL here to enable cloud sync, or leave empty for offline mode.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isTestingUrl}
                      className="flex-1 py-2 px-3 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:bg-slate-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      {isTestingUrl ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{isTestingUrl ? 'Connecting...' : 'Connect Google Sheet'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sync Controls */}
            {hasGoogleSheetsUrl && activeSheetUrl && (
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="py-2 px-2.5 rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-bold border border-blue-200 flex items-center justify-center gap-1.5 transition"
                >
                  <DownloadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualUpload}
                  disabled={isSyncing}
                  className="py-2 px-2.5 rounded-lg sm:rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 font-bold border border-emerald-200 flex items-center justify-center gap-1.5 transition"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>Upload Local</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Environment Setup Tip Card */}
          <div className="bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-5 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <Globe className="w-4 h-4 text-emerald-600" /> Deploying For Another Store?
            </h4>
            <p className="leading-relaxed text-[11px] sm:text-xs">
              Open the <code>.env</code> file in the project root to set the store name, currency and cloud URL:
            </p>
            <div className="bg-slate-900 text-emerald-400 p-2.5 sm:p-3 rounded-lg sm:rounded-xl font-mono text-[10px] sm:text-[11px] space-y-1">
              <div>VITE_STORE_NAME=&quot;My Store Name&quot;</div>
              <div>VITE_STORE_TAGLINE=&quot;Fresh & Daily Needs&quot;</div>
              <div>VITE_CURRENCY_SYMBOL=&quot;Rs.&quot;</div>
              <div>VITE_GOOGLE_SHEETS_URL=&quot;https://script.google.com/...&quot;</div>
            </div>
          </div>

          {/* Quick Database Helpers */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
            <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs uppercase tracking-wider">
              Database Maintenance
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={onLoadStarterPack}
                className="px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-300"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Load Starter (5 Items)
              </button>
              <button
                type="button"
                onClick={onResetDatabase}
                className="px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-semibold text-xs flex items-center gap-1.5 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" /> Wipe Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
