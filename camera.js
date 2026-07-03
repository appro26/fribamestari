// ==============================================
// KAMERAN OHJAUS, ZOOM JA KOSKETUS (camera.js)
// ==============================================

window.boardState = { scale: 1, x: 0, y: 0 };
let isDraggingBoard = false;
let lastBoardTouch = null;
let initialPinchDist = 0;
let camAnim = null; 
let isRendering = false;

window.applyBoardTransform = function() {
    let boardEl = document.getElementById('corkboard-surface');
    if(boardEl) {
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
        let ease = 1 - Math.pow(1 - p, 3);
        
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

// Lasketaan dynaamisesti missä automaatti/kuitti sijaitsee taululla
window.getRightXPanel = function() {
    if(!window.currentCourse || !window.currentCourse.pars) return 2000;
    let cols = Math.min(9, window.currentCourse.pars.length);
    return window.startXHoles + (cols * 380) + ((cols - 1) * 80) + 150;
};

window.zoomToHole = function(hIndex) {
    if(!window.currentCourse || !window.currentCourse.pars) return;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let col = (hIndex - 1) % cols;
    let row = Math.floor((hIndex - 1) / cols);
    
    let cellX = window.startXHoles + col * 460; 
    let cellY = 120 + row * 1010; 
    
    let targetX = (window.innerWidth - 380) / 2 - cellX; 
    let targetY = 10 - cellY;
    
    window.animateCameraTo(targetX, targetY, 1, 400);
};

window.zoomToCurrentHole = function() { window.zoomToHole(window.currentHoleIndex || 1); };
window.zoomToPreviousHole = function() { let prev = Math.max(1, (window.currentHoleIndex || 1) - 1); window.zoomToHole(prev); };
window.zoomToBinder = function() { window.animateCameraTo((window.innerWidth - 900) / 2, 20, 0.8, 500); };
window.zoomToShop = function() { 
    let rightX = window.getRightXPanel();
    window.animateCameraTo((window.innerWidth - 800) / 2 - rightX, 20 - 800, 0.85, 500);
};
window.zoomToReceipt = function() {
    let rightX = window.getRightXPanel();
    window.animateCameraTo((window.innerWidth - 500) / 2 - rightX, 50, 0.9, 500);
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
                isDraggingBoard = true;
            }
        }, {passive: false});

        vp.addEventListener('touchmove', e => {
            if(!isDraggingBoard) return;
            e.preventDefault(); 
            if(e.touches.length === 1 && lastBoardTouch) {
                let panSpeed = 1 / Math.max(0.5, window.boardState.scale);
                window.boardState.x += (e.touches[0].clientX - lastBoardTouch.x) * panSpeed;
                window.boardState.y += (e.touches[0].clientY - lastBoardTouch.y) * panSpeed;
                lastBoardTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                window.boardState.scale *= (dist / initialPinchDist);
                if(window.boardState.scale < 0.35) window.boardState.scale = 0.35;
                if(window.boardState.scale > 1.8) window.boardState.scale = 1.8;
                initialPinchDist = dist;
            }
            if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
        }, {passive: false});

        vp.addEventListener('touchend', e => {
            isDraggingBoard = false; lastBoardTouch = null;
            if (!isRendering) { isRendering = true; requestAnimationFrame(window.applyBoardTransform); }
        }, {passive: true});
    }
});
