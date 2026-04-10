// ==UserScript==
// @name         Torn Send Cash Filler (Stationary - Custom Amounts)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Stationary clicking (Fill -> Send -> Yes -> Okay).
// @author       K1rbs
// @match        https://www.torn.com/profiles.php?*
// @connect      icanhazdadjoke.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let savedCoords = null;
    let flowActive = false;

    function setReactValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

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
                    } catch (e) { callback(null, "Failed."); }
                } else { callback(null, "API error."); }
            },
            onerror: function() { callback(null, "Network error."); }
        });
    }

    document.addEventListener('mousedown', function(e) {
        const target = e.target.closest('a[aria-label="Send cash"], .profile-button-sendMoney');
        if (target) {
            const rect = target.getBoundingClientRect();
            savedCoords = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
            flowActive = true;
        }
    }, true);

    function handleFormOverlay() {
        if (!flowActive || !savedCoords) return;

        const realSendBtn = document.querySelector('.send-cash-btn');
        if (realSendBtn && !document.getElementById('ghost-send-btn')) {
            
            const form = realSendBtn.closest('form');
            const amountInputs = form.querySelectorAll('input[data-testid="legacy-money-input"]');
            const messageInput = form.querySelector('.send-cash-message-input.input-text');

            realSendBtn.style.opacity = '0';
            realSendBtn.style.pointerEvents = 'none';

            const ghostBtn = document.createElement('button');
            ghostBtn.id = 'ghost-send-btn';
            ghostBtn.textContent = '...';
            applyGhostStyles(ghostBtn);
            ghostBtn.style.background = '#ccc';
            ghostBtn.disabled = true;
            document.body.appendChild(ghostBtn);

            const urlParams = new URLSearchParams(window.location.search);
            const currentXID = urlParams.get('XID') || urlParams.get('ID');
            let amountToFill = (currentXID === '3090251') ? '999999999' : '69';

            amountInputs.forEach(input => setReactValue(input, amountToFill));
            
            getDadJoke((joke, error) => {
                setReactValue(messageInput, error ? "Why are you ignoring us?" : joke);

                ghostBtn.textContent = 'SEND';
                ghostBtn.style.background = '#85c742';
                ghostBtn.style.color = '#fff';
                ghostBtn.disabled = false;

                ghostBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const submitEvent = new Event('submit', {
                        bubbles: true,
                        cancelable: true
                    });

                    const protector = (event) => {
                        if (event.defaultPrevented) return;
                        event.preventDefault(); 
                    };
                    form.addEventListener('submit', protector, { capture: true, once: true });

                    form.dispatchEvent(submitEvent);

                    setTimeout(() => {
                        if (document.body.contains(ghostBtn)) {
                            realSendBtn.click();
                            ghostBtn.remove();
                        }
                    }, 30);
                };
            });
        }
    }

    function handleConfirmOverlay() {
        if (!flowActive || !savedCoords) return;
        const realYesBtn = document.querySelector('.confirm-action-yes');
        if (realYesBtn && !document.getElementById('ghost-yes-btn')) {
            const ghostYes = document.createElement('button');
            ghostYes.id = 'ghost-yes-btn';
            ghostYes.textContent = 'YES';
            applyGhostStyles(ghostYes);
            ghostYes.style.background = '#85c742';
            ghostYes.style.color = '#fff';
            document.body.appendChild(ghostYes);

            ghostYes.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                realYesBtn.click();
                ghostYes.remove();
            };
        }
    }

    function handleSuccessOverlay() {
        if (!flowActive || !savedCoords) return;
        const realOkBtn = document.querySelector('.confirm-action.okay, .confirm-action.okay-btn, .profile-status.okay .confirm-action');
        if (realOkBtn && !document.getElementById('ghost-ok-btn')) {
            const ghostOk = document.createElement('button');
            ghostOk.id = 'ghost-ok-btn';
            ghostOk.textContent = 'OKAY';
            applyGhostStyles(ghostOk);
            ghostOk.style.background = '#0055ff';
            ghostOk.style.color = '#fff';
            document.body.appendChild(ghostOk);

            ghostOk.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                realOkBtn.click();
                ghostOk.remove();
                flowActive = false;
                savedCoords = null;
            };
        }
    }

    function applyGhostStyles(btn) {
        btn.style.position = 'fixed';
        btn.style.top = savedCoords.top + 'px';
        btn.style.left = savedCoords.left + 'px';
        btn.style.width = savedCoords.width + 'px';
        btn.style.height = savedCoords.height + 'px';
        btn.style.zIndex = '2147483647';
        btn.className = 'torn-btn';
        btn.style.border = '1px solid #333';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
    }

    const observer = new MutationObserver(() => {
        if (flowActive) {
            handleFormOverlay();
            handleConfirmOverlay();
            handleSuccessOverlay();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
