import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEventBySlug,
  getContractorsForEvent,
  getExcludedContractorCount,
  getEventResources,
} from "@/lib/data-store";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { ContractorList } from "@/components/ContractorList";
import { AdPlacement } from "@/components/AdPlacement";

export const dynamic = "force-dynamic";

export default async function StormPage({
  params,
}: {
  params: Promise<{ state: string; metro: string; event: string }>;
}) {
  const { state, metro, event: eventSlug } = await params;

  const evt = await getEventBySlug(eventSlug);
  if (!evt) notFound();

  // Enforce canonical URLs — the state/metro segments must match the event's region.
  const region = evt.region;
  if (
    region &&
    (region.slug.toLowerCase() !== metro.toLowerCase() ||
      region.state.toLowerCase() !== state.toLowerCase())
  ) {
    notFound();
  }

  const [contractors, excludedCount, resources] = await Promise.all([
    getContractorsForEvent(evt),
    getExcludedContractorCount(evt),
    getEventResources(evt.id),
  ]);

  const typeMeta = EVENT_TYPE_LABELS[evt.eventType] ?? EVENT_TYPE_LABELS.other;
  const occurred = new Date(`${evt.occurredAt}T00:00:00`);
  const dateLabel = occurred.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const eventYear = occurred.getFullYear();

  const resourceCategories = [...new Set(resources.map((r) => r.category))];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-red-900 via-red-800 to-red-950 text-white py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4">{typeMeta.icon}</div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-white/15 border border-white/25 rounded-full px-3 py-1 mb-4">
            {typeMeta.label} · {region ? `${region.name}, ${region.state}` : "Disaster Event"}
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">
            {evt.name}
          </h1>
          <p className="text-lg text-red-200 mb-6 max-w-2xl mx-auto">
            {dateLabel} — free recovery resources and verified local contractors for {region?.name ?? "your area"}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contractors" className="btn-accent text-lg">
              🔨 Find Local Contractors
            </a>
            <a href="#resources" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-lg">
              🆘 Recovery Resources
            </a>
          </div>
          <p className="text-sm text-red-300 mt-6">
            100% free — no fees, no commissions, no middlemen. We never sell your data.
          </p>
        </div>
      </section>

      {/* Anti-storm-chaser gate explainer */}
      <section className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-start gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h2 className="font-bold text-amber-900">No storm chasers. Ever.</h2>
            <p className="text-sm text-amber-800 mt-1">
              Every business listed below had a verified presence in the area <strong>before {dateLabel}</strong>.
              {excludedCount > 0 && (
                <> We excluded <strong>{excludedCount}</strong> business{excludedCount !== 1 ? "es" : ""} whose pre-storm presence could not be verified.</>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Contractors */}
      <section id="contractors">
        <ContractorList
          contractors={contractors}
          heading={`Verified Local Contractors — ${region?.name ?? ""}`}
          subheading={
            <>
              Every contractor below was established in {region?.name ?? "the area"} <strong>before {eventYear}</strong>.{" "}
              Storm chasers and businesses that appeared after the storm are excluded by design.
            </>
          }
        />
      </section>

      {/* Event sponsor slot */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 pb-4">
        <AdPlacement variant="event" />
      </div>

      {/* Resources */}
      <section id="resources" className="bg-gray-50 py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Recovery Resources</h2>
            <p className="text-gray-600">
              Verified government and nonprofit resources for {region?.name ?? "your area"}. Every link below has been
              checked and sourced.
            </p>
          </div>

          {resources.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              Resources are being compiled for this event. Check back soon.
            </p>
          ) : (
            <div className="space-y-10">
              {resourceCategories.map((category) => (
                <div key={category}>
                  <h3 className="text-lg font-bold mb-4 pb-2 border-b">{category}</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {resources
                      .filter((r) => r.category === category)
                      .map((r) => (
                        <a
                          key={r.id}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="card hover:border-blue-300 block"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-sm leading-snug">{r.title}</h4>
                            {r.verified && (
                              <span className="badge-verified text-xs shrink-0">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            )}
                          </div>
                          {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
                          <span className="text-sm text-blue-600 font-medium mt-2 inline-flex items-center gap-1">
                            Visit resource <span className="text-xs">↗</span>
                          </span>
                        </a>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Are you a local contractor?</h2>
          <p className="text-blue-200 mb-8 max-w-xl mx-auto">
            If your business was established in {region?.name ?? "the area"} before {dateLabel}, get listed for free.
            Every local business gets equal visibility — no paid rankings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:listings@foxcitiesrecovery.com" className="btn-accent">Get Listed — Free</a>
            <Link href="/contractors" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              Browse All Contractors
            </Link>
          </div>
          <p className="text-xs text-blue-300 mt-4">Listings are always free. Advertisements are separate and clearly labeled.</p>
        </div>
      </section>
    </div>
  );
}
