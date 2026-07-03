// ==============================================
// PELIN YDINLOGIIKKA JA SÄÄNNÖT (game.js)
// ==============================================

const el = id => document.getElementById(id);

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
            if (s.mech === 'score_+1') pRes.strokes += 1;
            if (s.mech === 'score_+2') pRes.strokes += 2;
            if (s.mech === 'score_+3') pRes.strokes += 3;
            if (s.mech === 'deny_passive') pRes.denyPassive = true;
            if (s.mech === 'deny_win') { pRes.denyPassive = true; pRes.denyWin = true; }
            if (s.mech === 'deny_all_income') { pRes.denyPassive = true; pRes.denyWin = true; pRes.denyTask = true; }
            if (s.mech === 'deny_draw') pRes.denyDraw = true;
        });

        pEff.buffs.forEach(b => {
            if (b.mech === 'score_-1') pRes.strokes -= 1;
            if (b.mech === 'score_-2') pRes.strokes -= 2;
            if (b.mech === 'score_-3') pRes.strokes -= 3;
            if (b.mech === 'money_+1') pRes.moneyMod += 1;
            if (b.mech === 'money_+2_draw') { pRes.moneyMod += 2; pRes.drawMod += 1; }
            if (b.mech === 'money_+3_shield') { pRes.moneyMod += 3; pRes.drawMod += 1; }
            if (b.mech === 'triple_bounty') pRes.tripleTask = true;
        });
        
        pRes.strokes = Math.max(1, pRes.strokes);
    }

    let minStrokes = 999; 
    for (let key in playerResults) { 
        if (playerResults[key].strokes < minStrokes) minStrokes = playerResults[key].strokes; 
    }
    let holeWinners = []; 
    for (let key in playerResults) { 
        if (playerResults[key].strokes === minStrokes) holeWinners.push(key); 
    }

    let nextPlayers = JSON.parse(JSON.stringify(window.allPlayers)).filter(Boolean);
    let ptsWin = window.gameSettings.ptsWin || 3; 
    let ptsTask = window.gameSettings.ptsTask || 2; 
    let ptsPassive = window.gameSettings.ptsPassive || 2; 
    let limit = window.gameSettings.handLimit || 6;
    let globalLocked = window.getGlobalLockedFamilies(nextPlayers, window.activeHole);
    let holePointBreakdowns = {};

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
        
        if (!res.denyPassive) { currentPoints += ptsPassive; breakdown.push(`Palkka: +${ptsPassive} P`); }
        if (holeWinners.includes(p.name) && !res.denyWin) { currentPoints += ptsWin; breakdown.push(`Voitto: +${ptsWin} P`); }
        if (res.taskWon && !res.denyTask) { currentPoints += ptsTask; breakdown.push(`Tehtävä: +${ptsTask} P`); }
        if (res.moneyMod !== 0) { currentPoints += res.moneyMod; breakdown.push(`Kortit: ${res.moneyMod > 0 ? '+' : ''}${res.moneyMod} P`); }

        p.score = Math.max(0, currentPoints); 
        p.lastHoleSummary = breakdown.join(", "); 
        p.upgradedThisHole = [];
        
        holePointBreakdowns[p.name] = { delta: p.score - oldPoints, summary: p.lastHoleSummary };
        if (p.score - oldPoints !== 0) window.logScore(p.name, p.score - oldPoints, `Väylä ${window.currentHoleIndex}: ${p.lastHoleSummary}`);

        p.cards = Array.isArray(p.cards) ? p.cards : Object.values(p.cards || {}); 
        p.cards = p.cards.filter(Boolean);
        
        if (!res.denyDraw) {
            if (p.cards.length < limit) { 
                let sId = window.drawSpecificCard('sabotage', 2, globalLocked); 
                if (sId) p.cards.push(sId); 
            }
            if (p.cards.length < limit) { 
                let bId = window.drawSpecificCard('buff', 2, globalLocked); 
                if (bId) p.cards.push(bId); 
            }
            if (res.drawMod > 0) {
                for (let k = 0; k < res.drawMod; k++) { 
                    if (p.cards.length < limit) { 
                        let rId = window.drawSpecificCard(Math.random()<0.5?'sabotage':'buff', 2, globalLocked); 
                        if(rId) p.cards.push(rId); 
                    } 
                }
            }
        }
    });

    let nextActiveHole = { 
        rule: window.holeRules[Math.floor(Math.random() * window.holeRules.length)], 
        shop: {}, 
        playedCards: {}, 
        timestamp: Date.now(), 
        color: window.getRandomColor(), 
        penColor: window.getRandomPen() 
    };
    
    nextPlayers.forEach(p => { 
        nextActiveHole.shop[p.name] = window.generatePersonalShop(globalLocked); 
    });
    
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
        
        if (card.cost > 0) {
            me.score -= card.cost;
            window.logScore(window.myName, -card.cost, `Pelasi kortin: ${card.def.n}`);
            if(window.showAppleToast) window.showAppleToast(`-${card.cost} P (Pelattu)`, '💸');
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
    
    window.logEvent(`${window.myName} pelasi kortin ${card.def.n} kohteelle ${targetName}. Maksoi ${card.cost} P.`);
    if(window.showNotification) window.showNotification(`🃏 Pelasit kortin: ${card.def.n}`, card.def.type === 'buff' ? 'info' : 'debuff');
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
    
    window.update(window.ref(window.db), { 'gameState/players': window.cleanFirebaseData(nextPlayers) });
    
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

            window.update(window.ref(window.db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
            window.pendingShopPurchase = null; 
            
            if(window.showNotification) window.showNotification(`🛒 Ostit edun!`, 'warning');
            if(window.zoomToShop) window.zoomToShop();
            if(el('cardDetailModal')) el('cardDetailModal').style.display='none';
            return;
        } else { 
            window.pendingShopPurchase = null; 
        }
    }
    
    window.set(window.ref(window.db, 'gameState/players'), window.cleanFirebaseData(nextPlayers));
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
        if(window.zoomToBinder) window.zoomToBinder(); 
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
    if(window.zoomToShop) window.zoomToShop();
    if(el('cardDetailModal')) el('cardDetailModal').style.display='none';
};

window.cancelShopPurchase = function() {
    window.pendingShopPurchase = null;
    if(window.zoomToShop) window.zoomToShop(); 
};

// ==============================================
// GM-TOIMINNOT JA ASETUKSET
// ==============================================
window.startMeilahti = function() {
    let nextCourse = { name: "Meilahti", pars: Array(16).fill(3) };
    let nextPlayers = (window.allPlayers||[]).filter(Boolean).map(p => { 
        return { ...p, score: 3, dgScore: 0, cards: [], reservations: [], upgradedThisHole: [] }; 
    });
    
    let globalLocked = new Set();
    nextPlayers.forEach(p => { 
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked); 
        let bId = window.drawSpecificCard('buff', 1, globalLocked); 
        if(sId) p.cards.push(sId); 
        if(bId) p.cards.push(bId); 
    });
    
    let personalizedShop = {}; 
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
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
    
    let globalLocked = new Set();
    nextPlayers.forEach(p => { 
        let sId = window.drawSpecificCard('sabotage', 1, globalLocked); 
        let bId = window.drawSpecificCard('buff', 1, globalLocked); 
        if(sId) p.cards.push(sId); if(bId) p.cards.push(bId); 
    });
    
    let personalizedShop = {}; 
    nextPlayers.forEach(p => { personalizedShop[p.name] = window.generatePersonalShop(globalLocked); });
    
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
        handLimitEnabled: true, handLimit: parseInt(el('gmSetLimitCount').value) || 6, 
        ptsWin: parseInt(el('gmSetPtsWin').value) || 3, ptsTask: parseInt(el('gmSetPtsTask').value) || 2, 
        ptsLose: 0, ptsPassive: parseInt(el('gmSetPtsPassive').value) || 2 
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
        window.allPlayers.forEach(p => { nextActiveHole.shop[p.name] = window.generatePersonalShop(window.getGlobalLockedFamilies(window.allPlayers, null)); });
        
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

window.updateAdminPlayerList = function() {
    let container = el('adminPlayerList'); if(!container) return; let html = '';
    window.allPlayers.forEach(p => {
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:15px; margin-bottom:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
            <div style="font-weight:900; color:#fff; font-size:1.2rem; flex:1;">${p.name}<br><span style="color:var(--warning); font-size:1.5rem;">${p.score || 0} P</span></div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-warning" style="padding:10px; font-size:1rem; margin:0; flex:1; font-weight:900;" onclick="window.gmAdjustScore('${p.name}', 1)">+1 P</button>
                    <button class="btn btn-warning" style="padding:10px; font-size:1rem; margin:0; flex:1; font-weight:900;" onclick="window.gmAdjustScore('${p.name}', -1)">-1 P</button>
                </div>
                <button class="btn btn-danger" style="padding:10px; font-size:0.9rem; margin:0; font-weight:bold;" onclick="window.gmKickPlayer('${p.name}')">POTKI ULOS</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
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
// KORTTIEN JA KAUPAN GENEROINTIFUNKTIOT
// ==============================================
window.getGlobalLockedFamilies = function(playersObj, activeHoleObj) {
    let locked = new Set();
    let allP = playersObj || window.allPlayers || [];
    allP.forEach(p => {
        if(!p) return;
        let cArr = p.cards ? (Array.isArray(p.cards) ? p.cards : Object.values(p.cards)) : [];
        cArr.forEach(cId => {
            let cDef = window.allCards.find(c => c && c.id === cId);
            if(cDef) locked.add(cDef.family);
        });
        let rArr = p.reservations ? (Array.isArray(p.reservations) ? p.reservations : Object.values(p.reservations)) : [];
        rArr.forEach(cId => {
            let cDef = window.allCards.find(c => c && c.id === cId);
            if(cDef) locked.add(cDef.family);
        });
    });
    
    if(activeHoleObj && activeHoleObj.shop) {
        Object.values(activeHoleObj.shop).forEach(shopArr => {
            if(!shopArr) return;
            shopArr.forEach(item => {
                if(item && item.family) locked.add(item.family);
            });
        });
    }
    return locked;
};

window.drawSpecificCard = function(type, level, lockedSet) {
    let pool = window.allCards.filter(c => c.type === type && c.level === level && !lockedSet.has(c.family));
    if(pool.length === 0) pool = window.allCards.filter(c => c.type === type && c.level === level);
    if(pool.length === 0) return null;
    let drawn = pool[Math.floor(Math.random() * pool.length)];
    lockedSet.add(drawn.family);
    return drawn.id;
};

window.generatePersonalShop = function(globalLockedSet) {
    let shopCards = [];
    let ls = globalLockedSet ? new Set(globalLockedSet) : new Set();
    let t3Id = window.drawSpecificCard(Math.random() < 0.5 ? 'sabotage' : 'buff', 3, ls);
    let t2Id = window.drawSpecificCard(Math.random() < 0.5 ? 'sabotage' : 'buff', 2, ls);
    let t1Id1 = window.drawSpecificCard('sabotage', 1, ls);
    let t1Id2 = window.drawSpecificCard('buff', 1, ls);
    
    [t3Id, null, t2Id, null, t1Id1, t1Id2].forEach(id => {
        if(id) {
            let def = window.allCards.find(c => c.id === id);
            shopCards.push(def || null);
        } else {
            shopCards.push(null);
        }
    });
    return shopCards;
};

window.openTargetModal = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return;
    window.pendingCardPlay = { id: cId, cost: typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cId) : (cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2)), def: cDef };
    el('targetCardName').innerText = cDef.n;
    let html = '';
    
    if (cDef.type === 'buff') {
        html += `<button class="btn btn-success" style="margin-bottom:10px; padding:20px; font-size:1.2rem;" onclick="window.executeCardPlay('${window.myName}')">KÄYTÄ ITSEESI</button>`;
    } else {
        html += `<button class="btn btn-danger" style="margin-bottom:15px; padding:20px; font-size:1.2rem; box-shadow: 0 4px 15px rgba(220,38,38,0.5);" onclick="window.executeCardPlay('KAIKKI VASTUSTAJAT')">KAIKKI VASTUSTAJAT</button>`;
        (window.allPlayers || []).forEach(p => {
            if (p && p.name !== window.myName) {
                html += `<button class="btn btn-warning" style="margin-bottom:10px; padding:15px; font-size:1.1rem; color:#000;" onclick="window.executeCardPlay('${p.name}')">Kohde: ${p.name}</button>`;
            }
        });
    }
    el('targetPlayerList').innerHTML = html;
    window.showModalSafe('targetModal');
};

window.getCardPlayCost = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return 0;
    return cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2);
};

window.getCardSortWeight = function(cIdStr) {
    let def = window.allCards.find(c => c.id === cIdStr);
    if(!def) return 999;
    let typeWeight = def.type === 'sabotage' ? 0 : 100;
    let lvlWeight = (3 - def.level) * 10;
    return typeWeight + lvlWeight;
};
