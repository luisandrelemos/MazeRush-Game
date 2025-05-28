// js/models/CarModel.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

export function createCar(textureLoader, colors = {}) {
  // cores por defeito
  const {
    primary   = "#603441",
    secondary = "#ffffff",
    structure = "#131313",
    wheels    = "#666666"
  } = colors;

  const car = new THREE.Group();

  // CHASSIS (primária)
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.2, 2.0),
    new THREE.MeshStandardMaterial({ color: primary, metalness: 0.8, roughness: 0.3 })
  );
  chassis.position.y = 0.12;
  chassis.userData.part = "primary";
  car.add(chassis);

  // COCKPIT (secundária)
  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.25, 0.9),
    new THREE.MeshStandardMaterial({ color: secondary, metalness: 0.6, roughness: 0.2 })
  );
  cockpit.position.set(0, 0.28, -0.1);
  cockpit.userData.part = "secondary";
  car.add(cockpit);

  // VIDROS (fixo)
  const glassTex = textureLoader.load("/textures/glass.jpg");
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex, metalness: 1.0, roughness: 0.05,
    transparent: true, opacity: 0.8
  });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.25,0.04), glassMat);
  windshield.position.set(0,0.37,-0.48);
  car.add(windshield);
  const backGlass = windshield.clone();
  backGlass.position.set(0,0.35,0.25);
  car.add(backGlass);

  // FARÓIS (fixo)
  const headMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff" });
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.035), headMat);
  const hr = hl.clone();
  hl.position.set(-0.35,0.18,-1.0);
  hr.position.set( 0.35,0.18,-1.0);
  car.add(hl, hr);

  // FARÓIS TRASEIROS (fixo)
  const tailMat = new THREE.MeshStandardMaterial({ color: "#ff0000", emissive: "#ff0000" });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.04,0.04), tailMat);
  const tr = tl.clone();
  tl.position.set(-0.35,0.18,1.0);
  tr.position.set( 0.35,0.18,1.0);
  car.add(tl, tr);

  // SPOILER (estrutura)
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(0.75,0.025,0.2),
    new THREE.MeshStandardMaterial({ color: structure, metalness: 0.7 })
  );
  spoiler.position.set(0,0.3,1.1);
  spoiler.userData.part = "structure";
  car.add(spoiler);

  // RODAS (wheels)
  const wheelGeom = new THREE.CylinderGeometry(0.22,0.22,0.12,32);
  const tireTex  = textureLoader.load("/textures/tire.jpg");
  const wheelMat = new THREE.MeshStandardMaterial({ map: tireTex, color: wheels });
  const wheelsArr = [];
  const rotating = [];
  const frontAxle = new THREE.Group();

  // traseiras
  [[-0.45,0.08,0.85],[0.45,0.08,0.85]].forEach(pos=>{
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(...pos);
    w.userData.part = "wheels";
    wheelsArr.push(w);
    rotating.push(w);
    car.add(w);
  });

  // dianteiras
  [[-0.45,0.08,-0.85],[0.45,0.08,-0.85]].forEach(pos=>{
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(pos[0],pos[1],0);
    w.userData.part = "wheels";
    wheelsArr.push(w);
    rotating.push(w);
    frontAxle.add(w);
  });
  frontAxle.position.z = -0.85;
  car.add(frontAxle);

  car.userData = {
    wheels: wheelsArr,
    rotatingWheels: rotating,
    frontAxle,
    velocity:0, maxSpeed:0.1, acceleration:0.001, friction:0.96,
    boundingBoxSize: new THREE.Vector3(1.2,0.2,2.2)
  };

  return car;
}