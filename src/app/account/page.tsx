"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Account {
  id: string;
  role: "consumer" | "business";
  email: string;
  name: string;
  listingId: string | null;
}

interface Quote {
  id: string;
  service: string;
  description?: string;
  status: string;
  consumerHandle?: string;
  businessIds?: string[];
  releasedToMe?: boolean;
  consumer?: { name?: string; email?: string; phone?: string } | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting quotes",
  quoted: "Quote received",
  hired: "Hired",
  scheduled: "Scheduled",
  done: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-700",
  quoted: "bg-amber-100 text-amber-700",
  hired: "bg-green-100 text-green-700",
  scheduled: "bg-purple-100 text-purple-700",
  done: "bg-gray-100 text-gray-600",
};

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "consumer" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/auth/account")
      .then((r) => r.json())
      .then((d) => {
        setAccount(d.account ?? null);
        setLoading(false);
      });
  };

  const loadQuotes = () => {
    fetch("/api/quotes")
      .then(async (r) => {
        if (r.status === 401) return [];
        if (!r.ok) throw new Error("Failed to load quotes");
        return r.json();
      })
      .then((q) => setQuotes(Array.isArray(q) ? q : []))
      .catch(() => setQuotes([]));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (account) loadQuotes();
  }, [account]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const url = mode === "login" ? "/api/auth/account-login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong");
    } else {
      setForm({ email: "", password: "", name: "", role: "consumer" });
      load();
    }
    setBusy(false);
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>;

  // Not signed in — show login/register.
  if (!account) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-extrabold mb-2 text-center">My Account</h1>
        <p className="text-gray-500 text-center mb-8 text-sm">
          {mode === "login" ? "Log in to request quotes and track your projects." : "Create a free account."}
        </p>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex gap-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex gap-2 text-sm">
                  {(["consumer", "business"] as const).map((r) => (
                    <label key={r} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="role"
                        checked={form.role === r}
                        onChange={() => setForm({ ...form, role: r })}
                      />
                      <span className="capitalize">{r === "consumer" ? "I'm a customer" : "I'm a business"}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Password (8+ characters)"
              required
              minLength={8}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full text-sm">
              {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Signed in.
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold">My Account</h1>
          <p className="text-gray-500 text-sm">
            {account.name} · {account.email} ·{" "}
            <span className="capitalize">{account.role}</span>
          </p>
        </div>
        <button
          onClick={async () => { await fetch("/api/auth/account", { method: "POST" }); window.location.reload(); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Log out
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">
          {account.role === "business" ? "Incoming quote requests" : "Your projects"}
        </h2>
        {account.role === "consumer" && (
          <Link href="/contractors" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + Request a quote
          </Link>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
          <div className="text-4xl mb-2">📋</div>
          <p>{account.role === "business" ? "No quote requests yet." : "You haven't requested any quotes yet."}</p>
          {account.role === "consumer" && (
            <Link href="/contractors" className="btn-primary text-sm mt-4 inline-block">Browse contractors</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Link key={q.id} href={`/account/quotes/${q.id}`} className="block bg-white rounded-lg shadow-sm border p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{q.service}</p>
                  {q.consumerHandle && account.role === "business" && (
                    <p className="text-xs text-gray-500 mt-0.5">from {q.consumerHandle}</p>
                  )}
                  {q.releasedToMe && q.consumer && (
                    <p className="text-xs text-green-700 mt-0.5">
                      📞 {q.consumer.name} · {q.consumer.phone} · {q.consumer.email}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[q.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[q.status] || q.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
