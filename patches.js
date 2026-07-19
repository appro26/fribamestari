// ==============================================
// GPU-OPTIMOINTI (patches.js)
// HUOM: Kameran ja UI:n päällekkäisyydet on siirretty ytimeen!
// ==============================================

(function() {
    
    // ==========================================
    // 1. TYYLIT JA GPU-OPTIMOINTI (Repeilyn estäminen)
    // ==========================================
    let styleFix = document.getElementById('patch-styles');
    if(!styleFix) {
        styleFix = document.createElement('style');
        styleFix.id = 'patch-styles';
        document.head.appendChild(styleFix);
    }
    styleFix.innerHTML = `
        /* touch-action: none poistaa sormen vetoviiveen kokonaan! */
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #cbd5e1; overflow: hidden; touch-action: none; overscroll-behavior: none; }
        #corkboard-viewport { width: 100vw; height: 100vh; position: absolute; top:0; left:0; z-index: 5; touch-action: none; }
        
        #corkboard-surface { transform-origin: 0 0; }
        .is-dragging * { pointer-events: none !important; }
        #cardDetailModal { padding-bottom: 120px !important; justify-content: flex-start !important; padding-top: 5vh !important; }
        .fixed-close-btn { bottom: 20px !important; width: 90% !important; max-width: 400px !important; border-radius: 16px !important; padding: 18px !important; font-size: 1.3rem !important; box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important; }
    `;

    // LUODAAN PAIKALLAAN PYSYVÄ HUONE (Estää taustan repeilyn ja säästää muistia)
    let roomBg = document.getElementById('fixed-room-bg');
    if(!roomBg) {
        roomBg = document.createElement('div');
        roomBg.id = 'fixed-room-bg';
        document.body.insertBefore(roomBg, document.body.firstChild);
    }
    roomBg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; background: linear-gradient(to bottom, #cbd5e1 55%, #334155 55%, #1e293b 100%); pointer-events:none;";

})();
