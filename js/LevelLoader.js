import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export const animatedObjects = [];
export const coinMeshes = [];

export async function loadLevel(levelName, scene, textureLoader) {
  /* 1. Ler JSON */
  const res = await fetch(`../assets/levels/${levelName}/layout.json`);
  const lvl = await res.json();

  /* 2. Limpar restos do nível anterior */
  scene.children
    .filter((o) => o.userData.levelObject)
    .forEach((o) => scene.remove(o));

  const mapW = lvl.map[0].length;
  const mapH = lvl.map.length;

  //chao
  let floorTexture;
  if (lvl.floor?.texture) {
    floorTexture = textureLoader.load(
      `../assets/levels/${levelName}/${lvl.floor.texture}`
    );
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(mapW / 2, mapH / 2); // ajusta à dimensão do labirinto
  }

  const floorMat = floorTexture
    ? new THREE.MeshStandardMaterial({
        map: floorTexture,
        metalness: 0.2,
        roughness: 0.8,
      })
    : new THREE.MeshStandardMaterial({ color: lvl.colors?.floor ?? "#888" });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(mapW * lvl.tileSize, mapH * lvl.tileSize),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.userData.levelObject = true;
  scene.add(floor);

  /* 4. Paredes internas do labirinto */
  const wallTexture = lvl.wallTexture
    ? textureLoader.load(`../assets/levels/${levelName}/${lvl.wallTexture}`)
    : null;

  const wallMat = wallTexture
    ? new THREE.MeshStandardMaterial({
        map: wallTexture,
        metalness: 0.3,
        roughness: 0.6,
        opacity: 0.9,
      })
    : new THREE.MeshStandardMaterial({
        color: lvl.colors?.wall ?? "#000000",
        roughness: 0.5,
        metalness: 0.4,
        opacity: 0.9,
      });

  const offsetX = -(mapW * lvl.tileSize) / 2 + lvl.tileSize / 2;
  const offsetZ = -(mapH * lvl.tileSize) / 2 + lvl.tileSize / 2;

  lvl.map.forEach((row, z) =>
    row.forEach((cell, x) => {
      let height = lvl.wallHeight;

      if (cell === 1 || cell === 2) {
        if (cell === 2) {
          height = lvl.wallHeight / 3;

          const left = lvl.map[z]?.[x - 1] === 0;
          const right = lvl.map[z]?.[x + 1] === 0;
          const top = lvl.map[z - 1]?.[x] === 0;
          const down = lvl.map[z + 1]?.[x] === 0;

          let geo;

          if (left && right && !(top && down)) {
            // Caminho à esquerda e à direita → estreita no eixo X
            geo = new THREE.BoxGeometry(
              lvl.tileSize * 0.2,
              height,
              lvl.tileSize
            );
          } else if (top && down && !(left && right)) {
            // Caminho em cima e em baixo → estreita no eixo Z
            geo = new THREE.BoxGeometry(
              lvl.tileSize,
              height,
              lvl.tileSize * 0.2
            );
          } else {
            // Fallback: nenhuma direção clara, criar pequeno bloco quadrado
            geo = new THREE.BoxGeometry(
              lvl.tileSize * 0.2,
              height,
              lvl.tileSize * 0.2
            );
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
    })
  );

  // paralelepipedo animado nivel 6
  function loadCustomObjects(objects, tileSize, offsetX, offsetZ, Scene) {
    if (!objects) return;

    objects.forEach((obj) => {
      const { type, position, dimensions, color } = obj;

      if (type === "paralelepipedo") {
        const geometry = new THREE.BoxGeometry(
          dimensions.width * tileSize,
          dimensions.height,
          dimensions.depth * tileSize
        );

        const material = new THREE.MeshStandardMaterial({
          color: color || 0x888888,
        });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
          position.x * tileSize + offsetX,
          dimensions.height / 2,
          position.z * tileSize + offsetZ
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.levelObject = true;

        scene.add(mesh);
        animatedObjects.push(mesh);
      }

      if (type === "moeda") {
        const radius = 0.5;
        const thickness = 0.15;

        // Parte interior (dentro)
        const innerGeometry = new THREE.CylinderGeometry(
          radius * 0.9,
          radius * 0.9,
          thickness,
          32
        );
        const innerMaterial = new THREE.MeshStandardMaterial({
          color: 0xffd700,
        });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);

        // Borda exterior
        const outerGeometry = new THREE.CylinderGeometry(
          radius,
          radius,
          thickness * 1.1,
          32
        );
        const outerMaterial = new THREE.MeshStandardMaterial({
          color: 0xfff066,
        });
        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);

        // Agrupar os dois
        const coinGroup = new THREE.Group();
        coinGroup.add(outerMesh);
        coinGroup.add(innerMesh);

        // Rodar para deitar a moeda no chão (eixo X)
        coinGroup.rotation.x = Math.PI / 2;

        // Subir um pouco para não ficar enterrada
        const yLift = 1;
        coinGroup.position.set(
          position.x * tileSize + offsetX,
          yLift,
          position.z * tileSize + offsetZ
        );

        // Criar brilho debaixo da moeda
        const glowTex = textureLoader.load("../assets/textures/glow.png");
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xfff066,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });

        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.set(2, 2, 1);
        glowSprite.position.set(0, -0.05, 0.8);

        coinGroup.add(glowSprite);

        coinGroup.userData.glow = glowSprite;

        scene.add(coinGroup);
        coinMeshes.push(coinGroup);
      }

      if (type === "iglu") {
        const pos = new THREE.Vector3(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );
        createIglu(pos, scene);
      }
    });
  }

  /* 5. Bordas exteriores */
  if (lvl.borderThickness && lvl.borderThickness > 0) {
    const bt = lvl.borderThickness;
    const w = mapW * lvl.tileSize;
    const h = mapH * lvl.tileSize;

    const leftX = offsetX - lvl.tileSize / 2 - bt / 2;
    const rightX = offsetX + w - lvl.tileSize / 2 + bt / 2;
    const topZ = offsetZ - lvl.tileSize / 2 - bt / 2;
    const bottomZ = offsetZ + h - lvl.tileSize / 2 + bt / 2;

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
    makeBorder(bt, h, leftX, (topZ + bottomZ) / 2);
    makeBorder(bt, h, rightX, (topZ + bottomZ) / 2);
  }

  //construir um iglu nas ruas sem saida
  function createIglu(position, scene) {
    // Corpo do iglu (esfera translúcida)
    const domeGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const domeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
    });

    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.set(position.x, 0.4, position.z);
    dome.userData.levelObject = true;
    scene.add(dome);

    // Entrada interior (túnel aberto onde o carro entra)
    const innerGeometry = new THREE.CylinderGeometry(
      0.9,
      0.9,
      1.6,
      32,
      1,
      true
    );
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
    });

    const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
    innerTunnel.rotation.x = Math.PI / 2;
    innerTunnel.position.set(position.x, 0.1, position.z + 2.5);
    innerTunnel.userData.levelObject = true;
    scene.add(innerTunnel);

    // Entrada exterior (paredes grossas e fechadas)
    const outerGeometry = new THREE.CylinderGeometry(
      1.1,
      1.1,
      1.6,
      32,
      1,
      false
    ); // fechado
    const outerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
    });

    const outerTunnel = new THREE.Mesh(outerGeometry, outerMaterial);
    outerTunnel.rotation.x = Math.PI / 2;
    outerTunnel.position.set(position.x, 0.1, position.z + 2.5);
    outerTunnel.userData.levelObject = true;
    scene.add(outerTunnel);

    // Luz quente dentro do iglu
    const igluLight = new THREE.PointLight(0xffcc88, 3.5, 6, 2);
    igluLight.position.set(position.x, 1.3, position.z);
    scene.add(igluLight);

    // Luz suave dentro do túnel
    const tunnelLight = new THREE.PointLight(0xffcc88, 1.2, 3, 2);
    tunnelLight.position.set(position.x, 0.7, position.z + 2.2);
    scene.add(tunnelLight);
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
        opacity: 0.35,
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

    return ring; // <-- ADICIONADO: Devolve o anel criado!
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
  lvl.endPortal = mkPortal(lvl.portalEnd, endPos); // Agora `lvl.endPortal` guarda o portal final!
  loadCustomObjects(lvl.objects, lvl.tileSize, offsetX, offsetZ, scene);
  /* 7. Devolver info ao main.js */
  return {
    offsetX,
    offsetZ,
    tileSize: lvl.tileSize,
    map: lvl.map,
    fog: lvl.fog,
    startPos,
    endPos,
    endPortal: lvl.endPortal,
  };
}
