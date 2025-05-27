// js/main.js

/* ───────────────────────────  Import  ─────────────────────────── */
import * as THREE from "https://cdn.skypack.dev/three@0.152.2";
import { createCar } from "../assets/models/CarModel.js";
import { loadLevel } from "./LevelLoader.js";
import { unlockLevel } from "./unlockSystem.js";
import { submitScore, fetchLeaderboard, saveCoins } from "./leaderboard.js";
import { coinMeshes } from "./LevelLoader.js";
import { animatedObjects } from "./LevelLoader.js";
import { updateAudioSettings, updateMuteIcons } from "./audio.js";
import { getCurrentProfile, updateProfile } from "./profileSystem.js";
import { igluTunnel, igluPosition } from "./LevelLoader.js";
import { updateTunnelDirection } from "./LevelLoader.js";
import {
  celeiroGroup,
  celeiroPosition,
  updateBarnDirection,
} from "./LevelLoader.js";

const gameContainer = document.getElementById("game-container");
window.magicParticles = [];

/* ───────────────────────────  Cena e câmaras  ─────────────────────────── */
const scene = new THREE.Scene();
let lastFrameTime = performance.now();

/* ───────────────────────────  Timer Countdown  ─────────────────────────── */
const countdownEl = document.createElement("div");
countdownEl.id = "countdown";
countdownEl.textContent = "";
gameContainer.appendChild(countdownEl);

/* ───────────────────────────  Timer de nível  ─────────────────────────── */
const timerEl = document.createElement("div");
timerEl.id = "level-timer";
timerEl.textContent = "0.00s";
Object.assign(timerEl.style, {
  position: "absolute",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  color: "#fff",
  textShadow: "0 0 8px rgba(0, 0, 0, 0.8)",
  fontFamily: "monospace",
  fontSize: "48px",
  fontWeight: "bold",
  background: "rgba(0, 0, 0, 0.3)",
  padding: "4px 16px",
  borderRadius: "8px",
  pointerEvents: "none",
  zIndex: "100",
});
gameContainer.appendChild(timerEl);

let levelStartTime = 0;
let isTimerRunning = false;
let pauseStartTime = 0;
let coinCount = 0;

/* ───────────────────────────  Modal de nível ─────────────────────────── */
const modal = document.getElementById("level-complete-modal");
const nextBtn = document.getElementById("next-level-btn");
const retryBtn = document.getElementById("retry-btn");
const menuBtn = document.getElementById("menu-btn");
const settingsBtn = document.getElementById("settings-btn");

// ─────────────────────────  Retry ─────────────────────────
retryBtn.onclick = async () => {
  // 1) fecha o modal
  modal.classList.remove("show");
  retryBtn.blur();

  // 2) restaura a UI
  uiBlocks.forEach((el) => {
    el.style.filter = "none";
    el.style.pointerEvents = "auto";
  });

  // 3) reinicia o próprio nível
  timerEl.textContent = "0.00s";
  isTimerRunning = false;
  await initLevel(currentLevelIndex);
};

// ─────────────────────────  Menu ─────────────────────────
menuBtn.addEventListener("click", () => {
  window.location.href = "index.html";
  menuBtn.blur(); // ← remove o foco
});

/* ───────────────────────────  Controlo de níveis ───────────────────────── */
let currentLevelIndex = parseInt(
  (localStorage.getItem("selectedLevel") || "level-1").split("-")[1]
);
let levelComplete = false;
let controlsLocked = true;

/* ────────────────────────────  Função para verificar existência de JSON ───────────── */
async function levelExists(idx) {
  try {
    const res = await fetch(`../assets/levels/level-${idx}/layout.json`, {
      method: "HEAD",
    });
    return res.ok;
  } catch {
    return false;
  }
}
/* ────────────────────────────  Cameras ───────────── */
// ▼ Câmaras principais
const cameraPerspective = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);
const cameraFollow = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);
const zoomTopView = 0.8;
const zoomPreview = 1.1;
let orthoSizeTopView = 10;
let orthoSizePreview = 10;
const cameraOrtho = new THREE.OrthographicCamera(
  -orthoSizeTopView * (innerWidth / innerHeight),
  orthoSizeTopView * (innerWidth / innerHeight),
  orthoSizeTopView,
  -orthoSizeTopView,
  0.1,
  1000
);
const transitionCamera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.1,
  1000
);

/* ───────────  HUD: Obtém o elemento do velocímetro  ─────────────────────── */
const speedEl = document.getElementById("speedometer");

/* ─────────  Alternância de câmaras (botão + tecla C) ───────── */
let cameraMode = 2; // 0-persp | 1-ortho | 2-follow
let activeCamera = cameraFollow;

const cameraToggleBtn = document.getElementById("camera-toggle-btn");
function cycleCamera() {
  cameraMode = (cameraMode + 1) % 3;
  switch (cameraMode) {
    case 0:
      activeCamera = cameraPerspective;
      cameraToggleBtn.title = "Vista Superior";
      break;
    case 1:
      activeCamera = cameraOrtho;
      cameraToggleBtn.title = "Vista 3D";
      break;
    case 2:
      activeCamera = cameraFollow;
      cameraToggleBtn.title = "Vista NFS";
      break;
  }
}
cameraToggleBtn.addEventListener("click", () => {
  if (isPaused || modal.classList.contains("show") || isInPreview) return;
  cycleCamera();
  cameraToggleBtn.blur();
});
document.addEventListener("keydown", (e) => {
  if (isPaused || modal.classList.contains("show") || isInPreview) return;
  if (e.key.toLowerCase() === "c" && !e.repeat) {
    cycleCamera();
    cameraToggleBtn.style.transform = "scale(0.9)";
    setTimeout(() => (cameraToggleBtn.style.transform = ""), 120);
  }
});

/* ─────────────────────────────  Renderer  ─────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
document.getElementById("game-container").appendChild(renderer.domElement);

/* ───────────────────────────  Luzes globais  ─────────────────────────── */
const ambientLight = new THREE.AmbientLight(0x334477, 0.2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(-20, 50, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(4096, 4096);
directionalLight.shadow.radius = 6;
Object.assign(directionalLight.shadow.camera, {
  left: -100,
  right: 100,
  top: 100,
  bottom: -100,
  near: 1,
  far: 150,
});
directionalLight.shadow.camera.updateProjectionMatrix();
scene.add(directionalLight);

// Guardar valores padrão das luzes para restaurar depois
const defaultAmbientColor = ambientLight.color.clone();
const defaultAmbientIntensity = ambientLight.intensity;

const defaultDirectionalColor = directionalLight.color.clone();
const defaultDirectionalIntensity = directionalLight.intensity;

const pointLight = new THREE.PointLight(0xffffff, 0.4, 60, 2);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);

/* ────────────────────────────  Função para atualizar o contador de moedas ───────────── */
function updateCoinCounter() {
  const coinEl = document.getElementById("coin-count");
  if (coinEl) coinEl.textContent = coinCount;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "m") {
    // Pressionar "m" adiciona 1 moeda
    coinCount++;
    updateCoinCounter();
  }
});

/* ───────────────────────────  Jogador (carro)  ─────────────────────────── */
const textureLoader = new THREE.TextureLoader();
const car = createCar(textureLoader);
scene.add(car);
car.castShadow = true;

// Bounding Sphere do carro (a partir do chassis)
const baseGeom = car.children[0].geometry;
baseGeom.computeBoundingSphere();
const carSphere = baseGeom.boundingSphere.clone();
carSphere.radius *= 0.5;

/* ───────────────────────────  Estado do nível  ─────────────────────────── */
let levelData = null;
let wallMeshes = [];
let visitedCells = [];
let animationStarted = false;
let isInPreview = false;

/* ─────────────────────────────  Faróis do carro ──────────────────────────── */
const headlightLeft = new THREE.SpotLight(
  0xffffff,
  2,
  20,
  Math.PI / 10,
  0.3,
  1
);
const headlightRight = headlightLeft.clone();
const targetLeft = new THREE.Object3D();
const targetRight = new THREE.Object3D();
scene.add(headlightLeft, headlightRight, targetLeft, targetRight);
headlightLeft.target = targetLeft;
headlightRight.target = targetRight;
headlightLeft.castShadow = headlightRight.castShadow = true;

/* ────────────────────────────  Easing helpers  ───────────────────────────── */

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t) {
  return t * t * t;
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ──────────────────────  Efeitos visuais (fumo, salto)  ───────────────────── */
//fumo
function createSmoke(textureLoader, position) {
  const tex = textureLoader.load("./assets/textures/smoke.png");
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5, 1.5, 1.5);
  sprite.position.copy(position);
  scene.add(sprite);

  const start = performance.now(),
    duration = 800;
  function anim(t) {
    const p = Math.min((t - start) / duration, 1);
    sprite.material.opacity = 0.7 * (1 - p);
    sprite.scale.setScalar(1.5 + p);
    if (p < 1) requestAnimationFrame(anim);
    else scene.remove(sprite);
  }
  requestAnimationFrame(anim);
}
//salto
function createJumpDust(textureLoader, pos, count = 12, spread = 0.5) {
  const tex = textureLoader.load("./assets/textures/smoke.png");
  const parts = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(0.3, 0.3, 0.3);
    s.position
      .copy(pos)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          0,
          (Math.random() - 0.5) * spread
        )
      );
    scene.add(s);
    parts.push({ sprite: s, angle: Math.random() * Math.PI * 2 });
  }
  const start = performance.now(),
    duration = 500;
  function anim(t) {
    const p = Math.min((t - start) / duration, 1);
    parts.forEach((particle) => {
      particle.sprite.position.x += Math.cos(particle.angle) * 0.01;
      particle.sprite.position.z += Math.sin(particle.angle) * 0.01;
      particle.sprite.material.opacity = 0.6 * (1 - p);
      particle.sprite.scale.setScalar(0.3 + p * 0.6);
    });
    if (p < 1) requestAnimationFrame(anim);
    else parts.forEach((particle) => scene.remove(particle.sprite));
  }
  requestAnimationFrame(anim);
}
/* ──────────────────────  Rotação 180º ───────────────────── */
let isRotating = false;
function rotateCar180(car, dir = "right") {
  if (isRotating) return;
  isRotating = true;

  // fumo nas rodas traseiras
  const backL = new THREE.Vector3(-0.5, 0.2, 1.2),
    backR = new THREE.Vector3(0.5, 0.2, 1.2);
  car.localToWorld(backL);
  car.localToWorld(backR);
  createSmoke(textureLoader, backL);
  createSmoke(textureLoader, backR);

  const startRot = car.rotation.y;
  const angle = dir === "left" ? Math.PI : -Math.PI;
  const targetRot = startRot + angle;
  const start = performance.now(),
    duration = 1000;

  function anim(t) {
    const p = Math.min((t - start) / duration, 1);
    car.rotation.y = startRot + angle * easeOutCubic(p);
    if (p < 1) requestAnimationFrame(anim);
    else {
      car.rotation.y = targetRot;
      isRotating = false;
    }
  }
  requestAnimationFrame(anim);
}
/* ──────────────────────  Salto ───────────────────── */
let isJumping = false;
function jumpCar(car) {
  if (isJumping) return;
  isJumping = true;

  const upDur = 300,
    downDur = 400,
    height = 3,
    startY = car.position.y,
    start = performance.now();
  const groundPos = new THREE.Vector3();
  car.getWorldPosition(groundPos);
  groundPos.y = 0.1;
  createJumpDust(textureLoader, groundPos);

  function anim(t) {
    const e = t - start;
    if (e < upDur) {
      const p = e / upDur;
      car.position.y = startY + height * easeOutCubic(p);
      requestAnimationFrame(anim);
    } else if (e < upDur + downDur) {
      const p = (e - upDur) / downDur;
      car.position.y = startY + height * (1 - easeInCubic(p));
      requestAnimationFrame(anim);
    } else {
      car.position.y = startY;
      isJumping = false;
    }
  }
  requestAnimationFrame(anim);
}

/* ────────────────────────────  Colisão por Bounding Sphere  ─────────────────── */

function checkCollisionAndReact(car, walls) {
  const worldSphere = carSphere.clone().applyMatrix4(car.matrixWorld);

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (worldSphere.intersectsBox(wallBox)) {
      const pushDir = new THREE.Vector3()
        .subVectors(car.position, wall.position)
        .setY(0)
        .normalize();
      car.position.add(pushDir.multiplyScalar(worldSphere.radius * 0.5));
      car.userData.velocity = 0;
      return true;
    }
  }
  return false;
}

/* ────────────────────────────  Colisão com a moeda  ─────────────────── */

async function checkCoinCollection(car, coins) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    const distance = car.position.distanceTo(coin.position);
    if (distance < 1.2) {
      // Remover brilho se existir
      if (coin.userData.glow) coin.remove(coin.userData.glow);

      // Remover a moeda da cena
      scene.remove(coin);
      coins.splice(i, 1);

      coinCount++;
      updateCoinCounter();

      const profile = getCurrentProfile();
      profile.coins = (profile.coins || 0) + 1;
      updateProfile(profile);
      await saveCoins(profile.userId, profile.coins);
    }
  }
}

/* ──────────────────────  Entrada de teclado / rato  ──────────────────────── */

const keysPressed = {};
document.addEventListener("keydown", (e) => {
  if (isPaused || modal.classList.contains("show") || isInPreview) return;
  const key = e.key.toLowerCase();
  keysPressed[key] = true;
  if (key === "q") rotateCar180(car, "left");
  if (key === "e") rotateCar180(car, "right");
  if (e.code === "Space") jumpCar(car);
});

document.addEventListener("keyup", (e) => {
  if (isPaused) return;
  keysPressed[e.key.toLowerCase()] = false;
});

/* ─── Rato para rotação da câmara (follow) + Scroll-zoom ────────────────── */
// Drag-to-rotate vars
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraRotationOffset = 0;
let targetRotationOffset = 0;
const rotationSensitivity = 0.005;

// Scroll-zoom vars
let zoomLevel = 1;
let targetZoomLevel = 1;
let zoomResetTimer = null;

// Mouse listeners
document.addEventListener("mousedown", (e) => {
  isDragging = true;
  previousMousePosition.x = e.clientX;
});
document.addEventListener("mouseup", () => {
  isDragging = false;
});
document.addEventListener("mouseleave", () => {
  isDragging = false;
});
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - previousMousePosition.x;
  targetRotationOffset += dx * rotationSensitivity;
  previousMousePosition.x = e.clientX;
});

// Wheel zoom listener
document.addEventListener("wheel", (e) => {
  // se estivermos em top-view ortográfica, não faz nada
  if (cameraMode === 1) return;
  // continua a ignorar em pausa, modal aberto ou preview
  if (isPaused || modal.classList.contains("show") || isInPreview) return;

  targetZoomLevel = THREE.MathUtils.clamp(
    targetZoomLevel - e.deltaY * 0.001,
    0.5,
    2
  );
  clearTimeout(zoomResetTimer);
  zoomResetTimer = setTimeout(() => {
    targetZoomLevel = 1;
  }, 1500);
});

/* ─────────────────────────────  Pause menu  ──────────────────────────────── */
const pauseMenu = document.getElementById("pause-menu");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const exitBtn = document.getElementById("exit-btn");
const muteSoundBtn = document.getElementById("mute-sound-btn");
const muteMusicBtn = document.getElementById("mute-music-btn");

gameContainer.classList.remove("hidden");
let isPaused = false;

resumeBtn.onclick = () => {
  if (isPaused) {
    const pausedDuration = performance.now() - pauseStartTime;
    levelStartTime += pausedDuration;
    isTimerRunning = true;
  }
  isPaused = false;
  pauseMenu.classList.remove("active");
  pauseOverlay.classList.remove("active");
  uiBlocks.forEach((el) => {
    el.style.filter = "none";
    el.style.pointerEvents = "auto";
  });
};

// Handler do botão de som
muteSoundBtn.addEventListener("click", () => {
  const cur = getCurrentProfile();
  cur.soundEnabled = !cur.soundEnabled;
  updateProfile(cur);
  updateAudioSettings();
  updateMuteIcons();
});

// Handler do botão de música
muteMusicBtn.addEventListener("click", () => {
  const cur = getCurrentProfile();
  cur.musicEnabled = !cur.musicEnabled;
  updateProfile(cur);
  updateAudioSettings();
  updateMuteIcons();
});

const pauseOverlay = document.getElementById("pause-overlay");

// elementos que vamos desfocar e bloquear
const uiBlocks = [
  document.getElementById("light-controls"),
  document.getElementById("speedometer"),
  document.getElementById("camera-toggle-btn"),
  document.getElementById("minimap-container"),
  document.getElementById("coin-counter"),
];

// ─── Toggle expand/recolher minimapa com resize do canvas ─────────────────
const minimapContainer = document.getElementById("minimap-container");
const minimapCanvas = minimapContainer.querySelector("canvas");
const baseSize = 220; // px, o tamanho original

minimapContainer.addEventListener("click", (e) => {
  if (isPaused || modal.classList.contains("show") || isInPreview) return;

  // alterna a classe no próprio minimapa
  const isNowExpanded = minimapContainer.classList.toggle("expanded");

  // e também no body, para ativar o blur de fundo
  document.body.classList.toggle("minimap-expanded", isNowExpanded);

  // redimensiona o canvas para alta-dpi
  const dpr = window.devicePixelRatio || 1;
  requestAnimationFrame(() => {
    let w, h;
    if (isNowExpanded) {
      const rect = minimapContainer.getBoundingClientRect();
      w = rect.width * dpr;
      h = rect.height * dpr;
    } else {
      w = baseSize * dpr;
      h = baseSize * dpr;
    }
    minimapCanvas.width = w;
    minimapCanvas.height = h;
  });
});

// fecha clicando fora
document.addEventListener("click", (e) => {
  if (!minimapContainer.classList.contains("expanded")) return;
  if (e.target.closest("#minimap-container")) return;

  minimapContainer.classList.remove("expanded");
  document.body.classList.remove("minimap-expanded");

  requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    minimapCanvas.width = baseSize * dpr;
    minimapCanvas.height = baseSize * dpr;
  });
});

// ─── Fecha minimapa expandido ao clicar fora ───────────────────────────────
document.addEventListener("click", (e) => {
  // só interessa se estiver expandido
  if (!minimapContainer.classList.contains("expanded")) return;

  // se o clique for dentro do minimap, ignora aqui (já tratado pelo toggle)
  if (e.target.closest("#minimap-container")) return;

  // senão, fecha o minimap expandido
  minimapContainer.classList.remove("expanded");

  // e redimensiona o canvas de volta ao tamanho base
  requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    minimapCanvas.width = baseSize * dpr;
    minimapCanvas.height = baseSize * dpr;
  });
});

// … dentro do toggle-pause (Escape) e no resumeBtn.onclick, depois de mudar isPaused:
pauseOverlay.classList.toggle("active", isPaused);

restartBtn.onclick = async () => {
  // fecha o menu de pausa
  isPaused = false;
  pauseMenu.classList.remove("active");
  pauseOverlay.classList.remove("active");

  // restaura a UI
  uiBlocks.forEach((el) => {
    el.style.filter = "none";
    el.style.pointerEvents = "auto";
  });

  // reinicia o nível
  timerEl.textContent = "0.00s";
  isTimerRunning = false;
  await initLevel(currentLevelIndex);
};
exitBtn.onclick = () => (window.location.href = "index.html");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("show") && !isInPreview) {
    // 👉 se ainda não estava em pausa, marca o início da pausa
    if (!isPaused) {
      pauseStartTime = performance.now();
      isTimerRunning = false;
    }
    // 👉 se estava em pausa, calcula quanto tempo passou parado e “atualiza” o start
    else {
      const pausedDuration = performance.now() - pauseStartTime;
      levelStartTime += pausedDuration;
      isTimerRunning = true;
    }
    isPaused = !isPaused;
    pauseMenu.classList.toggle("active", isPaused);
    pauseOverlay.classList.toggle("active", isPaused);
    updateMuteIcons();
    updateAudioSettings();

    // desfocar e bloquear light-controls e speedometer
    uiBlocks.forEach((el) => {
      el.style.filter = isPaused ? "blur(6px)" : "none";
      el.style.pointerEvents = isPaused ? "none" : "auto";
    });
  }
});

/* ─────────────────────────────  Resize  ──────────────────────────────────── */
window.addEventListener("resize", () => {
  cameraPerspective.aspect = innerWidth / innerHeight;
  cameraPerspective.updateProjectionMatrix();
  cameraFollow.aspect = innerWidth / innerHeight;
  cameraFollow.updateProjectionMatrix();

  const aspect = innerWidth / innerHeight;

  orthoSizeTopView =
    aspect > 1 ? 10 * zoomTopView : (10 * zoomTopView) / aspect;

  cameraOrtho.left = -orthoSizeTopView * aspect;
  cameraOrtho.right = orthoSizeTopView * aspect;
  cameraOrtho.top = orthoSizeTopView;
  cameraOrtho.bottom = -orthoSizeTopView;
  cameraOrtho.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});

/* ───────────────────────  Carregar nível e arrancar  ─────────────────────── */
async function initLevel(idx) {
  //carrega moedas do perfil ativo ───────────────────
  const profile = getCurrentProfile();
  coinCount = profile.coins || 0;
  updateCoinCounter();

  currentLevelIndex = idx;
  const levelName = `level-${idx}`;

  // garantir que nenhum modal / tempo antigo fica no caminho
  modal.classList.remove("show");

  // Restaurar luzes padrão (para evitar herança do nível anterior)
  ambientLight.color.copy(defaultAmbientColor);
  ambientLight.intensity = defaultAmbientIntensity;

  directionalLight.color.copy(defaultDirectionalColor);
  directionalLight.intensity = defaultDirectionalIntensity;

  // não removemos mais o <p class="time-display">, apenas limpamos o texto
  const timeEl = modal.querySelector(".time-display");
  if (timeEl) timeEl.textContent = "";
  levelComplete = false;
  controlsLocked = true;
  isInPreview = true;

  // carregar JSON e instanciar tudo
  const data = await loadLevel(levelName, scene, textureLoader);
  levelData = data;
  wallMeshes = scene.children.filter(
    (o) => o.userData.levelObject && o.geometry?.type === "BoxGeometry"
  );
  visitedCells = data.map.map((r) => r.map((_) => false));

  // Adiciona neve no nivel 2
  if (currentLevelIndex === 2) {
    createSnow(scene);

    // Ambiente gelado
    ambientLight.color.set(0xb0e0ff); // azul claro (tom frio)
    ambientLight.intensity = 0.3;

    directionalLight.color.set(0xe0f8ff); // luz gélida
    directionalLight.intensity = 0.8;

    directionalLight.position.set(20, 50, 20); // (opcional: ângulo da luz)
  }

  //  posicionar carro no início
  car.position.copy(data.startPos);
  car.pos;
  car.userData.velocity = 0;

  // rotação automática inicial
  {
    const tx = Math.round((data.startPos.x - data.offsetX) / data.tileSize);
    const tz = Math.round((data.startPos.z - data.offsetZ) / data.tileSize);
    const dirs = [
      [0, 1, Math.PI], // Sul
      [1, 0, Math.PI / 2], // Este
      [0, -1, 0], // Norte
      [-1, 0, -Math.PI / 2], // Oeste
    ];
    let angle = 0;
    for (const [dx, dz, a] of dirs) {
      if (data.map[tz + dz]?.[tx + dx] === 0) {
        angle = a;
        break;
      }
    }
    car.rotation.set(0, angle, 0);
  }

  // fog + iniciar loop e preview
  scene.fog = new THREE.Fog(data.fog.color, data.fog.near, data.fog.far);
  if (!animationStarted) {
    requestAnimationFrame(animate);
    animationStarted = true;
  }
  startMapPreviewSequence();
}
export { initLevel };

/* ─────────────────────  Handler do botão “Próximo Nível” ───────────────────── */
nextBtn.onclick = async () => {
  // fecha o modal, limpa o tempo anterior e reseta o estado
  modal.classList.remove("show");
  isTimerRunning = false;
  timerEl.textContent = "0.00s";

  uiBlocks.forEach((el) => {
    el.style.filter = "none";
    el.style.pointerEvents = "auto";
  });

  // calcula qual é o próximo nível
  const nextIndex = currentLevelIndex + 1;

  // verifica se existe mesmo esse nível
  if (!(await levelExists(nextIndex))) {
    console.warn(`Level ${nextIndex} não existe — jogo terminado.`);
    return;
  }

  // Se estivermos na ortho, forçámos passagem para perspective
  if (cameraMode === 1) {
    cameraMode = 0;
    activeCamera = cameraPerspective;
    cameraToggleBtn.title = "Vista Superior";
  }

  // atualiza o índice e carrega esse nível
  currentLevelIndex = nextIndex;
  await initLevel(currentLevelIndex);

  nextBtn.blur();
};

/* ─────────────────────  Neve ───────────────────── */
let snowParticles;

function createSnow(scene) {
  const snowCount = 1500;
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < snowCount; i++) {
    positions.push(
      (Math.random() - 0.5) * 100, // x
      Math.random() * 50 + 10, // y (altura inicial)
      (Math.random() - 0.5) * 100 // z
    );
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8,
  });

  snowParticles = new THREE.Points(geometry, material);
  snowParticles.userData.levelObject = true; // permite remoção em novos níveis
  scene.add(snowParticles);
}

/* ─────────────────────────────  Loop  ────────────────────────────────────── */
function animate(now) {
  requestAnimationFrame(animate);

  // deltaTime em segundos
  const rawDt = (now - lastFrameTime) / 1000;
  const deltaTime = Math.min(rawDt, 0.05);
  lastFrameTime = now;

  if (isPaused || !levelData) return;

  // ───── Timer ─────
  if (isTimerRunning) {
    const elapsed = (performance.now() - levelStartTime) / 1000;
    timerEl.textContent = `${elapsed.toFixed(2)}s`;
  }

  // ───── Parâmetros de física ─────
  const d = car.userData;
  d.acceleration = 13; // mais rápido: 12 m/s²
  d.maxSpeed = 15; // mantém top speed em 15 m/s
  const naturalDecel = 15; // m/s²

  const { tileSize, offsetX, offsetZ, map } = levelData;
  const mapW = map[0].length,
    mapH = map.length;

  // Teclas
  const accelKey = keysPressed.w || keysPressed.arrowup;
  const brakeKey = keysPressed.s || keysPressed.arrowdown;
  const leftKey = keysPressed.a || keysPressed.arrowleft;
  const rightKey = keysPressed.d || keysPressed.arrowright;

  // Luzes de travão e ré
  (d.brakeLights || []).forEach(
    (l) => (l.visible = brakeKey && d.velocity > 0)
  );
  (d.reverseLights || []).forEach((l) => (l.visible = d.velocity < 0));

  // ───── Atualiza velocidade ─────
  if (!controlsLocked) {
    if (accelKey) {
      d.velocity = Math.min(
        d.velocity + d.acceleration * deltaTime,
        d.maxSpeed
      );
    } else if (brakeKey) {
      d.velocity = Math.max(
        d.velocity - d.acceleration * 3 * deltaTime,
        -d.maxSpeed * 0.5
      );
    } else {
      if (d.velocity > 0)
        d.velocity = Math.max(d.velocity - naturalDecel * deltaTime, 0);
      else d.velocity = Math.min(d.velocity + naturalDecel * deltaTime, 0);
    }
  } else {
    d.velocity = 0;
  }

  // ───── Direcção e rotação ─────
  const axle = d.frontAxle;
  const steerMax = Math.PI / 5; // ±30°
  const steerLerp = 12; // resposta ao volante bem rápida
  const turnRate = 4; // rad/s mais agressivo

  // ângulo alvo das rodas
  let targetSteer = 0;
  if (leftKey) targetSteer = steerMax;
  if (rightKey) targetSteer = -steerMax;

  // suaviza direção das rodas
  axle.rotation.y = THREE.MathUtils.lerp(
    axle.rotation.y,
    targetSteer,
    steerLerp * deltaTime
  );

  // só gira o carro se estiver a mover
  const moving = Math.abs(d.velocity) > 0.01;
  if (moving) {
    const dirFactor = d.velocity >= 0 ? 1 : -1;
    car.rotation.y += axle.rotation.y * turnRate * deltaTime * dirFactor;
  }

  // ───── Move + colisões ─────
  if (moving) {
    const dist = d.velocity * deltaTime;
    const dir = new THREE.Vector3(0, 0, -1)
      .applyEuler(car.rotation)
      .multiplyScalar(dist);
    car.position.add(dir);

    checkCollisionAndReact(car, wallMeshes);
    checkCoinCollection(car, coinMeshes);

    // animação das rodas
    const wheelDir = d.velocity >= 0 ? 1 : -1;
    (d.rotatingWheels || []).forEach((w) => {
      w.rotation.x += wheelDir * 10 * deltaTime;
    });
  }

  // Rotação do paralelepípedo
  animatedObjects.forEach((obj) => {
    obj.rotation.y += 1.2 * deltaTime;
  });
  // Rotação da moeda
  coinMeshes.forEach((coin) => {
    coin.rotation.z += 2 * deltaTime;
  });

  // ───── Atualiza câmaras ─────
  const camSmooth = 8; // velocidade de seguimento em unidades por segundo
  const rotSmooth = 5; // suavização de ângulo por segundo

  if (cameraMode === 0) {
    if (!isDragging) targetRotationOffset *= Math.pow(0.9, deltaTime * 60);
    cameraRotationOffset +=
      (targetRotationOffset - cameraRotationOffset) * rotSmooth * deltaTime;

    const base = new THREE.Vector3(0, 8.5, 8.5);
    const off = base
      .clone()
      .applyEuler(new THREE.Euler(0, cameraRotationOffset, 0))
      .applyEuler(car.rotation);

    // agora o lerp usa uma fração por segundo em vez de fixo por frame
    cameraPerspective.position.lerp(
      car.position.clone().add(off),
      camSmooth * deltaTime
    );
    cameraPerspective.lookAt(car.position);
  } else if (cameraMode === 1) {
    const aspect = innerWidth / innerHeight;
    orthoSizeTopView =
      aspect > 1 ? 10 * zoomTopView : (10 * zoomTopView) / aspect;
    cameraOrtho.left = -orthoSizeTopView * aspect;
    cameraOrtho.right = orthoSizeTopView * aspect;
    cameraOrtho.top = orthoSizeTopView;
    cameraOrtho.bottom = -orthoSizeTopView;
    cameraOrtho.updateProjectionMatrix();
    cameraOrtho.position.set(car.position.x, 60, car.position.z + 20);
    cameraOrtho.lookAt(car.position);
  } else {
    if (!isDragging) targetRotationOffset *= Math.pow(0.9, deltaTime * 60);
    cameraRotationOffset +=
      (targetRotationOffset - cameraRotationOffset) * rotSmooth * deltaTime;

    const base = new THREE.Vector3(0, 1.5, 4);
    const off = base
      .clone()
      .applyEuler(new THREE.Euler(0, cameraRotationOffset, 0))
      .applyEuler(car.rotation);

    cameraFollow.position.lerp(
      car.position.clone().add(off),
      camSmooth * deltaTime
    );
    cameraFollow.lookAt(car.position);
  }

  // ───── Zoom suave ─────
  zoomLevel += (targetZoomLevel - zoomLevel) * 0.1;
  activeCamera.zoom = zoomLevel;
  activeCamera.updateProjectionMatrix();

  // ───── Velocímetro ─────
  const kmh = Math.abs(d.velocity) * 3.6;
  speedEl.textContent = `${kmh.toFixed(0)} km/h`;

  // ───── Faróis ─────
  const L = new THREE.Vector3(-0.2, 0.2, -0.6).applyEuler(car.rotation);
  const R = new THREE.Vector3(0.2, 0.2, -0.6).applyEuler(car.rotation);
  const D = new THREE.Vector3(0, 0, -2).applyEuler(car.rotation);
  headlightLeft.position.copy(car.position.clone().add(L));
  headlightRight.position.copy(car.position.clone().add(R));
  targetLeft.position.copy(headlightLeft.position.clone().add(D));
  targetRight.position.copy(headlightRight.position.clone().add(D));

  // ───── Minimap ─────
  const cx = Math.floor((car.position.x - offsetX) / tileSize + 0.5);
  const cz = Math.floor((car.position.z - offsetZ) / tileSize + 0.5);
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx,
        nz = cz + dz;
      if (nx >= 0 && nx < mapW && nz >= 0 && nz < mapH) {
        visitedCells[nz][nx] = true;
      }
    }
  }
  drawMinimap(mapW, mapH, tileSize, offsetX, offsetZ);

  // Animação da neve a cair
  if (snowParticles) {
    const pos = snowParticles.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i * 3 + 1] -= 0.1;
      if (pos.array[i * 3 + 1] < 0) {
        pos.array[i * 3 + 1] = Math.random() * 50 + 10;
      }
    }
    pos.needsUpdate = true;
  }

  // Movimento do iglu em relação ao carro
  if (igluTunnel && igluPosition && car) {
    updateTunnelDirection(igluTunnel, igluPosition, car.position);
  }
  // Movimento do celeiro em relação ao carro
  if (celeiroGroup && celeiroPosition) {
    updateBarnDirection(celeiroGroup, celeiroPosition, car.position);
  }

  

  // ───── Render + fim de nível ─────
  renderer.render(scene, activeCamera);
  checkLevelComplete();
}

/* ───────────────────────────  checkLevelComplete ────────────────────── */
async function checkLevelComplete() {
  if (levelComplete || isInPreview || !levelData?.endPortal) return;

  const dist = car.position.distanceTo(levelData.endPortal.position);
  if (dist < 2) {
    levelComplete = true;
    controlsLocked = true;
    isTimerRunning = false;

    // Calcula tempo
    const elapsedMs = performance.now() - levelStartTime;
    const timeSec = elapsedMs / 1000;

    // Desbloqueia próximo nível localmente
    const nextLevelId = `level-${currentLevelIndex + 1}`;
    unlockLevel(nextLevelId);

    // Mostra tempo no modal
    modal.querySelector(
      ".time-display"
    ).textContent = `Tempo: ${timeSec.toFixed(2)}s`;

    // Submete à Firestore (só se for melhor)
    const levelId = `level-${currentLevelIndex}`;
    try {
      await submitScore(levelId, timeSec);
    } catch (err) {
      console.warn("Não foi possível enviar score:", err);
    }

    // Puxa o Top 5 e preenche a lista
    const tb = document.querySelector("#leaderboard-table tbody");
    tb.innerHTML = '<tr><td colspan="3">Carregando…</td></tr>';
    try {
      const top5 = await fetchLeaderboard(levelId, 5);
      const tb = document.querySelector("#leaderboard-table tbody");
      tb.innerHTML = "";
      if (top5.length === 0) {
        tb.innerHTML = '<tr><td colspan="3">Nenhum score ainda</td></tr>';
      } else {
        top5.forEach((entry, i) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${i + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.time.toFixed(2)}s</td>
          `;
          tb.appendChild(row);
        });
      }
    } catch (err) {
      tb.innerHTML =
        '<tr><td colspan="3">Erro ao carregar leaderboard</td></tr>';
      console.error(err);
    }

    // Mostra o modal
    modal.classList.add("show");

    // Bloqueia UI de fundo
    uiBlocks.forEach((el) => {
      el.style.filter = "blur(6px)";
      el.style.pointerEvents = "none";
    });
    // Opcional: impedir teclas/câmera enquanto o modal está aberto
    controlsLocked = true;
  }
}

/* ───────────────────────────  Minimap  ───────────────────────────────────── */
function drawMinimap(w, h, ts, ox, oz) {
  const canvas = document.getElementById("minimap");
  if (!canvas) return;
  const ctx = canvas.getContext("2d"),
    wPx = canvas.width,
    hPx = canvas.height;
  const cellW = wPx / w,
    cellH = hPx / h;

  // fundo
  const g = ctx.createLinearGradient(0, 0, 0, hPx);
  g.addColorStop(0, "#1a1a1a");
  g.addColorStop(1, "#333");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, wPx, hPx);

  // células
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = !visitedCells[z][x]
        ? "#000"
        : levelData.map[z][x] === 1
        ? "#445"
        : "#77a";
      ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
    }
  }

  // carro
  const carX = ((car.position.x - ox + ts / 2) / ts) * cellW;
  const carZ = ((car.position.z - oz + ts / 2) / ts) * cellH;
  ctx.save();
  ctx.translate(carX, carZ);
  ctx.rotate(-car.rotation.y);
  ctx.fillStyle = "#f33";
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(4, 4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ───────────────────────────  UI: Toggle de luzes  ───────────────────────── */
["toggleAmbient", "toggleDirectional", "togglePoint"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    if (isPaused) {
      e.target.checked = !e.target.checked;
      return;
    }
    if (id === "toggleAmbient")
      e.target.checked ? scene.add(ambientLight) : scene.remove(ambientLight);
    if (id === "toggleDirectional")
      e.target.checked
        ? scene.add(directionalLight)
        : scene.remove(directionalLight);
    if (id === "togglePoint")
      e.target.checked ? scene.add(pointLight) : scene.remove(pointLight);
    e.target.blur();
  });
});

/* ───────────────────────  Preview inicial do mapa  ───────────────────────── */
function showCountdown(seconds = 3) {
  controlsLocked = true;
  let count = seconds;
  countdownEl.textContent = count;
  countdownEl.style.opacity = "1";
  countdownEl.style.transform = "translate(-50%, -50%) scale(1.2)";

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
      countdownEl.style.transform = "translate(-50%, -50%) scale(1.2)";
      if (count === 2) {
        // apenas tiramos o blur e devolvemos a UI
        uiBlocks.forEach((el) => {
          el.style.filter = "none";
          el.style.pointerEvents = "auto";
        });
      }
    } else {
      // GO!
      countdownEl.textContent = "GO!";
      countdownEl.style.transform = "translate(-50%, -50%) scale(1.4)";

      // desbloqueio IMEDIATO e arranque do timer
      controlsLocked = false;
      levelStartTime = performance.now();
      isTimerRunning = true;
      isInPreview = false;

      // mantemos o "GO!" 1s visível e depois só escondemos o contador
      setTimeout(() => {
        countdownEl.style.opacity = "0";
        countdownEl.style.transform = "translate(-50%, -50%) scale(1)";
      }, 1000);

      clearInterval(interval);
    }
  }, 1000);
}
/* ───────────────────────  Inicialização do mapa nos 3s  ───────────────────────── */
function startMapPreviewSequence() {
  if (!levelData) return;

  isInPreview = true;

  uiBlocks.forEach((el) => {
    el.style.filter = "blur(6px)";
    el.style.pointerEvents = "none";
  });

  const { tileSize, offsetX, offsetZ, map } = levelData;
  const mapWidth = map[0].length,
    mapHeight = map.length;
  const centerX = (mapWidth * tileSize) / 2 + offsetX - tileSize / 2;
  const centerZ = (mapHeight * tileSize) / 2 + offsetZ - tileSize / 2;

  const canvasAspect = innerWidth / innerHeight;
  const mapRatio = mapWidth / mapHeight;
  orthoSizePreview =
    canvasAspect > mapRatio
      ? (mapHeight * tileSize * zoomPreview) / 2
      : (((mapWidth * tileSize) / canvasAspect) * zoomPreview) / 2;

  cameraOrtho.left = -orthoSizePreview * canvasAspect;
  cameraOrtho.right = orthoSizePreview * canvasAspect;
  cameraOrtho.top = orthoSizePreview;
  cameraOrtho.bottom = -orthoSizePreview;
  cameraOrtho.updateProjectionMatrix();

  cameraOrtho.position.set(centerX, 100, centerZ);
  cameraOrtho.lookAt(centerX, 0, centerZ);

  activeCamera = cameraOrtho;
  scene.fog = null;
  document.getElementById("minimap-container").style.display = "none";

  const previewText = document.getElementById("preview-text");
  previewText.style.opacity = 1;

  setTimeout(() => {
    previewText.style.opacity = 0;
    scene.fog = new THREE.Fog("#000000", 30, 80);
    document.getElementById("minimap-container").style.display = "block";

    transitionCamera.position.copy(cameraOrtho.position);
    transitionCamera.quaternion.copy(cameraOrtho.quaternion);
    activeCamera = transitionCamera;

    const fakeOffset = new THREE.Vector3(0, 1.5, 4)
      .applyEuler(new THREE.Euler(0, 0, 0))
      .applyEuler(car.rotation);

    const endPos = car.position.clone().add(fakeOffset);
    const endQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        endPos,
        car.position,
        new THREE.Vector3(0, 1, 0)
      )
    );

    const dur = 3000;
    const start = performance.now();
    const startPos = cameraOrtho.position.clone();
    const startQuat = cameraOrtho.quaternion.clone();

    function animateTransition(t) {
      const p = Math.min((t - start) / dur, 1);
      const e = easeInOutCubic(p);
      transitionCamera.position.lerpVectors(startPos, endPos, e);
      transitionCamera.quaternion.copy(startQuat.clone().slerp(endQuat, e));
      if (p < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        activeCamera = cameraFollow;
        cameraMode = 2;
      }
    }

    isInPreview = true;
    showCountdown(); // mostrar o contador durante a animação
    requestAnimationFrame(animateTransition);
  }, 3000);
}
