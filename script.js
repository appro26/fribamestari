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

// MÄÄRÄYS: Pitkä painallus tasan 1.5 sekuntia
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

// KIRJAUTUMINEN
window.claimIdentity = async function() {
    let n = document.getElementById('playerNameInput').value.trim();
    if(!n || n.length > 15) return alert("Syötä korkeintaan 15 merkkiä pitkä nimi."); 
    myName = n; localStorage.setItem('friba_name', n);
    updateIdentityUI(); 
    await runTransaction(ref(db, 'gameState/players'), (p) => {
        let arr = p ? (Array.isArray(p) ? p : Object.values(p)) : [];
        if(!arr.find(x => x && x.name === n)) { arr.push({ name: n, score: 0, cards: [] }); }
        return arr;
    });
};

function updateIdentityUI() { 
    document.getElementById('identityCard').style.display = myName ? 'none' : 'block'; 
}

window.setRole = function(r) {
    document.body.className = r + '-mode';
    document.getElementById('btnPlayer').classList.toggle('active', r === 'player');
    document.getElementById('btnGM').classList.toggle('active', r === 'gm');
};

const gmBtn = document.getElementById('btnGM');
if(gmBtn) {
    gmBtn.addEventListener('click', () => {
        if(confirm("Siirrytäänkö Game Master -tilaan?")) window.setRole('gm');
    });
}

// DATAN KUUNTELU
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
});

// RADAN LUONTI JA HALLINTA
window.generateParInputs = function() {
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    const container = document.getElementById('parInputsContainer');
    container.innerHTML = '';
    for(let i=1; i<=count; i++) {
        container.innerHTML += `<div style="background:#111; padding:5px; border-radius:4px;"><label style="font-size:0.7rem; color:var(--text-muted);">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:8px;"></div>`;
    }
};

window.saveCourseSetup = function() {
    const name = document.getElementById('setupCourseName').value || "Tuntematon Rata";
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    if(count < 1) return alert("Lisää vähintään 1 väylä.");
    let pars = [];
    for(let i=1; i<=count; i++) pars.push(parseInt(document.getElementById(`setupPar_${i}`).value) || 3);
    
    set(ref(db, 'gameState/course'), { name: name, pars: pars });
    set(ref(db, 'gameState/currentHoleIndex'), 1);
    document.getElementById('courseModal').style.display = 'none';
};

function renderCourseBanner() {
    const banner = document.getElementById('courseInfoBanner');
    if(!currentCourse) { banner.style.display = 'none'; return; }
    banner.style.display = 'flex';
    document.getElementById('bannerCourseName').innerText = currentCourse.name;
    document.getElementById('bannerHoleNum').innerText = currentHoleIndex;
    let par = currentCourse.pars[currentHoleIndex - 1] || 3;
    document.getElementById('bannerPar').innerText = par;
}

// VÄYLÄN JA KAUPAN ARVONTA
window.rollHoleRules = function() {
    const randomRule = holeRules[Math.floor(Math.random() * holeRules.length)];
    // Arvotaan 3 satunnaista korttia kauppaan
    let shuffledShop = [...allCards].sort(() => 0.5 - Math.random());
    let shopItemsForHole = shuffledShop.slice(0, 3);

    set(ref(db, 'gameState/activeHole'), {
        rule: randomRule,
        shop: shopItemsForHole,
        timestamp: Date.now()
    });
};

function renderActiveHole() {
    const container = document.getElementById('activeHoleContainer');
    document.getElementById('gmGlobalControls').style.display = 'block';

    if (!activeHole || !activeHole.rule) {
        container.innerHTML = `<div class="card" style="text-align:center;"><h2 style="margin:0; border:none;">Ei aktiivista väylää</h2><p style="font-size:0.8rem; color:var(--text-muted);">GM arpoo säännöt ja avaa kaupan.</p></div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="card" style="border-color: ${activeHole.rule.type === 'bounty' ? 'var(--gold)' : 'var(--accent)'}; box-shadow: 0 0 20px ${activeHole.rule.type === 'bounty' ? 'var(--gold-glow)' : 'var(--accent-glow)'};">
            <h1 style="color: ${activeHole.rule.type === 'bounty' ? 'var(--gold)' : 'var(--accent)'}; margin-bottom: 5px;">${activeHole.rule.n}</h1>
            <p style="font-size: 1rem; line-height: 1.4;">${activeHole.rule.d}</p>
        </div>
    `;
}

// OMA KÄSI JA KAUPPA
function renderPlayerHand(cards) {
    const container = document.getElementById('playerHand');
    if (cards.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Kätesi on tyhjä. Osta kortteja kaupasta tai häviä väyliä!</p>';
        return;
    }
    let html = '<div class="card-grid">';
    cards.forEach((cId, index) => {
        const cardDef = allCards.find(sc => sc.id === cId);
        if(!cardDef) return;
        let color = cardDef.type === 'buff' ? 'var(--success)' : 'var(--danger)';
        html += `
            <div class="game-card" style="border-left: 4px solid ${color};">
                <div><h3 style="color:${color};">${cardDef.n}</h3><p>${cardDef.d}</p></div>
                <button class="btn btn-secondary long-press-btn" style="border-color:${color}; color:#fff;" id="useCardBtn_${index}">
                    <div class="long-press-fill"></div>PELAA KORTTI
                </button>
            </div>`;
    });
    container.innerHTML = html + '</div>';

    cards.forEach((cId, index) => {
        const btn = document.getElementById(`useCardBtn_${index}`);
        if(btn) setupLongPress(btn, () => openTargetModal(index, cId));
    });
}

function renderShop(shopArray, myPoints) {
    const container = document.getElementById('shopItems');
    if(!shopArray || shopArray.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Kauppa on tyhjä tällä väylällä.</p>'; return;
    }
    
    let html = '';
    shopArray.forEach(item => {
        if(!item) return;
        const canAfford = myPoints >= item.price;
        let color = item.type === 'buff' ? 'var(--success)' : 'var(--danger)';
        let encodedItem = encodeURIComponent(JSON.stringify(item));
        html += `
            <div class="game-card" style="opacity: ${canAfford ? '1' : '0.5'}; border: 1px solid ${color};">
                <span class="price-tag">${item.price} P</span>
                <h3 style="color:${color};">${item.n}</h3><p>${item.d}</p>
                <button class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} long-press-btn" style="margin-top:10px;" ${!canAfford ? 'disabled' : ''} id="buyBtn_${item.id}">
                    <div class="long-press-fill"></div>${canAfford ? 'OSTA (NOPEIN VIE)' : 'EI VARAA'}
                </button>
            </div>`;
    });
    container.innerHTML = `<div class="card-grid">${html}</div>`;

    shopArray.forEach(item => {
        if(!item) return;
        const btn = document.getElementById(`buyBtn_${item.id}`);
        if(btn && !btn.disabled) setupLongPress(btn, () => buyShopItem(item));
    });
}

// KAUPAN LUKITUS JA OSTO
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
        if(res.committed) triggerPopup(`KORTTI OSTETTU!`, `${myName} osti kortin <b>${item.n}</b>!`, ``);
    });
};

// KORTIN KOHDISTAMINEN JA PELAAMINEN
let pendingCardPlay = null;
function openTargetModal(cardIndex, cardId) {
    const cardDef = allCards.find(c => c.id === cardId);
    pendingCardPlay = { index: cardIndex, id: cardId, def: cardDef };
    
    document.getElementById('targetCardName').innerText = cardDef.n;
    const list = document.getElementById('targetPlayerList');
    list.innerHTML = '';
    
    // Voit kohdistaa keneen tahansa (myös itseesi, jos se on helpotus)
    allPlayers.forEach(p => {
        if(!p) return;
        let isMe = p.name === myName;
        list.innerHTML += `<button class="target-player-btn" onclick="executeCardPlay('${p.name}')"><span>${p.name}</span> ${isMe ? '<span style="color:var(--text-muted); font-size:0.8rem;">(Sinä)</span>' : ''}</button>`;
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
        if(me && me.cards) {
            me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
            me.cards.splice(card.index, 1); 
        }
        return players;
    }).then(() => {
        let title = card.def.type === 'buff' ? 'HEITON APU!' : 'SABOTAASI!';
        let color = card.def.type === 'buff' ? 'var(--success)' : 'var(--danger)';
        triggerPopup(`<span style="color:${color}">${title}</span>`, `<b>${myName}</b> käytti kortin <b>${card.def.n}</b> pelaajalle <b>${targetName}</b>!`, `<div style="color:${color};">${card.def.d}</div>`);
    });
};

// TULOSTEN SYÖTTÖ
window.openScoreModal = function() {
    if(allPlayers.length === 0) return alert("Ei pelaajia.");
    let par = 3;
    if(currentCourse && currentCourse.pars) par = currentCourse.pars[currentHoleIndex - 1] || 3;
    
    document.getElementById('scoreModalHoleNum').innerText = currentHoleIndex;
    document.getElementById('scoreModalPar').innerText = par;
    
    const container = document.getElementById('scoreInputsContainer');
    let html = '';
    allPlayers.forEach((p, i) => {
        if(!p) return;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:#111; padding:10px; border-radius:8px;">
                <span style="font-weight:bold;">${p.name}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="btn btn-secondary" style="width:40px; height:40px; padding:0;" onclick="document.getElementById('score_${i}').stepDown()">-</button>
                    <input type="number" id="score_${i}" value="${par}" style="width:60px; margin:0; text-align:center; font-size:1.2rem; font-weight:bold; height:40px;">
                    <button class="btn btn-secondary" style="width:40px; height:40px; padding:0;" onclick="document.getElementById('score_${i}').stepUp()">+</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
    document.getElementById('scoreModal').style.display = 'flex';
};

window.submitScores = function() {
    let scores = [];
    allPlayers.forEach((p, i) => {
        if(!p) return;
        const val = parseInt(document.getElementById(`score_${i}`).value) || 3;
        scores.push({ name: p.name, strokes: val });
    });

    const minStrokes = Math.min(...scores.map(s => s.strokes));
    const maxStrokes = Math.max(...scores.map(s => s.strokes));
    let winners = scores.filter(s => s.strokes === minStrokes).map(s => s.name);
    let losers = scores.filter(s => s.strokes === maxStrokes).map(s => s.name);
    
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state) return state;
        let players = state.players ? (Array.isArray(state.players) ? state.players : Object.values(state.players)) : [];
        players.forEach(p => {
            if (!p) return;
            if (winners.includes(p.name)) p.score = (p.score || 0) + 5;
            if (losers.includes(p.name)) {
                p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
                const randomCard = allCards.filter(c => c.type === 'sabotage')[Math.floor(Math.random() * 4)];
                p.cards.push(randomCard.id);
            }
        });
        state.players = players;
        state.currentHoleIndex = (state.currentHoleIndex || 1) + 1;
        state.activeHole = null; // Resetoi väylän ja kaupan
        return state;
    }).then(() => {
        triggerPopup(`VÄYLÄ PELATTU!`, `Resurssit ja kosto-kortit jaettu. Siirrytään väylälle ${currentHoleIndex + 1}.`, `Voittajat (+5P): ${winners.join(', ')}<br>Häviäjät (+1 Kortti): ${losers.join(', ')}`);
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
    setTimeout(() => { overlay.style.display = 'none'; }, 4000); 
}

function renderLeaderboard() {
    const list = document.getElementById('playerList');
    if(!list) return;
    let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => b.score - a.score);
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        list.innerHTML += `<div class="player-row ${p.name === myName ? 'me' : ''}"><div><span style="color:var(--text-muted); font-weight:900; margin-right:10px;">${i+1}.</span>${p.name}</div><span class="price-tag" style="position:relative; top:0; right:0;">${p.score} P</span></div>`;
    });
}
