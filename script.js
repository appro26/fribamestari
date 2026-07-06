// ==============================================
// TIETOKANTAYHTEYS JA PELIN TILA (script.js)
// ==============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.db = db;
window.ref = ref;
window.set = set;
window.push = push;
window.update = update;

window.myName = localStorage.getItem('friba_name') || null;
window.allPlayers = [];
window.activeHole = null;
window.currentCourse = null;
window.currentHoleIndex = 1;
window.gameHistory = []; 
window.pendingShopPurchase = null;

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

    if(data.settings) {
        window.gameSettings = { ...window.gameSettings, ...data.settings };
    }

    window.gameHistory = data.history ? (Array.isArray(data.history) ? data.history : Object.values(data.history)) : [];
    window.allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    window.activeHole = data.activeHole || null; 
    window.currentCourse = data.course || null; 
    window.currentHoleIndex = data.currentHoleIndex || 1;
    
    if (window.myName && !window.allPlayers.find(p => p && p.name === window.myName)) { 
        window.myName = null; 
        localStorage.removeItem('friba_name'); 
        if(document.getElementById('cardDetailModal')) document.getElementById('cardDetailModal').style.display = 'none'; 
    }
    
    if(window.updateIdentityUI) window.updateIdentityUI();
    
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

    if(window.renderBoard) window.renderBoard(); 
    
    // Hoidetaan pelaajan henkilökohtaiset toimenpiteet
    if (window.myName && window.currentCourse) {
        const me = window.allPlayers.find(p => p && p.name === window.myName);
        if (me) {
            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
            
            // ==============================================
            // YHDISTETTY APPLE-ILMOITUS (Kortit + Pisteet)
            // ==============================================
            let showCombinedToast = false;
            let toastTitle = "";
            let toastIcon = "✨";
            let toastDetailsArray = [];
            
            // 1. Pisteiden tarkistus (jos väylä vaihtunut)
            if (typeof window.myLastHoleIndex !== 'undefined' && window.myLastHoleIndex < window.currentHoleIndex) {
                showCombinedToast = true;
                if (data.history && data.history.length >= window.myLastHoleIndex) {
                    let lastHoleData = data.history[window.myLastHoleIndex - 1];
                    if (lastHoleData && lastHoleData.pointBreakdowns && lastHoleData.pointBreakdowns[window.myName]) {
                        let myBreakdown = lastHoleData.pointBreakdowns[window.myName];
                        let sign = myBreakdown.delta > 0 ? '+' : '';
                        toastTitle = `Väylä ohi: ${sign}${myBreakdown.delta} P`;
                        toastIcon = myBreakdown.delta >= 0 ? '💰' : '💸';
                        
                        if (myBreakdown.summary && myBreakdown.summary !== "Ei tuloja tai menoja.") {
                            toastDetailsArray.push(myBreakdown.summary);
                        }
                    }
                }
            }
            
            // 2. Korttien tarkistus (uudet nostot)
            if (typeof window.myLastHand !== 'undefined' && window.myLastHand.length < myCards.length) {
                let newCardsCount = myCards.length - window.myLastHand.length;
                toastDetailsArray.push(`Uudet kortit: +${newCardsCount} kpl`);
                
                if (!showCombinedToast) { 
                    // Jos väylä ei vaihtunut, mutta saatiin kortti (esim. kauppa)
                    showCombinedToast = true;
                    toastTitle = `Uusi kortti nostettu!`;
                    toastIcon = "🃏";
                }
            }
            
            window.myLastHand = [...myCards];

            // Väylän vaihdon UI-päivitys
            if (typeof window.myLastHoleIndex !== 'undefined' && window.myLastHoleIndex !== window.currentHoleIndex) {
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
            
            // Laukaistaan yhdistetty Apple-toast
            if (showCombinedToast && window.showAppleToast) {
                let detailEl = document.getElementById('appleToastDetails');
                if(detailEl) {
                    // Pilkutetaan yhdeksi merkkijonoksi (ui.js osaa parsia tämän taulukoksi)
                    detailEl.innerText = toastDetailsArray.join(', ');
                }
                window.showAppleToast(toastTitle, toastIcon);
            }

            // ==============================================
            // MUIDEN PELAAJIEN TAPAHTUMAT
            // ==============================================
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
            
            // Käsiraja
            if (window.gameSettings && window.gameSettings.handLimitEnabled && myCards.length > (window.gameSettings.handLimit||6)) { 
                if(window.showHandLimitModal) window.showHandLimitModal(myCards); 
            } else { 
                if(document.getElementById('handLimitModal')) document.getElementById('handLimitModal').style.display = 'none'; 
            }
            
            // UI päivitykset
            if(document.getElementById('myResPointsBtn')) document.getElementById('myResPointsBtn').innerText = `${me.score || 0} P`;
            if(window.gameSettings) {
                if(document.getElementById('handCountBadge')) document.getElementById('handCountBadge').innerText = `${myCards.length}/${window.gameSettings.handLimit||6}`; 
            }
        }
    }
});
