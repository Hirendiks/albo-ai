"use client";

import React, { useState } from "react";
import {
  X,
  Key,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Cloud,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { saveStoredApiKey } from "@/lib/storage";
import { UserProfile } from "@/types/auth";

interface SettingsModalProps {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
  onApiKeySaved: (key: string) => void;
  onResetSampleData: () => void;
  onExportData: () => void;
  user: UserProfile | null;
  isSyncing: boolean;
  lastSyncedAt: number;
  onOpenAuthModal: () => void;
  onSyncNow: () => void;
  onSignOut: () => void;
  stats: {
    totalLinks: number;
    totalCategories: number;
    favoritesCount: number;
    aiGeneratedCount: number;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  apiKey,
  onClose,
  onApiKeySaved,
  onResetSampleData,
  onExportData,
  user,
  isSyncing,
  lastSyncedAt,
  onOpenAuthModal,
  onSyncNow,
  onSignOut,
  stats,
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredApiKey(keyInput);
    onApiKeySaved(keyInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      <div className="relative w-full max-w-lg my-auto rounded-3xl glass-panel-elevated p-5 sm:p-6 z-10 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 p-[1.5px]">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">App Settings & AI Engine</h2>
              <p className="text-xs text-slate-400">Configure Gemini API key and data management</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Google Account & Cloud Sync Section */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-indigo-950/20 to-blue-950/30 border border-purple-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                  Google Account & Cloud Sync
                </span>
              </div>
              {user && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                  {isSyncing ? "Syncing..." : "Connected"}
                </span>
              )}
            </div>

            {user ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 p-0.5 shrink-0 border border-white/10">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <div className="w-full h-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                          {user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{user.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-[11px] text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg glass-button hover:bg-rose-500/10 shrink-0"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>
                    Last Cloud Sync:{" "}
                    <strong className="text-emerald-300 font-mono">
                      {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "Pending"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={onSyncNow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-button-primary text-white shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign in with your Gmail account to synchronize your categories, links, and takeaways across all your devices and keep them backed up in the cloud.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white glass-button-primary flex items-center justify-center gap-2 shadow-lg"
                >
                  <Cloud className="w-4 h-4 text-cyan-300" />
                  <span>Connect Google Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Gemini API Key Section */}
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Get API key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="relative">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-3.5 pr-20 py-2.5 rounded-xl text-xs font-mono glass-input text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold glass-button-primary text-white"
              >
                Save
              </button>
            </div>

            {isSaved && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>API key saved locally in your browser!</span>
              </p>
            )}

            <div className="p-3 rounded-xl glass-panel-subtle border border-white/5 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Configuration Smart Fallback</span>
              </div>
              <p>
                If no API key is provided, Albo automatically uses its high-performance built-in Heuristic NLP Extractor so links are always analyzed and structured instantly!
              </p>
            </div>
          </form>

          {/* Library Stats Section */}
          <div className="p-4 rounded-2xl glass-panel-subtle border border-white/5 space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Library Overview</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/5">
                <p className="text-lg font-bold text-white">{stats.totalLinks}</p>
                <p className="text-[10px] text-slate-400">Total Links</p>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <p className="text-lg font-bold text-purple-300">{stats.totalCategories}</p>
                <p className="text-[10px] text-slate-400">Categories</p>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <p className="text-lg font-bold text-amber-300">{stats.favoritesCount}</p>
                <p className="text-[10px] text-slate-400">Favorites</p>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <p className="text-lg font-bold text-cyan-300">{stats.aiGeneratedCount}</p>
                <p className="text-[10px] text-slate-400">Gemini AI</p>
              </div>
            </div>
          </div>

          {/* Backup & Reset Actions */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onExportData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass-button text-slate-300 hover:text-white"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON Backup</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm("Reset links and categories to original sample showcase?")) {
                  onResetSampleData();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Sample Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
