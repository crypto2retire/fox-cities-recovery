"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { HelpTicket } from "@/lib/types";

const STATUS_STYLES: Record<HelpTicket["status"], string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<HelpTicket["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function AdminHelpTicketsPage() {
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/help-tickets")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
        return r.json();
      })
      .then((data) => {
        setTickets(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const setStatus = async (id: string, status: HelpTicket["status"]) => {
    await fetch(`/api/help-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Help Tickets</h1>
          <p className="text-gray-500 mt-1">
            {tickets.length} total · {openCount} open · {inProgressCount} in progress
          </p>
        </div>
        <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">← Dashboard</Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">📭</div>
          <p>No help tickets yet.</p>
          <p className="text-sm mt-1">When the assistant can&apos;t help someone, a ticket will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status]}`}>
                      {STATUS_LABELS[t.status]}
                    </span>
                    {t.topic && <span className="text-xs text-gray-500 capitalize">{t.topic}</span>}
                    <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="font-medium mt-1.5">{t.summary}</p>
                  {(t.name || t.contact) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {t.name && <span className="font-medium">{t.name}</span>}
                      {t.name && t.contact && " · "}
                      {t.contact && (
                        <a href={t.contact.includes("@") ? `mailto:${t.contact}` : `tel:${t.contact}`} className="text-blue-600 hover:underline">
                          {t.contact}
                        </a>
                      )}
                    </p>
                  )}
                  {t.conversation && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">View conversation</summary>
                      <pre className="mt-1 text-xs bg-gray-50 rounded p-2 whitespace-pre-wrap text-gray-600">{t.conversation}</pre>
                    </details>
                  )}
                  {t.resolutionNote && (
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded p-2">✅ {t.resolutionNote}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {t.status !== "in_progress" && t.status !== "resolved" && (
                    <button onClick={() => setStatus(t.id, "in_progress")} className="text-xs px-2.5 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                      Start
                    </button>
                  )}
                  {t.status !== "resolved" && (
                    <button
                      onClick={() => {
                        const note = prompt("Resolution note (optional):") ?? undefined;
                        fetch(`/api/help-tickets/${t.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "resolved", resolutionNote: note }),
                        }).then(load);
                      }}
                      className="text-xs px-2.5 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  )}
                  {t.status !== "open" && (
                    <button onClick={() => setStatus(t.id, "open")} className="text-xs px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
