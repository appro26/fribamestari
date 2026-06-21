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
let isExpandedView = false; 
let lastPlayedCardTimestamp = Date.now();

//==============================================
// 1. GLOBAALIT WINDOW-FUNKTIOT (ESTÄÄ ALUSTUSVIRHEET)
//==============================================

window.updateIdentityUI = function() { 
    const el = document.getElementById('identityCard');
    if(el) el.style.display = myName ? 'none' : 'block'; 
    const topWallet = document.getElementById('topWallet');
    if(topWallet) topWallet.style.display = myName ? 'block' : 'none';
};

window.renderCourseBanner = function() {
    const banner = document.getElementById('courseInfoBanner');
    if(!banner || !currentCourse) return;
    document.getElementById('bannerCourseName').innerText = currentCourse.name;
    document.getElementById('bannerHoleNum').innerText = currentHoleIndex;
    document.getElementById('bannerPar').innerText = currentCourse.pars[currentHoleIndex - 1] || 3;
};

window.renderLeaderboard = function() {
    const list = document.getElementById('playerList');
    if(!list) return;
    let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        let dgVal = p.dgScore || 0;
        let dgStr = dgVal > 0 ? `+${dgVal}` : (dgVal === 0 ? 'E' : `${dgVal}`);
        let dgColor = dgVal > 0 ? 'var(--danger)' : (dgVal < 0 ? 'var(--info)' : 'var(--text-main)');
        
        list.innerHTML += `<div class="player-row ${p.name === myName ? 'me' : ''}">
            <div style="font-weight:800; font-size:1.1rem;"><span style="color:var(--text-muted); margin-right:10px;">${i+1}.</span>${p.name}</div>
            <div style="display:flex; align-items:center; gap: 15px;">
                <span style="font-size:0.85rem; color:var(--warning); font-weight:800;">${p.score || 0} P</span>
                <span style="font-weight:900; font-size:1.4rem; color:${dgColor}; min-width: 35px; text-align:right;">${dgStr}</span>
            </div>
        </div>`;
    });
};

window.renderActiveHole = function() {
    const container = document.getElementById('activeHoleContainer');
    const cardsArea = document.getElementById('activeCardsArea');
    const cardsContainer = document.getElementById('activeCardsContainer');
    const myRulesContainer = document.getElementById('myActiveRulesContainer');

    if (!activeHole || !activeHole.rule) {
        if(container) container.innerHTML = ``;
        if(cardsArea) cardsArea.style.display = 'none';
        if(myRulesContainer) myRulesContainer.style.display = 'none';
        return;
    }
    
    let bountyTag = activeHole.rule.type === 'bounty' ? `<div class="rule-bounty-tag">🏆 TEHTÄVÄ (+5 P)</div>` : '';
    if(container) container.innerHTML = `<div class="hole-rule-card">${bountyTag}<h1>${activeHole.rule.n}</h1><p>${activeHole.rule.d}</p></div>`;
    
    if(activeHole.playedCards && activeHole.playedCards.length > 0) {
        if(cardsArea) cardsArea.style.display = 'block';
        let cardsHtml = '';
        let myRulesHtml = '';
        
        const playedCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
        playedCards.forEach(pc => {
            let actionText = pc.type === 'buff' ? `käytti edun` : `sabotoi kohdetta <strong>${pc.target}</strong>`;
            let color = pc.type === 'buff' ? 'var(--info)' : 'var(--danger)';
            
            cardsHtml += `<div class="active-card-chip" style="border-color:${color};" onclick="window.showCardInfo('${pc.cardName}', '${pc.cardDesc}', 'Kohde: ${pc.target}<br>Käyttäjä: ${pc.by}')"><span style="color:var(--text-main);"><b>${pc.by}</b> ${actionText}: <span style="font-weight:900; color:${color};">${pc.cardName}</span></span></div>`;
            
            if(pc.target === myName) {
                myRulesHtml += `<div class="my-rule-item"><b>${pc.cardName}:</b> <span style="font-weight:600;">${pc.cardDesc}</span></div>`;
            }
        });
        
        if(cardsContainer) cardsContainer.innerHTML = cardsHtml;
        if(myRulesHtml !== '') {
            if(myRulesContainer) {
                myRulesContainer.style.display = 'block';
                myRulesContainer.innerHTML = `<div class="my-rules-box"><h3>🚨 Sinuun kohdistuvat sabotaasit:</h3>${myRulesHtml}</div>`;
            }
        } else {
            if(myRulesContainer) myRulesContainer.style.display = 'none';
        }
    } else {
        if(cardsArea) cardsArea.style.display = 'none';
        if(myRulesContainer) myRulesContainer.style.display = 'none';
    }
};

window.renderPlayerHand = function(cards) {
    const modalContainer = document.getElementById('handModalCards');
    const expandedContainer = document.getElementById('playerHandExpanded');
    
    if (cards.length === 0) { 
        let emptyHtml = '<p style="color:var(--text-muted); font-size:1rem; text-align:center; padding:15px; width:100%;">Kätesi on tyhjä.</p>';
        if(modalContainer) modalContainer.innerHTML = emptyHtml;
        if(expandedContainer) expandedContainer.innerHTML = emptyHtml;
        return; 
    }
    
    let html = '';
    cards.forEach((cId, index) => {
        const cDef = allCards.find(sc => sc.id === cId);
        if(!cDef) return;
        let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
        let btnClass = cDef.type === 'buff' ? 'btn-success' : 'btn-danger';
        let labelText = cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI';
        html += `
            <div class="physical-card ${typeClass}">
                <div><div class="card-type-tag">${labelText}</div><h3>${cDef.n}</h3><p>${cDef.d}</p></div>
                <button class="btn ${btnClass}" onclick="window.openTargetModal(${index}, '${cId}')">PELAA KORTTI</button>
            </div>`;
    });
    
    if(modalContainer) modalContainer.innerHTML = html;
    if(expandedContainer) expandedContainer.innerHTML = html;
};

window.renderShop = function(shopArray, myPoints, boughtThisHole) {
    const modalContainer = document.getElementById('shopModalCards');
    const expandedContainer = document.getElementById('shopItemsExpanded');
    
    if(!shopArray || shopArray.length === 0) { 
        let emptyHtml = '<p style="color:var(--text-muted); font-size:1rem; text-align:center; padding:15px; width:100%;">Kauppa on suljettu.</p>';
        if(modalContainer) modalContainer.innerHTML = emptyHtml;
        if(expandedContainer) expandedContainer.innerHTML = emptyHtml;
        return; 
    }
    
    let html = '';
    shopArray.forEach(item => {
        if(!item) return;
        const canAfford = myPoints >= item.price && !boughtThisHole;
        let btnText = boughtThisHole ? 'OSTETTU' : (canAfford ? 'OSTA ETU' : 'EI VARAA');
        
        html += `
            <div class="physical-card premium-card">
                <span class="card-price-tag">${item.price} P</span>
                <div><div class="card-type-tag">💎 PREMIUM KAUPPA</div><h3>${item.n}</h3><p>${item.d}</p></div>
                <button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" ${!canAfford ? 'disabled' : ''} onclick="window.buyShopItem(${JSON.stringify(item).split('"').join('&quot;')})">${btnText}</button>
            </div>`;
    });
    
    if(modalContainer) modalContainer.innerHTML = html;
    if(expandedContainer) expandedContainer.innerHTML = html;
};

window.renderEventLog = function(logData) {
    const container = document.getElementById('adminEventLog');
    if(!container) return; container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 30).forEach(l => {
        container.innerHTML += `<div style="padding:6px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); margin-right:8px; font-weight:bold;">[${l.time}]</span>${l.msg}</div>`;
    });
};

window.renderScoreLog = function(logData) {
    const container = document.getElementById('adminScoreLog');
    if(!container) return; container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 50).forEach(l => {
        let color = l.delta >= 0 ? 'var(--info)' : 'var(--danger)';
        container.innerHTML += `<div style="padding:6px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); margin-right:8px; font-weight:bold;">[${l.time}]</span><b>${l.playerName}</b>: <span style="color:${color}; font-weight:bold;">${l.delta > 0 ? '+' : ''}${l.delta} P</span></div>`;
    });
};

window.renderAdminPlayerList = function() {
    const list = document.getElementById('adminPlayerList');
    if(!list) return; list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        if(!p) return;
        list.innerHTML += `
            <div class="player-row" style="flex-direction:column; align-items:flex-start; gap:8px;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <span style="font-weight:800;">${p.name} (${p.score} P / DG: ${p.dgScore > 0 ? '+' : ''}${p.dgScore || 0})</span>
                    <button class="btn btn-danger" style="width:auto; padding:6px 12px; font-size:0.75rem;" onclick="window.removePlayer(${i})">X</button>
                </div>
                <div class="gm-score-adjust">
                    <span style="font-size:0.7rem; color:var(--text-muted); width:45px;">Raha</span>
                    <input type="number" id="gmScoreAdjust_${i}" value="1">
                    <button class="btn btn-primary" onclick="window.adjustScore(${i}, parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0)">Lisää</button>
                    <button class="btn btn-danger" onclick="window.adjustScore(${i}, -(parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0))">Vähennä</button>
                </div>
                <div class="gm-score-adjust">
                    <span style="font-size:0.7rem; color:var(--text-muted); width:45px;">Tulos</span>
                    <button class="btn btn-secondary" onclick="window.adjustDgScore(${i}, 1)">+1 Heitto</button>
                    <button class="btn btn-secondary" onclick="window.adjustDgScore(${i}, -1)">-1 Heitto</button>
                </div>
            </div>`;
    });
};

//==============================================
// 2. TULOSKORTIN VÄYLÄTIEDON TARKASTUSAPU (VAATIMUS 1)
//==============================================
window.toggleScoreModalRule = function() {
    const box = document.getElementById('scoreModalRuleBox');
    if(!box) return;
    if(box.style.display === 'none') {
        if(activeHole && activeHole.rule) {
            let bTxt = activeHole.rule.type === 'bounty' ? '🏆 TEHTÄVÄ: ' : '🎲 SÄÄNTÖ: ';
            box.innerHTML = `<strong>${bTxt} ${activeHole.rule.n}</strong><br>${activeHole.rule.d}`;
        } else {
            box.innerHTML = "Ei aktiivista sääntöä tällä väylällä.";
        }
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
};

//==============================================
// 3. TIETOKANNAN REAALIAIKAINEN KUUNTELIJA
//==============================================

onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    
    if(!data) {
        if(myName) {
            myName = null;
            localStorage.removeItem('friba_name');
            window.updateIdentityUI();
            document.getElementById('handModal').style.display = 'none';
            document.getElementById('shopModal').style.display = 'none';
        }
        currentCourse = null;
        window.renderCourseBanner();
        return;
    }

    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;

    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (!me) {
            myName = null;
            localStorage.removeItem('friba_name');
            document.getElementById('handModal').style.display = 'none';
            document.getElementById('shopModal').style.display = 'none';
        }
    }

    window.updateIdentityUI();
    
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

    window.renderCourseBanner();
    window.renderLeaderboard();
    window.renderActiveHole();
    
    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
            window.renderPlayerHand(myCards);
            window.renderShop(activeHole ? activeHole.shop : null, me.score || 0, me.boughtThisHole);
            
            let pts = `${me.score || 0} P`;
            document.getElementById('myResPointsBtn').innerText = pts;
            document.getElementById('myResPointsExpanded').innerText = pts;
            document.getElementById('topWalletPoints').innerText = pts;
            
            const shopWallet = document.getElementById('shopModalWallet');
            if(shopWallet) shopWallet.innerText = pts;
            
            document.getElementById('handCountBadge').innerText = myCards.length;
        }

        if (activeHole && activeHole.playedCards) {
            const playedCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            const myNewDebuffs = playedCards.filter(pc => pc.target === myName && pc.timestamp > lastPlayedCardTimestamp && pc.type === 'sabotage');
            
            if (myNewDebuffs.length > 0) {
                myNewDebuffs.forEach(db => {
                    window.showNotification(`💥 Sinuun kohdistui: ${db.cardName}`, 'debuff');
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
                });
                lastPlayedCardTimestamp = Math.max(...playedCards.map(pc => pc.timestamp));
            }
        }
    }

    window.renderAdminPlayerList();
    window.renderEventLog(data.eventLog);
    window.renderScoreLog(data.scoreLog);
});

//==============================================
// 4. INTERAKTIOT JA KIRJAUKSET
//==============================================

window.claimIdentity = async function() {
    let n = document.getElementById('playerNameInput').value.trim();
    if(!n || n.length > 15) return alert("Syötä nimi!"); 
    myName = n; localStorage.setItem('friba_name', n);
    window.updateIdentityUI(); 
    await runTransaction(ref(db, 'gameState/players'), (p) => {
        let arr = p ? (Array.isArray(p) ? p : Object.values(p)) : [];
        if(!arr.find(x => x && x.name === n)) { arr.push({ name: n, score: 0, dgScore: 0, cards: [], boughtThisHole: false }); }
        return arr;
    });
};

window.setRole = function(r) {
    document.body.className = r + '-mode';
    document.getElementById('btnPlayer').classList.toggle('active', r === 'player');
    document.getElementById('btnGM').classList.toggle('active', r === 'gm');
};

window.toggleView = function() {
    isExpandedView = !isExpandedView;
    document.getElementById('expandedViewContainer').style.display = isExpandedView ? 'block' : 'none';
    document.getElementById('compactViewContainer').style.display = isExpandedView ? 'none' : 'grid';
    document.getElementById('viewToggleBtn').innerText = isExpandedView ? 'SIIRRY SUPISTETTUUN NÄKYMÄÄN' : 'LAAJENNETTU NÄKYMÄ (KORTIT ESIIN)';
};

window.showNotification = function(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if(!container) return; 
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
};

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
                return { ...p, score: 0, dgScore: 0, cards: pCards, boughtThisHole: false };
            });
        }
        return state;
    }).then(() => {
        document.getElementById('courseModal').style.display = 'none';
        lastPlayedCardTimestamp = Date.now(); 
    });
};

window.generateParInputs = function() {
    const count = parseInt(document.getElementById('setupHoleCount').value) || 0;
    const container = document.getElementById('parInputsContainer');
    container.innerHTML = '';
    for(let i=1; i<=count; i++) container.innerHTML += `<div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid var(--border);"><label style="font-size:0.8rem; color:var(--text-muted); font-weight:bold;">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:10px; border:none; background:transparent;"></div>`;
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
                return { ...p, score: 0, dgScore: 0, cards: pCards, boughtThisHole: false };
            });
        }
        return state;
    }).then(() => {
        document.getElementById('courseModal').style.display = 'none';
        lastPlayedCardTimestamp = Date.now();
    });
};

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
            window.showNotification(`🛒 Ostit edun: ${item.n}`, 'warning');
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
            list.innerHTML += `<button style="background:#fff; border:2px solid var(--border); color:var(--text-main); width:100%; padding:14px; border-radius:12px; margin-bottom:10px; font-weight:800; font-size:1.1rem; text-align:left;" onclick="window.executeCardPlay('${p.name}')">${p.name}</button>`;
        }
    });
    document.getElementById('targetModal').style.display = 'flex';
};

window.executeCardPlay = function(targetName) {
    if(!pendingCardPlay) return;
    const card = pendingCardPlay;
    const timestamp = Date.now();
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
            state.activeHole.playedCards.push({ cardName: card.def.n, cardDesc: card.def.d, target: targetName, by: myName, type: card.def.type, timestamp });
        }
        state.players = players;
        return state;
    }).then(() => {
        let type = card.def.type === 'buff' ? 'info' : 'debuff';
        window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, type);
    });
};

window.openScoreModal = function() {
    if(allPlayers.length === 0) return alert("Ei pelaajia radalla.");
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    document.getElementById('scoreModalHoleNum').innerText = currentHoleIndex;
    
    const parElement = document.getElementById('scoreModalPar');
    if(parElement) parElement.innerText = par;
    
    // Nollataan tuloskortin sääntölaatikko valmiiksi
    const box = document.getElementById('scoreModalRuleBox');
    if(box) { box.style.display = 'none'; box.innerHTML = ''; }
    
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
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
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
            
            let strokeVal = scores.find(s => s.name === p.name)?.strokes || par;
            p.dgScore = (p.dgScore || 0) + (strokeVal - par);
            
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
        lastPlayedCardTimestamp = Date.now(); 
    });
};

window.adjustScore = function(idx, amt) { 
    if(amt === 0) return;
    runTransaction(ref(db, `gameState/players/${idx}`), (p) => {
        if(p) { p.score = Math.max(0, (p.score || 0) + amt); }
        return p;
    });
};

window.adjustDgScore = function(idx, amt) { 
    if(amt === 0) return;
    runTransaction(ref(db, `gameState/players/${idx}`), (p) => {
        if(p) { p.dgScore = (p.dgScore || 0) + amt; }
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
    if (confirm("Haluatko varmasti nollata koko kierroksen tiedot? Kaikki kirjataan ulos.")) {
        set(ref(db, 'gameState'), { players: [], activeHole: null, currentHoleIndex: 1, course: null })
        .then(() => { localStorage.clear(); location.reload(); });
    }
};
