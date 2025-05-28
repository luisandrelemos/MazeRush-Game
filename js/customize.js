// js/customize.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { createCar } from '../assets/models/CarModel.js';
import { createCarB } from '../assets/models/CarModelB.js';
import { getCurrentProfile, updateProfile } from './profileSystem.js';

let scene, renderer, camera, car, controls, raf;
let saved; // armazenará as cores carregadas do perfil

// ─── Atualiza o contador de moedas no badge ─────────────────────────────
function updateCustomizeCoinCounter() {
  const profile = getCurrentProfile();
  const coinEl = document.getElementById('coin-count-custom');
  if (coinEl) coinEl.textContent = profile.coins || 0;
}

// ─── (Re)spawna o carro na cena de acordo com o tipo selecionado ─────────
function spawnCar(type, loader) {
  if (car) scene.remove(car);

  car = type === 1
    ? createCarB(loader)
    : createCar(loader);

  car.position.set(0, 0.2, 0);

  // marcação das partes para recoloração
  const [pM, sM, strM] = car.children;
  pM.userData.part   = 'primary';
  sM.userData.part   = 'secondary';
  strM.userData.part = 'structure';
  car.traverse(c => {
    if (c.isMesh && /wheel/i.test(c.name)) {
      c.userData.part = 'wheels';
    }
  });

  // aplica as cores salvas
  car.traverse(c => {
    if (c.isMesh && c.userData.part && saved[c.userData.part]) {
      c.material.color.set(saved[c.userData.part]);
    }
  });

  scene.add(car);
}

export function initCustomize(container) {
  if (raf) cancelAnimationFrame(raf);
  container.innerHTML = '';

  // ─── 0.1) Criar badge de moedas logo abaixo do botão “← Voltar” ───────
  const header = document.querySelector('#customize-page .levels-header');
  let coinBadge = document.getElementById('coin-badge-custom');
  if (!coinBadge && header) {
    coinBadge = document.createElement('div');
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
      marginLeft: '8px',
      width: 'fit-content'
    });
    coinBadge.innerHTML = '💰 <span id="coin-count-custom">0</span>';
    // ➔ posiciona logo abaixo do header
    const backBtn = header.querySelector('.back-button');
    backBtn.parentNode.insertBefore(coinBadge, backBtn.nextSibling);
  }
  // Atualiza o valor mostrado
  updateCustomizeCoinCounter();

  // ─── 0.2) Selector de modelo de carro ─────────────────────────────────
  let select = document.getElementById('car-model-select');
  if (!select && header) {
    select = document.createElement('select');
    select.id = 'car-model-select';
    Object.assign(select.style, {
      marginLeft: '1rem',
      padding: '4px 8px',
      fontSize: '1rem'
    });
    [['Modelo A',0], ['Modelo B',1]].forEach(([label, idx]) => {
      const o = document.createElement('option');
      o.value = idx;
      o.textContent = label;
      select.appendChild(o);
    });
    header.appendChild(select);
  }

  // ─── 1) Carregar cores do perfil ───────────────────────────────────────
  const cur = getCurrentProfile();
  saved = cur.carColors || {
    primary:   '#603441',
    secondary: '#ffffff',
    structure: '#131313',
    wheels:    '#666666'
  };
  document.getElementById('color-primary').value   = saved.primary;
  document.getElementById('color-secondary').value = saved.secondary;
  document.getElementById('color-structure').value = saved.structure;
  document.getElementById('color-wheels').value    = saved.wheels;

  // ─── 2) Botão “Guardar” ───────────────────────────────────────────────
  let saveBtn = document.getElementById('save-custom-btn');
  if (!saveBtn && header) {
    saveBtn = document.createElement('button');
    saveBtn.id = 'save-custom-btn';
    saveBtn.className = 'back-button';
    saveBtn.textContent = '💾 Guardar';
    saveBtn.style.marginLeft = 'auto';
    header.appendChild(saveBtn);
  }
  saveBtn.onclick = () => {
    const cur2 = getCurrentProfile();
    // guarda também o modelo selecionado
    const select = document.getElementById('car-model-select');
    cur2.selectedModel = select ? parseInt(select.value) : 0;
    cur2.carColors = {
      primary:   document.getElementById('color-primary').value,
      secondary: document.getElementById('color-secondary').value,
      structure: document.getElementById('color-structure').value,
      wheels:    document.getElementById('color-wheels').value,
    };
    updateProfile(cur2);
    alert('Cores guardadas no perfil!');
  };

  // ─── 3) Renderer ─────────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // ─── 4) Cena + céu + neblina ─────────────────────────────────────────
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 10, 150);

  // ─── 5) Câmera ───────────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  );
  camera.position.set(-1.5, 1.5, -4);
  camera.lookAt(0, 0.1, 0);

  // ─── 6) Controles ────────────────────────────────────────────────────
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2.2;

  // ─── 7) Iluminação ──────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // ─── 8) Montanhas low-poly em volta do mapa ─────────────────────────
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6aa84f });
  const pistaL =  8,
        pistaC = 200,
        pMeio = pistaC/2,
        margem= 20,
        limite= pMeio + margem,
        esp   = 10;
  // Norte/Sul
  for (let x = -limite; x <= limite; x += esp) {
    [-limite, limite].forEach(z => {
      const h = 3 + Math.random()*4;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(5, h, 4),
        hillMat
      );
      hill.rotation.y = Math.random()*Math.PI;
      hill.position.set(x, h/2, z);
      scene.add(hill);
    });
  }
  // Leste/Oeste
  for (let z = -limite+esp; z <= limite-esp; z += esp) {
    [-limite, limite].forEach(x => {
      const h = 3 + Math.random()*4;
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(5, h, 4),
        hillMat
      );
      hill.rotation.y = Math.random()*Math.PI;
      hill.position.set(x, h/2, z);
      scene.add(hill);
    });
  }

  // ─── 9) Plano de areia ───────────────────────────────────────────────
  const desertMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
  const desert = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    desertMat
  );
  desert.rotation.x = -Math.PI/2;
  scene.add(desert);

  // ─── 10) Asfalto da pista ────────────────────────────────────────────
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(pistaL, pistaC),
    roadMat
  );
  road.rotation.x = -Math.PI/2;
  road.position.y = 0.01;
  scene.add(road);

  // ─── 11) Faixas brancas/vermelhas ───────────────────────────────────
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const redM   = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const fL = 0.5, oZ = 2;
  for (let z = -pMeio; z <= pMeio; z += 4) {
    [ -pistaL/2, +pistaL/2 ].forEach(x => {
      const w = new THREE.Mesh(
        new THREE.PlaneGeometry(fL, 2),
        whiteM
      );
      w.rotation.x = -Math.PI/2;
      w.position.set(x, 0.02, z);
      scene.add(w);

      const r = new THREE.Mesh(
        new THREE.PlaneGeometry(fL, 2),
        redM
      );
      r.rotation.x = -Math.PI/2;
      r.position.set(x, 0.02, z - oZ);
      scene.add(r);
    });
  }

  // ─── 12) Linha central ───────────────────────────────────────────────
  const centerStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, pistaC),
    new THREE.MeshStandardMaterial({ color: 0xffa500 })
  );
  centerStripe.rotation.x = -Math.PI/2;
  centerStripe.position.y = 0.02;
  scene.add(centerStripe);

  // ─── 13) Borda baixa da pista ────────────────────────────────────────
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wallGeo = new THREE.BoxGeometry(0.3, 0.2, pistaC);
  [ -pistaL/2 - 0.15, +pistaL/2 + 0.15 ].forEach(x => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, 0.1, 0);
    scene.add(wall);
  });

  // ─── 14) Carrega e spawna o carro inicial ─────────────────────────────
  const loader = new THREE.TextureLoader();
  spawnCar(+select.value, loader);

  // troca de modelo ao selecionar
  select.addEventListener('change', e => spawnCar(+e.target.value, loader));

  // ─── 15) Conectar pickers de cor ─────────────────────────────────────
  [
    { id: 'color-primary',   part: 'primary'   },
    { id: 'color-secondary', part: 'secondary' },
    { id: 'color-structure', part: 'structure' },
    { id: 'color-wheels',    part: 'wheels'    },
  ].forEach(({id, part}) => {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.addEventListener('input', e => {
      car.traverse(c => {
        if (c.isMesh && c.userData.part === part) {
          c.material.color.set(e.target.value);
        }
      });
    });
  });

  // ─── 16) Responsividade ───────────────────────────────────────────────
  window.addEventListener('resize', onResize);

  // ─── 17) Loop de renderização ────────────────────────────────────────
  (function animate() {
    raf = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}

function onResize() {
  const w = renderer.domElement.parentElement.clientWidth;
  const h = renderer.domElement.parentElement.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ─── Função de compra (desconta moedas e atualiza badge) ────────────────
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
