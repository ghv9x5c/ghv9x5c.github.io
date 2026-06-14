/* ========================================
   Horizontal Gallery — 横向拖动海报画廊
   ======================================== */
(function() {
  function initPosterCarousel(containerId, files, thumbPath, fullPath) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.style.cssText = 'overflow-x:auto;overflow-y:hidden;white-space:nowrap;cursor:grab;padding:20px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none;';
    container.classList.add('poster-carousel');

    var isDown = false, startX = 0, scrollLeft = 0, moved = false;

    files.forEach(function(f) {
      var card = document.createElement('div');
      card.style.cssText = 'display:inline-block;height:420px;margin-right:32px;border-radius:4px;overflow:hidden;cursor:pointer;background:transparent;flex-shrink:0;transition:transform 0.3s;';
      card.dataset.fullSrc = fullPath + f;

      var img = document.createElement('img');
      img.src = thumbPath + f;
      img.style.cssText = 'width:auto;height:100%;display:block;pointer-events:none;';
      img.loading = 'lazy';
      img.draggable = false;
      card.appendChild(img);

      card.addEventListener('mouseenter', function() { if (!isDown) this.style.transform = 'scale(1.03)'; });
      card.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; });
      card.addEventListener('click', function() {
        if (!moved && typeof openLightbox === 'function') {
          openLightbox(this.dataset.fullSrc);
        }
      });

      container.appendChild(card);
    });

    container.addEventListener('mousedown', function(e) {
      isDown = true; moved = false;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';
    });
    container.addEventListener('mouseleave', function() {
      isDown = false; container.style.cursor = 'grab';
    });
    container.addEventListener('mouseup', function() {
      isDown = false; container.style.cursor = 'grab';
    });
    container.addEventListener('mousemove', function(e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - container.offsetLeft;
      var walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) moved = true;
      container.scrollLeft = scrollLeft - walk;
    });

    // Touch support
    container.addEventListener('touchstart', function(e) {
      isDown = true; moved = false;
      startX = e.touches[0].pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });
    container.addEventListener('touchend', function() { isDown = false; });
    container.addEventListener('touchmove', function(e) {
      if (!isDown) return;
      var x = e.touches[0].pageX - container.offsetLeft;
      var walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) moved = true;
      container.scrollLeft = scrollLeft - walk;
    });
  }

  window.initPosterCarousel = initPosterCarousel;
})();
