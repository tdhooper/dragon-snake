var shuffle = require('shuffle-array');


var CurveFactory = function(graph, radius, handleScale) {

  var addOccupied = function(occupied, node) {
    occupied = occupied.slice(-8);
    occupied.push(node);
    return occupied;
  };

  var filterEmpty = function(occupied, node) {
    return occupied.indexOf(node) === -1;
  };

  var getDepth = function(node, occupied, depth, iterations) {
    depth += 1;
    if (iterations === 0) {
      return depth;
    }
    var nextNodes = graph.successors(node);
    nextNodes = nextNodes.filter(
      filterEmpty.bind(this, occupied)
    );
    var nextDepth = 0;
    for (var i = 0; i < nextNodes.length; i++) {
      var nextNode = nextNodes[i];
      var nextOccupied = addOccupied(occupied, nextNode);
      nextDepth = Math.max(
        nextDepth,
        getDepth(nextNode, nextOccupied, depth, iterations-1)
      );
    }
    return depth + nextDepth;
  };

  var getNextNode = function(node, occupied) {
    var nextNodes = graph.successors(node);
    nextNodes = nextNodes.filter(
      filterEmpty.bind(this, occupied)
    );
    nextNodes = shuffle(nextNodes);
    for (var i = 0; i < nextNodes.length; i++) {
      var nextNode = nextNodes[i];
      var nextOccupied = addOccupied(occupied, nextNode);
      if (getDepth(nextNode, nextOccupied, 0, 3) > 2) {
        return nextNode;
      }
    }
  };

  var createCurve = function(plan, startRadius, endRadius) {
    var curves = [];
    var startDepthScalar = startRadius * handleScale;
    var endDepthScalar = endRadius * handleScale;
    var a = plan.startVector.clone();
    var b = plan.endVector.clone();
    var ta = plan.startTangent.clone();
    var tb = plan.endTangent.clone();

    var startDepth = plan.startDepth;
    var endDepth = plan.endDepth;

    var originalA = a.clone();
    a = a.lerp(new THREE.Vector3(), startDepthScalar * startDepth);
    b = b.lerp(new THREE.Vector3(), endDepthScalar * endDepth);

    return new THREE.CubicBezierCurve3(
      a,
      a.clone().add(ta.multiplyScalar(startRadius)),
      b.clone().add(tb.multiplyScalar(endRadius)),
      b
    );
  };

  var lastNode = graph.nodes()[Math.floor(Math.random() * graph.nodes().length)];
  var lastEdge;
  var lastDepth = 1;
  var occupiedFaces = [];

  var getPlan = function() {

    var node = getNextNode(lastNode, occupiedFaces);
    var edge = graph.edge(lastNode, node);

    occupiedFaces = addOccupied(occupiedFaces, node);

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
    );

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
    };
  };

  var curveStack = [];
  var variance = radius * 0.1;
  var lastRadius = radius + variance;
  var flip = 1;

  this.nextCurve = function() {
    if (curveStack.length > 0) {
      return curveStack.pop();
    }

    var plan = getPlan();
    if (!plan.loop) {
      flip *= -1;
    }
    var nextRadius = radius + variance * flip;
    curveStack.push([
      createCurve(plan, radius, radius),
      createCurve(plan, lastRadius, nextRadius), // guide curve
    ]);
    lastRadius = nextRadius;

    return this.nextCurve();
  };
};

module.exports = CurveFactory;
