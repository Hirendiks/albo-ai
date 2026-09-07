"use client";

import React, { useState, useRef, useEffect } from "react";
import { UserProfile } from "@/types/auth";
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sparkles,
  Layers,
  Bookmark,
} from "lucide-react";

interface UserProfileMenuProps {
  user: UserProfile;
  isSyncing: boolean;
  lastSyncedAt: number;
  totalLinksCount: number;
  totalCategoriesCount: number;
  onSyncNow: () => void;
  onSignOut: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  isSyncing,
  lastSyncedAt,
  totalLinksCount,
  totalCategoriesCount,
  onSyncNow,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const formatLastSync = (timestamp: number) => {
    if (!timestamp) return "Not synced yet";
    const diffSecs = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSecs < 10) return "Just now";
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl glass-panel-subtle hover:glass-panel border border-white/10 hover:border-white/25 transition-all text-left group"
        title="Google Account & Cloud Sync"
      >
        {/* User Avatar */}
        <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1.5px] shrink-0">
          <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-xs font-bold text-white uppercase">
                {user.name.charAt(0)}
              </span>
            )}
          </div>
          {/* Real-time Sync Indicator Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
              isSyncing ? "bg-cyan-400 animate-ping" : "bg-emerald-400"
            }`}
          />
        </div>

        {/* Name & Sync Status (Hidden on small screens) */}
        <div className="hidden lg:block text-xs leading-tight">
          <p className="font-semibold text-white truncate max-w-[110px] group-hover:text-cyan-300 transition-colors">
            {user.name}
          </p>
          <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            {isSyncing ? (
              <span className="text-cyan-300">Syncing...</span>
            ) : (
              <span className="text-emerald-400">Cloud Synced</span>
            )}
          </p>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel-elevated p-4 z-50 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* User Details Banner */}
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white uppercase">
                    {user.name.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
              <p className="text-xs text-slate-400 truncate font-mono">{user.email}</p>
            </div>
          </div>

          {/* Cloud Sync Status Card */}
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Cloud Sync</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Active</span>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center justify-between">
              <span>Last updated:</span>
              <span className="font-mono text-emerald-200">
                {isSyncing ? "Syncing..." : formatLastSync(lastSyncedAt)}
              </span>
            </p>
          </div>

          {/* Library Stats */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <p className="font-bold text-white">{totalLinksCount}</p>
              <p className="text-[10px] text-slate-400">Synced Links</p>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <p className="font-bold text-purple-300">{totalCategoriesCount}</p>
              <p className="text-[10px] text-slate-400">Categories</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => {
                onSyncNow();
              }}
              disabled={isSyncing}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold glass-button text-cyan-300 hover:text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing with Cloud..." : "Sync Library Now"}</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold glass-button text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
