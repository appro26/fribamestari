// Kääritään koodi suojakuoreen (IIFE)
(function() {
    
    // ==========================================
    // 1. TYYLIT JA TILE TEARING -ESTO
    // ==========================================
    let styleFix = document.getElementById('patch-styles');
    if(!styleFix) {
        styleFix = document.createElement('style');
        styleFix.id = 'patch-styles';
        document.head.appendChild(styleFix);
    }
    styleFix.innerHTML = `
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #cbd5e1; overflow: hidden; touch-action: none; overscroll-behavior: none; }
        #corkboard-viewport { width: 100vw; height: 100vh; position: absolute; top:0; left:0; z-index: 5; touch-action: none; }
        
        /* MUUTOS: Poistettu will-change ja backface-visibility. Pakotetaan selain renderöimään normaalisti ilman GPU-laattoja! */
        #corkboard-surface { transform-origin: 0 0; width: 0px; height: 0px; overflow: visible; }
        
        .is-dragging * { pointer-events: none !important; }
        #cardDetailModal { padding-bottom: 120px !important; justify-content: flex-start !important; padding-top: 5vh !important; }
        .fixed-close-btn { bottom: 20px !important; width: 90% !important; max-width: 400px !important; border-radius: 16px !important; padding: 18px !important; font-size: 1.3rem !important; box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important; }
    `;

    // LUODAAN PAIKALLAAN PYSYVÄ HUONE
    let roomBg = document.getElementById('fixed-room-bg');
    if(!roomBg) {
        roomBg = document.createElement('div');
        roomBg.id = 'fixed-room-bg';
        document.body.insertBefore(roomBg, document.body.firstChild);
    }
    roomBg.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; background: linear-gradient(to bottom, #cbd5e1 55%, #334155 55%, #1e293b 100%); pointer-events:none;";

    // ==========================================
    // 2. KAMERAN MOOTTORI (Käytetään 2D-transformia repeilyn estämiseksi)
    // ==========================================
    window.camCurrent = window.camCurrent || { x: 0, y: 0, scale: 1 };
    window.camTarget = window.camTarget || { x: 0, y: 0, scale: 1 };

    window.applyBounds = function(customTarget) {
        let target = customTarget || window.camTarget; 
        let rightXPanel = window.getRightXPanel ? window.getRightXPanel() : 2000;
        let corkW = rightXPanel + 400;
        let boardW = corkW + 1500; 
        
        // Koska vaihdoimme sarakkeiden määrän viiteen (Math.min(5)), korkeutta tarvitaan enemmän
        let totalHoles = window.currentCourse ? window.currentCourse.pars.length : 18; 
        let cols = Math.min(5, totalHoles); 
        let rows = Math.ceil(totalHoles / cols);
        let boardH = Math.max((rows * 1010) + 200, 3000) + 1500; 
        
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

    // Apufunktio joka käyttää TRANSLATE eikä TRANSLATE3D (Tämä korjaa GPU-bugin)
    function applyTransformToBoard() {
        let boardEl = document.getElementById('corkboard-surface');
        if(boardEl) {
            boardEl.style.transform = `translate(${window.camCurrent.x}px, ${window.camCurrent.y}px) scale(${window.camCurrent.scale})`;
        }
    }

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
            
            velX *= 0.90; 
            velY *= 0.90;
            
            window.applyBounds(window.camTarget);
            window.camCurrent.x = window.camTarget.x;
            window.camCurrent.y = window.camTarget.y;
            
            applyTransformToBoard();
            
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
            applyTransformToBoard();
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
            
            applyTransformToBoard();
            if(p < 1) window.animFrame = requestAnimationFrame(step);
        }
        window.animFrame = requestAnimationFrame(step);
    };

    // ZOOMAA KESKELLE UUTTA KAUPPAA (Täyttää puhelimen ruudun)
    window.zoomToShop = function() { 
        let wrapper = document.getElementById('board-shop-wrapper');
        let shopPhysicalWidth = 650; 
        // Skaala lasketaan niin, että kauppa mahtuu juuri ja juuri näytölle reunoineen
        let tScale = window.innerWidth / (shopPhysicalWidth + 20); 
        
        let tY = 50; let tX = 50;
        if(wrapper) {
            let wX = parseInt(wrapper.style.left) || 0;
            let wY = parseInt(wrapper.style.top) || 0;
            tX = (window.innerWidth - shopPhysicalWidth * tScale) / 2 - wX * tScale; 
            tY = 30 - wY * tScale; 
        }
        window.animateCameraTo(tX, tY, tScale);
    };

    // ==========================================
    // 3. KORTTIEN JA KAUPAN RENDERÖINTI
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
        <div class="physical-card ${typeClass}" style="${lockedStyle} ${dimensions} margin: 0 auto; box-shadow: 0 8px 16px rgba(0,0,0,0.4);">
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
            // Tehdään hyllyvälistä korkea jotta jättikortit mahtuvat pystysuunnassa
            shelvesHtml += `<div style="display:flex; justify-content:space-around; padding: 45px 0; border-bottom: 12px solid #020617; background: #1e293b; border-radius: 6px; margin-bottom: 30px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">`;
            let shelfItems = (shopArray || []).filter(c => c === null || c.level === lvl);
            
            for(let i=0; i<2; i++) {
                let item = shelfItems[i];
                if (item) {
                    const canAfford = myPoints >= item.price;
                    let isResFull = actRes.length >= 2;
                    let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                    let fullCardHtml = window.generateCardHTML(item, false, extraHtml, false);
                    
                    shelvesHtml += `
                        <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center;">
                            <div style="transform: scale(1.7); cursor:pointer; width:175px; margin-bottom: 110px; transform-origin: top center;" onclick="window.openCardDetail('${item.id}', 'shop')">
                                ${fullCardHtml}
                            </div>
                            <div style="background: #000; color: #22c55e; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 6px; border: 4px solid #22c55e; font-weight: 900; font-size: 2rem; margin-top: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); text-align: center; margin-bottom: 15px;">${item.price} P</div>
                            <div style="display:flex; flex-direction:column; gap:10px; width:90%;">
                                <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:15px; font-size:1.3rem; font-weight:900;" onclick="window.buyShopItem('${item.id}', ${item.price}, false)">OSTA</button>
                                ${!isResFull ? `<button class="btn btn-primary" style="padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.reserveShopItem('${item.id}')">VARAA</button>` : ''}
                            </div>
                        </div>
                    `;
                } else {
                    shelvesHtml += `
                        <div style="position:relative; width:45%; display:flex; flex-direction:column; align-items:center;">
                            <div style="width:175px; height:260px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:8px; border:4px dashed #333; transform: scale(1.7); margin-bottom: 110px; transform-origin: top center;">
                                <div style="color:#666; font-weight:900; font-size:2rem; letter-spacing:4px; transform:rotate(-45deg);">TYHJÄ</div>
                            </div>
                            <div style="background: #000; color: #555; font-family: 'Courier Prime', monospace; padding: 10px 25px; border-radius: 6px; border: 4px solid #444; font-weight: 900; font-size: 2rem; margin-top: 10px; text-align: center; margin-bottom: 15px;">---</div>
                        </div>
                    `;
                }
            }
            shelvesHtml += `</div>`;
        });

        let reserveHtml = '';
        if(actRes.length > 0) {
            reserveHtml += `<div style="margin-top:40px; border-top: 6px dashed #475569; padding-top: 40px;"><div style="display:flex; justify-content:space-around; width:100%; gap:20px;">`;
            actRes.forEach(rId => {
                let resItem = window.allCards.find(c => c.id === rId);
                if(!resItem) return;
                const canAfford = myPoints >= resItem.price;
                let extraHtml = `<div style="text-align:center; font-weight:900; font-size:0.85rem; color:#111; margin-top:auto; padding-top:10px;">🔄 TARKASTELE</div>`;
                let fullCardHtml = window.generateCardHTML(resItem, false, extraHtml, false);
                
                reserveHtml += `
                    <div style="width:45%; display:flex; flex-direction:column; align-items:center; background: rgba(0,0,0,0.3); padding: 30px 15px; border-radius: 12px; border: 3px solid #334155;">
                        <div style="transform: scale(1.5); margin-bottom: 90px; cursor:pointer; width:175px; transform-origin: top center; position:relative;" onclick="window.openCardDetail('${resItem.id}', 'shop_res')">
                            <div style="position:absolute; top:-20px; right:-20px; background:#eab308; color:#000; padding:8px 12px; font-weight:900; font-size: 1.1rem; border-radius:8px; z-index:30; border: 3px solid #fff;">🔒 VARATTU</div>
                            ${fullCardHtml}
                        </div>
                        <div style="background: #000; color: #eab308; font-family: 'Courier Prime', monospace; padding: 10px 20px; border-radius: 6px; border: 4px solid #eab308; font-weight: 900; font-size: 2rem; margin-top: 10px; text-align: center; margin-bottom:15px;">${resItem.price} P</div>
                        <div style="display:flex; flex-direction:column; gap:10px; width:90%;">
                            <button class="btn btn-success" ${!canAfford?'disabled':''} style="padding:15px; font-size:1.3rem; font-weight:900;" onclick="window.buyShopItem('${resItem.id}', ${resItem.price}, true)">LUNASTA</button>
                            <button class="btn btn-danger" style="padding:12px; font-size:1.1rem; font-weight:900;" onclick="window.cancelReservation('${resItem.id}')">PERU</button>
                        </div>
                    </div>
                `;
            });
            reserveHtml += `</div></div>`;
        }

        // Tihkeä mutta selkeä 650px leveä kauppa
        wrapper.innerHTML = `
        <div style="position: relative; width: 650px; background: #0f172a; border: 15px solid #000; border-bottom: 60px solid #050505; border-radius: 20px; padding: 40px 30px; box-shadow: 20px 30px 50px rgba(0,0,0,0.6); display: flex; flex-direction: column; z-index:20;">
            <div style="background: #000; padding: 25px 30px; border-radius: 12px; border: 6px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom: 40px;">
                <div style="display:flex; align-items:center; gap: 20px;">
                    <div style="width: 25px; height: 25px; border-radius: 50%; background: #22c55e;"></div>
                    <div style="color:#ef4444; font-family:'Courier Prime', monospace; font-weight:900; font-size:3rem; letter-spacing: 4px;">FRIBAMART</div>
                </div>
                <div style="background: #111; padding: 15px 25px; border-radius: 10px; border: 3px solid #333;">
                    <div style="color:#22c55e; font-family:'Courier Prime', monospace; font-size:2.5rem; font-weight:900;">${myPoints} P</div>
                </div>
            </div>

            <div style="background: #020617; border-radius: 12px; border: 12px solid #050505; padding: 30px;">
                ${shelvesHtml}
            </div>

            <div style="height: 250px; margin-top: 50px; display:flex; gap:40px; align-items:flex-start;">
                <div style="flex: 1; background: #050505; border-radius: 12px; border: 8px solid #111; position:relative; height: 200px;">
                    <div style="position:absolute; top:0; left:0; right:0; height: 80px; background: #1a1a1a; border-bottom: 4px solid #000; display:flex; justify-content:center; align-items:center;">
                        <span style="color:#333; font-weight:900; font-size:2.5rem; letter-spacing:15px;">PUSH</span>
                    </div>
                </div>
                <div style="width: 180px; background: #111; border-radius: 12px; border: 6px solid #000; padding: 30px; display:flex; flex-direction:column; align-items:center;">
                    <div style="width: 20px; height: 60px; background: #000; border-radius: 10px; border: 4px solid #333; margin-bottom: 40px;"></div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 15px; width:100%;">
                        ${Array(9).fill('<div style="background: #222; height:30px; border-radius:6px; border-bottom:4px solid #000;"></div>').join('')}
                    </div>
                </div>
            </div>

            ${reserveHtml}
        </div>
        `;
    };

    window.renderBoard = function() {
        const board = document.getElementById('corkboard-surface');
        if (!board || !window.currentCourse) return;
        
        let totalHoles = window.currentCourse.pars.length; 
        
        // KAVENNETTU LAUTA! (Kutistetaan max leveys 5 sarakkeeseen, jotta lauta menee pystysuuntaan eikä leveyteen)
        // Tämä on se vihoviimeinen jippo jolla vältetään GPU-rajan ylittyminen!
        let cols = Math.min(5, totalHoles); 
        let rows = Math.ceil(totalHoles / cols);
        
        let holesWidth = (cols * 380) + ((cols - 1) * 80);
        let startXHolesVal = window.startXHoles || 1000;
        let corkW = startXHolesVal + holesWidth + 300; 
        let corkH = Math.max((rows * 1010) + 200, 2500);
        
        // Nollataan liikuteltavan elementin koko, niin selain ei tee siitä jättimäistä laattaa
        board.style.width = `0px`;
        board.style.height = `0px`;
        board.style.overflow = 'visible';
        
        let html = ``;
        html += `<div style="position:absolute; left:50px; top:50px; width:${corkW}px; height:${corkH}px; background-color: #e2e8f0; background-image: radial-gradient(rgba(0,0,0,0.08) 2px, transparent 2px); background-size: 12px 12px; border: 35px solid #5c4033; border-top-color: #7b4e35; border-left-color: #7b4e35; border-bottom-color: #3e2723; border-right-color: #3e2723; border-radius: 12px; z-index:1; box-shadow: 15px 25px 50px rgba(0,0,0,0.7);"></div>`;
        html += `<div id="board-binder-wrapper" style="position:absolute; left:80px; top:120px; z-index:10; width:500px;"></div>`;
        html += `<div id="board-receipt-wrapper" style="position:absolute; left:100px; top:1200px; z-index:10; width:450px;"></div>`;
        
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
        
        let shopX = corkW + 150;
        let shopY = corkH + 150 - 1000; 
        html += `<div id="board-shop-wrapper" style="position:absolute; left:${shopX}px; top:${shopY}px; z-index:10; width:650px;"></div>`;
        
        board.innerHTML = html;
        
        if(window.renderBinderOnBoard) window.renderBinderOnBoard();
        if(window.renderReceiptOnBoard) window.renderReceiptOnBoard();
        if(window.renderShopOnBoard) window.renderShopOnBoard();
    };

    // Asetetaan GetRightXPanel hyödyntämään uutta viiden sarakkeen kapeaa leveyttä
    window.getRightXPanel = function() {
        if(!window.currentCourse || !window.currentCourse.pars) return 2000;
        let totalHoles = window.currentCourse.pars.length; 
        let cols = Math.min(5, totalHoles);
        let startX = window.startXHoles || 1000;
        return startX + (cols * 380) + ((cols - 1) * 80) + 150;
    };

})();
