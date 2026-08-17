import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Your Privacy</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: August 16, 2026</p>

      {/* The guarantee — lead with it */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 sm:p-8 mb-10 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-green-800 mb-2">
          We never sell your data.
        </h2>
        <p className="text-green-700 max-w-xl mx-auto">
          Not your email, not your phone number, not your reviews. We don&apos;t sell it, rent it,
          trade it, or hand it to advertisers. Your data is not our product.
        </p>
      </div>

      {/* The short version */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">The short version</h2>
        <ul className="space-y-2 text-gray-700">
          {[
            "You can browse, search, and read everything without an account.",
            "We run no tracking pixels, no analytics that profile you, and no third-party ad networks.",
            "We never sell, rent, trade, or share your personal information. Period.",
            "The only data we ever have about you is what you choose to give us.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What we collect */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">What we collect — and when</h2>

        <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
          <h3 className="font-semibold mb-1">Just browsing the site</h3>
          <p className="text-gray-600 text-sm">Nothing. No account required, no cookies set for visitors, no analytics, no tracking, no fingerprinting.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold mb-1">When you leave a review</h3>
          <ul className="text-gray-600 text-sm space-y-1 mb-3">
            <li>• Your name (written however you choose)</li>
            <li>• Your star rating and written review</li>
            <li>• An optional job type (e.g. &quot;roof replacement&quot;)</li>
            <li>• An email address or phone number, used only to verify the review is real</li>
          </ul>
          <p className="text-xs text-gray-400">
            We ask for a contact method to prevent fake and spam reviews. This contact info is stored
            privately, is <strong>never shown publicly</strong>, and is never shared or sold.
          </p>
        </div>
      </section>

      {/* What we do with it */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">What we do with your data</h2>
        <p className="text-gray-700 mb-3">
          Your review contact information is used for exactly one purpose: to verify that a review
          came from a real customer. It is not used for marketing, advertising, or profiling, and it
          is not combined with any other data about you.
        </p>
        <p className="text-gray-700">
          We do not process payments, so we never see or store payment card details.
        </p>
      </section>

      {/* What we never do */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">What we never do</h2>
        <ul className="space-y-2 text-gray-700">
          {[
            "Sell, rent, trade, or license your personal data to anyone.",
            "Run third-party trackers, analytics, or ad networks that build a profile of you.",
            "Hand your contact information to a business without your own explicit action.",
            "Use your data for advertising or cross-site behavioral targeting.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Cookies */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Cookies</h2>
        <p className="text-gray-700">
          The only cookie this site sets is a secure session cookie for the site administrator —
          the person who manages the business listings. If you are not logging into the admin panel,
          you receive <strong>no cookies at all</strong>.
        </p>
      </section>

      {/* Third-party links */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Links to other websites</h2>
        <p className="text-gray-700">
          Our directory and resource pages link to external sites — contractor websites, FEMA, the
          Red Cross, and other organizations. When you click through to one of those sites, their
          privacy policy applies, not ours. We encourage you to review it.
        </p>
      </section>

      {/* Your rights */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Your rights</h2>
        <p className="text-gray-700 mb-2">You can ask us at any time to:</p>
        <ul className="space-y-1 text-gray-700">
          <li>• Tell you what information (if any) we hold about you</li>
          <li>• Correct any information we have</li>
          <li>• Delete your review and the contact information attached to it</li>
        </ul>
        <p className="text-gray-600 text-sm mt-3">
          Email us and we&apos;ll respond promptly. There are no hoops, no retention games — just ask.
        </p>
      </section>

      {/* Contact */}
      <section className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-2">Privacy questions?</h2>
        <p className="text-gray-600 text-sm mb-3">
          This site is run by people in the Fox Cities, not a faceless corporation. Reach us directly:
        </p>
        <a href="mailto:privacy@foxcitiesrecovery.com" className="btn-primary text-sm">
          ✉️ privacy@foxcitiesrecovery.com
        </a>
        <p className="text-xs text-gray-400 mt-4">
          <Link href="/" className="hover:text-gray-600">← Back to home</Link>
        </p>
      </section>
    </div>
  );
}
