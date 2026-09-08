"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Category, AnalyzedLink, ViewFilter } from "@/types";
import {
  getStoredCategories,
  saveStoredCategories,
  getStoredLinks,
  saveStoredLinks,
  getStoredApiKey,
  INITIAL_CATEGORIES,
  INITIAL_LINKS,
} from "@/lib/storage";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryList } from "@/components/CategoryList";
import { LinkCard } from "@/components/LinkCard";
import { LinkDetailModal } from "@/components/LinkDetailModal";
import { AddLinkModal } from "@/components/AddLinkModal";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { SettingsModal } from "@/components/SettingsModal";
import { AuthModal } from "@/components/AuthModal";
import { UserProfile } from "@/types/auth";
import { CategoryIcon } from "@/components/Icons";
import { CATEGORY_COLORS } from "@/lib/colorTheme";
import {
  Plus,
  Sparkles,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  Compass,
  BookmarkPlus,
  Share2,
  FolderTree,
  LayoutGrid,
  Bookmark,
  ArrowRight,
  Trash2,
  Calendar,
  Star,
} from "lucide-react";

function cleanExtractedUrl(raw: string): string {
  let u = raw.trim();
  // Remove leading/trailing punctuation and quotes
  u = u.replace(/^[\s"'(\[<]+|[\s"'()\]>.,;:!?]+$/g, "");
  // If starts with www. or known domain without protocol, prepend https://
  if (
    u.startsWith("www.") ||
    /^(?:instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|linkedin\.com|reddit\.com|threads\.net|youtube\.com|youtu\.be|fb\.watch|pin\.it|vt\.tiktok\.com|vm\.tiktok\.com)\//i.test(u)
  ) {
    u = `https://${u}`;
  }
  return u;
}

function extractUrlFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    decoded = text;
  }

  // 1. Look for http(s) URL
  const httpMatch = decoded.match(/https?:\/\/[^\s"'<>]+/i);
  if (httpMatch) {
    return cleanExtractedUrl(httpMatch[0]);
  }

  // 2. Look for www. domain URL
  const wwwMatch = decoded.match(/www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s"'<>]*/i);
  if (wwwMatch) {
    return cleanExtractedUrl(`https://${wwwMatch[0]}`);
  }

  // 3. Look for known shortlinks or naked social links (vt.tiktok.com, youtu.be, pin.it, fb.watch, instagram.com, etc.)
  const socialMatch = decoded.match(
    /(?:(?:vt|vm)\.tiktok\.com|youtu\.be|pin\.it|fb\.watch|(?:instagram|tiktok|x|twitter|facebook|linkedin|reddit|threads|spotify)\.com)[^\s"'<>]*/i
  );
  if (socialMatch) {
    return cleanExtractedUrl(`https://${socialMatch[0]}`);
  }

  return null;
}

function extractUrlFromAnySource(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const urlObj = new URL(window.location.href);
    const params = urlObj.searchParams;

    // 1. Check known params: "url", "text", "title", "link", "share", "uri", "target"
    const priorityKeys = ["url", "text", "link", "share", "uri", "target", "title"];
    for (const k of priorityKeys) {
      const val = params.get(k);
      const parsed = extractUrlFromText(val);
      if (parsed) return parsed;
    }

    // 2. Check all other query params
    let foundInParams: string | null = null;
    params.forEach((val) => {
      if (!foundInParams) {
        const parsed = extractUrlFromText(val);
        if (parsed) foundInParams = parsed;
      }
    });
    if (foundInParams) return foundInParams;

    // 3. Check raw search string
    if (urlObj.search) {
      const parsed = extractUrlFromText(urlObj.search);
      if (parsed) return parsed;
    }

    // 4. Check raw hash
    if (urlObj.hash) {
      const parsed = extractUrlFromText(urlObj.hash);
      if (parsed) return parsed;
    }
  } catch {
    const parsed = extractUrlFromText(window.location.search);
    if (parsed) return parsed;
  }

  return null;
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<AnalyzedLink[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ViewFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dual View Mode: "categories" (shows all categories & bookmark counts) or "bookmarks" (all bookmarks sorted date descending)
  const [activeView, setActiveView] = useState<"categories" | "bookmarks">("categories");

  // User Auth & Cloud Sync state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [detailModalLink, setDetailModalLink] = useState<AnalyzedLink | null>(null);

  // Quick inline URL paste input
  const [inlineUrl, setInlineUrl] = useState("");

  const categoriesSectionRef = useRef<HTMLDivElement>(null);

  // Cloud Synchronization Engine
  const syncWithCloud = async (
    catsToSync: Category[] = categories,
    linksToSync: AnalyzedLink[] = links,
    targetUser: UserProfile | null = user
  ) => {
    if (!targetUser) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: catsToSync,
          // Exclude any demo sample links so personal accounts remain strictly clean
          links: linksToSync.filter((l) => !l.id.startsWith("link-sample-")),
        }),
      });
      const data = await res.json();
      if (data.success && data.categories && data.links) {
        setCategories(data.categories);
        saveStoredCategories(data.categories, targetUser.email);
        setLinks(data.links);
        saveStoredLinks(data.links, targetUser.email);
        setLastSyncedAt(data.lastSyncedAt || Date.now());
      }
    } catch (err) {
      console.warn("Cloud sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial load from local storage & check active session
  useEffect(() => {
    setApiKey(getStoredApiKey());

    // Check if user has an existing session cookie
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          // For authenticated user: load user's personal store (starts completely blank!)
          const userCats = getStoredCategories(data.user.email);
          const userLinks = getStoredLinks(data.user.email);
          setCategories(userCats);
          setLinks(userLinks);
          // Sync with server cloud data
          syncWithCloud(userCats, userLinks, data.user);
        } else {
          // Guest mode: load demo showcase
          setCategories(getStoredCategories(null));
          setLinks(getStoredLinks(null));
        }
      })
      .catch((err) => {
        console.warn("Failed to check auth session:", err);
        setCategories(getStoredCategories(null));
        setLinks(getStoredLinks(null));
      });

    // Universal check for incoming share targets across all mobile apps & browsers
    const checkIncomingShare = () => {
      if (typeof window === "undefined") return;
      const detectedUrl = extractUrlFromAnySource();
      if (detectedUrl) {
        setInlineUrl(detectedUrl);
        setIsAddModalOpen(true);
        // Clean URL query params from address bar so refresh doesn't pop up again
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    // Check immediately on initial mount
    checkIncomingShare();

    // Listen to focus and visibilitychange (triggers when user shares while PWA is already open in background)
    const handleResume = () => {
      if (document.visibilityState === "visible") {
        checkIncomingShare();
      }
    };

    window.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", checkIncomingShare);
    window.addEventListener("popstate", checkIncomingShare);

    return () => {
      window.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", checkIncomingShare);
      window.removeEventListener("popstate", checkIncomingShare);
    };
  }, []);

  // Handle user signing in: switches to personal blank library
  const handleUserSignedIn = (newUser: UserProfile) => {
    setUser(newUser);
    const userCats = getStoredCategories(newUser.email);
    const userLinks = getStoredLinks(newUser.email); // starts blank []
    setCategories(userCats);
    setLinks(userLinks);
    syncWithCloud(userCats, userLinks, newUser);
  };

  // Handle user signing out: reverts back to demo showcase for guest
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    setCategories(getStoredCategories(null));
    setLinks(getStoredLinks(null));
  };

  // Sync categories & links to storage and cloud
  const handleCategoriesChange = (updated: Category[]) => {
    setCategories(updated);
    saveStoredCategories(updated, user?.email);
    if (user) {
      syncWithCloud(updated, links, user);
    }
  };

  const handleLinksChange = (updated: AnalyzedLink[]) => {
    setLinks(updated);
    saveStoredLinks(updated, user?.email);
    if (user) {
      syncWithCloud(categories, updated, user);
    }
  };

  // Add Link Handler
  const handleLinkAdded = (newLink: AnalyzedLink) => {
    const updated = [newLink, ...links];
    handleLinksChange(updated);
  };

  // Delete Link Handler
  const handleDeleteLink = (id: string) => {
    const updated = links.filter((l) => l.id !== id);
    handleLinksChange(updated);
    if (detailModalLink?.id === id) {
      setDetailModalLink(null);
    }
  };

  // Favorite Toggle
  const handleToggleFavorite = (id: string) => {
    const updated = links.map((l) =>
      l.id === id ? { ...l, isFavorite: !l.isFavorite } : l
    );
    handleLinksChange(updated);
    if (detailModalLink?.id === id) {
      setDetailModalLink((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  // Pin Toggle
  const handleTogglePin = (id: string) => {
    const updated = links.map((l) =>
      l.id === id ? { ...l, isPinned: !l.isPinned } : l
    );
    handleLinksChange(updated);
    if (detailModalLink?.id === id) {
      setDetailModalLink((prev) => (prev ? { ...prev, isPinned: !prev.isPinned } : null));
    }
  };

  // Update Link Handler (contacts, notes, takeaways)
  const handleUpdateLink = (updated: AnalyzedLink) => {
    const nextLinks = links.map((l) => (l.id === updated.id ? updated : l));
    handleLinksChange(nextLinks);
    if (detailModalLink?.id === updated.id) {
      setDetailModalLink(updated);
    }
  };

  // Add Category Handler
  const handleAddCategory = (newCat: Category) => {
    const updated = [...categories, newCat];
    handleCategoriesChange(updated);
    setSelectedCategoryId(newCat.id);
    setCurrentFilter("category");
  };

  // Delete Category Handler
  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter((c) => c.id !== catId);
    handleCategoriesChange(updated);
    if (selectedCategoryId === catId) {
      setSelectedCategoryId(null);
      setCurrentFilter("all");
    }
  };

  // Reset Sample Data
  const handleResetSampleData = () => {
    handleCategoriesChange(INITIAL_CATEGORIES);
    handleLinksChange(INITIAL_LINKS);
    setSelectedCategoryId(null);
    setCurrentFilter("all");
  };

  // Export JSON backup
  const handleExportData = () => {
    const backup = {
      app: "AI Bookmark",
      exportDate: new Date().toISOString(),
      categories,
      links,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `albo-ai-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to Categories on Mobile
  const scrollToCategories = () => {
    setCurrentFilter("category");
    categoriesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Category selection handler
  const handleSelectCategory = (id: string | null) => {
    if (id === "favorites-filter") {
      setSelectedCategoryId(null);
      setCurrentFilter("favorites");
    } else if (id === null) {
      setSelectedCategoryId(null);
      setCurrentFilter("all");
    } else {
      setSelectedCategoryId(id);
      setCurrentFilter("category");
    }
  };

  // Counts calculation
  const linksCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    links.forEach((l) => {
      map[l.categoryId] = (map[l.categoryId] || 0) + 1;
    });
    return map;
  }, [links]);

  const favoritesCount = useMemo(() => {
    return links.filter((l) => l.isFavorite).length;
  }, [links]);

  // Filtered & Sorted links
  const filteredLinks = useMemo(() => {
    let result = [...links];

    // Filter by category or favorites
    if (currentFilter === "favorites") {
      result = result.filter((l) => l.isFavorite);
    } else if (selectedCategoryId) {
      result = result.filter((l) => l.categoryId === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        const titleMatch = l.title.toLowerCase().includes(q);
        const descMatch = l.description.toLowerCase().includes(q);
        const urlMatch = l.url.toLowerCase().includes(q);
        const tldrMatch = l.aiSummary.tldr.toLowerCase().includes(q);
        const tagsMatch = l.aiSummary.tags.some((t) => t.toLowerCase().includes(q));
        const takeawaysMatch = l.aiSummary.keyTakeaways.some((k) =>
          k.toLowerCase().includes(q)
        );
        const notesMatch = l.notes ? l.notes.toLowerCase().includes(q) : false;
        const contactsMatch = l.aiSummary.contacts
          ? (l.aiSummary.contacts.phoneNumbers?.some((p) => p.toLowerCase().includes(q)) ?? false) ||
            (l.aiSummary.contacts.emails?.some((e) => e.toLowerCase().includes(q)) ?? false) ||
            (l.aiSummary.contacts.whatsappOrSocials?.some((w) => w.toLowerCase().includes(q)) ?? false) ||
            (l.aiSummary.contacts.addressOrLocation?.toLowerCase().includes(q) ?? false) ||
            (l.aiSummary.contacts.pricingOrOffers?.toLowerCase().includes(q) ?? false)
          : false;

        return (
          titleMatch ||
          descMatch ||
          urlMatch ||
          tldrMatch ||
          tagsMatch ||
          takeawaysMatch ||
          notesMatch ||
          contactsMatch
        );
      });
    }

    // Sort: Pinned first, then strictly Date Descending (newest first)
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [links, currentFilter, selectedCategoryId, searchQuery]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex-1 flex flex-col pb-24 sm:pb-12">
      {/* Top Glass Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        user={user}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onSyncNow={() => syncWithCloud(categories, links, user)}
        onSignOut={handleSignOut}
        totalLinksCount={links.length}
        totalCategoriesCount={categories.length}
        hasApiKey={!!apiKey}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Quick Paste & Ingestion Hero Bar */}
        <section className="relative rounded-3xl glass-panel p-5 sm:p-7 overflow-hidden border border-white/10 shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span>AI Link Intelligence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Share a link. Let AI synthesize and store it.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Paste any article, repository, documentation, or video. AI Bookmark instantly crawls the page, extracts key takeaways, writes a crisp TL;DR, and files it into your categories.
              </p>
            </div>

            {/* Quick Share / Paste Input Box */}
            <div className="w-full lg:w-auto lg:min-w-[380px] shrink-0">
              <div className="p-2 rounded-2xl glass-panel-elevated border border-white/15 flex items-center gap-2 shadow-xl">
                <input
                  type="text"
                  value={inlineUrl}
                  onChange={(e) => setInlineUrl(e.target.value)}
                  placeholder="Paste URL to analyze..."
                  className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inlineUrl.trim()) {
                      setIsAddModalOpen(true);
                    }
                  }}
                />
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white glass-button-primary shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Analyze</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* View Mode Switcher: Category View vs Bookmark View */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 border-b border-white/10">
          <div className="inline-flex p-1 rounded-2xl glass-panel-elevated border border-white/15 shadow-xl max-w-fit">
            <button
              onClick={() => setActiveView("categories")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeView === "categories"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-purple-500/30 ring-1 ring-white/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Category View</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  activeView === "categories" ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
                }`}
              >
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveView("bookmarks");
                setSelectedCategoryId(null);
                setCurrentFilter("all");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeView === "bookmarks"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-purple-500/30 ring-1 ring-white/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Bookmark View</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  activeView === "bookmarks" ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"
                }`}
              >
                {links.length}
              </span>
            </button>
          </div>

          {/* Contextual Action Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeView === "categories" ? (
              <button
                onClick={() => setIsAddCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white glass-button-primary shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Category</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white glass-button-primary shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Link</span>
              </button>
            )}
          </div>
        </section>

        {/* 1. CATEGORY VIEW: Displays all categories and count of bookmarks in each */}
        {activeView === "categories" && (
          <section className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Categories & Boards</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select a category to explore its saved bookmarks
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                Total: <span className="text-cyan-300 font-bold">{links.length}</span> Bookmarks
              </div>
            </div>

            {/* Grid of Categories showing bookmark counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat) => {
                const count = linksCountByCategory[cat.id] || 0;
                const colorStyles = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.purple;

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setCurrentFilter("category");
                      setActiveView("bookmarks");
                    }}
                    className="group relative rounded-3xl glass-panel p-5 sm:p-6 border border-white/10 hover:border-white/25 hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4"
                  >
                    {/* Icon and Bookmark Count Badge */}
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${colorStyles.gradient} p-[1.5px] shadow-lg ${colorStyles.glow}`}
                      >
                        <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                          <CategoryIcon name={cat.icon} className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      {/* Exact Number of Bookmarks in this Category */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15 text-slate-200 group-hover:border-cyan-400/40 group-hover:text-cyan-300 transition-colors">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {count} {count === 1 ? "Bookmark" : "Bookmarks"}
                        </span>
                      </div>
                    </div>

                    {/* Category Title and Description */}
                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                        <span>{cat.name}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </h3>
                      {cat.description ? (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No description</p>
                      )}
                    </div>

                    {/* Card Footer: Action & Delete */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                      <span className="text-cyan-400 font-semibold group-hover:underline flex items-center gap-1">
                        <span>Browse {count} {count === 1 ? "link" : "links"}</span>
                        <span>→</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                            handleDeleteCategory(cat.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Interactive "+ Create Category" Card */}
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(true)}
                className="rounded-3xl border-2 border-dashed border-white/15 hover:border-cyan-400/50 p-6 flex flex-col items-center justify-center space-y-3 text-center transition-all group bg-white/[0.02] hover:bg-cyan-500/[0.05] min-h-[170px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-cyan-300">Create New Category</p>
                  <p className="text-xs text-slate-400">Add a board to organize your bookmarks</p>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* 2. BOOKMARK VIEW: Top search option, all bookmarks, bookmarked/favorite filters, by date descending */}
        {activeView === "bookmarks" && (
          <section className="space-y-5 animate-in fade-in duration-200">
            {/* TOP SEARCH OPTION (Keyword search across title, url, description, takeaways, tags, notes, contacts) */}
            <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-3 shadow-xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by keyword (title, URL, takeaways, tags, phone numbers)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 border border-white/15"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded-md hover:bg-white/10"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Chips: All, Starred/Favorites, and Categories */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
                {/* All Bookmarks Pill */}
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setCurrentFilter("all");
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    currentFilter === "all" && !selectedCategoryId
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/30"
                      : "glass-button text-slate-300 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>All Bookmarks</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/10 font-mono">
                    {links.length}
                  </span>
                </button>

                {/* Favorites Pill */}
                <button
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setCurrentFilter("favorites");
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    currentFilter === "favorites"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 ring-1 ring-white/30"
                      : "glass-button text-slate-300 hover:text-white"
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Favorites</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/10 font-mono">
                    {favoritesCount}
                  </span>
                </button>

                {/* Dynamic Category Chips */}
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const count = linksCountByCategory[cat.id] || 0;
                  const colorStyles = CATEGORY_COLORS[cat.color] || CATEGORY_COLORS.purple;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCategoryId(null);
                          setCurrentFilter("all");
                        } else {
                          setSelectedCategoryId(cat.id);
                          setCurrentFilter("category");
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                        isSelected
                          ? `bg-gradient-to-r ${colorStyles.gradient} text-white shadow-md ${colorStyles.glow} border-white/30`
                          : "glass-button text-slate-300 hover:text-white border-white/10"
                      }`}
                    >
                      <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/10 font-mono">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Status Header and Sort Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {currentFilter === "favorites" ? (
                    <span>Starred Favorites</span>
                  ) : selectedCategoryObj ? (
                    <span className="flex items-center gap-1.5">
                      <span>Category:</span>
                      <span className="text-cyan-300">{selectedCategoryObj.name}</span>
                    </span>
                  ) : (
                    <span>All Bookmarks</span>
                  )}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  ({filteredLinks.length} {filteredLinks.length === 1 ? "item" : "items"})
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Sorted by</span>
                <span className="text-slate-200">Date Descending</span>
                {(selectedCategoryId || currentFilter === "favorites" || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setCurrentFilter("all");
                      setSearchQuery("");
                    }}
                    className="ml-2 text-cyan-400 hover:text-cyan-300 underline text-xs"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* Bookmarks Grid */}
            {filteredLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredLinks.map((link) => {
                  const category = categories.find((c) => c.id === link.categoryId);
                  return (
                    <LinkCard
                      key={link.id}
                      link={link}
                      category={category}
                      onSelect={(l) => setDetailModalLink(l)}
                      onToggleFavorite={handleToggleFavorite}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDeleteLink}
                    />
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center space-y-4 border border-white/10 max-w-lg mx-auto my-8">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
                  <BookmarkPlus className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {searchQuery
                      ? "No matching bookmarks found"
                      : user && links.length === 0
                      ? `Welcome, ${user.name}!`
                      : "No bookmarks found"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery
                      ? `No bookmarks match "${searchQuery}". Try a different keyword.`
                      : user && links.length === 0
                      ? "Your library is ready. Share a video from your mobile or paste a URL above to store your first bookmark!"
                      : "Select another category or click Save Bookmark to add your first link."}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white glass-button-primary shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save a Bookmark</span>
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeView={activeView}
        onViewChange={(v) => {
          setActiveView(v);
          if (v === "bookmarks") {
            setSelectedCategoryId(null);
            setCurrentFilter("all");
          }
        }}
        currentFilter={currentFilter}
        onFilterChange={(f) => {
          if (f === "all") handleSelectCategory(null);
          if (f === "favorites") handleSelectCategory("favorites-filter");
          if (f === "category") {
            setActiveView("categories");
          }
        }}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onScrollToCategories={() => setActiveView("categories")}
        favoritesCount={favoritesCount}
        user={user}
        isSyncing={isSyncing}
      />

      {/* Modals */}
      <AddLinkModal
        isOpen={isAddModalOpen}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        apiKey={apiKey}
        initialUrl={inlineUrl}
        onClose={() => {
          setIsAddModalOpen(false);
          setInlineUrl("");
        }}
        onLinkAdded={handleLinkAdded}
        onCategoryAdded={handleAddCategory}
      />

      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onCategoryAdded={handleAddCategory}
      />

      <LinkDetailModal
        link={detailModalLink}
        category={categories.find((c) => c.id === detailModalLink?.categoryId)}
        isOpen={!!detailModalLink}
        onClose={() => setDetailModalLink(null)}
        onToggleFavorite={handleToggleFavorite}
        onTogglePin={handleTogglePin}
        onUpdateLink={handleUpdateLink}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        apiKey={apiKey}
        onClose={() => setIsSettingsModalOpen(false)}
        onApiKeySaved={(k) => setApiKey(k)}
        onResetSampleData={handleResetSampleData}
        onExportData={handleExportData}
        user={user}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSyncNow={() => syncWithCloud(categories, links, user)}
        onSignOut={handleSignOut}
        stats={{
          totalLinks: links.length,
          totalCategories: categories.length,
          favoritesCount,
          aiGeneratedCount: links.filter((l) => l.aiSummary.isAiGenerated).length,
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onUserSignedIn={handleUserSignedIn}
      />
    </div>
  );
}
