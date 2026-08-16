import { MetadataRoute } from 'next';
import { getContractors, getEventBySlug } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

const BASE = process.env.SITE_URL || 'https://fox-cities-recovery-production.up.railway.app';

// Dynamic sitemap: static pages + every contractor detail page + the storm page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [contractors, stormEvent] = await Promise.all([
    getContractors(),
    getEventBySlug('menasha-ef3-2026-07-27'),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/contractors`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/resources`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/sponsor`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  if (stormEvent?.region) {
    staticRoutes.push({
      url: `${BASE}/recovery/${stormEvent.region.state.toLowerCase()}/${stormEvent.region.slug}/${stormEvent.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    });
  }

  const contractorRoutes: MetadataRoute.Sitemap = contractors.map((c) => ({
    url: `${BASE}/contractors/${c.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...contractorRoutes];
}
