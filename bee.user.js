// ==UserScript==
// @name         Torn Send Cash Filler
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds a "fill" button to the send cash form on Bees Torn profile.
// @author       K1rbs (with 1.2 fix)
// @match        https://www.torn.com/profiles.php?XID=1959482
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Sets the value of an input element and dispatches events
     * in a way that modern JS frameworks (like React) will recognize.
     */
    function setNativeValue(element, value) {
        // Get the prototype of the input element
        const prototype = Object.getPrototypeOf(element);
        
        // Find the native 'value' setter
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        
        // Call the native setter with the element and new value
        if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            // Fallback for older browsers or different element types
            element.value = value;
        }

        // Dispatch 'input' and 'change' events, as frameworks listen for these
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

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
                        // Use the new function to set the value
                        setNativeValue(input, '69');
                    });
                    
                    // Use the new function for the message as well
                    setNativeValue(messageInput, 'Why are you ignoring us?');
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
