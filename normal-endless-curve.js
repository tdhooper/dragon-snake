var EndlessCurve = require('./endless-curve');


var NormalEndlessCurve = function(nextSection) {
  this.guides = [];
  EndlessCurve.call(this, nextSection);
};

NormalEndlessCurve.prototype = Object.create(EndlessCurve.prototype);
NormalEndlessCurve.prototype.constructor = NormalEndlessCurve;

NormalEndlessCurve.prototype.add = function(section) {
  this.guides.push(section.guide);
  EndlessCurve.prototype.add.call(this, section.curve);
};

NormalEndlessCurve.prototype.slice = function(index) {
  this.guides = this.guides.slice(index);
  EndlessCurve.prototype.slice.call(this, index);
};

NormalEndlessCurve.prototype.getGuidePointAtLength = function(position) {
  var l = this.localDistance(position);
  var u = this.getLtoUmapping(l);
  return this.getGuidePointAt(u);
};

NormalEndlessCurve.prototype.getGuidePointAt = function(u) {
  var t = this.getUtoTmapping(u);
  return this.getGuidePoint(t);
};

NormalEndlessCurve.prototype.getGuidePoint = function(t) {
  var d = t * this.getLength();
  var curveLengths = this.getCurveLengths();
  var i = 0,
    diff, curve, guide;

  while (i < curveLengths.length) {

    if (curveLengths[i] >= d) {

      diff = curveLengths[i] - d;
      curve = this.curves[i];

      var u = 1 - diff / curve.getLength();

      guide = this.guides[i];
      return guide.getPointAt(u);
    }

    i++;
  }

  return null;
};

module.exports = NormalEndlessCurve;
