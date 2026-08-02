# Fox Cities Recovery
Free community resource for the July 27, 2026 EF-3 tornado that hit Menasha, Appleton, and Fox Crossing, Wisconsin.

## Features
- **Contractor Directory** — Verified local contractors established before the storm
- **Roof Cost Estimator** — Trace your roof on satellite imagery for instant Wisconsin cost estimates
- **Reviews** — Real customer reviews from Fox Cities residents
- **Disaster Resources** — Curated links to FEMA, Red Cross, insurance help, and more

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Google Maps API (custom polygon drawing for roof measurement)

## Getting Started

```bash
cp .env.example .env.local
# Add your Google Maps API key to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps API key with Maps JavaScript API, Geocoding API, and Geometry library enabled |

## Adding Contractors
Edit `src/lib/contractors.ts` — each contractor needs:
- `yearEstablished` — must be before 2026
- `verified` — only set true after manual verification of pre-storm presence
- Real phone, address, and licensing info
