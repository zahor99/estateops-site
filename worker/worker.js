/**
 * EstateOps lead-form proxy — Cloudflare Worker.
 * Receives the landing-page form POST and writes a row to Airtable
 * (EstateOps base → "Website Leads"). Keeps the Airtable token server-side.
 *
 * Deploy: see ../DEPLOY-FORM.md
 *   - set secret:  wrangler secret put AIRTABLE_PAT   (a NARROW PAT: data.records:write on the EstateOps base only)
 *   - base/table are in wrangler.toml [vars]
 */
const ALLOWED = new Set([
  "https://estateops.io",
  "https://www.estateops.io",
  "https://zahor99.github.io", // pre-DNS testing on GitHub Pages
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://estateops.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method not allowed" }, 405, cors);

    let d;
    try { d = await request.json(); } catch { return json({ error: "bad json" }, 400, cors); }
    if (d.company_url) return json({ ok: true }, 200, cors); // honeypot → silently accept, store nothing

    const name = (d.name || "").toString().trim();
    const email = (d.email || "").toString().trim();
    if (!name || !/.+@.+\..+/.test(email)) return json({ error: "name and valid email required" }, 422, cors);

    const fields = {
      Name: name.slice(0, 200),
      Email: email.slice(0, 200),
      Source: "Website",
      Status: "New",
      "Submitted At": new Date().toISOString(),
    };
    if (d.company)  fields.Firm = d.company.toString().slice(0, 200);
    if (d.phone)    fields.Phone = d.phone.toString().slice(0, 60);
    if (d.referral) fields["Heard Via"] = d.referral.toString().slice(0, 80);
    if (d.comments) fields["Biggest Leak"] = d.comments.toString().slice(0, 2000);

    const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${encodeURIComponent(env.AIRTABLE_TABLE)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.AIRTABLE_PAT}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    });
    if (!r.ok) return json({ error: "store failed" }, 502, cors);
    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
