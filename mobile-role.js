import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const role = window.ABN_APP_ROLE || "customer";
document.documentElement.dataset.abnRole = role;
document.body.classList.add("abn-role-" + role);
const appNames = { customer: "ABN Customer", business: "ABN Business", staff: "ABN Staff" };
document.title = appNames[role] || "ABN";
const content = document.querySelector(".content");

const css = document.createElement("style");
css.textContent = `
  .brand-mark { width:42px !important; height:42px !important; padding:0 !important; overflow:hidden; border-radius:50% !important; background:#fff !important; }
  .brand-mark img { display:block; width:100%; height:100%; object-fit:cover; }
  .public-brand-mark { width:38px !important; height:38px !important; overflow:hidden; border-radius:50% !important; padding:0 !important; background:#fff !important; }
  .public-brand-mark img { width:100%; height:100%; display:block; object-fit:cover; }
  body.abn-role-customer .public-site,
  body.abn-role-customer #addBusinessButton,
  body.abn-role-customer #statCta,
  body.abn-role-customer #bannerJoin,
  body.abn-role-customer #emptyAddBusiness,
  body.abn-role-customer #abnPlus,
  body.abn-role-customer #abnPortals { display:none !important; }
  body.abn-role-business .public-site,
  body.abn-role-business #abnPlus,
  body.abn-role-business #abnPortals .portal-card[data-portal="customer"] { display:none !important; }
  body.abn-role-business .welcome-row,
  body.abn-role-business .hero-panel,
  body.abn-role-business .stats-grid,
  body.abn-role-business .bottom-banner { display:none !important; }
  body.abn-role-staff .public-site,
  body.abn-role-staff .content > *:not(#abnStaffHome) { display:none !important; }
  body.abn-role-staff .nav-list .nav-item[data-view] { display:none !important; }
  body.abn-role-staff #verificationNav { display:flex !important; }
  body.abn-role-staff .sidebar .help-card { display:none !important; }
  body.abn-role-staff .content { padding-top:20px; }
  #abnCustomerHome, #abnBusinessHome, #abnStaffHome { max-width:1000px; margin:0 auto 24px; }
  .abn-mobile-hero { display:flex; align-items:center; gap:16px; padding:24px; border-radius:20px; color:#fff; background:linear-gradient(120deg,#082d6a,#0b4d91); box-shadow:0 12px 28px #082d6a20; }
  .abn-mobile-hero img { width:76px; height:76px; object-fit:cover; border-radius:50%; border:2px solid #ffc42b; background:#fff; flex:none; }
  .abn-mobile-hero h1 { margin:5px 0 8px; font-size:clamp(23px,4vw,34px); line-height:1.12; letter-spacing:-.6px; }
  .abn-mobile-hero p { margin:0; max-width:600px; color:#e4edfa; font-size:13px; line-height:1.6; }
  .abn-mobile-kicker { font-size:9px; letter-spacing:1.5px; font-weight:850; color:#ffcf36; }
  .abn-business-actions { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; margin-top:16px; }
  .abn-business-action { display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:8px; min-height:132px; border:1px solid #dce5f1; border-radius:16px; padding:18px; background:#fff; color:#12335f; box-shadow:0 5px 18px #102f5a08; cursor:pointer; }
  .abn-business-action .action-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:11px; background:#fff2c7; color:#8c5a00; font-size:21px; font-weight:800; }
  .abn-business-action strong { font-size:15px; }
  .abn-business-action span:last-child { color:#6a7789; font-size:12px; line-height:1.5; }
  .abn-workspace-note { margin-top:14px; border-radius:12px; background:#edf4ff; color:#34516f; padding:13px 15px; font-size:12px; line-height:1.6; }
  #abnStaffHome { max-width:900px; }
  #abnStaffHome .staff-hero { background:#0a3477; color:#fff; border-radius:18px; padding:26px; }
  #abnStaffHome .staff-hero h1 { margin:8px 0; font-size:clamp(24px,5vw,36px); }
  #abnStaffHome .staff-hero p { color:#e2ecfa; line-height:1.6; }
  #abnStaffHome .staff-actions { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-top:18px; }
  #abnStaffHome .staff-action { text-align:left; border:1px solid #dce6f3; border-radius:14px; padding:18px; background:#fff; color:#17345b; cursor:pointer; }
  #abnStaffHome .staff-action strong { display:block; margin-bottom:7px; font-size:16px; }
  #abnStaffHome .staff-action span { color:#61738b; font-size:13px; line-height:1.5; }
  #abnStaffHome .staff-note { margin-top:14px; padding:14px; border-radius:12px; background:#f0f4fa; color:#56677d; font-size:13px; line-height:1.6; }
  @media(max-width:520px) {
    .abn-mobile-hero { padding:18px; align-items:flex-start; gap:12px; }
    .abn-mobile-hero img { width:58px; height:58px; }
    .abn-mobile-hero p { font-size:12px; }
  }
`;
document.head.append(css);

if (role === "customer") {
  const home = document.createElement("section");
  home.id = "abnCustomerHome";
  home.innerHTML = `
    <div class="abn-mobile-hero">
      <img src="./assets/abn-logo.svg" alt="ABN logo">
      <div><span class="abn-mobile-kicker">ABN CUSTOMER · DISCOVER & CONNECT</span>
      <h1>Find businesses you can trust.</h1>
      <p>Explore products, compare services, and contact businesses across India—all in one marketplace.</p></div>
    </div>`;
  content?.prepend(home);
  const heading = document.querySelector("#listingHeading");
  if (heading) heading.textContent = "Discover products and services";
}

if (role === "business") {
  const home = document.createElement("section");
  home.id = "abnBusinessHome";
  home.innerHTML = `
    <div class="abn-mobile-hero">
      <img src="./assets/abn-logo.svg" alt="ABN logo">
      <div><span class="abn-mobile-kicker">ABN BUSINESS · SELLER WORKSPACE</span>
      <h1>Grow your business with ABN.</h1>
      <p>Manage your business presence, create product or service listings, and reach new customers.</p></div>
    </div>
    <div class="abn-business-actions">
      <button class="abn-business-action" id="abnBizProfile"><span class="action-icon">▣</span><strong>Business profile</strong><span>Create or update your business information and contact details.</span></button>
      <button class="abn-business-action" id="abnBizListing"><span class="action-icon">＋</span><strong>Add product or service</strong><span>Create a marketplace listing for customers to discover.</span></button>
      <button class="abn-business-action" id="abnBizAccount"><span class="action-icon">◎</span><strong>Account settings</strong><span>Manage your ABN account and profile details.</span></button>
    </div>
    <div class="abn-workspace-note">Tip: sign in with the account that owns your business profile. Your listings and permissions are controlled by ABN's secure database rules.</div>`;
  content?.prepend(home);
  home.querySelector("#abnBizProfile").addEventListener("click", () => document.querySelector("#addBusinessButton")?.click());
  home.querySelector("#abnBizListing").addEventListener("click", () => document.querySelector("#statCta")?.click());
  home.querySelector("#abnBizAccount").addEventListener("click", () => document.querySelector("#accountNav")?.click());
  const heading = document.querySelector("#listingHeading");
  const description = document.querySelector("#marketplace .section-heading p");
  if (heading) heading.textContent = "Marketplace preview";
  if (description) description.textContent = "See how products and services appear to customers.";
}

if (role === "staff") {
  const home = document.createElement("section");
  home.id = "abnStaffHome";
  home.innerHTML = `
    <div class="staff-hero">
      <span class="abn-mobile-kicker">ABN STAFF · AUTHORIZED OPERATIONS</span>
      <h1>Business onboarding & verification</h1>
      <p>Review submitted verification requests and approve or reject applications. Access is checked by Supabase for your signed-in account.</p>
    </div>
    <div class="staff-actions">
      <button class="staff-action" id="abnStaffQueue"><strong>✓ Verification queue</strong><span>Review submitted business documents and make an authorized decision.</span></button>
      <button class="staff-action" id="abnStaffOnboarding"><strong>＋ Business onboarding</strong><span>Staff-led client onboarding is not enabled yet. Use owner-led registration until a secure invitation workflow is implemented.</span></button>
    </div>
    <div class="staff-note" id="abnStaffStatus" role="status">Installing this app does not grant reviewer access. Your account must be authorized by ABN's database permissions.</div>`;
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
    status.textContent = "Staff-led client onboarding is not enabled yet. To protect ownership records, do not create a client business under a staff account. A secure server-side invitation workflow is required before that feature can be enabled.";
  });
}
