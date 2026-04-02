// ==UserScript==
// @name         Egg Finder & Navigator
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Detects eggs and allows Full Arrow Key Navigation through all Torn pages
// @author       K1rbs
// @match        https://www.torn.com/*
// @grant        GM.addStyle
// ==/UserScript==
'use strict';

const EVERY_LINK = [
    "index.php", "city.php", "gym.php", "properties.php", "page.php?sid=education",
    "crimes.php", "loader.php?sid=missions", "newspaper.php", "jailview.php", "hospitalview.php",
    "casino.php", "page.php?sid=hof", "factions.php", "competition.php", "page.php?sid=list&type=friends",
    "page.php?sid=list&type=enemies", "page.php?sid=list&type=targets", "messages.php", "page.php?sid=events", "awards.php", "points.php", "rules.php",
    "staff.php", "credits.php", "citystats.php", "committee.php", "bank.php", "donator.php", "item.php",
    "page.php?sid=stocks", "fans.php", "museum.php", "loader.php?sid=racing", "church.php",
    "dump.php", "loan.php", "page.php?sid=travel", "amarket.php", "bigalgunshop.php", "shops.php?step=bitsnbobs",
    "shops.php?step=cyberforce", "shops.php?step=docks", "shops.php?step=jewelry",
    "shops.php?step=nikeh", "shops.php?step=pawnshop", "shops.php?step=pharmacy", "pmarket.php",
    "shops.php?step=postoffice", "shops.php?step=super", "shops.php?step=candy",
    "shops.php?step=clothes", "shops.php?step=recyclingcenter", "shops.php?step=printstore", "page.php?sid=ItemMarket", "estateagents.php", "bazaar.php?userId=1",
    "calendar.php", "token_shop.php", "freebies.php", "bringafriend.php", "comics.php", "archives.php", "joblist.php",
    "newspaper_class.php", "personals.php", "newspaper.php#/archive", "profiles.php?XID=1",
    "bounties.php", "usersonline.php", "page.php?sid=log", "page.php?sid=ammo", "playerreport.php",
    "loader.php?sid=itemsMods", "displaycase.php", "trade.php", "crimes.php?step=criminalrecords",
    "page.php?sid=factionWarfare#/dirty-bombs", "index.php?page=fortune", "page.php?sid=bunker", "church.php?step=proposals",
    "messageinc.php", "preferences.php", "messageinc2.php#!p=main", "personalstats.php?ID=1",
    "properties.php?step=rentalmarket", "properties.php?step=sellingmarket", "forums.php",
    "page.php?sid=slots", "page.php?sid=roulette", "page.php?sid=highlow", "page.php?sid=keno", "page.php?sid=craps",
    "page.php?sid=bookie", "page.php?sid=lottery", "page.php?sid=blackjack", "page.php?sid=holdem", "page.php?sid=russianRoulette",
    "page.php?sid=spinTheWheel", "companies.php", "itemuseparcel.php", "index.php?page=rehab", "christmas_town.php"
];

if (typeof GM !== 'undefined' && GM.addStyle) {
    GM.addStyle(`
        #egg-nav-status {
            position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7);
            color: #fff; padding: 5px 10px; border-radius: 5px; font-size: 12px;
            z-index: 999999; pointer-events: none; font-family: Arial;
        }
    `);
}

window.addEventListener('load', () => {
    let currentIndex = parseInt(localStorage.getItem('eeh-index')) || 0;
    const status = document.createElement('div');
    status.id = 'egg-nav-status';
    status.innerText = `Egg Nav: Page ${currentIndex} / ${EVERY_LINK.length - 1}`;
    document.body.appendChild(status);

    const egg = document.getElementById('easter-egg-hunt-root');
    if (egg) {
        if (!egg.classList.contains('egg-finder-found')) {
            egg.classList.add('egg-finder-found');
            alert('EGG FOUND!');

            const moveEgg = () => {
                const buttons = egg.querySelectorAll('button');
                if (buttons.length === 0) { setTimeout(moveEgg, 50); return; }
                buttons.forEach(b => {
                    b.style.cssText = "top:40%; left:40%; height:20%; width:20%; position:fixed; border:5px solid red; z-index:999999;";
                    if(b.children[0]) b.children[0].style.height = '100%';
                });
            };
            moveEgg();
        }
    }

    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

        if (e.key === "ArrowRight") {
            currentIndex++;
            if (currentIndex >= EVERY_LINK.length) currentIndex = 0;
            localStorage.setItem('eeh-index', currentIndex);
            window.location.href = "https://www.torn.com/" + EVERY_LINK[currentIndex];
        }
        else if (e.key === "ArrowLeft") {
            currentIndex--;
            if (currentIndex < 0) currentIndex = EVERY_LINK.length - 1;
            localStorage.setItem('eeh-index', currentIndex);
            window.location.href = "https://www.torn.com/" + EVERY_LINK[currentIndex];
        }
    });
});
