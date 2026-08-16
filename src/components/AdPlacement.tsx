"use client";

import { useEffect, useState } from "react";

interface Ad {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  ctaText: string | null;
  placement: string;
  active: boolean;
}

// Map a component variant to a database placement.
const PLACEMENT_BY_VARIANT: Record<string, string> = {
  sidebar: "sidebar",
  inline: "sidebar",
  banner: "directory",
  event: "event",
};

interface AdPlacementProps {
  variant?: "sidebar" | "inline" | "banner" | "event";
  className?: string;
}

export function AdPlacement({ variant = "sidebar", className = "" }: AdPlacementProps) {
  const placement = PLACEMENT_BY_VARIANT[variant] ?? "sidebar";
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ads?placement=${placement}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAds(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  if (loading) return null;

  const ad = ads[0];

  // No sponsor yet — show a self-serve placeholder that points to the sponsor page.
  if (!ad) {
    return (
      <div className={`border-2 border-dashed border-gray-300 rounded-xl p-4 text-center ${className}`}>
        <p className="text-xs text-gray-400 font-bold tracking-wide uppercase mb-2">Advertisement</p>
        <p className="text-sm font-semibold text-gray-500 mb-1">Sponsor this spot</p>
        <p className="text-xs text-gray-400 mb-2">
          Reach {placement === "event" ? "tornado-affected residents" : "homeowners hiring contractors"} right now.
        </p>
        <a href="/sponsor" className="text-xs text-blue-600 font-semibold hover:underline">
          Advertise here →
        </a>
      </div>
    );
  }

  const cta = ad.ctaText || "Learn More";
  const href = ad.url || "/sponsor";
  const external = ad.url ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (variant === "banner" || variant === "event") {
    return (
      <div className={`bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-dashed border-amber-300 rounded-xl p-6 text-center ${className}`}>
        <p className="text-xs text-amber-700 font-bold tracking-wide uppercase mb-2">Advertisement</p>
        <p className="font-bold text-gray-800 text-lg mb-1">{ad.title}</p>
        {ad.description && <p className="text-sm text-gray-600 mb-3">{ad.description}</p>}
        <a href={href} {...external} className="text-sm text-amber-700 font-bold hover:underline">
          {cta} →
        </a>
      </div>
    );
  }

  // sidebar (default)
  return (
    <div className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-dashed border-amber-300 p-4 text-center ${className}`}>
      <p className="text-xs text-amber-700 font-bold tracking-wide uppercase mb-2">Advertisement</p>
      <p className="font-semibold text-gray-800 text-sm mb-1">{ad.title}</p>
      {ad.description && <p className="text-xs text-gray-500 mb-3">{ad.description}</p>}
      <a href={href} {...external} className="text-xs text-amber-700 font-bold hover:underline">
        {cta} →
      </a>
    </div>
  );
}
