// ==============================================
// KÄYTTÖLIITTYMÄ, NÄKYMÄT JA MODAALIT (ui.js)
// ==============================================

var el = id => document.getElementById(id);

const postItColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff', '#a7f3d0'];
window.getRandomColor = () => postItColors[Math.floor(Math.random() * postItColors.length)];
window.pseudoRandom = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

// --- NÄKYMÄN VAIHTAJA ---
window.switchView = function(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    let target = el(viewId);
    if(target) target.classList.add('active');

    let navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    let index = ['view-results', 'view-calculator', 'view-cards', 'view-shop', 'view-hole'].indexOf(viewId);
    if(index > -1 && navItems[index]) navItems[index].classList.add('active');

    // Päivitetään näkymä sen avautuessa
    if(viewId === 'view-hole') window.renderHoleView();
    if(viewId === 'view-results') window.renderResultsView();
    if(viewId === 'view-cards') window.renderCardsView();
    if(viewId === 'view-shop') window.renderShopView();
    if(viewId === 'view-calculator') window.renderCalculatorView();
};

window.renderBoard = function() {
    // Pääpäivitysfunktio päivittää nyt aina aktiivisen näkymän
    let activeView = document.querySelector('.app-view.active');
    if(activeView) window.switchView(activeView.id);
};

// --- KORTTIEN GENERATORI ---
window.generateCardHTML = function(cDef, isLocked = false, extraBottomHtml = '', isCarousel = false, isShop = false) {
    if (!cDef) return '';
    let typeClass = `tier-${cDef.level || 1}`;
    let typeIcon = cDef.type === 'buff' ? '🛡️' : '💥';
    let typeName = cDef.type === 'buff' ? 'buff' : 'sabotage';
    let safeCardName = cDef.n ? cDef.n.split(' (')[0] : '';
    let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : (cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2));
    let lockedStyle = isLocked ? 'opacity: 0.5; filter: grayscale(50%);' : '';
    
    // Suuremmat kortit kaupassa ja koko ruudun kokoiset karusellissa
    let dimensions = isCarousel ? 'width: 100%; height: 100%; box-sizing: border-box; display:flex; flex-direction:column;' : 
                     isShop ? 'width: 260px; height: 380px; font-size:1.2rem;' : 'width: 175px; height: 260px;';
    
    let titleSize = isCarousel || isShop ? 'font-size: 1.5rem;' : '';
    let descSize = isCarousel || isShop ? 'font-size: 1rem; flex: 1;' : '';
    
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

// --- NÄKYMÄ 1: VÄYLÄ (Nykyinen tilanne) ---
window.renderHoleView = function() {
    let container = el('hole-content');
    if(!container || !window.currentCourse) return;
    
    let hIndex = window.currentHoleIndex || 1;
    let par = window.currentCourse.pars ? (window.currentCourse.pars[hIndex - 1] || 3) : 3;
    let activeHole = window.activeHole || {};

    let html = `<div style="width:100%; max-width:400px; margin:0 auto; padding-top:20px; display:flex; flex-direction:column; gap:25px; align-items:center;">`;
    
    // Väyläkortti
    html += `
    <div class="index-card" style="transform: rotate(-2deg); position: relative; width:100%; box-sizing:border-box;">
        <div class="banner-subtitle">${window.currentCourse.name}</div>
        <div class="banner-title">VÄYLÄ <span>${hIndex}</span></div>
        <div style="margin-top: 5px;"><span class="banner-par">PAR <span>${par}</span></span></div>
    </div>`;

    // Sääntö (Post-it)
    if (activeHole.rule) {
        let bTxt = activeHole.rule.type === 'bounty' ? `🏆 TEHTÄVÄ` : '🎲 VÄYLÄSÄÄNTÖ';
        let bgCol = activeHole.color || '#fef08a';
        html += `
        <div class="post-it-note" style="background:${bgCol}; transform: rotate(1deg); width:100%; box-sizing:border-box; margin-top:-10px;">
            <div style="font-weight:900; font-size:1rem; margin-bottom:8px; text-transform:uppercase; color:#666;">📌 ${bTxt}</div>
            <div style="font-size:1.8rem; margin-bottom: 10px; font-weight: 900; line-height: 1.1; color:#111;">${activeHole.rule.n}</div>
            <div style="font-size: 1.2rem; line-height: 1.4; font-weight:700; color:#222;">${activeHole.rule.d}</div>
        </div>`;
    }

    // Pelatut kortit
    let playedCards = activeHole.playedCards ? Object.values(activeHole.playedCards).filter(Boolean) : [];
    if(playedCards.length > 0) {
        html += `<h3 style="color:#fff; font-family:'Kalam', cursive; font-size:1.8rem; border-bottom:2px solid #fff; width:100%; text-align:center; padding-bottom:5px;">Aktiiviset Kortit</h3>`;
        html += `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:15px; width:100%;">`;
        
        playedCards.forEach((pc) => {
            let encodedTarget = pc.target ? pc.target.replace(/"/g, '&quot;') : '';
            let cDef = window.allCards.find(c => c && c.id === pc.cardId) || {id: pc.cardId, d: pc.cardDesc, n: pc.cardName, type: pc.type, level: pc.level};
            let extraHtml = `<div style="background:rgba(0,0,0,0.8); color:#fff; padding:8px; border-radius:4px; font-size:0.85rem; text-align:center; font-weight:bold; margin-top:auto; width:100%; box-sizing:border-box;">Kohteelle: ${pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKKI' : 'Sinuun!'}</div>`;
            
            html += `<div style="cursor:pointer;" onclick="window.showEventCard('${pc.cardId}', '${encodedTarget}', '${pc.by}')">${window.generateCardHTML(cDef, false, extraHtml)}</div>`;
        });
        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
};

// --- NÄKYMÄ 2: LASKELMA (Tulosten syöttö) ---
window.renderCalculatorView = function() {
    let container = el('calculator-content');
    if(!container || !window.allPlayers) return;

    let par = window.currentCourse && window.currentCourse.pars ? (window.currentCourse.pars[window.currentHoleIndex - 1] || 3) : 3;
    let html = `<div class="board-receipt-paper" style="width:100%; max-width:450px; margin:0 auto; padding:20px; box-sizing:border-box;">`;
    html += `<h2 style="font-size:2rem; font-family:'Kalam'; text-align:center; margin-bottom:10px;">Väylä ${window.currentHoleIndex} Tulos</h2>`;
    html += `<p style="text-align:center; font-size:1.2rem; color:#555; margin-bottom:20px;">Par: <b>${par}</b></p>`;

    let taskCheckboxes = '';
    (window.allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        let safeId = "player_calc_" + i; 
        
        // Luetaan olemassa oleva arvo tai asetetaan oletukseksi PAR
        let currentInput = el(`scoreInput_${safeId}`);
        let currentVal = currentInput ? currentInput.value : par;

        taskCheckboxes += `<label style="display:block; font-size:1.2rem; font-weight:bold; margin-bottom:10px;"><input type="checkbox" class="task-paper-checkbox" data-name="${p.name}" /> ${p.name} suoritti tehtävän</label>`;
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ccc; padding:15px 0;">
            <span style="font-size:1.4rem; font-weight:900;">${p.name}</span>
            <div style="display:flex; align-items:center; gap:15px;">
                <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                <div id="scoreDisplay_${safeId}" class="score-display-paper" style="width:40px; text-align:center;">${currentVal}</div>
                <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
                <input type="hidden" class="score-input-data" data-name="${p.name}" id="scoreInput_${safeId}" value="${currentVal}" />
            </div>
        </div>`;
    });

    html += `<div style="margin-top:30px; background:#f8fafc; padding:15px; border-radius:8px; border:2px dashed #94a3b8;">
                <h4 style="margin-top:0;">🏆 Tehtävän onnistujat:</h4>
                <div id="taskWinnerContainer">${taskCheckboxes}</div>
             </div>`;
             
    html += `<button class="btn-massive btn-primary" style="margin-top:30px; background:#16a34a;" onclick="window.saveHoleScores()">💾 TALLENNA TULOKSET</button>`;
    html += `</div>`;
    
    container.innerHTML = html;
};

// --- NÄKYMÄ 3: OMAT KORTIT ---
window.renderCardsView = function() {
    let container = el('cards-content');
    if(!container) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    
    if (typeof window.getCardSortWeight === 'function') myCards.sort((a,b) => window.getCardSortWeight(a) - window.getCardSortWeight(b));

    let html = `<div style="width:100%; max-width:600px; margin:0 auto; padding-top:20px;">`;
    html += `<h2 style="color:#fff; font-family:'Kalam', cursive; font-size:2.5rem; text-align:center; margin-bottom:20px;">OMAT KORTIT</h2>`;
    
    if(myCards.length === 0) {
        html += '<p style="color:#94a3b8; font-size:1.4rem; text-align:center; padding:50px;">Kansiosi on tyhjä.</p>';
    } else {
        html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 20px; width: 100%;">`;
        myCards.forEach((cId) => {
            let cDef = window.allCards.find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let isLocked = me.upgradedThisHole && me.upgradedThisHole.includes(cId);
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.8rem; color:#111; margin-top:auto; padding-top:10px;">🔄 KATSO / PELAA</div>`;
            html += `<div style="cursor:pointer;" onclick="window.openCardDetail('${cId}', 'sell')">${window.generateCardHTML(cDef, isLocked, extraHtml)}</div>`;
        });
        html += `</div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
};

// --- NÄKYMÄ 4: KAUPPA (Jättimäinen ja kaunis, mutta ei riko muistia) ---
window.renderShopView = function() {
    let container = el('shop-content');
    if(!container) return;
    let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
    let myPoints = me ? (me.score || 0) : 0;
    let shopArray = window.activeHole && window.activeHole.shop ? window.activeHole.shop[window.myName] : [];
    let resArray = me && me.reservations ? (Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations)) : [];

    let shelvesHtml = '';
    let actRes = resArray.filter(Boolean);
    let levels = [3, 2, 1]; 

    levels.forEach(lvl => {
        shelvesHtml += `<div style="display:flex; justify-content:space-around; flex-wrap:wrap; padding: 25px 10px; border-bottom: 8px solid #020617; background: #1e293b; border-radius: 8px; margin-bottom: 25px; gap:15px;">`;
        let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
        
        for(let i=0; i<2; i++) {
            let item = shelfItems[i];
            if (item) {
                const canAfford = myPoints >= item.price;
                let isResFull = actRes.length >= 2;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false, true); // isShop = true -> isot kortit
                
                shelvesHtml += `
                    <div style="display:flex; flex-direction:column; align-items:center; flex:1; min-width:260px;">
                        <div style="cursor:pointer;" onclick="window.openCardDetail('${item.id}', 'shop')">${fullCardHtml}</div>
                        <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 12px 30px; border-radius: 8px; border: 4px solid #22c55e; font-weight: 900; font-size: 2rem; margin-top: 15px; text-align: center; margin-bottom: 15px;">${item.price} P</div>
                        <button class="btn btn-success" ${!canAfford?'disabled':''} style="width:100%; padding:15px; font-size:1.3rem; font-weight:900; margin-bottom:10px;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                        ${!isResFull ? `<button class="btn btn-primary" style="width:100%; padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.reserveShopItem('${item.id}')">VARAA KORTTI</button>` : ''}
                    </div>
                `;
            } else {
                shelvesHtml += `
                    <div style="display:flex; flex-direction:column; align-items:center; flex:1; min-width:260px;">
                        <div style="width:260px; height:380px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:12px; border:4px dashed #333;">
                            <div style="color:#666; font-weight:900; font-size:2rem; letter-spacing:4px; transform:rotate(-45deg);">TYHJÄ</div>
                        </div>
                        <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 12px 30px; border-radius: 8px; border: 4px solid #444; font-weight: 900; font-size: 2rem; margin-top: 15px; text-align: center; margin-bottom: 15px;">---</div>
                    </div>
                `;
            }
        }
        shelvesHtml += `</div>`;
    });

    let reserveHtml = '';
    if(actRes.length > 0) {
        reserveHtml += `<div style="margin-top:30px; border-top: 4px dashed #475569; padding-top: 30px;"><div style="display:flex; justify-content:space-around; flex-wrap:wrap; gap:20px;">`;
        actRes.forEach(rId => {
            let resItem = window.allCards.find(c => c.id === rId);
            if(!resItem) return;
            const canAfford = myPoints >= resItem.price;
            let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
            
            reserveHtml += `
                <div style="display:flex; flex-direction:column; align-items:center; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; border: 3px solid #334155; flex:1; min-width:260px;">
                    <div style="cursor:pointer; position:relative;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                        <div style="position:absolute; top:-15px; right:-15px; background:#eab308; color:#000; padding:8px 12px; font-weight:900; font-size: 1.1rem; border-radius:8px; z-index:30; border: 3px solid #fff;">🔒 VARATTU</div>
                        ${window.generateCardHTML(resItem, false, extraHtml, false, true)}
                    </div>
                    <div style="background: #000; color: #eab308; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 6px; border: 4px solid #eab308; font-weight: 900; font-size: 1.8rem; margin-top: 20px; text-align: center; margin-bottom:15px;">${resItem.price} P</div>
                    <button class="btn btn-success" ${!canAfford?'disabled':''} style="width:100%; padding:15px; font-size:1.3rem; font-weight:900; margin-bottom:10px;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                    <button class="btn btn-danger" style="width:100%; padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.cancelReservation('${resItem.id}')">PERU VARAUS</button>
                </div>
            `;
        });
        reserveHtml += `</div></div>`;
    }

    let html = `
    <div style="width:100%; max-width:800px; margin:0 auto; background: #0f172a; border: 8px solid #000; border-bottom: 40px solid #050505; border-radius: 20px; padding: 25px; display: flex; flex-direction: column;">
        <div style="background: #000; padding: 20px; border-radius: 12px; border: 4px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap: 15px;">
                <div style="width: 20px; height: 20px; border-radius: 50%; background: #22c55e;"></div>
                <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:2.5rem; letter-spacing: 2px;">FRIBAMART</div>
            </div>
            <div style="background: #111; padding: 10px 20px; border-radius: 8px; border: 2px solid #333;">
                <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:2.2rem; font-weight:900;">${myPoints} P</div>
            </div>
        </div>
        <div style="background: #020617; border-radius: 12px; border: 8px solid #050505; padding: 20px;">
            ${shelvesHtml}
        </div>
        ${reserveHtml}
    </div>`;
    
    container.innerHTML = html;
};

// --- NÄKYMÄ 5: TULOKSET (Reaaliaikaiset pisteet kaikkien nähtävillä) ---
window.renderResultsView = function() {
    let container = el('results-content');
    if(!container) return;
    if(!window.allPlayers || window.allPlayers.length === 0 || !window.currentCourse) { container.innerHTML = '<p style="color:#fff;">Ei tuloksia vielä.</p>'; return; }

    let generateTotals = () => { 
        let html = ``; 
        [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore||0) - (b.dgScore||0)).forEach(p => { 
            let scoreStr = p.dgScore > 0 ? `+${p.dgScore}` : (p.dgScore === 0 ? 'E' : p.dgScore);
            html += `<div style="display:flex; justify-content:space-between; font-size:1.8rem; font-weight:900; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;"><span>${p.name.substring(0, 15)}</span><span style="color:#0369a1;">${scoreStr}</span></div>`; 
        }); 
        return html; 
    };

    let html = `
    <div class="board-receipt-paper" style="width:100%; max-width:500px; margin:0 auto; padding:30px; box-sizing:border-box;">
        <div style="background:#f8fafc; padding:20px; border-radius:12px; border:3px solid #111; margin-bottom:30px;">
            <h3 style="text-align:center; font-size:2.2rem; margin-bottom:20px; font-family:'Kalam';">KOKONAISTILANNE</h3>
            ${generateTotals()}
        </div>
        <h2 style="font-size:1.8rem; font-weight:900; margin-bottom:20px; text-align:center; border-bottom:4px solid #111; padding-bottom:10px;">VÄYLÄKOHTAISET TULOKSET</h2>`;
    
    for(let i=0; i<window.gameHistory.length; i++) { 
        let h = window.gameHistory[i]; 
        let par = window.currentCourse.pars ? (window.currentCourse.pars[i] || 3) : 3; 
        html += `<div style="font-size:1.4rem; font-weight:bold; border-bottom:2px solid #cbd5e1; margin-top:20px; padding-bottom:8px; color:#334155;">Väylä ${i+1} <span style="font-size:1rem; font-weight:normal;">(PAR ${par})</span></div>`; 
        if(h.holeResults) { 
            for(let pName in h.holeResults) { 
                let strokes = h.holeResults[pName]; 
                let diff = strokes - par;
                let cClass = diff === 0 ? 'even' : (diff < 0 ? 'green' : 'red'); 
                if (diff < -1) cClass = 'blue'; 
                html += `<div style="display:flex; justify-content:space-between; font-size:1.3rem; padding: 10px 0; align-items:center; font-weight:600;"><span>${pName.substring(0, 15)}</span><span class="receipt-circle ${cClass}">${strokes}</span></div>`; 
            } 
        } 
    }
    html += `</div>`;
    container.innerHTML = html;
};

// ==============================================
// MODAALIEN JA KARUSELLIN LOGIIKKA (Pidetty ennallaan)
// ==============================================

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
