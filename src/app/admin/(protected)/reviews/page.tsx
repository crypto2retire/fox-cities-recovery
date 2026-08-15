"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Review, Contractor } from "@/lib/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/reviews").then(r => r.json()),
      fetch("/api/contractors").then(r => r.json()),
    ]).then(([revs, conts]) => {
      setReviews(revs);
      setContractors(conts);
      setLoading(false);
    });
  }, [router]);

  const getContractorName = (id: string) => contractors.find(c => c.id === id)?.name || id;

  // We need a separate API endpoint for the full review data (with contact info)
  // For now, use the data-store directly through an API
  const handleRespond = async (reviewId: string) => {
    // Update review with business response via a new API endpoint
    const res = await fetch(`/api/reviews/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewId,
        businessResponse: responseText,
        businessResponseDate: new Date().toISOString().split("T")[0],
      }),
    });
    if (res.ok) {
      setRespondingTo(null);
      setResponseText("");
      // Refresh
      const updated = await fetch("/api/reviews").then(r => r.json());
      setReviews(updated);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    await fetch(`/api/reviews?id=${reviewId}`, { method: "DELETE" });
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const flagged = reviews.filter(r => r.flagged);
  const inApp = reviews.filter(r => r.source === 'in-app');

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Review Management</h1>
          <p className="text-gray-500 mt-1">
            {reviews.length} total · {flagged.length} flagged · {inApp.length} in-app
          </p>
        </div>
        <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">← Back to Dashboard</Link>
      </div>

      {/* Flagged Reviews */}
      {flagged.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span className="text-red-500">⚠️</span> Flagged Reviews ({flagged.length})
          </h2>
          <div className="space-y-3">
            {flagged.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                contractorName={getContractorName(review.contractorId)}
                isResponding={respondingTo === review.id}
                responseText={responseText}
                setResponseText={setResponseText}
                onRespond={() => setRespondingTo(review.id)}
                onCancelRespond={() => { setRespondingTo(null); setResponseText(""); }}
                onSubmitRespond={() => handleRespond(review.id)}
                onDelete={() => handleDelete(review.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Reviews */}
      <h2 className="font-bold text-lg mb-3">All Reviews</h2>
      <div className="space-y-3">
        {reviews.map(review => (
          <ReviewCard
            key={review.id}
            review={review}
            contractorName={getContractorName(review.contractorId)}
            isResponding={respondingTo === review.id}
            responseText={responseText}
            setResponseText={setResponseText}
            onRespond={() => setRespondingTo(review.id)}
            onCancelRespond={() => { setRespondingTo(null); setResponseText(""); }}
            onSubmitRespond={() => handleRespond(review.id)}
            onDelete={() => handleDelete(review.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  contractorName,
  isResponding,
  responseText,
  setResponseText,
  onRespond,
  onCancelRespond,
  onSubmitRespond,
  onDelete,
}: {
  review: Review;
  contractorName: string;
  isResponding: boolean;
  responseText: string;
  setResponseText: (v: string) => void;
  onRespond: () => void;
  onCancelRespond: () => void;
  onSubmitRespond: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${review.flagged ? 'border-red-300 bg-red-50/30' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{review.authorName}</span>
            <span className="text-amber-500 font-bold">★ {review.rating}</span>
            <span className="text-xs text-gray-400">{review.date}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${review.source === 'in-app' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {review.source}
            </span>
            <span className="text-xs text-gray-500">on {contractorName}</span>
          </div>
          {review.flagged && (
            <p className="text-xs text-red-600 mt-1">🚩 {review.flagReason}</p>
          )}
        </div>
        <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Delete</button>
      </div>

      <p className="text-sm text-gray-700 mb-2">{review.comment}</p>

      {/* Contact info (private) */}
      {(review.contactEmail || review.contactPhone) && (
        <div className="text-xs text-gray-400 mb-2 bg-gray-50 rounded p-2">
          <span className="font-medium">Verification contact:</span>
          {review.contactEmail && <span> 📧 {review.contactEmail}</span>}
          {review.contactPhone && <span> 📞 {review.contactPhone}</span>}
        </div>
      )}

      {/* Business response */}
      {review.businessResponse && (
        <div className="ml-3 pl-3 border-l-2 border-blue-300 mb-2">
          <p className="text-xs font-semibold text-blue-700 mb-0.5">{contractorName} responded ({review.businessResponseDate}):</p>
          <p className="text-sm text-gray-600">{review.businessResponse}</p>
        </div>
      )}

      {/* Response form */}
      {isResponding ? (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <textarea
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder={`Respond as ${contractorName}...`}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={onSubmitRespond} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
              Post Response
            </button>
            <button onClick={onCancelRespond} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={onRespond} className="text-xs text-blue-600 hover:text-blue-800 mt-1">
          {review.businessResponse ? 'Edit Response' : 'Respond as Business'}
        </button>
      )}
    </div>
  );
}
