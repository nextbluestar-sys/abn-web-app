import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const root = document.querySelector(".content");
if (root) {
  const portal = document.createElement("section");
  portal.id = "abnPortals";
  portal.className = "abn-portals";
  portal.innerHTML = `
    <div class="portal-intro"><div><span class="portal-kicker">ONE NETWORK · THREE SECURE WORKSPACES</span><h2>Choose your ABN workspace</h2><p>Each portal shows only the information your account is allowed to access.</p></div><span class="portal-lock">⌑ Access controlled</span></div>
    <div class="portal-cards">
      <button class="portal-card" data-portal="customer"><span class="portal-icon">⌕</span><strong>Customer portal</strong><small>Discover approved businesses, manage enquiries and request quotes.</small><span class="portal-open">Open workspace ↗</span></button>
      <button class="portal-card" data-portal="business"><span class="portal-icon">▦</span><strong>Business / shopkeeper</strong><small>Manage your business profile, contacts, service listings and customer enquiries.</small><span class="portal-open">Manage business ↗</span></button>
      <button class="portal-card portal-admin" data-portal="admin"><span class="portal-icon">⌘</span><strong>Sansthan administration</strong><small>Review submissions and publish approved real businesses only.</small><span class="portal-open">Secure admin access ↗</span></button>
    </div>
    <div id="abnPortalPanel" class="portal-panel hidden" aria-live="polite"></div>`;
  root.insertBefore(portal, root.firstChild);
  const panel = portal.querySelector("#abnPortalPanel");
  const note = msg => { panel.innerHTML = `<div class="portal-message">${esc(msg)}</div>`; panel.classList.remove("hidden"); };
  const heading = (title, sub) => `<div class="portal-panel-head"><div><span class="portal-kicker">ABN WORKSPACE</span><h3>${esc(title)}</h3><p>${esc(sub)}</p></div><button class="button button-outline" id="closePortal">Close</button></div>`;
  const close = () => { panel.classList.add("hidden"); panel.innerHTML = ""; };
  async function openPortal(kind) {
    panel.classList.remove("hidden");
    panel.innerHTML = '<div class="portal-message">Checking your secure session…</div>';
    const {data:{user}} = await db.auth.getUser();
    if (!user) { note("Please sign in first. Use the Sign in button at the top of the page, then reopen this workspace."); return; }
    if (kind === "admin") {
      const {data:isAdmin,error} = await db.rpc("abn_is_sansthan_admin");
      if (error || !isAdmin) { note("Access denied. This account is not assigned the Sansthan administrator role. Ask an authorized administrator to grant access; changing profile text cannot grant admin rights."); return; }
      await adminWorkspace();
      return;
    }
    if (kind === "customer") { await customerWorkspace(user); return; }
    await businessWorkspace(user);
  }
  async function customerWorkspace(user) {
    const {data,error} = await db.from("abn_enquiries").select("id,message,enquiry_type,status,created_at,abn_businesses(name,city,state)").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(50);
    if (error) return note("Could not load your enquiries. Please try again.");
    panel.innerHTML = heading("Customer portal","Your private enquiries and conversations.") + `
      <div class="portal-metrics"><div><strong>${data.length}</strong><small>Your enquiries</small></div><div><strong>Verified only</strong><small>Public businesses</small></div></div>
      <h4>Recent enquiries</h4>${data.length ? data.map(x=>`<article class="portal-row"><div><strong>${esc(x.abn_businesses?.name||"Business")}</strong><p>${esc(x.message)}</p><small>${esc(x.enquiry_type)} · ${esc(x.status)} · ${new Date(x.created_at).toLocaleDateString("en-IN")}</small></div></article>`).join("") : '<div class="portal-message">No enquiries yet. Browse the marketplace and contact an approved business to get started.</div>'}`;
    panel.querySelector("#closePortal").onclick=close;
  }
  async function businessWorkspace(user) {
    const {data:businesses,error} = await db.from("abn_businesses").select("id,name,category,city,state,is_active,verification_status,cover_image_url").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(50);
    if(error) return note("Could not load your business profiles. Please retry after signing in.");
    panel.innerHTML = heading("Business / shopkeeper portal","Only your own business records are shown.") + `
      <div class="portal-metrics"><div><strong>${businesses.length}</strong><small>Your businesses</small></div><div><strong>Private</strong><small>Owner-scoped records</small></div></div>
      <div class="portal-toolbar"><span>Business profiles and contacts</span><small>Add contacts to a profile below.</small></div>
      ${businesses.length ? businesses.map(b=>`<article class="portal-row portal-business" data-business="${esc(b.id)}"><div class="portal-business-main">${b.cover_image_url?`<img src="${esc(b.cover_image_url)}" alt="" loading="lazy">`:'<span class="portal-avatar">ABN</span>'}<div><strong>${esc(b.name)}</strong><p>${esc([b.city,b.state].filter(Boolean).join(", ")||"Location not set")} · ${esc(b.category||"Business")}</p><small>Status: ${esc(b.verification_status||"pending")} · ${b.is_active?"Active":"Inactive"}</small></div></div><button class="button button-outline" data-contacts="${esc(b.id)}">Manage contacts</button></article>`).join("") : '<div class="portal-message">No business profile found for this account. Create one using “List your business”.</div>'}`;
    panel.querySelector("#closePortal").onclick=close;
    panel.querySelectorAll("[data-contacts]").forEach(btn=>btn.onclick=()=>contactsWorkspace(btn.dataset.contacts,businesses.find(b=>b.id===btn.dataset.contacts),user));
  }
  async function contactsWorkspace(id,business,user) {
    const {data:contacts,error}=await db.from("abn_business_contacts").select("id,contact_name,designation,phone,email,is_primary").eq("business_id",id).order("is_primary",{ascending:false});
    if(error) return note("Unable to load contacts. Confirm this business belongs to your account.");
    panel.innerHTML = heading("Business contacts",business?.name||"Your business") + `
      <form id="contactForm" class="portal-contact-form">
        <label>Contact name<input name="name" required maxlength="120" placeholder="Full name"></label>
        <label>Designation<input name="designation" maxlength="120" placeholder="Owner, Sales, Support"></label>
        <label>Phone<input name="phone" type="tel" maxlength="30" placeholder="+91…"></label>
        <label>Email<input name="email" type="email" maxlength="254" placeholder="contact@business.in"></label>
        <label class="portal-check"><input name="primary" type="checkbox"> Primary contact</label>
        <button class="button button-primary" type="submit">Add contact</button>
      </form>
      <h4>Saved contacts (${contacts.length})</h4>
      ${contacts.map(c=>`<article class="portal-row"><div><strong>${esc(c.contact_name)} ${c.is_primary?"· Primary":""}</strong><p>${esc(c.designation||"")} · ${esc(c.phone||"")} · ${esc(c.email||"")}</p></div><button class="button button-outline" data-delete-contact="${esc(c.id)}">Remove</button></article>`).join("")||'<div class="portal-message">No additional contacts yet.</div>'}`;
    panel.querySelector("#closePortal").onclick=()=>businessWorkspace(user);
    panel.querySelector("#contactForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await db.from("abn_business_contacts").insert({business_id:id,contact_name:String(f.get("name")).trim(),designation:String(f.get("designation")||"").trim()||null,phone:String(f.get("phone")||"").trim()||null,email:String(f.get("email")||"").trim()||null,is_primary:f.get("primary")==="on"});if(error)return note("Contact could not be saved. Please check the details and retry.");await contactsWorkspace(id,business,user);};
    panel.querySelectorAll("[data-delete-contact]").forEach(btn=>btn.onclick=async()=>{const {error}=await db.from("abn_business_contacts").delete().eq("id",btn.dataset.deleteContact);if(error)return note("Contact could not be removed.");await contactsWorkspace(id,business,user);});
  }
  async function adminWorkspace() {
    const {data:businesses,error} = await db.from("abn_businesses").select("id,name,category,city,state,is_active,verification_status,created_at").order("created_at",{ascending:false}).limit(100);
    if(error) return note("Admin access is valid, but the review queue could not be loaded. Check admin RLS policies.");
    panel.innerHTML = heading("Sansthan administration","Review business submissions. Publishing is reserved for authorized staff.") + `
      <div class="portal-metrics"><div><strong>${businesses.length}</strong><small>Review queue records</small></div><div><strong>${businesses.filter(b=>b.verification_status==="verified"&&b.is_active).length}</strong><small>Active verified</small></div></div>
      <div class="portal-toolbar"><span>Business review queue</span><small>Test profiles remain inactive and unpublished.</small></div>
      ${businesses.map(b=>`<article class="portal-row admin-row"><div><strong>${esc(b.name)}</strong><p>${esc([b.city,b.state].filter(Boolean).join(", ")||"India")} · ${esc(b.category||"Business")}</p><small>${esc(b.verification_status||"pending")} · ${b.is_active?"Active":"Inactive"}</small></div><div class="portal-admin-actions"><button class="button button-outline" data-review="${esc(b.id)}" data-state="pending">Pending</button><button class="button button-primary" data-review="${esc(b.id)}" data-state="verified">Approve</button></div></article>`).join("")}`;
    panel.querySelector("#closePortal").onclick=close;
    panel.querySelectorAll("[data-review]").forEach(btn=>btn.onclick=async()=>{const status=btn.dataset.state;const {error}=await db.from("abn_businesses").update({verification_status:status,is_active:status==="verified"}).eq("id",btn.dataset.review);if(error)return note("Review update failed. Confirm the admin role and database permissions.");await adminWorkspace();});
  }
  portal.querySelectorAll("[data-portal]").forEach(btn=>btn.addEventListener("click",()=>openPortal(btn.dataset.portal)));
  panel.addEventListener("click",e=>{if(e.target.id==="closePortal")close();});
}
