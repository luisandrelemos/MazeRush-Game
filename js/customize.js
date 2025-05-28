// js/customize.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { createCar } from '../assets/models/CarModel.js';

let scene, renderer, camera, car, controls, raf;

export function initCustomize(container) {
  if (raf) cancelAnimationFrame(raf);
  container.innerHTML = '';

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Cena + céu + névoa
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 10, 150);

  // Câmara (mantém tua posição)
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  );
  camera.position.set(-2.5, 1.5, -3);
  camera.lookAt(0, 0.1, 0);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2.2;

  // Luzes
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // 1) Montanhas low-poly atrás
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

  // 2) Deserto lateral
  const desertMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
  const desert = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    desertMat
  );
  desert.rotation.x = -Math.PI / 2;
  desert.position.y = 0;
  scene.add(desert);

  // 3) Pista (asfalto escuro)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 200),
    roadMat
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  // 4) Faixas vermelhas e brancas (curb)
  const curbWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const curbRed   = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  for (let z = -100; z <= 100; z += 4) {
    // lado esquerdo
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), curbWhite);
    w1.rotation.x = -Math.PI / 2;
    w1.position.set(-9.5, 0.02, z);
    scene.add(w1);
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), curbRed);
    r1.rotation.x = -Math.PI / 2;
    r1.position.set(-8.5, 0.02, z);
    scene.add(r1);

    // lado direito (espelhado)
    const w2 = w1.clone(); w2.position.x = 9.5; scene.add(w2);
    const r2 = r1.clone(); r2.position.x = 8.5; scene.add(r2);
  }

  // 5) Faixa central laranja
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xffa500 });
  const centerStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 200),
    orangeMat
  );
  centerStripe.rotation.x = -Math.PI / 2;
  centerStripe.position.y = 0.02;
  scene.add(centerStripe);

  // 6) Muros de contenção frontais (preto)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const wallGeo = new THREE.BoxGeometry(1, 1, 200);
  [-10.5, 10.5].forEach(x => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, 0.5, 0);
    scene.add(wall);
  });

  // Carro
  const loader = new THREE.TextureLoader();
  car = createCar(loader);
  car.position.set(0, 0.2, 0);
  scene.add(car);

  // Responsividade
  window.addEventListener('resize', onResize);

  // Loop de render
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