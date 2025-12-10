// ==UserScript==
// @name         Torn Attack Hotkeys (Weapons + Finishers + HUD Timer)
// @version      1.5.0
// @description  Hotkeys: S (Start), 1-4 (Weapons). Post-fight: 1 (Leave), 2 (Mug), 3 (Hospitalize). Removes cosmetic elements. Includes Settings & Header Timer.
// @author       K1rbs [3090251]
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

    // --- Getters ---
    function getApiKey() {
        return GM_getValue(KEY_API_KEY, '');
    }

    function getHospitalTimerEnabled() {
        return GM_getValue(KEY_HOSP_TIMER, true);
    }

    // --- Global Variables ---
    const API_Key = getApiKey();
    const hospitalTimerEnabled = getHospitalTimerEnabled();

    // --- Settings Menu Logic ---
    function saveSettings() {
        const apiKeyInput = document.getElementById('ah-api-key-input');
        const hospTimerInput = document.getElementById('ah-hosp-timer-input');

        const newKey = apiKeyInput.value.trim();
        const newHospTimer = hospTimerInput.checked;

        GM_setValue(KEY_API_KEY, newKey);
        GM_setValue(KEY_HOSP_TIMER, newHospTimer);

        alert('Settings updated! Refresh the page to apply changes.');
        document.getElementById('ah-settings-modal').remove();
    }

    function openSettings() {
        if (document.getElementById('ah-settings-modal')) return;

        const currentKey = getApiKey();
        const currentHospTimer = getHospitalTimerEnabled();

        const modalHTML = `
            <div id="ah-settings-modal" style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #111; border: 2px solid #555; padding: 25px; z-index: 999999;
                color: #DDD; width: 400px; box-shadow: 0 0 15px rgba(0,0,0,0.9); border-radius: 8px; font-family: Arial, sans-serif;">
                
                <h3 style="margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px; color: #fff;">Attack Hotkeys Settings ⚔️</h3>
                
                <div style="margin-bottom: 20px;">
                    <label for="ah-api-key-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Torn API Key:</label>
                    <input type="text" id="ah-api-key-input" placeholder="Enter your API Key..." value="${currentKey}"
                        style="width: 95%; padding: 8px; margin-top: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    <p style="font-size: 12px; color: #999; margin-top: 5px;">Required for Hospital Timer.</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Features:</label>
                    <div style="display: flex; align-items: center; margin-top: 8px;">
                        <input type="checkbox" id="ah-hosp-timer-input" ${currentHospTimer ? 'checked' : ''}
                            style="margin-right: 10px; transform: scale(1.2); cursor: pointer;">
                        <label for="ah-hosp-timer-input" style="cursor: pointer;">Enable Hospital Timer</label>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: right;">
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
        if (!hospitalTimerEnabled || !API_Key || API_Key.length < 5) return;

        let urlParams = new URLSearchParams(window.location.search);
        let targetID = urlParams.get('user2ID');

        if (!targetID) return;

        // API Call
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.torn.com/user/${targetID}?selections=profile&key=${API_Key}`,
            onload: function(response) {
                try {
                    let data = JSON.parse(response.responseText);
                    if (data.error) return;

                    let state = data.status.state;
                    let until = data.status.until;

                    if (state === 'Hospital') {
                        // Wait for the specific container to exist before injecting
                        waitForHeaderAndInject(until);
                    }
                } catch (e) {
                    console.error("TORN HOTKEYS - JSON Error", e);
                }
            }
        });
    }

    function waitForHeaderAndInject(until) {
        // We look for the title container from the provided HTML
        const checkExist = setInterval(function() {
           const titleContainer = document.querySelector('.titleContainer___QrlWP');
           
           if (titleContainer) {
              clearInterval(checkExist);
              createPlainTimer(titleContainer, until);
           }
        }, 100); // Check every 100ms
        
        // Timeout after 5 seconds to prevent infinite checking
        setTimeout(() => clearInterval(checkExist), 5000);
    }

    function createPlainTimer(container, until) {
        // Create the timer span
        let timerDisplay = document.createElement('span');
        timerDisplay.id = 'hosp-timer-display';
        
        // Style: Plain, aligned with title, red color
        timerDisplay.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            font-family: monospace;
            color: #ff4444; 
            margin-left: 15px;
            vertical-align: middle;
            background: rgba(0, 0, 0, 0.4);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #444;
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
                display.style.color = "#00FF00"; // Green
                display.style.borderColor = "#00FF00";
            } else {
                let h = Math.floor(totalSeconds / 3600);
                let m = Math.floor((totalSeconds % 3600) / 60);
                let s = Math.floor(totalSeconds % 60);

                let mStr = m < 10 ? "0" + m : m;
                let sStr = s < 10 ? "0" + s : s;

                if (h > 0) display.innerText = `[${h}:${mStr}:${sStr}]`;
                else display.innerText = `[${mStr}:${sStr}]`;
            }
        }, 500);
    }


    // --- Helper: Find Button by Text ---
    function getFinishButton(actionText) {
        const container = document.querySelector('.dialogButtons___nX4Bz');
        if (!container) return null;
        const buttons = Array.from(container.querySelectorAll('button'));
        return buttons.find(btn => btn.innerText.toLowerCase().trim() === actionText.toLowerCase());
    }

    // --- Hotkey Functionality ---
    function addHotkeys() {
        console.log('TORN HOTKEYS - Setting up hotkeys...');
        document.addEventListener('keydown', function(event) {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            const key = event.key.toLowerCase();
            let targetElement = null;
            let action = null;

            switch (key) {
                case 's':
                    targetElement = document.querySelector('.torn-btn.btn___RxE8_.silver');
                    action = 'Start Fight';
                    break;
                case '1':
                    targetElement = getFinishButton('leave');
                    if (targetElement) action = 'Leave Fight';
                    else { targetElement = document.querySelector('#weapon_main'); action = 'Primary Weapon Select'; }
                    break;
                case '2':
                    targetElement = getFinishButton('mug');
                    if (targetElement) action = 'Mug Opponent';
                    else { targetElement = document.querySelector('#weapon_second'); action = 'Secondary Weapon Select'; }
                    break;
                case '3':
                    targetElement = getFinishButton('hospitalize');
                    if (targetElement) action = 'Hospitalize Opponent';
                    else { targetElement = document.querySelector('#weapon_melee'); action = 'Melee Weapon Select'; }
                    break;
                case '4':
                    targetElement = document.querySelector('#weapon_temp');
                    action = 'Temporary Weapon Select';
                    break;
                default: return;
            }

            if (targetElement) {
                event.preventDefault();
                targetElement.click();
                console.log(`TORN HOTKEYS - Hotkey activated: ${action}`);
            }
        });
    }

    // --- Init ---
    window.addEventListener('load', function () {
        console.log('TORN HOTKEYS - Page loaded');
        addHotkeys();
        initHospitalTimer();

        // Remove background
        const sidebarElement = document.querySelector('.custom-bg-desktop.sidebar-off');
        if (sidebarElement) sidebarElement.remove();
    });

    // Defender Model Stripping
    var startTimeDefender = Date.now();
    var intervalIdDefender = setInterval(function() {
        if (Date.now() - startTimeDefender > 5000) { clearInterval(intervalIdDefender); return; }
        var defenderModel = document.querySelectorAll("#defender > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div > div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *");
        for (const element of defenderModel) element.remove();
    }, 100);

    // Attacker Model Stripping
    var startTimeAttacker = Date.now();
    var intervalIdAttacker = setInterval(function() {
        if (Date.now() - startTimeAttacker > 5000) { clearInterval(intervalIdAttacker); return; }
        var attackerModel = document.querySelectorAll("#attacker > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div.allLayers___cXY5i > div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *");
        for (const element of attackerModel) element.remove();
    }, 100);
})();
