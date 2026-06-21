import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, runTransaction, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let myName = localStorage.getItem('friba_name') || null;
let allPlayers = [];
let activeHole = null;
let currentCourse = null;
let currentHoleIndex = 1;

window.claimIdentity = async function() {
    let n = document.getElementById('playerNameInput').value.trim();
    if(!n || n.length > 15) return alert("Syötä nimi!"); 
    myName = n; localStorage.setItem('friba_name', n);
    updateIdentityUI(); 
    await runTransaction(ref(db, 'gameState/players'), (p) => {
        let arr = p ? (Array.isArray(p) ? p : Object.values(p)) : [];
        if(!arr.find(x => x && x.name === n)) { arr.push({ name: n, score: 0, cards: [], boughtThisHole: false }); }
        return arr;
    });
};

function updateIdentityUI() { document.getElementById('identityCard').style.display = myName ? 'none' : 'block'; }

window.setRole = function(r) {
    document.body.className = r + '-mode';
    document.getElementById('btnPlayer').classList.toggle('active', r === 'player');
    document.getElementById('btnGM').classList.toggle('active', r === 'gm');
};

onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    if(!data) {
        // JOS DB ON TYHJÄ (RESET), KIRJAUDUTAAN ULOS PAIKALLISESTI
        if(myName) {
            myName = null;
            localStorage.removeItem('friba_name');
            updateIdentityUI();
            document.getElementById('handModal').style.display = 'none';
            document.getElementById('shopModal').style.display = 'none';
        }
        currentCourse = null;
        renderCourseBanner();
        return;
    }

    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;

    // TURVAKORJAUS RESETILLE: Jos nimeni ei ole enää listassa, kirjaudun ulos
    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (!me) {
            myName = null;
            localStorage.removeItem('friba_name');
            document.getElementById('handModal').style.display = 'none';
            document.getElementById('shopModal').style.display = 'none';
        }
    }

    updateIdentityUI();
    
    const gameSetupArea = document.getElementById('gameSetupArea');
    const mainGameArea = document.getElementById('mainGameArea');
    
    if (gameSetupArea && mainGameArea && myName) {
        if (!currentCourse) {
            gameSetupArea.style.display = 'block';
            mainGameArea.style.display = 'none';
        } else {
            gameSetupArea.style.display = 'none';
            mainGameArea.style.display = 'block';
        }
    } else if (gameSetupArea && mainGameArea) {
        gameSetupArea.style.display = 'none';
        mainGameArea.style.display = 'none';
    }

    renderCourseBanner();
    renderLeaderboard();
    renderActiveHole();
    
    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            renderPlayerHand(me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : []);
            renderShop(activeHole ? activeHole.shop : null, me.score || 0, me.boughtThisHole);
            
            document.getElementById('myResPointsBtn').innerText = `${me.score || 0} P`;
            const cCount = me.cards ? (Array.isArray(me.cards) ? me.cards.length : Object.keys(me.cards).length) : 0;
            document.getElementById('handCountBadge').innerText = cCount;
        }
    }

    renderAdminPlayerList();
});

window.startMeilahti = function() {
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        state.course = { name: "Meilahti", pars: Array(16).fill(3) };
        state.currentHoleIndex = 1;
        
        let premiumPool = allCards.filter(c => c.tier === "premium");
        let uniqueShop = []; let used = new Set();
        for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
            if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
            if(uniqueShop.length === 5) break;
        }
        const randomRule = holeRules[Math.floor(Math.random() * holeRules.length)];
        state.activeHole = { rule: randomRule, shop: uniqueShop, playedCards: [], timestamp: Date.now() };
        
        let normalPool = allCards.filter(c => c.tier === "normal");
        if(state.players) {
            state.players = state.players.map(p => {
                if(!p) return p;
                let pCards = [
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id
                ];
                return { ...p, score: 0, cards: pCards, boughtThisHole: false };
            });
        }
        return state;
    }).then(() => {
        document.getElementById('courseModal').style.display = 'none';
        triggerPopup("Peli Aloitettu", "Kaikille jaettu 3 korttia!", "");
    });
};

window.generateParInputs = function() {
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    const container = document.getElementById('parInputsContainer');
    container.innerHTML = '';
    for(let i=1; i<=count; i++) container.innerHTML += `<div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid var(--border-light);"><label style="font-size:0.8rem; color:var(--text-muted); font-weight:bold;">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:10px; border:none; background:transparent;"></div>`;
};

window.saveCourseSetup = function() {
    const name = document.getElementById('setupCourseName').value || "Rata";
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    if(count < 1) return alert("Syötä vähintään 1 väylä!");
    let pars = [];
    for(let i=1; i<=count; i++) pars.push(parseInt(document.getElementById(`setupPar_${i}`).value) || 3);
    
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        state.course = { name: name, pars: pars };
        state.currentHoleIndex = 1;
        
        let premiumPool = allCards.filter(c => c.tier === "premium");
        let uniqueShop = []; let used = new Set();
        for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
            if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
            if(uniqueShop.length === 5) break;
        }
        const randomRule = holeRules[Math.floor(Math.random() * holeRules.length)];
        state.activeHole = { rule: randomRule, shop: uniqueShop, playedCards: [], timestamp: Date.now() };
        
        let normalPool = allCards.filter(c => c.tier === "normal");
        if(state.players) {
            state.players = state.players.map(p => {
                if(!p) return p;
                let pCards = [
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id
                ];
                return { ...p, score: 0, cards: pCards, boughtThisHole: false };
            });
        }
        return state;
    }).then(() => {
        document.getElementById('courseModal').style.display = 'none';
        triggerPopup("Peli Aloitettu", `Rata valittu. Kaikille jaettu 3 korttia!`, "");
    });
};

function renderCourseBanner() {
    const banner = document.getElementById('courseInfoBanner');
    if(!currentCourse) return;
    document.getElementById('bannerCourseName').innerText = currentCourse.name;
    document.getElementById('bannerHoleNum').innerText = currentHoleIndex;
    document.getElementById('bannerPar').innerText = currentCourse.pars[currentHoleIndex - 1] || 3;
}

window.nextHole = function() { window.openScoreModal(); };

window.rollHoleRules = function() {
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        const randomRule = holeRules[Math.floor(Math.random() * holeRules.length)];
        let premiumPool = allCards.filter(c => c.tier === "premium");
        let uniqueShop = []; let used = new Set();
        for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
            if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
            if(uniqueShop.length === 5) break;
        }
        state.activeHole = { rule: randomRule, shop: uniqueShop, playedCards: [], timestamp: Date.now() };
        return state;
    });
};

window.showCardInfo = function(name, desc, details) {
    triggerPopup(name, desc, details);
};

function renderActiveHole() {
    const container = document.getElementById('activeHoleContainer');
    const cardsArea = document.getElementById('activeCardsArea');
    const cardsContainer = document.getElementById('activeCardsContainer');
    const myRulesContainer = document.getElementById('myActiveRulesContainer');

    if (!activeHole || !activeHole.rule) {
        container.innerHTML = ``;
        cardsArea.style.display = 'none';
        myRulesContainer.style.display = 'none';
        return;
    }
    
    let icon = activeHole.rule.type === 'bounty' ? '🏆' : '🎲';
    container.innerHTML = `<div class="card hole-rule-card"><h1>${icon} ${activeHole.rule.n}</h1><p>${activeHole.rule.d}</p></div>`;
    
    if(activeHole.playedCards && activeHole.playedCards.length > 0) {
        cardsArea.style.display = 'block';
        let cardsHtml = '';
        let myRulesHtml = '';
        
        activeHole.playedCards.forEach(pc => {
            let actionText = pc.type === 'buff' ? `käytti edun` : `sabotoi kohdetta <strong>${pc.target}</strong>`;
            cardsHtml += `<div class="active-card-chip" onclick="window.showCardInfo('${pc.cardName}', '${pc.cardDesc}', 'Kohde: ${pc.target}<br>Käyttäjä: ${pc.by}')"><b>${pc.by}</b> ${actionText}: <span style="font-weight:900;">${pc.cardName}</span></div>`;
            
            if(pc.target === myName) {
                myRulesHtml += `<div class="my-rule-item"><b>${pc.cardName}:</b> ${pc.cardDesc}</div>`;
            }
        });
        
        cardsContainer.innerHTML = cardsHtml;
        
        if(myRulesHtml !== '') {
            myRulesContainer.style.display = 'block';
            myRulesContainer.innerHTML = `<div class="my-rules-box"><h3>🚨 Sinuun kohdistuvat sabotaasit:</h3>${myRulesHtml}</div>`;
        } else {
            myRulesContainer.style.display = 'none';
        }
    } else {
        cardsArea.style.display = 'none';
        myRulesContainer.style.display = 'none';
    }
}

// OMAT KORTIT MODAALIIN (Isot kortit)
function renderPlayerHand(cards) {
    const container = document.getElementById('handModalCards');
    if (cards.length === 0) { container.innerHTML = '<p style="color:#fff; font-size:1.2rem; text-align:center;">Kätesi on tyhjä.</p>'; return; }
    
    let html = '';
    cards.forEach((cId, index) => {
        const cDef = allCards.find(sc => sc.id === cId);
        if(!cDef) return;
        let typeClass = cDef.type === 'buff' ? 'buff' : 'sabotage';
        let btnColor = cDef.type === 'buff' ? 'var(--info)' : 'var(--danger)';
        html += `
            <div class="physical-card ${typeClass}">
                <div><h3>${cDef.n}</h3><p>${cDef.d}</p></div>
                <button class="btn" style="background-color:${btnColor};" onclick="window.openTargetModal(${index}, '${cId}')">PELAA KORTTI</button>
            </div>`;
    });
    container.innerHTML = html;
}

// KAUPPA MODAALIIN (Isot kortit)
function renderShop(shopArray, myPoints, boughtThisHole) {
    const container = document.getElementById('shopModalCards');
    if(!shopArray || shopArray.length === 0) { container.innerHTML = '<p style="color:#fff; font-size:1.2rem; text-align:center;">Kauppa on suljettu.</p>'; return; }
    
    let html = '';
    shopArray.forEach(item => {
        if(!item) return;
        const canAfford = myPoints >= item.price && !boughtThisHole;
        let btnText = boughtThisHole ? 'OSTIT JO KORTIN TÄLLÄ VÄYLÄLLÄ' : (canAfford ? 'OSTA (NOPEIN VIE)' : 'EI VARAA (HINTA: ' + item.price + ' P)');
        
        html += `
            <div class="physical-card premium">
                <span class="card-price-tag">${item.price} P</span>
                <div><h3 style="color: var(--warning);">${item.n}</h3><p>${item.d}</p></div>
                <button class="btn ${canAfford ? 'btn-arvo' : 'btn-secondary'}" ${!canAfford ? 'disabled' : ''} onclick="window.buyShopItem(${JSON.stringify(item).split('"').join('&quot;')})">${btnText}</button>
            </div>`;
    });
    container.innerHTML = html;
}

window.buyShopItem = function(item) {
    runTransaction(ref(db, 'gameState'), (state) => {
        if (!state || !state.activeHole || !state.activeHole.shop) return state;
        const me = state.players.find(p => p && p.name === myName);
        if (!me || me.score < item.price || me.boughtThisHole) return state;

        const shopIndex = state.activeHole.shop.findIndex(i => i && i.id === item.id);
        if (shopIndex !== -1) {
            me.score -= item.price;
            me.boughtThisHole = true;
            state.activeHole.shop.splice(shopIndex, 1);
            me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
            me.cards.push(item.id);
        }
        return state;
    }).then((res) => {
        if(res.committed) {
            document.getElementById('shopModal').style.display = 'none';
            triggerPopup(`Kortti ostettu`, `Ostit edun ${item.n}.`, ``);
        }
    });
};

let pendingCardPlay = null;
window.openTargetModal = function(cardIndex, cardId) {
    const cardDef = allCards.find(c => c.id === cardId);
    pendingCardPlay = { index: cardIndex, id: cardId, def: cardDef };
    
    if(cardDef.type === 'buff') {
        window.executeCardPlay(myName);
        return;
    }
    
    document.getElementById('targetCardName').innerText = cardDef.n;
    const list = document.getElementById('targetPlayerList');
    list.innerHTML = '';
    allPlayers.forEach(p => {
        if(!p) return;
        if(p.name !== myName) {
            list.innerHTML += `<button style="background:#fff; border:2px solid var(--border-light); color:var(--text-main); width:100%; padding:18px; border-radius:12px; margin-bottom:10px; font-weight:800; font-size:1.1rem; text-align:left;" onclick="window.executeCardPlay('${p.name}')">${p.name}</button>`;
        }
    });
    document.getElementById('targetModal').style.display = 'flex';
}

window.executeCardPlay = function(targetName) {
    if(!pendingCardPlay) return;
    const card = pendingCardPlay;
    document.getElementById('targetModal').style.display = 'none';
    document.getElementById('handModal').style.display = 'none';
    
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        let players = state.players ? (Array.isArray(state.players) ? state.players : Object.values(state.players)) : [];
        const me = players.find(p => p && p.name === myName);
        if(me && me.cards) { 
            me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards); 
            me.cards.splice(card.index, 1); 
        }
        if(state.activeHole) {
            state.activeHole.playedCards = state.activeHole.playedCards ? (Array.isArray(state.activeHole.playedCards) ? state.activeHole.playedCards : Object.values(state.activeHole.playedCards)) : [];
            state.activeHole.playedCards.push({ cardName: card.def.n, cardDesc: card.def.d, target: targetName, by: myName, type: card.def.type });
        }
        state.players = players;
        return state;
    }).then(() => {
        triggerPopup(`Kortti pelattu`, `Kohde on nyt tietoinen säännöstä.`, ``);
    });
};

window.changeScore = function(idx, par, delta) {
    let input = document.getElementById(`scoreInput_${idx}`);
    let val = parseInt(input.value) + delta;
    if(val < 1) val = 1;
    input.value = val;
    let display = document.getElementById(`scoreDisplay_${idx}`);
    display.innerText = val;
    display.className = 'score-display';
    if(val < par) display.classList.add('score-birdie');
    else if(val > par) display.classList.add('score-bogey');
    else display.classList.add('score-par');
};

window.openScoreModal = function() {
    if(allPlayers.length === 0) return alert("Ei pelaajia radalla.");
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    document.getElementById('scoreModalHoleNum').innerText = currentHoleIndex;
    
    const parElement = document.getElementById('scoreModalPar');
    if(parElement) parElement.innerText = par;
    
    const container = document.getElementById('scoreInputsContainer');
    let html = '';
    let taskCheckboxes = '';
    
    allPlayers.forEach((p, i) => {
        if(!p) return;
        taskCheckboxes += `<label class="task-checkbox-label"><input type="checkbox" class="task-checkbox" value="${p.name}" style="width:24px; height:24px; margin:0;"> ${p.name}</label>`;
        
        html += `
            <div class="score-row">
                <span class="score-name">${p.name}</span>
                <div class="score-controls">
                    <button class="btn-score-ctrl" onclick="window.changeScore(${i}, ${par}, -1)">-</button>
                    <div id="scoreDisplay_${i}" class="score-display score-par">${par}</div>
                    <button class="btn-score-ctrl" onclick="window.changeScore(${i}, ${par}, 1)">+</button>
                    <input type="hidden" id="scoreInput_${i}" value="${par}">
                </div>
            </div>`;
    });
    container.innerHTML = html;
    document.getElementById('taskWinnerContainer').innerHTML = taskCheckboxes;
    document.getElementById('scoreModal').style.display = 'flex';
};

window.submitScores = function() {
    let scores = [];
    allPlayers.forEach((p, i) => {
        if(!p) return;
        scores.push({ name: p.name, strokes: parseInt(document.getElementById(`scoreInput_${i}`).value) || 3 });
    });

    const minStrokes = Math.min(...scores.map(s => s.strokes));
    const maxStrokes = Math.max(...scores.map(s => s.strokes));
    let winners = scores.filter(s => s.strokes === minStrokes).map(s => s.name);
    let losers = scores.filter(s => s.strokes === maxStrokes).map(s => s.name);
    
    let taskWinners = Array.from(document.querySelectorAll('.task-checkbox:checked')).map(cb => cb.value);
    let normalPool = allCards.filter(c => c.tier === "normal");
    
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        let players = state.players ? (Array.isArray(state.players) ? state.players : Object.values(state.players)) : [];
        
        players.forEach(p => {
            if (!p) return;
            if (winners.includes(p.name)) p.score = (p.score || 0) + 2;
            if (taskWinners.includes(p.name)) p.score = (p.score || 0) + 5;
            
            p.boughtThisHole = false; 
            
            if (losers.includes(p.name)) {
                p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
                p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
            }
            
            p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
            p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
            p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
        });
        
        state.players = players;
        state.currentHoleIndex = (state.currentHoleIndex || 1) + 1;
        state.activeHole = null; 
        return state;
    }).then(() => {
        document.getElementById('scoreModal').style.display = 'none';
        window.rollHoleRules(); 
    });
};

function triggerPopup(title, desc, details) {
    const overlay = document.getElementById('lotteryWinner');
    if(!overlay) return;
    document.getElementById('popupTitle').innerHTML = title;
    document.getElementById('popupDesc').innerHTML = desc;
    document.getElementById('popupDetails').innerHTML = details;
    
    if(!details || details === '') document.getElementById('popupDetails').style.display = 'none';
    else document.getElementById('popupDetails').style.display = 'block';

    overlay.style.display = 'flex';
}

function renderLeaderboard() {
    const list = document.getElementById('playerList');
    if(!list) return;
    let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => b.score - a.score);
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        list.innerHTML += `<div class="player-row ${p.name === myName ? 'me' : ''}"><div style="font-weight:800; font-size:1.1rem;"><span style="color:var(--text-muted); margin-right:15px;">${i+1}.</span>${p.name}</div><span style="font-weight:900; font-size:1.2rem; color:var(--primary);">${p.score} P</span></div>`;
    });
}

window.renderAdminPlayerList = function() {
    const list = document.getElementById('adminPlayerList');
    if(!list) return; list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        if(!p) return;
        list.innerHTML += `
            <div class="player-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <span style="font-weight:800;">${p.name} (${p.score} P)</span>
                    <button class="btn btn-danger" style="width:auto; padding:8px 16px; font-size:0.8rem;" onclick="window.removePlayer(${i})">POISTA</button>
                </div>
                <div class="gm-score-adjust">
                    <input type="number" id="gmScoreAdjust_${i}" value="1">
                    <button class="btn btn-primary" onclick="window.adjustScore(${i}, parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0)">Lisää</button>
                    <button class="btn btn-danger" onclick="window.adjustScore(${i}, -(parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0))">Vähennä</button>
                </div>
            </div>`;
    });
}

window.adminAddPlayer = function() {
    const input = document.getElementById('adminNewPlayerName');
    let n = input.value.trim();
    if(!n) return;
    runTransaction(ref(db, 'gameState/players'), (pData) => {
        let players = pData ? (Array.isArray(pData) ? pData : Object.values(pData)) : [];
        if(!players.find(x => x && x.name === n)) { players.push({ name: n, score: 0, cards: [], boughtThisHole: false }); }
        return players;
    }).then(() => { input.value = ''; });
};

window.adjustScore = function(idx, amt) { 
    if(amt === 0) return;
    runTransaction(ref(db, `gameState/players/${idx}`), (p) => {
        if(p) { p.score = Math.max(0, (p.score || 0) + amt); }
        return p;
    });
};

window.removePlayer = function(idx) { 
    if(confirm("Poistetaanko pelaaja pelistä?")) { 
        allPlayers.splice(idx, 1); 
        set(ref(db, 'gameState/players'), allPlayers); 
    } 
};

window.resetGame = function() {
    if (confirm("Haluatko varmasti nollata koko kierroksen tiedot? Peli palaa aloitusnäyttöön.")) {
        set(ref(db, 'gameState'), { players: [], activeHole: null, currentHoleIndex: 1, course: null })
        .then(() => { localStorage.clear(); location.reload(); });
    }
};
