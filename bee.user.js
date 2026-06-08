// ==UserScript==
// @name         Torn Beesus One Button Gnome Sender
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       K1rbs [3090251]
// @match        https://www.torn.com/item.php
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    const BEESUS_ID = "1959482";
    let step = 1;

    const wishes = [
    "Happy Birthday, -Beesus-! Another year older, another year closer to becoming Torn's oldest active player.",
    "Happy Birthday, -Beesus-! We all chipped in and got you a gift: the privilege of aging another year.",
    "Happy Birthday, -Beesus-! Your age is now officially classified information.",
    "Happy Birthday, -Beesus-! May your racing lines be clean and your memory of your actual age remain blurry.",
    "Happy Birthday, -Beesus-! Congratulations on surviving another year despite your best efforts.",
    "Happy Birthday, -Beesus-! You're not old. You're just a limited-edition vintage model.",
    "Happy Birthday, -Beesus-! At your age, every candle is considered a fire hazard.",
    "Happy Birthday, -Beesus-! We were going to buy you a cake, but inflation hit harder than your birthday count.",
    "Happy Birthday, -Beesus-! Don't worry about getting older. Nobody expected you to act your age anyway.",
    "Happy Birthday, -Beesus-! Even Torn's servers haven't been around as long as you have.",
    "Happy Birthday, -Beesus-! Remember, wisdom comes with age. You'll get there eventually.",
    "Happy Birthday, -Beesus-! We checked the records and apparently dinosaurs really did exist.",
    "Happy Birthday, -Beesus-! May your loot be plentiful and your knees not make weird noises today.",
    "Happy Birthday, -Beesus-! You're now at the age where a wild night means staying awake past 10 PM.",
    "Happy Birthday, -Beesus-! Your birth certificate should probably be carbon dated.",
    "Happy Birthday, -Beesus-! Another year closer to receiving faction respect just for surviving.",
    "Happy Birthday, -Beesus-! Today's goal is simple: don't throw your back out blowing out the candles.",
    "Happy Birthday, -Beesus-! You've reached the age where every conversation starts with a medical update.",
    "Happy Birthday, -Beesus-! We asked for your age but the API rate-limited us.",
    "Happy Birthday, -Beesus-! May your birthday be better than your racing excuses.",
    "Happy Birthday, -Beesus-! Rumor has it Torn was founded shortly after your last birthday.",
    "Happy Birthday, -Beesus-! If age is just a number, yours is getting uncomfortably large.",
    "Happy Birthday, -Beesus-! You don't look a day over Needs Reading Glasses.",
    "Happy Birthday, -Beesus-! Congratulations on maintaining your youthful immaturity despite the years.",
    "Happy Birthday, -Beesus-! We wanted to make an age joke, but we weren't sure numbers went that high.",
    "Happy Birthday, -Beesus-! You're genuinely one of the racers of all time.",
    "Happy Birthday, -Beesus-! Your contribution to society has certainly been noted.",
    "Happy Birthday, -Beesus-! Keep setting the standard. Not necessarily a high standard, but a standard.",
    "Happy Birthday, -Beesus-! You're proof that experience and wisdom are completely separate stats.",
    "Happy Birthday, -Beesus-! Thanks for showing us that age is no barrier to questionable decisions.",
    "Happy Birthday, -Beesus-! The museum called. They want their exhibit back.",
    "Happy Birthday, -Beesus-! Don't count the candles. Count the repair bills.",
    "Happy Birthday, -Beesus-! May your reaction time remain acceptable for another year.",
    "Happy Birthday, -Beesus-! You're aging like milk left in the Torn sun.",
    "Happy Birthday, -Beesus-! We were going to get you a present, but your age already gave you enough surprises.",
    "Happy Birthday, -Beesus-! Congratulations on another successful orbit around the sun.",
    "Happy Birthday, -Beesus-! You're now officially too old to trust a fart.",
    "Happy Birthday, -Beesus-! Every year you become more powerful and slightly more confused.",
    "Happy Birthday, -Beesus-! May your loot drops be better than your knees.",
    "Happy Birthday, -Beesus-! Scientists are studying how you've survived this long.",
    "Happy Birthday, -Beesus-! We tried to calculate your age but JavaScript overflowed.",
    "Happy Birthday, -Beesus-! The candles cost more than the cake this year.",
    "Happy Birthday, -Beesus-! You have reached legendary rarity.",
    "Happy Birthday, -Beesus-! Your warranty expired decades ago.",
    "Happy Birthday, -Beesus-! Remember when gas was cheap? You probably do.",
    "Happy Birthday, -Beesus-! The faction has agreed to lower flags to half mast for your youth.",
    "Happy Birthday, -Beesus-! We hope your birthday is as memorable as your password resets.",
    "Happy Birthday, -Beesus-! May your birthday be free of naps. Or at least limited to three.",
    "Happy Birthday, -Beesus-! Congratulations on unlocking another achievement nobody wanted.",
    "Happy Birthday, -Beesus-! We heard the cake needed structural reinforcement.",
    "Happy Birthday, -Beesus-! You continue to inspire us to lower our expectations.",
    "Happy Birthday, -Beesus-! Your age is approaching endgame content.",
    "Happy Birthday, -Beesus-! Have a fantastic day, fossil.",
    "Happy Birthday, -Beesus-! We checked with historians and they're fans.",
    "Happy Birthday, -Beesus-! The retirement home scouting reports are looking promising.",
    "Happy Birthday, -Beesus-! Another year of being confidently wrong.",
    "Happy Birthday, -Beesus-! You remain a shining example of what not to do.",
    "Happy Birthday, -Beesus-! Thanks for beta testing adulthood for the rest of us.",
    "Happy Birthday, -Beesus-! The archeologists send their regards.",
    "Happy Birthday, -Beesus-! We hope your birthday is almost as great as you think you are.",
    "Happy Birthday, -Beesus-! Please celebrate responsibly. Your bones certainly won't.",
    "Happy Birthday, -Beesus-! Another level gained. No noticeable stat increases detected.",
    "Happy Birthday, -Beesus-! Your maturity still appears to be loading.",
    "Happy Birthday, -Beesus-! Stay awesome. Or at least stay hydrated.",
    "Happy Birthday, -Beesus-! Your age has entered a higher tax bracket.",
    "Happy Birthday, -Beesus-! You were young once. Tell us about it.",
    "Happy Birthday, -Beesus-! We all admire your commitment to getting older.",
    "Happy Birthday, -Beesus-! Here's to another year of questionable life choices.",
    "Happy Birthday, -Beesus-! You make growing old look unavoidable.",
    "Happy Birthday, -Beesus-! Don't let anyone tell you you're old. Let your joints do that.",
    "Happy Birthday, -Beesus-! You remain undefeated in the race against maturity.",
    "Happy Birthday, -Beesus-! We would roast you more, but time already has.",
    "Happy Birthday, -Beesus-! Keep living proof that age and wisdom are independent variables.",
    "Happy Birthday, -Beesus-! May your birthday cake have fewer layers than your excuses.",
    "Happy Birthday, -Beesus-! You're a classic. Like Internet Explorer.",
    "Happy Birthday, -Beesus-! We considered getting you anti-aging cream, but we're too late.",
    "Happy Birthday, -Beesus-! You're still younger than you'll be next year.",
    "Happy Birthday, -Beesus-! Enjoy your special day before bedtime arrives."
];

    GM_addStyle(`
        #beesus-one-btn {
            position: fixed;
            right: 25px;
            top: 45%;
            z-index: 999999;
            width: 180px;
            height: 45px;
            background: #85c742;
            color: #000;
            border: 2px solid #111;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(0,0,0,.7);
        }
    `);

    function visible(el) {
        return el && el.offsetParent !== null;
    }

    function findVisible(selector) {
        return [...document.querySelectorAll(selector)].find(visible);
    }

    function clickIt(el) {
        if (!el) return false;
        el.scrollIntoView({ block: "center", inline: "center" });
        el.click();
        return true;
    }

    function setValue(el, value) {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
    }

    function randomWish() {
        return wishes[Math.floor(Math.random() * wishes.length)];
    }

    function fillMessage() {
        const idInput = findVisible('input[name="userID"]');
        const msgInput = findVisible('input[name="tag"]');

        if (!idInput || !msgInput) return false;

        setValue(idInput, BEESUS_ID);
        setValue(msgInput, randomWish());
        return true;
    }

    function findYesButton() {
        return [...document.querySelectorAll('a.next-act')]
            .find(el => el.textContent.trim().toLowerCase() === "yes");
    }

    function updateButton(btn) {
        btn.textContent =
            step === 1 ? "1. Send Gnome" :
            step === 2 ? "2. Add Message" :
            step === 3 ? "3. SEND" :
            "4. YES";
    }

    function makeButton() {
        if (document.getElementById("beesus-one-btn")) return;

        const btn = document.createElement("button");
        btn.id = "beesus-one-btn";
        document.body.appendChild(btn);
        updateButton(btn);

        btn.onclick = () => {
            if (step === 1) {
                const gnomeBtn =
                    findVisible('button[aria-label="Send Garden Gnome"]') ||
                    findVisible('button.option-send[aria-label*="Garden Gnome"]');

                if (!clickIt(gnomeBtn)) return alert("Could not find visible Send Garden Gnome button.");

                step = 2;
                updateButton(btn);
                return;
            }

            if (step === 2) {
                const msgBtn =
                    findVisible('a.action-message.left') ||
                    findVisible('a.action-message');

                if (!clickIt(msgBtn)) return alert("Could not find visible Add Message button.");

                setTimeout(() => {
                    if (!fillMessage()) alert("Message opened, but fields were not found.");
                }, 250);

                step = 3;
                updateButton(btn);
                return;
            }

            if (step === 3) {
                const sendBtn =
                    findVisible('input.torn-btn[type="submit"][value="SEND"]') ||
                    findVisible('input[type="submit"][value="SEND"]');

                if (!clickIt(sendBtn)) return alert("Could not find visible SEND button.");

                step = 4;
                updateButton(btn);
                return;
            }

            if (step === 4) {
                const yesBtn = findYesButton();

                if (!clickIt(yesBtn)) return alert("Could not find visible YES button.");

                step = 1;
                updateButton(btn);
            }
        };
    }

    makeButton();

    new MutationObserver(makeButton).observe(document.body, {
        childList: true,
        subtree: true
    });
})();
