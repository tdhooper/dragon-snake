var createCapsule = require('primitive-capsule');
var mat4 = require('gl-matrix').mat4;
var idString = require('./id-string');


function DebugPoint() {

  var sphere = createCapsule(.5, 0);

  this.drawPoint = regl({
    frag: `
      precision mediump float;

      uniform float id;

      vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
        return a + b*cos( 6.28318*(c*t+d) );
      }

      vec3 spectrum(float n) {
        return pal( n, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.33,0.67) );
      }

      void main() {
        gl_FragColor = vec4(spectrum(id), 1);
      }
    `,

    vert: `
      precision mediump float;

      uniform mat4 proj;
      uniform mat4 view;
      uniform mat4 model;
      uniform mat4 iModel;

      attribute vec3 position;
      attribute vec3 normal;

      void main () {
        vec4 pos = vec4(position.zxy, 1);
        pos = proj * view * model * iModel * pos;
        gl_Position = pos;
      }
    `,

    attributes: {
      position: sphere.positions,
      normal: sphere.normals,
    },

    uniforms: {
      id: function(props, context) {
        return context.id;
      },
      iModel: function(props, context) {
        var m = mat4.fromTranslation([], context.position);
        return m;
      }
    },

    elements: sphere.cells,

    count: sphere.cells.length * 3,
  });
}

DebugPoint.prototype.draw = function(position, id) {
  if (id == undefined) {
    id = idString(position.toString());
  }
  this.drawPoint({
    position: position,
    id: id
  });
}

module.exports = DebugPoint;
