global.THREE = require('three');
require('three/examples/js/controls/TrackballControls');
var Bezier = require('bezier-js');
var polyhedra = require('polyhedra');
var createGraph = require('./create-graph');
var generateStripes = require('./generate-stripes');
var CurveFactory = require('./curve-factory');
var EndlessCurve = require('./endless-curve');
var NormalEndlessCurve = require('./normal-endless-curve');

var regl = require('regl')({
  extensions: [
    'angle_instanced_arrays',
    'OES_texture_float',
    'OES_texture_float_linear'
  ]
});
var mat4 = require('gl-mat4');
var createCube = require('primitive-cube');
var createCamera = require('canvas-orbit-camera');



function CustomSinCurve( scale ) {

  THREE.Curve.call( this );

  this.scale = ( scale === undefined ) ? 1 : scale;

}

CustomSinCurve.prototype = Object.create( THREE.Curve.prototype );
CustomSinCurve.prototype.constructor = CustomSinCurve;

CustomSinCurve.prototype.getPoint = function ( t ) {

  var tz = 0;
  var ty = Math.sin( 2 * Math.PI * t );
  var tx = Math.cos( 2 * Math.PI * t );

  return new THREE.Vector3( tx, ty, tz ).multiplyScalar( this.scale );

};





/* to regl process 


// 1. render a cube
// 2. render X instanced cubes
// 3. convert curve positions to lookup texture
// 4. position cubes from lookup texture
5. convert curve normal and tangent to lookup texture
6. orient cubes from normal/tangent texture
7. offset cubes along rotated normal to form a tight phyllotaxis

*/

var camera = createCamera(regl._gl.canvas);
camera.distance = 60;

box = createCube(.5, 1.5, .25, 1, 1, 1);

var N = 1000;
var instances = Array(N).fill().map((_, i) => {
  return i;
});

var texturePoints = 100;
var textureConf = {
  width: texturePoints,
  height: 1,
  channels: 3,
  mag: 'linear',
  type: 'float'
};
var positionTex = regl.texture(textureConf);
var normalTex = regl.texture(textureConf);
var tangentTex = regl.texture(textureConf);

var poly = polyhedra.platonic.Icosahedron;
var graph = createGraph(poly);
var curveFactory = new CurveFactory(graph, 3);
var curve = new EndlessCurve(curveFactory.nextCurve);

// var curve = new CustomSinCurve( 5 );


var drawTriangle = regl({
  frag: `
    precision mediump float;

    varying vec3 vNormal;

    void main() {
      gl_FragColor = vec4(vNormal * .5 + .5, 1);
    }
  `,

  vert: `
    precision mediump float;

    uniform mat4 proj;
    uniform mat4 view;
    uniform float instances;
    
    uniform sampler2D positionTex;
    uniform sampler2D normalTex;
    uniform sampler2D tangentTex;

    attribute vec3 position;
    attribute vec3 normal;
    attribute float instance;

    varying vec3 vNormal;

    void pR(inout vec2 p, float a) {
        p = cos(a)*p + sin(a)*vec2(p.y, -p.x);
    }

    mat4 rotateX(float a) {
      return mat4(
        1, 0, 0, 0,
        0, cos(a), -sin(a), 0,
        0, sin(a), cos(a), 0,
        0, 0, 0, 1
      );
    }

    mat4 rotateY(float a) {
      return mat4(
        cos(a), 0, sin(a), 0,
        0, 1, 0, 0,
        -sin(a), 0, cos(a), 0,
        0, 0, 0, 1
      );
    }

    mat4 rotateZ(float a) {
      return mat4(
        cos(a), -sin(a), 0, 0,
        sin(a), cos(a), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      );
    }

    void main () {
      float tt = instance / instances;
      
      vec3 iPosition = texture2D(positionTex, vec2(tt, 0)).xyz;
      vec3 iNormal = texture2D(normalTex, vec2(tt, 0)).xyz;
      vec3 iTangent = texture2D(tangentTex, vec2(tt, 0)).xyz;

      vec3 n = iNormal * 2. - 1.;
      vec3 t = iTangent * 2. - 1.;
      vec3 b = cross(t, n);

      mat4 iPositionMat = mat4(
        1, 0, 0, iPosition.x,
        0, 1, 0, iPosition.y,
        0, 0, 1, iPosition.z,
        0, 0, 0, 1
      );
      
      mat4 iRotationMat = mat4(
        n.x, t.x, b.x, 0,
        n.y, t.y, b.y, 0,
        n.z, t.z, b.z, 0,
        0, 0, 0, 1
      );

      vec4 pos = vec4(position, 1);

      float rot = tt * instances;

      pos.z += 1.;

      iRotationMat = rotateX(-.5) * rotateY(rot) * iRotationMat;
      pos = pos * iRotationMat;

      vNormal = (vec4(normal, 0) * iRotationMat).xyz;
  
      pos = pos * iPositionMat;
      pos = proj * view * pos;

      gl_Position = pos;
    }
  `,

  attributes: {
    position: box.positions,
    normal: box.normals,
    instance: {
      buffer: instances,
      divisor: 1
    }
  },

  elements: box.cells,

  instances: N,

  count: box.cells.length * 3,

  uniforms: {
    proj: ({viewportWidth, viewportHeight}) =>
      mat4.perspective([],
        Math.PI / 10,
        viewportWidth / viewportHeight,
        0.01,
        1000),
    view: () => {
      return camera.view();
    },
    positionTex: positionTex,
    normalTex: normalTex,
    tangentTex: tangentTex,
    instances: N
  }
});

var distance = 0;
var len = 30;

function draw(context) {
  camera.tick();

  distance = context.time * 5;
  curve.configureStartEnd(distance, len);

  var curvePoints = [];
  for (var i = 0; i < texturePoints; i++) {
    var point = curve.getPointAt(i / texturePoints);
    curvePoints.push(point);
  }

  var position = curvePoints.reduce(function(acc, v) {
    return acc.concat(
      v.x,
      v.y,
      v.z
    );
  }, []);

  var frames = curve.computeFrenetFrames(texturePoints - 1);

  // console.log(frames);

  var normal = frames.normals.reduce(function(acc, v, i) {
    return acc.concat(
      v.x * .5 + .5,
      v.y * .5 + .5,
      v.z * .5 + .5
    );
  }, []);

  var tangent = frames.tangents.reduce(function(acc, v, i) {
    return acc.concat(
      v.x * .5 + .5,
      v.y * .5 + .5,
      v.z * .5 + .5
    );
  }, []);

  textureConf.data = position;
  positionTex(textureConf);

  textureConf.data = normal;
  normalTex(textureConf);

  textureConf.data = tangent;
  tangentTex(textureConf);

  drawTriangle();
}

regl.frame(draw);
// draw({
//   time: 0
// });



/*
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



var createGeometry = function(radialSegments, segments) {
  var height = 10;
  var size = 1.5;
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

textureCanvas = generateStripes();
var texture = new THREE.Texture(textureCanvas);
texture.needsUpdate = true;

var radialSegments = 16;
var segments = 128;
var geometry = createGeometry(radialSegments, segments);
var bones = createBones(Math.floor(segments / 1));
addBones(geometry, bones);

var mesh = createMesh(geometry, bones, {
  map: texture,
  fog: true
});
scene.add(mesh);


var poly = polyhedra.platonic.Icosahedron;
var graph = createGraph(poly);
var curveFactory = new CurveFactory(graph, 3);
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

*/