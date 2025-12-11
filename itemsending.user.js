// ==UserScript==
// @name         Torn Item Send Queue (CSV)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Fills User ID and Message from a CSV queue when clicking "Add message"
// @author       You
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'torn_send_queue';

    // --- HELPER FUNCTIONS ---

    // Get current queue from storage
    function getQueue() {
        const stored = GM_getValue(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // Save queue to storage
    function saveQueue(queue) {
        GM_setValue(STORAGE_KEY, JSON.stringify(queue));
    }

    // Menu Action: Import CSV
    function importCSV() {
        const input = prompt("Paste your CSV list here:\nFormat: UserID,Message (one per line)\n\nExample:\n123456,Thanks!\n789012,Here is your gift");

        if (!input) return;

        const queue = getQueue();
        const lines = input.split('\n');
        let addedCount = 0;

        lines.forEach(line => {
            // Split by the first comma only, allowing commas in the message
            const parts = line.split(',');
            if (parts.length >= 2) {
                const id = parts[0].trim();
                // Join the rest back together in case the message had commas
                const msg = parts.slice(1).join(',').trim();

                if (id && msg) {
                    queue.push({ id: id, msg: msg });
                    addedCount++;
                }
            }
        });

        saveQueue(queue);
        alert(`Successfully added ${addedCount} entries to the queue.\nTotal in queue: ${queue.length}`);
    }

    // Menu Action: Check Status
    function checkQueue() {
        const queue = getQueue();
        if (queue.length === 0) {
            alert("The queue is currently empty.");
        } else {
            alert(`Next up: ID ${queue[0].id}\nRemaining in queue: ${queue.length}`);
        }
    }

    // Menu Action: Clear Queue
    function clearQueue() {
        if(confirm("Are you sure you want to delete the entire queue?")) {
            saveQueue([]);
            alert("Queue cleared.");
        }
    }

    // --- MENU REGISTRATION ---
    GM_registerMenuCommand("📥 Import CSV Data", importCSV);
    GM_registerMenuCommand("📊 Check Queue Status", checkQueue);
    GM_registerMenuCommand("🗑️ Clear Queue", clearQueue);

    // --- CLICK HANDLER ---

    document.addEventListener('click', function(e) {
        const button = e.target.closest('.action-message');

        if (button) {
            // 1. Check the queue first
            const queue = getQueue();

            if (queue.length === 0) {
                console.log("Torn Script: Queue is empty. No action taken.");
                return; // Do nothing if queue is empty (allows manual entry)
            }

            // 2. Get the first item
            const nextItem = queue[0];
            console.log(`Torn Script: Filling for ID ${nextItem.id}`);

            setTimeout(() => {
                const form = button.closest('form');
                if (!form) return;

                const idInput = form.querySelector('input[name="userID"]');
                const msgInput = form.querySelector('input[name="tag"]');
                const btnLabel = button.querySelector('.action-add'); // Visual feedback element

                // Helper to fill input
                const fillInput = (input, value) => {
                    if (input) {
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('blur', { bubbles: true }));
                    }
                };

                // Fill the form
                fillInput(idInput, nextItem.id);
                fillInput(msgInput, nextItem.msg);

                // 3. Remove the item from the queue and save
                queue.shift();
                saveQueue(queue);

                // Optional: Visual Feedback (Change "Add" to "Remaining: 5")
                if(btnLabel) {
                    btnLabel.innerText = `Done! Rem: ${queue.length}`;
                    btnLabel.style.color = "green";
                }

            }, 50);
        }
    }, true);

})();
