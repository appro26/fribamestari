window.allCards = window.allCards || [];
window.holeRules = window.holeRules || [];

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
let lastPlayedCardTimestamp = Date.now();
window.gameHistory = []; 

window.gameSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 6, ptsWin: 3, ptsTask: 2, ptsLose: 0, ptsPassive: 2 };
window.pendingShopPurchase = null;

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
const getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];

const penColors = [
    { c1: '#0284c7', c2: '#38bdf8' }, { c1: '#dc2626', c2: '#f87171' }, { c1: '#16a34a', c2: '#4ade80' },
    { c1: '#d97706', c2: '#fbbf24' }
];
const getRandomPen = () => penColors[Math.floor(Math.random() * penColors.length)];
const pseudoRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

// ==============================================
// VAPAA KAMERA
// ==============================================
let boardState = { scale: 1, x: 0, y: 0 };
let isDraggingBoard = false;
let lastBoardTouch = null;
let initialPinchDist = 0;
let camAnim = null; 
let isRendering = false;

window.applyBoardTransform = function() {
    let boardEl = el('corkboard-surface');
    if(boardEl) {
        boardEl.style.transform = `translate3d(${boardState.x}px, ${boardState.y}px, 0) scale(${boardState.scale})`;
    }
    isRendering = false;
};

window.animateCameraTo = function(tX, tY, tScale, duration=350) {
    if (camAnim) cancelAnimationFrame(camAnim);
    let sX = boardState.x; let sY = boardState.y; let sScale = boardState.scale;
    let startT = performance.now();
    
    function step(time) {
        let p = (time - startT) / duration;
        if (p >= 1) p = 1;
        let ease = 1 - Math.pow(1 - p, 3);
        boardState.x = sX + (tX - sX) * ease;
        boardState.y = sY + (tY - sY) * ease;
        boardState.scale = sScale + (tScale - sScale) * ease;
        window.applyBoardTransform();
        if (p < 1) camAnim = requestAnimationFrame(step); else camAnim = null;
    }
    camAnim = requestAnimationFrame(step);
};

window.zoomToHole = function(hIndex) {
    if(!currentCourse || !currentCourse.pars) return;
    let cols = Math.min(9, currentCourse.pars.length);
    let col = (hIndex - 1) % cols;
    let row = Math.floor((hIndex - 1) / cols);
    let cellX = 120 + col * 460; 
    let cellY = 120 + row * 1010; 
    let targetX = (window.innerWidth - 380) / 2 - cellX; 
    let targetY = 10 - cellY;
    window.animateCameraTo(targetX, targetY, 1, 400);
};

window.zoomToCurrentHole = function() { window.zoomToHole(currentHoleIndex); };

const vp = el('corkboard-viewport');
if(vp) {
    vp.addEventListener('touchstart', e => {
        if(camAnim) { cancelAnimationFrame(camAnim); camAnim = null; }
        if(e.touches.length === 1) {
            isDraggingBoard = true; lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            isDraggingBoard = true;
        }
    }, {passive: false});

    vp.addEventListener('touchmove', e => {
        if(!isDraggingBoard) return;
        e.preventDefault(); 
        if(e.touches.length === 1 && lastBoardTouch) {
            let panSpeed = 1 / Math.max(0.5, boardState.scale);
            boardState.x += (e.touches[0].clientX - lastBoardTouch.x) * panSpeed;
            boardState.y += (e.touches[0].clientY - lastBoardTouch.y) * panSpeed;
            lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let scaleDiff = dist / initialPinchDist;
            boardState.scale *= scaleDiff;
            initialPinchDist = dist;
        }
        if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
    }, {passive: false});

    vp.addEventListener('touchend', e => {
        isDraggingBoard = false; lastBoardTouch = null;
        if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
    }, {passive: true});
}

// ==============================================
// KORTTIMOOTTORI (PELUUMAKSUT: 2/4/6 P)
// ==============================================
window.getCardPlayCost = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if (!cDef) return 0;
    if (cDef.level === 1) return 2;
    if (cDef.level === 2) return 4;
    if (cDef.level === 3) return 6;
    return 0;
};

window.getGlobalLockedFamilies = function(playersArray, currentActiveHole) {
    let locked = new Set();
    (playersArray || []).forEach(p => {
        (p.cards || []).forEach(cId => { let def = window.allCards.find(c=>c.id===cId); if(def) locked.add(def.family); });
        (p.reservations || []).forEach(cId => { let def = window.allCards.find(c=>c.id===cId); if(def) locked.add(def.family); });
    });
    if(currentActiveHole && currentActiveHole.shop) {
        Object.values(currentActiveHole.shop).forEach(sArr => { sArr.forEach(cDef => { if(cDef) locked.add(cDef.family); }); });
    }
    return locked;
};

window.drawSpecificCard = function(type, maxLevel, lockedFamilies) {
    let pool = window.allCards.filter(c => c.type === type && c.level <= maxLevel && !lockedFamilies.has(c.family));
    if(pool.length === 0) pool = window.allCards.filter(c => c.type === type && !lockedFamilies.has(c.family)); 
    if(pool.length === 0) return null; 

    let picked = pool[Math.floor(Math.random() * pool.length)];
    lockedFamilies.add(picked.family); 
    return picked.id;
};

window.generatePersonalShop = function(lockedFamilies) {
    let shop = [];
    let levelsToDraw = [3, 3, 2, 2, 1, 1];
    levelsToDraw.forEach(lvl => {
        let pool = window.allCards.filter(c => c.level === lvl && !lockedFamilies.has(c.family));
        if(pool.length > 0) {
            let picked = pool[Math.floor(Math.random() * pool.length)];
            shop.push(picked);
            lockedFamilies.add(picked.family);
        } else {
            shop.push(null); // Empty slot if no cards available for that level
        }
    });
    return shop;
};

window.getCardSortWeight = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return 5;
    if(cDef.level === 3) return 1;
    if(cDef.level === 2) return 2;
    return 4;
};

// ==============================================
// RENDERÖINTI (TAULU & KUITIT)
// ==============================================
window.showEventCard = function(cId, target, by) {
    window.carouselCards = [cId];
    window.carouselCurrentMode = 'event';
    window.carouselCurrentIndex = 0;
    window.renderCarousel();
    let targetStr = target ? `<div style="background:var(--danger); color:#fff; padding:15px; border-radius:8px; font-weight:900; font-size:1.2rem; text-align:center; margin-bottom:10px;">SUORITTAJA:<br><span style="font-size:1.8rem; font-family:'Kalam', cursive;">${target}</span></div>` : '';
    el('cardDetailActionArea').innerHTML = targetStr;
    window.showModalSafe('cardDetailModal');
    setTimeout(() => { window.initNativeCarousel(); }, 100);
};

window.getHoleCellHTML = function(hData, hIndex, isActive, isHistory) {
    let clickAttr = `onclick="window.zoomToHole(${hIndex})" style="cursor:pointer;"`;
    let html = `<div class="hole-cell" ${clickAttr}>`;
    let par = currentCourse.pars ? (currentCourse.pars[hIndex - 1] || 3) : 3;
    
    let activeStyle = isActive ? `z-index: 25;` : `z-index: 5;`;
    html += `<div class="index-card" style="transform: rotate(${(pseudoRandom(hIndex)*6-3).toFixed(1)}deg); position: relative; ${activeStyle}">`;
    html += `<div class="banner-subtitle">${currentCourse.name}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div><span class="banner-par">PAR <span>${par}</span></span></div>`;
    html += `</div>`;

    if (hData.rule) {
        html += `
        <div class="post-it-note" style="background:${hData.color || '#fef08a'}; transform: rotate(${(pseudoRandom(hIndex*2)*6-3).toFixed(1)}deg);">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; color:#666;">📌 VÄYLÄSÄÄNTÖ</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: 1.15rem; line-height: 1.4; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    let playedCards = Object.values(hData.playedCards || {}).filter(Boolean);
    if(playedCards.length > 0) {
        html += `<div style="width: 100%; max-width:360px; margin-bottom: 15px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">`;
        playedCards.forEach((pc, idx) => {
            let typeClass = `tier-${pc.level || 1}`;
            html += `
            <div class="pinned-card-container" style="transform: rotate(${(pseudoRandom((hIndex+idx)*4)*10-5).toFixed(1)}deg);" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${pc.target}', '${pc.by}')">
                <div class="pushpin" style="left: 50%;"></div>
                <div class="physical-card ${typeClass}" style="width: 175px; height: 245px;">
                    <div class="card-type-tag">TASO ${pc.level || 1}</div>
                    <h3 style="font-size:1.1rem; margin-top:10px; line-height:1.1;">${pc.cardName.split(' (')[0]}</h3>
                    <div style="background:rgba(0,0,0,0.5); color:#fff; padding:4px; font-size:0.75rem; text-align:center; font-weight:bold; margin-top:auto;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    let sortedPlayers = [...(hData.players || allPlayers)].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    html += `<div class="score-spiral-note" style="transform: rotate(${(pseudoRandom(hIndex*3)*6-3).toFixed(1)}deg);">
                <h2 style="color:var(--ink-blue); font-family: 'Kalam', cursive; font-size:1.6rem;">🏆 Tulos</h2>`;
    
    sortedPlayers.forEach((p) => {
        let strokes = isHistory && hData.holeResults ? hData.holeResults[p.name] : '-';
        let displayScore = (p.name === myName) ? `${p.score || 0} P` : `?? P`;
        html += `<div class="player-row-paper"><span class="paper-name">${p.name}</span><div style="display:flex; align-items:center; gap:10px;"><span style="color:var(--warning); font-weight:900;">${displayScore}</span><div class="score-display-paper" style="min-width:34px;">${strokes}</div></div></div>`;
    });
    html += `</div></div>`;
    return html;
};

window.renderBoard = function() {
    const board = el('corkboard-surface');
    if (!board || !currentCourse) return;
    let totalHoles = currentCourse.pars.length; let cols = Math.min(9, totalHoles); let rows = Math.ceil(totalHoles / cols);
    board.style.width = `${240 + (cols * 380) + ((cols - 1) * 80)}px`; 
    board.style.height = `${240 + (rows * 950) + ((rows - 1) * 60)}px`; 
    board.style.gridTemplateColumns = `repeat(${cols}, 380px)`;
    
    let html = ``; window.gameHistory.forEach((h, index) => { html += window.getHoleCellHTML(h, index + 1, false, true); });
    if (activeHole && currentHoleIndex <= totalHoles) { html += window.getHoleCellHTML({ rule: activeHole.rule, playedCards: activeHole.playedCards, color: activeHole.color, players: allPlayers }, currentHoleIndex, true, false); }
    board.innerHTML = html;
};

window.renderReceipt = function() {
    if(!allPlayers || allPlayers.length === 0 || !currentCourse) return;
    let generateTotals = (isMini) => { let html = ``; [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)).forEach(p => { html += `<div class="r-row" style="font-size:${isMini ? '1.3rem' : '1.8rem'};"><span>${p.name.substring(0, 12)}</span><span>${p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore)}</span></div>`; }); return html; };
    if(el('receipt-full-content')) { el('receipt-full-content').innerHTML = `<div class="r-title" style="font-size:1.5rem; margin-bottom:15px;">TULOKSET</div><div class="r-tot-sec" style="margin-top:10px; border-top: 2px dashed #111; padding-top:10px;">${generateTotals(false)}</div>`; }
};

// ==============================================
// KORTTIEN PELAAMINEN, UPGRADE & KAUPPA
// ==============================================
window.openTargetModal = function(cardId) {
    const cardDef = window.allCards.find(c => c && c.id === cardId);
    const me = (allPlayers || []).find(p => p && p.name === myName);
    
    if (me.upgradedThisHole && me.upgradedThisHole.includes(cardId)) {
        alert("⚠️ JÄÄHYLLÄ! Et voi pelata korttia samalla väylällä, jolla se päivitettiin."); return;
    }

    let cost = window.getCardPlayCost(cardId);
    if (cost > 0 && me.score < cost) { alert(`Ei varaa! Tarvitset ${cost} P pelataksesi tämän kortin.`); return; }

    window.pendingCardPlay = { id: cardId, def: cardDef, cost: cost };
    if(cardDef.type === 'buff') { window.executeCardPlay(myName); return; }
    
    let opponents = (allPlayers || []).filter(p => p && p.name !== myName);
    if (opponents.length === 1) { window.executeCardPlay(opponents[0].name); return; }
    
    el('targetCardName').innerText = cardDef.n; 
    el('targetPlayerList').innerHTML = opponents.map(p => `<button class="btn btn-secondary glass-card" style="width:100%; padding:20px; font-weight:900; font-size:1.3rem; margin-bottom:12px;" onclick="window.executeCardPlay('${p.name.replace(/"/g, '&quot;')}')">${p.name}</button>`).join('');
    window.showModalSafe('targetModal');
};

window.executeCardPlay = function(targetName) {
    if(!window.pendingCardPlay) return; 
    const card = window.pendingCardPlay; const timestamp = Date.now();
    el('targetModal').style.display = 'none'; window.closeShopModal();
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    
    if(me && me.cards) { 
        let idx = me.cards.indexOf(card.id);
        if (idx !== -1) me.cards.splice(idx, 1); 
        if (card.cost > 0) { me.score -= card.cost; window.logScore(myName, -card.cost, `Pelasi kortin`); window.showAppleToast(`-${card.cost} P`, '💸'); }
    }
    
    let pCards = {};
    if(activeHole) {
        if (activeHole.playedCards) Object.values(activeHole.playedCards).filter(Boolean).forEach((c, i) => { pCards['old_'+i] = c; });
        pCards['c_'+timestamp] = { cardId: card.id, cardName: card.def.n, cardDesc: card.def.d, target: targetName, by: myName, type: card.def.type, level: card.def.level, mech: card.def.mech || null, timestamp: timestamp };
    }
    
    update(ref(db), { 'gameState/players': nextPlayers, 'gameState/activeHole/playedCards': pCards });
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, 'info');
};

window.upgradeCard = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    let nextDef = window.allCards.find(c => c.id === cDef.nextId);
    let cost = (cDef.level === 1) ? 3 : 5;
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    
    if(me.score < cost) { alert("Ei tarpeeksi P-rahaa päivitykseen!"); return; }
    
    me.score -= cost;
    let idx = me.cards.indexOf(cId);
    if(idx !== -1) me.cards[idx] = nextDef.id;
    
    me.upgradedThisHole = me.upgradedThisHole || [];
    me.upgradedThisHole.push(nextDef.id);
    
    update(ref(db), { 'gameState/players': nextPlayers });
    window.logScore(myName, -cost, `Päivitti kortin tasolle ${nextDef.level}`);
    
    // Jos olemme karusellissa, päivitetään se näyttämään uusi kortti!
    if(document.getElementById('cardDetailModal').style.display !== 'none') {
        window.openCardDetail(nextDef.id, window.carouselCurrentMode);
    }
};

window.forceDiscard = function(cId) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p.name === myName);
    
    let cDef = window.allCards.find(c => c.id === cId);
    let idx = me.cards.indexOf(cId);
    if(idx !== -1) {
        me.cards.splice(idx, 1);
        let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
        me.score = (parseInt(me.score) || 0) + sellReward; 
        window.showAppleToast(`+${sellReward} P (Myyty)`, '💰'); 
    }
    
    if (window.pendingShopPurchase) {
        let pId = window.pendingShopPurchase.id; let pPrice = window.pendingShopPurchase.price; let isRes = window.pendingShopPurchase.isRes;
        if (me.score >= pPrice) {
            me.score -= pPrice; me.cards.push(pId);
            if (isRes) {
                let rIdx = me.reservations.indexOf(pId);
                if (rIdx !== -1) me.reservations.splice(rIdx, 1);
            } else {
                let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
                if (nextShopAll[myName]) {
                    const sIdx = nextShopAll[myName].findIndex(i => i && i.id === pId);
                    if (sIdx !== -1) nextShopAll[myName][sIdx] = null; // Jätetään tyhjäksi (null) kauppaan
                }
                update(ref(db, 'gameState/activeHole/shop'), nextShopAll);
            }
            window.pendingShopPurchase = null; window.switchShopTab('sell');
        } else { window.pendingShopPurchase = null; }
    }
    update(ref(db, 'gameState/players'), nextPlayers);
    if(document.getElementById('cardDetailModal')) document.getElementById('cardDetailModal').style.display='none';
};

window.reserveShopItem = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    
    me.reservations = me.reservations || [];
    if (me.reservations.length >= 2) { alert("Voit pitää vain 2 varausta kerrallaan!"); return; }
    me.reservations.push(idStr);
    
    let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
    if (nextShopAll[myName]) {
        const sIdx = nextShopAll[myName].findIndex(i => i && i.id === idStr);
        if (sIdx !== -1) nextShopAll[myName][sIdx] = null; // Automaattiin jää tyhjä jousi
    }
    update(ref(db), { 'gameState/players': nextPlayers, 'gameState/activeHole/shop': nextShopAll });
    window.showAppleToast('Kortti varattu', '🔒');
};

window.cancelReservation = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    if (!me || !me.reservations) return; 

    let rIdx = me.reservations.indexOf(idStr);
    if (rIdx !== -1) {
        me.reservations.splice(rIdx, 1);
        let cDef = window.allCards.find(c => c.id === idStr);
        let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
        if (nextShopAll[myName]) { nextShopAll[myName].push(cDef); }
        update(ref(db), { 'gameState/players': nextPlayers, 'gameState/activeHole/shop': nextShopAll });
    }
};

window.buyShopItem = function(idStr, priceVal, isReservation) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    if (!me || me.score < priceVal) return;

    let limit = window.gameSettings.handLimit || 6;
    if (me.cards && me.cards.length >= limit) {
        let nameStr = window.allCards.find(c=>c.id===idStr).n;
        window.pendingShopPurchase = { id: idStr, name: nameStr, price: priceVal, isRes: isReservation };
        window.switchShopTab('sell'); return;
    }

    me.score -= priceVal;
    me.cards = me.cards || []; me.cards.push(idStr);
    
    let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {})); 
    if (isReservation) {
        let rIdx = me.reservations.indexOf(idStr);
        if(rIdx !== -1) me.reservations.splice(rIdx, 1);
    } else {
        if (nextShopAll[myName]) {
            const sIdx = nextShopAll[myName].findIndex(i => i && i.id === idStr);
            if (sIdx !== -1) nextShopAll[myName][sIdx] = null; // Poistetaan automaatista
        }
    }

    update(ref(db), { 'gameState/players': nextPlayers, 'gameState/activeHole/shop': nextShopAll });
    window.switchShopTab('sell');
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null; window.switchShopTab('buy');
};

window.openShop = function(tab) {
    window.showModalSafe('shopModal', 'block');
    if(window.switchShopTab) window.switchShopTab(tab);
};
window.closeShopModal = function() {
    window.pendingShopPurchase = null; if(el('shopModal')) el('shopModal').style.display = 'none';
};

window.switchShopTab = function(tab) {
    if (tab === 'buy') {
        window.pendingShopPurchase = null; 
        el('shopBuyArea').style.display = 'block'; el('shopSellArea').style.display = 'none';
        el('shopTabBuyBtn').classList.add('active'); el('shopTabSellBtn').classList.remove('active');
    } else {
        el('shopBuyArea').style.display = 'none'; el('shopSellArea').style.display = 'block';
        el('shopTabBuyBtn').classList.remove('active'); el('shopTabSellBtn').classList.add('active');
    }
    let me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me ? me.reservations : [], me ? me.score : 0);
};

window.renderShop = function(shopArray, resArray, myPoints) {
    let me = (allPlayers || []).find(p => p && p.name === myName);

    // =====================================
    // 1. VÄLIPALA-AUTOMAATTI (KAUPPA)
    // =====================================
    let shelvesHtml = '';
    let actRes = (resArray || []).filter(Boolean);
    let levels = [3, 2, 1]; // T3 ylin, T1 alin

    // Renderöidään ensin varaukset aivan ylimmäksi omalle hyllylleen, jos niitä on
    if(actRes.length > 0) {
        shelvesHtml += `<div class="vending-shelf" style="border-bottom:4px solid #ef4444;">`;
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            let btnClass = canAfford ? 'btn-warning' : 'btn-secondary';
            
            shelvesHtml += `
                <div class="vending-slot">
                    <div class="physical-card tier-${resItem.level}" style="width:140px; height:200px; transform: scale(0.9);">
                        <div class="card-type-tag" style="background:#ef4444;">🔒 VARATTU</div>
                        <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${resItem.n.split(' (')[0]}</h3>
                        <p style="font-size:0.65rem; line-height:1.1; overflow-y:auto;">${resItem.d}</p>
                        <div style="background:#111; color:#fff; font-size:0.6rem; padding:2px; text-align:center; font-weight:bold; margin-top:auto;">MAKSU: ${window.getCardPlayCost(resItem.id)} P</div>
                    </div>
                    <div class="vending-coil"></div>
                    <div class="vending-price-tag" style="background:#ef4444; border-color:#ef4444; color:#fff;">${resItem.price} P</div>
                    <div style="display:flex; gap:5px; margin-top:5px; width:140px; transform:scale(0.9);">
                        <button class="btn ${btnClass}" ${!canAfford?'disabled':''} style="flex:1; padding:5px; font-size:0.8rem; margin:0;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">OSTA</button>
                        <button class="btn btn-info" style="padding:5px; font-size:0.8rem; margin:0;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        // Täytetään tyhjät paikat
        if(actRes.length === 1) shelvesHtml += `<div class="vending-slot"><div style="width:140px; height:200px;"></div></div>`;
        shelvesHtml += `</div>`;
    }

    levels.forEach(lvl => {
        shelvesHtml += `<div class="vending-shelf">`;
        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                
                shelvesHtml += `
                    <div class="vending-slot">
                        <div class="physical-card tier-${item.level}" style="width:140px; height:200px; transform: scale(0.9); cursor:pointer;" onclick="window.openCardDetail('${item.id}', 'shop')">
                            <div class="card-type-tag">TASO ${item.level}</div>
                            <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${item.n.split(' (')[0]}</h3>
                            <p style="font-size:0.65rem; line-height:1.1; overflow-y:auto;">${item.d}</p>
                            <div style="background:#111; color:#fff; font-size:0.6rem; padding:2px; text-align:center; font-weight:bold; margin-top:auto;">MAKSU: ${window.getCardPlayCost(item.id)} P</div>
                        </div>
                        <div class="vending-coil"></div>
                        <div class="vending-price-tag">${item.price} P</div>
                        <div style="display:flex; gap:5px; margin-top:5px; width:140px; transform:scale(0.9);">
                            <button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" ${!canAfford?'disabled':''} style="flex:1; padding:5px; font-size:0.8rem; margin:0;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-secondary" style="padding:5px; font-size:0.8rem; margin:0; background:rgba(255,255,255,0.2);" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                // Tyhjä paikka (Kortti on ostettu tai varattu)
                shelvesHtml += `
                    <div class="vending-slot">
                        <div style="width:140px; height:200px; display:flex; align-items:center; justify-content:center;">
                            <div class="empty-slot-text">TYHJÄ</div>
                        </div>
                        <div class="vending-coil"></div>
                        <div class="vending-price-tag" style="background:#333; color:#666; border-color:#666;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });
    
    if (el('vendingShelves')) el('vendingShelves').innerHTML = shelvesHtml;

    // =====================================
    // 2. KORTTIKANSIO (2 Rinnakkain)
    // =====================================
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    myCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));

    let sellHtml = '';
    if(myCards.length === 0) {
         sellHtml = '<p style="color:var(--text-muted); font-size:1.1rem; text-align:center; padding:20px; font-weight:bold; grid-column: 1 / -1;">Kansiosi on tyhjä.</p>';
    } else {
        myCards.forEach((cId) => {
            const cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let typeClass = `tier-${cDef.level}`;
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let playCost = window.getCardPlayCost(cId);
            
            sellHtml += `
            <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); display:flex; flex-direction:column;">
                <div class="physical-card ${typeClass}" style="width: 100%; height: 200px; margin: 0 auto; margin-bottom:10px; ${isLocked ? 'opacity:0.6;' : ''} cursor:pointer;" onclick="window.openCardDetail('${cId}', 'sell')">
                    <div class="play-cost-badge">MAKSU: ${playCost} P</div>
                    <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${cDef.n.split(' (')[0]}</h3>
                    <p style="font-size:0.75rem; line-height:1.2; overflow-y:auto; margin-bottom:4px; flex:1;">${cDef.d}</p>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:#111; margin-top:auto; padding-top:5px;">🔄 KÄÄNNÄ (UPGRADE)</div>
                </div>
            </div>`;
        });
    }
    if (el('shopSellCardsContainer')) el('shopSellCardsContainer').innerHTML = sellHtml;
    
    // Käsirajan varoitukset
    let alertEl = el('pendingPurchaseAlert');
    if (alertEl) {
        let limit = window.gameSettings.handLimit || 6;
        if (window.pendingShopPurchase) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSI TÄYNNÄ!</div><p>Haluat ostaa: <strong>${window.pendingShopPurchase.name}</strong>. Myy yksi kortti alta, niin osto suoritetaan!</p><button class="btn btn-secondary" style="padding:10px;" onclick="window.cancelShopPurchase()">PERUUTA OSTO</button>`;
        } else if (myCards.length > limit) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSIRAJA YLITETTY!</div><p>Kortteja ${myCards.length}/${limit}. Myy kortteja!</p>`;
        } else {
            alertEl.style.display = 'none';
        }
    }
};

//==============================================
// TURVALLINEN KARUSELLI Z-PÄIVITYKSELLÄ
//==============================================
window.isFlipping = false;
window.flippedCards = new Set();

window.forceCarouselLayoutUpdate = function() {
    const container = el('cardCarousel');
    if(!container) return;
    const cards = Array.from(container.querySelectorAll('.carousel-card-wrapper'));
    const scrollLeft = container.scrollLeft; 
    const centerOffset = (container.clientWidth || window.innerWidth) / 2; 
    const cardWidth = 320; const paddingLeft = centerOffset - (cardWidth / 2); 
    
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const diff = ((paddingLeft + (i * cardWidth) + (cardWidth / 2) - scrollLeft) - centerOffset) / 160; 
        card.style.transform = `translate3d(${diff * -40}px, ${Math.abs(diff) * 20}px, ${Math.abs(diff) * -150}px) rotateZ(${diff * 5}deg) scale(${Math.max(0.85, 1 - Math.abs(diff) * 0.15)})`;
        card.style.zIndex = 100 - Math.floor(Math.abs(diff)*10);
    }
};

window.flipCard = function(index) {
    if(window.isFlipping) return;
    const inner = el(`card3d-inner-${index}`);
    if (!inner) return;
    
    window.isFlipping = true;
    let cId = window.carouselCards[index];
    
    if (!window.flippedCards.has(cId)) { window.flippedCards.add(cId); inner.classList.add('flipped'); } 
    else { window.flippedCards.delete(cId); inner.classList.remove('flipped'); }
    
    setTimeout(() => { window.isFlipping = false; }, 300); 
};

window.renderCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    let me = (allPlayers || []).find(p => p && p.name === myName);
    let myScore = me ? (me.score || 0) : 0;
    
    let html = '';
    window.carouselCards.forEach((cId, i) => {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(!cDef) return;
        let typeClass = `tier-${cDef.level}`;
        let flippedClass = window.flippedCards.has(cId) ? 'flipped' : '';
        let playCost = window.getCardPlayCost(cId);
        
        let backHtml = '';
        if (cDef.nextId && cDef.upgradeDesc) {
            let upgCost = cDef.level === 1 ? 3 : 5;
            let canUpg = myScore >= upgCost;
            backHtml = `
                <div style="background:#1e293b; border:4px solid #475569; width:100%; height:100%; border-radius:12px; display:flex; flex-direction:column; padding:20px; box-sizing:border-box; color:#fff; align-items:center; justify-content:center;">
                    <div style="font-size:1.5rem; font-weight:900; color:var(--warning); margin-bottom:20px;">UPGRADE TASOLLE ${cDef.level + 1}</div>
                    <div style="font-size:1.1rem; line-height:1.4; text-align:center; margin-bottom:30px;">${cDef.upgradeDesc.split(':')[1]}</div>
                    <button class="btn ${canUpg ? 'btn-warning' : 'btn-secondary'}" ${!canUpg ? 'disabled' : ''} style="width:100%; padding:20px; font-size:1.2rem; color:#000; font-weight:900;" onclick="event.stopPropagation(); window.upgradeCard('${cId}')">OSTA PÄIVITYS (${upgCost} P)</button>
                </div>`;
        } else {
            backHtml = `<div style="background:#1e293b; border:4px solid #475569; width:100%; height:100%; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column; color:#fff;"><div class="card-back-icon">💎</div><div style="font-weight:900; font-size:2rem; margin-top:20px; letter-spacing:3px;">MAKSIMITASO</div></div>`;
        }
        
        html += `
            <div class="carousel-card-wrapper" data-id="${cId}" onclick="window.flipCard(${i})">
                <div class="card-3d-inner ${flippedClass}" id="card3d-inner-${i}">
                    <div class="card-face card-front ${typeClass}">
                        <div style="text-align:left; display:flex; flex-direction:column; height:100%; position:relative; z-index:20;">
                            <div class="play-cost-badge">PELUUMAKSU: ${playCost} P</div>
                            <div class="card-type-tag" style="font-size:1.1rem; margin-bottom:8px;">TASO ${cDef.level}</div>
                            <h3 style="font-size:2rem; margin-bottom:15px; line-height:1.1;">${cDef.n.split(' (')[0]}</h3>
                            <p style="font-size:1.1rem; font-weight:800; line-height:1.3; overflow-y:auto;">${cDef.d}</p>
                            <div style="text-align:center; font-weight:900; color:#111; margin-top:auto; padding-bottom:10px;">🔄 KÄÄNNÄ PÄIVITTÄÄKSESI</div>
                        </div>
                    </div>
                    <div class="card-face card-back" style="pointer-events: auto;">
                        ${backHtml}
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
};

window.openCardDetail = function(cId, mode) {
    const me = (allPlayers || []).find(p => p && p.name === myName);
    window.flippedCards = new Set();
    
    if (mode === 'sell') {
        window.carouselCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
        window.carouselCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));
    } else { window.carouselCards = [cId]; }
    
    window.carouselCurrentMode = mode;
    window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.renderCarousel(); 
    window.showModalSafe('cardDetailModal');
    
    let btnHtml = '';
    if (mode === 'sell') {
        let cDef = window.allCards.find(c => c && c.id === window.carouselCards[window.carouselCurrentIndex]);
        if(cDef) {
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cDef.id);
            let playCost = window.getCardPlayCost(cDef.id);
            let canPlay = me.score >= playCost && !isLocked;
            let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
            
            btnHtml += `<button class="btn ${canPlay ? 'btn-success' : 'btn-secondary'}" ${!canPlay ? 'disabled' : ''} style="font-size:1.2rem; padding:20px; box-shadow:0 4px 15px rgba(16,185,129,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cDef.id}')">PELAA (${playCost} P)</button>`;
            btnHtml += `<button class="btn btn-danger" style="font-size:1.1rem; padding:15px; margin-top:10px;" onclick="window.forceDiscard('${cDef.id}')">♻️ MYY (+${sellReward} P)</button>`;
        }
    } else if (mode === 'shop') {
        let cDef = window.allCards.find(c => c && c.id === window.carouselCards[window.carouselCurrentIndex]);
        if(cDef) {
            let canAfford = me.score >= cDef.price;
            btnHtml += `<button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" ${!canAfford ? 'disabled' : ''} style="font-size:1.2rem; padding:20px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cDef.id}', ${cDef.price}, false)">OSTA (${cDef.price} P)</button>`;
        }
    }
    btnHtml += `<button class="btn btn-secondary glass-card" style="margin-top:15px;" onclick="document.getElementById('cardDetailModal').style.display='none'">SULJE</button>`;
    el('cardDetailActionArea').innerHTML = btnHtml;
    
    setTimeout(() => {
        window.initNativeCarousel();
        const container = el('cardCarousel');
        if(container) { container.scrollLeft = (window.carouselCurrentIndex * 320); window.forceCarouselLayoutUpdate(); }
    }, 50);
};

// ==============================================
// SCORE SYÖTTÖ, TALOUS JA VETO (Automatisoitu)
// ==============================================
window.changeScore = function(safeId, par, delta) {
    let input = el(`scoreInput_${safeId}`); if(!input) return; 
    let val = Math.max(1, parseInt(input.value) + delta); 
    input.value = val;
    let display = el(`scoreDisplay_${safeId}`);
    if(display) { display.innerText = val; display.className = 'score-display-paper'; if(val < par) display.classList.add('score-birdie-paper'); else if(val > par) display.classList.add('score-bogey-paper'); }
};

window.openScoreModal = function() {
    let par = currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    el('scoreModalHoleNum').innerText = currentHoleIndex; el('scoreModalPar').innerText = par; 
    
    let html = ''; let taskCheckboxes = '';
    (allPlayers || []).forEach((p, i) => {
        if(!p) return; let safeId = "player_" + i; 
        taskCheckboxes += `<label class="task-paper-label"><input type="checkbox" class="task-paper-checkbox" data-name="${p.name}" /> ${p.name}</label>`;
        html += `<div class="score-row-paper"><span class="score-name-paper">${p.name}</span><div class="score-controls-paper"><button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button><div id="scoreDisplay_${safeId}" class="score-display-paper">${par}</div><button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button><input type="hidden" class="score-input-data" data-name="${p.name}" id="scoreInput_${safeId}" value="${par}" /></div></div>`;
    });
    el('scoreInputsContainer').innerHTML = html; el('taskWinnerContainer').innerHTML = taskCheckboxes; 
    window.showModalSafe('scoreModal');
};

window.submitScores = function() {
    let par = currentCourse.pars[currentHoleIndex - 1] || 3;
    let playerResults = {};
    (allPlayers || []).forEach(p => { if(p) playerResults[p.name] = { strokes: par, taskWon: false }; });
    
    document.querySelectorAll('.score-input-data').forEach(input => { if(playerResults[input.getAttribute('data-name')]) playerResults[input.getAttribute('data-name')].strokes = parseInt(input.value, 10) || par; });
    document.querySelectorAll('.task-paper-checkbox:checked').forEach(cb => { if(playerResults[cb.getAttribute('data-name')]) playerResults[cb.getAttribute('data-name')].taskWon = true; });

    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    let ptsWin = 3; let ptsTask = 2; let ptsPassive = 2; let limit = 6;
    let globalLocked = window.getGlobalLockedFamilies(nextPlayers, activeHole);

    // Kuka voitti väylän?
    let minStrokes = 999;
    for (let key in playerResults) { if (playerResults[key].strokes < minStrokes) minStrokes = playerResults[key].strokes; }
    let holeWinners = [];
    for (let key in playerResults) { if (playerResults[key].strokes === minStrokes) holeWinners.push(key); }

    nextPlayers.forEach(p => {
        let res = playerResults[p.name];
        p.dgScore = (parseInt(p.dgScore) || 0) + (res.strokes - par);
        
        let currentPoints = parseInt(p.score) || 0;
        p.reservations = p.reservations || [];
        if (p.reservations.length > 0) currentPoints -= p.reservations.length; // -1P per varaus
        
        currentPoints += ptsPassive; 
        if (holeWinners.includes(p.name)) currentPoints += (holeWinners.length > 1) ? Math.floor(ptsWin * 0.66) : ptsWin;
        if (res.taskWon) currentPoints += ptsTask;
        
        p.score = currentPoints;
        p.upgradedThisHole = []; // Jäähy ohi
        
        p.cards = p.cards || [];
        if (p.cards.length < limit) {
            let sId = window.drawSpecificCard('sabotage', 2, globalLocked);
            if (sId) p.cards.push(sId);
        }
        if (p.cards.length < limit) {
            let bId = window.drawSpecificCard('buff', 2, globalLocked);
            if (bId) p.cards.push(bId);
        }
    });

    let nextActiveHole = { rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], shop: {}, playedCards: {}, timestamp: Date.now(), color: getRandomColor(), penColor: getRandomPen() };
    nextPlayers.forEach(p => { nextActiveHole.shop[p.name] = window.generatePersonalShop(globalLocked); });
    
    let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
    let holeStrokes = {}; for (let key in playerResults) { holeStrokes[key] = playerResults[key].strokes; }
    nextHistory.push({ rule: activeHole.rule, playedCards: activeHole.playedCards, color: activeHole.color, holeResults: holeStrokes, players: JSON.parse(JSON.stringify(nextPlayers)) });
    
    update(ref(db), { 'gameState/players': nextPlayers, 'gameState/currentHoleIndex': currentHoleIndex + 1, 'gameState/activeHole': nextActiveHole, 'gameState/history': nextHistory });
    el('scoreModal').style.display = 'none'; 
};

// ==============================================
// GM-TOIMINNOT
// ==============================================
window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextPlayers = (allPlayers||[]).filter(Boolean).map(p => { return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; });
    let globalLocked = new Set();
    nextPlayers.forEach(p => {
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked); let bId = window.drawSpecificCard('buff', 1, globalLocked);
        if(sId) p.cards.push(sId); if(bId) p.cards.push(bId);
    });
    let personalizedShop = {};
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    let nextActiveHole = { rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], shop: personalizedShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor() };
    update(ref(db, 'gameState'), { course: nextCourse, currentHoleIndex: 1, activeHole: nextActiveHole, players: nextPlayers, history: [] });
};
window.startCustomCourse = function() {
    let pars = []; for(let i=1; i<=(parseInt(el('newCourseHoles').value)||18); i++) { pars.push(parseInt(el(`parInput_${i}`).value)||3); }
    let nextCourse = { name: el('newCourseName').value.trim() || "Oma Rata", pars: pars };
    let nextPlayers = (allPlayers||[]).filter(Boolean).map(p => { return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; });
    let globalLocked = new Set();
    nextPlayers.forEach(p => {
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked); let bId = window.drawSpecificCard('buff', 1, globalLocked);
        if(sId) p.cards.push(sId); if(bId) p.cards.push(bId);
    });
    let personalizedShop = {};
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    let nextActiveHole = { rule: window.holeRules[0], shop: personalizedShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor() };
    set(ref(db, 'gameState'), { course: nextCourse, currentHoleIndex: 1, activeHole: nextActiveHole, players: nextPlayers, history: [] });
};
window.resetGame = function() {
    if (confirm("Nollaa peli?")) { set(ref(db, 'gameState'), { players: [], currentHoleIndex: 1, course: null }).then(() => { localStorage.clear(); location.reload(); }); }
};

window.claimIdentity = function() { let n = el('playerNameInput').value.trim(); if(!n) return; myName = n; localStorage.setItem('friba_name', n); window.updateIdentityUI(); if(!(allPlayers || []).find(x => x && x.name === n)) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }); set(ref(db, 'gameState/players'), nextPlayers); } };
window.updateIdentityUI = function() { if(el('identityCard')) el('identityCard').style.display = myName ? 'none' : 'block'; };

// =============================================
// REAALIAIKAINEN DATABASE KUUNTELIJA
// =============================================
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    if(!data) {
        if(myName) { myName = null; localStorage.removeItem('friba_name'); window.updateIdentityUI(); window.closeShopModal(); }
        currentCourse = null; el('lobbyContainer').style.display = 'block'; el('corkboard-viewport').style.display = 'none'; el('pocketContainer').style.display = 'none';
        return;
    }

    window.gameHistory = data.history || [];
    allPlayers = data.players || [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;
    
    if (myName && !allPlayers.find(p => p && p.name === myName)) { myName = null; localStorage.removeItem('friba_name'); window.closeShopModal(); }
    window.updateIdentityUI();
    
    if (myName) {
        if (!currentCourse) {
            el('lobbyContainer').style.display = 'block'; el('gameSetupArea').style.display = 'block'; el('corkboard-viewport').style.display = 'none'; el('pocketContainer').style.display = 'none';
        } else {
            el('lobbyContainer').style.display = 'none'; el('corkboard-viewport').style.display = 'block'; el('pocketContainer').style.display = 'flex';
        }
    } else {
        el('lobbyContainer').style.display = 'block'; el('gameSetupArea').style.display = 'none'; el('corkboard-viewport').style.display = 'none'; el('pocketContainer').style.display = 'none';
    }

    window.renderBoard(); window.renderReceipt();
    
    if (myName && currentCourse) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            if (typeof window.myLastHoleIndex === 'undefined' || window.myLastHoleIndex !== currentHoleIndex) {
                window.myLastHoleIndex = currentHoleIndex; setTimeout(() => { if(window.zoomToHole) window.zoomToHole(currentHoleIndex); }, 600);
            }
            window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me.reservations, me.score || 0);
            let myCards = me.cards || [];
            if (myCards.length > 6) { window.showHandLimitModal(myCards); } else { if(el('handLimitModal')) el('handLimitModal').style.display = 'none'; }
            el('myResPointsBtn').innerText = `${me.score || 0} P`; el('shopModalWallet').innerText = `${me.score || 0} P`; el('handCountBadge').innerText = `${myCards.length} / 6`; 
        }
    }
});
