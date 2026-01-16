// ==UserScript==
// @name         Torn Poker Attack Linker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Turns player names into attack links in Torn Poker
// @author       K1rbs
// @match        https://www.torn.com/loader.php?sid=holdem*
// @match        https://www.torn.com/page.php?sid=holdem*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const NAME_CLASS = 'name___cESdZ';

    const PLAYER_CONTAINER_CLASS = 'opponent___ZyaTg';

    function addAttackLinks() {

        const nameElements = document.querySelectorAll(`.${NAME_CLASS}:not([data-linked="true"])`);

        nameElements.forEach(nameEl => {

            const container = nameEl.closest(`[id^="player-"]`);

            if (container) {
                const playerId = container.id.split('-')[1];

                if (playerId) {
                    const attackUrl = `https://www.torn.com/loader.php?sid=attack&user2ID=${playerId}`;

                    const playerName = nameEl.textContent;

                    nameEl.innerHTML = `<a href="${attackUrl}" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px dotted white;">${playerName}</a>`;

                    nameEl.setAttribute('data-linked', 'true');
                }
            }
        });
    }

    addAttackLinks();

    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                shouldUpdate = true;
            }
        });

        if (shouldUpdate) {
            addAttackLinks();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
