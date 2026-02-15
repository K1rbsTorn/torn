// ==UserScript==
// @name         Torn Race to Send Queue
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Imports race results with a 50 call/min rate limit and time estimator.
// @author       K1rbs
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      api.torn.com
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY_QUEUE = 'torn_send_queue';
    const STORAGE_KEY_API = 'torn_api_key';

    GM_addStyle(`
        #ts-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif; }
        #ts-modal { background: #222; color: #ddd; padding: 20px; border-radius: 8px; width: 400px; border: 1px solid #444; box-shadow: 0 0 15px rgba(0,0,0,0.8); }
        #ts-modal h3 { margin-top: 0; color: #85c742; text-align: center; }
        .ts-field { margin-bottom: 15px; }
        .ts-field label { display: block; margin-bottom: 5px; font-size: 12px; color: #aaa; }
        .ts-field input, .ts-field textarea { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #333; color: #fff; box-sizing: border-box; }
        .ts-field textarea { resize: vertical; height: 60px; }
        .ts-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .ts-btn { flex: 1; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .ts-btn-primary { background: #85c742; color: #000; }
        .ts-btn-cancel { background: #444; color: #fff; }
        #ts-progress { margin-top: 15px; background: #111; padding: 10px; border-radius: 4px; font-size: 12px; display: none; }
        .ts-bar-container { width: 100%; background: #333; height: 6px; border-radius: 3px; margin-top: 5px; overflow: hidden; }
        .ts-bar-fill { height: 100%; background: #85c742; width: 0%; transition: width 0.3s ease; }
    `);

    const getQueue = () => JSON.parse(GM_getValue(STORAGE_KEY_QUEUE) || '[]');
    const saveQueue = (q) => GM_setValue(STORAGE_KEY_QUEUE, JSON.stringify(q));
    const getApiKey = () => GM_getValue(STORAGE_KEY_API, '');

    function createUI() {
        const existing = document.getElementById('ts-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'ts-overlay';
        overlay.innerHTML = `
            <div id="ts-modal">
                <h3>Import Race Data</h3>
                <div id="ts-form">
                    <div class="ts-field"><label>Race ID</label><input type="text" id="ts-race-id" placeholder="e.g. 12345678" /></div>
                    <div class="ts-field"><label>Message Template</label><textarea id="ts-msg-template">GG #name! You placed #position.</textarea></div>
                    <div class="ts-buttons">
                        <button id="ts-btn-cancel" class="ts-btn ts-btn-cancel">Cancel</button>
                        <button id="ts-btn-start" class="ts-btn ts-btn-primary">Start Import</button>
                    </div>
                </div>
                <div id="ts-progress">
                    <div id="ts-status-text">Initializing...</div>
                    <div class="ts-bar-container"><div id="ts-bar-fill" class="ts-bar-fill"></div></div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        document.getElementById('ts-btn-cancel').onclick = () => overlay.remove();
        document.getElementById('ts-btn-start').onclick = startImport;
    }

    async function startImport() {
        const apiKey = getApiKey();
        if (!apiKey) return alert("Please set API Key first!");
        const raceId = document.getElementById('ts-race-id').value.trim();
        const template = document.getElementById('ts-msg-template').value.trim();
        if (!raceId) return alert("Race ID required.");

        document.getElementById('ts-form').style.display = 'none';
        document.getElementById('ts-progress').style.display = 'block';
        const statusText = document.getElementById('ts-status-text');
        const barFill = document.getElementById('ts-bar-fill');

        try {
            statusText.innerText = "Fetching Race Results...";
            const raceResp = await fetch(`https://api.torn.com/v2/racing/${raceId}/race?key=${apiKey}`);
            const raceData = await raceResp.json();
            if (raceData.error) throw new Error(raceData.error.error);

            const results = raceData.race.results;
            if (!results) throw new Error("No racers found.");

            const finalQueue = [];
            const delay = (ms) => new Promise(res => setTimeout(res, ms));
            const SECONDS_PER_CALL = 1.2;

            for (let i = 0; i < results.length; i++) {
                const driver = results[i];
                const driverId = driver.driver_id;
                const remainingItems = results.length - i;
                const secondsLeft = Math.round(remainingItems * SECONDS_PER_CALL);
                const minutes = Math.floor(secondsLeft / 60);
                const seconds = secondsLeft % 60;
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

                statusText.innerHTML = `Fetching: ${i + 1}/${results.length}<br><span style="color:#aaa; font-size:10px;">Est. time remaining: ${timeStr}</span>`;
                barFill.style.width = `${Math.round(((i + 1) / results.length) * 100)}%`;

                let name = `ID:${driverId}`;
                try {
                    const userResp = await fetch(`https://api.torn.com/user/${driverId}?key=${apiKey}`);
                    const userData = await userResp.json();
                    if (userData.name) name = userData.name;
                } catch (e) {}

                const msg = template.replace(/#name/g, name).replace(/#position/g, driver.position);
                finalQueue.push({ id: driverId, msg: msg });

                if (i < results.length - 1) await delay(SECONDS_PER_CALL * 1000);
            }

            saveQueue(finalQueue);
            document.getElementById('ts-overlay').remove();
            alert(`✅ Success! ${finalQueue.length} racers added.`);
        } catch (error) {
            alert("Error: " + error.message);
            document.getElementById('ts-overlay').remove();
        }
    }

    GM_registerMenuCommand("🏎️ Import Race", createUI);
    GM_registerMenuCommand("🔑 Set API Key", () => {
        const key = prompt("Enter API Key:", getApiKey());
        if (key) GM_setValue(STORAGE_KEY_API, key.trim());
    });
    GM_registerMenuCommand("📊 Check Status", () => {
        const q = getQueue();
        alert(q.length === 0 ? "Queue is empty." : `Next: ID ${q[0].id}\nRemaining: ${q.length}`);
    });
    GM_registerMenuCommand("🗑️ Clear Queue", () => { if (confirm("Clear queue?")) saveQueue([]); });

    document.addEventListener('click', function(e) {
        const button = e.target.closest('.action-message');
        if (!button) return;
        const queue = getQueue();
        if (queue.length === 0) return;
        const item = queue[0];
        setTimeout(() => {
            const form = button.closest('form');
            if (!form) return;
            const idInput = form.querySelector('input[name="userID"]');
            const msgInput = form.querySelector('input[name="tag"]');
            const btnLabel = button.querySelector('.action-add');
            if (idInput && msgInput) {
                idInput.value = item.id;
                msgInput.value = item.msg;
                [idInput, msgInput].forEach(el => {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.dispatchEvent(new Event('blur', { bubbles: true }));
                });
                queue.shift();
                saveQueue(queue);
                if (btnLabel) {
                    btnLabel.innerText = `Rem: ${queue.length}`;
                    btnLabel.style.color = "#85c742";
                }
            }
        }, 50);
    }, true);
})();
