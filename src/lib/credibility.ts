import type { Contractor } from './types';

/**
 * Bayesian credibility score for ranking contractors fairly.
 *
 * Philosophy:
 * - A contractor with 1 five-star review shouldn't outrank one with 200 reviews at 4.7
 * - Longevity matters — 30 years in business beats 2 years
 * - Pure sort by rating punishes honest contractors who have more (and slightly lower) reviews
 *
 * When rating/reviewCount are null (no verified rating yet), the contractor is ranked
 * by longevity (years in business) only — real, verified data. This is the honest
 * fallback until Google Places ratings are imported.
 */

const GLOBAL_MEAN = 4.5; // Average rating across all contractors
const CONFIDENCE = 10;    // Reviews needed before rating is taken at face value

export function computeCredibilityScore(contractor: Contractor): number {
  const { rating, reviewCount, yearEstablished } = contractor;

  const yearsInBusiness = yearEstablished != null
    ? new Date().getFullYear() - yearEstablished
    : 0;

  // No verified rating yet — rank by longevity only.
  if (rating == null || reviewCount == null) {
    return Math.max(yearsInBusiness, 0);
  }

  // Bayesian weighted rating — prevents small-sample inflation
  const bayesianRating =
    (rating * reviewCount + GLOBAL_MEAN * CONFIDENCE) /
    (reviewCount + CONFIDENCE);

  // Review volume weight — log scale so 200 reviews isn't 200× more than 1 review
  const volumeWeight = Math.log2(reviewCount + 1);

  // Longevity bonus — each year in business adds ~1% up to 30% max
  const longevityBonus = 1 + Math.min(yearsInBusiness, 30) / 100;

  return bayesianRating * volumeWeight * longevityBonus;
}

export function sortByCredibility(contractors: Contractor[]): Contractor[] {
  return [...contractors].sort((a, b) => {
    const scoreA = computeCredibilityScore(a);
    const scoreB = computeCredibilityScore(b);
    return scoreB - scoreA; // descending
  });
}

/**
 * Returns a human-readable explanation of where a contractor's score comes from.
 */
export function explainScore(contractor: Contractor): string {
  const { rating, reviewCount, yearEstablished } = contractor;
  const yearsInBusiness = yearEstablished != null
    ? new Date().getFullYear() - yearEstablished
    : null;

  const yearsLabel = yearsInBusiness != null
    ? `${yearsInBusiness} years in business`
    : 'year established not verified';

  if (rating == null || reviewCount == null) {
    return `${yearsLabel} · rating not yet verified`;
  }

  const bayesianRating =
    (rating * reviewCount + GLOBAL_MEAN * CONFIDENCE) /
    (reviewCount + CONFIDENCE);
  const score = computeCredibilityScore(contractor);

  const parts: string[] = [];
  if (reviewCount < CONFIDENCE) {
    parts.push(`${reviewCount} review${reviewCount !== 1 ? 's' : ''} — rating weighted toward ${GLOBAL_MEAN}★ average until more reviews come in`);
  } else {
    parts.push(`${reviewCount} reviews at ${rating}★ — well-established rating`);
  }
  parts.push(`${yearsInBusiness} years in business`);
  parts.push(`Credibility score: ${score.toFixed(1)}`);

  return parts.join(' · ');
}
