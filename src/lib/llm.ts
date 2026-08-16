// Provider-agnostic LLM client.
//
// Default provider is Google Gemini (chosen for cost + native Google Search /
// Maps grounding + verified no-training on the paid tier). Switching providers
// is a config change, not a code change: set LLM_PROVIDER and the matching key.
//
//   LLM_PROVIDER = gemini (default) | openai-compatible
//   Gemini:            GEMINI_API_KEY, GEMINI_MODEL, GEMINI_SCAN_MODEL
//   OpenAI-compatible: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
//
// Exposes two capabilities:
//   - chat()          — plain / JSON / tool-calling / grounded chat
//   - scanCompetitors() — the market-scan gather step (uses Search grounding)

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema (OpenAPI subset)
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResult {
  text: string;
  // Grounding citations (Gemini with Search), when available.
  citations?: { url: string; title: string }[];
  // Non-zero means the model wanted to call a tool (handled internally by chat()).
  toolCalls: ToolCall[];
}

export interface ChatOptions {
  system?: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  /** Execute a tool the model requested. Return JSON-serializable data. */
  runTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Force JSON output (Gemini responseMimeType / OpenAI response_format). */
  json?: boolean;
  /** Enable Google Search grounding (Gemini only; no-op on other providers). */
  useSearch?: boolean;
  /** Model override. Defaults to the assistant/scan model. */
  model?: string;
  temperature?: number;
  maxToolRounds?: number;
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_SCAN_MODEL = process.env.GEMINI_SCAN_MODEL || 'gemini-2.5-flash-lite';

function provider(): 'gemini' | 'openai-compatible' {
  const p = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  return p === 'openai-compatible' || p === 'openai' ? 'openai-compatible' : 'gemini';
}

function missingKeyError(providerName: string, keyEnv: string): Error {
  return new Error(
    `LLM not configured: ${providerName} is the active provider but ${keyEnv} is not set. ` +
      `Add it to Railway env vars (or set LLM_PROVIDER to switch providers).`
  );
}

// ---------------------------------------------------------------------------
// Gemini (default)
// ---------------------------------------------------------------------------

interface GeminiTool {
  functionDeclarations?: ToolDef[];
  google_search?: Record<string, never>;
}

async function geminiChat(opts: ChatOptions): Promise<ChatResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw missingKeyError('Gemini', 'GEMINI_API_KEY');

  const model = opts.model || DEFAULT_GEMINI_MODEL;
  const tools: GeminiTool[] = [];
  if (opts.tools?.length) tools.push({ functionDeclarations: opts.tools });
  if (opts.useSearch) tools.push({ google_search: {} });

  const systemInstruction = opts.system
    ? { parts: [{ text: opts.system }] }
    : undefined;

  const contents = opts.messages.map((m) => ({
    role: m.role === 'system' ? 'user' : m.role,
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (tools.length) body.tools = tools;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const parts: Array<{
    text?: string;
    functionCall?: { name: string; args: unknown };
  }> = candidate?.content?.parts ?? [];

  const text = parts
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('\n');

  const toolCalls: ToolCall[] = parts
    .filter((p) => p.functionCall)
    .map((p, i) => ({
      id: `gemini-${i}`,
      name: p.functionCall!.name,
      arguments: (p.functionCall!.args ?? {}) as Record<string, unknown>,
    }));

  const citations = (data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
    .filter((c: { web?: { uri: string; title: string } }) => c?.web?.uri)
    .map((c: { web?: { uri: string; title: string } }) => ({
      url: c.web!.uri,
      title: c.web!.title || c.web!.uri,
    }));

  return { text, citations, toolCalls };
}

// ---------------------------------------------------------------------------
// OpenAI-compatible (OpenRouter / Groq / DeepSeek / Together / etc.)
// ---------------------------------------------------------------------------

async function openaiCompatibleChat(opts: ChatOptions): Promise<ChatResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw missingKeyError('OpenAI-compatible', 'OPENAI_API_KEY');
  const base = (process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
  const model = opts.model || process.env.OPENAI_MODEL || 'meta-llama/llama-3.1-8b-instruct';

  const messages = opts.messages.map((m) => ({ role: m.role, content: m.content }));
  if (opts.system) messages.unshift({ role: 'system', content: opts.system });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.3,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  };
  if (opts.tools?.length) {
    body.tools = opts.tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }
  // NOTE: this provider has no built-in web search; useSearch is a no-op.

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message ?? {};
  const text = typeof message.content === 'string' ? message.content : '';
  const toolCalls: ToolCall[] = (message.tool_calls ?? []).map(
    (t: { id: string; function: { name: string; arguments: string } }) => ({
      id: t.id,
      name: t.function.name,
      arguments: safeJsonParse(t.function.arguments) ?? {},
    })
  );

  return { text, toolCalls };
}

function safeJsonParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a chat request. Handles a tool-calling loop: if the model requests a
 * tool and `runTool` is provided, we execute it, feed the result back, and
 * re-prompt until the model returns a final text answer (bounded by maxToolRounds).
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const impl = provider() === 'gemini' ? geminiChat : openaiCompatibleChat;
  const maxRounds = opts.maxToolRounds ?? 4;

  let result = await impl(opts);

  for (let round = 0; round < maxRounds && result.toolCalls.length > 0; round++) {
    if (!opts.runTool) break; // no executor provided — return tool calls as-is

    const messages: ChatMessage[] = [...opts.messages];
    // Append the model's tool call + results as a follow-up user turn.
    for (const call of result.toolCalls) {
      let toolResult: unknown;
      try {
        toolResult = await opts.runTool(call.name, call.arguments);
      } catch (err) {
        toolResult = { error: err instanceof Error ? err.message : 'Tool failed' };
      }
      messages.push({
        role: 'user',
        content: JSON.stringify({
          tool_call: call.name,
          arguments: call.arguments,
          result: toolResult,
        }),
      });
    }

    result = await impl({ ...opts, messages });
  }

  return result;
}

/** Convenience: chat and parse a JSON object from the response text. */
export async function chatJson<T = unknown>(opts: ChatOptions): Promise<T> {
  const r = await chat(opts);
  const cleaned = r.text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('LLM did not return a JSON object.');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export { provider };
export type { GeminiTool };
