import React, { useState } from 'react';
import {
  Store,
  User,
  Lock,
  Phone,
  ShieldCheck,
  UserPlus,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  getStoredSheetsUrl,
  callGoogleSheets,
  getLocalUsers,
  saveLocalUser,
  setStoredUser
} from '../services/googleSheetsService';
import { getStoreInfo } from '../config/storeConfig';

export default function AuthScreen({
  onLoginSuccess,
  showToast,
  customStoreInfo
}) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Cashier');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const storeInfo = customStoreInfo || getStoreInfo();
  const sheetsUrl = getStoredSheetsUrl();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try logging in via Google Sheets cloud database if configured via ENV or settings
      if (sheetsUrl) {
        try {
          const res = await callGoogleSheets({
            action: 'login',
            username: u,
            password: p
          });
          if (res.success && res.user) {
            setStoredUser(res.user);
            showToast(`Welcome back, ${res.user.fullName || res.user.username}!`, 'success');
            onLoginSuccess(res.user);
            return;
          }
        } catch (sheetErr) {
          console.warn('Cloud database check failed, checking local credentials:', sheetErr);
        }
      }

      // 2. Local credentials check
      const localUsers = getLocalUsers();
      const matched = localUsers.find(
        (user) => user.username.toLowerCase() === u && user.password === p
      );

      if (matched) {
        const userInfo = {
          id: matched.id,
          username: matched.username,
          fullName: matched.fullName || matched.name,
          role: matched.role || 'Admin',
          phone: matched.phone || ''
        };
        setStoredUser(userInfo);
        showToast(`Welcome back, ${userInfo.fullName}!`, 'success');
        onLoginSuccess(userInfo);
      } else {
        setErrorMessage('Invalid credentials. Please verify your username and password or register a new staff account.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    const u = username.trim().toLowerCase();
    const p = password.trim();
    const name = fullName.trim();

    if (!name || !u || !p) {
      setErrorMessage('Full name, username, and password are required.');
      return;
    }

    setLoading(true);

    try {
      const newUser = {
        id: `usr_${Date.now()}`,
        username: u,
        password: p,
        fullName: name,
        role,
        phone: phone.trim() || 'N/A',
        createdAt: new Date().toISOString()
      };

      // 1. If Cloud Database URL is configured, register user in Cloud DB
      if (sheetsUrl) {
        try {
          const res = await callGoogleSheets({
            action: 'register',
            ...newUser
          });
          if (res.success && res.user) {
            saveLocalUser(newUser);
            setStoredUser(res.user);
            showToast(`Staff registered: ${res.user.fullName} (${res.user.role})`, 'success');
            onLoginSuccess(res.user);
            return;
          }
        } catch (sheetErr) {
          console.error('Cloud database registration failed:', sheetErr);
          setErrorMessage(`Cloud DB sync failed: ${sheetErr.message}`);
          setLoading(false);
          return;
        }
      }

      // 2. Otherwise register locally
      const localUsers = getLocalUsers();
      if (localUsers.some((user) => user.username.toLowerCase() === u)) {
        setErrorMessage(`Username "${u}" is already in use.`);
        setLoading(false);
        return;
      }

      saveLocalUser(newUser);
      setStoredUser(newUser);
      showToast(`Staff registered: ${name} (${role})`, 'success');
      onLoginSuccess(newUser);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click login for test and rapid demonstration
  const handleQuickLogin = (roleType) => {
    const defaultUser = {
      id: roleType === 'Admin' ? 'usr_quick_admin' : 'usr_quick_cashier',
      username: roleType === 'Admin' ? 'admin' : 'cashier',
      fullName: roleType === 'Admin' ? `${storeInfo.name} Owner` : 'Counter Cashier',
      role: roleType,
      phone: storeInfo.phone || '0300-1234567'
    };
    setStoredUser(defaultUser);
    showToast(`Logged in as ${defaultUser.fullName} (${defaultUser.role})`, 'success');
    onLoginSuccess(defaultUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Terminal Card */}
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-600/25 mx-auto mb-3">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            {storeInfo.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {storeInfo.tagline}
          </p>

          {/* POS Terminal Status Indicator */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>POS Terminal Ready</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-5 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              !isRegisterMode
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Staff Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isRegisterMode
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register Staff
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-3.5">
          {isRegisterMode && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Staff Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Muhammad Ali"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Username *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or cashier1"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegisterMode && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Terminal Access Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('Admin')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      role === 'Admin'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 mt-0.5 ${role === 'Admin' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Shop Owner</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Full Admin Access</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('Cashier')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      role === 'Cashier'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className={`w-4 h-4 mt-0.5 ${role === 'Cashier' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Cashier</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Counter Billing</div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : isRegisterMode ? (
              <>
                <UserPlus className="w-4 h-4" /> Create Staff Account
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Unlock Terminal <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Login Shortcuts */}
        {!isRegisterMode && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center mb-2.5">
              Quick Test Sign In
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('Admin')}
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 rounded-xl text-[11px] font-bold border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Shop Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('Cashier')}
                className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700/80 text-sky-400 rounded-xl text-[11px] font-bold border border-slate-700/60 flex items-center justify-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5" /> Cashier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
