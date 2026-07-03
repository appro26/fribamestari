// ==============================================
// TIETOKANTAYHTEYS JA PELIN TILA (script.js)
// ==============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Jaetaan Firebase-funktiot ikkunaan (window), jotta game.js voi käyttää niitä vapaasti
window.db = db;
window.ref = ref;
window.set = set;
window.push = push;
window.update = update;

const el = id => document.getElementById(id);

// Varmistetaan globaalit muuttujat
window.myName = localStorage.getItem('friba_name') || null;
window.allPlayers = [];
window.activeHole = null;
window.currentCourse = null;
window.currentHoleIndex = 1;
window.gameHistory = []; 
window.pendingShopPurchase = null;

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
            if(el('cardDetailModal')) el('cardDetailModal').style.display = 'none'; 
        }
        window.currentCourse = null; 
        if(el('lobbyContainer')) el('lobbyContainer').style.display = 'block'; 
        if(el('corkboard-viewport')) el('corkboard-viewport').style.display = 'none'; 
        if(el('pocketContainer')) el('pocketContainer').style.display = 'none'; 
        return;
    }

    if(data.settings) window.gameSettings = data.settings;
    window.gameHistory = data.history ? (Array.isArray(data.history) ? data.history : Object.values(data.history)) : [];
    window.allPlayers = data.players ? (Array.isArray(data.players) ? data.players : Object.values(data.players)) : [];
    window.activeHole = data.activeHole || null; 
    window.currentCourse = data.course || null; 
    window.currentHoleIndex = data.currentHoleIndex || 1;
    
    // Jos pelaaja on poistettu (esim. potkittu), heitetään hänet ulos
    if (window.myName && !window.allPlayers.find(p => p && p.name === window.myName)) { 
        window.myName = null; 
        localStorage.removeItem('friba_name'); 
        if(el('cardDetailModal')) el('cardDetailModal').style.display = 'none'; 
    }
    
    if(window.updateIdentityUI) window.updateIdentityUI();
    
    // Ohjataan näkymä joko aulaan tai varsinaiselle ilmoitustaululle
    if (window.myName) {
        if (!window.currentCourse) {
            if(el('lobbyContainer')) el('lobbyContainer').style.display = 'block'; 
            if(el('gameSetupArea')) el('gameSetupArea').style.display = 'block'; 
            if(el('corkboard-viewport')) el('corkboard-viewport').style.display = 'none'; 
            if(el('pocketContainer')) el('pocketContainer').style.display = 'none';
        } else {
            if(el('lobbyContainer')) el('lobbyContainer').style.display = 'none'; 
            if(el('corkboard-viewport')) el('corkboard-viewport').style.display = 'block'; 
            if(el('pocketContainer')) el('pocketContainer').style.display = 'flex';
            
            // GM Asetusten päivitys
            let sel = el('gmSetCurrentHole');
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
                if(el('adminEventLog')) el('adminEventLog').innerHTML = eLogHtml;
            }
            if (data.scoreLog) {
                let sLogHtml = ''; 
                Object.values(data.scoreLog).reverse().slice(0,20).forEach(l => { 
                    let c = l.delta >= 0 ? '#10b981' : '#ef4444'; 
                    let sign = l.delta > 0 ? '+' : '';
                    sLogHtml += `<div style="font-size:0.85rem; padding:4px 0; border-bottom:1px solid #444; display:flex; justify-content:space-between;"><span>[${l.time}] ${l.playerName}</span><span style="color:${c}; font-weight:bold;">${sign}${l.delta} P</span></div><div style="font-size:0.75rem; color:#888;">${l.msg}</div>`; 
                });
                if(el('adminScoreLog')) el('adminScoreLog').innerHTML = sLogHtml;
            }
        }
    } else {
        if(el('lobbyContainer')) el('lobbyContainer').style.display = 'block'; 
        if(el('gameSetupArea')) el('gameSetupArea').style.display = 'none'; 
        if(el('corkboard-viewport')) el('corkboard-viewport').style.display = 'none'; 
        if(el('pocketContainer')) el('pocketContainer').style.display = 'none';
    }

    // Piirretään koko ilmoitustaulu uusiksi datan pohjalta
    if(window.renderBoard) window.renderBoard(); 
    
    // Hoidetaan pelaajan henkilökohtaiset toimenpiteet (zoomaus, rahojen päivitys yms.)
    if (window.myName && window.currentCourse) {
        const me = window.allPlayers.find(p => p && p.name === window.myName);
        if (me) {
            // Jos väylä vaihtuu, zoomaa kamera automaattisesti siihen
            if (typeof window.myLastHoleIndex === 'undefined' || window.myLastHoleIndex !== window.currentHoleIndex) {
                window.myLastHoleIndex = window.currentHoleIndex; 
                setTimeout(() => { if(window.zoomToHole) window.zoomToHole(window.currentHoleIndex); }, 600);
            }
            
            let myCards = me.cards ? (Array.isArray(me.cards) ? me.cards : Object.values(me.cards)).filter(Boolean) : [];
            
            // Käsirajan varoitus
            if (window.gameSettings.handLimitEnabled && myCards.length > (window.gameSettings.handLimit||6)) { 
                if(window.showHandLimitModal) window.showHandLimitModal(myCards); 
            } else { 
                if(el('handLimitModal')) el('handLimitModal').style.display = 'none'; 
            }
            
            // Päivitä alapalkin napit
            if(el('myResPointsBtn')) el('myResPointsBtn').innerText = `${me.score || 0} P`; 
            if(el('handCountBadge')) el('handCountBadge').innerText = `${myCards.length}/${window.gameSettings.handLimit||6}`; 
        }
    }
});
