var createCapsule = require('primitive-capsule');
var vec3 = require('gl-matrix').vec3;

function PolyFrame(poly) {

  capsule = createCapsule(.02, 4.5);

  var positions = [];
  var normals = [];
  var tangents = [];

  for (var i = 0; i < poly.edge.length; i++) {
    var edge = poly.edge[i];
    var a = poly.vertex[edge[0]];
    var b = poly.vertex[edge[1]];

    var position = vec3.lerp([], a, b, .5);
    positions = positions.concat(position);

    var normal = vec3.sub([], a, b);
    vec3.normalize(normal, normal);
    normals = normals.concat(normal);

    var tangent = vec3.normalize([], position);
    tangents = tangents.concat(tangent);
  }

  console.log(tangents.length, normals.length, positions.length)

  console.log(poly);

  this.drawPoly = regl({
    frag: `
      precision mediump float;

      varying vec3 vNormal;

      void main() {
        gl_FragColor = vec4(vNormal * .5 + .5, 1);
        gl_FragColor = vec4(.2,.8,.5,1);
      }
    `,

    vert: `
      precision mediump float;

      uniform mat4 proj;
      uniform mat4 view;
      uniform float time;

      attribute vec3 position;
      attribute vec3 normal;

      attribute vec3 iPosition;
      attribute vec3 iNormal;
      attribute vec3 iTangent;

      varying vec3 vNormal;

      void pR(inout vec2 p, float a) {
          p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
      }

      void main () {

        vNormal = normal;

        mat4 iPositionMat = mat4(
          1, 0, 0, iPosition.x,
          0, 1, 0, iPosition.y,
          0, 0, 1, iPosition.z,
          0, 0, 0, 1
        );

        vec3 n = iNormal;
        vec3 t = iTangent;
        vec3 b = cross(t, n);
        
        mat4 iRotationMat = mat4(
          n.x, t.x, b.x, 0,
          n.y, t.y, b.y, 0,
          n.z, t.z, b.z, 0,
          0, 0, 0, 1
        );

        vNormal = (vec4(normal.zxy, 0) * iRotationMat).xyz;

        vec4 pos = vec4(position.zxy, 1);
        // pR(pos.xz, time);
        pos = pos * iRotationMat;
        pos = pos * iPositionMat;
        pos = proj * view * pos;

        gl_Position = pos;
      }
    `,

    attributes: {
      position: capsule.positions,
      normal: capsule.normals,
      iPosition: {
        buffer: positions,
        divisor: 1
      },
      iNormal: {
        buffer: normals,
        divisor: 1
      },
      iTangent: {
        buffer: tangents,
        divisor: 1
      }
    },

    uniforms: {
      time: regl.context('time')
    },

    elements: capsule.cells,

    instances: poly.edge.length,

    count: capsule.cells.length * 3,
  });
}

PolyFrame.prototype.draw = function(context) {
  this.drawPoly();
}

module.exports = PolyFrame;
