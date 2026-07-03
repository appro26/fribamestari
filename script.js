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
window.gameDecks = { rules: [] };

window.gameSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 6, ptsWin: 3, ptsTask: 2, ptsLose: 0, ptsPassive: 2 };
window.pendingShopPurchase = null;

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
const getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];

const penColors = [
    { c1: '#0284c7', c2: '#38bdf8' }, { c1: '#dc2626', c2: '#f87171' }, { c1: '#16a34a', c2: '#4ade80' },
    { c1: '#d97706', c2: '#fbbf24' }, { c1: '#9333ea', c2: '#c084fc' }, { c1: '#db2777', c2: '#f472b6' }, { c1: '#475569', c2: '#94a3b8' }
];
const getRandomPen = () => penColors[Math.floor(Math.random() * penColors.length)];

const pseudoRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

// ==============================================
// ELÄINTEN GRAFIIKAT JA SOLVAUKSET
// ==============================================
const doodleSVGs = [
    "M 20 80 Q 20 60 40 60 L 45 40 L 50 60 L 60 30 L 65 60 L 75 40 L 80 80 Z M 30 70 L 32 70 M 15 75 L 20 80 M 85 75 L 80 80", 
    "M 20 80 L 20 40 L 30 20 L 40 40 L 60 40 L 70 20 L 80 40 L 80 80 Z M 35 55 L 37 55 M 65 55 L 63 55 M 45 65 L 55 65 L 50 72 Z",
    "M 20 80 C 20 30 80 30 80 80 Z M 20 40 C 10 40 10 20 25 30 M 80 40 C 90 40 90 20 75 30 M 40 55 L 42 55 M 60 55 L 58 55",
    "M 50 80 C 20 80 20 30 50 30 C 80 30 80 80 50 80 Z M 40 55 L 60 55 L 50 70 Z M 35 45 L 40 48 M 65 45 L 60 48"
];

const insults = [
    "[Pelaaja], v*ttu mikä heitto, ootko sä koskaan edes pitänyt kiekkoa kädessä?",
    "[Pelaaja] p*rkele, mummonikin puttaa paremmin.",
    "S**tanan sirkkeli [Pelaaja], puut tykkää susta enemmän ku sun omat vanhemmat.",
    "Ei h*lvetti [Pelaaja], jopa Jeesus itkee ton sun tekniikan takia.",
    "P*ska veto [Pelaaja]. Sun draivi on lyhyempi ku mun kärsivällisyys.",
    "V*tun hieno lay-up [Pelaaja]! Ai se olikin sun maksimidraivi?",
    "P*rkeleen rystykääntö [Pelaaja], kiekko lensi enemmän taakse ku eteen.",
    "Miten sä [Pelaaja] v*ttu onnistut missaamaan kahdesta metristä?",
    "H*lvetin hieno puuosuma [Pelaaja]! Tähtäsitkö tahallaan vai ootko vaan sysip*ska?",
    "P*rkele [Pelaaja], sun rystyheitto näyttää ku yrittäisit heittää pesukonetta.",
    "V*tun grippilokki [Pelaaja]! Ota se käsi irti siitä muovista ajoissa.",
    "P*ska putti, p*ska pelaaja. Yksinkertaista, eikö vain [Pelaaja]?"
];

// ==============================================
// VAPAA KAMERA & OPTIMOITU KESKITYS
// ==============================================
let boardState = { scale: 1, x: 0, y: 0 };
let isDraggingBoard = false;
let lastBoardTouch = null;
let initialPinchDist = 0;
let camAnim = null; 
let boardEl = null;
let isRendering = false;

window.applyBoardTransform = function() {
    if(!boardEl) boardEl = el('corkboard-surface');
    if(boardEl) {
        if(boardEl.style.willChange !== 'transform') boardEl.style.willChange = 'transform';
        
        const vpWidth = window.innerWidth; const vpHeight = window.innerHeight;
        const bWidth = parseFloat(boardEl.style.width) || 3000;
        const bHeight = parseFloat(boardEl.style.height) || 3000;
        
        const marginX = vpWidth * 0.5; const marginY = vpHeight * 0.5;
        const minX = vpWidth - (bWidth * boardState.scale) - marginX;
        const maxX = marginX;
        const minY = vpHeight - (bHeight * boardState.scale) - marginY;
        const maxY = marginY;

        if (boardState.x > maxX) boardState.x = maxX;
        if (boardState.x < minX) boardState.x = minX;
        if (boardState.y > maxY) boardState.y = maxY;
        if (boardState.y < minY) boardState.y = minY;

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
    let totalHoles = currentCourse.pars.length;
    let cols = Math.min(9, totalHoles);
    let col = (hIndex - 1) % cols;
    let row = Math.floor((hIndex - 1) / cols);
    
    let cellX = 120 + col * 460; 
    let cellY = 120 + row * 1010; 
    
    let targetX = (window.innerWidth - 380) / 2 - cellX; 
    let targetY = 10 - cellY;
    
    if(typeof window.animateCameraTo === 'function') { window.animateCameraTo(targetX, targetY, 1, 400); }
};

window.zoomToCurrentHole = function() { window.zoomToHole(currentHoleIndex); };

const vp = el('corkboard-viewport');
if(vp) {
    vp.addEventListener('touchstart', e => {
        if(camAnim) { cancelAnimationFrame(camAnim); camAnim = null; }
        if(e.touches.length === 1) {
            isDraggingBoard = true;
            lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
            let pinchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let pinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            boardState.x -= (pinchX - boardState.x) * (scaleDiff - 1);
            boardState.y -= (pinchY - boardState.y) * (scaleDiff - 1);
            boardState.scale *= scaleDiff;
            
            if(boardState.scale < 0.35) boardState.scale = 0.35;
            if(boardState.scale > 1.8) boardState.scale = 1.8;
            initialPinchDist = dist;
        }
        if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
    }, {passive: false});

    vp.addEventListener('touchend', e => {
        if(e.touches.length < 1) {
            isDraggingBoard = false; lastBoardTouch = null;
            if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
        } else if (e.touches.length === 1) { lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    }, {passive: true});
}

let swipeStartX = 0; let swipeStartY = 0; let swipeContentEl = null; let isValidSwipeToClose = false;
document.addEventListener('DOMContentLoaded', () => {
    const handles = document.querySelectorAll('.binder-swipe-handle');
    handles.forEach(handle => {
        handle.addEventListener('touchstart', e => {
            swipeStartY = e.touches[0].clientY; swipeStartX = e.touches[0].clientX;
            swipeContentEl = handle; isValidSwipeToClose = true;
        }, {passive:true});
        handle.addEventListener('touchend', e => {
            if (swipeStartY > 0 && swipeContentEl && isValidSwipeToClose) {
                let diffY = e.changedTouches[0].clientY - swipeStartY;
                let diffX = Math.abs(e.changedTouches[0].clientX - swipeStartX);
                if (diffY > 100 && diffY > diffX * 2) {
                    if(el('shopModal')) el('shopModal').style.display = 'none';
                    window.pendingShopPurchase = null;
                }
            }
            swipeStartY = 0; swipeContentEl = null;
        }, {passive:true});
    });
});

// ==============================================
// KORTTIMOOTTORI (CONCEPT LOCKING, COST & VETO)
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
    if(pool.length === 0) pool = window.allCards.filter(c => !lockedFamilies.has(c.family)); 
    if(pool.length === 0) return null; 

    let candidates = pool;
    if(maxLevel >= 2) {
        let wantLvl = Math.random() < 0.2 ? 2 : 1;
        let lvlPool = pool.filter(c => c.level === wantLvl);
        if(lvlPool.length > 0) candidates = lvlPool;
    } else {
        let lvlPool = pool.filter(c => c.level === 1);
        if(lvlPool.length > 0) candidates = lvlPool;
    }

    let picked = candidates[Math.floor(Math.random() * candidates.length)];
    lockedFamilies.add(picked.family); 
    return picked.id;
};

window.generatePersonalShop = function(lockedFamilies) {
    let shop = [];
    let levelsToDraw = [3, 3, 2, 2, 1, 1];
    levelsToDraw.forEach(lvl => {
        let pool = window.allCards.filter(c => c.level === lvl && !lockedFamilies.has(c.family));
        if(pool.length === 0) pool = window.allCards.filter(c => !lockedFamilies.has(c.family)); 
        if(pool.length > 0) {
            let picked = pool[Math.floor(Math.random() * pool.length)];
            shop.push(picked);
            lockedFamilies.add(picked.family);
        }
    });
    return shop;
};

window.getCardSortWeight = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return 5;
    if(cDef.level === 3) return 1;
    if(cDef.level === 2) return 2;
    if(cDef.type === 'buff') return 3;
    return 4;
};

// ==============================================
// RENDERÖINTI (TAULU & KUITIT)
// ==============================================
window.showZoomModal = function(html) {
    el('zoomModalContent').innerHTML = html;
    let child = el('zoomModalContent').firstElementChild;
    if(child) {
        child.style.position = 'relative'; child.style.margin = '0 auto'; child.style.transform = 'none';
        child.style.width = '100%'; child.style.maxWidth = '90vw';
    }
    el('zoomModalContent').style.transform = `scale(${Math.min(1.1, (window.innerWidth * 0.95) / 300)})`;
    window.showModalSafe('zoomModal');
};

window.showEventCard = function(cId, target, by) {
    window.carouselCards = [cId];
    window.carouselCurrentMode = 'event';
    window.carouselCurrentIndex = 0;
    window.renderCarousel();
    let targetStr = target ? `<div style="background:var(--danger); color:#fff; padding:15px; border-radius:8px; font-weight:900; font-size:1.2rem; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.4); margin-bottom:10px;">SUORITTAJA:<br><span style="font-size:1.8rem; font-family:'Kalam', cursive;">${target}</span><div style="font-size:0.85rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div></div>` : '';
    el('cardDetailActionArea').innerHTML = targetStr;
    window.showModalSafe('cardDetailModal');
    setTimeout(() => { window.initNativeCarousel(); }, 100);
};

window.getHoleCellHTML = function(hData, hIndex, isActive, isHistory) {
    let clickAttr = `onclick="window.zoomToHole(${hIndex})" style="cursor:pointer;"`;
    let html = `<div class="hole-cell" ${clickAttr}>`;
    let par = currentCourse.pars ? (currentCourse.pars[hIndex - 1] || 3) : 3;
    
    let rot1 = (pseudoRandom(hIndex * 1.1) * 6 - 3).toFixed(1);
    let rot2 = (pseudoRandom(hIndex * 2.2) * 6 - 3).toFixed(1);
    let rot3 = (pseudoRandom(hIndex * 3.3) * 6 - 3).toFixed(1);

    let activeStyle = isActive ? `z-index: 25;` : `z-index: 5;`;
    html += `<div class="index-card" style="transform: rotate(${rot1}deg); position: relative; ${activeStyle}">`;
    html += `<div class="banner-subtitle">${currentCourse.name}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>`;
    
    if (isActive && hData.penColor) {
        html += `
        <div class="pen-container" onclick="event.stopPropagation(); window.openScoreModal();">
            <div class="pen-string"></div>
            <div class="pen-body" style="background: linear-gradient(to right, ${hData.penColor.c1}, ${hData.penColor.c2}, ${hData.penColor.c1});">
                <span class="pen-text">MERKKAA</span>
            </div>
        </div>`;
    }
    html += `</div>`;

    if (hData.rule) {
        let bTxt = hData.rule.type === 'bounty' ? `🏆 TEHTÄVÄ` : '🎲 VÄYLÄSÄÄNTÖ';
        let bgCol = hData.color || '#fef08a';
        let ruleLen = hData.rule.d.length;
        let pSize = ruleLen > 80 ? '0.95rem' : '1.15rem';
        let pLh = ruleLen > 80 ? '1.25' : '1.4';

        html += `
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg);" onclick="event.stopPropagation(); window.showZoomModal(this.outerHTML)">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: ${pSize}; line-height: ${pLh}; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    let playedCards = Object.values(hData.playedCards || {}).filter(Boolean);
    if(playedCards.length > 0) {
        let myCards = [];
        let otherCards = [];
        playedCards.forEach(pc => { if (pc.target === myName || pc.target === 'KAIKKI VASTUSTAJAT') myCards.push(pc); else otherCards.push(pc); });

        if (myCards.length > 0) {
            html += `<div style="width: 100%; max-width:360px; margin-bottom: 15px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">`;
            myCards.forEach((pc, idx) => {
                let typeClass = `tier-${pc.level || 1}`;
                let tagTxt = `TASO ${pc.level || 1}`;
                
                let cRot = (pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                
                let encodedBy = pc.by.replace(/"/g, '&quot;');
                let encodedTarget = pc.target.replace(/"/g, '&quot;');
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {d: pc.cardDesc};
                let descHtml = cDef.d;
                
                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg);" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    <div class="physical-card ${typeClass}" style="width: 175px; height: 245px;">
                        <div class="card-type-tag">${tagTxt}</div>
                        <h3 style="font-size:1.1rem; margin-top:10px; line-height:1.1;">${pc.cardName.split(' (')[0]}</h3>
                        <p style="font-size:0.75rem; line-height:1.2; overflow-y:auto; margin-bottom:4px; flex:1;">${descHtml}</p>
                        <div style="background:rgba(0,0,0,0.5); color:#fff; padding:4px; border-radius:4px; font-size:0.75rem; text-align:center; font-weight:bold; margin-top:auto;">
                            Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}<br><span style="font-weight:normal;">(${pc.by})</span>
                        </div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        if (otherCards.length > 0) {
            let pRot = (pseudoRandom(hIndex * 1.5) * 4 - 2).toFixed(1);
            html += `<div style="width: 100%; max-width:300px; margin-top: 15px; margin-bottom: 15px; position:relative; background:var(--paper-bg); padding:10px; box-shadow: 2px 4px 10px rgba(0,0,0,0.2); border-radius:2px; transform: rotate(${pRot}deg);">
                        <div class="tape tape-top" style="--rot:-2deg;"></div>
                        <h2 style="color:var(--text-main); font-size:0.95rem; margin-bottom:10px; border-bottom:2px dashed #ccc; padding-bottom:5px; font-family:'Kalam', cursive; text-align:center;">PELITAPAHTUMAT</h2>
                        <div style="display:flex; flex-direction:column; gap:6px;">`;
            otherCards.forEach((pc) => {
                let typeIcon = pc.type === 'buff' ? '🛡️' : '🚫';
                let typeColor = pc.type === 'buff' ? 'var(--info)' : 'var(--danger)';
                let encodedBy = pc.by.replace(/"/g, '&quot;');
                let encodedTarget = pc.target.replace(/"/g, '&quot;');
                
                html += `
                <div style="background:rgba(0,0,0,0.05); padding:6px; border-radius:4px; font-size:0.75rem; border-left: 4px solid ${typeColor}; cursor:pointer;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <b style="font-size:0.85rem;">${typeIcon} ${pc.cardName}</b><br>
                    <span style="color:#555;">Käyttäjä: <b>${pc.by}</b> ➡️ Kohde: <b style="color:${typeColor};">${pc.target}</b></span>
                </div>`;
            });
            html += `</div></div>`;
        }
    }

    let playersToRender = hData.players || allPlayers;
    let sortedPlayers = [...playersToRender].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    
    html += `
    <div class="score-spiral-note" style="transform: rotate(${rot3}deg);">
        <div class="pin pin-blue" style="top: 15px; right: 20px;"></div>
        <div class="pin pin-red" style="bottom: 25px; right: 15px;"></div>
        <h2 style="color:var(--ink-blue); font-family: 'Kalam', cursive; font-size:1.6rem; text-decoration:underline;">🏆 Tulos</h2>`;
    
    let renderScoreDots = (strokes, p_par) => {
        if(!strokes) return '-';
        let diff = strokes - p_par;
        let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red');
        if (diff < -1) cClass = 'blue'; 
        return `<span class="receipt-circle ${cClass}">${strokes}</span>`;
    };

    sortedPlayers.forEach((p, i) => {
        let strokes = isHistory && hData.holeResults ? hData.holeResults[p.name] : null;
        let scoreHTML = renderScoreDots(strokes, par);
        
        let displayScore = (p.name === myName) ? `${p.score || 0} P` : `?? P`;
        
        html += `
        <div class="player-row-paper">
            <span class="paper-name" style="font-size:1.4rem;">${p.name}</span>
            <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-size:1rem; color:var(--warning); font-weight:900;">${displayScore}</span>
                <div class="score-display-paper" style="width:auto !important; min-width:34px; height:34px !important; font-size:1.2rem !important; margin-left:auto; padding:0 5px;">${scoreHTML}</div>
            </div>
        </div>`;
    });
    html += `</div>`;
    
    if (isHistory && myName && hData.pointBreakdowns && hData.pointBreakdowns[myName]) {
        let myBreakdown = hData.pointBreakdowns[myName];
        let deltaColor = myBreakdown.delta >= 0 ? '#16a34a' : '#dc2626';
        let sign = myBreakdown.delta > 0 ? '+' : '';
        
        let rowsHtml = '';
        if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
            let parts = myBreakdown.summary.split(', ');
            parts.forEach(part => {
                let kv = part.split(': ');
                if(kv.length === 2) {
                    rowsHtml += `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #cbd5e1; padding:6px 0;"><span style="color:#475569;">${kv[0]}</span><span style="font-weight:700; color:#1e293b;">${kv[1]}</span></div>`;
                } else {
                    rowsHtml += `<div style="padding:6px 0; color:#475569;">${part}</div>`;
                }
            });
        } else {
             rowsHtml += `<div style="padding:6px 0; color:#475569; text-align:center; font-style:italic;">Ei tapahtumia tällä jaksolla.</div>`;
        }

        html += `
        <div class="payslip-paper" style="background:#fff; border:1px solid #cbd5e1; border-radius:2px; transform: rotate(-0.5deg); margin-top: 25px; margin-bottom: 20px; width: 100%; max-width: 340px; padding: 20px; box-shadow: 2px 4px 12px rgba(0,0,0,0.15); z-index:30; position:relative; font-family:'Courier Prime', monospace;">
            <div style="border-bottom: 2px dashed #1e293b; padding-bottom: 8px; margin-bottom: 12px; text-align:center;">
                <div style="font-weight:900; font-size:1.4rem; color:#1e293b; letter-spacing:1px; text-transform:uppercase;">Palkkalaskelma</div>
                <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">
                    Kausi: Väylä ${hIndex}
                </div>
            </div>
            <div style="margin-bottom:12px; font-size:0.95rem; color:#1e293b;">
                <span style="font-weight:bold;">Työntekijä:</span> ${myName.toUpperCase()}
            </div>
            <div style="font-size:0.85rem; margin-bottom:15px; border-top:1px solid #94a3b8; padding-top:8px;">
                <div style="display:flex; justify-content:space-between; font-weight:800; color:#1e293b; border-bottom:1px solid #94a3b8; padding-bottom:4px; margin-bottom:4px;">
                    <span>Tulolaji / Tapahtuma</span>
                    <span>Määrä</span>
                </div>
                ${rowsHtml}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:10px; border-radius:4px; border:2px solid ${deltaColor};">
                <span style="font-weight:800; font-size:1.1rem; color:#334155;">NETTOPALKKA</span>
                <span style="font-weight:900; font-size:1.5rem; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
            </div>
            <div style="text-align:center; font-size:0.6rem; color:#94a3b8; margin-top:15px; text-transform:uppercase; letter-spacing:1px; border-top:1px dashed #cbd5e1; padding-top:8px;">Fribamestarit OY - Talousosasto</div>
        </div>`;
    }
    
    if (hIndex >= 2) {
        let prevHole = window.gameHistory[hIndex - 2];
        let worstPlayers = [];
        if (prevHole && prevHole.holeResults) {
            let maxS = -999;
            for(let p in prevHole.holeResults) {
                if(prevHole.holeResults[p] > maxS) { 
                    maxS = prevHole.holeResults[p]; 
                    worstPlayers = [p]; 
                } else if (prevHole.holeResults[p] === maxS) {
                    worstPlayers.push(p);
                }
            }
        }

        let insultIndex = Math.floor(pseudoRandom(hIndex * 8.8) * insults.length);
        let rawInsult = insults[insultIndex] || "V*ttu mikä heitto!";
        let dText = "";
        
        if (worstPlayers.length === 1) {
            dText = rawInsult.replace(/\[Pelaaja\]/g, worstPlayers[0]);
        } else {
            dText = rawInsult.replace(/\[Pelaaja\],\s*/g, '').replace(/\[Pelaaja\]\s*/g, '').replace(/\[Pelaaja\]/g, '');
            dText = "Tasapeli pohjalla! " + dText.charAt(0).toUpperCase() + dText.slice(1);
        }
        
        let svgIndex = Math.floor(pseudoRandom(hIndex * 9.9) * doodleSVGs.length);
        let dSvg = doodleSVGs[svgIndex];
        let dRot = -3 + (pseudoRandom(hIndex * 3) * 6);
        let opacityClass = isHistory ? 'opacity: 0.8;' : 'opacity: 1;';
        
        html += `
        <div style="width:100%; display:flex; justify-content:center; margin-top:25px; margin-bottom:20px; z-index:50; position:relative;">
            <div class="doodle-drawing drawn" style="${opacityClass} transform: rotate(${dRot}deg) scale(1.1); position:relative; top:auto; left:auto; right:auto; bottom:auto;">
                <div class="doodle-bubble" style="max-width: 250px; font-size: 1.1rem; line-height:1.3;">${dText}</div>
                <svg class="doodle-svg doodle-path" viewBox="0 0 100 100"><path d="${dSvg}"/></svg>
            </div>
        </div>`;
    }
    html += `</div>`;
    return html;
};

window.renderBoard = function() {
    const board = el('corkboard-surface');
    if (!board) return;
    if (!currentCourse) { board.innerHTML = ''; return; }
    let totalHoles = currentCourse.pars.length; let cols = Math.min(9, totalHoles); let rows = Math.ceil(totalHoles / cols);
    let exactWidth = 240 + (cols * 380) + ((cols - 1) * 80); let exactHeight = 240 + (rows * 950) + ((rows - 1) * 60);
    
    board.style.width = `${exactWidth}px`; board.style.height = `${exactHeight}px`; board.style.gridTemplateColumns = `repeat(${cols}, 380px)`;
    let html = ``; window.gameHistory.forEach((h, index) => { html += window.getHoleCellHTML(h, index + 1, false, true); });
    
    if (currentHoleIndex > totalHoles) {
        let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
        let winner = sortedPlayers[0] || {name: "Tuntematon", dgScore: 0, score: 0};
        html += `
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-3deg); background:#fff; padding:50px; box-shadow:15px 30px 60px rgba(0,0,0,0.6); border:2px solid #ccc; z-index:100; text-align:center; min-width:350px; border-radius:4px;">
            <div class="tape tape-top" style="width:150px; top:-10px; height:25px;"></div>
            <h1 style="font-family:'Kalam', cursive; font-size:4rem; color:var(--primary); margin-bottom:10px; line-height:1;">🏆 MESTARI!</h1>
            <h2 style="font-size:1.5rem; margin-bottom:5px; color:#555;">VOITTAJA (Pienin tulos):</h2>
            <div style="font-size:3.5rem; font-weight:900; color:var(--ink-blue); margin-bottom:20px; font-family:'Kalam', cursive;">${winner.name}</div>
            <div style="background:#f1f5f9; padding:20px; border-radius:12px; border:2px dashed #94a3b8;">
                <p style="font-size:2rem; font-weight:900; color:#16a34a; margin-bottom:10px;">Lopullinen tulos: ${winner.dgScore > 0 ? '+' : ''}${winner.dgScore}</p>
                <p style="font-size:1.1rem; font-weight:800; color:var(--warning);">Säästetyt pelimerkit: ${winner.score} P</p>
            </div>
        </div>`;
    } else if (activeHole) { html += window.getHoleCellHTML({ rule: activeHole.rule, playedCards: activeHole.playedCards, color: activeHole.color, penColor: activeHole.penColor, players: allPlayers }, currentHoleIndex, true, false); }
    board.innerHTML = html;
};

window.renderReceipt = function() {
    if(!allPlayers || allPlayers.length === 0 || !currentCourse) { if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'none'; return; }
    if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'flex';
    let renderScoreDots = (strokes, p_par) => { if(!strokes) return '-'; let diff = strokes - p_par; let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red'); if (diff < -1) cClass = 'blue'; return `<span class="receipt-circle ${cClass}">${strokes}</span>`; };
    let generateHistoryLines = (isMini) => { let html = ``; let startIdx = isMini ? Math.max(0, window.gameHistory.length - 2) : 0; for(let i=startIdx; i<window.gameHistory.length; i++) { let h = window.gameHistory[i]; let par = currentCourse.pars ? (currentCourse.pars[i] || 3) : 3; if(!isMini) html += `<div class="r-hole-title">Väylä ${i+1} <span style="color:#666;">(PAR ${par})</span></div>`; if(h.holeResults && !isMini) { for(let pName in h.holeResults) { html += `<div class="r-row"><span>${pName.substring(0, 12)}</span>${renderScoreDots(h.holeResults[pName], par)}</div>`; } } } return html; };
    let generateTotals = (isMini) => { let html = ``; let sorted = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)); sorted.forEach(p => { let dgStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore); let fSize = isMini ? '1.3rem' : '1.8rem'; html += `<div class="r-row" style="font-size:${fSize}; margin-bottom: 2px;"><span>${p.name.substring(0, isMini?6:12)}</span><span>${dgStr}</span></div>`; }); return html; };
    if(el('receipt-mini-totals')) el('receipt-mini-totals').innerHTML = generateTotals(true);
    if(el('receipt-full-content')) { el('receipt-full-content').innerHTML = `<div class="r-title" style="font-size:1.5rem; margin-bottom:15px;">TULOKSET</div>` + generateHistoryLines(false) + `<div class="r-tot-sec" style="margin-top:10px; border-top: 2px dashed #111; padding-top:10px;">${generateTotals(false)}</div>`; }
};

// ==============================================
// KORTTIEN PELAAMINEN, UPGRADE & KAUPPA
// ==============================================
window.openTargetModal = function(cardId) {
    const cardDef = window.allCards.find(c => c && c.id === cardId);
    if (!cardDef) return;
    
    const me = (allPlayers || []).find(p => p && p.name === myName);
    
    if (me.upgradedThisHole && me.upgradedThisHole.includes(cardId)) {
        alert("⚠️ JÄÄHYLLÄ! Et voi pelata korttia samalla väylällä, jolla se päivitettiin. Odota seuraavalle väylälle.");
        return;
    }

    let cost = window.getCardPlayCost(cardId);
    if (cost > 0 && me.score < cost) {
        alert(`Ei varaa! Tarvitset ${cost} P pelataksesi tämän Taso ${cardDef.level} kortin.`);
        return;
    }

    window.pendingCardPlay = { id: cardId, def: cardDef, cost: cost };
    if(cardDef.type === 'buff') { window.executeCardPlay(myName); return; }
    
    let opponents = (allPlayers || []).filter(p => p && p.name !== myName);
    if (opponents.length === 1) { window.executeCardPlay(opponents[0].name); return; }
    
    if(el('targetCardName')) el('targetCardName').innerText = cardDef.n; 
    const list = el('targetPlayerList');
    if(!list) return; list.innerHTML = '';
    
    opponents.forEach(p => {
        let encodedName = p.name.replace(/"/g, '&quot;');
        list.innerHTML += `<button class="btn btn-secondary target-btn glass-card" data-name="${encodedName}" style="border:3px solid var(--border); color:var(--text-main); width:100%; padding:20px; border-radius:12px; margin-bottom:12px; font-weight:900; font-size:1.3rem; text-align:left;" onclick="window.executeCardPlay(this.getAttribute('data-name'))">${p.name}</button>`;
    });
    window.showModalSafe('targetModal');
};

window.executeCardPlay = function(targetName) {
    if(!window.pendingCardPlay) return; 
    const card = window.pendingCardPlay; const timestamp = Date.now();
    if(el('targetModal')) el('targetModal').style.display = 'none'; 
    window.closeShopModal();
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p && p.name === myName);
    
    if(me && me.cards) { 
        me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
        me.cards = me.cards.filter(Boolean);
        let actualIndex = me.cards.indexOf(card.id);
        if (actualIndex !== -1) me.cards.splice(actualIndex, 1); 
        
        if (card.cost > 0) {
            me.score -= card.cost;
            window.logScore(myName, -card.cost, `Pelasi kortin: ${card.def.n}`);
            window.showAppleToast(`-${card.cost} P (Pelattu)`, '💸');
        }
    }
    
    let pCards = {};
    if(activeHole) {
        if (activeHole.playedCards) {
            let oldCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            oldCards.filter(Boolean).forEach((c, i) => { pCards['old_'+i] = c; });
        }
        let cKey = 'c_' + timestamp + '_' + Math.floor(Math.random()*1000);
        pCards[cKey] = { cardId: card.id, cardName: card.def.n, cardDesc: card.def.d, target: targetName, by: myName, type: card.def.type, level: card.def.level, mech: card.def.mech || null, timestamp: timestamp };
    }
    
    update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/playedCards': window.cleanFirebaseData(pCards) });
    window.logEvent(`${myName} pelasi kortin ${card.def.n} kohteelle ${targetName}. Maksoi ${card.cost} P.`);
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, card.def.type === 'buff' ? 'info' : 'debuff');
};

window.upgradeCard = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if (!cDef || !cDef.nextId) return;
    let nextDef = window.allCards.find(c => c.id === cDef.nextId);
    let cost = (cDef.level === 1) ? 3 : 5;
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    
    if(me.score < cost) { alert("Ei tarpeeksi P-rahaa päivitykseen!"); return; }
    
    me.score -= cost;
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    let idx = me.cards.indexOf(cId);
    if(idx !== -1) { me.cards[idx] = nextDef.id; }
    
    if(!me.upgradedThisHole) me.upgradedThisHole = [];
    me.upgradedThisHole.push(nextDef.id);
    
    update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
    window.logScore(myName, -cost, `Päivitti kortin tasolle ${nextDef.level}`);
    window.showNotification(`Kortti päivitetty tasolle ${nextDef.level}! Siirretty jäähylle.`, 'info');
};

window.forceDiscard = function(cId) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if(!me) return;
    
    let cDef = window.allCards.find(c => c.id === cId);
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    me.cards = me.cards.filter(Boolean);
    let idx = me.cards.indexOf(cId);
    
    if(idx !== -1) {
        me.cards.splice(idx, 1);
        let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
        me.score = (parseInt(me.score) || 0) + sellReward; 
        window.logScore(myName, sellReward, `Myi kortin kädestä`);
        window.showAppleToast(`+${sellReward} P (Myyty)`, '💰'); 
    }
    
    if (window.pendingShopPurchase) {
        let pId = window.pendingShopPurchase.id; let pPrice = window.pendingShopPurchase.price; let isRes = window.pendingShopPurchase.isRes;
        if (me.score >= pPrice) {
            me.score -= pPrice; me.cards.push(pId);
            window.logScore(myName, -pPrice, `Osti kortin kaupasta`);
            
            if (isRes) {
                me.reservations = me.reservations || [];
                let rIdx = me.reservations.indexOf(pId);
                if (rIdx !== -1) me.reservations.splice(rIdx, 1);
            } else {
                let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
                if (nextShopAll[myName]) {
                    const sIdx = nextShopAll[myName].findIndex(i => i && i.id === pId);
                    if (sIdx !== -1) nextShopAll[myName].splice(sIdx, 1);
                }
                update(ref(db, 'gameState/activeHole/shop'), window.cleanFirebaseData(nextShopAll));
            }

            update(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
            window.pendingShopPurchase = null; 
            window.switchShopTab('sell');
            window.showNotification(`🛒 Ostit edun!`, 'warning');
            return;
        } else { window.pendingShopPurchase = null; }
    }
    set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
    if(document.getElementById('cardDetailModal')) document.getElementById('cardDetailModal').style.display='none';
};

window.reserveShopItem = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if (!me) return; 

    me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations||{});
    if (me.reservations.length >= 2) { alert("Voit pitää vain 2 varausta kerrallaan!"); return; }
    
    me.reservations.push(idStr);
    
    let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
    if (nextShopAll[myName]) {
        const sIdx = nextShopAll[myName].findIndex(i => i && i.id === idStr);
        if (sIdx !== -1) nextShopAll[myName].splice(sIdx, 1);
    }

    update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) });
    window.showAppleToast('Kortti varattu', '🔒');
};

window.cancelReservation = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if (!me || !me.reservations) return; 

    me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations||{});
    let rIdx = me.reservations.indexOf(idStr);
    if (rIdx !== -1) {
        me.reservations.splice(rIdx, 1);
        
        let cDef = window.allCards.find(c => c.id === idStr);
        let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
        if (nextShopAll[myName]) { nextShopAll[myName].push(cDef); }
        
        update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) });
        window.showAppleToast('Varaus peruttu', '🔓');
    }
};

window.buyShopItem = function(idStr, priceVal, isReservation) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if (!me || me.score < priceVal) { alert("Ei tarpeeksi rahaa!"); return; }

    let limit = window.gameSettings.handLimit || 6;
    let currentCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean).length : 0;
    
    if (window.gameSettings.handLimitEnabled && currentCards >= limit) {
        let nameStr = window.allCards.find(c=>c.id===idStr).n;
        window.pendingShopPurchase = { id: idStr, name: nameStr, price: priceVal, isRes: isReservation };
        window.switchShopTab('sell');
        window.renderShop(activeHole.shop[myName], me.reservations, me.score); 
        return;
    }

    me.score -= priceVal;
    me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : []; 
    me.cards.push(idStr);
    window.logScore(myName, -priceVal, `Osti kortin kaupasta`);
    
    let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {})); 
    
    if (isReservation) {
        me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations||{});
        let rIdx = me.reservations.indexOf(idStr);
        if(rIdx !== -1) me.reservations.splice(rIdx, 1);
    } else {
        if (nextShopAll[myName]) {
            const sIdx = nextShopAll[myName].findIndex(i => i && i.id === idStr);
            if (sIdx !== -1) nextShopAll[myName].splice(sIdx, 1);
        }
    }

    update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) });
    window.switchShopTab('sell');
    window.showNotification(`🛒 Ostit edun!`, 'warning');
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    const me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me.reservations, me ? me.score : 0);
    window.switchShopTab('buy');
};

window.openShop = function(tab) {
    window.showModalSafe('shopModal', 'block');
    if(window.switchShopTab) window.switchShopTab(tab);
};

window.closeShopModal = function() {
    window.pendingShopPurchase = null; 
    if(el('shopModal')) el('shopModal').style.display = 'none';
};

window.switchShopTab = function(tab) {
    const modalEl = document.querySelector('#shopModal .shop-binder-modal');
    if (tab === 'buy') {
        window.pendingShopPurchase = null; 
        el('shopBuyArea').style.display = 'block'; el('shopSellArea').style.display = 'none';
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.add('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.remove('active');
        if(modalEl) { modalEl.classList.remove('theme-own'); modalEl.classList.add('theme-shop'); }
    } else {
        el('shopBuyArea').style.display = 'none'; el('shopSellArea').style.display = 'block';
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.remove('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.add('active');
        if(modalEl) { modalEl.classList.remove('theme-shop'); modalEl.classList.add('theme-own'); }
    }
    let me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me ? me.reservations : [], me ? me.score : 0);
};

window.renderShop = function(shopArray, resArray, myPoints) {
    const vendingShelves = el('vendingShelves');
    const sellContainer = el('shopSellCardsContainer');
    let me = (allPlayers || []).find(p => p && p.name === myName);

    // =====================================
    // 1. VÄLIPALA-AUTOMAATTI (KAUPPA)
    // =====================================
    let shelvesHtml = '';
    let actRes = (resArray || []).filter(Boolean);
    let levels = [3, 2, 1]; // Ylin hylly = T3, Keskihylly = T2, Alahylly = T1

    levels.forEach(lvl => {
        shelvesHtml += `<div class="vending-shelf">`;
        
        let shelfItems = (shopArray || []).filter(c => c && c.level === lvl);
        let reservedItemsOnThisShelf = actRes.map(id => window.allCards.find(c => c.id === id)).filter(c => c && c.level === lvl);
        
        let slotsHtml = '';
        
        // Luodaan tasan 2 paikkaa per hylly (koska arvonta tekee 2 kpl joka tasoa)
        for(let i=0; i<2; i++) {
            if (shelfItems[i]) {
                let item = shelfItems[i];
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                let btnClass = canAfford ? 'btn-warning' : 'btn-secondary';
                let dis = !canAfford ? 'disabled' : '';
                
                slotsHtml += `
                    <div class="vending-slot">
                        <div class="physical-card tier-${item.level}" style="width:140px; height:200px; transform: scale(0.9);" onclick="window.openCardDetail('${item.id}', 'shop')">
                            <div class="card-type-tag">TASO ${item.level}</div>
                            <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${item.n.split(' (')[0]}</h3>
                            <p style="font-size:0.65rem; line-height:1.1; overflow-y:auto;">${item.d}</p>
                            <div style="background:rgba(0,0,0,0.5); color:#fff; font-size:0.6rem; padding:2px; border-radius:4px; margin-top:auto; font-weight:bold; text-align:center;">PELUUMAKSU: ${window.getCardPlayCost(item.id)} P</div>
                        </div>
                        <div class="vending-coil"></div>
                        <div class="vending-price-tag">${item.price} P</div>
                        <div style="display:flex; gap:5px; margin-top:5px; width:140px; transform:scale(0.9);">
                            <button class="btn ${btnClass}" ${dis} style="flex:1; padding:5px; font-size:0.8rem; margin:0;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-secondary" style="padding:5px; font-size:0.8rem; margin:0; background:rgba(255,255,255,0.2);" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else if (reservedItemsOnThisShelf[i - shelfItems.length]) {
                // Tämä paikka on VARATTU (Tyhjä kierrejousi)
                let resItem = reservedItemsOnThisShelf[i - shelfItems.length];
                const canAfford = myPoints >= resItem.price;
                let btnClass = canAfford ? 'btn-warning' : 'btn-secondary';
                let dis = !canAfford ? 'disabled' : '';
                
                slotsHtml += `
                    <div class="vending-slot">
                        <div style="width:140px; height:200px; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                            <div class="empty-slot-text">VARATTU<br><span style="font-size:0.7rem; color:#aaa;">(-1 P/v)</span></div>
                        </div>
                        <div class="vending-coil"></div>
                        <div class="vending-price-tag" style="background:#ef4444; color:#fff; border-color:#fff;">${resItem.price} P</div>
                        <div style="display:flex; gap:5px; margin-top:5px; width:140px; transform:scale(0.9);">
                            <button class="btn ${btnClass}" ${dis} style="flex:1; padding:5px; font-size:0.8rem; margin:0;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">OSTA</button>
                            <button class="btn btn-info" style="padding:5px; font-size:0.8rem; margin:0;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                        </div>
                    </div>
                `;
            } else {
                // Totaalisen tyhjä slotti (Varalla, ei pitäisi näkyä normipelissä)
                slotsHtml += `
                    <div class="vending-slot">
                        <div style="width:140px; height:200px;"></div>
                        <div class="vending-coil"></div>
                        <div class="vending-price-tag" style="background:#333; color:#666; border-color:#666;">---</div>
                    </div>
                `;
            }
        }
        
        shelvesHtml += slotsHtml + `</div>`;
    });
    
    if (vendingShelves) vendingShelves.innerHTML = shelvesHtml;

    // =====================================
    // 2. KORTTIKANSIO (OMAT KORTIT)
    // =====================================
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    myCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));

    let sellHtml = '';
    if(myCards.length === 0) {
         sellHtml = '<p style="color:var(--text-muted); font-size:1.1rem; text-align:center; padding:20px; font-weight:bold; width:100%;">Kätesi on tyhjä.</p>';
    } else {
        myCards.forEach((cId) => {
            const cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let typeClass = `tier-${cDef.level}`;
            let tagTxt = `TASO ${cDef.level}`;
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let playCost = window.getCardPlayCost(cId);
            
            let canPlay = myPoints >= playCost && !isLocked;
            let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
            
            let upgradeHtml = '';
            if (cDef.nextId && cDef.upgradeDesc) {
                let upgCost = cDef.level === 1 ? 3 : 5;
                let canUpg = myPoints >= upgCost;
                let upgClass = canUpg ? 'btn-warning' : 'btn-secondary';
                let upgDis = canUpg ? '' : 'disabled';
                upgradeHtml = `
                    <div style="margin-top: 15px; border-top: 2px dashed rgba(255,255,255,0.3); padding-top: 15px;">
                        <div style="font-size:0.85rem; font-weight:bold; margin-bottom:10px; color:#fff; line-height:1.3;">${cDef.upgradeDesc.split(':')[0]}:<br><span style="font-weight:normal; color:#e2e8f0;">${cDef.upgradeDesc.split(':')[1]}</span></div>
                        <button class="btn ${upgClass}" ${upgDis} style="width:100%; padding:12px; font-size:1.05rem; color:#000; font-weight:900;" onclick="window.upgradeCard('${cId}')">UPGRADE (${upgCost} P)</button>
                    </div>
                `;
            }
            
            sellHtml += `
            <div class="shop-item-wrapper" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2);">
                <div class="physical-card ${typeClass}" style="height: 220px; min-height: 220px; ${isLocked ? 'opacity:0.6;' : ''} margin: 0 auto; transform: scale(0.95); transform-origin: top center;" onclick="window.openCardDetail('${cId}', 'sell')">
                    <div class="play-cost-badge">PELUUMAKSU: ${playCost} P</div>
                    <div class="card-type-tag">${tagTxt}</div>
                    <h3 style="font-size:1.2rem; margin-top:5px; line-height:1.1;">${cDef.n}</h3>
                    <p style="font-size:0.8rem; line-height:1.2; overflow-y:auto; margin-bottom:4px; flex:1;">${cDef.d}</p>
                    ${isLocked ? `<div style="background:var(--danger); color:#fff; text-align:center; font-weight:bold; font-size:0.8rem; padding:4px; border-radius:4px; margin-top:auto;">JÄÄHYLLÄ (Päivitetty)</div>` : ''}
                </div>
                
                ${upgradeHtml}
                
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <button class="btn ${canPlay ? 'btn-success' : 'btn-secondary'}" ${!canPlay ? 'disabled' : ''} style="flex:1; padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.openTargetModal('${cId}')">PELAA (${playCost} P)</button>
                    <button class="btn btn-danger" style="width:auto; padding:12px 15px; font-size:0.9rem; font-weight:bold;" onclick="window.forceDiscard('${cId}')">MYY (+${sellReward})</button>
                </div>
            </div>`;
        });
    }
    if (sellContainer) sellContainer.innerHTML = sellHtml;
    
    // Käsirajan varoitukset
    let alertEl = el('pendingPurchaseAlert');
    if (alertEl) {
        let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
        let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 6;

        if (window.pendingShopPurchase) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSI TÄYNNÄ!</div><div style="font-size:1.05rem; font-weight:700; margin-bottom:15px; line-height:1.4;">Haluat ostaa kortin <strong id="pendingCardName">${window.pendingShopPurchase.name}</strong>. Myy yksi kortti alta tehdäksesi tilaa, jolloin osto suoritetaan automaattisesti!</div><button class="btn btn-secondary" style="padding:12px; font-size:0.95rem; color:#000;" onclick="event.stopPropagation(); if(window.cancelShopPurchase) window.cancelShopPurchase()">PERUUTA OSTO</button>`;
        } else if (limitEnabled && myCards.length > limit) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSIRAJA YLITETTY!</div><div style="font-size:1.05rem; font-weight:700; line-height:1.4;">Sinulla on liikaa kortteja kädessäsi (${myCards.length}/${limit}). Myy kortteja päästäksesi takaisin sallittuun rajaan!</div>`;
        } else {
            alertEl.style.display = 'none';
        }
    }
};

window.showHandLimitModal = function(cards) {
    if(!el('handLimitModal')) return;
    let limit = window.gameSettings.handLimit || 6;
    el('handLimitCount').innerText = `${cards.length} / ${limit}`;
    let html = '';
    cards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));

    cards.forEach(cId => {
        const cDef = window.allCards.find(c => c && c.id === cId);
        if(!cDef) return;
        let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
        html += `<div style="background:#fff; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#000;"><div style="text-align:left;"><div style="font-size:0.75rem; font-weight:900; color:var(--text-muted);">TASO ${cDef.level}</div><div style="font-size:1.1rem; font-weight:900; color:#000;">${cDef.n.split(' (')[0]}</div></div><button class="btn btn-danger" style="width:auto; padding:10px 15px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}')">♻️ MYY (+${sellReward} P)</button></div>`;
    });
    el('handLimitCards').innerHTML = html;
    window.showModalSafe('handLimitModal');
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
    const containerWidth = container.clientWidth || window.innerWidth;
    const centerOffset = containerWidth / 2; 
    const cardWidth = 320; 
    const paddingLeft = centerOffset - (cardWidth / 2); 
    
    for (let index = 0; index < cards.length; index++) {
        const card = cards[index];
        const cardCenter = paddingLeft + (index * cardWidth) + (cardWidth / 2) - scrollLeft;
        const diff = (cardCenter - centerOffset) / 160; 
        const transX = diff * -40; 
        const transY = Math.abs(diff) * 20; 
        const transZ = Math.abs(diff) * -150; 
        const rotZ = diff * 5; 
        const scale = Math.max(0.85, 1 - Math.abs(diff) * 0.15); 
        card.style.transform = `translate3d(${transX}px, ${transY}px, ${transZ}px) rotateZ(${rotZ}deg) scale(${scale})`;
        card.style.zIndex = 100 - Math.floor(Math.abs(diff)*10);
    }
};

window.flipCard = function(index) {
    if(window.isFlipping) return;
    const inner = el(`card3d-inner-${index}`);
    if (!inner) return;
    
    window.isFlipping = true;
    let cId = window.carouselCards[index];
    let isFlippingDown = !window.flippedCards.has(cId);
    
    if (isFlippingDown) {
        window.flippedCards.add(cId);
        inner.classList.add('flipped');
    } else {
        window.flippedCards.delete(cId);
        inner.classList.remove('flipped');
    }
    
    setTimeout(() => {
        let currentMode = window.carouselCurrentMode;
        if (currentMode === 'hand' || currentMode === 'sell') {
            let targetCardIdToFocus = null;
            if (isFlippingDown) {
                for (let i = index + 1; i < window.carouselCards.length; i++) {
                    if (!window.flippedCards.has(window.carouselCards[i])) { targetCardIdToFocus = window.carouselCards[i]; break; }
                }
                if (!targetCardIdToFocus) {
                    for (let i = index - 1; i >= 0; i--) {
                         if (!window.flippedCards.has(window.carouselCards[i])) { targetCardIdToFocus = window.carouselCards[i]; break; }
                    }
                }
            } else { targetCardIdToFocus = cId; }

            window.carouselCards.sort((a,b) => {
                let fA = window.flippedCards.has(a) ? 1 : 0;
                let fB = window.flippedCards.has(b) ? 1 : 0;
                if (fA !== fB) return fB - fA; 
                return window.getCardSortWeight(a) - window.getCardSortWeight(b);
            });
            
            if(targetCardIdToFocus) { window.carouselCurrentIndex = window.carouselCards.indexOf(targetCardIdToFocus); } else { window.carouselCurrentIndex = 0; }
            
            const container = el('cardCarousel');
            if (container) {
                window.carouselCards.forEach(id => { let node = container.querySelector(`[data-id="${id}"]`); if (node) container.appendChild(node); });
                window.carouselCards.forEach((id, i) => {
                    let innerNode = container.querySelector(`[data-id="${id}"] .card-3d-inner`);
                    if (innerNode) {
                        innerNode.id = `card3d-inner-${i}`; 
                        if (window.flippedCards.has(id)) innerNode.classList.add('flipped'); else innerNode.classList.remove('flipped');
                    }
                    let wrapper = container.querySelector(`[data-id="${id}"]`);
                    if(wrapper) { wrapper.setAttribute('onclick', `window.flipCard(${i})`); wrapper.id = `carousel-wrapper-${i}`; }
                });
                container.scrollLeft = (window.carouselCurrentIndex * 320);
                window.forceCarouselLayoutUpdate();
            }
        }
        window.isFlipping = false;
    }, 300); 
};

window.renderCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    
    let html = '';
    window.carouselCards.forEach((cId, i) => {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(!cDef) return;
        let typeClass = `tier-${cDef.level}`;
        let tagTxt = `TASO ${cDef.level}`;
        
        let flippedClass = window.flippedCards.has(cId) ? 'flipped' : '';
        let descHtml = cDef.d;
        let playCost = window.getCardPlayCost(cId);
        
        html += `
            <div class="carousel-card-wrapper" data-id="${cId}" id="carousel-wrapper-${i}" onclick="window.flipCard(${i})">
                <div class="card-3d-inner ${flippedClass}" id="card3d-inner-${i}">
                    <div class="card-face card-front ${typeClass}">
                        <div style="text-align:left; display:flex; flex-direction:column; height:100%; position:relative; z-index:20;">
                            <div class="play-cost-badge">PELUUMAKSU: ${playCost} P</div>
                            <div class="card-type-tag" style="font-size:1.1rem; margin-bottom:8px;">${tagTxt}</div>
                            <h3 style="font-size:2rem; margin-bottom:15px; word-break:break-word; hyphens:auto; line-height:1.1;">${cDef.n}</h3>
                            <p style="font-size:1.1rem; font-weight:800; line-height:1.3; overflow-y:auto; padding-right:5px;">${descHtml}</p>
                        </div>
                    </div>
                    <div class="card-face card-back" style="background:#1e293b; border:4px solid #475569;">
                        <div class="card-back-icon">💎</div>
                        <div style="color:#fff; font-weight:900; font-size:2rem; margin-top:20px; letter-spacing:3px;">FRIBAMESTARI</div>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
};

window.initNativeCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    window.forceCarouselLayoutUpdate();
    container.addEventListener('scroll', () => { requestAnimationFrame(window.forceCarouselLayoutUpdate); }, {passive: true});
};

window.openCardDetail = function(cId, mode, arg1, arg2, arg3) {
    if (mode === 'hand' || mode === 'sell') {
        // Karuselli on nyt lähinnä tarkasteluun (tai Eventteihin), ei toimintoihin, sillä napit ovat suoraan kansiossa.
        window.carouselCards = [cId];
    } else if (mode === 'shop') {
        window.carouselCards = [cId];
    } else if (mode === 'shop_res') {
        window.carouselCards = [cId];
    } else if (mode === 'gm') { window.carouselCards = (window.allCards || []).map(c => c.id); } 
    else { window.carouselCards = [cId]; }
    
    window.carouselCurrentMode = mode; window.carouselArgs = [arg1, arg2, arg3];
    window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.renderCarousel(); 
    window.showModalSafe('cardDetailModal');
    
    let btnHtml = '';
    if (mode === 'event') {
        let target = window.carouselArgs[0]; let by = window.carouselArgs[1];
        btnHtml = `<div style="background:var(--danger); color:#fff; padding:15px; border-radius:8px; font-weight:900; font-size:1.2rem; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.4); margin-bottom:10px;">SUORITTAJA:<br><span style="font-size:1.8rem; font-family:'Kalam', cursive;">${target}</span><div style="font-size:0.85rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div></div>`;
    } else {
        btnHtml = `<button class="btn btn-secondary glass-card" onclick="document.getElementById('cardDetailModal').style.display='none'">SULJE</button>`;
    }
    el('cardDetailActionArea').innerHTML = btnHtml;
    
    setTimeout(() => {
        window.initNativeCarousel();
        const container = el('cardCarousel');
        if(container) {
            container.scrollLeft = (window.carouselCurrentIndex * 320); 
            window.forceCarouselLayoutUpdate();
        }
    }, 50);
};

//==============================================
// TULOSTEN SYÖTTÖ & PELIN KULKU & AUTOMAATIO
//==============================================
window.changeScore = function(safeId, par, delta) {
    let input = el(`scoreInput_${safeId}`);
    if(!input) return; 
    let val = parseInt(input.value) + delta;
    if(val < 1) val = 1; 
    input.value = val;
    let display = el(`scoreDisplay_${safeId}`);
    if(!display) return; display.innerText = val;
    display.className = 'score-display-paper';
    if(val < par) display.classList.add('score-birdie-paper'); 
    else if(val > par) display.classList.add('score-bogey-paper'); 
};

window.openScoreModal = function() {
    if((allPlayers || []).length === 0) return alert("Ei pelaajia radalla."); 
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    
    if(el('scoreModalHoleNum')) el('scoreModalHoleNum').innerText = currentHoleIndex; 
    if(el('scoreModalPar')) el('scoreModalPar').innerText = par; 
    
    const box = el('scoreModalRuleBox');
    if(box) {
        if(activeHole && activeHole.rule) {
            let bTxt = activeHole.rule.type === 'bounty' ? `🏆 TEHTÄVÄ` : '🎲 SÄÄNTÖ';
            box.className = 'post-it-note'; box.style.transform = 'none'; box.style.margin = '0 auto 20px auto'; box.style.width = '100%';
            let bgCol = activeHole.color || '#fef08a';
            box.style.background = bgCol;
            box.innerHTML = `<div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div><div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${activeHole.rule.n}</div><div style="font-size: 1.15rem; line-height: 1.4; font-weight:700; color:#222;">${activeHole.rule.d}</div>`;
            box.style.display = 'block';
        } else { box.style.display = 'none'; }
    }
    
    const container = el('scoreInputsContainer');
    if(!container) return; 
    let html = ''; let taskCheckboxes = '';
    
    (allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        let encodedName = p.name.replace(/"/g, '&quot;');
        taskCheckboxes += `<label class="task-paper-label"><input type="checkbox" class="task-paper-checkbox" data-name="${encodedName}" /> ${p.name}</label>`;
        let safeId = "player_" + i; 
        html += `<div class="score-row-paper"><span class="score-name-paper">${p.name}</span><div class="score-controls-paper"><button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button><div id="scoreDisplay_${safeId}" class="score-display-paper">${par}</div><button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button><input type="hidden" class="score-input-data" data-name="${encodedName}" id="scoreInput_${safeId}" value="${par}" /></div></div>`;
    });
    container.innerHTML = html;
    if(el('taskWinnerContainer')) el('taskWinnerContainer').innerHTML = taskCheckboxes; 
    window.showModalSafe('scoreModal');
};

window.submitScores = function() {
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    let playerResults = {};
    (allPlayers || []).forEach(p => { if(p) playerResults[p.name] = { strokes: par, taskWon: false }; });
    
    const inputs = document.querySelectorAll('.score-input-data');
    if(inputs.length === 0) { alert("Virhe: Ei tulosrivejä löydetty! Yritä avata näkymä uudelleen."); if(el('scoreModal')) el('scoreModal').style.display = 'none'; return; }
    
    inputs.forEach(input => { let attrName = input.getAttribute('data-name'); if(playerResults[attrName]) { playerResults[attrName].strokes = parseInt(input.value, 10) || par; } });
    document.querySelectorAll('.task-paper-checkbox:checked').forEach(cb => { let pName = cb.getAttribute('data-name'); if (playerResults[pName]) { playerResults[pName].taskWon = true; } });

    let played = activeHole && activeHole.playedCards ? Object.values(activeHole.playedCards) : [];
    played.sort((a,b) => a.timestamp - b.timestamp);

    let playerEffects = {};
    allPlayers.forEach(p => playerEffects[p.name] = { sabotages: [], buffs: [] });

    played.forEach(pc => {
        let mech = pc.mech;
        let isSabotage = pc.type === 'sabotage';
        let targets = pc.target === 'KAIKKI VASTUSTAJAT' ? allPlayers.filter(p => p.name !== pc.by).map(p => p.name) : [pc.target];

        targets.forEach(t => {
            if(!playerEffects[t]) return;

            if (mech === 'cancel_1' && t === pc.by) {
                let idx = playerEffects[t].sabotages.findLastIndex(s => s.level <= 1);
                if(idx !== -1) { playerEffects[t].sabotages.splice(idx, 1); window.logEvent(`${t} kumosi Taso 1 sabotaasin!`); }
                return;
            }
            if (mech === 'cancel_2' && t === pc.by) {
                let idx = playerEffects[t].sabotages.findLastIndex(s => s.level <= 2);
                if(idx !== -1) { playerEffects[t].sabotages.splice(idx, 1); window.logEvent(`${t} kumosi sabotaasin!`); }
                return;
            }
            if (mech === 'cancel_3' && t === pc.by) {
                let idx = playerEffects[t].sabotages.findLastIndex(s => s.level <= 3);
                if(idx !== -1) { playerEffects[t].sabotages.splice(idx, 1); window.logEvent(`${t} kumosi sabotaasin!`); }
                return;
            }
            if (mech === 'reflect' && t === pc.by) {
                let lastSabo = playerEffects[t].sabotages.pop();
                if(lastSabo && playerEffects[lastSabo.by]) {
                    playerEffects[lastSabo.by].sabotages.push(lastSabo);
                    window.logEvent(`${t} peilasi sabotaasin takaisin pelaajalle ${lastSabo.by}!`);
                }
                return;
            }

            if (isSabotage) { playerEffects[t].sabotages.push({ ...pc }); } 
            else { playerEffects[t].buffs.push({ ...pc }); }
        });
    });

    for (let pName in playerResults) {
        let pRes = playerResults[pName];
        let pEff = playerEffects[pName];
        pRes.moneyMod = 0; pRes.drawMod = 0; pRes.denyPassive = false; pRes.denyWin = false; pRes.denyTask = false; pRes.denyDraw = false; pRes.tripleTask = false; pRes.shieldNext = false;

        pEff.sabotages.forEach(s => {
            if (s.mech === 'score_+1') pRes.strokes += 1;
            if (s.mech === 'score_+2') pRes.strokes += 2;
            if (s.mech === 'score_+3') pRes.strokes += 3;
            if (s.mech === 'deny_passive') pRes.denyPassive = true;
            if (s.mech === 'deny_win') { pRes.denyPassive = true; pRes.denyWin = true; }
            if (s.mech === 'deny_all_income') { pRes.denyPassive = true; pRes.denyWin = true; pRes.denyTask = true; }
            if (s.mech === 'deny_draw') pRes.denyDraw = true;
        });

        pEff.buffs.forEach(b => {
            if (b.mech === 'score_-1') pRes.strokes -= 1;
            if (b.mech === 'score_-2') pRes.strokes -= 2;
            if (b.mech === 'score_-3') pRes.strokes -= 3;
            if (b.mech === 'money_+1') pRes.moneyMod += 1;
            if (b.mech === 'money_+2_draw') { pRes.moneyMod += 2; pRes.drawMod += 1; }
            if (b.mech === 'money_+3_shield') { pRes.moneyMod += 3; pRes.drawMod += 1; pRes.shieldNext = true; } 
            if (b.mech === 'triple_bounty') pRes.tripleTask = true;
        });
        pRes.strokes = Math.max(1, pRes.strokes);
    }

    let minStrokes = 9999; let maxStrokes = -9999;
    for (let key in playerResults) { let s = playerResults[key].strokes; if (s < minStrokes) minStrokes = s; if (s > maxStrokes) maxStrokes = s; }

    let holeWinners = []; let holeLosers = []; let allGotBirdie = true; 
    for (let key in playerResults) { 
        if (playerResults[key].strokes === minStrokes) holeWinners.push(key); 
        if (playerResults[key].strokes === maxStrokes) holeLosers.push(key); 
        if (playerResults[key].strokes > par - 1) allGotBirdie = false;
    }
    
    if (allGotBirdie) window.logEvent(`🏆 KOKO RYHMÄ HEITTI BIRDIE-ALLIANSSIN! Kaikki saavat +2 P bonuksen!`);

    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);

    let ptsWin = window.gameSettings.ptsWin !== undefined ? window.gameSettings.ptsWin : 3;
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 2;
    let ptsLose = window.gameSettings.ptsLose !== undefined ? window.gameSettings.ptsLose : 0;
    let ptsPassive = window.gameSettings.ptsPassive !== undefined ? window.gameSettings.ptsPassive : 2;
    let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
    let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 6;
    
    let holePointBreakdowns = {};
    let globalLocked = window.getGlobalLockedFamilies(nextPlayers, activeHole);

    nextPlayers.forEach(p => {
        if (!p) return; let res = playerResults[p.name]; if (!res) return; 
        
        let oldPoints = parseInt(p.score, 10) || 0;
        let currentPoints = oldPoints;
        let breakdown = [];

        p.dgScore = (parseInt(p.dgScore, 10) || 0) + (res.strokes - par);
        
        p.reservations = Array.isArray(p.reservations) ? p.reservations : Object.values(p.reservations||{});
        if (p.reservations.length > 0) {
            let resCost = p.reservations.length * 1;
            currentPoints -= resCost;
            breakdown.push(`Varausmaksut: -${resCost} P`);
        }

        if (!res.denyPassive) { currentPoints += ptsPassive; breakdown.push(`Passiivinen tulo: +${ptsPassive} P`); }
        if (allGotBirdie) { currentPoints += 2; breakdown.push(`Birdie-Allianssi: +2 P`); }

        if (holeWinners.includes(p.name) && !res.denyWin) {
            let actualWinPts = (holeWinners.length > 1) ? Math.floor(ptsWin * 0.66) : ptsWin;
            actualWinPts = Math.max(1, actualWinPts);
            currentPoints += actualWinPts; breakdown.push(`Väylävoitto: +${actualWinPts} P`);
        }
        
        if (res.taskWon && !res.denyTask) { 
            let actualTaskPts = res.tripleTask ? (ptsTask * 3) : ptsTask;
            currentPoints += actualTaskPts; breakdown.push(`Tehtävävoitto: +${actualTaskPts} P`);
        }
        
        if (holeLosers.includes(p.name) && minStrokes !== maxStrokes) { currentPoints -= Math.abs(ptsLose); currentPoints = Math.max(0, currentPoints); }

        if (res.moneyMod > 0) { currentPoints += res.moneyMod; breakdown.push(`Kortin tuoma bonus: +${res.moneyMod} P`); }
        if (res.moneyMod < 0) { currentPoints += res.moneyMod; breakdown.push(`Kortin tuoma sakko: ${res.moneyMod} P`); }
        
        p.score = currentPoints; 
        p.lastHoleSummary = breakdown.join(", ");
        p.upgradedThisHole = []; 

        let scoreDelta = currentPoints - oldPoints;
        p.lastScoreDelta = scoreDelta; 
        if (scoreDelta !== 0) window.logScore(p.name, scoreDelta, `Väylä ${currentHoleIndex}: ${p.lastHoleSummary}`);

        holePointBreakdowns[p.name] = { delta: scoreDelta, summary: p.lastHoleSummary };

        p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : []; p.cards = p.cards.filter(Boolean);
        
        if (!res.denyDraw) {
            let draws = 0;
            if (p.cards.length < limit) {
                let sId = window.drawSpecificCard('sabotage', 2, globalLocked);
                if (sId) { p.cards.push(sId); draws++; }
            }
            if (p.cards.length < limit) {
                let bId = window.drawSpecificCard('buff', 2, globalLocked);
                if (bId) { p.cards.push(bId); draws++; }
            }
            if (holeLosers.includes(p.name) && minStrokes !== maxStrokes && p.cards.length < limit) {
                let type = Math.random() < 0.5 ? 'sabotage' : 'buff';
                let rId = window.drawSpecificCard(type, 2, globalLocked);
                if (rId) { p.cards.push(rId); draws++; }
            }
            if (res.drawMod > 0) {
                for (let i = 0; i < res.drawMod; i++) {
                    if (p.cards.length < limit) {
                        let type = Math.random() < 0.5 ? 'sabotage' : 'buff';
                        let rId = window.drawSpecificCard(type, 2, globalLocked);
                        if (rId) { p.cards.push(rId); draws++; }
                    }
                }
            }
            if(draws > 0) window.logEvent(`${p.name} nosti ${draws} uutta korttia pakasta.`);
        } else {
            window.logEvent(`${p.name} ei saanut nostaa kortteja väylän lopussa (Korttikato).`);
        }
    });
    
    let holeStrokes = {};
    for (let key in playerResults) { holeStrokes[key] = playerResults[key].strokes; }

    let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
    let pastHole = {
        rule: activeHole.rule,
        playedCards: activeHole.playedCards,
        color: activeHole.color || '#fef08a',
        holeResults: holeStrokes,
        pointBreakdowns: holePointBreakdowns,
        players: JSON.parse(JSON.stringify(nextPlayers))
    };
    nextHistory.push(pastHole);
    
    let nextHoleIndex = currentHoleIndex + 1;
    
    let personalizedShop = {};
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
    let ruleIdx = Math.floor(Math.random() * window.holeRules.length);
    let randomRule = window.holeRules[ruleIdx] || {type:"rule", n:"Peli Jatkuu", d:""};
    
    let nextActiveHole = { rule: randomRule, shop: personalizedShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor(), penColor: getRandomPen() };
    
    update(ref(db), window.cleanFirebaseData({
        'gameState/players': nextPlayers,
        'gameState/currentHoleIndex': nextHoleIndex,
        'gameState/activeHole': nextActiveHole,
        'gameState/history': nextHistory
    }));

    if(el('scoreModal')) el('scoreModal').style.display = 'none'; 
    window.logEvent(`${myName} syötti tulokset väylältä ${currentHoleIndex}.`);
    setTimeout(() => { if(window.zoomToHole) window.zoomToHole(nextHoleIndex); }, 600); 
};

// ==============================================
// RADAN HALLINTA LENNOLTA (GM)
// ==============================================
window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] };
        });
    }

    let globalLocked = new Set();
    nextPlayers.forEach(p => {
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked);
        let bId = window.drawSpecificCard('buff', 1, globalLocked);
        if(sId) p.cards.push(sId);
        if(bId) p.cards.push(bId);
    });

    let personalizedShop = {};
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
    let ruleIdx = Math.floor(Math.random() * window.holeRules.length);
    let randomRule = window.holeRules[ruleIdx] || {type:"rule", n:"Peli Alkaa", d:""};
    
    let nextActiveHole = { rule: randomRule, shop: personalizedShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor(), penColor: getRandomPen() };
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        course: nextCourse, currentHoleIndex: 1, activeHole: nextActiveHole, players: nextPlayers, history: []
    }));
    if(el('courseModal')) el('courseModal').style.display = 'none'; 
};

window.startCustomCourse = function() {
    let name = el('newCourseName').value.trim() || "Oma Rata";
    let holesCount = parseInt(el('newCourseHoles').value, 10) || 18;
    let pars = [];
    for(let i=1; i<=holesCount; i++) {
        let pInput = el(`parInput_${i}`);
        pars.push(pInput ? (parseInt(pInput.value, 10) || 3) : 3);
    }
    
    let nextCourse = { name: name, pars: pars };
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] };
        });
    }

    let globalLocked = new Set();
    nextPlayers.forEach(p => {
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked);
        let bId = window.drawSpecificCard('buff', 1, globalLocked);
        if(sId) p.cards.push(sId);
        if(bId) p.cards.push(bId);
    });

    let personalizedShop = {};
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
    let ruleIdx = Math.floor(Math.random() * window.holeRules.length);
    let randomRule = window.holeRules[ruleIdx] || {type:"rule", n:"Peli Alkaa", d:""};
    
    let nextActiveHole = { rule: randomRule, shop: personalizedShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor(), penColor: getRandomPen() };

    set(ref(db, 'gameState'), window.cleanFirebaseData({ 
        course: nextCourse, currentHoleIndex: 1, activeHole: nextActiveHole, players: nextPlayers, history: [] 
    }));
    if(el('courseModal')) el('courseModal').style.display = 'none';
};

window.cancelCourse = function() {
    if (confirm("Haluatko varmasti lopettaa nykyisen radan? Pelaajat säilyttävät rahansa ja korttinsa.")) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        update(ref(db, 'gameState'), window.cleanFirebaseData({ course: null, activeHole: null, currentHoleIndex: 1, players: nextPlayers, history: [] }));
    }
};

window.resetGame = function() {
    if (confirm("Haluatko nollata pelin? Kaikki kirjataan ulos.")) {
        localStorage.removeItem('friba_browser_mode');
        const defaultSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 6, ptsWin: 3, ptsTask: 2, ptsLose: 0, ptsPassive: 2 };
        set(ref(db, 'gameState'), window.cleanFirebaseData({ settings: defaultSettings, players: [], activeHole: null, currentHoleIndex: 1, course: null, history: [] }))
        .then(() => { localStorage.clear(); location.reload(); });
    }
};

//==============================================
// HELPERIT JA UI PÄIVITYKSET
//==============================================
window.showAppleToast = function(msg, icon = '✨') {
    const toast = el('appleToast');
    if(!toast) return; el('appleToastIcon').innerText = icon; el('appleToastText').innerText = msg; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 2000); 
};
window.cleanFirebaseData = function(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => window.cleanFirebaseData(item)).filter(item => item !== null && item !== undefined);
    let cleaned = {}; for (let key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { let val = window.cleanFirebaseData(obj[key]); if (val !== null && val !== undefined && val !== "undefined") cleaned[key] = val; } } return cleaned;
};
window.logEvent = function(msg) { push(ref(db, 'gameState/eventLog'), window.cleanFirebaseData({ time: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'}), msg: msg })); };
window.logScore = function(playerName, delta, reason) { push(ref(db, 'gameState/scoreLog'), window.cleanFirebaseData({ time: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'}), playerName: playerName, delta: delta, msg: reason })); };

window.updateIdentityUI = function() { if(el('identityCard')) { el('identityCard').style.display = myName ? 'none' : 'block'; } };

window.showNotification = function(message, type = 'info') { 
    const container = el('notificationContainer'); 
    if(!container) return; 
    const toast = document.createElement('div'); 
    toast.className = `notification ${type}`; 
    toast.innerHTML = `<span>${message}</span>`; 
    container.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 6000); 
};

window.claimIdentity = function() { let n = el('playerNameInput').value.trim(); if(!n) return; myName = n; localStorage.setItem('friba_name', n); window.updateIdentityUI(); if(!(allPlayers || []).find(x => x && x.name === n)) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }); set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)); window.logEvent(`${n} liittyi peliin.`); } };

// =============================================
// REAALIAIKAINEN DATABASE KUUNTELIJA
// =============================================
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    
    if(!data) {
        if(myName) { myName = null; localStorage.removeItem('friba_name'); window.updateIdentityUI(); window.closeShopModal(); }
        currentCourse = null;
        if(el('lobbyContainer')) el('lobbyContainer').style.display = 'block';
        if(el('corkboard-viewport')) el('corkboard-viewport').style.display = 'none';
        if(el('settingsToggleBtn')) el('settingsToggleBtn').style.display = 'none';
        if(el('pocketContainer')) el('pocketContainer').style.display = 'none';
        return;
    }

    window.gameSettings = data.settings || { shopEnabled: true, handLimitEnabled: true, handLimit: 6, ptsWin: 3, ptsTask: 2, ptsLose: 0, ptsPassive: 2 };
    window.gameHistory = data.history ? (Array.isArray(data.history) ? data.history : Object.values(data.history)) : [];

    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;
    
    if (myName && !allPlayers.find(p => p && p.name === myName)) { myName = null; localStorage.removeItem('friba_name'); window.closeShopModal(); }
    window.updateIdentityUI();
    
    const lobbyContainer = el('lobbyContainer');
    const corkboardViewport = el('corkboard-viewport');
    const gameSetupArea = el('gameSetupArea');
    const btnSettings = el('settingsToggleBtn');
    const pocket = el('pocketContainer');
    
    if (myName) {
        if (!currentCourse) {
            if(lobbyContainer) lobbyContainer.style.display = 'block';
            if(gameSetupArea) gameSetupArea.style.display = 'block';
            if(corkboardViewport) corkboardViewport.style.display = 'none';
            if(btnSettings) btnSettings.style.display = 'flex'; 
            if(pocket) pocket.style.display = 'none';
        } else {
            if(lobbyContainer) lobbyContainer.style.display = 'none';
            if(corkboardViewport) corkboardViewport.style.display = 'block';
            if(btnSettings) btnSettings.style.display = 'flex';
            if(pocket) pocket.style.display = 'flex';
        }
    } else {
        if(lobbyContainer) lobbyContainer.style.display = 'block';
        if(gameSetupArea) gameSetupArea.style.display = 'none';
        if(corkboardViewport) corkboardViewport.style.display = 'none';
        if(btnSettings) btnSettings.style.display = 'none';
        if(pocket) pocket.style.display = 'none';
    }

    window.renderBoard();
    window.renderReceipt();
    
    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            let currentPoints = parseInt(me.score, 10) || 0;
            if (typeof window.myLastHoleIndex === 'undefined') { 
                window.myLastHoleIndex = currentHoleIndex; 
                window.myLastScore = currentPoints; 
                setTimeout(() => { if(window.zoomToHole) window.zoomToHole(currentHoleIndex); }, 600);
            } 
            else if (window.myLastHoleIndex !== currentHoleIndex) {
                let diff = currentPoints - window.myLastScore;
                let summary = me.lastHoleSummary ? me.lastHoleSummary : "Ei tuloja tai menoja.";
                let cleanSummary = summary.replace(/, /g, '<br>• '); 
                
                if (currentCourse && currentHoleIndex > currentCourse.pars.length) {
                     window.showNotification(`Kaikki väylät pelattu! Katso voittaja taululta.`, 'warning');
                } else if (diff !== 0) {
                    window.showNotification(`<b>VÄYLÄ ${window.myLastHoleIndex} TULOS:</b><br><div style="font-size:0.95rem; line-height:1.4; margin-top:5px; margin-bottom:5px; text-align:left;">• ${cleanSummary}</div><b style="font-size:1.1rem;">Yhteensä: ${diff > 0 ? '+' : ''}${diff} P</b>`, diff > 0 ? 'info' : 'debuff');
                } else {
                    window.showNotification(`<b>VÄYLÄ ${window.myLastHoleIndex} TULOS:</b><br><div style="font-size:0.95rem; line-height:1.4; margin-top:5px; margin-bottom:5px; text-align:left;">• ${cleanSummary}</div><b style="font-size:1.1rem;">Yhteensä: 0 P</b>`, 'info');
                }
                
                window.myLastHoleIndex = currentHoleIndex; 
                window.myLastScore = currentPoints;
                
                setTimeout(() => { if(window.zoomToHole) window.zoomToHole(currentHoleIndex); }, 600);
            } else { window.myLastScore = currentPoints; }

            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
            window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me.reservations, me.score || 0);
            
            if (window.gameSettings.handLimitEnabled && myCards.length > window.gameSettings.handLimit) { window.showHandLimitModal(myCards); } 
            else { if(el('handLimitModal')) el('handLimitModal').style.display = 'none'; }
            
            let pts = `${me.score || 0} P`;
            if(el('myResPointsBtn')) el('myResPointsBtn').innerText = pts; 
            if(el('shopModalWallet')) el('shopModalWallet').innerText = pts; 
            if(el('handCountBadge')) el('handCountBadge').innerText = myCards.length; 
        }

        if (activeHole && activeHole.playedCards) {
            const playedCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            const myNewDebuffs = playedCards.filter(Boolean).filter(pc => (pc.target === myName || pc.target === 'KAIKKI VASTUSTAJAT') && pc.timestamp > lastPlayedCardTimestamp && pc.type === 'sabotage' && pc.by !== myName);
            if (myNewDebuffs.length > 0) {
                myNewDebuffs.forEach(db => { 
                    window.showNotification(`💥 Sinua sabotoitiin: ${db.cardName}`, 'debuff'); 
                    alert(`🚨 SABOTAASI! 🚨\n\n${db.by} pelasi sinuun kortin:\n"${db.cardName}"\n\nLue tarkemmat ohjeet ilmoitustaululta!`);
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
                });
                lastPlayedCardTimestamp = Math.max(...playedCards.map(pc => pc.timestamp));
            }
        }
    }
});
