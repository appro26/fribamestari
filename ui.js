// ==============================================
// KÄYTTÖLIITTYMÄN RENDERÖINTI JA MODAALIT (ui.js)
// ==============================================

var el = id => document.getElementById(id);

// GPU-optimoinnit ja staattinen tausta (yhdistetty patches.js-tiedostosta)
document.addEventListener('DOMContentLoaded', () => {
    let styleFix = document.getElementById('patch-styles');
    if(!styleFix) {
        styleFix = document.createElement('style');
        styleFix.id = 'patch-styles';
        document.head.appendChild(styleFix);
    }
    styleFix.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #cbd5e1; overflow: hidden; touch-action: none; overscroll-behavior: none; }
        #corkboard-viewport { width: 100vw; height: 100vh; position: absolute; top:0; left:0; z-index: 5; touch-action: none; }
        #corkboard-surface { transform-origin: 0 0; border: none !important; background: transparent !important; }
        .is-dragging * { pointer-events: none !important; }
        #cardDetailModal { padding-bottom: 120px !important; justify-content: flex-start !important; padding-top: 5vh !important; }
        .fixed-close-btn { bottom: 20px !important; width: 90% !important; max-width: 400px !important; border-radius: 16px !important; padding: 18px !important; font-size: 1.3rem !important; box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important; }
    `;

    let roomBg = document.getElementById('fixed-room-bg');
    if(!roomBg) {
        roomBg = document.createElement('div');
        roomBg.id = 'fixed-room-bg';
        document.body.insertBefore(roomBg, document.body.firstChild);
    }
    roomBg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; background: linear-gradient(to bottom, #cbd5e1 55%, #334155 55%, #1e293b 100%); pointer-events:none;";
});

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
    setTimeout(() => { toast.classList.remove('show'); }, 2000); 
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

// ==============================================
// KORTIN GENEROINTI (VISUAALINEN POHJA)
// ==============================================
window.generateCardHTML = function(cDef, isLocked = false, extraBottomHtml = '', isCarousel = false) {
    if (!cDef) return '';
    let typeClass = `tier-${cDef.level || 1}`;
    let typeIcon = cDef.type === 'buff' ? '🛡️' : '💥';
    let typeName = cDef.type === 'buff' ? 'buff' : 'sabotage';
    let safeCardName = cDef.n ? cDef.n.split(' (')[0] : '';
    let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : (cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2));
    let lockedStyle = isLocked ? 'opacity: 0.5; filter: grayscale(50%);' : '';
    
    let dimensions = isCarousel ? 'width: 100%; height: 100%; box-sizing: border-box; display:flex; flex-direction:column;' : 'width: 175px; height: 260px;';
    let titleSize = isCarousel ? 'font-size: 1.5rem;' : '';
    let descSize = isCarousel ? 'font-size: 1rem; flex: 1;' : '';
    
    return `
    <div class="physical-card ${typeClass}" style="${lockedStyle} ${dimensions} margin: 0 auto; box-shadow: 0 8px 16px rgba(0,0,0,0.4);">
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
// VÄYLÄSOLUJEN RENDERÖINTI
// ==============================================
window.getHoleCellHTML = function(hData, hIndex, isActive, isHistory) {
    let clickAttr = `onclick="window.zoomToHole(${hIndex})" style="cursor:pointer;"`;
    let html = `<div class="hole-cell" ${clickAttr}>`;
    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[hIndex - 1] || 3) : 3;
    
    let rot1 = (window.pseudoRandom(hIndex * 1.1) * 6 - 3).toFixed(1);
    let rot2 = (window.pseudoRandom(hIndex * 2.2) * 6 - 3).toFixed(1);
    let rot3 = (window.pseudoRandom(hIndex * 3.3) * 6 - 3).toFixed(1);

    let activeStyle = isActive ? `z-index: 25;` : `z-index: 5;`;
    html += `<div class="index-card" style="transform: rotate(${rot1}deg); position: relative; ${activeStyle}">`;
    html += `<div class="banner-subtitle">${window.currentCourse ? window.currentCourse.name : ''}</div><div class="banner-title">VÄYLÄ <span>${hIndex}</span></div><div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>`;
    
    if (isActive && hData.penColor) {
        html += `<div class="pen-container" onclick="event.stopPropagation(); window.openScoreModal();"><div class="pen-string"></div><div class="pen-body" style="background: linear-gradient(to right, ${hData.penColor.c1}, ${hData.penColor.c2}, ${hData.penColor.c1});"><span class="pen-text">MERKKAA</span></div></div>`;
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
    if (hData.playedCards) { playedCards = Object.values(hData.playedCards).filter(Boolean); }
    
    if(playedCards.length > 0) {
        let myCards = []; let otherCards = [];
        playedCards.forEach(pc => { if (pc.target === window.myName || pc.target === 'KAIKKI VASTUSTAJAT') { myCards.push(pc); } else { otherCards.push(pc); } });

        if (myCards.length > 0) {
            html += `<div style="width: 100%; max-width:360px; margin-bottom: 15px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px;">`;
            myCards.forEach((pc, idx) => {
                let cRot = (window.pseudoRandom((hIndex + idx) * 4.4) * 10 - 5).toFixed(1); 
                let pinLeft = 50 + (Math.floor(window.pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                let encodedBy = pc.by ? pc.by.replace(/"/g, '&quot;') : '';
                let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
                
                let extraHtml = `<div style="background:rgba(0,0,0,0.8); color:#fff; padding:6px; border-radius:4px; font-size:0.75rem; text-align:center; font-weight:bold; margin-top:auto; width:100%; box-sizing:border-box;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}<br><span style="font-weight:normal; color:#ccc;">(Käyttäjä: ${pc.by})</span></div>`;
                let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml);

                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg);" onclick="event.stopPropagation(); window.showEventCard('${pc.cardId}', '${encodedTarget}', '${encodedBy}')">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    ${fullCardHtml}
                </div>`;
            });
            html += `</div>`;
        }

        if (otherCards.length > 0) {
            let pRot = (window.pseudoRandom(hIndex * 1.5) * 4 - 2).toFixed(1);
            html += `
                <div style="width: 100%; max-width:300px; margin-top: 15px; margin-bottom: 15px; position:relative; background:var(--paper-bg); padding:10px; box-shadow: 2px 4px 10px rgba(0,0,0,0.2); border-radius:2px; transform: rotate(${pRot}deg);">
                    <div class="tape tape-top" style="--rot:-2deg;"></div>
                    <h2 style="color:var(--text-main); font-size:0.95rem; margin-bottom:10px; border-bottom:2px dashed #ccc; padding-bottom:5px; font-family:'Kalam', cursive; text-align:center;">PELITAPAHTUMAT</h2>
                    <div style="display:flex; flex-direction:column; gap:6px;">`;
            
            otherCards.forEach((pc) => {
                let typeIcon = pc.type === 'buff' ? '🛡️' : '💥';
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

    let playersToRender = hData.players || window.allPlayers;
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
        let displayScore = (p.name === window.myName) ? `${p.score || 0} P` : `?? P`;
        
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
    
    if (isHistory && window.myName && hData.pointBreakdowns && hData.pointBreakdowns[window.myName]) {
        let myBreakdown = hData.pointBreakdowns[window.myName];
        let deltaColor = myBreakdown.delta >= 0 ? '#16a34a' : '#dc2626';
        let sign = myBreakdown.delta > 0 ? '+' : '';
        let rowsHtml = '';
        if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
            myBreakdown.summary.split(', ').forEach(part => {
                let kv = part.split(': ');
                if(kv.length === 2) { rowsHtml += `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #cbd5e1; padding:6px 0;"><span style="color:#475569;">${kv[0]}</span><span style="font-weight:700; color:#1e293b;">${kv[1]}</span></div>`; } 
                else { rowsHtml += `<div style="padding:6px 0; color:#475569;">${part}</div>`; }
            });
        } else { rowsHtml += `<div style="padding:6px 0; color:#475569; text-align:center; font-style:italic;">Ei tapahtumia tällä jaksolla.</div>`; }

        html += `
        <div class="payslip-paper" style="background:#fff; border:1px solid #cbd5e1; border-radius:2px; transform: rotate(-0.5deg); margin-top: 25px; margin-bottom: 20px; width: 100%; max-width: 340px; padding: 20px; box-shadow: 2px 4px 12px rgba(0,0,0,0.15); z-index:30; position:relative; font-family:'Courier Prime', monospace;">
            <div style="border-bottom: 2px dashed #1e293b; padding-bottom: 8px; margin-bottom: 12px; text-align:center;">
                <div style="font-weight:900; font-size:1.4rem; color:#1e293b; letter-spacing:1px; text-transform:uppercase;">Palkkalaskelma</div>
                <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">Kausi: Väylä ${hIndex}</div>
            </div>
            <div style="margin-bottom:12px; font-size:0.95rem; color:#1e293b;">
                <span style="font-weight:bold;">Työntekijä:</span> ${window.myName.toUpperCase()}
            </div>
            <div style="font-size:0.85rem; margin-bottom:15px; border-top:1px solid #94a3b8; padding-top:8px;">${rowsHtml}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:10px; border-radius:4px; border:2px solid ${deltaColor};"><span style="font-weight:800; font-size:1.1rem; color:#334155;">NETTOPALKKA</span><span style="font-weight:900; font-size:1.5rem; color:${deltaColor};">${sign}${myBreakdown.delta} P</span></div>
        </div>`;
    }
    html += `</div>`;
    return html;
};

// ==============================================
// TAULUN KIINTEÄT ELEMENTIT (Kansio, Automaatti, Kuitit)
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
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.75rem; color:#111; margin-top:auto; padding-top:10px;">🔄 KATSO TASOT / PELAA</div>`;
            let fullCardHtml = window.generateCardHTML(cDef, isLocked, extraHtml);

            cardsHtml += `
            <div class="plastic-sleeve" style="cursor:pointer;" onclick="window.openCardDetail('${cId}', 'sell')">
                ${fullCardHtml}
            </div>`;
        });
    }

    wrapper.innerHTML = `
    <div class="board-binder" style="width: 500px; min-height: 800px; padding-top: 20px; padding-bottom: 20px; background: radial-gradient(circle at center, #3e2723 0%, #211412 100%);">
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
        shelvesHtml += `<div style="display:flex; justify-content:space-around; padding: 30px 0; border-bottom: 12px solid #020617; background: #1e293b; border-radius: 6px; margin-bottom: 30px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">`;
        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                
                shelvesHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center;">
                        <div style="transform: scale(1.4); cursor:pointer; width:175px; margin-bottom: 80px; transform-origin: top center;" onclick="window.openCardDetail('${item.id}', 'shop')">
                            ${fullCardHtml}
                        </div>
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 6px; border: 4px solid #22c55e; font-weight: 900; font-size: 1.8rem; margin-top: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); text-align: center; margin-bottom: 15px;">${item.price} P</div>
                        <div style="display:flex; flex-direction:column; gap:10px; width:90%;">
                            <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:15px; font-size:1.3rem; font-weight:900;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-primary" style="padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center;">
                        <div style="width:175px; height:260px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:8px; border:4px dashed #333; transform: scale(1.4); margin-bottom: 80px; transform-origin: top center;">
                            <div style="color:#666; font-weight:900; font-size:2rem; letter-spacing:4px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 6px; border: 4px solid #444; font-weight: 900; font-size: 1.8rem; margin-top: 10px; text-align: center; margin-bottom: 15px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `<div style="margin-top:40px; border-top: 6px dashed #475569; padding-top: 40px;"><div style="display:flex; justify-content:space-around; width:100%; gap:20px;">`;
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
            let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
            
            reserveHtml += `
                <div style="width:45%; display:flex; flex-direction:column; align-items:center; background: rgba(0,0,0,0.3); padding: 30px 15px; border-radius: 12px; border: 3px solid #334155;">
                    <div style="transform: scale(1.3); margin-bottom: 70px; cursor:pointer; width:175px; transform-origin: top center; position:relative;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div style="position:absolute; top:-20px; right:-20px; background:#eab308; color:#000; padding:8px 12px; font-weight:900; font-size: 1.1rem; border-radius:8px; z-index:30; border: 3px solid #fff;">🔒 VARATTU</div>
                        ${fullCardHtml}
                    </div>
                    <div style="background: #000; color: #eab308; font-family: 'Courier Prime', monospace; padding: 10px 20px; border-radius: 6px; border: 4px solid #eab308; font-weight: 900; font-size: 1.8rem; margin-top: 10px; text-align: center; margin-bottom:15px;">${resItem.price} P</div>
                    <div style="display:flex; flex-direction:column; gap:10px; width:90%;">
                        <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:15px; font-size:1.3rem; font-weight:900;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                        <button class="btn btn-danger" style="padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    wrapper.innerHTML = `
    <div style="position: relative; width: 650px; background: #0f172a; border: 15px solid #000; border-bottom: 60px solid #050505; border-radius: 20px; padding: 40px 30px; box-shadow: 20px 30px 50px rgba(0,0,0,0.6); display: flex; flex-direction: column; z-index:20;">
        <div style="background: #000; padding: 25px 30px; border-radius: 12px; border: 6px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom: 40px;">
            <div style="display:flex; align-items:center; gap: 20px;">
                <div style="width: 25px; height: 25px; border-radius: 50%; background: #22c55e;"></div>
                <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:3rem; letter-spacing: 4px;">FRIBAMART</div>
            </div>
            <div style="background: #111; padding: 15px 25px; border-radius: 10px; border: 3px solid #333;">
                <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:2.5rem; font-weight:900;">${myPoints} P</div>
            </div>
        </div>

        <div style="background: #020617; border-radius: 12px; border: 12px solid #050505; padding: 30px;">
            ${shelvesHtml}
        </div>

        <div style="height: 250px; margin-top: 50px; display:flex; gap:40px; align-items:flex-start;">
            <div style="flex: 1; background: #050505; border-radius: 12px; border: 8px solid #111; position:relative; height: 200px;">
                <div style="position:absolute; top:0; left:0; right:0; height: 80px; background: #1a1a1a; border-bottom: 4px solid #000; display:flex; justify-content:center; align-items:center;">
                    <span style="color:#333; font-weight:900; font-size:2.5rem; letter-spacing:15px;">PUSH</span>
                </div>
            </div>
            <div style="width: 180px; background: #111; border-radius: 12px; border: 6px solid #000; padding: 30px; display:flex; flex-direction:column; align-items:center;">
                <div style="width: 20px; height: 60px; background: #000; border-radius: 10px; border: 4px solid #333; margin-bottom: 40px;"></div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width:100%;">
                    ${Array(9).fill('<div style="background: #222; height:30px; border-radius:6px; border-bottom:4px solid #000;"></div>').join('')}
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
    <div class="board-receipt-paper" style="position:relative; transform: rotate(-1deg); box-shadow: 10px 20px 40px rgba(0,0,0,0.6);">
        <div class="tape tape-top" style="width: 180px; top: -15px;"></div>
        <div style="font-size:2.5rem; font-weight:900; margin-bottom:30px; text-align:center; border-bottom:4px solid #111; padding-bottom:10px;">TULOSSEURANTA</div>`;
    
    for(let i=0; i<window.gameHistory.length; i++) { 
        let h = window.gameHistory[i]; 
        let par = window.currentCourse.pars ? (window.currentCourse.pars[i] || 3) : 3; 
        html += `<div style="font-size:1.3rem; font-weight:bold; border-bottom:1px solid #ddd; margin-top:15px; padding-bottom:5px;">Väylä ${i+1} <span style="color:#666; font-weight:normal;">(PAR ${par})</span></div>`; 
        if(h.holeResults) { 
            for(let pName in h.holeResults) { 
                let strokes = h.holeResults[pName]; 
                let diff = strokes - par;
                let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red'); 
                if (diff < -1) cClass = 'blue'; 
                html += `<div style="display:flex; justify-content:space-between; font-size:1.2rem; padding: 6px 0; align-items:center;"><span>${pName.substring(0, 12)}</span><span class="receipt-circle ${cClass}">${strokes}</span></div>`; 
            } 
        } 
    }
    
    html += `<div style="margin-top:40px; border-top: 4px dashed #111; padding-top:20px; background:#f8fafc; padding:20px; border-radius:8px; border:2px solid #111;"><h3 style="text-align:center; font-size:1.8rem; margin-bottom:20px;">KOKONAISTILANNE</h3>${generateTotals()}</div></div>`;
    wrapper.innerHTML = html;
};

window.renderBoard = function() {
    const board = document.getElementById('corkboard-surface');
    if (!board || !window.currentCourse) return;
    
    // BUGIKORJAUS TÄSSÄ: Jos .pars puuttuu (esim. vanhan version takia), ei kaaduta!
    let totalHoles = window.currentCourse.pars ? window.currentCourse.pars.length : 18; 
    let cols = Math.min(9, totalHoles); 
    let rows = Math.ceil(totalHoles / cols);
    let rightXPanel = window.getRightXPanel ? window.getRightXPanel() : 2000;
    let corkW = rightXPanel + 400;
    let corkH = Math.max((rows * 1010) + 200, 2500);
    
    let totalW = corkW + 1500; 
    let totalH = corkH + 1500; 
    
    board.style.width = `${totalW}px`;
    board.style.height = `${totalH}px`;
    board.style.background = 'transparent';
    
    let html = ``;
    html += `<div style="position:absolute; left:50px; top:50px; width:${corkW}px; height:${corkH}px; background-color: #e2e8f0; background-image: radial-gradient(rgba(0,0,0,0.08) 2px, transparent 2px); background-size: 12px 12px; border: 35px solid #5c4033; border-top-color: #7b4e35; border-left-color: #7b4e35; border-bottom-color: #3e2723; border-right-color: #3e2723; border-radius: 12px; z-index:1; box-shadow: 15px 25px 50px rgba(0,0,0,0.7);"></div>`;
    html += `<div id="board-binder-wrapper" style="position:absolute; left:80px; top:120px; z-index:10; width:500px;"></div>`;
    html += `<div id="board-receipt-wrapper" style="position:absolute; left:100px; top:1200px; z-index:10; width:450px;"></div>`;
    
    let startXHolesVal = window.startXHoles || 1000;
    html += `<div id="holes-grid" style="display:grid; grid-template-columns:repeat(${cols}, 380px); gap:60px 80px; position:absolute; left:${startXHolesVal + 50}px; top:150px; z-index:5;">`;
    window.gameHistory.forEach((h, index) => { html += window.getHoleCellHTML(h, index + 1, false, true); });
    
    if (window.currentHoleIndex > totalHoles) {
        let sortedPlayers = [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
        let winner = sortedPlayers[0] || {name: "Tuntematon", dgScore: 0, score: 0};
        html += `
        <div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; height:600px;">
            <div style="transform:rotate(-3deg); background:#fff; padding:60px; box-shadow:15px 30px 60px rgba(0,0,0,0.6); border:4px solid #ccc; z-index:100; text-align:center; min-width:450px; border-radius:8px; position:relative;">
                <div class="tape tape-top" style="width:200px; top:-15px; height:35px;"></div>
                <h1 style="font-family:'Kalam', cursive; font-size:5rem; color:var(--primary); margin-bottom:15px; line-height:1;">🏆 MESTARI!</h1>
                <h2 style="font-size:2rem; margin-bottom:10px; color:#555;">VOITTAJA:</h2>
                <div style="font-size:4.5rem; font-weight:900; color:var(--ink-blue); margin-bottom:30px; font-family:'Kalam', cursive;">${winner.name}</div>
            </div>
        </div>`;
    } else if (window.activeHole) { 
        html += window.getHoleCellHTML({ rule: window.activeHole.rule, playedCards: window.activeHole.playedCards, color: window.activeHole.color, penColor: window.activeHole.penColor, players: window.allPlayers }, window.currentHoleIndex, true, false); 
    }
    html += `</div>`;
    
    let shopX = corkW + 150;
    let shopY = corkH + 150 - 1000; 
    html += `<div id="board-shop-wrapper" style="position:absolute; left:${shopX}px; top:${shopY}px; z-index:10; width:650px;"></div>`;
    
    board.innerHTML = html;
    
    if(window.renderBinderOnBoard) window.renderBinderOnBoard();
    if(window.renderReceiptOnBoard) window.renderReceiptOnBoard();
    if(window.renderShopOnBoard) window.renderShopOnBoard();
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
