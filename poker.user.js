// ==UserScript==
// @name         Torn Poker Attack Sidebar & Linker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Links names in poker to attack page
// @author       K1rbs
// @match        https://www.torn.com/loader.php?sid=holdem*
// @match        https://www.torn.com/page.php?sid=holdem*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SIDEBAR_ID = 'poker-attack-sidebar';
    const knownPlayers = new Map();
    let scanTimeout = null;

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

    document.getElementById(SIDEBAR_ID)?.remove();

    const sidebar = document.createElement('div');
    sidebar.id = SIDEBAR_ID;
    sidebar.style.cssText = SIDEBAR_STYLES;
    sidebar.innerHTML = `
        <div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #555;">Player Log</div>
        <div id="poker-player-list"></div>
    `;
    document.body.appendChild(sidebar);

    const listContainer = sidebar.querySelector('#poker-player-list');

    function getAttackUrl(id) {
        return `https://www.torn.com/page.php?sid=attack&user2ID=${id}`;
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    }

    function getNameElement(playerEl) {
        return (
            playerEl.querySelector('p[class^="name___"]') ||
            playerEl.querySelector('[class*="name___"]')
        );
    }

    function updateSidebar() {
        listContainer.innerHTML = [...knownPlayers.entries()].map(([id, player]) => {
            const color = player.status === 'active' ? '#00FF00' : '#FF4444';
            return `
                <div style="margin-bottom:4px;">
                    <a href="${getAttackUrl(id)}" target="_blank" rel="noopener noreferrer"
                       style="color:${color}; text-decoration:none; display:block;">
                        ${escapeHtml(player.name)}
                    </a>
                </div>
            `;
        }).join('');
    }

    function linkName(nameEl, playerId, playerName) {
        if (nameEl.dataset.pokerAttackLinked === playerId) return;

        nameEl.textContent = '';

        const a = document.createElement('a');
        a.href = getAttackUrl(playerId);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = playerName;
        a.style.cssText = 'color:inherit;text-decoration:none;border-bottom:1px dotted white;';

        nameEl.appendChild(a);
        nameEl.dataset.pokerAttackLinked = playerId;
    }

    function scanTable() {
        const currentPlayersOnTable = new Set();
        let dataChanged = false;

        document.querySelectorAll('[id^="player-"]').forEach(playerEl => {
            const match = playerEl.id.match(/^player-(\d+)$/);
            if (!match) return;

            const playerId = match[1];
            const nameEl = getNameElement(playerEl);
            if (!nameEl) return;

            const playerName = nameEl.textContent.trim();
            if (!playerName) return;

            currentPlayersOnTable.add(playerId);

            const existing = knownPlayers.get(playerId);
            if (!existing) {
                knownPlayers.set(playerId, { name: playerName, status: 'active' });
                dataChanged = true;
            } else if (existing.status !== 'active' || existing.name !== playerName) {
                existing.status = 'active';
                existing.name = playerName;
                dataChanged = true;
            }

            linkName(nameEl, playerId, playerName);
        });

        knownPlayers.forEach((player, id) => {
            if (!currentPlayersOnTable.has(id) && player.status === 'active') {
                player.status = 'left';
                dataChanged = true;
            }
        });

        if (dataChanged) updateSidebar();
    }

    const observer = new MutationObserver(mutations => {
        if (mutations.some(m => m.target.closest?.('#' + SIDEBAR_ID))) return;

        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(scanTable, 300);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    scanTable();
})();
