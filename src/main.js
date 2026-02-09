import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);

function createScene() {
  const scene = new Scene(engine);
  scene.clearColor = new Color3(0.05, 0.05, 0.15).toColor4(1);

  // Camera - orbits around the origin, controllable with mouse
  const camera = new ArcRotateCamera(
    "camera",
    Math.PI / 4,
    Math.PI / 3,
    10,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 30;

  // Lighting
  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.9;

  // Ground plane
  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 10, height: 10 },
    scene
  );
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.2, 0.6, 0.3);
  ground.material = groundMat;

  // Sample objects
  const box = MeshBuilder.CreateBox("box", { size: 1.5 }, scene);
  box.position.y = 0.75;
  box.position.x = -2;
  const boxMat = new StandardMaterial("boxMat", scene);
  boxMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
  box.material = boxMat;

  const sphere = MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 1.5, segments: 32 },
    scene
  );
  sphere.position.y = 0.75;
  sphere.position.x = 2;
  const sphereMat = new StandardMaterial("sphereMat", scene);
  sphereMat.diffuseColor = new Color3(0.2, 0.4, 0.8);
  sphere.material = sphereMat;

  const cylinder = MeshBuilder.CreateCylinder(
    "cylinder",
    { diameter: 1, height: 2, tessellation: 24 },
    scene
  );
  cylinder.position.y = 1;
  cylinder.position.z = 2;
  const cylinderMat = new StandardMaterial("cylinderMat", scene);
  cylinderMat.diffuseColor = new Color3(0.9, 0.7, 0.1);
  cylinder.material = cylinderMat;

  return scene;
}

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
