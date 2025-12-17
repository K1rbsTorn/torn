// ==UserScript==
// @name         Torn Russian Roulette Filter & Timer
// @namespace    https://github.com/K1rbsTorn/torn
// @version      1.1
// @description  Replaces Status column with a Timer and adds a minimum bet filter. Auto-updates and resists page refreshes.
// @author       K1rbs
// @match        https://www.torn.com/loader.php?sid=russianRoulette*
// @match        https://www.torn.com/page.php?sid=russianRoulette*
// @match        https://www.torn.com/russianRoulette*
// @updateURL    https://raw.githubusercontent.com/K1rbsTorn/torn/main/RR.user.js
// @downloadURL  https://raw.githubusercontent.com/K1rbsTorn/torn/main/RR.user.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const SELECTORS = {
        rowsContainer: '.rowsWrap___QDquR',
        row: '.row___CHcax',
        startBlock: '.startBlock___pbhtb',
        headerRow: '.columnsWrap___WW3tH',
        betBlock: '.betBlock___wz9ED',
        statusBlock: '.statusBlock___j4JSQ'
    };

    // Store start times in a persistent object
    const gameStartTimes = {};
    let currentMinBet = 0;

    GM_addStyle(`
        .rr-custom-filter {
            margin-left: 10px;
            padding: 4px 8px;
            border-radius: 5px;
            border: 1px solid #ccc;
            background: #ffffff;
            color: #333;
            width: 90px;
            height: 32px;
            font-size: 13px;
        }
        @media (prefers-color-scheme: dark) {
            .rr-custom-filter { background: #333; color: #fff; border: 1px solid #555; }
        }
        /* Ensure the hijacked timer looks good */
        .rr-hijacked-timer {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            font-family: monospace !important;
            font-weight: bold !important;
            color: #999 !important;
            font-size: 14px !important;
        }
    `);

    // --- AGGRESSIVE LOOP ---
    // React might wipe our changes when data updates.
    // This loop forces our changes to stay applied every second.
    setInterval(() => {
        
        // 1. Ensure Filter Input Exists
        const startBlock = document.querySelector(SELECTORS.startBlock);
        if (startBlock && !startBlock.querySelector('.rr-custom-filter')) {
            injectFilterInput(startBlock);
        }

        // 2. Ensure Header says "Timer" instead of "Status"
        const headerRow = document.querySelector(SELECTORS.headerRow);
        if (headerRow && headerRow.children.length >= 2) {
            const statusHeader = headerRow.children[1];
            if (statusHeader.innerText !== "Timer") {
                statusHeader.innerText = "Timer";
            }
        }

        // 3. Process All Rows (Apply Timer + Filter)
        const rows = document.querySelectorAll(SELECTORS.row);
        rows.forEach(processRow);

    }, 1000);

    function injectFilterInput(startBlock) {
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Min Bet';
        filterInput.className = 'rr-custom-filter';
        
        // Restore previous value if it exists
        if (currentMinBet > 0) filterInput.value = currentMinBet;

        filterInput.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            currentMinBet = parseInt(val) || 0;
            // Force immediate update of visibility
            document.querySelectorAll(SELECTORS.row).forEach(checkRowVisibility);
        });
        startBlock.appendChild(filterInput);
    }

    function processRow(row) {
        const id = row.id;
        if (!id) return;

        // A. Track Start Time
        // If this is a new game ID we haven't seen, log the time.
        if (!gameStartTimes[id]) {
            gameStartTimes[id] = Date.now();
        }

        // B. Hijack Status Block for Timer
        const statusBlock = row.querySelector(SELECTORS.statusBlock);
        if (statusBlock) {
            // Apply class if missing (React might have removed it)
            if (!statusBlock.classList.contains('rr-hijacked-timer')) {
                statusBlock.classList.add('rr-hijacked-timer');
            }

            // Calculate time
            const diff = Math.floor((Date.now() - gameStartTimes[id]) / 1000);
            const timeText = formatTime(diff);

            // Only write to DOM if text is different (saves performance)
            if (statusBlock.innerText !== timeText) {
                statusBlock.innerText = timeText;
            }
        }

        // C. Apply Filter
        checkRowVisibility(row);
    }

    function checkRowVisibility(row) {
        const betBlock = row.querySelector(SELECTORS.betBlock);
        if (!betBlock) return;

        const ariaLabel = betBlock.getAttribute('aria-label') || "";
        const betText = betBlock.innerText || "";
        
        // Robust number parsing
        let betValue = parseInt(ariaLabel.replace(/\D/g, ''));
        if (isNaN(betValue)) {
            betValue = parseInt(betText.replace(/\D/g, ''));
        }

        // Toggle visibility
        if (betValue < currentMinBet) {
            if (row.style.display !== 'none') row.style.display = 'none';
        } else {
            if (row.style.display !== '') row.style.display = '';
        }
    }

    function formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    }

})();
