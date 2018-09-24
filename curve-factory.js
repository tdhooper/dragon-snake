
var CurveFactory = function(graph, radius) {

  var createCurves = function(plan, startRadius, endRadius) {
    var curves = [];
    var startDepthScalar = startRadius / 13.3;
    var endDepthScalar = endRadius / 13.3
    var a = plan.startVector.clone();
    var b = plan.endVector.clone();
    var ta = plan.startTangent.clone();
    var tb = plan.endTangent.clone();

    var startDepth = plan.startDepth;
    var endDepth = plan.endDepth;

    var originalA = a.clone();
    var a = a.lerp(new THREE.Vector3(), startDepthScalar * startDepth);
    var b = b.lerp(new THREE.Vector3(), endDepthScalar * endDepth);

    curves.push(new THREE.CubicBezierCurve3(
      a,
      a.clone().add(ta.multiplyScalar(startRadius)),
      b.clone().add(tb.multiplyScalar(endRadius)),
      b
    ));

    return curves;
  };

  var lastNode = graph.nodes()[Math.floor(Math.random() * graph.nodes().length)];
  var lastEdge;
  var lastDepth = 1;
  var occupiedFaces = [];

  var getPlan = function() {
    var nodes = graph.successors(lastNode);
    emptyNodes = nodes.filter(function(node) {
      return occupiedFaces.indexOf(node) === -1;
    });
    if (emptyNodes.length) {
      nodes = emptyNodes;
    }

    var node = nodes[Math.floor(Math.random() * nodes.length)];
    var edge = graph.edge(lastNode, node);

    occupiedFaces.push(node);
    occupiedFaces = occupiedFaces.slice(-8);

    if (lastEdge === undefined) {
      lastNode = node;
      lastEdge = edge;
      return getPlan();
    }

    var a = lastEdge.vec.clone();
    var b = edge.vec.clone();
    var ta = lastEdge.tangentOut;
    var tb = edge.tangentIn;

    var loop = (
      a.x == b.x &&
      a.y == b.y &&
      a.z == b.z
    )

    var startDepth = lastDepth;
    var endDepth = startDepth * -1;

    lastNode = node;
    lastEdge = edge;
    lastDepth = endDepth;

    return {
      startDepth: startDepth,
      startVector: a,
      startTangent: ta,
      endDepth: endDepth,
      endVector: b,
      endTangent: tb,
      loop: loop,
    }
  };

  var curveStack = [];
  var guideStack = [];
  var variance = radius * 0.1;
  var lastRadius = radius + variance;
  var flip = 1;

  this.nextCurve = function() {
    if (curveStack.length > 0) {
      var curve = curveStack.pop();
      var guide = guideStack.pop();
      return {
        curve: curve,
        guide: guide
      };
    }

    var plan = getPlan();
    if (!plan.loop) {
      flip *= -1;
    }
    var nextRadius = radius + variance * flip;
    curveStack = curveStack.concat(createCurves(plan, radius, radius));
    guideStack = guideStack.concat(createCurves(plan, lastRadius, nextRadius));
    lastRadius = nextRadius;

    return this.nextCurve();
  }
};

module.exports = CurveFactory;
