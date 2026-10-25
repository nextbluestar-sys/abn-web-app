import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nav = document.createElement("button");
nav.className = "nav-item";
nav.type = "button";
nav.id = "verificationNav";
nav.innerHTML = '<span class="nav-icon">✓</span><span>Business verification</span>';
document.querySelector(".nav-list")?.append(nav);

const style = document.createElement("style");
style.textContent = `
.abn-verification-overlay{position:fixed;inset:0;background:rgba(13,30,21,.56);z-index:1000;display:grid;place-items:center;padding:18px}
.abn-verification-panel{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:clamp(20px,4vw,34px);box-shadow:0 24px 80px #102b1c40}
.abn-v-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px}
.abn-v-head h2{margin:5px 0 7px;font-size:25px;letter-spacing:-.7px;color:#172b22}
.abn-v-head p,.abn-v-note{color:#718077;font-size:13px;line-height:1.65;margin:0}
.abn-v-close{border:1px solid #e1e8e0;background:#fff;border-radius:9px;padding:8px 12px;color:#344a3b}
.abn-v-card{border:1px solid #e4eae3;border-radius:13px;padding:17px;margin:14px 0}
.abn-v-card h3{font-size:14px;margin:0 0 8px}
.abn-v-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.abn-v-field{display:grid;gap:7px;margin:13px 0}
.abn-v-field label{font-size:12px;font-weight:700;color:#405247}
.abn-v-field input,.abn-v-field select{width:100%;min-height:42px;padding:10px;border:1px solid #dfe7df;border-radius:9px;background:#fff;color:#172b22}
.abn-v-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.abn-v-status{display:inline-block;border-radius:20px;padding:5px 9px;background:#f5f0dc;color:#826a25;font-size:11px;font-weight:800;text-transform:capitalize}
.abn-v-status.verified{background:#e5f2e7;color:#28643a}.abn-v-status.rejected{background:#fae8e5;color:#963c32}.abn-v-status.in_review{background:#e8eff8;color:#315b8b}
.abn-v-list{display:grid;gap:9px}.abn-v-muted{font-size:12px;color:#718077;line-height:1.6}
@media(max-width:600px){.abn-v-grid{grid-template-columns:1fr}.abn-v-head h2{font-size:21px}}
`;
document.head.append(style);

function showToast(message) {
  const el = document.querySelector("#toast");
  if (el) { el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 4000); }
  else alert(message);
}
function openPanel() {
  document.querySelector(".abn-verification-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "abn-verification-overlay";
  overlay.innerHTML = `
    <section class="abn-verification-panel" role="dialog" aria-modal="true" aria-labelledby="abnVTitle">
      <div class="abn-v-head"><div><div class="eyebrow">ABN · BSVS INITIATIVE</div><h2 id="abnVTitle">Get your business verified</h2><p>Submit business proof for review by the ABN team. Approval is not automatic.</p></div><button class="abn-v-close" type="button" id="abnVClose">Close ✕</button></div>
      <div id="abnVBody"><p class="abn-v-muted">Loading your businesses…</p></div>
    </section>`;
  document.body.append(overlay);
  overlay.querySelector("#abnVClose").onclick = () => overlay.remove();
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  renderPanel(overlay);
}
async function renderPanel(overlay) {
  const body = overlay.querySelector("#abnVBody");
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    body.innerHTML = '<div class="abn-v-card"><h3>Sign in to continue</h3><p class="abn-v-muted">Sign in to ABN first, then open Business verification again.</p><button class="button button-primary" id="abnVSignIn">Sign in</button></div>';
    body.querySelector("#abnVSignIn").onclick = () => { overlay.remove(); document.querySelector("#loginButton")?.click(); };
    return;
  }
  const [{ data: businesses, error: bizError }, { data: requests, error: reqError }] = await Promise.all([
    db.from("abn_businesses").select("id,name,category,city,state,verification_status,gstin,website").eq("owner_id", user.id).order("created_at", { ascending: false }),
    db.rpc("get_my_abn_verification_requests")
  ]);
  if (bizError) { body.innerHTML = '<p class="abn-v-muted">Could not load your businesses. Please refresh and try again.</p>'; return; }
  const requestList = reqError ? [] : (requests || []);
  const statusText = s => s === "in_review" ? "In review" : (s || "pending");
  const requestCards = requestList.length ? requestList.map(r => `
    <article class="abn-v-card">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(r.business_name || "Business verification")}</h3><span class="abn-v-status ${esc(r.request_status)}">${esc(statusText(r.request_status))}</span></div>
      <p class="abn-v-muted">Proof type: ${esc(r.verification_type)} · Submitted: ${esc(new Date(r.submitted_at).toLocaleDateString("en-IN"))}</p>
      ${r.reviewer_notes ? `<p class="abn-v-muted"><strong>Review note:</strong> ${esc(r.reviewer_notes)}</p>` : ""}
    </article>`).join("") : '<p class="abn-v-muted">You have not submitted a verification request yet.</p>';
  const options = (businesses || []).map(b => `<option value="${esc(b.id)}">${esc(b.name)} · ${esc(b.verification_status)}</option>`).join("");
  body.innerHTML = `
    <div class="abn-v-card"><h3>Verification checklist</h3><p class="abn-v-note">Use a valid document that matches your business details: GST registration, Udyam/MSME certificate, shop or establishment licence, or business registration proof. Upload clear files only. Do not upload Aadhaar, PAN card photos, bank details, passwords, or unrelated personal documents.</p></div>
    <div class="abn-v-card">
      <h3>Submit a request</h3>
      ${businesses?.length ? `
      <form id="abnVForm">
        <div class="abn-v-grid">
          <div class="abn-v-field"><label for="abnVBusiness">Business to verify *</label><select id="abnVBusiness" required>${options}</select></div>
          <div class="abn-v-field"><label for="abnVType">Document type *</label><select id="abnVType" required><option value="gstin">GST registration</option><option value="udyam">Udyam / MSME certificate</option><option value="shop_license">Shop / establishment licence</option><option value="business_registration">Business registration proof</option><option value="other">Other business proof</option></select></div>
        </div>
        <div class="abn-v-field"><label for="abnVFiles">Upload proof (PDF, JPG, PNG; up to 5 files, 8 MB each)</label><input id="abnVFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple></div>
        <p class="abn-v-muted">Documents are stored in a private bucket and are not displayed publicly. An authorised reviewer must approve the request before your business is marked verified.</p>
        <div class="abn-v-actions"><button class="button button-primary" id="abnVSubmit" type="submit">Submit for verification</button></div>
      </form>` : '<p class="abn-v-muted">You have no business profile yet. Create one with “List your business”, then return here to request verification.</p>'}
    </div>
    <div class="abn-v-card"><h3>Your verification requests</h3><div class="abn-v-list">${requestCards}</div></div>`;
  const form = body.querySelector("#abnVForm");
  if (!form) return;
  form.onsubmit = async e => {
    e.preventDefault();
    const button = body.querySelector("#abnVSubmit");
    const files = [...body.querySelector("#abnVFiles").files];
    if (files.length > 5) { showToast("Please upload no more than five files."); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    for (const file of files) {
      if (!allowed.includes(file.type) || file.size > 8 * 1024 * 1024) {
        showToast("Each file must be PDF, JPG, or PNG and no larger than 8 MB."); return;
      }
    }
    button.disabled = true; button.textContent = "Uploading and submitting…";
    const paths = [];
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop().toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await db.storage.from("abn-private-verification").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await db.rpc("submit_abn_verification_request", {
        p_business_id: body.querySelector("#abnVBusiness").value,
        p_verification_type: body.querySelector("#abnVType").value,
        p_private_document_paths: paths
      });
      if (error) throw error;
      showToast("Verification request submitted. Track its status in this window.");
      await renderPanel(overlay);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not submit verification request.");
      button.disabled = false; button.textContent = "Submit for verification";
    }
  };
}
nav.addEventListener("click", openPanel);
