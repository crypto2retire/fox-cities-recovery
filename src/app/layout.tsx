import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import AssistantWidget from "@/components/AssistantWidget";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Fox Cities Recovery | Local Contractors & Tornado Relief",
  description: "Free community resource connecting Fox Cities tornado victims with verified local contractors for every stage of recovery — cleanup, repair, rebuild, and new home construction in Menasha, Appleton, and surrounding areas.",
  keywords: "tornado recovery, Menasha tornado, Appleton tornado, Fox Cities, home builders, local contractors, storm damage, rebuild, Wisconsin",
  openGraph: {
    title: "Fox Cities Recovery — Tornado Relief Resources",
    description: "Find verified local contractors for cleanup, repair, and rebuild after the July 27, 2026 Fox Cities tornado.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Emergency strip */}
        <div className="bg-amber-400 text-navy-950 text-center py-2 text-xs sm:text-sm font-semibold">
          🌪️ EF-3 Tornado Recovery — a free community resource for Menasha, Appleton &amp; Fox Crossing.{" "}
          <Link href="/contractors" className="underline font-extrabold hover:opacity-80">Find verified local help →</Link>
        </div>

        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-50">
          <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-navy-900 text-white text-lg shadow-sm">🏠</span>
              <span className="font-extrabold text-lg tracking-tight text-ink">
                Fox&nbsp;Cities <span className="text-brand-500">Recovery</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-muted">
              <Link href="/" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Home</Link>
              <Link href="/contractors" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Contractors</Link>
              <Link href="/resources" className="px-3 py-2 rounded-full hover:bg-surface hover:text-ink transition-colors">Resources</Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/account" className="hidden sm:inline-flex text-sm font-semibold text-ink px-4 py-2 rounded-full hover:bg-surface transition-colors">
                My Account
              </Link>
              <Link href="/contractors" className="btn-primary !px-4 !py-2 text-sm">
                Find Help
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
                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/10 text-white text-lg">🏠</span>
                <span className="font-extrabold text-lg text-white">Fox&nbsp;Cities <span className="text-brand-400">Recovery</span></span>
              </Link>
              <p className="text-sm leading-relaxed max-w-sm">
                A free community resource for tornado victims in Menasha, Appleton, Fox Crossing, and surrounding areas —
                for cleanup, repair, and rebuilding. No storm chasers — just businesses that were already your neighbors.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Explore</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/contractors" className="hover:text-white transition-colors">Find Local Contractors</Link></li>
                <li><Link href="/resources" className="hover:text-white transition-colors">Disaster Resources</Link></li>
                <li><Link href="/recovery/wi/fox-cities/menasha-ef3-2026-07-27" className="hover:text-white transition-colors">Menasha Recovery Hub</Link></li>
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
                  <span>Listings are always free &amp; equal — no paid rankings.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-500">
              <p>Fox Cities Recovery — Community-built for the July 27, 2026 EF-3 Tornado. Free for all residents.</p>
              <p className="mt-2">
                This is a free community resource, not a government website. Verify contractors and get multiple quotes before you hire.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
