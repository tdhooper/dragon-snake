var fromThree = require('./geometry').fromThree;
var mat4 = require('gl-matrix').mat4;


function Environment() {

  var geometry = this.createGeometry();
  var positions = [];

  var w = 20;
  var h = 30;
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
  var model = mat4.fromTranslation([], [0,0,0]);

  // mat4.translate(model, model, [0,10,-15]);

  this.drawHexagons = regl({
    frag: `
      precision mediump float;

      uniform float time;

      uniform float id;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vD;
      varying vec3 viPosition;

      float rand(float seed){
        return fract(mod(seed, 1.) * 43758.5453);
      }

      void main() {
        float c = .1;
        // col += pow(dot(vec3(1,0,1), vNormal) * .5 + .5, 5.) * vec3(0,.5,1);
        // col += pow(dot(vec3(-1,0,1), vNormal) * .5 + .5, 5.) * vec3(0,1,.5);
        c += pow(dot(vec3(.5,1,-.5), vNormal) * .5 + .5, 5.) * .1;
        vec3 col = mix(vec3(50,30,90)/255./2., vec3(1,0,2), c);
        col = vec3(c);

        float r = abs(viPosition.y);
        float rr = floor(r * 10.) / 10.;
        float ring = floor(rand(rr) * 4. - time);
        ring = mod(ring, 4.);


        // float ring2 = floor(vD * 5. - time * 2.);
        // ring = mod(ring2, 4.);

        if (ring > 0.) {
          ring += 1.;
        }
        if (vUv.y == ring && r > .4) {
          // col = vec3(1) * c * 5.;
          col = vec3(.2,.8,.5) * c * 5.;
        }
        // col = vec3(1.) - col;
        // col.rg = vUv/5.;

        // col = vec3(r/10.);

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
      attribute vec2 uv;

      attribute vec3 iPosition;

      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vD;
      varying vec3 viPosition;

      const float PI = 3.141592653589793;

      void main () {
        vNormal = normal;
        vUv = uv;
        viPosition = iPosition;

        vec4 pos = vec4(position.zxy, 1);
        // pos.x *= .75;
        pos.xyz += iPosition;

        // pos.xy *= 4.;

        float r;

        r = length(pos.xy);
        // pos.xy /= mix(1., r * .2, .3);

        r = pos.x;
        r = pow(r, .5) * 5.;
        r = (sin(r - time * 2.5) * .5 + .5);
        r *= .1;
        r += 1.;
        pos.x *= r * 2.;

        float d = iPosition.x;
        d = pow(d, .5);
        d = (sin(d * 30. - time * 1.) * .5 + .5);
        d += (sin(d * 12. - time * 2.) * .5 + .5) * .5;
        d *= .2;
        // pos.z -= d * 30.;

        pos.z -= 20.;
        pos.y /= ${w}. * ${scaleW} / (PI * 2.);
        pos.x -= (${h}. * ${scaleH}) / 2.;
        pos.x *= 10.;
        pos.x += 40.;

        pos.xyz = vec3(
          pos.z * cos(pos.y),
          pos.z * sin(pos.y),
          pos.x
        );

        vD = d;

        pos = proj * view * model * pos;
        gl_Position = pos;
      }
    `,

    attributes: {
      position: geometry.positions,
      normal: geometry.normals,
      uv: geometry.uvs,
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
  var segments = 4;
  var faces = 6;

  var tGeometry = new THREE.CylinderGeometry(1, 1, 50, faces, segments);

  tGeometry.vertices.forEach((v, i) => {
    if (i == faces * (segments + 1)) {
      v.y = -.05;
    }
    var r = 0;
    var ring = Math.floor(i / faces);
    if (ring == r++) {
      v.x *= .2;
      v.z *= .2;
      v.y = -.05;
    }
    if (ring == r++) {
      v.x *= .75;
      v.z *= .75;
      v.y = .1;
    }
    if (ring == r++) {
      v.x *= .9;
      v.z *= .9;
      v.y = .1;
    }
    if (ring == r++) {
      v.y = 0;
    }
  });

  tGeometry.computeFlatVertexNormals();
  var geometry = fromThree(tGeometry);

  geometry.uvs = geometry.positions.map((_, i) => {
    var ring = Math.floor(i / faces) % segments;
    var face = Math.floor(i / (segments * faces));
    var u = face;
    var v = ring + 1;
    if (i >= segments * faces * 6) {
      u = Math.floor((i - segments * faces * 6) / 3);
      v = 0;
    }
    // u /= faces - 1;
    // v /= segments - 1;
    return [0, v];
  });

  return geometry;
}

Environment.prototype.draw = function() {
  this.drawHexagons();
}

module.exports = Environment;
