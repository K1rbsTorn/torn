// ==UserScript==
// @name         Advanced Filter Stats
// @namespace    http://tampermonkey.net/
// @author       K1rbs
// @version      1.1
// @description  Load Torn userlist stats manually with color thresholds
// @match        https://www.torn.com/page.php?sid=UserList*
// @updateURL    https://raw.githubusercontent.com/K1rbsTorn/torn/main/AdvancedFilterStats.user.js
// @downloadURL  https://raw.githubusercontent.com/K1rbsTorn/torn/main/AdvancedFilterStats.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      api.torn.com
// ==/UserScript==

(function () {
    'use strict';

    GM_registerMenuCommand('Set Torn API Key', () => {
        const currentKey = GM_getValue('torn_api_key', '');
        const newKey = prompt('Enter your Torn API Key:', currentKey);

        if (newKey !== null && newKey.trim()) {
            GM_setValue('torn_api_key', newKey.trim());
            alert('API Key saved! Refresh the page.');
        }
    });

    const CURRENT_STATS =
        'rankedwarhits,xantaken,activestreak,bestactivestreak,timeplayed';

    const HISTORY_STATS = 'xantaken,timeplayed';
    const DAYS_BACK = 30;
    const API_DELAY_MS = 750;

    let lastApiCallTime = 0;
    let buttonTimer = null;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForApiSlot() {
        const now = Date.now();
        const wait = Math.max(0, lastApiCallTime + API_DELAY_MS - now);
        if (wait > 0) await sleep(wait);
        lastApiCallTime = Date.now();
    }

    function getApiKey() {
        return GM_getValue('torn_api_key', '');
    }

    function getUserId(li) {
        const match = (li.className || '').match(/user(\d+)/);
        return match ? match[1] : null;
    }

    function getUnixTimestampDaysAgo(days) {
        return Math.floor(Date.now() / 1000) - days * 86400;
    }

    function formatSeconds(value) {
        let seconds = Number(value || 0);

        const days = Math.floor(seconds / 86400);
        seconds %= 86400;

        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;

        const minutes = Math.floor(seconds / 60);

        return `${days}d ${hours}h ${minutes}m`;
    }

    function formatHoursPerDay(seconds) {
        const hours = Number(seconds || 0) / 3600;
        return `${hours.toFixed(1)}h/day`;
    }

    function toStatsObject(data) {
        return Object.fromEntries(
            (data.personalstats || []).map(stat => [
                stat.name,
                stat.value
            ])
        );
    }

    async function apiGet(url) {
        await waitForApiSlot();

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: response => {
                    try {
                        resolve(JSON.parse(response.responseText));
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: reject
            });
        });
    }

    function createStatsContainer() {
        const div = document.createElement('div');
        div.className = 'tm-user-stats';

        div.style.display = 'grid';
        div.style.gridTemplateColumns = 'repeat(auto-fit, minmax(115px, 1fr))';
        div.style.gap = '8px';
        div.style.padding = '8px 12px';
        div.style.marginTop = '6px';
        div.style.borderTop = '1px solid rgba(255,255,255,0.08)';
        div.style.borderRadius = '6px';
        div.style.fontSize = '12px';
        div.style.lineHeight = '16px';
        div.style.overflow = 'visible';

        return div;
    }

    async function processUser(li, apiKey) {
        const userId = getUserId(li);
        if (!userId) return;

        if (li.querySelector('.tm-user-stats')) return;

        const container = createStatsContainer();
        container.textContent = 'Loading stats...';
        li.appendChild(container);

        try {
            const timestamp30DaysAgo = getUnixTimestampDaysAgo(DAYS_BACK);

            const currentStatsUrl =
                `https://api.torn.com/v2/user/${userId}/personalstats` +
                `?stat=${CURRENT_STATS}&key=${apiKey}`;

            const pastStatsUrl =
                `https://api.torn.com/v2/user/${userId}/personalstats` +
                `?stat=${HISTORY_STATS}&timestamp=${timestamp30DaysAgo}&key=${apiKey}`;

            const profileUrl =
                `https://api.torn.com/v2/user/${userId}/profile` +
                `?striptags=true&key=${apiKey}`;

            const [currentStatsData, pastStatsData, profileData] =
                await Promise.all([
                    apiGet(currentStatsUrl),
                    apiGet(pastStatsUrl),
                    apiGet(profileUrl)
                ]);

            if (currentStatsData.error) {
                container.textContent =
                    `Current Stats Error: ${currentStatsData.error.error}`;
                return;
            }

            if (pastStatsData.error) {
                container.textContent =
                    `Past Stats Error: ${pastStatsData.error.error}`;
                return;
            }

            if (profileData.error) {
                container.textContent =
                    `Profile Error: ${profileData.error.error}`;
                return;
            }

            const currentStats = toStatsObject(currentStatsData);
            const pastStats = toStatsObject(pastStatsData);
            const profile = profileData.profile || {};

            const xanLast30 =
                Number(currentStats.xantaken || 0) -
                Number(pastStats.xantaken || 0);

            const timePlayedLast30 =
                Number(currentStats.timeplayed || 0) -
                Number(pastStats.timeplayed || 0);

            const xanAvgPerDay = xanLast30 / DAYS_BACK;
            const timeAvgPerDay = timePlayedLast30 / DAYS_BACK;

            const isGoodTarget =
                xanAvgPerDay > 2.0 &&
                Number(currentStats.activestreak || 0) > 100 &&
                profile.donator_status &&
                profile.donator_status !== 'N/A' &&
                timeAvgPerDay / 3600 > 1;

            container.style.background = isGoodTarget
                ? 'rgba(0, 120, 0, 0.35)'
                : 'rgba(120, 0, 0, 0.35)';

            container.innerHTML = `
                <div>RW Hits<br><strong>${currentStats.rankedwarhits ?? 0}</strong></div>
                <div>Xan Taken<br><strong>${currentStats.xantaken ?? 0}</strong></div>
                <div>Xan / Day<br><strong>${xanAvgPerDay.toFixed(2)}</strong></div>
                <div>Active Streak<br><strong>${currentStats.activestreak ?? 0}</strong></div>
                <div>Best Streak<br><strong>${currentStats.bestactivestreak ?? 0}</strong></div>
                <div>Time Played<br><strong>${formatSeconds(currentStats.timeplayed)}</strong></div>
                <div>Time / Day<br><strong>${formatHoursPerDay(timeAvgPerDay)}</strong></div>
                <div>Age<br><strong>${profile.age ?? 'N/A'}</strong></div>
                <div>Donator<br><strong>${profile.donator_status ?? 'N/A'}</strong></div>
            `;

        } catch (error) {
            console.error('[TM] Failed loading user', userId, error);
            container.textContent = 'Failed loading data';
        }
    }

    async function loadStats() {
        const apiKey = getApiKey();

        if (!apiKey) {
            const newKey = prompt('Enter your Torn API Key:');

            if (!newKey || !newKey.trim()) return;

            GM_setValue('torn_api_key', newKey.trim());
            alert('API Key saved. Click Load API Stats again.');
            return;
        }

        const button = document.querySelector('#tm-load-user-stats');

        if (button) {
            button.disabled = true;
            button.textContent = 'Loading...';
        }

        const users = Array.from(
            document.querySelectorAll('.user-info-list-wrap > li')
        ).filter(li => !li.querySelector('.tm-user-stats'));

        for (const li of users) {
            processUser(li, apiKey);
        }

        if (button) {
            button.disabled = false;
            button.textContent = 'Load API Stats';
        }
    }

    function addButton() {
        if (document.querySelector('#tm-load-user-stats')) return;

        const wrapper = document.querySelector('.userlist-wrapper');
        if (!wrapper) return;

        const button = document.createElement('button');
        button.id = 'tm-load-user-stats';
        button.textContent = 'Load API Stats';

        button.style.margin = '10px 0';
        button.style.padding = '8px 12px';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '6px';
        button.style.border = '1px solid #777';
        button.style.background = '#222';
        button.style.color = '#fff';
        button.style.fontWeight = 'bold';

        button.addEventListener('click', loadStats);

        wrapper.parentNode.insertBefore(button, wrapper);
    }

    function scheduleAddButton() {
        clearTimeout(buttonTimer);
        buttonTimer = setTimeout(addButton, 500);
    }

    window.addEventListener('load', scheduleAddButton);
    window.addEventListener('hashchange', scheduleAddButton);

    const observer = new MutationObserver(scheduleAddButton);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    scheduleAddButton();

})();
