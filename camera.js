// ==============================================
// KAMERAN OHITUS (SPA NÄKYMÄNVAIHTAJA) (camera.js)
// ==============================================
// Koska peli toimii nyt välilehdillä, vanhat zoom-komennot vain vaihtavat näkymää.

window.zoomToHole = function(hIndex) { window.switchView('view-hole'); };
window.zoomToCurrentHole = function() { window.switchView('view-hole'); };
window.zoomToPreviousHole = function() { window.switchView('view-hole'); };
window.zoomToBinder = function() { window.switchView('view-cards'); };
window.zoomToReceipt = function() { window.switchView('view-results'); };
window.zoomToShop = function() { window.switchView('view-shop'); };
