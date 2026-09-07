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
} from "lucide-react";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<AnalyzedLink[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ViewFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

    // Check for incoming share targets via URL query params (?url=https://...)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get("url") || params.get("text");
      if (sharedUrl && (sharedUrl.startsWith("http://") || sharedUrl.startsWith("https://"))) {
        setInlineUrl(sharedUrl);
        setIsAddModalOpen(true);
      }
    }
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
        return titleMatch || descMatch || urlMatch || tldrMatch || tagsMatch || takeawaysMatch;
      });
    }

    // Sort: Pinned first, then newest
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

        {/* Categories Section */}
        <section ref={categoriesSectionRef} className="pt-2">
          <CategoryList
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            currentFilter={currentFilter}
            onSelectCategory={handleSelectCategory}
            onOpenAddCategoryModal={() => setIsAddCategoryModalOpen(true)}
            onDeleteCategory={handleDeleteCategory}
            linksCountByCategory={linksCountByCategory}
            totalLinksCount={links.length}
            favoritesCount={favoritesCount}
          />
        </section>

        {/* Active Filter Header */}
        <section className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {currentFilter === "favorites" ? (
                <span>Starred Favorites</span>
              ) : selectedCategoryObj ? (
                <span>{selectedCategoryObj.name}</span>
              ) : (
                <span>Curated Library</span>
              )}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredLinks.length} {filteredLinks.length === 1 ? "item" : "items"})
            </span>
          </div>

          {searchQuery && (
            <p className="text-xs text-slate-400">
              Matching <span className="text-cyan-300">"{searchQuery}"</span>
            </p>
          )}
        </section>

        {/* Links Grid */}
        <section>
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
                    ? "No matching links found"
                    : user && links.length === 0
                    ? `Welcome, ${user.name}!`
                    : "No links in this category yet"}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery
                    ? "Try adjusting your search terms or clearing the filter."
                    : user && links.length === 0
                    ? "Your library is completely blank and ready for your content. Paste any video, article, or repository link above to save your first item!"
                    : "Paste a URL or use the share option to fetch details and run AI analysis."}
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white glass-button-primary shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Save a Link Now</span>
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentFilter={currentFilter}
        onFilterChange={(f) => {
          if (f === "all") handleSelectCategory(null);
          if (f === "favorites") handleSelectCategory("favorites-filter");
          if (f === "category") scrollToCategories();
        }}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onScrollToCategories={scrollToCategories}
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
