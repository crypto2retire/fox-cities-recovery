import Link from "next/link";
import { getContractors } from "@/lib/data-store";
import { OwnershipBadge } from "@/components/OwnershipBadge";
import { AdPlacement } from "@/components/AdPlacement";

export const dynamic = "force-dynamic";

const QUICK_SEARCHES = ["Roofing", "Tree Removal", "Water Damage", "Home Builder", "Debris Removal", "Electrician"];

export default async function Home() {
  const contractors = await getContractors();

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-hero text-white pt-16 sm:pt-24 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="badge-navy mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Free community resource · Fox Cities, Wisconsin
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.05] mb-5">
            Recover. Rebuild.
            <br />
            <span className="text-brand-400">With neighbors you trust.</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-100/80 mb-9 max-w-2xl mx-auto">
            Every local contractor here had a verified presence in Menasha, Appleton, and Fox Crossing{" "}
            <em className="not-italic font-semibold text-white">before</em> the July 27 EF-3 tornado.
            No storm chasers. No middlemen. Free forever.
          </p>

          {/* Search */}
          <form action="/contractors" method="get" className="max-w-xl mx-auto mb-6">
            <div className="flex flex-col sm:flex-row gap-2 bg-white/5 border border-white/15 rounded-2xl p-2 backdrop-blur-sm">
              <input
                type="text"
                name="q"
                placeholder="What do you need? Roofing, tree removal, rebuild…"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-blue-100/50 focus:outline-none"
                style={{ fontSize: '16px' }}
              />
              <button type="submit" className="btn-primary !py-3">
                Find Contractors
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </form>

          {/* Quick searches */}
          <div className="flex flex-wrap justify-center gap-2 mb-9">
            {QUICK_SEARCHES.map((q) => (
              <Link
                key={q}
                href={`/contractors?q=${encodeURIComponent(q)}`}
                className="pill bg-white/5 border border-white/15 text-blue-100 hover:bg-white/15 hover:text-white transition-colors"
              >
                {q}
              </Link>
            ))}
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-100/70">
            {[
              "Pre-storm local only",
              "100% free · no middlemen",
              "Listings never ranked by pay",
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

      {/* Event landing link */}
      <section className="bg-surface border-b border-gray-200/60">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-amber-100 text-xl">🌪️</span>
            <p className="text-sm text-ink">
              <strong>Menasha EF-3 Tornado recovery hub</strong> — verified local contractors, permits, FEMA, and more in one place.
            </p>
          </div>
          <Link href="/recovery/wi/fox-cities/menasha-ef3-2026-07-27" className="btn-primary !py-2.5 text-sm whitespace-nowrap">
            View Recovery Hub →
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-200/60 py-8">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: contractors.length, label: "Verified Local Businesses" },
            { value: "12.1 mi", label: "Tornado Path" },
            { value: "140 mph", label: "Peak Winds (EF-3)" },
            { value: "$0", label: "For Every Resident" },
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
            <h2 className="text-3xl sm:text-4xl font-extrabold">Recovery, without the storm chasers</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "🔍", title: "Find verified locals", desc: "Every business listed had a physical presence in the Fox Cities before the storm. No storm chasers — just your neighbors." },
              { icon: "🏗️", title: "Every stage of recovery", desc: "Cleanup, debris removal, repairs, structural work, and full rebuilds. Find the right local pro for wherever you are." },
              { icon: "⭐", title: "Read real reviews", desc: "Reviews from actual local customers. See who your neighbors trust before you hire." },
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

      {/* Sample Contractors */}
      <section className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="kicker mb-3">The directory</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold">Local contractors, ready to help</h2>
            </div>
            <Link href="/contractors" className="text-brand-600 hover:text-brand-700 font-semibold text-sm whitespace-nowrap">
              View all {contractors.length} →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractors.slice(0, 6).map((c) => (
              <Link key={c.id} href={`/contractors/${c.id}`} className="card card-hover group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-category capitalize">{c.category.replace(/-/g, " ")}</span>
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
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Are you a local contractor?</h2>
          <p className="text-blue-100/80 mb-8 max-w-xl mx-auto">
            If your business was established in the Fox Cities before July 27, 2026, get listed for free.
            Every local business gets equal visibility — no paid rankings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:listings@foxcitiesrecovery.com" className="btn-gold">Get Listed — Free</a>
            <Link href="/sponsor" className="btn-ghost">Advertise Here</Link>
          </div>
          <p className="text-xs text-blue-100/50 mt-5">Listings are always free. Advertisements are separate and clearly labeled.</p>
        </div>
      </section>
    </>
  );
}
