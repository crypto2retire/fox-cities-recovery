import { OWNERSHIP_COLORS, OWNERSHIP_LABELS } from "@/lib";
import type { OwnershipType } from "@/lib";

export function OwnershipBadge({ type, compact = false }: { type: OwnershipType; compact?: boolean }) {
  const colors = OWNERSHIP_COLORS[type];
  const label = OWNERSHIP_LABELS[type];

  if (type === 'unknown') return null; // Don't show unknown badges

  const isGood = type === 'locally-owned' || type === 'family-owned';
  const isWarning = type === 'pe-backed' || type === 'corporate';

  return (
    <span
      className={`inline-flex items-center gap-1 ${colors.bg} ${colors.text} text-xs font-medium px-2 py-0.5 rounded-full`}
      title={label}
    >
      <span>{colors.icon}</span>
      {!compact && <span>{label}</span>}
    </span>
  );
}

export function OwnershipExplanation() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-bold text-lg mb-4">Ownership Transparency</h3>
      <p className="text-sm text-gray-600 mb-4">
        We believe homeowners deserve to know who they&apos;re hiring. Ownership structure affects pricing, quality, and accountability.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {([
          ['locally-owned', 'Locally owned and operated. Single location. Owner involved in day-to-day work. More accountability and flexible pricing.'],
          ['family-owned', 'Multi-generation family business. Deep community roots. Values-driven decision making.'],
          ['pe-backed', 'Private equity owned. May prioritize investor returns. Often part of a larger roll-up with standardized pricing.'],
          ['corporate', 'Large corporate parent. Standardized processes. May have higher overhead built into pricing.'],
          ['franchise', 'Part of a franchise system. Mix of corporate standards and local ownership.'],
          ['multi-location', 'Multiple locations but appears independently owned. Check if owner is still involved locally.'],
        ] as [OwnershipType, string][]).map(([type, desc]) => {
          const colors = OWNERSHIP_COLORS[type];
          return (
            <div key={type} className="flex items-start gap-2">
              <span className={`${colors.bg} ${colors.text} text-xs px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5`}>
                {colors.icon} {OWNERSHIP_LABELS[type]}
              </span>
              <span className="text-gray-600 text-xs">{desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
