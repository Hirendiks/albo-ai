export type CategoryColor =
  | "cyan"
  | "purple"
  | "emerald"
  | "amber"
  | "rose"
  | "blue"
  | "indigo";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: CategoryColor;
  description?: string;
  createdAt: number;
}

export type ContentType =
  | "article"
  | "video"
  | "repository"
  | "tool"
  | "paper"
  | "social"
  | "documentation"
  | "other";

export interface ExtractedContacts {
  phoneNumbers: string[];
  emails: string[];
  links: string[];
  whatsappOrSocials: string[];
  addressOrLocation?: string;
  pricingOrOffers?: string;
}

export interface AISummary {
  tldr: string;
  keyTakeaways: string[];
  detailedSummary: string;
  actionableInsights: string[];
  tags: string[];
  contentType: ContentType;
  estimatedReadTime: string;
  suggestedCategoryId?: string;
  isAiGenerated: boolean;
  contacts?: ExtractedContacts;
  spokenOrOnScreenContent?: string;
}

export interface AnalyzedLink {
  id: string;
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  author?: string;
  publishedDate?: string;
  categoryId: string;
  notes?: string;
  isFavorite: boolean;
  isPinned: boolean;
  aiSummary: AISummary;
  createdAt: number;
  updatedAt: number;
}

export interface ScrapedData {
  url: string;
  title: string;
  description: string;
  image?: string;
  screenshot?: string;
  screenshotImage?: string;
  favicon?: string;
  siteName?: string;
  author?: string;
  publishedDate?: string;
  extractedText: string;
  headings: string[];
  rawFullDescription?: string;
  detectedContacts?: {
    phoneNumbers: string[];
    emails: string[];
    links: string[];
  };
  onScreenNotes?: string;
}

export type ViewFilter = "all" | "favorites" | "pinned" | "category";
