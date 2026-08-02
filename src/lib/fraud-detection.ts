import type { Review } from './types';

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com', 'trashmail.com',
  'dispostable.com', 'maildrop.cc', 'temp-mail.org', 'fakeinbox.com',
  'burnermail.io', 'emailondeck.com', 'minuteinbox.com', 'moakt.com',
]);

// Suspicious name patterns that suggest fake accounts
const SUSPICIOUS_NAME_PATTERNS = [
  /^[a-z0-9]{3,15}$/i,          // just a username like "xyz123"
  /^\d+$/,                        // just numbers
  /^[A-Z]\.[A-Z]\.$/,            // initials only like "J.D."
  /test|fake|asdf|qwerty/i,      // obvious fake patterns
];

export interface FraudCheckResult {
  flagged: boolean;
  reasons: string[];
}

/**
 * Run fraud detection heuristics on a new review.
 * Returns flag status + reasons — doesn't auto-delete, just flags for admin review.
 */
export function checkForFraud(
  review: Pick<Review, 'rating' | 'comment' | 'authorName' | 'contactEmail'>,
  existingReviewsForContractor: Review[],
  allContractors: { id: string; name: string }[],
): FraudCheckResult {
  const reasons: string[] = [];

  // 1. Check for disposable email
  if (review.contactEmail) {
    const domain = review.contactEmail.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      reasons.push(`Disposable email domain: ${domain}`);
    }
  }

  // 2. Check for suspicious name patterns
  for (const pattern of SUSPICIOUS_NAME_PATTERNS) {
    if (pattern.test(review.authorName)) {
      reasons.push(`Suspicious name pattern: "${review.authorName}"`);
      break;
    }
  }

  // 3. Extreme rating with no detail — potential drive-by
  if ((review.rating === 1 || review.rating === 5) && review.comment.length < 20) {
    reasons.push(`${review.rating}-star review with very short comment (${review.comment.length} chars) — potential drive-by`);
  }

  // 4. Check for review bombing — multiple 1-star reviews on same contractor recently
  const recentBad = existingReviewsForContractor.filter(
    r => r.rating <= 2 && r.source === 'in-app'
  );
  if (recentBad.length >= 2 && review.rating <= 2) {
    reasons.push(`Multiple low ratings on this contractor — possible review bombing (${recentBad.length + 1} low ratings)`);
  }

  // 5. Check if same email left reviews on multiple contractors in short time
  // (would need cross-contractor check, done at API level)

  // 6. Comment text analysis — does it read like it's about a different company?
  const commentLower = review.comment.toLowerCase();
  if (commentLower.includes('storm chaser') || commentLower.includes('scam') || commentLower.includes('fraud')) {
    // Not necessarily fake, but flag for review
    reasons.push('Contains fraud/scam accusations — flag for verification');
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}

/**
 * Strip private fields before returning reviews to public.
 */
export function sanitizeReview(review: Review): Review {
  const { contactEmail, contactPhone, ...safe } = review;
  return safe as Review;
}

export function sanitizeReviews(reviews: Review[]): Review[] {
  return reviews.map(sanitizeReview);
}
