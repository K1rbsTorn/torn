// ==UserScript==
// @name         Torn Send Cash Filler
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Adds a "fill" button with a random dad joke to the send cash form on Torn profile.
// @author       K1rbs (with 1.3 fix)
// @match        https://www.torn.com/profiles.php?XID=*
// @connect      icanhazdadjoke.com
// @grant        GM_xmlhttpRequest
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
                // Find inputs
                let amountInputs = form.querySelectorAll('input.send-cash-input.torn-input-money');
                let messageInput = form.querySelector('input.send-cash-message-input.input-text');

                if (!messageInput || amountInputs.length === 0) return;

                // Set amount
                amountInputs.forEach(input => {
                    setNativeValue(input, '69');
                });

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
