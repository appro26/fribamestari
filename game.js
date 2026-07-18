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
        let newPlayer = { name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] };
        
        if (window.currentCourse && window.activeHole) {
            let nextShop = window.activeHole.shop ? JSON.parse(JSON.stringify(window.activeHole.shop)) : {};

            let inUse = window.getCardsInUse(nextPlayers, nextShop);
            let lvl1 = Math.random() < 0.75 ? 1 : 2;
            newPlayer.cards.push(window.drawFromDeck('sabotage', lvl1, inUse));

            let lvl2 = Math.random() < 0.75 ? 1 : 2;
            newPlayer.cards.push(window.drawFromDeck('buff', lvl2, inUse));

            nextShop[n] = window.generatePersonalShop(inUse);

            window.update(window.ref(window.db, 'gameState/activeHole/shop'), window.cleanFirebaseData(nextShop));
        }

        nextPlayers.push(newPlayer); 
        if(window.db) window.set(window.ref(window.db, 'gameState/players'), window.cleanFirebaseData(nextPlayers)); 
    } 
};

// ==============================================
// GLOBAALIN YHTEISEN PAKAN HALLINTA
// ==============================================

// Kerää kaikki kortit, jotka ovat KÄYTÖSSÄ juuri nyt (pelaajien käsissä, varauksissa tai kaupoissa)
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

window.drawFromDeck = function(type, level, inUseIds = []) {
    // 1. Vapaana olevat kortit = Kaikki kortit miinus ne mitkä ovat tällä hetkellä jollain kädessä/kaupassa.
    // Tämä sekoittaa pelatut/myydyt kortit automaattisesti takaisin yhteiseen pakkaan!
    let candidates = window.allCards.filter(c => !inUseIds.includes(c.id));
    
    // 2. Yritetään löytää täydellinen osuma
    let exactMatches = candidates.filter(c => 
        (type ? c.type === type : true) && 
        (level ? c.level === level : true)
    );
    
    if (exactMatches.length > 0) {
        let picked = exactMatches[Math.floor(Math.random() * exactMatches.length)];
        inUseIds.push(picked.id); // Merkitään samantien käytetyksi
        return picked.id;
    }
    
    // 3. Joustetaan tasosta (Etsitään oikea tyyppi, mutta varmistetaan ettei ikinä anneta vahingossa kultaista Taso 3:a, jos pyydettiin 1 tai 2)
    let typeMatches = candidates.filter(c => 
        (type ? c.type === type : true) && 
        ((level === 1 || level === 2) ? c.level !== 3 : true)
    );
    
    if (typeMatches.length > 0) {
        let picked = typeMatches[Math.floor(Math.random() * typeMatches.length)];
        inUseIds.push(picked.id);
        return picked.id;
    }
    
    // 4. Hätävara: Joustetaan tyypistä ja tasosta (Pidetään edelleen huoli ettei norminostolla tule Taso 3:a)
    let anyMatches = candidates.filter(c => 
        ((level === 1 || level === 2) ? c.level !== 3 : true)
    );
    
    if (anyMatches.length > 0) {
        let picked = anyMatches[Math.floor(Math.random() * anyMatches.length)];
        inUseIds.push(picked.id);
        return picked.id;
    }
    
    return null; // Aivan kaikki sallitut kortit ovat tällä hetkellä pelaajien käsissä
};

window.generatePersonalShop = function(inUseIds = []) {
    let shopCards = [];
    let drawAndTrack = (type, level) => {
        let cId = window.drawFromDeck(type, level, inUseIds);
        if (cId) shopCards.push(cId);
        else shopCards.push(null);
    };
    
    // Kauppaan ladataan aina varmasti jokaista tasoa yksi.
    drawAndTrack('sabotage', 3);
    drawAndTrack('buff', 3);
    drawAndTrack('sabotage', 2);
    drawAndTrack('buff', 2);
    drawAndTrack('sabotage', 1);
    drawAndTrack('buff', 1);
    
    return shopCards.map(id => id ? window.allCards.find(c => c.id === id) : null);
};

window.getCardSortWeight = function(cId) {
    let c = window.allCards.find(x => x.id === cId);
    if(!c) return 0;
    let typeW = c.type === 'sabotage' ? 100 : 200;
    return typeW + (10 - c.level); 
};

window.getCardPlayCost = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return 0;
    if (window.gameSettings && window.gameSettings.cardPrices && window.gameSettings.cardPrices[cId] !== undefined) {
        return window.gameSettings.cardPrices[cId];
    }
    return cDef.playCost !== undefined ? cDef.playCost : cDef.price; 
};

// ==============================================
// TULOSTEN LASKENTA JA PELIN EDISTYMINEN
// ==============================================
window.submitScores = function() {
    let par = window.currentCourse.pars[window.currentHoleIndex - 1] || 3;
    let playerResults = {};
    
    (window.allPlayers || []).filter(Boolean).forEach(p => { playerResults[p.name] = { strokes: par, taskWon: false }; });
    
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
    (window.allPlayers || []).filter(Boolean).forEach(p => playerEffects[p.name] = { sabotages: [], buffs: [] });

    played.forEach(pc => {
        let mech = pc.mech; 
        let isSabotage = pc.type === 'sabotage';
        let targets = pc.target === 'KAIKKI VASTUSTAJAT' ? (window.allPlayers || []).filter(Boolean).filter(p => p.name !== pc.by).map(p => p.name) : [pc.target];

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
    
    let ptsWin = window.gameSettings.ptsWin !== undefined ? window.gameSettings.ptsWin : 3; 
    let ptsTask = window.gameSettings.ptsTask !== undefined ? window.gameSettings.ptsTask : 2; 
    let ptsPassive = window.gameSettings.ptsPassive !== undefined ? window.gameSettings.ptsPassive : 2; 
    let ptsTie = window.gameSettings.ptsTie || 0;
    let ptsAllBirdie = window.gameSettings.ptsAllBirdie || 0;
    let drawBase = window.gameSettings.drawBase !== undefined ? window.gameSettings.drawBase : 2;
    let drawLoser = window.gameSettings.drawLoser !== undefined ? window.gameSettings.drawLoser : 1;
    let limit = window.gameSettings.handLimit || 6;
    
    let holePointBreakdowns = {};
    let nextShop = {};

    // Haetaan vapaana olevat kortit ainoastaan nykyisistä pelaajien käsistä/varauksista
    let inUse = window.getCardsInUse(nextPlayers);

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
        
        if (!res.denyDraw) {
            let cardsToDraw = [];
            let getRandomLvl = () => Math.random() < 0.75 ? 1 : 2;
            
            for (let i = 0; i < drawBase; i++) {
                if (i === 0) cardsToDraw.push({type: 'sabotage', level: getRandomLvl()});
                else if (i === 1) cardsToDraw.push({type: 'buff', level: getRandomLvl()});
                else cardsToDraw.push({type: null, level: getRandomLvl()}); 
            }
            
            if (holeLosers.includes(p.name) && holeLosers.length < nextPlayers.length) {
                for (let i = 0; i < drawLoser; i++) {
                    cardsToDraw.push({type: null, level: getRandomLvl()});
                }
            }
            
            for (let i = 0; i < res.drawMod; i++) {
                cardsToDraw.push({type: null, level: getRandomLvl()});
            }
            
            cardsToDraw.forEach(drawReq => {
                if (p.cards.length < limit) {
                    let drawnId = window.drawFromDeck(drawReq.type, drawReq.level, inUse);
                    if (drawnId) p.cards.push(drawnId);
                }
            });
        }
    });

    nextPlayers.forEach(p => { 
        nextShop[p.name] = window.generatePersonalShop(inUse); 
    });

    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: nextShop, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: window.getRandomColor(), 
        penColor: window.getRandomPen()
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
// KORTTIEN KÄSITTELY
// ==============================================

window.executeCardPlay = function(targetName) {
    if(!window.pendingCardPlay) return; 
    
    const card = window.pendingCardPlay; 
    const timestamp = Date.now();
    
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
        'gameState/activeHole/playedCards': window.cleanFirebaseData(pCards)
    });
    
    window.logEvent(`${window.myName} pelasi kortin ${card.def.n} kohteelle ${targetName}.`);
};

window.upgradeCard = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if (!cDef || !cDef.nextId) return;
    
    let nextDef = window.allCards.find(c => c.id === cDef.nextId);
    if (!nextDef) return;
    
    let cost = (cDef.level === 1) ? 3 : 5;
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
        'gameState/players': window.cleanFirebaseData(nextPlayers)
    });
    
    window.logScore(window.myName, -cost, `Päivitti kortin tasolle ${nextDef.level}`);
    if(window.showAppleToast) window.showAppleToast(`Päivitetty! (-${cost} P)`, '✨');
    
    if(el('cardDetailModal') && el('cardDetailModal').style.display !== 'none') {
        if(window.openCardDetail) window.openCardDetail(nextDef.id, window.carouselCurrentMode, window.carouselCurrentIndex);
    }
};

window.forceDiscard = function(cId) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    const me = (nextPlayers || []).find(p => p && p.name === window.myName);
    if(!me) return;
    
    let cDef = window.allCards.find(c => c.id === cId);
    
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
                'gameState/players': window.cleanFirebaseData(nextPlayers)
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
        'gameState/players': window.cleanFirebaseData(nextPlayers)
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
    let inUse = window.getCardsInUse(nextPlayers); // Alussa pidetään silmällä vain varauksia (joita ei vielä ole)
    
    nextPlayers.forEach(p => { 
        let lvl1 = Math.random() < 0.75 ? 1 : 2;
        p.cards.push(window.drawFromDeck('sabotage', lvl1, inUse)); 
        
        let lvl2 = Math.random() < 0.75 ? 1 : 2;
        p.cards.push(window.drawFromDeck('buff', lvl2, inUse)); 
    });
    
    nextPlayers.forEach(p => { 
        personalizedShop[p.name] = window.generatePersonalShop(inUse); 
    });
    
    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: personalizedShop, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: window.getRandomColor(),
        penColor: window.getRandomPen()
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
    let inUse = window.getCardsInUse(nextPlayers);
    
    nextPlayers.forEach(p => { 
        let lvl1 = Math.random() < 0.75 ? 1 : 2;
        p.cards.push(window.drawFromDeck('sabotage', lvl1, inUse)); 
        
        let lvl2 = Math.random() < 0.75 ? 1 : 2;
        p.cards.push(window.drawFromDeck('buff', lvl2, inUse)); 
    });
    
    nextPlayers.forEach(p => { 
        personalizedShop[p.name] = window.generatePersonalShop(inUse); 
    });
    
    let nextActiveHole = { 
        rule: window.holeRules[0], shop: personalizedShop, playedCards: {}, 
        timestamp: Date.now(), color: window.getRandomColor(), penColor: window.getRandomPen()
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
        
        let nextActiveHole = { rule: window.holeRules[0], shop: {}, playedCards: {}, timestamp: Date.now(), color: window.getRandomColor(), penColor: window.getRandomPen() };
        
        // Pakan laskenta ja kauppojen generointi tässä poikkeustilassa
        let inUse = window.getCardsInUse(window.allPlayers);
        (window.allPlayers || []).filter(Boolean).forEach(p => { nextActiveHole.shop[p.name] = window.generatePersonalShop(inUse); });
        
        window.update(window.ref(window.db), window.cleanFirebaseData({ 
            'gameState/currentHoleIndex': nextH, 'gameState/history': nextHistory, 'gameState/activeHole': nextActiveHole 
        })); el('settingsModal').style.display='none';
    }
};

window.gmAddPlayer = function() {
    let n = el('gmNewPlayerName').value.trim(); if(!n) return;
    if((window.allPlayers || []).filter(Boolean).find(p => p.name === n)) { alert("Pelaaja on jo olemassa!"); return; }
    
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers || [])).filter(Boolean);
    nextPlayers.push({ name: n, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] });
    window.update(window.ref(window.db), {'gameState/players': window.cleanFirebaseData(nextPlayers)});
    el('gmNewPlayerName').value = ''; 
    if(window.showAppleToast) window.showAppleToast('Pelaaja lisätty', '✅');
};

window.gmAdjustScore = function(pName, amount) {
    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    let p = nextPlayers.find(x => x.name === pName);
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
