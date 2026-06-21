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

// MÄÄRÄYS: Pitkä painallus kestää tasan 1.5 sekuntia
function setupLongPress(btnEl, onComplete) {
    let pressTimer;
    let isPressing = false;
    const duration = 1500; 

    const start = (e) => {
        isPressing = true; btnEl.classList.add('is-pressing');
        pressTimer = setTimeout(() => {
            isPressing = false; btnEl.classList.remove('is-pressing');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            onComplete();
        }, duration);
    };

    const end = () => {
        if (isPressing) { clearTimeout(pressTimer); isPressing = false; btnEl.classList.remove('is-pressing'); }
    };

    btnEl.addEventListener('mousedown', start);
    btnEl.addEventListener('touchstart', start, { passive: true });
    btnEl.addEventListener('mouseup', end);
    btnEl.addEventListener('mouseleave', end);
    btnEl.addEventListener('touchend', end);
    btnEl.addEventListener('touchcancel', end);
}

window.claimIdentity = async function() {
    let n = document.getElementById('playerNameInput').value.trim();
    if(!n || n.length > 15) return alert("Syötä nimi!"); 
    myName = n; localStorage.setItem('friba_name', n);
    updateIdentityUI(); 
    await runTransaction(ref(db, 'gameState/players'), (p) => {
        let arr = p ? (Array.isArray(p) ? p : Object.values(p)) : [];
        if(!arr.find(x => x && x.name === n)) { arr.push({ name: n, score: 0, cards: [] }); }
        return arr;
    });
};

function updateIdentityUI() { document.getElementById('identityCard').style.display = myName ? 'none' : 'block'; }

window.setRole = function(r) {
    document.body.className = r + '-mode';
    document.getElementById('btnPlayer').classList.toggle('active', r === 'player');
    document.getElementById('btnGM').classList.toggle('active', r === 'gm');
};

const gmBtn = document.getElementById('btnGM');
if(gmBtn) gmBtn.addEventListener('click', () => { if(confirm("Siirrytäänkö GM-tilaan? (Vain pelinjohtajalle)")) window.setRole('gm'); });

function logEvent(msg) { push(ref(db, 'gameState/eventLog'), { time: new Date().toLocaleTimeString('fi-FI'), msg }); }
function logScoreChange(playerName, delta, reason) { push(ref(db, 'gameState/scoreLog'), { time: new Date().toLocaleTimeString('fi-FI'), playerName, delta, reason }); }

onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    if(!data) return;

    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;

    updateIdentityUI();
    renderCourseBanner();
    renderLeaderboard();
    renderActiveHole();
    
    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            renderPlayerHand(me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : []);
            renderShop(activeHole ? activeHole.shop : null, me.score || 0);
            document.getElementById('myResPoints').innerText = `${me.score || 0} P`;
        }
    }

    renderAdminPlayerList();
    renderEventLog(data.eventLog);
    renderScoreLog(data.scoreLog);
});

window.generateParInputs = function() {
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    const container = document.getElementById('parInputsContainer');
    container.innerHTML = '';
    for(let i=1; i<=count; i++) container.innerHTML += `<div style="background:var(--bg-dark); padding:12px; border-radius:8px;"><label style="font-size:0.8rem; color:var(--text-muted);">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:10px;"></div>`;
};

window.saveCourseSetup = function() {
    const name = document.getElementById('setupCourseName').value || "Rata";
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    let pars = [];
    for(let i=1; i<=count; i++) pars.push(parseInt(document.getElementById(`setupPar_${i}`).value) || 3);
    set(ref(db, 'gameState/course'), { name, pars });
    set(ref(db, 'gameState/currentHoleIndex'), 1);
    document.getElementById('courseModal').style.display = 'none';
};

function renderCourseBanner() {
    const banner = document.getElementById('courseInfoBanner');
    if(!currentCourse) { banner.style.display = 'none'; return; }
    banner.style.display = 'block';
    document.getElementById('bannerCourseName').innerText = currentCourse.name;
    document.getElementById('bannerHoleNum').innerText = currentHoleIndex;
    document.getElementById('bannerPar').innerText = currentCourse.pars[currentHoleIndex - 1] || 3;
}

window.nextHole = function() {
    if(confirm("Siirrytäänkö seuraavalle väylälle? (Poistaa kaupan ja säännön)")) {
        runTransaction(ref(db, 'gameState'), (state) => {
            if(!state) return state;
            state.currentHoleIndex = (state.currentHoleIndex || 1) + 1;
            state.activeHole = null;
            return state;
        });
    }
};

window.rollHoleRules = function() {
    const randomRule = holeRules[Math.floor(Math.random() * holeRules.length)];
    let shuffledShop = [...allCards].sort(() => 0.5 - Math.random());
    set(ref(db, 'gameState/activeHole'), { rule: randomRule, shop: shuffledShop.slice(0, 3), timestamp: Date.now() });
    logEvent(`Väyläruletti: ${randomRule.n}`);
};

function renderActiveHole() {
    const container = document.getElementById('activeHoleContainer');
    document.getElementById('gmGlobalControls').style.display = 'block';

    if (!activeHole || !activeHole.rule) {
        container.innerHTML = `<div class="card" style="text-align:center;"><h2 style="margin:0; color:var(--text-muted);">Sääntöä ei arvottu</h2><p style="font-size:0.9rem; color:var(--text-muted); margin-top:10px;">GM arpoo säännön ja kaupan.</p></div>`;
        return;
    }
    container.innerHTML = `<div class="card" style="border-left: 4px solid var(--info);"><h1 style="color: var(--info); font-size:1.4rem; margin-bottom: 10px;">${activeHole.rule.n}</h1><p style="font-size: 1.05rem; line-height: 1.5; color:var(--text-main);">${activeHole.rule.d}</p></div>`;
}

function renderPlayerHand(cards) {
    const container = document.getElementById('playerHand');
    if (cards.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Kätesi on tyhjä.</p>'; return; }
    
    let html = '';
    cards.forEach((cId, index) => {
        const cDef = allCards.find(sc => sc.id === cId);
        if(!cDef) return;
        html += `<div class="card-in-hand"><div><h3>${cDef.n}</h3><p>${cDef.d}</p></div><button class="btn btn-secondary long-press-btn" style="padding:12px; margin:0;" id="useCardBtn_${index}"><div class="long-press-fill"></div>PELAA</button></div>`;
    });
    container.innerHTML = html;
    cards.forEach((cId, index) => {
        const btn = document.getElementById(`useCardBtn_${index}`);
        if(btn) setupLongPress(btn, () => openTargetModal(index, cId));
    });
}

function renderShop(shopArray, myPoints) {
    const container = document.getElementById('shopItems');
    if(!shopArray || shopArray.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Kauppa on tyhjä.</p>'; return; }
    
    let html = '';
    shopArray.forEach(item => {
        if(!item) return;
        const canAfford = myPoints >= item.price;
        html += `
            <div class="shop-item-premium ${!canAfford ? 'disabled' : ''}">
                <span class="price-tag">${item.price} P</span>
                <h3>${item.n}</h3><p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:16px;">${item.d}</p>
                <button class="btn ${canAfford ? 'btn-secondary' : 'btn-secondary'} long-press-btn" style="padding:12px; margin:0; border: 1px solid var(--border-metal);" ${!canAfford ? 'disabled' : ''} id="buyBtn_${item.id}"><div class="long-press-fill"></div>${canAfford ? 'OSTA' : 'EI VARAA'}</button>
            </div>`;
    });
    container.innerHTML = html;
    shopArray.forEach(item => {
        if(!item) return;
        const btn = document.getElementById(`buyBtn_${item.id}`);
        if(btn && !btn.disabled) setupLongPress(btn, () => buyShopItem(item));
    });
}

window.buyShopItem = function(item) {
    runTransaction(ref(db, 'gameState'), (state) => {
        if (!state || !state.activeHole || !state.activeHole.shop) return state;
        const me = state.players.find(p => p && p.name === myName);
        if (!me || me.score < item.price) return state;

        const shopIndex = state.activeHole.shop.findIndex(i => i && i.id === item.id);
        if (shopIndex !== -1) {
            me.score -= item.price;
            state.activeHole.shop.splice(shopIndex, 1);
            me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
            me.cards.push(item.id);
        }
        return state;
    }).then((res) => {
        if(res.committed) {
            triggerPopup(`Kortti ostettu`, `Ostit kortin ${item.n}.`, ``);
            logEvent(`${myName} osti: ${item.n}`);
            logScoreChange(myName, -item.price, `Osto: ${item.n}`);
        }
    });
};

let pendingCardPlay = null;
window.openTargetModal = function(cardIndex, cardId) {
    const cardDef = allCards.find(c => c.id === cardId);
    pendingCardPlay = { index: cardIndex, id: cardId, def: cardDef };
    document.getElementById('targetCardName').innerText = cardDef.n;
    const list = document.getElementById('targetPlayerList');
    list.innerHTML = '';
    allPlayers.forEach(p => {
        if(!p) return;
        list.innerHTML += `<button style="background:var(--surface-light); border:1px solid var(--border-metal); color:var(--text-main); width:100%; padding:16px; border-radius:8px; margin-bottom:10px; font-weight:600; font-size:1.1rem; text-align:left;" onclick="executeCardPlay('${p.name}')">${p.name}</button>`;
    });
    document.getElementById('targetModal').style.display = 'flex';
}

window.executeCardPlay = function(targetName) {
    if(!pendingCardPlay) return;
    const card = pendingCardPlay;
    document.getElementById('targetModal').style.display = 'none';
    
    runTransaction(ref(db, 'gameState/players'), (pData) => {
        let players = pData ? (Array.isArray(pData) ? pData : Object.values(pData)) : [];
        const me = players.find(p => p && p.name === myName);
        if(me && me.cards) { me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards); me.cards.splice(card.index, 1); }
        return players;
    }).then(() => {
        triggerPopup(`Kortti pelattu`, `<b>${myName}</b> käytti kortin <b>${card.def.n}</b> pelaajalle ${targetName}!`, `<div style="color:var(--info); margin-top:10px;">${card.def.d}</div>`);
        logEvent(`${myName} käytti kortin ${card.def.n} -> ${targetName}`);
    });
};

// --- TULOSTEN SYÖTTÖ JA VÄRILOGIIKKA ---
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
    if(allPlayers.length === 0) return alert("Ei pelaajia.");
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    document.getElementById('scoreModalHoleNum').innerText = currentHoleIndex;
    document.getElementById('scoreModalPar').innerText = par;
    
    const container = document.getElementById('scoreInputsContainer');
    let html = '';
    let taskSelect = `<option value="">Ei kukaan</option>`;
    
    allPlayers.forEach((p, i) => {
        if(!p) return;
        taskSelect += `<option value="${p.name}">${p.name}</option>`;
        html += `
            <div class="score-row">
                <span class="score-name">${p.name}</span>
                <div class="score-controls">
                    <button class="btn-score-ctrl" onclick="changeScore(${i}, ${par}, -1)">-</button>
                    <div id="scoreDisplay_${i}" class="score-display score-par">${par}</div>
                    <button class="btn-score-ctrl" onclick="changeScore(${i}, ${par}, 1)">+</button>
                    <!-- Piilotettu input arvon säilytykseen -->
                    <input type="hidden" id="scoreInput_${i}" value="${par}">
                </div>
            </div>`;
    });
    container.innerHTML = html;
    document.getElementById('taskWinnerSelect').innerHTML = taskSelect;
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
    let taskWinner = document.getElementById('taskWinnerSelect').value;
    
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        let players = state.players ? (Array.isArray(state.players) ? state.players : Object.values(state.players)) : [];
        players.forEach(p => {
            if (!p) return;
            if (winners.includes(p.name)) p.score = (p.score || 0) + 5;
            if (taskWinner === p.name) p.score = (p.score || 0) + 5;
            if (losers.includes(p.name)) {
                p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
                const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
                p.cards.push(randomCard.id);
            }
        });
        state.players = players;
        state.currentHoleIndex = (state.currentHoleIndex || 1) + 1;
        state.activeHole = null; 
        return state;
    }).then(() => {
        triggerPopup(`Väylä ${currentHoleIndex - 1} pelattu`, `Pisteet jaettu.`, `<span style="color:var(--info)">Voittajat: ${winners.join(', ')}</span><br><span style="color:var(--warning)">Tehtävä: ${taskWinner || '-'}</span><br><span style="color:var(--danger)">Kortti: ${losers.join(', ')}</span>`);
        document.getElementById('scoreModal').style.display = 'none';
    });
};

function triggerPopup(title, desc, details) {
    const overlay = document.getElementById('lotteryWinner');
    if(!overlay) return;
    document.getElementById('popupTitle').innerHTML = title;
    document.getElementById('popupDesc').innerHTML = desc;
    document.getElementById('popupDetails').innerHTML = details;
    overlay.style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
    setTimeout(() => { overlay.style.display = 'none'; }, 4500); 
}

function renderLeaderboard() {
    const list = document.getElementById('playerList');
    if(!list) return;
    let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => b.score - a.score);
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        list.innerHTML += `<div class="player-row ${p.name === myName ? 'me' : ''}"><div style="font-size:1.05rem; font-weight:600;"><span style="color:var(--text-muted); margin-right:12px;">${i+1}.</span>${p.name}</div><span style="font-weight:800; color:var(--primary);">${p.score} P</span></div>`;
    });
}

window.renderAdminPlayerList = function() {
    const list = document.getElementById('adminPlayerList');
    if(!list) return; list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        if(!p) return;
        list.innerHTML += `
            <div class="player-row" style="flex-direction:column; align-items:flex-start; gap:10px;">
                <span style="font-size:1rem; font-weight:800;">${p.name} (${p.score} P)</span>
                <div style="display:flex; gap:8px; width:100%;">
                    <button class="btn btn-secondary" style="flex:1; padding:10px;" onclick="adjustScore(${i}, 5)">+5 P</button>
                    <button class="btn btn-secondary" style="flex:1; padding:10px;" onclick="adjustScore(${i}, -5)">-5 P</button>
                    <button class="btn btn-danger" style="flex:1; padding:10px;" onclick="removePlayer(${i})">Poista</button>
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
        if(!players.find(x => x && x.name === n)) { players.push({ name: n, score: 0, cards: [] }); }
        return players;
    }).then(() => { input.value = ''; logEvent(`Lisäsi pelaajan: ${n}`); });
};

window.adjustScore = function(idx, amt) { 
    runTransaction(ref(db, `gameState/players/${idx}`), (p) => {
        if(p) { p.score = Math.max(0, (p.score || 0) + amt); }
        return p;
    }).then(() => logScoreChange("Admin", amt, "Manuaalinen muutos"));
};

window.removePlayer = function(idx) { 
    if(confirm("Poista pelaaja?")) { 
        logEvent(`Poisti pelaajan: ${allPlayers[idx].name}`);
        allPlayers.splice(idx, 1); 
        set(ref(db, 'gameState/players'), allPlayers); 
    } 
};

window.resetGame = function() {
    if (confirm("Nollataanko tietokanta?")) {
        set(ref(db, 'gameState'), { players: [], eventLog: {}, scoreLog: {}, activeHole: null, currentHoleIndex: 1 })
        .then(() => { localStorage.clear(); location.reload(); });
    }
};

function renderEventLog(logData) {
    const container = document.getElementById('adminEventLog');
    if(!container) return; container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 30).forEach(l => {
        container.innerHTML += `<div style="padding:4px 0;"><span style="color:var(--text-muted); margin-right:8px;">[${l.time}]</span>${l.msg}</div>`;
    });
}

function renderScoreLog(logData) {
    const container = document.getElementById('adminScoreLog');
    if(!container) return; container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 50).forEach(l => {
        let color = l.delta >= 0 ? 'var(--info)' : 'var(--danger)';
        container.innerHTML += `<div style="padding:4px 0;"><span style="color:var(--text-muted); margin-right:8px;">[${l.time}]</span><b style="color:#fff;">${l.playerName}</b>: <span style="color:${color};">${l.delta > 0 ? '+' : ''}${l.delta} P</span></div>`;
    });
}
