// js/customize.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { createCar } from '../assets/models/CarModel.js';
import { createCarB } from '../assets/models/CarModelB.js';
import { createCarC } from '../assets/models/CarModelC.js';
import { createCarD } from '../assets/models/CarModelD.js';
import { getCurrentProfile, updateProfile } from './profileSystem.js';

let scene, renderer, camera, car, controls, raf;
let savedModels;
let currentModel = 0;
let lockOverlay, lockBtn;

const DEFAULT_CAR_MODELS = [
  { primary: "#603441", secondary: "#ffffff", structure: "#131313", wheels: "#666666" },
  { primary: "#4B5320", secondary: "#A9A9A9", structure: "#2F4F4F", wheels: "#333333" },
  { primary: "#ff0000", secondary: "#111111", structure: "#333333", wheels: "#222222" },
  { primary: "#0000ff", secondary: "#eeeeee", structure: "#555555", wheels: "#444444" }
];

function updateCustomizeCoinCounter() {
  const { coins = 0 } = getCurrentProfile();
  const coinEl = document.getElementById('coin-count-custom');
  if (coinEl) coinEl.textContent = coins;
}

function spawnCar(type, loader) {
  if (car) scene.remove(car);

  if (type === 1) {
    car = createCarB(loader);
  } else if (type === 2) {
    car = createCarC(loader);
  } else if (type === 3) {
    car = createCarD(loader);
  } else {
    car = createCar(loader);
  }

  car.position.set(0, 0.2, 0);

  car.traverse(mesh => {
    if (!mesh.isMesh) return;
    let part = mesh.userData.part;
    if (!part && /wheel/i.test(mesh.name)) part = 'wheels';
    if (part) {
      mesh.material.color.set(savedModels[type][part]);
      mesh.userData.part = part;
    }
  });

  scene.add(car);
}

function showLockOverlay(container, modelIdx) {
  hideLockOverlay();

  lockOverlay = document.createElement('div');
  Object.assign(lockOverlay.style, {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 900,
    pointerEvents: 'none'
  });
  container.appendChild(lockOverlay);

  lockBtn = document.createElement('button');
  lockBtn.textContent = '🔒 Comprar por 100 💰';
  Object.assign(lockBtn.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '12px 20px',
    fontSize: '1rem',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    zIndex: 1002
  });
  lockBtn.addEventListener('click', async () => {
    const prof = getCurrentProfile();
    if ((prof.coins || 0) >= 100) {
      prof.coins -= 100;
      prof.unlockedCars = prof.unlockedCars || [];
      prof.unlockedCars.push(modelIdx);
      updateProfile(prof);
      updateCustomizeCoinCounter();
      hideLockOverlay();

      // 🔥 Atualiza na base de dados Firebase
      import('./leaderboard.js').then(({ saveCoins }) => {
        saveCoins(prof.userId, prof.coins);
      });
    } else {
      alert("Moedas insuficientes!");
    }
  })
  container.appendChild(lockBtn);
}

function disableColorSliders() {
  ['primary', 'secondary', 'structure', 'wheels'].forEach(part => {
    const input = document.getElementById(`color-${part}`);
    if (input) input.disabled = true;
  });
}

function enableColorSliders() {
  ['primary', 'secondary', 'structure', 'wheels'].forEach(part => {
    const input = document.getElementById(`color-${part}`);
    if (input) input.disabled = false;
  });
}

function hideLockOverlay() {
  if (lockOverlay) { lockOverlay.remove(); lockOverlay = null; }
  if (lockBtn) { lockBtn.remove(); lockBtn = null; }
}

export function initCustomize(container) {
  if (raf) cancelAnimationFrame(raf);
  container.innerHTML = '';

  const header = document.querySelector('#customize-page .levels-header');
  if (header && !document.getElementById('coin-badge-custom')) {
    const coinBadge = document.createElement('div');
    coinBadge.id = 'coin-badge-custom';
    Object.assign(coinBadge.style, {
      display: 'inline-flex',
      padding: '6px 12px',
      background: 'rgba(0,0,0,0.6)',
      color: '#FFD700',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      borderRadius: '16px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      marginLeft: '8px'
    });
    coinBadge.innerHTML = '💰 <span id="coin-count-custom">0</span>';
    header.querySelector('.back-button').after(coinBadge);
  }
  updateCustomizeCoinCounter();

  const profile = getCurrentProfile();
  profile.unlockedCars = profile.unlockedCars || [0];

  if (Array.isArray(profile.carModels)) {
    savedModels = profile.carModels.slice();
  } else {
    savedModels = DEFAULT_CAR_MODELS.slice();
  }
  while (savedModels.length < DEFAULT_CAR_MODELS.length) {
    savedModels.push({ ...DEFAULT_CAR_MODELS[savedModels.length] });
  }

  currentModel = profile.selectedModel || 0;

  ['primary', 'secondary', 'structure', 'wheels'].forEach(part => {
    const input = document.getElementById(`color-${part}`);
    if (!input) return;
    input.value = savedModels[currentModel][part];
    input.disabled = !profile.unlockedCars.includes(currentModel);
    input.addEventListener('input', e => {
      if (!profile.unlockedCars.includes(currentModel)) return;
      savedModels[currentModel][part] = e.target.value;
      car.traverse(mesh => {
        if (mesh.isMesh && mesh.userData.part === part) {
          mesh.material.color.set(e.target.value);
        }
      });
    });
  });

  const loader = new THREE.TextureLoader();
  ['left', 'right'].forEach(dir => {
    const arrow = document.createElement('div');
    arrow.className = `customize-arrow ${dir}`;
    arrow.textContent = dir === 'left' ? '◀' : '▶';
    Object.assign(arrow.style, {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '2.5rem',
      color: '#fff',
      background: 'rgba(0,0,0,0.5)',
      padding: '12px',
      borderRadius: '50%',
      cursor: 'pointer',
      userSelect: 'none',
      zIndex: 1000,
      [dir === 'left' ? 'left' : 'right']: '16px'
    });
    container.appendChild(arrow);
    arrow.addEventListener('click', () => {
      hideLockOverlay();
      const total = savedModels.length;
      currentModel = dir === 'left'
        ? (currentModel + total - 1) % total
        : (currentModel + 1) % total;

      ['primary', 'secondary', 'structure', 'wheels'].forEach(part => {
        document.getElementById(`color-${part}`).value = savedModels[currentModel][part];
      });

      spawnCar(currentModel, loader);

      const prof = getCurrentProfile();
      if (!prof.unlockedCars.includes(currentModel)) {
        showLockOverlay(container, currentModel);
        disableColorSliders();
      } else {
        hideLockOverlay();
        enableColorSliders();
      }
    });
  });

  let saveBtn = document.getElementById('save-custom-btn');
  if (header && !saveBtn) {
    saveBtn = document.createElement('button');
    saveBtn.id = 'save-custom-btn';
    saveBtn.className = 'back-button';
    saveBtn.textContent = '💾 Guardar';
    saveBtn.style.marginLeft = 'auto';
    header.appendChild(saveBtn);
  }
  saveBtn.onclick = () => {
    const updated = getCurrentProfile();
    if (!updated.unlockedCars.includes(currentModel)) {
      alert("Não podes guardar um modelo que ainda não compraste!");
      return;
    }
    updated.carModels = savedModels;
    updated.selectedModel = currentModel;
    updateProfile(updated);
    alert('Cores e modelo guardados no perfil!');
  };

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 10, 150);

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(-1.5, 1.5, -4);
  camera.lookAt(0, 0.1, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2.2;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  spawnCar(currentModel, loader);
  if (!profile.unlockedCars.includes(currentModel)) {
    showLockOverlay(container, currentModel);
  }

  // ─── 4) Montanhas, pista, areia… ────────────────────────────────────
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6aa84f });
  const pistaL = 8, pistaC = 200, pMeio = pistaC/2, margem = 20, limite = pMeio + margem, esp = 10;
  for (let x = -limite; x <= limite; x += esp) {
    [-limite, limite].forEach(z => {
      const h = 3 + Math.random() * 4;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(5, h, 4), hillMat);
      hill.rotation.y = Math.random() * Math.PI;
      hill.position.set(x, h / 2, z);
      scene.add(hill);
    });
  }
  for (let z = -limite + esp; z <= limite - esp; z += esp) {
    [-limite, limite].forEach(x => {
      const h = 3 + Math.random() * 4;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(5, h, 4), hillMat);
      hill.rotation.y = Math.random() * Math.PI;
      hill.position.set(x, h / 2, z);
      scene.add(hill);
    });
  }

  const desertMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
  const desert = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), desertMat);
  desert.rotation.x = -Math.PI / 2;
  scene.add(desert);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(pistaL, pistaC), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  const whiteM = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const redM   = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  for (let z = -pMeio; z <= pMeio; z += 4) {
    [ -pistaL/2, +pistaL/2 ].forEach(x => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2), whiteM);
      w.rotation.x = -Math.PI/2; w.position.set(x, 0.02, z);
      scene.add(w);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2), redM);
      r.rotation.x = -Math.PI/2; r.position.set(x, 0.02, z - 2);
      scene.add(r);
    });
  }

  const centerStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, pistaC),
    new THREE.MeshStandardMaterial({ color: 0xffa500 })
  );
  centerStripe.rotation.x = -Math.PI / 2;
  centerStripe.position.y = 0.02;
  scene.add(centerStripe);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wallGeo = new THREE.BoxGeometry(0.3, 0.2, pistaC);
  [ -pistaL/2 - 0.15, +pistaL/2 + 0.15 ].forEach(x => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, 0.1, 0);
    scene.add(wall);
  });

  // ─── 5) Responsividade + Loop ─────────────────────────────────────────
 window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  (function animate() {
    raf = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

export function buyItem(cost) {
  const prof = getCurrentProfile();
  if ((prof.coins || 0) >= cost) {
    prof.coins -= cost;
    updateProfile(prof);
    updateCustomizeCoinCounter();
    alert('Item comprado!');
  } else {
    alert('Moedas insuficientes!');
  }
}