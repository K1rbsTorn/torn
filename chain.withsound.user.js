// ==UserScript==
// @name          Chain Timer Enhancer (with Alarm, Count, and Settings)
// @namespace     http://tampermonkey.net/
// @version       1.17
// @description   Increase the size and move an element with class "bar-descr___muXn5" to the top of the page, with alarm, chain count, new-tab click, Alt+Click single-page attack, customizable sound/trigger time, and Ctrl+Click attack functionality.
// @author        K1rbs
// @license       MIT
// @match         https://www.torn.com/*
// @grant         unsafeWindow
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_registerMenuCommand
// @downloadURL   https://raw.githubusercontent.com/K1rbsTorn/torn/main/chain.withsound.user.js
// @updateURL     https://raw.githubusercontent.com/K1rbsTorn/torn/main/chain.withsound.user.js
// ==/UserScript==

(function (window, $) {
    'use strict';

    const minID = 3100000;
    const maxID = 3400000;

    const DEFAULT_ALARM_URL = 'https://www.myinstants.com/media/sounds/may-i-have-your-attention-please.mp3';
    const SETTING_URL_KEY = 'chainTimerAlarmUrl';

    const DEFAULT_ALARM_MINUTES = 2;
    const SETTING_MINUTES_KEY = 'chainTimerAlarmMinutes';

    // *** NEW SETTING KEY ***
    const SETTING_SOUND_ENABLED_KEY = 'chainTimerAlarmEnabled';

    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getRandomProfileURL(isAttack) {
        let randID = getRandomNumber(minID, maxID);
        if (isAttack) {
            return `https://www.torn.com/loader.php?sid=attack&user2ID=${randID}`;
        }
        return `https://www.torn.com/profiles.php?XID=${randID}`;
    }

    function getAlarmUrl() {
        return GM_getValue(SETTING_URL_KEY, DEFAULT_ALARM_URL);
    }

    function getAlarmMinutes() {
        const minutes = GM_getValue(SETTING_MINUTES_KEY, DEFAULT_ALARM_MINUTES);
        return parseInt(minutes) || DEFAULT_ALARM_MINUTES;
    }

    // NEW GETTER FOR SOUND TOGGLE
    function getAlarmEnabled() {
        return GM_getValue(SETTING_SOUND_ENABLED_KEY, true); // Default to true (sound enabled)
    }

    function saveSettings() {
        const urlInput = document.getElementById('chain-timer-sound-input');
        const minutesInput = document.getElementById('chain-timer-minutes-input');
        const soundEnabledInput = document.getElementById('chain-timer-enable-sound-input'); // Get new input

        const newUrl = urlInput.value.trim();
        const newMinutes = parseInt(minutesInput.value.trim());
        const newSoundEnabled = soundEnabledInput.checked; // Get checkbox state

        GM_setValue(SETTING_URL_KEY, newUrl || DEFAULT_ALARM_URL);
        GM_setValue(SETTING_SOUND_ENABLED_KEY, newSoundEnabled); // SAVE NEW SETTING

        if (!isNaN(newMinutes) && newMinutes >= 1 && newMinutes <= 10) {
            GM_setValue(SETTING_MINUTES_KEY, newMinutes);
        } else {
            GM_setValue(SETTING_MINUTES_KEY, DEFAULT_ALARM_MINUTES);
        }

        alert('Chain Timer settings updated! A page refresh is required for changes to take effect.');
        document.getElementById('chain-timer-settings-modal').remove();
    }

    function openSettings() {
        if (document.getElementById('chain-timer-settings-modal')) return;

        const currentUrl = getAlarmUrl();
        const currentMinutes = getAlarmMinutes();
        const currentSoundEnabled = getAlarmEnabled(); // Get new setting

        const modalHTML = `
            <div id="chain-timer-settings-modal" style="
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #111; border: 2px solid #555; padding: 25px; z-index: 20000;
                color: #DDD; width: 450px; box-shadow: 0 0 15px rgba(0,0,0,0.9); border-radius: 8px;">

                <h3 style="margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px;">Chain Timer Alarm Settings 🔊⏳</h3>

                <div style="margin-bottom: 20px;">
                    <label for="chain-timer-minutes-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Alarm Trigger Time (Minutes):</label>
                    <input type="number" id="chain-timer-minutes-input" value="${currentMinutes}" min="1" max="10"
                        style="width: 100px; padding: 8px; margin-top: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    <p style="font-size: 12px; color: #999; margin-top: 5px;">The alarm will trigger when the minutes left are less than this value (e.g., set to 3 to alarm at 2:59).</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Alarm Sound Control:</label>
                    <input type="checkbox" id="chain-timer-enable-sound-input" ${currentSoundEnabled ? 'checked' : ''}
                        style="margin-right: 10px; transform: scale(1.2); vertical-align: middle;">
                    <label for="chain-timer-enable-sound-input" style="vertical-align: middle;">Enable Alarm Sound</label>
                </div>
                <div style="margin-bottom: 20px;">
                    <label for="chain-timer-sound-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Alarm Sound URL:</label>
                    <input type="text" id="chain-timer-sound-input" placeholder="Paste new sound URL here..." value="${currentUrl === DEFAULT_ALARM_URL ? '' : currentUrl}"
                        style="width: 95%; padding: 8px; margin-top: 5px; background: #333; color: white; border: 1px solid #555; border-radius: 4px;">
                    <p style="font-size: 12px; color: #999; margin-top: 5px;">Enter a direct audio file URL (e.g., MP3). Leave blank for default sound.</p>
                </div>

                <div style="margin-top: 30px; text-align: right;">
                    <button id="chain-timer-save-btn" style="
                        padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">
                        Save & Reload
                    </button>
                    <button id="chain-timer-close-btn" style="
                        padding: 10px 20px; background: #f44336; color: white; border: none; cursor: pointer; margin-left: 10px; border-radius: 4px;">
                        Close
                    </button>
                </div>

            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        document.getElementById('chain-timer-save-btn').addEventListener('click', saveSettings);
        document.getElementById('chain-timer-close-btn').addEventListener('click', () => {
            document.getElementById('chain-timer-settings-modal').remove();
        });
    }

    GM_registerMenuCommand("Chain Timer: Open Settings", openSettings);

    // Initial positioning and styling for the Chain Count Element
    const chainCountElement = document.createElement('div');
    chainCountElement.id = 'enhanced-chain-count';
    chainCountElement.style.cssText = `
        position: fixed;
        top: 165px;
        right: 10px;
        font-size: 30px;
        font-weight: bold;
        color: #FFFFFF;
        background-color: #333333;
        padding: 5px 10px;
        border-radius: 5px;
        z-index: 10000;
        cursor: pointer;
    `;
    chainCountElement.textContent = 'Chain: ...';
    document.body.appendChild(chainCountElement);

    // Alt+Click logic for the Chain Count Element
    chainCountElement.addEventListener('click', function (e) {
        // If Alt is pressed, force isAttack=true, otherwise use e.ctrlKey
        const isAttack = e.altKey || e.ctrlKey;
        const targetLink = getRandomProfileURL(isAttack);
        
        if (e.altKey) {
            // ALT + Click: Attack in the same window/tab (replaces current page, no history)
            window.location.replace(targetLink);
        } else {
            // Regular Click/Ctrl+Click: Open link in a new tab (original intended behavior)
            window.open(targetLink, '_blank');
        }
    });

    function setupTimerElement(element) {
        console.log("Chain Timer Enhancer: Element found, applying styles and observers.");

        // Combined all initial styles here for reliable application
        element.style.cssText = `
            position: fixed;
            top: 80px;
            right: 10px;
            background: green; /* Initial color based on logic below */
            color: black;
            z-index: 10000;
            font-size: 80px !important; 
            cursor: pointer;
        `;
        
        const alarmThreshold = getAlarmMinutes();
        const alarmUrl = getAlarmUrl();

        const alarmSound = new Audio(alarmUrl);
        alarmSound.preload = 'auto';
        let hasAlarmPlayed = false;

        // Alt+Click logic for the Timer Element
        element.addEventListener('click', function (e) {
            // If Alt is pressed, force isAttack=true, otherwise use e.ctrlKey
            const isAttack = e.altKey || e.ctrlKey;
            const targetLink = getRandomProfileURL(isAttack);

            if (e.altKey) {
                // ALT + Click: Attack in the same window/tab (replaces current page, no history)
                window.location.replace(targetLink);
            } else {
                // Regular Click/Ctrl+Click: Open link in a new tab (original intended behavior)
                window.open(targetLink, '_blank');
            }
        });

        const chainCountSourceElement = document.querySelector('.chain-bar___vjdPL .bar-value___uxnah');

        var config = { characterData: true, subtree: true };
        var timeObserver = new MutationObserver((list) => {
            const timerElement = list[0].target.parentElement;
            if (!timerElement) return;

            if (chainCountSourceElement) {
                const countText = chainCountSourceElement.textContent;
                chainCountElement.textContent = `Chain: ${countText}`;
            }

            var timeArray = timerElement.textContent.split(":");
            var minutes = timeArray[timeArray.length - 2];

            if (minutes) {
                let minInt = parseInt(minutes);

                if (minInt > 3) {
                    timerElement.style.backgroundColor = "green";
                    hasAlarmPlayed = false;
                } else if (minInt > 2) {
                    timerElement.style.backgroundColor = "orange";
                    hasAlarmPlayed = false;
                } else if (minInt >= 0) {
                    timerElement.style.backgroundColor = "red";
                }

                if (minInt < alarmThreshold && !hasAlarmPlayed) {
                    // CHECK NEW SETTING BEFORE PLAYING ALARM
                    if (getAlarmEnabled()) { 
                        console.log(`Chain Timer Enhancer: Playing alarm! Threshold: ${alarmThreshold} minutes.`);
                        hasAlarmPlayed = true;

                        alarmSound.play().catch(e => {
                            console.error("Chain Timer Enhancer: Audio play failed. This is likely due to browser autoplay policy.");
                            console.error(e);
                        });
                    }
                    // END CHECK
                }
            }
        });

        timeObserver.observe(element, config);

        // Initial check and style application (to ensure color is right upon load)
        var timeArray = element.textContent.split(":");
        var minutes = timeArray[timeArray.length - 2];
        if (minutes) {
            let minInt = parseInt(minutes);
            if (minInt > 3) {
                element.style.backgroundColor = "green";
            } else if (minInt > 2) {
                element.style.backgroundColor = "orange";
            } else if (minInt >= 0) {
                element.style.backgroundColor = "red";
            }
        }

        if (chainCountSourceElement) {
            chainCountElement.textContent = `Chain: ${chainCountSourceElement.textContent}`;
            
            // Observer for the chain count value
            new MutationObserver((list) => {
                chainCountElement.textContent = `Chain: ${chainCountSourceElement.textContent}`;
            }).observe(chainCountSourceElement, { characterData: true, childList: true, subtree: true });
        }
    }

    // --- RELIABILITY FIX: Immediately check for the element and only use observer if needed ---

    // 1. Immediately inject the custom font-size CSS using a style tag
    const sizeRule = `
        .bar-timeleft___B9RGV {
            font-size: 80px !important;
            cursor: pointer;
        }
    `;
    const sizeStyleElement = document.createElement('style');
    sizeStyleElement.textContent = sizeRule;
    document.head.appendChild(sizeStyleElement);
    
    // 2. Check if the element exists right away
    let targetElement = document.querySelector('.bar-timeleft___B9RGV');

    if (targetElement) {
        // If found immediately, set it up and DON'T start the body observer
        setupTimerElement(targetElement);
    } else {
        // If not found, start the observer
        const bodyObserver = new MutationObserver((mutationsList, observer) => {
            const element = document.querySelector('.bar-timeleft___B9RGV');
            if (element) {
                setupTimerElement(element);
                observer.disconnect(); // Stop observing once found
            }
        });

        // Start observation on the body for any additions to the subtree
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

})(unsafeWindow, unsafeWindow.jQuery);
