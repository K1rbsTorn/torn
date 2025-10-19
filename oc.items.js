// ==UserScript==
// @name         Torn OC Item Market List (Faction Armory) v1.1.5
// @namespace    https://torn.com/
// @version      1.1.5
// @description  Lists all unique items required for your faction's current OCs and provides quick links to the market, shown in the Faction Armory Utilities tab.
// @author       K1rbs
// @match        https://www.torn.com/factions.php*step=your*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.registerMenuCommand
// @grant        GM_registerMenuCommand
// @connect      api.torn.com
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const SECTION_ID  = "tf-oc-market-list-armory";
  const TITLE_TEXT  = "Faction OC Item List";
  const API_COMMENT = "TF-OC-Market-List";
  const API_URL     = "https://api.torn.com/v2/faction/crimes";
  const ITEMS_URL   = "https://api.torn.com/v2/torn/items";
  const ITEMS_CACHE_KEY = "itemsCatalogV1";
  const ITEMS_TTL_MS    = 24 * 60 * 60 * 1000;
  const OC_STATUS_TO_FETCH = ["Recruiting", "Planning"];

  const ICONS = {
     refresh:  '<svg class="tf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M21 13a8 8 0 1 1-3-6.74L21 8"/></svg>',
  };
  const style = `
    #${SECTION_ID} { margin-bottom: 10px; border: 1px solid var(--default-panel-divider-outer-side-color); border-radius: 6px; background: var(--default-bg-panel-color); }
    #${SECTION_ID} .tf-header { display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; background: var(--default-bg-panel-header-color); border-bottom: 1px solid var(--default-panel-divider-outer-side-color); border-radius: 6px 6px 0 0; }
    #${SECTION_ID} .tf-title { font-weight: bold; font-size: 13px; color: var(--default-panel-header-text-color); margin: 0; }
    #${SECTION_ID} .tf-controls { display: flex; align-items: center; gap: 10px; }
    #${SECTION_ID} .tf-refresh{ display:inline-flex; align-items:center; gap:4px; color: var(--default-blue-color); font-weight:600; font-size: 12px; cursor:pointer; user-select:none; text-decoration:none; }
    #${SECTION_ID} .tf-refresh:hover{ text-decoration:underline; }
    #${SECTION_ID}-content{ padding: 8px; }
    #${SECTION_ID} .tf-muted{ opacity:.75; font-style:italic; padding:4px 2px; }
    #${SECTION_ID} .spinner{ font-size:12px; opacity:.7; padding:4px 2px; }
    #${SECTION_ID} .error{ color:#b00020; padding:4px 2px; }
    #${SECTION_ID} .hint{ font-size:11px; opacity:.8; padding: 4px 0 0; }
    #${SECTION_ID} .pill { display:inline-block; border:1px solid var(--default-panel-divider-outer-side-color); border-radius:999px; padding:2px 8px; font-size:11px; margin-right:6px; background:var(--default-bg-panel-active-color); }
    #${SECTION_ID} .pill a { color:var(--default-blue-color); text-decoration:underline; }
    #${SECTION_ID} .tf-icon { width:12px; height:12px; display:inline-block; vertical-align:-2px; }
    #${SECTION_ID} ul { list-style:none; margin: 5px 0 0; padding:0; max-height: 250px; overflow-y: auto; }
    #${SECTION_ID} li { display:flex; justify-content:space-between; align-items:center; padding: 4px 2px; border-bottom: 1px solid var(--default-panel-divider-inner-side-color); }
    #${SECTION_ID} li:last-child { border-bottom: none; }
    #${SECTION_ID} .item-name { font-weight: 600; font-size: 12px; }
    #${SECTION_ID} .buy-link { font-size: 11px; padding: 3px 8px; cursor:pointer; border-radius:4px; border:1px solid var(--default-panel-divider-outer-side-color); background: var(--default-bg-panel-active-color); color: var(--default-blue-color); text-decoration: none; flex-shrink: 0; }
    #${SECTION_ID} .buy-link:hover { filter:brightness(1.06); text-decoration:underline; }
  `;

  let ID_TO_NAME = new Map();
  let ID_TO_TYPE = new Map();
  let NAME_TO_ID = new Map();
  const normalize = s => (s||"").replace(/\s+/g," ").trim().toLowerCase();
  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function waitForElement(selector, timeout = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
          const element = document.querySelector(selector);
          if (element) {
              return element;
          }
          await delay(250);
      }
      console.log(`OC List Script: Timed out waiting for element "${selector}"`);
      return null;
  }

  function buildMarketUrlByName(itemName) {
     const base = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search";
    const id = NAME_TO_ID.get(normalize(itemName));
    if (!id) return `${base}&itemName=${encodeURIComponent(itemName)}`;
    const type = ID_TO_TYPE.get(id);
    const typeParam = type ? `&itemType=${encodeURIComponent(type)}` : "";
    return `${base}&itemID=${id}&itemName=${encodeURIComponent(itemName)}${typeParam}`;
  }
  async function getSetting(key, def=""){
    try{ if(typeof GM !== "undefined" && GM.getValue) return await GM.getValue(key, def); if(typeof GM_getValue !== "undefined"){ const v = GM_getValue(key); return v == null ? def : v; } }catch{} return def;
   }
  async function setSetting(key, val){
    try{ if(typeof GM !== "undefined" && GM.setValue) return await GM.setValue(key, val); if(typeof GM_setValue !== "undefined") return GM_setValue(key, val); }catch{}
   }
  function registerMenus(){
    const reg = (label, fn) => { if(typeof GM !== "undefined" && GM.registerMenuCommand) GM.registerMenuCommand(label, fn); else if(typeof GM_registerMenuCommand !== "undefined") GM_registerMenuCommand(label, fn); };
    reg("Set Torn API key (OC List)", async () => { const cur = await getSetting("apiKey", ""); const v = prompt("Enter your Torn API key (requires Minimal Access):", cur || ""); if(v !== null) await setSetting("apiKey", v.trim()); showSettingsHint(); });
   }

  function injectStyle(){
       if(document.getElementById(`${SECTION_ID}-style`)) return; const s=document.createElement("style"); s.id=`${SECTION_ID}-style`; s.textContent=style; document.head.appendChild(s);
   }
  function makeSection(){
    if(document.getElementById(SECTION_ID)) return document.getElementById(SECTION_ID); const wrap = document.createElement("div"); wrap.id = SECTION_ID; wrap.innerHTML = `<div class="tf-header"><p class="tf-title">${TITLE_TEXT}</p><div class="tf-controls"><div id="${SECTION_ID}-settings" class="hint" style="padding:0;"></div><div id="${SECTION_ID}-refresh" class="tf-refresh">${ICONS.refresh} Refresh</div></div></div><div id="${SECTION_ID}-content"><div id="${SECTION_ID}-placeholder" class="tf-muted">Click Refresh to display information.</div><div id="${SECTION_ID}-card" style="display:none"><div class="spinner" aria-live="polite"></div><div class="content"></div></div></div>`; return wrap;
   }
  function insertSection(){
    const utilitiesTabContent = document.getElementById('armoury-utilities'); if (!utilitiesTabContent || document.getElementById(SECTION_ID)) return false; const section = makeSection(); if(!section) return false; utilitiesTabContent.prepend(section); console.log("OC List Script: Section inserted."); return true;
   }
  async function showSettingsHint(){
     const el = document.getElementById(`${SECTION_ID}-settings`); if(!el) return; const key = await getSetting("apiKey",""); const keyBadge = key ? `<span class="pill">API key: <em>set</em> · <a href="#" id="${SECTION_ID}-setkey">edit</a></span>` : `<span class="pill">API key: <strong>not set</strong> · <a href="#" id="${SECTION_ID}-setkey">set</a></span>`; const tip = key ? "" : `<span class="tf-tip">Needs Minimal Access key.</span>`; el.innerHTML = `${keyBadge}${tip ? " " + tip : ""}`; el.querySelector(`#${SECTION_ID}-setkey`)?.addEventListener("click", async (e)=>{ e.preventDefault(); const cur=await getSetting("apiKey",""); const v=prompt("Enter your Torn API key (requires Minimal Access):", cur||""); if(v!==null){ await setSetting("apiKey", v.trim()); showSettingsHint(); } });
   }

  const httpGetJSON = (url) => {
    const fn = (typeof GM !== "undefined" && GM.xmlHttpRequest) ? GM.xmlHttpRequest : GM_xmlhttpRequest; return new Promise((resolve,reject) => { fn({ method:"GET", url, headers:{Accept:"application/json"}, onload:res => { if(!(res.status>=200 && res.status<300)) return reject(new Error(`HTTP ${res.status}`)); try{ const data = JSON.parse(res.responseText); if(data && (data.error || data.code)){ const code = data.error?.code ?? data.code ?? "unknown"; const msg  = data.error?.error ?? data.error?.message ?? "API error"; const nice = (code === 5 || code === 17) ? "Rate limited: please try again in ~30s" : (code === 7) ? "Incorrect ID-entity relation — this key lacks Faction API Access (ask your faction to grant it)." : msg; reject(new Error(`Torn API error ${code}: ${nice}`)); }else{ resolve(data); } }catch(e){ reject(new Error("Invalid JSON response")); } }, onerror:() => reject(new Error("Network error")), ontimeout:() => reject(new Error("Request timed out")), timeout:25000 }); });
   };
  async function fetchCrimesForCat(cat) {
    const key = await getSetting("apiKey",""); if(!key) throw new Error("No Torn API key set. Use the menu or the 'set' link above."); const u = new URL(API_URL); u.searchParams.set("comment", API_COMMENT); u.searchParams.set("key", key.trim()); u.searchParams.set("cat", String(cat).toLowerCase()); return await httpGetJSON(u.toString());
   }
  async function fetchCrimesFromTorn() {
    const list = OC_STATUS_TO_FETCH; const results = await Promise.allSettled(list.map(c => fetchCrimesForCat(c))); let crimes = []; let firstErr = null; for (const r of results) { if (r.status === "fulfilled" && r.value && r.value.crimes) { const arr = Array.isArray(r.value.crimes) ? r.value.crimes : Object.values(r.value.crimes); crimes = crimes.concat(arr); } else if (!firstErr && r.status === "rejected") { firstErr = r.reason; } } if (!crimes.length && firstErr) throw firstErr; return { crimes };
   }
  function parseItemsPayload(json){
    const raw = json?.items || json?.result?.items || json || {}; let entries = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.entries(raw).map(([id, v]) => ({ id: Number(id), ...v })) : []; const byIdName = new Map(); const byIdType = new Map(); for (const it of entries) { const id = Number(it?.id); const nm = String(it?.name || "").trim(); if (!Number.isFinite(id) || !nm) continue; byIdName.set(id, nm); if (it?.type) byIdType.set(id, String(it.type)); } return { byIdName, byIdType };
   }
  function mergeCatalogMaps({ byIdName, byIdType }){
    ID_TO_NAME = byIdName || new Map(); ID_TO_TYPE = byIdType || new Map(); NAME_TO_ID = new Map([...ID_TO_NAME].map(([id, nm]) => [normalize(nm), id]));
   }
  async function ensureItemsCatalog(){
    const cached = await getSetting(ITEMS_CACHE_KEY, ""); if (cached) { try { const { ts, items } = JSON.parse(cached); if (ts && (Date.now() - ts) < ITEMS_TTL_MS && items) { mergeCatalogMaps(parseItemsPayload(items)); return; } } catch {} } const key = await getSetting("apiKey", ""); if (!key) return; const u = new URL(ITEMS_URL); u.searchParams.set("comment", API_COMMENT); u.searchParams.set("key", key.trim()); try { const data = await httpGetJSON(u.toString()); await setSetting(ITEMS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items: data })); mergeCatalogMaps(parseItemsPayload(data)); } catch (e) { console.error("Failed to fetch or cache items catalog:", e); if (cached) { try { const { items } = JSON.parse(cached); if (items) mergeCatalogMaps(parseItemsPayload(items)); } catch {} } }
   }
  function buildAllItemEntriesFromAPI(json) {
     const itemMap = new Map(); const missingIds = new Set(); const crimes = Array.isArray(json?.crimes) ? json.crimes : (json?.crimes ? Object.values(json.crimes) : []); for (const crime of crimes) { const slots = Array.isArray(crime?.slots) ? crime.slots : []; for (const slot of slots) { const req = slot?.item_requirement; if (req) { const itemId = req.id ?? req.item_id ?? null; if (!itemId) continue; const nameFromAPI = req.name || null; const nameFromItems = (itemId != null) ? ID_TO_NAME.get(Number(itemId)) : null; const friendlyName = nameFromAPI || nameFromItems; if (!friendlyName) { missingIds.add(Number(itemId)); continue; } const key = Number(itemId); const current = itemMap.get(key); if (current) { current.count++; if (req.is_available === true) current.available++; } else { itemMap.set(key, { itemName: friendlyName, itemId: key, count: 1, available: (req.is_available === true ? 1 : 0) }); } } } } const entries = Array.from(itemMap.values()).sort((a, b) => a.itemName.localeCompare(b.itemName)); return { entries, missingIds: Array.from(missingIds) };
   }

  async function loadAndRenderList() {
    const card = document.getElementById(`${SECTION_ID}-card`); if (!card) return; const spinner = card.querySelector(".spinner"); const content = card.querySelector(".content"); try { spinner.textContent = "loading…"; content.innerHTML = ""; card.style.display = "block"; await ensureItemsCatalog(); if (ID_TO_NAME.size === 0) { const key = await getSetting("apiKey", ""); if (key) { throw new Error("Failed to load item catalog. Check API key or try refreshing."); } else { throw new Error("No Torn API key set. Cannot fetch item catalog."); } } const data = await fetchCrimesFromTorn(); const { entries, missingIds } = buildAllItemEntriesFromAPI(data); let warningHtml = ""; if (missingIds.length) { warningHtml = `<div class="error" style="margin-bottom:6px;">Unknown item IDs (not in catalog): ${missingIds.join(", ")}. Try Refresh (catalog is cached ~24h).</div>`; } if (!entries.length) { content.innerHTML = `${warningHtml}<div class="muted">No OC item requirements found for Recruiting/Planning stages.</div>`; } else { const ul = document.createElement("ul"); const frag = document.createDocumentFragment(); for (const item of entries) { const li = document.createElement("li"); const marketUrl = buildMarketUrlByName(item.itemName); li.innerHTML = `<div><span class="item-name">${item.itemName}</span></div><a href="${marketUrl}" class="buy-link" target="_blank" rel="noopener">Buy</a>`; frag.appendChild(li); } content.innerHTML = warningHtml; ul.appendChild(frag); content.appendChild(ul); } } catch (err) { content.innerHTML = `<div class="error">Failed to load: ${err?.message || err}</div>`; } finally { spinner.textContent = ""; }
   }

  async function refreshAll(){
    await showSettingsHint(); const ph = document.getElementById(`${SECTION_ID}-placeholder`); if(ph) ph.style.display = "none"; await loadAndRenderList();
   }
  function wireUp(){
    const section = document.getElementById(SECTION_ID); if (!section) return; const refreshBtn = section.querySelector(`#${SECTION_ID}-refresh`); if(refreshBtn && !refreshBtn.dataset.bound){ refreshBtn.dataset.bound = "1"; refreshBtn.addEventListener("click", async e => { e.preventDefault(); if (refreshBtn.dataset.loading === "1") return; refreshBtn.dataset.loading = "1"; try { await showSettingsHint(); await loadAndRenderList(); } finally { delete refreshBtn.dataset.loading; } }); } showSettingsHint();
   }

  async function checkAndInsert() {
      if (!window.location.hash.includes("armoury")) {
          return;
      }
      const utilitiesTabContent = await waitForElement('#armoury-utilities', 5000);
      if (utilitiesTabContent) {
          const isVisible = utilitiesTabContent.style.display === 'block';
          if (isVisible && !document.getElementById(SECTION_ID)) {
              console.log("OC List Script: Utilities tab found and visible. Inserting...");
              if (insertSection()) {
                  wireUp();
                  const refreshBtn = document.querySelector(`#${SECTION_ID}-refresh`);
                  if (refreshBtn && refreshBtn.dataset.loading !== "1") {
                      console.log("OC List Script: Triggering refresh after insertion.");
                      refreshBtn.click();
                  }
              }
          } else if (isVisible && document.getElementById(SECTION_ID)) {
               wireUp();
          }
      } else {
          console.log("OC List Script: Could not find #armoury-utilities after waiting.");
      }
  }

  let hasInitialized = false;
  async function initialize() {
      if (hasInitialized) return;
      hasInitialized = true;
      const factionTabs = await waitForElement('#factions', 15000);
      if (!factionTabs) {
          console.log("OC List Script: Could not find main faction tabs (#factions). Script won't run.");
          return;
      }
      window.addEventListener('hashchange', () => {
          setTimeout(checkAndInsert, 250);
      });
      await checkAndInsert();
  }

  injectStyle();
  registerMenus();
  setTimeout(initialize, 1000);

})();
