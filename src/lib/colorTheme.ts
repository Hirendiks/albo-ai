import { CategoryColor } from "@/types";

export interface ColorScheme {
  bg: string;
  border: string;
  text: string;
  glow: string;
  badge: string;
  gradient: string;
}

export const CATEGORY_COLORS: Record<CategoryColor, ColorScheme> = {
  purple: {
    bg: "bg-purple-500/15 hover:bg-purple-500/25",
    border: "border-purple-500/30",
    text: "text-purple-300",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
    badge: "bg-purple-500/20 text-purple-200 border-purple-500/40",
    gradient: "from-purple-500 to-indigo-600",
  },
  cyan: {
    bg: "bg-cyan-500/15 hover:bg-cyan-500/25",
    border: "border-cyan-500/30",
    text: "text-cyan-300",
    glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)]",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    gradient: "from-cyan-500 to-blue-600",
  },
  emerald: {
    bg: "bg-emerald-500/15 hover:bg-emerald-500/25",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    gradient: "from-emerald-500 to-teal-600",
  },
  rose: {
    bg: "bg-rose-500/15 hover:bg-rose-500/25",
    border: "border-rose-500/30",
    text: "text-rose-300",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    badge: "bg-rose-500/20 text-rose-200 border-rose-500/40",
    gradient: "from-rose-500 to-pink-600",
  },
  amber: {
    bg: "bg-amber-500/15 hover:bg-amber-500/25",
    border: "border-amber-500/30",
    text: "text-amber-300",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    gradient: "from-amber-500 to-orange-600",
  },
  blue: {
    bg: "bg-blue-500/15 hover:bg-blue-500/25",
    border: "border-blue-500/30",
    text: "text-blue-300",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    badge: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    gradient: "from-blue-500 to-cyan-600",
  },
  indigo: {
    bg: "bg-indigo-500/15 hover:bg-indigo-500/25",
    border: "border-indigo-500/30",
    text: "text-indigo-300",
    glow: "shadow-[0_0_15px_rgba(99,102,241,0.3)]",
    badge: "bg-indigo-500/20 text-indigo-200 border-indigo-500/40",
    gradient: "from-indigo-500 to-violet-600",
  },
};
