// Market scanner — finds real local businesses for a (city, state, category)
// using an LLM with native web search. The prompt is ported from the old
// donelocal.io engine (see PRODUCT_SPEC.md §11).
//
// Provider-agnostic: uses src/lib/llm.ts, which defaults to Google Gemini with
// Search grounding (replaces Anthropic's web_search tool at a fraction of the
// cost). No key is bundled — GEMINI_API_KEY (or OPENAI_API_KEY) must be set.
import { chat } from './llm';
import type { ScannedCompetitor } from './types';

// Battle-tested prompt from the old donelocal.io dashboard.
const SYSTEM_MARKET_SCAN = `You are a local market research analyst. Search the web for real data about competitors.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, no preamble. Just the JSON object.

Search for real businesses, real ratings, real websites. Only include data you actually find — do not make anything up.

Respond in this exact JSON structure:
{
  "competitors": [
    {"name":"Business Name","website":"url","rating":4.5,"review_count":100,"facebook_url":"url","content_themes":["what they post about"],"strengths":["what they do well"],"weaknesses":["gaps you notice"]}
  ]
}`;

export type Scanner = (
  city: string,
  state: string,
  category: string
) => Promise<ScannedCompetitor[]>;

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a raw LLM response into a list of competitors. */
function parseCompetitors(raw: string): ScannedCompetitor[] {
  // Strip any markdown code fences the model may have added despite instructions.
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // Find the first { ... } JSON object.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }

  const list = (parsed as { competitors?: unknown })?.competitors ?? parsed;
  if (!Array.isArray(list)) return [];

  return list
    .filter((c) => c && typeof (c as { name?: unknown }).name === 'string' && (c as { name: string }).name.trim())
    .map((c) => {
      const o = c as Record<string, unknown>;
      return {
        name: String(o.name).trim(),
        website: typeof o.website === 'string' && o.website ? o.website : null,
        rating: toNum(o.rating),
        review_count: typeof o.review_count === 'number' ? o.review_count : toNum(o.review_count),
        facebook_url: typeof o.facebook_url === 'string' && o.facebook_url ? o.facebook_url : null,
        instagram_url: typeof o.instagram_url === 'string' && o.instagram_url ? o.instagram_url : null,
        content_themes: Array.isArray(o.content_themes) ? o.content_themes.map(String) : [],
        strengths: Array.isArray(o.strengths) ? o.strengths.map(String) : [],
        weaknesses: Array.isArray(o.weaknesses) ? o.weaknesses.map(String) : [],
      };
    });
}

/**
 * Scan a market via the configured LLM (Gemini Search grounding by default).
 * Throws if no LLM key is configured.
 */
export async function scanMarketWithLlm(
  city: string,
  state: string,
  category: string
): Promise<ScannedCompetitor[]> {
  const userMsg =
    `Search for ${category} businesses in ${city}, ${state}. ` +
    `Find real competitors with their Google ratings, websites, and Facebook pages. ` +
    `Only include real businesses you actually find.`;

  const result = await chat({
    system: SYSTEM_MARKET_SCAN,
    messages: [{ role: 'user', content: userMsg }],
    useSearch: true,
    model: process.env.GEMINI_SCAN_MODEL || process.env.OPENAI_MODEL || undefined,
    temperature: 0.2,
  });

  if (!result.text) {
    throw new Error('LLM returned no text content for market scan.');
  }

  return parseCompetitors(result.text);
}

/** Returns the active scanner (the LLM implementation). */
export function getScanner(): Scanner {
  return scanMarketWithLlm;
}

export { parseCompetitors };
