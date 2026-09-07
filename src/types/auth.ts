import { Category, AnalyzedLink } from "./index";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image?: string;
  provider: "google" | "quick_google";
  lastLoginAt: number;
}

export interface SyncPayload {
  categories: Category[];
  links: AnalyzedLink[];
  clientTimestamp: number;
}

export interface SyncResponse {
  success: boolean;
  categories: Category[];
  links: AnalyzedLink[];
  lastSyncedAt: number;
  message?: string;
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: UserProfile | null;
}
