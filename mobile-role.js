import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const role = window.ABN_APP_ROLE || "customer";
document.documentElement.dataset.abnRole = role;
document.body.classList.add("abn-role-" + role);

const css = document.createElement("style");
css.textContent = `
  body.abn-role-customer .public-site,
  body.abn-role-customer #addBusinessButton,
  body.abn-role-customer #statCta,
  body.abn-role-customer #bannerJoin,
  body.abn-role-customer #emptyAddBusiness,
  body.abn-role-customer #abnPlus,
  body.abn-role-customer #abnPortals { display:none !important; }

  body.abn-role-business .public-site,
  body.abn-role-business #abnPlus { display:none !important; }
  body.abn-role-business #abnPortals .portal-card[data-portal="customer"] { display:none !important; }

  body.abn-role-staff .content > *:not(#abnStaffHome) { display:none !important; }
  body.abn-role-staff .nav-list .nav-item[data-view] { display:none !important; }
  body.abn-role-staff #verificationNav { display:flex !important; }
  body.abn-role-staff .sidebar .help-card { display:none !important; }
  body.abn-role-staff .content { padding-top:20px; }
  #abnStaffHome { max-width:900px; margin:0 auto; }
  #abnStaffHome .staff-hero { background:#153b2d; color:#fff; border-radius:18px; padding:26px; }
  #abnStaffHome .staff-hero h1 { margin:8px 0; font-size:clamp(24px,5vw,36px); }
  #abnStaffHome .staff-hero p { color:#e2ece4; line-height:1.6; }
  #abnStaffHome .staff-actions { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-top:18px; }
  #abnStaffHome .staff-action { text-align:left; border:1px solid #dce6dc; border-radius:14px; padding:18px; background:#fff; color:#173528; cursor:pointer; }
  #abnStaffHome .staff-action strong { display:block; margin-bottom:7px; font-size:16px; }
  #abnStaffHome .staff-action span { color:#617368; font-size:13px; line-height:1.5; }
  #abnStaffHome .staff-note { margin-top:14px; padding:14px; border-radius:12px; background:#f4f6f1; color:#56675c; font-size:13px; line-height:1.6; }
`;
document.head.append(css);

if (role === "staff") {
  const content = document.querySelector(".content");
  const home = document.createElement("section");
  home.id = "abnStaffHome";
  home.innerHTML = `
    <div class="staff-hero">
      <span class="modal-kicker">ABN STAFF WORKSPACE</span>
      <h1>Business onboarding & verification</h1>
      <p>Review submitted verification requests and approve or reject applications. Access is checked by Supabase for your signed-in account.</p>
    </div>
    <div class="staff-actions">
      <button class="staff-action" id="abnStaffQueue"><strong>✓ Verification queue</strong><span>Review submitted business documents and make an authorized decision.</span></button>
      <button class="staff-action" id="abnStaffOnboarding"><strong>＋ Business onboarding</strong><span>Open the current business registration form. Do not create client records under a staff account; use owner-led registration until the secure invitation workflow is enabled.</span></button>
    </div>
    <div class="staff-note" id="abnStaffStatus" role="status">Staff access is not granted by installing this app. Your account must be authorized by ABN's database permissions.</div>
  `;
  content?.prepend(home);

  await import("./verification.js");
  const status = home.querySelector("#abnStaffStatus");
  home.querySelector("#abnStaffQueue").addEventListener("click", async () => {
    status.textContent = "Checking reviewer permissions…";
    try {
      const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) {
        status.textContent = "Please sign in with your authorized ABN staff account first.";
        document.querySelector("#loginButton")?.click();
        return;
      }
      const { data: allowed, error } = await db.rpc("is_abn_verification_authority");
      if (error || allowed !== true) {
        status.textContent = "Access denied. This account is not authorized to review verification requests. Contact the ABN administrator.";
        return;
      }
      status.textContent = "Access confirmed. The secure verification queue is opening.";
      document.querySelector("#verificationNav")?.click();
    } catch (e) {
      status.textContent = "Could not verify staff permissions. Check your connection and try again.";
    }
  });
  home.querySelector("#abnStaffOnboarding").addEventListener("click", () => {
    status.textContent = "Staff-led client onboarding is not enabled yet. To protect ownership records, do not create a client business under a staff account. The next step is a secure server-side invitation workflow that lets the client claim their own business profile.";
  });
}
