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
  advertisingTier?: 'free' | 'featured' | 'premium';
}

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
