import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#000000', 30, 80);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x3399ff, 0.8, 100);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);

const mazeMap = [
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 1, 0, 0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const tileSize = 5;
const wallHeight = 6;
const mapWidth = mazeMap[0].length;
const mapHeight = mazeMap.length;

const offsetX = -(mapWidth * tileSize) / 2 + tileSize / 2;
const offsetZ = -(mapHeight * tileSize) / 2 + tileSize / 2;

const floorGeometry = new THREE.PlaneGeometry(mapWidth * tileSize, mapHeight * tileSize);
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#D3CA79' });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({ color: '#0F223D', roughness: 0.3, metalness: 0.2 });
const wallMeshes = [];

mazeMap.forEach((row, z) => {
  row.forEach((cell, x) => {
    if (cell === 1) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, wallHeight, tileSize),
        wallMaterial
      );
      wall.position.set(
        x * tileSize + offsetX,
        wallHeight / 2,
        z * tileSize + offsetZ
      );
      scene.add(wall);
      wallMeshes.push(wall);
    }
  });
});

const carGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.5);
const carMaterial = new THREE.MeshStandardMaterial({ color: '#E83F25' });
const car = new THREE.Mesh(carGeometry, carMaterial);
car.rotation.y = Math.PI;
scene.add(car);
car.position.set(
  0 * tileSize + offsetX,
  0.2,
  0 * tileSize + offsetZ - tileSize
);

const spotLight = new THREE.SpotLight(0x3399ff, 2, 15, Math.PI / 5, 0.3, 0.5);
scene.add(spotLight);
const lightTarget = new THREE.Object3D();
scene.add(lightTarget);
spotLight.target = lightTarget;

// PORTAIS
const startPortalGeometry = new THREE.TorusGeometry(2, 0.3, 16, 100);
const startPortalMaterial = new THREE.MeshStandardMaterial({ color: '#E83F25', emissive: '#E83F25' });
const startPortal = new THREE.Mesh(startPortalGeometry, startPortalMaterial);
startPortal.rotation.x = Math.PI / 2;
startPortal.position.set(0 * tileSize + offsetX, 1.5, 0 * tileSize + offsetZ - tileSize);
scene.add(startPortal);

const startLight = new THREE.PointLight('#E83F25', 1.5, 10);
startLight.position.copy(startPortal.position);
scene.add(startLight);

const endPortalGeometry = new THREE.TorusGeometry(2, 0.3, 16, 100);
const endPortalMaterial = new THREE.MeshStandardMaterial({ color: '#D3CA79', emissive: '#D3CA79' });
const endPortal = new THREE.Mesh(endPortalGeometry, endPortalMaterial);
endPortal.rotation.x = Math.PI / 2;
endPortal.position.set(9 * tileSize + offsetX, 1.5, 8 * tileSize + offsetZ);
scene.add(endPortal);

const endLight = new THREE.PointLight('#D3CA79', 1.5, 10);
endLight.position.copy(endPortal.position);
scene.add(endLight);

const keysPressed = {};
document.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

function checkCollision(obj) {
  const objBox = new THREE.Box3().setFromObject(obj);
  for (let wall of wallMeshes) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (objBox.intersectsBox(wallBox)) return true;
  }
  return false;
}

// Submenu
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const exitBtn = document.getElementById('exit-btn');
const gameContainer = document.getElementById('game-container');

let isPaused = false;

resumeBtn.addEventListener('click', () => {
  isPaused = false;
  pauseMenu.classList.remove('active');
  gameContainer.style.filter = 'none';
});

restartBtn.addEventListener('click', () => {
  location.reload();
});

exitBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    isPaused = !isPaused;
    pauseMenu.classList.toggle('active', isPaused);
    gameContainer.style.filter = isPaused ? 'blur(6px)' : 'none';
  }
});

// Controlo de câmara com rato e retorno suave
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraRotationOffset = 0;
let targetRotationOffset = 0;

document.addEventListener('mousedown', (e) => {
  isDragging = true;
  previousMousePosition.x = e.clientX;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - previousMousePosition.x;
  targetRotationOffset += deltaX * 0.002;
  previousMousePosition.x = e.clientX;
});

document.addEventListener('mouseleave', () => {
  isDragging = false;
});

function animate() {
  requestAnimationFrame(animate);

  if (isPaused) return;

  const moveSpeed = 0.1;
  const rotateSpeed = 0.04;
  let movingForward = false;
  let movingBackward = false;
  const direction = new THREE.Vector3();

  if (keysPressed['w'] || keysPressed['arrowup']) {
    movingForward = true;
    direction.set(0, 0, -1).applyEuler(car.rotation).normalize();
    car.position.add(direction.clone().multiplyScalar(moveSpeed));
    if (checkCollision(car)) car.position.sub(direction.clone().multiplyScalar(moveSpeed));
  }

  if (keysPressed['s'] || keysPressed['arrowdown']) {
    movingBackward = true;
    direction.set(0, 0, 1).applyEuler(car.rotation).normalize();
    car.position.add(direction.clone().multiplyScalar(moveSpeed));
    if (checkCollision(car)) car.position.sub(direction.clone().multiplyScalar(moveSpeed));
  }

  if (keysPressed['a'] || keysPressed['arrowleft']) {
    car.rotation.y += movingBackward ? -rotateSpeed : rotateSpeed;
  }
  if (keysPressed['d'] || keysPressed['arrowright']) {
    car.rotation.y += movingBackward ? rotateSpeed : -rotateSpeed;
  }

  if (!isDragging) {
    targetRotationOffset *= 0.9; // suaviza retorno
  }
  cameraRotationOffset += (targetRotationOffset - cameraRotationOffset) * 0.08;

  const baseOffset = new THREE.Vector3(0, 8.5, 8.5);
  const rotationY = new THREE.Euler(0, cameraRotationOffset, 0);
  const rotatedOffset = baseOffset.clone().applyEuler(rotationY).applyEuler(car.rotation);
  const targetCamPos = car.position.clone().add(rotatedOffset);
  camera.position.lerp(targetCamPos, 0.08);
  camera.lookAt(car.position);

  const lightOffset = new THREE.Vector3(0, 0.5, -1.5).applyEuler(car.rotation);
  spotLight.position.copy(car.position.clone().add(lightOffset));
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(car.rotation).normalize();
  lightTarget.position.copy(car.position.clone().add(forward));

  renderer.render(scene, camera);
}

animate();