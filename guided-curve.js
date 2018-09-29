
var GuidedCurvePath = function() {
    THREE.CurvePath.call(this);
    this.guideCurvePath = new THREE.CurvePath();
};

GuidedCurvePath.prototype = Object.create(THREE.CurvePath.prototype);
GuidedCurvePath.prototype.constructor = GuidedCurvePath;

GuidedCurvePath.prototype.add = function(curveAndGuide) {
    this.curves.push(curveAndGuide[0]);
    this.guideCurvePath.add(curveAndGuide[1]);
};

GuidedCurvePath.prototype.getBasisAt = function(u) {

    var position = this.getPointAt(u);
    var tangent = this.getTangentAt(u);

    var guidePosition = this.guideCurvePath.getPointAt(u);
    var normal = guidePosition.sub(position);

    normal = normal.cross(tangent).normalize();

    return {
        position: position,
        normal: normal,
        tangent: tangent
    };
};


module.exports = GuidedCurvePath;
