// Market scanner — finds real local businesses for a (city, state, category)
// using an LLM with web search. The prompt is ported from the old donelocal.io
// engine (see PRODUCT_SPEC.md §11). Requires ANTHROPIC_API_KEY to run.
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

/** Normalize a raw Claude response into a list of competitors. */
function parseCompetitors(raw: string): ScannedCompetitor[] {
  // Strip any markdown code fences Claude may have added despite instructions.
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // Find the first { ... } JSON object.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return [];

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  const list = parsed?.competitors ?? parsed;
  if (!Array.isArray(list)) return [];

  return list
    .filter((c) => c && typeof c.name === 'string' && c.name.trim())
    .map((c) => ({
      name: String(c.name).trim(),
      website: typeof c.website === 'string' && c.website ? c.website : null,
      rating: toNum(c.rating),
      review_count: typeof c.review_count === 'number' ? c.review_count : toNum(c.review_count),
      facebook_url: typeof c.facebook_url === 'string' && c.facebook_url ? c.facebook_url : null,
      instagram_url: typeof c.instagram_url === 'string' && c.instagram_url ? c.instagram_url : null,
      content_themes: Array.isArray(c.content_themes) ? c.content_themes.map(String) : [],
      strengths: Array.isArray(c.strengths) ? c.strengths.map(String) : [],
      weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses.map(String) : [],
    }));
}

/**
 * Scan a market via Anthropic with server-side web search.
 * Throws if ANTHROPIC_API_KEY is not configured.
 */
export async function scanMarketWithAnthropic(
  city: string,
  state: string,
  category: string
): Promise<ScannedCompetitor[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it in Railway env vars to enable market scanning.'
    );
  }

  const userMsg =
    `Search for ${category} businesses in ${city}, ${state}. ` +
    `Find real competitors with their Google ratings, websites, and Facebook pages. ` +
    `Only include real businesses you actually find.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_MARKET_SCAN,
      messages: [{ role: 'user', content: userMsg }],
      // Server-side web search. NOTE: the tool type string below matches the
      // old donelocal.io build; if Anthropic has since renamed it, update here.
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic scan failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content
    ?.filter((b: { type: string }) => b.type === 'text')
    ?.map((b: { text: string }) => b.text)
    ?.join('\n');

  if (!text) {
    throw new Error('Anthropic returned no text content for market scan.');
  }

  return parseCompetitors(text);
}

/** Returns the active scanner (the Anthropic implementation). */
export function getScanner(): Scanner {
  return scanMarketWithAnthropic;
}
