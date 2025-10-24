// ==UserScript==
// @name         Chain Timer Enhancer
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Increase the size and move an element with class "bar-descr___muXn5" to the top of the page
// @author       K1rbs
// @license      MIT
// @match        https://www.torn.com/*
// @grant        unsafeWindow
// @downloadURL  https://update.greasyfork.org/scripts/478315/Chain%20Timer%20Enhancer.user.js
// @updateURL    https://update.greasyfork.org/scripts/478315/Chain%20Timer%20Enhancer.meta.js
// ==/UserScript==

(function (window, $) {
    'use strict';

    // --- Define requirements ---
    const minID = 3100000;
    const maxID = 3400000;
    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // --- Define and inject the CSS rule ---
    // This part is fine and can run immediately
    const sizeRule = `
        .bar-timeleft___B9RGV {
            font-size: 80px !important; // You can adjust the size as needed
            cursor: pointer;
        }
    `;
    const sizeStyleElement = document.createElement('style');
    sizeStyleElement.textContent = sizeRule;
    document.head.appendChild(sizeStyleElement);

    // --- This function contains all the logic that must run *after* the element exists ---
    function setupTimerElement(element) {
        console.log("Chain Timer Enhancer: Element found, applying styles and observers.");

        // Move the element to the top of the page
        element.style.position = 'fixed';
        element.style.top = '80px';
        element.style.right = '10px';
        element.style.background = "green"; // Set initial color
        element.style.color = "black";

        // Add a click event listener
        element.addEventListener('click', function () {
            let randID = getRandomNumber(minID, maxID);
            let profileLink = `https://www.torn.com/profiles.php?XID=${randID}`;
            window.location.href = profileLink;
        });

        // This observer watches for *time changes* inside the element
        var config = { characterData: true, subtree: true };
        var timeObserver = new MutationObserver((list) => {
            // list[0].target is likely the text node that changed
            const timerElement = list[0].target.parentElement;
            if (!timerElement) return;

            var timeArray = timerElement.textContent.split(":");
            var minutes = timeArray[timeArray.length - 2];

            if (minutes) {
                let minInt = parseInt(minutes);
                if (minInt > 3) {
                    timerElement.style.backgroundColor = "green";
                } else if (minInt > 2) {
                    timerElement.style.backgroundColor = "orange";
                } else if (minInt >= 0) {
                    timerElement.style.backgroundColor = "red";
                }
            }

            // Re-apply positioning styles just in case Torn's UI tries to reset them
            timerElement.style.position = 'fixed';
            timerElement.style.top = '80px';
            timerElement.style.right = '10px';
            timerElement.style.color = "black";
        });
        // Start observing the element for text changes
        timeObserver.observe(element, config);

        // Force an initial color check
        // We can do this by manually triggering a check on the current text
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
    }

    // --- This observer waits for the element to be *added to the page* ---
    const bodyObserver = new MutationObserver((mutationsList, observer) => {
        // Try to find the element
        const element = document.querySelector('.bar-timeleft___B9RGV');
        if (element) {
            // Found it!
            // Run our setup function
            setupTimerElement(element);
            // Stop observing the body, our job is done
            observer.disconnect();
        }
    });

    // Start observing the entire document body for new child elements
    bodyObserver.observe(document.body, { childList: true, subtree: true });

})(unsafeWindow, unsafeWindow.jQuery);
