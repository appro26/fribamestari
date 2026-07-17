// ==============================================
// PELIN YDINLOGIIKKA JA SÄÄNNÖT (game.js)
// ==============================================

var el = id => document.getElementById(id);

window.cleanFirebaseData = function(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => window.cleanFirebaseData(item)).filter(item => item !== null && item !== undefined);
    
    let cleaned = {}; 
    for (let key in obj) { 
        if (Object.prototype.hasOwnProperty.call(obj, key)) { 
            let val = window.cleanFirebaseData(obj[key]); 
            if (val !== null && val !== undefined && val !== "undefined") {
                cleaned[key] = val; 
            }
        } 
    } 
    return cleaned;
};

window.logEvent = function(msg) { 
    if(!window.db) return;
    window.push(window.ref(window.db, 'gameState/eventLog'), window.cleanFirebaseData({ time: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'}), msg: msg })); 
};

window.logScore = function(playerName, delta, reason) { 
    if(!window.db) return;
    window.push(window.ref(window.db, 'gameState/scoreLog'), window.cleanFirebaseData({ time: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'}), playerName: playerName, delta: delta, msg: reason })); 
};

window.updateIdentityUI = function() { 
    if(el('identityCard')) el('identityCard').style.display = window.myName ? 'none' : 'block'; 
};

window.claimIdentity = function() { 
    let n = el('playerNameInput').value.trim(); 
    if(!n) return; 
    window.myName = n; 
    localStorage.setItem('friba_name', n); 
    window.updateIdentityUI(); 
    
    if(!(window.allPlayers || []).find(x => x && x.name === n)) { 
        let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers || [])).filter(Boolean); 
        nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }); 
        if(window.db) window.set(window.ref(window.db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)); 
    } 
};

// ==============================================
// GLOBAALIN PAKAN HALLINTA (DUPLIKAATTIEN ESTO)
// ==============================================

// Hakee listan kaikista korteista, jotka ovat tällä hetkellä pelaajilla tai kaupoissa
window.getCardsInUse = function(players, currentShops = {}) {
    let inUse = [];
    (players || []).filter(Boolean).forEach(p => {
        if(p.cards) {
            let cArr = Array.isArray(p.cards) ? p.cards : Object.values(p.cards);
            inUse.push(...cArr.filter(Boolean));
        }
        if(p.reservations) {
            let rArr = Array.isArray(p.reservations) ? p.reservations : Object.values(p.reservations);
            inUse.push(...rArr.filter(Boolean));
        }
    });
    Object.values(currentShops || {}).forEach(shopArr => {
        if(shopArr) {
            let sArr = Array.isArray(shopArr) ? shopArr : Object.values(shopArr);
            sArr.forEach(c => { if(c && c.id) inUse.push(c.id); });
        }
    });
    return [...new Set(inUse)];
};

// Luo uuden pakan ja varmistaa, ettei tällä hetkellä käytössä olevia kortteja laiteta mukaan
window.createFullDeck = function(excludeIds = []) {
    let deck = window.allCards.map(c => c.id).filter(id => !excludeIds.includes(id));
    
    // Varmistus: Jos pelaajilla on syli täynnä aivan kaikkia kortteja ja pakka menisi täysin nollaan
    if (deck.length === 0) {
        deck = window.allCards.map(c => c.id);
    }
    
    // Sekoitetaan pakka
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

// Nostaa pakasta pyydetyn kortin. Jos pakka on tyhjä, luo uuden pakan vähentäen pelissä olevat kortit!
window.drawFromDeck = function(deckArr, type, level, inUseIds = []) {
    let refillIfNeeded = () => {
        if (!deckArr || deckArr.length === 0) {
            deckArr.push(...window.createFullDeck(inUseIds));
        }
    };
    
    refillIfNeeded();

    let idx = deckArr.findIndex(cId => {
        let def = window.allCards.find(c => c.id === cId);
        if (!def) return false;
        let typeMatch = type ? def.type === type : true;
        let levelMatch = level ? def.level === level : true;
        return typeMatch && levelMatch;
    });

    if (idx !== -1) {
        return deckArr.splice(idx, 1)[0];
    } else {
        // Fallback: Haetaan edes oikean tyyppinen (Sabotaasi / Helpotus)
        let fallbackIdx = deckArr.findIndex(cId => {
            let def = window.allCards.find(c => c.id === cId);
            if (!def) return false;
            return type ? def.type === type : true;
        });
        if (fallbackIdx !== -1) {
            return deckArr.splice(fallbackIdx, 1)[0];
        }
        
        // Viimeinen oljenkorsi: jos edes tyyppiä ei löydy, annetaan mitä pakassa on
        if (deckArr.length > 0) {
            return deckArr.shift();
        } else {
            refillIfNeeded();
            return deckArr.shift();
        }
    }
};

window.generatePersonalShop = function(deckArr, inUseIds = []) {
    let shopCards = [];
    
    // Automaatti päivittää inUse-listaa reaaliajassa nostojen aikana estäen duplikaatit samassa kaupassa
    let drawAndTrack = (type, level) => {
        let cId = window.drawFromDeck(deckArr, type, level, inUseIds);
        if (cId) {
            shopCards.push(cId);
            inUseIds.push(cId);
        }
    };
    
    drawAndTrack(null, 3);
    drawAndTrack(null, 3);
    drawAndTrack(null, 2);
    drawAndTrack(null, 2);
    drawAndTrack(null, 1);
    drawAndTrack(null, 1);
    
    return shopCards.map(id => window.allCards.find(c => c.id === id) || null);
};

window.getCardPlayCost = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return 0;
    
    // Tarkista onko hinta yliajettu asetuksista
    if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[cId] !== undefined) {
        return window.gameSettings.cardPrices[cId];
    }
    return cDef.price; 
};


// ==============================================
// TULOSTEN LASKENTA JA PELIN EDISTYMINEN
// ==============================================
window.submitScores = function() {
    let par = window.currentCourse.pars[window.currentHoleIndex - 1] || 3;
    let playerResults = {};
    (window.allPlayers || []).forEach(p => { if(p) playerResults[p.name] = { strokes: par, taskWon: false }; });
    
    document.querySelectorAll('.score-input-data').forEach(input => { 
        if(playerResults[input.getAttribute('data-name')]) {
            playerResults[input.getAttribute('data-name')].strokes = parseInt(input.value, 10) || par; 
        }
    });
    
    document.querySelectorAll('.task-paper-checkbox:checked').forEach(cb => { 
        if(playerResults[cb.getAttribute('data-name')]) {
            playerResults[cb.getAttribute('data-name')].taskWon = true; 
        }
    });

    let played = window.activeHole && window.activeHole.playedCards ? Object.values(window.activeHole.playedCards) : [];
    played.sort((a,b) => a.timestamp - b.timestamp);

    let playerEffects = {};
    window.allPlayers.forEach(p => playerEffects[p.name] = { sabotages: [], buffs: [] });

    played.forEach(pc => {
        let mech = pc.mech; 
        let isSabotage = pc.type === 'sabotage';
        let targets = pc.target === 'KAIKKI VASTUSTAJAT' ? window.allPlayers.filter(p => p.name !== pc.by).map(p => p.name) : [pc.target];

        targets.forEach(t => {
            if(!playerEffects[t]) return;
            
            if (mech === 'cancel_1' && t === pc.by) {
                let idx = playerEffects[t].sabotages.findLastIndex(s => s.level <= 1);
                if(idx !== -1) playerEffects[t].sabotages.splice(idx, 1); 
                return;
            }
            if (mech === 'cancel_2' && t === pc.by) {
                let idx = playerEffects[t].sabotages.findLastIndex(s => s.level <= 2);
                if(idx !== -1) playerEffects[t].sabotages.splice(idx, 1); 
                return;
            }
            if (mech === 'cancel_3' && t === pc.by) {
                let idx = playerEffects[t].sabotages.findLastIndex(s => s.level <= 3);
                if(idx !== -1) playerEffects[t].sabotages.splice(idx, 1); 
                return;
            }
            if (mech === 'reflect' && t === pc.by) {
                let lastSabo = playerEffects[t].sabotages.pop();
                if(lastSabo && playerEffects[lastSabo.by]) {
                    playerEffects[lastSabo.by].sabotages.push(lastSabo); 
                }
                return;
            }
            
            if (isSabotage) { 
                playerEffects[t].sabotages.push({ ...pc }); 
            } else { 
                playerEffects[t].buffs.push({ ...pc }); 
            }
        });
    });

    for (let pName in playerResults) {
        let pRes = playerResults[pName]; 
        let pEff = playerEffects[pName];
        
        pRes.moneyMod = 0; pRes.drawMod = 0; pRes.denyPassive = false; pRes.denyWin = false; pRes.denyTask = false; pRes.denyDraw = false; pRes.tripleTask = false;

        pEff.sabotages.forEach(s => {
            if (s.mech === 'deny_passive') pRes.denyPassive = true;
            if (s.mech === 'deny_win') { pRes.denyPassive = true; pRes.denyWin = true; }
            if (s.mech === 'deny_all_income') { pRes.denyPassive = true; pRes.denyWin = true; pRes.denyTask = true; }
            if (s.mech === 'deny_draw') pRes.denyDraw = true;
        });

        pEff.buffs.forEach(b => {
            if (b.mech === 'money_+1') pRes.moneyMod += 1;
            if (b.mech === 'money_+2_draw') { pRes.moneyMod += 2; pRes.drawMod += 1; }
            if (b.mech === 'money_+3_shield') { pRes.moneyMod += 3; pRes.drawMod += 1; }
            if (b.mech === 'triple_bounty') pRes.tripleTask = true;
        });
        
        pRes.strokes = Math.max(1, pRes.strokes);
    }

    let minStrokes = 999; 
    let maxStrokes = -1;
    let allBirdie = true;
    for (let key in playerResults) { 
        if (playerResults[key].strokes < minStrokes) minStrokes = playerResults[key].strokes; 
        if (playerResults[key].strokes > maxStrokes) maxStrokes = playerResults[key].strokes;
        if (playerResults[key].strokes >= par) allBirdie = false;
    }
    
    let holeWinners = []; 
    let holeLosers = [];
    for (let key in playerResults) { 
        if (playerResults[key].strokes === minStrokes) holeWinners.push(key); 
        if (playerResults[key].strokes === maxStrokes) holeLosers.push(key);
    }
    let isTie = holeWinners.length > 1;

    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    
    // Asetusten muuttujat
    let ptsWin = window.gameSettings.ptsWin !== undefined ? window.gameSettings.ptsWin : 3; 
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 2; 
    let ptsPassive = window.gameSettings.ptsPassive !== undefined ? window.gameSettings.ptsPassive : 2; 
    let ptsTie = window.gameSettings.ptsTie || 0;
    let ptsAllBirdie = window.gameSettings.ptsAllBirdie || 0;
    let drawBase = window.gameSettings.drawBase !== undefined ? window.gameSettings.drawBase : 2;
    let drawLoser = window.gameSettings.drawLoser !== undefined ? window.gameSettings.drawLoser : 1;
    let limit = window.gameSettings.handLimit || 6;
    
    let holePointBreakdowns = {};
    let currentDeck = window.activeHole && window.activeHole.deck ? [...window.activeHole.deck] : window.createFullDeck();
    let nextShop = {}; // Alustetaan hyvissä ajoin, jotta sitä voidaan käyttää duplikaattisuojana

    nextPlayers.forEach(p => {
        let res = playerResults[p.name]; 
        p.dgScore = (parseInt(p.dgScore) || 0) + (res.strokes - par);
        
        let oldPoints = parseInt(p.score, 10) || 0; 
        let currentPoints = oldPoints; 
        let breakdown = [];

        p.reservations = Array.isArray(p.reservations) ? p.reservations : Object.values(p.reservations || {});
        if (p.reservations.length > 0) { 
            currentPoints -= p.reservations.length; 
            breakdown.push(`Varaukset: -${p.reservations.length} P`); 
        }
        
        if (!res.denyPassive && ptsPassive > 0) { 
            currentPoints += ptsPassive; 
            breakdown.push(`Palkka: +${ptsPassive} P`); 
        }
        if (holeWinners.includes(p.name) && !res.denyWin) { 
            if (isTie && ptsTie > 0) {
                currentPoints += ptsTie; breakdown.push(`Tasapeli: +${ptsTie} P`);
            } else if (!isTie && ptsWin > 0) {
                currentPoints += ptsWin; breakdown.push(`Voitto: +${ptsWin} P`); 
            } else if (isTie && ptsWin > 0 && ptsTie === 0) {
                currentPoints += ptsWin; breakdown.push(`Jaettu Voitto: +${ptsWin} P`); 
            }
        }
        if (allBirdie && ptsAllBirdie > 0 && !res.denyWin) {
            currentPoints += ptsAllBirdie; breakdown.push(`Kaikki Birdie: +${ptsAllBirdie} P`);
        }
        if (res.taskWon && !res.denyTask) { 
            let actualTaskPts = res.tripleTask ? ptsTask * 3 : ptsTask;
            currentPoints += actualTaskPts; 
            breakdown.push(`Tehtävä: +${actualTaskPts} P`); 
        }
        if (res.moneyMod !== 0) { 
            currentPoints += res.moneyMod; 
            breakdown.push(`Korttiedut: ${res.moneyMod > 0 ? '+' : ''}${res.moneyMod} P`); 
        }

        p.score = Math.max(0, currentPoints); 
        p.lastHoleSummary = breakdown.join(", "); 
        p.upgradedThisHole = [];
        
        holePointBreakdowns[p.name] = { delta: p.score - oldPoints, summary: p.lastHoleSummary };
        if (p.score - oldPoints !== 0) window.logScore(p.name, p.score - oldPoints, `Väylä ${window.currentHoleIndex}: ${p.lastHoleSummary}`);

        p.cards = Array.isArray(p.cards) ? p.cards : Object.values(p.cards || {}); 
        p.cards = p.cards.filter(Boolean);
        
        // Pelaajan korttinostot (takaa vähintään yhden sabotaasin ja yhden helpotuksen)
        if (!res.denyDraw) {
            let cardsToDraw = [];
            
            // Perusnostot
            for (let i = 0; i < drawBase; i++) {
                if (i === 0) cardsToDraw.push({type: 'sabotage'});
                else if (i === 1) cardsToDraw.push({type: 'buff'});
                else cardsToDraw.push({type: null}); // Loput arvalla
            }
            
            // Häviäjän lisäkortit (jos ei tullut kaikkien tasapeliä)
            if (holeLosers.includes(p.name) && holeLosers.length < nextPlayers.length) {
                for (let i = 0; i < drawLoser; i++) {
                    cardsToDraw.push({type: null});
                }
            }
            
            // Korttiefektien tuomat lisänostot
            for (let i = 0; i < res.drawMod; i++) {
                cardsToDraw.push({type: null});
            }
            
            cardsToDraw.forEach(drawReq => {
                if (p.cards.length < limit) {
                    let inUse = window.getCardsInUse(nextPlayers, nextShop);
                    let drawnId = window.drawFromDeck(currentDeck, drawReq.type, null, inUse);
                    if (drawnId) p.cards.push(drawnId);
                }
            });
        }
    });

    // Tuotetaan uudet kaupat
    nextPlayers.forEach(p => { 
        let inUse = window.getCardsInUse(nextPlayers, nextShop);
        nextShop[p.name] = window.generatePersonalShop(currentDeck, inUse); 
    });

    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: nextShop, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: window.getRandomColor(), 
        penColor: window.getRandomPen(),
        deck: currentDeck
    };
    
    let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
    let holeStrokes = {}; 
    for (let key in playerResults) { holeStrokes[key] = playerResults[key].strokes; }
    
    nextHistory.push({ 
        rule: window.activeHole.rule, 
        playedCards: window.activeHole.playedCards, 
        color: window.activeHole.color, 
        holeResults: holeStrokes, 
        pointBreakdowns: holePointBreakdowns, 
        players: JSON.parse(JSON.stringify(nextPlayers)) 
    });
    
    window.update(window.ref(window.db), window.cleanFirebaseData({ 
        'gameState/players': nextPlayers, 
        'gameState/currentHoleIndex': window.currentHoleIndex + 1, 
        'gameState/activeHole': nextActiveHole, 
        'gameState/history': nextHistory 
    }));
    
    el('scoreModal').style.display = 'none'; 
};

// ==============================================
// KORTTIEN KÄSITTELY (Pelaa, Myy, Osta, Upgrade)
// ==============================================

window.executeCardPlay = function(targetName) {
    if(!window.pendingCardPlay) return; 
    
    const card = window.pendingCardPlay; 
    const timestamp = Date.now();
    let nextDeck = window.activeHole && window.activeHole.deck ? [...window.activeHole.deck] : [];
    
    if(el('targetModal')) el('targetModal').style.display = 'none'; 
    if(el('cardDetailModal')) el('cardDetailModal').style.display = 'none'; 
    
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p && p.name === window.myName);
    
    if(me && me.cards) { 
        me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
        me.cards = me.cards.filter(Boolean);
        let actualIndex = me.cards.indexOf(card.id);
        if (actualIndex !== -1) {
            me.cards.splice(actualIndex, 1); 
            // HUOM: Korttia EI siirretä nextDeckin loppuun.
            // Pelattu kortti vain katoaa pelaajalta, ja vapautuu siten takaisin yhteiseen kiertoon,
            // kun pakka seuraavan kerran tyhjenee ja sekoitetaan uudelleen!
        }
        
        let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(card.id) : card.cost;
        if (playCost > 0) {
            me.score -= playCost;
            window.logScore(window.myName, -playCost, `Pelasi kortin: ${card.def.n}`);
            if(window.showAppleToast) window.showAppleToast(`-${playCost} P (Pelattu)`, '💸');
        }
    }
    
    let pCards = {};
    if(window.activeHole) {
        if (window.activeHole.playedCards) {
            let oldCards = Array.isArray(window.activeHole.playedCards) ? window.activeHole.playedCards : Object.values(window.activeHole.playedCards);
            oldCards.filter(Boolean).forEach((c, i) => { pCards['old_'+i] = c; });
        }
        let cKey = 'c_' + timestamp + '_' + Math.floor(Math.random()*1000);
        pCards[cKey] = { 
            cardId: card.id, cardName: card.def.n, cardDesc: card.def.d, 
            target: targetName, by: window.myName, type: card.def.type, 
            level: card.def.level, mech: card.def.mech || null, timestamp: timestamp 
        };
    }
    
    window.update(window.ref(window.db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers), 
        'gameState/activeHole/playedCards': window.cleanFirebaseData(pCards),
        'gameState/activeHole/deck': nextDeck
    });
    
    window.logEvent(`${window.myName} pelasi kortin ${card.def.n} kohteelle ${targetName}.`);
};

window.upgradeCard = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if (!cDef || !cDef.nextId) return;
    
    let nextDef = window.allCards.find(c => c.id === cDef.nextId);
    if (!nextDef) return;
    
    let cost = (cDef.level === 1) ? 3 : 5;
    let nextDeck = window.activeHole && window.activeHole.deck ? [...window.activeHole.deck] : [];
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === window.myName);
    
    if(me.score < cost) { alert("Ei tarpeeksi P-rahaa päivitykseen!"); return; }
    
    me.score -= cost;
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    let idx = me.cards.indexOf(cId);
    if(idx !== -1) { 
        me.cards[idx] = nextDef.id; 
    }
    
    if(!me.upgradedThisHole) me.upgradedThisHole = [];
    me.upgradedThisHole.push(nextDef.id);
    
    window.update(window.ref(window.db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers),
        'gameState/activeHole/deck': nextDeck
    });
    
    window.logScore(window.myName, -cost, `Päivitti kortin tasolle ${nextDef.level}`);
    if(window.showAppleToast) window.showAppleToast(`Päivitetty! (-${cost} P)`, '✨');
    
    if(el('cardDetailModal') && el('cardDetailModal').style.display !== 'none') {
        if(window.openCardDetail) window.openCardDetail(nextDef.id, window.carouselCurrentMode);
    }
};

window.forceDiscard = function(cId) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === window.myName);
    if(!me) return;
    
    let cDef = window.allCards.find(c => c.id === cId);
    let nextDeck = window.activeHole && window.activeHole.deck ? [...window.activeHole.deck] : [];
    
    me.cards = Array.isArray(me.cards) ? me.cards : Object.values(me.cards);
    me.cards = me.cards.filter(Boolean);
    let idx = me.cards.indexOf(cId);
    
    if(idx !== -1) {
        me.cards.splice(idx, 1);
        
        let sellReward = cDef.level === 3 ? 4 : (cDef.level === 2 ? 2 : 1);
        me.score = (parseInt(me.score) || 0) + sellReward; 
        
        window.logScore(window.myName, sellReward, `Myi kortin kädestä`);
        if(window.showAppleToast) window.showAppleToast(`+${sellReward} P (Myyty)`, '💰'); 
    }
    
    if (window.pendingShopPurchase) {
        let pId = window.pendingShopPurchase.id; 
        let pPrice = window.pendingShopPurchase.price; 
        let isRes = window.pendingShopPurchase.isRes;
        
        if (me.score >= pPrice) {
            me.score -= pPrice; 
            me.cards.push(pId);
            window.logScore(window.myName, -pPrice, `Osti kortin automaatista myynnin jälkeen`);
            
            if (isRes) {
                me.reservations = me.reservations || [];
                let rIdx = me.reservations.indexOf(pId);
                if (rIdx !== -1) me.reservations.splice(rIdx, 1);
            } else {
                let nextShopAll = JSON.parse(JSON.stringify(window.activeHole.shop || {}));
                if (nextShopAll[window.myName]) {
                    const sIdx = nextShopAll[window.myName].findIndex(i => i && i.id === pId);
                    if (sIdx !== -1) {
                        nextShopAll[window.myName][sIdx] = null; 
                    }
                }
                window.update(window.ref(window.db, 'gameState/activeHole/shop'), window.cleanFirebaseData(nextShopAll));
            }

            window.update(window.ref(window.db), {
                'gameState/players': window.cleanFirebaseData(nextPlayers),
                'gameState/activeHole/deck': nextDeck
            });
            window.pendingShopPurchase = null; 
            
            if(window.showNotification) window.showNotification(`🛒 Ostit edun!`, 'warning');
            if(window.switchView) window.switchView('view-shop');
            if(el('cardDetailModal')) el('cardDetailModal').style.display='none';
            return;
        } else { 
            window.pendingShopPurchase = null; 
        }
    }
    
    window.update(window.ref(window.db), {
        'gameState/players': window.cleanFirebaseData(nextPlayers),
        'gameState/activeHole/deck': nextDeck
    });
    if(el('cardDetailModal')) el('cardDetailModal').style.display='none';
};

window.reserveShopItem = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === window.myName);
    
    me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations || {});
    if (me.reservations.length >= 2) { 
        alert("Voit pitää vain 2 varausta kerrallaan!"); 
        return; 
    }
    
    me.reservations.push(idStr);
    
    let nextShopAll = JSON.parse(JSON.stringify(window.activeHole.shop || {}));
    if (nextShopAll[window.myName]) {
        const sIdx = nextShopAll[window.myName].findIndex(i => i && i.id === idStr);
        if (sIdx !== -1) {
            nextShopAll[window.myName][sIdx] = null; 
        }
    }

    window.update(window.ref(window.db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers), 
        'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) 
    });
    if(window.showAppleToast) window.showAppleToast('Kortti varattu', '🔒');
};

window.cancelReservation = function(idStr) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === window.myName);
    if (!me || !me.reservations) return; 

    me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations || {});
    let rIdx = me.reservations.indexOf(idStr);
    
    if (rIdx !== -1) {
        me.reservations.splice(rIdx, 1);
        
        let cDef = window.allCards.find(c => c.id === idStr);
        let nextShopAll = JSON.parse(JSON.stringify(window.activeHole.shop || {}));
        if (nextShopAll[window.myName]) { 
            nextShopAll[window.myName].push(cDef); 
        }
        
        window.update(window.ref(window.db), { 
            'gameState/players': window.cleanFirebaseData(nextPlayers), 
            'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) 
        });
        if(window.showAppleToast) window.showAppleToast('Varaus peruttu', '🔓');
    }
};

window.buyShopItem = function(idStr, priceVal, isReservation) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = nextPlayers.find(p => p.name === window.myName);
    if (!me || me.score < priceVal) { 
        alert("Ei tarpeeksi rahaa!"); 
        return; 
    }

    let limit = window.gameSettings.handLimit || 6;
    let currentCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean).length : 0;
    
    if (window.gameSettings.handLimitEnabled && currentCards >= limit) {
        let nameStr = window.allCards.find(c=>c.id===idStr).n;
        window.pendingShopPurchase = { id: idStr, name: nameStr, price: priceVal, isRes: isReservation };
        
        if(el('cardDetailModal')) el('cardDetailModal').style.display='none';
        if(window.switchView) window.switchView('view-binder'); 
        if(window.showNotification) window.showNotification("⚠️ KÄSI TÄYNNÄ! Myy jokin kortti alta tehdäksesi tilaa ostolle.", "warning");
        return;
    }

    me.score -= priceVal;
    me.cards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)) : []; 
    me.cards.push(idStr);
    
    window.logScore(window.myName, -priceVal, `Osti kortin automaatista`);
    
    let nextShopAll = JSON.parse(JSON.stringify(window.activeHole.shop || {})); 
    
    if (isReservation) {
        me.reservations = Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations || {});
        let rIdx = me.reservations.indexOf(idStr);
        if(rIdx !== -1) me.reservations.splice(rIdx, 1);
    } else {
        if (nextShopAll[window.myName]) {
            const sIdx = nextShopAll[window.myName].findIndex(i => i && i.id === idStr);
            if (sIdx !== -1) {
                nextShopAll[window.myName][sIdx] = null; 
            }
        }
    }

    window.update(window.ref(window.db), { 
        'gameState/players': window.cleanFirebaseData(nextPlayers), 
        'gameState/activeHole/shop': window.cleanFirebaseData(nextShopAll) 
    });
    
    if(window.showNotification) window.showNotification(`🛒 Ostit edun!`, 'warning');
    if(window.switchView) window.switchView('view-shop');
    if(el('cardDetailModal')) el('cardDetailModal').style.display='none';
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    if(window.switchView) window.switchView('view-shop'); 
};

// ==============================================
// GM-TOIMINNOT JA ASETUKSET
// ==============================================
window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextPlayers = (window.allPlayers||[]).filter(Boolean).map(p => { 
        return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; 
    });
    
    let personalizedShop = {}; 
    let initialDeck = window.createFullDeck();
    
    nextPlayers.forEach(p => { 
        let inUse = window.getCardsInUse(nextPlayers, personalizedShop);
        p.cards.push(window.drawFromDeck(initialDeck, 'sabotage', null, inUse)); 
        
        inUse = window.getCardsInUse(nextPlayers, personalizedShop);
        p.cards.push(window.drawFromDeck(initialDeck, 'buff', null, inUse)); 
    });
    
    nextPlayers.forEach(p => { 
        let inUse = window.getCardsInUse(nextPlayers, personalizedShop);
        personalizedShop[p.name] = window.generatePersonalShop(initialDeck, inUse); 
    });
    
    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: personalizedShop, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: window.getRandomColor(),
        penColor: window.getRandomPen(),
        deck: initialDeck
    };
    
    window.update(window.ref(window.db, 'gameState'), window.cleanFirebaseData({ 
        course: nextCourse, currentHoleIndex: 1, activeHole: nextActiveHole, players: nextPlayers, history: [] 
    }));
};

window.renderParInputs = function() {
    let count = parseInt(el('newCourseHoles').value) || 18; 
    let container = el('newCourseParsContainer'); 
    if(!container) return;
    
    let html = ''; 
    for(let i=1; i<=count; i++) { 
        html += `<div style="display:flex; flex-direction:column; align-items:center;"><span style="font-size:0.8rem;">V${i}</span><input type="number" id="parInput_${i}" value="3" min="2" max="6" style="width:100%; padding:5px; text-align:center; background:rgba(0,0,0,0.3); color:#fff; border:1px solid rgba(255,255,255,0.3);"></div>`; 
    }
    container.innerHTML = html;
};

window.startCustomCourse = function() {
    let pars = []; 
    for(let i=1; i<=(parseInt(el('newCourseHoles').value)||18); i++) { pars.push(parseInt(el(`parInput_${i}`).value)||3); }
    
    let nextCourse = { name: el('newCourseName').value.trim() || "Oma Rata", pars: pars };
    let nextPlayers = (window.allPlayers||[]).filter(Boolean).map(p => { 
        return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; 
    });
    
    let personalizedShop = {}; 
    let initialDeck = window.createFullDeck();
    
    nextPlayers.forEach(p => { 
        let inUse = window.getCardsInUse(nextPlayers, personalizedShop);
        p.cards.push(window.drawFromDeck(initialDeck, 'sabotage', null, inUse)); 
        
        inUse = window.getCardsInUse(nextPlayers, personalizedShop);
        p.cards.push(window.drawFromDeck(initialDeck, 'buff', null, inUse)); 
    });
    
    nextPlayers.forEach(p => { 
        let inUse = window.getCardsInUse(nextPlayers, personalizedShop);
        personalizedShop[p.name] = window.generatePersonalShop(initialDeck, inUse); 
    });
    
    let nextActiveHole = { 
        rule: window.holeRules[0], shop: personalizedShop, playedCards: {}, 
        timestamp: Date.now(), color: window.getRandomColor(), penColor: window.getRandomPen(), deck: initialDeck
    };
    
    window.set(window.ref(window.db, 'gameState'), window.cleanFirebaseData({ 
        course: nextCourse, currentHoleIndex: 1, activeHole: nextActiveHole, players: nextPlayers, history: [] 
    }));
    el('courseModal').style.display='none';
};

window.cancelCourse = function() {
    if (confirm("Haluatko varmasti lopettaa nykyisen radan? Pelaajat säilyttävät rahansa ja korttinsa.")) {
        let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
        window.update(window.ref(window.db, 'gameState'), window.cleanFirebaseData({ 
            course: null, activeHole: null, currentHoleIndex: 1, players: nextPlayers, history: [] 
        }));
    }
};

window.resetGame = function() { 
    if (confirm("Nollaa peli?")) { 
        window.set(window.ref(window.db, 'gameState'), { players: [], currentHoleIndex: 1, course: null }).then(() => { 
            localStorage.clear(); location.reload(); 
        }); 
    } 
};

window.saveGameSettings = function() {
    let nextSettings = { 
        handLimitEnabled: true, 
        handLimit: parseInt(el('gmSetLimitCount').value) || 6, 
        ptsWin: parseInt(el('gmSetPtsWin').value) || 3, 
        ptsTask: parseInt(el('gmSetPtsTask').value) || 2, 
        ptsPassive: parseInt(el('gmSetPtsPassive').value) || 2,
        ptsTie: parseInt(el('gmSetPtsTie').value) || 0,
        ptsAllBirdie: parseInt(el('gmSetPtsAllBirdie').value) || 0,
        drawBase: parseInt(el('gmSetDrawBase').value) || 2,
        drawLoser: parseInt(el('gmSetDrawLoser').value) || 1,
        cardPrices: (window.gameSettings && window.gameSettings.cardPrices) ? window.gameSettings.cardPrices : {}
    };
    window.update(window.ref(window.db), { 'gameState/settings': nextSettings }); 
    if(window.showAppleToast) window.showAppleToast("Asetukset tallennettu", "✅");
};

window.gmChangeHole = function() { 
    let sel = el('gmSetCurrentHole'); if(!sel) return; 
    let nextH = parseInt(sel.value); if(!nextH) return; 
    window.update(window.ref(window.db), { 'gameState/currentHoleIndex': nextH }); el('settingsModal').style.display='none'; 
};

window.gmRemoveCurrentHole = function() {
    if(confirm("Poistetaanko nykyinen väylä?")) {
        let nextH = Math.max(1, window.currentHoleIndex - 1); 
        let nextHistory = JSON.parse(JSON.stringify(window.gameHistory || []));
        if(nextHistory.length >= window.currentHoleIndex) { nextHistory = nextHistory.slice(0, window.currentHoleIndex - 1); }
        
        let initialDeck = window.createFullDeck(); 
        let nextActiveHole = { rule: window.holeRules[0], shop: {}, playedCards: {}, timestamp: Date.now(), color: window.getRandomColor(), penColor: window.getRandomPen(), deck: initialDeck };
        window.allPlayers.forEach(p => { nextActiveHole.shop[p.name] = window.generatePersonalShop(initialDeck); });
        
        window.update(window.ref(window.db), window.cleanFirebaseData({ 
            'gameState/currentHoleIndex': nextH, 'gameState/history': nextHistory, 'gameState/activeHole': nextActiveHole 
        })); el('settingsModal').style.display='none';
    }
};

window.gmAddPlayer = function() {
    let n = el('gmNewPlayerName').value.trim(); if(!n) return;
    if(window.allPlayers.find(p => p && p.name === n)) { alert("Pelaaja on jo olemassa!"); return; }
    
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] });
    window.update(window.ref(window.db), {'gameState/players': window.cleanFirebaseData(nextPlayers)});
    el('gmNewPlayerName').value = ''; 
    if(window.showAppleToast) window.showAppleToast('Pelaaja lisätty', '✅');
};

window.gmAdjustScore = function(pName, amount) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    let p = nextPlayers.find(x => x && x.name === pName);
    if(p) {
        p.score = Math.max(0, (parseInt(p.score) || 0) + amount);
        window.update(window.ref(window.db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
        window.logScore("GM", amount, `Muokkasi pelaajan ${pName} pisteitä`);
    }
};

window.gmKickPlayer = function(pName) {
    if(confirm(`Haluatko varmasti potkia pelaajan ${pName} ulos?`)) {
        let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(p => p && p.name !== pName);
        
        let nextShop = {};
        if(window.activeHole && window.activeHole.shop) {
            nextShop = JSON.parse(JSON.stringify(window.activeHole.shop));
            delete nextShop[pName];
        }
        
        window.update(window.ref(window.db), { 
            'gameState/players': window.cleanFirebaseData(nextPlayers),
            'gameState/activeHole/shop': window.cleanFirebaseData(nextShop)
        });
        window.logEvent(`GM potki pelaajan ${pName} ulos pelistä.`);
    }
};


// ==============================================
// KAMERAN OHJAUS, ZOOM JA KOSKETUS (camera.js)
// ==============================================

window.camCurrent = { x: 0, y: 0, scale: 1 };
window.camTarget = { x: 0, y: 0, scale: 1 };

window.getRightXPanel = function() {
    if(!window.currentCourse || !window.currentCourse.pars) return 2000;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let startX = window.startXHoles || 1000;
    return startX + (cols * 380) + ((cols - 1) * 80) + 150;
};

window.applyBounds = function(customTarget) {
    let target = customTarget || window.camTarget; 
    let boardEl = document.getElementById('corkboard-surface');
    if(!boardEl) return target;
    
    let rightXPanel = window.getRightXPanel();
    let corkW = rightXPanel + 400;
    let boardW = corkW + 1500; 
    
    let totalHoles = (window.currentCourse && window.currentCourse.pars) ? window.currentCourse.pars.length : 18; 
    let cols = Math.min(9, totalHoles); 
    let rows = Math.ceil(totalHoles / cols);
    let boardH = Math.max((rows * 1010) + 200, 2500) + 800; 
    
    let minX = window.innerWidth - boardW * target.scale - 1000;
    let maxX = 1000;
    let minY = window.innerHeight - boardH * target.scale - 1000;
    let maxY = 1000;

    if (target.x < minX) target.x = minX;
    if (target.x > maxX) target.x = maxX;
    if (target.y < minY) target.y = minY;
    if (target.y > maxY) target.y = maxY;
    
    return target;
};

window.animFrame = null;
window.animateCameraTo = function(tX, tY, tScale) {
    if(window.animFrame) cancelAnimationFrame(window.animFrame);
    let sX = window.camCurrent.x, sY = window.camCurrent.y, sScale = window.camCurrent.scale;
    
    let target = window.applyBounds({x: tX, y: tY, scale: tScale});
    tX = target.x; tY = target.y; tScale = target.scale;

    let startTime = performance.now();
    let duration = 350; 
    
    function step(time) {
        let p = (time - startTime) / duration;
        if(p > 1) p = 1;
        let ease = 1 - Math.pow(1 - p, 3); 
        
        window.camCurrent.x = sX + (tX - sX) * ease;
        window.camCurrent.y = sY + (tY - sY) * ease;
        window.camCurrent.scale = sScale + (tScale - sScale) * ease;
        window.camTarget = {...window.camCurrent}; 
        
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
        if(p < 1) window.animFrame = requestAnimationFrame(step);
    }
    window.animFrame = requestAnimationFrame(step);
};

// --- KAMERAN KOHDISTUKSET NAPPEIHIN ---
window.zoomToHole = function(hIndex) {
    if(!window.currentCourse || !window.currentCourse.pars) return;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let col = (hIndex - 1) % cols;
    let row = Math.floor((hIndex - 1) / cols);
    
    let startX = window.startXHoles || 1000;
    let cellX = startX + 50 + col * 460; 
    let cellY = 150 + row * 1010; 
    
    let targetX = (window.innerWidth - 380) / 2 - cellX; 
    let targetY = 10 - cellY;
    
    window.animateCameraTo(targetX, targetY, 1);
};

window.zoomToCurrentHole = function() { window.zoomToHole(window.currentHoleIndex || 1); };
window.zoomToPreviousHole = function() { let prev = Math.max(1, (window.currentHoleIndex || 1) - 1); window.zoomToHole(prev); };

window.zoomToBinder = function() { 
    let tScale = Math.min(1.0, window.innerWidth / 550); 
    let wrapper = document.getElementById('board-binder-wrapper');
    let tY = 50; let tX = 50;
    if(wrapper) {
        let wX = parseInt(wrapper.style.left) || 0;
        let wY = parseInt(wrapper.style.top) || 0;
        tX = (window.innerWidth - 500 * tScale) / 2 - wX * tScale; 
        tY = 50 - wY * tScale; 
    }
    window.animateCameraTo(tX, tY, tScale); 
};

window.zoomToReceipt = function() {
    let tScale = Math.min(1.0, window.innerWidth / 500);
    let wrapper = document.getElementById('board-receipt-wrapper');
    let tY = 50; let tX = 50;
    if(wrapper) {
        let wX = parseInt(wrapper.style.left) || 0;
        let wY = parseInt(wrapper.style.top) || 0;
        tX = (window.innerWidth - 450 * tScale) / 2 - wX * tScale; 
        tY = 50 - wY * tScale; 
    }
    window.animateCameraTo(tX, tY, tScale);
};

window.zoomToShop = function() { 
    let wrapper = document.getElementById('board-shop-wrapper');
    let tY = 50; let tX = 50;
    let shopPhysicalWidth = 650; 
    
    let tScale = window.innerWidth / (shopPhysicalWidth + 30); 
    if (tScale > 1.4) tScale = 1.4; 
    
    if(wrapper) {
        let wX = parseInt(wrapper.style.left) || 0;
        let wY = parseInt(wrapper.style.top) || 0;
        tX = (window.innerWidth - shopPhysicalWidth * tScale) / 2 - wX * tScale; 
        tY = 40 - wY * tScale; 
    }
    window.animateCameraTo(tX, tY, tScale);
};

// --- KOSKETUSNÄYTÖN OHJAUS JA MOMENTUM ---
document.addEventListener('DOMContentLoaded', () => {
    const vp = document.getElementById('corkboard-viewport');
    if(!vp) return;

    let isDraggingBoard = false;
    let lastTouch = null;
    let initialPinchDist = 0;
    let pinchCenterBoard = { x: 0, y: 0 };
    
    let velX = 0; let velY = 0;
    let momentumFrame = null;

    function applyMomentum() {
        if (isDraggingBoard) return; 
        window.camTarget.x += velX;
        window.camTarget.y += velY;
        
        velX *= 0.90; 
        velY *= 0.90;
        
        window.applyBounds(window.camTarget);
        window.camCurrent.x = window.camTarget.x;
        window.camCurrent.y = window.camTarget.y;
        
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
        
        if (Math.abs(velX) > 0.5 || Math.abs(velY) > 0.5) {
            momentumFrame = requestAnimationFrame(applyMomentum);
        }
    }

    vp.addEventListener('touchstart', e => {
        if (momentumFrame) cancelAnimationFrame(momentumFrame);
        if (window.animFrame) cancelAnimationFrame(window.animFrame);
        
        vp.classList.add('is-dragging'); 
        velX = 0; velY = 0; 
        
        if(e.touches.length === 1) {
            isDraggingBoard = true;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDraggingBoard = true;
            initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            pinchCenterBoard = { x: (screenCX - window.camCurrent.x) / window.camCurrent.scale, y: (screenCY - window.camCurrent.y) / window.camCurrent.scale };
        }
    }, {passive: false});

    vp.addEventListener('touchmove', e => {
        if(!isDraggingBoard) return;
        e.preventDefault(); 
        
        let nextCam = { ...window.camCurrent };

        if(e.touches.length === 1 && lastTouch) {
            let dx = e.touches[0].clientX - lastTouch.x;
            let dy = e.touches[0].clientY - lastTouch.y;
            
            window.camTarget.x += dx; window.camTarget.y += dy;
            nextCam.x = window.camTarget.x; nextCam.y = window.camTarget.y;
            
            velX = (velX * 0.4) + (dx * 0.6); velY = (velY * 0.4) + (dy * 0.6);
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            velX = 0; velY = 0;
            let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let scaleDelta = dist / initialPinchDist;
            
            let newScale = window.camCurrent.scale * scaleDelta;
            if(newScale < 0.15) newScale = 0.15; if(newScale > 3.0) newScale = 3.0;
            
            let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            window.camTarget.scale = newScale;
            window.camTarget.x = screenCX - pinchCenterBoard.x * newScale;
            window.camTarget.y = screenCY - pinchCenterBoard.y * newScale;
            
            nextCam.x = window.camTarget.x; nextCam.y = window.camTarget.y; nextCam.scale = window.camTarget.scale;
            initialPinchDist = dist;
        }

        window.camCurrent = window.applyBounds(nextCam);
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
    }, {passive: false});

    vp.addEventListener('touchend', e => {
        if(e.touches.length === 0) {
            isDraggingBoard = false;
            lastTouch = null;
            vp.classList.remove('is-dragging');
            if (Math.abs(velX) > 1 || Math.abs(velY) > 1) momentumFrame = requestAnimationFrame(applyMomentum);
        } else if (e.touches.length === 1) {
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            velX = 0; velY = 0;
        }
    }, {passive: true});
});
