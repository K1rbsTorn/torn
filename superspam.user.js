// ==UserScript==
// @name         Torn Send Cash Filler (Stationary - Custom Amounts)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Stationary clicking (Fill -> Send -> Yes -> Okay).
// @author       K1rbs
// @match        https://www.torn.com/profiles.php?XID=*
// @connect      icanhazdadjoke.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let savedCoords = null;
    let flowActive = false;

    function setTornValue(form, value) {
        const inputs = form.querySelectorAll('input[data-testid="legacy-money-input"]');
        inputs.forEach(input => {
            const prototype = Object.getPrototypeOf(input);
            const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
            if (setter) setter.call(input, value);
            else input.value = value;

            ['input', 'change', 'blur'].forEach(evt => {
                input.dispatchEvent(new Event(evt, { bubbles: true }));
            });
        });
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
            savedCoords = {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            };
            flowActive = true;
        }
    }, true);

    function handleFormOverlay() {
        if (!flowActive || !savedCoords) return;

        const realSendBtn = document.querySelector('.send-cash-btn');
        if (realSendBtn && !document.getElementById('ghost-send-btn')) {
            
            const form = realSendBtn.closest('form');
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

            setTornValue(form, amountToFill);
            
            getDadJoke((joke, error) => {
                const finalMsg = error ? "Why are you ignoring us?" : joke;
                const prototype = Object.getPrototypeOf(messageInput);
                const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
                if (setter) setter.call(messageInput, finalMsg);
                else messageInput.value = finalMsg;
                messageInput.dispatchEvent(new Event('input', { bubbles: true }));

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
                    
                    form.dispatchEvent(submitEvent);
                    
                    setTimeout(() => {
                        if (document.body.contains(ghostBtn)) {
                            realSendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            ghostBtn.remove();
                        }
                    }, 50);
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
                e.preventDefault();
                realYesBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                ghostYes.remove();
            };
        }
    }

    function handleSuccessOverlay() {
        if (!flowActive || !savedCoords) return;
        const realOkBtn = document.querySelector('.confirm-action.okay, .confirm-action.okay-btn');
        if (realOkBtn && !document.getElementById('ghost-ok-btn')) {
            const ghostOk = document.createElement('button');
            ghostOk.id = 'ghost-ok-btn';
            ghostOk.textContent = 'OKAY';
            applyGhostStyles(ghostOk);
            ghostOk.style.background = '#0055ff';
            ghostOk.style.color = '#fff';
            document.body.appendChild(ghostOk);

            ghostOk.onclick = (e) => {
                e.preventDefault();
                realOkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
        btn.style.zIndex = '99999999';
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
