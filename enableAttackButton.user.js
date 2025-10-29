// ==UserScript==
// @name Enable Attack Button on Torn Profile Page
// @namespace https://lordrhino.co.uk/
// @version 1.2 // Updated version number
// @description Enables the disabled button on Torn profile page when a player is in hospital and redirects to the attack page when the button is clicked
// @match https://www.torn.com/profiles.php?XID=*
// ==/UserScript==

(function() {
    'use strict';

    function enableButton(button) {
        if (button && button.classList.contains('disabled')) {
            button.classList.remove('disabled');
            button.classList.add('active');
            button.removeAttribute('aria-disabled');
            button.removeAttribute('href');
            // The event listener is attached to the button element itself.
            button.addEventListener('click', handleButtonClick);

            // Fix for the SVG fill not applying correctly
            const svgIcon = button.querySelector('svg.icon___oJODA');
            if (svgIcon) {
                // Ensure the fill is removed from the old disabled class
                svgIcon.classList.remove('disabled___xBFso');
                // Set the correct fill for the active state
                svgIcon.setAttribute('fill', 'url(#linear-gradient-dark-mode)');
            }

            button.style.border = '1px solid red'; // Visual cue
        }
    }

    function handleButtonClick(event) {
        event.preventDefault();

        // Use event.currentTarget to get the element the listener was attached to (the button)
        const button = event.currentTarget;

        // Get the full ID, which is now on the button itself (e.g., "button0-profile-3095345")
        const fullID = button.id;

        // Extract the user ID by splitting the string.
        // This is safer than the old .replace() as it assumes the ID is the last part after the last hyphen.
        const userID = fullID.substring(fullID.lastIndexOf('-') + 1);

        if (userID && !isNaN(userID)) {
            // Redirect to the attack page with the extracted user ID
            window.location.href = `https://www.torn.com/loader.php?sid=attack&user2ID=${userID}`;
        } else {
            console.error('Could not extract a valid UserID from the button ID:', fullID);
        }
    }

    const checkButtonAvailability = setInterval(function() {
        // Selector remains correct: find all elements whose ID starts with "button0-profile-"
        const buttons = document.querySelectorAll('[id^="button0-profile-"]');

        if (buttons.length > 0) {
            clearInterval(checkButtonAvailability);
            // Only process the 'Attack' button (it's the first one, index 0, but this is safer)
            const attackButton = Array.from(buttons).find(btn => btn.classList.contains('profile-button-attack'));

            if (attackButton) {
                enableButton(attackButton);
            }
        }
    }, 1000);
})();
