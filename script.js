
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

window.gameSettings = { 
    shopEnabled: true, 
    handLimitEnabled: true, 
    handLimit: 6, 
    ptsWin: 3, 
    ptsTask: 2, 
    ptsLose: 0, 
    ptsPassive: 2 
};
window.pendingShopPurchase = null;

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
const getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];

const penColors = [
    { c1: '#0284c7', c2: '#38bdf8' }, 
    { c1: '#dc2626', c2: '#f87171' }, 
    { c1: '#16a34a', c2: '#4ade80' },
    { c1: '#d97706', c2: '#fbbf24' }, 
    { c1: '#9333ea', c2: '#c084fc' }, 
    { c1: '#db2777', c2: '#f472b6' }, 
    { c1: '#475569', c2: '#94a3b8' }
];
const getRandomPen = () => penColors[Math.floor(Math.random() * penColors.length)];

const pseudoRandom = (seed) => { 
    let x = Math.sin(seed) * 10000; 
    return x - Math.floor(x); 
};

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
// VAPAA KAMERA & ZOOM
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
    let sX = boardState.x; 
    let sY = boardState.y; 
    let sScale = boardState.scale;
    let startT = performance.now();
    
    function step(time) {
        let p = (time - startT) / duration;
        if (p >= 1) p = 1;
        let ease = 1 - Math.pow(1 - p, 3);
        
        boardState.x = sX + (tX - sX) * ease;
        boardState.y = sY + (tY - sY) * ease;
        boardState.scale = sScale + (tScale - sScale) * ease;
        
        window.applyBoardTransform();
        if (p < 1) {
            camAnim = requestAnimationFrame(step);
        } else {
            camAnim = null;
        }
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

window.zoomToCurrentHole = function() { 
    window.zoomToHole(currentHoleIndex); 
};

const vp = el('corkboard-viewport');
if(vp) {
    vp.addEventListener('touchstart', e => {
        if(camAnim) { 
            cancelAnimationFrame(camAnim); 
            camAnim = null; 
        }
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
            boardState.scale *= scaleDiff;
            
            if(boardState.scale < 0.35) boardState.scale = 0.35;
            if(boardState.scale > 1.8) boardState.scale = 1.8;
            initialPinchDist = dist;
        }
        
        if (!isRendering) { 
            isRendering = true; 
            requestAnimationFrame(window.applyBoardTransform); 
        }
    }, {passive: false});

    vp.addEventListener('touchend', e => {
        isDraggingBoard = false; 
        lastBoardTouch = null;
        if (!isRendering) { 
            isRendering = true; 
            requestAnimationFrame(window.applyBoardTransform); 
        }
    }, {passive: true});
}

// ==============================================
// SWIPE TO CLOSE (Kansiolle ja modaaleille)
// ==============================================
let swipeStartX = 0; 
let swipeStartY = 0; 
let swipeContentEl = null; 
let isValidSwipeToClose = false;

document.addEventListener('DOMContentLoaded', () => {
    const handles = document.querySelectorAll('.binder-swipe-handle');
    handles.forEach(handle => {
        handle.addEventListener('touchstart', e => {
            swipeStartY = e.touches[0].clientY;
            swipeStartX = e.touches[0].clientX;
            swipeContentEl = handle;
            isValidSwipeToClose = true;
        }, {passive:true});
        
        handle.addEventListener('touchend', e => {
            if (swipeStartY > 0 && swipeContentEl && isValidSwipeToClose) {
                let diffY = e.changedTouches[0].clientY - swipeStartY;
                let diffX = Math.abs(e.changedTouches[0].clientX - swipeStartX);
                
                if (diffY > 100 && diffY > diffX * 2) {
                    if(el('shopModal')) {
                        el('shopModal').style.display = 'none';
                    }
                    window.pendingShopPurchase = null;
                }
            }
            swipeStartY = 0; 
            swipeContentEl = null;
        }, {passive:true});
    });
});

// ==============================================
// KORTTIMOOTTORI (PELUUMAKSUT: 2/4/6 P, LUKITUKSET)
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
    
    if (playersArray) {
        playersArray.forEach(p => {
            if (p.cards) {
                p.cards.forEach(cId => { 
                    let def = window.allCards.find(c => c.id === cId); 
                    if(def) locked.add(def.family); 
                });
            }
            if (p.reservations) {
                p.reservations.forEach(cId => { 
                    let def = window.allCards.find(c => c.id === cId); 
                    if(def) locked.add(def.family); 
                });
            }
        });
    }
    
    if (currentActiveHole && currentActiveHole.shop) {
        Object.values(currentActiveHole.shop).forEach(sArr => {
            if (Array.isArray(sArr)) {
                sArr.forEach(cDef => { 
                    if(cDef) locked.add(cDef.family); 
                });
            }
        });
    }
    
    return locked;
};

window.drawSpecificCard = function(type, maxLevel, lockedFamilies) {
    let pool = window.allCards.filter(c => c.type === type && c.level <= maxLevel && !lockedFamilies.has(c.family));
    
    if (pool.length === 0) {
        pool = window.allCards.filter(c => c.type === type && !lockedFamilies.has(c.family)); 
    }
    if (pool.length === 0) {
        pool = window.allCards.filter(c => !lockedFamilies.has(c.family)); 
    }
    if (pool.length === 0) return null; 

    let candidates = pool;
    if (maxLevel >= 2) {
        let wantLvl = Math.random() < 0.2 ? 2 : 1;
        let lvlPool = pool.filter(c => c.level === wantLvl);
        if (lvlPool.length > 0) candidates = lvlPool;
    } else {
        let lvlPool = pool.filter(c => c.level === 1);
        if (lvlPool.length > 0) candidates = lvlPool;
    }

    let picked = candidates[Math.floor(Math.random() * candidates.length)];
    lockedFamilies.add(picked.family); 
    return picked.id;
};

window.generatePersonalShop = function(lockedFamilies) {
    let shop = [];
    let levelsToDraw = [3, 3, 2, 2, 1, 1]; // 2 kpl jokaista tasoa
    
    levelsToDraw.forEach(lvl => {
        let pool = window.allCards.filter(c => c.level === lvl && !lockedFamilies.has(c.family));
        
        if (pool.length === 0) {
            pool = window.allCards.filter(c => !lockedFamilies.has(c.family)); 
        }
        
        if (pool.length > 0) {
            let picked = pool[Math.floor(Math.random() * pool.length)];
            shop.push(picked);
            lockedFamilies.add(picked.family);
        } else {
            shop.push(null); // Jätetään tyhjä slotti jos kortit oikeasti loppuvat kesken
        }
    });
    return shop;
};

window.getCardSortWeight = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if (!cDef) return 5;
    if (cDef.level === 3) return 1;
    if (cDef.level === 2) return 2;
    if (cDef.type === 'buff') return 3;
    return 4;
};

// ==============================================
// RENDERÖINTI (TAULU, VÄYLÄT JA LASKELMAT)
// ==============================================
window.showZoomModal = function(html) {
    el('zoomModalContent').innerHTML = html;
    let child = el('zoomModalContent').firstElementChild;
    if(child) {
        child.style.position = 'relative'; 
        child.style.margin = '0 auto'; 
        child.style.transform = 'none';
        child.style.width = '100%'; 
        child.style.maxWidth = '90vw';
    }
    el('zoomModalContent').style.transform = `scale(${Math.min(1.1, (window.innerWidth * 0.95) / 300)})`;
    window.showModalSafe('zoomModal');
};

window.showEventCard = function(cId, target, by) {
    window.carouselCards = [cId];
    window.carouselCurrentMode = 'event';
    window.carouselCurrentIndex = 0;
    
    window.renderCarousel();
    
    let targetStr = '';
    if (target) {
        targetStr = `
            <div style="background:var(--danger); color:#fff; padding:15px; border-radius:8px; font-weight:900; font-size:1.2rem; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.4); margin-bottom:10px;">
                SUORITTAJA:<br><span style="font-size:1.8rem; font-family:'Kalam', cursive;">${target}</span>
                <div style="font-size:0.85rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div>
            </div>`;
    }
    
    el('cardDetailActionArea').innerHTML = targetStr + `<button class="btn btn-secondary glass-card" onclick="document.getElementById('cardDetailModal').style.display='none'">SULJE</button>`;
    
    window.showModalSafe('cardDetailModal');
    setTimeout(() => { 
        if(window.initNativeCarousel) window.initNativeCarousel(); 
    }, 100);
};

window.getHoleCellHTML = function(hData, hIndex, isActive, isHistory) {
    let clickAttr = `onclick="window.zoomToHole(${hIndex})" style="cursor:pointer;"`;
    let html = `<div class="hole-cell" ${clickAttr}>`;
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[hIndex - 1] || 3) : 3;
    
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
        let ruleLen = hData.rule.d ? hData.rule.d.length : 0;
        let pSize = ruleLen > 80 ? '0.95rem' : '1.15rem';
        let pLh = ruleLen > 80 ? '1.25' : '1.4';

        html += `
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg);" onclick="event.stopPropagation(); window.showZoomModal(this.outerHTML)">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: ${pSize}; line-height: ${pLh}; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    let playedCards = [];
    if (hData.playedCards) {
        playedCards = Object.values(hData.playedCards).filter(Boolean);
    }
    
    if(playedCards.length > 0) {
        let myCards = [];
        let otherCards = [];
        
        playedCards.forEach(pc => { 
            if (pc.target === myName || pc.target === 'KAIKKI VASTUSTAJAT') {
                myCards.push(pc); 
            } else {
                otherCards.push(pc); 
            }
        });

        if (myCards.length > 0) {
            html += `<div style="width: 100%; max-width:360px; margin-bottom: 15px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">`;
            myCards.forEach((pc, idx) => {
                let typeClass = `tier-${pc.level || 1}`;
                let tagTxt = `TASO ${pc.level || 1}`;
                let cRot = (pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {d: pc.cardDesc};
                
                let safeCardName = pc.cardName ? pc.cardName.split(' (')[0] : '';
                
                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg);" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    <div class="physical-card ${typeClass}" style="width: 175px; height: 245px;">
                        <div class="card-type-tag">${tagTxt}</div>
                        <h3 style="font-size:1.1rem; margin-top:10px; line-height:1.1;">${safeCardName}</h3>
                        <p style="font-size:0.75rem; line-height:1.2; overflow-y:auto; margin-bottom:4px; flex:1;">${cDef.d}</p>
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
            html += `
                <div style="width: 100%; max-width:300px; margin-top: 15px; margin-bottom: 15px; position:relative; background:var(--paper-bg); padding:10px; box-shadow: 2px 4px 10px rgba(0,0,0,0.2); border-radius:2px; transform: rotate(${pRot}deg);">
                    <div class="tape tape-top" style="--rot:-2deg;"></div>
                    <h2 style="color:var(--text-main); font-size:0.95rem; margin-bottom:10px; border-bottom:2px dashed #ccc; padding-bottom:5px; font-family:'Kalam', cursive; text-align:center;">PELITAPAHTUMAT</h2>
                    <div style="display:flex; flex-direction:column; gap:6px;">`;
            
            otherCards.forEach((pc) => {
                let typeIcon = pc.type === 'buff' ? '🛡️' : '🚫';
                let typeColor = pc.type === 'buff' ? 'var(--info)' : 'var(--danger)';
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                
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

    sortedPlayers.forEach((p) => {
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
    
    // Yksityinen palkkalaskelma
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
                <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">Kausi: Väylä ${hIndex}</div>
            </div>
            <div style="margin-bottom:12px; font-size:0.95rem; color:#1e293b;">
                <span style="font-weight:bold;">Työntekijä:</span> ${myName.toUpperCase()}
            </div>
            <div style="font-size:0.85rem; margin-bottom:15px; border-top:1px solid #94a3b8; padding-top:8px;">
                <div style="display:flex; justify-content:space-between; font-weight:800; color:#1e293b; border-bottom:1px solid #94a3b8; padding-bottom:4px; margin-bottom:4px;">
                    <span>Tulolaji / Tapahtuma</span><span>Määrä</span>
                </div>
                ${rowsHtml}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:10px; border-radius:4px; border:2px solid ${deltaColor};">
                <span style="font-weight:800; font-size:1.1rem; color:#334155;">NETTOPALKKA</span>
                <span style="font-weight:900; font-size:1.5rem; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
            </div>
        </div>`;
    }
    
    // Piirustukset edellisistä väylistä
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
            let cInsult = rawInsult.replace(/\[Pelaaja\],\s*/g, '').replace(/\[Pelaaja\]\s*/g, '').replace(/\[Pelaaja\]/g, '');
            dText = "Tasapeli pohjalla! " + cInsult.charAt(0).toUpperCase() + cInsult.slice(1);
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
    if (!board || !currentCourse) return;
    
    let totalHoles = currentCourse.pars.length; 
    let cols = Math.min(9, totalHoles); 
    let rows = Math.ceil(totalHoles / cols);
    
    board.style.width = `${240 + (cols * 380) + ((cols - 1) * 80)}px`; 
    board.style.height = `${240 + (rows * 950) + ((rows - 1) * 60)}px`; 
    board.style.gridTemplateColumns = `repeat(${cols}, 380px)`;
    
    let html = ``; 
    window.gameHistory.forEach((h, index) => { 
        html += window.getHoleCellHTML(h, index + 1, false, true); 
    });
    
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
    } else if (activeHole) { 
        html += window.getHoleCellHTML({ rule: activeHole.rule, playedCards: activeHole.playedCards, color: activeHole.color, penColor: activeHole.penColor, players: allPlayers }, currentHoleIndex, true, false); 
    }
    board.innerHTML = html;
};

window.renderReceipt = function() {
    if(!allPlayers || allPlayers.length === 0 || !currentCourse) {
        if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'none'; 
        return; 
    }
    
    let generateTotals = () => { 
        let html = ``; 
        [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)).forEach(p => { 
            let scoreStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            html += `<div class="r-row" style="font-size:1.8rem;"><span>${p.name.substring(0, 12)}</span><span>${scoreStr}</span></div>`; 
        }); 
        return html; 
    };
    
    if(el('receipt-full-content')) { 
        let html = `<div class="r-title" style="font-size:1.5rem; margin-bottom:15px;">TULOKSET</div>`;
        for(let i=0; i<window.gameHistory.length; i++) { 
            let h = window.gameHistory[i]; 
            let par = currentCourse.pars ? (currentCourse.pars[i] || 3) : 3; 
            
            html += `<div class="r-hole-title">Väylä ${i+1} <span style="color:#666;">(PAR ${par})</span></div>`; 
            
            if(h.holeResults) { 
                for(let pName in h.holeResults) { 
                    let strokes = h.holeResults[pName]; 
                    let diff = strokes - par;
                    let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red'); 
                    if (diff < -1) cClass = 'blue'; 
                    html += `<div class="r-row"><span>${pName.substring(0, 12)}</span><span class="receipt-circle ${cClass}">${strokes}</span></div>`; 
                } 
            } 
        }
        html += `<div class="r-tot-sec" style="margin-top:10px; border-top: 2px dashed #111; padding-top:10px;">${generateTotals()}</div>`;
        el('receipt-full-content').innerHTML = html; 
    }
};

// ==============================================
// KORTTIEN PELAAMINEN JA UPGRADE (Tarkastelunäkymä)
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
    
    // Helpotukset (Buffit) pelataan suoraan itselle
    if(cardDef.type === 'buff') { 
        window.executeCardPlay(myName); 
        return; 
    }
    
    let opponents = (allPlayers || []).filter(p => p && p.name !== myName);
    
    // Jos vain 1 vastustaja, pelataan automaattisesti hänelle
    if (opponents.length === 1) { 
        window.executeCardPlay(opponents[0].name); 
        return; 
    }
    
    if(el('targetCardName')) el('targetCardName').innerText = cardDef.n; 
    const list = el('targetPlayerList');
    if(!list) return; 
    list.innerHTML = '';
    
    opponents.forEach(p => {
        let encodedName = p.name.replace(/"/g, '&quot;');
        list.innerHTML += `<button class="btn btn-secondary glass-card" data-name="${encodedName}" style="border:3px solid var(--border); color:var(--text-main); width:100%; padding:20px; border-radius:12px; margin-bottom:12px; font-weight:900; font-size:1.3rem; text-align:center;" onclick="window.executeCardPlay(this.getAttribute('data-name'))">${p.name}</button>`;
    });
    window.showModalSafe('targetModal');
};

window.executeCardPlay = function(targetName) {
    if(!window.pendingCardPlay) return; 
    
    const card = window.pendingCardPlay; 
    const timestamp = Date.now();
    
    if(el('targetModal')) el('targetModal').style.display = 'none'; 
    window.closeShopModal();
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p && p.name === myName);
    
    if(me && me.cards) { 
        me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
        me.cards = me.cards.filter(Boolean);
        let actualIndex = me.cards.indexOf(card.id);
        if (actualIndex !== -1) {
            me.cards.splice(actualIndex, 1); 
        }
        
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
        pCards[cKey] = { 
            cardId: card.id, 
            cardName: card.def.n, 
            cardDesc: card.def.d, 
            target: targetName, 
            by: myName, 
            type: card.def.type, 
            level: card.def.level, 
            mech: card.def.mech || null, 
            timestamp: timestamp 
        };
    }
    
    update(ref(db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers), 
        'gameState/activeHole/playedCards': window.cleanFirebaseData(pCards) 
    });
    
    window.logEvent(`${myName} pelasi kortin ${card.def.n} kohteelle ${targetName}. Maksoi ${card.cost} P.`);
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, card.def.type === 'buff' ? 'info' : 'debuff');
};

window.upgradeCard = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if (!cDef || !cDef.nextId) return;
    
    let nextDef = window.allCards.find(c => c.id === cDef.nextId);
    if (!nextDef) return;
    
    let cost = (cDef.level === 1) ? 3 : 5;
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    
    if(me.score < cost) { alert("Ei tarpeeksi P-rahaa päivitykseen!"); return; }
    
    me.score -= cost;
    
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    let idx = me.cards.indexOf(cId);
    if(idx !== -1) { 
        me.cards[idx] = nextDef.id; 
    }
    
    if(!me.upgradedThisHole) me.upgradedThisHole = [];
    me.upgradedThisHole.push(nextDef.id);
    
    update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
    
    window.logScore(myName, -cost, `Päivitti kortin tasolle ${nextDef.level}`);
    window.showAppleToast(`Päivitetty! (-${cost} P)`, '✨');
    
    if(document.getElementById('cardDetailModal').style.display !== 'none') {
        window.openCardDetail(nextDef.id, window.carouselCurrentMode);
    }
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
        let pId = window.pendingShopPurchase.id; 
        let pPrice = window.pendingShopPurchase.price; 
        let isRes = window.pendingShopPurchase.isRes;
        
        if (me.score >= pPrice) {
            me.score -= pPrice; 
            me.cards.push(pId);
            window.logScore(myName, -pPrice, `Osti kortin automaatista myynnin jälkeen`);
            
            if (isRes) {
                me.reservations = me.reservations || [];
                let rIdx = me.reservations.indexOf(pId);
                if (rIdx !== -1) me.reservations.splice(rIdx, 1);
            } else {
                let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
                if (nextShopAll[myName]) {
                    const sIdx = nextShopAll[myName].findIndex(i => i && i.id === pId);
                    if (sIdx !== -1) {
                        nextShopAll[myName][sIdx] = null; // Jätetään tyhjäksi automaattiin
                    }
                }
                update(ref(db, 'gameState/activeHole/shop'), window.cleanFirebaseData(nextShopAll));
            }

            update(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
            window.pendingShopPurchase = null; 
            window.switchShopTab('sell');
            window.showNotification(`🛒 Ostit edun!`, 'warning');
            return;
        } else { 
            window.pendingShopPurchase = null; 
        }
    }
    
    set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
    if(document.getElementById('cardDetailModal')) {
        document.getElementById('cardDetailModal').style.display='none';
    }
};

// ==============================================
// VÄLIPALA-AUTOMAATIN TOIMINNOT (Varaukset yms)
// ==============================================
window.reserveShopItem = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    
    me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations || {});
    if (me.reservations.length >= 2) { 
        alert("Voit pitää vain 2 varausta kerrallaan!"); 
        return; 
    }
    
    me.reservations.push(idStr);
    
    let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
    if (nextShopAll[myName]) {
        const sIdx = nextShopAll[myName].findIndex(i => i && i.id === idStr);
        if (sIdx !== -1) {
            nextShopAll[myName][sIdx] = null; // Korvataan nullilla -> Tyhjä kierrejousi UI:hin
        }
    }

    update(ref(db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers), 
        'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) 
    });
    window.showAppleToast('Kortti varattu', '🔒');
};

window.cancelReservation = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    if (!me || !me.reservations) return; 

    me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations || {});
    let rIdx = me.reservations.indexOf(idStr);
    
    if (rIdx !== -1) {
        me.reservations.splice(rIdx, 1);
        
        let cDef = window.allCards.find(c => c.id === idStr);
        let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {}));
        if (nextShopAll[myName]) { 
            nextShopAll[myName].push(cDef); 
        }
        
        update(ref(db), { 
            'gameState/players': window.cleanFirebaseData(nextPlayers), 
            'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) 
        });
        window.showAppleToast('Varaus peruttu', '🔓');
    }
};

window.buyShopItem = function(idStr, priceVal, isReservation) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === myName);
    if (!me || me.score < priceVal) { 
        alert("Ei tarpeeksi rahaa!"); 
        return; 
    }

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
    
    window.logScore(myName, -priceVal, `Osti kortin automaatista`);
    
    let nextShopAll = JSON.parse(JSON.stringify(activeHole.shop || {})); 
    
    if (isReservation) {
        me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations || {});
        let rIdx = me.reservations.indexOf(idStr);
        if(rIdx !== -1) me.reservations.splice(rIdx, 1);
    } else {
        if (nextShopAll[myName]) {
            const sIdx = nextShopAll[myName].findIndex(i => i && i.id === idStr);
            if (sIdx !== -1) {
                nextShopAll[myName][sIdx] = null; // Korvataan nullilla
            }
        }
    }

    update(ref(db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers), 
        'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) 
    });
    
    window.switchShopTab('sell');
    window.showNotification(`🛒 Ostit edun!`, 'warning');
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    const me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me ? me.reservations : [], me ? me.score : 0);
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
        el('shopBuyArea').style.display = 'block'; 
        el('shopSellArea').style.display = 'none';
        
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.add('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.remove('active');
        if(modalEl) { 
            modalEl.classList.remove('theme-own'); 
            modalEl.classList.add('theme-shop'); 
        }
    } else {
        el('shopBuyArea').style.display = 'none'; 
        el('shopSellArea').style.display = 'block';
        
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.remove('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.add('active');
        if(modalEl) { 
            modalEl.classList.remove('theme-shop'); 
            modalEl.classList.add('theme-own'); 
        }
    }
    
    let me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me ? me.reservations : [], me ? me.score : 0);
};

// ==============================================
// KAUPAN JA KANSION RENDERÖINTI
// ==============================================
window.renderShop = function(shopArray, resArray, myPoints) {
    let me = (allPlayers || []).find(p => p && p.name === myName);

    // 1. VÄLIPALA-AUTOMAATTI
    let shelvesHtml = '';
    let actRes = (resArray || []).filter(Boolean);
    let levels = [3, 2, 1]; // T3 ylin, T1 alin

    // Rakennetaan hyllyt
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
                            <div class="play-cost-badge" style="background:#111; color:#fff; border:1px solid #fff; font-size:0.65rem; padding:2px 6px;">MAKSU: ${window.getCardPlayCost(item.id)} P</div>
                            <div class="card-type-tag">TASO ${item.level}</div>
                            <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${item.n.split(' (')[0]}</h3>
                            <p style="font-size:0.65rem; line-height:1.1; overflow-y:auto;">${item.d}</p>
                            <div style="text-align:center; font-weight:900; font-size:0.7rem; color:#111; margin-top:auto; padding-top:5px;">🔄 KÄÄNNÄ</div>
                        </div>
                        <div class="vending-coil"></div>
                        <div class="vending-price-tag">${item.price} P</div>
                        <div style="display:flex; gap:5px; margin-top:5px; width:140px; transform:scale(0.9);">
                            <button class="vending-btn-buy" ${!canAfford?'disabled':''} style="${!canAfford?'opacity:0.5':''}" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="vending-btn-reserve" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
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
    
    // Varaukset erilliseen luukkuun
    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `<div class="vending-reserved-area"><div style="display:flex; justify-content:space-around;">`;
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            
            reserveHtml += `
                <div class="vending-slot">
                    <div class="physical-card tier-${resItem.level}" style="width:140px; height:200px; transform: scale(0.9); cursor:pointer;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div class="play-cost-badge" style="background:#111; color:#fff; border:1px solid #fff; font-size:0.65rem; padding:2px 6px;">MAKSU: ${window.getCardPlayCost(resItem.id)} P</div>
                        <div class="card-type-tag" style="background:#ef4444;">🔒 VARATTU</div>
                        <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${resItem.n.split(' (')[0]}</h3>
                        <p style="font-size:0.65rem; line-height:1.1; overflow-y:auto;">${resItem.d}</p>
                        <div style="text-align:center; font-weight:900; font-size:0.7rem; color:#111; margin-top:auto; padding-top:5px;">🔄 KÄÄNNÄ</div>
                    </div>
                    <div class="vending-price-tag" style="background:#ef4444; border-color:#ef4444; color:#fff; margin-top:0;">${resItem.price} P</div>
                    <div style="display:flex; gap:5px; margin-top:5px; width:140px; transform:scale(0.9);">
                        <button class="vending-btn-buy" ${!canAfford?'disabled':''} style="${!canAfford?'opacity:0.5':''}" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">OSTA</button>
                        <button class="vending-btn-reserve" style="background:#ef4444; border-color:#991b1b;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }
    if(el('shopReserveArea')) el('shopReserveArea').innerHTML = reserveHtml;

    // 2. KORTTIKANSIO (Omat)
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
            <div class="plastic-sleeve">
                <div class="physical-card ${typeClass}" style="width: 100%; height: 200px; margin: 0 auto; ${isLocked ? 'opacity:0.6;' : ''} cursor:pointer;" onclick="window.openCardDetail('${cId}', 'sell')">
                    <div class="play-cost-badge">MAKSU: ${playCost} P</div>
                    <h3 style="font-size:1rem; margin-top:5px; line-height:1.1;">${cDef.n.split(' (')[0]}</h3>
                    <p style="font-size:0.75rem; line-height:1.2; overflow-y:auto; margin-bottom:4px; flex:1;">${cDef.d}</p>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:#111; margin-top:auto; padding-top:5px;">🔄 KÄÄNNÄ</div>
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
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSI TÄYNNÄ!</div><p>Haluat ostaa: <strong>${window.pendingShopPurchase.name}</strong>. Myy yksi kortti alta, niin osto suoritetaan!</p><button class="btn btn-secondary" style="padding:10px; color:#000;" onclick="event.stopPropagation(); window.cancelShopPurchase()">PERUUTA OSTO</button>`;
        } else if (myCards.length > limit) {
            alertEl.style.display = 'block'; 
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSIRAJA YLITETTY!</div><p>Kortteja ${myCards.length}/${limit}. Myy kortteja!</p>`;
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
        html += `
        <div style="background:#fff; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#000;">
            <div style="text-align:left;">
                <div style="font-size:0.75rem; font-weight:900; color:var(--text-muted);">TASO ${cDef.level}</div>
                <div style="font-size:1.1rem; font-weight:900; color:#000;">${cDef.n.split(' (')[0]}</div>
            </div>
            <button class="btn btn-danger" style="width:auto; padding:10px 15px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}')">♻️ MYY (+${sellReward} P)</button>
        </div>`;
    });
    
    el('handLimitCards').innerHTML = html; 
    window.showModalSafe('handLimitModal');
};

//==============================================
// TURVALLINEN KARUSELLI Z-PÄIVITYKSELLÄ (Ei sekoita järjestystä)
//==============================================
window.isFlipping = false;
window.flippedCards = new Set();

window.initNativeCarousel = function() {
    // Tyhjä funktio, jotta ei tule erroria.
};

window.flipCard = function(index) {
    if(window.isFlipping) return;
    const inner = el(`card3d-inner-${index}`);
    if (!inner) return;
    
    window.isFlipping = true;
    let cId = window.carouselCards[index];
    
    if (!window.flippedCards.has(cId)) { 
        window.flippedCards.add(cId); 
        inner.classList.add('flipped'); 
    } else { 
        window.flippedCards.delete(cId); 
        inner.classList.remove('flipped'); 
    }
    
    setTimeout(() => { window.isFlipping = false; }, 300); 
};

window.renderCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    
    let html = '';
    window.carouselCards.forEach((cId, i) => {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(!cDef) return;
        
        let typeClass = `tier-${cDef.level}`;
        let flippedClass = window.flippedCards.has(cId) ? 'flipped' : '';
        let playCost = window.getCardPlayCost(cId);
        
        // Etsitään KAIKKI tämän korttiperheen tasot kääntöpuolta varten
        let familyCards = window.allCards.filter(c => c.family === cDef.family).sort((a,b) => a.level - b.level);
        let levelsHtml = '';
        
        familyCards.forEach(fc => {
            let isActive = fc.level === cDef.level;
            levelsHtml += `
                <li style="${isActive ? 'color:var(--warning); font-weight:bold;' : 'color:#ccc; opacity:0.8;'}">
                    <span class="lvl-tag">TASO ${fc.level} ${isActive ? '(NYKYINEN)' : ''}</span>
                    ${fc.d}
                </li>`;
        });
        
        let backHtml = `
            <div style="background:#1e293b; border:4px solid #475569; width:100%; height:100%; border-radius:12px; display:flex; flex-direction:column; padding:15px; box-sizing:border-box; color:#fff;">
                <div style="font-size:1.1rem; font-weight:900; color:var(--warning); margin-bottom:15px; text-transform:uppercase; text-align:center; border-bottom:2px dashed #475569; padding-bottom:10px;">${cDef.n.split(' (')[0]} Tasot</div>
                <ul class="card-levels-list" style="flex:1; overflow-y:auto; list-style-type:none; margin:0; padding:0;">
                    ${levelsHtml}
                </ul>
            </div>`;
        
        html += `
            <div class="carousel-card-wrapper" style="transform:none; position:relative; margin:0 auto;" data-id="${cId}" onclick="window.flipCard(${i})">
                <div class="card-3d-inner ${flippedClass}" id="card3d-inner-${i}">
                    <div class="card-face card-front ${typeClass}">
                        <div style="text-align:left; display:flex; flex-direction:column; height:100%; position:relative; z-index:20;">
                            <div class="play-cost-badge">MAKSU: ${playCost} P</div>
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
    window.carouselCards = [cId]; 
    window.carouselCurrentMode = mode;
    
    window.renderCarousel(); 
    window.showModalSafe('cardDetailModal');
    
    let btnHtml = '';
    
    if (mode === 'sell') {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(cDef) {
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cDef.id);
            let playCost = window.getCardPlayCost(cDef.id);
            let canPlay = me.score >= playCost && !isLocked;
            let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
            
            if (cDef.nextId && cDef.upgradeDesc) {
                let upgCost = cDef.level === 1 ? 3 : 5;
                let canUpg = me.score >= upgCost;
                btnHtml += `<button class="btn ${canUpg ? 'btn-warning' : 'btn-secondary'}" ${!canUpg ? 'disabled' : ''} style="font-size:1.1rem; padding:15px; margin-bottom:10px; color:#000;" onclick="event.stopPropagation(); window.upgradeCard('${cId}')">🔼 UPGRADE TASOLLE ${cDef.level + 1} (${upgCost} P)</button>`;
            }
            
            btnHtml += `<button class="btn ${canPlay ? 'btn-success' : 'btn-secondary'}" ${!canPlay ? 'disabled' : ''} style="font-size:1.2rem; padding:20px; box-shadow:0 4px 15px rgba(16,185,129,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cDef.id}')">PELAA KORTTI (${playCost} P)</button>`;
            btnHtml += `<button class="btn btn-danger" style="font-size:1.1rem; padding:15px; margin-top:10px;" onclick="window.forceDiscard('${cDef.id}')">♻️ MYY KORTTI (+${sellReward} P)</button>`;
        }
    } else if (mode === 'shop' || mode === 'shop_res') {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(cDef) {
            let canAfford = me.score >= cDef.price;
            let isRes = mode === 'shop_res';
            btnHtml += `<button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" ${!canAfford ? 'disabled' : ''} style="font-size:1.2rem; padding:20px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cDef.id}', ${cDef.price}, ${isRes})">OSTA (${cDef.price} P)</button>`;
        }
    }
    
    el('cardDetailActionArea').innerHTML = btnHtml;
};

// ==============================================
// SCORE SYÖTTÖ, TALOUS JA VETO
// ==============================================
window.changeScore = function(safeId, par, delta) {
    let input = el(`scoreInput_${safeId}`); 
    if(!input) return; 
    let val = Math.max(1, parseInt(input.value) + delta); 
    input.value = val;
    let display = el(`scoreDisplay_${safeId}`);
    if(display) { 
        display.innerText = val; 
        display.className = 'score-display-paper'; 
        if(val < par) display.classList.add('score-birdie-paper'); 
        else if(val > par) display.classList.add('score-bogey-paper'); 
    }
};

window.openScoreModal = function() {
    let par = currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    el('scoreModalHoleNum').innerText = currentHoleIndex; 
    el('scoreModalPar').innerText = par; 
    
    let html = ''; let taskCheckboxes = '';
    
    (allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        let safeId = "player_" + i; 
        taskCheckboxes += `<label class="task-paper-label"><input type="checkbox" class="task-paper-checkbox" data-name="${p.name}" /> ${p.name}</label>`;
        html += `
        <div class="score-row-paper">
            <span class="score-name-paper">${p.name}</span>
            <div class="score-controls-paper">
                <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                <div id="scoreDisplay_${safeId}" class="score-display-paper">${par}</div>
                <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
                <input type="hidden" class="score-input-data" data-name="${p.name}" id="scoreInput_${safeId}" value="${par}" />
            </div>
        </div>`;
    });
    
    el('scoreInputsContainer').innerHTML = html; 
    el('taskWinnerContainer').innerHTML = taskCheckboxes; 
    window.showModalSafe('scoreModal');
};

window.submitScores = function() {
    let par = currentCourse.pars[currentHoleIndex - 1] || 3;
    let playerResults = {};
    (allPlayers || []).forEach(p => { if(p) playerResults[p.name] = { strokes: par, taskWon: false }; });
    
    document.querySelectorAll('.score-input-data').forEach(input => { 
        if(playerResults[input.getAttribute('data-name')]) {
            playerResults[input.getAttribute('data-name')].strokes = parseInt(input.value, 10) || par; 
        }
    });
    document.querySelectorAll('.task-paper-checkbox:checked').forEach(cb => { 
        if(playerResults[cb.getAttribute('data-name')]) {
            playerResults[cb.getAttribute('data-name')].taskWon = true; 
        }
    });

    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    let ptsWin = window.gameSettings.ptsWin || 3; 
    let ptsTask = window.gameSettings.ptsTask || 2; 
    let ptsPassive = window.gameSettings.ptsPassive || 2; 
    let limit = window.gameSettings.handLimit || 6;
    let globalLocked = window.getGlobalLockedFamilies(nextPlayers, activeHole);

    let minStrokes = 999; 
    for (let key in playerResults) { 
        if (playerResults[key].strokes < minStrokes) minStrokes = playerResults[key].strokes; 
    }
    let holeWinners = []; 
    for (let key in playerResults) { 
        if (playerResults[key].strokes === minStrokes) holeWinners.push(key); 
    }

    nextPlayers.forEach(p => {
        let res = playerResults[p.name];
        p.dgScore = (parseInt(p.dgScore) || 0) + (res.strokes - par);
        
        let currentPoints = parseInt(p.score) || 0;
        p.reservations = p.reservations || [];
        if (p.reservations.length > 0) currentPoints -= p.reservations.length; 
        
        currentPoints += ptsPassive; 
        if (holeWinners.includes(p.name)) {
            currentPoints += (holeWinners.length > 1) ? Math.floor(ptsWin * 0.66) : ptsWin;
        }
        if (res.taskWon) {
            currentPoints += ptsTask;
        }
        
        p.score = currentPoints;
        p.upgradedThisHole = []; 
        
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

    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: {}, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: getRandomColor(), 
        penColor: getRandomPen() 
    };
    
    nextPlayers.forEach(p => { 
        nextActiveHole.shop[p.name] = window.generatePersonalShop(globalLocked); 
    });
    
    let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
    let holeStrokes = {}; 
    for (let key in playerResults) { holeStrokes[key] = playerResults[key].strokes; }
    
    nextHistory.push({ 
        rule: activeHole.rule, 
        playedCards: activeHole.playedCards, 
        color: activeHole.color, 
        holeResults: holeStrokes, 
        players: JSON.parse(JSON.stringify(nextPlayers)) 
    });
    
    update(ref(db), window.cleanFirebaseData({ 
        'gameState/players': nextPlayers, 
        'gameState/currentHoleIndex': currentHoleIndex + 1, 
        'gameState/activeHole': nextActiveHole, 
        'gameState/history': nextHistory 
    }));
    
    el('scoreModal').style.display = 'none'; 
};

// ==============================================
// GM-TOIMINNOT JA ASETUKSET
// ==============================================
window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextPlayers = (allPlayers||[]).filter(Boolean).map(p => { 
        return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; 
    });
    
    let globalLocked = new Set();
    nextPlayers.forEach(p => { 
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked); 
        let bId = window.drawSpecificCard('buff', 1, globalLocked); 
        if(sId) p.cards.push(sId); 
        if(bId) p.cards.push(bId); 
    });
    
    let personalizedShop = {}; 
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: personalizedShop, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: getRandomColor() 
    };
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({ 
        course: nextCourse, 
        currentHoleIndex: 1, 
        activeHole: nextActiveHole, 
        players: nextPlayers, 
        history: [] 
    }));
};

window.renderParInputs = function() {
    let count = parseInt(el('newCourseHoles').value) || 18; 
    let container = el('newCourseParsContainer'); 
    if(!container) return;
    
    let html = ''; 
    for(let i=1; i<=count; i++) { 
        html += `<div style="display:flex; flex-direction:column; align-items:center;"><span style="font-size:0.8rem;">V${i}</span><input type="number" id="parInput_${i}" value="3" min="2" max="6" style="width:100%; padding:5px; text-align:center; background:rgba(0,0,0,0.3); color:#fff; border:1px solid rgba(255,255,255,0.3);"></div>`; 
    }
    container.innerHTML = html;
};

window.startCustomCourse = function() {
    let pars = []; 
    for(let i=1; i<=(parseInt(el('newCourseHoles').value)||18); i++) { 
        pars.push(parseInt(el(`parInput_${i}`).value)||3); 
    }
    
    let nextCourse = { name: el('newCourseName').value.trim() || "Oma Rata", pars: pars };
    let nextPlayers = (allPlayers||[]).filter(Boolean).map(p => { 
        return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; 
    });
    
    let globalLocked = new Set();
    nextPlayers.forEach(p => { 
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked); 
        let bId = window.drawSpecificCard('buff', 1, globalLocked); 
        if(sId) p.cards.push(sId); 
        if(bId) p.cards.push(bId); 
    });
    
    let personalizedShop = {}; 
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
    let nextActiveHole = { 
        rule: window.holeRules[0], 
        shop: personalizedShop, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: getRandomColor() 
    };
    
    set(ref(db, 'gameState'), window.cleanFirebaseData({ 
        course: nextCourse, 
        currentHoleIndex: 1, 
        activeHole: nextActiveHole, 
        players: nextPlayers, 
        history: [] 
    }));
    el('courseModal').style.display='none';
};

window.cancelCourse = function() {
    if (confirm("Haluatko varmasti lopettaa nykyisen radan? Pelaajat säilyttävät rahansa ja korttinsa.")) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        update(ref(db, 'gameState'), window.cleanFirebaseData({ 
            course: null, 
            activeHole: null, 
            currentHoleIndex: 1, 
            players: nextPlayers, 
            history: [] 
        }));
    }
};

window.resetGame = function() { 
    if (confirm("Nollaa peli?")) { 
        set(ref(db, 'gameState'), { players: [], currentHoleIndex: 1, course: null }).then(() => { 
            localStorage.clear(); 
            location.reload(); 
        }); 
    } 
};

window.saveGameSettings = function() {
    let nextSettings = { 
        handLimitEnabled: true, 
        handLimit: parseInt(el('gmSetLimitCount').value) || 6, 
        ptsWin: parseInt(el('gmSetPtsWin').value) || 3, 
        ptsTask: parseInt(el('gmSetPtsTask').value) || 2, 
        ptsLose: 0, 
        ptsPassive: parseInt(el('gmSetPtsPassive').value) || 2 
    };
    update(ref(db), { 'gameState/settings': nextSettings }); 
    window.showAppleToast("Asetukset tallennettu", "✅");
};

window.gmChangeHole = function() { 
    let sel = el('gmSetCurrentHole'); 
    if(!sel) return; 
    let nextH = parseInt(sel.value); 
    if(!nextH) return; 
    update(ref(db), { 'gameState/currentHoleIndex': nextH }); 
    el('settingsModal').style.display='none'; 
};

window.gmRemoveCurrentHole = function() {
    if(confirm("Haluatko poistaa nykyisen väylän?")) {
        let nextH = Math.max(1, currentHoleIndex - 1); 
        let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
        if(nextHistory.length >= currentHoleIndex) { 
            nextHistory = nextHistory.slice(0, currentHoleIndex - 1); 
        }
        let nextActiveHole = { rule: window.holeRules[0], shop: {}, playedCards: {}, timestamp: Date.now(), color: getRandomColor() };
        allPlayers.forEach(p => { 
            nextActiveHole.shop[p.name] = window.generatePersonalShop(window.getGlobalLockedFamilies(allPlayers, null)); 
        });
        update(ref(db), window.cleanFirebaseData({ 'gameState/currentHoleIndex': nextH, 'gameState/history': nextHistory, 'gameState/activeHole': nextActiveHole })); 
        el('settingsModal').style.display='none';
    }
};

window.gmAddPlayer = function() {
    let n = el('gmNewPlayerName').value.trim();
    if(!n) return;
    if(allPlayers.find(p => p && p.name === n)) { alert("Pelaaja on jo olemassa!"); return; }
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] });
    
    update(ref(db), {'gameState/players': window.cleanFirebaseData(nextPlayers)});
    el('gmNewPlayerName').value = '';
    window.showAppleToast('Pelaaja lisätty', '✅');
};

window.updateAdminPlayerList = function() {
    let container = el('adminPlayerList'); 
    if(!container) return; 
    let html = '';
    allPlayers.forEach(p => {
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:10px; margin-bottom:10px; border-radius:8px;">
            <span style="font-weight:bold; color:#fff;">${p.name} (${p.score || 0} P)</span>
            <div>
                <button class="btn btn-warning" style="padding:5px 10px; font-size:0.8rem; margin:0 5px;" onclick="window.gmAdjustScore('${p.name}', 1)">+1 P</button>
                <button class="btn btn-warning" style="padding:5px 10px; font-size:0.8rem; margin:0 5px;" onclick="window.gmAdjustScore('${p.name}', -1)">-1 P</button>
                <button class="btn btn-danger" style="padding:5px 10px; font-size:0.8rem; margin:0;" onclick="window.gmKickPlayer('${p.name}')">POTKI</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

window.gmAdjustScore = function(pName, amount) { 
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); 
    let p = nextPlayers.find(x => x.name === pName); 
    if(p) { 
        p.score = (p.score || 0) + amount; 
        update(ref(db), {'gameState/players': window.cleanFirebaseData(nextPlayers)}); 
    } 
};

window.gmKickPlayer = function(pName) { 
    if(confirm(`Haluatko potkia pelaajan ${pName}?`)) { 
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(p => p && p.name !== pName); 
        update(ref(db), {'gameState/players': window.cleanFirebaseData(nextPlayers)}); 
    } 
};

window.renderCardLibrary = function() {
    let container = el('cardLibraryContainer'); 
    if(!container) return;
    let html = '';
    window.allCards.sort((a,b) => a.level - b.level).forEach(c => {
        html += `
        <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); width:100%;">
            <div style="font-weight:900; font-size:0.8rem; color:var(--warning);">TASO ${c.level} | TYYPPI: ${c.type}</div>
            <div style="font-weight:900; font-size:1.2rem; color:#fff;">${c.n}</div>
            <div style="font-size:0.9rem; color:#ccc;">${c.d}</div>
        </div>`;
    });
    container.innerHTML = html;
};

//==============================================
// HELPERIT JA UI PÄIVITYKSET
//==============================================
window.showAppleToast = function(msg, icon = '✨') { 
    const toast = el('appleToast'); 
    if(!toast) return; 
    el('appleToastIcon').innerText = icon; 
    el('appleToastText').innerText = msg; 
    toast.classList.add('show'); 
    setTimeout(() => { toast.classList.remove('show'); }, 2000); 
};

window.cleanFirebaseData = function(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => window.cleanFirebaseData(item)).filter(item => item !== null && item !== undefined);
    
    let cleaned = {}; 
    for (let key in obj) { 
        if (Object.prototype.hasOwnProperty.call(obj, key)) { 
            let val = window.cleanFirebaseData(obj[key]); 
            if (val !== null && val !== undefined && val !== "undefined") {
                cleaned[key] = val; 
            }
        } 
    } 
    return cleaned;
};

window.logEvent = function(msg) { 
    push(ref(db, 'gameState/eventLog'), window.cleanFirebaseData({ time: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'}), msg: msg })); 
};

window.logScore = function(playerName, delta, reason) { 
    push(ref(db, 'gameState/scoreLog'), window.cleanFirebaseData({ time: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'}), playerName: playerName, delta: delta, msg: reason })); 
};

window.showNotification = function(message, type = 'info') { 
    const container = el('notificationContainer'); 
    if(!container) return; 
    const toast = document.createElement('div'); 
    toast.className = `notification ${type}`; 
    toast.innerHTML = `<span>${message}</span>`; 
    container.appendChild(toast); 
    setTimeout(() => { toast.remove(); }, 6000); 
};

window.claimIdentity = function() { 
    let n = el('playerNameInput').value.trim(); 
    if(!n) return; 
    myName = n; 
    localStorage.setItem('friba_name', n); 
    window.updateIdentityUI(); 
    
    if(!(allPlayers || []).find(x => x && x.name === n)) { 
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); 
        nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)); 
        window.logEvent(`${n} liittyi peliin.`); 
    } 
};

window.updateIdentityUI = function() { 
    if(el('identityCard')) {
        el('identityCard').style.display = myName ? 'none' : 'block'; 
    }
};

// =============================================
// REAALIAIKAINEN DATABASE KUUNTELIJA
// =============================================
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    
    if(!data) {
        if(myName) { 
            myName = null; 
            localStorage.removeItem('friba_name'); 
            window.updateIdentityUI(); 
            window.closeShopModal(); 
        }
        currentCourse = null; 
        el('lobbyContainer').style.display = 'block'; 
        el('corkboard-viewport').style.display = 'none'; 
        el('settingsToggleBtn').style.display = 'none';
        el('rulesToggleBtn').style.display = 'none';
        el('pocketContainer').style.display = 'none';
        return;
    }

    if(data.settings) window.gameSettings = data.settings;
    window.gameHistory = data.history ? (Array.isArray(data.history) ? data.history : Object.values(data.history)) : [];
    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;
    
    if (myName && !allPlayers.find(p => p && p.name === myName)) { 
        myName = null; 
        localStorage.removeItem('friba_name'); 
        window.closeShopModal(); 
    }
    
    window.updateIdentityUI();
    
    const lobbyContainer = el('lobbyContainer');
    const corkboardViewport = el('corkboard-viewport');
    const gameSetupArea = el('gameSetupArea');
    const btnSettings = el('settingsToggleBtn');
    const btnRules = el('rulesToggleBtn');
    const pocket = el('pocketContainer');
    
    if (myName) {
        if (!currentCourse) {
            lobbyContainer.style.display = 'block'; 
            gameSetupArea.style.display = 'block'; 
            corkboardViewport.style.display = 'none'; 
            btnSettings.style.display = 'flex'; 
            btnRules.style.display = 'none'; 
            pocket.style.display = 'none';
        } else {
            lobbyContainer.style.display = 'none'; 
            corkboardViewport.style.display = 'block'; 
            btnSettings.style.display = 'flex';
            btnRules.style.display = 'flex';
            pocket.style.display = 'flex';
            
            let sel = el('gmSetCurrentHole');
            if(sel) { 
                sel.innerHTML = ''; 
                for(let i=1; i<=currentCourse.pars.length; i++) { 
                    sel.innerHTML += `<option value="${i}" ${i === currentHoleIndex ? 'selected' : ''}>Väylä ${i}</option>`; 
                } 
            }
            window.updateAdminPlayerList();
            window.renderCardLibrary();

            if (data.eventLog) {
                let eLogHtml = ''; 
                Object.values(data.eventLog).reverse().slice(0,20).forEach(l => { 
                    eLogHtml += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px solid #444;">[${l.time}] ${l.msg}</div>`; 
                });
                if(el('adminEventLog')) el('adminEventLog').innerHTML = eLogHtml;
            }
            if (data.scoreLog) {
                let sLogHtml = ''; 
                Object.values(data.scoreLog).reverse().slice(0,20).forEach(l => { 
                    let c = l.delta >= 0 ? '#10b981' : '#ef4444'; 
                    let sign = l.delta > 0 ? '+' : '';
                    sLogHtml += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px solid #444; display:flex; justify-content:space-between;"><span>[${l.time}] ${l.playerName}</span><span style="color:${c}; font-weight:bold;">${sign}${l.delta} P</span></div><div style="font-size:0.75rem; color:#888;">${l.msg}</div>`; 
                });
                if(el('adminScoreLog')) el('adminScoreLog').innerHTML = sLogHtml;
            }
        }
    } else {
        lobbyContainer.style.display = 'block'; 
        gameSetupArea.style.display = 'none'; 
        corkboardViewport.style.display = 'none'; 
        btnSettings.style.display = 'none';
        btnRules.style.display = 'none';
        pocket.style.display = 'none';
    }

    window.renderBoard(); 
    window.renderReceipt();
    
    if (myName && currentCourse) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            let currentPoints = parseInt(me.score, 10) || 0;
            
            if (typeof window.myLastHoleIndex === 'undefined' || window.myLastHoleIndex !== currentHoleIndex) {
                window.myLastHoleIndex = currentHoleIndex; 
                setTimeout(() => { if(window.zoomToHole) window.zoomToHole(currentHoleIndex); }, 600);
            }
            
            window.renderShop(activeHole && activeHole.shop ? activeHole.shop[myName] : [], me.reservations, me.score || 0);
            
            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
            
            if (window.gameSettings.handLimitEnabled && myCards.length > (window.gameSettings.handLimit||6)) { 
                window.showHandLimitModal(myCards); 
            } else { 
                if(el('handLimitModal')) el('handLimitModal').style.display = 'none'; 
            }
            
            el('myResPointsBtn').innerText = `${me.score || 0} P`; 
            el('shopModalWallet').innerText = `${me.score || 0} P`; 
            el('handCountBadge').innerText = `${myCards.length} / ${window.gameSettings.handLimit||6}`; 
        }
    }
});
