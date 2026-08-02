"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RoofPricingConfig } from "@/lib/types";

export default function AdminPricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<RoofPricingConfig>({
    materialPerSqFt: { low: 2.80, high: 5.50 },
    laborPerSqFt: { low: 1.80, high: 3.50 },
    removalPerSqFt: { low: 0.40, high: 0.55 },
  });

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin-auth") !== "true") {
      router.push("/admin/login");
      return;
    }
    fetch("/api/pricing")
      .then(r => r.json())
      .then(data => { setPricing(data); setLoading(false); });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pricing),
    });
    setSaving(false);
    alert("Pricing updated!");
  };

  if (loading) return <div className="max-w-lg mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-6">Roof Pricing</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Material Cost (per sq ft)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Low ($/sq ft)</label>
              <input
                type="number" step="0.01" min="0"
                value={pricing.materialPerSqFt.low}
                onChange={e => setPricing(prev => ({
                  ...prev,
                  materialPerSqFt: { ...prev.materialPerSqFt, low: parseFloat(e.target.value) }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">High ($/sq ft)</label>
              <input
                type="number" step="0.01" min="0"
                value={pricing.materialPerSqFt.high}
                onChange={e => setPricing(prev => ({
                  ...prev,
                  materialPerSqFt: { ...prev.materialPerSqFt, high: parseFloat(e.target.value) }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Labor Cost (per sq ft)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Low ($/sq ft)</label>
              <input
                type="number" step="0.01" min="0"
                value={pricing.laborPerSqFt.low}
                onChange={e => setPricing(prev => ({
                  ...prev,
                  laborPerSqFt: { ...prev.laborPerSqFt, low: parseFloat(e.target.value) }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">High ($/sq ft)</label>
              <input
                type="number" step="0.01" min="0"
                value={pricing.laborPerSqFt.high}
                onChange={e => setPricing(prev => ({
                  ...prev,
                  laborPerSqFt: { ...prev.laborPerSqFt, high: parseFloat(e.target.value) }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Old Roof Removal (per sq ft)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Low ($/sq ft)</label>
              <input
                type="number" step="0.01" min="0"
                value={pricing.removalPerSqFt.low}
                onChange={e => setPricing(prev => ({
                  ...prev,
                  removalPerSqFt: { ...prev.removalPerSqFt, low: parseFloat(e.target.value) }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">High ($/sq ft)</label>
              <input
                type="number" step="0.01" min="0"
                value={pricing.removalPerSqFt.high}
                onChange={e => setPricing(prev => ({
                  ...prev,
                  removalPerSqFt: { ...prev.removalPerSqFt, high: parseFloat(e.target.value) }
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Pricing"}
          </button>
          <button type="button" onClick={() => router.push("/admin")} className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors">
            Back
          </button>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
          <strong>Note:</strong> These prices are used by the roof estimator. Changes take effect immediately. 
          Be conservative with low estimates — it&apos;s better to over-estimate slightly than under-quote someone.
        </div>
      </form>
    </div>
  );
}
