"use client";

import React from "react";
import { LayoutGrid, Star, Plus, FolderTree, Settings } from "lucide-react";
import { ViewFilter } from "@/types";
import { UserProfile } from "@/types/auth";

interface BottomNavProps {
  activeView: "categories" | "bookmarks";
  onViewChange: (view: "categories" | "bookmarks") => void;
  currentFilter: ViewFilter;
  onFilterChange: (filter: ViewFilter) => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAuthModal: () => void;
  onScrollToCategories: () => void;
  favoritesCount: number;
  user: UserProfile | null;
  isSyncing?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onViewChange,
  currentFilter,
  onFilterChange,
  onOpenAddModal,
  onOpenSettingsModal,
  onOpenAuthModal,
  onScrollToCategories,
  favoritesCount,
  user,
  isSyncing = false,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-3 pt-2 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 safe-bottom shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* All Links */}
        <button
          onClick={() => {
            onViewChange("bookmarks");
            onFilterChange("all");
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeView === "bookmarks" && currentFilter === "all"
              ? "text-cyan-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px]">Bookmarks</span>
        </button>

        {/* Categories trigger */}
        <button
          onClick={() => {
            onViewChange("categories");
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeView === "categories"
              ? "text-purple-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FolderTree className="w-5 h-5" />
          <span className="text-[10px]">Categories</span>
        </button>

        {/* Floating Center (+) Add Button */}
        <div className="relative -top-5">
          <button
            onClick={onOpenAddModal}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-purple-500/40 active:scale-95 transition-transform flex items-center justify-center"
            aria-label="Add or share new link"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center hover:bg-slate-900 transition-colors">
              <Plus className="w-7 h-7 text-white" />
            </div>
          </button>
        </div>

        {/* Favorites */}
        <button
          onClick={() => {
            onViewChange("bookmarks");
            onFilterChange("favorites");
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all relative ${
            activeView === "bookmarks" && currentFilter === "favorites"
              ? "text-amber-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[10px]">Favorites</span>
          {favoritesCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-amber-500/90 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              {favoritesCount}
            </span>
          )}
        </button>

        {/* Account / Settings */}
        {user ? (
          <button
            onClick={onOpenSettingsModal}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-300 hover:text-white transition-all relative"
          >
            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/20">
              {user.image ? (
                <img src={user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                  {user.name.charAt(0)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ${
                  isSyncing ? "bg-cyan-400" : "bg-emerald-400"
                }`}
              />
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Account</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span className="text-[10px]">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};
