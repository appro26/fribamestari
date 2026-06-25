window.allCards = window.allCards || [];
window.holeRules = window.holeRules || [];

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const el = id => document.getElementById(id);

let myName = localStorage.getItem('friba_name') || null;
let currentRole = 'player'; // <-- TÄMÄ OLI AIEMMIN KADONNUT! Roolimuuttuja palautettu.
let allPlayers = [];
let activeHole = null;
let currentCourse = null;
let currentHoleIndex = 1;
let lastPlayedCardTimestamp = Date.now();
window.gameHistory = []; 

window.gameSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };
window.pendingShopPurchase = null;

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
const getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];

const penColors = [
    { c1: '#0284c7', c2: '#38bdf8' }, { c1: '#dc2626', c2: '#f87171' }, { c1: '#16a34a', c2: '#4ade80' },
    { c1: '#d97706', c2: '#fbbf24' }, { c1: '#9333ea', c2: '#c084fc' }, { c1: '#db2777', c2: '#f472b6' }, { c1: '#475569', c2: '#94a3b8' }
];
const getRandomPen = () => penColors[Math.floor(Math.random() * penColors.length)];

const pseudoRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

const insults = [
    "Mikä tässä lajissa muka on kivaa? Pelkkää puunhakkuuta.", "Taas OB:lle. Ootko harkinnu sauvakävelyä?", 
    "Lajin helppous viehättää, vai mitä?", "Ostin 30 euron kiekon, että voin heittää sen metsään.",
    "Frisbeegolf on kivaa, sanoivat. Rentouttavaa, sanoivat.", "Pariin? Älä naurata. Heitot osuu omiin jalkoihin.",
    "Ootko varma ettei sun laji ois virkkaus?", "Puut tykkää susta, harmi ettei kori.",
    "Toi heitto oli niin huono, että kiekko häpesi.", "Lopeta jo, tää on noloa meille kaikille.",
    "Edes myötätuuli ei pelasta tota räpellystä.", "Jos heittäisit silmät kiinni, menisi varmaan paremmin.",
    "Sun putti on yhtä epävarma kuin Suomen kesä.", "Caddiekin lähti kotiin häpeästä.",
    "Osuithan sä johonkin... nimittäin omaan egoosi.", "Miten voi heittää taaksepäin ohi korista?",
    "Pelaatko sä tahallasi näin huonosti?", "Toi oli hieno heitto... siis jos maali ois toi koivu.",
    "Sulla on enemmän puuosumia kuin metsurilla.", "Eikö tän pitänyt olla rento sunnuntailaji?",
    "Se tunne kun rolleri pysähtyy ekaan käpyyn.", "Älä syytä tuulta, syytä peiliä.",
    "Uusi kiekko ei korjaa tuota tekniikkaa.", "Bägi maksoi 200€, taidot 0€.",
    "Haluatko GPS-paikantimen tuolle avaukselle?", "Miten voi kolmesta metristä laittaa alarautaan?",
    "Tällä vauhdilla ollaan perillä ensi jouluna.", "Fore, rysty, upsi... mikään ei toimi.",
    "Puiden halailu on erikseen, tää on frisbeegolfia.", "Sun draivi on lyhyempi kuin mun putti.",
    "Hieno hyzer-flippi! Ai se oli vahinko?", "Voit aina alkaa kerätä postimerkkejä.",
    "Kato! Se lensi melkein kymmenen metriä!", "Taidat olla radan paras puiden karsija.",
    "Etsiikö sun kiekko sieniä tuolta ryteiköstä?", "Tuloskortin katsominen masentaa aina.",
    "Onneksi tyylipisteitä ei lasketa.", "Lajin kalleimmat varusteet, halvimmat heitot.",
    "Olisiko aika siirtyä e-urheiluun?", "Kiva nähdä, että joku muukin heittää ihan päin honkia.",
    "Ei se kori sieltä metsästä löydy.", "Pääsitkö edes tiiltä pois tällä kertaa?",
    "Tuo heitto rikkoi fysiikan lakeja... huonolla tavalla.", "Frisbeegolf ei ole piiloleikkiä kiekon kanssa.",
    "Puttaaminen on taitolaji. Sä et todistetusti osaa.", "Harmi ettei tyhmyydestä jaeta miinuspisteitä.",
    "Tänään on selvästi sun 'palauttava' kierros.", "Älä viitsi itkeä, tää on vaan muovia.",
    "Sulla on draivia, mutta ei suuntaa.", "Hyvä yritys! (Ei oikeasti ollut).",
    "Joko mennään kotiin? Mulla on nälkä.", "Edes ammattilainen ei selittäisi tuota.",
    "Näytät ihan siltä, että tietäisit mitä teet.", "Kiekko pelkää sua. Siksi se karkaa pusikkoon.",
    "Kokeileppa heittää ilman tuota irvistystä.", "Hieno lay-up. Myönnä vaan että lipsahti.",
    "Sä olet syy miksi kiekoissa pitäisi olla palautusoikeus.", "Voimaa on, mutta älyä ei nimeksikään.",
    "Tää ei ole pituusheittoa, vaan tarkkuuslaji.", "Kävitkö sä edes lämmittelemässä?",
    "Taisi mennä vähän grippilokiksi.", "Kori on tuolla päin! Mihin sä oikein tähtäät?",
    "Edes taikasauva ei pelastaisi tuota tekniikkaa.", "Ootko sä heittänyt koskaan aiemmin?",
    "Laita silmät kii, ehkä se auttaa.", "Toivottavasti kukaan ei kuvannut tuota.",
    "Ei edes tuurilla osuisi noin huonosti.", "Sun rysty on heikompi kuin mun isoäidin.",
    "Ota rennosti, eihän tää oo vakavaa... paitsi sulle.", "Frisbeegolf - laji missä olet surkea.",
    "Onko sulla kädessä joku asennusvirhe?", "Edes koira ei hakisi tuota kiekkoa.",
    "Menikö kiekko taas mustikkaan?", "Sulla on lahjoja... johonkin aivan muuhun.",
    "Toi heitto oli suorastaan traaginen.", "Vielä ehtii vaihtaa harrastusta.",
    "Puut ovat ystäviä, älä osu jokaiseen.", "Näyttää siltä, että yrität liikaa. Ja epäonnistut.",
    "Onneks sulla on edes hienot vaatteet.", "Jos voisin piirtää tuloskorttiin itkevän hymiön..."
];

const doodleSVGs = [
    "M 20 70 C 20 90, 80 90, 80 70 C 90 40, 10 40, 20 70 M 20 60 L 10 50 M 35 45 L 30 30 M 65 45 L 70 30 M 80 60 L 90 50 M 40 60 C 45 65, 55 65, 60 60", 
    "M 40 80 C 20 80, 20 50, 40 50 C 45 40, 60 40, 65 50 C 80 50, 90 80, 70 90 C 80 60, 95 30, 70 20 C 50 10, 50 40, 60 60 M 45 65 C 50 70, 60 70, 65 65", 
    "M 50 80 L 20 40 L 40 40 L 50 20 L 60 40 L 80 40 Z M 35 50 L 45 60 L 55 50", 
    "M 20 50 C 20 10, 80 10, 80 50 C 80 90, 20 90, 20 50 M 20 30 C 10 20, 20 10, 30 20 M 80 30 C 90 20, 80 10, 70 20 M 40 60 C 50 70, 60 70, 60 60", 
    "M 40 50 C 20 50, 20 90, 40 90 C 60 90, 60 50, 40 50 M 30 50 C 20 10, 40 10, 40 50 M 50 50 C 40 10, 60 10, 50 50 M 35 70 C 40 75, 45 75, 50 70", 
    "M 20 80 C 20 40, 80 40, 80 80 Z M 35 60 C 40 65, 45 65, 50 60 M 30 50 C 35 50, 35 45, 30 45 M 70 50 C 65 50, 65 45, 70 45" 
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
        el('nativeInstallBtn').style.display = 'none'; 
        el('installPromptModal').style.display = 'flex';
    }
};

window.dismissInstallPrompt = function() {
    localStorage.setItem('friba_browser_mode', 'true');
    if(el('installPromptModal')) el('installPromptModal').style.display = 'none';
};

window.addEventListener('load', () => { setTimeout(window.checkInstallPrompt, 1500); });

// ==============================================
// VAPAA KAMERA & SULAVA JS-LIIKU
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
        boardEl.style.transform = `translate3d(${boardState.x}px, ${boardState.y}px, 0) scale(${boardState.scale})`;
    }
    isRendering = false;
};

window.animateCameraTo = function(tX, tY, tScale, duration=400) {
    if (camAnim) cancelAnimationFrame(camAnim);
    let sX = boardState.x; let sY = boardState.y; let sScale = boardState.scale;
    let startT = performance.now();
    
    function step(time) {
        let p = (time - startT) / duration;
        if (p >= 1) p = 1;
        let ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
        boardState.x = sX + (tX - sX) * ease;
        boardState.y = sY + (tY - sY) * ease;
        boardState.scale = sScale + (tScale - sScale) * ease;
        if(!boardEl) boardEl = el('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${boardState.x}px, ${boardState.y}px, 0) scale(${boardState.scale})`;
        
        if (p < 1) camAnim = requestAnimationFrame(step);
        else camAnim = null;
    }
    camAnim = requestAnimationFrame(step);
};

const vp = el('corkboard-viewport');
if(vp) {
    vp.addEventListener('touchstart', e => {
        if(camAnim) { cancelAnimationFrame(camAnim); camAnim = null; }
        if(e.touches.length === 1) {
            isDraggingBoard = true;
            lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            window.applyBoardTransform();
        } else if (e.touches.length === 2) {
            initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            isDraggingBoard = true;
        }
    }, {passive: false});

    vp.addEventListener('touchmove', e => {
        if(!isDraggingBoard) return;
        e.preventDefault(); 
        
        if(e.touches.length === 1 && lastBoardTouch) {
            boardState.x += e.touches[0].clientX - lastBoardTouch.x;
            boardState.y += e.touches[0].clientY - lastBoardTouch.y;
            lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let scaleDiff = dist / initialPinchDist;
            let pinchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let pinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            boardState.x -= (pinchX - boardState.x) * (scaleDiff - 1);
            boardState.y -= (pinchY - boardState.y) * (scaleDiff - 1);
            boardState.scale *= scaleDiff;
            if(boardState.scale < 0.15) boardState.scale = 0.15;
            if(boardState.scale > 2.5) boardState.scale = 2.5;
            initialPinchDist = dist;
        }

        if (!isRendering) {
            isRendering = true;
            requestAnimationFrame(window.applyBoardTransform);
        }
    }, {passive: false});

    vp.addEventListener('touchend', e => {
        if(e.touches.length < 1) {
            isDraggingBoard = false;
            lastBoardTouch = null;
        } else if (e.touches.length === 1) {
            lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, {passive: true});
}

window.zoomToHole = function(hIndex) {
    if(!currentCourse || !currentCourse.pars) return;
    let totalHoles = currentCourse.pars.length;
    let cols = Math.min(9, totalHoles);
    let col = (hIndex - 1) % cols;
    let row = Math.floor((hIndex - 1) / cols);
    
    let cellX = 120 + col * 460; 
    let cellY = 120 + row * 1010; 
    let targetX = (window.innerWidth - 380) / 2 - cellX;
    let targetY = 50 - cellY; 
    
    window.animateCameraTo(targetX, targetY, 1, 400);
};

window.zoomToCurrentHole = function() {
    window.zoomToHole(currentHoleIndex);
};

window.getHoleCellHTML = function(hData, hIndex, isActive, isHistory) {
    let clickAttr = `onclick="window.zoomToHole(${hIndex})" style="cursor:pointer;"`;
    let html = `<div class="hole-cell" ${clickAttr}>`;
    let par = currentCourse.pars ? (currentCourse.pars[hIndex - 1] || 3) : 3;
    
    let rot1 = (pseudoRandom(hIndex * 1.1) * 6 - 3).toFixed(1);
    let rot2 = (pseudoRandom(hIndex * 2.2) * 6 - 3).toFixed(1);
    let rot3 = (pseudoRandom(hIndex * 3.3) * 6 - 3).toFixed(1);

    html += `<div class="index-card" style="transform: rotate(${rot1}deg);">`;
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
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg);">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: 1.15rem; line-height: 1.4; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    let playedCards = Object.values(hData.playedCards || {}).filter(Boolean);
    if(playedCards.length > 0) {
        let myCards = [];
        let otherCards = [];
        
        playedCards.forEach(pc => {
            if (pc.target === myName) myCards.push(pc);
            else otherCards.push(pc);
        });

        // 1. MINUUN KOHDISTUVAT KORTIT (Fyysisinä kortteina YLIMPÄNÄ)
        if (myCards.length > 0) {
            html += `<div style="width: 100%; max-width:340px; margin-bottom: 15px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">`;
            myCards.forEach((pc, idx) => {
                let typeClass = pc.type === 'buff' ? 'buff-card' : 'debuff-card';
                if(pc.tier === 'premium') typeClass = 'premium-card';
                let tagTxt = pc.tier === 'premium' ? '💎 PREMIUM' : (pc.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
                
                let cRot = (pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                
                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg);">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    <div class="physical-card ${typeClass}">
                        <div class="card-type-tag">${tagTxt}</div>
                        <h3>${pc.cardName}</h3><p>${pc.cardDesc}</p>
                        <div style="background:rgba(0,0,0,0.05); padding:4px; border-radius:4px; font-size:0.75rem; text-align:center; font-weight:bold; margin-top:auto;">
                            Kohteelle: Sinuun!<br><span style="font-weight:normal;">(${pc.by})</span>
                        </div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        // 2. MUIDEN PELITAPAHTUMAT (Lapulla omien korttien ALLA)
        if (otherCards.length > 0) {
            let pRot = (pseudoRandom(hIndex * 1.5) * 4 - 2).toFixed(1);
            html += `<div style="width: 100%; max-width:300px; margin-top: 15px; margin-bottom: 15px; position:relative; background:var(--paper-bg); padding:10px; box-shadow: 2px 4px 10px rgba(0,0,0,0.2); border-radius:2px; transform: rotate(${pRot}deg);">
                        <div class="tape tape-top" style="--rot:-2deg;"></div>
                        <h2 style="color:var(--text-main); font-size:0.95rem; margin-bottom:10px; border-bottom:2px dashed #ccc; padding-bottom:5px; font-family:'Kalam', cursive; text-align:center;">PELITAPAHTUMAT</h2>
                        <div style="display:flex; flex-direction:column; gap:6px;">`;
            
            otherCards.forEach((pc) => {
                let typeIcon = pc.type === 'buff' ? '🛡️' : '🚫';
                let typeColor = pc.type === 'buff' ? 'var(--info)' : 'var(--danger)';
                
                html += `
                <div style="background:rgba(0,0,0,0.05); padding:6px; border-radius:4px; font-size:0.75rem; border-left: 4px solid ${typeColor};">
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

        html += `
        <div class="player-row-paper">
            <span class="paper-name" style="font-size:1.4rem;">${p.name}</span>
            <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-size:1rem; color:var(--warning); font-weight:900;">${p.score || 0} P</span>
                <div class="score-display-paper" style="width:auto !important; min-width:34px; height:34px !important; font-size:1.2rem !important; margin-left:auto; padding:0 5px;">${scoreHTML}</div>
            </div>
        </div>`;
    });
    html += `</div>`;
    
    if (isHistory) {
        let insultIndex = Math.floor(pseudoRandom(hIndex * 8.8) * insults.length);
        let svgIndex = Math.floor(pseudoRandom(hIndex * 9.9) * doodleSVGs.length);
        
        let dText = insults[insultIndex];
        let dSvg = doodleSVGs[svgIndex];
        let dRot = -15 + (pseudoRandom(hIndex * 3) * 30);
        let opacityStyle = `opacity: 0.8; transform: rotate(${dRot}deg) scale(1);`;
        
        let posRand = pseudoRandom(hIndex * 7);
        let posCss = "";
        let offsetX = 160; 
        let offsetY = 80; 
        if (posRand < 0.25) posCss = `top: -${offsetY}px; left: -${offsetX}px;`;
        else if (posRand < 0.5) posCss = `top: -${offsetY}px; right: -${offsetX}px;`;
        else if (posRand < 0.75) posCss = `bottom: -${offsetY}px; left: -${offsetX}px;`;
        else posCss = `bottom: -${offsetY}px; right: -${offsetX}px;`;

        html += `
        <div class="doodle-drawing" style="${posCss} ${opacityStyle}">
            <div class="doodle-bubble">${dText}</div>
            <svg class="doodle-svg doodle-path" viewBox="0 0 100 100"><path d="${dSvg}"/></svg>
        </div>`;
    }

    html += `</div>`;
    return html;
};

window.renderBoard = function() {
    const board = el('corkboard-surface');
    if (!board) return;
    
    if (!currentCourse) { 
        board.innerHTML = '';
        return; 
    }
    
    let totalHoles = currentCourse.pars.length;
    let cols = Math.min(9, totalHoles);
    let rows = Math.ceil(totalHoles / cols);
    
    let exactWidth = 240 + (cols * 380) + ((cols - 1) * 80);
    let exactHeight = 240 + (rows * 950) + ((rows - 1) * 60);
    
    board.style.width = `${exactWidth}px`;
    board.style.height = `${exactHeight}px`;
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
            <h1 style="font-family:'Kalam', cursive; font-size:4rem; color:var(--primary); margin-bottom:10px; line-height:1;">🏆 PELI<br>PÄÄTTYNYT!</h1>
            <h2 style="font-size:1.5rem; margin-bottom:5px; color:#555;">VOITTAJA:</h2>
            <div style="font-size:3.5rem; font-weight:900; color:var(--ink-blue); margin-bottom:20px; font-family:'Kalam', cursive;">${winner.name}</div>
            <div style="background:#f1f5f9; padding:20px; border-radius:12px; border:2px dashed #94a3b8;">
                <p style="font-size:1.8rem; font-weight:900; color:#000; margin-bottom:10px;">Tulos: ${winner.dgScore > 0 ? '+' : ''}${winner.dgScore}</p>
                <p style="font-size:1.5rem; font-weight:800; color:var(--warning);">Lopulliset varat: ${winner.score} P</p>
            </div>
        </div>`;
    } else if (activeHole) {
        html += window.getHoleCellHTML({
            rule: activeHole.rule, playedCards: activeHole.playedCards,
            color: activeHole.color, penColor: activeHole.penColor, players: allPlayers
        }, currentHoleIndex, true, false);
    }
    
    board.innerHTML = html;
};

window.renderReceipt = function() {
    if(!allPlayers || allPlayers.length === 0 || !currentCourse) {
        if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'none';
        return;
    }
    if(el('receipt-printer-container')) el('receipt-printer-container').style.display = 'flex';

    let renderScoreDots = (strokes, p_par) => {
        if(!strokes) return '-';
        let diff = strokes - p_par;
        let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red');
        if (diff < -1) cClass = 'blue'; 
        return `<span class="receipt-circle ${cClass}">${strokes}</span>`;
    };

    let generateHistoryLines = (isMini) => {
        let html = ``;
        let startIdx = isMini ? Math.max(0, window.gameHistory.length - 2) : 0;
        
        for(let i=startIdx; i<window.gameHistory.length; i++) {
            let h = window.gameHistory[i];
            let par = currentCourse.pars ? (currentCourse.pars[i] || 3) : 3;
            if(!isMini) html += `<div class="r-hole-title">Väylä ${i+1} <span style="color:#666;">(PAR ${par})</span></div>`;
            if(h.holeResults && !isMini) {
                for(let pName in h.holeResults) {
                    html += `<div class="r-row"><span>${pName.substring(0, 12)}</span>${renderScoreDots(h.holeResults[pName], par)}</div>`;
                }
            }
        }
        return html;
    };

    let generateTotals = (isMini) => {
        let html = ``; // YHTEENSÄ teksti poistettu tarpeettomana
        let sorted = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0));
        sorted.forEach(p => {
            let dgStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            let fSize = isMini ? '1.3rem' : '1.8rem'; // Tulokset isommalla!
            html += `<div class="r-row" style="font-size:${fSize}; margin-bottom: 2px;"><span>${p.name.substring(0, isMini?6:12)}</span><span>${dgStr}</span></div>`;
        });
        return html;
    };

    if(el('receipt-mini-totals')) el('receipt-mini-totals').innerHTML = generateTotals(true);
    if(el('receipt-full-content')) {
        let fullTitle = `<div class="r-title" style="font-size:1.5rem; margin-bottom:15px;">TULOKSET</div>`;
        el('receipt-full-content').innerHTML = fullTitle + generateHistoryLines(false) + `<div class="r-tot-sec" style="margin-top:10px; border-top: 2px dashed #111; padding-top:10px;">${generateTotals(false)}</div>`;
    }
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
            window.pendingShopPurchase = null; 
            window.switchShopTab('sell'); // Siirtyy aina omiin kortteihin oston jälkeen
            window.showNotification(`🛒 Ostit edun!`, 'warning');
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
        return;
    }

    const shopIndex = (activeHole.shop || []).findIndex(i => i && i.id === idStr);
    if (shopIndex !== -1) {
        me.score -= priceVal; me.boughtThisHole = true;
        let nextShop = JSON.parse(JSON.stringify(activeHole.shop)); nextShop.splice(shopIndex, 1);
        me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : []; me.cards.push(idStr);
        update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers), 'gameState/activeHole/shop': window.cleanFirebaseData(nextShop) });
        
        // Vaihtaa tabin omiin kortteihin kun osto on suoritettu!
        window.switchShopTab('sell');
        window.logEvent(`${myName} osti edun: ${nameStr}.`); 
        window.showNotification(`🛒 Ostit edun: ${nameStr}`, 'warning');
    }
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    const me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole ? activeHole.shop : null, me ? me.score : 0, me ? me.boughtThisHole : false);
    window.switchShopTab('buy');
};

window.openShop = function(tab) {
    if(el('shopModal')) el('shopModal').style.display = 'block';
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
                        <div style="text-align:center; font-weight:900; font-size:0.75rem; color:#94a3b8; padding-top:10px; margin-top:auto;">🔄 TARKASTELU</div>
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
        myCards.forEach((cId, i) => {
            const cDef = (window.allCards || []).find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
            if(cDef.tier === 'premium') { typeClass = 'premium-card'; }
            let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
            let isNormal = cDef.tier === 'normal';
            let sellBtnIcon = isNormal ? '♻️' : '🗑️';
            
            sellHtml += `
            <div class="shop-item-wrapper">
                <div class="physical-card worn-card ${typeClass}" onclick="window.openCardDetail('${cId}', 'sell')" style="cursor:pointer;">
                    <div class="card-type-tag">${tagTxt}</div><h3>${cDef.n}</h3><p>${cDef.d}</p>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 TARKASTELU</div>
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
// TURVALLINEN KARUSELLI Z-PÄIVITYKSELLÄ
//==============================================
window.flipCard = function(index) {
    const inner = el(`card3d-inner-${index}`);
    if (!inner) return;
    if(inner.classList.contains('flipped')) inner.classList.remove('flipped');
    else inner.classList.add('flipped');
};

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
            <div class="carousel-card-wrapper" id="carousel-wrapper-${i}" onclick="window.flipCard(${i})">
                <div class="card-3d-inner" id="card3d-inner-${i}">
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

    function updateCarouselLayout() {
        const scrollLeft = container.scrollLeft; const containerWidth = container.clientWidth;
        const centerOffset = containerWidth / 2; const cardWidth = 320; 
        const paddingLeft = centerOffset - (cardWidth / 2); 
        let closestIndex = 0; let minDiff = 9999;

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
            
            if (Math.abs(diff) < minDiff) { minDiff = Math.abs(diff); closestIndex = index; }
        }
        if (window.carouselCurrentIndex !== closestIndex) { window.carouselCurrentIndex = closestIndex; window.updateCarouselButtons(); }
    }
    
    container.addEventListener('scroll', () => { requestAnimationFrame(updateCarouselLayout); }, {passive: true});
    setTimeout(updateCarouselLayout, 50);
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
        if(container) container.scrollLeft = (window.carouselCurrentIndex * 320); 
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
    
    // Siirrytään smoothisti
    setTimeout(() => { window.zoomToHole(nextHoleIndex); }, 400); 
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
    if (confirm("Haluatko varmasti nollata koko kierroksen tiedot? Kaikki kirjataan ulos ja peliasetukset palautuvat oletuksiin.")) {
        localStorage.removeItem('friba_browser_mode');
        const defaultSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };
        set(ref(db, 'gameState'), window.cleanFirebaseData({ settings: defaultSettings, players: [], activeHole: null, currentHoleIndex: 1, course: null, history: [] }))
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
window.showNotification = function(message, type = 'info') { const container = el('notificationContainer'); if(!container) return; const toast = document.createElement('div'); toast.className = `notification ${type}`; toast.innerHTML = `<span style="font-size:1.3rem;">${type === 'warning' ? '🛒' : (type === 'debuff' ? '💥' : 'ℹ️')}</span> <span>${message}</span>`; container.appendChild(toast); setTimeout(() => { toast.remove(); }, 3500); };
window.claimIdentity = function() { let n = el('playerNameInput').value.trim(); if(!n || n.length > 15) return alert("Syötä nimi!"); myName = n; localStorage.setItem('friba_name', n); window.updateIdentityUI(); if(!(allPlayers || []).find(x => x && x.name === n)) { let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean); nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], boughtThisHole: false }); set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)); window.logEvent(`${n} liittyi peliin.`); } };

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
    if (el('gmSetPtsWin')) el('gmSetPtsWin').value = window.gameSettings.ptsWin;
    if (el('gmSetPtsTask')) el('gmSetPtsTask').value = window.gameSettings.ptsTask;
    if (el('gmSetPtsLose')) el('gmSetPtsLose').value = window.gameSettings.ptsLose;

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
            if (typeof window.myLastHoleIndex === 'undefined') { window.myLastHoleIndex = currentHoleIndex; window.myLastScore = currentPoints; } 
            else if (window.myLastHoleIndex !== currentHoleIndex) {
                let diff = currentPoints - window.myLastScore;
                let diffStr = diff > 0 ? "+" + diff : diff;
                
                if (currentCourse && currentHoleIndex > currentCourse.pars.length) {
                     window.showNotification(`Kaikki väylät pelattu! Katso voittaja taululta.`, 'warning');
                } else if (diff !== 0) {
                    window.showNotification(`Väylä ${window.myLastHoleIndex} pelattu! Pisteet: ${diffStr} P (Yht: ${currentPoints} P)`, diff > 0 ? 'info' : 'debuff');
                } else {
                    window.showNotification(`Väylä ${window.myLastHoleIndex} pelattu! Pisteet: 0 P (Yht: ${currentPoints} P)`, 'info');
                }
                
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
