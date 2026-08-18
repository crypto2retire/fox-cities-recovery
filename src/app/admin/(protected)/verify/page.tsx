"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib";

interface UnverifiedItem {
  id: string;
  name: string;
  category: string;
  city: string;
  website: string | null;
  yearEstablished: number | null;
}

interface ReviewItem extends UnverifiedItem {
  verificationNote: string | null;
  verificationCheckedAt: string | null;
}

interface Outcome {
  contractorId: string;
  name: string;
  status: string;
  yearEstablished: number | null;
  note: string;
}

type Status = "idle" | "running" | "done";

export default function AdminVerifyPage() {
  const [unverified, setUnverified] = useState<UnverifiedItem[]>([]);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [u, q] = await Promise.all([
        fetch("/api/verify").then((r) => r.json()),
        fetch("/api/verify/manual").then((r) => r.json()),
      ]);
      setUnverified(u.unverified ?? []);
      setQueue(q.queue ?? []);
    } catch {
      setError("Could not load verification queues.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runVerification = async () => {
    setStatus("running");
    setError(null);
    setOutcomes([]);
    try {
      const res = await fetch("/api/verify", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setOutcomes(data.outcomes ?? []);
      setStatus("done");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setStatus("idle");
    }
  };

  const manual = async (id: string, action: "verify" | "reject" | "unflag", note?: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/verify/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractorId: id, action, note }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">Contractor Verification</h1>
          <p className="text-gray-500 mt-1">
            AI checks that scan-found businesses are real, local, and predate the July 27, 2026 storm. Anything uncertain lands in your review queue.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-800">
          ← Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* AI verification */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg">Unverified listings (from scans)</h2>
            <p className="text-sm text-gray-500">{unverified.length} waiting · AI can verify with web search, then you review the ones it can&apos;t confirm</p>
          </div>
          <button
            onClick={runVerification}
            disabled={status === "running" || unverified.length === 0}
            className="btn-primary text-sm !py-2.5 disabled:opacity-50"
          >
            {status === "running" ? "Verifying… (web search, ~10-20s each)" : `Run AI Verification (${unverified.length})`}
          </button>
        </div>

        {unverified.length === 0 && status !== "running" ? (
          <p className="text-sm text-gray-400 py-4 text-center">No unverified listings right now 🎉</p>
        ) : (
          <div className="grid gap-2">
            {unverified.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-gray-500"> · {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category} · {c.city}</span>
                  {c.website && <span className="text-gray-400"> · {c.website.replace(/^https?:\/\//, "")}</span>}
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1">Unverified</span>
              </div>
            ))}
          </div>
        )}

        {outcomes.length > 0 && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold text-sm mb-3">Verification results</h3>
            <div className="grid gap-2">
              {outcomes.map((o) => (
                <div key={o.contractorId} className="text-sm">
                  <span className="font-semibold">{o.name}</span>{" "}
                  <span
                    className={
                      o.status === "verified"
                        ? "text-green-600 font-semibold"
                        : o.status === "needs_review"
                          ? "text-amber-600 font-semibold"
                          : "text-red-600 font-semibold"
                    }
                  >
                    {o.status === "verified" ? "✓ Verified" : o.status === "needs_review" ? "⚠ Needs your review" : "✗ Failed"}
                  </span>
                  {o.yearEstablished ? ` · Est. ${o.yearEstablished}` : ""}
                  <p className="text-xs text-gray-500 mt-0.5">{o.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review queue */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold text-lg mb-1">Needs your review</h2>
        <p className="text-sm text-gray-500 mb-4">
          The AI could not confirm these. Check their website/phone and decide: Verify (local, pre-storm) or Reject (doesn&apos;t qualify — hidden from the directory).
        </p>

        {queue.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Review queue is empty — nothing flagged 🎉</p>
        ) : (
          <div className="grid gap-4">
            {queue.map((c) => (
              <div key={c.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {c.name}
                      <span className="text-gray-500 font-normal"> · {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category} · {c.city}</span>
                    </div>
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {c.verificationNote && (
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{c.verificationNote}</p>
                    )}
                    {c.verificationCheckedAt && (
                      <p className="text-xs text-gray-400 mt-1">Checked {new Date(c.verificationCheckedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => manual(c.id, "verify")}
                      disabled={busyId === c.id}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg text-sm disabled:opacity-50"
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => {
                        const note = window.prompt("Why reject? (optional)");
                        manual(c.id, "reject", note ?? undefined);
                      }}
                      disabled={busyId === c.id}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-lg text-sm disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                    <button
                      onClick={() => manual(c.id, "unflag")}
                      disabled={busyId === c.id}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg text-sm disabled:opacity-50"
                    >
                      ↺ Unflag
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
