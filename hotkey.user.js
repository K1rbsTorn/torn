// ==UserScript==
// @name          Torn Attack Hotkeys
// @version       1.1.0
// @description   Adds hotkeys to the Torn attack page: S for Start Fight, 1-4 for weapons. Corrected Primary/Secondary selectors. Removes cosmetic elements for faster loading.
// @author        K1rbs [3090251]
// @match         https://www.torn.com/loader.php?*
// @grant         none
// @license       WTFPL
// ==/UserScript==

(function () {
    'use strict';

    // --- Hotkey Functionality ---

    function addHotkeys() {
        console.log('TORN HOTKEYS - Setting up hotkeys...');
        document.addEventListener('keydown', function(event) {
            // Ignore key presses if the user is typing in an input field
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            const key = event.key.toLowerCase();
            let targetElement = null;
            let action = null;

            switch (key) {
                case 's':
                    // Selector for the Start Fight button
                    targetElement = document.querySelector('.torn-btn.btn___RxE8_.silver');
                    action = 'Start Fight';
                    break;
                case '1':
                    // Corrected Primary Weapon selector from HTML: #weapon_main
                    targetElement = document.querySelector('#weapon_main');
                    action = 'Primary Weapon Select';
                    break;
                case '2':
                    // Corrected Secondary Weapon selector from HTML: #weapon_second
                    targetElement = document.querySelector('#weapon_second');
                    action = 'Secondary Weapon Select';
                    break;
                case '3':
                    // Melee Weapon selector is correct: #weapon_melee
                    targetElement = document.querySelector('#weapon_melee');
                    action = 'Melee Weapon Select';
                    break;

                case '4':
                    // Temporary Weapon selector is correct: #weapon_temp
                    targetElement = document.querySelector('#weapon_temp');
                    action = 'Temporary Weapon Select';
                    break;
                default:
                    return;
            }

            if (targetElement) {
                event.preventDefault();
                targetElement.click();
                console.log(`TORN HOTKEYS - Hotkey activated: ${action}`);
            }
        });
    }

    // --- End Hotkey Functionality ---

    // Wait for page to load before executing this part of the script
    window.addEventListener('load', function () {
        console.log('TORN HOTKEYS - Page loaded');

        // 1. Add the hotkeys after the page loads
        addHotkeys();

        //
        // Element Stripping (Performance Optimization)
        //

        // Remove background element
        const sidebarElement = document.querySelector('.custom-bg-desktop.sidebar-off');
        if (sidebarElement) {
            sidebarElement.remove();
            console.log('TORN HOTKEYS - background removed.');
        }
    })

    // Defender Model Stripping
    var startTimeDefender = Date.now();
    var intervalIdDefender = setInterval(function() {
        if (Date.now() - startTimeDefender > 5000) {
            clearInterval(intervalIdDefender);
            return;
        }
        var defenderModel = document.querySelectorAll("#defender > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div > div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *");

        for (const element of defenderModel) {
            element.remove();
        }
        if (defenderModel.length > 0 && Date.now() - startTimeDefender < 100) {
            console.log(`TORN HOTKEYS - Defender model removed.`);
        }
    }, 100);

    // Attacker Model Stripping
    var startTimeAttacker = Date.now();
    var intervalIdAttacker = setInterval(function() {
        if (Date.now() - startTimeAttacker > 5000) {
            clearInterval(intervalIdAttacker);
            return;
        }
        var attackerModel = document.querySelectorAll("#attacker > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div.allLayers___cXY5i > div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *");

        for (const element of attackerModel) {
            element.remove();
        }
        if (attackerModel.length > 0 && Date.now() - startTimeAttacker < 100) {
            console.log(`TORN HOTKEYS - Attacker model removed.`);
        }
    }, 100);
})();
