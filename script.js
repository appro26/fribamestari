import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, push, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = { databaseURL: "https://fribamestari-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const el = id => document.getElementById(id);

// --- GLOBAALIT FUNKTIOT JA TILA ---
let myName = localStorage.getItem('friba_name') || null;
let allPlayers = [];
let activeHole = null;
let currentCourse = null;
let currentHoleIndex = 1;

// ... (Muut aiemmat funktiot pysyvät samoina) ...

// VAATIMUS 3: GM Undo
window.undoCardPlay = function(index) {
    runTransaction(ref(db, 'gameState'), (state) => {
        if(!state || !state.activeHole.playedCards) return state;
        let pc = state.activeHole.playedCards[index];
        let p = state.players.find(x => x.name === pc.by);
        if(p) p.cards.push(pc.cardId); // TÄRKEÄÄ: Kortin ID täytyy löytyä tallennetusta datasta
        state.activeHole.playedCards.splice(index, 1);
        return state;
    });
};

// VAATIMUS 4: GM korttien lisäys
window.adminGiveCard = function(playerName, cardId) {
    runTransaction(ref(db, 'gameState/players'), (players) => {
        let p = players.find(x => x.name === playerName);
        if(p) p.cards.push(cardId);
        return players;
    });
};

// TULOSTEN KERÄÄMINEN (KORJATTU)
window.submitScores = function() {
    let par = currentCourse?.pars[currentHoleIndex - 1] || 3;
    let scores = [];
    document.querySelectorAll('.score-input-data').forEach(input => {
        scores.push({ name: input.getAttribute('data-name'), strokes: parseInt(input.value) || par });
    });
    
    // ... jatkaa samalla logiikalla ...
};
