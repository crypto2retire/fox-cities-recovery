"use client";

import { useState } from "react";
import { ReviewForm } from "./ReviewForm";
import type { Review } from "@/lib";

export function ReviewsSection({
  contractorId,
  contractorName,
  initialReviews,
}: {
  contractorId: string;
  contractorName: string;
  initialReviews: Review[];
}) {
  const [reviews, setReviews] = useState(initialReviews);

  const handleReviewSubmitted = async () => {
    // Refresh reviews from API
    try {
      const res = await fetch("/api/reviews");
      const all = await res.json();
      setReviews(all.filter((r: Review) => r.contractorId === contractorId));
    } catch {
      // Keep current reviews on failure
    }
  };

  const inAppCount = reviews.filter(r => r.source === 'in-app').length;
  const googleCount = reviews.filter(r => r.source === 'google').length;

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Customer Reviews</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            {googleCount > 0 && <span>{googleCount} from Google</span>}
            {inAppCount > 0 && <span>{inAppCount} in-app</span>}
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-muted text-sm">No reviews yet. Be the first to review {contractorName}.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{review.authorName}</span>
                    {review.source === 'in-app' && (
                      <span className="badge-verified !px-2 !py-0.5">
                        Verified Customer
                      </span>
                    )}
                    {review.jobType && (
                      <span className="text-xs text-muted">· {review.jobType}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500 font-bold">★ {review.rating}</span>
                    <span className="text-xs text-muted">{review.date}</span>
                  </div>
                </div>
                <p className="text-ink/80 text-sm">{review.comment}</p>
                {review.flagged && (
                  <p className="text-xs text-red-500 mt-1">⚠️ This review has been flagged for review: {review.flagReason}</p>
                )}
                {review.businessResponse && (
                  <div className="mt-3 ml-4 pl-3 border-l-2 border-brand-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-brand-600">{contractorName} responded:</span>
                      {review.businessResponseDate && (
                        <span className="text-xs text-muted">{review.businessResponseDate}</span>
                      )}
                    </div>
                    <p className="text-sm text-ink/70">{review.businessResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review form */}
      <div className="mt-6">
        <ReviewForm
          contractorId={contractorId}
          contractorName={contractorName}
          onSubmitted={handleReviewSubmitted}
        />
      </div>
    </>
  );
}
