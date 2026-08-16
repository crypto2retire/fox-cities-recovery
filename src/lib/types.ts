// Types for Fox Cities Recovery app

export interface Contractor {
  id: string;
  name: string;
  category: ContractorCategory;
  phone: string;
  email?: string;
  website?: string;
  address: string;
  city: string; // Menasha, Appleton, Fox Crossing, etc.
  yearEstablished: number | null; // null = year not verified; used for pre-storm gate + longevity
  verified: boolean; // manually verified as local pre-storm business
  description: string;
  services: string[];
  licenseNumber?: string; // verified via WI DSPS — never fabricated
  insuranceVerified: boolean;
  rating: number | null; // null = no verified rating yet
  reviewCount: number | null; // null = no verified review count yet
  logo?: string;
  ownershipType: OwnershipType;
  ownershipNotes?: string; // evidence for ownership classification

  // Social + competitive intelligence (from market scans)
  facebookUrl?: string;
  instagramUrl?: string;
  contentThemes?: string[];
  strengths?: string[];
  weaknesses?: string[];
  lastScanned?: string; // ISO timestamp of last market scan
  scanSource?: string;  // 'market-scan' | 'manual' | 'google'
}

export type OwnershipType = 
  | 'locally-owned'     // Single location, owner-operated, no PE/corporate parent
  | 'family-owned'      // Multi-generation family business
  | 'franchise'         // Part of a franchise system
  | 'pe-backed'         // Private equity portfolio company
  | 'corporate'         // Public company or large corporate parent
  | 'multi-location'    // Multiple locations but appears independently owned
  | 'unknown';          // Not yet researched

export const OWNERSHIP_LABELS: Record<OwnershipType, string> = {
  'locally-owned': 'Locally Owned',
  'family-owned': 'Family Owned',
  'franchise': 'Franchise',
  'pe-backed': 'Private Equity Backed',
  'corporate': 'Corporate Owned',
  'multi-location': 'Multi-Location',
  'unknown': 'Ownership Not Verified',
};

export const OWNERSHIP_COLORS: Record<OwnershipType, { bg: string; text: string; icon: string }> = {
  'locally-owned': { bg: 'bg-green-100', text: 'text-green-800', icon: '🏠' },
  'family-owned': { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '👨‍👩‍👧' },
  'franchise': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🏪' },
  'pe-backed': { bg: 'bg-red-100', text: 'text-red-800', icon: '💼' },
  'corporate': { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🏢' },
  'multi-location': { bg: 'bg-blue-100', text: 'text-blue-800', icon: '📍' },
  'unknown': { bg: 'bg-gray-100', text: 'text-gray-600', icon: '❓' },
};

export type ContractorCategory =
  | 'home-builder'
  | 'roofing'
  | 'general-contractor'
  | 'electrician'
  | 'plumber'
  | 'hvac'
  | 'tree-removal'
  | 'water-damage'
  | 'windows-doors'
  | 'siding-gutters'
  | 'structural-repair'
  | 'insurance-adjuster'
  | 'debris-removal'
  | 'other';

export const CATEGORY_LABELS: Record<ContractorCategory, string> = {
  'home-builder': 'Home Builders & Rebuild',
  'roofing': 'Roofing',
  'general-contractor': 'General Contractor',
  'electrician': 'Electrician',
  'plumber': 'Plumber',
  'hvac': 'HVAC',
  'tree-removal': 'Tree Removal',
  'water-damage': 'Water Damage Restoration',
  'windows-doors': 'Windows & Doors',
  'siding-gutters': 'Siding & Gutters',
  'structural-repair': 'Structural Repair',
  'insurance-adjuster': 'Insurance Adjuster',
  'debris-removal': 'Debris Removal',
  'other': 'Other Services',
};

export interface Review {
  id: string;
  contractorId: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
  jobType?: string;
  source: 'in-app' | 'google' | 'imported';
  verified?: boolean;

  // Private — never returned to public API, stored for verification only
  contactEmail?: string;
  contactPhone?: string;

  // Fraud detection
  flagged?: boolean;
  flagReason?: string;

  // Business response
  businessResponse?: string;
  businessResponseDate?: string;
}

// ---------------------------------------------------------------------------
// Nationwide event / storm model
// ---------------------------------------------------------------------------

export interface Region {
  id: string;      // stable internal key, e.g. 'fox-cities-wi'
  name: string;    // display name, e.g. 'Fox Cities'
  state: string;   // two-letter, e.g. 'WI'
  slug: string;    // URL slug, e.g. 'fox-cities'
}

export type EventType =
  | 'tornado'
  | 'hurricane'
  | 'hail'
  | 'flood'
  | 'wind'
  | 'wildfire'
  | 'other';

export const EVENT_TYPE_LABELS: Record<EventType, { label: string; icon: string }> = {
  tornado: { label: 'Tornado', icon: '🌪️' },
  hurricane: { label: 'Hurricane', icon: '🌀' },
  hail: { label: 'Hail Storm', icon: '⛈️' },
  flood: { label: 'Flood', icon: '🌊' },
  wind: { label: 'Severe Wind', icon: '💨' },
  wildfire: { label: 'Wildfire', icon: '🔥' },
  other: { label: 'Disaster', icon: '⚠️' },
};

export interface Event {
  id: string;          // slug key, e.g. 'menasha-ef3-2026-07-27'
  regionId: string;
  name: string;        // 'Menasha EF-3 Tornado'
  slug: string;
  eventType: EventType;
  occurredAt: string;  // 'YYYY-MM-DD'
  description: string | null;
  active: boolean;
  region?: Region;     // joined
}

export interface EventResource {
  id: string;
  eventId: string;
  category: string;
  title: string;
  url: string;
  description: string | null;
  verified: boolean;
  verifiedDate: string | null;
  source: string | null;
}

// ---------------------------------------------------------------------------
// Ads — labeled sponsor slots (never part of listings)
// ---------------------------------------------------------------------------

export type AdPlacement = 'sidebar' | 'directory' | 'event';

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  sidebar: 'Sidebar (contractor detail pages)',
  directory: 'Directory Banner (bottom of contractor list)',
  event: 'Event Sponsor (storm landing page)',
};

export interface Ad {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  ctaText: string | null;
  placement: AdPlacement;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Market scanning (on-demand ingestion model)
// ---------------------------------------------------------------------------

export interface ScannedCompetitor {
  name: string;
  website?: string | null;
  rating?: number | null;
  review_count?: number | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  content_themes?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export type MarketScanStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MarketScan {
  id: string;
  regionId?: string | null;
  city: string;
  state: string;
  category: string;
  query?: string | null;
  status: MarketScanStatus;
  results?: ScannedCompetitor[];
  resultCount: number;
  scannedAt?: string | null;
  expiresAt?: string | null;
  error?: string | null;
}
