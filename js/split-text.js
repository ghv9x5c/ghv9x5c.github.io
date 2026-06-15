/* ========================================
   Split Text — 字符级入场动画
   给 .split-text 元素逐字拆开，滚动触发
   ======================================== */
(function() {
  function splitChars(el) {
    if (el.getAttribute('data-split-done')) return;
    el.setAttribute('data-split-done', '1');

    var charIndex = 0;
    function processNode(node) {
      if (node.nodeType === 3) {
        // 文本节点 → 拆分为字符 span
        var text = node.textContent;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < text.length; i++) {
          var span = document.createElement('span');
          span.className = 'char';
          span.style.setProperty('--i', charIndex);
          span.textContent = text[i] === ' ' ? ' ' : text[i];
          frag.appendChild(span);
          charIndex++;
        }
        if (node.parentNode) node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        // 元素节点 → 递归处理子节点
        var children = Array.prototype.slice.call(node.childNodes);
        for (var j = 0; j < children.length; j++) {
          processNode(children[j]);
        }
      }
    }
    processNode(el);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
