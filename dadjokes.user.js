// ==UserScript==
// @name         Torn Send Cash Filler
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds a "fill" button with a random dad joke to the send cash form on Torn profile.
// @author       K1rbs (with 1.4 fix)
// @match        https://www.torn.com/profiles.php?XID=*
// @connect      icanhazdadjoke.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Fetches a random dad joke.
     * We use GM_xmlhttpRequest for cross-domain requests,
     * as it's the standard for Tampermonkey.
     */
    function getDadJoke(callback) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://icanhazdadjoke.com/",
            headers: {
                "Accept": "application/json"
            },
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
            onerror: function() {
                callback(null, "Network error fetching joke.");
            }
        });
    }

    /**
     * Sets the value of an input element and dispatches events
     * in a way that modern JS frameworks (like React) will recognize.
     */
    function setNativeValue(element, value) {
        const prototype = Object.getPrototypeOf(element);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

        if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function addFillButton() {
        // New selector for the Cancel button based on your HTML snippet
        let cancelButton = document.querySelector('.send-cash-dialog-options .cancel-btn');

        if (cancelButton && !document.getElementById('custom-cash-fill-btn')) {
            let form = cancelButton.closest('form');
            if (!form) return;
            
            let fillButton = document.createElement('button');
            fillButton.type = 'button';
            fillButton.id = 'custom-cash-fill-btn';
            fillButton.textContent = 'fill';

            fillButton.className = 'torn-btn silver h';
            fillButton.style.marginRight = '5px'; // Adjust margin for the new position

            fillButton.addEventListener('click', () => {
                // New selector for the cash input
                let amountInput = form.querySelector('input[data-testid="legacy-money-input"]:not([type="hidden"])');
                // The message input selector remains the same
                let messageInput = form.querySelector('.send-cash-message-input.input-text');

                if (!messageInput || !amountInput) return;

                // Set amount (only need to set the visible input)
                setNativeValue(amountInput, '69');

                // Set a temporary message
                setNativeValue(messageInput, 'Fetching joke...');

                // Fetch and set the joke
                getDadJoke((joke, error) => {
                    if (error) {
                        console.error('Dad Joke Error:', error);
                        setNativeValue(messageInput, 'Why are you ignoring us?'); // Fallback
                    } else {
                        setNativeValue(messageInput, joke);
                    }
                });
            });

            // Insert the fill button before the cancel button
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
