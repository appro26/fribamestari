// ==============================================
// KAMERAN OHJAUS, ZOOM JA KOSKETUS (camera.js)
// ==============================================

window.boardState = { scale: 1, x: 0, y: 0 };
var isDraggingBoard = false;
var lastBoardTouch = null;
var initialPinchDist = 0;
var initialPinchScale = 1;
var camAnim = null; 
var isRendering = false;

window.applyBoardTransform = function() {
    let boardEl = document.getElementById('corkboard-surface');
    if(boardEl) {
        // 4. Kameran rajojen laskenta, jotta pelaaja ei eksy
        let rightX = window.getRightXPanel ? window.getRightXPanel() : 2000;
        let boardW = rightX + 1000; // Huomioidaan lattialla seisovan automaatin tila
        let boardH = 3500; // Riittävästi tilaa alaspäin kansiolle ja kuitille
        
        let minX = window.innerWidth - boardW * window.boardState.scale - 100;
        let maxX = 100;
        let minY = window.innerHeight - boardH * window.boardState.scale - 100;
        let maxY = 100;

        if (window.boardState.x < minX) window.boardState.x = minX;
        if (window.boardState.x > maxX) window.boardState.x = maxX;
        if (window.boardState.y < minY) window.boardState.y = minY;
        if (window.boardState.y > maxY) window.boardState.y = maxY;

        boardEl.style.transform = `translate3d(${window.boardState.x}px, ${window.boardState.y}px, 0) scale(${window.boardState.scale})`;
    }
    isRendering = false;
};

window.animateCameraTo = function(tX, tY, tScale, duration=350) {
    if (camAnim) cancelAnimationFrame(camAnim);
    let sX = window.boardState.x; 
    let sY = window.boardState.y; 
    let sScale = window.boardState.scale;
    let startT = performance.now();
    
    function step(time) {
        let p = (time - startT) / duration;
        if (p >= 1) p = 1;
        let ease = 1 - Math.pow(1 - p, 3); // Sulavampi Cubic ease-out
        
        window.boardState.x = sX + (tX - sX) * ease;
        window.boardState.y = sY + (tY - sY) * ease;
        window.boardState.scale = sScale + (tScale - sScale) * ease;
        
        window.applyBoardTransform();
        if (p < 1) {
            camAnim = requestAnimationFrame(step);
        } else {
            camAnim = null;
        }
    }
    camAnim = requestAnimationFrame(step);
};

window.getRightXPanel = function() {
    if(!window.currentCourse || !window.currentCourse.pars) return 2000;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let startX = window.startXHoles || 1000;
    return startX + (cols * 380) + ((cols - 1) * 80) + 150;
};

window.zoomToHole = function(hIndex) {
    if(!window.currentCourse || !window.currentCourse.pars) return;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let col = (hIndex - 1) % cols;
    let row = Math.floor((hIndex - 1) / cols);
    
    let startX = window.startXHoles || 1000;
    let cellX = startX + col * 460; 
    let cellY = 120 + row * 1010; 
    
    let targetX = (window.innerWidth - 380) / 2 - cellX; 
    let targetY = 10 - cellY;
    
    window.animateCameraTo(targetX, targetY, 1, 400);
};

window.zoomToCurrentHole = function() { window.zoomToHole(window.currentHoleIndex || 1); };
window.zoomToPreviousHole = function() { let prev = Math.max(1, (window.currentHoleIndex || 1) - 1); window.zoomToHole(prev); };

// 1. Omat kortit kansioon mentäessä kamera kohdistaa siten, että koko 900px leveä kansio näkyy
window.zoomToBinder = function() { 
    let tScale = Math.min(1.0, window.innerWidth / 950); 
    let tX = (window.innerWidth - 900 * tScale) / 2 - 20 * tScale; 
    let tY = 50 - 120 * tScale; 
    window.animateCameraTo(tX, tY, tScale, 500); 
};

// 2. Tulokset siirretty kansion alapuolelle
window.zoomToReceipt = function() {
    let tScale = Math.min(1.0, window.innerWidth / 550);
    let tX = (window.innerWidth - 500 * tScale) / 2 - 20 * tScale; 
    let tY = 50 - 1200 * tScale; // Sijoitetaan Y-akselilla kansion alapuolelle (1200px)
    window.animateCameraTo(tX, tY, tScale, 500);
};

// 3. Kauppa siirretty lattialle ilmoitustaulun viereen oikealle
window.zoomToShop = function() { 
    let rightX = window.getRightXPanel();
    let shopX = rightX + 50; 
    let tScale = Math.min(0.85, window.innerWidth / 850);
    let tX = (window.innerWidth - 800 * tScale) / 2 - shopX * tScale;
    let tY = 100 - 400 * tScale; 
    window.animateCameraTo(tX, tY, tScale, 500);
};

// Kosketusnäyttölogiikka
document.addEventListener('DOMContentLoaded', () => {
    const vp = document.getElementById('corkboard-viewport');
    if(vp) {
        vp.addEventListener('touchstart', e => {
            if(camAnim) { cancelAnimationFrame(camAnim); camAnim = null; }
            if(e.touches.length === 1) {
                isDraggingBoard = true;
                lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                initialPinchScale = window.boardState.scale;
                isDraggingBoard = true;
            }
        }, {passive: false});

        vp.addEventListener('touchmove', e => {
            if(!isDraggingBoard) return;
            e.preventDefault(); 
            
            if(e.touches.length === 1 && lastBoardTouch) {
                // 4. Sulava, suora 1:1 panorointi ilman kuminauhamaista viivettä
                window.boardState.x += (e.touches[0].clientX - lastBoardTouch.x);
                window.boardState.y += (e.touches[0].clientY - lastBoardTouch.y);
                lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // 5. Sulava zoomaus, joka kohdistuu sormien väliin
                let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                let centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                let centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                let newScale = initialPinchScale * (dist / initialPinchDist);
                if(newScale < 0.25) newScale = 0.25;
                if(newScale > 2.0) newScale = 2.0;
                
                // Panoroidaan samanaikaisesti skaalauksen kanssa kohti pinch-keskipistettä
                let scaleDiff = newScale - window.boardState.scale;
                window.boardState.x -= (centerX - window.boardState.x) * (scaleDiff / window.boardState.scale);
                window.boardState.y -= (centerY - window.boardState.y) * (scaleDiff / window.boardState.scale);
                
                window.boardState.scale = newScale;
                initialPinchDist = dist;
                initialPinchScale = newScale;
            }
            
            if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
        }, {passive: false});

        vp.addEventListener('touchend', e => {
            isDraggingBoard = false; 
            lastBoardTouch = null;
            if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
        }, {passive: true});
    }
});
