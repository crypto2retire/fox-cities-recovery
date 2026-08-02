"use client";

import { useState } from "react";

interface ReviewFormProps {
  contractorId: string;
  contractorName: string;
  onSubmitted: () => void;
}

export function ReviewForm({ contractorId, contractorName, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  const [jobType, setJobType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a rating"); return; }
    if (!authorName.trim()) { setError("Please enter your name"); return; }
    if (!comment.trim()) { setError("Please share your experience"); return; }

    setSubmitting(true);
    setError("");

    const review = {
      id: `review-${Date.now()}`,
      contractorId,
      authorName: authorName.trim(),
      rating,
      comment: comment.trim(),
      date: new Date().toISOString().split("T")[0],
      jobType: jobType.trim() || undefined,
      source: "in-app",
    };

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      if (res.ok) {
        setSuccess(true);
        onSubmitted();
      } else {
        setError("Failed to submit. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <h3 className="font-bold text-lg text-green-800">Review Submitted!</h3>
        <p className="text-green-700 text-sm mt-1">Thank you for sharing your experience with {contractorName}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-bold text-lg mb-4">Write a Review</h3>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Your Rating</label>
        <div className="flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <span className={star <= (hoverRating || rating) ? "text-amber-400" : "text-gray-300"}>
                ★
              </span>
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-gray-500 ml-2 self-center">
              {rating === 5 ? "Excellent" : rating === 4 ? "Good" : rating === 3 ? "Average" : rating === 2 ? "Below Average" : "Poor"}
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your Name *</label>
          <input
            type="text"
            required
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="First name and last initial"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            style={{ fontSize: '16px' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Job Type</label>
          <input
            type="text"
            value={jobType}
            onChange={e => setJobType(e.target.value)}
            placeholder="e.g. Roof Replacement"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Your Experience *</label>
        <textarea
          required
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={4}
          placeholder={`What work did ${contractorName} do for you? How was the quality, communication, and pricing?`}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
          style={{ fontSize: '16px' }}
        />
        <p className="text-xs text-gray-400 mt-1">Be honest and specific — your review helps neighbors make informed decisions.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary text-sm"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
