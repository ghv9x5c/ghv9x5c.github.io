/* ========================================
   Hero Particles — 3D 浮动粒子背景
   Canvas 2D，鼠标跟随
   ======================================== */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var hero = document.getElementById('hero');
    if (!hero) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'hero-particles';
    canvas.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;';
    // Insert after hero-bg if exists, or as first child
    var bg = hero.querySelector('.hero-bg');
    if (bg) {
      bg.after(canvas);
    } else {
      hero.insertBefore(canvas, hero.firstChild);
    }

    var ctx = canvas.getContext('2d');
    var COUNT = 200;
    var particles = [];
    var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    var time = 0;

    // Init particles in 3D sphere
    for (var i = 0; i < COUNT; i++) {
      var x, y, z, len;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x*x + y*y + z*z;
      } while (len > 1);
      var r = Math.cbrt(Math.random());
      particles.push({
        x: x * r, y: y * r, z: z * r,
        ox: x * r, oy: y * r, oz: z * r,
        rx: Math.random(), ry: Math.random(), rz: Math.random(), rw: Math.random(),
        size: 0.5 + Math.random() * 2
      });
    }

    function resize() {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = hero.clientWidth, h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    hero.addEventListener('pointermove', function(e) {
      var rect = hero.getBoundingClientRect();
      mouse.tx = (e.clientX - rect.left) / rect.width;
      mouse.ty = (e.clientY - rect.top) / rect.height;
    });

    hero.addEventListener('pointerleave', function() {
      mouse.tx = 0.5; mouse.ty = 0.5;
    });

    function draw() {
      requestAnimationFrame(draw);
      time += 0.005;
      var w = hero.clientWidth, h = hero.clientHeight;

      // Smooth mouse follow
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.clearRect(0, 0, w, h);

      var focal = 3;
      var spread = 8;
      var cx = w / 2, cy = h / 2;
      var hoverShift = { x: (mouse.x - 0.5) * 1.5, y: (mouse.y - 0.5) * 1.5 };

      // Slow rotation
      var rotY = time * 0.3;
      var rotX = Math.sin(time * 0.2) * 0.15;
      var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      var cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      var projected = [];

      for (var i = 0; i < COUNT; i++) {
        var p = particles[i];

        // Rotate around Y
        var rx = p.x * cosY - p.z * sinY;
        var rz = p.x * sinY + p.z * cosY;
        // Rotate around X
        var ry = p.y * cosX - rz * sinX;
        rz = p.y * sinX + rz * cosX;

        var scale = focal / (focal + rz + 2);
        var sx = cx + rx * spread * scale * w / 8 + hoverShift.x * w * 0.3;
        var sy = cy + ry * spread * scale * h / 8 + hoverShift.y * h * 0.3;
        var sz = scale * p.size * 2.5;
        var alpha = Math.max(0.1, scale * 0.7);

        projected.push({ sx: sx, sy: sy, sz: sz, alpha: alpha, z: rz });
      }

      // Draw connections
      ctx.lineWidth = 0.5;
      for (var i = 0; i < projected.length; i++) {
        for (var j = i + 1; j < projected.length; j++) {
          var a = projected[i], b = projected[j];
          var dx = a.sx - b.sx, dy = a.sy - b.sy;
          var dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 60 && a.z > -1.5 && b.z > -1.5) {
            var lineAlpha = (1 - dist/60) * 0.08;
            ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      for (var k = 0; k < projected.length; k++) {
        var pt = projected[k];
        if (pt.z < -1.2) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + pt.alpha.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, Math.max(0.3, pt.sz), 0, Math.PI*2);
        ctx.fill();
      }
    }

    draw();
  });
})();
