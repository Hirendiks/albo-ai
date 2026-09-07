"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "@/types/auth";
import { X, Sparkles, Cloud, ShieldCheck, ArrowRight, Loader2, Mail, ExternalLink } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSignedIn: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onUserSignedIn,
}) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sign in with Google");
      }

      onUserSignedIn(data.user);
      onClose();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setErrorMessage(err.message || "Failed to sign in with Google credential");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (googleClientId && typeof window !== "undefined" && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        if (googleBtnRef.current) {
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_blue",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: 280,
          });
        }

        // Also prompt One-Tap account popup
        (window as any).google.accounts.id.prompt();
      } catch (err) {
        console.warn("Failed to initialize Google Sign In:", err);
      }
    }
  }, [isOpen, googleClientId]);

  if (!isOpen) return null;

  const handleQuickSignIn = async (targetEmail: string, targetName?: string) => {
    if (!targetEmail.trim() || !targetEmail.includes("@")) {
      setErrorMessage("Please enter a valid Gmail or email address");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          name: targetName || name.trim() || undefined,
          quickMode: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sign in");
      }

      onUserSignedIn(data.user);
      onClose();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setErrorMessage(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Frosted Backdrop */}
      <div
        onClick={!isLoading ? onClose : undefined}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md my-auto rounded-3xl glass-panel-elevated p-6 sm:p-7 z-10 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand & Google Icon */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-md">
            {/* Google Multi-colored SVG Logo */}
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Sign in with Google
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Connect your Gmail account to synchronize your categories, links, and AI takeaways across all devices.
            </p>
          </div>
        </div>

        {/* Benefits Badges */}
        <div className="mt-5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Cloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Real-time cross-device cloud sync</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Keeps all your extracted contacts & phone numbers</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Preserves existing local library automatically</span>
          </div>
        </div>

        {/* Primary Action: Prominent Official Google Sign In Button */}
        <div className="mt-5 space-y-3">
          {googleClientId ? (
            <div ref={googleBtnRef} className="flex justify-center min-h-[44px]" />
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                if (email.trim()) {
                  handleQuickSignIn(email);
                } else {
                  handleQuickSignIn("hirendiks@gmail.com", "Hirendiks");
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          )}

          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              or enter any Gmail
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </div>

        {/* Direct Email / Google Sign In Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuickSignIn(email);
          }}
          className="mt-4 space-y-3.5"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Your Gmail / Google Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@gmail.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm glass-input text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm glass-input text-white placeholder-slate-500 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="text-xs text-rose-400 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              {errorMessage}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white glass-button-primary flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                <span>Connecting & Syncing...</span>
              </>
            ) : (
              <>
                <span>Sign In & Sync Data</span>
                <ArrowRight className="w-4 h-4 text-cyan-300" />
              </>
            )}
          </button>
        </form>

        {/* Quick 1-Click Accounts */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-slate-400 mb-2">Or 1-tap to sign in with:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickSignIn("hirendiks@gmail.com", "Hirendiks")}
              className="px-3 py-1.5 rounded-xl text-xs glass-button font-medium text-cyan-300 hover:text-white border border-cyan-500/30 flex items-center gap-1.5"
            >
              <span>hirendiks@gmail.com</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleQuickSignIn("alex.dev@gmail.com", "Alex Chen")}
              className="px-2.5 py-1.5 rounded-xl text-xs glass-button text-slate-300 hover:text-white"
            >
              alex.dev@gmail.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
