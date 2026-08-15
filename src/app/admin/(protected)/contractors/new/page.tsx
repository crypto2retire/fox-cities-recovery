"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, OWNERSHIP_LABELS } from "@/lib/types";
import type { Contractor, ContractorCategory, OwnershipType } from "@/lib/types";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function NewContractorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "roofing" as ContractorCategory,
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    yearEstablished: new Date().getFullYear() - 5,
    verified: true,
    description: "",
    services: "",
    licenseNumber: "",
    insuranceVerified: true,
    ownershipType: "locally-owned" as OwnershipType,
    ownershipNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const contractor: Contractor = {
      id: slugify(form.name),
      name: form.name,
      category: form.category,
      phone: form.phone,
      email: form.email || undefined,
      website: form.website || undefined,
      address: form.address,
      city: form.city,
      yearEstablished: form.yearEstablished,
      verified: form.verified,
      description: form.description,
      services: form.services.split(',').map(s => s.trim()).filter(Boolean),
      licenseNumber: form.licenseNumber || undefined,
      insuranceVerified: form.insuranceVerified,
      rating: null,
      reviewCount: null,
      ownershipType: form.ownershipType,
      ownershipNotes: form.ownershipNotes,
    };

    const res = await fetch("/api/contractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractor),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      alert("Failed to save. Check the console.");
      setSaving(false);
    }
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-6">Add Contractor</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Business Name *</label>
            <input required value={form.name} onChange={e => update("name", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">ID: {slugify(form.name) || '...'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select required value={form.category} onChange={e => update("category", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              {(Object.entries(CATEGORY_LABELS) as [ContractorCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input required value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="(920) 555-0100" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input value={form.email} onChange={e => update("email", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input value={form.website} onChange={e => update("website", e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City *</label>
            <input required value={form.city} onChange={e => update("city", e.target.value)} placeholder="Menasha" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year Established *</label>
            <input required type="number" min={1950} max={2026} value={form.yearEstablished} onChange={e => update("yearEstablished", parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input value={form.address} onChange={e => update("address", e.target.value)} placeholder="123 Main St, Menasha, WI" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea required value={form.description} onChange={e => update("description", e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Services (comma-separated) *</label>
          <input required value={form.services} onChange={e => update("services", e.target.value)} placeholder="Roof Repair, Emergency Service, Free Estimates" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">License #</label>
            <input value={form.licenseNumber} onChange={e => update("licenseNumber", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Ownership Type *</label>
            <select required value={form.ownershipType} onChange={e => update("ownershipType", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              {(Object.entries(OWNERSHIP_LABELS) as [OwnershipType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ownership Evidence</label>
            <input value={form.ownershipNotes} onChange={e => update("ownershipNotes", e.target.value)} placeholder="How do you know? Single location, DFI lookup, etc." className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.verified} onChange={e => update("verified", e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm">Verified Local</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.insuranceVerified} onChange={e => update("insuranceVerified", e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm">Insurance Verified</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Contractor"}
          </button>
          <button type="button" onClick={() => router.push("/admin")} className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
