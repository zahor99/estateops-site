# Deploy — estateops.io (GitHub Pages)

The repo auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.
`CNAME` pins the custom domain to **estateops.io**.

## One-time setup (operator, after DNS is ready)

1. **Repo → Settings → Pages → Build and deployment → Source = "GitHub Actions".**
2. **DNS at your registrar (estateops.io):** add the GitHub Pages apex `A` records:
   - `A  @  185.199.108.153`
   - `A  @  185.199.109.153`
   - `A  @  185.199.110.153`
   - `A  @  185.199.111.153`
   - (optional) `CNAME  www  zahor99.github.io`
3. **Settings → Pages → Custom domain = `estateops.io`** → wait for the DNS check → tick **Enforce HTTPS**.
4. Push to `main` (or re-run the workflow) → site goes live at https://estateops.io.

## ⚠️ Before going live — the form is NOT wired
The lead form posts to `ENDPOINT` which is still `REPLACE_WITH_WORKER_URL`; until that's set,
submissions fall back to the visitor's browser `localStorage` and **are lost**. Wire a
Cloudflare Worker → Airtable proxy (EstateOps base) and set `ENDPOINT` before launch.
