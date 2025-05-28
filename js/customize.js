// js/customize.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { createCar } from '../assets/models/CarModel.js';
import { getCurrentProfile, updateProfile } from './profileSystem.js';

let scene, renderer, camera, car, controls, raf;

export function initCustomize(container) {
  if (raf) cancelAnimationFrame(raf);
  container.innerHTML = '';

  // ─── 0) Carregar cores guardadas no perfil ───
  const cur = getCurrentProfile();
  const saved = cur.carColors || {
    primary:   '#603441',
    secondary: '#ffffff',
    structure: '#131313',
    wheels:    '#666666'
  };
  // actualiza os inputs antes de anexar eventos
  document.getElementById('color-primary').value   = saved.primary;
  document.getElementById('color-secondary').value = saved.secondary;
  document.getElementById('color-structure').value = saved.structure;
  document.getElementById('color-wheels').value    = saved.wheels;

  // ==== HEADER: ADICIONAR BOTÃO SAVE ====
  const header = document.querySelector('#customize-page .levels-header');
  let saveBtn = document.getElementById('save-custom-btn');
  if (!saveBtn && header) {
    saveBtn = document.createElement('button');
    saveBtn.id = 'save-custom-btn';
    saveBtn.className = 'back-button';
    saveBtn.textContent = '💾 Guardar';
    // inserimos depois do botão de voltar
    header.appendChild(saveBtn);
  }
  saveBtn.onclick = () => {
    const cur = getCurrentProfile();
    cur.carColors = {
      primary:   document.getElementById('color-primary').value,
      secondary: document.getElementById('color-secondary').value,
      structure: document.getElementById('color-structure').value,
      wheels:    document.getElementById('color-wheels').value,
    };
    updateProfile(cur);
    alert('Cores guardadas no perfil!');
  };

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Scene + sky + fog
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 10, 150);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  );
  camera.position.set(-2.5, 1.5, -3);
  camera.lookAt(0, 0.1, 0);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2.2;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // 1) Distant low-poly hills
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x6aa84f });
  for (let x = -100; x <= 100; x += 10) {
    const h = 2 + Math.random() * 3;
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(5, h, 4),
      hillMat
    );
    hill.rotation.y = Math.random() * Math.PI;
    hill.position.set(x, h / 2, 80);
    scene.add(hill);
  }

  // 2) Sand plane
  const desertMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
  const desert = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    desertMat
  );
  desert.rotation.x = -Math.PI / 2;
  desert.position.y = 0;
  scene.add(desert);

  // 3) Track asphalt
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 200),
    roadMat
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  // 4) Red/white curbs
  const curbWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const curbRed   = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  for (let z = -100; z <= 100; z += 4) {
    [ -9.5, +9.5 ].forEach(x => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1,2), curbWhite);
      w.rotation.x = -Math.PI/2;
      w.position.set(x,0.02,z);
      scene.add(w);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(1,2), curbRed);
      r.rotation.x = -Math.PI/2;
      r.position.set(x>0? x-1: x+1, 0.02, z);
      scene.add(r);
    });
  }

  // 5) Center stripe
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
  const centerStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 200),
    orangeMat
  );
  centerStripe.rotation.x = -Math.PI/2;
  centerStripe.position.y = 0.02;
  scene.add(centerStripe);

  // 6) Black containment walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wallGeo = new THREE.BoxGeometry(1,1,200);
  [ -10.5, +10.5 ].forEach(x => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, 0.5, 0);
    scene.add(wall);
  });

  // Car
  const loader = new THREE.TextureLoader();
  car = createCar(loader);
  car.position.set(0, 0.2, 0);

  // — assign your “parts” so we can recolor them — 
  // adjust these to match your model’s structure!
  // here we assume car.children[0]=primary, [1]=secondary, [2]=structure
  const [primaryMesh, secondaryMesh, structureMesh] = car.children;
  primaryMesh.userData.part   = 'primary';
  secondaryMesh.userData.part = 'secondary';
  structureMesh.userData.part = 'structure';
  // wheels might be nested:
  car.traverse(child => {
    if (child.isMesh && /wheel/i.test(child.name)) {
      child.userData.part = 'wheels';
    }
  });

  // ─── 1) Aplicar cores guardadas ao modelo ───
  car.traverse(child => {
    if (child.isMesh && child.userData.part) {
      const part = child.userData.part;
      if (saved[part]) child.material.color.set(saved[part]);
    }
  });

  scene.add(car);

  // — hook up the color pickers —
  const mappings = [
    { id: 'color-primary',   part: 'primary'   },
    { id: 'color-secondary', part: 'secondary' },
    { id: 'color-structure', part: 'structure' },
    { id: 'color-wheels',    part: 'wheels'    },
  ];
  mappings.forEach(({id, part}) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', e => {
      const hex = e.target.value;
      car.traverse(child => {
        if (child.isMesh && child.userData.part === part) {
          child.material.color.set(hex);
        }
      });
    });
  });

  // Responsividade
  window.addEventListener('resize', onResize);

  // Render loop
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