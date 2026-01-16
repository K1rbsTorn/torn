// ==UserScript==
// @name         Torn Poker Attack Sidebar & Linker
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Links names in poker to attack page
// @author       K1rbs
// @match        https://www.torn.com/loader.php?sid=holdem*
// @match        https://www.torn.com/page.php?sid=holdem*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const NAME_CLASS = 'name___cESdZ';
    const SIDEBAR_ID = 'poker-attack-sidebar';

    const SIDEBAR_STYLES = `
        position: fixed;
        top: 150px;
        right: 10px;
        width: 150px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #444;
        border-radius: 5px;
        padding: 10px;
        color: white;
        z-index: 99999;
        font-family: Arial, sans-serif;
        font-size: 12px;
        max-height: 400px;
        overflow-y: auto;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
    `;

    const knownPlayers = new Map();
    let scanTimeout = null;

    const existing = document.getElementById(SIDEBAR_ID);
    if (existing) existing.remove();

    const sidebar = document.createElement('div');
    sidebar.id = SIDEBAR_ID;
    sidebar.style.cssText = SIDEBAR_STYLES;
    sidebar.innerHTML = '<div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #555;">Player Log</div><div id="poker-player-list"></div>';
    document.body.appendChild(sidebar);
    const listContainer = sidebar.querySelector('#poker-player-list');

    function getAttackUrl(id) {
        return `https://www.torn.com/loader.php?sid=attack&user2ID=${id}`;
    }

    function updateSidebar() {
        let htmlContent = '';
        knownPlayers.forEach((player, id) => {
            const color = player.status === 'active' ? '#00FF00' : '#FF4444';
            htmlContent += `
                <div style="margin-bottom: 4px;">
                    <a href="${getAttackUrl(id)}" target="_blank" style="color: ${color}; text-decoration: none; display: block;">
                        ${player.name}
                    </a>
                </div>`;
        });

        if (listContainer.innerHTML !== htmlContent) {
            listContainer.innerHTML = htmlContent;
        }
    }

    function scanTable() {
        const currentPlayersOnTable = new Set();
        const nameElements = document.querySelectorAll(`.${NAME_CLASS}`);
        let dataChanged = false;

        nameElements.forEach(nameEl => {
            const container = nameEl.closest(`[id^="player-"]`);
            if (container) {
                const playerId = container.id.split('-')[1];
                const playerName = nameEl.textContent;

                if (playerId) {
                    currentPlayersOnTable.add(playerId);

                    if (!knownPlayers.has(playerId)) {
                        knownPlayers.set(playerId, { name: playerName, status: 'active' });
                        dataChanged = true;
                    } else {
                        const p = knownPlayers.get(playerId);
                        if(p.status !== 'active') {
                            p.status = 'active';
                            knownPlayers.set(playerId, p);
                            dataChanged = true;
                        }
                    }

                    if (nameEl.getAttribute('data-linked') !== 'true') {
                         nameEl.innerHTML = `<a href="${getAttackUrl(playerId)}" target="_blank" style="color: inherit; text-decoration: none; border-bottom: 1px dotted white;">${playerName}</a>`;
                         nameEl.setAttribute('data-linked', 'true');
                    }
                }
            }
        });

        knownPlayers.forEach((player, id) => {
            if (!currentPlayersOnTable.has(id) && player.status === 'active') {
                player.status = 'left';
                knownPlayers.set(id, player);
                dataChanged = true;
            }
        });

        if (dataChanged) {
            updateSidebar();
        }
    }

    const observer = new MutationObserver((mutations) => {
        const isSidebarMutation = mutations.some(m =>
            m.target.id === SIDEBAR_ID ||
            (m.target.closest && m.target.closest('#' + SIDEBAR_ID))
        );

        if (isSidebarMutation) return;

        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
            scanTable();
        }, 500);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    scanTable();

})();
