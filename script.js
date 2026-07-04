// ==============================================
// TIETOKANTAYHTEYS JA PELIN TILA (script.js)
// ==============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Jaetaan Firebase-funktiot ikkunaan (window)
window.db = db;
window.ref = ref;
window.set = set;
window.push = push;
window.update = update;

// Varmistetaan globaalit muuttujat
window.myName = localStorage.getItem('friba_name') || null;
window.allPlayers = [];
window.activeHole = null;
window.currentCourse = null;
window.currentHoleIndex = 1;
window.gameHistory = []; 
window.pendingShopPurchase = null;

// Asetetaan oletusasetukset, jotta sovellus ei kaadu jos Firebase-dataa ei vielä ole
window.gameSettings = { handLimitEnabled: true, handLimit: 6, ptsWin: 3, ptsTask: 2, ptsPassive: 2 };

// =============================================
// REAALIAIKAINEN DATABASE KUUNTELIJA
// =============================================
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    if(!data) {
        if(window.myName) { 
            window.myName = null; 
            localStorage.removeItem('friba_name'); 
            if(window.updateIdentityUI) window.updateIdentityUI(); 
            if(document.getElementById('cardDetailModal')) document.getElementById('cardDetailModal').style.display = 'none'; 
        }
        window.currentCourse = null; 
        if(document.getElementById('lobbyContainer')) document.getElementById('lobbyContainer').style.display = 'block'; 
        if(document.getElementById('app-main-area')) document.getElementById('app-main-area').style.display = 'none'; 
        if(document.getElementById('pocketContainer')) document.getElementById('pocketContainer').style.display = 'none'; 
        return;
    }

    // Päivitetään asetukset Firebasesta, mutta yhdistetään ne oletuksiin
    if(data.settings) {
        window.gameSettings = { ...window.gameSettings, ...data.settings };
    }

    window.gameHistory = data.history ? (Array.isArray(data.history) ? data.history : Object.values(data.history)) : [];
    window.allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    window.activeHole = data.activeHole || null; 
    window.currentCourse = data.course || null; 
    window.currentHoleIndex = data.currentHoleIndex || 1;
    
    // Jos pelaaja on poistettu (esim. potkittu), heitetään hänet ulos
    if (window.myName && !window.allPlayers.find(p => p && p.name === window.myName)) { 
        window.myName = null; 
        localStorage.removeItem('friba_name'); 
        if(document.getElementById('cardDetailModal')) document.getElementById('cardDetailModal').style.display = 'none'; 
    }
    
    if(window.updateIdentityUI) window.updateIdentityUI();
    
    // Ohjataan näkymä joko aulaan tai varsinaiselle pelialueelle
    if (window.myName) {
        if (!window.currentCourse) {
            if(document.getElementById('lobbyContainer')) document.getElementById('lobbyContainer').style.display = 'block'; 
            if(document.getElementById('gameSetupArea')) document.getElementById('gameSetupArea').style.display = 'block'; 
            if(document.getElementById('app-main-area')) document.getElementById('app-main-area').style.display = 'none'; 
            if(document.getElementById('pocketContainer')) document.getElementById('pocketContainer').style.display = 'none';
        } else {
            if(document.getElementById('lobbyContainer')) document.getElementById('lobbyContainer').style.display = 'none'; 
            if(document.getElementById('app-main-area')) document.getElementById('app-main-area').style.display = 'block'; 
            if(document.getElementById('pocketContainer')) document.getElementById('pocketContainer').style.display = 'flex';
            
            // GM Asetusten päivitys
            let sel = document.getElementById('gmSetCurrentHole');
            if(sel) { 
                sel.innerHTML = ''; 
                for(let i=1; i<=window.currentCourse.pars.length; i++) { 
                    sel.innerHTML += `<option value="${i}" ${i === window.currentHoleIndex ? 'selected' : ''}>Väylä ${i}</option>`; 
                } 
            }
            if(window.updateAdminPlayerList) window.updateAdminPlayerList();
            
            if (data.eventLog) {
                let eLogHtml = ''; 
                Object.values(data.eventLog).reverse().slice(0,20).forEach(l => { 
                    eLogHtml += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px solid #444;">[${l.time}] ${l.msg}</div>`; 
                });
                if(document.getElementById('adminEventLog')) document.getElementById('adminEventLog').innerHTML = eLogHtml;
            }
            if (data.scoreLog) {
                let sLogHtml = ''; 
                Object.values(data.scoreLog).reverse().slice(0,20).forEach(l => { 
                    let c = l.delta >= 0 ? '#10b981' : '#ef4444'; 
                    let sign = l.delta > 0 ? '+' : '';
                    sLogHtml += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px solid #444; display:flex; justify-content:space-between;"><span>[${l.time}] ${l.playerName}</span><span style="color:${c}; font-weight:bold;">${sign}${l.delta} P</span></div><div style="font-size:0.75rem; color:#888;">${l.msg}</div>`; 
                });
                if(document.getElementById('adminScoreLog')) document.getElementById('adminScoreLog').innerHTML = sLogHtml;
            }
        }
    } else {
        if(document.getElementById('lobbyContainer')) document.getElementById('lobbyContainer').style.display = 'block'; 
        if(document.getElementById('gameSetupArea')) document.getElementById('gameSetupArea').style.display = 'none'; 
        if(document.getElementById('app-main-area')) document.getElementById('app-main-area').style.display = 'none'; 
        if(document.getElementById('pocketContainer')) document.getElementById('pocketContainer').style.display = 'none';
    }

    // Piirretään aktiivinen UI-näkymä uudelleen datan pohjalta
    if(window.renderBoard) window.renderBoard(); 
    
    // Hoidetaan pelaajan henkilökohtaiset toimenpiteet
    if (window.myName && window.currentCourse) {
        const me = window.allPlayers.find(p => p && p.name === window.myName);
        if (me) {
            
            // Väylän automaattinen vaihto, historia-näkymän nollaus ja pisteilmoitukset yksityiskohtineen
            if (typeof window.myLastHoleIndex !== 'undefined' && window.myLastHoleIndex !== window.currentHoleIndex) {
                if (window.myLastHoleIndex < window.currentHoleIndex) {
                    if (data.history && data.history.length >= window.myLastHoleIndex) {
                        let lastHoleData = data.history[window.myLastHoleIndex - 1];
                        if (lastHoleData && lastHoleData.pointBreakdowns && lastHoleData.pointBreakdowns[window.myName]) {
                            let myBreakdown = lastHoleData.pointBreakdowns[window.myName];
                            if(window.showAppleToast) {
                                let sign = myBreakdown.delta > 0 ? '+' : '';
                                window.showAppleToast(`Tilitapahtuma: ${sign}${myBreakdown.delta} P`, myBreakdown.delta >= 0 ? '💰' : '💸');
                                let detailEl = document.getElementById('appleToastDetails');
                                if(detailEl) detailEl.innerText = myBreakdown.summary || "Ei tuloja tai menoja.";
                            }
                        }
                    }
                }
                
                window.myLastHoleIndex = window.currentHoleIndex; 
                window.viewedHoleIndex = window.currentHoleIndex; 
                setTimeout(() => { 
                    if(window.switchView) window.switchView('view-hole');
                    if(window.updateHoleNav) window.updateHoleNav();
                }, 300);
            } else if (typeof window.myLastHoleIndex === 'undefined') {
                window.myLastHoleIndex = window.currentHoleIndex;
                window.viewedHoleIndex = window.currentHoleIndex;
            }
            
            // Ilmoitukset muiden pelaajien juuri pelaamista korteista
            let currentPlayedCards = data.activeHole && data.activeHole.playedCards ? Object.keys(data.activeHole.playedCards) : [];
            if (typeof window.myLastPlayedCards !== 'undefined') {
                let newCards = currentPlayedCards.filter(k => !window.myLastPlayedCards.includes(k));
                newCards.forEach(k => {
                    let pc = data.activeHole.playedCards[k];
                    if (pc.by !== window.myName) {
                        let icon = pc.type === 'buff' ? '🛡️' : '💥';
                        let targetText = pc.target === 'KAIKKI VASTUSTAJAT' ? 'KAIKILLE' : pc.target;
                        let safeCardName = pc.cardName ? pc.cardName.split(' (')[0] : 'Kortti';
                        if(window.showNotification) window.showNotification(`${icon} ${pc.by} -> ${targetText}: ${safeCardName}`, pc.type === 'buff' ? 'info' : 'danger');
                    }
                });
            }
            window.myLastPlayedCards = currentPlayedCards;

            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
            
            // Uuden kortin nostamisen tunnistaminen ja värinä-ilmoitus
            if (typeof window.myLastHand === 'undefined') {
                window.myLastHand = [...myCards];
            } else if (window.myLastHand.length < myCards.length) {
                let newCardsCount = myCards.length - window.myLastHand.length;
                if(window.showAppleToast) {
                    window.showAppleToast(`+${newCardsCount} Uusi Kortti!`, "🃏");
                    let detailEl = document.getElementById('appleToastDetails');
                    if(detailEl) detailEl.innerText = "Tarkista Omat Kortit -kansio.";
                }
                window.myLastHand = [...myCards];
            } else {
                window.myLastHand = [...myCards];
            }
            
            // Käsirajan varoitus
            if (window.gameSettings && window.gameSettings.handLimitEnabled && myCards.length > (window.gameSettings.handLimit||6)) { 
                if(window.showHandLimitModal) window.showHandLimitModal(myCards); 
            } else { 
                if(document.getElementById('handLimitModal')) document.getElementById('handLimitModal').style.display = 'none'; 
            }
            
            // Päivitä alapalkin napit
            if(document.getElementById('myResPointsBtn')) document.getElementById('myResPointsBtn').innerText = `${me.score || 0} P`;
            if(window.gameSettings) {
                if(document.getElementById('handCountBadge')) document.getElementById('handCountBadge').innerText = `${myCards.length}/${window.gameSettings.handLimit||6}`; 
            }
        }
    }
});
