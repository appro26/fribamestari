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
// SKAALAUS
// ==============================================
window.applyViewScales = function() {
    let w = window.innerWidth;
    let receiptWrapper = el('board-receipt-wrapper');
    if(receiptWrapper) {
        let recScale = w < 480 ? Math.max(0.6, w / 480) : 1;
        receiptWrapper.style.transform = `scale(${recScale})`;
        receiptWrapper.style.transformOrigin = 'top center';
    }
};
window.addEventListener('resize', window.applyViewScales);

window.viewedHoleIndex = null;

// ==============================================
// ILMOITUKSET JA IKKUNAT
// ==============================================
window.showModalSafe = function(id, displayType) {
    let elModal = el(id); 
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

window.openCardDetail = function(cId, mode, forceIndex = -1) {
    if (mode === 'sell') {
        window.carouselCards = window.currentBinderCards || [cId];
    } else if (mode === 'shop') {
        window.carouselCards = window.currentShopCards || [cId];
    } else if (mode === 'shop_res') {
        window.carouselCards = window.currentShopResCards || [cId];
    } else {
        window.carouselCards = [cId];
    }
    
    window.carouselCurrentMode = mode;

    if (forceIndex !== -1 && window.carouselCards[forceIndex] === cId) {
        window.carouselCurrentIndex = forceIndex;
    } else {
        window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    }
    
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.renderCarousel();
    if(window.renderCarouselActionButtons) window.renderCarouselActionButtons();
    window.showModalSafe('cardDetailModal');
    
    setTimeout(() => { 
        const container = el('cardCarousel');
        if(container) {
            const cards = container.querySelectorAll('.carousel-card-wrapper');
            if(cards[window.carouselCurrentIndex]) {
                const targetCard = cards[window.carouselCurrentIndex];
                const containerCenter = container.clientWidth / 2;
                const cardCenter = targetCard.offsetLeft + (targetCard.offsetWidth / 2);
                
                container.scrollLeft = cardCenter - containerCenter;
                
                if(window.initNativeCarousel) window.initNativeCarousel();
            }
        }
    }, 50);
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
                SUORITTAJA:<br><span style="font-size:1.6rem; font-family:'Kalam', cursive;">${target}</span>
                <div style="font-size:0.9rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div>
            </div>`;
    }
    
    let actionArea = el('cardDetailActionArea');
    if(actionArea) {
        actionArea.innerHTML = targetStr + `<button class="btn btn-secondary btn-modern" style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-top:15px; background:#1e293b; color:#fff; border-color:#475569;" onclick="document.getElementById('cardDetailModal').style.display='none';">❌ SULJE NÄKYMÄ</button>`;
    }
    window.showModalSafe('cardDetailModal');
};

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

window.openTargetModal = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return;
    
    window.pendingCardPlay = { id: cId, def: cDef, cost: typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cId) : cDef.price };
    
    if (cDef.type === 'buff') {
        window.executeCardPlay(window.myName);
        return; 
    }
    
    let opponents = (window.allPlayers || []).filter(Boolean).filter(p => p.name !== window.myName);
    
    if (opponents.length === 1) {
        window.executeCardPlay(opponents[0].name);
        return;
    } else if (opponents.length > 1) {
        let nameEl = el('targetCardName');
        if(nameEl) nameEl.innerText = cDef.n;
        
        let html = '';
        opponents.forEach(p => {
            html += `<button class="btn btn-warning btn-modern" style="width:100%; padding:14px; margin-bottom:10px; font-size:1.1rem; font-weight:900; color:#000;" onclick="window.executeCardPlay('${p.name}')">SABOTOI: ${p.name}</button>`;
        });
        
        let listEl = el('targetPlayerList');
        if(listEl) listEl.innerHTML = html;
        window.showModalSafe('targetModal');
    } else {
        alert("Ei vastustajia pelissä!");
    }
};

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
    
    return `
    <div class="physical-card ${typeClass}" style="${lockedStyle}">
        <div class="card-header ${typeName}">
            <span>${typeIcon} ${cDef.type === 'buff' ? 'HELPOTUS' : 'SABOTAASI'}</span>
            <span class="level-badge level-badge-${cDef.level || 1}">TASO ${cDef.level || 1}</span>
        </div>
        <div class="card-body ${typeName}">
            <div class="play-cost-badge">PELUU: ${playCost} P</div>
            <h3>${safeCardName}</h3>
            <p>${cDef.d}</p>
            ${extraBottomHtml}
        </div>
    </div>`;
};

// ==============================================
// VÄYLÄN RENDERÖINTI JA TAPAHTUMAT
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
        let sortedPlayers = [...window.allPlayers].filter(Boolean).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
        let winner = sortedPlayers[0] || {name: "Tuntematon", dgScore: 0, score: 0};
        container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:60vh; width:100%;">
            <div style="transform:rotate(-3deg); background:#fff; padding:40px 20px; box-shadow:0 15px 30px rgba(0,0,0,0.6); border:4px solid #ccc; text-align:center; width:90%; max-width:350px; border-radius:8px; position:relative;">
                <div class="tape tape-top" style="width:120px; top:-15px; height:25px;"></div>
                <h1 style="font-family:'Kalam', cursive; font-size:3.5rem; color:var(--primary); margin-bottom:15px; line-height:1;">🏆 MESTARI!</h1>
                <h2 style="font-size:1.2rem; margin-bottom:10px; color:#555;">VOITTAJA:</h2>
                <div style="font-size:2.8rem; font-weight:900; color:var(--ink-blue); margin-bottom:10px; font-family:'Kalam', cursive; overflow-wrap:break-word;">${winner.name}</div>
            </div>
        </div>`;
        return;
    }

    let hData = isCurrent ? window.activeHole : window.gameHistory[hIndex - 1];
    if(!hData) { container.innerHTML = '<p style="color:#fff;">Väylän tietoja ei löydy.</p>'; return; }

    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[hIndex - 1] || 3) : 3;
    let rot1 = (window.pseudoRandom(hIndex * 1.1) * 6 - 3).toFixed(1);
    let rot2 = (window.pseudoRandom(hIndex * 2.2) * 6 - 3).toFixed(1);

    let prevHData = hIndex > 1 ? window.gameHistory[hIndex - 2] : null;
    let worstPlayer = null;
    
    if (prevHData && prevHData.holeResults) {
        let maxStrokes = -1;
        let worstCount = 0;
        let potentialWorst = null;
        for (let p in prevHData.holeResults) {
            let s = prevHData.holeResults[p];
            if (s > maxStrokes) {
                maxStrokes = s;
                worstCount = 1;
                potentialWorst = p;
            } else if (s === maxStrokes) {
                worstCount++;
            }
        }
        if (worstCount === 1) {
            worstPlayer = potentialWorst;
        }
    }

    let insultIdx = hData.insultIdx !== undefined ? hData.insultIdx : (Math.floor(window.pseudoRandom(hIndex * 3.3) * (window.insults ? window.insults.length : 1)));
    let doodleIdx = hData.insultIdx !== undefined ? (hData.insultIdx % (window.doodleSVGs ? window.doodleSVGs.length : 1)) : (Math.floor(window.pseudoRandom(hIndex * 4.4) * (window.doodleSVGs ? window.doodleSVGs.length : 1)));
    
    let rawInsult = window.insults && window.insults.length > 0 ? window.insults[insultIdx] : "Heitä paremmin!";
    
    let finalInsult = rawInsult;
    if (worstPlayer) {
        finalInsult = finalInsult.replace(/\[Pelaaja\]/g, worstPlayer);
    } else {
        finalInsult = finalInsult.replace(/\[Pelaaja\],\s*/g, "").replace(/\[Pelaaja\]\s*/g, "").replace(/\[Pelaaja\]/g, "");
        finalInsult = finalInsult.charAt(0).toUpperCase() + finalInsult.slice(1);
    }
    let svgPath = window.doodleSVGs && window.doodleSVGs.length > 0 ? window.doodleSVGs[doodleIdx] : "";

    let html = ``;

    html += `
    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; margin-top: 55px; position: relative;">
        <div style="background: rgba(255,255,255,0.95); padding: 12px 18px; border-radius: 16px; border: 3px solid #1e293b; font-family: 'Kalam', cursive; font-size: 1.2rem; font-weight: 900; color: #1e293b; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); max-width: 90%; line-height: 1.2; z-index: 2;">
            "${finalInsult}"
        </div>
        <div style="width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 15px solid #1e293b; margin-top: -3px; z-index: 1;"></div>
        <svg viewBox="0 0 100 100" style="width: 70px; height: 70px; fill: none; stroke: #fff; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; margin-top: -8px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.8));">
            <path d="${svgPath}"></path>
        </svg>
    </div>`;

    html += `<div class="mini-corkboard">`;

    html += `<div class="index-card" style="transform: rotate(${rot1}deg); position: relative; margin-bottom: 25px; width: 95%; max-width: 320px;">`;
    html += `<div class="banner-subtitle">${window.currentCourse ? window.currentCourse.name : ''}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>`;
    
    if (isCurrent && hData.penColor) {
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
        html += `
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg);" onclick="event.stopPropagation(); window.showZoomModal(this.outerHTML)">
            <div class="post-it-tape"></div>
            <div style="font-weight:900; font-size:0.9rem; margin-bottom:10px; text-transform:uppercase; color:#555; flex-shrink: 0;">📌 ${bTxt}</div>
            <div style="flex: 1; overflow-y: auto; padding-right: 5px; scrollbar-width: none; display: flex; flex-direction: column;">
                <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
                <div style="font-size:1.1rem; line-height: 1.35; font-weight:800; color:#222;">${hData.rule.d}</div>
            </div>
        </div>`;
    }

    let playedCards = [];
    if (hData.playedCards) { playedCards = Object.values(hData.playedCards).filter(Boolean); }
    
    if(playedCards.length > 0) {
        // LAJITELLAAN KORTIT: Muiden pelaajien laput alimmaiseksi (piirretään ensin), 
        // itseesi vaikuttavat kortit päällimmäiseksi (piirretään viimeiseksi).
        playedCards.sort((a, b) => {
            let aTargetMe = (a.target === window.myName || a.target === 'KAIKKI VASTUSTAJAT');
            let bTargetMe = (b.target === window.myName || b.target === 'KAIKKI VASTUSTAJAT');
            if (aTargetMe === bTargetMe) return a.timestamp - b.timestamp;
            return aTargetMe ? 1 : -1;
        });

        html += `<div style="width: 100%; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:15px; margin-top: 25px;">`;
        playedCards.forEach((pc, idx) => {
            let isTargetingMe = (pc.target === window.myName || pc.target === 'KAIKKI VASTUSTAJAT');
            let cRot = (window.pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
            
            let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
            let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
            let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
            
            if (isTargetingMe) {
                let fullCardHtml = window.generateCardHTML(cDef, false, '');

                html += `
                <div style="transform: rotate(${cRot}deg); cursor:pointer; width:calc(50% - 10px); min-width: 165px; max-width:190px; position:relative; overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.7); border-radius:12px; z-index: 20;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div style="width: 100%; pointer-events: none;">
                        <div class="card-aspect-wrapper">${fullCardHtml}</div>
                    </div>
                </div>`;
            } else {
                let typeClass = pc.type === 'buff' ? 'buff' : 'sabotage';
                let icon = pc.type === 'buff' ? '🛡️' : '💥';
                let shortName = pc.cardName.split(' (')[0];

                html += `
                <div class="opponent-event-note ${typeClass}" style="transform: rotate(${cRot}deg); z-index: 5;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div style="font-weight:900; font-size:1rem; line-height:1.1; margin-top:5px;">${icon} ${shortName}</div>
                    <div style="font-size:0.8rem; font-weight:bold; margin-top:10px;">Kohteelle:<br><span style="font-size:1rem; color:#111; font-family: 'Inter', sans-serif;">${pc.target}</span></div>
                    <div style="font-size:0.65rem; margin-top:auto; opacity:0.8; font-family: 'Inter', sans-serif; text-transform:uppercase;">Pelaaja: ${pc.by}</div>
                </div>`;
            }
        });
        html += `</div>`;
    }

    html += `</div>`; 
    container.innerHTML = html;
};

// ==============================================
// PALKKALASKELMA NÄKYMÄ
// ==============================================
window.renderPayslipView = function(hIndex) {
    let container = el('payslip-content');
    if(!container) return;
    
    let lastCompletedIndex = window.currentHoleIndex > 1 ? window.currentHoleIndex - 1 : 1;
    let viewIndex = hIndex === window.currentHoleIndex ? lastCompletedIndex : hIndex;

    if (window.currentHoleIndex === 1 && !window.gameHistory[0]) {
        container.innerHTML = `
        <div style="background:#fff; padding:30px; border-radius:12px; border:3px dashed #94a3b8; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.3); width: 95%; max-width: 400px; margin:30px auto;">
            <div style="font-size:3rem; margin-bottom:15px;">⏳</div>
            <h2 style="color:#334155; font-size:1.3rem; font-weight:900;">Palkkaa ei ole vielä jaettu</h2>
            <p style="color:#64748b; font-weight:bold; font-size:1rem; margin-top:10px;">Ensimmäinen palkkakuitti ilmestyy tähän, kun väylä 1 on valmis.</p>
        </div>`;
        return;
    }

    let hData = window.gameHistory[viewIndex - 1];
    if (!hData || !hData.pointBreakdowns || !hData.pointBreakdowns[window.myName]) {
        container.innerHTML = `<p style="color:#fff; font-weight:bold; font-size:1.1rem; text-align:center; margin-top:30px;">Palkkatietoja ei löytynyt väylältä ${viewIndex}.</p>`;
        return;
    }

    let myBreakdown = hData.pointBreakdowns[window.myName];
    let sign = myBreakdown.delta > 0 ? '+' : '';
    let rowsHtml = '';
    
    if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
        myBreakdown.summary.split(', ').forEach(part => {
            let kv = part.split(': ');
            if(kv.length === 2) { 
                rowsHtml += `<tr><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; font-size:1.1rem;">${kv[0]}</td><td style="padding:12px 0; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:700; font-size:1.1rem;">${kv[1]}</td></tr>`; 
            } else { 
                rowsHtml += `<tr><td colspan="2" style="font-weight:bold; padding:12px 0; border-bottom:1px solid #e5e7eb;">${part}</td></tr>`; 
            }
        });
    } else {
        rowsHtml += `<tr><td colspan="2" style="text-align:center; font-style:italic; padding-top:20px;">Ei tapahtumia tällä kaudella.</td></tr>`;
    }

    container.innerHTML = `
    <div style="background: #ffffff !important; padding: 30px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: 'Inter', sans-serif; width: 95%; max-width: 500px; margin: 30px auto; color: #334155; position: relative; z-index: 10;">
        <h1 style="color: #06b6d4; font-size: 2.2rem; font-weight: 900; margin: 0 0 25px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">Palkkalaskelma</h1>
        
        <div style="display:flex; justify-content:space-between; margin-bottom: 30px; font-size:0.9rem;">
            <div>
                <strong>Fribamestari Ry</strong><br>
                Radan toimisto 1<br>
                00100 Helsinki
            </div>
            <div style="text-align:right;">
                <span style="color:#64748b; font-size:0.8rem; text-transform:uppercase;">Palkkakausi</span><br>
                <strong>Väylä ${viewIndex}</strong>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 20px;">
            <div style="font-size:0.9rem;">
                <span style="color:#64748b; text-transform:uppercase;">Palkansaaja</span><br>
                <strong style="font-size:1.1rem;">${window.myName.toUpperCase()}</strong>
            </div>
            <div style="text-align:right;">
                <span style="color:#64748b; font-size:0.8rem; text-transform:uppercase; font-weight:bold;">Maksetaan</span><br>
                <span style="font-size: 1.6rem; font-weight: 900; color: #111827;">${sign}${myBreakdown.delta} P</span>
            </div>
        </div>

        <h3 style="color: #06b6d4; font-size: 1rem; text-transform: uppercase; margin-bottom: 5px; border-bottom: 2px solid #06b6d4; padding-bottom: 5px;">Palkkaerittely</h3>
        
        <table style="width: 100%; text-align: left; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
                <tr>
                    <th style="border-bottom: 1px solid #94a3b8; padding-bottom: 8px; font-size: 0.85rem; color:#64748b; text-transform:uppercase;">Selite</th>
                    <th style="border-bottom: 1px solid #94a3b8; padding-bottom: 8px; font-size: 0.85rem; text-align:right; color:#64748b; text-transform:uppercase;">Summa</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
        
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 1.2rem; color: #111827; padding-top: 10px;">
            <span>Maksetaan</span>
            <span>${sign}${myBreakdown.delta} P</span>
        </div>
    </div>`;
};

// ==============================================
// KANSIO (OMAT KORTIT ILMAN OTSIKKOJA, LAJITELTUNA)
// ==============================================
window.renderBinderOnBoard = function() {
    let wrapper = el('board-binder-wrapper');
    if(!wrapper) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    let myPoints = me ? (me.score || 0) : 0;
    
    myCards.sort((a,b) => {
        let cA = window.allCards.find(x => x.id === a);
        let cB = window.allCards.find(x => x.id === b);
        if(!cA || !cB) return 0;
        
        if (cA.level !== cB.level) return cB.level - cA.level; 
        
        let typeW_A = cA.type === 'sabotage' ? 1 : 2;
        let typeW_B = cB.type === 'sabotage' ? 1 : 2;
        return typeW_A - typeW_B;
    });

    window.currentBinderCards = myCards.slice();

    let cardsHtml = '';
    if(myCards.length === 0) {
        cardsHtml = '<p style="color:#64748b; font-size:1.6rem; text-align:center; padding:40px; font-weight:bold; grid-column: 1 / -1;">Kansiosi on tyhjä.</p>';
    } else {
        myCards.forEach((cId, idx) => {
            let cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:clamp(0.8rem, 4vw, 1.2rem); color:#111; margin-top:auto; padding-top:10px;">👆 KLIKKAA 👆</div>`;
            let fullCardHtml = window.generateCardHTML(cDef, isLocked, extraHtml, false);
            
            cardsHtml += `
            <div style="cursor:pointer; width:100%; position:relative; transition:transform 0.1s;" onclick="window.openCardDetail('${cId}', 'sell', ${idx})">
                <div class="card-aspect-wrapper">
                    ${fullCardHtml}
                </div>
            </div>`;
        });
    }

    wrapper.innerHTML = `
    <div class="binder-page">
        <h2 style="color:#1e293b; font-size:2.8rem; margin-bottom:15px; font-family:'Kalam', cursive; border-bottom:4px dashed #94a3b8; padding-bottom:10px; text-align:center;">OMAT KORTIT</h2>
        
        <div style="text-align:center; margin-bottom: 25px;">
            <div style="background:#0f172a; color:#22c55e; padding: 10px 25px; border-radius: 8px; border: 3px solid #22c55e; font-family:'Courier Prime', monospace; font-size:1.6rem; font-weight:900; display:inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">LOMPAKKO: ${myPoints} P</div>
        </div>
        
        <div style="text-align:center; color:#64748b; font-weight:bold; margin-bottom:20px; font-size:0.9rem;">👆 KLIKKAA KORTTIA AVATAKSESI TOIMINNOT 👆</div>
        <div class="binder-grid">
            ${cardsHtml}
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

    window.currentShopCards = [];
    window.currentShopResCards = [];

    let shelvesHtml = '';
    let actRes = resArray.filter(Boolean);
    let levels = [3, 2, 1]; 

    levels.forEach(lvl => {
        shelvesHtml += `<div class="shop-shelf-grid">`;
        shelvesHtml += `<div style="position:absolute; bottom:15px; left:0; width:100%; height:30px; background:repeating-linear-gradient(90deg, transparent, transparent 20px, #64748b 20px, #64748b 28px); z-index:1; opacity:0.9; filter:drop-shadow(0 10px 10px #000);"></div>`;

        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                let shopIdx = window.currentShopCards.length;
                window.currentShopCards.push(item.id);

                let buyPrice = item.price;
                if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[item.id] !== undefined) buyPrice = window.gameSettings.cardPrices[item.id];

                const canAfford = myPoints >= buyPrice;
                let isResFull = actRes.length >= 2;
                
                let fullCardHtml = window.generateCardHTML(item, false, '', false);
                
                shelvesHtml += `
                    <div style="position:relative; width:100%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="cursor:pointer; width:100%; margin-bottom:10px; box-shadow:0 8px 15px rgba(0,0,0,0.6); border-radius:12px;" onclick="window.openCardDetail('${item.id}', 'shop', ${shopIdx})">
                            <div class="card-aspect-wrapper">${fullCardHtml}</div>
                        </div>
                        
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 4px 12px; border-radius: 6px; border: 2px solid #22c55e; font-weight: 900; font-size: 1.2rem; margin-top: 5px; box-shadow: 0 0 10px rgba(34,197,94,0.8); z-index: 15;">OSTA: ${buyPrice} P</div>
                        
                        <div class="shop-controls" style="margin-top: 10px; display:flex; gap:5px; width:100%;">
                            <button class="btn btn-success btn-modern" ${!canAfford?'disabled':''} style="padding:10px; font-size:0.9rem; font-weight:900; flex:1;" onclick="window.buyShopItem('${item.id}', ${buyPrice}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-primary btn-modern" style="padding:10px; font-size:0.9rem; font-weight:900; flex:1;" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="position:relative; width:100%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="width:100%; min-height: 250px; aspect-ratio: 2/3; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); border-radius:12px; border:6px dashed #333; margin-bottom:10px;">
                            <div style="color:#666; font-weight:900; font-size:1.8rem; letter-spacing:2px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 4px 12px; border-radius: 6px; border: 2px solid #444; font-weight: 900; font-size: 1.2rem; margin-top: 5px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `
        <div style="background: #111; border-top: 6px solid #222; border-bottom: 6px solid #000; padding: 20px 10px; box-shadow: inset 0 10px 20px #000; margin-bottom:15px;">
            <div style="color: #fbbf24; font-family: 'Courier Prime', monospace; font-size: 1.2rem; font-weight: 900; text-align: center; margin-bottom: 15px; letter-spacing: 2px; text-shadow: 0 0 8px rgba(251,191,36,0.5);">NOUTOLOKERO</div>
            <div style="display:flex; justify-content:space-around; width:100%; gap:10px;">`;
            
        actRes.forEach((rId) => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            
            let shopResIdx = window.currentShopResCards.length;
            window.currentShopResCards.push(resItem.id);

            let buyPrice = resItem.price;
            if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[rId] !== undefined) buyPrice = window.gameSettings.cardPrices[rId];

            const canAfford = myPoints >= buyPrice;
            let fullCardHtml = window.generateCardHTML(resItem, false, '', false);
            
            reserveHtml += `
                <div style="width:48%; display:flex; flex-direction:column; align-items:center;">
                    <div style="width:100%; cursor:pointer; position:relative; margin-bottom:10px; border-radius:12px; box-shadow:0 8px 15px rgba(0,0,0,0.6);" onclick="window.openCardDetail('${resItem.id}', 'shop_res', ${shopResIdx})">
                        <div style="position:absolute; top:-10px; right:-10px; background:#fbbf24; color:#000; padding:6px 10px; font-weight:900; font-size: 0.9rem; border-radius:8px; z-index:30; border: 3px solid #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.8);">🔒 VARATTU</div>
                        <div class="card-aspect-wrapper">${fullCardHtml}</div>
                    </div>
                    <div style="background: #000; color: #fbbf24; font-family: 'Courier Prime', monospace; padding: 4px 12px; border-radius: 6px; border: 2px solid #fbbf24; font-weight: 900; font-size: 1.2rem; margin-top: 5px; text-align: center; margin-bottom:10px; box-shadow: 0 0 10px rgba(251,191,36,0.6);">LUNASTA: ${buyPrice} P</div>
                    
                    <div class="shop-controls" style="margin-top: 10px; display:flex; gap:5px; width:100%;">
                        <button class="btn btn-success btn-modern" ${!canAfford?'disabled':''} style="padding:10px; font-size:0.9rem; font-weight:900; flex:1;" onclick="window.buyShopItem('${resItem.id}', ${buyPrice}, true)">LUNASTA</button>
                        <button class="btn btn-danger btn-modern" style="padding:10px; font-size:0.9rem; font-weight:900; flex:1;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    wrapper.innerHTML = `
    <div class="shop-3d-container">
        <div class="shop-machine">
            <!-- LED Header -->
            <div style="background: #000; border-radius: 8px; border: 2px solid #222; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; box-shadow: inset 0 0 20px rgba(239,68,68,0.15);">
                <div style="color: #ef4444; font-family: monospace; font-size: 1.6rem; font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 10px #ef4444;">FRIBAMART</div>
                <div style="background: #022c22; border: 2px solid #064e3b; padding: 5px 15px; border-radius: 4px; box-shadow: inset 0 0 10px #000; text-align: center;">
                    <div style="font-size: 0.6rem; color: #10b981; letter-spacing: 1px;">CREDIT</div>
                    <div style="font-size: 1.8rem; color: #34d399; font-family: 'Courier Prime', monospace; font-weight: 900; text-shadow: 0 0 8px #34d399;">${myPoints} P</div>
                </div>
            </div>

            <!-- Lasinen Sisäosa -->
            <div class="shop-glass">
                <div style="position: absolute; top: 0; left: -50%; width: 200%; height: 100%; background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.05) 50%, transparent 55%); z-index: 5; pointer-events: none;"></div>
                ${shelvesHtml}
            </div>

            ${reserveHtml}

            <!-- Alapaneeli -->
            <div style="background: #0f172a; margin-top: 20px; padding: 15px; border-radius: 8px; border: 2px solid #334155; display: flex; justify-content: space-between; align-items: flex-start; box-shadow: inset 0 0 15px #000;">
                <div style="width: 90px; background: #000; padding: 10px; border-radius: 6px; border: 2px solid #1e293b; box-shadow: inset 0 0 10px #000;">
                   <div style="color: #10b981; text-align: right; font-family: monospace; border: 1px solid #334155; padding: 2px 5px; margin-bottom: 8px; font-size: 0.9rem;">12.00</div>
                   <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
                       ${Array(9).fill('<div style="height: 10px; background: #334155; border-radius: 2px;"></div>').join('')}
                   </div>
                </div>
                <div style="flex: 1; margin-left: 15px; background: #000; height: 60px; border-radius: 6px; border: 4px solid #1e293b; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 20px 20px rgba(0,0,0,0.8);">
                    <span style="color: #334155; font-size: 1.2rem; font-weight: 900; letter-spacing: 5px;">PUSH</span>
                </div>
            </div>
        </div>
        <div class="shop-floor"></div>
    </div>
    `;
};

// ==============================================
// FRISBEEGOLF -OPASTEKRYLTTI (TULOSSEURANTA)
// ==============================================
window.renderReceiptOnBoard = function() {
    let wrapper = el('board-receipt-wrapper');
    if(!wrapper) return;
    if(!window.allPlayers || window.allPlayers.length === 0 || !window.currentCourse) { wrapper.innerHTML = ''; return; }

    let generateTotals = () => { 
        let html = ``; 
        [...window.allPlayers].filter(Boolean).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)).forEach(p => { 
            let scoreStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            html += `<div style="display:flex; justify-content:space-between; font-size:1.5rem; font-family:'Inter', sans-serif; color:#0f172a; font-weight:900; margin-bottom:10px;"><span>${p.name.substring(0, 12)}</span><span style="color:#16a34a;">${scoreStr}</span></div>`; 
        }); 
        return html; 
    };

    let html = `
    <div class="dg-sign-wrapper">
        <div class="dg-sign-top-bar" style="background:#0284c7;"></div>
        
        <div class="dg-sign-legs">
            <div class="dg-sign-leg" style="background:#0284c7;"></div>
            <div class="dg-sign-leg" style="background:#0284c7;"></div>
        </div>

        <div class="dg-sign-board" style="background:#dcfce7; border-color:#0284c7; padding: 25px 20px;">
            <div style="background: #ffffff; border: 3px solid #16a34a; padding: 15px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                <h3 style="text-align:center; width:100%; font-size:1.8rem; font-family:'Inter', sans-serif; font-weight: 900; color:#166534; margin:0 0 15px 0; text-transform: uppercase;">KOKONAISTILANNE</h3>
                ${generateTotals()}
            </div>
            
            <h2 style="text-align:center; font-size:1.6rem; color:#0284c7; font-family:'Inter', sans-serif; font-weight:900; margin-bottom:15px; text-transform:uppercase;">Väyläkohtaiset</h2>
    `;
    
    for(let i=0; i<window.gameHistory.length; i++) { 
        let h = window.gameHistory[i]; 
        let par = window.currentCourse.pars ? (window.currentCourse.pars[i] || 3) : 3; 
        html += `<div style="font-size:1.2rem; font-weight:bold; border-bottom:2px solid #bbf7d0; margin-top:15px; padding-bottom:5px; color:#166534;">Väylä ${i+1} <span style="color:#15803d; font-weight:normal; font-size:0.9rem;">(PAR ${par})</span></div>`; 
        if(h.holeResults) { 
            for(let pName in h.holeResults) { 
                let strokes = h.holeResults[pName]; 
                let diff = strokes - par;
                let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red'); 
                if (diff < -1) cClass = 'blue'; 
                html += `<div style="display:flex; justify-content:space-between; font-size:1.2rem; padding: 8px 0; align-items:center; color:#0f172a; font-weight: bold;"><span>${pName.substring(0, 12)}</span><span class="receipt-circle ${cClass}" style="width:32px; height:32px; font-size:1.2rem;">${strokes}</span></div>`; 
            } 
        } 
    }
    
    html += `</div></div>`;
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
    (window.allPlayers || []).filter(Boolean).forEach(p => {
        let dg = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
        html += `
        <div class="apple-setting-row" style="flex-direction:column; align-items:stretch; gap:12px; padding: 15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="font-weight:900; color:#1e293b; font-size:1.3rem;">${p.name}</div>
                <div style="text-align:right;">
                    <div style="font-size:1.4rem; font-weight:900; color:var(--warning); background:#1e293b; padding:4px 12px; border-radius:8px; margin-bottom:4px;">${p.score || 0} P</div>
                    <div style="font-size:1rem; font-weight:900; color:#fff; background:#475569; padding:2px 8px; border-radius:6px;">Tulos: ${dg}</div>
                </div>
            </div>
            <div style="display:flex; gap:8px; width:100%;">
                <button class="btn btn-warning btn-modern" style="flex:1; padding:8px; font-size:1rem; font-weight:900; color:#000; margin:0;" onclick="window.gmAdjustScore('${p.name}', 1)">+1 P</button>
                <button class="btn btn-warning btn-modern" style="flex:1; padding:8px; font-size:1rem; font-weight:900; color:#000; margin:0;" onclick="window.gmAdjustScore('${p.name}', -1)">-1 P</button>
            </div>
            <div style="display:flex; gap:8px; width:100%; margin-top:2px;">
                <button class="btn btn-secondary btn-modern" style="flex:1; padding:8px; font-size:0.9rem; font-weight:bold; margin:0;" onclick="window.gmAdjustDgScore('${p.name}', 1)">+1 Heitto</button>
                <button class="btn btn-secondary btn-modern" style="flex:1; padding:8px; font-size:0.9rem; font-weight:bold; margin:0;" onclick="window.gmAdjustDgScore('${p.name}', -1)">-1 Heitto</button>
            </div>
            <button class="btn btn-danger btn-modern" style="width:100%; padding:8px; font-size:0.9rem; font-weight:bold; margin-top:2px;" onclick="window.gmKickPlayer('${p.name}')">POTKI PELAAJA</button>
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
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px; border-radius:8px; border:2px solid #cbd5e1;">
            <div style="font-weight:900; font-size:0.9rem; color:#1e293b; border-left: 4px solid ${typeColor}; padding-left: 8px;">${c.n}</div>
            <div style="display:flex; align-items:center; gap: 6px;">
                <span style="font-weight:bold; font-size:0.85rem; color:#64748b;">Hinta (P)</span>
                <input type="number" id="price_${c.id}" value="${currentPrice}" style="width:60px; padding:6px; border-radius:6px; border:2px solid #94a3b8; text-align:center; font-weight:900; font-size:1rem; margin-bottom: 0;">
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
// PUHDAS CSS KARUSELLI JA NAPPULAT (VIUHKA)
// ==============================================
window.isFlipping = false;
window.flippedCards = new Set();

window.initNativeCarousel = function() {
    const container = el('cardCarousel');
    if(!container) return;
    
    const updateViuhka = () => {
        const center = container.scrollLeft + container.clientWidth / 2;
        const cards = container.querySelectorAll('.carousel-card-wrapper');
        
        let minDiff = Infinity;
        let activeIndex = 0;

        cards.forEach((card, index) => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            const diff = cardCenter - center;
            
            const maxDist = container.clientWidth * 0.7; 
            let percentage = diff / maxDist;
            if (percentage > 1) percentage = 1;
            if (percentage < -1) percentage = -1;
            
            const angle = percentage * 12; 
            const yOffset = Math.abs(percentage) * 15; 
            const scale = 1 - Math.abs(percentage) * 0.05; 
            const zIndex = 100 - Math.round(Math.abs(percentage) * 10);

            card.style.transform = `rotate(${angle}deg) translateY(${yOffset}px) scale(${scale})`;
            card.style.zIndex = zIndex;

            if (Math.abs(diff) < minDiff) {
                minDiff = Math.abs(diff);
                activeIndex = index;
            }
        });

        if (window.carouselCurrentIndex !== activeIndex && activeIndex >= 0 && activeIndex < window.carouselCards.length) {
            window.carouselCurrentIndex = activeIndex;
            if(window.renderCarouselActionButtons) window.renderCarouselActionButtons();
        }
    };

    container.addEventListener('scroll', () => { 
        requestAnimationFrame(updateViuhka);
    }, {passive: true});

    setTimeout(updateViuhka, 10);
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
                <li style="${isActive ? 'color:var(--warning); font-weight:bold; border-left:4px solid var(--warning); padding-left:8px;' : 'color:#ccc; opacity:0.8;'}">
                    <span class="lvl-tag" style="display:block; font-size:0.9rem;">TASO ${fc.level} ${isActive ? '(NYKYINEN)' : ''}</span>
                    <span style="font-size:1rem;">${fc.d}</span>
                </li>`;
        });
        
        let backHtml = `
            <div style="background:#1e293b; border: 4px solid #475569; width:100%; height:100%; border-radius:12px; display:flex; flex-direction:column; padding:15px; box-sizing:border-box; color:#fff;">
                <div style="font-size:1.6rem; font-weight:900; color:var(--warning); margin-bottom:15px; text-transform:uppercase; text-align:center; border-bottom:2px dashed #475569; padding-bottom:10px;">${cDef.n.split(' (')[0]}</div>
                <ul class="card-levels-list" style="flex:1; overflow-y:auto; list-style-type:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px;">
                    ${levelsHtml}
                </ul>
            </div>`;
        
        let extraHtml = `<div style="text-align:center; font-weight:900; color:#111; margin-top:auto; padding-bottom:10px; font-size:1.1rem;">🔄 KÄÄNNÄ (KATSO KAIKKI TASOT)</div>`;
        let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml, true);

        html += `
            <div class="carousel-card-wrapper" data-id="${cId}" onclick="window.flipCard(${i})">
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

// ==============================================
// NAPIT KARUSELLIN ALLE & SULJE NAPPI
// ==============================================
window.renderCarouselActionButtons = function() {
    let mode = window.carouselCurrentMode;
    let cId = window.carouselCards[window.carouselCurrentIndex];
    if(!cId) return;
    
    const me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let btnHtml = '';
    let cDef = window.allCards.find(c => c && c.id === cId);
    if(!cDef) return;

    let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cId) : cDef.playCost;
    let buyPrice = cDef.price;

    if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[cId] !== undefined) {
        playCost = window.gameSettings.cardPrices[cId];
        buyPrice = window.gameSettings.cardPrices[cId];
    }
    
    if (mode === 'sell') {
        let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cDef.id);
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
    else if (mode === 'shop') {
        const canAfford = me.score >= buyPrice;
        let actRes = me.reservations ? (Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations)).filter(Boolean) : [];
        let isResFull = actRes.length >= 2;

        btnHtml += `<button class="btn btn-success btn-modern" ${!canAfford?'disabled':''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-bottom:10px;" onclick="window.buyShopItem('${cId}', ${buyPrice}, false)">🛒 OSTA KORTTI (${buyPrice} P)</button>`;
        if (!isResFull) {
            btnHtml += `<button class="btn btn-primary btn-modern" style="width:100%; font-size:1.1rem; padding:15px; font-weight:bold; margin-bottom:10px;" onclick="window.reserveShopItem('${cId}'); document.getElementById('cardDetailModal').style.display='none';">🔒 VARAA MYÖHEMMÄKSI</button>`;
        }
    } 
    else if (mode === 'shop_res') {
        const canAfford = me.score >= buyPrice;
        btnHtml += `<button class="btn btn-success btn-modern" ${!canAfford?'disabled':''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-bottom:10px;" onclick="window.buyShopItem('${cId}', ${buyPrice}, true)">🛒 LUNASTA VARAUS (${buyPrice} P)</button>`;
        btnHtml += `<button class="btn btn-danger btn-modern" style="width:100%; font-size:1.1rem; padding:15px; font-weight:bold; margin-bottom:10px;" onclick="window.cancelReservation('${cId}'); document.getElementById('cardDetailModal').style.display='none';">❌ PERU VARAUS</button>`;
    }
    
    btnHtml += `<button class="btn btn-secondary btn-modern" style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-top:15px; background:#1e293b; color:#fff; border-color:#475569;" onclick="document.getElementById('cardDetailModal').style.display='none';">❌ SULJE NÄKYMÄ</button>`;
    
    let container = el('cardDetailActionArea');
    if(container) container.innerHTML = btnHtml;
};

// ==============================================
// SCORE SYÖTTÖ MODAALI JA KÄSIRAJA VAROITUS
// ==============================================
window.showHandLimitModal = function(cards) {
    if(!el('handLimitModal')) return;
    let limit = window.gameSettings ? (window.gameSettings.handLimit || 6) : 6;
    let countEl = el('handLimitCount');
    if(countEl) countEl.innerText = `${cards.length} / ${limit}`;
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
                <div style="font-size:1rem; font-weight:900; color:#000;">${cDef.n.split(' (')[0]}</div>
            </div>
            <button class="btn btn-danger btn-modern" style="width:auto; padding:8px 12px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}')">♻️ MYY (+${sellReward} P)</button>
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
    let hNumEl = el('scoreModalHoleNum');
    let hParEl = el('scoreModalPar');
    if(hNumEl) hNumEl.innerText = window.currentHoleIndex; 
    if(hParEl) hParEl.innerText = par; 
    
    let taskInfoHtml = '';
    if (window.activeHole && window.activeHole.rule) {
        let r = window.activeHole.rule;
        let icon = r.type === 'bounty' ? '🏆' : '🎲';
        taskInfoHtml = `
        <div style="background:#e0f2fe; border:2px solid #0284c7; border-radius:8px; padding:12px; margin-bottom:20px; text-align:left; font-family:'Inter', sans-serif;">
            <div style="color:#0284c7; font-weight:900; font-size:0.8rem; text-transform:uppercase; margin-bottom:4px;">${icon} VÄYLÄN HAASTE</div>
            <div style="color:#0f172a; font-weight:900; font-size:1.1rem; margin-bottom:2px;">${r.n}</div>
            <div style="color:#334155; font-size:0.9rem; font-weight:600; line-height:1.3;">${r.d}</div>
        </div>`;
    }
    
    let html = taskInfoHtml; 
    let taskCheckboxes = '';
    
    (window.allPlayers || []).filter(Boolean).forEach((p, i) => {
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
