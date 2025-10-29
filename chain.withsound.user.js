// ==UserScript==
// @name          Chain Timer Enhancer (with Alarm, Count, and Settings)
// @namespace     http://tampermonkey.net/
// @version       1.10
// @description   Increase the size and move an element with class "bar-descr___muXn5" to the top of the page, with alarm, chain count, new-tab click, customizable sound/trigger time, and Ctrl+Click attack functionality.
// @author        K1rbs
// @license       MIT
// @match         https://www.torn.com/*
// @grant         unsafeWindow
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_registerMenuCommand
// @downloadURL   https://update.greasyfork.org/scripts/478315/Chain%20Timer%20Enhancer.user.js
// @updateURL     https://update.greasyfork.org/scripts/478315/Chain%20Timer%20Enhancer.meta.js
// ==/UserScript==

(function (window, $) {
    'use strict';

    const minID = 3100000;
    const maxID = 3400000;

    const DEFAULT_ALARM_URL = 'https://www.myinstants.com/media/sounds/may-i-have-your-attention-please.mp3';
    const SETTING_URL_KEY = 'chainTimerAlarmUrl';
    
    const DEFAULT_ALARM_MINUTES = 2;
    const SETTING_MINUTES_KEY = 'chainTimerAlarmMinutes';

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

    function saveSettings() {
        const urlInput = document.getElementById('chain-timer-sound-input');
        const minutesInput = document.getElementById('chain-timer-minutes-input');

        const newUrl = urlInput.value.trim();
        const newMinutes = parseInt(minutesInput.value.trim());

        GM_setValue(SETTING_URL_KEY, newUrl || DEFAULT_ALARM_URL);

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

    const sizeRule = `
        .bar-timeleft___B9RGV {
            font-size: 80px !important;
            cursor: pointer;
        }
    `;
    const sizeStyleElement = document.createElement('style');
    sizeStyleElement.textContent = sizeRule;
    document.head.appendChild(sizeStyleElement);

    const chainCountElement = document.createElement('div');
    chainCountElement.id = 'enhanced-chain-count';
    chainCountElement.style.position = 'fixed';
    chainCountElement.style.top = '165px';
    chainCountElement.style.right = '10px';
    chainCountElement.style.fontSize = '30px';
    chainCountElement.style.fontWeight = 'bold';
    chainCountElement.style.color = '#FFFFFF';
    chainCountElement.style.backgroundColor = '#333333';
    chainCountElement.style.padding = '5px 10px';
    chainCountElement.style.borderRadius = '5px';
    chainCountElement.style.zIndex = '10000';
    chainCountElement.style.cursor = 'pointer';
    chainCountElement.textContent = 'Chain: ...';
    document.body.appendChild(chainCountElement);

    chainCountElement.addEventListener('click', function (e) {
        const profileLink = getRandomProfileURL(e.ctrlKey);
        window.open(profileLink, '_blank');
    });

    function setupTimerElement(element) {
        console.log("Chain Timer Enhancer: Element found, applying styles and observers.");

        element.style.position = 'fixed';
        element.style.top = '80px';
        element.style.right = '10px';
        element.style.background = "green";
        element.style.color = "black";
        element.style.zIndex = '10000';

        const alarmThreshold = getAlarmMinutes();
        const alarmUrl = getAlarmUrl();

        const alarmSound = new Audio(alarmUrl);
        alarmSound.preload = 'auto';
        let hasAlarmPlayed = false;

        element.addEventListener('click', function (e) {
            const link = getRandomProfileURL(e.ctrlKey);
            window.location.href = link;
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
                    console.log(`Chain Timer Enhancer: Playing alarm! Threshold: ${alarmThreshold} minutes.`);
                    hasAlarmPlayed = true;

                    alarmSound.play().catch(e => {
                        console.error("Chain Timer Enhancer: Audio play failed. This is likely due to browser autoplay policy.");
                        console.error(e);
                    });
                }
            }

            timerElement.style.position = 'fixed';
            timerElement.style.top = '80px';
            timerElement.style.right = '10px';
            timerElement.style.color = "black";
        });
        
        timeObserver.observe(element, config);

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
        }
        
        if (chainCountSourceElement) {
             new MutationObserver((list) => {
                chainCountElement.textContent = `Chain: ${chainCountSourceElement.textContent}`;
             }).observe(chainCountSourceElement, { characterData: true, childList: true, subtree: true });
        }
    }

    const bodyObserver = new MutationObserver((mutationsList, observer) => {
        const element = document.querySelector('.bar-timeleft___B9RGV');
        if (element) {
            setupTimerElement(element);
            observer.disconnect();
        }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

})(unsafeWindow, unsafeWindow.jQuery);
