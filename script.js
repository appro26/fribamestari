// --- 1. FIREBASE V10 MODULAARINEN KONFIGURAATIO ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, runTransaction, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// SINUN UUSI FRIBAMESTARI-TIETOKANTASI
const firebaseConfig = { 
    databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- 2. PWA ASENNUSLOGIIKKA ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e; checkInstallStatus();
});

function checkInstallStatus() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const installCard = document.getElementById('installCard');
    const instructionText = document.getElementById('installInstruction');
    const installBtn = document.getElementById('installBtn');
    const isDismissed = localStorage.getItem('friba_install_dismissed') === 'true';

    if (isStandalone || isDismissed) {
        if (installCard) installCard.style.display = 'none'; return; 
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (installCard) installCard.style.display = 'block';

    if (isIOS) {
        instructionText.innerHTML = 'Saat pelin koko ruudulle: Paina selaimen alareunasta <b>Jaa</b>-kuvaketta ja valitse <b>"Lisää koti-valikkoon"</b>.';
        installBtn.style.display = 'none';
    } else {
        instructionText.innerHTML = 'Asenna Fribamestari puhelimeesi, jotta se toimii radalla nopeammin ja ilman yläpalkkia!';
        installBtn.style.display = 'block';
        installBtn.onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') { installCard.style.display = 'none'; }
                deferredPrompt = null;
            }
        };
    }
}

window.dismissInstallPrompt = function() {
    localStorage.setItem('friba_install_dismissed', 'true');
    const installCard = document.getElementById('installCard');
    if (installCard) installCard.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => { checkInstallStatus(); });

// --- 3. GLOBAALIT MUUTTUJAT ---
let myName = localStorage.getItem('friba_name') || null;
let allPlayers = [];
let activeHole = null;
let pendingXP = 0;
let xpTimeout = null;

// Pitkän painalluksen asettaja (Tasan 1.5 sekuntia)
function setupLongPress(btnEl, onComplete) {
    let pressTimer;
    let isPressing = false;
    const duration = 1500; 

    const start = (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        isPressing = true;
        btnEl.classList.add('is-pressing');
        pressTimer = setTimeout(() => {
            isPressing = false;
            btnEl.classList.remove('is-pressing');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            onComplete();
        }, duration);
    };

    const end = () => {
        if (isPressing) {
            clearTimeout(pressTimer);
            isPressing = false;
            btnEl.classList.remove('is-pressing');
        }
    };

    btnEl.addEventListener('mousedown', start);
    btnEl.addEventListener('touchstart', start);
    btnEl.addEventListener('mouseup', end);
    btnEl.addEventListener('mouseleave', end);
    btnEl.addEventListener('touchend', end);
}

// --- 4. KIRJAUTUMINEN JA ROOLIT ---
window.claimIdentity = function() {
    let n = document.getElementById('playerNameInput').value.trim();
    if(!n || n.length > 15) return alert("Syötä korkeintaan 15 merkkiä pitkä nimi."); 
    
    myName = n; 
    localStorage.setItem('friba_name', n);
    updateIdentityUI(); 

    runTransaction(ref(db, 'gameState/players'), (p) => {
        p = p || []; 
        if(!p.find(x => x.name === n)) {
            p.push({ name: n, score: 0, cards: [] }); 
        }
        return p;
    }).then(() => logEvent(`${n} astui tii-paikalle.`));
};

function updateIdentityUI() { 
    document.getElementById('identityCard').style.display = myName ? 'none' : 'block'; 
    document.getElementById('idTag').innerText = myName ? "PROFIILI: " + myName : "KIRJAUDU SISÄÄN"; 
}

window.setRole = function(r) {
    document.body.className = r + '-mode';
    document.getElementById('btnPlayer').classList.toggle('active', r === 'player');
    document.getElementById('btnGM').classList.toggle('active', r === 'gm');
};

// Salasanaton GM-tila (Pitkä painallus)
const gmBtn = document.getElementById('btnGM');
if(gmBtn) {
    setupLongPress(gmBtn, () => {
        window.setRole('gm');
    });
}

// --- 5. TIETOKANNAN KUUNTELU (MODULAARINEN) ---
onValue(ref(db, 'gameState'), (snap) => {
    const data = snap.val();
    if(!data) return;

    allPlayers = data.players || [];
    activeHole = data.activeHole || null;

    updateIdentityUI();
    renderLeaderboard();
    renderActiveHole();
    
    if (myName) {
        const me = allPlayers.find(p => p.name === myName);
        if (me) {
            renderPlayerHand(me.cards || []);
            renderShop(me.score || 0);
            document.getElementById('myResPoints').innerText = `${me.score || 0} Pisteitä`;
        } else {
            myName = null;
            localStorage.removeItem('friba_name');
            updateIdentityUI();
        }
    }

    if(document.getElementById('adminPanel').style.display === 'block') {
        renderAdminPlayerList();
        renderEventLog(data.eventLog);
        renderScoreLog(data.scoreLog);
    }
});

function logEvent(msg) {
    const time = new Date().toLocaleTimeString('fi-FI');
    push(ref(db, 'gameState/eventLog'), { time, msg });
}

function logScoreChange(playerName, delta, newScore, reason) {
    const time = new Date().toLocaleTimeString('fi-FI');
    push(ref(db, 'gameState/scoreLog'), { time, playerName, delta, newScore, reason });
}

// --- 6. VÄYLÄN ARVONTA JA NÄKYMÄ ---
window.rollHoleRules = function() {
    const randomRule = holeRules[Math.floor(Math.random() * holeRules.length)];
    set(ref(db, 'gameState/activeHole'), {
        ...randomRule,
        timestamp: Date.now()
    });
    logEvent(`Väyläruletti pyöritetty: ${randomRule.n}`);
};

function renderActiveHole() {
    const container = document.getElementById('activeHoleContainer');
    const gmControls = document.getElementById('gmGlobalControls');
    
    if(gmControls) gmControls.style.display = 'block';

    if (!activeHole) {
        container.innerHTML = `<div class="card" style="text-align:center; padding: 15px;"><h2 style="margin:0;">Ei aktiivista väyläsääntöä</h2><p style="font-size:0.8rem; color:var(--muted);">Odotetaan että GM arpoo säännön.</p></div>`;
        return;
    }
    
    container.innerHTML = `
        <div class="card" style="border-color: ${activeHole.type === 'bounty' ? 'var(--hero-gold)' : '#8e44ad'};">
            <div class="task-status-tag" style="background: ${activeHole.type === 'bounty' ? 'var(--hero-gold)' : '#8e44ad'}; color: #fff;">
                ${activeHole.type === 'bounty' ? '🏆 BOUNTY (HAASTE)' : '🎲 VÄYLÄSÄÄNTÖ'}
            </div>
            <h1 style="color: ${activeHole.type === 'bounty' ? 'var(--hero-gold)' : '#8e44ad'}; margin-top:5px; margin-bottom: 10px;">${activeHole.n}</h1>
            <p style="font-size: 1rem; color: #fff; line-height: 1.4; margin: 0;">${activeHole.d}</p>
        </div>
    `;
}

// --- 7. SABOTAASI JA KAUPPA (PELAAJA) ---
function renderPlayerHand(cards) {
    const container = document.getElementById('playerHand');
    if (cards.length === 0) {
        container.innerHTML = '<p style="color:var(--muted); font-size:0.8rem;">Kätesi on tyhjä. Häviä väylä saadaksesi kosto-kortteja!</p>';
        return;
    }

    let html = '<div class="card-grid">';
    cards.forEach((cId, index) => {
        const cardDef = sabotageCards.find(sc => sc.id === cId);
        if(!cardDef) return;
        
        html += `
            <div class="sabotage-card">
                <div>
                    <h3>${cardDef.n}</h3>
                    <p>${cardDef.d}</p>
                </div>
                <button class="btn btn-danger long-press-btn" style="padding: 10px; margin:0;" id="useCardBtn_${index}">
                    <div class="long-press-fill"></div>
                    PELAA KORTTI
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;

    cards.forEach((cId, index) => {
        const btn = document.getElementById(`useCardBtn_${index}`);
        if(btn) setupLongPress(btn, () => playCard(index, cId));
    });
}

function renderShop(myPoints) {
    const container = document.getElementById('shopItems');
    let html = '';
    
    shopItems.forEach(item => {
        const canAfford = myPoints >= item.price;
        html += `
            <div class="shop-item" style="opacity: ${canAfford ? '1' : '0.5'};">
                <div class="shop-item-header">
                    <h3>${item.n}</h3>
                    <span class="price-tag">${item.price} P</span>
                </div>
                <p>${item.d}</p>
                <button class="btn ${canAfford ? 'btn-success' : 'btn-secondary'} long-press-btn" style="padding: 10px; margin:0; width:100%;" ${!canAfford ? 'disabled' : ''} id="buyBtn_${item.id}">
                    <div class="long-press-fill"></div>
                    ${canAfford ? 'OSTA ETU' : 'EI VARAA'}
                </button>
            </div>
        `;
    });
    container.innerHTML = html;

    shopItems.forEach(item => {
        const btn = document.getElementById(`buyBtn_${item.id}`);
        if(btn && !btn.disabled) {
            setupLongPress(btn, () => buyItem(item.id, item.price, item.n));
        }
    });
}

function playCard(cardIndex, cardId) {
    const cardDef = sabotageCards.find(c => c.id === cardId);
    
    runTransaction(ref(db, 'gameState/players'), (players) => {
        if(!players) return players;
        const me = players.find(p => p.name === myName);
        if(me && me.cards) {
            me.cards.splice(cardIndex, 1); 
        }
        return players;
    }).then(() => {
        triggerPopup(`SABOTAASI!`, `${myName} pelasi kortin: <b>${cardDef.n}</b>!`, `Kaikki huomio, sabotaasi aktivoitu radalla.`);
        logEvent(`${myName} pelasi kortin: ${cardDef.n}`);
    });
}

function buyItem(itemId, price, itemName) {
    runTransaction(ref(db, 'gameState/players'), (players) => {
        if(!players) return players;
        const me = players.find(p => p.name === myName);
        if(me && me.score >= price) {
            me.score -= price;
        } else {
            return; 
        }
        return players;
    }).then((res) => {
        if(res.committed) {
            showXPAnimation(-price);
            triggerPopup(`Osto suoritettu!`, `${myName} osti kaupasta edun: <b>${itemName}</b>.`, `Edut astuvat voimaan heti.`);
            logEvent(`${myName} osti: ${itemName}`);
            logScoreChange(myName, -price, res.snapshot.val().find(p=>p.name===myName).score, `Osto: ${itemName}`);
        }
    });
}

// --- 8. TULOSTEN SYÖTTÖ JA RANGAISTUKSET (GM) ---
window.openScoreModal = function() {
    const container = document.getElementById('scoreInputsContainer');
    if(allPlayers.length === 0) return alert("Ei pelaajia. Lisää pelaajat ensin asetuksista.");
    
    let html = '';
    allPlayers.forEach((p, i) => {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:rgba(0,0,0,0.5); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                <span style="font-weight:bold;">${p.name}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="btn btn-secondary" style="width:35px; height:35px; padding:0; margin:0;" onclick="document.getElementById('score_${i}').stepDown()">-</button>
                    <input type="number" id="score_${i}" value="3" style="width:60px; margin:0; text-align:center; font-size:1.2rem; font-weight:bold; height:35px;">
                    <button class="btn btn-secondary" style="width:35px; height:35px; padding:0; margin:0;" onclick="document.getElementById('score_${i}').stepUp()">+</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('scoreModal').style.display = 'flex';
};

window.submitScores = function() {
    let scores = [];
    allPlayers.forEach((p, i) => {
        const val = parseInt(document.getElementById(`score_${i}`).value) || 3;
        scores.push({ name: p.name, strokes: val });
    });

    const minStrokes = Math.min(...scores.map(s => s.strokes));
    const maxStrokes = Math.max(...scores.map(s => s.strokes));
    
    let winners = scores.filter(s => s.strokes === minStrokes).map(s => s.name);
    let losers = scores.filter(s => s.strokes === maxStrokes).map(s => s.name);
    
    runTransaction(ref(db, 'gameState/players'), (players) => {
        if(!players) return players;
        
        players.forEach(p => {
            if (winners.includes(p.name)) {
                p.score = (p.score || 0) + 5;
            }
            if (losers.includes(p.name)) {
                p.cards = p.cards || [];
                const randomCard = sabotageCards[Math.floor(Math.random() * sabotageCards.length)];
                p.cards.push(randomCard.id);
            }
        });
        return players;
    }).then(() => {
        logEvent(`Tulokset syötetty. Voittajat: ${winners.join(', ')} | Häviäjät: ${losers.join(', ')}`);
        
        let detailsHtml = `
            <p style="color:var(--success); font-size:1rem; margin:5px 0;"><b>VOITTAJAT (+5 PISTETTÄ):</b> ${winners.join(', ')}</p>
            <p style="color:var(--danger); font-size:1rem; margin:5px 0;"><b>HÄVIÄJÄT (+1 KORTTI):</b> ${losers.join(', ')}</p>
        `;
        
        if (document.getElementById('modDrinks') && document.getElementById('modDrinks').checked) {
            detailsHtml += `<p style="color:var(--accent); font-size:1.1rem; font-weight:900; margin-top:15px; border-top:1px dashed var(--accent); padding-top:10px;">🍻 HÄVIÄJÄT: OTTAKAA 2 HUIKKAA!</p>`;
        }
        
        triggerPopup(`VÄYLÄ PELATTU!`, `Resurssit ja kosto-kortit jaettu.`, detailsHtml);
        document.getElementById('scoreModal').style.display = 'none';
        
        remove(ref(db, 'gameState/activeHole'));
    });
};

// --- 9. POPUPIT JA ANIMAATIOT ---
function triggerPopup(title, desc, details) {
    const overlay = document.getElementById('lotteryWinner');
    if(!overlay) return;
    
    document.getElementById('popupTitle').innerHTML = title;
    document.getElementById('popupDesc').innerHTML = desc;
    document.getElementById('popupDetails').innerHTML = details;
    
    overlay.style.display = 'flex';
    
    const bar = overlay.querySelector('.timer-bar');
    if (bar) {
        bar.style.animation = 'none';
        void bar.offsetWidth; 
        bar.style.animation = 'shrink 3.5s linear forwards';
    }

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
    setTimeout(() => { overlay.style.display = 'none'; }, 3500); 
}

function showXPAnimation(points) {
    if (points === 0) return;
    pendingXP += points;
    if (xpTimeout) clearTimeout(xpTimeout);
    
    xpTimeout = setTimeout(() => {
        const pop = document.getElementById('xpPopUp');
        if(!pop) return;
        pop.style.display = 'block';
        
        if (pendingXP > 0) {
            pop.className = 'xp-popup success xp-animate';
            pop.innerText = `+${pendingXP} P`;
        } else {
            pop.className = 'xp-popup danger xp-animate';
            pop.innerText = `${pendingXP} P`;
        }
        
        pendingXP = 0;
        setTimeout(() => { 
            pop.style.display = 'none'; 
            pop.className = 'xp-popup'; 
        }, 2500);
    }, 400);
}

// --- 10. GM PANEELIN PERUSTOIMINNOT ---
function renderLeaderboard() {
    const list = document.getElementById('playerList');
    if(!list) return;
    let sortedPlayers = [...allPlayers].sort((a,b) => b.score - a.score);
    list.innerHTML = '';
    sortedPlayers.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = `player-row ${p.name === myName ? 'me' : ''}`;
        div.innerHTML = `<div style="display:flex; align-items:center;"><span style="color:var(--muted); font-size:0.8rem; margin-right:12px; font-weight:900;">${i+1}.</span><span>${p.name}</span></div><span class="price-tag">${p.score} P</span>`;
        list.appendChild(div);
    });
}

function renderAdminPlayerList() {
    const list = document.getElementById('adminPlayerList');
    if(!list) return; list.innerHTML = "";
    allPlayers.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-row'; div.style.padding = '8px';
        div.innerHTML = `
            <div style="width:100%">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; font-weight:bold;">${p.name} (${p.score} P) | Kortteja: ${p.cards ? p.cards.length : 0}</span>
                    <div style="display:flex; gap:4px;">
                        <button class="btn btn-secondary" style="width:28px; padding:5px; margin:0;" onclick="adjustScore(${i}, 5)">+</button>
                        <button class="btn btn-secondary" style="width:28px; padding:5px; margin:0;" onclick="adjustScore(${i}, -5)">-</button>
                        <button class="btn btn-danger" style="width:28px; padding:5px; margin:0;" onclick="removePlayer(${i})">X</button>
                    </div>
                </div>
            </div>`;
        list.appendChild(div);
    });
}

window.adminAddPlayer = function() {
    const input = document.getElementById('adminNewPlayerName');
    let n = input.value.trim();
    if(!n || n.length > 15) return;
    
    runTransaction(ref(db, 'gameState/players'), (p) => {
        p = p || [];
        if(!p.find(x => x.name === n)) { 
            p.push({ name: n, score: 0, cards: [] }); 
        }
        return p;
    }).then(() => {
        input.value = ''; 
        logEvent(`Admin lisäsi pelaajan: ${n}`);
    });
};

window.adjustScore = function(idx, amt) { 
    runTransaction(ref(db, `gameState/players/${idx}`), (p) => {
        if(p) { p.score = Math.max(0, (p.score || 0) + amt); }
        return p;
    });
};

window.removePlayer = function(idx) { 
    if(confirm("Poista pelaaja?")) { 
        logEvent(`Admin poisti pelaajan: ${allPlayers[idx].name}`);
        allPlayers.splice(idx, 1); 
        set(ref(db, 'gameState/players'), allPlayers); 
    } 
};

window.toggleAdminPanel = function() { 
    const p = document.getElementById('adminPanel'); 
    p.style.display = p.style.display === 'none' ? 'block' : 'none'; 
};

window.resetGame = function() {
    if (confirm("VAROITUS: Tämä nollaa koko frisbeepelin. Jatketaanko?")) {
        set(ref(db, 'gameState'), {
            players: [], history: [], eventLog: {}, scoreLog: {}, activeHole: null
        }).then(() => { localStorage.clear(); location.reload(); });
    }
};

function renderEventLog(logData) {
    const container = document.getElementById('adminEventLog');
    if(!container) return;
    container.innerHTML = "";
    const logs = Object.values(logData || {}).reverse().slice(0, 30);
    logs.forEach(l => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span class="time">[${l.time}]</span> ${l.msg}`;
        container.appendChild(div);
    });
}

function renderScoreLog(logData) {
    const container = document.getElementById('adminScoreLog');
    if(!container) return;
    container.innerHTML = "";
    const logs = Object.values(logData || {}).reverse().slice(0, 50);
    logs.forEach(l => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        let sign = l.delta > 0 ? '+' : '';
        let color = l.delta >= 0 ? 'var(--success)' : 'var(--danger)';
        div.innerHTML = `<span class="time">[${l.time}]</span> <b>${l.playerName}</b>: <span style="color:${color}; font-weight:bold;">${sign}${l.delta} P</span> <span style="color:var(--muted); font-size:0.85em;">(${l.reason})</span>`;
        container.appendChild(div);
    });
}
