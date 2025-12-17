// ==UserScript==
// @name         Torn Russian Roulette Filter & Timer (Content Swap)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Replaces the Status column data with a Timer. Perfect alignment.
// @author       Gemini
// @match        https://www.torn.com/loader.php?sid=russianRoulette*
// @match        https://www.torn.com/page.php?sid=russianRoulette*
// @match        https://www.torn.com/russianRoulette*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
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

    // --- MAIN WAIT LOADER ---
    const waitInterval = setInterval(() => {
        const container = document.querySelector(SELECTORS.rowsContainer);
        const startBlock = document.querySelector(SELECTORS.startBlock);
        const headerRow = document.querySelector(SELECTORS.headerRow);
        
        if (container && startBlock && headerRow) {
            clearInterval(waitInterval);
            init(container, startBlock, headerRow);
        }
    }, 500);

    // --- INITIALIZATION ---
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

    // --- LOGIC ---
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
        const rows = document.querySelectorAll(SELECTORS.row);
        rows.forEach(row => {
            const id = row.id;
            const startTime = TIMERS.get(id);
            
            const statusBlock = row.querySelector('.rr-hijacked');
            
            if (startTime && statusBlock) {
                const diff = Math.floor((now - startTime) / 1000);
                statusBlock.innerText = formatTime(diff);
            }
        });
    }

    function formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    }

})();
