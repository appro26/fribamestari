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

// 1.5s PITKÄ PAINALLUS
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
    for(let i=1; i<=count; i++) container.innerHTML += `<div style="background:rgba(0,0,0,0.8); padding:10px; border-radius:8px;"><label style="font-size:0.8rem; color:var(--text-muted);">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:12px;"></div>`;
};

window.saveCourseSetup = function() {
    const name = document.getElementById('setupCourseName').value || "Tuntematon Rata";
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
        container.innerHTML = `<div class="card" style="text-align:center; border-color:var(--border-metal); box-shadow:none;"><h2 style="margin:0; border:none; color:var(--text-muted);">Siirry tii-paikalle</h2><p style="font-size:0.9rem; color:var(--text-muted);">Odotetaan GM:n sääntö- ja kauppa-arvontaa.</p></div>`;
        return;
    }
    let color = activeHole.rule.type === 'bounty' ? 'var(--gold)' : 'var(--accent)';
    let glow = activeHole.rule.type === 'bounty' ? 'var(--gold-glow)' : 'var(--accent-glow)';
    container.innerHTML = `<div class="card" style="border-color: ${color}; box-shadow: 0 0 40px ${glow};"><h1 style="color: ${color}; margin-bottom: 10px; text-transform:uppercase; font-size:1.8rem;">${activeHole.rule.n}</h1><p style="font-size: 1.2rem; line-height: 1.5;">${activeHole.rule.d}</p></div>`;
}

function renderPlayerHand(cards) {
    const container = document.getElementById('playerHand');
    if (cards.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; padding: 15px;">Kätesi on tyhjä.</p>'; return; }
    
    let html = '';
    cards.forEach((cId, index) => {
        const cDef = allCards.find(sc => sc.id === cId);
        if(!cDef) return;
        html += `<div class="card-in-hand"><div><h3>${cDef.n}</h3><p>${cDef.d}</p></div><button class="btn btn-danger long-press-btn" style="padding:16px; margin:0;" id="useCardBtn_${index}"><div class="long-press-fill"></div>PELAA KORTTI</button></div>`;
    });
    container.innerHTML = html;
    cards.forEach((cId, index) => {
        const btn = document.getElementById(`useCardBtn_${index}`);
        if(btn) setupLongPress(btn, () => openTargetModal(index, cId));
    });
}

function renderShop(shopArray, myPoints) {
    const container = document.getElementById('shopItems');
    if(!shopArray || shopArray.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-size:1rem;">Kauppa on tyhjä tällä väylällä.</p>'; return; }
    
    let html = '';
    shopArray.forEach(item => {
        if(!item) return;
        const canAfford = myPoints >= item.price;
        html += `
            <div class="shop-item-premium ${!canAfford ? 'disabled' : ''}">
                <span class="price-tag">${item.price} P</span>
                <h3>${item.n}</h3><p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:20px;">${item.d}</p>
                <button class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} long-press-btn" style="padding:16px; margin:0;" ${!canAfford ? 'disabled' : ''} id="buyBtn_${item.id}"><div class="long-press-fill"></div>${canAfford ? 'OSTA KORTTI' : 'EI VARAA'}</button>
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
            triggerPopup(`KORTTI OSTETTU!`, `${myName} osti kortin <b>${item.n}</b>!`, ``);
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
        list.innerHTML += `<button style="background:#000; border:2px solid var(--danger); color:#fff; width:100%; padding:18px; border-radius:12px; margin-bottom:12px; font-weight:900; font-size:1.2rem; text-transform:uppercase;" onclick="executeCardPlay('${p.name}')">${p.name}</button>`;
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
        let typeColor = card.def.type === 'buff' ? 'var(--success)' : 'var(--danger)';
        let typeTitle = card.def.type === 'buff' ? 'APUKORTTI!' : 'SABOTAASI!';
        triggerPopup(`<span style="color:${typeColor}">${typeTitle}</span>`, `<b>${myName}</b> käytti kortin <b>${card.def.n}</b> kohteena <b>${targetName}</b>!`, `<div style="color:${typeColor};">${card.def.d}</div>`);
        logEvent(`${myName} käytti kortin ${card.def.n} -> ${targetName}`);
    });
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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:rgba(0,0,0,0.6); padding:12px; border-radius:12px; border:1px solid var(--border-metal);">
                <span style="font-weight:900; font-size:1.1rem;">${p.name}</span>
                <div style="display:flex; gap:12px;">
                    <button class="btn btn-secondary" style="width:50px; height:50px; padding:0; font-size:1.5rem;" onclick="document.getElementById('score_${i}').stepDown()">-</button>
                    <input type="number" id="score_${i}" value="${par}" style="width:70px; margin:0; text-align:center; font-size:1.6rem; font-weight:900; height:50px; background:#000; border:2px solid var(--success);">
                    <button class="btn btn-secondary" style="width:50px; height:50px; padding:0; font-size:1.5rem;" onclick="document.getElementById('score_${i}').stepUp()">+</button>
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
        scores.push({ name: p.name, strokes: parseInt(document.getElementById(`score_${i}`).value) || 3 });
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
        triggerPopup(`VÄYLÄ PELATTU!`, `Resurssit jaettu. Siirrytään väylälle ${currentHoleIndex + 1}.`, `<span style="color:var(--success)">🏆 Voittajat (+5P): ${winners.join(', ')}</span><br><span style="color:var(--gold)">⭐ Tehtävä (+5P): ${taskWinner || 'Ei kukaan'}</span><br><span style="color:var(--danger)">💀 Häviäjät (+1 Kortti): ${losers.join(', ')}</span>`);
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
        list.innerHTML += `<div class="player-row ${p.name === myName ? 'me' : ''}"><div style="font-size:1.1rem;"><span style="color:var(--text-muted); font-weight:900; margin-right:12px;">${i+1}.</span>${p.name}</div><span class="price-tag" style="position:relative; top:0; right:0; box-shadow:none;">${p.score} P</span></div>`;
    });
}

window.renderAdminPlayerList = function() {
    const list = document.getElementById('adminPlayerList');
    if(!list) return; list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        if(!p) return;
        list.innerHTML += `
            <div class="player-row" style="padding:15px; flex-direction:column; align-items:flex-start; gap:10px;">
                <span style="font-size:1rem; font-weight:900; color:var(--accent);">${p.name} (${p.score} P)</span>
                <div style="display:flex; gap:8px; width:100%;">
                    <button class="btn btn-secondary" style="flex:1; padding:10px;" onclick="adjustScore(${i}, 5)">+5 P</button>
                    <button class="btn btn-secondary" style="flex:1; padding:10px;" onclick="adjustScore(${i}, -5)">-5 P</button>
                    <button class="btn btn-danger" style="flex:1; padding:10px;" onclick="removePlayer(${i})">POISTA</button>
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
    }).then(() => { input.value = ''; logEvent(`Admin lisäsi pelaajan: ${n}`); });
};

window.adjustScore = function(idx, amt) { 
    runTransaction(ref(db, `gameState/players/${idx}`), (p) => {
        if(p) { p.score = Math.max(0, (p.score || 0) + amt); }
        return p;
    }).then(() => logScoreChange("Admin", amt, "Manuaalinen muutos"));
};

window.removePlayer = function(idx) { 
    if(confirm("Poista pelaaja?")) { 
        logEvent(`Admin poisti pelaajan: ${allPlayers[idx].name}`);
        allPlayers.splice(idx, 1); 
        set(ref(db, 'gameState/players'), allPlayers); 
    } 
};

window.resetGame = function() {
    if (confirm("VAROITUS: Tämä nollaa koko frisbeepelin. Jatketaanko?")) {
        set(ref(db, 'gameState'), { players: [], eventLog: {}, scoreLog: {}, activeHole: null, currentHoleIndex: 1 })
        .then(() => { localStorage.clear(); location.reload(); });
    }
};

function renderEventLog(logData) {
    const container = document.getElementById('adminEventLog');
    if(!container) return; container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 30).forEach(l => {
        container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:var(--accent); margin-right:10px; font-weight:900;">[${l.time}]</span>${l.msg}</div>`;
    });
}

function renderScoreLog(logData) {
    const container = document.getElementById('adminScoreLog');
    if(!container) return; container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 50).forEach(l => {
        let color = l.delta >= 0 ? 'var(--success)' : 'var(--danger)';
        container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:var(--accent); margin-right:10px; font-weight:900;">[${l.time}]</span><b style="color:#fff;">${l.playerName}</b>: <span style="color:${color}; font-weight:900;">${l.delta > 0 ? '+' : ''}${l.delta} P</span> <span style="color:var(--text-muted); font-size:0.9em;">(${l.reason})</span></div>`;
    });
}
