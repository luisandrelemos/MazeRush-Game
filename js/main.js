import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { createCar } from '../assets/models/CarModel.js';

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

const cameraFollow = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);


// Variáveis para controlar qual câmara está ativa
let cameraMode = 0; // 0 = 3D Perspetiva, 1 = Vista Superior, 2 = NFS
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

const tileSize = 6;
const wallHeight = 6;
const mapWidth = mazeMap[0].length;
const mapHeight = mazeMap.length;

// NEW: Array de células visitadas (inicialmente false)
const visitedCells = [];
for (let z = 0; z < mapHeight; z++) {
  visitedCells[z] = [];
  for (let x = 0; x < mapWidth; x++) {
    visitedCells[z][x] = false;
  }
}

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
floor.position.set(offsetX + (mapWidth * tileSize) / 2 - tileSize / 2, 0, offsetZ + (mapHeight * tileSize) / 2 - tileSize / 2);
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

// Bordas externas para evitar sair do mapa
const borderThickness = 1;   // podes ajustar a espessura
const borderMaterial = new THREE.MeshStandardMaterial({ color: '#0F223D' });

// Parede de contorno (cima)
{
  const geometry = new THREE.BoxGeometry(mapWidth*tileSize, wallHeight, borderThickness);
  const border = new THREE.Mesh(geometry, borderMaterial);
  border.position.set(
    offsetX + (mapWidth * tileSize)/2 - tileSize/1.7,
    wallHeight/2,
    offsetZ - tileSize/1.7
  );
  scene.add(border);
  border.castShadow = true;
  border.receiveShadow = true;
  wallMeshes.push(border);
}

// Parede de contorno (baixo)
{
  const geometry = new THREE.BoxGeometry(mapWidth*tileSize, wallHeight, borderThickness);
  const border = new THREE.Mesh(geometry, borderMaterial);
  border.position.set(
    offsetX + (mapWidth * tileSize)/2 - tileSize/2,
    wallHeight/2,
    offsetZ + (mapHeight * tileSize) - tileSize/2.5
  );
  scene.add(border);
  border.castShadow = true;
  border.receiveShadow = true;
  wallMeshes.push(border);
}

// Parede de contorno (esquerda)
{
  const geometry = new THREE.BoxGeometry(borderThickness, wallHeight, mapHeight*tileSize);
  const border = new THREE.Mesh(geometry, borderMaterial);
  border.position.set(
    offsetX - tileSize/1.7,
    wallHeight/2,
    offsetZ + (mapHeight * tileSize)/2 - tileSize/2
  );
  scene.add(border);
  border.castShadow = true;
  border.receiveShadow = true;
  wallMeshes.push(border);
}

// Parede de contorno (direita)
{
  const geometry = new THREE.BoxGeometry(borderThickness, wallHeight, mapHeight*tileSize);
  const border = new THREE.Mesh(geometry, borderMaterial);
  border.position.set(
    offsetX + (mapWidth * tileSize) - tileSize/2.4,
    wallHeight/2,
    offsetZ + (mapHeight * tileSize)/2 - tileSize/2
  );
  scene.add(border);
  border.castShadow = true;
  border.receiveShadow = true;
  wallMeshes.push(border);
}


// Carro
const textureLoader = new THREE.TextureLoader();
const car = createCar(textureLoader);
scene.add(car);
car.castShadow = true;
car.position.set(
  0 * tileSize + offsetX,
  0.2,
  0 * tileSize + offsetZ
);

//180 do Carro
let isRotating = false;

document.addEventListener('keydown', (event) => {
    if (!isRotating) {// tecla rodar 180
      if (event.key === 'q') {
          rotateCar180(car, 'left');
      } else if (event.key === 'e') {
          rotateCar180(car, 'right');
      }
    }

    if (event.code === 'Space' && !isJumping && !isRotating) { //tecla saltar
        jumpCar(car);
    }

});


//funcao para criar o fumo ao fazer o drift
function createSmoke(textureLoader, position) {
  const texture = textureLoader.load('./assets/textures/smoke.png');
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.7,
    depthWrite: false // garante transparência correta
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.5, 1.5, 1.5);
  sprite.position.copy(position.clone());
  scene.add(sprite);

  const startTime = performance.now();
  const duration = 800;

  function animateSmoke(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    sprite.material.opacity = 0.7 * (1 - progress);
    sprite.scale.setScalar(1.5 + progress); // efeito de expansão

    if (progress < 1) {
      requestAnimationFrame(animateSmoke);
    } else {
      scene.remove(sprite);
    }
  }

  requestAnimationFrame(animateSmoke);
}

//funcao para rodar o carro 180 graus
function rotateCar180(car, direction = 'right') {
    isRotating = true;

    // Criar fumo nas rodas traseiras
    const backLeft = new THREE.Vector3(-0.5, 0.2, 1.2);  // ajusta se necessário
    const backRight = new THREE.Vector3(0.5, 0.2, 1.2);   // ajusta se necessário

    car.localToWorld(backLeft);
    car.localToWorld(backRight);

    createSmoke(textureLoader, backLeft);
    createSmoke(textureLoader, backRight);


    const duration = 1000; // duração da animação
    const startRotation = car.rotation.y;
    const angle = (direction === 'left') ? Math.PI : -Math.PI;
    const targetRotation = startRotation + angle;
    const startTime = performance.now();

    function animateRotation(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        car.rotation.y = startRotation + angle * easeOutCubic(progress);

        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            car.rotation.y = targetRotation;
            isRotating = false;
        }
    }

    requestAnimationFrame(animateRotation);
}


// Função de easing para suavidade no 180
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
    return t * t * t;
}

let isJumping = false;

//funcao para o carro saltar
function jumpCar(car) {
    isJumping = true;

    const durationUp = 300;
    const durationDown = 400;
    const jumpHeight = 3;
    const startY = car.position.y;

    const startTime = performance.now();

    // Criar efeito de poeira no início do salto
    const groundPosition = new THREE.Vector3();
    car.getWorldPosition(groundPosition);
    groundPosition.y = 0.1;
    createJumpDust(textureLoader, groundPosition);

    function animateJump(time) {
        const elapsed = time - startTime;

        if (elapsed < durationUp) {
            const progress = elapsed / durationUp;
            car.position.y = startY + jumpHeight * easeOutCubic(progress);
            requestAnimationFrame(animateJump);
        } else if (elapsed < durationUp + durationDown) {
            const progress = (elapsed - durationUp) / durationDown;
            car.position.y = startY + jumpHeight * (1 - easeInCubic(progress));
            requestAnimationFrame(animateJump);
        } else {
            car.position.y = startY;
            isJumping = false;
        }
    }

    requestAnimationFrame(animateJump);
}


function createJumpDust(textureLoader, position, count = 12, spread = 0.5) {
    const texture = textureLoader.load('./assets/textures/smoke.png');

    const particles = [];

    for (let i = 0; i < count; i++) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.3, 0.3, 0.3);

        // Posição inicial ligeiramente aleatória à volta do ponto
        sprite.position.copy(position.clone());
        sprite.position.x += (Math.random() - 0.5) * spread;
        sprite.position.z += (Math.random() - 0.5) * spread;

        scene.add(sprite);
        particles.push({ sprite, angle: Math.random() * Math.PI * 2 });
    }

    const startTime = performance.now();
    const duration = 500;

    function animateDust(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);

        particles.forEach((p) => {
            // Expansão radial com fade
            const radius = progress * 0.8;
            p.sprite.position.x += Math.cos(p.angle) * 0.01;
            p.sprite.position.z += Math.sin(p.angle) * 0.01;
            p.sprite.material.opacity = 0.6 * (1 - progress);
            p.sprite.scale.setScalar(0.3 + progress * 0.6);
        });

        if (progress < 1) {
            requestAnimationFrame(animateDust);
        } else {
            particles.forEach((p) => scene.remove(p.sprite));
        }
    }

    requestAnimationFrame(animateDust);
}


// Faróis dianteiros realistas
const headlightLeft = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 10, 0.3, 1);
const headlightRight = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 10, 0.3, 1);

// Alvos para os faróis
const targetLeft = new THREE.Object3D();
const targetRight = new THREE.Object3D();
scene.add(targetLeft, targetRight);

headlightLeft.target = targetLeft;
headlightRight.target = targetRight;

headlightLeft.castShadow = true;
headlightRight.castShadow = true;

scene.add(headlightLeft);
scene.add(headlightRight);


// ✅ INÍCIO BONITO
const startPortal = new THREE.Mesh(
  new THREE.TorusGeometry(2.5, 0.4, 16, 100),
  new THREE.MeshStandardMaterial({ color: '#E83F25', emissive: '#E83F25', emissiveIntensity: 1.2 })
);
startPortal.rotation.x = Math.PI / 2;
startPortal.position.set(
  0 * tileSize + offsetX,  // x=0
  1.7,
  0 * tileSize + offsetZ   // z=0
);
scene.add(startPortal);

const startBase = new THREE.Mesh(
  new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32),
  new THREE.MeshStandardMaterial({ color: '#3F1F1F', metalness: 0.4 })
);
startBase.position.set(startPortal.position.x, 0.1, startPortal.position.z);
scene.add(startBase);

const startLight = new THREE.PointLight('#E83F25', 2.0, 15);
startLight.position.copy(startPortal.position);
scene.add(startLight);


// ✅ FIM BONITO
const endPortal = new THREE.Mesh(
  new THREE.TorusGeometry(2.5, 0.4, 16, 100),
  new THREE.MeshStandardMaterial({ color: '#FFD700', emissive: '#FFD700', emissiveIntensity: 1.5 })
);
endPortal.rotation.x = Math.PI / 2;
endPortal.position.set(9 * tileSize + offsetX, 1.5, 8 * tileSize + offsetZ);
scene.add(endPortal);

const endPillar = new THREE.Mesh(
  new THREE.CylinderGeometry(2.5, 2.5, 0.3, 32),
  new THREE.MeshStandardMaterial({ color: '#554422', metalness: 0.6 })
);
endPillar.position.set(endPortal.position.x, 0.15, endPortal.position.z);
scene.add(endPillar);

const endLight = new THREE.PointLight('#FFD700', 3.5, 20);
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
function getBoundingBox(obj) {
  const box = new THREE.Box3().setFromObject(obj.clone());
  return box;
}

function checkCollisionAndReact(car, walls, velocityVec) {
  car.updateMatrixWorld(true);
  const carBox = getBoundingBox(car);

  for (let wall of walls) {
    wall.updateMatrixWorld(true);
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (carBox.intersectsBox(wallBox)) {
      // Recuar proporcional ao vetor de movimento
      const pushBack = velocityVec.clone().multiplyScalar(-1.5);
      car.position.add(pushBack);

      // Reduzir velocidade (simulando impacto)
      car.userData.velocity *= -0.3;

      return true;
    }
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
  cameraMode = (cameraMode + 1) % 3;
  switch (cameraMode) {
    case 0:
      activeCamera = cameraPerspective;
      cameraToggleBtn.textContent = "Vista Superior";
      break;
    case 1:
      activeCamera = cameraOrtho;
      cameraToggleBtn.textContent = "Vista NFS";
      break;
    case 2:
      activeCamera = cameraFollow;
      cameraToggleBtn.textContent = "Vista 3D";
      break;
  }
});

// Ajustar câmaras ao redimensionar a janela
window.addEventListener('resize', () => {
  // Atualizar perspetiva
  cameraPerspective.aspect = window.innerWidth / window.innerHeight;
  cameraPerspective.updateProjectionMatrix();
  cameraFollow.aspect = window.innerWidth / window.innerHeight;
  cameraFollow.updateProjectionMatrix();


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

const data = car.userData;
const frontAxle = data.frontAxle;
const steerSpeed = 0.025;
const maxSteer = Math.PI / 6;
const steerAngle = frontAxle.rotation.y;
const direction = new THREE.Vector3();

const accelerating = keysPressed['w'] || keysPressed['arrowup'];
const braking = keysPressed['s'] || keysPressed['arrowdown'];

// Aceleração e travagem
if (accelerating) {
  data.velocity = Math.min(data.velocity + data.acceleration, data.maxSpeed);
} else if (braking) {
  data.velocity = Math.max(data.velocity - data.acceleration * 1.2, -data.maxSpeed * 0.5);
} else {
  data.velocity *= data.friction;
  if (Math.abs(data.velocity) < 0.001) data.velocity = 0;
}

const isMoving = data.velocity !== 0;
const turningLeft = keysPressed['a'] || keysPressed['arrowleft'];
const turningRight = keysPressed['d'] || keysPressed['arrowright'];

// Atualizar direção das rodas
if (!isMoving) {
  if (turningLeft) {
    frontAxle.rotation.y = Math.min(frontAxle.rotation.y + steerSpeed, maxSteer);
  } else if (turningRight) {
    frontAxle.rotation.y = Math.max(frontAxle.rotation.y - steerSpeed, -maxSteer);
  } else {
    frontAxle.rotation.y *= 0.85;
    if (Math.abs(frontAxle.rotation.y) < 0.01) frontAxle.rotation.y = 0;
  }
} else {
  // Atualizar ângulo com base nas teclas enquanto o carro está em movimento
  if (turningLeft) {
    frontAxle.rotation.y = Math.min(frontAxle.rotation.y + steerSpeed, maxSteer);
  } else if (turningRight) {
    frontAxle.rotation.y = Math.max(frontAxle.rotation.y - steerSpeed, -maxSteer);
  } else {
    frontAxle.rotation.y *= 0.9;
    if (Math.abs(frontAxle.rotation.y) < 0.01) frontAxle.rotation.y = 0;
  }

  // Aplicar curvatura ao carro
  const rotationDirection = Math.sign(data.velocity);
  const steerInfluence = frontAxle.rotation.y * 0.04;
  car.rotation.y += steerInfluence * rotationDirection;
}


// Mover o carro
if (data.velocity !== 0) {
  direction.set(0, 0, -1).applyEuler(car.rotation).normalize();
  const proposedPos = car.position.clone().add(direction.clone().multiplyScalar(data.velocity));

  // Testar colisão ANTES de mover
  car.position.copy(proposedPos);
  checkCollisionAndReact(car, wallMeshes, direction.clone().multiplyScalar(data.velocity));


  // Rodar rodas visuais
  const wheelRotationSpeed = data.velocity * 10;
  data.rotatingWheels.forEach(w => w.rotation.x += wheelRotationSpeed);
}

  
  // Se estamos na perspetiva, aplicamos a rotação de câmara
  if (cameraMode === 0) {
    // Câmara 3D rotacional
    if (!isDragging) targetRotationOffset *= 0.9;
    cameraRotationOffset += (targetRotationOffset - cameraRotationOffset) * 0.08;
  
    const baseOffset = new THREE.Vector3(0, 8.5, 8.5);
    const rotationY = new THREE.Euler(0, cameraRotationOffset, 0);
    const rotatedOffset = baseOffset.clone().applyEuler(rotationY).applyEuler(car.rotation);
  
    const targetCamPos = car.position.clone().add(rotatedOffset);
    cameraPerspective.position.lerp(targetCamPos, 0.08);
    cameraPerspective.lookAt(car.position);
  }
  else if (cameraMode === 1) {
    // Vista superior
    cameraOrtho.position.set(car.position.x, 60, car.position.z + 20);
    cameraOrtho.lookAt(car.position);
  }
  else if (cameraMode === 2) {
    // Estilo NFS com rotação pelo rato
    if (!isDragging) targetRotationOffset *= 0.9;
    cameraRotationOffset += (targetRotationOffset - cameraRotationOffset) * 0.08;
  
    const baseOffset = new THREE.Vector3(0, 1.5, 4);
    const rotationY = new THREE.Euler(0, cameraRotationOffset, 0);
    const rotatedOffset = baseOffset.clone()
      .applyEuler(rotationY)
      .applyEuler(car.rotation);
  
    const targetFollowPos = car.position.clone().add(rotatedOffset);
    cameraFollow.position.lerp(targetFollowPos, 0.08);
    cameraFollow.lookAt(car.position);
  }
   

  // Luzes dos faróis dianteiros seguem o carro
  const leftOffset = new THREE.Vector3(-0.2, 0.2, -0.6).applyEuler(car.rotation);
  const rightOffset = new THREE.Vector3(0.2, 0.2, -0.6).applyEuler(car.rotation);
  const directionOffset = new THREE.Vector3(0, 0, -2).applyEuler(car.rotation);   

  headlightLeft.position.copy(car.position.clone().add(leftOffset));
  headlightRight.position.copy(car.position.clone().add(rightOffset));

  targetLeft.position.copy(headlightLeft.position.clone().add(directionOffset));
  targetRight.position.copy(headlightRight.position.clone().add(directionOffset));

  // NEW: Marcar célula atual como visitada
  {
    const cx = Math.floor((car.position.x - offsetX) / tileSize + 0.5);
    const cz = Math.floor((car.position.z - offsetZ) / tileSize + 0.5);
  
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx >= 0 && nx < mapWidth && nz >= 0 && nz < mapHeight) {
          visitedCells[nz][nx] = true;
        }
      }
    }
  }

  drawMinimap();

  // Render com a câmara ativa
  renderer.render(scene, activeCamera);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

animate();

function drawMinimap() {
  const canvas = document.getElementById("minimap");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Fundo gradiente linear
  const gradient = ctx.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0, "#1a1a1a");
  gradient.addColorStop(1, "#333333");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Cada célula no canvas
  const cellW = w / mapWidth;
  const cellH = h / mapHeight;

  // Desenhar SOMENTE as células visitadas
  for (let z = 0; z < mapHeight; z++) {
    for (let x = 0; x < mapWidth; x++) {
      // Se NÃO foi visitada, fica preto
      if (!visitedCells[z][x]) {
        ctx.fillStyle = "#000";
      } else {
        // Se É visitada, desenha consoante seja parede ou chão
        if (mazeMap[z][x] === 1) {
          ctx.fillStyle = "#445"; // parede
        } else {
          ctx.fillStyle = "#77a"; // chão
        }
      }

      ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
    }
  }

  // Desenhar posição do carro
  // Calcula a rotação do carro em degrees
  const angle = car.rotation.y; // ou -car.rotation.y dependendo do teu sense
  const carX = (car.position.x - offsetX + tileSize/2) / tileSize * cellW;
  const carZ = (car.position.z - offsetZ + tileSize/2) / tileSize * cellH;

  ctx.save();
  ctx.translate(carX, carZ);
  ctx.rotate(-angle); // gira no local

  ctx.fillStyle = "#f33";
  ctx.beginPath();
  // triângulo
  ctx.moveTo(0, -5); 
  ctx.lineTo(4, 4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

}




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

function startMapPreviewSequence() {
    const previousCamera = cameraPerspective;
    const centerX = (mapWidth * tileSize) / 2 + offsetX - tileSize / 2;
    const centerZ = (mapHeight * tileSize) / 2 + offsetZ - tileSize / 2;

    const canvasAspect = window.innerWidth / window.innerHeight;
    const mapRatio = mapWidth / mapHeight;
    let zoomFactor = 1.1;

    if (canvasAspect > mapRatio) {
        orthoSize = (mapHeight * tileSize * zoomFactor) / 2;
    } else {
        orthoSize = ((mapWidth * tileSize) / canvasAspect * zoomFactor) / 2;
    }

    cameraOrtho.left = -orthoSize * canvasAspect;
    cameraOrtho.right = orthoSize * canvasAspect;
    cameraOrtho.top = orthoSize;
    cameraOrtho.bottom = -orthoSize;
    cameraOrtho.near = 0.1;
    cameraOrtho.far = 1000;
    cameraOrtho.updateProjectionMatrix();

    cameraOrtho.position.set(centerX, 100, centerZ);
    cameraOrtho.lookAt(centerX, 0, centerZ);

    activeCamera = cameraOrtho;
    scene.fog = null;

    document.getElementById('minimap-container').style.display = 'none';

    // ✅ Mostrar texto de preview
    const previewText = document.getElementById('preview-text');
    previewText.style.opacity = 1;

    console.log("🔍 Modo preview iniciado...");

    setTimeout(() => {
        // Esconder texto com fade-out
        previewText.style.opacity = 0;

        // Nevoeiro animado
        scene.fog = new THREE.Fog('#000000', 200, 200);
        let fogNear = 200;
        let fogFar = 200;

        const fogInterval = setInterval(() => {
            fogNear -= 3;
            fogFar -= 3;
            if (fogNear <= 30) {
                fogNear = 30;
                fogFar = 80;
                clearInterval(fogInterval);
            }
            scene.fog.near = fogNear;
            scene.fog.far = fogFar;
        }, 30);

        activeCamera = previousCamera;

        document.getElementById('minimap-container').style.display = 'block';

        console.log("✅ Transição concluída.");
    }, 3000);
}







// Chama esta função ao iniciar
startMapPreviewSequence();
