import Link from "next/link";
import { SPONSOR_PRODUCTS, getSponsorAction, ADS_CONTACT_EMAIL } from "@/lib/sponsor";

export default function SponsorPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-4xl mb-3">📣</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Sponsor This Site</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Reach Fox Cities residents who just had their homes damaged and are actively hiring —
          at the exact moment they need help.
        </p>
      </div>

      {/* The trust separation — critical, non-negotiable */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
        <h2 className="font-bold text-blue-900 mb-2">How ads work here — and why they&apos;re different</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-blue-800 mt-3">
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Listings are always free and equal.</strong> No business can pay to rank higher or appear first in the directory.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Ads are separate and clearly labeled.</strong> Every ad carries an ADVERTISEMENT label in a dashed box — never confused with a real listing.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>No ad networks, no tracking.</strong> We never run pixels or profile visitors. We don&apos;t sell anyone&apos;s data.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 font-bold mt-0.5">✓</span>
            <span><strong>Limited slots.</strong> Scarcity protects the value of your sponsorship.</span>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {SPONSOR_PRODUCTS.map((p) => {
          const action = getSponsorAction(p.id);
          const isTop = p.id === "event";
          return (
            <div
              key={p.id}
              className={`card flex flex-col ${isTop ? "border-2 border-amber-400" : ""}`}
            >
              {isTop && (
                <span className="self-start badge-category bg-amber-100 text-amber-800 mb-2">Most Visible</span>
              )}
              <h3 className="font-bold text-xl mb-1">{p.name}</h3>
              <div className="text-3xl font-extrabold text-blue-700 mb-1">{p.rate}</div>
              <p className="text-xs text-gray-400 mb-4">{p.slots} slot{p.slots !== 1 ? "s" : ""} available</p>
              <p className="text-sm text-gray-600 mb-4">{p.audience}</p>
              <ul className="text-sm text-gray-600 space-y-1.5 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={action.href}
                {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`${isTop ? "btn-accent" : "btn-primary"} justify-center w-full`}
              >
                {action.label}
              </a>
            </div>
          );
        })}
      </div>

      {/* Who this is for */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Who typically sponsors</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-700">
          {[
            "🏦 Banks & credit unions (repair loans, HELOCs)",
            "🛡️ Insurance agencies & public adjusters",
            "🏗️ Building material suppliers",
            "🗑️ Dumpster & debris removal rentals",
            "🏠 Restoration & waterproofing companies",
            "⚖️ Insurance-claim attorneys",
            "🌳 Tree & landscaping services",
            "📦 Storage & POD companies",
          ].map((item) => (
            <div key={item} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Custom / best offer */}
      <div className="bg-gray-50 rounded-xl p-6 mb-12">
        <h2 className="text-lg font-bold mb-2">Want the top slot or a custom placement?</h2>
        <p className="text-gray-600 text-sm mb-4">
          The Event Sponsor slot has one position. When more than one business wants it, we offer it
          to the best offer for the month. Reach out to discuss.
        </p>
        <a href={`mailto:${ADS_CONTACT_EMAIL}?subject=${encodeURIComponent("Custom sponsorship")}`} className="btn-primary text-sm">
          ✉️ {ADS_CONTACT_EMAIL}
        </a>
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Common questions</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold">Can I pay to rank higher in the directory?</p>
            <p className="text-gray-600">No. Ever. Listings are free and equal for every local business. Ads are completely separate and clearly labeled.</p>
          </div>
          <div>
            <p className="font-semibold">What if I want a weekly test instead of a month?</p>
            <p className="text-gray-600">Weekly is available at ~30% of the monthly rate. <a href={`mailto:${ADS_CONTACT_EMAIL}`} className="text-blue-600 hover:underline">Email us</a> and we&apos;ll set it up.</p>
          </div>
          <div>
            <p className="font-semibold">Do you collect or sell visitor data?</p>
            <p className="text-gray-600">No. We don&apos;t run tracking or ad networks, and we never sell anyone&apos;s data. <Link href="/privacy" className="text-blue-600 hover:underline">Read our privacy policy</Link>.</p>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600">← Back to home</Link>
      </div>
    </div>
  );
}
