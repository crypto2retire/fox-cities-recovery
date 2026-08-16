// Public AI assistant for recovery — helps non-technical residents complete
// tasks (find contractors, look up resources, open a help ticket) instead of
// just chatting. Provider-agnostic via src/lib/llm.ts.
//
// Design mirrors the BMM-POS assistant, plus the one thing the Facebook story
// demands: a human escalation path. If the model can't help — or the user asks
// for a person — it opens a real help_ticket that a human sees and responds to,
// and the ticket can never be silently dropped.
import { chat } from './llm';
import {
  getContractors,
  getEventResources,
  getEventBySlug,
  addHelpTicket,
} from './data-store';
import { CATEGORY_LABELS, type Contractor } from './types';

const DEFAULT_EVENT_SLUG = 'menasha-ef3-2026-07-27';

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

interface Tool {
  name: string;
  description: string;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

function publicContractor(c: Contractor) {
  return {
    name: c.name,
    category: c.category,
    categoryLabel: CATEGORY_LABELS[c.category] || c.category,
    phone: c.phone || null,
    website: c.website || null,
    city: c.city,
    yearEstablished: c.yearEstablished,
    rating: c.rating,
    reviewCount: c.reviewCount,
    ownershipType: c.ownershipType,
    verified: c.verified,
  };
}

const TOOLS: Tool[] = [
  {
    name: 'find_contractors',
    description:
      'Find verified local contractors in the recovery directory. Returns businesses that existed here BEFORE the storm (no storm chasers).',
    run: async (args) => {
      const category = typeof args.category === 'string' ? args.category : null;
      const city = typeof args.city === 'string' ? args.city.toLowerCase() : null;
      const q = typeof args.query === 'string' ? args.query.toLowerCase() : null;

      let list = await getContractors();
      if (category && category !== 'any') list = list.filter((c) => c.category === category);
      if (city) list = list.filter((c) => c.city.toLowerCase().includes(city));
      if (q) {
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.services.some((s) => s.toLowerCase().includes(q))
        );
      }
      return {
        count: list.length,
        contractors: list.slice(0, 12).map(publicContractor),
        note: 'These are local businesses verified to have existed before the storm. Always get multiple quotes.',
      };
    },
  },
  {
    name: 'get_resources',
    description: 'Get verified disaster-relief resources (FEMA, insurance, shelters, aid).',
    run: async (args) => {
      const category = typeof args.category === 'string' ? args.category : null;
      const event = await getEventBySlug(DEFAULT_EVENT_SLUG);
      if (!event) return { resources: [], note: 'No recovery event found.' };
      let resources = await getEventResources(event.id);
      if (category && category !== 'any') {
        resources = resources.filter(
          (r) => r.category.toLowerCase() === category.toLowerCase()
        );
      }
      return {
        count: resources.length,
        resources: resources.map((r) => ({
          category: r.category,
          title: r.title,
          url: r.url,
          description: r.description,
        })),
      };
    },
  },
  {
    name: 'create_help_ticket',
    description:
      'Open a help ticket so a real human follows up. Use this when you cannot answer the question, when the user asks for a person, or when the situation is urgent or sensitive.',
    run: async (args) => {
      const summary =
        typeof args.summary === 'string' && args.summary.trim()
          ? args.summary.trim()
          : 'Resident requested human assistance.';
      const ticket = await addHelpTicket({
        name: typeof args.name === 'string' ? args.name : null,
        contact: typeof args.contact === 'string' ? args.contact : null,
        topic: typeof args.topic === 'string' ? args.topic : null,
        summary,
        conversation: typeof args.conversation === 'string' ? args.conversation : null,
      });
      return {
        opened: true,
        ticketId: ticket.id,
        message:
          'A real person has been notified and will follow up. Your ticket is open and will not be closed without a response.',
      };
    },
  },
];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the recovery assistant for a free community resource helping residents affected by the July 27, 2026 EF-3 tornado in the Fox Cities (Menasha, Appleton, Fox Crossing, Wisconsin).

Your users are everyday people, many of whom are not comfortable with computers or insurance paperwork. Be warm, plain-spoken, and concrete. Use short sentences and simple words. Give step-by-step guidance.

You can take actions using tools. To use a tool, reply with EXACTLY this JSON and nothing else:
{"tool":"tool_name","args":{...}}

You have these tools:
- find_contractors: args {category?, city?, query?} — verified local contractors who existed before the storm.
- get_resources: args {category?} — verified relief resources (FEMA, insurance, shelters, aid).
- create_help_ticket: args {name?, contact?, topic?, summary, conversation?} — open a ticket for a human to follow up.

HARD RULES:
1. NEVER invent a contractor, business name, phone number, rating, or website. Only name a business that came back from find_contractors. If none match, say so and offer to open a help ticket.
2. NEVER tell someone to skip contacting their insurance company or FEMA. Always encourage them to file a claim and document damage.
3. NEVER give medical, legal, or structural-safety advice as fact. For anything urgent or dangerous (gas smell, structural collapse, electrical hazards) say to evacuate and call 911, then open a help ticket.
4. For questions you cannot answer confidently, or any request to "talk to a human", open a create_help_ticket and confirm to the user that a real person will follow up.
5. Keep answers short and actionable. Prefer a list of next steps over a wall of text.

If you are replying to the user directly (not using a tool), reply with plain text — no JSON.`;

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export interface AssistantTurn {
  reply: string;
  citations?: { url: string; title: string }[];
  ticketOpened?: boolean;
}

function extractToolCall(text: string): { tool: string; args: Record<string, unknown> } | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (parsed && typeof parsed.tool === 'string') {
      return { tool: parsed.tool, args: parsed.args && typeof parsed.args === 'object' ? parsed.args : {} };
    }
  } catch {
    return null;
  }
  return null;
}

export async function runAssistant(
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<AssistantTurn> {
  const messages = history.map((m) => ({ role: m.role, content: m.content }));

  // Bounded tool loop (max 3 tool rounds) to keep cost predictable.
  let lastCitations: { url: string; title: string }[] = [];
  let ticketOpened = false;

  for (let round = 0; round < 3; round++) {
    const result = await chat({
      system: SYSTEM_PROMPT,
      messages,
      useSearch: true,
      temperature: 0.3,
    });

    if (result.citations?.length) lastCitations = result.citations;
    const text = result.text.trim();

    const toolCall = extractToolCall(text);
    if (!toolCall) {
      return { reply: text || 'I had trouble answering that. A real person can help — I can open a ticket if you like.', citations: lastCitations };
    }

    const tool = TOOLS.find((t) => t.name === toolCall.tool);
    let toolResult: unknown;
    if (!tool) {
      toolResult = { error: `Unknown tool: ${toolCall.tool}` };
    } else {
      try {
        toolResult = await tool.run(toolCall.args);
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : 'Tool failed' };
      }
      if (tool.name === 'create_help_ticket' && (toolResult as { opened?: boolean })?.opened) {
        ticketOpened = true;
      }
    }

    // Feed the tool result back so the model can turn it into plain-English help.
    messages.push({ role: 'user', content: `[TOOL RESULT for ${toolCall.tool}]\n${JSON.stringify(toolResult)}` });
  }

  return {
    reply:
      'I gathered some information but need to confirm the details with a person. I can open a help ticket so someone follows up with you — would you like that?',
    citations: lastCitations,
    ticketOpened,
  };
}
