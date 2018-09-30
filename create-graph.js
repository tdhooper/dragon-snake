var graphlib = require('graphlib');

module.exports = function(poly) {
  var graph = new graphlib.Graph();

  var addEdge = function(a, b) {
    var vertA = new THREE.Vector3().fromArray(poly.vertex[a]);
    var vertB = new THREE.Vector3().fromArray(poly.vertex[b]);

    var vec = new THREE.Vector3().lerpVectors(
      vertA,
      vertB,
      0.5
    );
    var axis = vec.clone().normalize();

    var tangentIn = new THREE.Vector3()
      .subVectors(vertA, vec)
      .normalize();

    var tangentOut = tangentIn.clone().applyAxisAngle(axis, Math.PI);

    graph.setEdge(a, b, {
      vec: vec,
      tangentOut: tangentOut,
      tangentIn: tangentIn
    });
  };

  poly.edge.forEach(function(edge) {
    addEdge(edge[1], edge[0]);
    addEdge(edge[0], edge[1]);
  });

  return graph;
};
