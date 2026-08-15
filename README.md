# Fox Cities Recovery
Free community resource for the July 27, 2026 EF-3 tornado that hit Menasha, Appleton, and Fox Crossing, Wisconsin.

## Features
- **Contractor Directory** — 50+ verified local contractors established before the storm, across every stage of recovery: cleanup, repair, rebuild, and new home construction
- **Ownership Transparency** — every contractor classified as locally-owned, family-owned, franchise, PE-backed, or corporate
- **Credibility Ranking** — Bayesian scoring that balances rating, review volume, and longevity
- **In-App Reviews** — verified review system with fraud detection and business responses
- **Disaster Resources** — curated links to FEMA, Red Cross, insurance help, and more

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding Contractors
Edit `src/lib/data.json` — each contractor needs:
- `yearEstablished` — must be before 2026
- `verified` — only set true after manual verification of pre-storm presence
- `ownershipType` — locally-owned, family-owned, franchise, pe-backed, or corporate
- Real phone, address, and licensing info

## Deployment
Deployed on Railway. GitHub auto-deploy enabled (or use `railway up`).
