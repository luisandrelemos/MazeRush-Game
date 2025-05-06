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
    let height = lvl.wallHeight;
  
    if (cell === 1 || cell === 2) {
      if (cell === 2) {
        height = lvl.wallHeight / 3;
      
        const left  = lvl.map[z]?.[x - 1] === 0;
        const right = lvl.map[z]?.[x + 1] === 0;
        const top   = lvl.map[z - 1]?.[x] === 0;
        const down  = lvl.map[z + 1]?.[x] === 0;
      
        let geo;
      
        if ((left && right) && !(top && down)) {
          // Caminho à esquerda e à direita → estreita no eixo X
          geo = new THREE.BoxGeometry(lvl.tileSize * 0.2, height, lvl.tileSize);
        } else if ((top && down) && !(left && right)) {
          // Caminho em cima e em baixo → estreita no eixo Z
          geo = new THREE.BoxGeometry(lvl.tileSize, height, lvl.tileSize * 0.2);
        } else {
          // Fallback: nenhuma direção clara, criar pequeno bloco quadrado
          geo = new THREE.BoxGeometry(lvl.tileSize * 0.2, height, lvl.tileSize * 0.2);
          console.warn(`⚠️ Obstáculo (2) em (${x}, ${z}) sem direção clara.`);
        }
      
        const wall = new THREE.Mesh(geo, wallMat);
        wall.position.set(
          x * lvl.tileSize + offsetX,
          height / 2,
          z * lvl.tileSize + offsetZ
        );
        wall.castShadow = wall.receiveShadow = true;
        wall.userData.levelObject = true;
        wall.userData.isLowWall = true;
        scene.add(wall);
      }
      
  
      if (cell === 1) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(lvl.tileSize, height, lvl.tileSize),
          wallMat
        );
        wall.position.set(
          x * lvl.tileSize + offsetX,
          height / 2,
          z * lvl.tileSize + offsetZ
        );
        wall.castShadow = wall.receiveShadow = true;
        wall.userData.levelObject = true;
        scene.add(wall);
      }
    }
  }));
  
  
  

  /* 5. Bordas exteriores */
  if (lvl.borderThickness && lvl.borderThickness > 0) {
    const bt = lvl.borderThickness;
    const w  = mapW * lvl.tileSize;
    const h  = mapH * lvl.tileSize;

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

    makeBorder(w, bt, (leftX + rightX) / 2, topZ);
    makeBorder(w, bt, (leftX + rightX) / 2, bottomZ);
    makeBorder(bt, h, leftX,  (topZ + bottomZ) / 2);
    makeBorder(bt, h, rightX, (topZ + bottomZ) / 2);
  }

  /* 6. Novo design de portais (translúcido e plano) */
  function mkPortal(cfg, pos) {
    // Anel translúcido e plano
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.2, 64),
      new THREE.MeshBasicMaterial({
        color: cfg.ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos);
    ring.position.y = 0.1;
    ring.userData.levelObject = true;
    scene.add(ring);

    // Animação de pulsação
    const start = performance.now();
    function animateRing(t) {
      const elapsed = (t - start) / 1000;
      const scale = 1 + 0.1 * Math.sin(elapsed * 3);
      ring.scale.set(scale, scale, scale);
      requestAnimationFrame(animateRing);
    }
    requestAnimationFrame(animateRing);

    // Luz pontual suave
    const light = new THREE.PointLight(cfg.lightColor, 1.0, 10, 2);
    light.position.copy(pos);
    light.position.y = 1;
    light.userData.levelObject = true;
    scene.add(light);

    return ring;  // <-- ADICIONADO: Devolve o anel criado!
  }

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
  lvl.endPortal = mkPortal(lvl.portalEnd, endPos);  // Agora `lvl.endPortal` guarda o portal final!

  /* 7. Devolver info ao main.js */
  return {
    offsetX,
    offsetZ,
    tileSize: lvl.tileSize,
    map: lvl.map,
    fog: lvl.fog,
    startPos,
    endPos,
    endPortal: lvl.endPortal
  };
}