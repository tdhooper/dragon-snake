var EndlessCurve = function(nextCurve) {
  this.distanceOffset = 0;
  this.nextCurve = nextCurve;
  THREE.CurvePath.call(this);
};

EndlessCurve.prototype = Object.create(THREE.CurvePath.prototype);
EndlessCurve.prototype.constructor = EndlessCurve;

var parent = THREE.CurvePath.prototype;

EndlessCurve.prototype.localDistance = function(globalDistance) {
  return globalDistance - this.distanceOffset;
};

EndlessCurve.prototype.getLtoUmapping = function(l) {
  var len = this.getLengthSafe();
  return l / len;
};

EndlessCurve.prototype.getPointAtLength = function(position) {
  var p = this.localDistance(position);

  var len = this.getLengthSafe();

  if (p < len) {
    var u = this.getLtoUmapping(p);
    var point = this.getPointAt(u);
    return point;
  }

  var newCurve = this.nextCurve();
  this.add(newCurve);

  return this.getPointAtLength(position);
};

EndlessCurve.prototype.getTangentAtLength = function(position) {
  var p = this.localDistance(position);
  var len = this.getLengthSafe();
  var t = p / len;
  var tangent = this.getTangentAt(t);
  return tangent;
};

EndlessCurve.prototype.getLengthSafe = function() {
  if (!this.curves.length) {
    return 0;
  }
  return this.getLength();
};

EndlessCurve.prototype.removeCurvesBefore = function(position) {
  var p = this.localDistance(position);

  var lengths = this.getCurveLengths();
  var remove = 0;
  var distanceOffset = 0;
  for (var i = 0; i < lengths.length; i++) {
    if (p < lengths[i]) {
      break;
    }
    distanceOffset = lengths[i];
    remove += 1;
  }
  if (remove) {
    this.distanceOffset += distanceOffset;
    this.slice(remove);
    this.cacheLengths = null;
  }
};

EndlessCurve.prototype.slice = function(index) {
  this.curves = this.curves.slice(index);
};

// Force computeFrenetFrames to use the configured segment
EndlessCurve.prototype.configureFrenetFrames = function(position, length) {
  this.getPointAtLength(position + length);
  var pos = this.localDistance(position);
  position = pos;
  var len = this.getLengthSafe();
  this.frenetFramesStart = position / len;
  this.frenetFramesLength = length / len;
};

EndlessCurve.prototype.getTangentAt = function(u) {
  var u2 = this.frenetFramesStart + this.frenetFramesLength * u;
  return parent.getTangentAt.call(this, u2);
};

module.exports = EndlessCurve;
