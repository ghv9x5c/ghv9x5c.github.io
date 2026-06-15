/* ========================================
   Infinite Menu — 严格对照原版 react-bits 端口
   点击 action button → 灯箱查看原图
   ======================================== */
(function() {
  if (typeof glMatrix === 'undefined') return;
  var vec2 = glMatrix.vec2, vec3 = glMatrix.vec3,
      mat4 = glMatrix.mat4, quat = glMatrix.quat;

  // ========== SHADERS (exact original) ==========
  var discVertShaderSource = '#version 300 es\n' +
    'uniform mat4 uWorldMatrix;\n' +
    'uniform mat4 uViewMatrix;\n' +
    'uniform mat4 uProjectionMatrix;\n' +
    'uniform vec3 uCameraPosition;\n' +
    'uniform vec4 uRotationAxisVelocity;\n' +
    'in vec3 aModelPosition;\n' +
    'in vec3 aModelNormal;\n' +
    'in vec2 aModelUvs;\n' +
    'in mat4 aInstanceMatrix;\n' +
    'out vec2 vUvs;\n' +
    'out float vAlpha;\n' +
    'flat out int vInstanceId;\n' +
    '#define PI 3.141593\n' +
    'void main() {\n' +
    '    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);\n' +
    '    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;\n' +
    '    float radius = length(centerPos.xyz);\n' +
    '    if (gl_VertexID > 0) {\n' +
    '        vec3 rotationAxis = uRotationAxisVelocity.xyz;\n' +
    '        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);\n' +
    '        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));\n' +
    '        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);\n' +
    '        float strength = dot(stretchDir, relativeVertexPos);\n' +
    '        float invAbsStrength = min(0., abs(strength) - 1.);\n' +
    '        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);\n' +
    '        worldPosition.xyz += stretchDir * strength;\n' +
    '    }\n' +
    '    worldPosition.xyz = radius * normalize(worldPosition.xyz);\n' +
    '    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;\n' +
    '    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;\n' +
    '    vUvs = aModelUvs;\n' +
    '    vInstanceId = gl_InstanceID;\n' +
    '}';

  var discFragShaderSource = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uTex;\n' +
    'uniform int uItemCount;\n' +
    'uniform int uAtlasSize;\n' +
    'out vec4 outColor;\n' +
    'in vec2 vUvs;\n' +
    'in float vAlpha;\n' +
    'flat in int vInstanceId;\n' +
    'void main() {\n' +
    '    int itemIndex = vInstanceId % uItemCount;\n' +
    '    int cellsPerRow = uAtlasSize;\n' +
    '    int cellX = itemIndex % cellsPerRow;\n' +
    '    int cellY = itemIndex / cellsPerRow;\n' +
    '    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));\n' +
    '    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;\n' +
    '    ivec2 texSize = textureSize(uTex, 0);\n' +
    '    float imageAspect = float(texSize.x) / float(texSize.y);\n' +
    '    float containerAspect = 1.0;\n' +
    '    float scale = max(imageAspect / containerAspect, containerAspect / imageAspect);\n' +
    '    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);\n' +
    '    st = (st - 0.5) * scale + 0.5;\n' +
    '    st = clamp(st, 0.0, 1.0);\n' +
    '    st = st * cellSize + cellOffset;\n' +
    '    outColor = texture(uTex, st);\n' +
    '    outColor.a *= vAlpha;\n' +
    '}';

  // ========== GEOMETRY CLASSES (exact original) ==========
  function DiscGeometry(steps, radius) {
    steps = Math.max(4, steps || 4);
    radius = radius || 1;
    var vertices = [], uvs = [], indices = [];
    // center
    vertices.push(0,0,0); uvs.push(0.5,0.5);
    var alpha = 2*Math.PI/steps;
    for (var i = 0; i < steps; i++) {
      var x = Math.cos(alpha*i), y = Math.sin(alpha*i);
      vertices.push(radius*x, radius*y, 0);
      uvs.push(x*0.5+0.5, y*0.5+0.5);
      if (i > 0) indices.push(0, i, i+1);
    }
    indices.push(0, steps, 1);
    return {
      vertices: new Float32Array(vertices),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    };
  }

  function IcosahedronGeometry() {
    var t = Math.sqrt(5)*0.5+0.5;
    var verts = [-1,t,0, 1,t,0, -1,-t,0, 1,-t,0, 0,-1,t, 0,1,t, 0,-1,-t, 0,1,-t, t,0,-1, t,0,1, -t,0,-1, -t,0,1];
    var faces = [0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];
    return { vertices: verts, faces: faces };
  }

  function subdivide(v, f, divs) {
    var cache = {};
    function mid(a,b) {
      var k = a<b ? a+'_'+b : b+'_'+a;
      if (cache[k] !== undefined) return cache[k];
      var idx = v.length/3;
      v.push((v[a*3]+v[b*3])/2, (v[a*3+1]+v[b*3+1])/2, (v[a*3+2]+v[b*3+2])/2);
      cache[k] = idx; return idx;
    }
    for (var d = 0; d < divs; d++) {
      var nf = [];
      for (var i = 0; i < f.length; i+=3) {
        var a=f[i], b=f[i+1], c=f[i+2];
        var mab=mid(a,b), mbc=mid(b,c), mca=mid(c,a);
        nf.push(a,mab,mca, b,mbc,mab, c,mca,mbc, mab,mbc,mca);
      }
      f = nf;
    }
    return { vertices: v, faces: f };
  }

  function spherize(v, r) {
    for (var i = 0; i < v.length; i+=3) {
      var len = Math.sqrt(v[i]*v[i]+v[i+1]*v[i+1]+v[i+2]*v[i+2]);
      if (len > 0) { v[i]=v[i]*r/len; v[i+1]=v[i+1]*r/len; v[i+2]=v[i+2]*r/len; }
    }
  }

  // ========== WEBGL HELPERS (exact original) ==========
  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error(gl.getShaderInfoLog(shader)); gl.deleteShader(shader); return null;
  }

  function createProgram(gl, sources, tfVaryings, attribLocs) {
    var program = gl.createProgram();
    [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach(function(type, ndx) {
      var shader = createShader(gl, type, sources[ndx]);
      if (shader) gl.attachShader(program, shader);
    });
    if (tfVaryings) gl.transformFeedbackVaryings(program, tfVaryings, gl.SEPARATE_ATTRIBS);
    if (attribLocs) {
      for (var attrib in attribLocs) gl.bindAttribLocation(program, attribLocs[attrib], attrib);
    }
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
    console.error(gl.getProgramInfoLog(program)); gl.deleteProgram(program); return null;
  }

  function makeVertexArray(gl, bufLocTriplets, indices) {
    var va = gl.createVertexArray(); gl.bindVertexArray(va);
    for (var i = 0; i < bufLocTriplets.length; i++) {
      var t = bufLocTriplets[i];
      if (t[1] === -1) continue;
      gl.bindBuffer(gl.ARRAY_BUFFER, t[0]);
      gl.enableVertexAttribArray(t[1]);
      gl.vertexAttribPointer(t[1], t[2], gl.FLOAT, false, 0, 0);
    }
    if (indices) {
      var ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }
    gl.bindVertexArray(null); return va;
  }

  function resizeCanvasToDisplaySize(canvas) {
    var dpr = Math.min(2, window.devicePixelRatio||1);
    var w = Math.round(canvas.clientWidth*dpr), h = Math.round(canvas.clientHeight*dpr);
    var need = canvas.width !== w || canvas.height !== h;
    if (need) { canvas.width = w; canvas.height = h; }
    return need;
  }

  function makeBuffer(gl, data, usage) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, null); return buf;
  }

  function createAndSetupTexture(gl, minF, magF, wrapS, wrapT) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
    return texture;
  }

  // ========== ARCBALL CONTROL (exact original) ==========
  function ArcballControl(canvas, updateCallback) {
    var self = this;
    this.canvas = canvas;
    this.updateCallback = updateCallback || function(){};
    this.isPointerDown = false;
    this.orientation = quat.create();
    this.pointerRotation = quat.create();
    this.rotationVelocity = 0;
    this.rotationAxis = vec3.fromValues(1,0,0);
    this.snapDirection = vec3.fromValues(0,0,-1);
    this.snapTargetDirection = null;
    this.EPSILON = 0.1;
    this.IDENTITY_QUAT = quat.create();
    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();

    canvas.addEventListener('pointerdown', function(e) {
      vec2.set(self.pointerPos, e.clientX, e.clientY);
      vec2.copy(self.previousPointerPos, self.pointerPos);
      self.isPointerDown = true;
    });
    canvas.addEventListener('pointerup', function() { self.isPointerDown = false; });
    canvas.addEventListener('pointerleave', function() { self.isPointerDown = false; });
    canvas.addEventListener('pointermove', function(e) {
      if (self.isPointerDown) vec2.set(self.pointerPos, e.clientX, e.clientY);
    });
    canvas.style.touchAction = 'none';
  }

  ArcballControl.prototype.update = function(deltaTime, targetFrameDuration) {
    targetFrameDuration = targetFrameDuration || 16;
    var timeScale = deltaTime / targetFrameDuration + 0.00001;
    var angleFactor = timeScale;
    var snapRotation = quat.create();

    if (this.isPointerDown) {
      var INTENSITY = 0.3 * timeScale;
      var ANGLE_AMPLIFICATION = 5 / timeScale;
      var midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);
      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        var p = this._project(midPointerPos);
        var q = this._project(this.previousPointerPos);
        var a = vec3.normalize(vec3.create(), p);
        var b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      var INTENSITY2 = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY2);
      if (this.snapTargetDirection) {
        var SNAPPING_INTENSITY = 0.2;
        var sa = this.snapTargetDirection, sb = this.snapDirection;
        var sqrDist = vec3.squaredDistance(sa, sb);
        var distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(sa, sb, snapRotation, angleFactor);
      }
    }

    var combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    var RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    var rad = Math.acos(Math.min(1, this._combinedQuat[3])) * 2.0;
    var s = Math.sin(rad / 2.0);
    var rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }
    var RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;
    this.updateCallback(deltaTime);
  };

  ArcballControl.prototype.quatFromVectors = function(a, b, out, angleFactor) {
    angleFactor = angleFactor || 1;
    var axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    var d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    var angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
  };

  ArcballControl.prototype._project = function(pos) {
    var r = 2;
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    var s = Math.max(w, h) - 1;
    var x = (2*pos[0]-w-1)/s, y = (2*pos[1]-h-1)/s;
    var xySq = x*x+y*y, rSq = r*r;
    var z = xySq <= rSq/2 ? Math.sqrt(rSq-xySq) : rSq/Math.sqrt(xySq);
    return vec3.fromValues(-x, y, z);
  };

  // ========== INFINITE GRID MENU (exact original structure) ==========
  function InfiniteGridMenu(canvas, items, onActiveItemChange, onMovementChange, onInit, scale) {
    var self = this;
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || function(){};
    this.onMovementChange = onMovementChange || function(){};
    this.scaleFactor = scale || 1.0;
    this.TARGET_FRAME_DURATION = 1000/60;
    this.SPHERE_RADIUS = 2;
    this._time = 0; this._deltaTime = 0; this._deltaFrames = 0; this._frames = 0;
    this.smoothRotationVelocity = 0;
    this.movementActive = false;

    this.camera = {
      matrix: mat4.create(), near: 0.1, far: 40, fov: Math.PI/4, aspect: 1,
      position: vec3.fromValues(0, 0, 3*scale),
      up: vec3.fromValues(0, 1, 0),
      matrices: { view: mat4.create(), projection: mat4.create(), inversProjection: mat4.create() }
    };

    this._init(onInit);
  }

  InfiniteGridMenu.prototype._init = function(onInit) {
    var gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('No WebGL 2!');
    this.gl = gl;

    this.discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], null, {
      aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3
    });

    this.discLocations = {
      aModelPosition: 0, aModelUvs: 2, aInstanceMatrix: 3,
      uWorldMatrix: gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix: gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition: gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uScaleFactor: gl.getUniformLocation(this.discProgram, 'uScaleFactor'),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex: gl.getUniformLocation(this.discProgram, 'uTex'),
      uFrames: gl.getUniformLocation(this.discProgram, 'uFrames'),
      uItemCount: gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize: gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };

    // Disc geometry
    var discGeo = new DiscGeometry(56, 1);
    this.discBuffers = discGeo;
    this.discVAO = makeVertexArray(gl, [
      [makeBuffer(gl, discGeo.vertices, gl.STATIC_DRAW), 0, 3],
      [makeBuffer(gl, discGeo.uvs, gl.STATIC_DRAW), 2, 2]
    ], discGeo.indices);

    // Icosahedron
    var ico = IcosahedronGeometry();
    var sub = subdivide(ico.vertices, ico.faces, 1);
    spherize(sub.vertices, this.SPHERE_RADIUS);
    this.instancePositions = [];
    for (var i = 0; i < sub.vertices.length; i+=3) {
      this.instancePositions.push(vec3.fromValues(sub.vertices[i], sub.vertices[i+1], sub.vertices[i+2]));
    }
    this.DISC_INSTANCE_COUNT = this.instancePositions.length;
    this._initDiscInstances(this.DISC_INSTANCE_COUNT);

    this.worldMatrix = mat4.create();
    this._initTexture();

    var self = this;
    this.control = new ArcballControl(this.canvas, function(deltaTime) {
      self._onControlUpdate(deltaTime);
    });

    this._updateCameraMatrix();
    this._updateProjectionMatrix(gl);
    this.resize();
    if (onInit) onInit(this);
  };

  InfiniteGridMenu.prototype._initDiscInstances = function(count) {
    var gl = this.gl;
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [],
      buffer: gl.createBuffer()
    };
    for (var i = 0; i < count; i++) {
      var m = new Float32Array(this.discInstances.matricesArray.buffer, i*64, 16);
      m.set(mat4.create());
      this.discInstances.matrices.push(m);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    for (var j = 0; j < 4; j++) {
      var loc = 3 + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, j*16);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  };

  InfiniteGridMenu.prototype._initTexture = function() {
    var gl = this.gl, self = this;
    this.tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    var itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    var cellSize = 160;
    canvas.width = this.atlasSize * cellSize; canvas.height = this.atlasSize * cellSize;

    var loaded = 0, total = this.items.length;

    function uploadTex() {
      gl.bindTexture(gl.TEXTURE_2D, self.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    if (total === 0) {
      return;
    }

    // 先用 Image + decode 加载，失败则用 fetch + createImageBitmap
    function loadImage(item, i) {
      var img = new Image();
      img.src = item.image;
      img.decode().then(function() {
        drawCell(img, i);
      }).catch(function() {
        // decode 失败，尝试 fetch
        fetch(item.image)
          .then(function(r) { return r.blob(); })
          .then(function(b) { return createImageBitmap(b); })
          .then(function(bmp) {
            drawCell(bmp, i);
            bmp.close();
          })
          .catch(function() {
            loaded++;
            if (loaded >= total) uploadTex();
          });
      });
    }

    function drawCell(source, i) {
      var x = (i % self.atlasSize) * cellSize;
      var y = Math.floor(i / self.atlasSize) * cellSize;
      ctx.drawImage(source, x, y, cellSize, cellSize);
      loaded++;
      if (loaded >= total) uploadTex();
    }

    for (var i = 0; i < total; i++) {
      loadImage(this.items[i], i);
    }

    // 5s 兜底
    setTimeout(function() { uploadTex(); }, 5000);
  };

  InfiniteGridMenu.prototype.resize = function() {
    var gl = this.gl;
    var needsResize = resizeCanvasToDisplaySize(gl.canvas);
    if (needsResize) gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this._updateProjectionMatrix(gl);
  };

  InfiniteGridMenu.prototype.run = function(time) {
    time = time || 0;
    this._deltaTime = Math.min(32, time - this._time);
    this._time = time;
    this._deltaFrames = this._deltaTime / this.TARGET_FRAME_DURATION;
    this._frames += this._deltaFrames;
    this._animate(this._deltaTime);
    this._render();
    var self = this;
    requestAnimationFrame(function(t) { self.run(t); });
  };

  InfiniteGridMenu.prototype._animate = function(deltaTime) {
    var gl = this.gl;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    var scale = 0.25, SCALE_INTENSITY = 0.6, self = this;
    this.instancePositions.forEach(function(p, ndx) {
      var r = vec3.transformQuat(vec3.create(), p, self.control.orientation);
      var s = (Math.abs(r[2])/self.SPHERE_RADIUS)*SCALE_INTENSITY + (1-SCALE_INTENSITY);
      var fs = s*scale;
      var matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), r)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0,0,0], r, [0,1,0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [fs,fs,fs]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0,0,-self.SPHERE_RADIUS]));
      mat4.copy(self.discInstances.matrices[ndx], matrix);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  };

  InfiniteGridMenu.prototype._render = function() {
    var gl = this.gl;
    gl.useProgram(this.discProgram);
    gl.enable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.043, 0.043, 0.102, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(this.discLocations.uCameraPosition, this.camera.position[0], this.camera.position[1], this.camera.position[2]);
    gl.uniform4f(this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0], this.control.rotationAxis[1],
      this.control.rotationAxis[2], this.smoothRotationVelocity*1.1);
    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    gl.uniform1f(this.discLocations.uFrames, this._frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(gl.TRIANGLES, this.discBuffers.indices.length, gl.UNSIGNED_SHORT, 0, this.DISC_INSTANCE_COUNT);
  };

  InfiniteGridMenu.prototype._updateCameraMatrix = function() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0,0,0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  };

  InfiniteGridMenu.prototype._updateProjectionMatrix = function(gl) {
    this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var height = this.SPHERE_RADIUS * 0.35;
    var distance = this.camera.position[2];
    if (this.camera.aspect > 1) {
      this.camera.fov = 2 * Math.atan(height / distance);
    } else {
      this.camera.fov = 2 * Math.atan(height / this.camera.aspect / distance);
    }
    mat4.perspective(this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  };

  InfiniteGridMenu.prototype._onControlUpdate = function(deltaTime) {
    var timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    var damping = 5 / timeScale;
    var cameraTargetZ = 3 * this.scaleFactor;
    var isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;

    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }

    if (!this.control.isPointerDown) {
      var nearestVertexIndex = this._findNearestVertexIndex();
      var itemIndex = nearestVertexIndex % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIndex);
      var snapDirection = vec3.normalize(vec3.create(), this._getVertexWorldPosition(nearestVertexIndex));
      this.control.snapTargetDirection = snapDirection;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this._updateCameraMatrix();
  };

  InfiniteGridMenu.prototype._findNearestVertexIndex = function() {
    var n = this.control.snapDirection;
    var inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    var nt = vec3.transformQuat(vec3.create(), n, inversOrientation);
    var maxD = -1, nearestVertexIndex = 0;
    for (var i = 0; i < this.instancePositions.length; i++) {
      var d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) { maxD = d; nearestVertexIndex = i; }
    }
    return nearestVertexIndex;
  };

  InfiniteGridMenu.prototype._getVertexWorldPosition = function(index) {
    var nearestVertexPos = this.instancePositions[index];
    return vec3.transformQuat(vec3.create(), nearestVertexPos, this.control.orientation);
  };

  // ========== PUBLIC INIT ==========
  window.initPhoto3D = function(files, labels, thumbPath, fullPath) {
    var wrap = document.getElementById('photo-3d-wrap');
    var canvas = document.getElementById('photo-3d-canvas');
    if (!wrap || !canvas) return false;

    // WebGL2 check
    var tc = document.createElement('canvas');
    var testGl = tc.getContext('webgl2');
    if (!testGl) {
      wrap.innerHTML = '<div class="gallery" id="gallery-photo"></div>';
      return false;
    }
    // Check for common WebGL2 mobile issues
    var debugInfo = testGl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      var renderer = testGl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      console.log('WebGL2 Renderer: ' + renderer);
    }

    // Build items with link pointing to full image
    var items = files.map(function(f, i) {
      return {
        image: thumbPath + f,
        link: fullPath + f,
        title: labels[i] || '',
        description: ''
      };
    });

    // Remove old action button if any
    var oldBtn = wrap.querySelector('.action-button');
    var oldTitle = wrap.querySelector('.face-title');
    var oldDesc = wrap.querySelector('.face-description');
    if (oldBtn) oldBtn.remove();
    if (oldTitle) oldTitle.remove();
    if (oldDesc) oldDesc.remove();

    var activeItem = null;

    var sketch = new InfiniteGridMenu(canvas, items,
      // onActiveItemChange
      function(index) {
        var item = items[index];
        if (!item) return;
        activeItem = item;
        // Update overlay
        var titleEl = wrap.querySelector('.face-title');
        if (!titleEl) {
          titleEl = document.createElement('h2');
          titleEl.className = 'face-title';
          wrap.appendChild(titleEl);
        }
        titleEl.textContent = item.title;

        var btnEl = wrap.querySelector('.action-button');
        if (!btnEl) {
          btnEl = document.createElement('div');
          btnEl.className = 'action-button';
          btnEl.innerHTML = '<p class="action-button-icon">&#x2197;</p>';
          wrap.appendChild(btnEl);
        }
      },
      // onMovementChange
      function(isMoving) {
        var titleEl = wrap.querySelector('.face-title');
        var btnEl = wrap.querySelector('.action-button');
        if (titleEl) titleEl.className = 'face-title ' + (isMoving ? 'inactive' : 'active');
        if (btnEl) btnEl.className = 'action-button ' + (isMoving ? 'inactive' : 'active');
      },
      // onInit
      function(sk) { sk.run(); },
      1.1
    );

    // Click action button → open lightbox
    wrap.addEventListener('click', function(e) {
      var btn = e.target.closest('.action-button');
      if (!btn) return;
      if (activeItem && activeItem.link && typeof openLightbox === 'function') {
        openLightbox(activeItem.link);
      }
    });

    window.addEventListener('resize', function() { if (sketch) sketch.resize(); });
    return true;
  };
})();
