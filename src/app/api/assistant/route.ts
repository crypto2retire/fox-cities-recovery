import { NextRequest, NextResponse } from 'next/server';
import { runAssistant } from '@/lib/assistant';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Public assistant endpoint. Rate-limited per IP to protect the LLM budget.
// Body: { messages: [{role: 'user'|'assistant', content: string}] }
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`assistant:${ip}`, 20, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing messages array' }, { status: 400 });
    }

    // Cap history length + content size to bound cost.
    const raw = messages as { role?: unknown; content?: unknown }[];
    const trimmed: { role: 'user' | 'assistant'; content: string }[] = raw
      .slice(-20)
      .map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: String(m.content ?? '').slice(0, 4000),
      }))
      .filter((m) => m.content);

    const turn = await runAssistant(trimmed);
    return NextResponse.json({ reply: turn.reply, citations: turn.citations, ticketOpened: turn.ticketOpened });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Assistant failed';
    const status = /LLM not configured/.test(msg) ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
