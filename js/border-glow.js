/* Border Glow — 鼠标靠近边缘发光 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var cards = document.querySelectorAll('.contact-card');
    cards.forEach(function(card) {
      card.addEventListener('pointermove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2, cy = rect.height / 2;
        var dx = x - cx, dy = y - cy;
        var kx = dx !== 0 ? cx / Math.abs(dx) : 999;
        var ky = dy !== 0 ? cy / Math.abs(dy) : 999;
        var edge = Math.min(1 / Math.min(kx, ky), 1);
        var rad = Math.atan2(dy, dx);
        var deg = rad * (180 / Math.PI) + 90;
        if (deg < 0) deg += 360;
        card.style.setProperty('--edge', edge.toFixed(3));
        card.style.setProperty('--angle', deg.toFixed(1) + 'deg');
        card.classList.add('glow');
      });
      card.addEventListener('pointerleave', function() {
        card.classList.remove('glow');
      });
    });
  });
})();
