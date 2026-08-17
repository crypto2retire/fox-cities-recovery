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
    title: `${contractor.name} — ${contractor.city}, WI | Fox Cities Recovery`,
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
      {/* Back link */}
      <Link href="/contractors" className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center gap-1">
        ← Back to all contractors
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{contractor.name}</h1>
              <OwnershipBadge type={contractor.ownershipType} />
              {contractor.verified && (
                <span className="badge-verified text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Verified Local Business
                </span>
              )}
            </div>
            <p className="text-gray-500">
              {contractor.city}, WI
              {contractor.yearEstablished != null
                ? ` · Established ${contractor.yearEstablished} · ${new Date().getFullYear() - contractor.yearEstablished}+ years serving Fox Cities`
                : ' · Established year not verified'}
            </p>
          </div>
        </div>

        <p className="text-gray-700 mt-4">{contractor.description}</p>

        {/* Rating */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex items-center gap-1">
            {contractor.rating != null ? (
              <>
                <span className="text-3xl font-bold text-amber-500">★ {contractor.rating}</span>
                <span className="text-gray-400 text-sm">({contractor.reviewCount} reviews)</span>
              </>
            ) : (
              <span className="text-gray-400 text-sm">Rating not yet verified</span>
            )}
          </div>
          {contractor.insuranceVerified && (
            <span className="badge-verified text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              Insurance Verified
            </span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="sm:col-span-2 space-y-8">
          {/* Services */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-bold text-lg mb-4">Services Offered</h2>
            <div className="flex flex-wrap gap-2">
              {contractor.services.map(s => (
                <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium">{s}</span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="font-bold text-lg mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📞</span>
                <a href={`tel:${contractor.phone.replace(/[^\d]/g, '')}`} className="text-blue-600 hover:text-blue-800 font-medium text-lg">
                  {contractor.phone}
                </a>
              </div>
              {contractor.email && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">✉️</span>
                  <a href={`mailto:${contractor.email}`} className="text-blue-600 hover:text-blue-800">
                    {contractor.email}
                  </a>
                </div>
              )}
              {contractor.website && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌐</span>
                  <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    {contractor.website.replace('https://', '').replace('www.', '')}
                  </a>
                </div>
              )}
              {(contractor.facebookUrl || contractor.instagramUrl) && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xl">📣</span>
                  <div className="flex gap-4">
                    {contractor.facebookUrl && (
                      <a href={contractor.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">
                        Facebook
                      </a>
                    )}
                    {contractor.instagramUrl && (
                      <a href={contractor.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <span className="text-gray-700">{contractor.address}</span>
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
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-sm mb-2">Business Ownership</h3>
            <div className="flex items-center gap-2 mb-2">
              <OwnershipBadge type={contractor.ownershipType} />
            </div>
            {contractor.ownershipNotes && (
              <p className="text-xs text-gray-500">{contractor.ownershipNotes}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              <strong>Why this matters:</strong> Locally owned businesses typically offer more flexible pricing, personalized service, and direct accountability. PE-backed and corporate contractors may have standardized pricing models designed to maximize investor returns.
            </p>
          </div>

          {/* Quick contact CTA */}
          <div className="bg-blue-700 text-white rounded-xl p-6 text-center sticky top-24">
            <h3 className="font-bold text-lg mb-2">Need Help Now?</h3>
            <a 
              href={`tel:${contractor.phone.replace(/[^\d]/g, '')}`} 
              className="block w-full bg-white text-blue-700 font-bold py-3 px-4 rounded-lg hover:bg-blue-50 transition-colors mb-3"
            >
              📞 Call Now
            </a>
            {contractor.email && (
              <a 
                href={`mailto:${contractor.email}`}
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                ✉️ Send Email
              </a>
            )}
            <Link
              href={`/request?contractor=${contractor.id}`}
              className="block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm mt-2"
            >
              📋 Request a Quote
            </Link>
            <p className="text-blue-200 text-xs mt-4">
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
