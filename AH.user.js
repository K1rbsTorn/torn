// ==UserScript==
// @name         Torn Auction House History
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Only Weapons
// @author       K1rbs
// @match        https://www.torn.com/amarket.php*
// @connect      docs.google.com
// @connect      googleusercontent.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const SHEET_URL = "https://docs.google.com/spreadsheets/d/1GhHRYJUW5tEnedElJ1BHfdPV4zHMQP6zEy-Ok7ilco4/export?format=csv&gid=0";
    const SHOW_INITIAL_N = 5;
    const STORAGE_KEY = 'torn_ah_page_filter_v5';

    let db = null;
    let flatDb = [];
    let uniqueBonuses = new Set();
    let isFetching = false;

    GM_addStyle(`
        .ah-history-wrapper { width: 99%; margin: 5px auto; font-family: "Segoe UI", Arial, sans-serif; }
        .ah-history-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #ccc; background-color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .ah-history-table th { background-color: #333; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; }
        .ah-history-table td { padding: 5px 8px; border-bottom: 1px solid #eee; color: #333; vertical-align: middle; line-height: 1.3; }
        .current-item-row { background-color: #e6f7ff !important; border-bottom: 2px solid #1890ff !important; }
        .current-item-row td { font-weight: 600; color: #000; }
        .current-tag { background: #1890ff; color: white; padding: 2px 5px; border-radius: 3px; font-size: 10px; text-transform: uppercase; }
        .curr-bonus-val { color: #0000ff; font-weight: bold; font-size: 1.1em; }
        .val-better { color: #2e7d32; font-weight: 700; }
        .val-worse  { color: #c62828; font-weight: 700; }
        .val-same   { color: #f9a825; font-weight: 700; }
        .rarity-orange { background-color: #ffe0b2; }
        .rarity-yellow { background-color: #fff9c4; }
        .rarity-red    { background-color: #ffcdd2; }
        .rarity-green  { background-color: #c8e6c9; }
        .rarity-blue   { background-color: #bbdefb; }
        .rarity-grey   { background-color: #f5f5f5; }
        .rarity-turquoise { background-color: #b2ebf2; }
        .stat-block { font-family: 'Consolas', monospace; font-size: 11px; }
        .price-text { color: #006400; font-weight: bold; font-family: monospace; }
        .quality-placeholder { color: #999; font-style: italic; font-weight: normal; }
        .ah-toggle-row td { text-align: center; background: #f0f0f0; cursor: pointer; color: #1890ff; font-weight: bold; user-select: none; }
        .ah-toggle-row:hover td { background: #e0e0e0; text-decoration: underline; }
        .ah-header-btn { float: right; margin-left: 10px; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px; }
        #ah-search-btn { background: #1890ff; }
        #ah-search-btn:hover { background: #096dd9; }
        #ah-filter-btn { background: #722ed1; }
        #ah-filter-btn:hover { background: #531dab; }
        #ah-filter-btn.active { background: #2e7d32; border: 1px solid #1b5e20; }
        .ah-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99999; display: flex; justify-content: center; align-items: flex-start; padding-top: 50px; }
        .ah-modal { background: white; width: 90%; max-width: 1000px; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; flex-direction: column; font-family: "Segoe UI", Arial, sans-serif; }
        .ah-modal-header { padding: 15px; background: #333; color: white; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
        .ah-modal-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; line-height: 1; }
        .ah-modal-close:hover { color: #ff4d4f; }
        .ah-modal-body { padding: 15px; overflow-y: auto; flex: 1; }
        .ah-search-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 10px; padding: 15px; background: #f5f5f5; border-radius: 6px; border: 1px solid #ddd; }
        .ah-form-group { display: flex; flex-direction: column; }
        .ah-form-group label { font-size: 11px; font-weight: bold; color: #555; margin-bottom: 4px; }
        .ah-form-group select, .ah-form-group input { padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }
        .ah-search-submit { grid-column: 1 / -1; margin-top: 10px; padding: 8px; background: #2e7d32; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-align: center; }
        .ah-search-submit:hover { background: #1b5e20; }
        .ah-filter-clear { grid-column: 1 / -1; margin-top: 5px; padding: 8px; background: #d32f2f; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; text-align: center; }
        .ah-filter-clear:hover { background: #b71c1c; }
        #ah-filter-modal .ah-modal { max-width: 600px; }
        .ah-results-count { margin-bottom: 10px; font-weight: bold; color: #333; }
        .ah-search-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .ah-search-table th { background: #444; color: white; padding: 8px; text-align: left; position: sticky; top: 0; }
        .ah-search-table td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    `);

    function getNum(str) {
        if (!str) return 0;
        const match = str.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    function getCompClass(hVal, cVal) {
        if (cVal === 0 || cVal === null || isNaN(cVal) || isNaN(hVal)) return '';
        const diff = hVal - cVal;
        if (Math.abs(diff) < 0.01) return 'val-same';
        if (diff > 0) return 'val-better';
        return 'val-worse';
    }

    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    function parseDate(dateStr) {
        if (!dateStr) return 0;
        const months = { 'jan': 0, 'feb': 1, 'mär': 2, 'mar': 2, 'apr': 3, 'mai': 4, 'may': 4, 'jun': 5, 'juni': 5, 'jul': 6, 'juli': 6, 'aug': 7, 'sep': 8, 'sept': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'dez': 11, 'dec': 11 };
        try {
            const clean = dateStr.replace(/[.,]/g, '').toLowerCase().split(' ');
            let d = 1, m = 0, y = 1970;
            const yIndex = clean.findIndex(p => /^\d{4}$/.test(p));
            if (yIndex > -1) y = parseInt(clean[yIndex]);
            const mIndex = clean.findIndex(p => months.hasOwnProperty(p.slice(0,3)));
            if (mIndex > -1) m = months[clean[mIndex].slice(0,3)];
            const dIndex = clean.findIndex((p, i) => i !== yIndex && /^\d{1,2}$/.test(p));
            if (dIndex > -1) d = parseInt(clean[dIndex]);
            return new Date(y, m, d).getTime();
        } catch (e) { return 0; }
    }

    function setupKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (e.key === 'ArrowRight') {
                const nextIcon = document.querySelector('.pagination-right');
                if (nextIcon && nextIcon.closest('a')) nextIcon.closest('a').click();
            } else if (e.key === 'ArrowLeft') {
                const prevIcon = document.querySelector('.pagination-left');
                if (prevIcon && prevIcon.closest('a')) prevIcon.closest('a').click();
            }
        });
    }

    function init() {
        const observer = new MutationObserver((mutations) => {
            let shouldProcessList = false;
            let detailsNode = null;

            for (let mutation of mutations) {
                if (mutation.target.classList && mutation.target.classList.contains('items-list')) shouldProcessList = true;
                if (mutation.target.classList && mutation.target.classList.contains('show-item-info')) detailsNode = mutation.target;
                if (!detailsNode && mutation.target.closest && mutation.target.closest('.show-item-info')) detailsNode = mutation.target.closest('.show-item-info');
            }

            if (shouldProcessList) {
                processPage();
                refreshPageFilterOptions();
                executeSavedFilter();
            }
            if (detailsNode) parseLiveQuality(detailsNode);

            injectHeaderButtons();
        });

        const target = document.querySelector('.auction-market-main-cont') || document.body;
        observer.observe(target, { childList: true, subtree: true });

        fetchData();
        injectHeaderButtons();
        setupKeyboardNav();
        setTimeout(executeSavedFilter, 1000);
    }

    function fetchData() {
        if (db || isFetching) return;
        isFetching = true;
        GM_xmlhttpRequest({
            method: "GET",
            url: SHEET_URL,
            onload: function(response) {
                if (response.status === 200) {
                    parseCSV(response.responseText);
                    processPage();
                    refreshPageFilterOptions();
                }
                isFetching = false;
            }
        });
    }

    function parseCSV(text) {
        const lines = text.split(/\r\n|\n/);
        const dataMap = {};
        flatDb = [];
        uniqueBonuses = new Set();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            const cols = parseCSVLine(line);
            if (cols.length < 10) continue;

            const name = cols[0];
            let bonuses = [];

            if (cols[5]) {
                const bName = cols[5].toLowerCase().trim();
                bonuses.push({ name: bName, valStr: cols[6], valNum: getNum(cols[6]) });
                uniqueBonuses.add(capitalize(bName));
            }
            if (cols[7]) {
                const bName = cols[7].toLowerCase().trim();
                bonuses.push({ name: bName, valStr: cols[8], valNum: getNum(cols[8]) });
                uniqueBonuses.add(capitalize(bName));
            }
            bonuses.sort((a, b) => a.name.localeCompare(b.name));

            const entry = {
                name: name,
                rarity: cols[1],
                qualityStr: cols[2],
                qualityNum: getNum(cols[2]),
                dmg: parseFloat(cols[3]) || 0,
                acc: parseFloat(cols[4]) || 0,
                bonuses: bonuses,
                price: cols[9],
                date: cols[10],
                timestamp: parseDate(cols[10])
            };

            if (!dataMap[name]) dataMap[name] = [];
            dataMap[name].push(entry);
            flatDb.push(entry);
        }
        db = dataMap;
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') { inQuote = !inQuote; }
            else if (char === ',' && !inQuote) {
                result.push(current.replace(/^"|"$/g, '').trim());
                current = '';
            } else { current += char; }
        }
        result.push(current.replace(/^"|"$/g, '').trim());
        return result;
    }

    function injectHeaderButtons() {
        const container = document.querySelector('.content-title .links-top-wrap') || document.querySelector('.content-title');
        if (!container) return;

        if (!document.getElementById('ah-search-btn')) {
            const btn = document.createElement('button');
            btn.id = 'ah-search-btn';
            btn.className = 'ah-header-btn';
            btn.textContent = 'Search Database';
            btn.onclick = (e) => { e.preventDefault(); openSearchModal(); };
            container.appendChild(btn);
        }

        if (!document.getElementById('ah-filter-btn')) {
            const btn = document.createElement('button');
            btn.id = 'ah-filter-btn';
            btn.className = 'ah-header-btn';
            btn.textContent = 'Filter Page';
            btn.onclick = (e) => { e.preventDefault(); openFilterModal(); };
            container.appendChild(btn);
        }
        updateFilterButtonState();
    }

    function updateFilterButtonState() {
        const btn = document.getElementById('ah-filter-btn');
        if (!btn) return;
        const settings = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (settings && (settings.name || settings.b1 || settings.b2 || settings.qual || settings.dmg || settings.acc)) {
            btn.classList.add('active');
            btn.textContent = 'Filter Active';
        } else {
            btn.classList.remove('active');
            btn.textContent = 'Filter Page';
        }
    }

    function openSearchModal() {
        if (!document.getElementById('ah-search-modal')) createSearchModal();
        document.getElementById('ah-search-modal').style.display = 'flex';
        updateSearchDropdowns();
    }

    function createSearchModal() {
        const div = document.createElement('div');
        div.id = 'ah-search-modal';
        div.className = 'ah-modal-overlay';
        div.style.display = 'none';
        div.innerHTML = `
            <div class="ah-modal">
                <div class="ah-modal-header"><span>Historical Price Database</span><button class="ah-modal-close" id="ah-close-search">&times;</button></div>
                <div class="ah-modal-body">
                    <div class="ah-search-form">
                        <div class="ah-form-group"><label>Weapon Name</label><select id="ah-search-name"><option value="">Any</option></select></div>
                        <div class="ah-form-group"><label>Bonus 1</label><select id="ah-search-b1"><option value="">Any</option></select></div>
                        <div class="ah-form-group"><label>Bonus 2</label><select id="ah-search-b2"><option value="">Any</option></select></div>
                        <div class="ah-form-group"><label>Min Quality %</label><input type="number" id="ah-search-qual"></div>
                        <div class="ah-form-group"><label>Min Damage</label><input type="number" id="ah-search-dmg"></div>
                        <div class="ah-form-group"><label>Min Accuracy</label><input type="number" id="ah-search-acc"></div>
                        <button class="ah-search-submit" id="ah-search-submit-btn">SEARCH DB</button>
                    </div>
                    <div class="ah-results-count" id="ah-results-count"></div>
                    <table class="ah-search-table">
                        <thead><tr><th>Date</th><th>Item</th><th>Quality</th><th>Bonuses</th><th>Stats</th><th>Price</th></tr></thead>
                        <tbody id="ah-search-tbody"><tr><td colspan="6" style="text-align:center;">Enter filters...</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        document.getElementById('ah-close-search').onclick = () => div.style.display = 'none';
        document.getElementById('ah-search-submit-btn').onclick = performSearch;
        div.onclick = (e) => { if (e.target === div) div.style.display = 'none'; };
    }

    function updateSearchDropdowns() {
        if (!db) return;
        const nameSel = document.getElementById('ah-search-name');
        if (nameSel.options.length <= 1) {
            Object.keys(db).sort().forEach(n => nameSel.add(new Option(n, n)));
        }
        const b1Sel = document.getElementById('ah-search-b1');
        const b2Sel = document.getElementById('ah-search-b2');
        if (b1Sel.options.length <= 1) {
            Array.from(uniqueBonuses).sort().forEach(b => {
                b1Sel.add(new Option(b, b.toLowerCase()));
                b2Sel.add(new Option(b, b.toLowerCase()));
            });
        }
    }

    function performSearch() {
        if (!flatDb.length) return;
        const sName = document.getElementById('ah-search-name').value;
        const sB1 = document.getElementById('ah-search-b1').value;
        const sB2 = document.getElementById('ah-search-b2').value;
        const sQual = parseFloat(document.getElementById('ah-search-qual').value) || 0;
        const sDmg = parseFloat(document.getElementById('ah-search-dmg').value) || 0;
        const sAcc = parseFloat(document.getElementById('ah-search-acc').value) || 0;

        let results = flatDb.filter(row => {
            if (sName && row.name !== sName) return false;
            if (sQual && row.qualityNum < sQual) return false;
            if (sDmg && row.dmg < sDmg) return false;
            if (sAcc && row.acc < sAcc) return false;
            if (sB1 || sB2) {
                const rowB = row.bonuses.map(b => b.name);
                if (sB1 && !rowB.includes(sB1)) return false;
                if (sB2 && !rowB.includes(sB2)) return false;
            }
            return true;
        });

        results.sort((a, b) => b.timestamp - a.timestamp);

        const tbody = document.getElementById('ah-search-tbody');
        tbody.innerHTML = '';
        document.getElementById('ah-results-count').textContent = `Found: ${results.length}`;
        results.slice(0, 100).forEach(m => {
            let rClass = m.rarity.toLowerCase().includes('orange') ? 'rarity-orange' : (m.rarity.toLowerCase().includes('yellow') ? 'rarity-yellow' : (m.rarity.toLowerCase().includes('red') ? 'rarity-red' : 'rarity-grey'));
            tbody.innerHTML += `<tr class="${rClass}"><td>${m.date}</td><td><b>${m.name}</b></td><td>${m.qualityStr}</td><td>${m.bonuses.map(b=>`${capitalize(b.name)} (${b.valStr})`).join(', ')}</td><td>D:${m.dmg} A:${m.acc}</td><td class="price-text">${m.price}</td></tr>`;
        });
    }

    function openFilterModal() {
        if (!document.getElementById('ah-filter-modal')) createFilterModal();
        document.getElementById('ah-filter-modal').style.display = 'flex';
        refreshPageFilterOptions();
        loadFilterModalValues();
    }

    function createFilterModal() {
        const div = document.createElement('div');
        div.id = 'ah-filter-modal';
        div.className = 'ah-modal-overlay';
        div.style.display = 'none';
        div.innerHTML = `
            <div class="ah-modal">
                <div class="ah-modal-header"><span>Filter Page Items</span><button class="ah-modal-close" id="ah-close-filter">&times;</button></div>
                <div class="ah-modal-body">
                    <div class="ah-search-form">
                        <div class="ah-form-group"><label>Weapon Name</label><select id="ah-filter-name"><option value="">All</option></select></div>
                        <div class="ah-form-group"><label>Bonus 1</label><select id="ah-filter-b1"><option value="">Any</option></select></div>
                        <div class="ah-form-group"><label>Bonus 2</label><select id="ah-filter-b2"><option value="">Any</option></select></div>
                        <div class="ah-form-group"><label>Min Quality %</label><input type="number" id="ah-filter-qual"></div>
                        <div class="ah-form-group"><label>Min Damage</label><input type="number" id="ah-filter-dmg"></div>
                        <div class="ah-form-group"><label>Min Accuracy</label><input type="number" id="ah-filter-acc"></div>
                        <button class="ah-search-submit" id="ah-filter-apply-btn">APPLY & SAVE</button>
                        <button class="ah-filter-clear" id="ah-filter-clear-btn">CLEAR FILTER</button>
                    </div>
                    <div id="ah-filter-status" style="text-align:center; color:#555; margin-top:10px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        document.getElementById('ah-close-filter').onclick = () => div.style.display = 'none';
        document.getElementById('ah-filter-apply-btn').onclick = applyAndSaveFilter;
        document.getElementById('ah-filter-clear-btn').onclick = clearPageFilter;
        div.onclick = (e) => { if (e.target === div) div.style.display = 'none'; };
    }

    function refreshPageFilterOptions() {
        const names = new Set(Object.keys(db || {}));
        const bonuses = new Set(uniqueBonuses || []);

        const items = document.querySelectorAll('ul.items-list > li');
        items.forEach(li => {
            const titleEl = li.querySelector('.title .item-name');
            if (titleEl) names.add(titleEl.textContent.trim());
            const bonusIcons = li.querySelectorAll('.item-bonuses .iconsbonuses .bonus-attachment-icons');
            bonusIcons.forEach(icon => {
                const title = icon.getAttribute('title');
                if (title) {
                    const m = title.match(/<b>(.*?)<\/b>/i);
                    if (m) bonuses.add(capitalize(m[1].trim()));
                }
            });
        });

        const nSel = document.getElementById('ah-filter-name');
        const b1Sel = document.getElementById('ah-filter-b1');
        const b2Sel = document.getElementById('ah-filter-b2');
        if (!nSel || !b1Sel) return;

        const prevN = nSel.value;
        const prevB1 = b1Sel.value;
        const prevB2 = b2Sel.value;

        nSel.innerHTML = '<option value="">All</option>';
        Array.from(names).sort().forEach(n => nSel.add(new Option(n, n)));
        if (Array.from(names).includes(prevN)) nSel.value = prevN;

        const buildBonusOpts = () => {
            let html = '<option value="">Any</option>';
            Array.from(bonuses).sort().forEach(b => html += `<option value="${b.toLowerCase()}">${b}</option>`);
            return html;
        };
        b1Sel.innerHTML = buildBonusOpts();
        b2Sel.innerHTML = buildBonusOpts();
        b1Sel.value = prevB1;
        b2Sel.value = prevB2;
    }

    function loadFilterModalValues() {
        const settings = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (settings) {
            document.getElementById('ah-filter-name').value = settings.name || "";
            document.getElementById('ah-filter-b1').value = settings.b1 || "";
            document.getElementById('ah-filter-b2').value = settings.b2 || "";
            document.getElementById('ah-filter-qual').value = settings.qual || "";
            document.getElementById('ah-filter-dmg').value = settings.dmg || "";
            document.getElementById('ah-filter-acc').value = settings.acc || "";
        }
    }

    function applyAndSaveFilter() {
        const settings = {
            name: document.getElementById('ah-filter-name').value,
            b1: document.getElementById('ah-filter-b1').value,
            b2: document.getElementById('ah-filter-b2').value,
            qual: document.getElementById('ah-filter-qual').value,
            dmg: document.getElementById('ah-filter-dmg').value,
            acc: document.getElementById('ah-filter-acc').value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        executeSavedFilter();
        document.getElementById('ah-filter-modal').style.display = 'none';
    }

    function clearPageFilter() {
        localStorage.removeItem(STORAGE_KEY);
        document.getElementById('ah-filter-name').value = "";
        document.getElementById('ah-filter-b1').value = "";
        document.getElementById('ah-filter-b2').value = "";
        document.getElementById('ah-filter-qual').value = "";
        document.getElementById('ah-filter-dmg').value = "";
        document.getElementById('ah-filter-acc').value = "";
        executeSavedFilter();
        document.getElementById('ah-filter-modal').style.display = 'none';
    }

    function executeSavedFilter() {
        const settings = JSON.parse(localStorage.getItem(STORAGE_KEY));
        updateFilterButtonState();

        const items = document.querySelectorAll('ul.items-list > li');
        if (!settings) {
            items.forEach(li => li.style.display = '');
            return;
        }

        const sName = settings.name;
        const sB1 = settings.b1;
        const sB2 = settings.b2;
        const sQual = parseFloat(settings.qual) || 0;
        const sDmg = parseFloat(settings.dmg) || 0;
        const sAcc = parseFloat(settings.acc) || 0;

        let visibleCount = 0;

        items.forEach(li => {
            const cont = li.querySelector('.item-cont-wrap');
            if (!cont) return;

            const nameEl = cont.querySelector('.title .item-name');
            const itemName = nameEl ? nameEl.textContent.trim() : "";

            let itemDmg = 0, itemAcc = 0;
            const dmgIcon = cont.querySelector('.bonus-attachment-item-damage-bonus');
            if (dmgIcon && dmgIcon.parentNode) {
                const val = dmgIcon.parentNode.querySelector('.label-value');
                if(val) itemDmg = parseFloat(val.textContent);
            }
            const accIcon = cont.querySelector('.bonus-attachment-item-accuracy-bonus');
            if (accIcon && accIcon.parentNode) {
                const val = accIcon.parentNode.querySelector('.label-value');
                if(val) itemAcc = parseFloat(val.textContent);
            }

            let itemQual = 0;
            const qualEl = li.querySelector('.ah-curr-qual') || li.querySelector('.tt-quality');
            if (qualEl && qualEl.textContent !== 'N/A') itemQual = parseFloat(qualEl.textContent);

            let itemBonuses = [];
            const bonusIcons = cont.querySelectorAll('.item-bonuses .iconsbonuses .bonus-attachment-icons');
            bonusIcons.forEach(icon => {
                const title = icon.getAttribute('title');
                if (title) {
                    const m = title.match(/<b>(.*?)<\/b>/i);
                    if (m) itemBonuses.push(m[1].toLowerCase().trim());
                }
            });

            let show = true;
            if (sName && itemName !== sName) show = false;
            if (sDmg && itemDmg < sDmg) show = false;
            if (sAcc && itemAcc < sAcc) show = false;
            if (sQual && itemQual < sQual) show = false;
            if (sB1 && !itemBonuses.includes(sB1)) show = false;
            if (sB2 && !itemBonuses.includes(sB2)) show = false;

            li.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        const statusDiv = document.getElementById('ah-filter-status');
        if(statusDiv) statusDiv.textContent = `Showing ${visibleCount} / ${items.length} items`;
    }

    function processPage() {
        if (!db) return;
        const items = document.querySelectorAll('ul.items-list > li');
        items.forEach(li => {
            if (li.classList.contains('history-v14-processed')) return;
            const cont = li.querySelector('.item-cont-wrap');
            if (!cont) return;

            const nameEl = cont.querySelector('.title .item-name');
            if (!nameEl) return;
            const itemName = nameEl.textContent.trim();

            let itemDmg = 0, itemAcc = 0;
            const dmgIcon = cont.querySelector('.bonus-attachment-item-damage-bonus');
            if (dmgIcon) itemDmg = parseFloat(dmgIcon.parentNode.querySelector('.label-value').textContent);
            const accIcon = cont.querySelector('.bonus-attachment-item-accuracy-bonus');
            if (accIcon) itemAcc = parseFloat(accIcon.parentNode.querySelector('.label-value').textContent);

            const priceEl = li.querySelector('.c-bid-wrap');
            const currentPrice = priceEl ? priceEl.textContent.trim() : "N/A";

            let currentQualityNum = 0;
            let currentQualityStr = "N/A";
            const ttQual = li.querySelector('.tt-quality');
            if (ttQual) {
                currentQualityStr = ttQual.textContent.trim();
                currentQualityNum = getNum(currentQualityStr);
            }

            const bonusIcons = cont.querySelectorAll('.item-bonuses .iconsbonuses .bonus-attachment-icons');
            let currentBonuses = [];
            bonusIcons.forEach(icon => {
                const title = icon.getAttribute('title');
                if (title) {
                    const nameMatch = title.match(/<b>(.*?)<\/b>/i);
                    const name = nameMatch ? nameMatch[1].toLowerCase().trim() : "";
                    const desc = title.split('<br/>')[1] || "";
                    const valMatch = desc.match(/(\d+(?:\.\d+)?%?|x\s*\d+)/);
                    const valStr = valMatch ? valMatch[1] : "";
                    if (name) currentBonuses.push({ name: name, valStr: valStr, valNum: getNum(valStr) });
                }
            });
            currentBonuses.sort((a, b) => a.name.localeCompare(b.name));

            let currentRarity = "Grey";
            const plate = li.querySelector('.item-plate');
            if (plate) {
                if (plate.classList.contains('glow-yellow')) currentRarity = "Yellow";
                else if (plate.classList.contains('glow-orange')) currentRarity = "Orange";
                else if (plate.classList.contains('glow-red')) currentRarity = "Red";
                else if (plate.classList.contains('glow-turquoise')) currentRarity = "Turquoise";
            }

            let initialQual = "Click View";

            if (itemName) {
                const matches = findMatches(itemName, currentBonuses, currentRarity);
                const currentItem = { date: "NOW", qualityStr: initialQual, qualityNum: currentQualityNum, bonuses: currentBonuses, dmg: itemDmg, acc: itemAcc, price: currentPrice };
                injectHistory(li, matches, currentItem);
                li.classList.add('history-v14-processed');
            }
        });
    }

    function findMatches(name, targetBonuses, targetRarity) {
        if (!db || !db[name]) return [];
        let candidates = db[name];

        candidates = candidates.filter(row => {
            if (row.bonuses.length !== targetBonuses.length) return false;
            for (let i = 0; i < row.bonuses.length; i++) {
                if (row.bonuses[i].name !== targetBonuses[i].name) return false;
            }
            return true;
        });

        candidates.forEach(row => {
            let diffSum = 0;
            for (let i = 0; i < row.bonuses.length; i++) {
                diffSum += Math.abs(row.bonuses[i].valNum - targetBonuses[i].valNum);
            }
            row.bonusDiff = diffSum;
        });

        candidates.sort((a, b) => {
            const aSame = (a.rarity === targetRarity);
            const bSame = (b.rarity === targetRarity);
            if (aSame && !bSame) return -1;
            if (!aSame && bSame) return 1;

            if (a.bonusDiff !== b.bonusDiff) return a.bonusDiff - b.bonusDiff;

            return b.timestamp - a.timestamp;
        });

        return candidates;
    }

    function parseLiveQuality(detailsNode) {
        const text = detailsNode.textContent;
        const match = text.match(/Quality:\s*(\d+(?:\.\d+)?)%/i);
        if (match) {
            const qualityStr = match[1] + '%';
            const qualityNum = parseFloat(match[1]);
            const li = detailsNode.closest('li');
            if (li) updateTableWithQuality(li, qualityStr, qualityNum);
        }
    }

    function updateTableWithQuality(li, qStr, qNum) {
        const table = li.querySelector('.ah-history-table');
        if (!table) return;
        const currentQualCell = table.querySelector('.ah-curr-qual');
        if (currentQualCell) {
            currentQualCell.textContent = qStr;
            currentQualCell.classList.remove('quality-placeholder');
        }
        const histQualCells = table.querySelectorAll('.ah-hist-qual');
        histQualCells.forEach(cell => {
            const histVal = parseFloat(cell.dataset.val);
            if (!isNaN(histVal)) {
                cell.classList.remove('val-better', 'val-worse', 'val-same');
                const cls = getCompClass(histVal, qNum);
                if (cls) cell.classList.add(cls);
            }
        });
        executeSavedFilter();
    }

    function injectHistory(li, matches, currentItem) {
        if (li.querySelector('.ah-history-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'ah-history-wrapper';
        const table = document.createElement('table');
        table.className = 'ah-history-table';

        table.innerHTML = `<thead><tr><th style="width:15%">Date</th><th style="width:15%">Quality</th><th style="width:35%">Bonuses</th><th style="width:15%">Stats</th><th style="width:20%">Price</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');

        const currTr = document.createElement('tr');
        currTr.className = 'current-item-row';
        let currBonusHtml = currentItem.bonuses.map(b => `${capitalize(b.name)} <span class="curr-bonus-val">(${b.valStr})</span>`).join('<br>');
        currTr.innerHTML = `<td><span class="current-tag">Viewing</span></td><td class="ah-curr-qual quality-placeholder">N/A</td><td>${currBonusHtml || 'None'}</td><td class="stat-block">D: ${currentItem.dmg}<br>A: ${currentItem.acc}</td><td class="price-text">${currentItem.price}</td>`;
        tbody.appendChild(currTr);

        const renderRow = (m) => {
            const tr = document.createElement('tr');
            tr.className = 'ah-match-row';
            let rClass = 'rarity-grey';
            let rText = m.rarity.toLowerCase();
            if (rText.includes('orange')) rClass = 'rarity-orange';
            else if (rText.includes('yellow')) rClass = 'rarity-yellow';
            else if (rText.includes('red')) rClass = 'rarity-red';
            else if (rText.includes('green')) rClass = 'rarity-green';
            else if (rText.includes('turq')) rClass = 'rarity-turquoise';
            tr.classList.add(rClass);

            const dmgClass = getCompClass(m.dmg, currentItem.dmg);
            const accClass = getCompClass(m.acc, currentItem.acc);
            let histBonusHtml = m.bonuses.map((b, idx) => {
                const currB = currentItem.bonuses[idx];
                const bClass = currB ? getCompClass(b.valNum, currB.valNum) : '';
                return `${capitalize(b.name)} <span class="${bClass}">(${b.valStr})</span>`;
            }).join('<br>');

            tr.innerHTML = `<td>${m.date}</td><td><strong class="ah-hist-qual" data-val="${m.qualityNum}">${m.qualityStr}</strong><br><small>${m.rarity}</small></td><td>${histBonusHtml || 'None'}</td><td class="stat-block">D: <span class="${dmgClass}">${m.dmg}</span><br>A: <span class="${accClass}">${m.acc}</span></td><td class="price-text">${m.price}</td>`;
            return tr;
        };

        if (matches.length === 0) {
            tbody.innerHTML += `<tr><td colspan="5" style="text-align:center; padding:10px; color:#777;">No matching sales history found.</td></tr>`;
        } else {
            matches.slice(0, SHOW_INITIAL_N).forEach(m => tbody.appendChild(renderRow(m)));

            if (matches.length > SHOW_INITIAL_N) {
                const toggleTr = document.createElement('tr');
                toggleTr.className = 'ah-toggle-row';
                toggleTr.innerHTML = `<td colspan="5">Show ${matches.length - SHOW_INITIAL_N} More...</td>`;

                let expanded = false;
                const extraRows = [];

                toggleTr.onclick = function() {
                    if (!expanded) {
                        if (extraRows.length === 0) {
                            matches.slice(SHOW_INITIAL_N).forEach(m => {
                                const r = renderRow(m);
                                r.classList.add('ah-extended-row');
                                extraRows.push(r);
                            });
                        }
                        extraRows.forEach(row => tbody.insertBefore(row, toggleTr));
                        toggleTr.innerHTML = `<td colspan="5">Show Less</td>`;
                        expanded = true;
                    } else {
                        extraRows.forEach(row => row.remove());
                        toggleTr.innerHTML = `<td colspan="5">Show ${matches.length - SHOW_INITIAL_N} More...</td>`;
                        expanded = false;
                    }
                };
                tbody.appendChild(toggleTr);
            }
        }
        wrapper.appendChild(table);
        const cont = li.querySelector('.item-cont-wrap');
        if (cont && cont.parentNode) cont.parentNode.insertBefore(wrapper, cont.nextSibling);
    }

    init();
})();
