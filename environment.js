var fromThree = require('./geometry').fromThree;
var mat4 = require('gl-matrix').mat4;


function Environment() {

  var geometry = this.createGeometry();
  var positions = [];

  var w = 19;
  var h = 18;
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

  // var model = mat4.fromXRotation([], Math.PI / -10);
  var model = mat4.fromTranslation([], [0,0,-15]);
  
  // mat4.translate(model, model, [0,10,-15]);

  this.drawHexagons = regl({
    frag: `
      precision mediump float;

      uniform float id;
      varying vec3 vNormal;

      void main() {
        float c = .1;
        // col += pow(dot(vec3(1,0,1), vNormal) * .5 + .5, 5.) * vec3(0,.5,1);
        // col += pow(dot(vec3(-1,0,1), vNormal) * .5 + .5, 5.) * vec3(0,1,.5);
        c += pow(dot(vec3(-1,1,1), vNormal) * .5 + .5, 5.) * .05;
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

      void main () {
        vNormal = normal;

        vec4 pos = vec4(position.zxy, 1);
        // pos.x *= .75;
        pos.xyz += iPosition;

        // pos.xy *= 4.;

        float r;

        r = length(pos.xy);
        pos.xy *= mix(1., r * .2, .5);

        r = length(pos.xy);
        r = pow(r, .5) * 5.;
        r = (sin(r - time * 3.) * .5 + .5);
        r *= .2;
        r += 1.;
        pos.xy *= r * 4.;

        float d = length(iPosition.xy);
        d = pow(d, .5);
        d = (sin(d * 12. - time * 2.) * .5 + .5);
        d *= .2;
        pos.z -= d * 60.;

        pos = proj * view * model * pos;
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

    // cull: {
    //   enable: true,
    //   face: 'back'
    // },
  });
}

Environment.prototype.createGeometry = function() {
  var segments = 3;
  var faces = 6;

  var tGeometry = new THREE.CylinderGeometry(1, 1, 100, faces, segments);

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
