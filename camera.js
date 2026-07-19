// ==============================================
// KAMERAN OHJAUS, ZOOM JA KOSKETUS (camera.js)
// ==============================================

window.camCurrent = { x: 0, y: 0, scale: 1 };
window.camTarget = { x: 0, y: 0, scale: 1 };

window.getRightXPanel = function() {
    if(!window.currentCourse || !window.currentCourse.pars) return 2000;
    let cols = Math.min(9, window.currentCourse.pars.length);
    let startX = window.startXHoles || 1000;
    return startX + (cols * 380) + ((cols - 1) * 80) + 150;
};

window.applyBounds = function(customTarget) {
    let target = customTarget || window.camTarget; 
    let boardEl = document.getElementById('corkboard-surface');
    if(!boardEl) return target;
    
    let rightXPanel = window.getRightXPanel();
    let corkW = rightXPanel + 400;
    let boardW = corkW + 1500; 
    
    let totalHoles = (window.currentCourse && window.currentCourse.pars) ? window.currentCourse.pars.length : 18; 
    let cols = Math.min(9, totalHoles); 
    let rows = Math.ceil(totalHoles / cols);
    let boardH = Math.max((rows * 1010) + 200, 2500) + 800; 
    
    let minX = window.innerWidth - boardW * target.scale - 1000;
    let maxX = 1000;
    let minY = window.innerHeight - boardH * target.scale - 1000;
    let maxY = 1000;

    if (target.x < minX) target.x = minX;
    if (target.x > maxX) target.x = maxX;
    if (target.y < minY) target.y = minY;
    if (target.y > maxY) target.y = maxY;
    
    return target;
};

window.animFrame = null;
window.animateCameraTo = function(tX, tY, tScale) {
    if(window.animFrame) cancelAnimationFrame(window.animFrame);
    let sX = window.camCurrent.x, sY = window.camCurrent.y, sScale = window.camCurrent.scale;
    
    let target = window.applyBounds({x: tX, y: tY, scale: tScale});
    tX = target.x; tY = target.y; tScale = target.scale;

    let startTime = performance.now();
    let duration = 350; 
    
    function step(time) {
        let p = (time - startTime) / duration;
        if(p > 1) p = 1;
        let ease = 1 - Math.pow(1 - p, 3); 
        
        window.camCurrent.x = sX + (tX - sX) * ease;
        window.camCurrent.y = sY + (tY - sY) * ease;
        window.camCurrent.scale = sScale + (tScale - sScale) * ease;
        window.camTarget = {...window.camCurrent}; 
        
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
        if(p < 1) window.animFrame = requestAnimationFrame(step);
    }
    window.animFrame = requestAnimationFrame(step);
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

// Integroitu patches.js tiedoston parempi zoomaus!
window.zoomToShop = function() { 
    let wrapper = document.getElementById('board-shop-wrapper');
    let tY = 50; let tX = 50;
    let shopPhysicalWidth = 650; 
    
    let tScale = window.innerWidth / (shopPhysicalWidth + 30); 
    if (tScale > 1.4) tScale = 1.4; 
    
    if(wrapper) {
        let wX = parseInt(wrapper.style.left) || 0;
        let wY = parseInt(wrapper.style.top) || 0;
        tX = (window.innerWidth - shopPhysicalWidth * tScale) / 2 - wX * tScale; 
        tY = 40 - wY * tScale; 
    }
    window.animateCameraTo(tX, tY, tScale);
};

// --- KOSKETUSNÄYTÖN OHJAUS JA MOMENTUM ---
document.addEventListener('DOMContentLoaded', () => {
    const vp = document.getElementById('corkboard-viewport');
    if(!vp) return;

    let isDraggingBoard = false;
    let lastTouch = null;
    let initialPinchDist = 0;
    let pinchCenterBoard = { x: 0, y: 0 };
    
    let velX = 0; let velY = 0;
    let momentumFrame = null;

    function applyMomentum() {
        if (isDraggingBoard) return; 
        window.camTarget.x += velX;
        window.camTarget.y += velY;
        
        velX *= 0.90; 
        velY *= 0.90;
        
        window.applyBounds(window.camTarget);
        window.camCurrent.x = window.camTarget.x;
        window.camCurrent.y = window.camTarget.y;
        
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
        
        if (Math.abs(velX) > 0.5 || Math.abs(velY) > 0.5) {
            momentumFrame = requestAnimationFrame(applyMomentum);
        }
    }

    vp.addEventListener('touchstart', e => {
        if (momentumFrame) cancelAnimationFrame(momentumFrame);
        if (window.animFrame) cancelAnimationFrame(window.animFrame);
        
        vp.classList.add('is-dragging'); 
        velX = 0; velY = 0; 
        
        if(e.touches.length === 1) {
            isDraggingBoard = true;
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDraggingBoard = true;
            initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            pinchCenterBoard = { x: (screenCX - window.camCurrent.x) / window.camCurrent.scale, y: (screenCY - window.camCurrent.y) / window.camCurrent.scale };
        }
    }, {passive: false});

    vp.addEventListener('touchmove', e => {
        if(!isDraggingBoard) return;
        e.preventDefault(); 
        
        let nextCam = { ...window.camCurrent };

        if(e.touches.length === 1 && lastTouch) {
            let dx = e.touches[0].clientX - lastTouch.x;
            let dy = e.touches[0].clientY - lastTouch.y;
            
            window.camTarget.x += dx; window.camTarget.y += dy;
            nextCam.x = window.camTarget.x; nextCam.y = window.camTarget.y;
            
            velX = (velX * 0.4) + (dx * 0.6); velY = (velY * 0.4) + (dy * 0.6);
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            velX = 0; velY = 0;
            let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            let scaleDelta = dist / initialPinchDist;
            
            let newScale = window.camCurrent.scale * scaleDelta;
            if(newScale < 0.15) newScale = 0.15; if(newScale > 3.0) newScale = 3.0;
            
            let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            window.camTarget.scale = newScale;
            window.camTarget.x = screenCX - pinchCenterBoard.x * newScale;
            window.camTarget.y = screenCY - pinchCenterBoard.y * newScale;
            
            nextCam.x = window.camTarget.x; nextCam.y = window.camTarget.y; nextCam.scale = window.camTarget.scale;
            initialPinchDist = dist;
        }

        window.camCurrent = window.applyBounds(nextCam);
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
    }, {passive: false});

    vp.addEventListener('touchend', e => {
        if(e.touches.length === 0) {
            isDraggingBoard = false;
            lastTouch = null;
            vp.classList.remove('is-dragging');
            if (Math.abs(velX) > 1 || Math.abs(velY) > 1) momentumFrame = requestAnimationFrame(applyMomentum);
        } else if (e.touches.length === 1) {
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            velX = 0; velY = 0;
        }
    }, {passive: true});
});
