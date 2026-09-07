"use client";

import React, { useState } from "react";
import { Category, CategoryColor } from "@/types";
import { CategoryIcon, AVAILABLE_ICONS } from "./Icons";
import { CATEGORY_COLORS } from "@/lib/colorTheme";
import { X, Plus, Sparkles, FolderPlus } from "lucide-react";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded: (cat: Category) => void;
}

const COLOR_OPTIONS: CategoryColor[] = [
  "purple",
  "cyan",
  "emerald",
  "rose",
  "amber",
  "blue",
  "indigo",
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CategoryColor>("purple");
  const [icon, setIcon] = useState("Folder");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCategory: Category = {
      id: "cat-" + Date.now(),
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon,
      createdAt: Date.now(),
    };

    onCategoryAdded(newCategory);
    setName("");
    setDescription("");
    setColor("purple");
    setIcon("Folder");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md my-auto rounded-3xl glass-panel-elevated p-5 sm:p-6 z-10 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 p-[1.5px]">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <FolderPlus className="w-4 h-4 text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Category</h2>
              <p className="text-xs text-slate-400">
                Organize your links and knowledge boards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Agents, Web Design, Startup Tools..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Short Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Curated inspiration and benchmarks"
              className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Color Accent Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Color Glow Accent
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_OPTIONS.map((col) => {
                const styles = CATEGORY_COLORS[col];
                const isSelected = color === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${styles.gradient} transition-transform ${
                      isSelected
                        ? "scale-110 ring-2 ring-white shadow-lg"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map((iconName) => {
                const isSelected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-white/20 border-white/40 text-cyan-300 shadow-md"
                        : "glass-button text-slate-400 hover:text-white border-white/5"
                    }`}
                  >
                    <CategoryIcon name={iconName} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium glass-button text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white glass-button-primary disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Category</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
