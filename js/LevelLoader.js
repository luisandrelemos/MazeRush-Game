// js/LevelLoader.js
import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';

export async function loadLevel(levelName, scene, textureLoader) {
  /* 1. Ler JSON */
  const res = await fetch(`../assets/levels/${levelName}/layout.json`);
  const lvl = await res.json();

  /* 2. Limpar restos do nível anterior */
  scene.children
       .filter(o => o.userData.levelObject)
       .forEach(o => scene.remove(o));

  /* 3. Chão */
  const floorMat = lvl.floor?.texture
    ? new THREE.MeshStandardMaterial({ map: textureLoader.load(`../assets/levels/${levelName}/${lvl.floor.texture}`) })
    : new THREE.MeshStandardMaterial({ color: lvl.colors?.floor ?? '#888' });

  const mapW = lvl.map[0].length;
  const mapH = lvl.map.length;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(mapW * lvl.tileSize, mapH * lvl.tileSize),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.userData.levelObject = true;
  scene.add(floor);

  /* 4. Paredes internas do labirinto */
  const wallMat = new THREE.MeshStandardMaterial({
    color: lvl.colors?.wall ?? '#0F223D',
    roughness: 0.5,
    metalness: 0.6
  });

  const offsetX = -(mapW * lvl.tileSize) / 2 + lvl.tileSize / 2;
  const offsetZ = -(mapH * lvl.tileSize) / 2 + lvl.tileSize / 2;

  lvl.map.forEach((row, z) => row.forEach((cell, x) => {
    if (cell === 1) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(lvl.tileSize, lvl.wallHeight, lvl.tileSize),
        wallMat
      );
      wall.position.set(
        x * lvl.tileSize + offsetX,
        lvl.wallHeight / 2,
        z * lvl.tileSize + offsetZ
      );
      wall.castShadow = wall.receiveShadow = true;
      wall.userData.levelObject = true;
      scene.add(wall);
    }
  }));

  /* 5. Bordas exteriores (corrigido) */
  if (lvl.borderThickness && lvl.borderThickness > 0) {
    const bt = lvl.borderThickness;          // espessura
    const w  = mapW * lvl.tileSize;          // largura total
    const h  = mapH * lvl.tileSize;          // altura total

    // centro das paredes
    const leftX   = offsetX - lvl.tileSize/2 - bt/2;
    const rightX  = offsetX + w - lvl.tileSize/2 + bt/2;
    const topZ    = offsetZ - lvl.tileSize/2 - bt/2;
    const bottomZ = offsetZ + h - lvl.tileSize/2 + bt/2;

    const makeBorder = (sizeX, sizeZ, x, z) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sizeX, lvl.wallHeight, sizeZ),
        wallMat
      );
      mesh.position.set(x, lvl.wallHeight / 2, z);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.levelObject = true;
      scene.add(mesh);
    };

    // topo e base
    makeBorder(w, bt, (leftX + rightX) / 2, topZ);
    makeBorder(w, bt, (leftX + rightX) / 2, bottomZ);

    // esquerda e direita
    makeBorder(bt, h, leftX,  (topZ + bottomZ) / 2);
    makeBorder(bt, h, rightX, (topZ + bottomZ) / 2);
  }

  /* 6. Portais */
  const mkPortal = (cfg, pos) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.4, 16, 60),
      new THREE.MeshStandardMaterial({
        color: cfg.ringColor,
        emissive: cfg.ringColor,
        emissiveIntensity: 1.2
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(pos).y = cfg.height;
    ring.userData.levelObject = true;
    scene.add(ring);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: cfg.baseColor, metalness: 0.4 })
    );
    base.position.set(pos.x, 0.1, pos.z);
    base.userData.levelObject = true;
    scene.add(base);

    const light = new THREE.PointLight(cfg.lightColor, 2.0, 15);
    light.position.copy(ring.position);
    light.userData.levelObject = true;
    scene.add(light);
  };

  const startPos = new THREE.Vector3(
    lvl.start.x * lvl.tileSize + offsetX,
    0.2,
    lvl.start.z * lvl.tileSize + offsetZ
  );
  const endPos = new THREE.Vector3(
    lvl.end.x * lvl.tileSize + offsetX,
    0.2,
    lvl.end.z * lvl.tileSize + offsetZ
  );

  mkPortal(lvl.portalStart, startPos);
  mkPortal(lvl.portalEnd, endPos);

  /* 7. Devolver info ao main.js */
  return {
    offsetX,
    offsetZ,
    tileSize: lvl.tileSize,
    map: lvl.map,
    fog: lvl.fog,
    startPos,
    endPos
  };
}