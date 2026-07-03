// Kääritään koodi suojakuoreen (IIFE)
(function() {
    
    // ==========================================
    // 1. TYYLIT JA STAATTINEN TAUSTA (Graafisen hajoilun korjaus)
    // ==========================================
    let styleFix = document.getElementById('patch-styles');
    if(!styleFix) {
        styleFix = document.createElement('style');
        styleFix.id = 'patch-styles';
        document.head.appendChild(styleFix);
    }
    styleFix.innerHTML = `
        /* Estetään taustan hajoaminen ja selaimen omat viiveet */
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #cbd5e1; overflow: hidden; touch-action: none; overscroll-behavior: none; }
        #corkboard-viewport { width: 100vw; height: 100vh; position: absolute; top:0; left:0; z-index: 5; touch-action: none; }
        
        #corkboard-surface { will-change: transform; transform-origin: 0 0; }
        .is-dragging * { pointer-events: none !important; }
        #cardDetailModal { padding-bottom: 120px !important; justify-content: flex-start !important; padding-top: 5vh !important; }
        .fixed-close-btn { bottom: 20px !important; width: 90% !important; max-width: 400px !important; border-radius: 16px !important; padding: 18px !important; font-size: 1.3rem !important; box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important; }
    `;

    // LUODAAN PAIKALLAAN PYSYVÄ HUONE, JOTA GPU:N EI TARVITSE LIIKUTTAA
    let roomBg = document.getElementById('fixed-room-bg');
    if(!roomBg) {
        roomBg = document.createElement('div');
        roomBg.id = 'fixed-room-bg';
        document.body.insertBefore(roomBg, document.body.firstChild);
    }
    // Tumma tausta (yläosa seinää, alaosa lattiaa)
    roomBg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; background: linear-gradient(to bottom, #cbd5e1 55%, #334155 55%, #1e293b 100%); pointer-events:none;";

    // ==========================================
    // 2. KAMERAN MOOTTORI (1:1 Välitön sormiseuranta + Momentum)
    // ==========================================
    window.camCurrent = window.camCurrent || { x: 0, y: 0, scale: 1 };
    window.camTarget = window.camTarget || { x: 0, y: 0, scale: 1 };

    window.applyBounds = function(customTarget) {
        let target = customTarget || window.camTarget; 
        let boardEl = document.getElementById('corkboard-surface');
        if(!boardEl) return target;
        
        let rightXPanel = window.getRightXPanel ? window.getRightXPanel() : 2000;
        let corkW = rightXPanel + 400;
        let boardW = corkW + 2500; 
        
        let totalHoles = window.currentCourse ? window.currentCourse.pars.length : 18; 
        let cols = Math.min(9, totalHoles); 
        let rows = Math.ceil(totalHoles / cols);
        let boardH = Math.max((rows * 1010) + 200, 2500) + 800; 
        
        // Vapautetaan rajoja entisestään
        let minX = window.innerWidth - boardW * target.scale - 2000;
        let maxX = 2000;
        let minY = window.innerHeight - boardH * target.scale - 2000;
        let maxY = 2000;

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
        
        let velX = 0; let velY = 0;
        let momentumFrame = null;

        function applyMomentum() {
            if (isDraggingBoard) return; 
            window.camTarget.x += velX;
            window.camTarget.y += velY;
            
            velX *= 0.90; // Kitka
            velY *= 0.90;
            
            window.applyBounds(window.camTarget);
            window.camCurrent.x = window.camTarget.x;
            window.camCurrent.y = window.camTarget.y;
            
            let boardEl = document.getElementById('corkboard-surface');
            if(boardEl) boardEl.style.transform = `translate3d(${window.camCurrent.x}px, ${window.camCurrent.y}px, 0) scale(${window.camCurrent.scale})`;
            
            if (Math.abs(velX) > 0.5 || Math.abs(velY) > 0.5) momentumFrame = requestAnimationFrame(applyMomentum);
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
    }

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

    // ZOOM LÄHEMMÄS JA KESKELLE UUTTA JÄTTIKONETTA
    window.zoomToShop = function() { 
        let tScale = Math.min(0.75, window.innerWidth / 1800); 
        let wrapper = document.getElementById('board-shop-wrapper');
        let tY = 50; let tX = 50;
        if(wrapper) {
            let wX = parseInt(wrapper.style.left) || 0;
            let wY = parseInt(wrapper.style.top) || 0;
            tX = (window.innerWidth - 1800 * tScale) / 2 - wX * tScale; 
            tY = 80 - wY * tScale; 
        }
        window.animateCameraTo(tX, tY, tScale);
    };

    // ==========================================
    // 3. KORTTIEN JA JÄTTIKUPAN RENDERÖINTI
    // ==========================================
    window.generateCardHTML = function(cDef, isLocked = false, extraBottomHtml = '', isCarousel = false) {
        if (!cDef) return '';
        let typeClass = `tier-${cDef.level || 1}`;
        let typeIcon = cDef.type === 'buff' ? '🛡️' : '💥';
        let typeName = cDef.type === 'buff' ? 'buff' : 'sabotage';
        let safeCardName = cDef.n ? cDef.n.split(' (')[0] : '';
        let playCost = typeof window.getCardPlayCost === 'function' ? window.getCardPlayCost(cDef.id) : (cDef.level === 3 ? 6 : (cDef.level === 2 ? 4 : 2));
        let lockedStyle = isLocked ? 'opacity: 0.5; filter: grayscale(50%);' : '';
        
        let dimensions = isCarousel ? 'width: 100%; height: 100%; box-sizing: border-box; display:flex; flex-direction:column;' : 'width: 175px; height: 260px;';
        let titleSize = isCarousel ? 'font-size: 1.5rem;' : '';
        let descSize = isCarousel ? 'font-size: 1rem; flex: 1;' : '';
        
        return `
        <div class="physical-card ${typeClass}" style="${lockedStyle} ${dimensions} margin: 0 auto; box-shadow: 0 10px 20px rgba(0,0,0,0.4);">
            <div class="card-header ${typeName}">
                <span>${typeIcon} ${cDef.type === 'buff' ? 'HELPOTUS' : 'SABOTAASI'}</span><span>TASO ${cDef.level || 1}</span>
            </div>
            <div class="card-body ${typeName}" style="justify-content: flex-start; flex: 1; display:flex; flex-direction:column;">
                <div class="play-cost-badge">MAKSU: ${playCost} P</div>
                <h3 class="card-title" style="${titleSize}">${safeCardName}</h3>
                <p class="card-desc" style="${descSize}">${cDef.d}</p>
                ${extraBottomHtml}
            </div>
        </div>`;
    };

    window.renderShopOnBoard = function() {
        let wrapper = document.getElementById('board-shop-wrapper');
        if(!wrapper) return;
        let me = (window.allPlayers || []).find(p => p && p.name === window.myName);
        let myPoints = me ? (me.score || 0) : 0;
        let shopArray = window.activeHole && window.activeHole.shop ? window.activeHole.shop[window.myName] : [];
        let resArray = me && me.reservations ? (Array.isArray(me.reservations) ? me.reservations : Object.values(me.reservations)) : [];

        let shelvesHtml = '';
        let actRes = resArray.filter(Boolean);
        let levels = [3, 2, 1]; 

        levels.forEach(lvl => {
            // Hyllystä tehty korkeampi, jotta isot kortit mahtuvat
            shelvesHtml += `<div style="display:flex; justify-content:space-around; padding: 70px 0; border-bottom: 30px solid #0f172a; box-shadow: inset 0 -40px 60px rgba(0,0,0,0.95); position:relative; margin-bottom: 50px; background: linear-gradient(to bottom, #1e293b, #020617); border-radius: 12px;">`;
            let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
            
            for(let i=0; i<2; i++) {
                let item = shelfItems[i];
                if (item) {
                    const canAfford = myPoints >= item.price;
                    let isResFull = actRes.length >= 2;
                    let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                    let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                    
                    shelvesHtml += `
                        <div style="position:relative; width:40%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                            <div style="transform: scale(2.2); cursor:pointer; width:175px; margin-bottom: 200px; transform-origin: top center;" onclick="window.openCardDetail('${item.id}', 'shop')">
                                ${fullCardHtml}
                            </div>
                            <div style="background: repeating-linear-gradient(90deg, transparent, transparent 15px, #94a3b8 15px, #64748b 22px); height: 60px; width: 140%; position: absolute; bottom: 150px; filter: drop-shadow(0 30px 25px #000); z-index: 8; opacity: 0.9;"></div>
                            <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 15px 40px; border-radius: 12px; border: 6px solid #22c55e; font-weight: 900; font-size: 3rem; margin-top: 20px; z-index: 15; box-shadow: 0 0 35px rgba(34,197,94,0.6); text-align: center; margin-bottom: 20px;">${item.price} P</div>
                            <div style="display:flex; flex-direction:column; gap:15px; margin-top:15px; width:300px;">
                                <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:25px; font-size:2rem; font-weight:900; box-shadow: 0 8px 20px rgba(0,0,0,0.5);" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                                ${!isResFull ? `<button class="btn btn-primary" style="padding:20px; font-size:1.6rem; font-weight:900;" onclick="window.reserveShopItem('${item.id}')">VARAA KORTTI</button>` : ''}
                            </div>
                        </div>
                    `;
                } else {
                    shelvesHtml += `
                        <div style="position:relative; width:40%; display:flex; flex-direction:column; align-items:center; z-index:10;">
                            <div style="width:175px; height:260px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); border-radius:12px; border:5px dashed #333; transform: scale(2.2); margin-bottom: 200px; transform-origin: top center;">
                                <div style="color:#444; font-weight:900; font-size:2.5rem; letter-spacing:5px; transform:rotate(-45deg);">TYHJÄ</div>
                            </div>
                            <div style="background: repeating-linear-gradient(90deg, transparent, transparent 15px, #94a3b8 15px, #64748b 22px); height: 60px; width: 140%; position: absolute; bottom: 150px; filter: drop-shadow(0 30px 25px #000); z-index: 8; opacity: 0.9;"></div>
                            <div style="background: #000; color: #444; font-family: 'Courier Prime', monospace; padding: 15px 40px; border-radius: 12px; border: 6px solid #444; font-weight: 900; font-size: 3rem; margin-top: 20px; z-index: 15; text-align: center; margin-bottom: 20px;">---</div>
                        </div>
                    `;
                }
            }
            shelvesHtml += `</div>`;
        });

        let reserveHtml = '';
        if(actRes.length > 0) {
            reserveHtml += `<div style="margin-top:80px; border-top: 8px dashed #334155; padding-top: 60px;"><div style="display:flex; justify-content:space-around; width:100%; gap:30px;">`;
            actRes.forEach(rId => {
                let resItem = window.allCards.find(c => c.id === rId);
                if(!resItem) return;
                const canAfford = myPoints >= resItem.price;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:1rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
                
                reserveHtml += `
                    <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center; background: rgba(0,0,0,0.4); padding: 50px; border-radius: 25px; border: 5px solid #334155; box-shadow: inset 0 20px 40px #000;">
                        <div style="transform: scale(2.0); margin:0 auto; margin-bottom: 150px; cursor:pointer; width:175px; transform-origin: top center;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                            <div style="position:absolute; top:-25px; right:-25px; background:#eab308; color:#000; padding:12px 18px; font-weight:900; font-size: 1.4rem; border-radius:12px; z-index:30; box-shadow:0 8px 25px rgba(0,0,0,0.8); border: 4px solid #fff;">🔒 VARATTU</div>
                            ${fullCardHtml}
                        </div>
                        <div style="background: #000; color: #eab308; font-family: 'Courier Prime', monospace; padding: 15px 45px; border-radius: 12px; border: 6px solid #eab308; font-weight: 900; font-size: 3rem; margin-top: 30px; z-index: 15; text-align: center; box-shadow: 0 0 25px rgba(234,179,8,0.4);">${resItem.price} P</div>
                        <div style="display:flex; gap:20px; margin-top:30px; width:100%; justify-content: center;">
                            <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:22px 35px; font-size:1.8rem; font-weight:900;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                            <button class="btn btn-danger" style="padding:22px 35px; font-size:1.8rem; font-weight:900;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                        </div>
                    </div>
                `;
            });
            reserveHtml += `</div></div>`;
        }

        // TODELLA ISO AUTOMAATTI (1800px leveä!)
        wrapper.innerHTML = `
        <div style="position: relative; width: 1800px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%); border: 35px solid #000; border-bottom: 150px solid #050505; border-radius: 50px 50px 20px 20px; box-shadow: 100px 150px 180px rgba(0,0,0,0.95), inset 40px 40px 120px rgba(255,255,255,0.06), inset -40px -40px 120px rgba(0,0,0,0.9); padding: 80px 70px; display: flex; flex-direction: column; z-index:20;">
            <div style="position:absolute; top:0; left:0; right:0; height:10px; background:rgba(255,255,255,0.3); border-radius:40px 40px 0 0;"></div>
            <div style="position:absolute; top:0; bottom:0; left:0; width:10px; background:rgba(255,255,255,0.15); border-radius:40px 0 0 0;"></div>

            <div style="background: linear-gradient(to bottom, #000, #111); padding: 50px 80px; border-radius: 35px; border: 12px solid #222; border-bottom: 20px solid #000; display:flex; justify-content:space-between; align-items:center; margin-bottom: 100px; box-shadow: inset 0 0 80px rgba(239,68,68,0.25), 0 25px 50px rgba(0,0,0,0.6);">
                <div style="display:flex; align-items:center; gap: 40px;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 50px #22c55e, inset 0 0 15px #fff;"></div>
                    <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:6.5rem; text-shadow: 0 0 50px #ef4444, 0 0 25px #fff, 5px 5px 0px #000; letter-spacing: 10px;">FRIBAMART</div>
                </div>
                <div style="background: #000; padding: 25px 60px; border-radius: 20px; border: 6px inset #333;">
                    <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:5.5rem; font-weight:900; text-shadow: 0 0 45px rgba(34,197,94,0.9); letter-spacing: 5px;">${myPoints} P</div>
                </div>
            </div>

            <div style="background: #020617; border-radius: 30px; border: 25px solid #050505; box-shadow: inset 0 60px 150px #000, inset 0 0 60px rgba(56,189,248,0.2), 0 40px 60px rgba(0,0,0,0.7); position:relative; padding: 60px; overflow:hidden;">
                <div style="position:absolute; top:-30%; left:-30%; width:160%; height:160%; background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.08) 50%, transparent 55%); pointer-events:none; z-index:40; transform: rotate(15deg);"></div>
                <div style="position:absolute; top:0; right:0; bottom:0; width: 45px; background: linear-gradient(to left, rgba(0,0,0,0.9), transparent); z-index:35;"></div>
                <div style="position:absolute; top:0; left:0; bottom:0; width: 45px; background: linear-gradient(to right, rgba(0,0,0,0.9), transparent); z-index:35;"></div>
                ${shelvesHtml}
            </div>

            <div style="height: 500px; margin-top: 100px; display:flex; gap:100px; align-items:flex-start;">
                <div style="flex: 1; background: #050505; border-radius: 35px; border: 15px solid #111; box-shadow: inset 0 80px 120px #000, 0 30px 50px rgba(0,0,0,0.6); position:relative; height: 450px;">
                    <div style="position:absolute; top:0; left:0; right:0; height: 200px; background: linear-gradient(to bottom, #1a1a1a, #0a0a0a); border-bottom: 8px solid #000; transform-origin: top; transform: rotateX(-15deg); box-shadow: 0 35px 50px rgba(0,0,0,0.95); display:flex; justify-content:center; align-items:center;">
                        <span style="color:#222; font-weight:900; font-size:6rem; letter-spacing:30px; text-shadow: -4px -4px 0 #000, 4px 4px 0 rgba(255,255,255,0.05);">PUSH</span>
                    </div>
                </div>
                <div style="width: 380px; background: linear-gradient(135deg, #111, #0a0a0a); border-radius: 35px; border: 12px solid #000; padding: 60px; display:flex; flex-direction:column; align-items:center; box-shadow: inset 0 0 60px rgba(0,0,0,0.9), 0 35px 70px rgba(0,0,0,0.7);">
                    <div style="width: 35px; height: 130px; background: #000; border-radius: 18px; border: 8px solid #333; margin-bottom: 30px; box-shadow: inset 0 25px 40px #000, 0 5px 0 rgba(255,255,255,0.1);"></div>
                    <div style="width: 80px; height: 35px; background: #000; border-radius: 12px; border: 5px solid #222; margin-bottom: 80px;"></div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 25px; width:100%;">
                        ${Array(12).fill('<div style="background: linear-gradient(to bottom, #222, #111); height:60px; border-radius:15px; border-bottom:8px solid #000; box-shadow: 0 8px 15px rgba(0,0,0,0.7);"></div>').join('')}
                    </div>
                </div>
            </div>

            ${reserveHtml}
        </div>
        `;
    };

    // POISTETTU TÄYSIN kaikki liikuteltavat taustaseinät (#corkboard-surface sisältää vain itse laudan)
    window.renderBoard = function() {
        const board = document.getElementById('corkboard-surface');
        if (!board || !window.currentCourse) return;
        
        let totalHoles = window.currentCourse.pars.length; 
        let cols = Math.min(9, totalHoles); 
        let rows = Math.ceil(totalHoles / cols);
        let rightXPanel = window.getRightXPanel ? window.getRightXPanel() : 2000;
        let corkW = rightXPanel + 400;
        let corkH = Math.max((rows * 1010) + 200, 2500);
        
        // Pidetään DOM-laatta minimikokoisena grafiikkaprosessoria säästäen!
        let totalW = corkW + 2000; 
        let totalH = corkH + 2000; 
        
        board.style.width = `${totalW}px`;
        board.style.height = `${totalH}px`;
        board.style.background = 'transparent';
        
        let html = ``;
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
        
        let shopX = corkW + 250;
        let shopY = corkH + 150 - 2000; 
        html += `<div id="board-shop-wrapper" style="position:absolute; left:${shopX}px; top:${shopY}px; z-index:10; width:1800px;"></div>`;
        
        board.innerHTML = html;
        
        if(window.renderBinderOnBoard) window.renderBinderOnBoard();
        if(window.renderReceiptOnBoard) window.renderReceiptOnBoard();
        if(window.renderShopOnBoard) window.renderShopOnBoard();
    };

})();
