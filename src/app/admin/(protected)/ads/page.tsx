"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AD_PLACEMENT_LABELS } from "@/lib/types";
import type { Ad, AdPlacement } from "@/lib/types";

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    url: "",
    description: "",
    ctaText: "",
    placement: "sidebar" as AdPlacement,
    cities: "",
    zipCodes: "",
    state: "",
  });

  const loadAds = () => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data: Ad[]) => setAds(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAds();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `ad-${Date.now()}`,
        title: form.title.trim(),
        url: form.url.trim() || null,
        description: form.description.trim() || null,
        ctaText: form.ctaText.trim() || null,
        placement: form.placement,
        active: true,
        cities: form.cities.split(",").map((s) => s.trim()).filter(Boolean),
        zipCodes: form.zipCodes.split(",").map((s) => s.trim()).filter(Boolean),
        state: form.state.trim() || null,
      }),
    });
    if (res.ok) {
      setForm({ title: "", url: "", description: "", ctaText: "", placement: "sidebar", cities: "", zipCodes: "", state: "" });
      loadAds();
    } else {
      alert("Failed to save ad.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ad? This cannot be undone.")) return;
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    loadAds();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Manage Ads</h1>
          <p className="text-gray-500 mt-1">
            Labeled sponsor slots — separate from listings, never affect ranking.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>
      </div>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-8 space-y-4">
        <h2 className="font-bold text-lg">Add an Ad</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business / Ad Title *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Link URL</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (tagline)</label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Free roof inspections for storm damage" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Button Text</label>
            <input value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} placeholder="Learn More" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Placement *</label>
            <select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value as AdPlacement })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              {(Object.entries(AD_PLACEMENT_LABELS) as [AdPlacement, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target cities (comma-separated)</label>
            <input value={form.cities} onChange={e => setForm({ ...form, cities: e.target.value })} placeholder="Menasha, Appleton — blank = all" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target zip codes</label>
            <input value={form.zipCodes} onChange={e => setForm({ ...form, zipCodes: e.target.value })} placeholder="54952, 54911" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target state</label>
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="WI — blank = all" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? "Saving..." : "Add Ad"}
        </button>
      </form>

      {/* List */}
      <h2 className="font-bold text-lg mb-3">Live Ads ({ads.length})</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
          <div className="text-3xl mb-2">📣</div>
          <p>No ads yet. Add your first sponsor above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map(ad => (
            <div key={ad.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{ad.title}</span>
                  <span className="badge-category">{AD_PLACEMENT_LABELS[ad.placement] || ad.placement}</span>
                </div>
                {ad.description && <p className="text-sm text-gray-600 mt-1">{ad.description}</p>}
                {ad.url && <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{ad.url}</p>}
                {(ad.cities?.length || ad.zipCodes?.length || ad.state) && (
                  <p className="text-xs text-gray-400 mt-1">
                    📍{" "}
                    {[ad.state && ad.state, ad.cities?.length ? ad.cities.join(", ") : null, ad.zipCodes?.length ? `zips ${ad.zipCodes.join(", ")}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <button onClick={() => handleDelete(ad.id)} className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
