/* ========================================
   GridScan — 网格扫描背景
   平面网格 + 多道扫描光束 + 纯动画
   ======================================== */
(function() {

  function GridScan(canvas, container, options) {
    var opts = options || {};
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext('2d');

    this.lineThickness = opts.lineThickness ?? 1;
    this.linesColor = opts.linesColor || '#2F293A';
    this.scanColor = opts.scanColor || '#06B6D4';
    this.scanOpacity = opts.scanOpacity ?? 0.4;
    this.gridScale = opts.gridScale ?? 0.1;
    this.lineJitter = opts.lineJitter ?? 0.1;
    this.scanDirection = opts.scanDirection || 'pingpong';
    this.noiseIntensity = opts.noiseIntensity ?? 0.015;
    this.scanGlow = opts.scanGlow ?? 0.3;
    this.scanSoftness = opts.scanSoftness ?? 1.5;
    this.scanDuration = opts.scanDuration ?? 3;
    this.scanDelay = opts.scanDelay ?? 2;

    this.time = 0;
    this.scans = []; // 多道扫描线

    this._init();
  }

  GridScan.prototype._init = function() {
    var self = this;
    this.resize();
    this._spawnScans();
    window.addEventListener('resize', function() { self.resize(); });
  };

  GridScan.prototype._spawnScans = function() {
    var self = this;
    // 初始生成 3 道错开的扫描线
    for (var i = 0; i < 3; i++) {
      this.scans.push({
        phase: i * 0.35,
        direction: 1,
        speed: 1 + Math.random() * 0.3
      });
    }
    // 定期补充新扫描线
    setInterval(function() {
      if (self.scans.length < 5) {
        self.scans.push({
          phase: -0.1,
          direction: 1,
          speed: 1 + Math.random() * 0.3
        });
      }
    }, this.scanDelay * 1000);
  };

  GridScan.prototype.resize = function() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rect = this.container.getBoundingClientRect();
    this.w = rect.width || window.innerWidth;
    this.h = rect.height || window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  GridScan.prototype._hex2rgb = function(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    return {
      r: parseInt(c.substring(0,2), 16),
      g: parseInt(c.substring(2,4), 16),
      b: parseInt(c.substring(4,6), 16)
    };
  };

  GridScan.prototype._noise = function(x, y, t) {
    var n = Math.sin(x * 12.9898 + y * 78.233 + t * 45.164) * 43758.5453;
    return n - Math.floor(n);
  };

  GridScan.prototype.render = function(dt) {
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;

    var t = dt * 0.001;
    this.time += t;

    ctx.clearRect(0, 0, w, h);

    // 网格大小
    var cellSize = Math.max(30, Math.min(w, h) * this.gridScale);
    var cols = Math.ceil(w / cellSize) + 2;
    var rows = Math.ceil(h / cellSize) + 2;
    var jitterAmt = cellSize * this.lineJitter;

    var lc = this._hex2rgb(this.linesColor);
    var sc = this._hex2rgb(this.scanColor);
    var noiseFn = this._noise;

    // === 网格线（水平+垂直）===
    ctx.strokeStyle = 'rgba(' + lc.r + ',' + lc.g + ',' + lc.b + ',0.35)';
    ctx.lineWidth = this.lineThickness;

    // 水平线
    for (var ri = 0; ri <= rows; ri++) {
      ctx.beginPath();
      for (var ci = 0; ci <= cols; ci++) {
        var bx = ci * cellSize;
        var by = ri * cellSize;
        var jx = jitterAmt * (noiseFn(ci * 0.7, ri * 0.7, this.time * 0.3) - 0.5);
        var jy = jitterAmt * (noiseFn(ci * 0.7 + 100, ri * 0.7 + 100, this.time * 0.3) - 0.5);
        if (ci === 0) ctx.moveTo(bx + jx, by + jy);
        else ctx.lineTo(bx + jx, by + jy);
      }
      ctx.stroke();
    }

    // 垂直线
    for (var ci2 = 0; ci2 <= cols; ci2++) {
      ctx.beginPath();
      for (var ri2 = 0; ri2 <= rows; ri2++) {
        var bx2 = ci2 * cellSize;
        var by2 = ri2 * cellSize;
        var jx2 = jitterAmt * (noiseFn(ci2 * 0.7 + 200, ri2 * 0.7 + 200, this.time * 0.3) - 0.5);
        var jy2 = jitterAmt * (noiseFn(ci2 * 0.7 + 300, ri2 * 0.7 + 300, this.time * 0.3) - 0.5);
        if (ri2 === 0) ctx.moveTo(bx2 + jx2, by2 + jy2);
        else ctx.lineTo(bx2 + jx2, by2 + jy2);
      }
      ctx.stroke();
    }

    // === 扫描光束（多道） ===
    for (var si = 0; si < this.scans.length; si++) {
      var scan = this.scans[si];
      scan.phase += t / (this.scanDuration * scan.speed);

      // pingpong
      if (scan.phase > 1) {
        scan.phase = 2 - scan.phase;
        scan.direction = -scan.direction;
      }
      if (scan.phase < 0) {
        scan.phase = -scan.phase;
        scan.direction = -scan.direction;
      }

      var scanY = scan.phase * h;
      var softH = this.scanSoftness * cellSize;

      // 光晕条
      var grad = ctx.createLinearGradient(0, scanY - softH, 0, scanY + softH);
      grad.addColorStop(0, 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',0)');
      grad.addColorStop(0.25, 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',' + (this.scanOpacity * this.scanGlow * 0.6) + ')');
      grad.addColorStop(0.5, 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',' + this.scanOpacity + ')');
      grad.addColorStop(0.75, 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',' + (this.scanOpacity * this.scanGlow * 0.6) + ')');
      grad.addColorStop(1, 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - softH, w, softH * 2);

      // 主线
      ctx.strokeStyle = 'rgba(' + sc.r + ',' + sc.g + ',' + sc.b + ',' + (this.scanOpacity * 1.2) + ')';
      ctx.lineWidth = this.lineThickness + 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();
    }

    // === 噪点 ===
    if (this.noiseIntensity > 0) {
      var seed = Math.floor(this.time * 100);
      for (var ni = 0; ni < 80; ni++) {
        seed = (seed * 16807) % 2147483647;
        var nx = (seed % w + w) % w;
        seed = (seed * 16807) % 2147483647;
        var ny = (seed % h + h) % h;
        seed = (seed * 16807) % 2147483647;
        var na = (seed % 100) / 100 * this.noiseIntensity * 0.5;
        ctx.fillStyle = 'rgba(' + lc.r + ',' + lc.g + ',' + lc.b + ',' + na + ')';
        ctx.fillRect(nx, ny, 1, 1);
      }
    }
  };

  // ========== PUBLIC ==========
  window.initGridScan = function(containerSelector, options) {
    var container = document.querySelector(containerSelector);
    if (!container) return null;
    var old = container.querySelector('.antigravity-canvas');
    if (old) old.remove();

    var canvas = document.createElement('canvas');
    canvas.className = 'antigravity-canvas';
    container.style.position = 'relative';
    container.insertBefore(canvas, container.firstChild);

    var gs = new GridScan(canvas, container, options);

    var last = performance.now();
    function loop(time) {
      var delta = Math.min(50, time - last);
      last = time;
      gs.render(delta || 16);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return gs;
  };
})();
