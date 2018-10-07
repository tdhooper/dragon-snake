var fromThree = require('./geometry').fromThree;
var mat4 = require('gl-matrix').mat4;


function Environment() {

  var geometry = this.createGeometry();
  var positions = [];

  var w = 11;
  var h = 14;
  var scaleW = 1.73;
  var scaleH = scaleW * .865;
  var offset = scaleW / 2;
  for (var x = 0; x < w; x++) {
    for (var y = 0; y < h; y++) {
      var v = [
        (y - (h / 2)) * scaleH,
        (x - (w / 2)) * scaleW + offset * (y % 2),
        0
      ];
      positions.push(v);
    }
  }

  // var model = mat4.fromZRotation([], Math.PI/2);
  // var model = mat4.fromTranslation([], [0,0,0]);
  var model = mat4.identity([]);

  mat4.rotateZ(model, model, Math.PI / 2);

  mat4.rotateY(model, model, -.5);
  mat4.rotateX(model, model, Math.PI / 2);
  mat4.translate(model, model, [20,0,0]);

  this.drawHexagons = regl({
    frag: `
      precision mediump float;

      uniform float id;
      varying vec3 vNormal;
      varying vec3 vPos;

      void main() {
        if (vPos.z > 0.) {
          // discard;
          // return;
        }
        float c = .1;
        // col += pow(dot(vec3(1,0,1), vNormal) * .5 + .5, 5.) * vec3(0,.5,1);
        // col += pow(dot(vec3(-1,0,1), vNormal) * .5 + .5, 5.) * vec3(0,1,.5);
        c += pow(dot(vec3(-.3,1,.5), vNormal) * .5 + .5, 5.) * .1;
        vec3 col = mix(vec3(50,30,90)/255./2., vec3(1,0,2), c);
        col = vec3(c);
        gl_FragColor = vec4(col, 1);
      }
    `,

    vert: `
      precision mediump float;

      uniform mat4 proj;
      uniform mat4 view;
      uniform mat4 model;
      uniform float time;

      attribute vec3 position;
      attribute vec3 normal;

      attribute vec3 iPosition;

      varying vec3 vNormal;
      varying vec3 vPos;

      const float PI = 3.141592653589793;

      void pR(inout vec2 p, float a) {
          p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
      }

      void main () {
        vNormal = normal;

        vec4 pos = vec4(position.zxy, 1);
        // pos.x *= .75;
        pos.xyz += iPosition;

        float r;

        r = length(pos.xy);
        pos.xy *= mix(1., r * .2, .25);

        r = length(pos.xy);
        r = pow(r, .5) * 5.;
        r = (sin(r - time * 1.) * .5 + .5);
        r *= .15;
        r += 1.;
        pos.xy *= r;

        // pos.xy *= .05;

        float d = length(iPosition.xy);
        d = pow(d, .5);
        d = (sin(d * 12. - time * 3.) * .5 + .5);
        d *= .2;
        pos.z -= d * 30.;

        pR(pos.xy, time/3.);

        pos.xy *= .1;
        pos.xy += vec2(PI / 2.,0);
        pos.z -= 30.;

        vec3 spos = vec3(
          pos.z * sin(pos.x) * cos(pos.y),
          pos.z * sin(pos.x) * sin(pos.y),
          pos.z * cos(pos.x)
        );

        pos = vec4(spos, 1.);
        pos = model * pos;

        vPos = pos.xyz;

        pos = proj * view * pos;

        gl_Position = pos;
      }
    `,

    attributes: {
      position: geometry.positions,
      normal: geometry.normals,
      iPosition: {
        buffer: positions,
        divisor: 1
      },
    },

    uniforms: {
      model: model,
      time: regl.context('time')
    },

    elements: geometry.cells,

    count: geometry.cells.length * 3,

    instances: positions.length,

    cull: {
      enable: true,
      face: 'back'
    },
  });
}

Environment.prototype.createGeometry = function() {
  var segments = 3;
  var faces = 6;

  var tGeometry = new THREE.CylinderGeometry(1, 1, 50, faces, segments);

  tGeometry.vertices.forEach((v, i) => {
    var ring = Math.floor(i / faces);
    if (ring == 0) {
      v.x *= .33;
      v.z *= .33;
      v.y = 0;
    }
    if (ring == 1) {
      v.x *= .66;
      v.z *= .66;
      v.y = .1;
    }
    if (ring == 2) {
      v.y = 0;
    }
    if (i == faces * (segments + 1)) {
      v.y = .1;
    }
  });

  tGeometry.computeFlatVertexNormals();
  var geometry = fromThree(tGeometry);
  return geometry;
}

Environment.prototype.draw = function() {
  this.drawHexagons();
}

module.exports = Environment;
