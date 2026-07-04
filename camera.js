// ==============================================
// KAMERAN OHJAUS, ZOOM JA KOSKETUS (camera.js)
// ==============================================

window.camTarget = { x: 0, y: 0, scale: 1 };
window.camCurrent = { x: 0, y: 0, scale: 1 };

let isDraggingBoard = false;
let lastTouch = null;
let initialPinchDist = 0;
let pinchCenterBoard = { x: 0, y: 0 };
let isCameraLoopRunning = false;

// Rajojen laskenta, ettei pelaaja eksy ulos alueelta
function applyBounds() {
    let boardEl = document.getElementById('corkboard-surface');
    if(!boardEl) return;
    
    let boardW = parseInt(boardEl.style.width) || 3000;
    let boardH = parseInt(boardEl.style.height) || 4000;
    
    // Rajat (jätetään n. 200px joustovaraa reunoille)
    let minX = window.innerWidth - boardW * window.camTarget.scale - 200;
    let maxX = 200;
    let minY = window.innerHeight - boardH * window.camTarget.scale - 200;
    let maxY = 200;

    if (window.camTarget.x < minX) window.camTarget.x = minX;
    if (window.camTarget.x > maxX) window.camTarget.x = maxX;
    if (window.camTarget.y < minY) window.camTarget.y = minY;
    if (window.camTarget.y > maxY) window.camTarget.y = maxY;
}

// Jatkuva animaatiosilmukka tekee kaikesta liikkeestä super-sulavaa
function cameraLoop() {
    applyBounds();
    
    // Lerp-kaava (0.15 määrittää liikkeen "kuminauhamaisuuden" ja sulavuuden)
    window.camCurrent.x += (window.camTarget.x - window.camCurrent.x) * 0.15;
    window.camCurrent.y += (window.camTarget.y - window.camCurrent.y) * 0.15;
    window.camCurrent.scale += (window.camTarget.scale - window.camCurrent.scale) * 0.15;

    let boardEl = document.getElementById('corkboard-surface');
    if(boardEl) {
        // Pyöristetään kymmenesosiin suorituskyvyn takaamiseksi
        let pX = window.camCurrent.x.toFixed(1);
        let pY = window.camCurrent.y.toFixed(1);
        let pS = window.camCurrent.scale.toFixed(3);
        boardEl.style.transform = `translate3d(${pX}px, ${pY}px, 0) scale(${pS})`;
    }
    
    requestAnimationFrame(cameraLoop);
}

window.animateCameraTo = function(tX, tY, tScale) {
    window.camTarget.x = tX;
    window.camTarget.y = tY;
    window.camTarget.scale = tScale;
};

window.getRightXPanel = function() {
    if(!window.currentCourse || !window.currentCourse.pars) return 2000;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let startX = window.startXHoles || 1000;
    return startX + (cols * 380) + ((cols - 1) * 80) + 150;
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
    let tScale = Math.min(0.85, window.innerWidth / 800);
    let wrapper = document.getElementById('board-shop-wrapper');
    let tY = 50; let tX = 50;
    if(wrapper) {
        let wX = parseInt(wrapper.style.left) || 0;
        let wY = parseInt(wrapper.style.top) || 0;
        tX = (window.innerWidth - 750 * tScale) / 2 - wX * tScale; 
        tY = 100 - wY * tScale; 
    }
    window.animateCameraTo(tX, tY, tScale);
};

// --- KOSKETUSNÄYTÖN OHJAUS ---

document.addEventListener('DOMContentLoaded', () => {
    if(!isCameraLoopRunning) {
        cameraLoop();
        isCameraLoopRunning = true;
    }

    const vp = document.getElementById('corkboard-viewport');
    if(vp) {
        vp.addEventListener('touchstart', e => {
            if(e.touches.length === 1) {
                isDraggingBoard = true;
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                isDraggingBoard = true;
                initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                
                // Lasketaan sormien keskipiste ruudulla
                let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                // Määritetään fyysinen piste laudalla, jonka täytyy pysyä sormien välissä
                pinchCenterBoard = {
                    x: (screenCX - window.camTarget.x) / window.camTarget.scale,
                    y: (screenCY - window.camTarget.y) / window.camTarget.scale
                };
            }
        }, {passive: false});

        vp.addEventListener('touchmove', e => {
            if(!isDraggingBoard) return;
            e.preventDefault(); 
            
            if(e.touches.length === 1 && lastTouch) {
                // Suora panorointi yhden sormen vetoliikkeellä
                window.camTarget.x += (e.touches[0].clientX - lastTouch.x);
                window.camTarget.y += (e.touches[0].clientY - lastTouch.y);
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // Kahden sormen zoomaus sidottuna kiinteään ankkuripisteeseen
                let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                let scaleDelta = dist / initialPinchDist;
                
                let newScale = window.camTarget.scale * scaleDelta;
                if(newScale < 0.2) newScale = 0.2;
                if(newScale > 2.5) newScale = 2.5;
                
                let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                window.camTarget.scale = newScale;
                window.camTarget.x = screenCX - pinchCenterBoard.x * newScale;
                window.camTarget.y = screenCY - pinchCenterBoard.y * newScale;
                
                initialPinchDist = dist;
            }
        }, {passive: false});

        vp.addEventListener('touchend', e => {
            if(e.touches.length === 0) {
                isDraggingBoard = false;
                lastTouch = null;
            } else if (e.touches.length === 1) {
                // Palautetaan vetotila, jos toinen sormi nousee kesken zoomin
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, {passive: true});
    }
});