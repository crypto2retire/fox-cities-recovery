"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AdMarket, AdRate, PricingAnalysis, PricingRecommendation, MarketTier } from "@/lib/types";
import { AD_PLACEMENT_LABELS, MARKET_TIER_LABELS } from "@/lib/types";

const fmt = (cents: number) => `$${(cents / 100).toFixed(0)}`;

const ACTION_STYLES: Record<PricingRecommendation["action"], string> = {
  raise: "bg-green-100 text-green-700",
  lower: "bg-red-100 text-red-700",
  hold: "bg-gray-100 text-gray-600",
};

export default function AdminPricingPage() {
  const [markets, setMarkets] = useState<AdMarket[]>([]);
  const [rates, setRates] = useState<AdRate[]>([]);
  const [analysis, setAnalysis] = useState<PricingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newMarket, setNewMarket] = useState({ id: "", name: "", state: "WI", cities: "", zipCodes: "", population: "" });

  const load = () => {
    fetch("/api/ad-markets")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
        return r.json();
      })
      .then((data) => {
        setMarkets(data.markets ?? []);
        setRates(data.rates ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const runAnalysis = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/ad-markets/pricing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const applyAll = async () => {
    if (!analysis?.recommendations?.length) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ad-markets/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendations: analysis.recommendations }),
      });
      if (!res.ok) throw new Error("Apply failed");
      setAnalysis(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const setDemand = async (rateId: string, field: "filled" | "waitlist", value: number) => {
    await fetch(`/api/ad-markets/rates/${rateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  };

  const addMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarket.id.trim() || !newMarket.name.trim()) return;
    setError(null);
    const res = await fetch("/api/ad-markets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newMarket.id.trim(),
        name: newMarket.name.trim(),
        state: newMarket.state.trim(),
        cities: newMarket.cities.split(",").map((s) => s.trim()).filter(Boolean),
        zipCodes: newMarket.zipCodes.split(",").map((s) => s.trim()).filter(Boolean),
        population: Number(newMarket.population) || 0,
      }),
    });
    if (res.ok) {
      setNewMarket({ id: "", name: "", state: "WI", cities: "", zipCodes: "", population: "" });
      load();
    } else {
      setError((await res.json()).error || "Failed to add market");
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>;

  const ratesFor = (marketId: string) => rates.filter((r) => r.marketId === marketId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Ad Pricing & Markets</h1>
          <p className="text-gray-500 mt-1">
            Geo-targeted ad inventory. Rates scale with market size; the AI optimizer moves prices to fill every slot.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">← Dashboard</Link>
      </div>

      {error && <p className="text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</p>}

      {/* AI analyzer */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-lg">Yield Optimizer</h2>
            <p className="text-sm text-gray-500">
              Analyzes fill + waitlist across all markets and recommends price moves to maximize fill and revenue.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={runAnalysis} disabled={running} className="btn-primary text-sm">
              {running ? "Analyzing…" : "Run Analysis"}
            </button>
            {analysis && (
              <button onClick={applyAll} disabled={applying} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                {applying ? "Applying…" : `Apply ${analysis.recommendations.length} changes`}
              </button>
            )}
          </div>
        </div>

        {analysis && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-400">
              Source: {analysis.source === "ai" ? "🤖 AI (Gemini)" : "⚙️ deterministic rules (no LLM key)"}
            </p>
            {analysis.recommendations.map((rec) => (
              <div key={`${rec.marketId}:${rec.placement}`} className="flex items-center justify-between gap-3 border rounded-lg px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACTION_STYLES[rec.action]}`}>{rec.action.toUpperCase()}</span>
                  <span className="font-semibold">{rec.marketId}</span>
                  <span className="text-gray-500">· {AD_PLACEMENT_LABELS[rec.placement]}</span>
                  <span className="text-gray-400 line-through">{fmt(rec.currentRateCents)}</span>
                  <span className="text-green-700 font-bold">→ {fmt(rec.newRateCents)}</span>
                </div>
                <span className="text-gray-500 text-xs text-right max-w-xs">{rec.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add market */}
      <form onSubmit={addMarket} className="bg-white rounded-xl shadow-sm border p-5 mb-8">
        <h2 className="font-bold text-lg mb-3">Add a Market</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={newMarket.id} onChange={(e) => setNewMarket({ ...newMarket, id: e.target.value })} placeholder="id (e.g. green-bay)" className="px-3 py-2 border rounded-lg text-sm" />
          <input value={newMarket.name} onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })} placeholder="Name (e.g. Green Bay)" className="px-3 py-2 border rounded-lg text-sm" />
          <input value={newMarket.state} onChange={(e) => setNewMarket({ ...newMarket, state: e.target.value })} placeholder="State (WI)" className="px-3 py-2 border rounded-lg text-sm" />
          <input value={newMarket.cities} onChange={(e) => setNewMarket({ ...newMarket, cities: e.target.value })} placeholder="Cities (comma-separated)" className="px-3 py-2 border rounded-lg text-sm" />
          <input value={newMarket.zipCodes} onChange={(e) => setNewMarket({ ...newMarket, zipCodes: e.target.value })} placeholder="Zip codes (comma-separated)" className="px-3 py-2 border rounded-lg text-sm" />
          <input value={newMarket.population} onChange={(e) => setNewMarket({ ...newMarket, population: e.target.value })} placeholder="Population (drives tier)" type="number" className="px-3 py-2 border rounded-lg text-sm" />
        </div>
        <button type="submit" className="btn-primary text-sm mt-3">Add Market</button>
      </form>

      {/* Markets + rates */}
      {markets.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
          <div className="text-3xl mb-2">📍</div>
          <p>No markets yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {markets.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{m.name}</h3>
                    <span className="badge-category">{MARKET_TIER_LABELS[m.tier as MarketTier] ?? m.tier}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {m.population.toLocaleString()} residents · {m.state} · {m.cities.join(", ") || "no cities"} {m.zipCodes.length ? `· zips: ${m.zipCodes.join(", ")}` : ""}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 border-b">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">Placement</th>
                      <th className="py-2 pr-4 font-semibold">Current</th>
                      <th className="py-2 pr-4 font-semibold">Base</th>
                      <th className="py-2 pr-4 font-semibold">Fill</th>
                      <th className="py-2 pr-4 font-semibold">Waitlist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratesFor(m.id).map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{AD_PLACEMENT_LABELS[r.placement]}</td>
                        <td className="py-2 pr-4 font-bold text-blue-700">{fmt(r.currentRateCents)}</td>
                        <td className="py-2 pr-4 text-gray-500">{fmt(r.baseRateCents)}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setDemand(r.id, "filled", Math.max(0, r.filled - 1))} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-xs">−</button>
                            <span className="w-8 text-center">{r.filled}/{r.capacity}</span>
                            <button onClick={() => setDemand(r.id, "filled", Math.min(r.capacity, r.filled + 1))} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-xs">+</button>
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setDemand(r.id, "waitlist", Math.max(0, r.waitlist - 1))} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-xs">−</button>
                            <span className="w-8 text-center">{r.waitlist}</span>
                            <button onClick={() => setDemand(r.id, "waitlist", r.waitlist + 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-xs">+</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
