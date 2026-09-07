"use client";

import React from "react";

export const AuroraBackground: React.FC = () => {
  return (
    <div className="aurora-bg" aria-hidden="true">
      {/* Deep Violet Glow */}
      <div
        className="aurora-orb w-[500px] h-[500px] -top-32 -left-32 bg-purple-600/40 animate-pulse-slow"
        style={{ animationDuration: "9s" }}
      />
      {/* Cyan Glow */}
      <div
        className="aurora-orb w-[600px] h-[600px] top-1/4 -right-40 bg-cyan-500/30 animate-float-slow"
        style={{ animationDuration: "12s" }}
      />
      {/* Indigo / Blue Glow */}
      <div
        className="aurora-orb w-[450px] h-[450px] bottom-10 left-1/3 bg-blue-600/35 animate-float-delayed"
        style={{ animationDuration: "10s" }}
      />
      {/* Magenta Accent Glow */}
      <div
        className="aurora-orb w-[380px] h-[380px] top-2/3 -left-20 bg-pink-600/25 animate-pulse-slow"
        style={{ animationDuration: "8s" }}
      />
      {/* Subtle grid pattern overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
};
