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

var poly = polyhedra.platonic.Icosahedron;
poly = polyhedra.archimedean.TruncatedTetrahedron;
var snake = new Snake(poly);
var polyFrame = new PolyFrame(poly);
var debugCurve = new DebugCurve(snake.curve);

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
    debugCurve.draw(context);
  });
}

regl.frame(draw);
// draw({
//   time: 0
// });

