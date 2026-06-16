# Wire the lead form (Cloudflare Worker → Airtable)

The landing-page form POSTs to a Cloudflare Worker that writes the lead into Airtable
(**EstateOps** base → **Website Leads** table). The Airtable token stays server-side in the Worker.

## One-time deploy (≈5 min)

1. **Make a narrow Airtable token.** airtable.com/create/tokens → scope **`data.records:write`** on base **EstateOps** (`appMolqG43PsOuIYy`) only. Copy it. *(Don't reuse the broad PAT.)*
2. **Deploy the Worker:**
   ```bash
   cd worker
   npm i -g wrangler        # if not installed
   wrangler login
   wrangler secret put AIRTABLE_PAT     # paste the token from step 1
   wrangler deploy
   ```
   Wrangler prints the URL, e.g. `https://estateops-form.<your-subdomain>.workers.dev`.
   *(No-CLI alternative: Cloudflare dashboard → Workers → Create → paste `worker.js`, add the `AIRTABLE_BASE` + `AIRTABLE_TABLE` vars and the `AIRTABLE_PAT` secret.)*
3. **Point the site at it:** in `index.html`, set the form `ENDPOINT` (currently `REPLACE_WITH_WORKER_URL`, ~line 549) to your Worker URL. Commit + push.
4. **Test:** open the live site, submit the form → a row should appear in **Website Leads** (Status = New).

Until the ENDPOINT is set, the form falls back to browser localStorage (leads are NOT captured) — so set it before going live.
