var createGraph = require('./create-graph');
var CurveFactory = require('./curve-factory');
var EndlessCurve = require('./endless-curve');

var createCube = require('primitive-cube');
var createSphere = require('primitive-icosphere');
var vec3 = require('gl-matrix').vec3;

function Snake(poly, length, speed, radius, handleScale) {

  // box = createCube(.5, 2.5, .25, 1, 1, 1);
  box = createSphere(1);
  box.positions.map(v => {
    v[0] *= .5;
    v[1] *= 2.;
    v[2] *= .3;
  });
  box.normals.map(v => {
    v[0] /= .5;
    v[1] /= 2.;
    v[2] /= .3;
    vec3.normalize(v, v);
  });

  var N = 750;
  var instances = Array(N).fill().map((_, i) => {
    return i;
  });

  this.texturePoints = 100;
  this.textureConf = {
    width: this.texturePoints,
    height: 1,
    channels: 3,
    mag: 'linear',
    type: 'float'
  };
  this.positionTex = regl.texture(this.textureConf);
  this.normalTex = regl.texture(this.textureConf);
  this.tangentTex = regl.texture(this.textureConf);

  var graph = createGraph(poly);
  var curveFactory = new CurveFactory(graph, radius, handleScale);

  this.curve = new EndlessCurve(curveFactory.nextCurve);

  this.drawSnake = regl({
    frag: `
      precision mediump float;

      varying vec3 vNormal;

      void pR(inout vec2 p, float a) {
          p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
      }

      void main() {
        vec3 n = vNormal;
        pR(n.xz, -.7);
        pR(n.yz, -.5);
        gl_FragColor = vec4(n * .5 + .5, 1);
      }
    `,

    vert: `
      precision mediump float;

      uniform mat4 proj;
      uniform mat4 view;
      uniform mat4 model;
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
        thick = smoothstep(0., .98, tt) - smoothstep(.98, 1., tt);

        vec4 pos = vec4(position * mix(.2, 1., thick), 1);

        float rot = tt * instances * .95;

        pos.z += thick * .8;
        pos.y -= 1.;

        iRotationMat = rotateX(-.4 * thick) * rotateY(rot) * iRotationMat;
        pos = pos * iRotationMat;

        vNormal = (model * (vec4(normal, 0) * iRotationMat)).xyz;

        pos = pos * iPositionMat;
        pos = proj * view * model * pos;

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
      positionTex: this.positionTex,
      normalTex: this.normalTex,
      tangentTex: this.tangentTex,
      instances: N
    }
  });

  this.distance = 0;
  this.len = length;
  this.speed = speed;
}

Snake.prototype.draw = function(context) {

  this.distance = context.time * this.speed;
  this.curve.configureStartEnd(this.distance, this.len);

  var position = [];
  var normal = [];
  var tangent = [];

  for (var i = 0; i < this.texturePoints; i++) {
    var basis = this.curve.getBasisAt(i / this.texturePoints);
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

  this.textureConf.data = position;
  this.positionTex(this.textureConf);

  this.textureConf.data = normal;
  this.normalTex(this.textureConf);

  this.textureConf.data = tangent;
  this.tangentTex(this.textureConf);

  this.drawSnake();
}

module.exports = Snake;
