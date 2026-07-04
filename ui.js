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
        let shopScale = Math.min(1.0, w / 600);
        let maxHScale = (h - 180) / 900; 
        shopScale = Math.min(shopScale, maxHScale);
        if(shopScale < 0.4) shopScale = 0.4;
        shopWrapper.style.transform = `scale(${shopScale})`;
    }
    
    let binderWrapper = el('binder-scale-wrapper');
    if(binderWrapper) binderWrapper.style.transform = `scale(${Math.min(1.0, w / 550)})`;
    
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
            <div style="background:var(--danger); color:#fff; padding:15px; border-radius:8px; font-weight:900; font-size:1.2rem; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.4); margin-bottom:10px;">
                SUORITTAJA:<br><span style="font-size:1.8rem; font-family:'Kalam', cursive;">${target}</span>
                <div style="font-size:0.85rem; margin-top:5px; opacity:0.9;">(Määrääjä: ${by})</div>
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
    toast.classList.add('show'); 
    if (navigator.vibrate) navigator.vibrate(150); // Värinä efekti!
    setTimeout(() => { toast.classList.remove('show'); }, 3000); 
};

window.showNotification = function(message, type = 'info') { 
    const container = el('notificationContainer'); 
    if(!container) return; 
    const toast = document.createElement('div'); 
    toast.className = `notification ${type}`; 
    toast.innerHTML = `<span>${message}</span>`; 
    container.appendChild(toast); 
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Tuplavärinä!
    setTimeout(() => { toast.remove(); }, 6000); 
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
    let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : (cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2));
    let lockedStyle = isLocked ? 'opacity: 0.5; filter: grayscale(50%);' : '';
    
    let dimensions = isCarousel ? 'width: 100%; height: 100%; box-sizing: border-box; display:flex; flex-direction:column;' : 'width: 190px; height: 290px;';
    let titleSize = isCarousel ? 'font-size: 1.8rem;' : '';
    let descSize = isCarousel ? 'font-size: 1.1rem; flex: 1;' : '';
    
    return `
    <div class="physical-card ${typeClass}" style="${lockedStyle} ${dimensions} margin: 0 auto;">
        <div class="card-header ${typeName}">
            <span>${typeIcon} ${cDef.type === 'buff' ? 'HELPOTUS' : 'SABOTAASI'}</span><span>TASO ${cDef.level || 1}</span>
        </div>
        <div class="card-body ${typeName}" style="justify-content: flex-start; flex: 1; display:flex; flex-direction:column;">
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

    let html = `<div class="mini-corkboard">`; // Uusi taustalevy väylälle!

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
        let pSize = ruleLen > 80 ? '0.95rem' : '1.15rem';
        let pLh = ruleLen > 80 ? '1.25' : '1.4';

        html += `
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg); margin-bottom: 30px; width: 90%; max-width: 340px;" onclick="event.stopPropagation(); window.showZoomModal(this.outerHTML)">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: ${pSize}; line-height: ${pLh}; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    // 3. PELATUT KORTIT
    let playedCards = [];
    if (hData.playedCards) { playedCards = Object.values(hData.playedCards).filter(Boolean); }
    
    if(playedCards.length > 0) {
        let myCards = []; let otherCards = [];
        playedCards.forEach(pc => { if (pc.target === window.myName || pc.target === 'KAIKKI VASTUSTAJAT') { myCards.push(pc); } else { otherCards.push(pc); } });

        if (myCards.length > 0) {
            html += `<div style="width: 100%; max-width:380px; margin-bottom: 20px; display:flex; flex-wrap:wrap; justify-content:center; gap:15px; padding: 10px;">`;
            myCards.forEach((pc, idx) => {
                let cRot = (window.pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(window.pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
                
                let extraHtml = `<div style="background:rgba(0,0,0,0.8); color:#fff; padding:6px; border-radius:4px; font-size:0.75rem; text-align:center; font-weight:bold; margin-top:auto; width:100%; box-sizing:border-box;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}<br><span style="font-weight:normal; color:#ccc;">(Käyttäjä: ${pc.by})</span></div>`;
                let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml);

                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg); cursor:pointer;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    <div style="transform: scale(0.85); transform-origin: top center;">
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
                <div style="background:rgba(0,0,0,0.05); padding:8px; border-radius:6px; font-size:0.85rem; border-left: 5px solid ${typeColor}; cursor:pointer;" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <b style="font-size:1rem;">${typeIcon} ${pc.cardName}</b><br>
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
                <span style="font-size:1.1rem; color:var(--warning); font-weight:900;">${displayScore}</span>
                <div class="score-display-paper" style="width:auto !important; min-width:38px; height:38px !important; font-size:1.3rem !important; margin-left:auto; padding:0 5px;">${scoreHTML}</div>
            </div>
        </div>`;
    });
    html += `</div>`;

    // 5. PALKKALASKELMA (Näytetään automaattisesti taulun pohjalla)
    if (!isCurrent && window.myName && hData.pointBreakdowns && hData.pointBreakdowns[window.myName]) {
        let myBreakdown = hData.pointBreakdowns[window.myName];
        let deltaColor = myBreakdown.delta >= 0 ? '#16a34a' : '#dc2626';
        let sign = myBreakdown.delta > 0 ? '+' : '';
        let rowsHtml = '';
        
        if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
            myBreakdown.summary.split(', ').forEach(part => {
                let kv = part.split(': ');
                if(kv.length === 2) { 
                    rowsHtml += `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #cbd5e1; padding:6px 0;"><span style="color:#475569;">${kv[0]}</span><span style="font-weight:900; color:#1e293b; font-size:1.1rem;">${kv[1]}</span></div>`; 
                } else { 
                    rowsHtml += `<div style="padding:6px 0; color:#475569; font-weight:bold;">${part}</div>`; 
                }
            });
        } else { 
            rowsHtml += `<div style="padding:15px 0; color:#475569; text-align:center; font-style:italic; font-weight:bold;">Ei tapahtumia tällä jaksolla.</div>`; 
        }

        html += `
        <div class="payslip-paper" style="background:#fff; border:1px solid #cbd5e1; border-radius:2px; transform: rotate(-0.5deg); margin-bottom: 20px; width: 95%; max-width: 360px; padding: 25px; box-shadow: 5px 15px 30px rgba(0,0,0,0.3); z-index:30; position:relative; font-family:'Courier Prime', monospace;">
            <div style="border-bottom: 3px dashed #1e293b; padding-bottom: 10px; margin-bottom: 12px; text-align:center;">
                <div style="font-weight:900; font-size:1.5rem; color:#1e293b; letter-spacing:1px; text-transform:uppercase;">Palkkalaskelma</div>
                <div style="font-size:0.9rem; color:#64748b; margin-top:4px; font-weight:bold;">Kausi: Väylä ${hIndex}</div>
            </div>
            <div style="margin-bottom:15px; font-size:1.1rem; color:#1e293b;">
                <span style="font-weight:900;">Työntekijä:</span> ${window.myName.toUpperCase()}
            </div>
            <div style="font-size:1rem; margin-bottom:20px; border-top:2px solid #94a3b8; padding-top:10px;">${rowsHtml}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:15px; border-radius:6px; border:3px solid ${deltaColor};">
                <span style="font-weight:900; font-size:1.1rem; color:#334155;">NETTOPALKKA</span>
                <span style="font-weight:900; font-size:1.8rem; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
            </div>
        </div>`;
    }

    html += `</div>`; // Suljetaan mini-corkboard
    container.innerHTML = html;
};

// ==============================================
// PALKKALASKELMA NÄKYMÄ (Erillinen välilehti - Hakee aina valmiin)
// ==============================================
window.renderPayslipView = function(hIndex) {
    let container = el('payslip-content');
    if(!container) return;
    
    // Etsitään uusin tallennettu väylä (koska nykyinen on kesken)
    let lastCompletedIndex = window.currentHoleIndex > 1 ? window.currentHoleIndex - 1 : 1;
    let viewIndex = hIndex === window.currentHoleIndex ? lastCompletedIndex : hIndex;

    if (window.currentHoleIndex === 1 && !window.gameHistory[0]) {
        container.innerHTML = `
        <div style="background:#fff; padding:30px; border-radius:8px; border:2px dashed #94a3b8; text-align:center; box-shadow:0 10px 20px rgba(0,0,0,0.3); width: 90%; max-width: 350px;">
            <div style="font-size:3rem; margin-bottom:10px;">⏳</div>
            <h2 style="color:#334155; font-size:1.3rem; font-weight:900;">Palkkaa ei ole vielä jaettu</h2>
            <p style="color:#64748b; font-weight:bold;">Ensimmäinen palkkalaskelma ilmestyy tähän, kun väylä 1 on valmis.</p>
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
    let sign = myBreakdown.delta > 0 ? '+' : '';
    let rowsHtml = '';
    
    if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
        myBreakdown.summary.split(', ').forEach(part => {
            let kv = part.split(': ');
            if(kv.length === 2) { 
                rowsHtml += `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #cbd5e1; padding:8px 0;"><span style="color:#475569;">${kv[0]}</span><span style="font-weight:900; color:#1e293b; font-size:1.1rem;">${kv[1]}</span></div>`; 
            } else { 
                rowsHtml += `<div style="padding:8px 0; color:#475569; font-weight:bold;">${part}</div>`; 
            }
        });
    } else { 
        rowsHtml += `<div style="padding:15px 0; color:#475569; text-align:center; font-style:italic; font-weight:bold;">Ei tapahtumia tällä jaksolla.</div>`; 
    }

    container.innerHTML = `
    <div class="payslip-paper" style="background:#fff; border:1px solid #cbd5e1; border-radius:2px; transform: rotate(-0.5deg); margin-top: 20px; margin-bottom: 40px; width: 95%; max-width: 380px; padding: 25px; box-shadow: 5px 15px 30px rgba(0,0,0,0.4); z-index:30; position:relative; font-family:'Courier Prime', monospace;">
        <div style="border-bottom: 3px dashed #1e293b; padding-bottom: 12px; margin-bottom: 15px; text-align:center;">
            <div style="font-weight:900; font-size:1.8rem; color:#1e293b; letter-spacing:2px; text-transform:uppercase;">Palkkalaskelma</div>
            <div style="font-size:1rem; color:#64748b; margin-top:6px; font-weight:bold;">Kausi: Väylä ${viewIndex}</div>
        </div>
        <div style="margin-bottom:15px; font-size:1.1rem; color:#1e293b;">
            <span style="font-weight:900;">Työntekijä:</span> ${window.myName.toUpperCase()}
        </div>
        <div style="font-size:1rem; margin-bottom:20px; border-top:2px solid #94a3b8; padding-top:10px;">${rowsHtml}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:15px; border-radius:6px; border:3px solid ${deltaColor};">
            <span style="font-weight:900; font-size:1.3rem; color:#334155;">NETTOPALKKA</span>
            <span style="font-weight:900; font-size:2rem; color:${deltaColor};">${sign}${myBreakdown.delta} P</span>
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
        cardsHtml = '<p style="color:#555; font-size:1.4rem; text-align:center; padding:50px; font-weight:bold; grid-column: 1 / -1;">Kansiosi on tyhjä.</p>';
    } else {
        myCards.forEach((cId) => {
            let cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 KATSO TASOT / PELAA</div>`;
            let fullCardHtml = window.generateCardHTML(cDef, isLocked, extraHtml, false);

            cardsHtml += `
            <div class="plastic-sleeve" style="cursor:pointer; transform: scale(0.8); transform-origin: top center; margin-bottom:-40px;" onclick="window.openCardDetail('${cId}', 'sell')">
                ${fullCardHtml}
            </div>`;
        });
    }

    wrapper.innerHTML = `
    <div class="board-binder" style="width: 500px; min-height: 800px; padding-top: 20px; padding-bottom: 20px; background: radial-gradient(circle at center, #3e2723 0%, #211412 100%); margin: 0 auto;">
        <div class="binder-spine" style="position: absolute; top: 0; bottom: 0; left: 0; z-index: 30; width: 40px; background: linear-gradient(to right, #111, #222, #111); display:flex; flex-direction:column; justify-content:space-evenly; align-items:center;">
            <div class="binder-ring" style="margin-top: 50px;"></div>
            <div class="binder-ring"></div>
            <div class="binder-ring" style="margin-bottom: 50px;"></div>
        </div>
        <div class="binder-page" style="margin-left: 35px; margin-right: 15px; padding: 25px; border-radius: 4px 12px 12px 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1), 5px 5px 15px rgba(0,0,0,0.6);">
            <h2 style="color:#111; font-size:2rem; margin-bottom:20px; font-family:'Kalam', cursive; border-bottom:3px dashed #ccc; padding-bottom:10px; text-align:center;">OMAT KORTIT</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%;">
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
        shelvesHtml += `<div style="display:flex; justify-content:space-around; align-items:flex-end; padding-bottom:10px; border-bottom: 8px solid #1e293b; position:relative; height: 185px; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.5));">`;
        
        // Automaatin spiraalit
        shelvesHtml += `<div style="position:absolute; bottom:40px; left:0; width:100%; height:30px; background:repeating-linear-gradient(90deg, transparent, transparent 15px, #94a3b8 15px, #94a3b8 22px); z-index:1; opacity:0.6; filter:drop-shadow(0 5px 5px #000);"></div>`;

        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.9rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                
                shelvesHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="transform: scale(0.50); transform-origin: bottom center; cursor:pointer; width:190px; margin-bottom:-70px;" onclick="window.openCardDetail('${item.id}', 'shop')">
                            ${fullCardHtml}
                        </div>
                        
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 2px 8px; border-radius: 4px; border: 2px solid #22c55e; font-weight: 900; font-size: 1rem; margin-top: 5px; box-shadow: 0 0 5px rgba(34,197,94,0.5); z-index: 15;">${item.price} P</div>
                        
                        <div style="display:flex; gap:5px; margin-top:8px; width:100%; justify-content:center;">
                            <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:6px; font-size:0.8rem; font-weight:900; margin:0;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-primary" style="padding:6px; font-size:0.8rem; font-weight:900; margin:0;" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="width:190px; height:290px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:10px; border:4px dashed #333; transform: scale(0.50); transform-origin: bottom center; margin-bottom:-70px;">
                            <div style="color:#666; font-weight:900; font-size:2.5rem; letter-spacing:2px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 2px 8px; border-radius: 4px; border: 2px solid #444; font-weight: 900; font-size: 1rem; margin-top: 5px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `
        <div style="margin-top:20px; background: rgba(0,0,0,0.5); border: 2px dashed #475569; border-radius: 8px; padding: 15px;">
            <div style="color:#94a3b8; font-weight:bold; text-align:center; margin-bottom:10px; font-size:0.9rem; text-transform:uppercase;">Varatut Tuotteet</div>
            <div style="display:flex; justify-content:space-around; width:100%; gap:15px;">`;
            
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
            let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
            
            reserveHtml += `
                <div style="width:45%; display:flex; flex-direction:column; align-items:center;">
                    <div style="transform: scale(0.55); margin-bottom:-60px; transform-origin: top center; cursor:pointer; width:190px; position:relative;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div style="position:absolute; top:-20px; right:-20px; background:#eab308; color:#000; padding:10px 15px; font-weight:900; font-size: 1.2rem; border-radius:8px; z-index:30; border: 3px solid #fff;">🔒 VARATTU</div>
                        ${fullCardHtml}
                    </div>
                    <div style="background: #000; color: #eab308; font-family: 'Courier Prime', monospace; padding: 4px 10px; border-radius: 4px; border: 2px solid #eab308; font-weight: 900; font-size: 1.1rem; margin-top: 5px; text-align: center; margin-bottom:8px;">${resItem.price} P</div>
                    <div style="display:flex; gap:5px; width:100%; justify-content:center;">
                        <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:6px; font-size:0.8rem; font-weight:900; margin:0;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                        <button class="btn btn-danger" style="padding:6px; font-size:0.8rem; font-weight:900; margin:0;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    wrapper.innerHTML = `
    <div style="position: relative; width: 600px; background: #111827; border: 15px solid #020617; border-bottom: 40px solid #000; border-radius: 12px 12px 0 0; padding: 20px; box-shadow: 15px 25px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.05); display: flex; flex-direction: column; z-index:20; margin: 0 auto;">
        
        <div style="background: linear-gradient(135deg, #000, #111); padding: 15px; border-radius: 8px; border: 4px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; box-shadow: inset 0 0 15px rgba(239,68,68,0.2);">
            <div style="display:flex; align-items:center; gap: 15px;">
                <div style="font-size:2.5rem; text-shadow: 0 0 10px rgba(255,255,255,0.5);">🥨</div>
                <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:2.2rem; letter-spacing: 2px; text-shadow: 0 0 10px #ef4444;">FRIBAMART SNACKS</div>
            </div>
            <div style="background: #000; padding: 8px 12px; border-radius: 6px; border: 2px solid #333;">
                <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:1.6rem; font-weight:900; text-shadow: 0 0 8px #22c55e;">${myPoints} P</div>
            </div>
        </div>

        <div style="background: #020617; border-radius: 8px; border: 8px solid #0f172a; padding: 10px 10px 0 10px; position:relative; box-shadow: inset 0 10px 30px #000;">
            <div style="position:absolute; top:0; left:-20%; width:150%; height:100%; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.05) 50%, transparent 55%); pointer-events:none; z-index:40;"></div>
            ${shelvesHtml}
        </div>

        <div style="height: 140px; margin-top: 20px; display:flex; gap:20px;">
            <div style="width: 140px; background: #000; border-radius: 8px; border: 4px solid #1e293b; padding: 12px; display:flex; flex-direction:column; align-items:center; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
                <div style="width: 100%; height: 26px; background: #0f172a; border: 2px solid #334155; margin-bottom: 12px; color:#22c55e; font-family:'Courier Prime', monospace; font-weight:bold; font-size:1rem; text-align:right; padding-right:5px; line-height:22px;">12.00</div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width:100%;">
                    ${Array(9).fill('<div style="background: #334155; height:18px; border-radius:4px; border-bottom:3px solid #0f172a;"></div>').join('')}
                </div>
            </div>
            
            <div style="flex: 1; background: #000; border-radius: 8px; border: 6px solid #111; position:relative; box-shadow: inset 0 20px 30px #000;">
                <div style="position:absolute; top:0; left:0; right:0; height: 80px; background: #1a1a1a; border-bottom: 3px solid #000; display:flex; justify-content:center; align-items:center; transform-origin: top; transform: rotateX(-15deg);">
                    <span style="color:#444; font-weight:900; font-size:2rem; letter-spacing:10px; text-shadow:-1px -1px 0 #000;">PUSH</span>
                </div>
            </div>
        </div>

        ${reserveHtml}
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
                <div style="font-size:1.1rem; font-weight:900; color:var(--warning); margin-bottom:15px; text-transform:uppercase; text-align:center; border-bottom:2px dashed #475569; padding-bottom:10px;">${cDef.n.split(' (')[0]}</div>
                <ul class="card-levels-list" style="flex:1; overflow-y:auto; list-style-type:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px;">
                    ${levelsHtml}
                </ul>
            </div>`;
        
        let extraHtml = `<div style="text-align:center; font-weight:900; color:#111; margin-top:auto; padding-bottom:10px; font-size:0.8rem;">🔄 KÄÄNNÄ (KATSO KAIKKI TASOT)</div>`;
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
            let canAfford = me.score >= cDef.price; 
            let isRes = mode === 'shop_res';
            btnHtml += `<button class="btn ${canAfford ? 'btn-warning' : 'btn-secondary'}" ${!canAfford ? 'disabled' : ''} style="width:100%; font-size:1.2rem; padding:20px; font-weight:900; margin-bottom:10px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cDef.id}', ${cDef.price}, ${isRes})">OSTA AUTOMAATISTA (${cDef.price} P)</button>`;
        }
    }
    
    el('cardDetailActionArea').innerHTML = btnHtml;
};

window.openCardDetail = function(cId, mode) {
    const me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    window.flippedCards = new Set(); 
    
    if (mode === 'sell') {
        window.carouselCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
        if (typeof window.getCardSortWeight === 'function') {
            window.carouselCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));
        }
    } else if (mode === 'shop') {
        let shopCards = window.activeHole && window.activeHole.shop && window.activeHole.shop[window.myName] ? window.activeHole.shop[window.myName] : [];
        window.carouselCards = shopCards.filter(Boolean).map(c => c.id);
    } else if (mode === 'shop_res') {
        window.carouselCards = me && me.reservations ? (Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations)).filter(Boolean) : [];
    } else {
        window.carouselCards = [cId]; 
    }
    
    window.carouselCurrentMode = mode; 
    window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.renderCarousel(); 
    window.showModalSafe('cardDetailModal');
    window.renderCarouselActionButtons();
    
    setTimeout(() => {
        if(window.initNativeCarousel) window.initNativeCarousel();
        const container = el('cardCarousel');
        if(container) { 
            container.scrollLeft = (window.carouselCurrentIndex * 320); 
            container.dispatchEvent(new Event('scroll'));
        }
    }, 50);
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
