global.THREE = require('three');
require('three/examples/js/controls/TrackballControls');
var Bezier = require('bezier-js');
var graphlib = require('graphlib');

var width = window.innerWidth;
var height = window.innerHeight;

var camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
camera.position.z = 30;

var controls = new THREE.TrackballControls(camera);
controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
controls.noZoom = false;
controls.noPan = false;
controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;
controls.keys = [65, 83, 68];

renderer = new THREE.WebGLRenderer({
  width: width,
  height: height,
  scale: 1,
  antialias: true,
  brightness: 2.5,
  alpha: true
});

var CustomFragmentMaterial = function(parameters) {
  THREE.MeshLambertMaterial.call(this);
  this.type = 'ShaderMaterial';
  this.setValues(parameters);
  this.uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.lambert.uniforms);
  this.fragmentShader = parameters.fragmentShader
  this.vertexShader = THREE.ShaderLib.lambert.vertexShader;
}
CustomFragmentMaterial.prototype = Object.create(THREE.MeshLambertMaterial.prototype);
CustomFragmentMaterial.prototype.constructor = CustomFragmentMaterial;

var EndlessCurve = function(nextCurve) {
  this.distanceOffset = 0;
  this.nextCurve = nextCurve;
  THREE.CurvePath.call(this);
};

EndlessCurve.prototype = Object.create(THREE.CurvePath.prototype);
EndlessCurve.prototype.constructor = EndlessCurve;

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
}

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

var createGeometry = function(radialSegments, segments) {
  var height = 10;
  var size = 1;
  var geometry = new THREE.CylinderGeometry(size, size, height, radialSegments, segments, 0);

  var curve = new Bezier(
    0, 0,
    3, 0,
    0, 1,
    0, 1
  );

  var steps = curve.getLUT(segments + 1);
  var ln = geometry.vertices.length;

  geometry.computeBoundingBox();
  var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;

  for (var i = 0; i < ln; i++) {

    var vertex = geometry.vertices[i];

    // Taper with bezier curve

    var yPosition = 1 - Math.abs((geometry.vertices[i].y - geometry.boundingBox.max.y) / height);
    var pos = steps[Math.round(yPosition * segments)];

    vertex.y = height * pos.y;

    vertex.lerp(
      new THREE.Vector3(0, vertex.y, 0),
      1 - pos.x
    );
  }

  geometry.mergeVertices();
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

  return geometry;
};

var createBones = function(num) {
  var bones = [];
  for (var i = 0; i <= num; i++) {
    var bone = new THREE.Bone();
    if (i !== 0) {
      bones[i - 1].add(bone);
    }
    bones.push(bone);
  }
  return bones;
};

var addBones = function(geometry, bones) {
  geometry.computeBoundingBox();

  var ln = geometry.vertices.length;
  var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;

  for (var i = 0; i < ln; i++) {
    var position = Math.abs((geometry.vertices[i].y - geometry.boundingBox.max.y) / height);
    var bonePosition = position * (bones.length - 1);
    var skinIndex = Math.floor(bonePosition);
    var skinWeight = bonePosition % 1;

    // Ease between each bone
    geometry.skinIndices.push(new THREE.Vector4(skinIndex, skinIndex + 1, 0, 0));
    geometry.skinWeights.push(new THREE.Vector4(1 - skinWeight, skinWeight, 0, 0));
  }

  for (var i = 0; i < bones.length; i++) {
    if (i == 0) {
      bones[i].position.y = geometry.boundingBox.max.y;
    } else {
      bones[i].position.y = (height / (bones.length - 1)) * -1;
    }
  }
};

var createMesh = function(geometry, bones, materialProps) {
  materialProps.skinning = true;
  materialProps.shininess = 5;
  var material = new THREE.MeshPhongMaterial(materialProps);
  var mesh = new THREE.SkinnedMesh(geometry, material);

  var skeleton = new THREE.Skeleton(bones);
  var rootBone = skeleton.bones[0];
  mesh.add(rootBone);
  mesh.bind(skeleton);

  skeleton.calculateInverses();

  return mesh;
};

var positionBones = function(bones, curve, distance, len) {
  for (var i = 0; i < bones.length; i++) {
    var pos = i / (bones.length - 1);
    pos = 1 - pos;
    var curvePos = distance + (pos * -len);
    var point = curve.getPointAtLength(curvePos);
    var tangent = curve.getTangentAtLength(curvePos);
    var guidePoint = curve.getGuidePointAtLength(curvePos);

    var tangentPoint = point.clone().sub(tangent);
    scene.localToWorld(point);
    scene.localToWorld(guidePoint);
    scene.localToWorld(tangentPoint);
    tangent = point.clone().sub(tangentPoint).normalize();

    bones[i].parent.updateMatrixWorld();
    var pointLocal = bones[i].parent.worldToLocal(point.clone());
    bones[i].position.copy(pointLocal);

    var tAxis = tangent.clone();
    var nAxis = new THREE.Vector3().subVectors(point, guidePoint).normalize();
    nAxis.cross(tAxis).cross(tAxis).normalize();
    nVec = new THREE.Vector3().addVectors(point, nAxis);
    tVec = new THREE.Vector3().subVectors(point, tAxis);

    tVecLocal = bones[i].parent.worldToLocal(tVec);
    tAxisLocal = tVec.sub(bones[i].position);
    nVecLocal = bones[i].parent.worldToLocal(nVec);

    bones[i].up.copy(tAxisLocal);
    bones[i].lookAt(nVecLocal);
  }

  curve.removeCurvesBefore(distance - len);
};

function generateTexture() {
  var w = 1;
  var h = Math.pow(2, 10);

  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  var context = canvas.getContext('2d');
  var image = context.getImageData(0, 0, w, h);

  var col = 0,
    x = 0,
    y = 0;
  var stripes = Math.pow(2, 6);

  for (var i = 0, j = 0, l = image.data.length; i < l; i += 4, j++) {

    x = j % w;
    y = x == 0 ? y + 1 : y;

    col = ((y / h) * stripes) % 1;
    col = col >= 0.5 ? 0 : 255;

    image.data[i] = col;
    image.data[i + 1] = col;
    image.data[i + 2] = col;
    image.data[i + 3] = 255;

  }

  context.putImageData(image, 0, 0);

  return canvas;
}

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

var sceneParent = new THREE.Scene();
sceneParent.fog = new THREE.Fog('#ea2585', 20, 50);

var scene = new THREE.Object3D();
sceneParent.add(scene);

var light = new THREE.AmbientLight('#999'); // soft white light
sceneParent.add(light);

var lightB = new THREE.PointLight('#fff', 1.5);
lightB.position.set(0, 0, 1000);
sceneParent.add(lightB);

textureCanvas = generateTexture();
var texture = new THREE.Texture(textureCanvas);
texture.needsUpdate = true;

var fragmentShader = THREE.ShaderLib.lambert.fragmentShader;
fragmentShader = fragmentShader.replace(
  /outgoingLight \+= diffuseColor\.rgb \* vLightFront \+ emissive;/g,
  'float lf = (vLightFront.r - 0.6) * 2.0;' +
  'outgoingLight = mix(diffuseColor.rgb, emissive, lf);'
);
var materialA = new CustomFragmentMaterial({
  color: '#c36ab5',
  emissive: '#81d2fe',
  fragmentShader: fragmentShader
});

var wireframeMaterial = new THREE.MeshLambertMaterial({
  wireframe: true,
});

var radialSegments = 16;
var segments = 128;
var geometry = createGeometry(radialSegments, segments);
var bones = createBones(Math.floor(segments / 1));
addBones(geometry, bones);
var mesh = createMesh(geometry, bones, {
  map: texture,
  fog: true
    // color: colours.purple,
    // specular: colours.pink
});
scene.add(mesh);
// var guides = createGuides(10);
// scene.add(guides[0]);

var graph = new graphlib.Graph();

var getFaceEdge = function(face, arrangement) {
  return [
    face[arrangement[0]],
    face[arrangement[1]]
  ];
};

var faceEdgeHash = function(faceEdge) {
  return faceEdge.slice().sort().join();
};

var adjacentFaces = function(faceA, faceB) {
  var arrangements = [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'a']
  ]
  var faceEdge;
  arrangements.some(function(arrangementA) {
    var faceEdgeA = getFaceEdge(faceA, arrangementA);
    return arrangements.some(function(arrangementB) {
      var faceEdgeB = getFaceEdge(faceB, arrangementB);
      if (faceEdgeHash(faceEdgeA) == faceEdgeHash(faceEdgeB)) {
        faceEdge = faceEdgeA;
        return true;
      }
    });
  });
  return faceEdge;
};

var createEdge = function(a, b, faceEdge) {
  var vertA = ico.vertices[faceEdge[0]];
  var vertB = ico.vertices[faceEdge[1]];
  var vec = new THREE.Vector3().lerpVectors(
    vertA,
    vertB,
    0.5
  )
  var axis = vec.clone().normalize();

  var tangentIn = new THREE.Vector3()
    .subVectors(vertA, vec)
    .applyAxisAngle(axis, Math.PI * -0.5)
    .normalize();

  var tangentOut = tangentIn.clone().applyAxisAngle(axis, Math.PI)

  graph.setEdge(a, b, {
    vec: vec,
    tangentOut: tangentOut,
    tangentIn: tangentIn
  });
};

ico.faces.forEach(function(faceA, a) {
  var node = graph.setNode(a);

  ico.faces.forEach(function(faceB, b) {
    if (a == b) {
      return;
    }
    var faceEdge = adjacentFaces(faceA, faceB);
    if (faceEdge) {
      createEdge(a, b, faceEdge);
    }
  });
});

// console.log(graph.edges().length);
// graph.edges().forEach(function(edge) {
//     console.log(graph.edge(edge));
// });

var CurveFactory = function(radius) {

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

var curveFactory = new CurveFactory(3);
var curve = new NormalEndlessCurve(curveFactory.nextCurve);

function render() {
  renderer.render(sceneParent, camera);
}

var t = 0;
var origin = new THREE.Vector3();

function animate() {
  render();

  controls.update();
  t += 1;
  var len = 60;
  var distance = (t * 0.1) + len;
  positionBones(bones, curve, distance, len);

  var tumble = t * 0.001;
  scene.rotation.y = Math.sin(tumble) * Math.PI;
  scene.rotation.z = Math.cos(tumble) * Math.PI;

  var distance = camera.position.distanceTo(origin);
  sceneParent.fog.far = distance + 20;
  sceneParent.fog.near = distance - 10;

  requestAnimationFrame(animate);
}

function onWindowResize() {

  width = window.innerWidth;
  height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function storeControls() {
  var state = JSON.stringify({
    target: controls.target.toArray(),
    position: controls.object.position.toArray(),
    up: controls.object.up.toArray()
  })
  sessionStorage.setItem('icosnakecontrols', state);
}

function restoreControls() {
  var state = sessionStorage.getItem('icosnakecontrols');
  if (!state) {
    state = '{"target":[0,0,0],"position":[-32.345021059832405,-8.514762627234681,-4.795119703834518],"up":[0.35257877628481815,-0.5356375416468837,0.7673204223088874]}';
  }
  state = JSON.parse(state);
  controls.target0.fromArray(state.target);
  controls.position0.fromArray(state.position);
  controls.up0.fromArray(state.up);
  controls.reset();
}

controls.addEventListener('change', function() {
  render();
  storeControls();
});

window.addEventListener('resize', onWindowResize, false);
restoreControls()
animate();