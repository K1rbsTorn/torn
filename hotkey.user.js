// ==UserScript==
// @name         Torn Attack Hotkeys (v1.5 Style + Custom Keys)
// @version      1.6.0
// @description  Customizable Hotkeys. Includes Settings & Header Timer.
// @author       K1rbs [3090251] (Modified)
// @match        https://www.torn.com/loader.php?*
// @connect      api.torn.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @license      WTFPL
// ==/UserScript==

(function () {
    'use strict';

    // --- Settings / Storage Keys ---
    const KEY_API_KEY = 'attackHotkeys_ApiKey';
    const KEY_HOSP_TIMER = 'attackHotkeys_HospitalTimer';

    // Hotkey Storage Keys
    const HK = {
        START: 'hk_start',
        MAIN: 'hk_main', SEC: 'hk_sec', MELEE: 'hk_melee', TEMP: 'hk_temp',
        LEAVE: 'hk_leave', MUG: 'hk_mug', HOSP: 'hk_hosp'
    };

    // Default Key Bindings
    const DEFAULTS = {
        START: 's',
        MAIN: '1', SEC: '2', MELEE: '3', TEMP: '4',
        LEAVE: '1', MUG: '2', HOSP: '3'
    };

    // --- Getters ---
    function getVal(key, def) { return GM_getValue(key, def); }

    // --- Settings Menu Logic ---
    function saveSettings() {
        const apiKeyInput = document.getElementById('ah-api-key-input');
        const hospTimerInput = document.getElementById('ah-hosp-timer-input');

        // Save General
        GM_setValue(KEY_API_KEY, apiKeyInput.value.trim());
        GM_setValue(KEY_HOSP_TIMER, hospTimerInput.checked);

        // Save Hotkeys
        GM_setValue(HK.START, document.getElementById('in-hk-start').value.trim().toLowerCase());
        GM_setValue(HK.MAIN, document.getElementById('in-hk-main').value.trim().toLowerCase());
        GM_setValue(HK.SEC, document.getElementById('in-hk-sec').value.trim().toLowerCase());
        GM_setValue(HK.MELEE, document.getElementById('in-hk-melee').value.trim().toLowerCase());
        GM_setValue(HK.TEMP, document.getElementById('in-hk-temp').value.trim().toLowerCase());
        GM_setValue(HK.LEAVE, document.getElementById('in-hk-leave').value.trim().toLowerCase());
        GM_setValue(HK.MUG, document.getElementById('in-hk-mug').value.trim().toLowerCase());
        GM_setValue(HK.HOSP, document.getElementById('in-hk-hosp').value.trim().toLowerCase());

        alert('Settings updated! Refresh the page to apply changes.');
        document.getElementById('ah-settings-modal').remove();
    }

    function openSettings() {
        if (document.getElementById('ah-settings-modal')) return;

        const currentKey = getVal(KEY_API_KEY, '');
        const currentHospTimer = getVal(KEY_HOSP_TIMER, true);

        // Helpers for inputs
        const mkInput = (id, val) => `<input type="text" id="${id}" value="${val}" style="width: 40px; text-align: center; background: #333; color: #fff; border: 1px solid #555; padding: 5px; border-radius: 4px;">`;
        const mkRow = (label, input) => `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;"><span style="color:#aaa;">${label}</span>${input}</div>`;

        const modalHTML = `
            <div id="ah-settings-modal" style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #111; border: 2px solid #555; padding: 25px; z-index: 999999;
                color: #DDD; width: 450px; box-shadow: 0 0 15px rgba(0,0,0,0.9); border-radius: 8px; font-family: Arial, sans-serif;">
                
                <h3 style="margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px; color: #fff;">Attack Hotkeys Settings ⚔️</h3>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Torn API Key:</label>
                    <input type="text" id="ah-api-key-input" value="${currentKey}" placeholder="Enter API Key..." style="width: 95%; padding: 8px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center;">
                        <input type="checkbox" id="ah-hosp-timer-input" ${currentHospTimer ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.2); cursor: pointer;">
                        <label for="ah-hosp-timer-input" style="cursor: pointer;">Enable Hospital Timer</label>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px solid #444; padding-top: 15px; margin-bottom: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #4CAF50;">Weapons</h4>
                        ${mkRow('Start Fight:', mkInput('in-hk-start', getVal(HK.START, DEFAULTS.START)))}
                        ${mkRow('Main:', mkInput('in-hk-main', getVal(HK.MAIN, DEFAULTS.MAIN)))}
                        ${mkRow('Secondary:', mkInput('in-hk-sec', getVal(HK.SEC, DEFAULTS.SEC)))}
                        ${mkRow('Melee:', mkInput('in-hk-melee', getVal(HK.MELEE, DEFAULTS.MELEE)))}
                        ${mkRow('Temporary:', mkInput('in-hk-temp', getVal(HK.TEMP, DEFAULTS.TEMP)))}
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #f44336;">Finish</h4>
                        ${mkRow('Leave:', mkInput('in-hk-leave', getVal(HK.LEAVE, DEFAULTS.LEAVE)))}
                        ${mkRow('Mug:', mkInput('in-hk-mug', getVal(HK.MUG, DEFAULTS.MUG)))}
                        ${mkRow('Hospitalize:', mkInput('in-hk-hosp', getVal(HK.HOSP, DEFAULTS.HOSP)))}
                    </div>
                </div>

                <div style="text-align: right;">
                    <button id="ah-save-btn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">Save</button>
                    <button id="ah-close-btn" style="padding: 10px 20px; background: #f44336; color: white; border: none; cursor: pointer; margin-left: 10px; border-radius: 4px;">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('ah-save-btn').addEventListener('click', saveSettings);
        document.getElementById('ah-close-btn').addEventListener('click', () => document.getElementById('ah-settings-modal').remove());
    }

    GM_registerMenuCommand("Attack Hotkeys: Open Settings", openSettings);


    // --- Hospital Timer Logic ---
    function initHospitalTimer() {
        const API_Key = getVal(KEY_API_KEY, '');
        const hospitalTimerEnabled = getVal(KEY_HOSP_TIMER, true);
        
        if (!hospitalTimerEnabled || !API_Key || API_Key.length < 5) return;

        let urlParams = new URLSearchParams(window.location.search);
        let targetID = urlParams.get('user2ID');

        if (!targetID) return;

        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.torn.com/user/${targetID}?selections=profile&key=${API_Key}`,
            onload: function(response) {
                try {
                    let data = JSON.parse(response.responseText);
                    if (data.error) return;
                    if (data.status.state === 'Hospital') {
                        waitForHeaderAndInject(data.status.until);
                    }
                } catch (e) { console.error("TORN HOTKEYS - JSON Error", e); }
            }
        });
    }

    function waitForHeaderAndInject(until) {
        const checkExist = setInterval(function() {
           const titleContainer = document.querySelector('.titleContainer___QrlWP');
           if (titleContainer) {
              clearInterval(checkExist);
              createPlainTimer(titleContainer, until);
           }
        }, 100);
        setTimeout(() => clearInterval(checkExist), 5000);
    }

    function createPlainTimer(container, until) {
        let timerDisplay = document.createElement('span');
        timerDisplay.id = 'hosp-timer-display';
        timerDisplay.style.cssText = `
            font-size: 14px; font-weight: bold; font-family: monospace; color: #ff4444;
            margin-left: 15px; vertical-align: middle; background: rgba(0, 0, 0, 0.4);
            padding: 2px 6px; border-radius: 4px; border: 1px solid #444;
        `;
        timerDisplay.innerText = "--:--";
        container.appendChild(timerDisplay);
        startCountdown(until);
    }

    function startCountdown(endTime) {
        let display = document.getElementById('hosp-timer-display');
        let interval = setInterval(() => {
            let now = Math.floor(Date.now() / 1000);
            let totalSeconds = endTime - now;
            if (totalSeconds <= 0) {
                clearInterval(interval);
                display.innerText = "READY";
                display.style.color = "#00FF00";
                display.style.borderColor = "#00FF00";
            } else {
                let h = Math.floor(totalSeconds / 3600);
                let m = Math.floor((totalSeconds % 3600) / 60);
                let s = Math.floor(totalSeconds % 60);
                let mStr = m < 10 ? "0" + m : m;
                let sStr = s < 10 ? "0" + s : s;
                display.innerText = h > 0 ? `[${h}:${mStr}:${sStr}]` : `[${mStr}:${sStr}]`;
            }
        }, 500);
    }

    // --- Helper: Find Button by Text ---
    function getFinishButton(actionText) {
        const container = document.querySelector('.dialogButtons___nX4Bz');
        if (!container) return null;
        return Array.from(container.querySelectorAll('button'))
            .find(btn => btn.innerText.toLowerCase().trim() === actionText.toLowerCase());
    }

    // --- Helper: Click Wrapper ---
    function tryClick(element) {
        if (element && element.offsetParent !== null) { // Checks if exists and is visible
            element.click();
            return true;
        }
        return false;
    }

    // --- Hotkey Functionality ---
    function addHotkeys() {
        console.log('TORN HOTKEYS - Hotkeys Active');

        const keys = {
            start: getVal(HK.START, DEFAULTS.START),
            main: getVal(HK.MAIN, DEFAULTS.MAIN),
            sec: getVal(HK.SEC, DEFAULTS.SEC),
            melee: getVal(HK.MELEE, DEFAULTS.MELEE),
            temp: getVal(HK.TEMP, DEFAULTS.TEMP),
            leave: getVal(HK.LEAVE, DEFAULTS.LEAVE),
            mug: getVal(HK.MUG, DEFAULTS.MUG),
            hosp: getVal(HK.HOSP, DEFAULTS.HOSP)
        };

        document.addEventListener('keydown', function(event) {
            // Prevent triggering when typing in chat/forums/settings
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            const k = event.key.toLowerCase();
            let handled = false;

            // 1. Finish Actions (Highest Priority)
            // Checks if 'Finish' dialog buttons (Leave/Mug/Hosp) are visible first
            if (!handled && k === keys.leave) handled = tryClick(getFinishButton('leave'));
            if (!handled && k === keys.mug)   handled = tryClick(getFinishButton('mug'));
            if (!handled && k === keys.hosp)  handled = tryClick(getFinishButton('hospitalize'));

            // 2. Start Button
            if (!handled && k === keys.start) handled = tryClick(document.querySelector('.torn-btn.btn___RxE8_.silver'));

            // 3. Weapons
            if (!handled && k === keys.main)  handled = tryClick(document.querySelector('#weapon_main'));
            if (!handled && k === keys.sec)   handled = tryClick(document.querySelector('#weapon_second'));
            if (!handled && k === keys.melee) handled = tryClick(document.querySelector('#weapon_melee'));
            if (!handled && k === keys.temp)  handled = tryClick(document.querySelector('#weapon_temp'));

            if (handled) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`TORN HOTKEYS - Action triggered for key: ${k}`);
            }
        });
    }

    // --- Init ---
    window.addEventListener('load', function () {
        console.log('TORN HOTKEYS - Page loaded');
        addHotkeys();
        initHospitalTimer();

        // Remove background (Existing Logic)
        const sidebarElement = document.querySelector('.custom-bg-desktop.sidebar-off');
        if (sidebarElement) sidebarElement.remove();
    });

    // Defender Model Stripping (Existing Logic)
    var startTimeDefender = Date.now();
    var intervalIdDefender = setInterval(function() {
        if (Date.now() - startTimeDefender > 5000) { clearInterval(intervalIdDefender); return; }
        var defenderModel = document.querySelectorAll("#defender > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div > div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *");
        for (const element of defenderModel) element.remove();
    }, 100);

    // Attacker Model Stripping (Existing Logic)
    var startTimeAttacker = Date.now();
    var intervalIdAttacker = setInterval(function() {
        if (Date.now() - startTimeAttacker > 5000) { clearInterval(intervalIdAttacker); return; }
        var attackerModel = document.querySelectorAll("#attacker > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div.allLayers___cXY5i > div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *");
        for (const element of attackerModel) element.remove();
    }, 100);

})();
