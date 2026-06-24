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

// YLEISET MUUTTUJAT
const el = id => document.getElementById(id);

let myName = localStorage.getItem('friba_name') || null;
let currentRole = 'player';
let allPlayers = [];
let activeHole = null;
let currentCourse = null;
let currentHoleIndex = 1;
let lastPlayedCardTimestamp = Date.now();

window.gameSettings = { shopEnabled: true, handLimitEnabled: true, handLimit: 5, ptsWin: 2, ptsTask: 3, ptsLose: 0, ptsPassive: 1 };
window.pendingShopPurchase = null;

//==============================================
// PWA ASENNUS & OHJEET
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
    const cardDef = (window.allCards || []).find(c => c && c.id === cardId);
    if (!cardDef) return;
    
    window.pendingCardPlay = { id: cardId, def: cardDef };
    
    if(cardDef.type === 'buff') {
        window.executeCardPlay(myName);
        return;
    }
    
    let opponents = (allPlayers || []).filter(p => p && p.name !== myName);
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
    window.closeShopModal();
    
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
        pCards[cKey] = { cardId: card.id || 'err_id', cardName: card.def.n || 'Nimetön', cardDesc: card.def.d || '-', target: targetName || 'Joku', by: myName || 'Joku', type: card.def.type || 'sabotage', tier: card.def.tier || 'normal', timestamp: timestamp };
    }
    
    let updates = {};
    updates['gameState/players'] = window.cleanFirebaseData(nextPlayers);
    if(activeHole) { updates['gameState/activeHole/playedCards'] = window.cleanFirebaseData(pCards); }
    
    update(ref(db), updates);
    window.logEvent(`${myName} pelasi kortin ${card.def.n} kohteelle ${targetName}.`);
    let type = card.def.type === 'buff' ? 'info' : 'debuff';
    window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, type);
};

//==============================================
// TÄYDELLISESTI OPTIMOITU KORTTIVIUHKA MATEMATIIKALLA
//==============================================
window.carouselCards = [];
window.carouselCurrentMode = 'hand';
window.carouselArgs = [];
window.carouselCurrentIndex = 0;
window.cardLastRotX = 0;
window.cardLastRotY = 0;

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
                <div class="card-3d-inner" id="card3d-inner-${i}">
                    <div class="card-face card-front ${typeClass}">
                        <div style="text-align:left; display:flex; flex-direction:column; height:100%;">
                            <div class="card-type-tag" style="font-size:1.3rem; margin-bottom:12px;">${tagTxt}</div>
                            <h3 style="font-size:2.4rem; margin-bottom:20px; color:#000; word-break:break-word; hyphens:auto; line-height:1.1;">${cDef.n}</h3>
                            <p style="font-size:1.6rem; color:#111; font-weight:800; line-height:1.4; overflow-y:visible; padding-right:5px;">${cDef.d}</p>
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
        if (!isScrolling) {
            window.requestAnimationFrame(updateCarouselLayout);
            isScrolling = true;
        }
    }, {passive: true});

    function updateCarouselLayout() {
        const scrollLeft = container.scrollLeft;
        const containerWidth = container.clientWidth;
        const centerOffset = containerWidth / 2;
        const cardWidth = 280; // Määrätty CSS:ssä
        const paddingLeft = centerOffset - (cardWidth / 2); // Keskittää ensimmäisen kortin
        
        let closestIndex = 0;
        let minDiff = 9999;

        // Puhdas matematiikka ilman DOM-lukemista silmukassa (60fps takuu!)
        for (let index = 0; index < cards.length; index++) {
            const card = cards[index];
            const cardCenter = paddingLeft + (index * cardWidth) + (cardWidth / 2) - scrollLeft;
            const diff = (cardCenter - centerOffset) / 140; // Levittää viuhkaa
            
            const transX = diff * -70; // Tuo vierekkäisiä kortteja näkyviin sivuille
            const rotZ = diff * 8;     // Kaarevuus
            const transY = Math.abs(diff) * 20; // Pudotus
            const scale = Math.max(0.8, 1.15 - Math.abs(diff) * 0.15); // Keskikortti on massiivinen
            
            // translate3d ottaa käyttöön rautakiihdytyksen
            card.style.transform = `translate3d(${transX}px, ${transY}px, 0) rotateZ(${rotZ}deg) scale(${scale})`;
            card.style.zIndex = 100 - Math.floor(Math.abs(diff)*10);
            
            if (Math.abs(diff) < minDiff) {
                minDiff = Math.abs(diff);
                closestIndex = index;
            }
        }
        
        if (window.carouselCurrentIndex !== closestIndex) {
            window.carouselCurrentIndex = closestIndex;
            window.updateCarouselButtons();
        }
        
        isScrolling = false;
    }
    
    // Alustus
    setTimeout(updateCarouselLayout, 50);

    // KORTIN OMNI-PYÖRITYS (Ylös/alas pyyhkäisy)
    let startX = 0; let startY = 0;
    let isSpinning = false;
    
    container.addEventListener('touchstart', e => {
        if(e.touches.length > 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSpinning = false;
        
        const activeInner = el(`card3d-inner-${window.carouselCurrentIndex}`);
        if(activeInner) activeInner.style.transition = 'none';
    }, {passive: true});

    container.addEventListener('touchmove', e => {
        let currentX = e.touches[0].clientX;
        let currentY = e.touches[0].clientY;
        let dx = currentX - startX;
        let dy = currentY - startY;
        
        if (!isSpinning && Math.abs(dy) > Math.abs(dx) + 10) {
            isSpinning = true;
        }
        
        if (isSpinning) {
            e.preventDefault(); 
            const activeInner = el(`card3d-inner-${window.carouselCurrentIndex}`);
            if(activeInner) {
                let newRotX = window.cardLastRotX - (dy * 0.4); 
                let newRotY = window.cardLastRotY + (dx * 0.4); 
                activeInner.style.transform = `rotateX(${newRotX}deg) rotateY(${newRotY}deg)`;
            }
        }
    }, {passive: false});

    container.addEventListener('touchend', e => {
        if (isSpinning) {
            const activeInner = el(`card3d-inner-${window.carouselCurrentIndex}`);
            if(activeInner) {
                let transformStr = activeInner.style.transform;
                let match = transformStr.match(/rotateX\(([-0-9.]+)deg\)/);
                if(match) {
                    let rx = parseFloat(match[1]);
                    window.cardLastRotX = Math.round(rx / 180) * 180;
                    window.cardLastRotY = 0;
                    activeInner.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    activeInner.style.transform = `rotateX(${window.cardLastRotX}deg) rotateY(0deg)`;
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
    } else if (mode === 'gm') {
        window.carouselCards = (window.allCards || []).map(c => c.id);
    } else if (mode === 'played') {
        window.carouselCards = [cId]; 
    } else {
        window.carouselCards = [cId]; 
    }
    
    window.carouselCurrentMode = mode;
    window.carouselArgs = [arg1, arg2, arg3];
    window.carouselCurrentIndex = window.carouselCards.indexOf(cId);
    if(window.carouselCurrentIndex === -1) window.carouselCurrentIndex = 0;
    
    window.cardLastRotX = 0;
    window.cardLastRotY = 0;
    
    window.renderCarousel();
    el('cardDetailModal').style.display = 'flex';
    
    setTimeout(() => {
        window.initNativeCarousel();
        const container = el('cardCarousel');
        const targetCard = el(`carousel-wrapper-${window.carouselCurrentIndex}`);
        if(container && targetCard) {
            container.scrollLeft = (window.carouselCurrentIndex * 280); // Manuaalinen vieritys oikeaan korttiin ilman offsetLeftiä
        }
    }, 100);
};

window.updateCarouselButtons = function() {
    if(window.carouselCards.length === 0) return;
    let cId = window.carouselCards[window.carouselCurrentIndex];
    let cDef = (window.allCards || []).find(c => c && c.id === cId);
    if(!cDef) return;
    
    let btnHtml = '';
    let mode = window.carouselCurrentMode;
    let [arg1, arg2, arg3] = window.carouselArgs;

    if (mode === 'hand' || mode === 'sell') {
        btnHtml = `<button class="btn btn-success" style="font-size:1.1rem; padding:18px; box-shadow:0 10px 25px rgba(16,185,129,0.4);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.openTargetModal('${cId}')">PELAA KORTTI</button>`;
        if (cDef.tier === 'normal') {
            btnHtml += `<button class="btn btn-danger" style="font-size:1.1rem; padding:18px; margin-top:5px; background:var(--danger); color:#fff; box-shadow:0 4px 15px rgba(220,38,38,0.5);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', true)">♻️ MYY KORTTI (+1 P)</button>`;
        } else {
            btnHtml += `<button class="btn btn-secondary glass-card" style="font-size:1.05rem; padding:16px; margin-top:5px; color:var(--danger);" onclick="document.getElementById('cardDetailModal').style.display='none'; window.forceDiscard('${cId}', false)">🗑️ HÄVITÄ KORTTI (0 P)</button>`;
        }
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
    } else if (mode === 'played') {
        btnHtml = ``;
    }

    el('cardDetailActionArea').innerHTML = btnHtml;
};

//==============================================
// KORTIN POISTO JA KAUPPA
//==============================================
window.forceDiscard = function(cId, isNormal) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === myName);
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
            const sIdx = (nextShop || []).findIndex(i => i && i.id === pId);
            if (sIdx !== -1) nextShop.splice(sIdx, 1);
            
            let updates = {};
            updates['gameState/players'] = window.cleanFirebaseData(nextPlayers);
            updates['gameState/activeHole/shop'] = window.cleanFirebaseData(nextShop);
            
            update(ref(db), updates);
            
            window.pendingShopPurchase = null;
            window.closeShopModal();
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
    const me = (nextPlayers || []).find(p => p && p.name === myName);
    if (!me || me.score < priceVal || me.boughtThisHole) return; 

    let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
    let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 5;
    let currentCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean).length : 0;
    
    if (limitEnabled && currentCards >= limit) {
        window.pendingShopPurchase = { id: idStr, name: nameStr, price: priceVal };
        window.switchShopTab('sell');
        window.renderShop(activeHole ? activeHole.shop : null, me.score, me.boughtThisHole); 
        document.querySelector('.shop-binder-modal').classList.add('binder-modal-anim');
        return;
    }

    const shopIndex = (activeHole.shop || []).findIndex(i => i && i.id === idStr);
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

        window.closeShopModal();
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

// KANSION AVAAMINEN JA SULKEMINEN (SWIPE)
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
    if(modalEl) {
        modalEl.classList.remove('binder-modal-anim');
        modalEl.style.transform = ''; 
    }
};

let shopStartY = 0;
let shopCurrentY = 0;
let binderContent = document.querySelector('.binder-content');
let binderModal = document.querySelector('.shop-binder-modal');

if(binderContent && binderModal) {
    binderContent.addEventListener('touchstart', e => {
        if(binderContent.scrollTop <= 5) {
            shopStartY = e.touches[0].clientY;
            shopCurrentY = shopStartY; 
        } else {
            shopStartY = 0;
        }
    }, {passive: true});

    binderContent.addEventListener('touchmove', e => {
        if(shopStartY === 0) return;
        shopCurrentY = e.touches[0].clientY;
        let dy = shopCurrentY - shopStartY;
        if(dy > 0) {
            binderModal.style.transform = `translateY(${dy}px)`;
            if (e.cancelable) e.preventDefault();
        }
    }, {passive: false});

    binderContent.addEventListener('touchend', e => {
        if(shopStartY === 0) return;
        let dy = shopCurrentY - shopStartY;
        if(dy > 150 && shopCurrentY !== shopStartY) { 
            window.closeShopModal();
        } else {
            binderModal.style.transform = '';
        }
        shopStartY = 0;
    }, {passive: true});
}

window.switchShopTab = function(tab) {
    const modalEl = document.querySelector('#shopModal .shop-binder-modal');
    const headerTitle = el('shopModalHeaderTitle');
    
    if (tab === 'buy') {
        window.pendingShopPurchase = null; 
        el('shopBuyArea').style.display = 'block';
        el('shopSellArea').style.display = 'none';
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.add('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.remove('active');
        if(modalEl) {
            modalEl.classList.remove('theme-own');
            modalEl.classList.add('theme-shop');
        }
        if(headerTitle) headerTitle.innerText = '🛒 KAUPPA';
    } else {
        el('shopBuyArea').style.display = 'none';
        el('shopSellArea').style.display = 'block';
        if(el('shopTabBuyBtn')) el('shopTabBuyBtn').classList.remove('active');
        if(el('shopTabSellBtn')) el('shopTabSellBtn').classList.add('active');
        if(modalEl) {
            modalEl.classList.remove('theme-shop');
            modalEl.classList.add('theme-own');
        }
        if(headerTitle) {
            let pName = myName ? myName.toUpperCase() : 'PELAAJA';
            headerTitle.innerText = `🗂️ ${pName} - KORTIT`;
        }
    }
    
    let me = (allPlayers || []).find(p => p && p.name === myName);
    window.renderShop(activeHole ? activeHole.shop : null, me ? me.score : 0, me ? me.boughtThisHole : false);
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
// HELPERIT JA UI PÄIVITYKSET
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

window.updateIdentityUI = function() { 
    if(el('identityCard')) { el('identityCard').style.display = myName ? 'none' : 'block'; }
};

window.setRole = function(r) {
    currentRole = r;
    document.body.className = r + '-mode';
    if(el('btnPlayer')) { el('btnPlayer').classList.toggle('active', r === 'player'); }
    if(el('btnGM')) { el('btnGM').classList.toggle('active', r === 'gm'); }
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
    
    if(!(allPlayers || []).find(x => x && x.name === n)) { 
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
        let scoreClass = dgVal < 0 ? 'score-birdie-paper' : (dgVal > 0 ? 'score-bogey-paper' : '');
        let scoreColor = dgVal === 0 ? 'color: var(--ink-blue);' : '';
        
        list.innerHTML += `
        <div class="player-row-paper">
            <span class="paper-name">${i+1}. ${p.name}</span>
            <div style="display:flex; align-items:center; gap: 15px;">
                <span style="font-size:1.1rem; color:var(--warning); font-weight:900; font-family:'Inter', sans-serif;">${p.score || 0} P</span>
                <div class="score-display-paper ${scoreClass}" style="width:40px !important; height:40px !important; font-size:1.2rem !important; border-width:2px; ${scoreColor} margin-left:auto;">${dgStr}</div>
            </div>
        </div>`;
    });
};

window.renderActiveHole = function() {
    const container = el('activeHoleContainer');
    const cardsArea = el('activeCardsArea');
    const cardsContainer = el('activeCardsContainer');

    if (!activeHole || !activeHole.rule) {
        if(container) container.innerHTML = ``; 
        if(cardsArea) cardsArea.style.display = 'none'; 
        return;
    }
    
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 3;
    let bountyTag = activeHole.rule.type === 'bounty' ? `🏆 TEHTÄVÄ (+${ptsTask} P)` : '🎲 VÄYLÄSÄÄNTÖ';
    
    if(container) { 
        container.innerHTML = `
            <div class="post-it-note">
                <div class="post-it-tape"></div>
                <div style="font-weight:900; font-size:0.8rem; margin-bottom:8px; text-transform:uppercase; color:#666; font-family:'Inter', sans-serif;">${bountyTag}</div>
                <div style="font-size:1.6rem; margin-bottom: 8px; font-weight: 900; line-height: 1.1; font-family:'Inter', sans-serif; color:#111;">${activeHole.rule.n}</div>
                <div style="font-size: 1.15rem; line-height: 1.4; font-family:'Inter', sans-serif; font-weight:700; color:#222;">${activeHole.rule.d}</div>
            </div>`; 
    }
    
    let playedCards = Object.values(activeHole.playedCards || {}).filter(Boolean);

    if(playedCards.length > 0) {
        if(cardsArea) cardsArea.style.display = 'block'; 
        
        let myDebuffsHtml = '';
        let otherCardsHtml = '';
        
        playedCards.forEach((pc, i) => {
            let cardDef = (window.allCards || []).find(c => c && c.n === pc.cardName);
            let cTier = pc.tier || (cardDef ? cardDef.tier : 'normal');
            let cType = pc.type || (cardDef ? cardDef.type : 'sabotage');
            
            let undoBtn = currentRole === 'gm' ? `<button class="btn btn-danger" style="padding:8px; font-size:0.75rem; margin-top:8px;" onclick="event.stopPropagation(); window.undoCardPlay(${pc.timestamp})">PERU</button>` : ``;
            let clickAttr = cardDef ? `onclick="window.openCardDetail('${cardDef.id}', 'played')"` : '';
            let cursorStyle = cardDef ? `cursor:pointer;` : '';
            
            if (pc.target === myName) {
                let typeClass = cType === 'buff' ? 'buff-card' : 'debuff-card';
                if(cTier === 'premium') typeClass = 'premium-card';
                let tagTxt = cTier === 'premium' ? '💎 PREMIUM' : (cType === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
                
                let rot = Math.floor(Math.random() * 10) - 5; 
                let pinLeft = 50 + (Math.floor(Math.random() * 20) - 10);
                
                myDebuffsHtml += `
                    <div class="pinned-card-container" style="--rot:${rot}deg;">
                        <div class="pushpin" style="left: ${pinLeft}%;"></div>
                        <div class="physical-card ${typeClass}" ${clickAttr} style="${cursorStyle}">
                            <div class="card-type-tag">${tagTxt}</div>
                            <h3 style="font-size:1.05rem;">${pc.cardName}</h3>
                            <p style="font-size:0.85rem;">${pc.cardDesc}</p>
                            <div style="background:rgba(0,0,0,0.05); padding:6px; border-radius:6px; font-size:0.8rem; text-align:center; color:var(--text-main); font-weight:bold; margin-top:auto;">
                                Pelattu sinulle<br>
                                <span style="font-weight:normal;">(Pelaaja: ${pc.by})</span>
                            </div>
                            ${undoBtn}
                        </div>
                    </div>`;
            } else {
                let typeIcon = cType === 'buff' ? '🛡️' : '🚫';
                let gmUndo = currentRole === 'gm' ? ` <button style="color:var(--danger); background:none; border:none; font-weight:900; font-size:0.8rem; padding:4px;" onclick="event.stopPropagation(); window.undoCardPlay(${pc.timestamp})">[PERU]</button>` : '';
                otherCardsHtml += `
                    <div style="background:rgba(255,255,255,0.7); padding:10px 12px; border-radius:8px; margin-bottom:8px; font-size:0.9rem; color:#111; box-shadow: 2px 4px 6px rgba(0,0,0,0.2); transform: perspective(800px) translateZ(5px); ${cursorStyle}" ${clickAttr}>
                        <b style="font-size:1rem;">${typeIcon} ${pc.cardName}</b><br>
                        <span style="font-size:0.8rem; color:#555;">Pelaaja <b>${pc.by}</b> pelasi kohteelle <b style="text-transform:uppercase; color:var(--danger);">${pc.target}</b></span>${gmUndo}
                    </div>`;
            }
        });
        
        if(cardsContainer) {
            cardsContainer.innerHTML = myDebuffsHtml;
            if(otherCardsHtml !== '') {
                cardsContainer.innerHTML += `<div style="grid-column: 1 / -1; margin-top: 15px;"><h3 style="font-size:0.75rem; margin-bottom:10px; color:var(--text-muted); text-transform:uppercase;">Muiden väliset tapahtumat</h3>${otherCardsHtml}</div>`;
            }
        }
    } else {
        if(cardsArea) cardsArea.style.display = 'none'; 
    }
};

window.renderShop = function(shopArray, myPoints, boughtThisHole) {
    const modalContainer = el('shopModalCards');
    const sellContainer = el('shopSellCardsContainer');
    
    // OSTA-VÄLILEHTI
    if(!shopArray || shopArray.length === 0) { 
        if(modalContainer) modalContainer.innerHTML = '<p style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kauppa on suljettu.</p>';
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
                    <div class="plastic-sleeve">
                        <div class="physical-card premium-card foil-shine" onclick="window.openCardDetail('${item.id}', 'shop', ${item.price}, ${canAfford}, ${boughtThisHole})" style="cursor:pointer;">
                            <span class="card-price-tag">${item.price} P</span>
                            <div class="card-type-tag">💎 KAUPPA</div><h3 style="padding-right:35px;">${item.n}</h3><p>${item.d}</p>
                            <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); padding-top:10px; margin-top:auto;">🔄 3D TARKASTELU</div>
                        </div>
                    </div>
                    <button class="shop-item-btn ${btnClass}" ${dis} onclick="window.buyShopItem('${item.id}', '${item.n}', ${item.price})">${btnText}</button>
                </div>`;
        });
        if(modalContainer) modalContainer.innerHTML = html; 
    }

    // OMAT KORTIT -VÄLILEHTI
    let me = (allPlayers || []).find(p => p && p.name === myName);
    let myCards = me && me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
    
    let sellHtml = '';
    if(myCards.length === 0) {
         sellHtml = '<p style="color:var(--text-muted); font-size:1.1rem; text-align:center; padding:20px; font-weight:bold; width:100%; grid-column: 1 / -1;">Kätesi on tyhjä.</p>';
    } else {
        myCards.forEach(cId => {
            const cDef = (window.allCards || []).find(sc => sc && sc.id === cId);
            if(!cDef) return; 
            let typeClass = cDef.type === 'buff' ? 'buff-card' : 'debuff-card';
            if(cDef.tier === 'premium') typeClass = 'premium-card'; 
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
                    <button class="shop-item-btn" style="flex:1; background:var(--primary);" onclick="window.openTargetModal('${cId}')">PELAA</button>
                    <button class="shop-item-btn" style="width:50px; background:var(--danger); font-size:1.2rem;" onclick="window.forceDiscard('${cId}', ${isNormal})">${sellBtnIcon}</button>
                </div>
            </div>`;
        });
    }
    if (sellContainer) sellContainer.innerHTML = sellHtml;
    
    // Dynaaminen varoituslaatikko
    let alertEl = el('pendingPurchaseAlert');
    if (alertEl) {
        let limitEnabled = window.gameSettings.handLimitEnabled !== undefined ? window.gameSettings.handLimitEnabled : true;
        let limit = window.gameSettings.handLimit !== undefined ? window.gameSettings.handLimit : 5;
        let isOverLimit = limitEnabled && myCards.length > limit;

        if (window.pendingShopPurchase) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSI TÄYNNÄ!</div>
                                 <div style="font-size:1.05rem; font-weight:700; margin-bottom:15px; line-height:1.4;">Haluat ostaa kortin <strong id="pendingCardName">${window.pendingShopPurchase.name}</strong>. Myy tai hävitä yksi kortti alta tehdäksesi tilaa, jolloin osto suoritetaan automaattisesti!</div>
                                 <button class="btn btn-secondary" style="padding:12px; font-size:0.95rem; color:#000;" onclick="event.stopPropagation(); if(window.cancelShopPurchase) window.cancelShopPurchase()">PERUUTA OSTO</button>`;
        } else if (isOverLimit) {
            alertEl.style.display = 'block';
            alertEl.innerHTML = `<div style="font-weight:900; font-size:1.2rem; margin-bottom:8px;">⚠️ KÄSIRAJA YLITETTY!</div>
                                 <div style="font-size:1.05rem; font-weight:700; line-height:1.4;">Sinulla on liikaa kortteja kädessäsi (${myCards.length}/${limit}). Myy tai hävitä kortteja päästäksesi takaisin sallittuun rajaan!</div>`;
        } else {
            alertEl.style.display = 'none';
        }
    }
};

window.renderAdminPlayerList = function() {
    const list = el('adminPlayerList');
    if(!list) return; 
    list.innerHTML = "";
    (allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        
        let cardsHtml = '';
        if(p.cards && p.cards.length > 0) {
            cardsHtml = `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; width:100%;">`;
            p.cards.forEach((cId, cIdx) => {
                let cardDef = (window.allCards || []).find(c => c && c.id === cId);
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
                <div class="gm-score-adjust" style="display:flex; gap:10px; margin-top:10px;">
                    <span style="font-size:0.85rem; color:var(--text-muted); width:50px; font-weight:bold; align-self:center;">Raha</span>
                    <input type="number" id="gmScoreAdjust_${i}" value="1" style="width:60px; margin:0; padding:10px;">
                    <button class="btn btn-primary" style="padding:10px;" onclick="if(window.adjustScore) { window.adjustScore(${i}, parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0); }">Lisää</button>
                    <button class="btn btn-danger" style="padding:10px;" onclick="if(window.adjustScore) { window.adjustScore(${i}, -(parseInt(document.getElementById('gmScoreAdjust_${i}').value) || 0)); }">Vähennä</button>
                </div>
                <div class="gm-score-adjust" style="display:flex; gap:10px; margin-top:5px;">
                    <span style="font-size:0.85rem; color:var(--text-muted); width:50px; font-weight:bold; align-self:center;">Tulos</span>
                    <button class="btn btn-secondary" style="padding:10px;" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, 1); }">+1 Heitto</button>
                    <button class="btn btn-secondary" style="padding:10px;" onclick="if(window.adjustDgScore) { window.adjustDgScore(${i}, -1); }">-1 Heitto</button>
                </div>
            </div>`;
    });
};

// GM-TOIMINNOT
window.adminAddPlayer = function() {
    const input = el('adminNewPlayerName');
    if(!input) return;
    const name = input.value.trim();
    if(!name) return alert("Syötä pelaajan nimi!");
    if((allPlayers || []).find(p => p && p.name === name)) return alert("Pelaaja on jo pelissä!");
    
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    nextPlayers.push({ name: name, score: 3, dgScore: 0, cards: [], boughtThisHole: false });
    update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
    input.value = '';
    window.logEvent(`${myName} (GM) lisäsi pelaajan: ${name}`);
};

window.removePlayer = function(index) {
    if(confirm("Haluatko varmasti poistaa tämän pelaajan?")) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        let removedName = nextPlayers[index] ? nextPlayers[index].name : "Tuntematon";
        nextPlayers.splice(index, 1);
        update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
        window.logEvent(`${myName} (GM) poisti pelaajan: ${removedName}`);
    }
};

window.adjustScore = function(index, delta) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    if(nextPlayers[index]) {
        nextPlayers[index].score = (parseInt(nextPlayers[index].score) || 0) + delta;
        update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
        window.logEvent(`${myName} (GM) sääti pelaajan ${nextPlayers[index].name} rahamäärää.`);
    }
};

window.adjustDgScore = function(index, delta) {
    let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
    if(nextPlayers[index]) {
        nextPlayers[index].dgScore = (parseInt(nextPlayers[index].dgScore) || 0) + delta;
        update(ref(db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
        window.logEvent(`${myName} (GM) sääti pelaajan ${nextPlayers[index].name} tulosta.`);
    }
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
    
    (window.allCards || []).forEach(c => {
        if (q && !c.n.toLowerCase().includes(q) && !c.d.toLowerCase().includes(q)) return; 
        
        let typeClass = c.type === 'buff' ? 'buff-card' : 'debuff-card';
        if (c.tier === 'premium') typeClass = 'premium-card'; 
        let tagTxt = c.tier === 'premium' ? '💎 PREMIUM' : (c.type === 'buff' ? '🛡️ HELPOTUS' : '🚫 SABOTAASI');
        let btnClass = c.tier === 'premium' ? 'btn-warning' : (c.type === 'buff' ? 'btn-success' : 'btn-danger');
        
        html += `
            <div class="shop-item-wrapper">
                <div class="physical-card ${typeClass}" onclick="window.openCardDetail('${c.id}', 'gm')" style="cursor:pointer;">
                    <div class="card-type-tag">${tagTxt}</div><h3 style="font-size:1rem;">${c.n}</h3><p style="font-size:0.8rem;">${c.d}</p>
                    <div style="text-align:center; font-weight:900; font-size:0.75rem; color:var(--text-muted); margin-top:auto; padding-top:10px;">🔄 3D TARKASTELU</div>
                </div>
                <button class="shop-item-btn ${btnClass}" onclick="window.giveCardToPlayer('${c.id}')">ANNA TÄMÄ</button>
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
    let cardDef = (window.allCards || []).find(c => c && c.id === cardId);
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
        let cardDef = (window.allCards || []).find(c => c && c.id === cId);
        p.cards.splice(cIdx, 1);
        set(ref(db, `gameState/players`), window.cleanFirebaseData(nextPlayers));
        window.logEvent(`${myName} (GM) poisti kortin ${cardDef ? cardDef.n : ''} pelaajalta ${p.name}.`);
    }
};

window.gmRollRule = function() {
    if(!activeHole) return; 
    const rules = window.holeRules || [];
    if(rules.length === 0) return;
    const randomRule = rules[Math.floor(Math.random() * rules.length)];
    activeHole.rule = randomRule;
    set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(randomRule));
    window.logEvent(`${myName} (GM) arpoi uuden väyläsäännön: ${randomRule.n}`);
};

window.gmSetRule = function() {
    if(!activeHole) return; 
    const sel = el('gmRuleSelect');
    const rules = window.holeRules || [];
    const ruleDef = rules[sel.value];
    if(ruleDef) {
        activeHole.rule = ruleDef;
        set(ref(db, 'gameState/activeHole/rule'), window.cleanFirebaseData(ruleDef));
        window.logEvent(`${myName} (GM) asetti väyläsäännön: ${ruleDef.n}`);
    }
};

window.cancelCourse = function() {
    if (confirm("Haluatko varmasti lopettaa nykyisen radan? Pelaajat säilyttävät rahansa ja korttinsa, mutta palaatte aulaan.")) {
        let nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean);
        update(ref(db, 'gameState'), window.cleanFirebaseData({
            course: null,
            activeHole: null,
            currentHoleIndex: 1,
            players: nextPlayers
        }));
        window.logEvent(`${myName} (GM) keskeytti radan.`);
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
    
    let premiumPool = (window.allCards || []).filter(c => c && c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) break; 
    }
    
    const rules = window.holeRules || [];
    const randomRule = rules.length > 0 ? rules[Math.floor(Math.random() * rules.length)] : {type:"rule", n:"Peli Alkaa", d:""};
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    let normalPool = (window.allCards || []).filter(c => c && c.tier === "normal");
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            let pCards = [];
            if(normalPool.length > 0) {
                pCards = [
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id
                ];
            }
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
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${nextCourse.name}.`);
};

window.generateParInputs = function() {
    const count = parseInt(el('setupHoleCount').value) || 0;
    const container = el('parInputsContainer');
    if(!container) return; 
    container.innerHTML = '';
    for(let i=1; i<=count; i++) { 
        container.innerHTML += `<div style="background:rgba(255,255,255,0.8); padding:12px; border-radius:10px; border:2px solid var(--border);"><label style="font-size:0.9rem; color:var(--text-muted); font-weight:900;">Väylä ${i} PAR</label><input type="number" id="setupPar_${i}" value="3" style="margin:0; padding:10px; border:none; background:transparent; font-size:1.2rem;" /></div>`;
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
    
    let premiumPool = (window.allCards || []).filter(c => c && c.tier === "premium");
    let uniqueShop = []; let used = new Set();
    for(let c of premiumPool.sort(() => 0.5 - Math.random())) {
        if(!used.has(c.n)) { uniqueShop.push(c); used.add(c.n); }
        if(uniqueShop.length === 5) break; 
    }
    
    const rules = window.holeRules || [];
    const randomRule = rules.length > 0 ? rules[Math.floor(Math.random() * rules.length)] : {type:"rule", n:"Peli Alkaa", d:""};
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    let normalPool = (window.allCards || []).filter(c => c && c.tier === "normal");
    let nextPlayers = [];
    if(allPlayers) {
        nextPlayers = JSON.parse(JSON.stringify(allPlayers)).filter(Boolean).map(p => {
            let pCards = [];
            if(normalPool.length > 0) {
                pCards = [
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id,
                    normalPool[Math.floor(Math.random() * normalPool.length)].id
                ];
            }
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
    window.logEvent(`${myName} aloitti uuden pelin radalla: ${nextCourse.name}.`);
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
            let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 3;
            let bTxt = activeHole.rule.type === 'bounty' ? `TEHTÄVÄ (+${ptsTask} P)` : 'SÄÄNTÖ';
            box.className = 'post-it-note';
            box.innerHTML = `<div class="post-it-tape"></div><strong style="font-size:1.4rem; font-family:'Inter', sans-serif;">${bTxt}: ${activeHole.rule.n}</strong><br><span style="font-size:1.2rem; font-family:'Inter', sans-serif;">${activeHole.rule.d}</span>`;
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    }
    
    const container = el('scoreInputsContainer');
    if(!container) return; 
    
    let html = '';
    let taskCheckboxes = '';
    
    (allPlayers || []).forEach((p, i) => {
        if(!p) return; 
        
        let encodedName = p.name.replace(/"/g, '&quot;');
        taskCheckboxes += `<label class="task-paper-label"><input type="checkbox" class="task-paper-checkbox" data-name="${encodedName}" /> ${p.name}</label>`;
        
        let safeId = "player_" + i; 
        html += `
            <div class="score-row-paper">
                <span class="score-name-paper">${p.name}</span>
                <div class="score-controls-paper">
                    <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, -1)">-</button>
                    <div id="scoreDisplay_${safeId}" class="score-display-paper">${par}</div>
                    <button class="btn-score-paper" onclick="window.changeScore('${safeId}', ${par}, 1)">+</button>
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
    (allPlayers || []).forEach(p => {
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

    document.querySelectorAll('.task-paper-checkbox:checked').forEach(cb => {
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
    
    let normalPool = (window.allCards || []).filter(c => c && c.tier === "normal");
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
        
        if(normalPool.length > 0) {
            for(let i=0; i<cardsToGive; i++) {
                if (!limitEnabled || p.cards.length < handLimit) {
                    p.cards.push(normalPool[Math.floor(Math.random() * normalPool.length)].id);
                }
            }
        }
        p.cards = p.cards.filter(Boolean);
    });
    
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
    
    let nextActiveHole = { rule: randomRule, shop: uniqueShop, playedCards: {}, timestamp: Date.now() };
    
    update(ref(db, 'gameState'), window.cleanFirebaseData({
        players: nextPlayers,
        currentHoleIndex: nextHoleIndex,
        activeHole: nextActiveHole
    }));

    if(el('scoreModal')) el('scoreModal').style.display = 'none'; 
    window.logEvent(`${myName} syötti tulokset väylältä ${currentHoleIndex}.`);
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

// =============================================
// FIREBASE KUUNTELIJA LOPUSSA
// =============================================
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    
    if(!data) {
        if(myName) {
            myName = null;
            localStorage.removeItem('friba_name');
            window.updateIdentityUI();
            window.closeShopModal();
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

    allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    activeHole = data.activeHole || null;
    currentCourse = data.course || null;
    currentHoleIndex = data.currentHoleIndex || 1;

    if (myName) {
        const me = allPlayers.find(p => p && p.name === myName);
        if (!me) {
            myName = null;
            localStorage.removeItem('friba_name');
            window.closeShopModal();
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
            window.renderShop(activeHole ? activeHole.shop : null, me.score || 0, me.boughtThisHole);
            
            if (window.gameSettings.handLimitEnabled && myCards.filter(Boolean).length > window.gameSettings.handLimit) {
                window.showHandLimitModal(myCards.filter(Boolean));
            } else {
                if(el('handLimitModal')) el('handLimitModal').style.display = 'none';
            }
            
            let pts = `${me.score || 0} P`;
            if(el('myResPointsBtn')) el('myResPointsBtn').innerText = pts; 
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

// ASETUKSET SIVUN LATAUDUTTUA
window.populateRuleSelect = function() {
    const sel = el('gmRuleSelect');
    const rules = window.holeRules || [];
    if(!sel || rules.length === 0) return; 
    sel.innerHTML = rules.map((r, i) => `<option value="${i}">${r.n}</option>`).join('');
};
setTimeout(window.populateRuleSelect, 500);
