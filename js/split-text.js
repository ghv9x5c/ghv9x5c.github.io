/* ========================================
   Split Text — 字符级入场动画
   给 .split-text 元素逐字拆开，滚动触发
   ======================================== */
(function() {
  function splitChars(el) {
    if (el.getAttribute('data-split-done')) return;
    el.setAttribute('data-split-done', '1');

    var text = el.textContent;
    el.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--i', i);
      span.textContent = text[i] === ' ' ? ' ' : text[i];
      el.appendChild(span);
    }
  }

  function revealWhenVisible(el, delay) {
    delay = delay || 0;
    var done = false;
    function tryReveal() {
      if (done) return;
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
        done = true;
        setTimeout(function() { el.classList.add('revealed'); }, delay);
      }
    }

    // IntersectionObserver
    if (window.IntersectionObserver) {
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { if (e.isIntersecting) { obs.unobserve(el); tryReveal(); } });
      }, { threshold: 0.2 });
      obs.observe(el);
    }

    // Fallback: check after short delay
    setTimeout(tryReveal, 300);
    window.addEventListener('scroll', tryReveal, { passive: true, once: false });
  }

  function init() {
    var els = document.querySelectorAll('.split-text');
    for (var i = 0; i < els.length; i++) {
      splitChars(els[i]);
      revealWhenVisible(els[i], i * 80);
    }
  }

  // --- Shiny Text 鼠标跟随 ---
  function setupShiny() {
    var el = document.querySelector('.shiny-text');
    if (!el) return;
    el.addEventListener('mousemove', function(e) {
      var rect = el.getBoundingClientRect();
      var pct = ((e.clientX - rect.left) / rect.width) * 100;
      var chars = el.querySelectorAll('.char');
      for (var i = 0; i < chars.length; i++) {
        chars[i].style.backgroundPosition = pct + '% center';
      }
    });
    el.addEventListener('mouseleave', function() {
      var chars = el.querySelectorAll('.char');
      for (var i = 0; i < chars.length; i++) {
        chars[i].style.backgroundPosition = '150% center';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(); setupShiny(); });
  } else {
    init();
    setupShiny();
  }
})();
