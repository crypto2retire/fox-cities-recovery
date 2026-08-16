// Ad pricing engine — geo-targeting + market-size rates + AI yield optimization.
//
// Three concerns, one module:
//   1. tierForPopulation() — map a market's population to a size tier.
//   2. baseRateCents()     — the list price for a (placement, tier). Market size
//      sets the price; bigger metro = higher rate.
//   3. analyzePricing()    — AI yield optimizer. Looks at fill/waitlist signals and
//      recommends raising (demand > supply) or lowering (empty slots) each rate to
//      fill every slot while capturing what higher-paying sponsors will bear.
//      Falls back to deterministic rules when no LLM key is configured.
//   4. adMatchesGeo()      — decide whether an ad targets the current page's city/zip/state.
import { chat } from './llm';
import type {
  Ad,
  AdMarket,
  AdRate,
  AdPlacement,
  MarketTier,
  PricingAnalysis,
  PricingRecommendation,
} from './types';

// ---------------------------------------------------------------------------
// Market size tiers + base rates
// ---------------------------------------------------------------------------

export function tierForPopulation(population: number): MarketTier {
  if (population >= 200_000) return 'metro';
  if (population >= 75_000) return 'large';
  if (population >= 25_000) return 'medium';
  return 'small';
}

// List price (USD cents/month) per placement × tier.
// These are the *base* prices the AI moves up/down from — not hardcoded final prices.
const BASE_RATE_CENTS: Record<AdPlacement, Record<MarketTier, number>> = {
  event:    { small: 15_000, medium: 25_000, large: 35_000, metro: 50_000 },
  sidebar:  { small: 8_000,  medium: 13_000, large: 18_000, metro: 25_000 },
  directory:{ small: 6_000,  medium: 10_000, large: 15_000, metro: 20_000 },
};

export function baseRateCents(placement: AdPlacement, tier: MarketTier): number {
  return BASE_RATE_CENTS[placement][tier];
}

// Bounds so the AI can't price into nonsense: 40% below base → 2× base.
export function rateBounds(baseCents: number): { min: number; max: number } {
  return {
    min: Math.round(baseCents * 0.4),
    max: Math.round(baseCents * 2),
  };
}

/** Build the default rate rows for a new market (before any AI adjustment). */
export function buildDefaultRates(market: AdMarket): AdRate[] {
  const placements: AdPlacement[] = ['event', 'sidebar', 'directory'];
  return placements.map((placement) => {
    const base = baseRateCents(placement, market.tier);
    const { min, max } = rateBounds(base);
    const capacity = placement === 'event' ? 1 : placement === 'sidebar' ? 4 : 2;
    return {
      id: `${market.id}:${placement}`,
      marketId: market.id,
      placement,
      baseRateCents: base,
      currentRateCents: base,
      minRateCents: min,
      maxRateCents: max,
      capacity,
      filled: 0,
      waitlist: 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Geo-targeting
// ---------------------------------------------------------------------------

/** Normalize a possibly-string pg array (text[] sometimes comes back as a JSON string). */
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function adMatchesGeo(
  ad: Ad,
  geo: { city?: string | null; state?: string | null; zip?: string | null }
): boolean {
  const cities = asStringArray(ad.cities);
  const zips = asStringArray(ad.zipCodes);
  const state = ad.state ?? null;

  // No geo constraint = general ad, shown everywhere.
  const hasGeo = cities.length > 0 || zips.length > 0 || !!state;
  if (!hasGeo) return true;

  if (geo.city && cities.some((c) => c.toLowerCase() === geo.city!.toLowerCase())) return true;
  if (geo.zip && zips.includes(geo.zip)) return true;
  if (geo.state && state && state.toUpperCase() === geo.state.toUpperCase()) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Deterministic yield rules (fallback + safety floor for the AI)
// ---------------------------------------------------------------------------

const MAX_STEP_PCT = 0.2; // never move more than ±20% in one adjustment

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function deterministicRecommendation(rate: AdRate): PricingRecommendation {
  const cur = rate.currentRateCents;
  let action: PricingRecommendation['action'] = 'hold';
  let newRate = cur;
  let reason = '';

  const utilization = rate.capacity > 0 ? rate.filled / rate.capacity : 0;

  if (utilization >= 1 && rate.waitlist > 0) {
    // Fully sold AND people waiting → raise to capture willingness to pay.
    action = 'raise';
    newRate = clamp(Math.round(cur * (1 + MAX_STEP_PCT)), rate.minRateCents, rate.maxRateCents);
    reason = `Sold out (${rate.filled}/${rate.capacity}) with ${rate.waitlist} on waitlist — raising price.`;
  } else if (utilization >= 1) {
    action = 'hold';
    reason = `Full but no waitlist — hold price.`;
  } else if (utilization === 0 && rate.waitlist === 0) {
    // Empty and nobody waiting → lower to fill the slot.
    action = 'lower';
    newRate = clamp(Math.round(cur * (1 - MAX_STEP_PCT)), rate.minRateCents, rate.maxRateCents);
    reason = `Empty (0/${rate.capacity}) with no waitlist — lowering price to fill the slot.`;
  } else if (utilization < 1) {
    // Partially filled with no waitlist → nudge down.
    action = 'lower';
    newRate = clamp(Math.round(cur * (1 - MAX_STEP_PCT / 2)), rate.minRateCents, rate.maxRateCents);
    reason = `${rate.filled}/${rate.capacity} filled, no waitlist — slight discount to fill remaining slots.`;
  }

  if (action === 'hold') {
    reason = reason || 'Demand and supply balanced — hold price.';
  }

  const confidence: PricingRecommendation['confidence'] =
    rate.waitlist > 0 || utilization === 0 ? 'high' : utilization >= 1 ? 'medium' : 'low';

  return {
    marketId: rate.marketId,
    placement: rate.placement,
    action,
    currentRateCents: cur,
    newRateCents: newRate,
    reason,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// AI yield optimizer
// ---------------------------------------------------------------------------

const PRICING_SYSTEM = `You are a pricing analyst for a local advertising marketplace. Your job is to set per-market ad prices to (a) fill every available ad slot and (b) capture the most revenue sponsors are willing to pay.

Rules:
- Never move a price more than 20% in one step.
- Never go below the floor (minRateCents) or above the ceiling (maxRateCents).
- If a placement is sold out AND has a waitlist, RAISE the price (demand exceeds supply).
- If a placement is empty and has no waitlist, LOWER the price to fill the slot.
- If full with no waitlist, HOLD.
- Bigger markets (higher population/tier) command higher prices.

Respond ONLY with valid JSON, no markdown, no preamble:
{"recommendations":[{"marketId":"...","placement":"event","action":"raise","newRateCents":60000,"reason":"sold out with waitlist"}]}

action must be one of: raise, lower, hold.`;

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export async function analyzePricing(
  markets: AdMarket[],
  rates: AdRate[]
): Promise<PricingAnalysis> {
  const now = new Date().toISOString();

  const hasLlm = !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY;
  if (!hasLlm) {
    return {
      source: 'rules',
      analyzedAt: now,
      recommendations: rates.map(deterministicRecommendation),
    };
  }

  // Build a compact snapshot for the model.
  const snapshot = markets.map((m) => ({
    marketId: m.id,
    name: m.name,
    population: m.population,
    tier: m.tier,
    placements: rates
      .filter((r) => r.marketId === m.id)
      .map((r) => ({
        placement: r.placement,
        currentRate: dollars(r.currentRateCents),
        baseRate: dollars(r.baseRateCents),
        min: dollars(r.minRateCents),
        max: dollars(r.maxRateCents),
        capacity: r.capacity,
        filled: r.filled,
        waitlist: r.waitlist,
      })),
  }));

  try {
    const result = await chat({
      system: PRICING_SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `Here are the markets and their current ad inventory. Recommend a price action for each placement.\n\n` +
            JSON.stringify(snapshot, null, 2),
        },
      ],
      json: true,
      temperature: 0.2,
    });

    const parsed = parseRecommendations(result.text, rates);
    return { source: 'ai', analyzedAt: now, recommendations: parsed };
  } catch (err) {
    // LLM failed (key error, network, bad JSON) — fall back to rules.
    return {
      source: 'rules',
      analyzedAt: now,
      recommendations: rates.map(deterministicRecommendation),
    };
  }
}

function parseRecommendations(
  raw: string,
  rates: AdRate[]
): PricingRecommendation[] {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return rates.map(deterministicRecommendation);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return rates.map(deterministicRecommendation);
  }

  const list = (parsed as { recommendations?: unknown })?.recommendations;
  if (!Array.isArray(list)) return rates.map(deterministicRecommendation);

  const byKey = new Map(rates.map((r) => [`${r.marketId}:${r.placement}`, r]));

  const out: PricingRecommendation[] = [];
  for (const item of list) {
    const o = item as Record<string, unknown>;
    const marketId = String(o.marketId ?? '');
    const placement = String(o.placement ?? '') as AdPlacement;
    const rate = byKey.get(`${marketId}:${placement}`);
    if (!rate) continue;

    const action = (['raise', 'lower', 'hold'] as const).includes(o.action as never)
      ? (o.action as PricingRecommendation['action'])
      : 'hold';

    const proposed = Number(o.newRateCents);
    const newRateCents =
      Number.isFinite(proposed) && proposed > 0
        ? clamp(Math.round(proposed), rate.minRateCents, rate.maxRateCents)
        : rate.currentRateCents;

    out.push({
      marketId,
      placement,
      action,
      currentRateCents: rate.currentRateCents,
      newRateCents,
      reason: typeof o.reason === 'string' ? o.reason : 'AI recommendation',
      confidence: 'medium',
    });
  }

  // Include any rate the AI skipped as a hold.
  const covered = new Set(out.map((r) => `${r.marketId}:${r.placement}`));
  for (const rate of rates) {
    if (!covered.has(`${rate.marketId}:${rate.placement}`)) {
      out.push(deterministicRecommendation(rate));
    }
  }

  return out;
}
