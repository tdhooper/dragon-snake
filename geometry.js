
function fromThreeGeometry(tGeom) {
  var positions = [];
  var normals = [];
  var cells = [];
  tGeom.faces.forEach((face, i) => {
    positions.push(tGeom.vertices[face.a].toArray());
    positions.push(tGeom.vertices[face.b].toArray());
    positions.push(tGeom.vertices[face.c].toArray());
    normals.push(face.vertexNormals[0].toArray());
    normals.push(face.vertexNormals[1].toArray());
    normals.push(face.vertexNormals[2].toArray());
    cells.push([
      i * 3,
      i * 3 + 1,
      i * 3 + 2
    ]);
  });
  return {
    positions: positions,
    normals: normals,
    cells: cells
  };
}

module.exports = {
  fromThree: fromThreeGeometry
};
