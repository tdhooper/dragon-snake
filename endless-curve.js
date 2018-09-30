var GuidedCurvePath = require('./guided-curve');


var EndlessCurve = function(nextCurve) {
  this.distanceOffset = 0;
  this.nextCurve = nextCurve;
  GuidedCurvePath.call(this);
};

EndlessCurve.prototype = Object.create(GuidedCurvePath.prototype);
EndlessCurve.prototype.constructor = EndlessCurve;

var parent = GuidedCurvePath.prototype;

EndlessCurve.prototype.localDistance = function(globalDistance) {
  return globalDistance - this.distanceOffset;
};

EndlessCurve.prototype.getLtoUmapping = function(l) {
  var len = this.getLengthSafe();
  return l / len;
};

EndlessCurve.prototype.fillLength = function(length) {
  var p = this.localDistance(length);

  var len = this.getLengthSafe();

  if (p < len) {
    return;
  }

  var newCurve = this.nextCurve();
  this.add(newCurve);

  this.fillLength(length);
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
    this.curves = this.curves.slice(remove);
    this.guideCurvePath.curves = this.guideCurvePath.curves.slice(remove);
    this.cacheLengths = null;
  }
};

EndlessCurve.prototype.configureStartEnd = function(position, length) {
  this.fillLength(position + length);
  this.removeCurvesBefore(position);

  position = this.localDistance(position);

  var len = this.getLengthSafe();
  this.uStart = position / len;
  this.uLength = length / len;
};

EndlessCurve.prototype.getBasisAt = function(u) {
  var u2 = this.uStart + this.uLength * u;
  return parent.getBasisAt.call(this, u2);
};

module.exports = EndlessCurve;
