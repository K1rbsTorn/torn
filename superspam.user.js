// ==UserScript==
// @name         Torn Send Cash Filler (Stationary - Custom Amounts)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Stationary clicking (Fill -> Send -> Yes -> Okay).
// @author       K1rbs
// @match        https://www.torn.com/profiles.php?XID=*
// @connect      icanhazdadjoke.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // VARIABLES
    let savedCoords = null; // Coordinates of the profile button
    let flowActive = false; // Are we in the middle of a sending flow?

    // --- HELPER: Fetch Joke ---
    function getDadJoke(callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://icanhazdadjoke.com/",
            headers: { "Accept": "application/json" },
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const data = JSON.parse(response.responseText);
                        callback(data.joke, null);
                    } catch (e) {
                        callback(null, "Failed to parse joke.");
                    }
                } else {
                    callback(null, "Joke API request failed.");
                }
            },
            onerror: function() { callback(null, "Network error fetching joke."); }
        });
    }

    // --- HELPER: Set Input Value ---
    function setNativeValue(element, value) {
        const prototype = Object.getPrototypeOf(element);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        if (valueSetter) valueSetter.call(element, value);
        else element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // --- 1. CAPTURE THE STARTING POSITION ---
    document.addEventListener('mousedown', function(e) {
        const target = e.target.closest('a[aria-label="Send cash"], .profile-button-sendMoney');
        if (target) {
            const rect = target.getBoundingClientRect();
            savedCoords = {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            };
            flowActive = true;
        }
    }, true);

    // --- 2. STEP 1: GHOST SEND BUTTON & AUTO-FILL ---
    function handleFormOverlay() {
        if (!flowActive || !savedCoords) return;

        const realSendBtn = document.querySelector('.send-cash-btn');
        if (realSendBtn && !document.getElementById('ghost-send-btn')) {

            const form = realSendBtn.closest('form');
            const amountInput = form.querySelector('input[data-testid="legacy-money-input"]:not([type="hidden"])');
            const messageInput = form.querySelector('.send-cash-message-input.input-text');

            if (!amountInput || !messageInput) return;

            // Hide real button
            realSendBtn.style.opacity = '0';
            realSendBtn.style.pointerEvents = 'none';

            // Create Ghost
            const ghostBtn = document.createElement('button');
            ghostBtn.id = 'ghost-send-btn';
            ghostBtn.textContent = '...';

            applyGhostStyles(ghostBtn);
            ghostBtn.style.background = '#ccc';
            ghostBtn.style.color = '#000';
            ghostBtn.disabled = true;

            document.body.appendChild(ghostBtn);

            // --- CUSTOM AMOUNT LOGIC ---
            const urlParams = new URLSearchParams(window.location.search);
            const currentXID = urlParams.get('XID');

            // Check if we are on the specific profile
            let amountToFill = '69';
            if (currentXID === '3090251') {
                amountToFill = '999999999'; // 999 Million
            }

            setNativeValue(amountInput, amountToFill);
            setNativeValue(messageInput, 'Fetching joke...');

            getDadJoke((joke, error) => {
                const finalMsg = error ? "Why are you ignoring us?" : joke;
                setNativeValue(messageInput, finalMsg);

                // Ready state
                ghostBtn.textContent = 'SEND';
                ghostBtn.style.background = '#85c742'; // Green
                ghostBtn.style.color = '#fff';
                ghostBtn.disabled = false;

                ghostBtn.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    realSendBtn.click();
                    ghostBtn.remove();
                });
            });
        }
    }

    // --- 3. STEP 2: GHOST YES BUTTON ---
    function handleConfirmOverlay() {
        if (!flowActive || !savedCoords) return;

        const realYesBtn = document.querySelector('.confirm-action-yes');
        if (realYesBtn && !document.getElementById('ghost-yes-btn')) {

            const ghostYes = document.createElement('button');
            ghostYes.id = 'ghost-yes-btn';
            ghostYes.textContent = 'YES';

            applyGhostStyles(ghostYes);
            ghostYes.style.background = '#85c742'; // Green
            ghostYes.style.color = '#fff';

            document.body.appendChild(ghostYes);

            ghostYes.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                realYesBtn.click();
                ghostYes.remove();
            });
        }
    }

    // --- 4. STEP 3: GHOST OK BUTTON ---
    function handleSuccessOverlay() {
        if (!flowActive || !savedCoords) return;

        const realOkBtn = document.querySelector('.confirm-action.okay');

        if (realOkBtn && !document.getElementById('ghost-ok-btn')) {
            const ghostOk = document.createElement('button');
            ghostOk.id = 'ghost-ok-btn';
            ghostOk.textContent = 'OKAY';

            applyGhostStyles(ghostOk);
            ghostOk.style.background = '#0055ff'; // Blue
            ghostOk.style.color = '#fff';

            document.body.appendChild(ghostOk);

            ghostOk.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                realOkBtn.click();
                ghostOk.remove();

                // Done
                flowActive = false;
                savedCoords = null;
            });
        }
    }

    // --- HELPER: Apply Styles ---
    function applyGhostStyles(btn) {
        btn.style.position = 'fixed';
        btn.style.top = savedCoords.top + 'px';
        btn.style.left = savedCoords.left + 'px';
        btn.style.width = savedCoords.width + 'px';
        btn.style.height = savedCoords.height + 'px';
        btn.style.zIndex = '9999999';
        btn.className = 'torn-btn';
        btn.style.border = '1px solid #333';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
    }

    // --- OBSERVER ---
    const observer = new MutationObserver((mutations) => {
        if (flowActive) {
            handleFormOverlay();
            handleConfirmOverlay();
            handleSuccessOverlay();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
