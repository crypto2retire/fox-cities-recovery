import Link from "next/link";
import { getContractors } from "@/lib/data-store";
import { CATEGORY_LABELS } from "@/lib";
import { OwnershipBadge } from "@/components/OwnershipBadge";
import { AdPlacement } from "@/components/AdPlacement";

export const dynamic = "force-dynamic";

const QUICK_CATEGORIES = [
  { slug: "restaurant", label: "Restaurants" },
  { slug: "retail", label: "Retail" },
  { slug: "cafe", label: "Cafés" },
  { slug: "salon-barber", label: "Salons" },
  { slug: "auto-repair", label: "Auto Repair" },
  { slug: "roofing", label: "Roofing" },
  { slug: "plumber", label: "Plumber" },
  { slug: "electrician", label: "Electrician" },
];

export default async function Home() {
  const contractors = await getContractors();

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-hero text-white pt-16 sm:pt-24 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="badge-navy mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Locally-owned business directory · Free forever
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.05] mb-5">
            Find your local businesses.
            <br />
            <span className="text-brand-400">Owned by your neighbors.</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-100/80 mb-9 max-w-2xl mx-auto">
            A free directory of locally-owned retail, food, services, and trades. Every listing{" "}
            <em className="not-italic font-semibold text-white">free and equal</em> — ranked by trust,
            never by payment. We never sell your data.
          </p>

          {/* Search */}
          <form action="/contractors" method="get" className="max-w-xl mx-auto mb-6">
            <div className="flex flex-col sm:flex-row gap-2 bg-white/5 border border-white/15 rounded-2xl p-2 backdrop-blur-sm">
              <input
                type="text"
                name="q"
                placeholder="What do you need? A plumber, a café, a gift shop…"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-blue-100/50 focus:outline-none"
                style={{ fontSize: '16px' }}
              />
              <button type="submit" className="btn-primary !py-3">
                Find Businesses
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </form>

          {/* Quick categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-9">
            {QUICK_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/contractors?category=${c.slug}`}
                className="pill bg-white/5 border border-white/15 text-blue-100 hover:bg-white/15 hover:text-white transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-100/70">
            {[
              "Locally-owned only",
              "100% free · no middlemen",
              "No paid rankings — ever",
              "We never sell your data",
            ].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-200/60 py-8">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: contractors.length, label: "Locally-owned businesses" },
            { value: "Free", label: "For every resident" },
            { value: "0", label: "Paid rankings — ever" },
            { value: "100%", label: "Data kept private" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl sm:text-4xl font-extrabold text-navy-900">{stat.value}</div>
              <div className="text-xs sm:text-sm text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="kicker mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">A directory that works for your neighborhood</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "🔍", title: "Find local businesses", desc: "Retail, food, services, and trades near you — all locally-owned. No chain-only feed, no pay-to-win listings." },
              { icon: "🏠", title: "See who owns it", desc: "Local, family, franchise, or corporate — ownership transparency on every listing so you can choose where your money goes." },
              { icon: "⭐", title: "Read real reviews", desc: "Verified reviews from actual customers, not bots or paid placement. See who your neighbors trust before you buy." },
            ].map((item) => (
              <div key={item.title} className="card card-hover text-center">
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-brand-50 text-2xl mx-auto mb-5">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Businesses */}
      <section className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="kicker mb-3">The directory</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">Locally-owned businesses near you</h2>
            </div>
            <Link href="/contractors" className="text-brand-600 hover:text-brand-700 font-semibold text-sm whitespace-nowrap">
              View all {contractors.length} →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractors.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/contractors/${c.id}`} className="card card-hover group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-category">{CATEGORY_LABELS[c.category]}</span>
                  <div className="flex items-center gap-1.5">
                    <OwnershipBadge type={c.ownershipType} compact />
                    {c.verified && (
                      <span className="badge-verified" title="Verified local business">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-lg group-hover:text-brand-600 transition-colors">{c.name}</h3>
                <p className="text-sm text-muted mt-1">{c.city}, WI{c.yearEstablished != null ? ` · Est. ${c.yearEstablished}` : ""}</p>
                <p className="text-sm text-ink/70 mt-3 mb-4 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                  {c.rating != null ? (
                    <span className="inline-flex items-center gap-1 text-sm">
                      <span className="text-amber-500 font-bold">★ {c.rating}</span>
                      <span className="text-xs text-muted">({c.reviewCount})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted">No rating yet</span>
                  )}
                  <span className="text-sm text-brand-600 font-semibold group-hover:translate-x-0.5 transition-transform">View →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Home sponsor slot — directory-level placement (state-wide WI) */}
      <div className="max-w-5xl mx-auto px-4 mt-16">
        <AdPlacement variant="banner" state="WI" />
      </div>

      {/* CTA */}
      <section className="bg-navy-hero text-white py-20 text-center mt-16">
        <div className="max-w-3xl mx-auto px-4">
          <span className="badge-navy mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Local business owners
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Are you a local business?</h2>
          <p className="text-blue-100/80 mb-8 max-w-xl mx-auto">
            Get listed for free. Every locally-owned business gets equal visibility — no paid rankings,
            no lead-selling, no data harvesting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:listings@donelocal.com" className="btn-gold">Get Listed — Free</a>
            <Link href="/sponsor" className="btn-ghost">Advertise Here</Link>
          </div>
          <p className="text-xs text-blue-100/50 mt-5">Listings are always free. Advertisements are separate and clearly labeled.</p>
        </div>
      </section>
    </>
  );
}
