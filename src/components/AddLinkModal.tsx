"use client";

import React, { useState } from "react";
import { Category, AnalyzedLink } from "@/types";
import { CategoryIcon } from "./Icons";
import { CATEGORY_COLORS } from "@/lib/colorTheme";
import {
  X,
  Link as LinkIcon,
  Clipboard,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Folder,
  FileText,
} from "lucide-react";

interface AddLinkModalProps {
  isOpen: boolean;
  categories: Category[];
  selectedCategoryId: string | null;
  apiKey: string;
  initialUrl?: string;
  onClose: () => void;
  onLinkAdded: (link: AnalyzedLink) => void;
}

type Stage = "idle" | "scraping" | "analyzing" | "saving" | "success" | "error";

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  categories,
  selectedCategoryId,
  apiKey,
  initialUrl = "",
  onClose,
  onLinkAdded,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [targetCategory, setTargetCategory] = useState(
    selectedCategoryId && selectedCategoryId !== "favorites-filter"
      ? selectedCategoryId
      : categories[0]?.id || ""
  );
  const [notes, setNotes] = useState("");
  const [onScreenNotes, setOnScreenNotes] = useState("");

  React.useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
        }
      }
    } catch (err) {
      console.warn("Could not read clipboard", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setStage("scraping");
    setErrorMessage("");

    try {
      setTimeout(() => {
        if (stage !== "error") setStage("analyzing");
      }, 1200);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          categoryId: targetCategory,
          apiKey: apiKey || undefined,
          notes: notes.trim() || undefined,
          onScreenNotes: onScreenNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze the link.");
      }

      setStage("success");
      setTimeout(() => {
        onLinkAdded(data.link);
        handleClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setStage("error");
      setErrorMessage(err.message || "An error occurred while analyzing the link.");
    }
  };

  const handleClose = () => {
    setUrl("");
    setNotes("");
    setOnScreenNotes("");
    setStage("idle");
    setErrorMessage("");
    onClose();
  };

  const isLoading = stage === "scraping" || stage === "analyzing" || stage === "saving";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Frosted Backdrop */}
      <div
        onClick={!isLoading ? handleClose : undefined}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg my-auto rounded-3xl glass-panel-elevated p-5 sm:p-6 z-10 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 p-[1.5px]">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Save & Analyze Link
              </h2>
              <p className="text-xs text-slate-400">
                AI extracts metadata, generates TL;DR & key takeaways
              </p>
            </div>
          </div>

          {!isLoading && (
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* URL Input with Paste button */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Target Link / URL
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={isLoading}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article, github repo, video..."
                className="w-full pl-3.5 pr-24 py-2.5 rounded-xl text-sm glass-input text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={handlePasteClipboard}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium glass-button text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-all"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = targetCategory === cat.id;
                const colorStyles = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.purple;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setTargetCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${colorStyles.gradient} text-white shadow-md ${colorStyles.glow} border-white/30`
                        : "glass-button text-slate-300 hover:text-white border-white/5"
                    }`}
                  >
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* On-Screen & Spoken Details Field */}
          <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 space-y-1.5">
            <label className="block text-xs font-semibold text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Flashed Phone / On-Screen Details (Optional)</span>
              </span>
              <span className="text-[10px] text-emerald-400/80 font-mono">Auto-extracted</span>
            </label>
            <input
              type="text"
              disabled={isLoading}
              value={onScreenNotes}
              onChange={(e) => setOnScreenNotes(e.target.value)}
              placeholder="e.g. Phone on screen: +91 98110 54321, shop location, WhatsApp..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-emerald-400 border-emerald-500/20 disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 leading-normal">
              💡 If a phone number or shop address is flashed on video frames or spoken, enter it here. Albo will generate instant call, WhatsApp, and copy buttons for it!
            </p>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Personal Notes (Optional)</span>
            </label>
            <textarea
              rows={2}
              disabled={isLoading}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why you're saving this, specific questions to investigate..."
              className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Loading / Progress Animation */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">
                  {stage === "scraping" && "Scraping webpage & metadata..."}
                  {stage === "analyzing" && "AI synthesizing key takeaways & TL;DR..."}
                  {stage === "saving" && "Storing link and caching..."}
                </p>
                <p className="text-[11px] text-slate-400">
                  {stage === "scraping"
                    ? "Extracting title, preview image, headings, and body content"
                    : "Extracting core arguments, topics, and actionable tips"}
                </p>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {stage === "success" && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2.5 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Successfully analyzed and saved to your library!</span>
            </div>
          )}

          {/* Error Notification */}
          {stage === "error" && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Failed to process link</p>
                <p className="text-[11px] text-rose-300/80">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-medium glass-button text-slate-300 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white glass-button-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Synthesize & Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
