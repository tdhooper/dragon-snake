global.THREE = require('three');
var polyhedra = require('polyhedra');
var Snake = require('./snake');
var PolyFrame = require('./poly-frame');
var DebugCurve = require('./debug-curve');

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


var poly = polyhedra.archimedean.TruncatedTetrahedron;
poly = scalePoly(poly, 8);
var snake = new Snake(poly, 60, 5, 3, 1/13.3);
var polyFrame = new PolyFrame(poly);
var debugCurve = new DebugCurve(snake.curve);


poly = polyhedra.archimedean.TruncatedIcosahedron;
poly = scalePoly(poly, 30);
var snake2 = new Snake(poly, 120, 10, 4, 1/60);
var polyFrame2 = new PolyFrame(poly);


var drawSetup = regl({
  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 5,
        viewportWidth / viewportHeight,
        0.01,
        1000),
    view: () => {
      return camera.view();
    }
  }
});

function draw(context) {
  camera.tick();

  drawSetup(function(context) {
    snake.draw(context);
    polyFrame.draw(context);

    snake2.draw(context);
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
