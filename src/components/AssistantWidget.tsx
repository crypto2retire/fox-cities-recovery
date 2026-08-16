"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: { url: string; title: string }[];
}

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi — I can help you find local contractors, understand what to do next after the tornado, or get you connected with a real person. What do you need help with?",
};

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setError(null);
    setBusy(true);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data?.error === "LLM not configured"
                ? "The assistant isn't fully set up yet, but I can still connect you with a person. What's the best way to reach you?"
                : data?.error || "Something went wrong. Please try again.",
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, citations: data.citations },
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open recovery assistant"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-blue-700 text-white font-semibold px-5 py-3.5 shadow-lg hover:bg-blue-800 transition-colors"
      >
        <span className="text-xl">{open ? "✕" : "💬"}</span>
        <span className="hidden sm:inline">{open ? "Close" : "Get Help"}</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden">
          <div className="bg-blue-700 text-white px-4 py-3">
            <h2 className="font-bold">Recovery Assistant</h2>
            <p className="text-xs text-blue-100">Free help finding local contractors & next steps</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-blue-600 text-white" : "bg-white border text-gray-800"
                  }`}
                >
                  {m.content}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                      <span className="text-gray-500 font-medium">Sources:</span>
                      <ul className="mt-1 space-y-0.5">
                        {m.citations.slice(0, 3).map((c, j) => (
                          <li key={j}>
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                              {c.title || c.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl px-4 py-2 text-sm text-gray-400">Thinking…</div>
              </div>
            )}
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
          </div>

          <div className="border-t p-3 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything…"
                className="flex-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="px-4 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-800 transition-colors"
              >
                Send
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => send("I need a roofer in Menasha")} className="text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors">
                I need a roofer
              </button>
              <button onClick={() => send("What should I do first after the storm?")} className="text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors">
                First steps
              </button>
              <button onClick={() => send("I want to talk to a real person")} className="text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors">
                Talk to a person
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
