global.THREE = require('three');
var polyhedra = require('polyhedra');
var createGraph = require('./create-graph');
var CurveFactory = require('./curve-factory');
var EndlessCurve = require('./endless-curve');

var regl = require('regl')({
  extensions: [
    'angle_instanced_arrays',
    'OES_texture_float',
    'OES_texture_float_linear'
  ]
});
var mat4 = require('gl-mat4');
var createCube = require('primitive-cube');
var createCamera = require('canvas-orbit-camera');

var camera = createCamera(regl._gl.canvas);
camera.distance = 30;

box = createCube(.5, 2.5, .25, 1, 1, 1);

var N = 500;
var instances = Array(N).fill().map((_, i) => {
  return i;
});

var texturePoints = 100;
var textureConf = {
  width: texturePoints,
  height: 1,
  channels: 3,
  mag: 'linear',
  type: 'float'
};
var positionTex = regl.texture(textureConf);
var normalTex = regl.texture(textureConf);
var tangentTex = regl.texture(textureConf);

var poly = polyhedra.platonic.Icosahedron;
var graph = createGraph(poly);
var curveFactory = new CurveFactory(graph, 3);
var curve = new EndlessCurve(curveFactory.nextCurve);


var drawSnake = regl({
  frag: `
    precision mediump float;

    varying vec3 vNormal;

    void main() {
      gl_FragColor = vec4(vNormal * .5 + .5, 1);
    }
  `,

  vert: `
    precision mediump float;

    uniform mat4 proj;
    uniform mat4 view;
    uniform float instances;
    
    uniform sampler2D positionTex;
    uniform sampler2D normalTex;
    uniform sampler2D tangentTex;

    attribute vec3 position;
    attribute vec3 normal;
    attribute float instance;

    varying vec3 vNormal;

    void pR(inout vec2 p, float a) {
        p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
    }

    mat4 rotateX(float a) {
      return mat4(
        1, 0, 0, 0,
        0, cos(a), -sin(a), 0,
        0, sin(a), cos(a), 0,
        0, 0, 0, 1
      );
    }

    mat4 rotateY(float a) {
      return mat4(
        cos(a), 0, sin(a), 0,
        0, 1, 0, 0,
        -sin(a), 0, cos(a), 0,
        0, 0, 0, 1
      );
    }

    mat4 rotateZ(float a) {
      return mat4(
        cos(a), -sin(a), 0, 0,
        sin(a), cos(a), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      );
    }

    void main () {
      float tt = instance / instances;
      
      vec3 iPosition = texture2D(positionTex, vec2(tt, 0)).xyz;
      vec3 iNormal = texture2D(normalTex, vec2(tt, 0)).xyz;
      vec3 iTangent = texture2D(tangentTex, vec2(tt, 0)).xyz;

      vec3 n = iNormal * 2. - 1.;
      vec3 t = iTangent * 2. - 1.;
      vec3 b = cross(t, n);

      mat4 iPositionMat = mat4(
        1, 0, 0, iPosition.x,
        0, 1, 0, iPosition.y,
        0, 0, 1, iPosition.z,
        0, 0, 0, 1
      );
      
      mat4 iRotationMat = mat4(
        n.x, t.x, b.x, 0,
        n.y, t.y, b.y, 0,
        n.z, t.z, b.z, 0,
        0, 0, 0, 1
      );

      float thick = pow(tt, 1.);
      thick = smoothstep(0., .95, tt) - smoothstep(.95, 1., tt);


      vec4 pos = vec4(position * mix(.2, 1., thick), 1);

      float rot = tt * instances * .95;

      pos.z += thick;
      pos.y -= 1.;

      iRotationMat = rotateX(-.4 * thick) * rotateY(rot) * iRotationMat;
      pos = pos * iRotationMat;

      vNormal = (vec4(normal, 0) * iRotationMat).xyz;

      pos = pos * iPositionMat;
      pos = proj * view * pos;

      gl_Position = pos;
    }
  `,

  attributes: {
    position: box.positions,
    normal: box.normals,
    instance: {
      buffer: instances,
      divisor: 1
    }
  },

  elements: box.cells,

  instances: N,

  count: box.cells.length * 3,

  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 5,
        viewportWidth / viewportHeight,
        0.01,
        1000),
    view: () => {
      return camera.view();
    },
    positionTex: positionTex,
    normalTex: normalTex,
    tangentTex: tangentTex,
    instances: N
  }
});

var distance = 0;
var len = 30;

function draw(context) {
  camera.tick();

  distance = context.time * 5;
  curve.configureStartEnd(distance, len);

  var position = [];
  var normal = [];
  var tangent = [];

  for (var i = 0; i < texturePoints; i++) {
    var basis = curve.getBasisAt(i / texturePoints);
    position = position.concat(
      basis.position.x,
      basis.position.y,
      basis.position.z
    );
    normal = normal.concat(
      basis.normal.x * .5 + .5,
      basis.normal.y * .5 + .5,
      basis.normal.z * .5 + .5
    );
    tangent = tangent.concat(
      basis.tangent.x * .5 + .5,
      basis.tangent.y * .5 + .5,
      basis.tangent.z * .5 + .5
    );
  }

  textureConf.data = position;
  positionTex(textureConf);

  textureConf.data = normal;
  normalTex(textureConf);

  textureConf.data = tangent;
  tangentTex(textureConf);

  drawSnake();
}

regl.frame(draw);
// draw({
//   time: 0
// });

