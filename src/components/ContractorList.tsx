"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORY_LABELS, OWNERSHIP_LABELS } from "@/lib";
import type { Contractor, ContractorCategory, OwnershipType } from "@/lib";
import { OwnershipBadge } from "@/components/OwnershipBadge";
import { AdPlacement } from "@/components/AdPlacement";

export type SortOption = 'credibility' | 'rating' | 'reviews' | 'oldest' | 'newest';

const OWNERSHIP_OPTIONS: [OwnershipType, string][] = [
  ["locally-owned", "🏠 Locally Owned"],
  ["family-owned", "👨‍👩‍👧 Family Owned"],
  ["pe-backed", "💼 PE Backed"],
  ["corporate", "🏢 Corporate"],
  ["franchise", "🏪 Franchise"],
];

export function ContractorList({
  contractors,
  heading = "Local Contractors",
  subheading = (
    <>Every contractor listed here was established in the Fox Cities <strong>before</strong> the July 27, 2026 tornado. No storm chasers — just businesses that are part of this community.</>
  ),
}: {
  contractors: Contractor[];
  heading?: string;
  subheading?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string>(searchParams.get("category") ?? "all");
  const [city, setCity] = useState<string>(searchParams.get("city") ?? "all");
  const [ownership, setOwnership] = useState<string>(searchParams.get("ownership") ?? "all");
  const [sort, setSort] = useState<SortOption>((searchParams.get("sort") as SortOption) ?? "credibility");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(searchParams.get("verified") === "1");

  // Keep the URL in sync so filtered views are shareable + indexable by search engines.
  // Only sync on the /contractors directory page — the storm landing page reuses this
  // component with its own route and must NOT be redirected away.
  useEffect(() => {
    if (pathname !== "/contractors") return;
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category !== "all") params.set("category", category);
    if (city !== "all") params.set("city", city);
    if (ownership !== "all") params.set("ownership", ownership);
    if (sort !== "credibility") params.set("sort", sort);
    if (showVerifiedOnly) params.set("verified", "1");
    const qs = params.toString();
    router.replace(qs ? `/contractors?${qs}` : "/contractors", { scroll: false });
  }, [pathname, search, category, city, ownership, sort, showVerifiedOnly, router]);

  const cities = useMemo(() => {
    const unique = [...new Set(contractors.map(c => c.city))].sort();
    return unique;
  }, [contractors]);

  const filtered = useMemo(() => {
    const matched = contractors.filter(c => {
      const matchSearch = search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.services.some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = category === "all" || c.category === category;
      const matchCity = city === "all" || c.city === city;
      const matchOwnership = ownership === "all" || c.ownershipType === ownership;
      const matchVerified = !showVerifiedOnly || c.verified;
      return matchSearch && matchCategory && matchCity && matchOwnership && matchVerified;
    });

    const sorted = [...matched];
    const ratingOrNull = (v: number | null) => v ?? -1;
    switch (sort) {
      case 'rating':
        sorted.sort((a, b) => ratingOrNull(b.rating) - ratingOrNull(a.rating) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
        break;
      case 'reviews':
        sorted.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || ratingOrNull(b.rating) - ratingOrNull(a.rating));
        break;
      case 'oldest':
        sorted.sort((a, b) => (a.yearEstablished ?? 9999) - (b.yearEstablished ?? 9999));
        break;
      case 'newest':
        sorted.sort((a, b) => (b.yearEstablished ?? 0) - (a.yearEstablished ?? 0));
        break;
      case 'credibility':
      default:
        break;
    }
    return sorted;
  }, [search, category, city, ownership, sort, showVerifiedOnly, contractors]);

  const hasActiveFilters = search !== "" || category !== "all" || city !== "all" || ownership !== "all" || showVerifiedOnly;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      {/* Header */}
      <div className="mb-8">
        <p className="kicker mb-3">Verified directory</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">{heading}</h1>
        <p className="text-muted max-w-2xl">{subheading}</p>
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl border border-gray-200/70 bg-white shadow-[0_1px_3px_rgba(7,17,31,0.05),0_12px_32px_-20px_rgba(7,17,31,0.18)] p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
            <input
              type="text"
              placeholder="Search contractors or services…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <select value={category} onChange={e => setCategory(e.target.value)} className="select sm:w-44" style={{ fontSize: '16px' }}>
              <option value="all">All Categories</option>
              {(Object.entries(CATEGORY_LABELS) as [ContractorCategory, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)} className="select sm:w-36" style={{ fontSize: '16px' }}>
              <option value="all">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={ownership} onChange={e => setOwnership(e.target.value)} className="select sm:w-44" style={{ fontSize: '16px' }}>
              <option value="all">All Ownership</option>
              {OWNERSHIP_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowVerifiedOnly(v => !v)}
              className={`pill border transition-colors ${showVerifiedOnly ? "bg-green-50 text-green-700 border-green-300" : "bg-gray-50 text-muted border-gray-200 hover:border-gray-300"}`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Verified only
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCategory("all"); setCity("all"); setOwnership("all"); setShowVerifiedOnly(false); }}
                className="pill border border-gray-200 text-muted hover:text-ink hover:border-gray-300 transition-colors"
              >
                Clear filters ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className="text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white text-ink focus:ring-1 focus:ring-brand-400 outline-none">
              <option value="credibility">Credibility</option>
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="oldest">Oldest Businesses</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-5 text-sm text-muted">
        <strong className="text-ink">{filtered.length}</strong> contractor{filtered.length !== 1 ? "s" : ""} found
        {contractors.length !== filtered.length && <> (from {contractors.length} total)</>}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg font-semibold text-ink">No contractors match your filters</p>
          <p className="text-sm mt-2">Try adjusting your search or category.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setSearch(""); setCategory("all"); setCity("all"); setOwnership("all"); setShowVerifiedOnly(false); }}
              className="btn-ghost-dark mt-6 !py-2.5 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(c => (
            <Link key={c.id} href={`/contractors/${c.id}`} className="card card-hover group flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="badge-category capitalize">{c.category.replace(/-/g, " ")}</span>
                <div className="flex items-center gap-1.5">
                  <OwnershipBadge type={c.ownershipType} compact />
                  {c.verified && (
                    <span className="badge-verified" title="Verified local business">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-lg group-hover:text-brand-600 transition-colors">{c.name}</h3>
              <p className="text-sm text-muted mt-1">{c.city}, WI{c.yearEstablished != null ? ` · Est. ${c.yearEstablished}` : ""}</p>

              <p className="text-sm text-ink/70 mt-3 mb-4 line-clamp-2">{c.description}</p>

              <div className="flex flex-wrap gap-1.5 mt-auto mb-4">
                {c.services.slice(0, 3).map(s => (
                  <span key={s} className="pill bg-gray-100 text-gray-600">{s}</span>
                ))}
                {c.services.length > 3 && (
                  <span className="text-xs text-muted self-center">+{c.services.length - 3} more</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                {c.rating != null ? (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <span className="text-amber-500 font-bold">★ {c.rating}</span>
                    <span className="text-xs text-muted">({c.reviewCount})</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">No rating yet</span>
                )}
                <span className="text-sm text-brand-600 font-semibold group-hover:translate-x-0.5 transition-transform">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Ad zone — clearly separated from listings */}
      <div className="mt-16">
        <AdPlacement variant="banner" />
      </div>
    </div>
  );
}
