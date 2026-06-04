// ==UserScript==
// @name         TPA War Timer
// @namespace    torn-tpa
// @version      1.0
// @description  Floating war timer for TPA
// @author       K1rbs
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/page.php?sid=factions*
// @grant        GM_xmlhttpRequest
// @connect      k1rbstpa.com
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('tpa-war-box')) return;

    const box = document.createElement('div');
    box.id = 'tpa-war-box';

    box.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        width: 260px;
        background: rgba(255,209,220,0.98);
        border: 1px solid #E39AB0;
        border-radius: 8px;
        padding: 10px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        font-family: Arial, sans-serif;
        color: #222;
        font-size: 12px;
    `;

    box.innerHTML = `
        <div style="
            text-align:center;
            font-weight:bold;
            font-size:14px;
            color:#6B2148;
            margin-bottom:8px;
            border-bottom:1px solid #E39AB0;
            padding-bottom:6px;
        ">
            ⏰ TPA War Timer
        </div>

        <div id="tpa-war-timer">
            Loading...
        </div>
    `;

    document.body.appendChild(box);

    function formatTime(seconds) {
        if (seconds <= 0) {
            return '<span style="color:#c00;font-weight:bold;">READY</span>';
        }

        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        const pad = n => String(n).padStart(2, '0');

        return `${pad(d)}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }

    GM_xmlhttpRequest({
        method: "GET",
        url: "https://k1rbstpa.com/api/get_war_time.php",

        onload: function (response) {

            let data;

            try {
                data = JSON.parse(response.responseText);
            } catch (e) {
                document.getElementById('tpa-war-timer').innerHTML =
                    '<span style="color:red;">Invalid API response</span>';
                return;
            }

            if (!data.success || !data.war_timestamp) {
                document.getElementById('tpa-war-timer').innerHTML =
                    'No upcoming war scheduled.';
                return;
            }

            const targets = {
                'WAR': data.war_timestamp,
                'XANAX 1': data.war_timestamp - 115200,
                'XANAX 2': data.war_timestamp - 86400,
                'XANAX 3': data.war_timestamp - 57600,
                'XANAX 4': data.war_timestamp - 28800
            };

            function updateTimers() {
                const now = Math.floor(Date.now() / 1000);

                document.getElementById('tpa-war-timer').innerHTML =
                    Object.entries(targets)
                    .map(([label, target]) => `
                        <div style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:4px 0;
                            border-bottom:1px solid #F4B8C7;
                        ">
                            <span style="
                                font-weight:600;
                                color:#6B2148;
                            ">
                                ${label}
                            </span>

                            <span style="
                                color:#111;
                                font-family:monospace;
                                font-weight:bold;
                            ">
                                ${formatTime(target - now)}
                            </span>
                        </div>
                    `)
                    .join('');
            }

            updateTimers();
            setInterval(updateTimers, 1000);
        },

        onerror: function () {
            document.getElementById('tpa-war-timer').innerHTML =
                '<span style="color:red;">Unable to reach API</span>';
        }
    });

})();
