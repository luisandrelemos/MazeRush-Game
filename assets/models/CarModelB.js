import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

export function createCarB(textureLoader, colors = {}) {
  const {
    primary   = "#4B5320",
    secondary = "#A9A9A9",
    structure = "#2F4F4F",
    wheels    = "#333333"
  } = colors;

  const car = new THREE.Group();

  // CHASSIS
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.25, 2.5),
    new THREE.MeshStandardMaterial({ color: primary, metalness: 0.6, roughness: 0.4 })
  );
  chassis.position.y = 0.125;
  chassis.userData.part = "primary";
  car.add(chassis);

  // TORRETA
  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.18, 32),
    new THREE.MeshStandardMaterial({ color: secondary, metalness: 0.7, roughness: 0.3 })
  );
  turret.position.set(0, 0.35, 0);
  turret.userData.part = "secondary";
  car.add(turret);

  // CANHÃO (frente)
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: structure, metalness: 0.8, roughness: 0.2 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.35, -0.9);
  barrel.userData.part = "structure";
  car.add(barrel);

  // RODAS
  const wheelGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: wheels });
  const wheelsArr = [];
  const rotating = [];
  const frontAxle = new THREE.Group();

  const sideOffset = 0.75;
  const rearPositions = [[-sideOffset, 0.06, 0.9], [sideOffset, 0.06, 0.9]];
  const frontPositions = [[-sideOffset, 0.06, -0.9], [sideOffset, 0.06, -0.9]];

  // Traseiras fixas
  rearPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    wheel.userData.part = "wheels";
    wheelsArr.push(wheel);
    rotating.push(wheel);
    car.add(wheel);
  });

  // Dianteiras no frontAxle
  frontPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos[0], pos[1], 0);
    wheel.userData.part = "wheels";
    wheelsArr.push(wheel);
    rotating.push(wheel);
    frontAxle.add(wheel);
  });
  frontAxle.position.z = -0.9;
  car.add(frontAxle);

  // ESTEIRAS
  const trackMaterial = new THREE.MeshStandardMaterial({ color: "#222222" });
  const leftTrack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 2.6), trackMaterial);
  leftTrack.position.set(-sideOffset, 0.06, 0);
  car.add(leftTrack);

  const rightTrack = leftTrack.clone();
  rightTrack.position.x = sideOffset;
  car.add(rightTrack);

  // FARÓIS
  const headMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff" });
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.035), headMat);
  const hr = hl.clone();
  hl.position.set(-0.35, 0.15, -1.25);
  hr.position.set( 0.35, 0.15, -1.25);
  car.add(hl, hr);

  const tailMat = new THREE.MeshStandardMaterial({ color: "#ff0000", emissive: "#ff0000" });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), tailMat);
  const tr = tl.clone();
  tl.position.set(-0.35, 0.15, 1.25);
  tr.position.set( 0.35, 0.15, 1.25);
  car.add(tl, tr);

  // ANTENA
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: "#000000" })
  );
  antenna.position.set(-0.3, 0.65, 0);
  car.add(antenna);

  // userData (física igual ao modelo A)
  car.userData = {
    wheels: wheelsArr,
    rotatingWheels: rotating,
    frontAxle,
    velocity: 0,
    maxSpeed: 0.1,
    acceleration: 0.001,
    friction: 0.96,
    boundingBoxSize: new THREE.Vector3(1.6, 0.6, 2.5)
  };

  return car;
}