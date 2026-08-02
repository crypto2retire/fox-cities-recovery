import type { Contractor } from './types';

/**
 * Bayesian credibility score for ranking contractors fairly.
 * 
 * Philosophy:
 * - A contractor with 1 five-star review shouldn't outrank one with 200 reviews at 4.7
 * - Longevity matters — 30 years in business beats 2 years
 * - Pure sort by rating punishes honest contractors who have more (and slightly lower) reviews
 *
 * Formula:
 *   bayesian_rating = (r * n + M * C) / (n + C)
 *   credibility = bayesian_rating × log₂(n + 1) × longevity_bonus
 *
 * Where:
 *   r = contractor's average rating
 *   n = number of reviews
 *   M = global mean rating (prior)
 *   C = confidence weight (reviews needed to overcome prior)
 */

const GLOBAL_MEAN = 4.5; // Average rating across all contractors
const CONFIDENCE = 10;    // Reviews needed before rating is taken at face value

export function computeCredibilityScore(contractor: Contractor): number {
  const { rating, reviewCount, yearEstablished } = contractor;

  // Bayesian weighted rating — prevents small-sample inflation
  const bayesianRating =
    (rating * reviewCount + GLOBAL_MEAN * CONFIDENCE) /
    (reviewCount + CONFIDENCE);

  // Review volume weight — log scale so 200 reviews isn't 200× more than 1 review,
  // but still gives meaningful advantage to well-reviewed contractors
  const volumeWeight = Math.log2(reviewCount + 1);

  // Longevity bonus — each year in business adds ~1% up to 30% max
  const yearsInBusiness = new Date().getFullYear() - yearEstablished;
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
  const bayesianRating =
    (rating * reviewCount + GLOBAL_MEAN * CONFIDENCE) /
    (reviewCount + CONFIDENCE);
  const yearsInBusiness = new Date().getFullYear() - yearEstablished;
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
