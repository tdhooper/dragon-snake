global.THREE = require('three');
var polyhedra = require('polyhedra');
var Snake = require('./snake');
var PolyFrame = require('./poly-frame');
var DebugCurve = require('./debug-curve');
var DebugPoint = require('./debug-point');
var Environment = require('./environment');
var glm = require('gl-matrix');
var vec3 = glm.vec3;
var quat = glm.quat;

global.regl = require('regl')({
  extensions: [
    'angle_instanced_arrays',
    'OES_texture_float',
    'OES_texture_float_linear'
  ]
});
var mat4 = require('gl-mat4');
var createCamera = require('canvas-orbit-camera');

var camera = createCamera(regl._gl.canvas);
camera.distance = 40;
camera.rotation = quat.create();

var poly = polyhedra.archimedean.TruncatedTetrahedron;
poly = scalePoly(poly, 8);
var snake = new Snake(poly, 60, 5, 3, 1/13.3);
var snake2 = new Snake(poly, 40, 5, 3, 1/13.3);
var polyFrame = new PolyFrame(poly);
var debugCurve = new DebugCurve(snake.curve);
var environment = new Environment();

var modelZ = faceVector(poly, 7);
var modelY = faceVector(poly, 4);
var modelX = vec3.cross([], modelZ, modelY);
vec3.cross(modelY, modelX, modelZ);
var model = mat4FromBasis(modelX, modelY, modelZ);

// poly = polyhedra.archimedean.TruncatedIcosahedron;
// poly = scalePoly(poly, 30);
// var snake2 = new Snake(poly, 120, 10, 4, 1/60);
// var polyFrame2 = new PolyFrame(poly);

var debugPoint = new DebugPoint();

var drawSetup = regl({
  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 5,
        viewportWidth / viewportHeight,
        0.01,
        1000
      ),
    view: () => {
      return camera.view();
    },
    model: () => {
      return model
    }
  }
});

function draw(context) {
  camera.tick();

  mat4.rotate(model, model, .005, modelX);
  // mat4.rotate(model, model, .0025, modelY);

  drawSetup(function(context) {
    snake.draw(context);
    polyFrame.draw(context);
    environment.draw();

    // poly.vertex.forEach((v, i) => {
    //   var id = (i / poly.vertex.length) * .75;
    //   debugPoint.draw(v, id);
    // });

    // debugPoint.draw(modelX);
    // debugPoint.draw(modelY);
    // debugPoint.draw(modelZ);

    // snake2.draw(context);
    // polyFrame2.draw(context);

    // debugCurve.draw(context);
  });
}

regl.frame(draw);
// draw({
//   time: 0
// });

function scalePoly(poly, scale) {
  var newPoly = Object.assign({}, poly);
  newPoly.vertex = poly.vertex.map(v => {
    v[0] *= scale;
    v[1] *= scale;
    v[2] *= scale;
    return v;
  });
  return newPoly;
}

function faceVector(poly, faceId) {
  var vec = poly.face[faceId].reduce((acc, vid) => {
    var v = poly.vertex[vid];
    return vec3.add(acc, acc, v);
  }, [0,0,0]);
  vec3.scale(vec, vec, 1/3);
  return vec;
}

function mat4FromBasis(x, y, z) {
  x = vec3.normalize([], x);
  y = vec3.normalize([], y);
  z = vec3.normalize([], z);
  // return mat4.identity([]);
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    0, 0, 0, 1
  ];
}
