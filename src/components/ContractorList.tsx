"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, OWNERSHIP_LABELS } from "@/lib";
import type { Contractor, ContractorCategory, OwnershipType } from "@/lib";
import { OwnershipBadge } from "@/components/OwnershipBadge";
import { AdPlacement } from "@/components/AdPlacement";

export function ContractorList({ contractors }: { contractors: Contractor[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [ownership, setOwnership] = useState<string>("all");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  const cities = useMemo(() => {
    const unique = [...new Set(contractors.map(c => c.city))].sort();
    return unique;
  }, [contractors]);

  const filtered = useMemo(() => {
    return contractors.filter(c => {
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
  }, [search, category, city, ownership, showVerifiedOnly, contractors]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Local Contractors</h1>
        <p className="text-gray-600">
          Every contractor listed here was established in the Fox Cities <strong>before</strong> the July 27, 2026 tornado.
          No storm chasers — just businesses that are part of this community.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-8">
        <div className="grid sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search contractors or services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            style={{ fontSize: '16px' }}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Categories</option>
            {(Object.entries(CATEGORY_LABELS) as [ContractorCategory, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={ownership}
            onChange={e => setOwnership(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Ownership</option>
            <option value="locally-owned">🏠 Locally Owned</option>
            <option value="family-owned">👨‍👩‍👧 Family Owned</option>
            <option value="pe-backed">💼 PE Backed</option>
            <option value="corporate">🏢 Corporate</option>
            <option value="franchise">🏪 Franchise</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showVerifiedOnly}
              onChange={e => setShowVerifiedOnly(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">Verified only</span>
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>
          {filtered.length} contractor{filtered.length !== 1 ? 's' : ''} found
          {contractors.length !== filtered.length && ` (from ${contractors.length} total)`}
        </span>
        <span className="text-xs text-gray-400" title="Sorted by credibility: combines rating, review count, and years in business. A few 5-star reviews won't outrank hundreds of 4.x reviews.">
          Sorted by credibility ⓘ
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-lg font-medium">No contractors match your filters</p>
          <p className="text-sm mt-2">Try adjusting your search or category</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(c => (
            <Link key={c.id} href={`/contractors/${c.id}`} className="card group">
              <div className="flex items-start justify-between mb-3">
                <span className="badge-category capitalize">{c.category.replace(/-/g, ' ')}</span>
                <div className="flex items-center gap-1">
                  <OwnershipBadge type={c.ownershipType} compact />
                  {c.verified && (
                    <span className="badge-verified">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-lg group-hover:text-blue-700 transition-colors">{c.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{c.city}, WI · Est. {c.yearEstablished}</p>

              <p className="text-sm text-gray-600 mt-3 line-clamp-2">{c.description}</p>

              <div className="flex flex-wrap gap-1 mt-3">
                {c.services.slice(0, 3).map(s => (
                  <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{s}</span>
                ))}
                {c.services.length > 3 && (
                  <span className="text-xs text-gray-400">+{c.services.length - 3} more</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="flex items-center gap-1">
                  <span className="text-amber-500 font-bold">★ {c.rating}</span>
                  <span className="text-xs text-gray-400">({c.reviewCount})</span>
                </div>
                <span className="text-sm text-blue-600 font-medium group-hover:underline">View Details →</span>
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
