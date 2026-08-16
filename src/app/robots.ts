import { MetadataRoute } from 'next';

const BASE = process.env.SITE_URL || 'https://fox-cities-recovery-production.up.railway.app';

// robots.txt — allow crawling and point at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
