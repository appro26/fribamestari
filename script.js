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
let isExpandedView = false; 
let lastPlayedCardTimestamp = Date.now();

window.gameSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };
window.pendingShopPurchase = null;

//==============================================
// ASENNA SOVELLUS (PWA / KOTIVALIKKO)
//==============================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const wantsBrowser = localStorage.getItem('friba_browser_mode');
    if (!wantsBrowser) {
        let elModal = el('installPromptModal');
        let elBtn = el('nativeInstallBtn');
        let elInst = el('installInstructions');
        if(elModal && elBtn && elInst) {
            elInst.innerHTML = "Tämä peli toimii parhaiten puhelimen omana sovelluksena. Asenna se nyt yhdellä painalluksella!";
            elBtn.style.display = 'block';
            elModal.style.display = 'flex';
        }
    }
});

window.triggerNativeInstall = async function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            if(el('installPromptModal')) el('installPromptModal').style.display = 'none';
        }
        deferredPrompt = null;
    } else {
        alert("Asennus ei onnistunut automaattisesti. Kokeile selaimesi valikosta 'Asenna sovellus' tai 'Lisää aloitusnäyttöön'.");
    }
};

window.checkInstallPrompt = function() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
    const wantsBrowser = localStorage.getItem('friba_browser_mode');
    
    if (isStandalone || wantsBrowser) return;
    
    if (!deferredPrompt) {
        const os = (function() {
            var userAgent = navigator.userAgent || navigator.vendor || window.opera;
            if (/android/i.test(userAgent)) return "Android";
            if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return "iOS";
            return "Other";
        })();
        
        let instText = "";
        if (os === "iOS") {
            instText = "Parhaan pelikokemuksen saat asentamalla Fribamestarin puhelimeesi!<br><br>Paina selaimen alalaidasta <b>Jaa-kuvaketta</b> (neliö ja nuoli ylös) ja valitse sitten <b>'Lisää kotivalikkoon'</b>.";
        } else if (os === "Android") {
            instText = "Parhaan pelikokemuksen saat asentamalla Fribamestarin puhelimeesi!<br><br>Paina selaimesi <b>valikkoa</b> (kolme pistettä ylhäällä) ja valitse <b>'Asenna sovellus'</b> tai <b>'Lisää aloitusnäyttöön'</b>.";
        } else {
            instText = "Parhaan pelikokemuksen saat asentamalla pelin selaimesi valikosta (Asenna / Lisää aloitusnäyttöön).";
        }
        
        let elInst = el('installInstructions');
        let elModal = el('installPromptModal');
        let elBtn = el('nativeInstallBtn');
        if(elInst && elModal) {
            elInst.innerHTML = instText;
            if(elBtn) elBtn.style.display = 'none'; 
            elModal.style.display = 'flex';
        }
    }
};

window.dismissInstallPrompt = function() {
    localStorage.setItem('friba_browser_mode', 'true');
    if(el('installPromptModal')) el('installPromptModal').style.display = 'none';
};

window.addEventListener('load', () => { setTimeout(window.checkInstallPrompt, 1500); });

//==============================================
// KORTIN PELAAMINEN (TARGET MODAL / AUTOMATIIKKA)
//==============================================
window.openTargetModal = function(cardId) {
    const cardDef = window.allCards.find(c => c.id === cardId);
    if (!cardDef) return;
    
    window.pendingCardPlay = { id: cardId, def: cardDef };
    
    if(cardDef.type === 'buff') {
        window.executeCardPlay(myName);
        return;
    }
    
    let opponents = allPlayers.filter(p => p && p.name !== myName);
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
        list.innerHTML += `<button class="btn btn-secondary target-btn glass-card" data-name="${encodedName}" style="border:3px solid var(--border); color:var(--text-main); width:100%; padding:20px; border-radius:12px; margin-bottom:12px; font-weight:900; font-size:1.3rem; text-align:left; box-shadow:0 4px 10px rgba(0,0,0,0.05);" onclick="window.executeCardPlay(this.getAttribute('data-name'))">${p.name}</button>`;
    });
    if(el('targetModal')) el('targetModal').style.display = 'flex'; 
};

window.executeCardPlay = function(targetName) {
    if(!window.pendingCardPlay) return; 
    const card = window.pendingCardPlay;
    const timestamp = Date.now();
    if(el('targetModal')) el('targetModal').style.display = 'none'; 
    if(el('handModal')) el('handModal').style.display = 'none'; 
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p && p.name === myName);
    
    if(me && me.cards) { 
        me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
        me.cards = me.cards.filter(Boolean);
        
        let actualIndex = me.cards.indexOf(card.id);
        if (actualIndex !== -1) {
            me.cards.splice(actualIndex, 1); 
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
            cardId: card.id || 'err_id',
            cardName: card.def.n || 'Nimetön', 
            cardDesc: card.def.d || '-', 
            target: targetName || 'Joku', 
            by: myName || 'Joku', 
            type: card.def.type || 'sabotage', 
            tier: card.def.tier || 'normal',
            timestamp: timestamp 
        };
    }
    
    let updates = {};
    updates['gameState/players'] = window.cleanFirebaseData(nextPlayers);
    if(activeHole) { 
        updates['gameState/activeHole/playedCards'] = window.cleanFirebaseData(pCards); 
    }
    
    update(ref(db), updates);
    
    window.logEvent(`${myName} pelasi kortin ${card.def.n} kohteelle ${targetName}.`);
    
    let type = card.def.type === 'buff' ? 'info' : 'debuff';
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, type);
};

//==============================================
// 3D-KORTIN KARUSELLI (SLAIDAUS SIVULLE JA YLÖS)
//==============================================
window.carouselCards = [];
window.carouselCurrentIndex = 0;
window.carouselCurrentMode = 'hand';
window.carouselArgs = [];
window.cardLastRot = 0;

window.initCarouselSwipe = function() {
    const wrapper = el('cardCarousel');
    const activeCard = el(`card3d-inner-${window.carouselCurrentIndex}`);
    if(!wrapper || !activeCard) return;
    
    let startX = 0; let startY = 0;
    let currentX = 0; let currentY = 0;
    let isDragging = false;
    let swipeDirection = null; 
    let currentRotX = window.cardLastRot || 0; 
    
    wrapper.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        swipeDirection = null;
        activeCard.style.transition = 'none'; 
    }, {passive: true});

    wrapper.addEventListener('touchmove', e => {
        if(!isDragging) return;
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
        
        let diffX = currentX - startX;
        let diffY = currentY - startY;
        
        if (!swipeDirection) {
            if (Math.abs(diffX) > Math.abs(diffY)) swipeDirection = 'h';
            else swipeDirection = 'v';
        }
        
        if (swipeDirection === 'h') {
            wrapper.style.transform = `translateX(${diffX}px)`;
        } else if (swipeDirection === 'v') {
            let newRot = currentRotX - (diffY * 1.0);
            activeCard.style.transform = `rotateX(${newRot}deg)`;
        }
    }, {passive: true});

    wrapper.addEventListener('touchend', e => {
        if(!isDragging) return;
        isDragging = false;
        
        if (swipeDirection === 'h') {
            wrapper.style.transition = 'transform 0.3s ease';
            wrapper.style.transform = `translateX(0px)`;
            
            let diffX = currentX - startX;
            if (diffX > 60 && window.carouselCurrentIndex > 0) {
                window.carouselCurrentIndex--;
                window.cardLastRot = 0;
                window.renderCarousel();
            } else if (diffX < -60 && window.carouselCurrentIndex < window.carouselCards.length - 1) {
                window.carouselCurrentIndex++;
                window.cardLastRot = 0;
                window.renderCarousel();
            }
        } else if (swipeDirection === 'v') {
            activeCard.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
            let transformStr = activeCard.style.transform;
            let match = transformStr.match(/rotateX\(([-0-9.]+)deg\)/);
            if(match) {
                let rot = parseFloat(match[1]);
                window.cardLastRot = Math.round(rot / 180) * 180;
                activeCard.style.transform = `rotateX(${window.cardLastRot}deg)`;
            }
        }
    }, {passive: true});
};

window.openCardDetail = function(cId, mode, arg1, arg2, arg3) {
    if (mode === 'hand' || mode === 'sell') {
        const me = allPlayers.find(p => p && p.name === myName);
        window.carouselCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    } else if (mode === 'shop') {
        window.carouselCards = activeHole && activeHole.shop ? activeHole.shop.map(c => c.id) : [];
    } else if (mode === 'gm') {
        window.carouselCards = window.allCards.map(c => c.id);
    } else {
        window.carouselCards = [cId]; 
    }
    
    window.carouselCurrentMode = mode;
    window.carouselArgs = [arg1, arg2, arg3];
    window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.cardLastRot = 0;
    window.renderCarousel();
    el('cardDetailModal').style.display = 'flex';
};

window.renderCarousel = function() {
    const wrapper = el('cardCarousel');
    if(!wrapper) return;
    
    let html = '';
    for(let i = -1; i <= 1; i++) {
        let index = window.carouselCurrentIndex + i;
        if (index < 0 || index >= window.carouselCards.length) continue;
        
        let cId = window.carouselCards[index];
        let cDef = window.allCards.find(c => c.id === cId);
        if(!cDef) continue;
        
        let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
        if(cDef.tier === 'premium') typeClass = 'premium-card';
        let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        let backClass = cDef.tier === 'premium' ? 'card-back-premium' : (cDef.type === 'buff' ? 'card-back-buff' : 'card-back-sabotage');
        let backIcon = cDef.tier === 'premium' ? '💎' : (cDef.type === 'buff' ? '🛡️' : '🚫');
        
        let isCenter = (i === 0);
        let sideClass = isCenter ? '' : 'side-card';
        
        html += `
            <div class="card-3d-container ${sideClass}" id="carousel-card-${index}">
                <div class="card-3d" id="card3d-inner-${index}">
                    <div class="card-face card-front ${typeClass}">
                        <div style="text-align:left; display:flex; flex-direction:column; height:100%;">
                            <div class="card-type-tag" style="font-size:1.1rem; margin-bottom:12px;">${tagTxt}</div>
                            <h3 style="font-size:2rem; margin-bottom:20px; color:#000; word-break:break-word; hyphens:auto; line-height:1.1;">${cDef.n}</h3>
                            <p style="font-size:1.3rem; color:#111; font-weight:800; line-height:1.4;">${cDef.d}</p>
                        </div>
                    </div>
                    <div class="card-face card-back ${backClass}">
                        <div class="card-back-icon">${backIcon}</div>
                        <div style="color:#fff; font-weight:900; font-size:1.4rem; margin-top:20px; letter-spacing:3px;">FRIBAMESTARI</div>
                    </div>
                </div>
            </div>`;
    }
    
    wrapper.innerHTML = html;
    wrapper.style.transform = `translateX(0px)`;
    
    window.updateCarouselButtons();
    setTimeout(() => { window.initCarouselSwipe(); }, 50);
};

window.updateCarouselButtons = function() {
    let cId = window.carouselCards[window.carouselCurrentIndex];
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return;
    
    let btnHtml = '';
    let mode = window.carouselCurrentMode;

    if (mode === 'hand') {
        btnHtml = `<button class="btn btn-danger" style="font-size:1.1rem; padding:18px; box-shadow:0 10px 25px rgba(244,63,94,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cId}')">PELAA KORTTI</button>`;
        if (cDef.tier === 'normal') {
            btnHtml += `<button class="btn btn-secondary glass-card" style="font-size:1.05rem; padding:16px; margin-top:5px; color:#000;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', true)">♻️ MYY KORTTI (+1 P)</button>`;
        } else {
            btnHtml += `<button class="btn btn-secondary glass-card" style="font-size:1.05rem; padding:16px; margin-top:5px; color:var(--danger);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', false)">🗑️ HÄVITÄ KORTTI (0 P)</button>`;
        }
    } else if (mode === 'shop') {
        let myScore = 0; let bought = false;
        const me = allPlayers.find(p => p && p.name === myName);
        if(me) { myScore = me.score || 0; bought = me.boughtThisHole; }
        let item = activeHole && activeHole.shop ? activeHole.shop.find(s=>s.id===cId) : null;
        let price = item ? item.price : 99;
        
        let canAfford = myScore >= price && !bought;
        let btnText = bought ? 'OSTETTU' : (canAfford ? `OSTA ETU (${price} P)` : 'EI VARAA');
        let btnClass = canAfford && !bought ? 'btn-warning' : 'btn-secondary';
        let dis = (!canAfford || bought) ? 'disabled' : '';
        btnHtml = `<button class="btn ${btnClass}" ${dis} style="font-size:1.1rem; padding:18px; color:#000; box-shadow:0 10px 25px rgba(245,158,11,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.buyShopItem('${cId}', '${cDef.n}', ${price})">${btnText}</button>`;
    } else if (mode === 'sell') {
        if (cDef.tier === 'normal') {
            btnHtml = `<button class="btn btn-success" style="font-size:1.1rem; padding:18px; box-shadow:0 10px 25px rgba(16, 185, 129, 0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', true)">♻️ MYY KORTTI (+1 P)</button>`;
        } else {
            btnHtml = `<button class="btn btn-danger" style="font-size:1.1rem; padding:18px; box-shadow:0 10px 25px rgba(244, 63, 94, 0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', false)">🗑️ HÄVITÄ KORTTI (0 P)</button>`;
        }
    } else if (mode === 'gm') {
        btnHtml = `<button class="btn btn-success" style="font-size:1.1rem; padding:18px;" onclick="document.getElementById('cardDetailModal').style.display='none'; window.giveCardToPlayer('${cId}')">ANNA TÄMÄ</button>`;
    }

    el('cardDetailActionArea').innerHTML = btnHtml;
};

//==============================================
// KORTIN POISTO JA KAUPPA
//==============================================
window.forceDiscard = function(cId, isNormal) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p && p.name === myName);
    if(!me) return;
    
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    me.cards = me.cards.filter(Boolean);
    
    let idx = me.cards.indexOf(cId);
    if(idx !== -1) {
        me.cards.splice(idx, 1);
        if (isNormal) {
            me.score = (parseInt(me.score, 10) || 0) + 1;
            window.showAppleToast('+1 P (Kortti myyty)', '💰');
        } else {
            window.showAppleToast('Kortti poistettu', '🗑️');
        }
    }
    
    if (window.pendingShopPurchase) {
        let pId = window.pendingShopPurchase.id;
        let pPrice = window.pendingShopPurchase.price;
        let pName = window.pendingShopPurchase.name;
        
        if (me.score >= pPrice) {
            me.score -= pPrice;
            me.boughtThisHole = true;
            me.cards.push(pId);
            
            let nextShop = JSON.parse(JSON.stringify(activeHole.shop));
            const sIdx = nextShop.findIndex(i => i && i.id === pId);
            if (sIdx !== -1) nextShop.splice(sIdx, 1);
            
            let updates = {};
            updates['gameState/players'] = window.cleanFirebaseData(nextPlayers);
            updates['gameState/activeHole/shop'] = window.cleanFirebaseData(nextShop);
            
            update(ref(db), updates);
            
            window.pendingShopPurchase = null;
            el('shopModal').style.display = 'none';
            window.showNotification(`🛒 Ostit edun: ${pName}`, 'warning');
            return;
        } else {
            window.pendingShopPurchase = null; 
        }
    }
    
    set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
};

window.buyShopItem = function(idStr, nameStr, priceVal) {
    if (!activeHole || !activeHole.shop) return; 
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p && p.name === myName);
    if (!me || me.score < priceVal || me.boughtThisHole) return; 

    let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
    let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 5;
    let currentCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean).length : 0;
    
    if (limitEnabled && currentCards >= limit) {
        window.pendingShopPurchase = { id: idStr, name: nameStr, price: priceVal };
        window.switchShopTab('sell');
        window.renderShop(activeHole ? activeHole.shop : null, me.score, me.boughtThisHole); 
        return;
    }

    const shopIndex = activeHole.shop.findIndex(i => i && i.id === idStr);
    if (shopIndex !== -1) {
        me.score -= priceVal;
        me.boughtThisHole = true;
        
        let nextShop = JSON.parse(JSON.stringify(activeHole.shop));
        nextShop.splice(shopIndex, 1);
        
        me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
        me.cards.push(idStr);

        let updates = {};
        updates['gameState/players'] = window.cleanFirebaseData(nextPlayers);
        updates['gameState/activeHole/shop'] = window.cleanFirebaseData(nextShop);
        
        update(ref(db), updates);

        if(el('shopModal')) el('shopModal').style.display = 'none'; 
        window.logEvent(`${myName} osti edun: ${nameStr}.`);
        window.showNotification(`🛒 Ostit edun: ${nameStr}`, 'warning');
    }
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    const me = allPlayers.find(p => p && p.name === myName);
    window.renderShop(activeHole ? activeHole.shop : null, me ? me.score : 0, me ? me.boughtThisHole : false);
    window.switchShopTab('buy');
};

window.switchShopTab = function(tab) {
    if (tab === 'buy') {
        el('shopBuyArea').style.display = 'block';
        el('shopSellArea').style.display = 'none';
        el('shopTabBuyBtn').classList.add('active');
        el('shopTabSellBtn').classList.remove('active');
    } else {
        el('shopBuyArea').style.display = 'none';
        el('shopSellArea').style.display = 'block';
        el('shopTabBuyBtn').classList.remove('active');
        el('shopTabSellBtn').classList.add('active');
    }
};

window.showHandLimitModal = function(cards) {
    if(!el('handLimitModal')) return;
    let limit = window.gameSettings.handLimit || 5;
    el('handLimitCount').innerText = `${cards.length} / ${limit}`;
    let html = '';
    cards.forEach(cId => {
        const cDef = window.allCards.find(c => c.id === cId);
        if(!cDef) return;
        let isNormal = cDef.tier === 'normal';
        let btnTxt = isNormal ? '♻️ MYY (+1 P)' : '🗑️ POISTA';
        let btnClass = isNormal ? 'btn-success' : 'btn-danger';
        
        html += `
        <div style="background:#fff; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; color:#000;">
            <div style="text-align:left;">
                <div style="font-size:0.75rem; font-weight:900; color:var(--text-muted);">${isNormal ? 'NORMAALI' : '💎 PREMIUM'}</div>
                <div style="font-size:1.1rem; font-weight:900; color:#000;">${cDef.n}</div>
            </div>
            <button class="btn ${btnClass}" style="width:auto; padding:10px 15px; font-size:0.85rem; margin:0;" onclick="window.forceDiscard('${cId}', ${isNormal})">${btnTxt}</button>
        </div>`;
    });
    el('handLimitCards').innerHTML = html;
    el('handLimitModal').style.display = 'flex';
};

window.saveGameSettings = function() {
    let newSettings = {
        shopEnabled: el('gmSetShop').checked,
        handLimitEnabled: el('gmSetLimitCheck').checked,
        handLimit: parseInt(el('gmSetLimitCount').value, 10) || 5,
        ptsWin: parseInt(el('gmSetPtsWin').value, 10) || 0,
        ptsTask: parseInt(el('gmSetPtsTask').value, 10) || 0,
        ptsLose: parseInt(el('gmSetPtsLose').value, 10) || 0,
        ptsPassive: window.gameSettings.ptsPassive || 1
    };
    
    set(ref(db, 'gameState/settings'), newSettings);
    window.showNotification("Asetukset tallennettu!", "info");
};

//==============================================
// HELPERIT
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
            if (val !== null && val !== undefined && val !== "undefined") cleaned[key] = val;
        }
    }
    return cleaned;
};

window.logEvent = function(msg) {
    const timeStr = new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
    push(ref(db, 'gameState/eventLog'), window.cleanFirebaseData({ time: timeStr, msg: msg }));
};

window.logScore = function(playerName, delta) {
    const timeStr = new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
    push(ref(db, 'gameState/scoreLog'), window.cleanFirebaseData({ time: timeStr, playerName: playerName, delta: delta }));
};

window.setupSwipeToClose = function() {
    document.querySelectorAll('.fullscreen-modal').forEach(modal => {
        let startY = null;
        let currentY = null;
        modal.addEventListener('touchstart', e => {
            if (modal.scrollTop <= 5) { startY = e.touches[0].clientY; modal.style.transition = 'none'; } else { startY = null; }
        }, {passive: true});
        modal.addEventListener('touchmove', e => {
            if (startY === null) return;
            currentY = e.touches[0].clientY;
            let diff = currentY - startY;
            if (diff > 0) modal.style.transform = `translateY(${diff}px)`;
        }, {passive: true});
        modal.addEventListener('touchend', e => {
            if (startY === null) return;
            let diff = currentY - startY;
            modal.style.transition = 'transform 0.3s ease';
            if (diff > 120) { 
                modal.style.transform = `translateY(100%)`;
                setTimeout(() => { modal.style.display = 'none'; modal.style.transform = ''; }, 300);
            } else { modal.style.transform = ''; }
            startY = null;
        });
    });
};

window.updateIdentityUI = function() { 
    if(el('identityCard')) { el('identityCard').style.display = myName ? 'none' : 'block'; }
};

window.applyViewState = function() {
    if(el('expandedViewContainer')) { el('expandedViewContainer').style.display = isExpandedView ? 'block' : 'none'; }
    if(el('compactViewContainer')) { el('compactViewContainer').style.display = isExpandedView ? 'none' : 'grid'; }
    if(el('viewToggleBtn')) { el('viewToggleBtn').innerText = isExpandedView ? 'SIIRRY SUPISTETTUUN NÄKYMÄÄN' : 'LAAJENNETTU NÄKYMÄ (KORTIT ESIIN)'; }
};

window.toggleView = function() {
    isExpandedView = !isExpandedView;
    window.applyViewState();
};

window.setRole = function(r) {
    currentRole = r;
    document.body.className = r + '-mode';
    if(el('btnPlayer')) { el('btnPlayer').classList.toggle('active', r === 'player'); }
    if(el('btnGM')) { el('btnGM').classList.toggle('active', r === 'gm'); }
    
    const themeMeta = document.getElementById('themeColorMeta');
    if(themeMeta) themeMeta.setAttribute('content', r === 'gm' ? '#0f172a' : '#d1fae5');
    
    window.renderActiveHole(); 
};

window.showNotification = function(message, type = 'info') {
    const container = el('notificationContainer');
    if(!container) return; 
    let icon = type === 'warning' ? '🛒' : (type === 'debuff' ? '💥' : 'ℹ️');
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.innerHTML = `<span style="font-size:1.3rem;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2000); 
};

window.claimIdentity = function() {
    let n = el('playerNameInput').value.trim();
    if(!n || n.length > 15) return alert("Syötä nimi!"); 
    myName = n; localStorage.setItem('friba_name', n);
    window.updateIdentityUI(); 
    
    if(!allPlayers.find(x => x && x.name === n)) { 
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], boughtThisHole: false }); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${n} liittyi peliin.`);
    }
};

window.renderCourseBanner = function() {
    if(!el('bannerCourseName') || !currentCourse) return;
    el('bannerCourseName').innerText = currentCourse.name;
    el('bannerHoleNum').innerText = currentHoleIndex;
    el('bannerPar').innerText = currentCourse.pars[currentHoleIndex - 1] || 3;
};

window.renderLeaderboard = function() {
    const list = el('playerList');
    if(!list) return;
    let sortedPlayers = [...allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        let dgVal = p.dgScore || 0;
        let dgStr = dgVal > 0 ? `+${dgVal}` : (dgVal === 0 ? 'E' : `${dgVal}`);
        let dgColor = dgVal > 0 ? 'var(--danger)' : (dgVal < 0 ? 'var(--info)' : 'var(--text-main)');
        
        list.innerHTML += `<div class="player-row glass-card ${p.name === myName ? 'me' : ''}" style="margin-bottom:8px;">
            <div style="font-weight:900; font-size:1.2rem; color:var(--text-main);"><span style="color:var(--text-muted); margin-right:10px;">${i+1}.</span>${p.name}</div>
            <div style="display:flex; align-items:center; gap: 15px;">
                <span style="font-size:0.95rem; color:var(--warning); font-weight:900;">${p.score || 0} P</span>
                <span style="font-weight:900; font-size:1.6rem; color:${dgColor}; min-width: 40px; text-align:right;">${dgStr}</span>
            </div>
        </div>`;
    });
};

window.renderActiveHole = function() {
    const container = el('activeHoleContainer');
    const cardsArea = el('activeCardsArea');
    const cardsContainer = el('activeCardsContainer');
    const myRulesContainer = el('myActiveRulesContainer');

    if (!activeHole || !activeHole.rule) {
        if(container) container.innerHTML = ``; 
        if(cardsArea) cardsArea.style.display = 'none'; 
        if(myRulesContainer) myRulesContainer.style.display = 'none'; 
        return;
    }
    
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 3;
    let bountyTag = activeHole.rule.type === 'bounty' ? `🏆 TEHTÄVÄ (+${ptsTask} P)` : '🎲 VÄYLÄSÄÄNTÖ';
    
    if(container) { 
        container.innerHTML = `
            <div class="glass-card" style="border-left: 8px solid var(--primary); padding: 24px 20px; margin-bottom: 25px; border-radius: 16px; position: relative; overflow: hidden;">
                <div style="display:inline-block; background:rgba(16, 185, 129, 0.15); color:var(--primary-dark); padding:6px 12px; border-radius:8px; font-weight:900; font-size:0.85rem; margin-bottom:12px; text-transform:uppercase; letter-spacing: 1px; border: 1px solid rgba(16, 185, 129, 0.3);">${bountyTag}</div>
                <div style="font-size:1.4rem; margin-bottom: 8px; text-transform: uppercase; font-weight: 900; line-height: 1.1; color:var(--text-main);">${activeHole.rule.n}</div>
                <div style="font-size: 1.1rem; line-height: 1.45; font-weight: 700; color: var(--text-muted);">${activeHole.rule.d}</div>
            </div>`; 
    }
    
    let playedCards = Object.values(activeHole.playedCards || {}).filter(Boolean);

    if(playedCards.length > 0) {
        if(cardsArea) cardsArea.style.display = 'block'; 
        let cardsHtml = '';
        let myRulesHtml = '';
        
        playedCards.forEach(pc => {
            let cardDef = window.allCards.find(c => c.n === pc.cardName);
            let cTier = pc.tier || (cardDef ? cardDef.tier : 'normal');
            let cType = pc.type || (cardDef ? cardDef.type : 'sabotage');
            
            let color = 'var(--danger)'; 
            let bgColor = 'rgba(244, 63, 94, 0.15)';
            let icon = '🚨';
            if (cTier === 'premium') { color = 'var(--warning)'; icon = '💎'; bgColor = 'rgba(245, 158, 11, 0.15)'; }
            else if (cType === 'buff') { color = 'var(--info)'; icon = '🛡️'; bgColor = 'rgba(37, 99, 235, 0.15)'; }
            
            let actionText = cType === 'buff' ? `käytti edun` : `sabotoi kohti <strong style="text-transform:uppercase;">${pc.target}</strong>`;
            let undoBtn = currentRole === 'gm' ? `<button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem; width:auto; border-radius:6px;" onclick="event.stopPropagation(); window.undoCardPlay(${pc.timestamp})">PERU</button>` : `<span style="font-size:0.8rem; color:var(--border);">ℹ️</span>`;
            
            cardsHtml += `
                <div class="compact-log-item" onclick="window.triggerPopup('${pc.cardName}', '${pc.cardDesc}', 'Kohde: ${pc.target}<br>Käyttäjä: ${pc.by}')">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.2rem;">${icon}</span>
                        <span style="font-size:0.85rem; color:var(--text-main); font-weight:700;">
                            <b>${pc.by}</b> ${actionText}: <span style="color:${color}; font-weight:900;">${pc.cardName}</span>
                        </span>
                    </div>
                    ${undoBtn}
                </div>`;
            
            if(pc.target && myName && pc.target.trim() === myName.trim()) {
                let label = cType === 'buff' ? 'OMA ETU' : 'SABOTAASI';
                myRulesHtml += `
                    <div class="glass-card" style="border-left: 8px solid ${color}; padding: 20px; margin-bottom: 15px; border-radius: 16px; position: relative; overflow: hidden;">
                        <div style="display:inline-flex; align-items:center; gap:6px; background:${bgColor}; color:${color}; padding:6px 12px; border-radius:8px; font-weight:900; font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; border: 1px solid ${color};">
                            <span>${icon}</span> <span>${label}</span>
                        </div>
                        <div style="font-size:1.5rem; margin-bottom: 8px; text-transform: uppercase; font-weight: 900; line-height: 1.1; color:var(--text-main);">${pc.cardName}</div>
                        <div style="font-size: 1.1rem; line-height: 1.45; font-weight: 700; color: var(--text-muted);">${pc.cardDesc}</div>
                    </div>`;
            }
        });
        
        if(cardsContainer) cardsContainer.innerHTML = cardsHtml; 
        if(myRulesHtml !== '') {
            if(myRulesContainer) {
                myRulesContainer.style.display = 'block';
                myRulesContainer.innerHTML = `<h2 style="font-size:1rem; margin-bottom:10px; color:var(--text-main); display:flex; align-items:center; gap:8px;">⚠️ VAIKUTTAVAT KORTIT</h2>${myRulesHtml}`;
            }
        } else {
            if(myRulesContainer) myRulesContainer.style.display = 'none'; 
        }
    } else {
        if(cardsArea) cardsArea.style.display = 'none'; 
        if(myRulesContainer) myRulesContainer.style.display = 'none'; 
    }
};

window.renderPlayerHand = function(cards) {
    const modalContainer = el('handModalCards');
    const expandedContainer = el('playerHandExpanded');
    
    if (!cards || cards.length === 0) { 
        let emptyHtml = '<p style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kätesi on tyhjä.</p>';
        if(modalContainer) modalContainer.innerHTML = emptyHtml; 
        if(expandedContainer) expandedContainer.innerHTML = emptyHtml; 
        return; 
    }
    
    let html = '';
    cards.forEach((cId) => {
        const cDef = window.allCards.find(sc => sc.id === cId);
        if(!cDef) return; 
        let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
        if(cDef.tier === 'premium') typeClass = 'premium-card'; 
        
        let btnClass = cDef.tier === 'premium' ? 'btn-warning' : (cDef.type === 'buff' ? 'btn-success' : 'btn-danger');
        let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        
        html += `
            <div class="physical-card ${typeClass}" style="padding:0;">
                <div onclick="window.openCardDetail('${cId}', 'hand')" style="flex:1; padding:16px; display:flex; flex-direction:column; cursor:pointer;">
                    <div><div class="card-type-tag">${tagTxt}</div><h3>${cDef.n}</h3><p>${cDef.d}</p></div>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 3D TARKASTELU</div>
                </div>
                <button class="btn ${btnClass}" style="border-radius:0 0 14px 14px; font-size:1.05rem; padding:16px; color:${cDef.tier==='premium'? '#000':'#fff'};" onclick="window.openTargetModal('${cId}')">PELAA KORTTI</button>
            </div>`;
    });
    
    if(modalContainer) modalContainer.innerHTML = html; 
    if(expandedContainer) expandedContainer.innerHTML = html; 
};

window.renderShop = function(shopArray, myPoints, boughtThisHole) {
    const modalContainer = el('shopModalCards');
    const expandedContainer = el('shopItemsExpanded');
    const sellContainer = el('shopSellCardsContainer');
    
    if(!shopArray || shopArray.length === 0) { 
        let emptyHtml = '<p style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kauppa on suljettu.</p>';
        if(modalContainer) modalContainer.innerHTML = emptyHtml; 
        if(expandedContainer) expandedContainer.innerHTML = emptyHtml; 
    } else {
        let html = '';
        shopArray.forEach(item => {
            if(!item) return; 
            const canAfford = myPoints >= item.price && !boughtThisHole;
            let btnText = boughtThisHole ? 'OSTETTU' : (canAfford ? 'OSTA ETU' : 'EI VARAA');
            let btnClass = canAfford ? 'btn-warning' : 'btn-secondary';
            
            html += `
                <div class="physical-card premium-card" style="padding:0; position:relative;">
                    <span class="card-price-tag" style="top:12px; right:12px;">${item.price} P</span>
                    <div onclick="window.openCardDetail('${item.id}', 'shop', ${item.price}, ${canAfford}, ${boughtThisHole})" style="flex:1; padding:16px; display:flex; flex-direction:column; cursor:pointer;">
                        <div><div class="card-type-tag">💎 KAUPPA</div><h3 style="padding-right:45px;">${item.n}</h3><p>${item.d}</p></div>
                        <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 3D TARKASTELU</div>
                    </div>
                    <button class="btn ${btnClass}" style="border-radius:0 0 14px 14px; font-size:1.05rem; padding:16px; color:#000;" ${!canAfford ? 'disabled' : ''} onclick="window.buyShopItem('${item.id}', '${item.n}', ${item.price})">${btnText}</button>
                </div>`;
        });
        if(modalContainer) modalContainer.innerHTML = html; 
        if(expandedContainer) expandedContainer.innerHTML = html; 
    }

    let me = allPlayers.find(p => p && p.name === myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    
    let sellHtml = '';
    if(myCards.length === 0) {
         sellHtml = '<p style="color:var(--text-muted); font-size:1.1rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kätesi on tyhjä.</p>';
    } else {
        myCards.forEach(cId => {
            const cDef = window.allCards.find(sc => sc.id === cId);
            if(!cDef) return; 
            let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
            if(cDef.tier === 'premium') typeClass = 'premium-card'; 
            let tagTxt = cDef.tier === 'premium' ? '💎 PREMIUM' : (cDef.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
            
            let isNormal = cDef.tier === 'normal';
            let btnTxt = isNormal ? '♻️ MYY (+1 P)' : '🗑️ HÄVITÄ';
            let btnClass = isNormal ? 'btn-success' : 'btn-danger';
            
            sellHtml += `
            <div class="physical-card ${typeClass}" style="padding:0; min-height:180px;">
                <div onclick="window.openCardDetail('${cId}', 'sell')" style="flex:1; padding:12px; display:flex; flex-direction:column; cursor:pointer;">
                    <div class="card-type-tag">${tagTxt}</div><h3 style="font-size:1.05rem;">${cDef.n}</h3>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 3D TARKASTELU</div>
                </div>
                <button class="btn ${btnClass}" style="border-radius:0 0 14px 14px; font-size:1rem; padding:14px; color:#fff;" onclick="window.forceDiscard('${cId}', ${isNormal})">${btnTxt}</button>
            </div>`;
        });
    }
    if (sellContainer) sellContainer.innerHTML = sellHtml;
    
    if (window.pendingShopPurchase) {
         if(el('pendingPurchaseAlert')) el('pendingPurchaseAlert').style.display = 'block';
         if(el('pendingCardName')) el('pendingCardName').innerText = window.pendingShopPurchase.name;
    } else {
         if(el('pendingPurchaseAlert')) el('pendingPurchaseAlert').style.display = 'none';
    }
};

window.renderAdminPlayerList = function() {
    const list = el('adminPlayerList');
    if(!list) return; 
    list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        if(!p) return; 
        
        let cardsHtml = '';
        if(p.cards && p.cards.length > 0) {
            cardsHtml = `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; width:100%;">`;
            p.cards.forEach((cId, cIdx) => {
                let cardDef = window.allCards.find(c => c.id === cId);
                if(cardDef) {
                    cardsHtml += `<div style="background:var(--surface-alt); border:2px solid var(--border); padding:4px 8px; border-radius:6px; font-size:0.8rem; display:flex; align-items:center; gap:5px;">
                        ${cardDef.n} <button style="color:var(--danger); font-weight:900; font-size:1.1rem; padding:0 4px; line-height:1;" onclick="window.removeCardFromPlayer(${i}, ${cIdx})">&times;</button>
                    </div>`;
                }
            });
            cardsHtml += `</div>`;
        }

        list.innerHTML += `
            <div class="player-row glass-card" style="flex-direction:column; align-items:flex-start; gap:10px;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <span style="font-weight:900; font-size:1.1rem; color:var(--text-main);">${p.name} (${p.score} P / DG: ${p.dgScore > 0 ? '+' : ''}${p.dgScore || 0})</span>
                    <div style="display:flex; gap: 8px;">
                        <button class="btn btn-success" style="width:auto; padding:10px; font-size:0.85rem;" onclick="window.openGmGiveCard(${i})">+ KORTTI</button>
                        <button class="btn btn-danger" style="width:auto; padding:10px; font-size:0.85rem;" onclick="window.removePlayer(${i})">POISTA</button>
                    </div>
                </div>
                ${cardsHtml}
                <div class="gm-score-adjust">
                    <span style="font-size:0.85rem; color:var(--text-muted); width:50px; font-weight:bold;">Raha</span>
                    <input type="number" id="gmScoreAdjust_${i}" value="1">
                    <button class="btn btn-primary" onclick="if(window.adjustScore) { window.adjustScore(${i}, parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0); }">Lisää</button>
                    <button class="btn btn-danger" onclick="if(window.adjustScore) { window.adjustScore(${i}, -(parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0)); }">Vähennä</button>
                </div>
                <div class="gm-score-adjust">
                    <span style="font-size:0.85rem; color:var(--text-muted); width:50px; font-weight:bold;">Tulos</span>
                    <button class="btn btn-secondary" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, 1); }">+1 Heitto</button>
                    <button class="btn btn-secondary" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, -1); }">-1 Heitto</button>
                </div>
            </div>`;
    });
};

window.openGmGiveCard = function(playerIndex) {
    window.selectedPlayerForCard = playerIndex;
    el('gmCardSearch').value = '';
    window.renderGmCardList('');
    el('gmGiveCardModal').style.display = 'flex';
};

window.renderGmCardList = function(filterTxt) {
    const container = el('gmGiveCardList');
    if(!container) return; 
    let html = '';
    let q = filterTxt.toLowerCase();
    
    window.allCards.forEach(c => {
        if (q && !c.n.toLowerCase().includes(q) && !c.d.toLowerCase().includes(q)) return; 
        
        let typeClass = c.type === 'buff' ? 'buff-card' : 'debuff-card';
        if (c.tier === 'premium') typeClass = 'premium-card'; 
        let tagTxt = c.tier === 'premium' ? '💎 PREMIUM' : (c.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        let btnClass = c.tier === 'premium' ? 'btn-warning' : (c.type === 'buff' ? 'btn-success' : 'btn-danger');
        
        html += `
            <div class="physical-card ${typeClass}" style="padding:0;">
                <div onclick="window.openCardDetail('${c.id}', 'gm')" style="flex:1; padding:16px; display:flex; flex-direction:column; cursor:pointer;">
                    <div><div class="card-type-tag">${tagTxt}</div><h3 style="font-size:1rem;">${c.n}</h3><p style="font-size:0.8rem;">${c.d}</p></div>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 3D TARKASTELU</div>
                </div>
                <button class="btn ${btnClass}" style="border-radius:0 0 14px 14px; padding:16px; font-size:1.05rem; color:${c.tier === 'premium' ? '#000' : '#fff'};" onclick="window.giveCardToPlayer('${c.id}')">ANNA TÄMÄ</button>
            </div>`;
    });
    container.innerHTML = html;
};

window.filterGmCards = function() {
    window.renderGmCardList(el('gmCardSearch').value);
};

window.giveCardToPlayer = function(cardId) {
    if (window.selectedPlayerForCard === null) return; 
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    let p = nextPlayers[window.selectedPlayerForCard];
    let cardDef = window.allCards.find(c => c.id === cardId);
    if (p && cardDef) {
        p.cards = p.cards || [];
        p.cards.push(cardId);
        set(ref(db, `gameState/players`), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${myName} (GM) antoi kortin ${cardDef.n} pelaajalle ${p.name}.`);
        window.showNotification(`Kortti lisätty pelaajalle ${p.name}!`, "info");
        el('gmGiveCardModal').style.display = 'none';
    }
};

window.removeCardFromPlayer = function(pIdx, cIdx) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    let p = nextPlayers[pIdx];
    if(p && p.cards) {
        let cId = p.cards[cIdx];
        let cardDef = window.allCards.find(c => c.id === cId);
        p.cards.splice(cIdx, 1);
        set(ref(db, `gameState/players`), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${myName} (GM) poisti kortin ${cardDef ? cardDef.n : ''} pelaajalta ${p.name}.`);
    }
};

window.gmRollRule = function() {
    if(!activeHole) return; 
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    activeHole.rule = randomRule;
    set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(randomRule));
    window.logEvent(`${myName} (GM) arpoi uuden väyläsäännön: ${randomRule.n}`);
};

window.gmSetRule = function() {
    if(!activeHole) return; 
    const sel = el('gmRuleSelect');
    const ruleDef = window.holeRules[sel.value];
    if(ruleDef) {
        activeHole.rule = ruleDef;
        set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(ruleDef));
        window.logEvent(`${myName} (GM) asetti väyläsäännön: ${ruleDef.n}`);
    }
};

window.renderEventLog = function(logData) {
    const container = el('adminEventLog');
    if(!container) return; 
    container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 30).forEach(l => {
        container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); margin-right:8px; font-weight:900;">[${l.time}]</span>${l.msg}</div>`;
    });
};

window.renderScoreLog = function(logData) {
    const container = el('adminScoreLog');
    if(!container) return;  
    container.innerHTML = "";
    Object.values(logData || {}).reverse().slice(0, 50).forEach(l => {
        let color = l.delta >= 0 ? 'var(--info)' : 'var(--danger)';
        container.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); margin-right:8px; font-weight:900;">[${l.time}]</span><b>${l.playerName}</b>: <span style="color:${color}; font-weight:900;">${l.delta > 0 ? '+' : ''}${l.delta} P</span></div>`;
    });
};

window.triggerPopup = function(title, desc, details) {
    const overlay = el('lotteryWinner');
    if(!overlay) return; 
    el('popupTitle').innerHTML = title;
    el('popupDesc').innerHTML = desc;
    
    const detailsEl = el('popupDetails');
    if(detailsEl) {
        detailsEl.innerHTML = details;
        if(!details || details === '') detailsEl.style.display = 'none'; 
        else detailsEl.style.display = 'block'; 
    }
    overlay.style.display = 'flex';
};

window.adminAddPlayer = function() {
    const input = el('adminNewPlayerName');
    if(!input) return; 
    let n = input.value.trim();
    if(!n) return; 
    
    if(!allPlayers.find(x => x && x.name === n)) { 
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], boughtThisHole: false }); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)).then(() => { input.value = ''; });
        window.logEvent(`${myName} (GM) lisäsi pelaajan ${n}.`);
    }
};

window.adjustScore = function(idx, amt) { 
    if(amt === 0) return; 
    if(allPlayers[idx]) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        nextPlayers[idx].score = Math.max(0, (parseInt(nextPlayers[idx].score, 10) || 0) + amt);
        set(ref(db, `gameState/players`), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${myName} (GM) antoi ${amt} P pelaajalle ${nextPlayers[idx].name}.`);
    }
};

window.adjustDgScore = function(idx, amt) { 
    if(amt === 0) return;  
    if(allPlayers[idx]) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        nextPlayers[idx].dgScore = (parseInt(nextPlayers[idx].dgScore, 10) || 0) + amt;
        set(ref(db, `gameState/players`), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${myName} (GM) sääti pelaajan ${nextPlayers[idx].name} heittotulosta (${amt > 0 ? '+'+amt : amt}).`);
    }
};

window.removePlayer = function(idx) { 
    if(confirm("Poistetaanko pelaaja pelistä?")) { 
        let pName = allPlayers[idx].name;
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        nextPlayers.splice(idx, 1); 
        set(ref(db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${myName} (GM) poisti pelaajan ${pName}.`);
    } 
};

window.resetGame = function() {
    if (confirm("Haluatko varmasti nollata koko kierroksen tiedot? Kaikki kirjataan ulos.")) {
        localStorage.removeItem('friba_browser_mode');
        set(ref(db, 'gameState'), window.cleanFirebaseData({ settings: window.gameSettings, players: [], activeHole: null, currentHoleIndex: 1, course: null }))
        .then(() => { localStorage.clear(); location.reload(); });
        window.logEvent(`${myName} (GM) nollasi koko pelin.`);
    }
};

window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextHoleIndex = 1;
    
    let premiumPool = window.allCards.filter(c => c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) break; 
    }
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    let normalPool = window.allCards.filter(c => c.tier === "normal");
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            let pCards = [
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id
            ];
            return { ...p, score: 3, dgScore: 0, cards: pCards, boughtThisHole: false };
        });
    }
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        course: nextCourse,
        currentHoleIndex: nextHoleIndex,
        activeHole: nextActiveHole,
        players: nextPlayers
    }));

    if(el('courseModal')) el('courseModal').style.display = 'none'; 
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${nextCourse.name}. Kaikki saivat 3 P ja 3 korttia.`);
};

window.generateParInputs = function() {
    const count = parseInt(el('setupHoleCount').value) || 0;
    const container = el('parInputsContainer');
    if(!container) return; 
    container.innerHTML = '';
    for(let i=1; i<=count; i++) { 
        container.innerHTML += `<div style="background:var(--surface-alt); padding:12px; border-radius:10px; border:2px solid var(--border);"><label style="font-size:0.9rem; color:var(--text-muted); font-weight:900;">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:10px; border:none; background:transparent; font-size:1.2rem;" /></div>`;
    }
};

window.saveCourseSetup = function() {
    const name = el('setupCourseName').value || "Rata";
    const count = parseInt(el('setupHoleCount').value) || 0;
    if(count < 1) return alert("Syötä vähintään 1 väylä!"); 
    let pars = [];
    for(let i=1; i<=count; i++) pars.push(parseInt(el(`setupPar_${i}`).value) || 3); 
    
    let nextCourse = { name: name, pars: pars };
    let nextHoleIndex = 1;
    
    let premiumPool = window.allCards.filter(c => c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) break; 
    }
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    let normalPool = window.allCards.filter(c => c.tier === "normal");
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            let pCards = [
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id,
                normalPool[Math.floor(Math.random() * normalPool.length)].id
            ];
            return { ...p, score: 3, dgScore: 0, cards: pCards, boughtThisHole: false };
        });
    }

    update(ref(db, 'gameState'), window.cleanFirebaseData({
        course: nextCourse,
        currentHoleIndex: nextHoleIndex,
        activeHole: nextActiveHole,
        players: nextPlayers
    }));

    if(el('courseModal')) el('courseModal').style.display = 'none'; 
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${nextCourse.name}. Kaikki saivat 3 P ja 3 korttia.`);
};

window.changeScore = function(safeId, par, delta) {
    let input = el(`scoreInput_${safeId}`);
    if(!input) return; 
    let val = parseInt(input.value) + delta;
    if(val < 1) val = 1; 
    input.value = val;
    
    let display = el(`scoreDisplay_${safeId}`);
    if(!display) return; 
    display.innerText = val;
    display.className = 'score-display';
    
    if(val < par) display.classList.add('score-birdie'); 
    else if(val > par) display.classList.add('score-bogey'); 
    else display.classList.add('score-par'); 
};

window.openScoreModal = function() {
    if(allPlayers.length === 0) return alert("Ei pelaajia radalla."); 
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    
    if(el('scoreModalHoleNum')) el('scoreModalHoleNum').innerText = currentHoleIndex; 
    if(el('scoreModalPar')) el('scoreModalPar').innerText = par; 
    
    const box = el('scoreModalRuleBox');
    if(box) {
        if(activeHole && activeHole.rule) {
            let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 3;
            let bTxt = activeHole.rule.type === 'bounty' ? `🏆 TEHTÄVÄ (+${ptsTask} P)` : '🎲 VÄYLÄSÄÄNTÖ';
            box.innerHTML = `
                <div style="display:inline-block; background:rgba(16, 185, 129, 0.15); color:var(--primary); padding:6px 12px; border-radius:8px; font-weight:900; font-size:0.85rem; margin-bottom:12px; text-transform:uppercase; letter-spacing: 1px; border: 1px solid rgba(16, 185, 129, 0.3);">${bTxt}</div>
                <div style="font-size:1.4rem; margin-bottom: 8px; text-transform: uppercase; font-weight: 900; line-height: 1.1; color:var(--text-main);">${activeHole.rule.n}</div>
                <div style="font-size: 1.05rem; line-height: 1.45; font-weight: 700; color: var(--text-muted);">${activeHole.rule.d}</div>`;
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    }
    
    const container = el('scoreInputsContainer');
    if(!container) return; 
    
    let html = '';
    let taskCheckboxes = '';
    
    allPlayers.forEach((p, i) => {
        if(!p) return; 
        
        let encodedName = p.name.replace(/"/g, '&quot;');
        taskCheckboxes += `<label class="task-checkbox-label"><input type="checkbox" class="task-checkbox" data-name="${encodedName}" style="width:28px; height:28px; margin:0;" /> ${p.name}</label>`;
        
        let safeId = "player_" + i; 
        html += `
            <div class="score-row">
                <span class="score-name">${p.name}</span>
                <div class="score-controls">
                    <button class="btn-score-ctrl" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                    <div id="scoreDisplay_${safeId}" class="score-display score-par">${par}</div>
                    <button class="btn-score-ctrl" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
                    <input type="hidden" class="score-input-data" data-name="${encodedName}" id="scoreInput_${safeId}" value="${par}" />
                </div>
            </div>`;
    });
    container.innerHTML = html;
    if(el('taskWinnerContainer')) el('taskWinnerContainer').innerHTML = taskCheckboxes; 
    
    const sm = el('scoreModal');
    if(sm) sm.style.display = 'flex'; 
};

window.submitScores = function() {
    let par = currentCourse && currentCourse.pars ? (currentCourse.pars[currentHoleIndex - 1] || 3) : 3;
    
    let playerResults = {};
    allPlayers.forEach(p => {
        if(p) playerResults[p.name] = { strokes: par, taskWon: false }; 
    });
    
    const inputs = document.querySelectorAll('.score-input-data');
    if(inputs.length === 0) {
        alert("Virhe: Ei tulosrivejä löydetty! Yritä avata näkymä uudelleen.");
        if(el('scoreModal')) el('scoreModal').style.display = 'none'; 
        return;
    }
    
    inputs.forEach(input => {
        let attrName = input.getAttribute('data-name');
        if(playerResults[attrName]) {
            playerResults[attrName].strokes = parseInt(input.value, 10) || par;
        }
    });

    document.querySelectorAll('.task-checkbox:checked').forEach(cb => {
        let pName = cb.getAttribute('data-name');
        if (playerResults[pName]) {
            playerResults[pName].taskWon = true;
        }
    });

    let minStrokes = 9999;
    let maxStrokes = -9999;
    for (let key in playerResults) {
        let s = playerResults[key].strokes;
        if (s < minStrokes) minStrokes = s;
        if (s > maxStrokes) maxStrokes = s;
    }

    let holeWinners = [];
    let holeLosers = [];
    for (let key in playerResults) {
        if (playerResults[key].strokes === minStrokes) holeWinners.push(key);
        if (playerResults[key].strokes === maxStrokes) holeLosers.push(key);
    }
    
    let normalPool = window.allCards.filter(c => c.tier === "normal");
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);

    let ptsWin = window.gameSettings.ptsWin !== undefined ? window.gameSettings.ptsWin : 2;
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 3;
    let ptsLose = window.gameSettings.ptsLose !== undefined ? window.gameSettings.ptsLose : 0;
    let ptsPassive = window.gameSettings.ptsPassive !== undefined ? window.gameSettings.ptsPassive : 1;
    let handLimit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 5;
    let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;

    nextPlayers.forEach(p => {
        if (!p) return; 
        let res = playerResults[p.name];
        if (!res) return; 
        
        p.dgScore = (parseInt(p.dgScore, 10) || 0) + (res.strokes - par);
        
        let currentPoints = parseInt(p.score, 10) || 0;
        currentPoints += ptsPassive;
        
        if (holeWinners.includes(p.name)) { currentPoints += ptsWin; }
        if (res.taskWon) { currentPoints += ptsTask; }
        if (holeLosers.includes(p.name) && minStrokes !== maxStrokes) { 
            currentPoints -= Math.abs(ptsLose); 
            currentPoints = Math.max(0, currentPoints);
        }
        
        p.score = currentPoints;
        p.boughtThisHole = false; 
        
        p.cards = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
        p.cards = p.cards.filter(Boolean);
        
        let cardsToGive = (holeLosers.includes(p.name) && minStrokes !== maxStrokes) ? 3 : 2;
        
        for(let i=0; i<cardsToGive; i++) {
            if (!limitEnabled || p.cards.length < handLimit) {
                p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
            }
        }
        
        p.cards = p.cards.filter(Boolean);
    });
    
    let nextHoleIndex = currentHoleIndex + 1;
    
    const randomRule = window.holeRules[Math.floor(Math.random() * window.holeRules.length)];
    let premiumPool = window.allCards.filter(c => c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) break; 
    }
    
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        players: nextPlayers,
        currentHoleIndex: nextHoleIndex,
        activeHole: nextActiveHole
    }));

    if(el('scoreModal')) el('scoreModal').style.display = 'none'; 
    window.logEvent(`${myName} syötti tulokset väylältä ${currentHoleIndex}.`);
};

//==============================================
// FIREBASE ONVALUE KUUNTELIJA ON NYT LOPUSSA
//==============================================
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    
    if(!data) {
        if(myName) {
            myName = null;
            localStorage.removeItem('friba_name');
            window.updateIdentityUI();
            if(el('handModal')) el('handModal').style.display = 'none'; 
            if(el('shopModal')) el('shopModal').style.display = 'none'; 
        }
        currentCourse = null;
        window.renderCourseBanner();
        return;
    }

    window.gameSettings = data.settings || { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };

    if (el('gmSetShop')) el('gmSetShop').checked = window.gameSettings.shopEnabled;
    if (el('gmSetLimitCheck')) el('gmSetLimitCheck').checked = window.gameSettings.handLimitEnabled;
    if (el('gmSetLimitCount')) el('gmSetLimitCount').value = window.gameSettings.handLimit;
    if (el('gmSetPtsWin')) el('gmSetPtsWin').value = window.gameSettings.ptsWin;
    if (el('gmSetPtsTask')) el('gmSetPtsTask').value = window.gameSettings.ptsTask;
    if (el('gmSetPtsLose')) el('gmSetPtsLose').value = window.gameSettings.ptsLose;

    if (el('shopButtonElement')) {
        el('shopButtonElement').style.display = window.gameSettings.shopEnabled ? 'flex' : 'none';
    }

    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;

    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (!me) {
            myName = null;
            localStorage.removeItem('friba_name');
            if(el('handModal')) el('handModal').style.display = 'none'; 
            if(el('shopModal')) el('shopModal').style.display = 'none'; 
        }
    }

    window.updateIdentityUI();
    
    const gameSetupArea = el('gameSetupArea');
    const mainGameArea = el('mainGameArea');
    
    if (gameSetupArea && mainGameArea && myName) {
        if (!currentCourse) {
            gameSetupArea.style.display = 'block';
            mainGameArea.style.display = 'none';
        } else {
            gameSetupArea.style.display = 'none';
            mainGameArea.style.display = 'block';
        }
    } else if (gameSetupArea && mainGameArea) {
        gameSetupArea.style.display = 'none';
        mainGameArea.style.display = 'none';
    }

    window.renderCourseBanner();
    window.renderLeaderboard();
    window.renderActiveHole();
    window.applyViewState();
    
    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (me) {
            let currentPoints = parseInt(me.score, 10) || 0;
            if (typeof window.myLastHoleIndex === 'undefined') {
                window.myLastHoleIndex = currentHoleIndex;
                window.myLastScore = currentPoints;
            } else if (window.myLastHoleIndex !== currentHoleIndex) {
                let diff = currentPoints - window.myLastScore;
                if (diff > 0) {
                    window.showAppleToast(`+${diff} P! (Yhteensä ${currentPoints} P)`, '💰');
                } else if (diff < 0) {
                    window.showAppleToast(`${diff} P! (Yhteensä ${currentPoints} P)`, '📉');
                } else {
                    window.showAppleToast(`Ei pisteitä. (Yhteensä ${currentPoints} P)`, '👍');
                }
                window.myLastHoleIndex = currentHoleIndex;
                window.myLastScore = currentPoints;
            } else {
                window.myLastScore = currentPoints;
            }

            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : [];
            window.renderPlayerHand(myCards.filter(Boolean));
            window.renderShop(activeHole ? activeHole.shop : null, me.score || 0, me.boughtThisHole);
            
            if (window.gameSettings.handLimitEnabled && myCards.filter(Boolean).length > window.gameSettings.handLimit) {
                window.showHandLimitModal(myCards.filter(Boolean));
            } else {
                if(el('handLimitModal')) el('handLimitModal').style.display = 'none';
            }
            
            let pts = `${me.score || 0} P`;
            if(el('myResPointsBtn')) el('myResPointsBtn').innerText = pts; 
            if(el('myResPointsExpanded')) el('myResPointsExpanded').innerText = pts; 
            if(el('mainWalletPoints')) el('mainWalletPoints').innerText = pts; 
            if(el('shopModalWallet')) el('shopModalWallet').innerText = pts; 
            if(el('handCountBadge')) el('handCountBadge').innerText = myCards.filter(Boolean).length; 
        }

        if (activeHole && activeHole.playedCards) {
            const playedCards = Array.isArray(activeHole.playedCards) ? activeHole.playedCards : Object.values(activeHole.playedCards);
            const myNewDebuffs = playedCards.filter(Boolean).filter(pc => pc.target === myName && pc.timestamp > lastPlayedCardTimestamp && pc.type === 'sabotage');
            
            if (myNewDebuffs.length > 0) {
                myNewDebuffs.forEach(db => {
                    window.showNotification(`💥 Sinua sabotoitiin: ${db.cardName}`, 'debuff');
                    if (navigator.vibrate) { navigator.vibrate([200, 100, 200]); }
                });
                lastPlayedCardTimestamp = Math.max(...playedCards.map(pc => pc.timestamp));
            }
        }
    }

    window.renderAdminPlayerList();
    window.renderEventLog(data.eventLog);
    window.renderScoreLog(data.scoreLog);
});

// Lopuksi ajetaan sivun valmiiksi kokoavat skriptit
window.setupSwipeToClose();
window.populateRuleSelect = function() {
    const sel = el('gmRuleSelect');
    if(!sel || typeof window.holeRules === 'undefined') return; 
    sel.innerHTML = window.holeRules.map((r, i) => `<option value="${i}">${r.n}</option>`).join('');
};
setTimeout(window.populateRuleSelect, 500);
