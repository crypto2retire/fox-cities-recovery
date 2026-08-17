import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import AssistantWidget from "@/components/AssistantWidget";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DoneLocal — Find Locally-Owned Businesses",
  description:
    "A free, privacy-first directory of locally-owned businesses — retail, food, services, and trades. Every listing free and equal, ranked by trust not payment. We never sell your data.",
  keywords:
    "local business directory, shop local, locally-owned, small business, retail, restaurants, services, trades, home services",
  openGraph: {
    title: "DoneLocal — Find Locally-Owned Businesses",
    description:
      "A free directory of locally-owned businesses. Every listing free and equal, ranked by trust not payment. We never sell your data.",
    type: "website",
  },
};

function LogoMark() {
  return (
    <span className="grid place-items-center w-9 h-9 rounded-xl bg-navy-900 text-white shadow-sm">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-50">
          <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-extrabold text-lg tracking-tight text-ink">
                Done<span className="text-brand-500">Local</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-muted">
              <Link href="/" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Home</Link>
              <Link href="/contractors" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Directory</Link>
              <Link href="/resources" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Resources</Link>
              <Link href="/recovery/wi/fox-cities/menasha-ef3-2026-07-27" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Recovery</Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/account" className="hidden sm:inline-flex text-sm font-semibold text-ink px-4 py-2 rounded-full hover:bg-surface transition-colors">
                My Account
              </Link>
              <Link href="/contractors" className="btn-primary !px-4 !py-2 text-sm">
                Find Local
              </Link>
            </div>
          </nav>
        </header>

        <main className="min-h-screen">{children}</main>
        <AssistantWidget />

        {/* Footer */}
        <footer className="bg-navy-950 text-gray-400">
          <div className="max-w-6xl mx-auto px-4 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/10 text-white">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span className="font-extrabold text-lg text-white">Done<span className="text-brand-400">Local</span></span>
              </Link>
              <p className="text-sm leading-relaxed max-w-sm">
                A free directory of locally-owned businesses — retail, food, services, and trades.
                Every listing free and equal, ranked by trust, never by payment. If Google and Facebook
                can make a small business invisible, we exist to make it findable.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Explore</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/contractors" className="hover:text-white transition-colors">Find Local Businesses</Link></li>
                <li><Link href="/resources" className="hover:text-white transition-colors">Community Resources</Link></li>
                <li><Link href="/recovery/wi/fox-cities/menasha-ef3-2026-07-27" className="hover:text-white transition-colors">Recovery Hub</Link></li>
                <li><Link href="/sponsor" className="hover:text-white transition-colors">Sponsor / Advertise</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Trust</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>We never sell your data.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Listings are free &amp; equal — no paid rankings.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-500">
              <p>DoneLocal — Community-built so every locally-owned business has an existence it controls.</p>
              <p className="mt-2">
                Free to use. This is a community directory, not a lead-selling marketplace. Verify businesses and get multiple quotes before you hire.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
