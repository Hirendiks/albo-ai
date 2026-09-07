"use client";

import React from "react";
import { Search, Plus, Sparkles, Settings, Bookmark, Compass, Share2 } from "lucide-react";

import { UserProfile } from "@/types/auth";
import { UserProfileMenu } from "./UserProfileMenu";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAuthModal: () => void;
  user: UserProfile | null;
  isSyncing: boolean;
  lastSyncedAt: number;
  onSyncNow: () => void;
  onSignOut: () => void;
  totalLinksCount: number;
  totalCategoriesCount: number;
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onOpenAuthModal,
  user,
  isSyncing,
  lastSyncedAt,
  onSyncNow,
  onSignOut,
  totalLinksCount,
  totalCategoriesCount,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-slate-950/60 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 select-none">
          <div className="relative group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center relative">
                <Bookmark className="w-5 h-5 text-purple-400 fill-purple-400/20" />
                <Sparkles className="w-3 h-3 text-cyan-300 absolute -top-0.5 -right-0.5 animate-pulse" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                AI Bookmark
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Curate, synthesize & store web links
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search links, AI summaries, topics..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm glass-input placeholder-slate-400 focus:ring-1 focus:ring-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Desktop Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Counter Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 px-3 py-1.5 rounded-xl glass-panel-subtle">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{totalLinksCount} {totalLinksCount === 1 ? "Link" : "Links"}</span>
          </div>

          {/* User Google Account & Sync or Sign In */}
          {user ? (
            <UserProfileMenu
              user={user}
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              totalLinksCount={totalLinksCount}
              totalCategoriesCount={totalCategoriesCount}
              onSyncNow={onSyncNow}
              onSignOut={onSignOut}
            />
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl glass-button text-xs font-semibold text-slate-200 hover:text-white border-white/20 shadow-md transition-all group"
              title="Sign in with Google to sync data"
            >
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
              <span className="hidden sm:inline">Sign In with Google</span>
              <span className="sm:hidden">Sign In</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2.5 rounded-xl glass-button text-slate-300 hover:text-white relative group"
            title="Settings & Gemini API Key"
          >
            <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
            {!hasApiKey && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>

          {/* Add Link CTA */}
          <button
            onClick={onOpenAddModal}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white glass-button-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Save Link</span>
          </button>
        </div>
      </div>
    </header>
  );
};
