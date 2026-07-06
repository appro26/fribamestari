// ==============================================
// KÄYTTÖLIITTYMÄN RENDERÖINTI JA MODAALIT (ui.js)
// ==============================================

var el = id => document.getElementById(id);

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
window.getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];

const penColors = [
    { c1: '#0284c7', c2: '#38bdf8' }, 
    { c1: '#dc2626', c2: '#f87171' }, 
    { c1: '#16a34a', c2: '#4ade80' },
    { c1: '#d97706', c2: '#fbbf24' }, 
    { c1: '#9333ea', c2: '#c084fc' }, 
    { c1: '#db2777', c2: '#f472b6' }, 
    { c1: '#475569', c2: '#94a3b8' }
];
window.getRandomPen = () => penColors[Math.floor(Math.random() * penColors.length)];

window.pseudoRandom = (seed) => { 
    let x = Math.sin(seed) * 10000; 
    return x - Math.floor(x); 
};

// ==============================================
// SKAALAUS JA NÄKYMIEN HALLINTA (UUSI)
// ==============================================
window.applyViewScales = function() {
    let w = window.innerWidth;
    
    // Nyt kun asettelu perustuu Gridiin ja Container Queriesiin, 
    // pehmeä skaalaus varmistaa vain, ettei sisältö repeä kapeimmillakaan puhelimilla.
    let shopWrapper = el('shop-scale-wrapper');
    if(shopWrapper) {
        let shopScale = Math.min(1.0, w / 650); 
        shopWrapper.style.transform = `scale(${shopScale})`;
    }
    
    let binderWrapper = el('binder-scale-wrapper');
    if(binderWrapper) {
        let binderScale = Math.min(1.0, w / 650);
        binderWrapper.style.transform = `scale(${binderScale})`;
    }
    
    let receiptWrapper = el('receipt-scale-wrapper');
    if(receiptWrapper) {
        let recScale = Math.min(1.0, w / 500);
        receiptWrapper.style.transform = `scale(${recScale})`;
    }
};
window.addEventListener('resize', window.applyViewScales);

window.viewedHoleIndex = null;

// ==============================================
// ILMOITUKSET JA IKKUNAT
// ==============================================
window.showModalSafe = function(id, displayType) {
    let elModal = document.getElementById(id); 
    if(elModal) { 
        elModal.style.display = displayType || 'flex'; 
        history.pushState({ fribaApp: true }, ''); 
    } 
};

window.showZoomModal = function(html) {
    let container = el('zoomModalContent');
    if(container) {
        container.innerHTML = html;
        let child = container.firstElementChild;
        if(child) {
            child.style.position = 'relative'; 
            child.style.margin = '0 auto'; 
            child.style.transform = 'none';
            child.style.width = '100%'; 
            child.style.maxWidth = '90vw';
        }
        container.style.transform = `scale(${Math.min(1.1, (window.innerWidth * 0.95) / 300)})`;
        window.showModalSafe('zoomModal');
    }
};

window.showEventCard = function(cId, target, by) {
    window.carouselCards = [cId];
    window.carouselCurrentMode = 'event';
    window.carouselCurrentIndex = 0;
    window.renderCarousel();
    
    let targetStr = '';
    if (target) {
        targetStr = `
            <div style="background:var(--danger); color:#fff; padding:15px; border-radius:12px; font-weight:900; font-size:1.4rem; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.6); margin-bottom:10px;">
                SUORITTAJA:<br><span style="font-size:2rem; font-family:'Kalam', cursive;">${target}</span>
                <div style="font-size:1rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div>
            </div>`;
    }
    
    let container = el('cardDetailActionArea');
    if(container) container.innerHTML = targetStr;
    window.showModalSafe('cardDetailModal');
    setTimeout(() => { if(window.initNativeCarousel) window.initNativeCarousel(); }, 100);
};

// AITO iPHONE TOAST - Parsii erittelyn hienoksi taulukoksi
window.showAppleToast = function(msg, icon = '✨') { 
    const toast = el('appleToast'); 
    if(!toast) return; 
    
    let iconEl = el('appleToastIcon');
    if(iconEl) iconEl.innerText = icon; 
    
    let title = "Fribamestari";
    if (msg.includes("Palkka") || msg.includes("P") || msg.includes("Voitto")) title = "Pankki 💰";
    if (msg.includes("Kortti") || msg.includes("Kortit") || icon === "🃏") title = "Pakka 🃏";
    if (msg.includes("Väylä ohi") || msg.includes("Väylä")) title = "Väylä Suoritettu ⛳";
    
    let titleEl = el('appleToastTitle');
    if (titleEl) titleEl.innerText = title;

    let parts = msg.split(', ');
    let topText = "Tapahtuman erittely:";
    let detailsHtml = '';
    
    if (parts.length > 1 || msg.includes(':')) {
        parts.forEach(p => {
            let kv = p.split(': ');
            if(kv.length === 2) {
                let valColor = kv[1].includes('-') ? '#fca5a5' : '#86efac';
                detailsHtml += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#cbd5e1;">${kv[0]}</span><span style="color:${valColor}; font-weight:900; font-size:1.1rem;">${kv[1]}</span></div>`;
            } else {
                detailsHtml += `<div style="padding:4px 0; font-weight:600;">${p}</div>`;
            }
        });
    } else {
        topText = msg;
    }

    let bodyHtml = `<div style="font-weight: 700; font-size: 1.05rem; color: #fff; margin-bottom: 2px;">${topText}</div>`;
    if (detailsHtml) {
        bodyHtml += `<div id="appleToastDetails" style="margin-top: 4px; padding-top: 2px;">${detailsHtml}</div>`;
    }
                    
    let bodyEl = el('appleToastBody');
    if(bodyEl) bodyEl.innerHTML = bodyHtml;

    toast.classList.add('show'); 
    if (navigator.vibrate) navigator.vibrate(150);
    setTimeout(() => { toast.classList.remove('show'); }, 6000); 
};

window.showNotification = function(message, type = 'info') { 
    const container = el('notificationContainer'); 
    if(!container) return; 
    const toast = document.createElement('div'); 
    toast.className = `notification ${type}`; 
    toast.innerHTML = `<span>${message}</span>`; 
    container.appendChild(toast); 
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { toast.remove(); }, 6000); 
};

// ==============================================
// ÄLYKÄS KORTIN PELAAMINEN (Automaattikohteet)
// ==============================================
window.openTargetModal = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return;
    
    window.pendingCardPlay = { id: cId, def: cDef, cost: typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cId) : cDef.price };
    
    // Helpotuskortit menevät AINA suoraan itselle!
    if (cDef.type === 'buff') {
        window.executeCardPlay(window.myName);
        return; 
    }
    
    // Sabotaasikortit vastustajille
    let opponents = (window.allPlayers || []).filter(p => p.name !== window.myName);
    
    if (opponents.length === 1) {
        // Vain 1 vastustaja pelissä -> Iskee automaattisesti häneen!
        window.executeCardPlay(opponents[0].name);
        return;
    } else if (opponents.length > 1) {
        // Useampi vastustaja -> Pakota valitsemaan 1 kohde. EI "kaikille" vaihtoehtoa.
        let nameEl = el('targetCardName');
        if(nameEl) nameEl.innerText = cDef.n;
        
        let html = '';
        opponents.forEach(p => {
            html += `<button class="btn btn-warning btn-modern" style="width:100%; padding:16px; margin-bottom:12px; font-size:1.3rem; font-weight:900; color:#000; border-radius:12px;" onclick="window.executeCardPlay('${p.name}')">SABOTOI: ${p.name}</button>`;
        });
        
        let listEl = el('targetPlayerList');
        if(listEl) listEl.innerHTML = html;
        window.showModalSafe('targetModal');
    } else {
        alert("Ei vastustajia pelissä!");
    }
};

// ==============================================
// KORTIN GENEROINTI (CONTAINER QUERIES CSS)
// ==============================================
window.generateCardHTML = function(cDef, isLocked = false, extraBottomHtml = '') {
    if (!cDef) return '';
    let typeClass = `tier-${cDef.level || 1}`;
    let typeIcon = cDef.type === 'buff' ? '🛡️' : '💥';
    let typeName = cDef.type === 'buff' ? 'buff' : 'sabotage';
    let safeCardName = cDef.n ? cDef.n.split(' (')[0] : '';
    let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : cDef.price;
    
    if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[cDef.id] !== undefined) {
        playCost = window.gameSettings.cardPrices[cDef.id];
    }

    let lockedStyle = isLocked ? 'opacity: 0.5; filter: grayscale(50%);' : '';
    
    // Tässä luotetaan CSS:n container-type: inline-size; ominaisuuteen! Mitat haetaan vanhemmalta.
    return `
    <div class="physical-card ${typeClass}" style="${lockedStyle}">
        <div class="card-header ${typeName}">
            <span>${typeIcon} ${cDef.type === 'buff' ? 'HELPOTUS' : 'SABOTAASI'}</span><span>TASO ${cDef.level || 1}</span>
        </div>
        <div class="card-body ${typeName}">
            <div class="play-cost-badge">MAKSU: ${playCost} P</div>
            <div class="card-title">${safeCardName}</div>
            <div class="card-desc">${cDef.d}</div>
            ${extraBottomHtml}
        </div>
    </div>`;
};

// ==============================================
// VÄYLÄN RENDERÖINTI JA SOLVAUKSET
// ==============================================
window.updateHoleNav = function() {
    if (!window.currentCourse) return;
    let hIndex = window.viewedHoleIndex || window.currentHoleIndex || 1;
    let total = window.currentCourse.pars ? window.currentCourse.pars.length : 18;
    let isCurrent = (hIndex === window.currentHoleIndex);
    
    let titleEl = el('hole-nav-title');
    if(titleEl) {
        if(window.currentHoleIndex > total) {
            titleEl.innerHTML = `VÄYLÄ ${hIndex} (HISTORIA)`;
        } else {
            titleEl.innerHTML = isCurrent ? `<span style="color:var(--primary);">VÄYLÄ ${hIndex} (NYT)</span>` : `VÄYLÄ ${hIndex} (HISTORIA)`;
        }
    }
    
    window.renderHoleView(hIndex, isCurrent);
    window.renderPayslipView(hIndex);
};

window.prevHoleView = function() {
    let hIndex = window.viewedHoleIndex || window.currentHoleIndex || 1;
    if(hIndex > 1) {
        window.viewedHoleIndex = hIndex - 1;
        window.updateHoleNav();
    }
};

window.nextHoleView = function() {
    let hIndex = window.viewedHoleIndex || window.currentHoleIndex || 1;
    let max = window.currentCourse && window.currentCourse.pars ? window.currentCourse.pars.length : 18;
    let limit = Math.min(window.currentHoleIndex, max);
    
    if (window.currentHoleIndex > max) limit = max;

    if(hIndex < limit) {
        window.viewedHoleIndex = hIndex + 1;
        window.updateHoleNav();
    }
};

window.renderHoleView = function(hIndex, isCurrent) {
    let container = el('hole-content');
    if(!container) return;
    
    let totalHoles = window.currentCourse && window.currentCourse.pars ? window.currentCourse.pars.length : 18;
    
    if (window.currentHoleIndex > totalHoles && isCurrent && hIndex > totalHoles) {
        let sortedPlayers = [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
        let winner = sortedPlayers[0] || {name: "Tuntematon", dgScore: 0, score: 0};
        container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:600px; width:100%;">
            <div style="transform:rotate(-3deg); background:#fff; padding:40px 20px; box-shadow:15px 30px 60px rgba(0,0,0,0.6); border:4px solid #ccc; z-index:100; text-align:center; width:90%; max-width:400px; border-radius:8px; position:relative;">
                <div class="tape tape-top" style="width:150px; top:-15px; height:25px;"></div>
                <h1 style="font-family:'Kalam', cursive; font-size:4rem; color:var(--primary); margin-bottom:15px; line-height:1;">🏆 MESTARI!</h1>
                <h2 style="font-size:1.5rem; margin-bottom:10px; color:#555;">VOITTAJA:</h2>
                <div style="font-size:3.5rem; font-weight:900; color:var(--ink-blue); margin-bottom:20px; font-family:'Kalam', cursive; overflow-wrap:break-word;">${winner.name}</div>
            </div>
        </div>`;
        return;
    }

    let hData = isCurrent ? window.activeHole : window.gameHistory[hIndex - 1];
    if(!hData) { container.innerHTML = '<p>Väylän tietoja ei löydy.</p>'; return; }

    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[hIndex - 1] || 3) : 3;
    let rot1 = (window.pseudoRandom(hIndex * 1.1) * 6 - 3).toFixed(1);
    let rot2 = (window.pseudoRandom(hIndex * 2.2) * 6 - 3).toFixed(1);

    let html = ``;

    let seed = hIndex * 99;
    let insultIdx = Math.floor(window.pseudoRandom(seed) * (window.insults ? window.insults.length : 1));
    let doodleIdx = Math.floor(window.pseudoRandom(seed+1) * (window.doodleSVGs ? window.doodleSVGs.length : 1));
    
    let rawInsult = window.insults && window.insults.length > 0 ? window.insults[insultIdx] : "Heitä paremmin!";
    let playerNames = (window.allPlayers || []).map(p=>p.name);
    let targetPlayer = playerNames.length > 0 ? playerNames[Math.floor(window.pseudoRandom(seed+2) * playerNames.length)] : window.myName;
    let finalInsult = rawInsult.replace(/\[Pelaaja\]/g, targetPlayer);
    let svgPath = window.doodleSVGs && window.doodleSVGs.length > 0 ? window.doodleSVGs[doodleIdx] : "";

    html += `
    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 25px; position: relative;">
        <div style="background: rgba(255,255,255,0.95); padding: 15px 20px; border-radius: 20px; border: 3px solid #1e293b; font-family: 'Kalam', cursive; font-size: 1.4rem; font-weight: 900; color: #1e293b; text-align: center; box-shadow: 4px 6px 15px rgba(0,0,0,0.3); max-width: 90%; line-height: 1.2; position: relative; z-index: 2;">
            "${finalInsult}"
        </div>
        <div style="width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 20px solid #1e293b; margin-top: -3px; z-index: 1;"></div>
        <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; fill: none; stroke: #fff; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; margin-top: -10px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.8));">
            <path d="${svgPath}"></path>
        </svg>
    </div>`;

    html += `<div class="mini-corkboard">`;

    // 1. INFO KORTTI
    html += `<div class="index-card" style="transform: rotate(${rot1}deg); position: relative; margin-bottom: 30px; width: 90%; max-width: 320px;">`;
    html += `<div class="banner-subtitle">${window.currentCourse ? window.currentCourse.name : ''}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>`;
    
    if (isCurrent && hData.penColor) {
        html += `<div class="pen-container btn-modern" onclick="event.stopPropagation(); window.openScoreModal();"><div class="pen-string"></div><div class="pen-body" style="background: linear-gradient(to right, ${hData.penColor.c1}, ${hData.penColor.c2}, ${hData.penColor.c1});"><span class="pen-text">MERKKAA</span></div></div>`;
    }
    html += `</div>`;

    // 2. VÄYLÄSÄÄNTÖ
    if (hData.rule) {
        let bTxt = hData.rule.type === 'bounty' ? `🏆 TEHTÄVÄ` : '🎲 VÄYLÄSÄÄNTÖ';
        let bgCol = hData.color || '#fef08a';
        let ruleLen = hData.rule.d ? hData.rule.d.length : 0;
        let pSize = ruleLen > 80 ? '1.05rem' : '1.25rem';
        let pLh = ruleLen > 80 ? '1.25' : '1.4';

        html += `
        <div class="post-it-note btn-modern" style="background:${bgCol}; transform: rotate(${rot2}deg); margin-bottom: 30px; width: 90%; max-width: 340px; cursor:pointer;" onclick="event.stopPropagation(); window.showZoomModal(this.outerHTML)">
            <div style="font-weight:900; font-size:0.95rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.8rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: ${pSize}; line-height: ${pLh}; font-weight:800; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    // 3. PELATUT KORTIT
    let playedCards = [];
    if (hData.playedCards) { playedCards = Object.values(hData.playedCards).filter(Boolean); }
    
    if(playedCards.length > 0) {
        html += `<div style="width: 100%; max-width:400px; margin-bottom: 20px; display:flex; flex-wrap:wrap; justify-content:center; gap:15px; padding: 10px;">`;
        playedCards.forEach((pc, idx) => {
            if (pc.target === window.myName || pc.target === 'KAIKKI VASTUSTAJAT') {
                let cRot = (window.pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(window.pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
                
                let extraHtml = `<div style="background:rgba(0,0,0,0.9); color:#fff; padding:3cqw; border-radius:2cqw; font-size:4cqw; text-align:center; font-weight:bold; margin-top:auto; width:100%; box-sizing:border-box;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}<br><span style="font-weight:normal; color:#ccc;">(${pc.by})</span></div>`;
                let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml);

                html += `
                <div class="pinned-card-container btn-modern" style="transform: rotate(${cRot}deg); cursor:pointer; width:150px; position:relative;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div class="pushpin" style="left: ${pinLeft}%; z-index:20;"></div>
                    ${fullCardHtml}
                </div>`;
            }
        });
        html += `</div>`;
    }

    html += `</div>`; // Sulkee mini-corkboardin

    // 4. UUSI TULOSLAPPU (3D LEIKEPÖYTÄ)
    let playersToRender = hData.players || window.allPlayers;
    let sortedPlayers = [...playersToRender].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    
    html += `
    <div class="clipboard-board">
        <div class="clipboard-clip"></div>
        <div class="board-receipt-paper">
            <h2 style="color:var(--ink-blue); font-family: 'Kalam', cursive; font-size:2.2rem; text-align:center; border-bottom:3px solid var(--ink-blue); padding-bottom:5px; margin-bottom:20px;">🏆 TULOS</h2>`;
    
    let renderScoreDots = (strokes, p_par) => {
        if(!strokes) return '-';
        let diff = strokes - p_par;
        let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red');
        if (diff < -1) cClass = 'blue'; 
        return `<span class="receipt-circle ${cClass}">${strokes}</span>`;
    };

    sortedPlayers.forEach((p) => {
        let strokes = !isCurrent && hData.holeResults ? hData.holeResults[p.name] : null;
        let scoreHTML = renderScoreDots(strokes, par);
        let displayScore = (p.name === window.myName) ? `${p.score || 0} P` : `?? P`;
        if (!isCurrent) displayScore = `${p.score || 0} P`;
        
        html += `
        <div class="player-row-paper" style="border-bottom:1px dashed #ccc; padding-bottom:10px; margin-bottom:10px;">
            <span class="paper-name" style="font-size:1.5rem;">${p.name}</span>
            <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-size:1.2rem; color:var(--warning); font-weight:900; background:#111; padding:4px 8px; border-radius:6px; box-shadow:inset 0 0 5px #000;">${displayScore}</span>
                <div class="score-display-paper" style="width:auto !important; min-width:38px; height:38px !important; font-size:1.3rem !important; margin-left:auto; padding:0 5px;">${scoreHTML}</div>
            </div>
        </div>`;
    });
    html += `</div></div>`; // Sulkee clipboardin

    // 5. UUSI PALKKA (NAHKAINEN LOMPAKKO)
    if (!isCurrent && window.myName && hData.pointBreakdowns && hData.pointBreakdowns[window.myName]) {
        let myBreakdown = hData.pointBreakdowns[window.myName];
        let deltaColor = myBreakdown.delta >= 0 ? '#16a34a' : '#dc2626';
        let bgDeltaColor = myBreakdown.delta >= 0 ? '#f0fdf4' : '#fef2f2';
        let sign = myBreakdown.delta > 0 ? '+' : '';
        let rowsHtml = '';
        
        if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
            myBreakdown.summary.split(', ').forEach(part => {
                let kv = part.split(': ');
                if(kv.length === 2) { 
                    rowsHtml += `<tr><td style="padding:6px 0; color:#475569; text-align:left; font-weight:700;">${kv[0]}</td><td style="padding:6px 0; font-weight:900; color:#1e293b; text-align:right;">${kv[1]}</td></tr>`; 
                } else { 
                    rowsHtml += `<tr><td colspan="2" style="padding:6px 0; color:#475569; font-weight:bold; text-align:left;">${part}</td></tr>`; 
                }
            });
        } else {
             rowsHtml += `<tr><td colspan="2" style="padding:15px 0; color:#475569; text-align:center; font-style:italic;">Ei tapahtumia tällä jaksolla.</td></tr>`; 
        }

        html += `
        <div class="leather-wallet">
            <div class="wallet-stitching">
                <div class="wallet-receipt-paper">
                    <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; text-align:center;">
                        <div style="font-weight:900; font-size:1.6rem; color:#1e293b; letter-spacing:1px; text-transform:uppercase;">Palkkakuitti</div>
                        <div style="font-size:0.9rem; color:#555; margin-top:4px;">Väylä ${hIndex} &nbsp;|&nbsp; Hljo: ${window.myName.toUpperCase()}</div>
                    </div>
                    <table style="width:100%; font-size:1.15rem; border-collapse: collapse; margin-bottom: 15px;">
                        ${rowsHtml}
                    </table>
                    <div style="border-top: 2px dashed #000; padding-top: 15px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:1.3rem; font-weight:900; color:#1e293b;">NETTOPALKKA</span>
                        <span style="font-size:1.7rem; font-weight:900; background:${bgDeltaColor}; padding:5px 10px; border:2px solid ${deltaColor}; border-radius:6px; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
                    </div>
                </div>
                <div class="wallet-pocket-front"></div>
            </div>
        </div>`;
    }

    container.innerHTML = html;
};

// ==============================================
// PALKKALASKELMA NÄKYMÄ (Erillinen välilehti)
// ==============================================
window.renderPayslipView = function(hIndex) {
    let container = el('payslip-content');
    if(!container) return;
    
    let lastCompletedIndex = window.currentHoleIndex > 1 ? window.currentHoleIndex - 1 : 1;
    let viewIndex = hIndex === window.currentHoleIndex ? lastCompletedIndex : hIndex;

    if (window.currentHoleIndex === 1 && !window.gameHistory[0]) {
        container.innerHTML = `
        <div style="background:#fff; padding:30px; border-radius:12px; border:3px dashed #94a3b8; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.3); width: 90%; max-width: 400px; margin-top:20px;">
            <div style="font-size:4rem; margin-bottom:15px;">⏳</div>
            <h2 style="color:#334155; font-size:1.5rem; font-weight:900;">Palkkaa ei ole vielä jaettu</h2>
            <p style="color:#64748b; font-weight:bold; font-size:1.1rem; margin-top:10px;">Ensimmäinen palkkakuitti ilmestyy tähän, kun väylä 1 on valmis.</p>
        </div>`;
        return;
    }

    let hData = window.gameHistory[viewIndex - 1];
    if (!hData || !hData.pointBreakdowns || !hData.pointBreakdowns[window.myName]) {
        container.innerHTML = `<p style="color:#fff; font-weight:bold; font-size:1.2rem;">Palkkatietoja ei löytynyt väylältä ${viewIndex}.</p>`;
        return;
    }

    let myBreakdown = hData.pointBreakdowns[window.myName];
    let deltaColor = myBreakdown.delta >= 0 ? '#16a34a' : '#dc2626';
    let bgDeltaColor = myBreakdown.delta >= 0 ? '#f0fdf4' : '#fef2f2';
    let sign = myBreakdown.delta > 0 ? '+' : '';
    let rowsHtml = '';
    
    if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
        myBreakdown.summary.split(', ').forEach(part => {
            let kv = part.split(': ');
            if(kv.length === 2) { 
                rowsHtml += `<tr><td style="padding:10px 0; color:#475569; text-align:left; font-weight:700;">${kv[0]}</td><td style="padding:10px 0; font-weight:900; color:#1e293b; text-align:right;">${kv[1]}</td></tr>`; 
            } else { 
                rowsHtml += `<tr><td colspan="2" style="padding:10px 0; color:#475569; font-weight:bold; text-align:left;">${part}</td></tr>`; 
            }
        });
    }

    container.innerHTML = `
    <div class="leather-wallet">
        <div class="wallet-stitching">
            <div class="wallet-receipt-paper">
                <div style="border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 25px; text-align:center;">
                    <div style="font-weight:900; font-size:2.4rem; color:#1e293b; letter-spacing:2px; text-transform:uppercase;">Palkkakuitti</div>
                    <div style="font-size:1.1rem; color:#555; margin-top:8px; font-weight:bold;">Kausi: Väylä ${viewIndex}</div>
                    <div style="font-size:1.2rem; color:#1e293b; margin-top:12px;">Työntekijä: <b>${window.myName.toUpperCase()}</b></div>
                </div>
                <table style="width:100%; font-size:1.35rem; border-collapse: collapse; margin-bottom: 25px;">
                    ${rowsHtml}
                </table>
                <div style="border-top: 3px dashed #000; padding-top: 20px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:1.5rem; font-weight:900; color:#1e293b;">NETTOPALKKA</span>
                    <span style="font-size:2.2rem; font-weight:900; background:${bgDeltaColor}; padding:8px 15px; border:3px solid ${deltaColor}; border-radius:8px; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
                </div>
            </div>
            <div class="wallet-pocket-front"></div>
        </div>
    </div>`;
};

// ==============================================
// KANSIO (OMAT KORTIT)
// ==============================================
window.renderBinderOnBoard = function() {
    let wrapper = el('board-binder-wrapper');
    if(!wrapper) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    
    if (typeof window.getCardSortWeight === 'function') {
        myCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));
    }

    let cardsHtml = '';
    if(myCards.length === 0) {
        cardsHtml = '<p style="color:#555; font-size:2.5rem; text-align:center; padding:50px; font-weight:bold; grid-column: 1 / -1;">Kansiosi on tyhjä.</p>';
    } else {
        myCards.forEach((cId) => {
            let cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:4.5cqw; color:#111; margin-top:auto; padding-top:2cqw;">🔄 KATSO TASOT</div>`;
            let fullCardHtml = window.generateCardHTML(cDef, isLocked, extraHtml, false);
            let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : cDef.price;
            if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[cDef.id] !== undefined) playCost = window.gameSettings.cardPrices[cDef.id];
            let canPlay = me.score >= playCost && !isLocked;
            let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);

            let upgBtn = '';
            if (cDef.nextId) {
                let upgCost = cDef.level === 1 ? 3 : 5;
                let canUpg = me.score >= upgCost;
                upgBtn = `<button class="btn ${canUpg ? 'btn-warning' : 'btn-secondary'} btn-modern" ${!canUpg ? 'disabled' : ''} style="width:100%; font-size:1.1rem; padding:12px; margin-bottom:10px; color:#000; font-weight:900;" onclick="event.stopPropagation(); window.upgradeCard('${cId}')">🔼 UPGRADE (${upgCost} P)</button>`;
            }

            cardsHtml += `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%; max-width: 280px;">
                <div class="plastic-sleeve btn-modern" style="cursor:pointer; width:100%; margin-bottom:15px; position:relative; z-index: 10;" onclick="window.openCardDetail('${cId}', 'sell')">
                    ${fullCardHtml}
                </div>
                <div style="width:100%; z-index:20;">
                    ${upgBtn}
                    <button class="btn ${canPlay ? 'btn-success' : 'btn-secondary'} btn-modern" ${!canPlay ? 'disabled' : ''} style="width:100%; font-size:1.3rem; padding:15px; font-weight:900; margin-bottom:10px;" onclick="event.stopPropagation(); window.openTargetModal('${cDef.id}')">PELAA (${playCost} P)</button>
                    <button class="btn btn-danger btn-modern" style="width:100%; font-size:1.1rem; padding:12px; font-weight:bold; margin-bottom:10px;" onclick="event.stopPropagation(); window.forceDiscard('${cDef.id}')">♻️ MYY (+${sellReward} P)</button>
                </div>
            </div>`;
        });
    }

    wrapper.innerHTML = `
    <div class="board-binder">
        <div class="binder-spine" style="position: absolute; top: 0; bottom: 0; left: 0; z-index: 30; width: 45px; background: linear-gradient(to right, #111, #222, #111); display:flex; flex-direction:column; justify-content:space-evenly; align-items:center;">
            <div class="binder-ring" style="margin-top: 50px; width:35px; height:25px; border-radius:20px; background:#e2e8f0; box-shadow:2px 4px 8px #000, inset 0 2px 5px #fff; margin-left:25px;"></div>
            <div class="binder-ring" style="width:35px; height:25px; border-radius:20px; background:#e2e8f0; box-shadow:2px 4px 8px #000, inset 0 2px 5px #fff; margin-left:25px;"></div>
            <div class="binder-ring" style="margin-bottom: 50px; width:35px; height:25px; border-radius:20px; background:#e2e8f0; box-shadow:2px 4px 8px #000, inset 0 2px 5px #fff; margin-left:25px;"></div>
        </div>
        <div class="binder-page">
            <h2 style="color:#111; font-size:4rem; margin-bottom:40px; font-family:'Kalam', cursive; border-bottom:4px dashed #ccc; padding-bottom:10px; text-align:center;">OMAT KORTIT</h2>
            <div class="binder-grid">
                ${cardsHtml}
            </div>
        </div>
    </div>`;
};

// ==============================================
// VÄLIPALA-AUTOMAATTI (KAUPPA) 
// ==============================================
window.renderShopOnBoard = function() {
    let wrapper = document.getElementById('board-shop-wrapper');
    if(!wrapper) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myPoints = me ? (me.score || 0) : 0;
    let shopArray = window.activeHole && window.activeHole.shop ? window.activeHole.shop[window.myName] : [];
    let resArray = me && me.reservations ? (Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations)) : [];

    let shelvesHtml = '';
    let actRes = resArray.filter(Boolean);
    let levels = [3, 2, 1]; 

    levels.forEach(lvl => {
        shelvesHtml += `<div class="shop-shelf-grid">`;
        shelvesHtml += `<div style="position:absolute; bottom:15px; left:0; width:100%; height:45px; background:repeating-linear-gradient(90deg, transparent, transparent 30px, #64748b 30px, #64748b 42px); z-index:1; opacity:0.9; filter:drop-shadow(0 15px 15px #000);"></div>`;

        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                let itemPrice = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(item.id) : item.price;
                if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[item.id] !== undefined) itemPrice = window.gameSettings.cardPrices[item.id];

                const canAfford = myPoints >= itemPrice;
                let isResFull = actRes.length >= 2;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:4.5cqw; color:#111; margin-top:auto; padding-top:2cqw;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                
                shelvesHtml += `
                    <div style="position:relative; width:100%; max-width:260px; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div class="btn-modern" style="cursor:pointer; width:100%; position:relative;" onclick="window.openCardDetail('${item.id}', 'shop')">
                            ${fullCardHtml}
                        </div>
                        
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 6px 15px; border-radius: 8px; border: 3px solid #22c55e; font-weight: 900; font-size: 1.5rem; margin-top: 15px; box-shadow: 0 0 15px rgba(34,197,94,0.8); z-index: 15;">${itemPrice} P</div>
                        
                        <div class="shop-controls">
                            <button class="btn btn-success btn-modern" ${!canAfford?'disabled':''} style="padding:12px; font-size:1.1rem; font-weight:900; flex:1;" onclick="window.buyShopItem('${item.id}', ${itemPrice}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-primary btn-modern" style="padding:12px; font-size:1.1rem; font-weight:900; flex:1;" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="position:relative; width:100%; max-width:260px; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="width:100%; aspect-ratio: 2/3; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); border-radius:15px; border:6px dashed #333;">
                            <div style="color:#666; font-weight:900; font-size:2rem; letter-spacing:4px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 6px 15px; border-radius: 8px; border: 3px solid #444; font-weight: 900; font-size: 1.4rem; margin-top: 15px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `
        <div style="background: #111; border-top: 8px solid #222; border-bottom: 8px solid #000; padding: 25px 15px; box-shadow: inset 0 15px 25px #000;">
            <div style="color: #fbbf24; font-family: 'Courier Prime', monospace; font-size: 1.5rem; font-weight: 900; text-align: center; margin-bottom: 25px; letter-spacing: 3px; text-shadow: 0 0 10px rgba(251,191,36,0.5);">NOUTOLOKERO</div>
            <div style="display:flex; justify-content:space-around; width:100%; gap:15px;">`;
            
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            let itemPrice = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(rId) : resItem.price;
            if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[rId] !== undefined) itemPrice = window.gameSettings.cardPrices[rId];

            const canAfford = myPoints >= itemPrice;
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:4.5cqw; color:#111; margin-top:auto; padding-top:2cqw;">🔄 TARKASTELE</div>`;
            let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
            
            reserveHtml += `
                <div style="width:45%; max-width:240px; display:flex; flex-direction:column; align-items:center;">
                    <div class="btn-modern" style="width:100%; cursor:pointer; position:relative;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div style="position:absolute; top:-15px; right:-15px; background:#fbbf24; color:#000; padding:10px 15px; font-weight:900; font-size: 1.2rem; border-radius:10px; z-index:30; border: 4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.8);">🔒 VARATTU</div>
                        ${fullCardHtml}
                    </div>
                    <div style="background: #000; color: #fbbf24; font-family: 'Courier Prime', monospace; padding: 6px 15px; border-radius: 8px; border: 3px solid #fbbf24; font-weight: 900; font-size: 1.4rem; margin-top: 15px; text-align: center; margin-bottom:15px; box-shadow: 0 0 15px rgba(251,191,36,0.6);">${itemPrice} P</div>
                    <div class="shop-controls">
                        <button class="btn btn-success btn-modern" ${!canAfford?'disabled':''} style="padding:12px; font-size:1.1rem; font-weight:900; flex:1;" onclick="window.buyShopItem('${resItem.id}', ${itemPrice}, true)">LUNASTA</button>
                        <button class="btn btn-danger btn-modern" style="padding:12px; font-size:1.1rem; font-weight:900; flex:1;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    wrapper.innerHTML = `
    <div class="shop-machine">
        
        <div style="background: linear-gradient(135deg, #000, #111); padding: 20px; border-radius: 12px; border: 5px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; box-shadow: inset 0 0 30px rgba(239,68,68,0.25);">
            <div style="display:flex; align-items:center; gap: 20px;">
                <div style="font-size:3rem; text-shadow: 0 0 15px rgba(255,255,255,0.6);">🥨</div>
                <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:2.5rem; letter-spacing: 3px; text-shadow: 0 0 15px #ef4444;">SNACKS</div>
            </div>
            
            <div style="background: #000; padding: 10px 20px; border-radius: 8px; border: 3px solid #222; box-shadow: inset 0 0 15px #000, 0 0 10px rgba(34,197,94,0.3); display: flex; flex-direction: column; align-items: center;">
                <span style="color: #444; font-size: 0.75rem; font-family: 'Courier Prime', monospace; font-weight: 900; letter-spacing: 2px; margin-bottom: 5px;">CREDIT</span>
                <span style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:2.5rem; font-weight:900; text-shadow: 0 0 15px #22c55e, 0 0 5px #22c55e;">${myPoints} P</span>
            </div>
        </div>

        <div class="shop-glass">
            ${shelvesHtml}
        </div>

        ${reserveHtml}

        <div style="height: 160px; padding: 30px 0; display:flex; gap:25px;">
            <div style="width: 160px; background: #000; border-radius: 10px; border: 5px solid #1e293b; padding: 15px; display:flex; flex-direction:column; align-items:center; box-shadow: inset 0 0 15px rgba(0,0,0,0.9);">
                <div style="width: 100%; height: 35px; background: #0f172a; border: 2px solid #334155; margin-bottom: 15px; color:#22c55e; font-family:'Courier Prime', monospace; font-weight:bold; font-size:1.2rem; text-align:right; padding-right:8px; line-height:30px; box-shadow: inset 0 0 10px #000;">12.00</div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width:100%;">
                    ${Array(9).fill('<div style="background: #334155; height:20px; border-radius:4px; border-bottom:4px solid #0f172a;"></div>').join('')}
                </div>
            </div>
            
            <div style="flex: 1; background: #000; border-radius: 10px; border: 8px solid #111; position:relative; box-shadow: inset 0 30px 40px #000;">
                <div style="position:absolute; top:0; left:0; right:0; height: 90px; background: #1a1a1a; border-bottom: 4px solid #000; display:flex; justify-content:center; align-items:center; transform-origin: top; transform: rotateX(-15deg);">
                    <span style="color:#444; font-weight:900; font-size:2.5rem; letter-spacing:10px; text-shadow:-1px -1px 0 #000;">PUSH</span>
                </div>
            </div>
        </div>

    </div>
    `;
};

window.renderReceiptOnBoard = function() {
    let wrapper = el('board-receipt-wrapper');
    if(!wrapper) return;
    if(!window.allPlayers || window.allPlayers.length === 0 || !window.currentCourse) { wrapper.innerHTML = ''; return; }

    let generateTotals = () => { 
        let html = ``; 
        [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)).forEach(p => { 
            let scoreStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            html += `<div style="display:flex; justify-content:space-between; font-size:1.8rem; font-weight:900; margin-bottom:8px;"><span>${p.name.substring(0, 12)}</span><span>${scoreStr}</span></div>`; 
        }); 
        return html; 
    };

    let html = `
    <div class="clipboard-board">
        <div class="clipboard-clip"></div>
        <div class="board-receipt-paper">
            <h2 style="font-size:2.8rem; font-weight:900; margin-bottom:30px; text-align:center; border-bottom:4px solid #111; padding-bottom:10px; text-transform:uppercase;">Tulosseuranta</h2>`;
    
    for(let i=0; i<window.gameHistory.length; i++) { 
        let h = window.gameHistory[i]; 
        let par = window.currentCourse.pars ? (window.currentCourse.pars[i] || 3) : 3; 
        html += `<div style="font-size:1.4rem; font-weight:bold; border-bottom:1px solid #ddd; margin-top:15px; padding-bottom:5px;">Väylä ${i+1} <span style="color:#666; font-weight:normal;">(PAR ${par})</span></div>`; 
        if(h.holeResults) { 
            for(let pName in h.holeResults) { 
                let strokes = h.holeResults[pName]; 
                let diff = strokes - par;
                let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red'); 
                if (diff < -1) cClass = 'blue'; 
                html += `<div style="display:flex; justify-content:space-between; font-size:1.3rem; padding: 8px 0; align-items:center;"><span>${pName.substring(0, 12)}</span><span class="receipt-circle ${cClass}" style="width:34px; height:34px; font-size:1.3rem;">${strokes}</span></div>`; 
            } 
        } 
    }
    
    html += `<div style="margin-top:40px; border-top: 4px dashed #111; padding-top:20px; background:#f8fafc; padding:20px; border-radius:8px; border:2px solid #111;"><h3 style="text-align:center; font-size:1.8rem; margin-bottom:20px;">KOKONAISTILANNE</h3>${generateTotals()}</div></div></div>`;
    wrapper.innerHTML = html;
};

// ==============================================
// PÄÄ-PÄIVITYS (RENDER BOARD)
// ==============================================
window.renderBoard = function() {
    if (!window.currentCourse) return;
    
    if (!window.viewedHoleIndex || window.viewedHoleIndex > window.currentHoleIndex) {
        window.viewedHoleIndex = window.currentHoleIndex;
    }

    window.applyViewScales();
    window.updateHoleNav();
    window.renderBinderOnBoard();
    window.renderShopOnBoard();
    window.renderReceiptOnBoard();

    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    if(me) {
        let totalDg = me.dgScore > 0 ? '+' + me.dgScore : (me.dgScore === 0 ? 'E' : me.dgScore);
        let navScoreSummary = el('navScoreSummary');
        if(navScoreSummary) navScoreSummary.innerText = `TULOS: ${totalDg}`;
    }
};

// ==============================================
// GM HALLINTA: Pisteet ja Tulokset
// ==============================================
window.updateAdminPlayerList = function() {
    let container = el('adminPlayerList'); if(!container) return; 
    let html = '';
    (window.allPlayers || []).forEach(p => {
        if(!p) return;
        let dg = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
        html += `
        <div class="apple-setting-row" style="flex-direction:column; align-items:stretch; gap:15px; padding: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="font-weight:900; color:#1e293b; font-size:1.5rem;">${p.name}</div>
                <div style="text-align:right;">
                    <div style="font-size:1.6rem; font-weight:900; color:var(--warning); background:#1e293b; padding:4px 15px; border-radius:12px; margin-bottom:5px;">${p.score || 0} P</div>
                    <div style="font-size:1.2rem; font-weight:900; color:#fff; background:#475569; padding:2px 10px; border-radius:8px;">Tulos: ${dg}</div>
                </div>
            </div>
            <div style="display:flex; gap:10px; width:100%;">
                <button class="btn btn-warning btn-modern" style="flex:1; padding:10px; font-size:1.1rem; font-weight:900; color:#000; margin:0;" onclick="window.gmAdjustScore('${p.name}', 1)">+1 P</button>
                <button class="btn btn-warning btn-modern" style="flex:1; padding:10px; font-size:1.1rem; font-weight:900; color:#000; margin:0;" onclick="window.gmAdjustScore('${p.name}', -1)">-1 P</button>
            </div>
            <div style="display:flex; gap:10px; width:100%; margin-top:5px;">
                <button class="btn btn-secondary btn-modern" style="flex:1; padding:10px; font-size:1rem; font-weight:bold; margin:0;" onclick="window.gmAdjustDgScore('${p.name}', 1)">+1 Heitto</button>
                <button class="btn btn-secondary btn-modern" style="flex:1; padding:10px; font-size:1rem; font-weight:bold; margin:0;" onclick="window.gmAdjustDgScore('${p.name}', -1)">-1 Heitto</button>
            </div>
            <button class="btn btn-danger btn-modern" style="width:100%; padding:10px; font-size:1rem; font-weight:bold; margin-top:5px;" onclick="window.gmKickPlayer('${p.name}')">POTKI PELAAJA</button>
        </div>`;
    });
    container.innerHTML = html;
};

window.gmAdjustDgScore = function(pName, amount) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    let p = nextPlayers.find(x => x && x.name === pName);
    if(p) {
        p.dgScore = (parseInt(p.dgScore) || 0) + amount;
        window.update(window.ref(window.db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
        window.logScore("GM", amount, `Muokkasi pelaajan ${pName} väylätulosta (+/-)`);
    }
};

window.openCardPricingModal = function() {
    let container = el('cardPricingList');
    if (!container) return;
    
    let html = '';
    window.allCards.forEach(c => {
        let currentPrice = c.price;
        if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[c.id] !== undefined) {
            currentPrice = window.gameSettings.cardPrices[c.id];
        }
        
        let typeColor = c.type === 'buff' ? '#16a34a' : '#dc2626';
        
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px; border-radius:8px; border:2px solid #cbd5e1;">
            <div style="font-weight:900; font-size:1rem; color:#1e293b; border-left: 5px solid ${typeColor}; padding-left: 10px;">${c.n}</div>
            <div style="display:flex; align-items:center; gap: 8px;">
                <span style="font-weight:bold; color:#64748b;">Hinta (P)</span>
                <input type="number" id="price_${c.id}" value="${currentPrice}" style="width:70px; padding:8px; border-radius:8px; border:2px solid #94a3b8; text-align:center; font-weight:900; font-size:1.1rem;">
            </div>
        </div>`;
    });
    container.innerHTML = html;
    window.showModalSafe('cardPricingModal');
};

window.saveCardPrices = function() {
    let prices = window.gameSettings && window.gameSettings.cardPrices ? {...window.gameSettings.cardPrices} : {};
    window.allCards.forEach(c => {
        let input = el(`price_${c.id}`);
        if (input) {
            let val = parseInt(input.value);
            if (!isNaN(val)) prices[c.id] = val;
        }
    });
    
    let nextSettings = { ...window.gameSettings, cardPrices: prices };
    window.update(window.ref(window.db), { 'gameState/settings': nextSettings });
    
    let modal = el('cardPricingModal');
    if(modal) modal.style.display = 'none';
    if(window.showAppleToast) window.showAppleToast("Hinnat Tallennettu", "✅");
    
    if (window.renderShopOnBoard) window.renderShopOnBoard();
};

// ==============================================
// KARUSELLI (Kortin tarkastelu / pelaaminen)
// ==============================================
window.isFlipping = false;
window.flippedCards = new Set();

window.initNativeCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    
    container.addEventListener('scroll', () => { 
        requestAnimationFrame(() => {
            const cards = Array.from(container.querySelectorAll('.carousel-card-wrapper'));
            const scrollLeft = container.scrollLeft; 
            const containerWidth = container.clientWidth || window.innerWidth;
            const centerOffset = containerWidth / 2; 
            const cardWidth = 350; 
            const paddingLeft = centerOffset - (cardWidth / 2); 
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const diff = ((paddingLeft + (i * cardWidth) + (cardWidth / 2) - scrollLeft) - centerOffset) / 175; 
                card.style.transform = `translate3d(${diff * -40}px, ${Math.abs(diff) * 20}px, ${Math.abs(diff) * -150}px) rotateZ(${diff * 5}deg) scale(${Math.max(0.85, 1 - Math.abs(diff) * 0.15)})`;
                card.style.zIndex = 100 - Math.floor(Math.abs(diff)*10);
                
                if(Math.abs(diff) < 0.5 && window.carouselCurrentIndex !== i) {
                    window.carouselCurrentIndex = i;
                    if(window.carouselCurrentMode === 'sell' || window.carouselCurrentMode === 'shop' || window.carouselCurrentMode === 'shop_res') {
                        window.renderCarouselActionButtons();
                    }
                }
            }
        });
    }, {passive: true});
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
    
    let html = '';
    window.carouselCards.forEach((cId, i) => {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(!cDef) return;
        
        let flippedClass = window.flippedCards.has(cId) ? 'flipped' : '';
        let familyCards = window.allCards.filter(c => c.family === cDef.family).sort((a,b) => a.level - b.level);
        let levelsHtml = '';
        
        familyCards.forEach(fc => {
            let isActive = fc.level === cDef.level;
            levelsHtml += `
                <li style="${isActive ? 'color:var(--warning); font-weight:bold; border-left:1cqw solid var(--warning); padding-left:2cqw;' : 'color:#ccc; opacity:0.8;'}">
                    <span class="lvl-tag" style="display:block; font-size:4cqw;">TASO ${fc.level} ${isActive ? '(NYKYINEN)' : ''}</span>
                    ${fc.d}
                </li>`;
        });
        
        let backHtml = `
            <div style="background:#1e293b; border: 1cqw solid #475569; width:100%; height:100%; border-radius:4cqw; display:flex; flex-direction:column; padding:4cqw; box-sizing:border-box; color:#fff;">
                <div style="font-size:6cqw; font-weight:900; color:var(--warning); margin-bottom:4cqw; text-transform:uppercase; text-align:center; border-bottom:0.5cqw dashed #475569; padding-bottom:2cqw;">${cDef.n.split(' (')[0]}</div>
                <ul class="card-levels-list" style="flex:1; overflow-y:auto; list-style-type:none; margin:0; padding:0; display:flex; flex-direction:column; gap:3cqw; font-size: 4.5cqw;">
                    ${levelsHtml}
                </ul>
            </div>`;
        
        let extraHtml = `<div style="text-align:center; font-weight:900; color:#111; margin-top:auto; padding-bottom:3cqw; font-size:4cqw;">🔄 KÄÄNNÄ (KATSO KAIKKI TASOT)</div>`;
        let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml, true);

        html += `
            <div class="carousel-card-wrapper" style="transform:none; position:relative; margin:0 auto;" data-id="${cId}" onclick="window.flipCard(${i})">
                <div class="card-3d-inner ${flippedClass}" id="card3d-inner-${i}">
                    <div class="card-face card-front" style="background:transparent; box-shadow:none; border:none; padding:0;">
                        ${fullCardHtml}
                    </div>
                    <div class="card-face card-back" style="pointer-events: auto;">
                        ${backHtml}
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
};

window.renderCarouselActionButtons = function() {
    let mode = window.carouselCurrentMode;
    let cId = window.carouselCards[window.carouselCurrentIndex];
    if(!cId) return;
    
    const me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let btnHtml = '';
    
    if (mode === 'sell') {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(cDef) {
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cDef.id);
            let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : 2;
            let canPlay = me.score >= playCost && !isLocked;
            let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
            
            if (cDef.nextId && cDef.upgradeDesc) {
                let upgCost = cDef.level === 1 ? 3 : 5;
                let canUpg = me.score >= upgCost;
                btnHtml += `<button class="btn ${canUpg ? 'btn-warning' : 'btn-secondary'} btn-modern" ${!canUpg ? 'disabled' : ''} style="width:100%; font-size:1.1rem; padding:15px; margin-bottom:10px; color:#000; font-weight:900;" onclick="event.stopPropagation(); window.upgradeCard('${cId}')">🔼 UPGRADE TASOLLE ${cDef.level + 1} (${upgCost} P)</button>`;
            }
            btnHtml += `<button class="btn ${canPlay ? 'btn-success' : 'btn-secondary'} btn-modern" ${!canPlay ? 'disabled' : ''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-bottom:10px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cDef.id}')">PELAA KORTTI (${playCost} P)</button>`;
            btnHtml += `<button class="btn btn-danger btn-modern" style="width:100%; font-size:1.1rem; padding:15px; font-weight:bold; margin-bottom:10px;" onclick="window.forceDiscard('${cDef.id}')">♻️ MYY KORTTI (+${sellReward} P)</button>`;
        }
    } else if (mode === 'shop' || mode === 'shop_res') {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(cDef) {
            let itemPrice = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : cDef.price;
            let canAfford = me.score >= itemPrice; 
            let isRes = mode === 'shop_res';
            btnHtml += `<button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'} btn-modern" ${!canAfford ? 'disabled' : ''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-bottom:10px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cDef.id}', ${itemPrice}, ${isRes})">OSTA AUTOMAATISTA (${itemPrice} P)</button>`;
        }
    }
    
    let container = el('cardDetailActionArea');
    if(container) container.innerHTML = btnHtml;
};

// ==============================================
// SCORE SYÖTTÖ MODAALI JA KÄSIRAJA VAROITUS
// ==============================================
window.showHandLimitModal = function(cards) {
    if(!el('handLimitModal')) return;
    let limit = window.gameSettings ? (window.gameSettings.handLimit || 6) : 6;
    el('handLimitCount').innerText = `${cards.length} / ${limit}`;
    let html = '';
    
    if (typeof window.getCardSortWeight === 'function') {
        cards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));
    }
    
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
            <button class="btn btn-danger btn-modern" style="width:auto; padding:10px 15px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}')">♻️ MYY (+${sellReward} P)</button>
        </div>`;
    });
    
    let container = el('handLimitCards');
    if(container) container.innerHTML = html; 
    window.showModalSafe('handLimitModal');
};

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
    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[window.currentHoleIndex - 1] || 3) : 3;
    el('scoreModalHoleNum').innerText = window.currentHoleIndex; 
    el('scoreModalPar').innerText = par; 
    
    let html = ''; 
    let taskCheckboxes = '';
    
    (window.allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        let safeId = "player_" + i; 
        taskCheckboxes += `<label class="task-paper-label"><input type="checkbox" class="task-paper-checkbox" data-name="${p.name}" /> ${p.name}</label>`;
        html += `
        <div class="score-row-paper">
            <span class="score-name-paper">${p.name}</span>
            <div class="score-controls-paper">
                <button class="btn-score-paper btn-modern" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                <div id="scoreDisplay_${safeId}" class="score-display-paper">${par}</div>
                <button class="btn-score-paper btn-modern" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
                <input type="hidden" class="score-input-data" data-name="${p.name}" id="scoreInput_${safeId}" value="${par}" />
            </div>
        </div>`;
    });
    
    let container1 = el('scoreInputsContainer'); 
    let container2 = el('taskWinnerContainer'); 
    if(container1) container1.innerHTML = html;
    if(container2) container2.innerHTML = taskCheckboxes;
    window.showModalSafe('scoreModal');
};
