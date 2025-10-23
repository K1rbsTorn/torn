// ==UserScript==
// @name         Torn Send Cash Filler
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a "fill" button to the send cash form on Bees Torn profile.
// @author       K1rbs
// @match        https://www.torn.com/profiles.php?XID=1959482
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function addFillButton() {
        let cancelButton = document.querySelector('form .cancel-btn.t-blue.c-pointer.h');

        if (cancelButton && !document.getElementById('custom-cash-fill-btn')) {
            let form = cancelButton.closest('form');
            if (!form) return;

            let fillButton = document.createElement('button');
            fillButton.type = 'button';
            fillButton.id = 'custom-cash-fill-btn';
            fillButton.textContent = 'fill';
            
            fillButton.className = 'torn-btn silver h';
            fillButton.style.marginLeft = '5px';

            fillButton.addEventListener('click', () => {
                let amountInputs = form.querySelectorAll('input.send-cash-input.torn-input-money');
                let messageInput = form.querySelector('input.send-cash-message-input.input-text');

                if (amountInputs.length > 0 && messageInput) {
                    amountInputs.forEach(input => {
                        input.value = '69';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                    messageInput.value = 'Why are you ignoring us?';
                    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            
            cancelButton.parentNode.insertBefore(fillButton, cancelButton);
        }
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                addFillButton();
            }
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    addFillButton();

})();
