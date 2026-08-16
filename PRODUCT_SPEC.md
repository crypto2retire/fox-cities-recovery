# Fox Cities Recovery → National "Local Recovery Network" — Product Spec

## North Star
A privacy-first, local-first contractor/resource network that competes with Yelp & Angi
by inverting their incentive model: **nobody pays for placement, nobody's data is sold,
and consumers control exactly who sees their information.**

---

## 1. Core Principles (non-negotiable)

1. **Listings are always free and equal.** No business can pay to rank higher, get a
   bigger card, or appear above another in the general directory. Ranking is earned
   (ratings + reviews + longevity), never bought.
2. **Consumers are always free.** No fees, no lead-selling, no paywalled contact info.
3. **Personal data is never sold or shared by us.** Ever. This is the trust anchor.
4. **Consumer information is only shared with businesses the consumer explicitly selects.**
5. **Locally-owned businesses get a fair shot.** Ownership transparency (local / family /
   franchise / investment-group) is displayed prominently so consumers can choose.
6. **Storm chasers and fly-by-night operators are structurally excluded** from event
   landing pages via the `established_before_event` gate.

---

## 2. Data Privacy Policy (public-facing commitments)

Personal data is used for exactly two purposes, and nothing else:

| Purpose | What's collected | What's shared |
|---|---|---|
| **Review verification** | email or phone (hashed) | Never displayed. Never shared. Deletable on request. |
| **Consumer↔business estimates** | job details + contact info | ONLY with businesses the consumer selected (max 3) |

- No third-party tracking, no cookies, no pixels, no ad-network data feeds.
- No accounts required to browse, search, or read.
- "We don't sell your data" is a product feature, not a footnote.

---

## 3. The Quote Request System (core mechanic — the anti-Yelp)

### Flow
1. Consumer finds a service need (e.g. "roof replacement") and selects up to **3**
   businesses they want quotes from.
2. Each selected business receives the job description and knows: *"this consumer
   requested N quotes for [service]."* They see **the number N, never who** the other
   businesses are.
3. Contact info is **not** shared up front. It's shared only when the consumer
   explicitly chooses to move forward with an actual quote/estimate.
4. Businesses respond with quotes inside the app. The consumer compares 3 real quotes
   and hires one.

### The 3-Quote Cap (DECIDED)
- A consumer is limited to **3 quotes per distinct service needed**.
  - "Each service" means each separate job (e.g., roof + tree removal = 2 services = up to 6 businesses).
  - 3 is a ceiling, not a floor — a consumer may request 1, 2, or 3.
- Rationale (Kevin): 3 quotes gives a wide enough price range for real comparison,
  without making contractors feel like they're wasting time chasing bids.
- This prevents lead-spamming (the Yelp problem) and keeps signal high for businesses.

### Why this inverts Yelp/Angi
- **Yelp/Angi:** lead is broadcast to many businesses; the first to call back wins;
  businesses don't know they're competing against 5-10 others.
- **Ours:** consumer deliberately picks 3; each business knows the field size; they
  compete on **quality of quote**, not **speed of callback**.

### In-App Messaging (privacy bridge)
- The initial interaction happens in-app, so contact info (phone/email/address) stays
  server-side and is revealed only when the consumer decides it's needed for a real quote.
- Same pattern as BMM/WSIC: emails stored server-side, never shared between parties,
  full audit trail on every interaction.

---

## 3.5 Verified-Transaction Reviews (DECIDED)

Reviews are gated on a **mutually-confirmed transaction** — the core anti-storm-chaser /
anti-review-bombing mechanic.

- A customer can only review a business they **actually used**, and a business can only
  confirm work for a customer they **actually served**.
- Both sides must confirm the work happened before ANY review can be left:
  1. Customer selects which business they hired (from their quote requests).
  2. Business confirms the work was completed.
  3. Only then can either party leave a review.
- **Storm chasers cannot leave reviews** — they never have a confirmed transaction.
- This is a **highlighted benefit** for both sides:
  - Customers get real, accountable reviews (not fake 5-stars or bombed 1-stars).
  - Businesses are protected from competitors/storm-chasers planting fake reviews.
- Consequence: the review system is coupled to the quote/hire/messaging system —
  it cannot go live standalone. (See build order.)

---

## 4. Ownership Transparency (displayed on every listing)

| Type | Label | Icon |
|---|---|---|
| Locally owned | Locally Owned | 🏠 |
| Family owned | Family Owned | 👨👩👧 |
| Franchise | Franchise | 🏪 |
| Private-equity / investment group | Investment Group Backed | 💼 |
| Corporate | Corporate Owned | 🏢 |
| Multi-location | Multi-Location | 📍 |

Plus: year established, license, insurance-verified.

---

## 5. Ratings Strategy

```
Phase 1 (launch):  Google Places rating + review count (imported, labeled "Google")
Phase 2 (blend):   Bayesian combine Google + in-house reviews as in-house accumulates
Phase 3 (mature):  In-house ratings dominate; Google is one signal among several
```

Bayesian credibility score already implemented:
`credibility = (rating×reviews + 4.5×10)/(reviews+10) × log₂(reviews+1) × (1+years/100)`

---

## 6. Event / Storm Landing Pages

Reusable route: `/recovery/[state]/[metro]/[event]`

- Lists only businesses with `established_date < event_date` (automatic anti-storm-chaser gate).
- Pulls verified community resources: city permit office, state emergency mgmt, FEMA,
  Red Cross, 211, SBA disaster loans, local charities.
- Every resource link carries `verified: true/false`, `verified_date`, and source.
- Never asks the visitor for anything. No signup, no tracking.

---

## 7. Monetization (convenience features only — never placement)

| Feature | Cost |
|---|---|
| Directory listing | Free |
| Consumer use (search/browse/reviews) | Free |
| Ranking / bigger card / placement | **Never for sale** |
| In-app messaging (lead capture without exposing contact info) | Paid |
| Lightweight CRM (from whatshouldicharge.app) | Paid |
| Labeled edge ads (clearly marked, not in listings) | Paid |

---

## 8. Data Model (Postgres, nationwide)

```
regions               — metro / service territory
events                — storm/disaster landing pages (location, type, date)
  event_resources     — verified community links (verify status + date + source)
businesses            — established_date, ownership_type, license, location
  business_locations  — service areas (multi-city)
  business_reviews    — in-app + google snapshot
  business_responses  — replies to reviews
quote_requests        — consumer job requests (max 3 businesses, request_count)
  selected_businesses — the 3 chosen businesses (identity visible only to consumer + that business)
messages              — in-app threads (no PII in message content by default)
ads                   — labeled edge placements
```

---

## 9. Decisions Log (all resolved)

1. **3-quote cap** — DECIDED: 3 quotes per distinct service needed.
2. **Consumer identity** — DECIDED (default): pseudonymous handle during quote phase;
   real name + contact revealed only to the business the consumer hires.
3. **Review verification** — DECIDED: verified-transaction reviews (mutual confirmation required).
4. **CRM depth** — DECIDED (default): quote tracking, job status pipeline
   (requested → quoted → hired → scheduled → done), follow-up reminders, simple
   invoicing. No payment processing to start.

---

## 10. Build Order

**Ship Menasha (this week):**
1. ~~Real server-side admin auth + protect API routes~~ **DONE (Aug 2026)**
2. Google Places API sync for real ratings (replace hardcoded numbers)
3. Privacy Policy + "we don't sell your data" page
4. Resource verification status on resources page

**Nationwide foundation (then):**
5. Migrate JSON → Postgres
6. Regions + events data model + landing-page template
7. Google Places import pipeline (per-metro)
8. In-app messaging + audit trail (the quote request system — 3 quotes per service)
9. CRM integration
10. Ad inventory system (labeled, edge-only)
