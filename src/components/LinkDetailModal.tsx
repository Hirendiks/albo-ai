"use client";

import React, { useState } from "react";
import { AnalyzedLink, Category } from "@/types";
import { CATEGORY_COLORS } from "@/lib/colorTheme";
import { CategoryIcon } from "./Icons";
import {
  X,
  ExternalLink,
  Star,
  Pin,
  Share2,
  Copy,
  Check,
  Sparkles,
  BrainCircuit,
  Clock,
  Calendar,
  User,
  Lightbulb,
  CheckCircle,
  Tag,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Mic,
  Edit3,
  Save,
  PlusCircle,
} from "lucide-react";

interface LinkDetailModalProps {
  link: AnalyzedLink | null;
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdateLink?: (updated: AnalyzedLink) => void;
}

export const LinkDetailModal: React.FC<LinkDetailModalProps> = ({
  link,
  category,
  isOpen,
  onClose,
  onToggleFavorite,
  onTogglePin,
  onUpdateLink,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSpoken, setEditSpoken] = useState("");

  React.useEffect(() => {
    if (link) {
      setEditPhone(link.aiSummary.contacts?.phoneNumbers?.join(", ") || "");
      setEditEmail(link.aiSummary.contacts?.emails?.join(", ") || "");
      setEditAddress(link.aiSummary.contacts?.addressOrLocation || "");
      setEditSpoken(link.aiSummary.spokenOrOnScreenContent || "");
      setIsEditingContact(false);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const colorStyles = category
    ? CATEGORY_COLORS[category.color] || CATEGORY_COLORS.purple
    : CATEGORY_COLORS.purple;

  const handleCopySummary = async () => {
    const formatted = `# ${link.title}\nSource: ${link.url}\n\n## TL;DR\n${link.aiSummary.tldr}\n\n## Key Takeaways\n${link.aiSummary.keyTakeaways.map((k) => `- ${k}`).join("\n")}\n\n## Deep Dive\n${link.aiSummary.detailedSummary}\n\n## Actionable Insights\n${link.aiSummary.actionableInsights.map((a) => `- ${a}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: link.title,
          text: `${link.title} - ${link.aiSummary.tldr}`,
          url: link.url,
        });
      } catch {
        // ignore
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleSaveCustomContact = () => {
    const phones = editPhone
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    const emails = editEmail
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);

    const updatedContacts = {
      phoneNumbers: phones,
      emails,
      links: link.aiSummary.contacts?.links || [],
      whatsappOrSocials: link.aiSummary.contacts?.whatsappOrSocials || [],
      addressOrLocation: editAddress.trim() || undefined,
      pricingOrOffers: link.aiSummary.contacts?.pricingOrOffers,
    };

    const newKeyTakeaways = [...link.aiSummary.keyTakeaways];
    if (phones.length > 0 || emails.length > 0 || editAddress.trim()) {
      const contactPieces: string[] = [];
      if (phones.length > 0) contactPieces.push(`Phone: ${phones.join(", ")}`);
      if (emails.length > 0) contactPieces.push(`Email: ${emails.join(", ")}`);
      if (editAddress.trim()) contactPieces.push(`Location: ${editAddress.trim()}`);
      const contactBullet = `📞 Contact & On-Screen Details: ${contactPieces.join(" • ")}`;

      const existingContactIdx = newKeyTakeaways.findIndex(
        (k) => k.includes("📞") || k.includes("Contact & On-Screen")
      );
      if (existingContactIdx !== -1) {
        newKeyTakeaways[existingContactIdx] = contactBullet;
      } else {
        newKeyTakeaways.unshift(contactBullet);
      }
    }

    const updatedLink: AnalyzedLink = {
      ...link,
      aiSummary: {
        ...link.aiSummary,
        contacts: updatedContacts,
        spokenOrOnScreenContent: editSpoken.trim() || undefined,
        keyTakeaways: newKeyTakeaways,
      },
      updatedAt: Date.now(),
    };

    if (onUpdateLink) {
      onUpdateLink(updatedLink);
    }
    setIsEditingContact(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Frosted Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Glass Dialog Container */}
      <div className="relative w-full max-w-3xl my-auto rounded-2xl sm:rounded-3xl glass-panel-elevated overflow-hidden z-10 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header Media Banner */}
        <div className="relative w-full h-48 sm:h-64 bg-slate-900 overflow-hidden">
          {link.image ? (
            <img
              src={link.image}
              alt={link.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-tr ${colorStyles.gradient} opacity-25 flex items-center justify-center`}
            >
              <CategoryIcon
                name={category?.icon || "Folder"}
                className="w-20 h-20 text-white/30"
              />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          {/* Close & Action Buttons at Top */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            {category && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${colorStyles.badge}`}
              >
                <CategoryIcon name={category.icon} className="w-3.5 h-3.5" />
                <span>{category.name}</span>
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => onToggleFavorite(link.id)}
                className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-amber-400 transition-colors"
                title="Favorite"
              >
                <Star
                  className="w-4 h-4"
                  fill={link.isFavorite ? "currentColor" : "none"}
                />
              </button>
              <button
                onClick={() => onTogglePin(link.id)}
                className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-cyan-400 transition-colors"
                title="Pin"
              >
                <Pin
                  className="w-4 h-4"
                  fill={link.isPinned ? "currentColor" : "none"}
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Metadata over Image Bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs text-slate-300">
                {link.favicon && (
                  <img src={link.favicon} alt="" className="w-3.5 h-3.5 rounded-sm" />
                )}
                <span>{link.siteName || "Web"}</span>
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1 rounded-lg bg-slate-950/60 backdrop-blur-md">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{link.aiSummary.estimatedReadTime}</span>
              </span>
              {link.author && (
                <span className="flex items-center gap-1 text-xs text-slate-400 px-2 py-1 rounded-lg bg-slate-950/60 backdrop-blur-md">
                  <User className="w-3 h-3 text-purple-400" />
                  <span className="truncate max-w-[120px]">{link.author}</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {link.title}
            </h2>
          </div>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Quick CTA Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel-subtle border border-white/10">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white glass-button-primary"
            >
              <span>Visit Original Resource</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass-button text-slate-300 hover:text-white"
                title="Copy structured summary"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied MD!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass-button text-slate-300 hover:text-white"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <button
                onClick={() => setIsEditingContact(!isEditingContact)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold glass-button transition-all ${
                  isEditingContact
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-md shadow-cyan-500/10"
                    : "text-emerald-400 border-emerald-500/30 hover:text-emerald-300"
                }`}
                title="Add or edit phone numbers, contacts and on-screen details"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>
                  {link.aiSummary.contacts?.phoneNumbers?.length ? "Edit Contacts" : "+ Add Contacts"}
                </span>
              </button>
            </div>
          </div>

          {/* Inline Contact & On-Screen Editor */}
          {isEditingContact && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span>Add / Edit Contact & On-Screen Details</span>
                </div>
                <span className="text-[10px] text-slate-400">Saves directly to your card</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    📞 Phone Number(s) (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +91 98110 54321, 011 2345678"
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    📧 Email Address(es)
                  </label>
                  <input
                    type="text"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. orders@marbleart.com"
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    📍 Address / Shop Location
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="e.g. Makrana Marble Studio, Rajasthan, India"
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    💬 Spoken / Flashed Dialogue Details
                  </label>
                  <input
                    type="text"
                    value={editSpoken}
                    onChange={(e) => setEditSpoken(e.target.value)}
                    placeholder="e.g. Price: Rs. 18,500 with delivery across India"
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditingContact(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs glass-button text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomContact}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white glass-button-primary shadow-lg"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Save Contacts</span>
                </button>
              </div>
            </div>
          )}

          {/* Prompt banner to add contacts if none exist */}
          {!isEditingContact &&
            (!link.aiSummary.contacts ||
              ((link.aiSummary.contacts.phoneNumbers?.length || 0) === 0 &&
                (link.aiSummary.contacts.emails?.length || 0) === 0 &&
                !link.aiSummary.contacts.addressOrLocation)) && (
              <div className="p-3.5 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs text-slate-300">
                    Did the video flash a phone number or speak shop details?
                  </span>
                </div>
                <button
                  onClick={() => setIsEditingContact(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 glass-button hover:text-white shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add Contact Info</span>
                </button>
              </div>
            )}

          {/* Section 1: TL;DR Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-blue-900/30 border border-purple-500/25 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-purple-300">
              {link.aiSummary.isAiGenerated ? (
                <Sparkles className="w-4 h-4 text-purple-400" />
              ) : (
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
              )}
              <span>Executive TL;DR</span>
            </div>
            <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium">
              {link.aiSummary.tldr}
            </p>
          </div>

          {/* Section: Extracted Contacts & On-Screen Details */}
          {link.aiSummary.contacts &&
            ((link.aiSummary.contacts.phoneNumbers?.length || 0) > 0 ||
              (link.aiSummary.contacts.emails?.length || 0) > 0 ||
              link.aiSummary.contacts.addressOrLocation ||
              link.aiSummary.contacts.pricingOrOffers) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-900/60 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>Key Contact & On-Screen Details Found</span>
                  </div>
                  <button
                    onClick={() => setIsEditingContact(true)}
                    className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Phone Numbers with direct tel: and WhatsApp link */}
                  {link.aiSummary.contacts.phoneNumbers?.map((phone, i) => {
                    const digits = phone.replace(/\D/g, "");
                    const waDigits = digits.startsWith("0")
                      ? "91" + digits.slice(1)
                      : digits.length === 10
                      ? "91" + digits
                      : digits;
                    return (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 text-xs text-slate-100 font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <a
                            href={`tel:${phone.replace(/\s+/g, "")}`}
                            className="hover:text-emerald-300 underline underline-offset-2"
                            title="Click to call"
                          >
                            {phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-medium"
                            title="Chat on WhatsApp"
                          >
                            WhatsApp
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(phone);
                              alert(`Copied ${phone} to clipboard!`);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-md glass-button text-emerald-300 hover:text-white"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Emails */}
                  {link.aiSummary.contacts.emails?.map((email, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/25 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-100 font-mono truncate">
                        <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <a
                          href={`mailto:${email}`}
                          className="hover:text-cyan-300 underline underline-offset-2 truncate"
                        >
                          {email}
                        </a>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(email);
                          alert(`Copied ${email} to clipboard!`);
                        }}
                        className="text-[10px] px-2 py-1 rounded-md glass-button text-cyan-300 hover:text-white shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  ))}

                  {/* Address */}
                  {link.aiSummary.contacts.addressOrLocation && (
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-center gap-2 text-xs text-slate-200 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{link.aiSummary.contacts.addressOrLocation}</span>
                    </div>
                  )}

                  {/* Pricing / Offer */}
                  {link.aiSummary.contacts.pricingOrOffers && (
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-center gap-2 text-xs text-amber-300 sm:col-span-2">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{link.aiSummary.contacts.pricingOrOffers}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Section: Spoken Dialogue & On-Screen Demonstration */}
          {link.aiSummary.spokenOrOnScreenContent && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase font-bold tracking-wider text-purple-300 flex items-center gap-2">
                <Mic className="w-4 h-4 text-purple-400" />
                <span>Spoken Dialogue & On-Screen Demonstration</span>
              </h3>
              <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/25 text-xs sm:text-sm text-purple-200 leading-relaxed whitespace-pre-line">
                {link.aiSummary.spokenOrOnScreenContent}
              </div>
            </div>
          )}

          {/* Section 2: Key Takeaways */}
          {link.aiSummary.keyTakeaways && link.aiSummary.keyTakeaways.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Key Takeaways & Core Points</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {link.aiSummary.keyTakeaways.map((point, index) => {
                  const isHighlight =
                    index === 0 ||
                    point.includes("Video Focus") ||
                    point.includes("What it's about") ||
                    point.includes("Project Focus") ||
                    point.includes("Topic /");

                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed transition-all ${
                        isHighlight
                          ? "sm:col-span-2 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-cyan-500/15 border border-purple-500/30 text-purple-100 font-medium shadow-md shadow-purple-500/10"
                          : "glass-panel-subtle border border-white/5 text-slate-200"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${
                          isHighlight
                            ? "bg-purple-500/30 text-purple-200 ring-1 ring-purple-400/40"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span>{point}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Deep Dive Summary */}
          {link.aiSummary.detailedSummary && (
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Comprehensive Analysis</span>
              </h3>
              <div className="p-4 rounded-2xl glass-panel-subtle border border-white/5 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-line">
                {link.aiSummary.detailedSummary}
              </div>
            </div>
          )}

          {/* Section 4: Actionable Insights */}
          {link.aiSummary.actionableInsights &&
            link.aiSummary.actionableInsights.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Actionable Insights & Applications</span>
                </h3>
                <div className="space-y-2">
                  {link.aiSummary.actionableInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2"
                    >
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Section 5: Tags & URL Info */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {link.aiSummary.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
              {link.url}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
