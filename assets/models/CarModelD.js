// js/models/CarModelD.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";

export function createCarD(textureLoader, colors = {}) {
  const {
    primary   = "#ffcc00",
    secondary = "#ffffff",
    structure = "#d2691e",
    wheels    = "#333333"
  } = colors;

  const car = new THREE.Group();

  // BASE
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.25, 2.2),
    new THREE.MeshStandardMaterial({ color: primary, metalness: 0.7, roughness: 0.4 })
  );
  base.position.y = 0.13;
  base.userData.part = "primary";
  car.add(base);

  // CAIXA DE GELADOS
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 1.2),
    new THREE.MeshStandardMaterial({ color: secondary, metalness: 0.3, roughness: 0.7 })
  );
  box.position.set(0, 0.45, 0.3);
  box.userData.part = "secondary";
  car.add(box);

  // GUARDA-SOL CENTRALIZADO
  const poleX = 0;
  const poleZ = 0.3;
  const poleHeight = 0.6;

  const baseCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: "#8B4513" })
  );
  baseCone.position.set(poleX, 0.7, poleZ);
  car.add(baseCone);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, poleHeight, 16),
    new THREE.MeshStandardMaterial({ color: structure })
  );
  pole.position.set(poleX, 0.95, poleZ);
  car.add(pole);

  const umbrella = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: structure })
  );
  umbrella.position.set(poleX, 1.2, poleZ);
  car.add(umbrella);

  // VIDRO FRONTAL
  const glassTex = textureLoader.load("/textures/glass.jpg");
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex, metalness: 1.0, roughness: 0.05,
    transparent: true, opacity: 0.7
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.04), glassMat);
  glass.position.set(0, 0.55, -0.8);
  car.add(glass);

  // PARACHOQUES
  const bumperMat = new THREE.MeshStandardMaterial({ color: "#444444" });
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), bumperMat);
  frontBumper.position.set(0, 0.1, -1.15);
  car.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = 1.15;
  car.add(rearBumper);

  // LUZES FRONTAIS
  function createHeadlight(x, z) {
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.05),
      new THREE.MeshStandardMaterial({ color: "#aaaaaa", transparent: true, opacity: 0.3 })
    );
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.03),
      new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff" })
    );
    bulb.position.z = 0.01;
    const light = new THREE.Group();
    light.add(lens, bulb);
    light.position.set(x, 0.2, z);
    return light;
  }

  car.add(createHeadlight(-0.4, -1.1));
  car.add(createHeadlight(0.4, -1.1));

  // LUZES TRASEIRAS
  const tailMat = new THREE.MeshStandardMaterial({ color: "#ff0000", emissive: "#ff0000" });
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), tailMat);
  tl.position.set(-0.4, 0.2, 1.1);
  const tr = tl.clone();
  tr.position.set(0.4, 0.2, 1.1);
  car.add(tl, tr);

  // RODAS + HUB
  const wheelGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 32);
  const hubGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
  const tireTex = textureLoader.load("/textures/tire.jpg");
  const wheelMat = new THREE.MeshStandardMaterial({ map: tireTex, color: wheels });
  const hubMat = new THREE.MeshStandardMaterial({ color: "#999999" });
  const wheelsArr = [];
  const rotating = [];
  const frontAxle = new THREE.Group();

  function createWheel(pos) {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    wheel.userData.part = "wheels";

    const hub = new THREE.Mesh(hubGeom, hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wheel.position);
    hub.position.y += 0.01;

    wheelsArr.push(wheel);
    rotating.push(wheel);
    return [wheel, hub];
  }

  [[-0.5, 0.08, 0.9], [0.5, 0.08, 0.9]].forEach(pos => {
    const [wheel, hub] = createWheel(pos);
    car.add(wheel, hub);
  });

  [[-0.5, 0.08, -0.9], [0.5, 0.08, -0.9]].forEach(pos => {
    const [wheel, hub] = createWheel([pos[0], pos[1], 0]);
    frontAxle.add(wheel, hub);
  });
  frontAxle.position.z = -0.9;
  car.add(frontAxle);

  // Dados para física/controle
  car.userData = {
    wheels: wheelsArr,
    rotatingWheels: rotating,
    frontAxle,
    velocity: 0,
    maxSpeed: 0.08,
    acceleration: 0.0012,
    friction: 0.95,
    boundingBoxSize: new THREE.Vector3(1.3, 0.6, 2.3)
  };

  return car;
}
