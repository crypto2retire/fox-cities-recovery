"use client";

import { useState, useEffect } from "react";

// Ad placements that rotate based on available inventory
// In production, these would come from an ad server or data file
const AD_INVENTORY = [
  {
    headline: "Your Business Here",
    body: "Reach Fox Cities homeowners actively looking for contractors. Listings are free — ads are how local businesses get extra visibility.",
    cta: "Learn About Advertising",
    link: "mailto:ads@foxcitiesrecovery.com",
    background: "from-amber-50 to-yellow-50",
    border: "border-amber-300",
  },
  {
    headline: "Local Business?",
    body: "Get in front of tornado victims searching for help right now. Clearly labeled ads — no tricks, no paid rankings.",
    cta: "Advertise Here",
    link: "mailto:ads@foxcitiesrecovery.com",
    background: "from-blue-50 to-indigo-50",
    border: "border-blue-300",
  },
];

interface AdPlacementProps {
  variant?: "sidebar" | "inline" | "banner";
  className?: string;
}

export function AdPlacement({ variant = "sidebar", className = "" }: AdPlacementProps) {
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    // Rotate ads if multiple available
    if (AD_INVENTORY.length > 1) {
      setAdIndex(Math.floor(Math.random() * AD_INVENTORY.length));
    }
  }, []);

  const ad = AD_INVENTORY[adIndex];

  if (variant === "banner") {
    return (
      <div className={`bg-gradient-to-r ${ad.background} border-2 border-dashed ${ad.border} rounded-xl p-5 text-center ${className}`}>
        <p className="text-xs text-amber-700 font-bold tracking-wide uppercase mb-2">Advertisement</p>
        <p className="font-semibold text-gray-800 mb-1">{ad.headline}</p>
        <p className="text-sm text-gray-600 mb-3">{ad.body}</p>
        <a href={ad.link} className="text-sm text-amber-700 font-bold hover:underline">
          {ad.cta} →
        </a>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`bg-gradient-to-r ${ad.background} border-2 border-dashed ${ad.border} rounded-xl p-5 text-center ${className}`}>
        <p className="text-xs text-amber-700 font-bold tracking-wide uppercase mb-2">Advertisement</p>
        <p className="font-semibold text-gray-800 mb-1">{ad.headline}</p>
        <p className="text-sm text-gray-600 mb-3">{ad.body}</p>
        <a href={ad.link} className="text-sm text-amber-700 font-bold hover:underline">
          {ad.cta} →
        </a>
      </div>
    );
  }

  // sidebar — default
  return (
    <div className={`bg-gradient-to-br ${ad.background} rounded-xl border-2 border-dashed ${ad.border} p-4 text-center ${className}`}>
      <p className="text-xs text-amber-700 font-bold tracking-wide uppercase mb-2">Advertisement</p>
      <p className="font-semibold text-gray-800 text-sm mb-1">{ad.headline}</p>
      <p className="text-xs text-gray-500 mb-3">{ad.body}</p>
      <a href={ad.link} className="text-xs text-amber-700 font-bold hover:underline">
        {ad.cta} →
      </a>
    </div>
  );
}
