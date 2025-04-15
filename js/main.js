import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';

// Cena e nevoeiro
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#000000', 30, 80);

// Criação das duas câmaras
const cameraPerspective = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Tamanho base para a câmara ortográfica
let orthoSize = 10;
const aspect = window.innerWidth / window.innerHeight;
const cameraOrtho = new THREE.OrthographicCamera(
  -orthoSize * aspect,
   orthoSize * aspect,
   orthoSize,
  -orthoSize,
  0.1,
  1000
);

// Variáveis para controlar qual câmara está ativa
let usePerspective = true;
let activeCamera = cameraPerspective;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Luzes
const ambientLight = new THREE.AmbientLight(0x334477, 0.2); // azul profundo fraco
scene.add(ambientLight);


const directionalLight = new THREE.DirectionalLight(0x8899ff, 0.9); // luz da lua
directionalLight.position.set(-20, 50, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.radius = 6;

// NOVO: Estender a área das sombras
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 150;

scene.add(directionalLight);


const pointLight = new THREE.PointLight(0x445577, 0.4, 60, 2); // luz azul fraca para noite
pointLight.position.set(0, 10, 0);
scene.add(pointLight);


// Mapa do labirinto
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

// Offset para centrar o labirinto
const offsetX = -(mapWidth * tileSize) / 2 + tileSize / 2;
const offsetZ = -(mapHeight * tileSize) / 2 + tileSize / 2;

// Chão
const floorGeometry = new THREE.PlaneGeometry(mapWidth * tileSize, mapHeight * tileSize);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: '#D3CA79',
  roughness: 0.8,
  metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
floor.receiveShadow = true;

// Paredes
const wallMaterial = new THREE.MeshStandardMaterial({
  color: '#0F223D',
  roughness: 0.5,
  metalness: 0.6
});
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
      wall.castShadow = true;
      wall.receiveShadow = true;
    }
  });
});

// Carro
const carGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.5);
const carMaterial = new THREE.MeshStandardMaterial({ color: '#E83F25' });
const car = new THREE.Mesh(carGeometry, carMaterial);
car.rotation.y = Math.PI;
scene.add(car);
car.castShadow = true;
car.position.set(
  0 * tileSize + offsetX,
  0.2,
  0 * tileSize + offsetZ - tileSize
);

// Foco de luz que segue o carro
const spotLight = new THREE.SpotLight(0xffffff, 1.8, 20, Math.PI / 6, 0.2, 1);
scene.add(spotLight);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;  // (opcional) mais qualidade
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.radius = 4;  // suaviza
const lightTarget = new THREE.Object3D();
scene.add(lightTarget);
spotLight.target = lightTarget;

// Portais
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

// Controlo de teclas
const keysPressed = {};
document.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

// Função para verificar colisão
function checkCollision(obj) {
  const objBox = new THREE.Box3().setFromObject(obj);
  for (let wall of wallMeshes) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (objBox.intersectsBox(wallBox)) return true;
  }
  return false;
}

// Submenu de pausa
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

// Controlo de câmara com rato e retorno suave (para a perspetiva)
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

// Botão para alternar câmara
const cameraToggleBtn = document.getElementById('camera-toggle-btn');
cameraToggleBtn.addEventListener('click', () => {
  usePerspective = !usePerspective;
  activeCamera = usePerspective ? cameraPerspective : cameraOrtho;
  cameraToggleBtn.textContent = usePerspective ? "Vista Superior" : "Vista 3D";

  ambientLight.intensity = usePerspective
    ? defaultAmbientIntensity
    : brightAmbientIntensity;
});

// Ajustar câmaras ao redimensionar a janela
window.addEventListener('resize', () => {
  // Atualizar perspetiva
  cameraPerspective.aspect = window.innerWidth / window.innerHeight;
  cameraPerspective.updateProjectionMatrix();

  // Atualizar ortográfica
  const newAspect = window.innerWidth / window.innerHeight;
  cameraOrtho.left = -orthoSize * newAspect;
  cameraOrtho.right = orthoSize * newAspect;
  cameraOrtho.top = orthoSize;
  cameraOrtho.bottom = -orthoSize;
  cameraOrtho.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Posições iniciais de cada câmara
cameraPerspective.position.set(0, 8, 8);
cameraPerspective.lookAt(0, 0, 0);

cameraOrtho.position.set(0, 60, 0);
cameraOrtho.lookAt(0, 0, 0);

// Definimos a câmara ativa inicialmente
activeCamera = cameraPerspective;

// Loop de animação
function animate() {
  requestAnimationFrame(animate);

  if (isPaused) return;

  // Movimento do carro
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
    // Se estiver a andar para trás, vira ao contrário
    car.rotation.y += movingBackward ? -rotateSpeed : rotateSpeed;
  }
  if (keysPressed['d'] || keysPressed['arrowright']) {
    car.rotation.y += movingBackward ? rotateSpeed : -rotateSpeed;
  }

  // Se estamos na perspetiva, aplicamos a rotação de câmara
  if (usePerspective) {
    if (!isDragging) {
      // Suaviza o retorno
      targetRotationOffset *= 0.9;
    }
    cameraRotationOffset += (targetRotationOffset - cameraRotationOffset) * 0.08;

    // Calcula a posição da câmara atrás do carro
    const baseOffset = new THREE.Vector3(0, 8.5, 8.5);
    const rotationY = new THREE.Euler(0, cameraRotationOffset, 0);
    const rotatedOffset = baseOffset.clone()
      .applyEuler(rotationY)
      .applyEuler(car.rotation);

    const targetCamPos = car.position.clone().add(rotatedOffset);
    cameraPerspective.position.lerp(targetCamPos, 0.08);
    cameraPerspective.lookAt(car.position);

  } else {
    // Se estamos na câmara ortográfica, segue por cima
    cameraOrtho.position.set(
      car.position.x,
      60, // altura
      car.position.z + 20
    );
    cameraOrtho.lookAt(car.position);
  }

  // Spotlight segue o carro
  const lightOffset = new THREE.Vector3(0, 0.5, -1.5).applyEuler(car.rotation);
  spotLight.position.copy(car.position.clone().add(lightOffset));
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(car.rotation).normalize();
  lightTarget.position.copy(car.position.clone().add(forward));

  // Render com a câmara ativa
  renderer.render(scene, activeCamera);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

animate();

// Controlos de luz (ligar/desligar)
document.getElementById('toggleAmbient').addEventListener('change', (e) => {
  if (e.target.checked) {
    scene.add(ambientLight);
  } else {
    scene.remove(ambientLight);
  }
});

document.getElementById('toggleDirectional').addEventListener('change', (e) => {
  if (e.target.checked) {
    scene.add(directionalLight);
  } else {
    scene.remove(directionalLight);
  }
});

document.getElementById('togglePoint').addEventListener('change', (e) => {
  if (e.target.checked) {
    scene.add(pointLight);
  } else {
    scene.remove(pointLight);
  }
});