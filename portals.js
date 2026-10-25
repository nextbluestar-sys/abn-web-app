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
    <div class="portal-intro"><div><span class="portal-kicker">ONE NETWORK · TWO SECURE WORKSPACES</span><h2>Choose your ABN workspace</h2><p>Each portal shows only the information your account is allowed to access.</p></div><span class="portal-lock">⌑ Access controlled</span></div>
    <div class="portal-cards">
      <button class="portal-card" data-portal="customer"><span class="portal-icon">⌕</span><strong>Customer portal</strong><small>Discover published businesses, manage enquiries and request quotes.</small><span class="portal-open">Open workspace ↗</span></button>
      <button class="portal-card" data-portal="business"><span class="portal-icon">▦</span><strong>Business / shopkeeper</strong><small>Manage your business profile, contacts, service listings and customer enquiries.</small><span class="portal-open">Manage business ↗</span></button>
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
    if (kind === "customer") { await customerWorkspace(user); return; }
    await businessWorkspace(user);
  }
  async function customerWorkspace(user) {
    const {data,error} = await db.from("abn_enquiries").select("id,message,enquiry_type,status,created_at,abn_businesses(name,city,state)").eq("buyer_id",user.id).order("created_at",{ascending:false}).limit(50);
    if (error) return note("Could not load your enquiries. Please try again.");
    panel.innerHTML = heading("Customer portal","Your private enquiries and conversations.") + `
      <div class="portal-metrics"><div><strong>${data.length}</strong><small>Your enquiries</small></div><div><strong>Auto-published</strong><small>Business listings</small></div></div>
      <h4>Recent enquiries</h4>${data.length ? data.map(x=>`<article class="portal-row"><div><strong>${esc(x.abn_businesses?.name||"Business")}</strong><p>${esc(x.message)}</p><small>${esc(x.enquiry_type)} · ${esc(x.status)} · ${new Date(x.created_at).toLocaleDateString("en-IN")}</small></div></article>`).join("") : '<div class="portal-message">No enquiries yet. Browse the marketplace and contact a listed business to get started.</div>'}`;
    panel.querySelector("#closePortal").onclick=close;
  }
  async function businessWorkspace(user) {
    const {data:businesses,error} = await db.from("abn_businesses").select("id,name,category,city,state,is_active,verification_status,cover_image_url").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(50);
    if(error) return note("Could not load your business profiles. Please retry after signing in.");
    panel.innerHTML = heading("Business / shopkeeper portal","Only your own business records are shown.") + `
      <div class="portal-metrics"><div><strong>${businesses.length}</strong><small>Your businesses</small></div><div><strong>Private</strong><small>Owner-scoped records</small></div></div>
      <div class="portal-toolbar"><span>Business profiles and contacts</span><small>Add contacts to a profile below.</small></div>
      ${businesses.length ? businesses.map(b=>`<article class="portal-row portal-business" data-business="${esc(b.id)}"><div class="portal-business-main">${b.cover_image_url?`<img src="${esc(b.cover_image_url)}" alt="" loading="lazy">`:'<span class="portal-avatar">ABN</span>'}<div><strong>${esc(b.name)}</strong><p>${esc([b.city,b.state].filter(Boolean).join(", ")||"Location not set")} · ${esc(b.category||"Business")}</p><small>Publishing: ${b.is_active?"Live":"Inactive"} · automatic</small></div></div><button class="button button-outline" data-contacts="${esc(b.id)}">Manage contacts</button></article>`).join("") : '<div class="portal-message">No business profile found for this account. Create one using “List your business”. New genuine profiles publish automatically.</div>'}`;
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
  portal.querySelectorAll("[data-portal]").forEach(btn=>btn.addEventListener("click",()=>openPortal(btn.dataset.portal)));
  panel.addEventListener("click",e=>{if(e.target.id==="closePortal")close();});
}
