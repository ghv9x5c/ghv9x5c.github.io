/* ========================================
   Infinite Menu — WebGL 3D 旋转画廊
   Adapted from react-bits for vanilla JS
   ======================================== */

// gl-matrix aliases
var vec2 = glMatrix.vec2;
var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;
var quat = glMatrix.quat;

// — Shaders —
var discVertShaderSource = '#version 300 es\n\
uniform mat4 uWorldMatrix;\n\
uniform mat4 uViewMatrix;\n\
uniform mat4 uProjectionMatrix;\n\
uniform vec3 uCameraPosition;\n\
uniform vec4 uRotationAxisVelocity;\n\
in vec3 aModelPosition;\n\
in vec3 aModelNormal;\n\
in vec2 aModelUvs;\n\
in mat4 aInstanceMatrix;\n\
out vec2 vUvs;\n\
out float vAlpha;\n\
flat out int vInstanceId;\n\
void main() {\n\
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);\n\
    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;\n\
    float radius = length(centerPos.xyz);\n\
    if (gl_VertexID > 0) {\n\
        vec3 rotationAxis = uRotationAxisVelocity.xyz;\n\
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);\n\
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));\n\
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);\n\
        float strength = dot(stretchDir, relativeVertexPos);\n\
        float invAbsStrength = min(0., abs(strength) - 1.);\n\
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);\n\
        worldPosition.xyz += stretchDir * strength;\n\
    }\n\
    worldPosition.xyz = radius * normalize(worldPosition.xyz);\n\
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;\n\
    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;\n\
    vUvs = aModelUvs;\n\
    vInstanceId = gl_InstanceID;\n\
}';

var discFragShaderSource = '#version 300 es\n\
precision highp float;\n\
uniform sampler2D uTex;\n\
uniform int uItemCount;\n\
uniform int uAtlasSize;\n\
out vec4 outColor;\n\
in vec2 vUvs;\n\
in float vAlpha;\n\
flat in int vInstanceId;\n\
void main() {\n\
    int itemIndex = vInstanceId % uItemCount;\n\
    int cellsPerRow = uAtlasSize;\n\
    int cellX = itemIndex % cellsPerRow;\n\
    int cellY = itemIndex / cellsPerRow;\n\
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));\n\
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;\n\
    ivec2 texSize = textureSize(uTex, 0);\n\
    float imageAspect = float(texSize.x) / float(texSize.y);\n\
    float containerAspect = 1.0;\n\
    float scale = max(imageAspect / containerAspect, containerAspect / imageAspect);\n\
    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);\n\
    st = (st - 0.5) * scale + 0.5;\n\
    st = clamp(st, 0.0, 1.0);\n\
    st = st * cellSize + cellOffset;\n\
    outColor = texture(uTex, st);\n\
    outColor.a *= vAlpha;\n\
}';

// — Geometry classes —
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl, sources, tfVaryings, attribLocations) {
  var program = gl.createProgram();
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach(function(type, ndx) {
    var shader = createShader(gl, type, sources[ndx]);
    if (shader) gl.attachShader(program, shader);
  });
  if (tfVaryings) gl.transformFeedbackVaryings(program, tfVaryings, gl.SEPARATE_ATTRIBS);
  if (attribLocations) {
    for (var attrib in attribLocations) {
      gl.bindAttribLocation(program, attribLocations[attrib], attrib);
    }
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function resizeCanvasToDisplaySize(canvas) {
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var w = Math.round(canvas.clientWidth * dpr);
  var h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    return true;
  }
  return false;
}

function makeBuffer(gl, data, usage) {
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createAndSetupTexture(gl, minF, magF, wrapS, wrapT) {
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
  return tex;
}

function makeVertexArray(gl, bufLocTriplets, indices) {
  var va = gl.createVertexArray();
  gl.bindVertexArray(va);
  for (var i = 0; i < bufLocTriplets.length; i++) {
    var triplet = bufLocTriplets[i];
    var buffer = triplet[0], loc = triplet[1], numElem = triplet[2];
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return va;
}

// — Square Plane Geometry (quad with center fan, like disc but square) —
function PlaneGeometry(size, segments) {
  size = size || 1;
  segments = segments || 8;
  var s = size;
  var vertices = [0, 0, 0]; // center
  var uvs = [0.5, 0.5];
  var indices = [];
  var total = segments * 4; // vertices around perimeter

  for (var i = 0; i < total; i++) {
    var t = i / total; // 0..1 around perimeter
    var side = Math.floor(t * 4); // 0=top, 1=right, 2=bottom, 3=left
    var u = (t * 4) - side; // 0..1 along this side
    var x, y;
    if (side === 0)      { x = -s + u * 2*s; y =  s; }       // top edge, left to right
    else if (side === 1) { x =  s;           y =  s - u * 2*s; } // right edge, top to bottom
    else if (side === 2) { x =  s - u * 2*s; y = -s; }       // bottom edge, right to left
    else                 { x = -s;           y = -s + u * 2*s; } // left edge, bottom to top
    vertices.push(x, y, 0);
    uvs.push((x + s) / (2*s), (y + s) / (2*s));
  }

  for (var k = 0; k < total; k++) {
    indices.push(0, k + 1, ((k + 1) % total) + 1);
  }

  return {
    vertices: new Float32Array(vertices),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices)
  };
}

// — Icosahedron —
function IcosahedronVertices() {
  var t = Math.sqrt(5) * 0.5 + 0.5;
  var verts = [
    -1,t,0, 1,t,0, -1,-t,0, 1,-t,0,
    0,-1,t, 0,1,t, 0,-1,-t, 0,1,-t,
    t,0,-1, t,0,1, -t,0,-1, -t,0,1
  ];
  var faces = [
    0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11,
    1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8,
    3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9,
    4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1
  ];
  return { vertices: verts, faces: faces };
}

function subdivideIcosahedron(verts, faces, divs) {
  var cache = {};
  function mid(a, b) {
    var key = a < b ? a + '_' + b : b + '_' + a;
    if (cache[key] !== undefined) return cache[key];
    var idx = verts.length / 3;
    verts.push((verts[a*3]+verts[b*3])/2, (verts[a*3+1]+verts[b*3+1])/2, (verts[a*3+2]+verts[b*3+2])/2);
    cache[key] = idx;
    return idx;
  }
  for (var d = 0; d < divs; d++) {
    var newFaces = [];
    for (var i = 0; i < faces.length; i += 3) {
      var a = faces[i], b = faces[i+1], c = faces[i+2];
      var mAB = mid(a,b), mBC = mid(b,c), mCA = mid(c,a);
      newFaces.push(a,mAB,mCA, b,mBC,mAB, c,mCA,mBC, mAB,mBC,mCA);
    }
    faces = newFaces;
  }
  return { vertices: verts, faces: faces };
}

function spherize(verts, radius) {
  for (var i = 0; i < verts.length; i += 3) {
    var len = Math.sqrt(verts[i]*verts[i] + verts[i+1]*verts[i+1] + verts[i+2]*verts[i+2]);
    verts[i] = verts[i] / len * radius;
    verts[i+1] = verts[i+1] / len * radius;
    verts[i+2] = verts[i+2] / len * radius;
  }
}

// — Arcball Control —
function ArcballControl(canvas, onUpdate) {
  var self = this;
  this.canvas = canvas;
  this.orientation = quat.create();
  this.pointerRotation = quat.create();
  this.rotationVelocity = 0;
  this.rotationAxis = vec3.fromValues(1, 0, 0);
  this.snapDirection = vec3.fromValues(0, 0, -1);
  this.snapTargetDirection = null;
  this.isPointerDown = false;
  this.pointerPos = vec2.create();
  this.prevPointerPos = vec2.create();
  this._rv = 0;
  this._combinedQuat = quat.create();
  this.onUpdate = onUpdate || function(){};

  canvas.addEventListener('pointerdown', function(e) {
    vec2.set(self.pointerPos, e.clientX, e.clientY);
    vec2.copy(self.prevPointerPos, self.pointerPos);
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
    var mid = vec2.sub(vec2.create(), this.pointerPos, this.prevPointerPos);
    vec2.scale(mid, mid, INTENSITY);
    if (vec2.sqrLen(mid) > 0.1) {
      vec2.add(mid, this.prevPointerPos, mid);
      var p = this._project(mid);
      var q = this._project(this.prevPointerPos);
      var a = vec3.normalize(vec3.create(), p);
      var b = vec3.normalize(vec3.create(), q);
      vec2.copy(this.prevPointerPos, mid);
      this._quatFromVectors(a, b, this.pointerRotation, angleFactor * 5 / timeScale);
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, quat.create(), INTENSITY);
    }
  } else {
    quat.slerp(this.pointerRotation, this.pointerRotation, quat.create(), 0.1 * timeScale);
    if (this.snapTargetDirection) {
      var SNAP = 0.2;
      var a = this.snapTargetDirection;
      var b = this.snapDirection;
      var sqrD = vec3.squaredDistance(a, b);
      var df = Math.max(0.1, 1 - sqrD * 10);
      this._quatFromVectors(a, b, snapRotation, SNAP * df * angleFactor);
    }
  }

  var combined = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
  this.orientation = quat.multiply(quat.create(), combined, this.orientation);
  quat.normalize(this.orientation, this.orientation);

  quat.slerp(this._combinedQuat, this._combinedQuat, combined, 0.8 * timeScale);
  quat.normalize(this._combinedQuat, this._combinedQuat);

  var rad = Math.acos(this._combinedQuat[3]) * 2.0;
  var s = Math.sin(rad / 2.0);
  if (s > 0.000001) {
    this.rotationAxis[0] = this._combinedQuat[0] / s;
    this.rotationAxis[1] = this._combinedQuat[1] / s;
    this.rotationAxis[2] = this._combinedQuat[2] / s;
    this.rotationVelocity = rad / (2 * Math.PI);
  }
  this._rv += (this.rotationVelocity - this._rv) * 0.5 * timeScale;

  this.onUpdate(deltaTime);
};

ArcballControl.prototype._project = function(pos) {
  var r = 2;
  var w = this.canvas.clientWidth;
  var h = this.canvas.clientHeight;
  var s = Math.max(w, h) - 1;
  var x = (2 * pos[0] - w - 1) / s;
  var y = (2 * pos[1] - h - 1) / s;
  var xySq = x * x + y * y;
  var rSq = r * r;
  var z = (xySq <= rSq / 2.0) ? Math.sqrt(rSq - xySq) : rSq / Math.sqrt(xySq);
  return vec3.fromValues(-x, y, z);
};

ArcballControl.prototype._quatFromVectors = function(a, b, out, factor) {
  var axis = vec3.cross(vec3.create(), a, b);
  vec3.normalize(axis, axis);
  var d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
  var angle = Math.acos(d) * (factor || 1);
  quat.setAxisAngle(out, axis, angle);
};

// — Infinite Grid Menu —
function InfiniteGridMenu(canvas, items, onActive, onMove, scale) {
  var self = this;
  this.canvas = canvas;
  this.items = items || [];
  this.onActive = onActive || function(){};
  this.onMove = onMove || function(){};
  this.SPHERE_RADIUS = 2;
  this.scaleFactor = scale || 1.0;
  this.TARGET_FRAME = 1000 / 60;
  this._time = 0;
  this._frames = 0;
  this.movementActive = false;
  this.smoothRotationVelocity = 0;

  this.camera = {
    position: vec3.fromValues(0, 0, 3 * this.scaleFactor),
    up: vec3.fromValues(0, 1, 0),
    near: 0.1, far: 40, fov: Math.PI / 4, aspect: 1,
    matrix: mat4.create(),
    matrices: { view: mat4.create(), projection: mat4.create(), invProj: mat4.create() }
  };

  this._initGL();
}

InfiniteGridMenu.prototype._initGL = function() {
  var gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) { console.error('WebGL2 not supported'); return; }
  this.gl = gl;

  this.program = createProgram(gl, [discVertShaderSource, discFragShaderSource], null, {
    aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3
  });

  this.locs = {
    aModelPosition: 0, aModelUvs: 2, aInstanceMatrix: 3,
    uWorldMatrix: gl.getUniformLocation(this.program, 'uWorldMatrix'),
    uViewMatrix: gl.getUniformLocation(this.program, 'uViewMatrix'),
    uProjectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
    uCameraPosition: gl.getUniformLocation(this.program, 'uCameraPosition'),
    uRotationAxisVelocity: gl.getUniformLocation(this.program, 'uRotationAxisVelocity'),
    uTex: gl.getUniformLocation(this.program, 'uTex'),
    uFrames: gl.getUniformLocation(this.program, 'uFrames'),
    uItemCount: gl.getUniformLocation(this.program, 'uItemCount'),
    uAtlasSize: gl.getUniformLocation(this.program, 'uAtlasSize'),
    uScaleFactor: gl.getUniformLocation(this.program, 'uScaleFactor')
  };

  // Plane geometry (square cards)
  var plane = new PlaneGeometry(1);
  this.discData = plane;
  this.discVAO = makeVertexArray(gl, [
    [makeBuffer(gl, disc.vertices, gl.STATIC_DRAW), 0, 3],
    [makeBuffer(gl, disc.uvs, gl.STATIC_DRAW), 2, 2]
  ], disc.indices);

  // Icosahedron for instance positions
  var ico = IcosahedronVertices();
  var sub = subdivideIcosahedron(ico.vertices, ico.faces, 1);
  spherize(sub.vertices, this.SPHERE_RADIUS);
  this.instancePositions = [];
  for (var i = 0; i < sub.vertices.length; i += 3) {
    this.instancePositions.push(vec3.fromValues(sub.vertices[i], sub.vertices[i+1], sub.vertices[i+2]));
  }
  this.INSTANCE_COUNT = this.instancePositions.length;

  // Instance matrices
  this._initInstances();

  this.worldMatrix = mat4.create();
  this._initTexture();
  this._updateCameraMatrix();
  this._updateProjection();

  var self = this;
  this.control = new ArcballControl(this.canvas, function() { self._onControlUpdate(); });
  this.resize();
};

InfiniteGridMenu.prototype._initInstances = function() {
  var gl = this.gl;
  var count = this.INSTANCE_COUNT;
  this.instances = { array: new Float32Array(count * 16), matrices: [], buffer: gl.createBuffer() };
  for (var i = 0; i < count; i++) {
    var m = new Float32Array(this.instances.array.buffer, i * 16 * 4, 16);
    m.set(mat4.create());
    this.instances.matrices.push(m);
  }
  gl.bindVertexArray(this.discVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.instances.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, this.instances.array.byteLength, gl.DYNAMIC_DRAW);
  for (var j = 0; j < 4; j++) {
    var loc = 3 + j;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, j * 16);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
};

InfiniteGridMenu.prototype._initTexture = function() {
  var gl = this.gl;
  var self = this;
  this.tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  var itemCount = Math.max(1, this.items.length);
  this.atlasSize = Math.ceil(Math.sqrt(itemCount));
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var cellSize = 512;
  canvas.width = this.atlasSize * cellSize;
  canvas.height = this.atlasSize * cellSize;

  var loaded = 0;
  this.items.forEach(function(item, i) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var x = (i % self.atlasSize) * cellSize;
      var y = Math.floor(i / self.atlasSize) * cellSize;
      ctx.drawImage(img, x, y, cellSize, cellSize);
      loaded++;
      if (loaded === self.items.length) {
        gl.bindTexture(gl.TEXTURE_2D, self.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
      }
    };
    img.onerror = function() { loaded++; };
    img.src = item.image;
  });
};

InfiniteGridMenu.prototype.resize = function() {
  var gl = this.gl;
  if (!gl) return;
  var needs = resizeCanvasToDisplaySize(gl.canvas);
  if (needs) gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  this._updateProjection();
};

InfiniteGridMenu.prototype._animate = function(deltaTime) {
  var gl = this.gl;
  this.control.update(deltaTime, this.TARGET_FRAME);

  var scale = 0.25;
  var SCALE = 0.6;
  var self = this;
  this.instancePositions.forEach(function(p, ndx) {
    var rotated = vec3.transformQuat(vec3.create(), p, self.control.orientation);
    var s = (Math.abs(rotated[2]) / self.SPHERE_RADIUS) * SCALE + (1 - SCALE);
    var fs = s * scale;
    var m = mat4.create();
    mat4.multiply(m, m, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), rotated)));
    mat4.multiply(m, m, mat4.targetTo(mat4.create(), [0,0,0], rotated, [0,1,0]));
    mat4.multiply(m, m, mat4.fromScaling(mat4.create(), [fs,fs,fs]));
    mat4.multiply(m, m, mat4.fromTranslation(mat4.create(), [0,0,-self.SPHERE_RADIUS]));
    mat4.copy(self.instances.matrices[ndx], m);
  });

  gl.bindBuffer(gl.ARRAY_BUFFER, this.instances.buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instances.array);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  this.smoothRotationVelocity = this.control.rotationVelocity;
};

InfiniteGridMenu.prototype._render = function() {
  var gl = this.gl;
  gl.useProgram(this.program);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.99, 0.98, 0.97, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(this.locs.uWorldMatrix, false, this.worldMatrix);
  gl.uniformMatrix4fv(this.locs.uViewMatrix, false, this.camera.matrices.view);
  gl.uniformMatrix4fv(this.locs.uProjectionMatrix, false, this.camera.matrices.projection);
  gl.uniform3f(this.locs.uCameraPosition, this.camera.position[0], this.camera.position[1], this.camera.position[2]);
  gl.uniform4f(this.locs.uRotationAxisVelocity,
    this.control.rotationAxis[0], this.control.rotationAxis[1],
    this.control.rotationAxis[2], this.smoothRotationVelocity * 1.1);
  gl.uniform1i(this.locs.uItemCount, this.items.length);
  gl.uniform1i(this.locs.uAtlasSize, this.atlasSize);
  gl.uniform1f(this.locs.uFrames, this._frames);
  gl.uniform1f(this.locs.uScaleFactor, this.scaleFactor);
  gl.uniform1i(this.locs.uTex, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.tex);
  gl.bindVertexArray(this.discVAO);
  gl.drawElementsInstanced(gl.TRIANGLES, this.discData.indices.length, gl.UNSIGNED_SHORT, 0, this.INSTANCE_COUNT);
};

InfiniteGridMenu.prototype._updateCameraMatrix = function() {
  mat4.targetTo(this.camera.matrix, this.camera.position, [0,0,0], this.camera.up);
  mat4.invert(this.camera.matrices.view, this.camera.matrix);
};

InfiniteGridMenu.prototype._updateProjection = function() {
  var gl = this.gl;
  if (!gl) return;
  this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var height = this.SPHERE_RADIUS * 0.35;
  var dist = this.camera.position[2];
  if (this.camera.aspect > 1) {
    this.camera.fov = 2 * Math.atan(height / dist);
  } else {
    this.camera.fov = 2 * Math.atan(height / this.camera.aspect / dist);
  }
  mat4.perspective(this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
};

InfiniteGridMenu.prototype._onControlUpdate = function() {
  var isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.001;
  if (isMoving !== this.movementActive) {
    this.movementActive = isMoving;
    this.onMove(isMoving);
  }
  if (!this.control.isPointerDown) {
    var nearest = this._findNearest();
    this.onActive(nearest % this.items.length);
    var pos = this.instancePositions[nearest];
    var dir = vec3.transformQuat(vec3.create(), pos, this.control.orientation);
    vec3.normalize(dir, dir);
    this.control.snapTargetDirection = dir;
  }
  var targetZ = this.control.isPointerDown ? (3 * this.scaleFactor + 2.5) : (3 * this.scaleFactor);
  this.camera.position[2] += (targetZ - this.camera.position[2]) * 0.12;
  this._updateCameraMatrix();
};

InfiniteGridMenu.prototype._findNearest = function() {
  var n = this.control.snapDirection;
  var inv = quat.conjugate(quat.create(), this.control.orientation);
  var nt = vec3.transformQuat(vec3.create(), n, inv);
  var maxD = -1, idx = 0;
  for (var i = 0; i < this.instancePositions.length; i++) {
    var d = vec3.dot(nt, this.instancePositions[i]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  return idx;
};

InfiniteGridMenu.prototype.run = function(time) {
  time = time || 0;
  var dt = Math.min(32, time - this._time);
  this._time = time;
  this._frames += dt / this.TARGET_FRAME;
  this._animate(dt);
  this._render();
  var self = this;
  requestAnimationFrame(function(t) { self.run(t); });
};

InfiniteGridMenu.prototype.setItems = function(items) {
  this.items = items;
  this._initTexture();
};

// ==============
// Init function
// ==============
var photoMenu = null;
var photoMenuItems = [];
var photoMenuLabels = [];

function initPhotoMenu(photoFiles, photoLabels, thumbPath, fullPath) {
  var canvas = document.getElementById('photo-menu-canvas');
  if (!canvas) return;

  // WebGL2 fallback
  var testCanvas = document.createElement('canvas');
  if (!testCanvas.getContext('webgl2')) {
    console.warn('WebGL2 not supported, falling back to gallery');
    canvas.style.display = 'none';
    // Build original gallery as fallback
    var wrap = document.getElementById('photo-menu-wrap');
    if (wrap) {
      var gal = document.createElement('div');
      gal.id = 'gallery-photo';
      gal.className = 'gallery';
      wrap.appendChild(gal);
      buildPhotoGallery();
    }
    return;
  }

  photoMenuLabels = photoLabels;
  photoMenuItems = [];

  for (var i = 0; i < photoFiles.length; i++) {
    photoMenuItems.push({
      image: thumbPath + photoFiles[i],
      fullSrc: fullPath + photoFiles[i],
      title: photoLabels[i] || '',
      index: i
    });
  }

  photoMenu = new InfiniteGridMenu(canvas, photoMenuItems, function(activeIndex) {
    // Update overlay with label
    var overlay = document.getElementById('im-overlay');
    if (overlay && photoMenuLabels[activeIndex]) {
      overlay.innerHTML = '<span class="im-label" style="top:20px;left:24px;">' + photoMenuLabels[activeIndex] + '</span>';
    }
  }, function(isMoving) {
    var overlay = document.getElementById('im-overlay');
    if (overlay && isMoving) overlay.innerHTML = '';
  }, 0.9);

  // Click to open lightbox (only on deliberate click, not after drag)
  var pointerMoved = false;
  canvas.addEventListener('pointerdown', function() { pointerMoved = false; });
  canvas.addEventListener('pointermove', function() { pointerMoved = true; });
  canvas.addEventListener('click', function(e) {
    if (pointerMoved) return;
    var activeItem = photoMenuItems[photoMenu._findNearest() % photoMenuItems.length];
    if (activeItem && activeItem.fullSrc && typeof openLightbox === 'function') {
      openLightbox(activeItem.fullSrc);
    }
  });

  photoMenu.run();

  window.addEventListener('resize', function() {
    if (photoMenu) photoMenu.resize();
  });
}
