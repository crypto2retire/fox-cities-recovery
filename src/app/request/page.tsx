"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Contractor {
  id: string;
  name: string;
  category: string;
  city: string;
}

const CATEGORY_OPTIONS = [
  { value: "roofing", label: "Roof Repair / Replacement" },
  { value: "tree-removal", label: "Tree Removal / Cleanup" },
  { value: "debris-removal", label: "Debris Removal" },
  { value: "water-damage", label: "Water Damage Restoration" },
  { value: "structural-repair", label: "Structural Repair" },
  { value: "general-contractor", label: "General Contracting / Rebuild" },
  { value: "electrician", label: "Electrical" },
  { value: "plumber", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "windows-doors", label: "Windows & Doors" },
  { value: "siding-gutters", label: "Siding & Gutters" },
  { value: "home-builder", label: "New Home Build" },
  { value: "other", label: "Other" },
];

function RequestForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselected = searchParams.get("contractor");

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [service, setService] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>(preselected ? [preselected] : []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/contractors")
      .then((r) => r.json())
      .then((d) => {
        setContractors(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // 3-quote cap
      return [...prev, id];
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return setError("Choose the type of service you need.");
    if (selected.length === 0) return setError("Select up to 3 businesses to quote your job.");
    setBusy(true);
    setError(null);

    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service,
        description,
        businessIds: selected,
        consumerName: name || null,
        consumerEmail: email || null,
        consumerPhone: phone || null,
        consumerHandle: name || "Local resident",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to submit. You may need to sign in first.");
      if (res.status === 401) router.push("/account");
    } else {
      router.push(`/account/quotes/${data.id}`);
    }
    setBusy(false);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold mb-2">Request Quotes</h1>
      <p className="text-gray-600 text-sm mb-6">
        Tell us what you need and pick up to <strong>3 local businesses</strong>. They&apos;ll respond in-app —
        your contact info stays private until you choose to share it.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">What do you need help with? *</label>
            <select value={service} onChange={(e) => setService(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select a service…</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.label}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Describe the job</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Roof damage from the tornado, shingles missing over the garage, ~1,200 sq ft"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <label className="block text-sm font-medium mb-2">
            Choose up to 3 businesses <span className="text-gray-400">({selected.length}/3 selected)</span>
          </label>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {contractors.map((c) => (
              <label key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(c.id) ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  disabled={!selected.includes(c.id) && selected.length >= 3}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{c.category.replace(/-/g, " ")} · {c.city}</p>
                </div>
              </label>
            ))}
          </div>
          {selected.length >= 3 && <p className="text-xs text-amber-600 mt-2">You&apos;ve reached the 3-quote cap — this keeps quotes competitive and fair.</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <p className="text-sm font-medium">Your contact info (kept private until you choose to share it)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="px-3 py-2 border rounded-lg text-sm" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border rounded-lg text-sm" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full text-base">
          {busy ? "Submitting…" : "Request Quotes"}
        </button>
      </form>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>}>
      <RequestForm />
    </Suspense>
  );
}
