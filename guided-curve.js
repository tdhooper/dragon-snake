
var GuidedCurveDecorator = function(Cls) {

  var Decorated = function() {
    var curveArgs = arguments[0];
    Cls.apply(this, curveArgs);

    var guideCurveArgs = arguments[1];
    this.guideCurve = new (Function.prototype.bind.apply(Cls, guideCurveArgs));
  };

  Decorated.prototype = Object.create(Cls.prototype);
  Decorated.prototype.constructor = Cls;

  return Decorated;
};


module.exports = GuidedCurveDecorator;
