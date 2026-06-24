//==============================================
// SUOJATTU ALUSTUS: Varmistetaan että tiedot löytyy aina
//==============================================
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
let isZoomedOut = false;
window.viewHoleIndex = null; 

window.gameSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };
window.pendingShopPurchase = null;

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
const getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];

const penColors = [
    { c1: '#0284c7', c2: '#38bdf8' }, { c1: '#dc2626', c2: '#f87171' }, { c1: '#16a34a', c2: '#4ade80' },
    { c1: '#d97706', c2: '#fbbf24' }, { c1: '#9333ea', c2: '#c084fc' }, { c1: '#db2777', c2: '#f472b6' }, { c1: '#475569', c2: '#94a3b8' }
];
const getRandomPen = () => penColors[Math.floor(Math.random() * penColors.length)];

// Kiroileva Siili -Doodles
const doodleData = [
    { svg: "M40,20 Q50,10 60,20 Q70,40 50,60 Q30,40 40,20 Z M45,30 L45,35 M55,30 L55,35 M50,45 L50,50", text: "Taas puuhun! Perkele! -Siili" },
    { svg: "M30,30 Q50,10 70,30 Q80,50 50,70 Q20,50 30,30 M40,40 L45,40 M60,40 L55,40", text: "Varo käpyjäsi, tunari! -Orava" },
    { svg: "M20,20 L50,80 L80,20 Q50,10 20,20 M40,40 A5,5 0 1,1 40,41 M60,40 A5,5 0 1,1 60,41", text: "Pariin? Älä naurata. -Kettu" },
    { svg: "M10,50 A40,40 0 1,1 90,50 A40,40 0 1,1 10,50 M30,40 A5,5 0 1,1 30,41 M70,40 A5,5 0 1,1 70,41 M40,60 Q50,70 60,60", text: "Herätit mut tän takia? -Karhu" },
    { svg: "M50,40 A30,30 0 1,1 50,90 A30,30 0 1,1 50,40 M30,40 L20,10 L40,30 M70,40 L80,10 L60,30", text: "Kiekko on nyt mun. -Pupu" },
    { svg: "M20,50 A30,30 0 1,1 80,50 A30,30 0 1,1 20,50 M35,45 A10,10 0 1,1 35,46 M65,45 A10,10 0 1,1 65,46 M50,60 L45,70 L55,70 Z", text: "Huu-huu, huono heitto! -Pöllö" },
    { svg: "M10,50 Q50,10 90,50 Q50,90 10,50 M30,40 A5,5 0 1,1 30,41 M70,40 A5,5 0 1,1 70,41", text: "Kaivaisit säkin kuoppia. -Mäyrä" },
    { svg: "M40,50 Q50,30 60,50 Q70,80 50,90 Q30,80 40,50 M20,20 L40,50 M80,20 L60,50", text: "Sarvetki lentää pidemmälle. -Hirvi" },
    { svg: "M30,30 Q50,20 70,30 L80,60 L20,60 Z M40,60 L40,70 M60,60 L60,70", text: "Jyrsin ton puunkaatajan. -Majava" },
    { svg: "M20,70 Q50,40 80,70 Q50,100 20,70 M30,50 A5,5 0 1,1 30,51 M70,50 A5,5 0 1,1 70,51", text: "Kurnau, suossa taas. -Sammakko" },
    { svg: "M10,80 Q30,40 50,80 T90,80 M20,70 A2,2 0 1,1 20,71 M30,75 L40,75", text: "Sssssurkea esitys. -Käärme" },
    { svg: "M40,20 L70,50 L40,80 Z M30,50 L40,50 M60,40 A2,2 0 1,1 60,41", text: "Kop kop, oliko taas puu? -Tikka" },
    { svg: "M30,30 L50,70 L70,30 M30,30 L20,10 L40,30 M70,30 L80,10 L60,30 M40,40 A2,2 0 1,1 40,41 M60,40 A2,2 0 1,1 60,41", text: "Ei ota tuulta alle. -Ilves" },
    { svg: "M20,50 Q50,10 80,50 Q50,90 20,50 M40,40 L50,50 L60,40 M10,10 L30,40 M90,10 L70,40", text: "Komea uho, paska heitto. -Metso" },
    { svg: "M40,50 A20,20 0 1,1 60,50 A20,20 0 1,1 40,50 M30,30 A10,10 0 1,1 40,40 M70,30 A10,10 0 1,1 60,40", text: "Varo mihin roiskit! -Hiiri" },
    { svg: "M10,50 Q50,30 90,50 Q50,70 10,50 M30,45 A2,2 0 1,1 30,46 M70,45 A2,2 0 1,1 70,46", text: "Osumatarkkuus nolla. -Kärppä" },
    { svg: "M30,20 L50,50 L70,20 L80,50 L50,90 L20,50 Z M40,40 A2,2 0 1,1 40,41 M60,40 A2,2 0 1,1 60,41", text: "Tuskallista katsottavaa. -Susi" },
    { svg: "M20,30 A40,40 0 1,1 80,30 A40,40 0 1,1 20,30 M40,40 L45,45 M60,40 L55,45", text: "Pysyisithän poissa. -Ahma" }
];

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    if (!localStorage.getItem('friba_browser_mode') && el('installPromptModal')) {
        el('installInstructions').innerHTML = "Tämä peli toimii parhaiten puhelimen omana sovelluksena. Asenna se nyt yhdellä painalluksella!";
        el('nativeInstallBtn').style.display = 'block';
        el('installPromptModal').style.display = 'flex';
    }
});
window.triggerNativeInstall = async function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted' && el('installPromptModal')) el('installPromptModal').style.display = 'none';
        deferredPrompt = null;
    }
};
window.checkInstallPrompt = function() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
    if (isStandalone || localStorage.getItem('friba_browser_mode')) return;
    if (!deferredPrompt && el('installPromptModal')) {
        const os = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "iOS" : (/android/i.test(navigator.userAgent) ? "Android" : "Other");
        let instText = os === "iOS" ? "Paina selaimen alalaidasta <b>Jaa-kuvaketta</b> ja valitse <b>'Lisää kotivalikkoon'</b>." : 
                       (os === "Android" ? "Paina selaimen <b>valikkoa</b> ja valitse <b>'Asenna sovellus'</b>." : "Asenna peli selaimesi valikosta.");
        el('installInstructions').innerHTML = instText;
        el('nativeInstallBtn').style.display = 'none'; el('installPromptModal').style.display = 'flex';
    }
};
window.dismissInstallPrompt = function() { localStorage.setItem('friba_browser_mode', 'true'); if(el('installPromptModal')) el('installPromptModal').style.display = 'none'; };

window.addEventListener('load', () => { setTimeout(window.checkInstallPrompt, 1500); });

//==============================================
// KAMERA, TAULU & DOODLES
//==============================================
window.toggleZoom = function() {
    if (isZoomedOut) { isZoomedOut = false; window.viewHoleIndex = null; } 
    else if (window.viewHoleIndex !== null && window.viewHoleIndex !== currentHoleIndex) { window.viewHoleIndex = null; } 
    else { isZoomedOut = true; }
    
    let btn = el('boardBtnText');
    if(btn) {
        if (isZoomedOut) btn.innerText = '🔙 PALAA';
        else if (window.viewHoleIndex !== null && window.viewHoleIndex !== currentHoleIndex) btn.innerText = 'NYKYINEN';
        else btn.innerText = '🔍 KOKO TAULU';
    }
    window.updateCamera();
};

window.zoomToHole = function(hIndex) {
    if(isZoomedOut) {
        isZoomedOut = false; window.viewHoleIndex = hIndex;
        let btn = el('boardBtnText');
        if(btn) btn.innerText = (hIndex === currentHoleIndex) ? '🔍 KOKO TAULU' : 'NYKYINEN';
        window.updateCamera();
    }
};

window.updateCamera = function() {
    const board = el('corkboard-surface');
    if (!board || !currentCourse) return;
    
    if (isZoomedOut) {
        let maxCol = Math.min(9, currentHoleIndex);
        let maxRow = Math.ceil(currentHoleIndex / 9);
        let activeWidth = 120 + maxCol * 380 + (maxCol - 1) * 30; // 120 = padding * 2
        let activeHeight = 120 + maxRow * 950 + (maxRow - 1) * 30;
        
        let scaleX = window.innerWidth / activeWidth;
        let scaleY = (window.innerHeight - 110) / activeHeight; // Jätetään tilaa alavalikolle
        let scale = Math.min(scaleX, scaleY) * 0.95; 
        if(scale > 1) scale = 1;
        
        let offsetX = (window.innerWidth - activeWidth * scale) / 2;
        let offsetY = ((window.innerHeight - 110) - activeHeight * scale) / 2;
        
        board.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    } else {
        let targetHole = window.viewHoleIndex || currentHoleIndex;
        let col = (targetHole - 1) % 9;
        let row = Math.floor((targetHole - 1) / 9);
        let cellX = 60 + col * 410; 
        let cellY = 60 + row * 980; 
        
        let offsetX = (window.innerWidth - 380) / 2 - cellX;
        let offsetY = 50 - cellY; 
        
        board.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
    }
};

window.renderDoodles = function() {
    const container = el('doodles-container');
    if(!container) return;
    container.innerHTML = '';
    
    let holesPlayed = window.gameHistory.length;
    for(let i=0; i<holesPlayed; i++) {
        let d = doodleData[i % doodleData.length];
        
        // Sijoitetaan doodle kyseisen väylän (solun) lähelle
        let col = i % 9; let row = Math.floor(i / 9);
        let cellX = 60 + col * 410; let cellY = 60 + row * 980;
        
        // Random offset solun sisällä (esim. yläpuolella tai alapuolella)
        let offsetX = cellX + (Math.random() * 300);
        let offsetY = cellY + 800 + (Math.random() * 150); // Alaosassa
        let rot = -15 + Math.random() * 30;
        
        // Animoidaan vain juuri pelatun väylän doodle
        let isNew = (i === holesPlayed - 1);
        let drawnClass = isNew ? 'drawn' : '';
        if(!isNew) { // Jos vanha, se on jo valmiiksi näkyvillä
            drawnClass = '';
        }
        
        let opacityStyle = isNew ? '' : 'opacity: 0.6; transform: rotate('+rot+'deg) scale(1);';
        
        container.innerHTML += `
        <div class="doodle-drawing ${drawnClass}" style="left:${offsetX}px; top:${offsetY}px; --rot:${rot}deg; ${opacityStyle}">
            <svg class="doodle-svg doodle-path" viewBox="0 0 100 100"><path d="${d.svg}"/></svg>
            <div class="doodle-bubble">${d.text}</div>
        </div>`;
    }
};

window.getHoleCellHTML = function(hData, hIndex, isActive) {
    let clickAttr = `onclick="if(window.zoomToHole) window.zoomToHole(${hIndex})" style="cursor:${isZoomedOut ? 'pointer' : 'default'};"`;
    let html = `<div class="hole-cell" ${clickAttr}>`;
    let par = currentCourse.pars ? (currentCourse.pars[hIndex - 1] || 3) : 3;
    
    html += `<div class="index-card">`;
    html += `<div class="banner-subtitle">${currentCourse.name}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>`;
    
    if (isActive && hData.penColor) {
        html += `
        <div class="pen-container" onclick="event.stopPropagation(); if(window.openScoreModal) { window.openScoreModal(); }">
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
        html += `
        <div class="post-it-note" style="background:${bgCol};">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: 1.15rem; line-height: 1.4; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    let playedCards = Object.values(hData.playedCards || {}).filter(Boolean);
    if(playedCards.length > 0) {
        html += `<div style="width: 100%; max-width:340px; margin-bottom: 15px;"><h2 style="color:var(--text-main); font-size:0.85rem; margin-bottom:10px; background:rgba(255,255,255,0.7); padding:4px 8px; border-radius:4px; display:inline-block;">📌 PELATUT KORTIT</h2><div class="cards-grid-2">`;
        playedCards.forEach(pc => {
            if (pc.target === myName || !isActive) {
                let typeClass = pc.type === 'buff' ? 'buff-card' : 'debuff-card';
                if(pc.tier === 'premium') typeClass = 'premium-card';
                let tagTxt = pc.tier === 'premium' ? '💎 PREMIUM' : (pc.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
                let rot = Math.floor(Math.random() * 10) - 5; 
                let pinLeft = 50 + (Math.floor(Math.random() * 20) - 10);
                
                let undoBtn = (isActive) ? `<button class="btn btn-danger" style="padding:6px; font-size:0.7rem; margin-top:5px;" onclick="event.stopPropagation(); window.undoCardPlay(${pc.timestamp})">PERU</button>` : ``;
                
                html += `
                <div class="pinned-card-container" style="--rot:${rot}deg;">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    <div class="physical-card ${typeClass}">
                        <div class="card-type-tag">${tagTxt}</div>
                        <h3>${pc.cardName}</h3><p>${pc.cardDesc}</p>
                        <div style="background:rgba(0,0,0,0.05); padding:4px; border-radius:4px; font-size:0.7rem; text-align:center; font-weight:bold; margin-top:auto;">
                            Kohteelle: ${pc.target}<br><span style="font-weight:normal;">(${pc.by})</span>
                        </div>
                        ${undoBtn}
                    </div>
                </div>`;
            } else {
                let typeIcon = pc.type === 'buff' ? '🛡️' : '🚫';
                let gmUndo = ` <button style="color:var(--danger); background:none; border:none; font-weight:900; font-size:0.7rem; padding:2px;" onclick="event.stopPropagation(); window.undoCardPlay(${pc.timestamp})">[PERU]</button>`;
                html += `
                <div style="background:rgba(255,255,255,0.9); padding:8px; border-radius:6px; font-size:0.8rem; box-shadow: 1px 2px 4px rgba(0,0,0,0.2); grid-column: 1 / -1;">
                    <b>${typeIcon} ${pc.cardName}</b><br><span style="color:#555;">${pc.by} ➡️ <b style="color:var(--danger);">${pc.target}</b></span>${isActive ? gmUndo : ''}
                </div>`;
            }
        });
        html += `</div></div>`;
    }

    let playersToRender = hData.players || allPlayers;
    let sortedPlayers = [...playersToRender].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    
    html += `
    <div class="score-spiral-note">
        <div class="pin pin-blue" style="top: 15px; right: 20px;"></div>
        <div class="pin pin-red" style="bottom: 25px; right: 15px;"></div>
        <h2 style="color:var(--ink-blue); font-family: 'Kalam', cursive; font-size:1.6rem; text-decoration:underline;">🏆 Tulos</h2>`;
        
    let isHistory = !isActive;
    
    sortedPlayers.forEach((p, i) => {
        let strokes = isHistory && hData.holeResults ? hData.holeResults[p.name] : null;
        let scoreText = strokes || '-';
        let scoreClass = ''; let scoreColor = '';
        if (strokes) {
            let diff = strokes - par;
            scoreClass = diff < 0 ? 'score-birdie-paper' : (diff > 0 ? 'score-bogey-paper' : '');
            scoreColor = diff === 0 ? 'color: var(--ink-blue);' : '';
        }

        html += `
        <div class="player-row-paper">
            <span class="paper-name" style="font-size:1.4rem;">${p.name}</span>
            <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-size:1rem; color:var(--warning); font-weight:900;">${p.score || 0} P</span>
                <div class="score-display-paper ${scoreClass}" style="width:34px !important; height:34px !important; font-size:1.2rem !important; border-width:2px; ${scoreColor} margin-left:auto;">${scoreText}</div>
            </div>
        </div>`;
    });
    html += `</div></div>`;
    
    return html;
};

window.renderBoard = function() {
    const board = el('corkboard-surface');
    if (!board) return;
    
    if (!currentCourse) { 
        Array.from(board.children).forEach(c => { if(c.id !== 'doodles-container') c.remove(); });
        return; 
    }
    
    let html = `<div id="doodles-container"></div>`; 
    window.gameHistory.forEach((h, index) => {
        html += window.getHoleCellHTML(h, index + 1, false);
    });
    
    if (activeHole) {
        html += window.getHoleCellHTML({
            rule: activeHole.rule, playedCards: activeHole.playedCards,
            color: activeHole.color, penColor: activeHole.penColor, players: allPlayers
        }, currentHoleIndex, true);
    }
    
    board.innerHTML = html;
    window.renderDoodles();
    window.updateCamera();
};

window.renderReceipt = function() {
    if(!allPlayers || allPlayers.length === 0 || !currentCourse) {
        if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'none';
        return;
    }
    if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'flex';

    let generateHTML = (isMini) => {
        let html = `<div class="r-title">KASSAKUITTI</div>`;
        let startIdx = isMini ? Math.max(0, window.gameHistory.length - 2) : 0;
        
        for(let i=startIdx; i<window.gameHistory.length; i++) {
            let h = window.gameHistory[i];
            if(!isMini) html += `<div class="r-hole-title">Väylä ${i+1}</div>`;
            if(h.holeResults && !isMini) {
                for(let pName in h.holeResults) {
                    html += `<div class="r-row"><span>${pName.substring(0, 12)}</span><span>${h.holeResults[pName]}</span></div>`;
                }
            }
        }
        
        html += `<div class="r-tot-sec"><div style="text-align:center; margin-bottom:5px;">KOKONAISTULOS</div>`;
        let sorted = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0));
        sorted.forEach(p => {
            let dgStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            html += `<div class="r-row"><span>${p.name.substring(0, isMini?6:12)}</span><span>${dgStr}</span></div>`;
        });
        html += `</div>`;
        return html;
    };

    if(el('receipt-mini-content')) el('receipt-mini-content').innerHTML = generateHTML(true);
    if(el('receipt-full-content')) el('receipt-full-content').innerHTML = generateHTML(false);
};

//==============================================
// KORTIN PELAAMINEN JA KAUPPA
//==============================================
window.openTargetModal = function(cardId) {
    const cardDef = (window.allCards || []).find(c => c && c.id === cardId);
    if (!cardDef) return;
    window.pendingCardPlay = { id: cardId, def: cardDef };
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
    if(el('targetModal')) el('targetModal').style.display = 'flex'; 
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
    }
    
    let pCards = {};
    if(activeHole) {
        if (activeHole.playedCards) {
            let oldCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            oldCards.filter(Boolean).forEach((c, i) => { pCards['old_'+i] = c; });
        }
        let cKey = 'c_' + timestamp + '_' + Math.floor(Math.random()*1000);
        pCards[cKey] = { cardId: card.id, cardName: card.def.n, cardDesc: card.def.d, target: targetName, by: myName, type: card.def.type, tier: card.def.tier, timestamp: timestamp };
    }
    
    let updates = {};
    updates['gameState/players'] = window.cleanFirebaseData(nextPlayers);
    if(activeHole) updates['gameState/activeHole/playedCards'] = window.cleanFirebaseData(pCards); 
    
    update(ref(db), updates);
    window.logEvent(`${myName} pelasi kortin ${card.def.n} kohteelle ${targetName}.`);
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, card.def.type === 'buff' ? 'info' : 'debuff');
};

window.undoCardPlay = function(timestamp) {
    if(!activeHole || !activeHole.playedCards) return;
    let nextCards = {};
    let oldCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
    oldCards.filter(Boolean).forEach((c, i) => { if(c.timestamp !== timestamp) nextCards['c_'+i] = c; });
    update(ref(db), { 'gameState/activeHole/playedCards': window.cleanFirebaseData(nextCards) });
};

window.forceDiscard = function(cId, isNormal) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if(!me) return;
    
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    me.cards = me.cards.filter(Boolean);
    let idx = me.cards.indexOf(cId);
    
    if(idx !== -1) {
        me.cards.splice(idx, 1);
        if (isNormal) { me.score = (parseInt(me.score) || 0) + 1; window.showAppleToast('+1 P (Myyty)', '💰'); }
        else { window.showAppleToast('Kortti poistettu', '🗑️'); }
    }
    
    if (window.pendingShopPurchase) {
        let pId = window.pendingShopPurchase.id; let pPrice = window.pendingShopPurchase.price;
        if (me.score >= pPrice) {
            me.score -= pPrice; me.boughtThisHole = true; me.cards.push(pId);
            let nextShop = JSON.parse(JSON.stringify(activeHole.shop));
            const sIdx = (nextShop || []).findIndex(i => i && i.id === pId);
            if (sIdx !== -1) nextShop.splice(sIdx, 1);
            update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/shop': window.cleanFirebaseData(nextShop) });
            window.pendingShopPurchase = null; window.closeShopModal(); window.showNotification(`🛒 Ostit edun!`, 'warning');
            return;
        } else { window.pendingShopPurchase = null; }
    }
    set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
};

window.buyShopItem = function(idStr, nameStr, priceVal) {
    if (!activeHole || !activeHole.shop) return; 
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if (!me || me.score < priceVal || me.boughtThisHole) return; 

    let limit = window.gameSettings.handLimit || 5;
    let currentCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean).length : 0;
    
    if (window.gameSettings.handLimitEnabled && currentCards >= limit) {
        window.pendingShopPurchase = { id: idStr, name: nameStr, price: priceVal };
        window.switchShopTab('sell');
        window.renderShop(activeHole.shop, me.score, me.boughtThisHole); 
        document.querySelector('.shop-binder-modal').classList.add('binder-modal-anim');
        return;
    }

    const shopIndex = (activeHole.shop || []).findIndex(i => i && i.id === idStr);
    if (shopIndex !== -1) {
        me.score -= priceVal; me.boughtThisHole = true;
        let nextShop = JSON.parse(JSON.stringify(activeHole.shop)); nextShop.splice(shopIndex, 1);
        me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : []; me.cards.push(idStr);
        update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/shop': window.cleanFirebaseData(nextShop) });
        window.closeShopModal(); window.logEvent(`${myName} osti edun: ${nameStr}.`); window.showNotification(`🛒 Ostit edun: ${nameStr}`, 'warning');
    }
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    const me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole ? activeHole.shop : null, me ? me.score : 0, me ? me.boughtThisHole : false);
    window.switchShopTab('buy');
};

window.openShop = function(tab) {
    if(el('shopModal')) el('shopModal').style.display = 'flex';
    let modalEl = document.querySelector('#shopModal .shop-binder-modal');
    if(modalEl) modalEl.classList.add('binder-modal-anim');
    if(window.switchShopTab) window.switchShopTab(tab);
};

window.closeShopModal = function() {
    window.pendingShopPurchase = null; 
    if(el('shopModal')) el('shopModal').style.display = 'none';
    let modalEl = document.querySelector('#shopModal .shop-binder-modal');
    if(modalEl) { modalEl.classList.remove('binder-modal-anim'); modalEl.style.transform = ''; }
};

let shopStartY = 0; let shopCurrentY = 0;
let binderContent = document.querySelector('.binder-content');
let binderModal = document.querySelector('.shop-binder-modal');

if(binderContent && binderModal) {
    binderContent.addEventListener('touchstart', e => { if(binderContent.scrollTop <= 5) { shopStartY = e.touches[0].clientY; shopCurrentY = shopStartY; } else { shopStartY = 0; } }, {passive: true});
    binderContent.addEventListener('touchmove', e => { if(shopStartY === 0) return; shopCurrentY = e.touches[0].clientY; let dy = shopCurrentY - shopStartY; if(dy > 0) { binderModal.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); } }, {passive: false});
    binderContent.addEventListener('touchend', e => { if(shopStartY === 0) return; let dy = shopCurrentY - shopStartY; if(dy > 150 && shopCurrentY !== shopStartY) { window.closeShopModal(); } else { binderModal.style.transform = ''; } shopStartY = 0; }, {passive: true});
}

window.switchShopTab = function(tab) {
    const modalEl = document.querySelector('#shopModal .shop-binder-modal');
    const headerTitle = el('shopModalHeaderTitle');
    
    if (tab === 'buy') {
        window.pendingShopPurchase = null; 
        el('shopBuyArea').style.display = 'block'; el('shopSellArea').style.display = 'none';
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.add('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.remove('active');
        if(modalEl) { modalEl.classList.remove('theme-own'); modalEl.classList.add('theme-shop'); }
        if(headerTitle) headerTitle.innerText = '🛒 KAUPPA';
    } else {
        el('shopBuyArea').style.display = 'none'; el('shopSellArea').style.display = 'block';
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.remove('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.add('active');
        if(modalEl) { modalEl.classList.remove('theme-shop'); modalEl.classList.add('theme-own'); }
        if(headerTitle) { let pName = myName ? myName.toUpperCase() : 'PELAAJA'; headerTitle.innerText = `🗂️ ${pName} - KORTIT`; }
    }
    let me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole ? activeHole.shop : null, me ? me.score : 0, me ? me.boughtThisHole : false);
};

window.renderShop = function(shopArray, myPoints, boughtThisHole) {
    const modalContainer = el('shopModalCards');
    const sellContainer = el('shopSellCardsContainer');
    
    if(!shopArray || shopArray.length === 0) { 
        if(modalContainer) modalContainer.innerHTML = '<p style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding:20px; font-weight:bold; width:100%;">Kauppa on suljettu.</p>';
    } else {
        let html = '';
        shopArray.forEach(item => {
            if(!item) return; 
            const canAfford = myPoints >= item.price && !boughtThisHole;
            let btnText = boughtThisHole ? 'OSTETTU' : (canAfford ? 'OSTA ETU' : 'EI VARAA');
            let btnClass = canAfford ? 'btn-warning' : 'btn-secondary';
            let dis = (!canAfford || boughtThisHole) ? 'disabled' : '';
            
            html += `
                <div class="shop-item-wrapper">
                    <div class="physical-card premium-card" onclick="window.openCardDetail('${item.id}', 'shop', ${item.price}, ${canAfford}, ${boughtThisHole})" style="cursor:pointer;">
                        <span class="card-price-tag">${item.price} P</span>
                        <div class="card-type-tag">💎 KAUPPA</div><h3>${item.n}</h3><p>${item.d}</p>
                        <div style="text-align:center; font-weight:900; font-size:0.75rem; color:#94a3b8; padding-top:10px; margin-top:auto;">🔄 3D TARKASTELU</div>
                    </div>
                    <button class="shop-item-btn ${btnClass}" ${dis} onclick="window.buyShopItem('${item.id}', '${item.n}', ${item.price})">${btnText}</button>
                </div>`;
        });
        if(modalContainer) modalContainer.innerHTML = html; 
    }

    let me = (allPlayers || []).find(p => p && p.name === myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    
    let sellHtml = '';
    if(myCards.length === 0) {
         sellHtml = '<p style="color:var(--text-muted); font-size:1.1rem; text-align:center; padding:20px; font-weight:bold; width:100%;">Kätesi on tyhjä.</p>';
    } else {
        myCards.forEach(cId => {
            const cDef = (window.allCards || []).find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
            if(cDef.tier === 'premium') { typeClass = 'premium-card'; }
            let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
            let isNormal = cDef.tier === 'normal';
            let sellBtnIcon = isNormal ? '♻️' : '🗑️';
            let rot = Math.random() * 8 - 4; 
            
            sellHtml += `
            <div class="shop-item-wrapper messy-card" style="transform: rotate(${rot}deg);">
                <div class="physical-card worn-card ${typeClass}" onclick="window.openCardDetail('${cId}', 'sell')" style="cursor:pointer;">
                    <div class="card-type-tag">${tagTxt}</div><h3>${cDef.n}</h3><p>${cDef.d}</p>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 3D TARKASTELU</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="shop-item-btn btn-success" style="flex:1;" onclick="window.openTargetModal('${cId}')">PELAA</button>
                    <button class="shop-item-btn btn-danger" style="width:50px; font-size:1.2rem;" onclick="window.forceDiscard('${cId}', ${isNormal})">${sellBtnIcon}</button>
                </div>
            </div>`;
        });
    }
    if (sellContainer) sellContainer.innerHTML = sellHtml;
    
    let alertEl = el('pendingPurchaseAlert');
    if (alertEl) {
        let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
        let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 5;
        let isOverLimit = limitEnabled && myCards.length > limit;

        if (window.pendingShopPurchase) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSI TÄYNNÄ!</div><div style="font-size:1.05rem; font-weight:700; margin-bottom:15px; line-height:1.4;">Haluat ostaa kortin <strong id="pendingCardName">${window.pendingShopPurchase.name}</strong>. Myy tai hävitä yksi kortti alta tehdäksesi tilaa, jolloin osto suoritetaan automaattisesti!</div><button class="btn btn-secondary" style="padding:12px; font-size:0.95rem; color:#000;" onclick="event.stopPropagation(); if(window.cancelShopPurchase) window.cancelShopPurchase()">PERUUTA OSTO</button>`;
        } else if (isOverLimit) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSIRAJA YLITETTY!</div><div style="font-size:1.05rem; font-weight:700; line-height:1.4;">Sinulla on liikaa kortteja kädessäsi (${myCards.length}/${limit}). Myy tai hävitä kortteja päästäksesi takaisin sallittuun rajaan!</div>`;
        } else {
            alertEl.style.display = 'none';
        }
    }
};

window.showHandLimitModal = function(cards) {
    if(!el('handLimitModal')) return;
    let limit = window.gameSettings.handLimit || 5;
    el('handLimitCount').innerText = `${cards.length} / ${limit}`;
    let html = '';
    cards.forEach(cId => {
        const cDef = (window.allCards || []).find(c => c && c.id === cId);
        if(!cDef) return;
        let isNormal = cDef.tier === 'normal';
        let btnTxt = isNormal ? '♻️ MYY (+1 P)' : '🗑️ POISTA';
        let btnClass = isNormal ? 'btn-success' : 'btn-danger';
        html += `<div style="background:#fff; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#000;"><div style="text-align:left;"><div style="font-size:0.75rem; font-weight:900; color:var(--text-muted);">${isNormal ? 'NORMAALI' : '💎 PREMIUM'}</div><div style="font-size:1.1rem; font-weight:900; color:#000;">${cDef.n}</div></div><button class="btn ${btnClass}" style="width:auto; padding:10px 15px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}', ${isNormal})">${btnTxt}</button></div>`;
    });
    el('handLimitCards').innerHTML = html;
    el('handLimitModal').style.display = 'flex';
};

//==============================================
// 3D KORTTIVIUHKA (KARUSELLI) OMNI-PYÖRITYS
//==============================================
window.renderCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    
    let html = '';
    window.carouselCards.forEach((cId, i) => {
        let cDef = (window.allCards || []).find(c => c && c.id === cId);
        if(!cDef) return;
        let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
        if(cDef.tier === 'premium') typeClass = 'premium-card';
        let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        let backClass = cDef.tier === 'premium' ? 'card-back-premium' : (cDef.type === 'buff' ? 'card-back-buff' : 'card-back-sabotage');
        let backIcon = cDef.tier === 'premium' ? '💎' : (cDef.type === 'buff' ? '🛡️' : '🚫');
        
        html += `
            <div class="carousel-card-wrapper" id="carousel-wrapper-${i}">
                <div class="card-3d-inner" id="card3d-inner-${i}" data-rx="0" data-ry="0">
                    <div class="card-face card-front ${typeClass}">
                        <div style="text-align:left; display:flex; flex-direction:column; height:100%; position:relative; z-index:20;">
                            <div class="card-type-tag" style="font-size:1.3rem; margin-bottom:12px;">${tagTxt}</div>
                            <h3 style="font-size:2.4rem; margin-bottom:20px; word-break:break-word; hyphens:auto; line-height:1.1;">${cDef.n}</h3>
                            <p style="font-size:1.6rem; font-weight:800; line-height:1.4; overflow-y:visible; padding-right:5px;">${cDef.d}</p>
                        </div>
                    </div>
                    <div class="card-face card-back ${backClass}">
                        <div class="card-back-icon">${backIcon}</div>
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
    const cards = Array.from(container.querySelectorAll('.carousel-card-wrapper'));
    if(cards.length === 0) return;

    let isScrolling = false;
    container.addEventListener('scroll', () => {
        if (!isScrolling) { window.requestAnimationFrame(updateCarouselLayout); isScrolling = true; }
    }, {passive: true});

    function updateCarouselLayout() {
        const scrollLeft = container.scrollLeft; const containerWidth = container.clientWidth;
        const centerOffset = containerWidth / 2; const cardWidth = 280; 
        const paddingLeft = centerOffset - (cardWidth / 2); 
        let closestIndex = 0; let minDiff = 9999;

        for (let index = 0; index < cards.length; index++) {
            const card = cards[index];
            const cardCenter = paddingLeft + (index * cardWidth) + (cardWidth / 2) - scrollLeft;
            const diff = (cardCenter - centerOffset) / 140; 
            
            const transX = diff * -70; const rotZ = diff * 8; const transY = Math.abs(diff) * 20; 
            const scale = Math.max(0.8, 1.15 - Math.abs(diff) * 0.15); 
            
            card.style.transform = `translate3d(${transX}px, ${transY}px, 0) rotateZ(${rotZ}deg) scale(${scale})`;
            card.style.zIndex = 100 - Math.floor(Math.abs(diff)*10);
            
            if (Math.abs(diff) < minDiff) { minDiff = Math.abs(diff); closestIndex = index; }
        }
        if (window.carouselCurrentIndex !== closestIndex) { window.carouselCurrentIndex = closestIndex; window.updateCarouselButtons(); }
        isScrolling = false;
    }
    setTimeout(updateCarouselLayout, 50);

    let startX = 0; let startY = 0; let isSpinning = false;
    container.addEventListener('touchstart', e => {
        if(e.touches.length > 1) return;
        let touchCard = e.target.closest('.card-3d-inner');
        if (touchCard && touchCard.id === `card3d-inner-${window.carouselCurrentIndex}`) {
            startX = e.touches[0].clientX; startY = e.touches[0].clientY; 
            isSpinning = true;
            touchCard.style.transition = 'none';
        } else {
            isSpinning = false;
        }
    }, {passive: false});

    container.addEventListener('touchmove', e => {
        if (isSpinning) {
            e.preventDefault(); 
            let dx = e.touches[0].clientX - startX; 
            let dy = e.touches[0].clientY - startY;
            const activeInner = el(`card3d-inner-${window.carouselCurrentIndex}`);
            if(activeInner) {
                let baseRx = parseFloat(activeInner.dataset.rx || 0);
                let baseRy = parseFloat(activeInner.dataset.ry || 0);
                let newRotX = baseRx - (dy * 0.5); 
                let newRotY = baseRy + (dx * 0.5); 
                activeInner.style.transform = `rotateX(${newRotX}deg) rotateY(${newRotY}deg)`;
            }
        }
    }, {passive: false});

    container.addEventListener('touchend', e => {
        if (isSpinning) {
            const activeInner = el(`card3d-inner-${window.carouselCurrentIndex}`);
            if(activeInner) {
                let transformStr = activeInner.style.transform;
                let matchX = transformStr.match(/rotateX\(([-0-9.]+)deg\)/);
                let matchY = transformStr.match(/rotateY\(([-0-9.]+)deg\)/);
                if(matchX && matchY) {
                    activeInner.dataset.rx = matchX[1];
                    activeInner.dataset.ry = matchY[1];
                    activeInner.style.transition = 'transform 0.1s ease-out'; // Jätä pyöritykseen
                }
            }
        }
        isSpinning = false;
    }, {passive: true});
};

window.openCardDetail = function(cId, mode, arg1, arg2, arg3) {
    if (mode === 'hand' || mode === 'sell') {
        const me = (allPlayers || []).find(p => p && p.name === myName);
        window.carouselCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    } else if (mode === 'shop') {
        window.carouselCards = activeHole && activeHole.shop ? (activeHole.shop || []).map(c => c.id) : [];
    } else if (mode === 'gm') { window.carouselCards = (window.allCards || []).map(c => c.id); } 
    else { window.carouselCards = [cId]; }
    
    window.carouselCurrentMode = mode; window.carouselArgs = [arg1, arg2, arg3];
    window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.renderCarousel(); el('cardDetailModal').style.display = 'flex';
    
    setTimeout(() => {
        window.initNativeCarousel();
        const container = el('cardCarousel');
        if(container) container.scrollLeft = (window.carouselCurrentIndex * 280); 
    }, 100);
};

window.updateCarouselButtons = function() {
    if(window.carouselCards.length === 0) return;
    let cId = window.carouselCards[window.carouselCurrentIndex];
    let cDef = (window.allCards || []).find(c => c && c.id === cId);
    if(!cDef) return;
    
    let btnHtml = ''; let mode = window.carouselCurrentMode;
    if (mode === 'hand' || mode === 'sell') {
        btnHtml = `<button class="btn btn-success" style="font-size:1.1rem; padding:18px; box-shadow:0 10px 25px rgba(16,185,129,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cId}')">PELAA KORTTI</button>`;
        if (cDef.tier === 'normal') { btnHtml += `<button class="btn btn-danger" style="font-size:1.1rem; padding:18px; margin-top:5px; background:var(--danger); color:#fff; box-shadow:0 4px 15px rgba(220,38,38,0.5);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', true)">♻️ MYY KORTTI (+1 P)</button>`; } 
        else { btnHtml += `<button class="btn btn-secondary glass-card" style="font-size:1.05rem; padding:16px; margin-top:5px; color:var(--danger);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', false)">🗑️ HÄVITÄ KORTTI (0 P)</button>`; }
    } else if (mode === 'shop') {
        let myScore = 0; let bought = false;
        const me = (allPlayers || []).find(p => p && p.name === myName);
        if(me) { myScore = me.score || 0; bought = me.boughtThisHole; }
        let item = activeHole && activeHole.shop ? (activeHole.shop || []).find(s=>s.id===cId) : null;
        let price = item ? item.price : 99;
        let canAfford = myScore >= price && !bought;
        let btnText = bought ? 'OSTETTU' : (canAfford ? `OSTA ETU (${price} P)` : 'EI VARAA');
        let btnClass = canAfford && !bought ? 'btn-warning' : 'btn-secondary';
        let dis = (!canAfford || bought) ? 'disabled' : '';
        btnHtml = `<button class="btn ${btnClass}" ${dis} style="font-size:1.1rem; padding:18px; color:#000; box-shadow:0 10px 25px rgba(245,158,11,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cId}', '${cDef.n}', ${price})">${btnText}</button>`;
    } else if (mode === 'gm') {
        btnHtml = `<button class="btn btn-success" style="font-size:1.1rem; padding:18px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.giveCardToPlayer('${cId}')">ANNA TÄMÄ</button>`;
    }
    el('cardDetailActionArea').innerHTML = btnHtml;
};

//==============================================
// TULOSTEN SYÖTTÖ & PELIN KULKU
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
    if(el('scoreModal')) el('scoreModal').style.display = 'flex'; 
};

window.submitScores = function() {
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    let playerResults = {};
    (allPlayers || []).forEach(p => { if(p) playerResults[p.name] = { strokes: par, taskWon: false }; });
    
    const inputs = document.querySelectorAll('.score-input-data');
    if(inputs.length === 0) { alert("Virhe: Ei tulosrivejä löydetty! Yritä avata näkymä uudelleen."); if(el('scoreModal')) el('scoreModal').style.display = 'none'; return; }
    
    inputs.forEach(input => { let attrName = input.getAttribute('data-name'); if(playerResults[attrName]) { playerResults[attrName].strokes = parseInt(input.value, 10) || par; } });
    document.querySelectorAll('.task-paper-checkbox:checked').forEach(cb => { let pName = cb.getAttribute('data-name'); if (playerResults[pName]) { playerResults[pName].taskWon = true; } });

    let minStrokes = 9999; let maxStrokes = -9999;
    for (let key in playerResults) { let s = playerResults[key].strokes; if (s < minStrokes) minStrokes = s; if (s > maxStrokes) maxStrokes = s; }

    let holeWinners = []; let holeLosers = [];
    for (let key in playerResults) { if (playerResults[key].strokes === minStrokes) holeWinners.push(key); if (playerResults[key].strokes === maxStrokes) holeLosers.push(key); }
    
    let normalPool = (window.allCards || []).filter(c => c && c.tier === "normal");
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);

    let ptsWin = window.gameSettings.ptsWin !== undefined ? window.gameSettings.ptsWin : 2;
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 3;
    let ptsLose = window.gameSettings.ptsLose !== undefined ? window.gameSettings.ptsLose : 0;
    let ptsPassive = window.gameSettings.ptsPassive !== undefined ? window.gameSettings.ptsPassive : 1;
    let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
    let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 5;

    nextPlayers.forEach(p => {
        if (!p) return; let res = playerResults[p.name]; if (!res) return; 
        p.dgScore = (parseInt(p.dgScore, 10) || 0) + (res.strokes - par);
        let currentPoints = parseInt(p.score, 10) || 0;
        currentPoints += ptsPassive;
        if (holeWinners.includes(p.name)) { currentPoints += ptsWin; }
        if (res.taskWon) { currentPoints += ptsTask; }
        if (holeLosers.includes(p.name) && minStrokes !== maxStrokes) { currentPoints -= Math.abs(ptsLose); currentPoints = Math.max(0, currentPoints); }
        
        p.score = currentPoints; p.boughtThisHole = false; 
        p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : []; p.cards = p.cards.filter(Boolean);
        
        let cardsToGive = (holeLosers.includes(p.name) && minStrokes !== maxStrokes) ? 3 : 2;
        if(normalPool.length > 0) {
            for(let i=0; i<cardsToGive; i++) {
                if (!limitEnabled || p.cards.length < limit) { p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id); }
            }
        }
        p.cards = p.cards.filter(Boolean);
    });
    
    // Tallenna tarkat heittomäärät historiaan
    let holeStrokes = {};
    for (let key in playerResults) { holeStrokes[key] = playerResults[key].strokes; }

    let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
    let pastHole = {
        rule: activeHole.rule,
        playedCards: activeHole.playedCards,
        color: activeHole.color || '#fef08a',
        holeResults: holeStrokes,
        players: JSON.parse(JSON.stringify(nextPlayers))
    };
    nextHistory.push(pastHole);
    
    let nextHoleIndex = currentHoleIndex + 1;
    const rules = window.holeRules || [];
    const randomRule = rules.length > 0 ? rules[Math.floor(Math.random() * rules.length)] : {type:"rule", n:"Peli Jatkuu", d:""};
    
    let premiumPool = (window.allCards || []).filter(c => c && c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    if(premiumPool.length > 0) {
        for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
            if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
            if(uniqueShop.length === 5) break; 
        }
    }
    
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor(), penColor: getRandomPen() };
    
    update(ref(db), window.cleanFirebaseData({
        'gameState/players': nextPlayers,
        'gameState/currentHoleIndex': nextHoleIndex,
        'gameState/activeHole': nextActiveHole,
        'gameState/history': nextHistory
    }));

    if(el('scoreModal')) el('scoreModal').style.display = 'none'; 
    window.logEvent(`${myName} syötti tulokset väylältä ${currentHoleIndex}.`);
};

window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextHoleIndex = 1;
    
    let premiumPool = (window.allCards || []).filter(c => c && c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) { if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); } if(uniqueShop.length === 5) break; }
    
    const rules = window.holeRules || [];
    const randomRule = rules.length > 0 ? rules[Math.floor(Math.random() * rules.length)] : {type:"rule", n:"Peli Alkaa", d:""};
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now(), color: getRandomColor(), penColor: getRandomPen() };
    
    let normalPool = (window.allCards || []).filter(c => c && c.tier === "normal");
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            let pCards = [];
            if(normalPool.length > 0) { pCards = [normalPool[Math.floor(Math.random() * normalPool.length)].id, normalPool[Math.floor(Math.random() * normalPool.length)].id, normalPool[Math.floor(Math.random() * normalPool.length)].id]; }
            return { ...p, score: 3, dgScore: 0, cards: pCards, boughtThisHole: false };
        });
    }
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        course: nextCourse, currentHoleIndex: nextHoleIndex, activeHole: nextActiveHole, players: nextPlayers, history: []
    }));

    if(el('courseModal')) el('courseModal').style.display = 'none'; 
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${nextCourse.name}.`);
};

window.cancelCourse = function() {
    if (confirm("Haluatko varmasti lopettaa nykyisen radan? Pelaajat säilyttävät rahansa ja korttinsa, mutta palaatte aulaan.")) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        update(ref(db, 'gameState'), window.cleanFirebaseData({ course: null, activeHole: null, currentHoleIndex: 1, players: nextPlayers, history: [] }));
        window.logEvent(`${myName} (Asetukset) keskeytti radan.`);
    }
};

window.resetGame = function() {
    if (confirm("Haluatko varmasti nollata koko kierroksen tiedot? Kaikki kirjataan ulos.")) {
        localStorage.removeItem('friba_browser_mode');
        set(ref(db, 'gameState'), window.cleanFirebaseData({ settings: window.gameSettings, players: [], activeHole: null, currentHoleIndex: 1, course: null, history: [] }))
        .then(() => { localStorage.clear(); location.reload(); });
    }
};

window.saveGameSettings = function() {
    set(ref(db, 'gameState/settings'), {
        shopEnabled: el('gmSetShop').checked, handLimitEnabled: el('gmSetLimitCheck').checked,
        handLimit: parseInt(el('gmSetLimitCount').value, 10) || 5, ptsWin: parseInt(el('gmSetPtsWin').value, 10) || 0,
        ptsTask: parseInt(el('gmSetPtsTask').value, 10) || 0, ptsLose: parseInt(el('gmSetPtsLose').value, 10) || 0, ptsPassive: window.gameSettings.ptsPassive || 1
    });
    window.showNotification("Asetukset tallennettu!", "info");
    el('settingsModal').style.display = 'none';
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
window.updateIdentityUI = function() { if(el('identityCard')) { el('identityCard').style.display = myName ? 'none' : 'block'; } };
window.showNotification = function(message, type = 'info') { const container = el('notificationContainer'); if(!container) return; const toast = document.createElement('div'); toast.className = `notification ${type}`; toast.innerHTML = `<span style="font-size:1.3rem;">${type === 'warning' ? '🛒' : (type === 'debuff' ? '💥' : 'ℹ️')}</span> <span>${message}</span>`; container.appendChild(toast); setTimeout(() => { toast.remove(); }, 2000); };
window.claimIdentity = function() { let n = el('playerNameInput').value.trim(); if(!n || n.length > 15) return alert("Syötä nimi!"); myName = n; localStorage.setItem('friba_name', n); window.updateIdentityUI(); if(!(allPlayers || []).find(x => x && x.name === n)) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], boughtThisHole: false }); set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)); window.logEvent(`${n} liittyi peliin.`); } };
window.setRole = function(r) { currentRole = r; document.body.className = r + '-mode'; if(el('btnPlayer')) el('btnPlayer').classList.toggle('active', r === 'player'); if(el('btnGM')) el('btnGM').classList.toggle('active', r === 'gm'); window.renderBoard(); };

window.adminAddPlayer = function() { const input = el('adminNewPlayerName'); if(!input) return; const name = input.value.trim(); if(!name || (allPlayers || []).find(p => p && p.name === name)) return; let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); nextPlayers.push({ name: name, score: 3, dgScore: 0, cards: [], boughtThisHole: false }); update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) }); input.value = ''; window.logEvent(`${myName} (Asetukset) lisäsi pelaajan: ${name}`); };
window.removePlayer = function(index) { if(confirm("Haluatko poistaa?")) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); nextPlayers.splice(index, 1); update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) }); } };
window.adjustScore = function(index, delta) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); if(nextPlayers[index]) { nextPlayers[index].score = (parseInt(nextPlayers[index].score) || 0) + delta; update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) }); } };
window.adjustDgScore = function(index, delta) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); if(nextPlayers[index]) { nextPlayers[index].dgScore = (parseInt(nextPlayers[index].dgScore) || 0) + delta; update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) }); } };
window.gmRollRule = function() { if(!activeHole || window.holeRules.length === 0) return; const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)]; set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(randomRule)); document.getElementById('settingsModal').style.display='none';};
window.gmSetRule = function() { if(!activeHole) return; const sel = el('gmRuleSelect'); const ruleDef = window.holeRules[sel.value]; if(ruleDef) { set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(ruleDef)); document.getElementById('settingsModal').style.display='none'; } };

window.renderAdminPlayerList = function() {
    const list = el('adminPlayerList'); if(!list) return; list.innerHTML = "";
    (allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        list.innerHTML += `
            <div class="player-row glass-card" style="flex-direction:column; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); padding:15px; border-radius:12px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <span style="font-weight:900; font-size:1.1rem; color:#fff;">${p.name} (${p.score} P / DG: ${p.dgScore > 0 ? '+' : ''}${p.dgScore || 0})</span>
                    <div style="display:flex; gap: 8px;">
                        <button class="btn btn-danger" style="width:auto; padding:10px; font-size:0.85rem;" onclick="window.removePlayer(${i})">POISTA</button>
                    </div>
                </div>
                <div class="gm-score-adjust" style="display:flex; gap:10px; margin-top:10px; color:#fff;">
                    <span style="font-size:0.85rem; width:50px; font-weight:bold; align-self:center;">Raha</span>
                    <input type="number" id="gmScoreAdjust_${i}" value="1" style="width:60px; margin:0; padding:10px; background:rgba(0,0,0,0.3); color:#fff; border:1px solid rgba(255,255,255,0.3);">
                    <button class="btn btn-primary" style="padding:10px;" onclick="if(window.adjustScore) { window.adjustScore(${i}, parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0); }">Lisää</button>
                    <button class="btn btn-danger" style="padding:10px;" onclick="if(window.adjustScore) { window.adjustScore(${i}, -(parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0)); }">Vähennä</button>
                </div>
                <div class="gm-score-adjust" style="display:flex; gap:10px; margin-top:5px; color:#fff;">
                    <span style="font-size:0.85rem; width:50px; font-weight:bold; align-self:center;">Tulos</span>
                    <button class="btn btn-secondary" style="padding:10px; background:rgba(255,255,255,0.8); color:#000;" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, 1); }">+1 Heitto</button>
                    <button class="btn btn-secondary" style="padding:10px; background:rgba(255,255,255,0.8); color:#000;" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, -1); }">-1 Heitto</button>
                </div>
            </div>`;
    });
};

window.renderEventLog = function(logData) { const container = el('adminEventLog'); if(!container) return; container.innerHTML = ""; Object.values(logData || {}).reverse().slice(0, 30).forEach(l => { container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.2);"><span style="color:var(--primary); margin-right:8px; font-weight:900;">[${l.time}]</span>${l.msg}</div>`; }); };
window.renderScoreLog = function(logData) { const container = el('adminScoreLog'); if(!container) return;  container.innerHTML = ""; Object.values(logData || {}).reverse().slice(0, 50).forEach(l => { let color = l.delta >= 0 ? 'var(--info)' : 'var(--danger)'; container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.2);"><span style="color:var(--primary); margin-right:8px; font-weight:900;">[${l.time}]</span><b>${l.playerName}</b>: <span style="color:${color}; font-weight:900;">${l.delta > 0 ? '+' : ''}${l.delta} P</span></div>`; }); };

// =============================================
// FIREBASE KUUNTELIJA
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

    window.gameSettings = data.settings || { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };
    window.gameHistory = data.history ? (Array.isArray(data.history) ? data.history : Object.values(data.history)) : [];

    if (el('gmSetShop')) el('gmSetShop').checked = window.gameSettings.shopEnabled;
    if (el('gmSetLimitCheck')) el('gmSetLimitCheck').checked = window.gameSettings.handLimitEnabled;
    if (el('gmSetLimitCount')) el('gmSetLimitCount').value = window.gameSettings.handLimit;

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
            if(btnSettings) btnSettings.style.display = 'none';
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
            if (typeof window.myLastHoleIndex === 'undefined') { window.myLastHoleIndex = currentHoleIndex; window.myLastScore = currentPoints; } 
            else if (window.myLastHoleIndex !== currentHoleIndex) {
                let diff = currentPoints - window.myLastScore;
                if (diff > 0) window.showAppleToast(`+${diff} P! (${currentPoints} P)`, '💰');
                else if (diff < 0) window.showAppleToast(`${diff} P! (${currentPoints} P)`, '📉');
                window.myLastHoleIndex = currentHoleIndex; window.myLastScore = currentPoints;
            } else { window.myLastScore = currentPoints; }

            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
            window.renderShop(activeHole ? activeHole.shop : null, me.score || 0, me.boughtThisHole);
            
            if (window.gameSettings.handLimitEnabled && myCards.filter(Boolean).length > window.gameSettings.handLimit) { window.showHandLimitModal(myCards.filter(Boolean)); } 
            else { if(el('handLimitModal')) el('handLimitModal').style.display = 'none'; }
            
            let pts = `${me.score || 0} P`;
            if(el('myResPointsBtn')) el('myResPointsBtn').innerText = pts; 
            if(el('shopModalWallet')) el('shopModalWallet').innerText = pts; 
            if(el('handCountBadge')) el('handCountBadge').innerText = myCards.filter(Boolean).length; 
        }

        if (activeHole && activeHole.playedCards) {
            const playedCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            const myNewDebuffs = playedCards.filter(Boolean).filter(pc => pc.target === myName && pc.timestamp > lastPlayedCardTimestamp && pc.type === 'sabotage');
            if (myNewDebuffs.length > 0) {
                myNewDebuffs.forEach(db => { window.showNotification(`💥 Sinua sabotoitiin: ${db.cardName}`, 'debuff'); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); });
                lastPlayedCardTimestamp = Math.max(...playedCards.map(pc => pc.timestamp));
            }
        }
    }
    window.renderAdminPlayerList(); window.renderEventLog(data.eventLog); window.renderScoreLog(data.scoreLog);
});

window.populateRuleSelect = function() { const sel = el('gmRuleSelect'); const rules = window.holeRules || []; if(!sel || rules.length === 0) return; sel.innerHTML = rules.map((r, i) => `<option value="${i}">${r.n}</option>`).join(''); };
setTimeout(window.populateRuleSelect, 500);
