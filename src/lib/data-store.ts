import fs from 'fs';
import path from 'path';
import type { Contractor, Review, RoofPricingConfig } from './types';
import { sortByCredibility } from './credibility';

const DATA_PATH = path.join(process.cwd(), 'src/lib/data.json');

interface AppData {
  contractors: Contractor[];
  reviews: Review[];
  roofPricing: RoofPricingConfig;
}

function readData(): AppData {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data: AppData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Contractors
export function getContractors(): Contractor[] {
  return sortByCredibility(readData().contractors);
}

export function getContractorById(id: string): Contractor | undefined {
  return readData().contractors.find(c => c.id === id);
}

export function addContractor(c: Contractor): Contractor {
  const data = readData();
  data.contractors.push(c);
  writeData(data);
  return c;
}

export function updateContractor(id: string, updates: Partial<Contractor>): Contractor | null {
  const data = readData();
  const idx = data.contractors.findIndex(c => c.id === id);
  if (idx === -1) return null;
  data.contractors[idx] = { ...data.contractors[idx], ...updates, id }; // prevent id overwrite
  writeData(data);
  return data.contractors[idx];
}

export function deleteContractor(id: string): boolean {
  const data = readData();
  const idx = data.contractors.findIndex(c => c.id === id);
  if (idx === -1) return false;
  data.contractors.splice(idx, 1);
  writeData(data);
  return true;
}

// Reviews
export function getReviewsForContractor(contractorId: string): Review[] {
  return readData().reviews.filter(r => r.contractorId === contractorId);
}

export function getAllReviews(): Review[] {
  return readData().reviews;
}

export function addReview(r: Review): Review {
  const data = readData();
  data.reviews.push(r);
  writeData(data);
  return r;
}

export function deleteReview(id: string): boolean {
  const data = readData();
  const idx = data.reviews.findIndex(r => r.id === id);
  if (idx === -1) return false;
  data.reviews.splice(idx, 1);
  writeData(data);
  return true;
}

// Pricing
export function getRoofPricing(): RoofPricingConfig {
  return readData().roofPricing;
}

export function updateRoofPricing(pricing: RoofPricingConfig): RoofPricingConfig {
  const data = readData();
  data.roofPricing = pricing;
  writeData(data);
  return pricing;
}

// Categories
export { CATEGORY_LABELS } from './types';
export type { Contractor, ContractorCategory, Review, RoofEstimate, RoofPricingConfig } from './types';
