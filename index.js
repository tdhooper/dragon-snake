global.THREE = require('three');
var polyhedra = require('polyhedra');
var Snake = require('./snake');

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
camera.distance = 30;

var poly = polyhedra.platonic.Icosahedron;
var snake = new Snake(poly);

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
  });
}

regl.frame(draw);
// draw({
//   time: 0
// });

