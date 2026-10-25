import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let currentUser = null;
let currentProfile = null;
let allListings = [];
let activeFilter = "all";
let currentView = "discover";
let language = localStorage.getItem("abn-language") || "en";
let toastTimer;
let nearbyOrigin=null;
let selectedBusinessPoint=null;
const INDIA_STATES=["Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
function stateOptions(id){return '<select id="'+id+'"><option value="">Select state / UT</option>'+INDIA_STATES.map(s=>'<option>'+s+'</option>').join('')+'</select>'}
function distanceKm(a,b){const rad=n=>n*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function requestGPS(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error("Location is not supported by this browser."));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),()=>reject(new Error("Location permission was denied. You can search by state or city instead.")),{enableHighAccuracy:true,timeout:12000,maximumAge:60000})})}
async function uploadBusinessImage(file){if(!file)return null;if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error("Choose a JPG, PNG or WebP image.");if(file.size>5*1024*1024)throw new Error("Image must be smaller than 5 MB.");const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=currentUser.id+"/"+crypto.randomUUID()+"."+ext;const {error}=await supabase.storage.from("abn-business-images").upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return supabase.storage.from("abn-business-images").getPublicUrl(path).data.publicUrl}
function setupBusinessMap(){const mapEl=$("#bizMap");if(!mapEl)return;const status=$("#bizMapStatus");const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.append(link);import("https://esm.sh/leaflet@1.9.4").then(({default:L})=>{const map=L.map(mapEl).setView([22.9734,78.6569],5);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);let marker=null;const pin=(lat,lon)=>{selectedBusinessPoint={lat,lon};if(marker)marker.setLatLng([lat,lon]);else{marker=L.marker([lat,lon],{draggable:true}).addTo(map);marker.on("dragend",()=>{const p=marker.getLatLng();selectedBusinessPoint={lat:p.lat,lon:p.lng};status.textContent="Pinned: "+p.lat.toFixed(5)+", "+p.lng.toFixed(5)})}status.textContent="Pinned: "+lat.toFixed(5)+", "+lon.toFixed(5)};map.on("click",e=>pin(e.latlng.lat,e.latlng.lng));$("#bizUseGPS").onclick=async()=>{try{const p=await requestGPS();map.setView([p.lat,p.lon],15);pin(p.lat,p.lon)}catch(e){toast(e.message)}};window.setTimeout(()=>map.invalidateSize(),150)}).catch(()=>{status.textContent="Map could not load. You can still enter your address manually."})}
function enableNearby(){requestGPS().then(p=>{nearbyOrigin=p;applyFilters();toast("Showing listings with locations nearest to you.")}).catch(e=>toast(e.message))}

const words = {
  en: {discover:"Discover",businesses:"Businesses",services:"Services",enquiries:"My enquiries",account:"Account",network:"YOUR NETWORK. YOUR GROWTH.",heroLead:"Discover suppliers, shop from businesses, and find trusted professionals across India.",addBusiness:"List your business",signIn:"Sign in",signOut:"Sign out"},
  hi: {discover:"खोजें",businesses:"व्यवसाय",services:"सेवाएँ",enquiries:"मेरी पूछताछ",account:"खाता",network:"आपका नेटवर्क। आपकी प्रगति।",heroLead:"भारत भर में आपूर्तिकर्ता, व्यवसाय और भरोसेमंद पेशेवर खोजें।",addBusiness:"अपना व्यवसाय जोड़ें",signIn:"साइन इन",signOut:"साइन आउट"},
  mr: {discover:"शोधा",businesses:"व्यवसाय",services:"सेवा",enquiries:"माझ्या चौकशा",account:"खाते",network:"तुमचे नेटवर्क. तुमची प्रगती.",heroLead:"भारतभर पुरवठादार, व्यवसाय आणि विश्वासार्ह व्यावसायिक शोधा.",addBusiness:"व्यवसाय नोंदवा",signIn:"साइन इन",signOut:"साइन आउट"}
};
const icons = ["▧","✳","◈","⌂","◌","▦","◇","✦"];
const tones = ["tone-green","tone-gold","tone-blue","tone-rose","tone-lilac"];
const toneClass = ["","tone-gold","tone-blue","tone-rose","tone-lilac"];
const glyphs = {product:"▧",service:"✳",b2b:"◈"};
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3500)}
function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function slugify(value){return String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,75)||"business"}
function money(value){if(value===null||value===undefined||value==="")return "Ask for quote";return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value))}
function showModal(title,html){$("#modalTitle").textContent=title;$("#modalContent").innerHTML=html;$("#modalBackdrop").classList.remove("hidden");document.body.style.overflow="hidden"}
function closeModal(){$("#modalBackdrop").classList.add("hidden");document.body.style.overflow=""}
function updateAuthUI(){
  $("#loginButton").textContent=currentUser?"Sign out":(words[language]?.signIn||"Sign in");
  $("#avatarButton").textContent=currentProfile?.display_name?.trim()?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "?";
  $("#addBusinessButton").innerHTML=`<span>＋</span> <span>${words[language]?.addBusiness||"List your business"}</span>`;
}
function applyLanguage(){
  document.documentElement.lang=language;
  $("#languageSelect").value=language;
  $$("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(words[language]?.[key])el.textContent=words[language][key]});
  updateAuthUI();
}
function setView(view){
  currentView=view;
  $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const labels={discover:"Discover",business:"Businesses",services:"Services",enquiries:"My enquiries"};
  $("#pageTitle").textContent=labels[view]||"Discover";
  if(view==="enquiries"){loadMyEnquiries();return}
  if(view==="business"){activeFilter="all";renderListings(allListings.filter(x=>x.abn_businesses));$("#listingHeading").textContent="Businesses listed & listings"}
  else if(view==="services"){activeFilter="service";$$(".filter-tab").forEach(b=>b.classList.toggle("active",b.dataset.filter==="service"));renderListings(allListings.filter(x=>x.listing_type==="service"));$("#listingHeading").textContent="Professional services"}
  else{$("#listingHeading").textContent="Explore opportunities";applyFilters()}
  if(window.innerWidth<=850)$("#sidebar").classList.remove("open");
}
function listingCard(item,index){
  const business=item.abn_businesses||{};
  const service=item.listing_type==="service";
  const wholesale=(item.category||"").toLowerCase().includes("wholesale")||(item.category||"").toLowerCase().includes("bulk");
  const tone=toneClass[index%toneClass.length];
  const symbol=service?"✳":(wholesale?"◈":"▧");
  const city=[business.city||item.city,business.state||item.state].filter(Boolean).join(", ");
  const price=item.price==null?"Ask for quote":money(item.price)+(item.unit?` <small>/ ${escapeHtml(item.unit)}</small>`:"");
  return `<article class="listing-card">
    <div class="listing-visual ${tone}">${business.cover_image_url?`<img class="listing-cover" src="${"${escapeHtml(business.cover_image_url)}"}" alt="${"${escapeHtml(business.name||"Business")}"} image" loading="lazy">`:""}<span class="listing-type">${service?"SERVICE":(wholesale?"B2B · WHOLESALE":"PRODUCT · B2C")}</span><span class="verified-pill">ABN listing</span><div class="visual-symbol">${symbol}</div></div>
    <div class="listing-body"><div class="listing-meta"><span class="listing-category">${escapeHtml(item.category||"General")}</span><span>${escapeHtml(city||"India")}</span></div>
    <h3>${escapeHtml(item.title)}</h3><p class="listing-desc">${escapeHtml(item.description||"Connect with this business for details, availability, and quotations.")}</p>
    <div class="listing-business"><span class="business-avatar">${escapeHtml((business.name||"A").slice(0,1).toUpperCase())}</span><span>${escapeHtml(business.name||"ABN business")}</span><span>✓</span></div>
    <div class="listing-bottom"><div class="listing-price">${price}</div><button class="mini-action" data-enquire="${escapeHtml(item.id)}">Enquire ↗</button></div></div></article>`;
}
function renderListings(items){
  const grid=$("#listingGrid"),empty=$("#emptyState");
  $("#resultsLabel").textContent=`${items.length} listing${items.length===1?"":"s"} available`;
  grid.innerHTML=items.map((x,i)=>listingCard(x,i)).join("");
  grid.classList.toggle("hidden",items.length===0);empty.classList.toggle("hidden",items.length!==0);
  $$("[data-enquire]",grid).forEach(btn=>btn.addEventListener("click",()=>startEnquiry(btn.dataset.enquire)));
  const services=allListings.filter(x=>x.listing_type==="service").length;
  $("#statListings").textContent=allListings.length.toLocaleString("en-IN");
  $("#statServices").textContent=services.toLocaleString("en-IN");
  const businessIds=new Set(allListings.map(x=>x.business_id));
  $("#statBusinesses").textContent=businessIds.size.toLocaleString("en-IN");
}
function applyFilters(){
  const q=$("#searchInput").value.trim().toLowerCase();
  let items=[...allListings];
  if(nearbyOrigin)items=items.filter(x=>x.abn_businesses?.latitude!=null&&x.abn_businesses?.longitude!=null&&Number.isFinite(Number(x.abn_businesses.latitude))&&Number.isFinite(Number(x.abn_businesses.longitude))&&distanceKm(nearbyOrigin,{lat:Number(x.abn_businesses.latitude),lon:Number(x.abn_businesses.longitude)})<=50).sort((a,b)=>distanceKm(nearbyOrigin,{lat:Number(a.abn_businesses.latitude),lon:Number(a.abn_businesses.longitude)})-distanceKm(nearbyOrigin,{lat:Number(b.abn_businesses.latitude),lon:Number(b.abn_businesses.longitude)}));
  if(activeFilter==="product")items=items.filter(x=>x.listing_type==="product");
  if(activeFilter==="service")items=items.filter(x=>x.listing_type==="service");
  if(activeFilter==="b2b")items=items.filter(x=>/wholesale|bulk|supplier|b2b/i.test(`${x.category} ${x.title} ${x.description}`));
  if(q)items=items.filter(x=>`${x.title} ${x.description} ${x.category} ${x.abn_businesses?.name||""} ${x.abn_businesses?.city||""} ${x.abn_businesses?.state||""}`.toLowerCase().includes(q));
  renderListings(items);
}
async function loadListings(){
  $("#listingGrid").innerHTML='<div class="loading-card"><span class="spinner"></span> Loading marketplace listings…</div>';
  const {data,error}=await supabase.from("abn_listings").select("id,business_id,created_by,listing_type,title,description,category,price,unit,city,state,status,abn_businesses!inner(name,city,state,phone,is_active,latitude,longitude,cover_image_url,address_line,pincode)").eq("status","published").eq("abn_businesses.is_active",true).order("created_at",{ascending:false}).limit(60);
  if(error){console.error(error);allListings=[];renderListings([]);$("#resultsLabel").textContent="Marketplace connection needs attention";toast("Could not load listings. Check the Supabase setup and table permissions.");return}
  allListings=data||[];applyFilters();
}
async function refreshProfile(){
  currentUser=(await supabase.auth.getUser()).data.user||null;
  currentProfile=null;
  if(currentUser){const {data}=await supabase.from("abn_profiles").select("*").eq("id",currentUser.id).maybeSingle();currentProfile=data||null}
  updateAuthUI();
}
function authForm(mode="signin"){
  const signup=mode==="signup";
  showModal(signup?"Create your ABN account":"Sign in to ABN",`
    <form id="authForm">
      ${signup?`<div class="field"><label for="displayName">Full name</label><input id="displayName" name="displayName" autocomplete="name" required maxlength="120" placeholder="Your name"></div>`:""}
      <div class="field"><label for="authEmail">Email address</label><input id="authEmail" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
      <div class="field"><label for="authPassword">Password</label><input id="authPassword" name="password" type="password" autocomplete="${signup?"new-password":"current-password"}" required minlength="8" placeholder="At least 8 characters"></div>
      ${signup?`<div class="form-grid"><div class="field"><label for="accountType">I want to</label><select id="accountType"><option value="consumer">Buy / find services</option><option value="business_owner">List my business</option><option value="service_provider">Offer services</option><option value="business_and_services">Business & services</option></select></div><div class="field"><label for="signupLanguage">Preferred language</label><select id="signupLanguage"><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></div></div>`:""}
      <p class="form-help">${signup?"By continuing, you agree to use ABN responsibly. Business and service listings can be published directly.":"If email confirmation is enabled, use the link sent to your inbox before signing in."}</p>
      <div class="form-actions"><button class="button button-primary" type="submit">${signup?"Create account":"Sign in"}</button><button class="button button-outline" type="button" id="cancelAuth">Cancel</button></div>
    </form>
    <div class="modal-switch">${signup?"Already have an account?":"New to ABN?"} <button type="button" id="switchAuth">${signup?"Sign in":"Create an account"}</button></div>`);
  $("#cancelAuth").onclick=closeModal;$("#switchAuth").onclick=()=>authForm(signup?"signin":"signup");
  const googleButton=document.createElement("button");
  googleButton.type="button";
  googleButton.className="button button-outline";
  googleButton.style.width="100%";
  googleButton.style.marginTop="12px";
  googleButton.innerHTML='<span aria-hidden="true" style="font-weight:700;margin-right:8px">G</span> Continue with Google';
  $("#authForm").insertAdjacentElement("afterend",googleButton);
  googleButton.addEventListener("click",async()=>{
    googleButton.disabled=true;
    googleButton.textContent="Connecting to Google…";
    const {error}=await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:"https://nextbluestar-sys.github.io/abn-web-app/"}
    });
    if(error){toast(error.message||"Google sign-in could not start.");googleButton.disabled=false;googleButton.textContent="Continue with Google";}
  });
  $("#authForm").onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget);const email=String(f.get("email")).trim();const password=String(f.get("password"));
    const submit=$("button[type=submit]",e.currentTarget);submit.disabled=true;submit.textContent=signup?"Creating…":"Signing in…";
    try{
      let result;
      if(signup){
        result=await supabase.auth.signUp({email,password,options:{emailRedirectTo:"https://nextbluestar-sys.github.io/abn-web-app/",data:{display_name:String(f.get("displayName")).trim(),preferred_language:$("#signupLanguage").value,account_type:$("#accountType").value}}});
        if(result.error)throw result.error;
        if(result.data.session){currentUser=result.data.user;await refreshProfile();closeModal();toast("Account created. Welcome to ABN!");}
        else{closeModal();toast("Account created. Check your email to confirm, then sign in.");}
      }else{
        result=await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;
        await refreshProfile();closeModal();toast("Signed in successfully.");
      }
    }catch(err){toast(err.message||"Authentication failed.");submit.disabled=false;submit.textContent=signup?"Create account":"Sign in"}
  };
}
function requireAuth(next){if(!currentUser){authForm("signin");return false}if(next)next();return true}
function addBusinessForm(){
 if(!requireAuth())return;
 showModal("List your business",`<p class="form-help">Create your public business profile and start connecting with customers. No verification step is required.</p>
 <form id="businessForm"><div class="form-grid">
 <div class="field full"><label for="bizName">Business name *</label><input id="bizName" required maxlength="160" placeholder="e.g. Sunrise Industrial Supplies"></div>
 <div class="field"><label for="bizCategory">Category *</label><select id="bizCategory" required><option value="">Choose category</option><option>Manufacturing</option><option>Wholesale & distribution</option><option>Retail</option><option>Food & agriculture</option><option>Technology & IT</option><option>Education & training</option><option>Healthcare</option><option>Professional services</option><option>Construction & trades</option><option>Other</option></select></div>
 <div class="field"><label for="bizPhone">Business phone</label><input id="bizPhone" type="tel" maxlength="20" placeholder="+91…"></div>
 <div class="field"><label for="bizEmail">Business email</label><input id="bizEmail" type="email" placeholder="business@example.com"></div>
 <div class="field"><label for="bizWebsite">Website</label><input id="bizWebsite" type="url" placeholder="https://…"></div>
  <div class="field full"><label for="bizCover">Business / shop photo</label><input id="bizCover" type="file" accept="image/jpeg,image/png,image/webp"><small class="form-help">JPG, PNG or WebP · maximum 5 MB</small><img id="bizImagePreview" class="image-preview hidden" alt="Business photo preview"></div>
  <div class="field full"><label for="bizAddress">Street / full address</label><input id="bizAddress" maxlength="240" placeholder="Shop, building, street, landmark"></div>
  <div class="field"><label for="bizState">State / Union Territory</label>${stateOptions("bizState")}</div>
  <div class="field"><label for="bizCity">City / District / Town</label><input id="bizCity" maxlength="100" placeholder="City or district"></div>
  <div class="field"><label for="bizPincode">PIN code</label><input id="bizPincode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="6-digit PIN"></div>
  <div class="field full"><label>Pin your business location</label><div class="map-toolbar"><button type="button" class="button button-outline" id="bizUseGPS">◎ Use current GPS</button><span id="bizMapStatus" class="form-help">Tap the map to set your location, or drag the pin.</span></div><div id="bizMap" class="business-location-map"></div></div>
 <div class="field full"><label for="bizDescription">About your business</label><textarea id="bizDescription" maxlength="3000" placeholder="What do you offer? Who do you serve?"></textarea></div>
 </div><p class="form-help">Avoid entering private identity documents or sensitive community information in public fields.</p><div class="form-actions"><button class="button button-primary" type="submit">Submit business</button><button class="button button-outline" type="button" id="cancelBiz">Cancel</button></div></form>`);
  selectedBusinessPoint=null;
  $("#bizCover").onchange=()=>{const file=$("#bizCover").files[0],preview=$("#bizImagePreview");if(file){preview.src=URL.createObjectURL(file);preview.classList.remove("hidden")}else preview.classList.add("hidden")};
  setupBusinessMap();
 $("#cancelBiz").onclick=closeModal;
 $("#businessForm").onsubmit=async e=>{e.preventDefault();const btn=$('button[type=submit]',e.currentTarget);btn.disabled=true;btn.textContent="Submitting…";
  const name=$("#bizName").value.trim();
  try{const cover_image_url=await uploadBusinessImage($("#bizCover").files[0]);const payload={owner_id:currentUser.id,name,slug:slugify(name)+"-"+Math.random().toString(36).slice(2,6),category:$("#bizCategory").value,phone:$("#bizPhone").value.trim()||null,business_email:$("#bizEmail").value.trim()||null,website:$("#bizWebsite").value.trim()||null,address_line:$("#bizAddress").value.trim()||null,city:$("#bizCity").value.trim()||null,state:$("#bizState").value||null,pincode:$("#bizPincode").value.trim()||null,latitude:selectedBusinessPoint?.lat??null,longitude:selectedBusinessPoint?.lon??null,cover_image_url,description:$("#bizDescription").value.trim()};const {error}=await supabase.from("abn_businesses").insert(payload);if(error)throw error;closeModal();toast("Business profile created with address and location.");await loadListings()}catch(err){toast(err.message||"Could not save business.");btn.disabled=false;btn.textContent="Submit business"}
 };
}
async function addListingForm(){
 if(!requireAuth())return;
 const {data:businesses,error}=await supabase.from("abn_businesses").select("id,name").eq("owner_id",currentUser.id).order("created_at",{ascending:false});
 if(error){toast(error.message);return}
 if(!businesses?.length){showModal("Create a listing",`<div class="empty-state"><div class="empty-icon">▦</div><h3>Start with your business profile</h3><p>Create a business profile first, then add product or service listings. Published listings appear in the marketplace directly.</p><button class="button button-primary" id="makeBizNow">Create business</button></div>`);$("#makeBizNow").onclick=addBusinessForm;return}
 showModal("Create a marketplace listing",`<p class="form-help">Publish your product or service directly to the marketplace. You can edit it later.</p>
 <form id="listingForm"><div class="form-grid">
 <div class="field full"><label for="listingBusiness">Business *</label><select id="listingBusiness" required>${businesses.map(b=>`<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join("")}</select></div>
 <div class="field"><label for="listingType">Listing type *</label><select id="listingType" required><option value="product">Product / B2C</option><option value="service">Professional service</option></select></div>
 <div class="field"><label for="listingCategory">Category *</label><input id="listingCategory" required maxlength="100" placeholder="e.g. Office supplies"></div>
 <div class="field full"><label for="listingTitle">Title *</label><input id="listingTitle" required maxlength="180" placeholder="What are you offering?"></div>
 <div class="field"><label for="listingPrice">Price (₹)</label><input id="listingPrice" type="number" min="0" step="0.01" placeholder="Leave blank for quote"></div>
 <div class="field"><label for="listingUnit">Unit</label><input id="listingUnit" maxlength="50" placeholder="piece, hour, kg…"></div>
 <div class="field"><label for="listingCity">City</label><input id="listingCity" maxlength="100"></div>
  <div class="field"><label for="listingState">State / UT</label>${stateOptions("listingState")}</div>
 <div class="field full"><label for="listingDescription">Description</label><textarea id="listingDescription" maxlength="5000" placeholder="Describe quality, availability, delivery, or service area."></textarea></div>
 </div><div class="form-actions"><button class="button button-primary" type="submit">Publish listing</button><button class="button button-outline" type="button" id="cancelListing">Cancel</button></div></form>`);
 $("#cancelListing").onclick=closeModal;
 $("#listingForm").onsubmit=async e=>{e.preventDefault();const btn=$('button[type=submit]',e.currentTarget);btn.disabled=true;btn.textContent="Saving…";
 const payload={business_id:$("#listingBusiness").value,created_by:currentUser.id,listing_type:$("#listingType").value,title:$("#listingTitle").value.trim(),category:$("#listingCategory").value.trim(),description:$("#listingDescription").value.trim(),price:$("#listingPrice").value===""?null:Number($("#listingPrice").value),unit:$("#listingUnit").value.trim()||null,city:$("#listingCity").value.trim()||null,state:$("#listingState").value.trim()||null,status:"published"};
 try{const {error}=await supabase.from("abn_listings").insert(payload);if(error)throw error;closeModal();toast("Listing published to the marketplace.");await loadListings()}catch(err){toast(err.message||"Could not save listing.");btn.disabled=false;btn.textContent="Publish listing"}
 };
}
function startEnquiry(listingId){
 if(!requireAuth())return;
 const item=allListings.find(x=>x.id===listingId);if(!item)return;
 showModal("Send an enquiry",`<p class="form-help">Your message will be shared with the business owner. Keep private documents and sensitive information out of the message.</p>
 <div class="account-chip"><span class="business-avatar">${escapeHtml((item.abn_businesses?.name||"A").slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.abn_businesses?.name||"ABN business")}</small></div></div>
 <form id="enquiryForm"><div class="field"><label for="enquiryType">Enquiry type</label><select id="enquiryType"><option value="general">General enquiry</option><option value="bulk_order">Bulk order / wholesale</option><option value="product">Product details</option><option value="service">Service request</option><option value="quotation">Request a quotation</option></select></div>
 <div class="field"><label for="enquiryQty">Quantity (optional)</label><input id="enquiryQty" type="number" min=".01" step=".01" placeholder="e.g. 100"></div>
 <div class="field"><label for="enquiryMessage">Message *</label><textarea id="enquiryMessage" required maxlength="5000" placeholder="Tell the business what you need…"></textarea></div>
 <div class="form-actions"><button class="button button-primary" type="submit">Send enquiry</button><button class="button button-outline" type="button" id="cancelEnquiry">Cancel</button></div></form>`);
 $("#cancelEnquiry").onclick=closeModal;
 $("#enquiryForm").onsubmit=async e=>{e.preventDefault();const btn=$('button[type=submit]',e.currentTarget);btn.disabled=true;btn.textContent="Sending…";const qty=$("#enquiryQty").value;
 try{const {error}=await supabase.from("abn_enquiries").insert({buyer_id:currentUser.id,business_id:item.business_id,listing_id:item.id,enquiry_type:$("#enquiryType").value,message:$("#enquiryMessage").value.trim(),quantity:qty?Number(qty):null});if(error)throw error;closeModal();toast("Enquiry sent to the business.");}catch(err){toast(err.message||"Could not send enquiry.");btn.disabled=false;btn.textContent="Send enquiry"}
 };
}
async function loadMyEnquiries(){
 if(!requireAuth())return;
 $("#listingHeading").textContent="My enquiries";$("#resultsLabel").textContent="Your private conversations with businesses";
 const {data,error}=await supabase.from("abn_enquiries").select("id,message,enquiry_type,status,created_at,abn_businesses(name,city,state)").eq("buyer_id",currentUser.id).order("created_at",{ascending:false}).limit(50);
 const grid=$("#listingGrid");$("#emptyState").classList.add("hidden");grid.classList.remove("hidden");
 if(error){grid.innerHTML=`<div class="loading-card">${escapeHtml(error.message)}</div>`;return}
 if(!data?.length){grid.innerHTML='<div class="loading-card">No enquiries yet. Browse listings and choose “Enquire” to contact a business.</div>';return}
 grid.innerHTML=data.map(e=>`<article class="listing-card"><div class="listing-body"><div class="listing-meta"><span class="listing-category">${escapeHtml(e.enquiry_type.replace("_"," ").toUpperCase())}</span><span>${escapeHtml(new Date(e.created_at).toLocaleDateString())}</span></div><h3>${escapeHtml(e.abn_businesses?.name||"Business")}</h3><p class="listing-desc">${escapeHtml(e.message)}</p><div class="listing-bottom"><span class="listing-category">Status: ${escapeHtml(e.status)}</span><span class="mini-action">${escapeHtml(e.abn_businesses?.city||"India")}</span></div></div></article>`).join("");
}
async function showAccount(){
 if(!currentUser){authForm("signin");return}
 await refreshProfile();
 showModal("Your ABN account",`<div class="account-chip"><span class="business-avatar">${escapeHtml((currentProfile?.display_name||currentUser.email||"A").slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(currentProfile?.display_name||"ABN member")}</strong><small>${escapeHtml(currentUser.email||"")} · ${escapeHtml(currentProfile?.account_status||"pending")}</small></div></div>
 <form id="profileForm"><div class="field"><label for="profileName">Display name</label><input id="profileName" maxlength="120" value="${escapeHtml(currentProfile?.display_name||"")}"></div><div class="form-grid"><div class="field"><label for="profileType">Account type</label><select id="profileType"><option value="consumer">Buyer / consumer</option><option value="business_owner">Business owner</option><option value="service_provider">Service provider</option><option value="business_and_services">Business & services</option></select></div><div class="field"><label for="profileLanguage">Preferred language</label><select id="profileLanguage"><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></div></div><div class="form-actions"><button class="button button-primary" type="submit">Save profile</button><button class="button button-outline" type="button" id="signOutButton">Sign out</button></div></form>`);
 $("#profileType").value=currentProfile?.account_type||"consumer";$("#profileLanguage").value=currentProfile?.preferred_language||language;
 $("#signOutButton").onclick=async()=>{await supabase.auth.signOut();currentUser=null;currentProfile=null;closeModal();updateAuthUI();toast("Signed out.")};
 $("#profileForm").onsubmit=async e=>{e.preventDefault();const {error}=await supabase.from("abn_profiles").update({display_name:$("#profileName").value.trim(),account_type:$("#profileType").value,preferred_language:$("#profileLanguage").value,updated_at:new Date().toISOString()}).eq("id",currentUser.id);if(error){toast(error.message);return}language=$("#profileLanguage").value;localStorage.setItem("abn-language",language);await refreshProfile();applyLanguage();closeModal();toast("Profile updated.")};
}
function wireUI(){
 $("#closeModal").onclick=closeModal;$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
 $("#menuToggle").onclick=()=>$("#sidebar").classList.toggle("open");
 $$(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
 $("#accountNav").onclick=showAccount;$("#avatarButton").onclick=showAccount;
 $("#loginButton").onclick=async()=>{if(currentUser){await supabase.auth.signOut();currentUser=null;currentProfile=null;updateAuthUI();toast("Signed out.");}else authForm("signin")};
 $("#addBusinessButton").onclick=addBusinessForm;$("#emptyAddBusiness").onclick=addBusinessForm;$("#statCta").onclick=addListingForm;
 $("#bannerJoin").onclick=()=>currentUser?addBusinessForm():authForm("signup");
 $("#exploreButton").onclick=()=>$("#listingHeading").scrollIntoView({behavior:"smooth",block:"start"});
 $("#viewAllButton").onclick=()=>{activeFilter="all";$$(".filter-tab").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));$("#searchInput").value="";applyFilters()};
 $("#clearSearch").onclick=()=>{$("#searchInput").value="";activeFilter="all";$$(".filter-tab").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));applyFilters()};
 $("#searchInput").addEventListener("input",applyFilters);
 $$(".filter-tab").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;$$(".filter-tab").forEach(x=>x.classList.toggle("active",x===b));applyFilters()}));
 $("#languageSelect").onchange=e=>{language=e.target.value;localStorage.setItem("abn-language",language);applyLanguage();toast("Language preference updated.")};
 $("#privacyLink").onclick=e=>{e.preventDefault();showModal("Privacy-first by design",`<p class="form-help">ABN displays public business information to help buyers and service providers connect. Account access is protected by Supabase authentication and row-level security. Avoid adding private documents or sensitive personal information to public listings.</p><p class="form-help">BSVS should publish a privacy notice, retention policy, contact details and a grievance process before public launch.</p><button class="button button-primary" id="privacyClose">Close</button>`);$("#privacyClose").onclick=closeModal};
 $("#aboutLink").onclick=e=>{e.preventDefault();showModal("About ABN",`<p class="form-help"><strong>Ambedkarite Business Network (ABN)</strong> is planned as an initiative of Bahujan Samaj Vikas Sansthan to help businesses, buyers, suppliers, and service professionals discover one another and create economic opportunities.</p><p class="form-help">Initial interface languages: English, Hindi, and Marathi. The app is designed for responsive web use and can be installed as a PWA on supported devices.</p><button class="button button-primary" id="aboutClose">Close</button>`);$("#aboutClose").onclick=closeModal};
}
async function init(){
 wireUI();applyLanguage();$("#nearbyButton").onclick=enableNearby;await refreshProfile();await loadListings();
 supabase.auth.onAuthStateChange((_event,session)=>{
   // Avoid awaited Supabase calls inside this callback; it runs while Auth may hold its internal lock.
   currentUser=session?.user||null;
   currentProfile=null;
   updateAuthUI();
   if(currentUser) queueMicrotask(async()=>{
     const {data}=await supabase.from("abn_profiles").select("*").eq("id",currentUser.id).maybeSingle();
     currentProfile=data||null;updateAuthUI();
   });
 });
}
init().catch(err=>{console.error(err);toast("App startup issue. Refresh and check the README setup steps.")});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) { window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(err => console.warn("PWA service worker registration failed", err))); }
