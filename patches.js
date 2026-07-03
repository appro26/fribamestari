// Kääritään koodi suojakuoreen (IIFE)
(function() {
    
    // ==========================================
    // 1. TYYLIT JA KIINTEÄ TAUSTA (GPU:N PELASTUS)
    // ==========================================
    let styleFix = document.getElementById('patch-styles');
    if(!styleFix) {
        styleFix = document.createElement('style');
        styleFix.id = 'patch-styles';
        document.head.appendChild(styleFix);
    }
    styleFix.innerHTML = `
        /* Estetään kaikki selaimen omat vieritykset ja lagit */
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #cbd5e1; overflow: hidden; touch-action: none; overscroll-behavior: none; }
        #corkboard-viewport { width: 100vw; height: 100vh; position: absolute; top:0; left:0; z-index: 5; touch-action: none; }
        
        /* Pelilaudan liikkeelle GPU-kiihdytys, koska sen koko on nyt turvallisissa rajoissa */
        #corkboard-surface { will-change: transform; transform-origin: 0 0; }
        
        .is-dragging * { pointer-events: none !important; }
        #cardDetailModal { padding-bottom: 120px !important; justify-content: flex-start !important; padding-top: 5vh !important; }
        .fixed-close-btn { bottom: 20px !important; width: 90% !important; max-width: 400px !important; border-radius: 16px !important; padding: 18px !important; font-size: 1.3rem !important; box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important; }
    `;

    // Luodaan staattinen huoneen tausta, jota ei tarvitse koskaan liikuttaa!
    let roomBg = document.getElementById('fixed-room-bg');
    if(!roomBg) {
        roomBg = document.createElement('div');
        roomBg.id = 'fixed-room-bg';
        // Staattinen horisontti (seinä ylhäällä, tumma lattia alhaalla)
        roomBg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; background: linear-gradient(to bottom, #cbd5e1 50%, #334155 50%, #475569 100%); pointer-events:none;";
        document.body.insertBefore(roomBg, document.body.firstChild);
    }

    // ==========================================
    // 2. KAMERAN MOOTTORI (Huippusulava, vapaat rajat)
    // ==========================================
    window.camCurrent = window.camCurrent || { x: 0, y: 0, scale: 1 };
    
    // Asetetaan rajat todella löysiksi, ettei pelaaja törmää "seiniin" liikkuessa
    window.applyBounds = function(target) {
        let boardEl = document.getElementById('corkboard-surface');
        if(!boardEl) return target;
        
        let boardW = parseInt(boardEl.style.width) || 4000;
        let boardH = parseInt(boardEl.style.height) || 4000;
        
        // Annetaan massiivisesti (2500px) tyhjää tilaa reunoille
        let minX = window.innerWidth - boardW * target.scale - 2500;
        let maxX = 2500;
        let minY = window.innerHeight - boardH * target.scale - 2500;
        let maxY = 2500;

        if (target.x < minX) target.x = minX;
        if (target.x > maxX) target.x = maxX;
        if (target.y < minY) target.y = minY;
        if (target.y > maxY) target.y = maxY;
        
        return target;
    };

    let oldVp = document.getElementById('corkboard-viewport');
    if (oldVp) {
        let vp = oldVp.cloneNode(true);
        oldVp.parentNode.replaceChild(vp, oldVp);
        
        let isDraggingBoard = false;
        let lastTouch = null;
        let initialPinchDist = 0;
        let pinchCenterBoard = { x: 0, y: 0 };
        
        let velX = 0;
        let velY = 0;
        let momentumFrame = null;
        let renderFrame = null;

        function renderTransform() {
            let boardEl = document.getElementById('corkboard-surface');
            if(boardEl) {
                // Käytetään suoraa 3D-transformia sulavuuden maksimoimiseksi
                boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
            }
            renderFrame = null;
        }

        function requestRender() {
            if (!renderFrame) {
                renderFrame = requestAnimationFrame(renderTransform);
            }
        }

        function applyMomentum() {
            if (isDraggingBoard) return; 
            
            window.camCurrent.x += velX;
            window.camCurrent.y += velY;
            
            // Kitka
            velX *= 0.92;
            velY *= 0.92;
            
            window.camCurrent = window.applyBounds(window.camCurrent);
            requestRender();
            
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
                pinchCenterBoard = {
                    x: (screenCX - window.camCurrent.x) / window.camCurrent.scale,
                    y: (screenCY - window.camCurrent.y) / window.camCurrent.scale
                };
            }
        }, {passive: false});

        vp.addEventListener('touchmove', e => {
            if(!isDraggingBoard) return;
            e.preventDefault(); 
            
            if(e.touches.length === 1 && lastTouch) {
                let dx = e.touches[0].clientX - lastTouch.x;
                let dy = e.touches[0].clientY - lastTouch.y;
                
                window.camCurrent.x += dx;
                window.camCurrent.y += dy;
                
                velX = dx;
                velY = dy;
                
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                velX = 0; velY = 0;
                
                let dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                let scaleDelta = dist / initialPinchDist;
                
                let newScale = window.camCurrent.scale * scaleDelta;
                if(newScale < 0.15) newScale = 0.15;
                if(newScale > 3.0) newScale = 3.0;
                
                let screenCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                let screenCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                window.camCurrent.scale = newScale;
                window.camCurrent.x = screenCX - pinchCenterBoard.x * newScale;
                window.camCurrent.y = screenCY - pinchCenterBoard.y * newScale;
                
                initialPinchDist = dist;
            }

            window.camCurrent = window.applyBounds(window.camCurrent);
            requestRender();
        }, {passive: false});

        vp.addEventListener('touchend', e => {
            if(e.touches.length === 0) {
                isDraggingBoard = false;
                lastTouch = null;
                vp.classList.remove('is-dragging');
                
                if (Math.abs(velX) > 1 || Math.abs(velY) > 1) {
                    momentumFrame = requestAnimationFrame(applyMomentum);
                }
            } else if (e.touches.length === 1) {
                lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                velX = 0; velY = 0;
            }
        }, {passive: true});
    }

    // NAPPIEN ELOKUVAMAINEN ANIMATIO
    window.animFrame = null;
    window.animateCameraTo = function(tX, tY, tScale) {
        if(window.animFrame) cancelAnimationFrame(window.animFrame);
        let sX = window.camCurrent.x, sY = window.camCurrent.y, sScale = window.camCurrent.scale;
        
        let target = window.applyBounds({x: tX, y: tY, scale: tScale});
        tX = target.x; tY = target.y; tScale = target.scale;

        let startTime = performance.now();
        let duration = 400; 
        
        function step(time) {
            let p = (time - startTime) / duration;
            if(p > 1) p = 1;
            let ease = 1 - Math.pow(1 - p, 3); 
            
            window.camCurrent.x = sX + (tX - sX) * ease;
            window.camCurrent.y = sY + (tY - sY) * ease;
            window.camCurrent.scale = sScale + (tScale - sScale) * ease;
            
            let boardEl = document.getElementById('corkboard-surface');
            if(boardEl) {
                boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
            }
            if(p < 1) window.animFrame = requestAnimationFrame(step);
        }
        window.animFrame = requestAnimationFrame(step);
    };

    window.zoomToShop = function() { 
        let tScale = Math.min(0.60, window.innerWidth / 1250); 
        let wrapper = document.getElementById('board-shop-wrapper');
        let tY = 50; let tX = 50;
        if(wrapper) {
            let wX = parseInt(wrapper.style.left) || 0;
            let wY = parseInt(wrapper.style.top) || 0;
            tX = (window.innerWidth - 1100 * tScale) / 2 - wX * tScale; 
            tY = 100 - wY * tScale; 
        }
        window.animateCameraTo(tX, tY, tScale);
    };

    // ==========================================
    // 3. LAUDAN RENDERÖINTI (Poistettu jättimäiset taustat)
    // ==========================================
    window.renderBoard = function() {
        const board = document.getElementById('corkboard-surface');
        if (!board || !window.currentCourse) return;
        
        let totalHoles = window.currentCourse.pars.length; 
        let cols = Math.min(9, totalHoles); 
        let rows = Math.ceil(totalHoles / cols);
        let rightXPanel = window.getRightXPanel ? window.getRightXPanel() : 2000;
        let corkW = rightXPanel + 400;
        let corkH = Math.max((rows * 1010) + 200, 2500);
        
        // Pidetään laudan DOM-koko mahdollisimman pienenä grafiikkaprosessoria säästäen
        let totalW = corkW + 1500; 
        let totalH = corkH + 800; 
        
        board.style.width = `${totalW}px`;
        board.style.height = `${totalH}px`;
        board.style.background = 'transparent';
        board.innerHTML = '';
        
        let html = ``;
        
        // ILMOITUSTAULU YKSINÄÄN (Ei taustaseiniä tai lattioita tässä liikuteltavassa elementissä)
        html += `<div style="position:absolute; left:50px; top:50px; width:${corkW}px; height:${corkH}px; background-color: #e2e8f0; background-image: radial-gradient(rgba(0,0,0,0.08) 2px, transparent 2px); background-size: 12px 12px; border: 35px solid #5c4033; border-top-color: #7b4e35; border-left-color: #7b4e35; border-bottom-color: #3e2723; border-right-color: #3e2723; border-radius: 12px; z-index:1; box-shadow: 15px 25px 50px rgba(0,0,0,0.7);"></div>`;
        html += `<div id="board-binder-wrapper" style="position:absolute; left:80px; top:120px; z-index:10; width:500px;"></div>`;
        html += `<div id="board-receipt-wrapper" style="position:absolute; left:100px; top:1200px; z-index:10; width:450px;"></div>`;
        
        let startXHolesVal = window.startXHoles || 1000;
        html += `<div id="holes-grid" style="display:grid; grid-template-columns:repeat(${cols}, 380px); gap:60px 80px; position:absolute; left:${startXHolesVal + 50}px; top:150px; z-index:5;">`;
        window.gameHistory.forEach((h, index) => { html += window.getHoleCellHTML(h, index + 1, false, true); });
        
        if (window.currentHoleIndex > totalHoles) {
            let sortedPlayers = [...window.allPlayers].filter(p=>p).sort((a,b) => (a.dgScore || 0) - (b.dgScore || 0));
            let winner = sortedPlayers[0] || {name: "Tuntematon", dgScore: 0, score: 0};
            html += `
            <div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; height:600px;">
                <div style="transform:rotate(-3deg); background:#fff; padding:60px; box-shadow:15px 30px 60px rgba(0,0,0,0.6); border:4px solid #ccc; z-index:100; text-align:center; min-width:450px; border-radius:8px; position:relative;">
                    <div class="tape tape-top" style="width:200px; top:-15px; height:35px;"></div>
                    <h1 style="font-family:'Kalam', cursive; font-size:5rem; color:var(--primary); margin-bottom:15px; line-height:1;">🏆 MESTARI!</h1>
                    <h2 style="font-size:2rem; margin-bottom:10px; color:#555;">VOITTAJA:</h2>
                    <div style="font-size:4.5rem; font-weight:900; color:var(--ink-blue); margin-bottom:30px; font-family:'Kalam', cursive;">${winner.name}</div>
                </div>
            </div>`;
        } else if (window.activeHole) { 
            html += window.getHoleCellHTML({ rule: window.activeHole.rule, playedCards: window.activeHole.playedCards, color: window.activeHole.color, penColor: window.activeHole.penColor, players: window.allPlayers }, window.currentHoleIndex, true, false); 
        }
        html += `</div>`;
        
        // KAUPAN SIJOITUS
        let shopX = corkW + 250;
        let shopY = corkH + 150 - 1500; 
        html += `<div id="board-shop-wrapper" style="position:absolute; left:${shopX}px; top:${shopY}px; z-index:10; width:1100px;"></div>`;
        
        board.innerHTML = html;
        
        if(window.renderBinderOnBoard) window.renderBinderOnBoard();
        if(window.renderReceiptOnBoard) window.renderReceiptOnBoard();
        if(window.renderShopOnBoard) window.renderShopOnBoard();
    };

})();
