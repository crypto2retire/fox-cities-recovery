import Link from "next/link";
import { getContractors } from "@/lib/data-store";
import { OwnershipBadge } from "@/components/OwnershipBadge";

export default function Home() {
  const contractors = getContractors();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4">🏚️</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">
            Fox Cities Tornado<br className="sm:hidden" /> Recovery Resources
          </h1>
          <p className="text-lg sm:text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Free tools to help Menasha, Appleton, and Fox Crossing residents recover from the July 27 EF-3 tornado —
            from emergency cleanup to full rebuild and new home construction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contractors" className="btn-accent text-lg">
              🔨 Find Local Contractors
            </Link>
            <Link href="/resources" className="btn-primary bg-white/10 hover:bg-white/20 border border-white/30 text-lg">
              🆘 Recovery Resources
            </Link>
          </div>
          <p className="text-sm text-blue-300 mt-6">
            100% free — no fees, no commissions, no middlemen
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b py-6">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { value: contractors.length, label: "Verified Contractors" },
            { value: "12.1 mi", label: "Tornado Path" },
            { value: "140 mph", label: "Peak Winds (EF-3)" },
            { value: "Free", label: "For All Residents" },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">How We Help</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { icon: "🔍", title: "Find Verified Locals", desc: "Every contractor listed had a physical presence in the Fox Cities before the storm. No storm chasers — just your neighbors." },
              { icon: "🏗️", title: "Every Stage of Recovery", desc: "Cleanup, debris removal, repairs, structural work, and full rebuilds. Find the right local pro for wherever you are in the process." },
              { icon: "⭐", title: "Read Real Reviews", desc: "Reviews from actual local customers. See who your neighbors trust before you hire." },
            ].map(item => (
              <div key={item.title} className="card text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Contractors */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Local Contractors</h2>
            <Link href="/contractors" className="text-blue-600 hover:text-blue-800 font-medium text-sm">View All {contractors.length} →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractors.slice(0, 6).map(c => (
              <Link key={c.id} href={`/contractors/${c.id}`} className="card group">
                <div className="flex items-start justify-between mb-3">
                  <span className="badge-category">{c.category.replace('-', ' ')}</span>
                  <div className="flex items-center gap-1">
                    <OwnershipBadge type={c.ownershipType} compact />
                    {c.verified && (
                      <span className="badge-verified">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-lg group-hover:text-blue-700 transition-colors">{c.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{c.city}, WI{c.yearEstablished != null ? ` · Est. ${c.yearEstablished}` : ''}</p>
                <p className="text-sm text-gray-600 mt-3 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-2 mt-4 text-sm">
                  {c.rating != null ? (
                    <>
                      <span className="text-amber-500 font-bold">★ {c.rating}</span>
                      <span className="text-gray-400">({c.reviewCount} reviews)</span>
                    </>
                  ) : (
                    <span className="text-gray-400">No rating yet</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Are you a local contractor?</h2>
          <p className="text-blue-200 mb-8 max-w-xl mx-auto">
            If your business was established in the Fox Cities before July 27, 2026, get listed for free.
            Every local business gets equal visibility — no paid rankings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:listings@foxcitiesrecovery.com" className="btn-accent">Get Listed — Free</a>
            <a href="mailto:ads@foxcitiesrecovery.com" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
              Advertise Here
            </a>
          </div>
          <p className="text-xs text-blue-300 mt-4">Listings are always free. Advertisements are separate and clearly labeled.</p>
        </div>
      </section>
    </>
  );
}
