// js/customize.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { createCar } from '../assets/models/CarModel.js';

let scene, renderer, camera, car, controls, raf;

export function initCustomize(container) {
  // limpa instância anterior
  if (raf) cancelAnimationFrame(raf);
  container.innerHTML = '';

  // -- Renderer --
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // -- Cena e Fundo (céu) --
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87ceeb, 10, 50);         // névoa suave
  scene.background = new THREE.Color(0x87ceeb);        // azul claro

  // -- Câmara --
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  );
  camera.position.set(-2.5, 1.5, -3);

  // -- Controles de órbita --
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.05, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2.2;

  // -- Luzes --
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  // ==== CENÁRIO TIPO PISTA ====

  // 1) Chão de deserto
  const desertMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
  const desert = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 200),
    desertMat
  );
  desert.rotation.x = -Math.PI / 2;
  desert.position.y = 0;
  scene.add(desert);

  // 2) Estrada central
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xEAD096 });
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 200),
    roadMat
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  // 3) Faixas laterais (brancas)
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const stripeGeo = new THREE.PlaneGeometry(0.2, 200);
  [-6, 6].forEach(x => {
    const s = new THREE.Mesh(stripeGeo, stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.02, 0);
    scene.add(s);
  });

  // 4) Muros de contenção (marrom escuro)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x603441 });
  const wallGeo = new THREE.BoxGeometry(0.4, 0.5, 200);
  [-6.6, 6.6].forEach(x => {
    const m = new THREE.Mesh(wallGeo, wallMat);
    m.position.set(x, 0.25, 0);
    scene.add(m);
  });

  // ==== CARRO ====
  const loader = new THREE.TextureLoader();
  car = createCar(loader);
  car.position.set(0, 0.05, 0);
  scene.add(car);

  // -- Responsividade --
  window.addEventListener('resize', onResize);

  // -- Loop de animação --
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