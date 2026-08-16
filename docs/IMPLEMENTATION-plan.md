# Done Local — Implementation Plan

> **For Hermes:** use this as the task backlog. Start at Phase 0-pre and work down.
> Companion to `docs/PLAN-donelocal-integration.md` (the why); this is the how, task by task.

**Goal:** Center four existing systems — the donelocal directory, the CTC CRM, BMM-POS, and the
camera-intelligence service — behind one login and one brand, so a local business can claim its
free listing and run its whole operation (leads, invoices, inventory, online sales, analytics)
without leaving the ecosystem.

---

## Phase 0-pre — Camera credential rotation (blocking, ~1 hour)

A live security-camera dashboard password is committed to git in plaintext. Fix before anything else.

1. **Rotate the password** on the running camera service (`CAMERA_APP_PASSWORD` env) — pick a new
   strong value; store in the on-prem env/gitignored file, not the repo.
2. **Scrub plaintext from git:** rewrite `docs/on-site-deployment-plan.md`,
   `docs/windows-bridge-setup.md`, and `scripts/windows-setup.ps1` to reference env vars
   (`$CAMERA_APP_PASSWORD`) instead of the literal.
3. **Purge history:** `git filter-repo --invert-paths` or BFG to remove the committed secret, force-push.
4. **Verify:** `git grep -i "SW-clh7"` returns nothing; `curl https://cameras.donelocalsites.com/api/health -u kevin:<newpw>` works.

---

## Phase 0 — Identity + claim flow (foundation, everything depends on this)

### 0.1 — Shared identity tables (donelocal repo, `~/dev/fox-cities-recovery`)
1. Migration `0007_accounts.sql`: `business_accounts` (id, listing_id FK contractors, email,
   business_type, ctc_user_id, bmm_vendor_id, claimed_at, plan, status) and `consumer_accounts`
   (id, email, phone_hash, verification_status, created_at).
2. Data-store CRUD: `getBusinessAccount`, `upsertBusinessAccount`, `getConsumerAccount`,
   `upsertConsumerAccount`, `linkBusinessToCtc`, `linkBusinessToBmm`.
3. Types: `BusinessAccount`, `ConsumerAccount`, `BusinessType`.

### 0.2 — Shared JWT (SSO)
1. `src/lib/sso.ts` in donelocal: `issueToken({ sub, role, external_ids })` and `verifyToken()` using
   `DONE_LOCAL_SSO_SECRET` (HS256). Add the secret to all three Railway services + `.env.example`s.
2. Match verify logic in CTC (`server/auth.ts` or new `server/sso.ts`) and BMM (`app/routers/auth.py`
   or a `verify_done_local_token` helper).

### 0.3 — Link endpoints
1. CTC: `POST /api/integrations/link` — verify token, resolve/create local user, return `external_id`.
2. BMM: `POST /api/v1/integrations/link` — same against vendors.
3. Each returns `{ external_id, app: 'ctc'|'bmm' }`.

### 0.4 — Claim flow (donelocal)
1. `/claim` page: business finds/claims its listing, creates Done Local account, picks
   service/retail/both, gets deep-linked (`/api/integrations/link` → redirect to CTC or BMM).
2. Consumer signup: email + optional phone (hashed), verification status "unverified" until a
   transaction confirms them real.

**Gate:** all 0.x tasks land before Phase 1 — nothing integrates without identity.

---

## Phase 1 — CRM integration (service businesses = the directory's core)

1. **Lead routing:** donelocal quote request (3-quote cap) → CTC `POST /api/leads` with
   `leadSource=donelocal` and the consumer's handle (PII NOT sent until release).
2. **"Responds in-app" badge** on listings with a linked CRM (responsiveness = trust).
3. **Verified-transaction review handshake:** CTC job `status=done` → donelocal review request
   (mutual confirmation, per PRODUCT_SPEC §3.5).
4. **YardWatch link:** job-site camera feeds attach to a CTC job record; after-hours/motion events
   surface on the job.

---

## Phase 2 — Store integration (retail + parts)

1. **Inventory surface:** read BMM `/api/storefront/items` (cached) onto the donelocal listing —
   "Buy online" with live item count.
2. **Buy online CTA** → BMM storefront (existing Square checkout, no rebuild).
3. **StoreWatch link:** foot-traffic / dwell / buyer-estimate aggregates surface in the BMM vendor
   dashboard (mall + vendor view).

---

## Phase 3 — Brand + funnel

1. New branches with "Done Local CRM / Store / Sight" branding (Kevin drives branding; assist only).
2. donelocal.com replaces the current Next.js landing (domain expires 2026-10-15).
3. Pricing page: free listing → CRM/Store subscription → optional ads → optional camera add-on.

---

## Sequencing notes

- **Only Phase 0-pre and Phase 0 are fully spec'd.** Phases 1–3 are ordered backlogs to be broken
  into bite-sized tasks when we reach them (their exact APIs may shift as we wire the real systems).
- **Everything is reversible.** Hub-and-spoke means each app keeps working standalone; a bad link
  degrades one integration, not the whole platform.
- **Test discipline:** each Phase 0 task ships with a test (mirror `scripts/test-*.ts` in donelocal);
  CTC/BMM get pytest/endpoint checks on staging before main.
