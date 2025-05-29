// js/models/CarModelD.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

export function createCarD(textureLoader, colors = {}) {
  const {
    primary   = "#ffcc00", // amarelo gelado
    secondary = "#ffffff",
    structure = "#d2691e", // cor de waffle
    wheels    = "#333333"
  } = colors;

  const car = new THREE.Group();

  // BASE (primária)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.25, 2.2),
    new THREE.MeshStandardMaterial({ color: primary, metalness: 0.7, roughness: 0.4 })
  );
  base.position.y = 0.13;
  base.userData.part = "primary";
  car.add(base);

  // "CAIXA" de gelados (secundária)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 1.2),
    new THREE.MeshStandardMaterial({ color: secondary, metalness: 0.3, roughness: 0.7 })
  );
  box.position.set(0, 0.45, 0.3);
  box.userData.part = "secondary";
  car.add(box);

  // GUARDA-SOL (estrutura)
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.6, 16),
    new THREE.MeshStandardMaterial({ color: structure })
  );
  pole.position.set(0, 0.95, -0.4);
  car.add(pole);

  const umbrella = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: structure })
  );
  umbrella.position.set(0, 1.2, -0.4);
  car.add(umbrella);

  // VIDRO frontal (usado para estilo)
  const glassTex = textureLoader.load("/textures/glass.jpg");
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex, metalness: 1.0, roughness: 0.05,
    transparent: true, opacity: 0.7
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.04), glassMat);
  glass.position.set(0, 0.55, -0.8);
  car.add(glass);

  // LUZES
  const lightMatFront = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff" });
  const lf = new THREE.Mesh(new THREE.SphereGeometry(0.04), lightMatFront);
  lf.position.set(-0.4, 0.2, -1.1);
  const rf = lf.clone();
  rf.position.set(0.4, 0.2, -1.1);
  car.add(lf, rf);

  const lightMatBack = new THREE.MeshStandardMaterial({ color: "#ff0000", emissive: "#ff0000" });
  const lb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), lightMatBack);
  lb.position.set(-0.4, 0.2, 1.1);
  const rb = lb.clone();
  rb.position.set(0.4, 0.2, 1.1);
  car.add(lb, rb);

  // RODAS
  const wheelGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32);
  const tireTex  = textureLoader.load("/textures/tire.jpg");
  const wheelMat = new THREE.MeshStandardMaterial({ map: tireTex, color: wheels });
  const wheelsArr = [];
  const rotating = [];
  const frontAxle = new THREE.Group();

  [[-0.5,0.08,0.9],[0.5,0.08,0.9]].forEach(pos=>{
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(...pos);
    w.userData.part = "wheels";
    wheelsArr.push(w);
    rotating.push(w);
    car.add(w);
  });

  [[-0.5,0.08,-0.9],[0.5,0.08,-0.9]].forEach(pos=>{
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(pos[0], pos[1], 0);
    w.userData.part = "wheels";
    wheelsArr.push(w);
    rotating.push(w);
    frontAxle.add(w);
  });
  frontAxle.position.z = -0.9;
  car.add(frontAxle);

  car.userData = {
    wheels: wheelsArr,
    rotatingWheels: rotating,
    frontAxle,
    velocity:0, maxSpeed:0.08, acceleration:0.0012, friction:0.95,
    boundingBoxSize: new THREE.Vector3(1.3,0.6,2.3)
  };

  return car;
}