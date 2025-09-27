// ==UserScript==
// @name         Torn: Racing enhancements Custom Skin
// @namespace    lugburz.racing_enhancements
// @version      0.5.38
// @description  Show car's current speed, precise skill, official race penalty, racing skill of others and race car skins (with custom overrides).
// @author       Lugburz & K1rbs
// @match        https://www.torn.com/page.php?sid=racing*
// @match        https://www.torn.com/loader.php?sid=racing*
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
// --- NEW SETTING ---
const APPLY_RANDOM_SKINS = GM_getValue('showRandomSkinsChk', 1) != 0; // Default to ON

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

// --- START: Random Skin Pool Configuration ---
const RANDOM_SKIN_POOL = {
    '78':['e9c95171-a85f-4874-8a49-25ddf536d2aa','6d736e53-95fe-493e-8e11-8649865f4a59','2ad80d5d-3b06-47da-9cf8-274a20814a8e','e787b7f6-7bae-43eb-ae7a-5da9f8f17d8b','4be186df-898d-45f0-abe5-319192e83ab3','313e33ed-70e4-4b1a-8b72-95b6357cd662','5fcd00ff-002a-4a91-b10c-52cbfc931169','6a88e7d7-8fe8-42b9-9ba6-c6de282907e0','7525290f-c093-45d5-9415-c61a67dd8ee1','fa87e13e-b297-4c20-b8a0-c17d96c97924','2c701bdb-a9af-4f23-b3c7-91887afee448','13d721e0-8de2-417f-9166-f27a924a66a4','517c0899-75e5-4bf2-9521-d57d9c53e8a5','8cb63bbf-2126-4987-9699-71e3b4f2d501','6f4f32ff-dc08-41f0-a352-3f10cef16321','ffe6dd68-7361-4c59-8fed-749ae9219438',],
    '85':['cf2e3540-87b0-49d7-9e6f-c7491ba81477','d63e4535-e581-456b-8740-f7ec070c6f7a','12d9e38a-b34b-46ce-93b4-a6c373b41e3d','5fe1005d-9778-45b6-87da-09795ab155a2','197c7525-c9b9-4bc4-bab8-a4a667b5555d','aca01078-cd01-4c41-83ad-22e11349a3b4','b2a8b231-d385-4f76-966a-307e8ad956d1','357e4bbf-90f5-44f8-9f38-189fc5abb2fa','55efcaf7-a407-417d-9e06-1dd5bf4917d9','2596e071-e933-43b6-be5b-152f1c066f33','483590cb-e5ae-46eb-92a8-181b645d89cd','ffd296c6-98cd-4b35-91dd-41b86fef9ccb',],
    '94':['582d1932-f8ea-4a00-ba8c-74a6bece78a9','2ae4c9fe-094d-4f2e-b071-38707869a65a',],
    '494':['0961458b-8cee-48bb-b09f-895dbfe9136f','1a8fe10e-95eb-42ae-a1eb-4dee8180f1d0','93b3adaf-163f-4a79-9102-4b900501c7b9','01c6a129-3004-403c-803e-f5fa63d5cad2',],
    '511':['9182c0cc-23bf-46d0-83ab-f939b2f07072','34bf1078-8f04-4047-b40e-870380f6f41a','c47c751a-14be-41a0-a836-9212223c1aa9','f0f8e29d-0014-43ab-8b13-93092faaeb2d','9e464fa6-275c-44ae-8d50-4648a13f9a46','10e108f2-1087-4de6-b2c3-20d7a979f4d5','94be2d2f-310b-4031-9bfc-b4927ef952fd','ce8334bf-dc63-4459-903d-80e14c8fa64f','6462b7d4-e6b0-493f-a15d-d5e5ca04bc93','356d22b6-2f35-4b35-8874-89d73912a0f9','729107a2-755e-43f3-85dc-e33e5e68d83d','935cc150-fda8-46f3-87b9-0c0fa03837a9','e23754c4-c4b1-4a90-9007-237bbed10759','0e1f9c11-98dc-40c9-823c-570e0f6b2a28','65cedda0-5a21-4ddf-adea-5e1f41636b06','ae2fb989-4725-4e57-943a-ba54e5fa20cb','9248d09e-f64b-410f-b62a-b5e2c7121201',],
    '517':['ac68ec57-bd26-49b2-aad2-dadc5f1cae9b','ef70622d-b569-4a51-a99a-9ef29eda0ddd','e5fe72b1-e477-4a7a-b387-ddcf83cbc795','924b59b0-99a3-47d3-b1c0-645b089e10e5','edd08993-929a-4530-94a5-0a2b22d2aa20','586ea3f5-1f67-4161-a705-9b9f3247de60','094b898e-a197-4fdd-a6ff-d2ab88e00a4e','9bbf8881-dad9-4c3a-a012-033fcceac288','ed256792-caa6-4a9a-a6ed-0beeccdac699','69c4f6ef-2bdd-48cf-8385-0a2cc4bda15a','1becc487-3590-4340-9d01-a084922182e2','39ae6daa-1c62-4b90-9747-ca35dd29b044','2d6eae50-37c6-4358-b56a-6164c4a9e650',],
    '518':['ac1eadcd-65dd-4e11-a850-794385f0f7fc','15ef0a58-3582-487c-ba3f-c5736e72a3a0','8ac463aa-9981-46e5-b1d0-cf063b22905e','78c3e4e5-881c-4946-a4d3-15c3bfca2f69','098ebbc5-690e-4420-944f-447fa2d18aa8','59d3b4a5-e074-49e4-82f4-93e85bd1ac0d','210edd4d-99d8-4687-a20a-2bfb2489dc9f','f93b57cf-8c6a-4b30-a06c-d261387e8885','e7228c67-f8e3-44da-96b8-50cc9699b66e','d685083a-86ab-4980-a6cf-2e3b79083c91','dc5ed805-eff9-45b0-b24c-0dfffc7cf9f3','8092df84-6616-4a3c-84db-236a0a03b9ce','5f5d1f89-5522-46d4-aa1c-a0b6c4fede02','e94d38ad-8231-43ac-a7e8-85270605ce44','41704e59-5aea-4e20-bb8f-fd1e21e9d8c3','fc130f42-6fe1-4bdf-98e1-f1207ed04153','6bd5ec69-b33a-4b2c-aaff-543e0d8bdb54',],
    '519':['c8c3e7f4-b7f5-4d71-abb2-9641a7c1b97f','a8950213-5642-4c56-97ca-948d11ed9e89','b3de65d5-a000-4c5b-a44c-1c726c3dc6d7','e56c9806-dac9-47eb-9ad9-ed9a8131f12d','f74b255f-03a5-4182-8fdd-91a5a7195dfa','03f86a55-68a9-40d9-bb4e-f1231215bc3e','bbe754bd-b3c5-4052-ba0b-83feac4a41bc','54990683-8ba6-4aa8-900f-68f9fbe01efe','381ad65e-9b53-4d66-b05d-e6724af8a86d','3b11f8ea-59f1-436f-866e-b46c174eb47c','8be0d251-9acd-4a20-ac39-82ad148d9dc0','9b94ff4f-d2a8-4c5c-9e8d-c99c7264040a',],
    '520':['bb4fd6d4-0914-4a1d-bce0-198d88120c05','6c202d23-4c45-4a9a-8b05-465cafd1e163','ad6ec240-28b4-4e8f-8ab6-089c386f4c39','d012826a-9620-4ae0-89ab-808d365375e4','d0c19c7b-286a-43d5-a97c-7820574c7538','fa0098cb-6188-4a0a-9324-9263554cafe3','a191aca4-5fa7-4dd9-879d-1d580996e305','c424dcb8-58b8-4922-a647-c517d29d9f73','64cca8c3-ece1-451a-bb64-6cd71cd978d0','56fecf88-07b3-40ab-85be-bcbbb268ab4d','32d6205d-9180-4300-9b1e-d5c2c03d2e4b','2ec315b7-218b-4fdf-96dd-0b51b8b5649e','7004b0bc-5750-45e4-be3a-496afb9370b2','d9e8329a-d74b-4778-a82f-a737f238097b','80069b12-32d7-4c16-a0a9-86022b1f64b9',],
    '521':['e2bdc3c5-bcc2-496b-aff2-e6e78d52efc8','4196627f-9cf6-49b4-af0d-71ae4099589c','6d533149-3ac5-4209-b7dc-1337987104d4','fe59b80d-2a29-44f8-977b-739e7d747a72','1acd4ebf-e268-491e-a31e-943aa96a96da','5a3c4f96-1729-4217-b3ad-29685a038f08','d12a38fa-35de-4e67-aa14-02ed23cc1671','66bafbe7-2488-46fc-943f-d385a7382145','1aa81c08-32ee-4ec6-8aa0-6243d8ad5aae','1ddb031d-93db-40eb-96ec-a1ad62df35e2','d4a0204a-d32e-4aac-85d3-8b6dd011a4cb','f52792b6-74f6-45c7-9c63-fb415160a0e6','818d5b29-c078-45b2-ba00-17ff43ffb7f3','9eabebd2-1d5b-4144-bff3-7c6906c35ff5','52095f12-b634-4b03-bd92-c8595e437774',],
    '522':['1d3f30a6-af4d-4549-ab20-52c8bbb09afc','cb761b2a-9b1a-4b58-a3ad-0250857b9c1e','a814ed60-2e04-43ca-9631-f0e96652b7e9','679101df-c21c-4781-bd9c-8b6ba78ef06c','7e221801-7804-4399-b678-915e777e84fb','0661b541-eca4-4c75-9914-35daa85c9651','2ab6b330-80e4-4d58-9a5b-2c581539ebb3','a8ae03d9-21bb-4c71-a078-4f6652bb21df','8b24ba9e-6d21-4694-a06f-5d7cb5eb2cbe','aea1c273-06c2-4f4e-97e3-88d447f1f5d2','5bc96008-3a1a-4161-b7e8-438787f6bae8','345c9236-4d15-4c3a-b465-b4c95c3bdbb4','3830c3e5-0033-4795-8751-46b5a5bf8608','d7fa9c91-275f-43b9-9e5c-6bbc27d32f4a','f5686b4d-3c29-4d64-a9c1-fa1a9f858ff8','5c9bc336-7cfe-43b8-a0e6-7715867f0896','15c1df4c-92e2-465e-ab73-a9e4147a622f',],
    '523':['08ab3186-556d-4c6a-9b06-f88a6305ec7a','ddc24665-e41a-44c0-9f3a-3eacb3308f13','cfc741be-832c-4241-9780-81ab516657f7','e7e7208e-0aa2-4d2d-8632-fbd019de5b4a','39d81d7f-5d61-4c78-b7fa-3abae0e6d3e0','e6fff80e-0381-4c3f-ae75-5fdbbf152e7a','37f094c4-4292-4021-b364-5bdd4d0a7f93','45c84a0e-7fa6-4005-9feb-32b05ccfa0a7','38585a97-c00f-408c-9f57-0166563664b8','66683fd8-5d77-49ee-a078-1916fa604c51','3130df02-e0bb-42a3-b0fd-27bd0dac8756','46a91466-b33a-4fbb-bf58-ac5e1dfc777a','8806734e-2a76-4fb3-a3b4-9edd76134c5a',],
    '524':['9c8bcfc3-3222-4048-b62b-76733bb24172','ba42867d-69c5-4921-88c7-73e9c752af46','3b642eb4-e774-4c50-a3eb-1beabcf65392','6cfaa57b-cc03-42f9-802d-045aeceb30c1','e7685014-199a-4a29-ad6e-ecb8e29ed2db','eed9e7b7-68fb-438c-b469-23197a511c1f','a369abf7-7c55-4c0b-a68c-cc696cffad31','93939b43-15d7-4695-8ef0-fc237f124a80','c110e28a-bdd5-4c7e-a165-3be9f061ffee','aabceb04-3b9e-4d7d-a9e7-2421896a7b76','aca59f86-79a0-42fd-b548-b8011735b220','23c61be7-33c7-489f-8c96-44496e4c71e2','88299689-c48a-4cda-b0d3-b0aee7a670db','5c05dd42-51d8-4806-a975-1470f0911621','d2d876b5-93de-4e70-8b4a-64ea57d5a104','ed89de12-e3ea-4b3c-adfb-228256dea494','cd790a59-6e50-49fc-8a14-269203fb8ccd',],
};
// --- END: Random Skin Pool Configuration ---

const userID = getUserIdFromCookie();
var RACE_ID = '*';
var period = 1000;
var last_compl = -1.0;
var x = 0;
var penaltyNotif = 0;

function maybeClear() {
    if (x != 0) { clearInterval(x); last_compl = -1.0; x = 0; }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const racingSkillCacheByDriverId = new Map();
let updating = false;

async function updateDriversList() {
    const driversList = document.getElementById('leaderBoard');
    if (updating || driversList === null) return;
    FETCH_RS = !!(GM_getValue('apiKey') && GM_getValue('apiKey').length > 0);
    watchForDriversListContentChanges(driversList);
    const driverIds = getDriverIds(driversList);
    if (!driverIds || !driverIds.length) return;
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
            if (!!rsSpan) rsSpan.remove();
        }
        // Skin Logic
        if (SHOW_SKINS) {
            const carImg = driver.querySelector('.car')?.querySelector('img');
            if (!carImg) continue;
            const carId = carImg.getAttribute('src').replace(/[^0-9]*/g, '');
            const userHasOfficialSkin = !!racingSkins[driverId] && !!racingSkins[driverId][carId];

            // Priority 1: Custom skin for designated users
            if (CUSTOM_SKIN_CONFIG.userIds.includes(driverId)) {
                const customSkinForThisCar = CUSTOM_SKIN_CONFIG.skinsByCarId[carId];
                if (customSkinForThisCar) {
                    const customSkinUrl = customSkinForThisCar.startsWith('http') ? customSkinForThisCar : SKIN_IMAGE(customSkinForThisCar);
                    if (carImg.getAttribute('src') !== customSkinUrl) carImg.setAttribute('src', customSkinUrl);
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
                    if (driverId === userID) skinCarSidebar(customSkinForThisCar);
                }
            // Priority 2: Official skin from server
            } else if (userHasOfficialSkin) {
                if (!carImg.dataset.skinWatcher) {
                    carImg.setAttribute('src', SKIN_IMAGE(racingSkins[driverId][carId]));
                    if (driverId == userID) skinCarSidebar(racingSkins[driverId][carId]);
                }
            // --- MODIFIED: Priority 3: Random skin fallback (if enabled) ---
            } else if (APPLY_RANDOM_SKINS) {
                const skinPool = RANDOM_SKIN_POOL[carId];
                if (skinPool && skinPool.length > 0) {
                    const randomSkinId = skinPool[driverId % skinPool.length];
                    carImg.setAttribute('src', SKIN_IMAGE(randomSkinId));
                }
            }
        }
    }
    updating = false;
    $('#updating').size() > 0 && $('#updating').remove();
}

function watchForDriversListContentChanges(driversList) {
    if (driversList.dataset.hasWatcher !== undefined) return;
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
        if (!!skill) resultHash[driverId] = skill;
    }
    return resultHash;
}

let _skinOwnerCache = null;
async function getRacingSkinOwners(driverIds) {
    function filterSkins(skins) {
        let result = {};
        for (const driverId of driverIds) {
            if (skins?.['*']?.[driverId]) result[driverId] = skins['*'][driverId];
            if (skins?.[RACE_ID]?.[driverId]) result[driverId] = skins[RACE_ID][driverId];
        }
        return result;
    }
    return new Promise(resolve => {
        if (!!_skinOwnerCache) return resolve(_skinOwnerCache);
        GM_xmlhttpRequest({
            method: 'GET', url: SKIN_AWARDS, headers: { 'Content-Type': 'application/json' },
            onload: ({ responseText }) => { _skinOwnerCache = JSON.parse(responseText); resolve(_skinOwnerCache); },
            onerror: (err) => { console.error(err); resolve({}); },
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
    } catch (err) { console.error(err); }
}

function getUserIdFromCookie() {
    const userIdString = document.cookie.split(';').map(e => e.trim()).find(e => e.indexOf('uid=') === 0).replace('uid=', '');
    return parseInt(userIdString, 10);
}

function fetchRacingSkillForDrivers(driverIds) {
    const apiKey = GM_getValue('apiKey');
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'POST', url: `https://api.torn.com/user/${driverIds}?selections=personalstats&comment=RacingUiUx&key=${apiKey}`,
            headers: { 'Content-Type': 'application/json' },
            onload: (response) => { try { resolve(JSON.parse(response.responseText)); } catch (err) { reject(err); } },
            onerror: (err) => reject(err)
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
        if ($('#racingupdatesnew').find('div.track-info').size() < 1) { maybeClear(); return; }
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
    const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;
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
            onerror: (err) => { console.error("Failed to fetch car skin page:", err); resolve(cached ? cached.data : []); }
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
        uniqueKeys.forEach(key => { filterDropdown.append(`<option value="${key}">Car ID: ${key}</option>`); });
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
                    <li><input type="checkbox" style="margin: 5px;" id="showPositionIconChk"><label for="showPositionIconChk">Show position icons</label></li>
                    <hr style="margin: 10px 0; border-color: #444;">
                    <li style="font-weight: bold;">Skin Settings</li>
                    <li><input type="checkbox" style="margin: 5px;" id="showSkinsChk"><label for="showSkinsChk">Show racing skins</label></li>
                    <li><input type="checkbox" style="margin: 5px;" id="showRandomSkinsChk"><label for="showRandomSkinsChk">Apply random skins to other drivers</label></li>
                    <hr style="margin: 10px 0; border-color: #444;">
                    <li style="font-weight: bold;">Advanced Settings</li>
                    <li><label>API Key (<a href="https://www.torn.com/preferences.php#tab=api" target="_blank" rel="noopener noreferrer">find here</a>)</label>
                        <span class="input-wrap" style="margin: 0 5px 5px;"><input type="text" autocomplete="off" id="apiKey"></span>
                        <a href="#" id="saveApiKey" class="link btn-action-tab tt-modified"><i style="display: inline-block; background: url(/images/v2/racing/car_enlist.png) 0 0 no-repeat; vertical-align: middle; height: 15px; width: 15px;"></i>Save</a>
                    </li>
                    <hr style="margin: 10px 0; border-color: #444;">
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
        $('#racingEnhSettingsContainer input[type=checkbox]').each(function() {
            const key = $(this).attr('id');
            const defaultValue = key === 'showRandomSkinsChk' ? 1 : 0; // Default random skins to ON
            $(this).prop('checked', GM_getValue(key, defaultValue) != 0);
        });
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
