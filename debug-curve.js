
function DebugCurve(curve) {

  this.curve = curve;

  this.drawCurve = regl({
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
        gl_FragColor = vec4(spectrum(id) * .5 + .5, 1);
      }
    `,

    vert: `
      precision mediump float;

      uniform mat4 proj;
      uniform mat4 view;

      attribute vec3 position;

      void main () {
        vec4 pos = vec4(position, 1);
        pos = proj * view * pos;
        gl_Position = pos;
      }
    `,

    primitive: 'lines',
    lineWidth: 1,

    attributes: {
      position: function(props, context) {
        return context.points;
      }
    },

    count: function(props, context) {
      return context.points.length / 3;
    },

    uniforms: {
      id: function(props, context) {
        return context.id;
      }
    }
  });
}

DebugCurve.prototype.hashString = function(str) {
  var hash = 0, i;
  for (i in str) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

DebugCurve.prototype.curveToId = function(curve) {
  var id = ['v0', 'v1', 'v2', 'v3'].reduce((acc, attr) => {
    return acc += curve[attr].toArray().toString()
  }, '');
  id = this.hashString(id);
  id = (id % 255) / 255;
  return id;
}

DebugCurve.prototype.curveToPoints = function(curve, lines) {
  var points = curve.getPoints(lines).reduce(function(acc, point, i, arr) {
    acc = acc.concat(point.x, point.y, point.z);
    if (i !== 0 && i !== arr.length - 1) {
      acc = acc.concat(point.x, point.y, point.z);
    }
    return acc;
  }, [])
  return points;
}

DebugCurve.prototype.draw = function(context) {

  // return;

  var lines = 50;

  this.curve.curves.forEach(curve => {
    this.drawCurve({
      points: this.curveToPoints(curve, lines),
      id: this.curveToId(curve)
    });
  });

  this.curve.guideCurvePath.curves.forEach(curve => {
    this.drawCurve({
      points: this.curveToPoints(curve, lines),
      id: this.curveToId(curve)
    });
  });
}

module.exports = DebugCurve;
