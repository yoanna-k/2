import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const pointsUI = document.querySelector("#points");
const startButton = document.querySelector("#startButton");
const startPage = document.querySelector("#startPage");
const gameUI = document.querySelector("#ui");
let points = 5;
let canJump = false;
let gameOver = false;
const speed = 8;

const random = (max, min) => Math.floor(Math.random() * (max - min + 1) + min);

const moveObstacles = (arr, speed, maxX, minX, maxZ, minZ) => {
  arr.forEach(element => {
    element.body.position.z += speed;
    if (element.body.position.z > camera.position.z) {
      element.body.position.x = random(maxX, minX);
      element.body.position.z = random(maxZ, minZ);
    }
    element.mesh.position.copy(element.body.position);
    element.mesh.quaternion.copy(element.body.quaternion);
  });
};

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 4.5;
camera.position.y = 1.5;

const listener = new THREE.AudioListener();
camera.add(listener);

const powerupSound = new THREE.Audio(listener);
const powerdownSound = new THREE.Audio(listener);
const music = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('assets/powerup.mp3', function(buffer) {
  powerupSound.setBuffer(buffer);
  powerupSound.setVolume(0.5);
});

audioLoader.load('assets/powerdown.mp3', function(buffer) {
  powerdownSound.setBuffer(buffer);
  powerdownSound.setVolume(0.7);
});

audioLoader.load('assets/music.mp3', function(buffer) {
  music.setBuffer(buffer);
  music.setLoop(true);
	music.setVolume(0.15);
	music.play();
});

const scene = new THREE.Scene();
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});
const cannonDebugger = new CannonDebugger(scene, world, {
  color: "#AEE2FF",
  scale: 1
});

const backloader = new THREE.TextureLoader();
const backgroundTexture = backloader.load('assets/bg.jpg');
scene.background = backgroundTexture;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const groundBody = new CANNON.Body({
  shape: new CANNON.Box(new CANNON.Vec3(15, 0.5, 15)),
  collisionFilterGroup: 1,
  collisionFilterMask: 1
});
groundBody.position.y = -1;
world.addBody(groundBody);

const textureLoader = new THREE.TextureLoader();

const groundTexture = textureLoader.load('assets/tiles.jpg');

groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(4, 4);

const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundTexture
});

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(30, 1, 30),
  groundMaterial
);
ground.position.y = -1;
scene.add(ground);

const playerBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4)),
  fixedRotation: true,
  collisionFilterGroup: 1,
  collisionFilterMask: 1,
  linearDamping: 0.9,
  angularDamping: 0.9
});
world.addBody(playerBody);

const playerloader = new GLTFLoader();
let player;

playerloader.load('assets/piano.glb', function(gltf) {
  player = gltf.scene;
  player.scale.set(0.015, 0.015, 0.015);
  scene.add(player);
}, undefined, function(error) {
  console.error(error);
});

const powerups = [];
const loader = new GLTFLoader();
loader.load('assets/note.glb', (gltf) => {
  const model = gltf.scene;

  model.traverse((node) => {
    if (node.isMesh) {
      node.material = new THREE.MeshStandardMaterial({
        color: '#74C365',
        roughness: node.material.roughness || 0.9,
        metalness: node.material.metalness || 0.1
      });
    }
  });

  for (let i = 0; i < 5; i++) {
    const posX = random(5, -5);
    const posZ = random(-5, -10);

    const note = model.clone();
    note.position.set(posX, 0, posZ);
    scene.add(note);

    const powerupBody = new CANNON.Body({
      shape: new CANNON.Sphere(0.3),
      collisionFilterGroup: 1,
      collisionFilterMask: 1
    });
    powerupBody.position.set(posX, 0, posZ);
    world.addBody(powerupBody);

    const powerupObject = {
      mesh: note,
      body: powerupBody
    };

    powerups.push(powerupObject);
  }
}, undefined, (error) => {
  console.error(error);
});

const powerdowns = [];
loader.load('assets/note.glb', (gltf) => {
  const model = gltf.scene;

  model.traverse((node) => {
    if (node.isMesh) {
      node.material = new THREE.MeshStandardMaterial({
        color: '#D84EBC',
        roughness: node.material.roughness || 0.9,
        metalness: node.material.metalness || 0.1
      });
    }
  });

  for (let i = 0; i < 5; i++) {
    const posX = random(5, -5);
    const posZ = random(-5, -10);

    const note = model.clone();
    note.position.set(posX, 0, posZ);
    scene.add(note);

    const powerdownBody = new CANNON.Body({
      shape: new CANNON.Sphere(0.3),
      collisionFilterGroup: 1,
      collisionFilterMask: 1
    });
    powerdownBody.position.set(posX, 0, posZ);
    world.addBody(powerdownBody);

    const powerdownObject = {
      mesh: note,
      body: powerdownBody
    };

    powerdowns.push(powerdownObject);
  }
}, undefined, (error) => {
  console.error(error);
});

playerBody.addEventListener("collide", (e) => {
  powerups.forEach((element) => {
    if (e.body === element.body) {
      console.log("Collision with power-up!");
      element.body.position.x = random(5, -5);
      element.body.position.z = random(-5, -10);
      element.mesh.position.copy(element.body.position);
      element.mesh.quaternion.copy(element.body.quaternion);
      points += 1;
      pointsUI.textContent = points.toString();
      powerupSound.play();
    }
  });

  powerdowns.forEach((element) => {
    if (e.body === element.body) {
      element.body.position.x = random(5, -5);
      element.body.position.z = random(-5, -10);
      element.mesh.position.copy(element.body.position);
      element.mesh.quaternion.copy(element.body.quaternion);
      points -= 1;
      pointsUI.textContent = points.toString();
      powerdownSound.play();
    }
  });

  if (e.body === groundBody) {
    canJump = true;
  }
});

if(gameOver){
  renderer.setAnimationLoop(null);
}

function animate() {
  if (points > 0) {
    moveObstacles(powerups, 0.1, speed, -8, -5, -10);
    moveObstacles(powerdowns, 0.1, speed, -8, -5, -10);
  } else {
    gameOver = true;
    pointsUI.textContent = "GAME OVER";
  }

  renderer.render(scene, camera);
  controls.update();
  world.step(1/60);
  //cannonDebugger.update();

  if (player) {
    player.position.copy(playerBody.position);
    player.quaternion.copy(playerBody.quaternion);
  }
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
    playerBody.velocity.set(0, playerBody.velocity.y, playerBody.velocity.z);
    playerBody.position.x += 0.1;
  }
  if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
    playerBody.velocity.set(0, playerBody.velocity.y, playerBody.velocity.z);
    playerBody.position.x -= 0.1;
  }
  if (e.key === " " && canJump) {
    playerBody.velocity.set(playerBody.velocity.x, 4, playerBody.velocity.z);
    canJump = false;
  }
  if(e.key === "r" || e.key === "R"){
    restartGame()
  }
});

startButton.addEventListener("click", () => {
  renderer.setAnimationLoop(animate);
  startPage.classList.add("hide");
  gameUI.classList.remove("hide");
});

function restartGame() {
  points = 5;
  pointsUI.textContent = points.toString();
  gameOver = false;
  renderer.setAnimationLoop(animate);

  playerBody.position.set(0, 0, 0);
  playerBody.velocity.set(0, 0, 0);

  powerups.forEach(element => {
    element.body.position.x = random(5, -5);
    element.body.position.z = random(-5, -10);
    element.mesh.position.copy(element.body.position);
    element.mesh.quaternion.copy(element.body.quaternion);
  });

  powerdowns.forEach(element => {
    element.body.position.x = random(5, -5);
    element.body.position.z = random(-5, -10);
    element.mesh.position.copy(element.body.position);
    element.mesh.quaternion.copy(element.body.quaternion);
  });
}