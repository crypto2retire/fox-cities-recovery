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
  yearEstablished: number; // to verify pre-storm presence
  verified: boolean; // manually verified as local pre-storm business
  description: string;
  services: string[];
  licenseNumber?: string;
  insuranceVerified: boolean;
  rating: number; // 1-5
  reviewCount: number;
  logo?: string;
  ownershipType: OwnershipType;
  ownershipNotes?: string; // evidence for ownership classification
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
  source: 'in-app' | 'google' | 'imported'; // where the review came from
  verified?: boolean; // verified customer
}

export interface RoofEstimate {
  areaSqFt: number;
  squares: number; // roofing squares (100 sq ft)
  materialCostLow: number;
  materialCostHigh: number;
  laborCostLow: number;
  laborCostHigh: number;
  removalCostLow: number;
  removalCostHigh: number;
  totalLow: number;
  totalHigh: number;
  pitchFactor: number;
}

export interface RoofPricingConfig {
  materialPerSqFt: { low: number; high: number };
  laborPerSqFt: { low: number; high: number };
  removalPerSqFt: { low: number; high: number };
}
