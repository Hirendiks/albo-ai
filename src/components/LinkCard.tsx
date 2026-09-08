"use client";

import React, { useState } from "react";
import { AnalyzedLink, Category } from "@/types";
import { CATEGORY_COLORS } from "@/lib/colorTheme";
import { CategoryIcon } from "./Icons";
import { cleanAndDeduplicateTakeaways } from "@/lib/ai";
import { deduplicatePhoneNumbers } from "@/lib/scraper";
import {
  ExternalLink,
  Star,
  Pin,
  Share2,
  Trash2,
  Clock,
  Sparkles,
  ChevronRight,
  BrainCircuit,
  CheckCircle2,
  PhoneCall,
  Check,
} from "lucide-react";

interface LinkCardProps {
  link: AnalyzedLink;
  category?: Category;
  onSelect: (link: AnalyzedLink) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  link,
  category,
  onSelect,
  onToggleFavorite,
  onTogglePin,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const phoneNumbers = deduplicatePhoneNumbers(link.aiSummary.contacts?.phoneNumbers || []);
  const displayTakeaways = cleanAndDeduplicateTakeaways(
    link.aiSummary.keyTakeaways || [],
    link.title,
    link.aiSummary.tldr
  );

  const colorStyles = category
    ? CATEGORY_COLORS[category.color] || CATEGORY_COLORS.purple
    : CATEGORY_COLORS.purple;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: link.title,
          text: `Check this out: "${link.title}" - ${link.aiSummary.tldr}`,
          url: link.url,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    // Fallback to copy link
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      onClick={() => onSelect(link)}
      className="group relative flex flex-col rounded-2xl glass-panel hover:glass-panel-elevated transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-white/25 hover:shadow-2xl"
    >
      {/* Top Media / Thumbnail Section */}
      <div className="relative w-full h-44 bg-slate-900/80 overflow-hidden shrink-0">
        {link.image ? (
          <img
            src={link.image}
            alt={link.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Graceful fallback to gradient if remote image fails
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${colorStyles.gradient} opacity-20 flex items-center justify-center`}
          >
            <CategoryIcon
              name={category?.icon || "Folder"}
              className="w-16 h-16 text-white/30"
            />
          </div>
        )}

        {/* Gradient dark overlay on image bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Category & AI Badges on Image */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          {category && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border ${colorStyles.badge}`}
            >
              <CategoryIcon name={category.icon} className="w-3 h-3" />
              <span>{category.name}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {((link.aiSummary.contacts?.phoneNumbers?.length || 0) > 0 ||
              (link.aiSummary.contacts?.emails?.length || 0) > 0) && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 backdrop-blur-md shadow-sm"
                title="Contact numbers or emails found in resource"
              >
                <PhoneCall className="w-2.5 h-2.5 text-emerald-300" />
                <span>Contact Info</span>
              </span>
            )}
            {link.isPinned && (
              <span className="p-1 rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 backdrop-blur-md" title="Pinned">
                <Pin className="w-3 h-3 fill-current" />
              </span>
            )}
            {link.aiSummary.isAiGenerated ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/30 text-purple-200 border border-purple-400/30 backdrop-blur-md">
                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                <span>Gemini AI</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-white/10 backdrop-blur-md">
                <BrainCircuit className="w-2.5 h-2.5 text-cyan-400" />
                <span>Smart NLP</span>
              </span>
            )}
          </div>
        </div>

        {/* Domain and Favicon pill over image */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 max-w-[85%]">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs text-slate-300">
            {link.favicon && (
              <img
                src={link.favicon}
                alt=""
                className="w-3.5 h-3.5 rounded-sm shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            )}
            <span className="truncate font-medium text-[11px]">
              {link.siteName || "Web Resource"}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 px-2 py-1 rounded-lg bg-slate-950/60 backdrop-blur-md">
            <Clock className="w-3 h-3" />
            {link.aiSummary.estimatedReadTime}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Title */}
          <h3 className="font-bold text-base text-slate-100 line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
            {link.title}
          </h3>

          {/* AI TL;DR */}
          <p className="mt-2 text-xs text-slate-300/90 line-clamp-2 leading-relaxed">
            {link.aiSummary.tldr}
          </p>

          {/* Direct On-Screen Phone Banner (Single canonical deduplicated phone) */}
          {phoneNumbers.length > 0 && (
            <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between gap-2 shadow-sm">
              <a
                href={`tel:${phoneNumbers[0].replace(/\s+/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono font-bold hover:underline hover:text-emerald-200"
                title="Direct Call"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{phoneNumbers[0]}</span>
              </a>
              <div className="flex items-center gap-1">
                {(() => {
                  const digits = phoneNumbers[0].replace(/\D/g, "");
                  const waDigits = digits.startsWith("0")
                    ? "91" + digits.slice(1)
                    : digits.length === 10
                    ? "91" + digits
                    : digits;
                  return (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 font-semibold border border-emerald-500/30"
                      title="Chat on WhatsApp"
                    >
                      WhatsApp
                    </a>
                  );
                })()}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(phoneNumbers[0]);
                    setCopiedPhone(true);
                    setTimeout(() => setCopiedPhone(false), 2000);
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded glass-button text-emerald-300 hover:text-white"
                >
                  {copiedPhone ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Key Takeaways preview (clean, non-repeating) */}
          {displayTakeaways.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
              {displayTakeaways.slice(0, 2).map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-300/85"
                >
                  <span className="text-cyan-400 font-bold shrink-0 mt-0.5">•</span>
                  <span className="line-clamp-2">{point}</span>
                </div>
              ))}
            </div>
          )}

          {/* Prompt to add contact if none exists */}
          {phoneNumbers.length === 0 &&
            (!link.aiSummary.contacts?.emails || link.aiSummary.contacts.emails.length === 0) && (
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1.5 rounded-xl border border-dashed border-white/10 transition-colors">
                <span className="flex items-center gap-1 text-[10px]">
                  <PhoneCall className="w-3 h-3 text-slate-500" />
                  <span>No contact extracted</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold hover:text-cyan-300">
                  + Add Phone / Details
                </span>
              </div>
            )}
        </div>

        {/* Tags */}
        <div className="space-y-3 pt-2">
          {link.aiSummary.tags && link.aiSummary.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {link.aiSummary.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5"
                >
                  #{tag}
                </span>
              ))}
              {link.aiSummary.tags.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-500">
                  +{link.aiSummary.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Actions Toolbar */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-1">
              {/* Favorite Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(link.id);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  link.isFavorite
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                title={link.isFavorite ? "Remove favorite" : "Add to favorites"}
              >
                <Star
                  className="w-4 h-4"
                  fill={link.isFavorite ? "currentColor" : "none"}
                />
              </button>

              {/* Pin Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(link.id);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  link.isPinned
                    ? "text-cyan-400 hover:text-cyan-300"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
                title={link.isPinned ? "Unpin link" : "Pin to top"}
              >
                <Pin
                  className="w-4 h-4"
                  fill={link.isPinned ? "currentColor" : "none"}
                />
              </button>

              {/* Share / Copy */}
              <button
                onClick={handleShare}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors relative"
                title="Share link"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove "${link.title}"?`)) {
                    onDelete(link.id);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
                title="Delete link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Inspect / Visit */}
            <div className="flex items-center gap-1.5">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                title="Open original website"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <span className="flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform pl-1">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
