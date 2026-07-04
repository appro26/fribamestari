// ==============================================
// NÄKYMÄNVAIHTAJA JA NAVIGAATIO (camera.js)
// ==============================================

// Pääfunktio, joka hoitaa välilehtien vaihdot sulavasti
window.switchView = function(viewId) {
    // 1. Piilotetaan kaikki näkymät
    document.querySelectorAll('.app-view').forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    
    // 2. Näytetään valittu näkymä
    let target = document.getElementById(viewId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // 3. Päivitetään alavalikon nappien aktiivinen tila (visuaalinen korostus)
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Yhdistetään näkymä oikeaan nappiin (0=Tulokset, 1=Laskelma, 2=Kortit, 3=Kauppa, 4=Väylä)
    let navMap = {
        'view-results': 0,
        'view-calculator': 1,
        'view-cards': 2,
        'view-shop': 3,
        'view-hole': 4
    };
    let index = navMap[viewId];
    let navItems = document.querySelectorAll('.nav-item');
    if(index !== undefined && navItems[index]) {
        navItems[index].classList.add('active');
    }

    // 4. Varmistetaan, että valittu näkymä on päivitetty ja vieritetään se alkuun
    if(viewId === 'view-results') { if(window.renderReceiptOnBoard) window.renderReceiptOnBoard(); }
    if(viewId === 'view-cards') { if(window.renderBinderOnBoard) window.renderBinderOnBoard(); }
    if(viewId === 'view-shop') { if(window.renderShopOnBoard) window.renderShopOnBoard(); }
    if(viewId === 'view-hole') { if(window.renderBoard) window.renderBoard(); }
    
    if(target) target.scrollTop = 0;
};

// ==============================================
// VANHOJEN ZOOM-KOMENTOJEN OHITUS
// ==============================================
// Pelin logiikka kutsuu näitä. Nyt ne vain avaavat oikean välilehden!

window.zoomToHole = function(hIndex) { window.switchView('view-hole'); };
window.zoomToCurrentHole = function() { window.switchView('view-hole'); };
window.zoomToPreviousHole = function() { window.switchView('view-hole'); };
window.zoomToBinder = function() { window.switchView('view-cards'); };
window.zoomToReceipt = function() { window.switchView('view-results'); };
window.zoomToShop = function() { window.switchView('view-shop'); };

// Tyhjennetään vanhat kameramuuttujat, jotta peli ei anna undefined-virheitä
window.camCurrent = { x: 0, y: 0, scale: 1 };
window.camTarget = { x: 0, y: 0, scale: 1 };
window.applyBounds = function() {};
window.animateCameraTo = function() {};
