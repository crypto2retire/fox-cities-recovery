"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Contractor, Review } from "@/lib/types";
import { OWNERSHIP_LABELS } from "@/lib/types";

export default function AdminDashboard() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin-auth") !== "true") {
      router.push("/admin/login");
      return;
    }

    Promise.all([
      fetch("/api/contractors").then(r => r.json()),
      fetch("/api/reviews").then(r => r.json()),
    ]).then(([c, r]) => {
      setContractors(c);
      setReviews(r);
      setLoading(false);
    });
  }, [router]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contractor? This cannot be undone.")) return;
    await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    setContractors(prev => prev.filter(c => c.id !== id));
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">{contractors.length} contractors · {reviews.length} reviews</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/contractors/new" className="btn-primary text-sm">
            + Add Contractor
          </Link>
          <Link href="/admin/pricing" className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
            Pricing
          </Link>
          <Link href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
            View Site
          </Link>
        </div>
      </div>

      {/* Contractors table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">City</th>
                <th className="text-left px-4 py-3 font-semibold">Est.</th>
                <th className="text-left px-4 py-3 font-semibold">Verified</th>
                <th className="text-left px-4 py-3 font-semibold">Ownership</th>
                <th className="text-left px-4 py-3 font-semibold">Rating</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{c.category.replace(/-/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-600">{c.city}</td>
                  <td className="px-4 py-3 text-gray-600">{c.yearEstablished}</td>
                  <td className="px-4 py-3">{c.verified ? '✅' : '❌'}</td>
                  <td className="px-4 py-3 text-xs">{OWNERSHIP_LABELS[c.ownershipType] || '?'}</td>
                  <td className="px-4 py-3">★ {c.rating}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link
                        href={`/admin/contractors/${c.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Link href="/admin/contractors/new" className="card text-center hover:border-blue-300">
          <div className="text-3xl mb-2">➕</div>
          <h3 className="font-semibold">Add Contractor</h3>
          <p className="text-xs text-gray-500 mt-1">Add a new verified local business</p>
        </Link>
        <Link href="/admin/pricing" className="card text-center hover:border-blue-300">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="font-semibold">Update Pricing</h3>
          <p className="text-xs text-gray-500 mt-1">Adjust roof cost estimates</p>
        </Link>
        <button
          onClick={() => { sessionStorage.removeItem("admin-auth"); router.push("/admin/login"); }}
          className="card text-center hover:border-red-300 w-full"
        >
          <div className="text-3xl mb-2">🚪</div>
          <h3 className="font-semibold">Log Out</h3>
          <p className="text-xs text-gray-500 mt-1">End admin session</p>
        </button>
      </div>
    </div>
  );
}
