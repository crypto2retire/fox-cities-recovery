import { getContractorById, getReviewsForContractor } from "@/lib/data-store";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnershipBadge } from "@/components/OwnershipBadge";
import { AdPlacement } from "@/components/AdPlacement";
import { ReviewsSection } from "@/components/ReviewsSection";
import { CATEGORY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contractor = await getContractorById(id);
  if (!contractor) return { title: "Contractor not found" };
  const desc = contractor.description || `Local ${CATEGORY_LABELS[contractor.category] || contractor.category} in ${contractor.city}, WI. Established ${contractor.yearEstablished ?? "before the 2026 tornado"}.`;
  return {
    title: `${contractor.name} — ${contractor.city}, WI | DoneLocal`,
    description: desc,
    openGraph: { title: contractor.name, description: desc, type: "website" },
  };
}

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contractor = await getContractorById(id);

  if (!contractor) notFound();

  const contractorReviews = await getReviewsForContractor(id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: contractor.name,
    description: contractor.description || undefined,
    telephone: contractor.phone || undefined,
    email: contractor.email || undefined,
    url: contractor.website || undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: contractor.city,
      addressRegion: "WI",
      addressCountry: "US",
      streetAddress: contractor.address || undefined,
    },
    ...(contractor.rating != null && contractor.reviewCount != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: contractor.rating,
            reviewCount: contractor.reviewCount,
          },
        }
      : {}),
    foundingDate: contractor.yearEstablished != null ? String(contractor.yearEstablished) : undefined,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/contractors" className="text-sm text-brand-600 hover:text-brand-700 mb-6 inline-flex items-center gap-1 font-medium">
        ← Back to all businesses
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-200/70 bg-white shadow-[0_1px_3px_rgba(7,17,31,0.05),0_12px_32px_-20px_rgba(7,17,31,0.18)] p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{contractor.name}</h1>
              <OwnershipBadge type={contractor.ownershipType} />
              {contractor.verified && (
                <span className="badge-verified">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Verified Local Business
                </span>
              )}
            </div>
            <p className="text-muted">
              {contractor.city}, WI
              {contractor.yearEstablished != null
                ? ` · Established ${contractor.yearEstablished} · ${new Date().getFullYear() - contractor.yearEstablished}+ years serving Fox Cities`
                : " · Established year not verified"}
            </p>
          </div>
        </div>

        <p className="text-ink/80 mt-4 leading-relaxed">{contractor.description}</p>

        <div className="flex items-center gap-3 mt-6">
          {contractor.rating != null ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-3xl font-extrabold text-amber-500">★ {contractor.rating}</span>
              <span className="text-muted text-sm">({contractor.reviewCount} reviews)</span>
            </span>
          ) : (
            <span className="text-muted text-sm">Rating not yet verified</span>
          )}
          {contractor.insuranceVerified && (
            <span className="badge-verified">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Insurance Verified
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="sm:col-span-2 space-y-8">
          {/* Services */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4">Services Offered</h2>
            <div className="flex flex-wrap gap-2">
              {contractor.services.map(s => (
                <span key={s} className="pill bg-brand-50 text-brand-700 border border-brand-100">{s}</span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4">Contact Information</h2>
            <div className="space-y-3">
              {contractor.phone && (
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-lg">📞</span>
                  <a href={`tel:${contractor.phone.replace(/[^\d]/g, "")}`} className="text-brand-600 hover:text-brand-700 font-semibold text-lg">
                    {contractor.phone}
                  </a>
                </div>
              )}
              {contractor.email && (
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-lg">✉️</span>
                  <a href={`mailto:${contractor.email}`} className="text-brand-600 hover:text-brand-700">{contractor.email}</a>
                </div>
              )}
              {contractor.website && (
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-lg">🌐</span>
                  <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700">
                    {contractor.website.replace("https://", "").replace("www.", "")}
                  </a>
                </div>
              )}
              {(contractor.facebookUrl || contractor.instagramUrl) && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-lg">📣</span>
                  <div className="flex gap-4">
                    {contractor.facebookUrl && (
                      <a href={contractor.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 font-medium">Facebook</a>
                    )}
                    {contractor.instagramUrl && (
                      <a href={contractor.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 font-medium">Instagram</a>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 text-lg">📍</span>
                <span className="text-ink/80">{contractor.address}</span>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <ReviewsSection
            contractorId={contractor.id}
            contractorName={contractor.name}
            initialReviews={contractorReviews}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ownership transparency */}
          <div className="card !p-5">
            <h3 className="font-bold text-sm mb-2">Business Ownership</h3>
            <div className="flex items-center gap-2 mb-2">
              <OwnershipBadge type={contractor.ownershipType} />
            </div>
            {contractor.ownershipNotes && (
              <p className="text-xs text-muted">{contractor.ownershipNotes}</p>
            )}
            <p className="text-xs text-muted mt-2 leading-relaxed">
              <strong className="text-ink">Why this matters:</strong> Locally owned businesses typically offer more flexible
              pricing, personalized service, and direct accountability. PE-backed and corporate contractors may use
              standardized pricing models designed to maximize investor returns.
            </p>
          </div>

          {/* Quick contact CTA */}
          <div className="bg-navy-900 text-white rounded-2xl p-6 text-center sticky top-24">
            <h3 className="font-bold text-lg mb-2">Need Help Now?</h3>
            {contractor.phone && (
              <a
                href={`tel:${contractor.phone.replace(/[^\d]/g, "")}`}
                className="block w-full bg-brand-500 text-white font-bold py-3 px-4 rounded-full hover:bg-brand-400 transition-colors mb-3"
              >
                📞 Call Now
              </a>
            )}
            {contractor.email && (
              <a
                href={`mailto:${contractor.email}`}
                className="block w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 px-4 rounded-full transition-colors text-sm"
              >
                ✉️ Send Email
              </a>
            )}
            <Link
              href={`/request?contractor=${contractor.id}`}
              className="block w-full bg-amber-400 hover:bg-amber-300 text-navy-950 font-bold py-2.5 px-4 rounded-full transition-colors text-sm mt-2"
            >
              📋 Request a Quote
            </Link>
            <p className="text-blue-100/60 text-xs mt-4">
              Free estimates available for tornado-affected properties
            </p>
          </div>

          {/* Ad slot — geo-targeted to this contractor's city */}
          <AdPlacement city={contractor.city} state="WI" />
        </div>
      </div>
    </div>
  );
}
