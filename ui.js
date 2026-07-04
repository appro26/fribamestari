// ==============================================
// KÄYTTÖLIITTYMÄ, NÄKYMÄT JA MODAALIT (ui.js)
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

// --- PELILAUDAN PÄÄPÄIVITYS (SYNKKAA SPA-NÄKYMÄT) ---
window.renderBoard = function() {
    // Kutsutaan aina kaikkien näkymien päivitys, jotta data pysyy reaaliaikaisena taustalla
    window.renderHoleView();
    window.renderResultsView();
    window.renderCardsView();
    window.renderShopView();
    window.renderCalculatorView();
};

// --- KORTTIEN HTML-GENERAATTORI (ALKUPERÄINEN ULKOASU) ---
window.generateCardHTML = function(cDef, isLocked = false, extraBottomHtml = '', isCarousel = false) {
    if (!cDef) return '';
    let typeClass = `tier-${cDef.level || 1}`;
    let typeIcon = cDef.type === 'buff' ? '🛡️' : '💥';
    let typeName = cDef.type === 'buff' ? 'buff' : 'sabotage';
    let safeCardName = cDef.n ? cDef.n.split(' (')[0] : '';
    
    let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : (cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2));
    let lockedStyle = isLocked ? 'opacity: 0.5; filter: grayscale(50%);' : '';
    
    // Karusellissa käytetään 100% tilaa, hyllyssä ja laudalla alkuperäiset kiinteät mitat
    let dimensions = isCarousel ? 'width: 100%; height: 100%; box-sizing: border-box; display:flex; flex-direction:column;' : 'width: 175px; height: 260px;';
    let titleSize = isCarousel ? 'font-size: 1.5rem;' : '';
    let descSize = isCarousel ? 'font-size: 1rem; flex: 1;' : '';
    
    return `
    <div class="physical-card ${typeClass}" style="${lockedStyle} ${dimensions} margin: 0 auto; box-shadow: 0 10px 20px rgba(0,0,0,0.4);">
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

// ALKUPERÄINEN VÄYLÄKORTTIEN LOGIIKKA
window.getHoleCellHTML = function(hData, hIndex, isActive, isHistory) {
    let html = `<div class="hole-cell" style="width: 100%; max-width: 380px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 20px;">`;
    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[hIndex - 1] || 3) : 3;
    
    let rot1 = (window.pseudoRandom(hIndex * 1.1) * 4 - 2).toFixed(1);
    let rot2 = (window.pseudoRandom(hIndex * 2.2) * 4 - 2).toFixed(1);

    html += `
    <div class="index-card" style="transform: rotate(${rot1}deg); position: relative; width: 100%; box-sizing: border-box;">
        <div class="banner-subtitle">${window.currentCourse ? window.currentCourse.name : ''}</div>
        <div class="banner-title">VÄYLÄ <span>${hIndex}</span></div>
        <div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>
    </div>`;

    if (hData.rule) {
        let bTxt = hData.rule.type === 'bounty' ? `🏆 TEHTÄVÄ` : '🎲 VÄYLÄSÄÄNTÖ';
        let bgCol = hData.color || '#fef08a';
        html += `
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(${rot2}deg); width: 100%; box-sizing: border-box;" onclick="window.showZoomModal(this.outerHTML)">
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; color:#111;">${hData.rule.n}</div>
            <div style="font-size: 1.15rem; line-height: 1.4; font-weight:700; color:#222;">${hData.rule.d}</div>
        </div>`;
    }

    let playedCards = hData.playedCards ? Object.values(hData.playedCards).filter(Boolean) : [];
    if(playedCards.length > 0) {
        html += `<div style="width: 100%; display:flex; flex-wrap:wrap; justify-content:center; gap:15px; margin-top: 10px;">`;
        playedCards.forEach((pc, idx) => {
            if (pc.target === window.myName || pc.target === 'KAIKKI VASTUSTAJAT' || isHistory) {
                let cRot = (window.pseudoRandom((hIndex + idx) * 4.4) * 6 - 3).toFixed(1); 
                let pinLeft = 50 + (Math.floor(window.pseudoRandom((hIndex + idx) * 5.5) * 20) - 10);
                let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
                
                let extraHtml = `<div style="background:rgba(0,0,0,0.8); color:#fff; padding:6px; border-radius:4px; font-size:0.75rem; text-align:center; font-weight:bold; margin-top:auto; width:100%; box-sizing:border-box;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : pc.target}<br><span style="font-weight:normal; color:#ccc;">(Käyttäjä: ${pc.by})</span></div>`;
                let fullCardHtml = window.generateCardHTML(cDef, false, extraHtml);

                html += `
                <div class="pinned-card-container" style="transform: rotate(${cRot}deg); margin: 0 auto;" onclick="window.showEventCard('${pc.cardId}', '${pc.target}', '${pc.by}')">
                    <div class="pushpin" style="left: ${pinLeft}%;"></div>
                    ${fullCardHtml}
                </div>`;
            }
        });
        html += `</div>`;
    }

    html += `</div>`;
    return html;
};

// --- NÄKYMÄ 5: VÄYLÄ (NYKYINEN TILANNE) ---
window.renderHoleView = function() {
    let target = el('holes-grid');
    if(!target) return;
    
    if (window.currentHoleIndex > (window.currentCourse ? window.currentCourse.pars.length : 18)) {
        let sortedPlayers = [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
        let winner = sortedPlayers[0] || {name: "Tuntematon"};
        target.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; min-height:400px; width:100%;">
            <div style="transform:rotate(-2deg); background:#fff; padding:40px; box-shadow:15px 30px 60px rgba(0,0,0,0.4); border:4px solid #ccc; text-align:center; max-width:400px; width:90%; border-radius:8px; position:relative;">
                <div class="tape tape-top" style="width:200px; top:-15px; height:35px;"></div>
                <h1 style="font-family:'Kalam', cursive; font-size:4rem; color:var(--primary); margin-bottom:15px;">🏆 MESTARI!</h1>
                <h2 style="font-size:1.8rem; margin-bottom:10px; color:#555;">VOITTAJA:</h2>
                <div style="font-size:3.5rem; font-weight:900; color:var(--ink-blue); font-family:'Kalam', cursive;">${winner.name}</div>
            </div>
        </div>`;
    } else if (window.activeHole) {
        target.innerHTML = window.getHoleCellHTML({ rule: window.activeHole.rule, playedCards: window.activeHole.playedCards, color: window.activeHole.color, penColor: window.activeHole.penColor, players: window.allPlayers }, window.currentHoleIndex, true, false);
    }
};

// --- NÄKYMÄ 2: LASKELMA ---
window.renderCalculatorView = function() {
    let target = el('calc-wrapper');
    if(!target || !window.allPlayers) return;
    
    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[window.currentHoleIndex - 1] || 3) : 3;
    let html = `
    <div class="score-spiral-note" style="width: 100%; max-width: 420px; margin: 0 auto; position:relative; box-sizing: border-box; transform:none;">
        <div class="pin pin-blue" style="top: 15px; right: 20px;"></div>
        <h2 style="color:var(--ink-blue); font-family: 'Kalam', cursive; font-size:2rem; text-decoration:underline; text-align:center; margin-bottom:5px;">VÄYLÄ ${window.currentHoleIndex}</h2>
        <p style="text-align:center; margin-bottom:20px; font-weight:bold; color:#666;">PAR ${par}</p>
        <div id="scoreInputsContainer" style="display:flex; flex-direction:column; gap:12px;"></div>
    </div>`;
    
    setTimeout(() => {
        let container = el('scoreInputsContainer');
        if(!container) return;
        let inputsHtml = '';
        window.allPlayers.forEach((p, i) => {
            if(!p) return;
            let safeId = "player_calc_" + i;
            inputsHtml += `
            <div class="player-row-paper" style="padding: 10px 0;">
                <span class="paper-name" style="font-size:1.3rem;">${p.name}</span>
                <div class="score-controls-paper" style="display:flex; align-items:center; gap:10px; margin-left:auto;">
                    <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                    <div id="scoreDisplay_${safeId}" class="score-display-paper" style="font-size:1.2rem; font-weight:bold;">${par}</div>
                    <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
                    <input type="hidden" class="score-input-data" data-name="${p.name}" id="scoreInput_${safeId}" value="${par}" />
                </div>
            </div>`;
        });
        container.innerHTML = inputsHtml;
    }, 20);

    html += `<button class="btn btn-success" style="width:100%; max-width:420px; display:block; margin:20px auto 0 auto; padding:20px; font-size:1.3rem; font-weight:900; box-shadow:0 6px 15px rgba(0,0,0,0.3);" onclick="window.openScoreModal()">🎯 MERKKAA JA TALLENNA TULOS</button>`;
    target.innerHTML = html;
};

// --- NÄKYMÄ 3: OMAT KORTIT (ALKUPERÄINEN KANSIO) ---
window.renderBinderOnBoard = function() {
    let wrapper = el('board-binder-wrapper');
    if(!wrapper) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    
    if (typeof window.getCardSortWeight === 'function') myCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));

    let cardsHtml = '';
    if(myCards.length === 0) {
        cardsHtml = '<p style="color:#555; font-size:1.4rem; text-align:center; padding:50px; font-weight:bold; grid-column: 1 / -1;">Kansiosi on tyhjä.</p>';
    } else {
        myCards.forEach((cId) => {
            let cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.75rem; color:#111; margin-top:auto; padding-top:10px;">🔄 KATSO TASOT / PELAA</div>`;
            cardsHtml += `<div class="plastic-sleeve" style="cursor:pointer;" onclick="window.openCardDetail('${cId}', 'sell')">${window.generateCardHTML(cDef, isLocked, extraHtml)}</div>`;
        });
    }

    wrapper.innerHTML = `
    <div class="board-binder" style="width: 100%; max-width: 500px; margin: 0 auto; min-height: auto; position:relative; box-shadow: 0 15px 35px rgba(0,0,0,0.5); background: radial-gradient(circle at center, #3e2723 0%, #211412 100%); padding-bottom:30px;">
        <div class="binder-spine" style="position: absolute; top: 0; bottom: 0; left: 0; z-index: 30; width: 40px; background: linear-gradient(to right, #111, #222, #111); display:flex; flex-direction:column; justify-content:space-evenly; align-items:center;">
            <div class="binder-ring" style="margin-top: 30px;"></div><div class="binder-ring"></div><div class="binder-ring" style="margin-bottom: 30px;"></div>
        </div>
        <div class="binder-page" style="margin-left: 35px; margin-right: 15px; padding: 20px; border-radius: 4px 12px 12px 4px; background:#fafafa;">
            <h2 style="color:#111; font-size:1.8rem; margin-bottom:20px; font-family:'Kalam', cursive; border-bottom:3px dashed #ccc; padding-bottom:10px; text-align:center;">KANSIO</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%;">
                ${cardsHtml}
            </div>
        </div>
    </div>`;
};
window.renderCardsView = function() { window.renderBinderOnBoard(); };

// --- NÄKYMÄ 4: KAUPPA (ALKUPERÄINEN FOTOREALISTINEN JÄTTIAUTOMAATTI) ---
window.renderShopOnBoard = function() {
    let wrapper = el('board-shop-wrapper');
    if(!wrapper) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myPoints = me ? (me.score || 0) : 0;
    let shopArray = window.activeHole && window.activeHole.shop ? window.activeHole.shop[window.myName] : [];
    let resArray = me && me.reservations ? (Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations)) : [];

    let shelvesHtml = '';
    let actRes = resArray.filter(Boolean);
    let levels = [3, 2, 1]; 

    levels.forEach(lvl => {
        shelvesHtml += `<div style="display:flex; justify-content:space-around; padding: 35px 0; border-bottom: 18px solid #0f172a; box-shadow: inset 0 -25px 40px rgba(0,0,0,0.95); position:relative; margin-bottom: 30px; background: linear-gradient(to bottom, #1e293b, #020617); border-radius: 6px;">`;
        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                
                shelvesHtml += `
                    <div style="position:relative; width:38%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="transform: scale(1.25); cursor:pointer; width:175px; margin-bottom: 35px; transform-origin: bottom center;" onclick="window.openCardDetail('${item.id}', 'shop')">
                            ${fullCardHtml}
                        </div>
                        <div style="background: repeating-linear-gradient(90deg, transparent, transparent 15px, #94a3b8 15px, #64748b 22px); height: 50px; width: 140%; position: absolute; bottom: 100px; filter: drop-shadow(0 20px 15px #000); z-index: 8; opacity: 0.9;"></div>
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 8px; border: 4px solid #22c55e; font-weight: 900; font-size: 1.8rem; margin-top: 15px; z-index: 15; box-shadow: 0 0 20px rgba(34,197,94,0.6); text-align: center; margin-bottom: 15px;">${item.price} P</div>
                        <div style="display:flex; flex-direction:column; gap:12px; margin-top:5px; width:100%; max-width:200px;">
                            <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:18px; font-size:1.4rem; font-weight:900;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                            ${!isResFull ? `<button class="btn btn-primary" style="padding:12px; font-size:1.2rem; font-weight:900;" onclick="window.reserveShopItem('${item.id}')">VARAA KORTTI</button>` : ''}
                        </div>
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="position:relative; width:38%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                        <div style="width:175px; height:260px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); border-radius:12px; border:4px dashed #333; transform: scale(1.25); margin-bottom: 35px; transform-origin: bottom center;">
                            <div style="color:#444; font-weight:900; font-size:2rem; letter-spacing:4px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: repeating-linear-gradient(90deg, transparent, transparent 15px, #94a3b8 15px, #64748b 22px); height: 50px; width: 140%; position: absolute; bottom: 100px; filter: drop-shadow(0 20px 15px #000); z-index: 8; opacity: 0.9;"></div>
                        <div style="background: #000; color: #444; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 8px; border: 4px solid #444; font-weight: 900; font-size: 1.8rem; margin-top: 15px; z-index: 15; text-align: center; margin-bottom: 15px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `<div style="margin-top:50px; border-top: 6px dashed #334155; padding-top: 40px;"><div style="display:flex; justify-content:space-around; width:100%; gap:20px;">`;
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
            let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
            
            reserveHtml += `
                <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center; background: rgba(0,0,0,0.4); padding: 30px; border-radius: 16px; border: 3px solid #334155; box-shadow: inset 0 10px 20px #000;">
                    <div style="transform: scale(1.15); margin:0 auto; cursor:pointer; width:175px;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div style="position:absolute; top:-20px; right:-20px; background:#eab308; color:#000; padding:10px 15px; font-weight:900; font-size: 1.2rem; border-radius:12px; z-index:30; box-shadow:0 5px 20px rgba(0,0,0,0.8); border: 3px solid #fff;">🔒 VARATTU</div>
                        ${fullCardHtml}
                    </div>
                    <div style="background: #000; color: #eab308; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 8px; border: 4px solid #eab308; font-weight: 900; font-size: 1.8rem; margin-top: 30px; z-index: 15; text-align: center; box-shadow: 0 0 15px rgba(234,179,8,0.4);">${resItem.price} P</div>
                    <div style="display:flex; gap:15px; margin-top:20px; width:100%; justify-content: center;">
                        <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:15px 25px; font-size:1.2rem; font-weight:900;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                        <button class="btn btn-danger" style="padding:15px 25px; font-size:1.2rem; font-weight:900;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                    </div>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    // Alkuperäinen 1100px leveä upea automaatti, joka nyt mahtuu ruudulle skaalautuen
    wrapper.innerHTML = `
    <div style="position: relative; width: 100%; max-width: 1100px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%); border: 20px solid #000; border-bottom: 100px solid #050505; border-radius: 30px 30px 10px 10px; box-shadow: 0 30px 70px rgba(0,0,0,0.8), inset 25px 25px 80px rgba(255,255,255,0.06); padding: 50px 40px; display: flex; flex-direction: column; z-index:20; box-sizing:border-box;">
        <div style="background: linear-gradient(to bottom, #000, #111); padding: 30px 50px; border-radius: 20px; border: 8px solid #222; border-bottom: 12px solid #000; display:flex; justify-content:space-between; align-items:center; margin-bottom: 60px; box-shadow: inset 0 0 50px rgba(239,68,68,0.25);">
            <div style="display:flex; align-items:center; gap: 25px;">
                <div style="width: 25px; height: 25px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 30px #22c55e;"></div>
                <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:3.5rem; text-shadow: 0 0 30px #ef4444; letter-spacing: 5px;">FRIBAMART</div>
            </div>
            <div style="background: #000; padding: 15px 35px; border-radius: 12px; border: 4px inset #333;">
                <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:3rem; font-weight:900;">${myPoints} P</div>
            </div>
        </div>
        <div style="background: #020617; border-radius: 20px; border: 16px solid #050505; padding: 40px; position:relative;">
            ${shelvesHtml}
        </div>
        <div style="height: 320px; margin-top: 60px; display:flex; gap:40px; align-items:flex-start; flex-wrap:wrap;">
            <div style="flex: 1; min-width: 250px; background: #050505; border-radius: 20px; border: 10px solid #111; height: 250px; position:relative; display:flex; justify-content:center; align-items:center;">
                <span style="color:#1e293b; font-weight:900; font-size:3rem; letter-spacing:15px;">PUSH</span>
            </div>
            <div style="width: 240px; background: #0a0a0a; border-radius: 20px; border: 8px solid #000; padding: 30px; display:grid; grid-template-columns: repeat(3, 1fr); gap:15px;">
                ${Array(12).fill('<div style="background: #222; height:35px; border-radius:8px; border-bottom:5px solid #000;"></div>').join('')}
            </div>
        </div>
        ${reserveHtml}
    </div>`;
};
window.renderShopView = function() { window.renderShopOnBoard(); };

// --- NÄKYMÄ 1: TULOKSET (REAAALIAIKAINEN KUITTI) ---
window.renderReceiptOnBoard = function() {
    let wrapper = el('board-receipt-wrapper');
    if(!wrapper) return;
    if(!window.allPlayers || window.allPlayers.length === 0 || !window.currentCourse) { wrapper.innerHTML = ''; return; }

    let generateTotals = () => { 
        let html = ``; 
        [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)).forEach(p => { 
            let scoreStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            html += `<div style="display:flex; justify-content:space-between; font-size:1.8rem; font-weight:900; margin-bottom:8px;"><span>${p.name.substring(0, 12)}</span><span style="color:var(--ink-blue);">${scoreStr}</span></div>`; 
        }); 
        return html; 
    };

    let html = `
    <div class="board-receipt-paper" style="position:relative; width: 100%; max-width: 450px; margin: 0 auto; box-sizing:border-box;">
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
    
    html += `<div style="margin-top:40px; border-top: 4px dashed #111; padding-top:20px; background:#f8fafc; padding:20px; border-radius:8px; border:2px solid #111;"><h3 style="text-align:center; font-size:1.8rem; margin-bottom:20px; font-family:'Kalam';">KOKONAISTILANNE</h3>${generateTotals()}</div></div>`;
    wrapper.innerHTML = html;
};
window.renderResultsView = function() { window.renderReceiptOnBoard(); };


// --- MODAALIT JA KARUSELLIT (SÄILYTETTY TÄYSIN ENNALLAAN) ---

window.showModalSafe = function(id, displayType) {
    let elModal = document.getElementById(id); 
    if(elModal) { 
        elModal.style.display = displayType || 'flex'; 
        history.pushState({ fribaApp: true }, ''); 
    } 
};

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
        if (typeof window.getCardSortWeight === 'function') { window.carouselCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b)); }
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

window.showHandLimitModal = function(cards) {
    if(!el('handLimitModal')) return;
    let limit = window.gameSettings ? (window.gameSettings.handLimit || 6) : 6;
    el('handLimitCount').innerText = `${cards.length} / ${limit}`;
    let html = '';
    
    if (typeof window.getCardSortWeight === 'function') { cards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b)); }
    
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
