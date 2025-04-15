import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';

export function createCar(textureLoader) {
  const car = new THREE.Group();

  // CHASSIS
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.2, 2.0),
    new THREE.MeshStandardMaterial({ color: '#ff2e2e', metalness: 0.8, roughness: 0.3 })
  );
  chassis.position.y = 0.12;
  car.add(chassis);

  // COCKPIT
  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.25, 0.9),
    new THREE.MeshStandardMaterial({ color: '#191919', metalness: 0.6, roughness: 0.2 })
  );
  cockpit.position.set(0, 0.28, -0.1);
  car.add(cockpit);

  // VIDROS
  const glassTexture = textureLoader.load('/textures/glass.jpg');
  const glassMaterial = new THREE.MeshStandardMaterial({
    map: glassTexture,
    metalness: 1.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.8
  });

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.04), glassMaterial);
  windshield.position.set(0, 0.37, -0.48);
  car.add(windshield);

  const backGlass = windshield.clone();
  backGlass.position.set(0, 0.35, 0.25);
  car.add(backGlass);

  // FARÓIS DIANTEIROS
  const headlightMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff' });
  const headlightL = new THREE.Mesh(new THREE.SphereGeometry(0.035), headlightMaterial);
  const headlightR = headlightL.clone();
  headlightL.position.set(-0.35, 0.18, -1.0);
  headlightR.position.set(0.35, 0.18, -1.0);
  car.add(headlightL, headlightR);

  // FARÓIS TRASEIROS
  const tailLightMaterial = new THREE.MeshStandardMaterial({ color: '#ff0000', emissive: '#ff0000' });
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), tailLightMaterial);
  const tailR = tailL.clone();
  tailL.position.set(-0.35, 0.18, 1.0);
  tailR.position.set(0.35, 0.18, 1.0);
  car.add(tailL, tailR);

  // SPOILER
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.025, 0.2),
    new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.7 })
  );
  spoiler.position.set(0, 0.3, 1.1);
  car.add(spoiler);

  // RODAS
  const wheels = [];
  const frontAxle = new THREE.Group();
  const rotatingWheels = [];

  const wheelGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 32);
  const wheelTexture = textureLoader.load('/textures/tire.jpg');
  const wheelMaterial = new THREE.MeshStandardMaterial({ map: wheelTexture });

  // Traseiras (fixas)
  const rearPositions = [
    [-0.45, 0.08, 0.85],
    [0.45, 0.08, 0.85]
  ];
  rearPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheels.push(wheel);
    rotatingWheels.push(wheel);
    car.add(wheel);
  });

  // Dianteiras (em grupo para virar)
  const frontPositions = [
    [-0.45, 0.08, -0.85],
    [0.45, 0.08, -0.85]
  ];
  frontPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, 0);
    wheels.push(wheel);
    rotatingWheels.push(wheel);
    frontAxle.add(wheel);
    frontAxle.position.z = z;
  });

  car.add(frontAxle);

  // Dados do carro
  car.userData = {
    wheels,
    rotatingWheels,
    frontAxle,
    velocity: 0,
    maxSpeed: 0.1,
    acceleration: 0.001,
    friction: 0.96
  };

  return car;
}