// js/customize.js
import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { createCar } from '../assets/models/CarModel.js';

let scene, renderer, camera, car, raf;

export function initCustomize(container) {
  // limpar instância anterior
  if (raf) cancelAnimationFrame(raf);
  container.innerHTML = '';

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Cena e Câmara
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 0, 0);

  // Luzes
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // Piso simples
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x3366aa })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Carro
  const loader = new THREE.TextureLoader();
  car = createCar(loader);
  car.position.y = 0.1;
  scene.add(car);

  // Ajustar tamanho e preservar aspect
  window.addEventListener('resize', onResize);
  onResize();

  // Loop de animação
  (function animate() {
    raf = requestAnimationFrame(animate);
    car.rotation.y += 0.005;
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