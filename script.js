import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const el = id => document.getElementById(id);

let myName = localStorage.getItem('friba_name') || null;
let currentRole = 'player';
let allPlayers = [];
let activeHole = null;
let currentCourse = null;
let currentHoleIndex = 1;
let isExpandedView = false; 
let lastPlayedCardTimestamp = Date.now();

//==============================================
// UUSI APPLE-ILMOITUS
//==============================================
window.showAppleToast = function(msg, icon = '✨') {
    const toast = el('appleToast');
    if(!toast) return;
    el('appleToastIcon').innerText = icon;
    el('appleToastText').innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
};

//==============================================
// TURVALLISUUS- HELPER (ESTÄÄ FIREBASE KAATUMISET JSON-VIRHEISIIN)
//==============================================
window.cleanFirebaseData = function(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => window.cleanFirebaseData(item)).filter(item => item !== null);
    }
    
    let cleaned = {};
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            let val = window.cleanFirebaseData(obj[key]);
            if (val !== null && val !== undefined) {
                cleaned[key] = val;
            }
        }
    }
    return cleaned;
};

//==============================================
// LOKITUSJÄRJESTELMÄ 
//==============================================
window.logEvent = function(msg) {
    const timeStr = new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
    push(ref(db, 'gameState/eventLog'), window.cleanFirebaseData({ time: timeStr, msg: msg }));
};

window.logScore = function(playerName, delta) {
    const timeStr = new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
    push(ref(db, 'gameState/scoreLog'), window.cleanFirebaseData({ time: timeStr, playerName: playerName, delta: delta }));
};

//==============================================
// 1. ELEOHJAUKSET
//==============================================
window.enableCardHover = function() {
    const resetCards = () => {
        document.querySelectorAll('.physical-card').forEach(c => {
            c.classList.remove('card-hovered');
        });
    };

    const handleTouch = (e) => {
        const touch = e.touches[0];
        const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
        resetCards();
        if (elUnder) {
            const card = elUnder.closest('.physical-card');
            if (card) {
                card.classList.add('card-hovered');
            }
        }
    };

    document.addEventListener('touchstart', handleTouch, {passive: true});
    document.addEventListener('touchmove', handleTouch, {passive: true});
    document.addEventListener('touchend', resetCards);
};

window.setupSwipeToClose = function() {
    document.querySelectorAll('.fullscreen-modal').forEach(modal => {
        let startY = null;
        let currentY = null;
        
        modal.addEventListener('touchstart', e => {
            if (modal.scrollTop <= 5) { 
                startY = e.touches[0].clientY;
                modal.style.transition = 'none';
            } else {
                startY = null;
            }
        }, {passive: true});
        
        modal.addEventListener('touchmove', e => {
            if (startY === null) { return; }
            currentY = e.touches[0].clientY;
            let diff = currentY - startY;
            if (diff > 0) {
                modal.style.transform = `translateY(${diff}px)`;
            }
        }, {passive: true});
        
        modal.addEventListener('touchend', e => {
            if (startY === null) { return; }
            let diff = currentY - startY;
            modal.style.transition = 'transform 0.3s ease';
            if (diff > 120) { 
                modal.style.transform = `translateY(100%)`;
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.style.transform = '';
                }, 300);
            } else {
                modal.style.transform = '';
            }
            startY = null;
        });
    });
};

//==============================================
// 2. GLOBAALIT FUNKTIOT 
//==============================================

window.updateIdentityUI = function() { 
    if(el('identityCard')) { el('identityCard').style.display = myName ? 'none' : 'block'; }
    if(el('topWallet')) { el('topWallet').style.display = myName ? 'block' : 'none'; }
};

window.setRole = function(r) {
    currentRole = r;
    document.body.className = r + '-mode';
    if(el('btnPlayer')) { el('btnPlayer').classList.toggle('active', r === 'player'); }
    if(el('btnGM')) { el('btnGM').classList.toggle('active', r === 'gm'); }
    window.renderActiveHole(); 
};

window.toggleView = function() {
    isExpandedView = !isExpandedView;
    if(el('expandedViewContainer')) { el('expandedViewContainer').style.display = isExpandedView ? 'block' : 'none'; }
    if(el('compactViewContainer')) { el('compactViewContainer').style.display = isExpandedView ? 'none' : 'grid'; }
    if(el('viewToggleBtn')) { el('viewToggleBtn').innerText = isExpandedView ? 'SIIRRY SUPISTETTUUN NÄKYMÄÄN' : 'LAAJENNETTU NÄKYMÄ (KORTIT ESIIN)'; }
};

window.showNotification = function(message, type = 'info') {
    const container = el('notificationContainer');
    if(!container) { return; } 
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
};

window.claimIdentity = function() {
    let n = el('playerNameInput').value.trim();
    if(!n || n.length > 15) { return alert("Syötä nimi!"); }
    myName = n; localStorage.setItem('friba_name', n);
    window.updateIdentityUI(); 
    
    if(!allPlayers.find(x => x && x.name === n)) { 
        allPlayers.push({ name: n, score: 0, dgScore: 0, cards: [], boughtThisHole: false }); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(allPlayers));
        window.logEvent(`${n} liittyi peliin.`);
    }
};

window.renderCourseBanner = function() {
    if(!el('bannerCourseName') || !currentCourse) { return; }
    el('bannerCourseName').innerText = currentCourse.name;
    el('bannerHoleNum').innerText = currentHoleIndex;
    el('bannerPar').innerText = currentCourse.pars[currentHoleIndex - 1] || 3;
};

window.renderLeaderboard = function() {
    const list = el('playerList');
    if(!list) { return; }
    let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        let dgVal = p.dgScore || 0;
        let dgStr = dgVal > 0 ? `+${dgVal}` : (dgVal === 0 ? 'E' : `${dgVal}`);
        let dgColor = dgVal > 0 ? 'var(--danger)' : (dgVal < 0 ? 'var(--info)' : 'var(--text-main)');
        
        list.innerHTML += `<div class="player-row ${p.name === myName ? 'me' : ''}">
            <div style="font-weight:900; font-size:1.2rem; color:var(--text-main);"><span style="color:var(--text-muted); margin-right:10px;">${i+1}.</span>${p.name}</div>
            <div style="display:flex; align-items:center; gap: 15px;">
                <span style="font-size:0.95rem; color:var(--warning); font-weight:900;">${p.score || 0} P</span>
                <span style="font-weight:900; font-size:1.6rem; color:${dgColor}; min-width: 40px; text-align:right;">${dgStr}</span>
            </div>
        </div>`;
    });
};

window.renderActiveHole = function() {
    const container = el('activeHoleContainer');
    const cardsArea = el('activeCardsArea');
    const cardsContainer = el('activeCardsContainer');
    const myRulesContainer = el('myActiveRulesContainer');

    if (!activeHole || !activeHole.rule) {
        if(container) { container.innerHTML = ``; }
        if(cardsArea) { cardsArea.style.display = 'none'; }
        if(myRulesContainer) { myRulesContainer.style.display = 'none'; }
        return;
    }
    
    let bountyTag = activeHole.rule.type === 'bounty' ? `<div class="rule-bounty-tag">🏆 TEHTÄVÄ: +5 P</div>` : '';
    if(container) { container.innerHTML = `<div class="hole-rule-card">${bountyTag}<h1 style="font-size:1.5rem; margin-bottom:5px;">${activeHole.rule.n}</h1><p style="font-size:1.1rem;">${activeHole.rule.d}</p></div>`; }
    
    let playedCards = Object.values(activeHole.playedCards || {}).filter(Boolean);

    if(playedCards.length > 0) {
        if(cardsArea) { cardsArea.style.display = 'block'; }
        let cardsHtml = '';
        let myRulesHtml = '';
        
        playedCards.forEach(pc => {
            let cardDef = window.allCards.find(c => c.n === pc.cardName);
            let cTier = pc.tier || (cardDef ? cardDef.tier : 'normal');
            let cType = pc.type || (cardDef ? cardDef.type : 'sabotage');
            
            let actionText = cType === 'buff' ? `käytti edun` : `sabotoi kohdetta <strong style="text-transform:uppercase;">${pc.target}</strong>`;
            
            let color = 'var(--danger)'; 
            if (cTier === 'premium') { color = 'var(--warning)'; }
            else if (cType === 'buff') { color = 'var(--info)'; }

            let undoBtnHtml = '';
            if (currentRole === 'gm') {
                undoBtnHtml = `<button class="btn btn-danger" style="margin-top:10px; padding:6px 12px; font-size:0.8rem; width:auto; float:right;" onclick="event.stopPropagation(); window.undoCardPlay(${pc.timestamp})">↩️ PERU</button><div style="clear:both;"></div>`;
            }

            cardsHtml += `<div class="active-card-chip" style="border-left: 6px solid ${color}; background: #fff; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 8px;" onclick="window.triggerPopup('${pc.cardName}', '${pc.cardDesc}', 'Kohde: ${pc.target}<br>Käyttäjä: ${pc.by}')">
                <span style="color:var(--text-muted); font-size: 0.85rem; display:block; margin-bottom: 4px;"><b>${pc.by}</b> ${actionText}</span>
                <span style="font-weight:900; color:${color}; font-size: 1.1rem; display:block;">${pc.cardName}</span>
                ${undoBtnHtml}
            </div>`;
            
            if(pc.target && myName && pc.target.trim() === myName.trim()) {
                let label = cType === 'buff' ? '🛡️ OMA ETU' : '🚨 SABOTAASI';
                myRulesHtml += `<div class="my-rule-item" style="background:#fff; border: 3px solid ${color}; padding: 16px; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <b style="color:${color}; display:block; margin-bottom:6px; font-size:1.2rem; text-transform:uppercase;">${label}: ${pc.cardName}</b> 
                    <span style="font-weight:800; font-size:1.05rem; color:var(--text-main);">${pc.cardDesc}</span>
                </div>`;
            }
        });
        
        if(cardsContainer) { cardsContainer.innerHTML = cardsHtml; }
        if(myRulesHtml !== '') {
            if(myRulesContainer) {
                myRulesContainer.style.display = 'block';
                myRulesContainer.innerHTML = `<div class="my-rules-box" style="background: var(--surface-alt); border: 4px solid var(--danger); padding: 16px; border-radius: 16px;">
                    <h2 style="font-size:1.3rem; margin-bottom:15px; color:var(--danger); display:flex; align-items:center; gap:8px;">⚠️ SINUA KOSKEVAT KORTIT</h2>
                    ${myRulesHtml}
                </div>`;
            }
        } else {
            if(myRulesContainer) { myRulesContainer.style.display = 'none'; }
        }
    } else {
        if(cardsArea) { cardsArea.style.display = 'none'; }
        if(myRulesContainer) { myRulesContainer.style.display = 'none'; }
    }
};

window.renderPlayerHand = function(cards) {
    const modalContainer = el('handModalCards');
    const expandedContainer = el('playerHandExpanded');
    
    if (!cards || cards.length === 0) { 
        let emptyHtml = '<p style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kätesi on tyhjä.</p>';
        if(modalContainer) { modalContainer.innerHTML = emptyHtml; }
        if(expandedContainer) { expandedContainer.innerHTML = emptyHtml; }
        return; 
    }
    
    let html = '';
    cards.forEach((cId, index) => {
        const cDef = window.allCards.find(sc => sc.id === cId);
        if(!cDef) { return; }
        let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
        if(cDef.tier === 'premium') { typeClass = 'premium-card'; }
        
        let btnClass = cDef.tier === 'premium' ? 'btn-warning' : (cDef.type === 'buff' ? 'btn-success' : 'btn-danger');
        let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        
        html += `
            <div class="physical-card ${typeClass}">
                <div><div class="card-type-tag">${tagTxt}</div><h3>${cDef.n}</h3><p>${cDef.d}</p></div>
                <button class="btn ${btnClass}" style="padding:16px; font-size:1rem; color:${cDef.tier==='premium'? '#000':'#fff'};" onclick="window.openTargetModal('${cId}')">PELAA KORTTI</button>
            </div>`;
    });
    
    if(modalContainer) { modalContainer.innerHTML = html; }
    if(expandedContainer) { expandedContainer.innerHTML = html; }
};

window.renderShop = function(shopArray, myPoints, boughtThisHole) {
    const modalContainer = el('shopModalCards');
    const expandedContainer = el('shopItemsExpanded');
    
    if(!shopArray || shopArray.length === 0) { 
        let emptyHtml = '<p style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kauppa on suljettu.</p>';
        if(modalContainer) { modalContainer.innerHTML = emptyHtml; }
        if(expandedContainer) { expandedContainer.innerHTML = emptyHtml; }
        return; 
    }
    
    let html = '';
    shopArray.forEach(item => {
        if(!item) { return; }
        const canAfford = myPoints >= item.price && !boughtThisHole;
        let btnText = boughtThisHole ? 'OSTETTU' : (canAfford ? 'OSTA ETU' : 'EI VARAA');
        html += `
            <div class="physical-card premium-card">
                <span class="card-price-tag">${item.price} P</span>
                <div><div class="card-type-tag">💎 PREMIUM KAUPPA</div><h3>${item.n}</h3><p>${item.d}</p></div>
                <button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" style="padding:16px; font-size:1rem; color:#000;" ${!canAfford ? 'disabled' : ''} onclick="window.buyShopItem('${item.id}', '${item.n}', ${item.price})">${btnText}</button>
            </div>`;
    });
    
    if(modalContainer) { modalContainer.innerHTML = html; }
    if(expandedContainer) { expandedContainer.innerHTML = html; }
};

// ===========================================
// GM: KORTTIEN LISÄYS & POISTO & LOGIT
// ===========================================

window.renderAdminPlayerList = function() {
    const list = el('adminPlayerList');
    if(!list) { return; }
    list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        if(!p) { return; }
        
        let cardsHtml = '';
        if(p.cards && p.cards.length > 0) {
            cardsHtml = `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; width:100%;">`;
            p.cards.forEach((cId, cIdx) => {
                let cardDef = window.allCards.find(c => c.id === cId);
                if(cardDef) {
                    cardsHtml += `<div style="background:var(--surface-alt); border:2px solid var(--border); padding:4px 8px; border-radius:6px; font-size:0.8rem; display:flex; align-items:center; gap:5px;">
                        ${cardDef.n} <button style="color:var(--danger); font-weight:900; font-size:1.1rem; padding:0 4px; line-height:1;" onclick="window.removeCardFromPlayer(${i}, ${cIdx})">&times;</button>
                    </div>`;
                }
            });
            cardsHtml += `</div>`;
        }

        list.innerHTML += `
            <div class="player-row" style="flex-direction:column; align-items:flex-start; gap:10px;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <span style="font-weight:900; font-size:1.1rem; color:var(--text-main);">${p.name} (${p.score} P / DG: ${p.dgScore > 0 ? '+' : ''}${p.dgScore || 0})</span>
                    <div style="display:flex; gap: 8px;">
                        <button class="btn btn-success" style="width:auto; padding:10px; font-size:0.85rem;" onclick="window.openGmGiveCard(${i})">+ KORTTI</button>
                        <button class="btn btn-danger" style="width:auto; padding:10px; font-size:0.85rem;" onclick="window.removePlayer(${i})">POISTA</button>
                    </div>
                </div>
                ${cardsHtml}
                <div class="gm-score-adjust">
                    <span style="font-size:0.85rem; color:var(--text-muted); width:50px; font-weight:bold;">Raha</span>
                    <input type="number" id="gmScoreAdjust_${i}" value="1">
                    <button class="btn btn-primary" onclick="if(window.adjustScore) { window.adjustScore(${i}, parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0); }">Lisää</button>
                    <button class="btn btn-danger" onclick="if(window.adjustScore) { window.adjustScore(${i}, -(parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0)); }">Vähennä</button>
                </div>
                <div class="gm-score-adjust">
                    <span style="font-size:0.85rem; color:var(--text-muted); width:50px; font-weight:bold;">Tulos</span>
                    <button class="btn btn-secondary" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, 1); }">+1 Heitto</button>
                    <button class="btn btn-secondary" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, -1); }">-1 Heitto</button>
                </div>
            </div>`;
    });
};

let selectedPlayerForCard = null;
window.openGmGiveCard = function(playerIndex) {
    selectedPlayerForCard = playerIndex;
    el('gmCardSearch').value = '';
    window.renderGmCardList('');
    el('gmGiveCardModal').style.display = 'flex';
};

window.renderGmCardList = function(filterTxt) {
    const container = el('gmGiveCardList');
    if(!container) { return; }
    let html = '';
    let q = filterTxt.toLowerCase();
    
    window.allCards.forEach(c => {
        if (q && !c.n.toLowerCase().includes(q) && !c.d.toLowerCase().includes(q)) { return; }
        
        let typeClass = c.type === 'buff' ? 'buff-card' : 'debuff-card';
        if (c.tier === 'premium') { typeClass = 'premium-card'; }
        let tagTxt = c.tier === 'premium' ? '💎 PREMIUM' : (c.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        let btnClass = c.tier === 'premium' ? 'btn-warning' : (c.type === 'buff' ? 'btn-success' : 'btn-danger');
        
        html += `
            <div class="physical-card ${typeClass}" style="min-height: 180px;">
                <div><div class="card-type-tag">${tagTxt}</div><h3 style="font-size:1rem;">${c.n}</h3><p style="font-size:0.8rem;">${c.d}</p></div>
                <button class="btn ${btnClass}" style="padding:12px; font-size:0.9rem; color:${c.tier === 'premium' ? '#000' : '#fff'};" onclick="window.giveCardToPlayer('${c.id}')">ANNA TÄMÄ</button>
            </div>`;
    });
    container.innerHTML = html;
};

window.filterGmCards = function() {
    window.renderGmCardList(el('gmCardSearch').value);
};

window.giveCardToPlayer = function(cardId) {
    if (selectedPlayerForCard === null) { return; }
    let p = allPlayers[selectedPlayerForCard];
    let cardDef = window.allCards.find(c => c.id === cardId);
    if (p && cardDef) {
        p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
        p.cards.push(cardId);
        set(ref(db, `gameState/players/${selectedPlayerForCard}/cards`), window.cleanFirebaseData(p.cards));
        window.logEvent(`${myName} (GM) antoi kortin ${cardDef.n} pelaajalle ${p.name}.`);
        window.showNotification(`Kortti lisätty pelaajalle ${p.name}!`, "info");
        el('gmGiveCardModal').style.display = 'none';
    }
};

window.removeCardFromPlayer = function(pIdx, cIdx) {
    let p = allPlayers[pIdx];
    if(p && p.cards) {
        let cId = p.cards[cIdx];
        let cardDef = window.allCards.find(c => c.id === cId);
        p.cards.splice(cIdx, 1);
        set(ref(db, `gameState/players/${pIdx}/cards`), window.cleanFirebaseData(p.cards));
        window.logEvent(`${myName} (GM) poisti kortin ${cardDef ? cardDef.n : ''} pelaajalta ${p.name}.`);
    }
};

window.gmRollRule = function() {
    if(!activeHole) { return; }
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    activeHole.rule = randomRule;
    set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(randomRule));
    window.logEvent(`${myName} (GM) arpoi uuden väyläsäännön: ${randomRule.n}`);
};

window.gmSetRule = function() {
    if(!activeHole) { return; }
    const sel = el('gmRuleSelect');
    const ruleDef = window.holeRules[sel.value];
    if(ruleDef) {
        activeHole.rule = ruleDef;
        set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(ruleDef));
        window.logEvent(`${myName} (GM) asetti väyläsäännön: ${ruleDef.n}`);
    }
};

window.renderEventLog = function(logData) {
    const container = el('adminEventLog');
    if(!container) { return; } 
    container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 30).forEach(l => {
        container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); margin-right:8px; font-weight:900;">[${l.time}]</span>${l.msg}</div>`;
    });
};

window.renderScoreLog = function(logData) {
    const container = el('adminScoreLog');
    if(!container) { return; } 
    container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 50).forEach(l => {
        let color = l.delta >= 0 ? 'var(--info)' : 'var(--danger)';
        container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); margin-right:8px; font-weight:900;">[${l.time}]</span><b>${l.playerName}</b>: <span style="color:${color}; font-weight:900;">${l.delta > 0 ? '+' : ''}${l.delta} P</span></div>`;
    });
};

window.triggerPopup = function(title, desc, details) {
    const overlay = el('lotteryWinner');
    if(!overlay) { return; }
    el('popupTitle').innerHTML = title;
    el('popupDesc').innerHTML = desc;
    
    const detailsEl = el('popupDetails');
    if(detailsEl) {
        detailsEl.innerHTML = details;
        if(!details || details === '') { detailsEl.style.display = 'none'; }
        else { detailsEl.style.display = 'block'; }
    }
    overlay.style.display = 'flex';
};

window.adminAddPlayer = function() {
    const input = el('adminNewPlayerName');
    if(!input) { return; }
    let n = input.value.trim();
    if(!n) { return; }
    
    if(!allPlayers.find(x => x && x.name === n)) { 
        allPlayers.push({ name: n, score: 0, dgScore: 0, cards: [], boughtThisHole: false }); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(allPlayers)).then(() => { input.value = ''; });
        window.logEvent(`${myName} (GM) lisäsi pelaajan ${n}.`);
    }
};

window.adjustScore = function(idx, amt) { 
    if(amt === 0) { return; }
    if(allPlayers[idx]) {
        allPlayers[idx].score = Math.max(0, (parseInt(allPlayers[idx].score, 10) || 0) + amt);
        set(ref(db, `gameState/players/${idx}/score`), allPlayers[idx].score);
        window.logEvent(`${myName} (GM) antoi ${amt} P pelaajalle ${allPlayers[idx].name}.`);
        window.logScore(allPlayers[idx].name, amt);
    }
};

window.adjustDgScore = function(idx, amt) { 
    if(amt === 0) { return; }
    if(allPlayers[idx]) {
        allPlayers[idx].dgScore = (parseInt(allPlayers[idx].dgScore, 10) || 0) + amt;
        set(ref(db, `gameState/players/${idx}/dgScore`), allPlayers[idx].dgScore);
        window.logEvent(`${myName} (GM) sääti pelaajan ${allPlayers[idx].name} heittotulosta (${amt > 0 ? '+'+amt : amt}).`);
    }
};

window.removePlayer = function(idx) { 
    if(confirm("Poistetaanko pelaaja pelistä?")) { 
        let pName = allPlayers[idx].name;
        allPlayers.splice(idx, 1); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(allPlayers));
        window.logEvent(`${myName} (GM) poisti pelaajan ${pName}.`);
    } 
};

window.resetGame = function() {
    if (confirm("Haluatko varmasti nollata koko kierroksen tiedot? Kaikki kirjataan ulos.")) {
        set(ref(db, 'gameState'), window.cleanFirebaseData({ players: [], activeHole: null, currentHoleIndex: 1, course: null }))
        .then(() => { localStorage.clear(); location.reload(); });
        window.logEvent(`${myName} (GM) nollasi koko pelin.`);
    }
};

// ===========================================
// PELIN ALOITUS
// ===========================================

window.startMeilahti = function() {
    currentCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    currentHoleIndex = 1;
    
    let premiumPool = window.allCards.filter(c => c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) { break; }
    }
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    activeHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    let normalPool = window.allCards.filter(c => c.tier === "normal");
    if(allPlayers) {
        allPlayers = allPlayers.filter(Boolean).map(p => {
            let pCards = [
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id
            ];
            return { ...p, score: 10, dgScore: 0, cards: pCards, boughtThisHole: false };
        });
    }
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        course: currentCourse,
        currentHoleIndex: currentHoleIndex,
        activeHole: activeHole,
        players: allPlayers
    }));

    if(el('courseModal')) { el('courseModal').style.display = 'none'; }
    lastPlayedCardTimestamp = Date.now(); 
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${currentCourse.name}. Kaikki saivat 10 P ja 3 korttia.`);
};

window.generateParInputs = function() {
    const count = parseInt(el('setupHoleCount').value) || 0;
    const container = el('parInputsContainer');
    if(!container) { return; }
    container.innerHTML = '';
    for(let i=1; i<=count; i++) { 
        container.innerHTML += `<div style="background:var(--surface-alt); padding:12px; border-radius:10px; border:2px solid var(--border);"><label style="font-size:0.9rem; color:var(--text-muted); font-weight:900;">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:10px; border:none; background:transparent; font-size:1.2rem;" /></div>`;
    }
};

window.saveCourseSetup = function() {
    const name = el('setupCourseName').value || "Rata";
    const count = parseInt(el('setupHoleCount').value) || 0;
    if(count < 1) { return alert("Syötä vähintään 1 väylä!"); }
    let pars = [];
    for(let i=1; i<=count; i++) { pars.push(parseInt(el(`setupPar_${i}`).value) || 3); }
    
    currentCourse = { name: name, pars: pars };
    currentHoleIndex = 1;
    
    let premiumPool = window.allCards.filter(c => c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) { break; }
    }
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    activeHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    let normalPool = window.allCards.filter(c => c.tier === "normal");
    if(allPlayers) {
        allPlayers = allPlayers.filter(Boolean).map(p => {
            let pCards = [
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id
            ];
            return { ...p, score: 10, dgScore: 0, cards: pCards, boughtThisHole: false };
        });
    }

    update(ref(db, 'gameState'), window.cleanFirebaseData({
        course: currentCourse,
        currentHoleIndex: currentHoleIndex,
        activeHole: activeHole,
        players: allPlayers
    }));

    if(el('courseModal')) { el('courseModal').style.display = 'none'; }
    lastPlayedCardTimestamp = Date.now();
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${currentCourse.name}. Kaikki saivat 10 P ja 3 korttia.`);
};

// ===========================================
// TÄYSIN UUDELLEENRAKENNETTU PISTEIDEN KERUU JA LASKENTA
// ===========================================

window.changeScore = function(safeId, par, delta) {
    let input = el(`scoreInput_${safeId}`);
    if(!input) { return; }
    let val = parseInt(input.value) + delta;
    if(val < 1) { val = 1; }
    input.value = val;
    
    let display = el(`scoreDisplay_${safeId}`);
    if(!display) { return; }
    display.innerText = val;
    display.className = 'score-display';
    
    if(val < par) { display.classList.add('score-birdie'); }
    else if(val > par) { display.classList.add('score-bogey'); }
    else { display.classList.add('score-par'); }
};

window.openScoreModal = function() {
    if(allPlayers.length === 0) { return alert("Ei pelaajia radalla."); }
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    
    if(el('scoreModalHoleNum')) { el('scoreModalHoleNum').innerText = currentHoleIndex; }
    if(el('scoreModalPar')) { el('scoreModalPar').innerText = par; }
    
    const box = el('scoreModalRuleBox');
    if(box) {
        if(activeHole && activeHole.rule) {
            let bTxt = activeHole.rule.type === 'bounty' ? '🏆 TEHTÄVÄ: ' : '🎲 SÄÄNTÖ: ';
            box.innerHTML = `<strong style="color:var(--primary); font-size:1.1rem;">${bTxt} ${activeHole.rule.n}</strong><br><br>${activeHole.rule.d}`;
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    }
    
    const container = el('scoreInputsContainer');
    if(!container) { return; } 
    
    let html = '';
    let taskCheckboxes = '';
    
    allPlayers.forEach((p, i) => {
        if(!p) { return; }
        
        let encodedName = p.name.replace(/"/g, '&quot;');
        // Ruksit käyttävät idioottivarmaa nimeä arvona
        taskCheckboxes += `<label class="task-checkbox-label"><input type="checkbox" class="task-checkbox" value="${encodedName}" style="width:28px; height:28px; margin:0;" /> ${p.name}</label>`;
        
        let safeId = "player_" + i; 
        html += `
            <div class="score-row">
                <span class="score-name">${p.name}</span>
                <div class="score-controls">
                    <button class="btn-score-ctrl" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                    <div id="scoreDisplay_${safeId}" class="score-display score-par">${par}</div>
                    <button class="btn-score-ctrl" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
                    <input type="hidden" class="score-input-data" data-name="${encodedName}" id="scoreInput_${safeId}" value="${par}" />
                </div>
            </div>`;
    });
    container.innerHTML = html;
    if(el('taskWinnerContainer')) { el('taskWinnerContainer').innerHTML = taskCheckboxes; }
    
    const sm = el('scoreModal');
    if(sm) { sm.style.display = 'flex'; }
};

window.submitScores = function() {
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    
    // 1. Kerätään tulokset täysin nimivarmalla tavalla
    let playerResults = {};
    allPlayers.forEach(p => {
        if(p) { playerResults[p.name] = { strokes: par, taskWon: false }; }
    });
    
    const inputs = document.querySelectorAll('.score-input-data');
    if(inputs.length === 0) {
        alert("Virhe: Ei tulosrivejä löydetty! Yritä avata näkymä uudelleen.");
        if(el('scoreModal')) { el('scoreModal').style.display = 'none'; }
        return;
    }
    
    // Yhdistetään DOMin numeeriset tulokset oikeisiin nimiin
    inputs.forEach(input => {
        let pName = input.value; // HTML de-koodaa &quot; automaattisesti
        let attrName = input.getAttribute('data-name');
        if(playerResults[attrName]) {
            playerResults[attrName].strokes = parseInt(input.value, 10) || par;
        }
    });

    // Kerätään tehtäväruksit suoraan nimellä
    document.querySelectorAll('.task-checkbox:checked').forEach(cb => {
        let pName = cb.value;
        if (playerResults[pName]) {
            playerResults[pName].taskWon = true;
        }
    });

    // 2. Etsitään pienin (voittaja) ja suurin (häviäjä) tulos
    let minStrokes = 9999;
    let maxStrokes = -9999;
    for (let key in playerResults) {
        let s = playerResults[key].strokes;
        if (s < minStrokes) minStrokes = s;
        if (s > maxStrokes) maxStrokes = s;
    }

    // 3. Lasketaan ja päivitetään uudet pisteet!
    let normalPool = window.allCards.filter(c => c.tier === "normal");

    allPlayers.forEach(p => {
        if (!p) return;
        let result = playerResults[p.name];
        if (!result) return;

        // Heittotuloksen laskenta
        p.dgScore = (parseInt(p.dgScore, 10) || 0) + (result.strokes - par);

        // UUSI RAHAN LASKENTA: +1 P Väylävoitosta, +5 P Tehtävästä!
        let currentMoney = parseInt(p.score, 10) || 0;
        if (result.strokes === minStrokes) {
            currentMoney += 1; 
        }
        if (result.taskWon) {
            currentMoney += 5; 
        }
        p.score = currentMoney;
        p.boughtThisHole = false;

        // Korttien jako (Häviäjä saa kolme, muut kaksi)
        p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
        if (result.strokes === maxStrokes) {
            p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id); 
        }
        p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
        p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
        p.cards = p.cards.filter(Boolean);
    });

    // 4. Päivitetään peli ja lähetetään serverille
    window.logEvent(`${myName} syötti tulokset väylältä ${currentHoleIndex}.`);
    
    currentHoleIndex++;
    
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    let premiumPool = window.allCards.filter(c => c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) { break; }
    }
    
    activeHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    allPlayers = allPlayers.filter(Boolean);
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        players: allPlayers,
        currentHoleIndex: currentHoleIndex,
        activeHole: activeHole
    }));

    if(el('scoreModal')) { el('scoreModal').style.display = 'none'; }
    lastPlayedCardTimestamp = Date.now(); 
};

// ===========================================
// KORTTIEN PELUU
// ===========================================

window.buyShopItem = function(idStr, nameStr, priceVal) {
    if (!activeHole || !activeHole.shop) { return; }
    const me = allPlayers.find(p => p && p.name === myName);
    if (!me || me.score < priceVal || me.boughtThisHole) { return; }

    const shopIndex = activeHole.shop.findIndex(i => i && i.id === idStr);
    if (shopIndex !== -1) {
        me.score -= priceVal;
        me.boughtThisHole = true;
        activeHole.shop.splice(shopIndex, 1);
        me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
        me.cards.push(idStr);

        let updates = {};
        updates['gameState/players'] = window.cleanFirebaseData(allPlayers);
        updates['gameState/activeHole/shop'] = window.cleanFirebaseData(activeHole.shop);
        update(ref(db), updates);

        if(el('shopModal')) { el('shopModal').style.display = 'none'; }
        window.logEvent(`${myName} osti edun: ${nameStr}.`);
        window.showNotification(`🛒 Ostit edun: ${nameStr}`, 'warning');
    }
};

let pendingCardPlay = null;
window.openTargetModal = function(cardId) {
    const cardDef = window.allCards.find(c => c.id === cardId);
    pendingCardPlay = { id: cardId, def: cardDef };
    
    if(cardDef.type === 'buff') {
        window.executeCardPlay(myName);
        return;
    }
    
    if(el('targetCardName')) { el('targetCardName').innerText = cardDef.n; }
    const list = el('targetPlayerList');
    if(!list) { return; }
    list.innerHTML = '';
    allPlayers.forEach(p => {
        if(!p) { return; }
        if(p.name !== myName) {
            let encodedName = p.name.replace(/"/g, '&quot;');
            list.innerHTML += `<button class="btn btn-secondary target-btn" data-name="${encodedName}" style="background:var(--surface); border:3px solid var(--border); color:var(--text-main); width:100%; padding:20px; border-radius:12px; margin-bottom:12px; font-weight:900; font-size:1.3rem; text-align:left; box-shadow:0 4px 10px rgba(0,0,0,0.05);" onclick="window.executeCardPlay(this.getAttribute('data-name'))">${p.name}</button>`;
        }
    });
    if(el('targetModal')) { el('targetModal').style.display = 'flex'; }
};

window.executeCardPlay = function(targetName) {
    if(!pendingCardPlay) { return; }
    const card = pendingCardPlay;
    const timestamp = Date.now();
    if(el('targetModal')) { el('targetModal').style.display = 'none'; }
    if(el('handModal')) { el('handModal').style.display = 'none'; }
    
    const me = allPlayers.find(p => p && p.name === myName);
    if(me && me.cards) { 
        me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
        me.cards = me.cards.filter(Boolean);
        
        let actualIndex = me.cards.indexOf(card.id);
        if (actualIndex !== -1) {
            me.cards.splice(actualIndex, 1); 
        }
    }
    if(activeHole) {
        let pCards = {};
        if (activeHole.playedCards) {
            let oldCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            oldCards.filter(Boolean).forEach((c, i) => { pCards['old_'+i] = c; });
        }
        
        let cKey = 'c_' + timestamp + '_' + Math.floor(Math.random()*1000);
        pCards[cKey] = { 
            cardId: card.id || 'err_id',
            cardName: card.def.n || 'Nimetön', 
            cardDesc: card.def.d || '-', 
            target: targetName || 'Joku', 
            by: myName || 'Joku', 
            type: card.def.type || 'sabotage', 
            tier: card.def.tier || 'normal',
            timestamp: timestamp 
        };
        activeHole.playedCards = pCards;
    }
    
    let updates = {};
    updates['gameState/players'] = window.cleanFirebaseData(allPlayers);
    if(activeHole) { 
        updates['gameState/activeHole/playedCards'] = window.cleanFirebaseData(activeHole.playedCards); 
    }
    update(ref(db), updates);
    
    window.logEvent(`${myName} pelasi kortin ${card.def.n} kohteelle ${targetName}.`);
    
    let type = card.def.type === 'buff' ? 'info' : 'debuff';
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, type);
};

window.undoCardPlay = function(timestamp) {
    if(!confirm("Palautetaanko kortti takaisin pelaajan käteen ja perutaan vaikutus?")) { return; }
    if(!activeHole || !activeHole.playedCards) { return; }
    
    let pCards = activeHole.playedCards;
    if (Array.isArray(pCards)) {
        let temp = {};
        pCards.filter(Boolean).forEach((c, i) => { temp['old_'+i] = c; });
        pCards = temp;
    }

    let targetKey = Object.keys(pCards).find(k => pCards[k] && pCards[k].timestamp === timestamp);
    if (!targetKey) { return; }
    
    let pc = pCards[targetKey];
    let cardDef = window.allCards.find(c => c.n === pc.cardName);
    let cId = pc.cardId || (cardDef ? cardDef.id : null);
    
    let player = allPlayers.find(p => p && p.name === pc.by);
    if (player && cId) {
        player.cards = player.cards ? (Array.isArray(player.cards) ? player.cards : Object.values(player.cards)) : [];
        player.cards.push(cId);
    }
    
    delete pCards[targetKey];
    activeHole.playedCards = pCards;
    
    let updates = {};
    updates['gameState/players'] = window.cleanFirebaseData(allPlayers);
    updates['gameState/activeHole/playedCards'] = window.cleanFirebaseData(activeHole.playedCards);
    update(ref(db), updates);
    
    window.logEvent(`${myName} (GM) perui kortin ${cardDef ? cardDef.n : ''} vaikutuksen.`);
    window.showNotification("Kortti palautettu onnistuneesti!", "info");
};

//==============================================
// 6. FIREBASE ONVALUE KUUNTELIJA
//==============================================

onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    
    if(!data) {
        if(myName) {
            myName = null;
            localStorage.removeItem('friba_name');
            window.updateIdentityUI();
            if(el('handModal')) { el('handModal').style.display = 'none'; }
            if(el('shopModal')) { el('shopModal').style.display = 'none'; }
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
            if(el('handModal')) { el('handModal').style.display = 'none'; }
            if(el('shopModal')) { el('shopModal').style.display = 'none'; }
        }
    }

    window.updateIdentityUI();
    
    const gameSetupArea = el('gameSetupArea');
    const mainGameArea = el('mainGameArea');
    
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
            // Rahan muutosilmoitus uuden Apple Toastin avulla
            if (typeof window.myLastHoleIndex === 'undefined') {
                window.myLastHoleIndex = currentHoleIndex;
                window.myLastScore = me.score || 0;
            } else if (window.myLastHoleIndex !== currentHoleIndex) {
                let diff = (me.score || 0) - window.myLastScore;
                if (diff > 0) {
                    window.showAppleToast(`+${diff} P! (Yhteensä ${me.score || 0} P)`, '💰');
                } else {
                    window.showAppleToast(`Ei pisteitä. (Yhteensä ${me.score || 0} P)`, '👍');
                }
                window.myLastHoleIndex = currentHoleIndex;
                window.myLastScore = me.score || 0;
            } else {
                window.myLastScore = me.score || 0; // Päivittää saldon jos teki ostoksia kaupassa
            }

            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
            window.renderPlayerHand(myCards.filter(Boolean));
            window.renderShop(activeHole ? activeHole.shop : null, me.score || 0, me.boughtThisHole);
            
            let pts = `${me.score || 0} P`;
            if(el('myResPointsBtn')) { el('myResPointsBtn').innerText = pts; }
            if(el('myResPointsExpanded')) { el('myResPointsExpanded').innerText = pts; }
            if(el('topWalletPoints')) { el('topWalletPoints').innerText = pts; }
            if(el('shopModalWallet')) { el('shopModalWallet').innerText = pts; }
            if(el('handCountBadge')) { el('handCountBadge').innerText = myCards.filter(Boolean).length; }
        }

        if (activeHole && activeHole.playedCards) {
            const playedCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            const myNewDebuffs = playedCards.filter(Boolean).filter(pc => pc.target === myName && pc.timestamp > lastPlayedCardTimestamp && pc.type === 'sabotage');
            
            if (myNewDebuffs.length > 0) {
                myNewDebuffs.forEach(db => {
                    window.showNotification(`💥 Sinua sabotoitiin: ${db.cardName}`, 'debuff');
                    if (navigator.vibrate) { navigator.vibrate([200, 100, 200]); }
                });
                lastPlayedCardTimestamp = Math.max(...playedCards.map(pc => pc.timestamp));
            }
        }
    }

    window.renderAdminPlayerList();
    window.renderEventLog(data.eventLog);
    window.renderScoreLog(data.scoreLog);
});

// Aja lisäosat ja generoi GM valikot
window.enableCardHover();
window.setupSwipeToClose();

window.populateRuleSelect = function() {
    const sel = el('gmRuleSelect');
    if(!sel || typeof window.holeRules === 'undefined') { return; }
    sel.innerHTML = window.holeRules.map((r, i) => `<option value="${i}">${r.n}</option>`).join('');
};
setTimeout(window.populateRuleSelect, 500);

