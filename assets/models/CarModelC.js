import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

export function createCarC(textureLoader, colors = {}) {
  const {
    primary   = "#ff0000", // Vermelho esportivo
    secondary = "#111111", // Preto fosco
    structure = "#333333",
    wheels    = "#222222"
  } = colors;

  const car = new THREE.Group();

  // CHASSIS
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.15, 2.2),
    new THREE.MeshStandardMaterial({ color: primary, metalness: 0.9, roughness: 0.2 })
  );
  chassis.position.y = 0.1;
  chassis.userData.part = "primary";
  car.add(chassis);

  // COCKPIT
  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.2, 1.0),
    new THREE.MeshStandardMaterial({ color: secondary, metalness: 0.8, roughness: 0.3 })
  );
  cockpit.position.set(0, 0.22, -0.2);
  cockpit.userData.part = "secondary";
  car.add(cockpit);

  // VIDROS
  const glassTex = textureLoader.load("/textures/glass.jpg");
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex, metalness: 1.0, roughness: 0.05,
    transparent: true, opacity: 0.7
  });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.2, 0.04), glassMat);
  windshield.position.set(0, 0.3, -0.55);
  car.add(windshield);

  const backGlass = windshield.clone();
  backGlass.position.set(0, 0.29, 0.35);
  car.add(backGlass);

  // FARÓIS
  const headMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff" });
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.035), headMat);
  const hr = hl.clone();
  hl.position.set(-0.45, 0.15, -1.1);
  hr.position.set( 0.45, 0.15, -1.1);
  car.add(hl, hr);

  // TRASEIROS
  const tailMat = new THREE.MeshStandardMaterial({ color: "#ff0000", emissive: "#ff0000" });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), tailMat);
  const tr = tl.clone();
  tl.position.set(-0.45, 0.15, 1.1);
  tr.position.set( 0.45, 0.15, 1.1);
  car.add(tl, tr);

  // SPOILER
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.03, 0.25),
    new THREE.MeshStandardMaterial({ color: structure, metalness: 0.8 })
  );
  spoiler.position.set(0, 0.25, 1.25);
  spoiler.userData.part = "structure";
  car.add(spoiler);

  // RODAS
  const wheelGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.15, 32);
  const tireTex  = textureLoader.load("/textures/tire.jpg");
  const wheelMat = new THREE.MeshStandardMaterial({ map: tireTex, color: wheels });
  const wheelsArr = [];
  const rotating = [];
  const frontAxle = new THREE.Group();

  // Traseiras
  [[-0.5, 0.07, 0.95],[0.5, 0.07, 0.95]].forEach(pos => {
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(...pos);
    w.userData.part = "wheels";
    wheelsArr.push(w);
    rotating.push(w);
    car.add(w);
  });

  // Dianteiras
  [[-0.5, 0.07, -0.95],[0.5, 0.07, -0.95]].forEach(pos => {
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(pos[0], pos[1], 0);
    w.userData.part = "wheels";
    wheelsArr.push(w);
    rotating.push(w);
    frontAxle.add(w);
  });
  frontAxle.position.z = -0.95;
  car.add(frontAxle);

  car.userData = {
    wheels: wheelsArr,
    rotatingWheels: rotating,
    frontAxle,
    velocity: 0,
    maxSpeed: 0.12,
    acceleration: 0.0015,
    friction: 0.97,
    boundingBoxSize: new THREE.Vector3(1.4, 0.2, 2.4)
  };

  return car;
}