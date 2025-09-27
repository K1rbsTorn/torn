// ==UserScript==
// @name         Torn: Racing enhancements Custom Skin
// @namespace    lugburz.racing_enhancements
// @version      0.5.36
// @description  Show car's current speed, precise skill, official race penalty, racing skill of others and race car skins (with custom overrides).
// @author       Lugburz & K1rbs
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/f2404/torn-userscripts/e3bb87d75b44579cdb6f756435696960e009dc84/lib/lugburz_lib.js
// @connect      api.torn.com
// @connect      race-skins.brainslug.nl
// @connect      k1rbstpa.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

// --- START: Script Configuration ---
const NOTIFICATIONS = GM_getValue('showNotifChk') != 0;
const SHOW_RESULTS = GM_getValue('showResultsChk') != 0;
const SHOW_SPEED = GM_getValue('showSpeedChk') != 0;
const SHOW_POSITION_ICONS = GM_getValue('showPositionIconChk') != 0;
let FETCH_RS = !!(GM_getValue('apiKey') && GM_getValue('apiKey').length > 0);
const SHOW_SKINS = GM_getValue('showSkinsChk') != 0;

const SKIN_AWARDS = 'https://race-skins.brainslug.nl/custom/data';
const SKIN_IMAGE = id => `https://race-skins.brainslug.nl/assets/${id}`;
const SKIN_GALLERY_URL = 'https://k1rbstpa.com/mum_cars.html';

const DEFAULT_CUSTOM_SKIN_CONFIG = {
    userIds: [3090251, 2958211, 2718606],
    skinsByCarId: {
        '78': 'e9c95171-a85f-4874-8a49-25ddf536d2aa', '85': 'b2a8b231-d385-4f76-966a-307e8ad956d1',
        '497': 'https://k1rbstpa.com/barbyPurple.png', '511': '9e464fa6-275c-44ae-8d50-4648a13f9a46',
        '517': '094b898e-a197-4fdd-a6ff-d2ab88e00a4e', '518': 'fc130f42-6fe1-4bdf-98e1-f1207ed04153',
        '520': '7004b0bc-5750-45e4-be3a-496afb9370b2', '521': '6d533149-3ac5-4209-b7dc-1337987104d4',
        '522': '0661b541-eca4-4c75-9914-35daa85c9651', '523': 'ddc24665-e41a-44c0-9f3a-3eacb3308f13',
        '524': '3b642eb4-e774-4c50-a3eb-1beabcf65392',
    }
};
let CUSTOM_SKIN_CONFIG = JSON.parse(GM_getValue('customSkinConfig', JSON.stringify(DEFAULT_CUSTOM_SKIN_CONFIG)));
// --- END: Script Configuration ---

const userID = getUserIdFromCookie();
var RACE_ID = '*';
var period = 1000;
var last_compl = -1.0;
var x = 0;
var penaltyNotif = 0;

function maybeClear() {
    if (x != 0) {
        clearInterval(x);
        last_compl = -1.0;
        x = 0;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const racingSkillCacheByDriverId = new Map();
let updating = false;

async function updateDriversList() {
    const driversList = document.getElementById('leaderBoard');
    if (updating || driversList === null) {
        return;
    }

    FETCH_RS = !!(GM_getValue('apiKey') && GM_getValue('apiKey').length > 0);

    watchForDriversListContentChanges(driversList);

    const driverIds = getDriverIds(driversList);
    if (!driverIds || !driverIds.length) {
        return;
    }

    updating = true;
    $('#updating').size() < 1 && $('#racingupdatesnew').prepend('<div id="updating" style="color: green; font-size: 12px; line-height: 24px;">Updating drivers\' RS and skins...</div>');

    const racingSkills = FETCH_RS ? await getRacingSkillForDrivers(driverIds) : {};
    const racingSkins = SHOW_SKINS ? await getRacingSkinOwners(driverIds) : {};

    for (let driver of driversList.querySelectorAll('.driver-item')) {
        const driverId = getDriverId(driver);

        // Racing Skill Logic
        if (FETCH_RS && !!racingSkills[driverId]) {
            const skill = racingSkills[driverId];
            const nameDiv = driver.querySelector('.name');
            nameDiv.style.position = 'relative';
            if (!driver.querySelector('.rs-display')) {
                nameDiv.insertAdjacentHTML('beforeend', `<span class="rs-display">RS:${skill}</span>`);
            }
        } else if (!FETCH_RS) {
            const rsSpan = driver.querySelector('.rs-display');
            if (!!rsSpan) {
                rsSpan.remove();
            }
        }

        // Skin Logic
        if (SHOW_SKINS) {
            const carImg = driver.querySelector('.car')?.querySelector('img');
            if (!carImg) continue;

            const carId = carImg.getAttribute('src').replace(/[^0-9]*/g, '');
            const userHasOfficialSkin = !!racingSkins[driverId] && !!racingSkins[driverId][carId];

            if (CUSTOM_SKIN_CONFIG.userIds.includes(driverId)) {
                const customSkinForThisCar = CUSTOM_SKIN_CONFIG.skinsByCarId[carId];
                if (customSkinForThisCar) {
                    const customSkinUrl = customSkinForThisCar.startsWith('http') ? customSkinForThisCar : SKIN_IMAGE(customSkinForThisCar);
                    if (carImg.getAttribute('src') !== customSkinUrl) {
                        carImg.setAttribute('src', customSkinUrl);
                    }
                    if (!carImg.dataset.skinWatcher) {
                        carImg.dataset.skinWatcher = 'true';
                        const watcher = new MutationObserver(() => {
                            if (carImg.getAttribute('src') !== customSkinUrl) {
                                watcher.disconnect();
                                carImg.setAttribute('src', customSkinUrl);
                                watcher.observe(carImg, { attributes: true, attributeFilter: ['src'] });
                            }
                        });
                        watcher.observe(carImg, { attributes: true, attributeFilter: ['src'] });
                    }
                    if (driverId === userID) {
                        skinCarSidebar(customSkinForThisCar);
                    }
                }
            } else if (userHasOfficialSkin) {
                if (!carImg.dataset.skinWatcher) {
                    carImg.setAttribute('src', SKIN_IMAGE(racingSkins[driverId][carId]));
                    if (driverId == userID) skinCarSidebar(racingSkins[driverId][carId]);
                }
            }
        }
    }

    updating = false;
    $('#updating').size() > 0 && $('#updating').remove();
}

function watchForDriversListContentChanges(driversList) {
    if (driversList.dataset.hasWatcher !== undefined) {
        return;
    }
    new MutationObserver(updateDriversList).observe(driversList, { childList: true });
    driversList.dataset.hasWatcher = 'true';
}

function getDriverIds(driversList) {
    return Array.from(driversList.querySelectorAll('.driver-item')).map(driver => getDriverId(driver));
}

function getDriverId(driverUl) {
    return +driverUl.closest('li').id.substr(4);
}

let racersCount = 0;
async function getRacingSkillForDrivers(driverIds) {
    const driverIdsToFetchSkillFor = driverIds.filter(driverId => !racingSkillCacheByDriverId.has(driverId));
    for (const driverId of driverIdsToFetchSkillFor) {
        const json = await fetchRacingSkillForDrivers(driverId);
        racingSkillCacheByDriverId.set(+driverId, json?.personalstats?.racingskill || 'N/A');
        if (json?.error) {
            $('#racingupdatesnew').prepend(`<div style="color: red; font-size: 12px; line-height: 24px;">API error: ${JSON.stringify(json.error)}</div>`);
            break;
        }
        racersCount++;
        if (racersCount > 20) await sleep(1500);
    }
    const resultHash = {};
    for (const driverId of driverIds) {
        const skill = racingSkillCacheByDriverId.get(driverId);
        if (!!skill) {
            resultHash[driverId] = skill;
        }
    }
    return resultHash;
}

let _skinOwnerCache = null;
async function getRacingSkinOwners(driverIds) {
    function filterSkins(skins) {
        let result = {};
        for (const driverId of driverIds) {
            if (skins?.['*']?.[driverId]) {
                result[driverId] = skins['*'][driverId];
            }
            if (skins?.[RACE_ID]?.[driverId]) {
                result[driverId] = skins[RACE_ID][driverId];
            }
        }
        return result;
    }
    return new Promise(resolve => {
        if (!!_skinOwnerCache) return resolve(_skinOwnerCache);
        GM_xmlhttpRequest({
            method: 'GET',
            url: SKIN_AWARDS,
            headers: { 'Content-Type': 'application/json' },
            onload: ({ responseText }) => {
                _skinOwnerCache = JSON.parse(responseText);
                resolve(_skinOwnerCache);
            },
            onerror: (err) => {
                console.error(err);
                resolve({});
            },
        });
    }).then(filterSkins);
}

function skinCarSidebar(carSkin) {
    const carSelected = document.querySelector('.car-selected');
    if (!carSelected) return;
    const tornItem = carSelected.querySelector('.torn-item');
    if (!tornItem) return;
    try {
        const imageUrl = carSkin.startsWith('http') ? carSkin : SKIN_IMAGE(carSkin);
        if (tornItem.getAttribute('src') !== imageUrl) {
            tornItem.setAttribute('src', imageUrl);
            tornItem.setAttribute('srcset', imageUrl);
            tornItem.style.display = 'block';
            tornItem.style.opacity = 1;
            const canvas = carSelected.querySelector('canvas');
            if (!!canvas) canvas.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
    }
}

function getUserIdFromCookie() {
    const userIdString = document.cookie.split(';').map(entry => entry.trim()).find(entry => entry.indexOf('uid=') === 0).replace('uid=', '');
    return parseInt(userIdString, 10);
}

function fetchRacingSkillForDrivers(driverIds) {
    const apiKey = GM_getValue('apiKey');
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: `https://api.torn.com/user/${driverIds}?selections=personalstats&comment=RacingUiUx&key=${apiKey}`,
            headers: { 'Content-Type': 'application/json' },
            onload: (response) => {
                try {
                    resolve(JSON.parse(response.responseText));
                } catch (err) {
                    reject(err);
                }
            },
            onerror: (err) => {
                reject(err);
            }
        });
    });
}

function showSpeed() {
    if (!SHOW_SPEED || $('#racingdetails').size() < 1 || $('#racingdetails').find('#speed_mph').size() > 0) return;
    $('#racingdetails').find('li.pd-name').each(function() {
        if ($(this).text() == 'Name:') $(this).hide();
        if ($(this).text() == 'Position:') $(this).text('Pos:');
        if ($(this).text() == 'Completion:') $(this).text('Compl:');
    });
    $('#racingdetails').append('<li id="speed_mph" class="pd-val"></li>');
    maybeClear();
    x = setInterval(function() {
        if ($('#racingupdatesnew').find('div.track-info').size() < 1) {
            maybeClear();
            return;
        }
        let laps = $('#racingupdatesnew').find('div.title-black').text().split(" - ")[1].split(" ")[0];
        let len = $('#racingupdatesnew').find('div.track-info').attr('data-length').replace('mi', '');
        let compl = $('#racingdetails').find('li.pd-completion').text().replace('%', '');
        if (last_compl >= 0) {
            let speed = (compl - last_compl) / 100 * laps * len * 60 * 60 * 1000 / period;
            $('#speed_mph').text(speed.toFixed(2) + 'mph');
        }
        last_compl = compl;
    }, period);
}

function showPenalty() {
    if ($('#racingAdditionalContainer').find('div.msg.right-round').size() > 0 &&
        $('#racingAdditionalContainer').find('div.msg.right-round').text().trim().startsWith('You have recently left')) {
        const penalty = GM_getValue('leavepenalty') * 1000;
        const now = Date.now();
        if (penalty > now) {
            const date = new Date(penalty);
            $('#racingAdditionalContainer').find('div.msg.right-round').text('You may join an official race at ' + formatTime(date) + '.');
        }
    }
}

function checkPenalty() {
    if (penaltyNotif) clearTimeout(penaltyNotif);
    const leavepenalty = GM_getValue('leavepenalty');
    const penaltyLeft = leavepenalty * 1000 - Date.now();
    if (NOTIFICATIONS && penaltyLeft > 0) {
        penaltyNotif = setTimeout(function() {
            GM_notification("You may join an official race now.", "Torn: Racing enhancements");
        }, penaltyLeft);
    }
}

function updateSkill(level) {
    const skill = Number(level).toFixed(5);
    const prev = GM_getValue('racinglevel');
    const now = Date.now();
    const lastDaysRs = GM_getValue('lastDaysRs');
    if (lastDaysRs && lastDaysRs.includes(':')) {
        const ts = lastDaysRs.split(':')[0];
        const dateTs = new Date();
        dateTs.setTime(ts);
        if (1 * (new Date(now).setUTCHours(0, 0, 0, 0)) - 1 * (dateTs.setUTCHours(0, 0, 0, 0)) >= 24 * 60 * 60 * 1000) {
            GM_setValue('lastDaysRs', `${now}:${prev ? prev : skill}`);
        }
    } else {
        GM_setValue('lastDaysRs', `${now}:${prev ? prev : skill}`);
    }
    if (prev !== "undefined" && typeof prev !== "undefined" && level > prev) {
        const inc = Number(level - prev).toFixed(5);
        if (NOTIFICATIONS) GM_notification("Your racing skill has increased by " + inc + "!", "Torn: Racing enhancements");
        GM_setValue('lastRSincrement', inc);
    }
    GM_setValue('racinglevel', level);
    if ($('#racingMainContainer').find('div.skill').size() > 0) {
        if ($("#sidebarroot").find("a[class^='menu-value']").size() > 0) {
            $('#racingMainContainer').find('div.skill-desc').css('left', '5px');
            $('#racingMainContainer').find('div.skill').css('left', '5px').text(skill);
        } else {
            $('#racingMainContainer').find('div.skill').text(skill);
        }
        const lastInc = GM_getValue('lastRSincrement');
        if (lastInc) {
            $('div.skill').append(`<div style="margin-top: 10px;">Last gain: ${lastInc}</div>`);
        }
    }
}

function updatePoints(pointsearned) {
    const now = Date.now();
    const lastDaysPoints = GM_getValue('lastDaysPoints');
    const prev = GM_getValue('pointsearned');
    if (lastDaysPoints && lastDaysPoints.includes(':')) {
        const ts = lastDaysPoints.split(':')[0];
        const dateTs = new Date();
        dateTs.setTime(ts);
        if (1 * (new Date(now).setUTCHours(0, 0, 0, 0)) - 1 * (dateTs.setUTCHours(0, 0, 0, 0)) >= 24 * 60 * 60 * 1000) {
            GM_setValue('lastDaysPoints', `${now}:${prev ? prev : pointsearned}`);
        }
    } else {
        GM_setValue('lastDaysPoints', `${now}:${prev ? prev : pointsearned}`);
    }
    GM_setValue('pointsearned', pointsearned);
}

function parseRacingData(data) {
    const my_name = $("#sidebarroot").find("a[class^='menu-value']").html() || data.user.playername;
    updateSkill(data['user']['racinglevel']);
    updatePoints(data['user']['pointsearned']);
    const leavepenalty = data['user']['leavepenalty'];
    GM_setValue('leavepenalty', leavepenalty);
    checkPenalty();
    if ($('#raceLink').size() < 1) {
        RACE_ID = data.raceID;
        const raceLink = `<a id="raceLink" href="https://www.torn.com/loader.php?sid=racing&tab=log&raceID=${RACE_ID}" style="float: right; margin-left: 12px;">Link to the race</a>`;
        $(raceLink).insertAfter('#racingEnhSettings');
    }
    if (data.timeData.status >= 3) {
        const carsData = data.raceData.cars;
        const carInfo = data.raceData.carInfo;
        const trackIntervals = data.raceData.trackData.intervals.length;
        let results = [], crashes = [];
        for (const playername in carsData) {
            const userId = carInfo[playername].userID;
            const intervals = decode64(carsData[playername]).split(',');
            let raceTime = 0;
            let bestLap = 9999999999;
            if (intervals.length / trackIntervals == data.laps) {
                for (let i = 0; i < data.laps; i++) {
                    let lapTime = 0;
                    for (let j = 0; j < trackIntervals; j++) {
                        lapTime += Number(intervals[i * trackIntervals + j]);
                    }
                    bestLap = Math.min(bestLap, lapTime);
                    raceTime += Number(lapTime);
                }
                results.push([playername, userId, raceTime, bestLap]);
            } else {
                crashes.push([playername, userId, 'crashed']);
            }
        }
        results.sort(compare);
        addExportButton(results, crashes, my_name, data.raceID, data.timeData.timeEnded);
        if (SHOW_RESULTS) {
            showResults(results);
            showResults(crashes, results.length);
        }
    }
}

function compare(a, b) {
    if (a[2] > b[2]) return 1;
    if (b[2] > a[2]) return -1;
    return 0;
}

function showResults(results, start = 0) {
    for (let i = 0; i < results.length; i++) {
        $('#leaderBoard').children('li').each(function() {
            const name = $(this).find('li.name').text().trim();
            if (name == results[i][0]) {
                const p = i + start + 1;
                const position = p === 1 ? 'gold' : (p === 2 ? 'silver' : (p === 3 ? 'bronze' : ''));
                let place;
                if (p != 11 && (p % 10) == 1) place = p + 'st';
                else if (p != 12 && (p % 10) == 2) place = p + 'nd';
                else if (p != 13 && (p % 10) == 3) place = p + 'rd';
                else place = p + 'th';
                const result = typeof results[i][2] === 'number' ? formatTimeMsec(results[i][2] * 1000) : results[i][2];
                const bestLap = results[i][3] ? formatTimeMsec(results[i][3] * 1000) : null;
                $(this).find('li.name').html($(this).find('li.name').html().replace(name, ((SHOW_POSITION_ICONS && position) ? `<i class="race_position ${position}"></i>` : '') + `${name} ${place} ${result}` + (bestLap ? ` (best: ${bestLap})` : '')));
                return false;
            }
        });
    }
}

async function getCarSkinData() {
    const CACHE_KEY = 'carSkinDataCache';
    const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
    const cached = JSON.parse(GM_getValue(CACHE_KEY, null));
    if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION)) {
        return cached.data;
    }
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET', url: SKIN_GALLERY_URL,
            onload: (response) => {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    const carItems = doc.querySelectorAll('.car-item');
                    const skins = [];
                    const infoRegex = /showInfo\('([^']*)',\s*'([^']*)'\)/;
                    carItems.forEach(item => {
                        const onclickAttr = item.getAttribute('onclick');
                        const match = onclickAttr.match(infoRegex);
                        if (match && match[1] && match[2]) {
                            skins.push({ key: match[1], uuid: match[2] });
                        }
                    });
                    GM_setValue(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: skins }));
                    resolve(skins);
                } catch (e) { console.error("Failed to parse car skin data:", e); reject(e); }
            },
            onerror: (err) => {
                console.error("Failed to fetch car skin page:", err);
                resolve(cached ? cached.data : []);
            }
        });
    });
}

async function openCarGallery() {
    if ($('#car-gallery-modal').length === 0) {
        $('body').append(`
            <div id="car-gallery-modal" class="gallery-modal-overlay">
                <div class="gallery-modal-content">
                    <span class="gallery-modal-close">&times;</span>
                    <h2>Select a Car Skin</h2>
                    <div id="gallery-controls"><select id="gallery-filter"></select></div>
                    <div id="car-gallery-container" class="gallery-grid"></div>
                </div>
            </div>
        `);
        $('.gallery-modal-close').on('click', () => $('#car-gallery-modal').hide());
        $('#gallery-filter').on('change', () => {
            const selectedKey = $('#gallery-filter').val();
            const allSkins = $('#car-gallery-container').data('allSkins');
            populateGalleryGrid(allSkins, selectedKey);
        });
    }
    try {
        const skins = await getCarSkinData();
        $('#car-gallery-container').data('allSkins', skins);
        const filterDropdown = $('#gallery-filter');
        filterDropdown.empty();
        const uniqueKeys = [...new Set(skins.map(s => s.key))].sort((a, b) => a - b);
        filterDropdown.append('<option value="all">All Cars</option>');
        uniqueKeys.forEach(key => {
            filterDropdown.append(`<option value="${key}">Car ID: ${key}</option>`);
        });
        populateGalleryGrid(skins, 'all');
        $('#car-gallery-modal').show();
    } catch (e) { alert("Could not load car skin data. Please try again later."); }
}

function populateGalleryGrid(allSkins, filterKey) {
    const galleryContainer = $('#car-gallery-container');
    galleryContainer.empty();
    const filteredSkins = (filterKey === 'all') ? allSkins : allSkins.filter(skin => skin.key === filterKey);
    filteredSkins.forEach(skin => {
        const item = $(`
            <div class="gallery-item" data-key="${skin.key}" data-uuid="${skin.uuid}">
                <img src="${SKIN_IMAGE(skin.uuid)}" alt="Car Skin for ${skin.key}" loading="lazy" />
                <div class="gallery-item-info">Car ID: ${skin.key}</div>
            </div>
        `);
        item.on('click', function() {
            const key = $(this).data('key');
            const uuid = $(this).data('uuid');
            try {
                const currentSkins = JSON.parse($('#customSkinsByCar').val() || '{}');
                currentSkins[key] = uuid;
                $('#customSkinsByCar').val(JSON.stringify(currentSkins, null, 2));
            } catch (e) {
                $('#customSkinsByCar').val(JSON.stringify({ [key]: uuid }, null, 2));
            }
            $('#car-gallery-modal').hide();
        });
        galleryContainer.append(item);
    });
}

function addSettingsDiv() {
    if ($("#racingupdatesnew").size() > 0 && $('#racingEnhSettings').size() < 1) {
        const div = `
            <div style="font-size: 12px; line-height: 24px; padding: 0 10px; background: repeating-linear-gradient(90deg,#242424,#242424 2px,#2e2e2e 0,#2e2e2e 4px); border-radius: 5px;">
                <a id="racingEnhSettings" style="text-align: right; cursor: pointer;">Settings</a>
                <div id="racingEnhSettingsContainer" style="display: none;"><ul style="color: #ddd; padding-left: 0; list-style: none; margin: 5px 0;">
                    <li><input type="checkbox" style="margin: 5px;" id="showSpeedChk"><label for="showSpeedChk">Show current speed</label></li>
                    <li><input type="checkbox" style="margin: 5px;" id="showNotifChk"><label for="showNotifChk">Show notifications</label></li>
                    <li><input type="checkbox" style="margin: 5px;" id="showResultsChk"><label for="showResultsChk">Show results</label></li>
                    <li><input type="checkbox" style="margin: 5px;" id="showSkinsChk"><label for="showSkinsChk">Show racing skins</label></li>
                    <li><input type="checkbox" style="margin: 5px;" id="showPositionIconChk"><label for="showPositionIconChk">Show position icons</label></li>
                    <li><label>API Key (<a href="https://www.torn.com/preferences.php#tab=api" target="_blank" rel="noopener noreferrer">find here</a>)</label>
                        <span class="input-wrap" style="margin: 0px 5px 5px;"><input type="text" autocomplete="off" id="apiKey"></span>
                        <a href="#" id="saveApiKey" class="link btn-action-tab tt-modified"><i style="display: inline-block; background: url(/images/v2/racing/car_enlist.png) 0 0 no-repeat; vertical-align: middle; height: 15px; width: 15px;"></i>Save</a>
                    </li>
                    <hr style="margin: 10px 0;">
                    <li style="font-weight: bold;">Custom Skin Overrides</li>
                    <li><label for="customUserIds" style="display: block; margin-bottom: 5px;">User IDs to override (comma-separated):</label>
                        <textarea id="customUserIds" style="width: 95%; background-color: #333; color: #ddd; border: 1px solid #555; border-radius: 3px;"></textarea></li>
                    <li><label for="customSkinsByCar" style="display: block; margin-bottom: 5px;">Skins by Car ID (JSON):
                        <a href="${SKIN_GALLERY_URL}" target="_blank" rel="noopener noreferrer">(View Page)</a>
                        <a href="#" id="openCarGalleryBtn" style="margin-left: 5px;">(Select from Gallery)</a></label>
                        <textarea id="customSkinsByCar" style="width: 95%; height: 150px; background-color: #333; color: #ddd; border: 1px solid #555; border-radius: 3px; font-family: monospace;"></textarea>
                    </li>
                    <li><a href="#" id="saveCustomSkins" class="link btn-action-tab tt-modified"><i style="display: inline-block; background: url(/images/v2/racing/car_enlist.png) 0 0 no-repeat; vertical-align: middle; height: 15px; width: 15px;"></i>Save Custom Skins</a>
                        <span id="save-skin-feedback" style="color: lightgreen; margin-left: 10px; display: none;">Saved!</span>
                    </li>
                </ul></div>
            </div>`;
        $('#racingupdatesnew').prepend(div);
        $('#racingEnhSettingsContainer input[type=checkbox]').each(function() { $(this).prop('checked', GM_getValue($(this).attr('id')) != 0); });
        $('#apiKey').val(GM_getValue('apiKey'));
        $('#customUserIds').val(CUSTOM_SKIN_CONFIG.userIds.join(', '));
        $('#customSkinsByCar').val(JSON.stringify(CUSTOM_SKIN_CONFIG.skinsByCarId, null, 2));
        $('#racingEnhSettings').on('click', () => $('#racingEnhSettingsContainer').toggle());
        $('#racingEnhSettingsContainer').on('click', 'input[type=checkbox]', function() { GM_setValue($(this).attr('id'), $(this).prop('checked') ? 1 : 0); });
        $('#saveApiKey').click(e => { e.preventDefault(); e.stopPropagation(); GM_setValue('apiKey', $('#apiKey').val()); updateDriversList(); });
        $('#openCarGalleryBtn').click(e => { e.preventDefault(); e.stopPropagation(); openCarGallery(); });
        $('#saveCustomSkins').click(e => {
            e.preventDefault(); e.stopPropagation();
            try {
                const userIds = $('#customUserIds').val().trim() ? $('#customUserIds').val().trim().split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)) : [];
                const skinsByCarId = JSON.parse($('#customSkinsByCar').val());
                const newConfig = { userIds, skinsByCarId };
                GM_setValue('customSkinConfig', JSON.stringify(newConfig));
                CUSTOM_SKIN_CONFIG = newConfig;
                $('#save-skin-feedback').show().fadeOut(3000);
                updateDriversList();
            } catch (err) { alert("Error saving: Please ensure 'Skins by Car ID' contains valid JSON."); console.error("Failed to save skin config:", err); }
        });
    }
}

function addExportButton(results, crashes, my_name, race_id, time_ended) {
    if ($("#racingupdatesnew").size() > 0 && $('#downloadAsCsv').size() < 1) {
        let csv = 'position,name,id,time,best_lap,rs\n';
        for (let i = 0; i < results.length; i++) {
            const timeStr = formatTimeMsec(results[i][2] * 1000, true);
            const bestLap = formatTimeMsec(results[i][3] * 1000);
            csv += [i + 1, results[i][0], results[i][1], timeStr, bestLap, (results[i][0] === my_name ? GM_getValue('racinglevel') : '')].join(',') + '\n';
        }
        for (let i = 0; i < crashes.length; i++) {
            csv += [results.length + i + 1, crashes[i][0], crashes[i][1], crashes[i][2], '', (crashes[i][0] === my_name ? GM_getValue('racinglevel') : '')].join(',') + '\n';
        }
        const timeE = new Date();
        timeE.setTime(time_ended * 1000);
        const fileName = `${timeE.getUTCFullYear()}${pad(timeE.getUTCMonth() + 1, 2)}${pad(timeE.getUTCDate(), 2)}-race_${race_id}.csv`;
        const myblob = new Blob([csv], { type: 'application/octet-stream' });
        const myurl = window.URL.createObjectURL(myblob);
        const exportBtn = `<a id="downloadAsCsv" href="${myurl}" style="float: right; margin-left: 12px;" download="${fileName}">Download results as CSV</a>`;
        $(exportBtn).insertAfter('#racingEnhSettings');
    }
}

function addPlaybackButton() {
    if ($("#racingupdatesnew").size() > 0 && $('div.race-player-container').size() < 1) {
        $('div.drivers-list > div.cont-black').prepend(`<div class="race-player-container"><button id="play-pause-btn" class="play"></button>
            <div id="speed-slider"><span id="prev-speed" class="disabled"></span><span id="speed-value">x1</span><span id="next-speed" class="enabled"></span></div>
            <div id="replay-bar-container"><span id="progress-active"></span><span id="progress-inactive"></span></div>
            <div id="race-timer-container"><span id="race-timer">00:00:00</span></div></div>`);
    }
}

function displayDailyGains() {
    $('#mainContainer').find('div.content').find('span.label').each((i, el) => {
        if ($(el).text().includes('Racing')) {
            const racingLi = $(el).parent().parent();
            const desc = $(racingLi).find('span.desc');
            if ($(desc).size() > 0) {
                const rsText = $(desc).text();
                const currentRs = GM_getValue('racinglevel');
                const lastDaysRs = GM_getValue('lastDaysRs');
                const oldRs = lastDaysRs && lastDaysRs.includes(':') ? lastDaysRs.split(':')[1] : undefined;
                $(desc).text(`${rsText} / Daily gain: ${currentRs && oldRs ? (1*currentRs - 1*oldRs).toFixed(5) : 'N/A'}`);
                $(desc).attr('title', 'Daily gain: How much your racing skill has increased since yesterday.');
            }
            const lastDaysPoints = GM_getValue('lastDaysPoints');
            const currentPoints = GM_getValue('pointsearned');
            const oldPoints = lastDaysPoints && lastDaysPoints.includes(':') ? lastDaysPoints.split(':')[1] : undefined;
            let pointsTitle = 'Racing points earned: How many points you have earned throughout your career.';
            for (const x of [{ points: 25, class: 'D' }, { points: 100, class: 'C' }, { points: 250, class: 'B' }, { points: 475, class: 'A' }]) {
                if (currentPoints && currentPoints < x.points) pointsTitle += `<br>Till <b>class ${x.class}</b>: ${1*x.points - 1*currentPoints}`;
            }
            const pointsLi = `<li role="row"><span class="divider"><span class="label" title="${pointsTitle}">Racing points earned</span></span>
                <span class="desc" title="Daily gain: How many racing points you've earned since yesterday.">
                ${currentPoints || 'N/A'} / Daily gain: ${currentPoints && oldPoints ? 1*currentPoints - 1*oldPoints : 'N/A'}
                </span></li>`;
            $(pointsLi).insertAfter(racingLi);
            return false;
        }
    });
}

GM_addStyle(`
    .rs-display { position: absolute; right: 5px; }
    ul.driver-item > li.name { overflow: auto; }
    li.name .race_position { background:url(/images/v2/racing/car_status.svg) 0 0 no-repeat; display:inline-block; width:20px; height:18px; vertical-align:text-bottom; }
    li.name .race_position.gold { background-position:0 0; }
    li.name .race_position.silver { background-position:0 -22px; }
    li.name .race_position.bronze { background-position:0 -44px; }
    .gallery-modal-overlay { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); }
    .gallery-modal-content { background-color: #2e2e2e; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 900px; border-radius: 8px; color: #ddd; }
    .gallery-modal-close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
    #gallery-controls { margin-bottom: 15px; }
    #gallery-filter { background-color: #333; color: #ddd; border: 1px solid #555; padding: 5px; border-radius: 3px; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; max-height: 70vh; overflow-y: auto; padding-right: 10px; }
    .gallery-item { border: 1px solid #555; border-radius: 5px; cursor: pointer; text-align: center; transition: transform 0.2s, border-color 0.2s; padding: 5px; }
    .gallery-item:hover { transform: scale(1.05); border-color: #fff200; }
    .gallery-item img { max-width: 100%; height: auto; }
    .gallery-item-info { font-size: 0.9em; margin-top: 5px; }
`);

'use strict';
const href = $(location).attr('href');
const racingPage = ['sid=racing&tab=log&raceID=', 'page.php?sid=racing'].some(path => href.includes(path));

ajax((page, xhr) => {
    if (page !== 'loader' && page !== 'page') return;
    $("#racingupdatesnew").ready(addSettingsDiv);
    $("#racingupdatesnew").ready(showSpeed);
    $('#racingAdditionalContainer').ready(showPenalty);
    if (racingPage) {
        $('#racingupdatesnew').ready(addPlaybackButton);
    }
    try {
        parseRacingData(JSON.parse(xhr.responseText));
    } catch (e) {
        console.error('failed to parse racing data', xhr.responseText);
    }
    const JltColor = '#fff200';
    if ($('#racingAdditionalContainer').size() > 0 && $('#racingAdditionalContainer').find('div.custom-events-wrap').size() > 0) {
        $('#racingAdditionalContainer').find('div.custom-events-wrap').find('ul.events-list > li').each((i, li) => {
            if ($(li).find('li.name').size() > 0 && $(li).find('li.name').text().trim().startsWith('JLT-')) {
                $(li).addClass('gold');
                $(li).css('color', JltColor).css('text-shadow', `0 0 1px ${JltColor}`);
                $(li).find('span.laps').css('color', JltColor);
            }
        });
    }
});

$("#racingupdatesnew").ready(addSettingsDiv);
$("#racingupdatesnew").ready(showSpeed);
$('#racingAdditionalContainer').ready(showPenalty);

if (href.includes('index.php')) {
    $('#mainContainer').ready(displayDailyGains);
}
if (racingPage) {
    $('#racingupdatesnew').ready(addPlaybackButton);
}
$('#racingupdatesnew').ready(function() {
    $('div.racing-main-wrap').find('ul.categories > li > a').on('click', function() {
        $('#racingupdatesnew').find('div.race-player-container').hide();
    });
});
checkPenalty();
if ((FETCH_RS || SHOW_SKINS) && $(location).attr('href').includes('sid=racing')) {
    $("#racingupdatesnew").ready(function() {
        updateDriversList();
        new MutationObserver(updateDriversList).observe(document.getElementById('racingAdditionalContainer'), {
            childList: true
        });
    });
}
