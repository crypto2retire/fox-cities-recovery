"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Quote {
  id: string;
  service: string;
  description?: string;
  status: string;
  businessIds?: string[];
  consumerHandle?: string;
  releasedTo?: string[];
}

interface Message {
  id: string;
  senderRole: "consumer" | "business";
  senderContractorId: string | null;
  body: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting quotes",
  quoted: "Quote received",
  hired: "Hired",
  scheduled: "Scheduled",
  done: "Completed",
};

const NEXT_STATUS: Record<string, string | null> = {
  requested: "quoted",
  quoted: "hired",
  hired: "scheduled",
  scheduled: "done",
  done: null,
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch(`/api/quotes/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
        return r.json();
      })
      .then((d) => {
        setQuote(d.quote);
        setMessages(d.messages ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    await fetch(`/api/quotes/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setInput("");
    setBusy(false);
    load();
  };

  const advance = async () => {
    if (!quote) return;
    const next = NEXT_STATUS[quote.status];
    if (!next) return;
    await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>;
  if (error) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-red-500">{error}</div>;
  if (!quote) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/account" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">← My Account</Link>

      <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{quote.service}</h1>
            {quote.description && <p className="text-sm text-gray-600 mt-1">{quote.description}</p>}
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            {STATUS_LABELS[quote.status] || quote.status}
          </span>
        </div>
        {NEXT_STATUS[quote.status] && (
          <button onClick={advance} className="btn-primary text-sm mt-3">
            Mark as {STATUS_LABELS[NEXT_STATUS[quote.status]!]?.toLowerCase()} →
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div ref={scrollRef} className="h-80 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm pt-16">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderRole === "business" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  m.senderRole === "business" ? "bg-blue-600 text-white" : "bg-white border text-gray-800"
                }`}>
                  {m.body}
                  <div className={`text-[10px] mt-1 ${m.senderRole === "business" ? "text-blue-200" : "text-gray-400"}`}>
                    {m.senderRole === "business" ? "Business" : "You"} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message… (don't share personal info — it's kept private)"
            className="flex-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button onClick={send} disabled={busy || !input.trim()} className="px-4 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
