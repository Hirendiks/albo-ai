"use client";

import React from "react";
import { Category, ViewFilter } from "@/types";
import { CategoryIcon } from "./Icons";
import { CATEGORY_COLORS } from "@/lib/colorTheme";
import { Plus, LayoutGrid, Star, Sparkles, Trash2 } from "lucide-react";

interface CategoryListProps {
  categories: Category[];
  selectedCategoryId: string | null;
  currentFilter: ViewFilter;
  onSelectCategory: (id: string | null) => void;
  onOpenAddCategoryModal: () => void;
  onDeleteCategory: (id: string) => void;
  linksCountByCategory: Record<string, number>;
  totalLinksCount: number;
  favoritesCount: number;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategoryId,
  currentFilter,
  onSelectCategory,
  onOpenAddCategoryModal,
  onDeleteCategory,
  linksCountByCategory,
  totalLinksCount,
  favoritesCount,
}) => {
  const isAllActive = currentFilter === "all" && !selectedCategoryId;
  const isFavoritesActive = currentFilter === "favorites";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Categories & Boards
          </span>
          <span className="text-xs text-slate-500">({categories.length})</span>
        </div>

        <button
          onClick={onOpenAddCategoryModal}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2.5 py-1 rounded-lg glass-button transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Category</span>
        </button>
      </div>

      {/* Horizontally scrollable on mobile, flex-wrap on tablet/desktop */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {/* All Links Pill */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            isAllActive
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 ring-1 ring-white/30"
              : "glass-button text-slate-300 hover:text-white"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>All Content</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              isAllActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
            }`}
          >
            {totalLinksCount}
          </span>
        </button>

        {/* Favorites Pill */}
        <button
          onClick={() => {
            onSelectCategory("favorites-filter");
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            isFavoritesActive
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 ring-1 ring-white/30"
              : "glass-button text-slate-300 hover:text-white"
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Favorites</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              isFavoritesActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
            }`}
          >
            {favoritesCount}
          </span>
        </button>

        {/* Dynamic User Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = linksCountByCategory[cat.id] || 0;
          const colorStyles = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.purple;

          return (
            <div key={cat.id} className="relative group/pill shrink-0">
              <button
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? `bg-gradient-to-r ${colorStyles.gradient} text-white shadow-lg ${colorStyles.glow} border-white/30`
                    : `glass-button text-slate-300 hover:text-white border-white/10`
                }`}
              >
                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>

              {/* Delete Category Icon (Only for custom ones, visible on hover) */}
              {categories.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Are you sure you want to delete "${cat.name}"? Links inside will be kept in All Content.`
                      )
                    ) {
                      onDeleteCategory(cat.id);
                    }
                  }}
                  className="hidden group-hover/pill:flex sm:group-hover/pill:flex absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white items-center justify-center hover:bg-rose-500 shadow-md transition-all"
                  title="Delete category"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
