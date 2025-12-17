// ==UserScript==
// @name         Torn Russian Roulette Filter & Timer
// @namespace    https://github.com/K1rbsTorn/torn
// @version      1.0
// @description  Replaces Status column with a Timer and adds a minimum bet filter.
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

    const TIMERS = new Map();
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
    `);

    const waitInterval = setInterval(() => {
        const container = document.querySelector(SELECTORS.rowsContainer);
        const startBlock = document.querySelector(SELECTORS.startBlock);
        const headerRow = document.querySelector(SELECTORS.headerRow);

        if (container && startBlock && headerRow) {
            clearInterval(waitInterval);
            init(container, startBlock, headerRow);
        }
    }, 500);

    function init(container, startBlock, headerRow) {
        injectFilterInput(startBlock);

        if (headerRow.children.length >= 2) {
            headerRow.children[1].innerText = "Timer";
        }

        const existingRows = container.querySelectorAll(SELECTORS.row);
        existingRows.forEach(processRow);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.matches(SELECTORS.row)) {
                        processRow(node);
                    }
                });
            });
        });
        observer.observe(container, { childList: true });

        setInterval(updateTimerDisplay, 1000);
    }

    function injectFilterInput(startBlock) {
        if (startBlock.querySelector('.rr-custom-filter')) return;
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Min Bet';
        filterInput.className = 'rr-custom-filter';
        filterInput.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            currentMinBet = parseInt(val) || 0;
            applyFilter();
        });
        startBlock.appendChild(filterInput);
    }

    function processRow(row) {
        const id = row.id;

        if (!TIMERS.has(id)) {
            TIMERS.set(id, Date.now());
        }

        const statusBlock = row.querySelector(SELECTORS.statusBlock);
        if (statusBlock && !statusBlock.classList.contains('rr-hijacked')) {
            statusBlock.classList.add('rr-hijacked');
            statusBlock.innerHTML = '';
            statusBlock.style.display = 'flex';
            statusBlock.style.alignItems = 'center';
            statusBlock.style.justifyContent = 'center';
            statusBlock.style.fontFamily = 'monospace';
            statusBlock.style.fontWeight = 'bold';
            statusBlock.style.color = '#999';
            statusBlock.style.fontSize = '14px';
            statusBlock.innerText = '0s';
        }

        checkRowVisibility(row);
    }

    function checkRowVisibility(row) {
        const betBlock = row.querySelector(SELECTORS.betBlock);
        if (!betBlock) return;

        const ariaLabel = betBlock.getAttribute('aria-label') || "";
        const betText = betBlock.innerText || "";
        let betValue = parseInt(ariaLabel.replace(/\D/g, ''));
        if (isNaN(betValue)) betValue = parseInt(betText.replace(/\D/g, ''));

        row.style.display = (betValue < currentMinBet) ? 'none' : '';
    }

    function applyFilter() {
        document.querySelectorAll(SELECTORS.row).forEach(checkRowVisibility);
    }

    function updateTimerDisplay() {
        const now = Date.now();
        const rows = document.querySelectorAll
