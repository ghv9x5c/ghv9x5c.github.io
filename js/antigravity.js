/* ========================================
   Antigravity Particles — 反重力粒子效果
   鼠标磁场 + 波浪 + 胶囊粒子 + 深度视差
   ======================================== */
(function() {

  function Antigravity(canvas, container, options) {
    var opts = options || {};
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext('2d');

    // 参数
    this.count = opts.count || 300;
    this.magnetRadius = opts.magnetRadius || 10;
    this.ringRadius = opts.ringRadius || 10;
    this.waveSpeed = opts.waveSpeed || 0.4;
    this.waveAmplitude = opts.waveAmplitude || 1;
    this.particleSize = opts.particleSize || 2;
    this.lerpSpeed = opts.lerpSpeed || 0.1;
    this.color = opts.color || '#FF9FFC';
    this.autoAnimate = opts.autoAnimate !== undefined ? opts.autoAnimate : false;
    this.particleVariance = opts.particleVariance || 1;
    this.rotationSpeed = opts.rotationSpeed || 0;
    this.depthFactor = opts.depthFactor || 1;
    this.pulseSpeed = opts.pulseSpeed || 3;
    this.particleShape = opts.particleShape || 'capsule';
    this.fieldStrength = opts.fieldStrength || 10;

    // 状态
    this.mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    this.particles = [];
    this.time = 0;

    this._init();
  }

  Antigravity.prototype._init = function() {
    var self = this;
    this.resize();

    // 鼠标追踪 — 监听 hero 容器，确保整个 hero 区域都能触发
    var target = this.container;
    target.addEventListener('mousemove', function(e) {
      var rect = target.getBoundingClientRect();
      self.mouse.tx = e.clientX - rect.left;
      self.mouse.ty = e.clientY - rect.top;
    });
    target.addEventListener('mouseleave', function() {
      self.mouse.tx = -9999;
      self.mouse.ty = -9999;
    });
    // 触摸支持
    target.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var rect = target.getBoundingClientRect();
      self.mouse.tx = e.touches[0].clientX - rect.left;
      self.mouse.ty = e.touches[0].clientY - rect.top;
    }, { passive: false });
    target.addEventListener('touchend', function() {
      self.mouse.tx = -9999;
      self.mouse.ty = -9999;
    });

    // 生成粒子
    this._createParticles();
  };

  Antigravity.prototype._createParticles = function() {
    this.particles = [];
    var w = this.canvas.width;
    var h = this.canvas.height;
    for (var i = 0; i < this.count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        // 深度层：0=近(大/亮/快), 1=远(小/暗/慢)
        depth: Math.random(),
        // 初始速度（反重力：向上漂浮）
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.5 + 0.1),
        // 个体偏移
        phase: Math.random() * Math.PI * 2,
        pulseOffset: Math.random() * Math.PI * 2,
        // 粒子长度变化
        length: 0.5 + Math.random() * this.particleVariance,
        // 角度
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.02
      });
    }
  };

  Antigravity.prototype.resize = function() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    // 用容器尺寸确保覆盖全屏 hero
    var rect = this.container.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    if (w === 0 || h === 0) {
      w = this.canvas.clientWidth || window.innerWidth;
      h = this.canvas.clientHeight || window.innerHeight;
    }
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  };

  Antigravity.prototype._hexToRgb = function(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    return {
      r: parseInt(c.substring(0,2), 16),
      g: parseInt(c.substring(2,4), 16),
      b: parseInt(c.substring(4,6), 16)
    };
  };

  Antigravity.prototype.render = function(deltaTime) {
    var ctx = this.ctx;
    var w = this.w, h = this.h;
    // 尺寸未初始化时跳过
    if (!w || !h) return;

    var mouse = this.mouse;
    var self = this;

    // 平滑鼠标位置
    mouse.x += (mouse.tx - mouse.x) * this.lerpSpeed * 3;
    mouse.y += (mouse.ty - mouse.y) * this.lerpSpeed * 3;

    this.time += deltaTime * 0.001 * this.waveSpeed;

    ctx.clearRect(0, 0, w, h);

    var rgb = this._hexToRgb(this.color);
    var activeRadius = this.magnetRadius * 40;  // 鼠标影响范围
    var ringR = this.ringRadius * 25;

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];

      // 基础运动：反重力（向上漂浮）
      p.x += p.vx;
      p.y += p.vy;

      // 波浪运动
      p.x += Math.sin(this.time * 2 + p.phase) * this.waveAmplitude * 0.3;
      p.y += Math.cos(this.time * 1.7 + p.phase + p.depth) * this.waveAmplitude * 0.25;

      // 粒子自旋
      p.angle += p.angularVelocity * (1 - p.depth * 0.5);

      // === 鼠标磁场效应 ===
      var dx = p.x - mouse.x;
      var dy = p.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < activeRadius && mouse.x > 0) {
        var force = (1 - dist / activeRadius);
        force = force * force * this.fieldStrength * (1 - p.depth * 0.5);

        // 排斥力（反重力：推开）
        if (dist > 0.01) {
          var nx = dx / dist;
          var ny = dy / dist;

          // 环形区域效果：在 ringR 距离处吸引力最强
          var ringForce = 0;
          var ringDist = Math.abs(dist - ringR);
          if (ringDist < ringR * 0.8) {
            ringForce = (1 - ringDist / (ringR * 0.8));
            ringForce = ringForce * ringForce * force * 0.5;
            // 切向力（环形旋转）
            p.vx += -ny * ringForce * 0.1;
            p.vy += nx * ringForce * 0.1;
          }

          // 径向排斥
          p.vx += nx * force * 0.15;
          p.vy += ny * force * 0.15;
        }
      }

      // 阻尼
      p.vx *= 0.995;
      p.vy *= 0.995;

      // 边界重置：从底部重生
      if (p.y < -20 || p.x < -20 || p.x > w + 20 || p.y > h + 20) {
        p.y = h + 20;
        p.x = Math.random() * w;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = -(Math.random() * 0.5 + 0.1);
      }

      // === 绘制粒子 ===
      var depthScale = 0.4 + (1 - p.depth) * this.depthFactor * 0.6;
      var alpha = 0.3 + (1 - p.depth) * 0.6;
      var size = this.particleSize * depthScale * p.length;

      // 脉冲
      var pulse = 1 + Math.sin(this.time * this.pulseSpeed + p.pulseOffset) * 0.3;
      size *= pulse;
      alpha *= 0.7 + pulse * 0.3;

      // 接近鼠标时变亮
      if (dist < activeRadius && mouse.x > 0) {
        var glow = (1 - dist / activeRadius);
        alpha = Math.min(1, alpha + glow * 0.5);
        size *= 1 + glow * 0.5;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = alpha;

      if (this.particleShape === 'capsule') {
        // 胶囊形粒子
        var halfLen = size * 3;
        var grad = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
        grad.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        grad.addColorStop(0.3, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
        grad.addColorStop(0.5, 'rgba(' + Math.min(255,rgb.r+60) + ',' + Math.min(255,rgb.g+60) + ',' + Math.min(255,rgb.b+60) + ',' + alpha + ')');
        grad.addColorStop(0.7, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        var r = size / 2;
        if (ctx.roundRect) {
          ctx.roundRect(-halfLen, -r, halfLen * 2, size, r);
        } else {
          // fallback: manual rounded rect
          ctx.moveTo(-halfLen + r, -r);
          ctx.lineTo(halfLen - r, -r);
          ctx.arcTo(halfLen, -r, halfLen, 0, r);
          ctx.arcTo(halfLen, r, halfLen - r, r, r);
          ctx.lineTo(-halfLen + r, r);
          ctx.arcTo(-halfLen, r, -halfLen, 0, r);
          ctx.arcTo(-halfLen, -r, -halfLen + r, -r, r);
          ctx.closePath();
        }
        ctx.fill();
      } else {
        // 圆形粒子（兜底）
        var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        grad.addColorStop(0, 'rgba(' + Math.min(255,rgb.r+80) + ',' + Math.min(255,rgb.g+80) + ',' + Math.min(255,rgb.b+80) + ',' + alpha + ')');
        grad.addColorStop(0.4, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  // ========== PUBLIC ==========
  window.initAntigravity = function(containerSelector, options) {
    var container = document.querySelector(containerSelector);
    if (!container) return null;

    var canvas = document.createElement('canvas');
    canvas.className = 'antigravity-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:auto;';
    container.style.position = 'relative';
    container.insertBefore(canvas, container.firstChild);

    var ag = new Antigravity(canvas, container, options);

    // 延迟 resize 确保布局完成
    setTimeout(function() { ag.resize(); ag._createParticles(); }, 100);

    // 渲染循环
    var lastTime = performance.now();
    function loop(time) {
      var delta = Math.min(50, time - lastTime);
      lastTime = time;
      ag.render(delta);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // 暴露 resize
    window.addEventListener('resize', function() { ag.resize(); ag._createParticles(); });

    return ag;
  };
})();
