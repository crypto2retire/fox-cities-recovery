import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="en">
      <body>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-800">
              <span className="text-2xl">🏠</span>
              <span className="hidden sm:inline">Fox Cities Recovery</span>
              <span className="sm:hidden">FCR</span>
            </Link>
            <div className="flex items-center gap-1 sm:gap-4 text-sm font-medium">
              <Link href="/" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Home</Link>
              <Link href="/contractors" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Contractors</Link>
              <Link href="/resources" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Resources</Link>
            </div>
          </nav>
        </header>
        
        {/* Emergency Banner */}
        <div className="bg-red-600 text-white text-center py-2 text-sm font-medium">
          🚨 EF-3 Tornado Recovery: Free community resource for Fox Cities residents.{" "}
          <Link href="/contractors" className="underline font-bold">Find help →</Link>
        </div>

        <main className="min-h-screen">{children}</main>

        <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-3">Fox Cities Recovery</h3>
              <p className="text-sm">A free community resource for tornado victims in Menasha, Appleton, Fox Crossing, and surrounding areas — for cleanup, repair, and rebuilding.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contractors" className="hover:text-white transition-colors">Find Local Contractors</Link></li>
                <li><Link href="/resources" className="hover:text-white transition-colors">Disaster Resources</Link></li>
                <li><Link href="/sponsor" className="hover:text-white transition-colors">Sponsor / Advertise</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Disclaimer</h4>
              <p className="text-xs leading-relaxed">This is a free community resource. We verify contractor presence before the storm but always do your own due diligence. Get multiple quotes. This is not a government website.</p>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-xs">
            <p>Fox Cities Recovery — Community-built for the July 27, 2026 EF-3 Tornado. Free for all residents.</p>
            <p className="mt-2 text-gray-500">
              We never sell your data.{" "}
              <Link href="/privacy" className="underline hover:text-gray-300 transition-colors">Read our privacy policy</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
