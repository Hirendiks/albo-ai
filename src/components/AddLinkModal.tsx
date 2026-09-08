"use client";

import React, { useState, useRef, useEffect } from "react";
import { Category, AnalyzedLink, CategoryColor } from "@/types";
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
  Plus,
  FolderPlus,
  Camera,
  Image as ImageIcon,
  UploadCloud,
} from "lucide-react";

interface AddLinkModalProps {
  isOpen: boolean;
  categories: Category[];
  selectedCategoryId: string | null;
  apiKey: string;
  initialUrl?: string;
  initialNotes?: string;
  onClose: () => void;
  onLinkAdded: (link: AnalyzedLink) => void;
  onCategoryAdded?: (cat: Category) => void;
}

type Stage = "idle" | "scraping" | "analyzing" | "saving" | "success" | "error";

const COLOR_OPTIONS: CategoryColor[] = [
  "purple",
  "cyan",
  "emerald",
  "rose",
  "amber",
  "blue",
  "indigo",
];

export const AddLinkModal: React.FC<AddLinkModalProps> = ({
  isOpen,
  categories,
  selectedCategoryId,
  apiKey,
  initialUrl = "",
  initialNotes = "",
  onClose,
  onLinkAdded,
  onCategoryAdded,
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [targetCategory, setTargetCategory] = useState(
    selectedCategoryId && selectedCategoryId !== "favorites-filter"
      ? selectedCategoryId
      : categories[0]?.id || ""
  );
  const [notes, setNotes] = useState(initialNotes);
  const [onScreenNotes, setOnScreenNotes] = useState(initialNotes);
  const [screenshotImage, setScreenshotImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline category creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState<CategoryColor>("purple");

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
      setOnScreenNotes(initialNotes);
    }
  }, [initialNotes]);

  useEffect(() => {
    if ((!targetCategory || !categories.some(c => c.id === targetCategory)) && categories.length > 0) {
      setTargetCategory(
        selectedCategoryId && selectedCategoryId !== "favorites-filter"
          ? selectedCategoryId
          : categories[0]?.id || ""
      );
    }
  }, [categories, selectedCategoryId, targetCategory]);

  // Global clipboard paste listener for screenshots while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const res = ev.target?.result as string;
                if (res) setScreenshotImage(res);
              };
              reader.readAsDataURL(file);
              break;
            }
          }
        }
      }
    };
    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [isOpen]);

  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleCreateInlineCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: "cat-" + Date.now(),
      name: newCatName.trim(),
      color: newCatColor,
      icon: "Folder",
      createdAt: Date.now(),
    };
    onCategoryAdded?.(newCat);
    setTargetCategory(newCat.id);
    setNewCatName("");
    setIsCreatingCategory(false);
  };

  const selectedCategoryObj = categories.find((c) => c.id === targetCategory);

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setScreenshotImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImageFromClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const res = ev.target?.result as string;
              if (res) setScreenshotImage(res);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      // If no image was found, attempt pasting text
      handlePasteClipboard();
    } catch (err) {
      console.warn("Could not read image from clipboard:", err);
      handlePasteClipboard();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !targetCategory) return;

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
          screenshotImage: screenshotImage || undefined,
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
    setScreenshotImage("");
    setIsCreatingCategory(false);
    setNewCatName("");
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
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
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
                Save & Analyze Bookmark
              </h2>
              <p className="text-xs text-slate-400">
                Choose category & synthesize link with AI
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* STEP 1: CATEGORY FIRST SELECTION / CREATION */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-mono font-bold">
                  1
                </span>
                <span>Select or Create Category</span>
              </label>
              {!isCreatingCategory && (
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(true)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </button>
              )}
            </div>

            {/* Inline Category Creator */}
            {isCreatingCategory ? (
              <div className="p-3 rounded-xl bg-slate-900/95 border border-cyan-500/30 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Create New Category</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCatName("");
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. YouTube Videos, AI, Recipes)..."
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input text-white placeholder-slate-400 focus:ring-1 focus:ring-cyan-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateInlineCategory();
                    }
                  }}
                />

                {/* Color swatches */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={`w-5 h-5 rounded-full bg-gradient-to-tr ${
                          CATEGORY_COLORS[c]?.gradient || "from-purple-500 to-indigo-600"
                        } transition-transform ${
                          newCatColor === c
                            ? "ring-2 ring-white scale-110 shadow-lg"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateInlineCategory()}
                    disabled={!newCatName.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 transition-all shrink-0 shadow-md"
                  >
                    Create & Select
                  </button>
                </div>
              </div>
            ) : (
              /* Existing Categories Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
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
                          ? `bg-gradient-to-r ${colorStyles.gradient} text-white shadow-md ${colorStyles.glow} border-white/40 ring-1 ring-white/20`
                          : "glass-button text-slate-300 hover:text-white border-white/5"
                      }`}
                    >
                      <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}

                {/* Quick Add Button inside category grid */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsCreatingCategory(true)}
                  className="flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border border-dashed border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-500/10 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">+ New Category</span>
                </button>
              </div>
            )}

            {/* Currently Selected Category Badge */}
            {selectedCategoryObj && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 font-medium border-t border-white/5">
                <span>Saving into:</span>
                <span className="text-white font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 border border-white/10">
                  <CategoryIcon name={selectedCategoryObj.icon} className="w-3 h-3 text-cyan-300" />
                  {selectedCategoryObj.name}
                </span>
              </div>
            )}
          </div>

          {/* STEP 2: TARGET LINK / URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-mono font-bold">
                  2
                </span>
                <span>Target Link / Video URL</span>
              </label>
              {initialUrl && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-medium">
                  ⚡ Link Detected
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                disabled={isLoading}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtu.be/..., article, repo, link..."
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

          {/* On-Screen & Flashed Phone Details Field with Vision OCR */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>On-Screen Contact & Flashed Details (Optional)</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                Vision OCR
              </span>
            </div>

            <input
              type="text"
              disabled={isLoading}
              value={onScreenNotes}
              onChange={(e) => setOnScreenNotes(e.target.value)}
              placeholder="e.g. Flashed phone: +91 99250 12345, WhatsApp, shop address..."
              className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-emerald-400 border-emerald-500/20 disabled:opacity-50"
            />

            {/* Screenshot / Photo Attachment for Multimodal Vision OCR */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium glass-button text-emerald-300 hover:text-emerald-200 border-emerald-500/30 hover:border-emerald-500/50 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Attach Screenshot</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handlePasteImageFromClipboard}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium glass-button text-cyan-300 hover:text-cyan-200 border-cyan-500/30 hover:border-cyan-500/50 transition-all"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste Image</span>
                </button>
              </div>

              {screenshotImage && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotImage}
                    alt="Attached screenshot preview"
                    className="w-5 h-5 rounded object-cover border border-emerald-400/50"
                  />
                  <span className="font-medium text-[11px]">Screenshot attached</span>
                  <button
                    type="button"
                    onClick={() => setScreenshotImage("")}
                    className="text-emerald-300 hover:text-white ml-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              💡 If a phone number, WhatsApp, or shop address was flashed on screen in the video, attach/paste a screenshot or type the details here. Albo will OCR it and generate 1-tap call & WhatsApp buttons!
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
              disabled={isLoading || !url.trim() || !targetCategory}
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
                  <span>
                    {selectedCategoryObj ? `Save to ${selectedCategoryObj.name}` : "Synthesize & Save"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
