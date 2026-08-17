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
      <section className="bg-navy-hero text-white pt-14 sm:pt-20 pb-14 sm:pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="badge-navy mb-6">
            <span className="text-base">{typeMeta.icon}</span>
            {typeMeta.label} · {region ? `${region.name}, ${region.state}` : "Disaster Event"}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">{evt.name}</h1>
          <p className="text-lg text-blue-100/80 mb-8 max-w-2xl mx-auto">
            {dateLabel} — free recovery resources and verified local contractors for {region?.name ?? "your area"}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contractors" className="btn-primary text-lg">Find Local Contractors</a>
            <a href="#resources" className="btn-ghost text-lg">Recovery Resources</a>
          </div>
          <p className="text-sm text-blue-100/60 mt-8">
            100% free — no fees, no commissions, no middlemen. We never sell your data.
          </p>
        </div>
      </section>

      {/* Anti-storm-chaser gate explainer */}
      <section className="bg-amber-400/20 border-b border-amber-200/60">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-start gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-amber-100 text-xl shrink-0">🛡️</span>
          <div>
            <h2 className="font-bold text-amber-900">No storm chasers. Ever.</h2>
            <p className="text-sm text-amber-900/80 mt-1">
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

      {/* Event sponsor slot — geo-targeted to the storm's region */}
      <div className="max-w-4xl mx-auto px-4 -mt-4 pb-4">
        <AdPlacement variant="event" state={region?.state} />
      </div>

      {/* Resources */}
      <section id="resources" className="bg-surface py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <p className="kicker mb-3">Official resources</p>
            <h2 className="text-3xl font-extrabold mb-2">Recovery Resources</h2>
            <p className="text-muted">
              Verified government and nonprofit resources for {region?.name ?? "your area"}. Every link below has been
              checked and sourced.
            </p>
          </div>

          {resources.length === 0 ? (
            <p className="text-muted text-center py-10">Resources are being compiled for this event. Check back soon.</p>
          ) : (
            <div className="space-y-10">
              {resourceCategories.map((category) => (
                <div key={category}>
                  <h3 className="text-lg font-bold mb-4 pb-2 border-b border-gray-200">{category}</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {resources
                      .filter((r) => r.category === category)
                      .map((r) => (
                        <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="card card-hover block">
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
                          {r.description && <p className="text-sm text-muted">{r.description}</p>}
                          <span className="text-sm text-brand-600 font-medium mt-2 inline-flex items-center gap-1">
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
      <section className="bg-navy-hero text-white py-20 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <span className="badge-navy mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Local business owners
          </span>
          <h2 className="text-3xl font-extrabold mb-4">Are you a local contractor?</h2>
          <p className="text-blue-100/80 mb-8 max-w-xl mx-auto">
            If your business was established in {region?.name ?? "the area"} before {dateLabel}, get listed for free.
            Every local business gets equal visibility — no paid rankings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:listings@foxcitiesrecovery.com" className="btn-gold">Get Listed — Free</a>
            <Link href="/contractors" className="btn-ghost">Browse All Contractors</Link>
          </div>
          <p className="text-xs text-blue-100/50 mt-5">Listings are always free. Advertisements are separate and clearly labeled.</p>
        </div>
      </section>
    </div>
  );
}
