# Done Local — Platform Integration Plan

> **Status:** DRAFT for review (plan mode). No code written yet.
> **Goal:** Make donelocal.com the hub that centers every tool Kevin has built — the
> national directory, the CTC CRM, and BMM-POS — under one brand, one login, one funnel.

---

## 1. North Star

A local business in any U.S. market should be able to:

1. **Claim their free listing** on donelocal.com (the front door).
2. **Run their whole business** from that one login — CRM (jobs/estimates/invoices/expenses),
   online sales (inventory + shipping), reviews, and accounting.
3. **Win customers** who find them organically (directory, disaster pages, reviews) —
   without ever paying for placement or buying leads.

The wedge stays the same: **disaster/recovery pages get traffic**, the **directory earns
trust** (privacy + local + no paid ranking), and the **CRM/POS upsell** converts that
audience into "users looking to simplify."

---

## 2. What each codebase actually is (verified today)

### 2.1 Fox Cities Recovery → donelocal.com (the hub)
- **Stack:** Next.js 16 + React 19 + Postgres (pg), Railway.
- **Has:** regions, events (storm landing pages), event_resources, contractors (directory +
  social/enrichment), business_locations, reviews (verified-transaction model), quote_requests +
  quote_request_businesses (3-quote cap), messages, ads (geo-targeted), ad_markets + ad_rates
  (market-size pricing), market_scans, help_tickets.
- **AI:** recovery assistant (tool-calling + human escalation), market scanner — both
  provider-agnostic (Gemini default).
- **Gaps for this plan:** no public/business accounts, quote/hire/messaging system is schema-only
  (not wired), no CRM or store surfaces.

### 2.2 CTC Business Hub (the CRM)
- **Stack:** Express 5 + React (Vite) + Drizzle + Postgres + Passport.js, Railway.
- **Has (verified schema + routes):** customers, jobs (status pipeline lead→…→done), schedule_slots,
  communications, invoices + invoice_line_items (Square: mark-paid, send-square), expenses +
  expense_allocations (receipt OCR, job-level allocation), square_imports, square_bookings,
  settings, users (Google OAuth), competitors, ai_insights, analytics_cache.
- **Integrations:** GA4 / GSC / Google Ads / Meta / Ahrefs / DataForSEO / GMB / Square.
- **Route surface:** `/api/customers`, `/api/jobs`, `/api/invoices` (+ line-items, mark-paid,
  send-square), `/api/expenses` (+ allocations, recalculate), `/api/leads`, `/api/pipeline`,
  `/api/jobs/:id/quote|book|request-review|notes`, `/api/crm/stats`.
- **This is the "all-in-one service-business CRM"** — jobs, estimates, invoicing, expense tracking,
  scheduling, Square payments, marketing analytics. Directly matches donelocal's contractor audience.

### 2.3 BMM-POS (the POS + online store)
- **Stack:** FastAPI + SQLAlchemy (async) + Postgres + JWT + plain HTML/JS, Railway.
- **Has:** 120-vendor antique-mall POS — vendors, items (+variants/photos), sales, rent, payouts,
  customers (+rewards/segments), **full double-entry accounting** (chart of accounts, journal,
  P&L, balance sheet, trial balance, tax summary, expenses, vendor checks), messages, offers,
  reservations, studio classes, purchase orders, trouble tickets, security deposits, gift cards,
  EOD reports, audit log.
- **Public storefront (online sales):** `/api/storefront/items`, `/vendor-inventory`, `/vendors`,
  `/shipping-quote`, `/processing-fee-quote`, `/create-payment`, `/create-cart-payment`
  (Square online), `/reservations`, `/specialties`, `/classes`.
- **This is the "all-in-one retail/POS + online parts sales"** — inventory + multi-vendor online
  storefront with shipping quotes and Square checkout.

### 2.4 The differentiation (Kevin's real pitch)
Neither CRM nor POS is "another CRM/POS." Both already ship **accounting + expense tracking**
built in — features most CRMs/POSes sell as add-ons or don't have. That's the "users looking to
simplify" hook: one login, one vendor, directory + CRM/POS + accounting + reviews + online sales.

### 2.5 Camera Intelligence Service (the fourth component — edge-first)
- **Stack:** Python 3 + FastAPI + OpenCV + SQLite, **local-first** (runs on a NUC/Pi on the same
  LAN as the NVR, not on Railway; Cloudflare tunnel exposes the dashboard). Repo
  `crypto2retire/camera-intelligence-service`, deployed at `cameras.donelocalsites.com`.
- **Two modes that map exactly onto the two business types:**
  - **StoreWatch (retail → BMM-POS):** person detection + centroid tracking, **enter/exit counts**
    (entry-line crossing), **dwell time**, **zone dwell at booths** (shopping patterns), and a
    **register-stop → buyer estimate** signal. Anonymous **shirt/pant color signature**
    (`compute_person_appearance`) re-identifies shoppers within a session/day for store-flow
    analytics — explicitly NOT facial recognition (privacy-safe by design: `identity_scope =
    anonymous_observation_only`, forbidden keys reject face/plate/biometric metadata).
  - **YardWatch (service → CTC Hub):** after-hours monitoring, parking analytics, PTZ follow,
    NVR motion + playback — for **job-site security** using solar + cellular cameras.
- **Key architectural difference:** the camera is **edge-deployed** (on-prem, LAN, near the NVR),
  not a cloud API. Integration is **"edge device pushes analytics up"** (or cloud dashboard pulls
  via tunnel), then donelocal/CTC/BMM **surface** the analytics — not "cloud API → cloud API" like
  the CRM/Store links. Any DVR/NVR via RTSP works.
- **Already under the donelocal umbrella:** tunnel hostname is `cameras.donelocalsites.com`;
  StoreWatch/YardWatch naming is already in the codebase.
- **Privacy posture is the moat:** it tracks *behavior* (flow, dwell, buyer likelihood) and
  *coarse clothing colors* — never identity. This is a differentiator to sell, not hide: "we
  measure how your store flows, not who your customers are."

### 2.6 ⚠️ Security finding (blocking before any camera work)
Live camera dashboard credentials are **committed to git** in multiple tracked files:
`docs/on-site-deployment-plan.md`, `docs/windows-bridge-setup.md`, and
`scripts/windows-setup.ps1` all contain `kevin / SW-clh7MEa5wzOEqN6jtQ` in plaintext (and
`LOCAL_REMOTE_ACCESS.md`, though gitignored, is also referenced). This is a live remote-access
password to a security-camera dashboard sitting in a repo. **Rotate the password and scrub the
committed copies** before the camera is marketed as a product — this is table stakes.

---

## 3. Target architecture

```
                         ┌────────────────────────────┐
                         │      donelocal.com         │
                         │   (Next.js — the hub)      │
                         │  directory · disaster pages│
                         │  reviews · ads · assistant  │
                         │  business accounts (claim) │
                         └────────────┬───────────────┘
                                      │  shared identity + API links
        ┌─────────────────┬───────────┼───────────────┬─────────────────┐
        ▼                 ▼           │               ▼                 ▼
┌────────────────┐ ┌────────────────┐ │  ┌────────────────┐  ┌──────────────────────┐
│ Done Local CRM │ │ Done Local     │ │  │  Edge analytics │  │  Camera Intelligence │
│  (CTC Hub)     │ │  Store         │ │  │  surfaces       │◄─┤  Service (edge-first) │
│ jobs·invoices  │ │  (BMM-POS)     │ │  │  in CRM + Store │  │  StoreWatch · YardWatch│
│ expenses·Square│ │ inventory·online│ │  │  (foot traffic, │  │  on-prem, RTSP/NVR    │
└────────────────┘ │ sales·accounting│ │  │   buyer est.)   │  │  solar/cellular       │
                   └────────────────┘ │  └────────────────┘  └──────────────────────┘
                                      │
                     shared business account (email + role + external_ids)
```

**Strategy: hub-and-spoke, four components, one identity. Do NOT merge into a monolith.**
Each component is large, working, and in production. The integration is **shared identity + API
links + deep-linking** for the cloud apps, and **edge analytics surfacing** for the camera. This
is the low-risk path and keeps each tool's independent value.

---

## 4. Shared identity (the linchpin — build first)

### 4.1 Two account types, one login
One login everywhere, two roles under the same identity system:

| Role | Why it exists | What it can do |
|---|---|---|
| **Business account** | Claims a listing, runs CRM/Store/camera | Manage listing, receive leads, invoice, sell online |
| **Consumer account** | Verifies the person is a **real customer, not a competitor** | Request quotes (3-quote cap), track quotes, confirm transactions, leave verified reviews |

**The consumer account is a trust mechanism, not a data-harvesting mechanism.** A consumer's
identity exists so we (and businesses) can verify they're a genuine buyer and not a competitor
gaming the system — but **their PII is never shared unless the consumer explicitly releases it
to a specific business for a bid or contract.** This is a refinement of the earlier
"pseudonymous-until-hired" decision: the account adds verification, while the release gate stays
fully consumer-controlled.

### 4.2 Business account model
When a business claims its listing on donelocal, it gets a **Done Local account** with:
- email (+ Google OAuth via the existing CTC Google stack)
- `business_type`: `service` (→ CRM) | `retail` (→ Store) | `both`
- `external_ids`: `{ ctc_user_id, bmm_vendor_id }` — links to each app's local user/vendor.

### 4.3 SSO mechanism (DECIDED)
Shared-signed JWT (`HS256`, shared `DONE_LOCAL_SSO_SECRET` across the cloud apps):
- donelocal issues a `done_local` token on claim/login (both business and consumer).
- CTC (Express) and BMM-POS (FastAPI) each verify the token with the shared secret and map
  `external_id` → their local user/vendor. Both already speak JWT (BMM natively; CTC has
  sessions + can add a verify middleware).

### 4.4 Cross-app linking data (lives in donelocal Postgres)
```
business_accounts
  id, listing_id (FK contractors), email, business_type,
  ctc_user_id (nullable), bmm_vendor_id (nullable),
  claimed_at, plan, status
consumer_accounts
  id, email, phone (hashed for verification), verification_status,
  created_at
```
Linking happens by **API call** from donelocal → CTC / BMM (each exposes a
`/api/integrations/link` endpoint that resolves the account to a local user/vendor).

---

## 5. Data-flow integrations (the actual value)

### 5.1 Directory → CRM (service businesses)
- A consumer requests quotes on donelocal (3-quote cap) → donelocal calls CTC
  `POST /api/leads` (or a new `/api/integrations/lead`) → the lead lands in that business's
  **CTC job pipeline** with `leadSource = "donelocal"`.
- The business's donelocal listing shows a **"Responds in-app"** badge when they have CRM linked
  (responsiveness = trust signal, matches the social-accountability idea).
- Completed CTC job (`status = done`) → triggers donelocal **verified-transaction review**
  request (the mutual-confirmation review model already specced).

### 5.2 Directory → Store (retail businesses)
- A retail business's BMM inventory surfaces on their donelocal listing ("Buy online" / parts).
- Online orders flow through the existing BMM storefront + Square checkout (no rebuild).
- Donelocal listing shows live item count / "Ships from [city]" as social proof.

### 5.3 Disaster pages → CRM (the wedge moment)
- Storm page → resident requests quotes → leads route into CRM in **real time**, because a
  storm is when a local business needs fast, organized lead capture most.
- Businesses with linked CRM get surfaced as "verified + responsive" on the storm page.

### 5.4 Accounting surfaces (the differentiator)
- CTC already has expense tracking + invoicing + job-level cost allocation.
- BMM already has full double-entry accounting (P&L, balance sheet).
- Donelocal marketing surfaces this: "accounting included" is a headline, not an add-on.

### 5.5 Camera analytics → CRM + Store (the "buyer estimate" loop)
- **StoreWatch → BMM-POS:** foot traffic, dwell time, booth zone dwell, and the register-stop
  buyer estimate feed the vendor dashboard (which booths draw attention, which shoppers likely
  bought). This is the antique-mall operator's + vendor's data advantage.
- **YardWatch → CTC Hub:** job-site cameras (solar/cellular) attach to a **job** in the CRM;
  after-hours alerts and motion events become job-site security events on the job record.
- **Privacy line stays sharp:** the camera pushes *anonymous behavior + coarse clothing color*
  aggregates, never identity. This is exactly the kind of "we measure flow, not people" feature
  that reinforces the donelocal trust brand — and it's a selling point for the camera itself.

---

## 6. Phased roadmap

### Phase 0 — Foundation (no new features, just plumbing)
1. **Shared identity:** `business_accounts` table in donelocal; `DONE_LOCAL_SSO_SECRET` on all cloud apps.
2. **Link endpoints:** CTC `/api/integrations/link` + BMM `/api/integrations/link` (accept a
   signed token, resolve/create local user, return external_id).
3. **Claim flow:** donelocal "Claim this listing" → Done Local account → choose service/retail →
   deep-link into the right tool.

### Phase 1 — CRM integration (highest value, service businesses are the directory's core)
1. Lead routing: donelocal quote request → CTC `POST /api/leads` with `leadSource=donelocal`.
2. "Responds in-app" badge on listings with linked CRM.
3. Verified-transaction review handshake: CTC job-done → donelocal review request.
4. **YardWatch link:** job-site camera feeds attach to a CTC job record (after-hours/motion events).

### Phase 2 — Store integration (retail + parts)
1. Surface BMM inventory on donelocal listing (read-only API, cached).
2. "Buy online" CTA → BMM storefront (existing Square checkout).
3. Live item/stock count as listing trust signal.
4. **StoreWatch link:** foot-traffic / dwell / buyer-estimate analytics surface in the BMM vendor
   dashboard (feeds the "which booths work" story for the mall + vendors).

### Phase 3 — Brand + funnel polish
1. Rebrand: CTC Hub → "Done Local CRM", BMM-POS → "Done Local Store", camera → "Done Local Sight".
2. donelocal.com replaces the current Next.js landing (renewal window: domain expires 2026-10-15).
3. Pricing page ties it together: free listing → CRM/Store subscription → optional ads → optional
   camera add-on (a genuine per-location hardware/software upsell).

### Phase 0-pre — Camera security (immediately, before any camera marketing)
Rotate the committed dashboard password, scrub the plaintext from git history, and move creds into
env/gitignored files. Non-negotiable — it's a live security-camera password in a repo.

---

## 7. Decisions (all resolved Aug 16, 2026)

1. **Integration architecture — DECIDED: hub-and-spoke.** Four components stay separate but
   integrated (they complement, not replace). The CRM is advertised to contractors *through*
   donelocal listings.
2. **SSO — DECIDED: shared-signed JWT** (`DONE_LOCAL_SSO_SECRET` across cloud apps).
3. **Priority order — DECIDED:** Phase 0-pre (camera security) → 0 (identity/claim) → 1 (CRM +
   YardWatch) → 2 (Store + StoreWatch) → 3 (rebrand + domain).
4. **Branding — DECIDED: keep internal names now.** Kevin will create new branches with the new
   branding himself; he wants the apps to stay personalized to his businesses. No in-code
   rebrand yet.
5. **Account scope — DECIDED: both business AND consumer accounts.** Consumer accounts exist to
   verify the person is a real customer (not a competitor). Consumer PII is **never shared**
   unless the consumer explicitly releases it to a business for a bid or contract.
6. **Camera deployment model — DECIDED (working assumption): lead magnet / demo now, paid
   per-location product later.** (Confirm in next session if this needs to change.)

---

## 8. Explicit non-goals (kept out of scope on purpose)
- Merging the three codebases or databases.
- A payment processor on donelocal itself (Square stays in CTC/BMM; donelocal only links).
- Auto-migrating existing CTC/BMM users into Done Local accounts (start with new claims; backfill later).
- Rebuilding the CTC or BMM frontends in Next.js (deep-link, don't rewrite).
