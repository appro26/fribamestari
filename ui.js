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
// SKAALAUS JA NÄKYMIEN HALLINTA
// ==============================================
window.applyViewScales = function() {
    let w = window.innerWidth;
    let h = window.innerHeight;
    
    let shopWrapper = el('shop-scale-wrapper');
    if(shopWrapper) {
        let shopScale = Math.min(1.0, w / 750); 
        let maxHScale = (h - 130) / 1150; 
        shopScale = Math.min(shopScale, maxHScale);
        if(shopScale < 0.3) shopScale = 0.3;
        shopWrapper.style.transform = `scale(${shopScale})`;
        // Asetetaan kääreelle kiinteä pituus, jotta skrollaus ei jatku loputtomiin!
        shopWrapper.style.height = (1150 * shopScale) + 'px';
    }
    
    let binderWrapper = el('binder-scale-wrapper');
    if(binderWrapper) {
        let binderScale = Math.min(1.0, w / 600);
        binderWrapper.style.transform = `scale(${binderScale})`;
        binderWrapper.style.height = (1100 * binderScale) + 'px';
    }
    
    let receiptWrapper = el('receipt-scale-wrapper');
    if(receiptWrapper) receiptWrapper.style.transform = `scale(${Math.min(1.0, w / 520)})`;
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
            <div style="background:var(--danger); color:#fff; padding:15px; border-radius:12px; font-weight:900; font-size:1.4rem; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.6); margin-bottom:10px;">
                SUORITTAJA:<br><span style="font-size:2rem; font-family:'Kalam', cursive;">${target}</span>
                <div style="font-size:1rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div>
            </div>`;
    }
    
    el('cardDetailActionArea').innerHTML = targetStr;
    window.showModalSafe('cardDetailModal');
    setTimeout(() => { if(window.initNativeCarousel) window.initNativeCarousel(); }, 100);
};

window.showAppleToast = function(msg, icon = '✨') { 
    const toast = el('appleToast'); 
    if(!toast) return; 
    
    el('appleToastIcon').innerText = icon; 
    el('appleToastText').innerText = msg; 
    
    let detailsEl = el('appleToastDetails');
    if (detailsEl && detailsEl.innerText) {
        let rawText = detailsEl.innerText;
        if (rawText.includes(':') && !rawText.includes('Tarkista')) {
            // Tehdään tuloserittelystä tyylikäs monirivinen lista
            let formattedHtml = rawText.split(', ').map(part => {
                let kv = part.split(': ');
                if(kv.length === 2) {
                    let valColor = kv[1].includes('-') ? '#fca5a5' : '#86efac';
                    return `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.1);"><span style="color:#cbd5e1;">${kv[0]}</span><span style="color:${valColor}; font-weight:900;">${kv[1]}</span></div>`;
                }
                return `<div style="padding:5px 0;">${part}</div>`;
            }).join('');
            detailsEl.innerHTML = formattedHtml;
        }
        detailsEl.style.display = 'block';
    } else if (detailsEl) {
        detailsEl.style.display = 'none';
    }

    toast.classList.add('show'); 
    if (navigator.vibrate) navigator.vibrate(150);
    setTimeout(() => { toast.classList.remove('show'); }, 4000); 
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
// KOHDE-MODAALIN AVAUS (KORTIN PELAAMINEN)
// ==============================================
window.openTargetModal = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return;
    window.pendingCardPlay = { id: cId, def: cDef, cost: typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cId) : cDef.price };
    el('targetCardName').innerText = cDef.n;
    
    let html = '';
    if (cDef.type === 'buff') {
        html += `<button class="btn btn-success" style="width:100%; padding:15px; margin-bottom:10px; font-size:1.2rem; font-weight:bold;" onclick="window.executeCardPlay('${window.myName}')">ITSEENI</button>`;
    } else {
        html += `<button class="btn btn-danger" style="width:100%; padding:15px; margin-bottom:10px; font-size:1.2rem; font-weight:bold;" onclick="window.executeCardPlay('KAIKKI VASTUSTAJAT')">KAIKKI VASTUSTAJAT</button>`;
        (window.allPlayers || []).forEach(p => {
            if (p.name !== window.myName) {
                html += `<button class="btn btn-warning" style="width:100%; padding:15px; margin-bottom:10px; font-size:1.2rem; font-weight:bold; color:#000;" onclick="window.executeCardPlay('${p.name}')">${p.name}</button>`;
            }
        });
    }
    el('targetPlayerList').innerHTML = html;
    window.showModalSafe('targetModal');
};

// ==============================================
// KORTIN GENEROINTI
// ==============================================
window.generateCardHTML = function(cDef, isLocked = false, extraBottomHtml = '', isCarousel = false) {
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
    let dimensions = isCarousel ? 'width: 100%; height: 100%; box-sizing: border-box; display:flex; flex-direction:column;' : '';
    let titleSize = isCarousel ? 'font-size: 2.2rem;' : '';
    let descSize = isCarousel ? 'font-size: 1.5rem; flex: 1;' : '';
    
    return `
    <div class="physical-card ${typeClass}" style="${lockedStyle} ${dimensions}">
        <div class="card-header ${typeName}">
            <span>${typeIcon} ${cDef.type === 'buff' ? 'HELPOTUS' : 'SABOTAASI'}</span><span>TASO ${cDef.level || 1}</span>
        </div>
        <div class="card-body ${typeName}">
            <div class="play-cost-badge">MAKSU: ${playCost} P</div>
            <h3 class="card-title" style="${titleSize}">${safeCardName}</h3>
            <p class="card-desc" style="${descSize}">${cDef.d}</p>
            ${extraBottomHtml}
        </div>
    </div>`;
};

// ==============================================
// VÄYLÄN (KOTI) RENDERÖINTI & NAVIGOINTI
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
    let rot3 = (window.pseudoRandom(hIndex * 3.3) * 6 - 3).toFixed(1);

    let html = `<div class="mini-corkboard">`;

    // SOLVAUS / ELÄIN
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
        <svg viewBox="0 0 100 100" style="width: 80px; height: 80px; fill: none; stroke: #1e293b; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; margin-top: -10px;">
            <path d="${svgPath}"></path>
        </svg>
    </div>`;

    // 1. INFO KORTTI
    html += `<div class="index-card" style="transform: rotate(${rot1}deg); position: relative; margin-bottom: 30px; width: 90%; max-width: 320px;">`;
    html += `<div class="banner-subtitle">${window.currentCourse ? window.currentCourse.name : ''}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>`;
    
    if (isCurrent && hData.penColor) {
        html += `<div class="pen-container" onclick="event.stopPropagation(); window.openScoreModal();"><div class="pen-string"></div><div class="pen-body" style="background: linear-gradient(to right, ${hData.penColor.c1}, ${hData.penColor.c2}, ${hData.penColor.c1});"><span class="pen-text">MERKKAA</span></div></div>`;
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
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg); margin-bottom: 30px; width: 90%; max-width: 340px;" onclick="event.stopPropagation(); window.showZoomModal(this.outerHTML)">
            <div style="font-weight:900; font-size:0.95rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.8rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: ${pSize}; line-height: ${pLh}; font-weight:800; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    // 3. PELATUT KORTIT
    let playedCards = [];
    if (hData.playedCards) { playedCards = Object.values(hData.playedCards).filter(Boolean); }
    
    if(playedCards.length > 0) {
        let myCards = []; let otherCards = [];
        playedCards.forEach(pc => { if (pc.target === window.myName || pc.target === 'KAIKKI VASTUSTAJAT') { myCards.push(pc); } else { otherCards.push(pc); } });

        if (myCards.length > 0) {
            html += `<div style="width: 100%; max-width:400px; margin-bottom: 20px; display:flex; flex-wrap:wrap; justify-content:center; gap:15px; padding: 10px;">`;
            myCards.forEach((pc, idx) => {
                let cRot = (window.pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(window.pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
                
                let extraHtml = `<div style="background:rgba(0,0,0,0.9); color:#fff; padding:10px; border-radius:8px; font-size:1rem; text-align:center; font-weight:bold; margin-top:auto; width:100%; box-sizing:border-box;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}<br><span style="font-weight:normal; color:#ccc;">(Käyttäjä: ${pc.by})</span></div>`;
                let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml);

                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg); cursor:pointer;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div class="pushpin" style="left: ${pinLeft}%; z-index:20;"></div>
                    <div style="transform: scale(0.60); transform-origin: top center; margin-bottom: -160px;">
                        ${fullCardHtml}
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        if (otherCards.length > 0) {
            let pRot = (window.pseudoRandom(hIndex * 1.5) * 4 - 2).toFixed(1);
            html += `
                <div style="width: 90%; max-width:340px; margin-bottom: 30px; position:relative; background:var(--paper-bg); padding:15px; box-shadow: 2px 4px 10px rgba(0,0,0,0.2); border-radius:2px; transform: rotate(${pRot}deg);">
                    <div class="tape tape-top" style="--rot:-2deg;"></div>
                    <h2 style="color:var(--text-main); font-size:1.1rem; margin-bottom:10px; border-bottom:2px dashed #ccc; padding-bottom:5px; font-family:'Kalam', cursive; text-align:center;">MUIDEN TAPAHTUMAT</h2>
                    <div style="display:flex; flex-direction:column; gap:8px;">`;
            
            otherCards.forEach((pc) => {
                let typeIcon = pc.type === 'buff' ? '🛡️' : '💥';
                let typeColor = pc.type === 'buff' ? 'var(--info)' : 'var(--danger)';
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                
                html += `
                <div style="background:rgba(0,0,0,0.05); padding:10px; border-radius:6px; font-size:0.95rem; border-left: 5px solid ${typeColor}; cursor:pointer;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <b style="font-size:1.1rem;">${typeIcon} ${pc.cardName}</b><br>
                    <span style="color:#555;">Käyttäjä: <b>${pc.by}</b> ➡️ Kohde: <b style="color:${typeColor};">${pc.target}</b></span>
                </div>`;
            });
            html += `</div></div>`;
        }
    }

    // 4. TULOSLAPPU
    let playersToRender = hData.players || window.allPlayers;
    let sortedPlayers = [...playersToRender].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    
    html += `
    <div class="score-spiral-note" style="transform: rotate(${rot3}deg); margin-bottom: 30px; width: 95%; max-width: 360px;">
        <div class="pin pin-blue" style="top: 15px; right: 20px;"></div>
        <div class="pin pin-red" style="bottom: 25px; right: 15px;"></div>
        <h2 style="color:var(--ink-blue); font-family: 'Kalam', cursive; font-size:1.8rem; text-decoration:underline;">🏆 Tulos</h2>`;
    
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
        <div class="player-row-paper">
            <span class="paper-name" style="font-size:1.5rem;">${p.name}</span>
            <div style="display:flex; align-items:center; gap: 10px;">
                <span style="font-size:1.2rem; color:var(--warning); font-weight:900;">${displayScore}</span>
                <div class="score-display-paper" style="width:auto !important; min-width:38px; height:38px !important; font-size:1.3rem !important; margin-left:auto; padding:0 5px;">${scoreHTML}</div>
            </div>
        </div>`;
    });
    html += `</div>`;

    // UUSITTU Palkkalaskelma väylän pohjalla
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
                    rowsHtml += `<tr><td style="padding:6px 0; color:#475569;">${kv[0]}</td><td style="padding:6px 0; font-weight:900; color:#1e293b; text-align:right;">${kv[1]}</td></tr>`; 
                } else { 
                    rowsHtml += `<tr><td colspan="2" style="padding:6px 0; color:#475569; font-weight:bold;">${part}</td></tr>`; 
                }
            });
        } else { 
            rowsHtml += `<tr><td colspan="2" style="padding:15px 0; color:#475569; text-align:center; font-style:italic;">Ei tapahtumia tällä jaksolla.</td></tr>`; 
        }

        html += `
        <div class="payslip-paper" style="background:#fff; border:1px solid #cbd5e1; border-radius:2px; transform: rotate(-0.5deg); margin-bottom: 20px; width: 95%; max-width: 360px; padding: 25px; box-shadow: 5px 15px 30px rgba(0,0,0,0.3); z-index:30; position:relative; font-family:'Courier Prime', monospace; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; text-align:center;">
                <div style="font-weight:900; font-size:1.6rem; color:#1e293b; letter-spacing:1px; text-transform:uppercase;">Palkkakuitti</div>
                <div style="font-size:0.9rem; color:#555; margin-top:4px;">Kausi: Väylä ${hIndex} &nbsp;|&nbsp; Hljo: ${window.myName.substring(0,6).toUpperCase()}</div>
            </div>
            <table style="width:100%; font-size:1.1rem; border-collapse: collapse; margin-bottom: 15px;">
                ${rowsHtml}
            </table>
            <div style="border-top: 2px dashed #000; padding-top: 15px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:1.3rem; font-weight:900; color:#1e293b;">YHTEENSÄ</span>
                <span style="font-size:1.6rem; font-weight:900; background:${bgDeltaColor}; padding:5px 10px; border:2px solid ${deltaColor}; border-radius:6px; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
            </div>
        </div>`;
    }

    html += `</div>`; 
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
                rowsHtml += `<tr><td style="padding:10px 0; color:#475569;">${kv[0]}</td><td style="padding:10px 0; font-weight:900; color:#1e293b; text-align:right;">${kv[1]}</td></tr>`; 
            } else { 
                rowsHtml += `<tr><td colspan="2" style="padding:10px 0; color:#475569; font-weight:bold;">${part}</td></tr>`; 
            }
        });
    } else { 
        rowsHtml += `<tr><td colspan="2" style="padding:20px 0; color:#475569; text-align:center; font-style:italic;">Ei tapahtumia tällä jaksolla.</td></tr>`; 
    }

    container.innerHTML = `
    <div class="payslip-paper" style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; transform: rotate(-1deg); margin-top: 30px; margin-bottom: 50px; width: 95%; max-width: 450px; padding: 35px; box-shadow: 10px 25px 50px rgba(0,0,0,0.5); z-index:30; position:relative; font-family:'Courier Prime', monospace; box-sizing: border-box;">
        <div style="border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 25px; text-align:center;">
            <div style="font-weight:900; font-size:2.4rem; color:#1e293b; letter-spacing:2px; text-transform:uppercase;">Palkkakuitti</div>
            <div style="font-size:1.1rem; color:#555; margin-top:8px; font-weight:bold;">Kausi: Väylä ${viewIndex}</div>
            <div style="font-size:1.1rem; color:#1e293b; margin-top:10px;">Työntekijä: <b>${window.myName.toUpperCase()}</b></div>
        </div>
        
        <table style="width:100%; font-size:1.3rem; border-collapse: collapse; margin-bottom: 25px;">
            ${rowsHtml}
        </table>
        
        <div style="border-top: 3px dashed #000; padding-top: 20px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:1.6rem; font-weight:900; color:#1e293b;">YHTEENSÄ</span>
            <span style="font-size:2.2rem; font-weight:900; background:${bgDeltaColor}; padding:8px 15px; border:3px solid ${deltaColor}; border-radius:8px; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
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
        cardsHtml = '<p style="color:#555; font-size:1.8rem; text-align:center; padding:50px; font-weight:bold; grid-column: 1 / -1;">Kansiosi on tyhjä.</p>';
    } else {
        myCards.forEach((cId) => {
            let cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1.2rem; color:#111; margin-top:auto; padding-top:10px;">🔄 KATSO TASOT / PELAA</div>`;
            let fullCardHtml = window.generateCardHTML(cDef, isLocked, extraHtml, false);

            cardsHtml += `
            <div class="plastic-sleeve" style="cursor:pointer; transform: scale(0.75); transform-origin: top center; margin-bottom:-100px; z-index: 10;" onclick="window.openCardDetail('${cId}', 'sell')">
                ${fullCardHtml}
            </div>`;
        });
    }

    wrapper.innerHTML = `
    <div class="board-binder" style="width: 600px; min-height: 800px; padding-top: 20px; padding-bottom: 20px; background: radial-gradient(circle at center, #3e2723 0%, #211412 100%); margin: 0 auto;">
        <div class="binder-spine" style="position: absolute; top: 0; bottom: 0; left: 0; z-index: 30; width: 45px; background: linear-gradient(to right, #111, #222, #111); display:flex; flex-direction:column; justify-content:space-evenly; align-items:center;">
            <div class="binder-ring" style="margin-top: 50px; width:35px; height:25px; border-radius:20px; background:#e2e8f0; box-shadow:2px 4px 8px #000, inset 0 2px 5px #fff; margin-left:25px;"></div>
            <div class="binder-ring" style="width:35px; height:25px; border-radius:20px; background:#e2e8f0; box-shadow:2px 4px 8px #000, inset 0 2px 5px #fff; margin-left:25px;"></div>
            <div class="binder-ring" style="margin-bottom: 50px; width:35px; height:25px; border-radius:20px; background:#e2e8f0; box-shadow:2px 4px 8px #000, inset 0 2px 5px #fff; margin-left:25px;"></div>
        </div>
        <div class="binder-page" style="margin-left: 45px; margin-right: 20px; padding: 30px; border-radius: 4px 16px 16px 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1), 5px 5px 15px rgba(0,0,0,0.6);">
            <h2 style="color:#111; font-size:2.8rem; margin-bottom:20px; font-family:'Kalam', cursive; border-bottom:4px dashed #ccc; padding-bottom:10px; text-align:center;">OMAT KORTIT</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; justify-items: center; gap: 15px; width: 100%;">
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
        shelvesHtml += `<div style="display:flex; justify-content:space-around; align-items:flex-end; padding-bottom:30px; border-bottom: 20px solid #0f172a; position:relative; height: 320px; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8)); box-shadow: inset 0 -15px 30px rgba(0,0,0,0.9);">`;
        
        shelvesHtml += `<div style="position:absolute; bottom:65px; left:0; width:100%; height:50px; background:repeating-linear-gradient(90deg, transparent, transparent 25px, #94a3b8 25px, #94a3b8 35px); z-index:1; opacity:0.9; filter:drop-shadow(0 10px 10px #000);"></div>`;

        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1.1rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                
                shelvesHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <!-- Skaalataan isot kortit sopiviksi hyllylle -->
                        <div style="transform: scale(0.55); transform-origin: bottom center; cursor:pointer; width:280px; margin-bottom:-90px;" onclick="window.openCardDetail('${item.id}', 'shop')">
                            ${fullCardHtml}
                        </div>
                        
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 6px 15px; border-radius: 6px; border: 3px solid #22c55e; font-weight: 900; font-size: 1.5rem; margin-top: 10px; box-shadow: 0 0 15px rgba(34,197,94,0.8); z-index: 15;">${item.price} P</div>
                        
                        <!-- NAPPI Z-INDEX LUKITTU ETTEI JÄÄ PIILOON -->
                        <div style="display:flex; gap:10px; margin-top:15px; width:100%; justify-content:center; position: relative; z-index: 1000; pointer-events: auto;">
                            <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:12px; font-size:1.1rem; font-weight:900; margin:0; box-shadow: 0 5px 10px rgba(0,0,0,0.8);" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-primary" style="padding:12px; font-size:1.1rem; font-weight:900; margin:0; box-shadow: 0 5px 10px rgba(0,0,0,0.8);" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="width:280px; height:420px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); border-radius:20px; border:8px dashed #333; transform: scale(0.55); transform-origin: bottom center; margin-bottom:-90px;">
                            <div style="color:#666; font-weight:900; font-size:4rem; letter-spacing:4px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 6px 15px; border-radius: 6px; border: 3px solid #444; font-weight: 900; font-size: 1.5rem; margin-top: 10px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `
        <div style="background: #111; border-top: 10px solid #222; border-bottom: 10px solid #000; padding: 25px 15px; box-shadow: inset 0 20px 30px #000;">
            <div style="color: #fbbf24; font-family: 'Courier Prime', monospace; font-size: 1.5rem; font-weight: 900; text-align: center; margin-bottom: 25px; letter-spacing: 3px; text-shadow: 0 0 10px rgba(251,191,36,0.5);">NOUTOLOKERO (VARATUT)</div>
            <div style="display:flex; justify-content:space-around; width:100%; gap:20px;">`;
            
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1.1rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
            let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
            
            reserveHtml += `
                <div style="width:45%; display:flex; flex-direction:column; align-items:center;">
                    <div style="transform: scale(0.60); margin-bottom:-80px; transform-origin: top center; cursor:pointer; width:280px; position:relative;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div style="position:absolute; top:-30px; right:-30px; background:#fbbf24; color:#000; padding:15px 20px; font-weight:900; font-size: 1.5rem; border-radius:12px; z-index:30; border: 5px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.8);">🔒 VARATTU</div>
                        ${fullCardHtml}
                    </div>
                    <div style="background: #000; color: #fbbf24; font-family: 'Courier Prime', monospace; padding: 8px 18px; border-radius: 6px; border: 3px solid #fbbf24; font-weight: 900; font-size: 1.6rem; margin-top: 15px; text-align: center; margin-bottom:15px; box-shadow: 0 0 15px rgba(251,191,36,0.6);">${resItem.price} P</div>
                    
                    <div style="display:flex; gap:10px; width:100%; justify-content:center; position: relative; z-index: 1000; pointer-events: auto;">
                        <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:12px; font-size:1.1rem; font-weight:900; margin:0; box-shadow: 0 5px 10px rgba(0,0,0,0.8);" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                        <button class="btn btn-danger" style="padding:12px; font-size:1.1rem; font-weight:900; margin:0; box-shadow: 0 5px 10px rgba(0,0,0,0.8);" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    wrapper.innerHTML = `
    <!-- KOMPAKTI LATTIA-AUTOMAATTI -->
    <div style="position: relative; width: 750px; background: #111827; border: 25px solid #020617; border-bottom: 60px solid #000; border-radius: 20px 20px 0 0; padding: 30px; padding-bottom: 0; box-shadow: 25px 40px 80px rgba(0,0,0,0.9), inset 0 0 40px rgba(255,255,255,0.05); display: flex; flex-direction: column; z-index:20; margin: 0 auto;">
        
        <!-- Yläosan valokyltti -->
        <div style="background: linear-gradient(135deg, #000, #111); padding: 25px; border-radius: 12px; border: 6px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px; box-shadow: inset 0 0 30px rgba(239,68,68,0.25);">
            <div style="display:flex; align-items:center; gap: 25px;">
                <div style="font-size:4rem; text-shadow: 0 0 20px rgba(255,255,255,0.6);">🥨</div>
                <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:3.5rem; letter-spacing: 4px; text-shadow: 0 0 20px #ef4444;">FRIBAMART SNACKS</div>
            </div>
            <div style="background: #000; padding: 15px 25px; border-radius: 10px; border: 4px solid #333;">
                <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:2.8rem; font-weight:900; text-shadow: 0 0 15px #22c55e;">${myPoints} P</div>
            </div>
        </div>

        <!-- Lasikaappi jossa hyllyt -->
        <div style="background: #020617; border-radius: 12px; border: 15px solid #0f172a; padding: 20px 20px 0 20px; position:relative; box-shadow: inset 0 20px 50px #000;">
            <div style="position:absolute; top:0; left:-20%; width:150%; height:100%; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.08) 50%, transparent 55%); pointer-events:none; z-index:40;"></div>
            ${shelvesHtml}
        </div>

        ${reserveHtml}

        <!-- Alapaneeli: Numpad ja PUSH-luukku -->
        <div style="height: 200px; padding: 40px 0; display:flex; gap:35px;">
            <div style="width: 200px; background: #000; border-radius: 12px; border: 6px solid #1e293b; padding: 20px; display:flex; flex-direction:column; align-items:center; box-shadow: inset 0 0 20px rgba(0,0,0,0.9);">
                <div style="width: 100%; height: 40px; background: #0f172a; border: 3px solid #334155; margin-bottom: 20px; color:#22c55e; font-family:'Courier Prime', monospace; font-weight:bold; font-size:1.5rem; text-align:right; padding-right:10px; line-height:34px; box-shadow: inset 0 0 15px #000;">12.00</div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width:100%;">
                    ${Array(9).fill('<div style="background: #334155; height:25px; border-radius:6px; border-bottom:5px solid #0f172a;"></div>').join('')}
                </div>
            </div>
            
            <div style="flex: 1; background: #000; border-radius: 12px; border: 10px solid #111; position:relative; box-shadow: inset 0 40px 50px #000;">
                <div style="position:absolute; top:0; left:0; right:0; height: 110px; background: #1a1a1a; border-bottom: 5px solid #000; display:flex; justify-content:center; align-items:center; transform-origin: top; transform: rotateX(-15deg);">
                    <span style="color:#444; font-weight:900; font-size:3.5rem; letter-spacing:15px; text-shadow:-2px -2px 0 #000;">PUSH</span>
                </div>
            </div>
        </div>

    </div>
    `;
};

// ==============================================
// GM PELAAJIEN HALLINTA & KORTTIEN HINNASTO
// ==============================================
window.updateAdminPlayerList = function() {
    let container = el('adminPlayerList'); if(!container) return; 
    let html = '';
    (window.allPlayers || []).forEach(p => {
        if(!p) return;
        html += `
        <div class="apple-setting-row" style="flex-direction:column; align-items:stretch; gap:15px; padding: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="font-weight:900; color:#1e293b; font-size:1.5rem;">${p.name}</div>
                <div style="font-size:1.8rem; font-weight:900; color:var(--warning); background:#1e293b; padding:8px 20px; border-radius:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">${p.score || 0} P</div>
            </div>
            <div style="display:flex; gap:10px; width:100%;">
                <button class="btn btn-warning" style="flex:1; padding:12px; font-size:1.2rem; font-weight:900; color:#000; border-radius:10px; margin:0;" onclick="window.gmAdjustScore('${p.name}', 1)">+1 P</button>
                <button class="btn btn-warning" style="flex:1; padding:12px; font-size:1.2rem; font-weight:900; color:#000; border-radius:10px; margin:0;" onclick="window.gmAdjustScore('${p.name}', -1)">-1 P</button>
                <button class="btn btn-danger" style="flex:1; padding:12px; font-size:1.1rem; font-weight:bold; border-radius:10px; margin:0;" onclick="window.gmKickPlayer('${p.name}')">POTKI</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

// Generoi asetusvalikkoon dynaamisesti lista kaikkien korttien hinnoista
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
    
    el('cardPricingModal').style.display = 'none';
    if(window.showAppleToast) window.showAppleToast("Hinnat Tallennettu", "✅");
    
    if (window.renderShopOnBoard) window.renderShopOnBoard();
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
    <div class="board-receipt-paper" style="position:relative; box-shadow: 10px 20px 40px rgba(0,0,0,0.6); border-radius: 4px; padding-bottom: 80px;">
        <div class="tape tape-top" style="width: 180px; top: -15px;"></div>
        <div style="font-size:2.8rem; font-weight:900; margin-bottom:30px; text-align:center; border-bottom:4px solid #111; padding-bottom:10px;">TULOSSEURANTA</div>`;
    
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
    
    html += `<div style="margin-top:40px; border-top: 4px dashed #111; padding-top:20px; background:#f8fafc; padding:20px; border-radius:8px; border:2px solid #111;"><h3 style="text-align:center; font-size:1.8rem; margin-bottom:20px;">KOKONAISTILANNE</h3>${generateTotals()}</div></div>`;
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
            const cardWidth = 320; 
            const paddingLeft = centerOffset - (cardWidth / 2); 
            
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const diff = ((paddingLeft + (i * cardWidth) + (cardWidth / 2) - scrollLeft) - centerOffset) / 160; 
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
                <li style="${isActive ? 'color:var(--warning); font-weight:bold; border-left:3px solid var(--warning); padding-left:5px;' : 'color:#ccc; opacity:0.8;'}">
                    <span class="lvl-tag">TASO ${fc.level} ${isActive ? '(NYKYINEN TASO)' : ''}</span>
                    ${fc.d}
                </li>`;
        });
        
        let backHtml = `
            <div style="background:#1e293b; border:4px solid #475569; width:100%; height:100%; border-radius:12px; display:flex; flex-direction:column; padding:15px; box-sizing:border-box; color:#fff;">
                <div style="font-size:1.4rem; font-weight:900; color:var(--warning); margin-bottom:15px; text-transform:uppercase; text-align:center; border-bottom:2px dashed #475569; padding-bottom:10px;">${cDef.n.split(' (')[0]}</div>
                <ul class="card-levels-list" style="flex:1; overflow-y:auto; list-style-type:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;">
                    ${levelsHtml}
                </ul>
            </div>`;
        
        let extraHtml = `<div style="text-align:center; font-weight:900; color:#111; margin-top:auto; padding-bottom:10px; font-size:1rem;">🔄 KÄÄNNÄ (KATSO KAIKKI TASOT)</div>`;
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
                btnHtml += `<button class="btn ${canUpg ? 'btn-warning' : 'btn-secondary'}" ${!canUpg ? 'disabled' : ''} style="width:100%; font-size:1.1rem; padding:15px; margin-bottom:10px; color:#000; font-weight:900;" onclick="event.stopPropagation(); window.upgradeCard('${cId}')">🔼 UPGRADE TASOLLE ${cDef.level + 1} (${upgCost} P)</button>`;
            }
            btnHtml += `<button class="btn ${canPlay ? 'btn-success' : 'btn-secondary'}" ${!canPlay ? 'disabled' : ''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; box-shadow:0 4px 15px rgba(16,185,129,0.4); margin-bottom:10px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cDef.id}')">PELAA KORTTI (${playCost} P)</button>`;
            btnHtml += `<button class="btn btn-danger" style="width:100%; font-size:1.1rem; padding:15px; font-weight:bold; margin-bottom:10px;" onclick="window.forceDiscard('${cDef.id}')">♻️ MYY KORTTI (+${sellReward} P)</button>`;
        }
    } else if (mode === 'shop' || mode === 'shop_res') {
        let cDef = window.allCards.find(c => c && c.id === cId);
        if(cDef) {
            let itemPrice = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : cDef.price;
            let canAfford = me.score >= itemPrice; 
            let isRes = mode === 'shop_res';
            btnHtml += `<button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" ${!canAfford ? 'disabled' : ''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-bottom:10px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cDef.id}', ${itemPrice}, ${isRes})">OSTA AUTOMAATISTA (${itemPrice} P)</button>`;
        }
    }
    
    el('cardDetailActionArea').innerHTML = btnHtml;
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
            <button class="btn btn-danger" style="width:auto; padding:10px 15px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}')">♻️ MYY (+${sellReward} P)</button>
        </div>`;
    });
    
    el('handLimitCards').innerHTML = html; 
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
