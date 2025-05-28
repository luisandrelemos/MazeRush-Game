import * as THREE from "https://cdn.skypack.dev/three@0.152.2";

export const animatedObjects = [];
export const coinMeshes = [];
export let igluTunnel = null;
export let igluPosition = null;
export let celeiroGroup = null;
export let celeiroPosition = null;

export async function loadLevel(levelName, scene, textureLoader) {
  /* Ler JSON */
  const res = await fetch(`../assets/levels/${levelName}/layout.json`);
  const lvl = await res.json();

  /* Limpar restos do nível anterior */
  scene.children
    .filter((o) => o.userData.levelObject)
    .forEach((o) => scene.remove(o));

  const mapW = lvl.map[0].length;
  const mapH = lvl.map.length;

  //Textura do chao
  let floorTexture;
  if (lvl.floor?.texture) {
    floorTexture = textureLoader.load(
      `../assets/levels/${levelName}/${lvl.floor.texture}`
    );
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.anisotropy = 16; // para qualidade máxima

    // Controla a repetição manualmente — isto evita distorção
    floorTexture.repeat.set(20, 20); // ajusta se necessário
  }

  /* Paredes internas do labirinto */
  const wallTexture = lvl.wallTexture
    ? textureLoader.load(`../assets/levels/${levelName}/${lvl.wallTexture}`)
    : null;

  if (wallTexture) {
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(1, 1); // Repete a textura 1x1 por parede (ajusta mais tarde)
    wallTexture.anisotropy = 16; // para maior nitidez nos ângulos
  }

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

  // Textura do iglu
  const igluTexture = textureLoader.load(
    `../assets/levels/level-2/textureiglu.jpg`
  );
  igluTexture.wrapS = igluTexture.wrapT = THREE.RepeatWrapping;

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

  // Textura das cercas
  const texturaMadeira = textureLoader.load("../assets/textures/cerca.jpg");
  texturaMadeira.wrapS = THREE.RepeatWrapping;
  texturaMadeira.wrapT = THREE.RepeatWrapping;
  texturaMadeira.repeat.set(1, 1);

  const madeiraMat = new THREE.MeshStandardMaterial({
    map: texturaMadeira,
    color: 0xffffff,
  });

  const texturaCeleiroVermelha = textureLoader.load(
    "../assets/textures/textura_celeiro_vermelha.jpg"
  );
  texturaCeleiroVermelha.wrapS = THREE.RepeatWrapping;
  texturaCeleiroVermelha.wrapT = THREE.RepeatWrapping;
  texturaCeleiroVermelha.repeat.set(2, 1); // aumenta para ver mais "tábuas"
  const materialCeleiro = new THREE.MeshStandardMaterial({
    map: texturaCeleiroVermelha,
    color: 0xffffff, // garante que a cor da textura não é alterada
  });

  lvl.map.forEach((row, z) =>
    row.forEach((cell, x) => {
      let height = lvl.wallHeight;

      if (cell === 1 || cell === 2) {
        // Cercas caso haja "2" na matriz
        if (cell === 2) {
          const tileCenterX = x * lvl.tileSize + offsetX;
          const tileCenterZ = z * lvl.tileSize + offsetZ;

          const cercaGroup = new THREE.Group();
          //Dimensões
          const largura = lvl.tileSize;
          const altura = lvl.wallHeight / 3;
          const espessura = 0.25;

          // Tábuas horizontais
          const numTabuasHorizontais = 2;
          for (let i = 0; i < numTabuasHorizontais; i++) {
            const y = i === 0 ? altura * 0.25 : altura * 0.75;
            const tabua = new THREE.Mesh(
              new THREE.BoxGeometry(largura * 0.95, espessura, espessura),
              madeiraMat
            );
            tabua.position.set(0, y, 0);
            cercaGroup.add(tabua);
          }

          // Estacas verticais (mais densas)
          const estacaAltura = altura;
          const estacaLargura = espessura;
          const numEstacas = 5;
          for (let i = 0; i < numEstacas; i++) {
            const estacaX = -largura / 2 + (i / (numEstacas - 1)) * largura;

            const estaca = new THREE.Mesh(
              new THREE.BoxGeometry(estacaLargura, estacaAltura, estacaLargura),
              madeiraMat
            );
            estaca.position.set(estacaX, estacaAltura / 2, 0);
            cercaGroup.add(estaca);
          }

          // Orientação e posição
          cercaGroup.rotation.y =
            lvl.map[z]?.[x - 1] === 1 && lvl.map[z]?.[x + 1] === 1
              ? 0
              : Math.PI / 2;
          cercaGroup.position.set(tileCenterX, 0, tileCenterZ);

          scene.add(cercaGroup);
        }
      }
      //Paredes
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
    })
  );

  // Criação dos objetos customizados (layout.json)
  function loadCustomObjects(objects, tileSize, offsetX, offsetZ, Scene) {
    if (!objects) return;

    /* Bordas exteriores */
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
        igluPosition = new THREE.Vector3(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );
        igluTunnel = createIglu(igluPosition, scene, igluTexture);
      }

      if (type === "celeiro") {
        celeiroGroup = new THREE.Group();

        // Forma do celeiro (perfil lateral)
        const barnShape = new THREE.Shape();
        barnShape.moveTo(-2, 0);
        barnShape.lineTo(-2, 1.6);
        barnShape.lineTo(-1.6, 2.3);
        barnShape.lineTo(-0.8, 3);
        barnShape.lineTo(0.8, 3);
        barnShape.lineTo(1.6, 2.3);
        barnShape.lineTo(2, 1.6);
        barnShape.lineTo(2, 0);
        barnShape.lineTo(-2, 0);

        // Extrusão para dar volume
        const extrudeSettings = {
          depth: 3,
          bevelEnabled: false,
        };

        const corpoGeometry = new THREE.ExtrudeGeometry(
          barnShape,
          extrudeSettings
        );

        const corpo = new THREE.Mesh(corpoGeometry, materialCeleiro);

        corpo.position.set(0, 0, -1); // centralizar
        celeiroGroup.add(corpo);

        // Posição e rotação do grupo no mapa
        celeiroPosition = new THREE.Vector3(
          obj.position.x * tileSize + offsetX,
          0,
          obj.position.z * tileSize + offsetZ
        );
        celeiroGroup.position.copy(celeiroPosition);
        celeiroGroup.rotation.y = obj.rotation || 0;

        // Material para o telhado
        const telhadoMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Topo reto (horizontal)
        const telhadoTopo = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 0.05, 3.2), // largura = topo reto (-0.8 a 0.8), profundidade igual ao celeiro
          telhadoMat
        );
        telhadoTopo.position.set(0, 3.05, 0.4); // alinhado com o topo do corpo
        celeiroGroup.add(telhadoTopo);

        // Inclinação esquerda
        const telhadoEsq = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.05, 3.2), // largura entre -1.6 e -0.8
          telhadoMat
        );
        telhadoEsq.rotation.z = Math.atan(0.7 / 0.8); // ≈ 0.718 radianos (41.2°)
        telhadoEsq.position.set(-1.2, 2.7, 0.4); // centro entre os pontos inclinados
        celeiroGroup.add(telhadoEsq);

        // Inclinação direita
        const telhadoDir = telhadoEsq.clone();
        telhadoDir.rotation.z = -Math.atan(0.7 / 0.8);
        telhadoDir.position.x = 1.2;
        celeiroGroup.add(telhadoDir);

        // === PORTA com aro branco ===
        const larguraPorta = 1.5;
        const alturaPorta = 1.5;
        const espessuraPorta = 0.05;
        const molduraEspessura = 0.1;

        const molduraMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        // Vertical esquerda
        const verticalEsq = new THREE.Mesh(
          new THREE.BoxGeometry(molduraEspessura, alturaPorta, espessuraPorta),
          molduraMat
        );
        verticalEsq.position.set(
          -larguraPorta / 2 + molduraEspessura / 2,
          alturaPorta / 2,
          2
        );
        celeiroGroup.add(verticalEsq);

        // Vertical direita
        const verticalDir = verticalEsq.clone();
        verticalDir.position.x = larguraPorta / 2 - molduraEspessura / 2;
        celeiroGroup.add(verticalDir);

        // Horizontal topo
        const horizontalTopo = new THREE.Mesh(
          new THREE.BoxGeometry(larguraPorta, molduraEspessura, espessuraPorta),
          molduraMat
        );
        horizontalTopo.position.set(0, alturaPorta - molduraEspessura / 2, 2);
        celeiroGroup.add(horizontalTopo);

        // Horizontal base
        const horizontalBase = horizontalTopo.clone();
        horizontalBase.position.y = molduraEspessura / 2;
        celeiroGroup.add(horizontalBase);

        // Cruz em X (2 travessões diagonais)
        const cruzMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const diagonal1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, alturaPorta * 1.25, 0.02),
          cruzMat
        );
        diagonal1.position.set(0, alturaPorta / 2, 2); // z = 2 para ficar sobre a porta
        diagonal1.rotation.z = Math.PI / 4;
        celeiroGroup.add(diagonal1);

        const diagonal2 = diagonal1.clone();
        diagonal2.rotation.z = -Math.PI / 4;
        celeiroGroup.add(diagonal2);

        // === JANELA circular acima da porta ===
        const raioExterior = 0.3;
        const raioInterior = 0.22;

        // Aro branco (fino, tipo moldura)
        const aroJanela = new THREE.Mesh(
          new THREE.RingGeometry(raioInterior, raioExterior, 32),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          })
        );
        aroJanela.rotation.set(0, 0, 0); // virado para frente
        aroJanela.position.set(0, 2.35, 2.05); // posição acima da porta
        celeiroGroup.add(aroJanela);

        // Parte preta interior
        const interiorJanela = new THREE.Mesh(
          new THREE.CircleGeometry(raioInterior, 32),
          new THREE.MeshStandardMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
          })
        );
        interiorJanela.rotation.set(0, 0, 0);
        interiorJanela.position.set(0, 2.35, 2.05); // ligeiramente atrás do aro
        celeiroGroup.add(interiorJanela);

        // === FARDO DE PALHA JUNTO AO CELEIRO ===
        const texturaPalha = textureLoader.load("../assets/textures/palha.jpg");

        texturaPalha.wrapS = THREE.RepeatWrapping;
        texturaPalha.wrapT = THREE.RepeatWrapping;
        texturaPalha.repeat.set(1, 1);

        const materialFardo = new THREE.MeshStandardMaterial({
          map: texturaPalha,
          color: 0xffffff,
        });

        // Fardo inferior (maior, assente no chão)
        const geometriaFardo1 = new THREE.CylinderGeometry(0.7, 0.8, 1.2, 32); // raio = 0.7
        const fardo1 = new THREE.Mesh(geometriaFardo1, materialFardo);
        fardo1.position.set(2, 0.8, 2.8); // y = raio (0.7) para assentar no chão
        fardo1.castShadow = fardo1.receiveShadow = true;
        celeiroGroup.add(fardo1);

        // Fardo superior (mais pequeno, empilhado)
        const geometriaFardo2 = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 32); // raio = 0.6
        const fardo2 = new THREE.Mesh(geometriaFardo2, materialFardo);
        fardo2.position.set(2, 1.8, 2.8); // y = base + raio do fardo2 = 0.7 + 0.6
        fardo2.castShadow = fardo2.receiveShadow = true;
        celeiroGroup.add(fardo2);

        scene.add(celeiroGroup);
      }

      if (type === "arvore") {
        const group = new THREE.Group();

        // TEXTURAS
        const texturaTronco = textureLoader.load("../assets/textures/bark.png");
        const texturaFolhas = textureLoader.load(
          "../assets/textures/leaves.png"
        );

        // TRONCO
        const tronco = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 2.5, 8, 30),
          new THREE.MeshStandardMaterial({
            map: texturaTronco,
          })
        );
        tronco.position.y = 1.5;
        group.add(tronco);

        // COPA (folhas)
        const copa = new THREE.Mesh(
          new THREE.SphereGeometry(4, 32, 32),
          new THREE.MeshStandardMaterial({
            map: texturaFolhas,
            emissive: 0x228b22,
            emissiveIntensity: 0.4,
          })
        );
        copa.position.y = 8.5;
        group.add(copa);

        // POSIÇÃO final
        group.position.set(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );

        // PORTA (círculo escuro)
        const porta = new THREE.Mesh(
          new THREE.CircleGeometry(1.2, 32),
          new THREE.MeshStandardMaterial({
            color: 0x111111,
            side: THREE.DoubleSide,
          })
        );
        const distanciaFrontal = 2.19; // raio + margem
        porta.rotation.y = Math.PI; // gira 180 graus
        porta.position.set(0, 1.2, -distanciaFrontal);
        group.add(porta);

        // MOLDURA da porta (aro)
        const aro = new THREE.Mesh(
          new THREE.RingGeometry(1.3, 1.5, 32),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          })
        );
        aro.rotation.y = Math.PI;
        aro.position.set(0, 1.2, -distanciaFrontal - 0.01); // ligeiramente mais à frente
        group.add(aro);

        // TEXTURA de brilho
        const glowTexture = textureLoader.load("../assets/textures/glow.png");

        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0x00ff99, // tom mágico verde-azulado
          transparent: true,
          opacity: 1,
          depthWrite: false,
        });

        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.set(8, 8, 1); // tamanho do brilho
        glowSprite.position.set(0, 1.2, -distanciaFrontal - 0.4); // mesmo centro da porta
        group.add(glowSprite);

        group.userData.levelObject = true;
        scene.add(group);
      }

      if (type === "vulcao") {
        const vulcaoGroup = new THREE.Group();

        // TEXTURA da lava escorrida
        const texturaLava = textureLoader.load(
          "../assets/levels/level-3/vulcao.png"
        );
        texturaLava.wrapS = THREE.RepeatWrapping;
        texturaLava.wrapT = THREE.RepeatWrapping;
        texturaLava.repeat.set(1, 2);

        // --- BASE DO VULCÃO: cone truncado ---
        const coneGeometry = new THREE.CylinderGeometry(0.8, 4, 4, 32); // topo menor que base
        const coneMaterial = new THREE.MeshStandardMaterial({
          map: texturaLava,
          emissiveIntensity: 0.4,
        });

        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = 1;
        cone.castShadow = cone.receiveShadow = true;
        vulcaoGroup.add(cone);

        // POSIÇÃO final
        vulcaoGroup.position.set(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );

        // --- SISTEMA DE PARTÍCULAS: lava a ser expelida ---
        const particleCount = 500;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
          const x = (Math.random() - 0.5) * 1.2;
          const y = Math.random() * 0.5;
          const z = (Math.random() - 0.5) * 1.2;

          positions.push(x, y, z);
          velocities.push(
            (Math.random() - 0.5) * 0.03, // vx
            0.02 + Math.random() * 0.05, // vy (ascendente)
            (Math.random() - 0.5) * 0.03 // vz
          );
        }

        particleGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );

        // Material das partículas (lava brilhante)
        const particleMaterial = new THREE.PointsMaterial({
          color: 0xff5500,
          size: 0.2,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        });

        // Criar sistema de partículas
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.set(0, 3, 0); // topo do vulcão
        vulcaoGroup.add(particles);

        // Guardar para animar
        particles.userData.velocities = velocities;
        animatedObjects.push(particles); // importante: incluir no loop de animação
        
        const group = new THREE.Group();
        // PORTÃO (círculo escuro)
        const portao = new THREE.Mesh(
          new THREE.CircleGeometry(1.2, 32),
          new THREE.MeshStandardMaterial({
            color: 0x111111,
            side: THREE.DoubleSide,
          })
        );
        const distanciaFrontal = 2.19;
        portao.rotation.y = Math.PI;
        portao.position.set(0, 1.2, -distanciaFrontal);
        group.add(portao);

        // MOLDURA do portão (aro branco)
        const aroPortao = new THREE.Mesh(
          new THREE.RingGeometry(1.3, 1.5, 32),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          })
        );
        aroPortao.rotation.y = Math.PI;
        aroPortao.position.set(0, 1.2, -distanciaFrontal - 0.01);
        group.add(aroPortao);

        // GLOW VERMELHO
        const glowTexture = textureLoader.load("../assets/textures/glow.png");

        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0xff3333, // glow vermelho
          transparent: true,
          opacity: 1,
          depthWrite: false,
        });

        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.set(8, 8, 1);
        glowSprite.position.set(0, 1.2, -distanciaFrontal - 0.4);
        group.add(glowSprite);

        vulcaoGroup.userData.levelObject = true;
        scene.add(vulcaoGroup);
      }
    });
  }

  //construir o iglu
  function createIglu(position, scene, igluTexture) {
    // Corpo do iglu (esfera)
    const domeGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const domeMaterial = new THREE.MeshStandardMaterial({
      map: igluTexture,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.set(position.x, 0.4, position.z);
    dome.userData.levelObject = true;
    scene.add(dome);

    // Grupo do túnel
    const tunnelGroup = new THREE.Group();
    // Túnel interior (totalmente aberto)
    const innerGeometry = new THREE.CylinderGeometry(
      0.9,
      0.9,
      1.6,
      32,
      1,
      true
    ); // openEnded: true
    const innerMaterial = new THREE.MeshStandardMaterial({
      map: igluTexture,
      side: THREE.DoubleSide,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
    });
    const innerTunnel = new THREE.Mesh(innerGeometry, innerMaterial);
    innerTunnel.rotation.x = Math.PI / 2;
    innerTunnel.position.set(0, 0.1, 2.5);
    tunnelGroup.add(innerTunnel);

    // Túnel exterior (também totalmente aberto)
    const outerGeometry = new THREE.CylinderGeometry(
      1.1,
      1.1,
      1.6,
      32,
      1,
      true
    ); // openEnded: true
    const outerMaterial = new THREE.MeshStandardMaterial({
      map: igluTexture,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
    });
    const outerTunnel = new THREE.Mesh(outerGeometry, outerMaterial);
    outerTunnel.rotation.x = Math.PI / 2;
    outerTunnel.position.set(0, 0.1, 2.5);
    tunnelGroup.add(outerTunnel);

    // Posicionar o grupo
    tunnelGroup.position.set(position.x, 0, position.z);
    tunnelGroup.userData.levelObject = true;
    scene.add(tunnelGroup);

    // Criar parede grossa entre o cilindro exterior e interior (visual)
    const wallGeometry = new THREE.RingGeometry(0.9, 1.1, 32); // raio interior = raio do túnel interior, exterior = do túnel exterior
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: igluTexture,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide,
    });

    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.rotation.z = Math.PI / 2; // deitar no chão
    wall;
    wall.position.set(0, 0.1, 3.3); // à frente dos túneis (ajusta se necessário)
    tunnelGroup.add(wall);

    // Luzes
    const igluLight = new THREE.PointLight(0xffcc88, 3.5, 6, 2);
    igluLight.position.set(position.x, 1.3, position.z);
    scene.add(igluLight);

    const tunnelLight = new THREE.PointLight(0xffcc88, 1.2, 3, 2);
    tunnelLight.position.set(position.x, 0.7, position.z + 2.2);
    scene.add(tunnelLight);

    return tunnelGroup;
  }

  /* Novo design de portais (translúcido e plano) */
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

    return ring;
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

// === Rotação do iglu em relação ao carro ===
export function updateTunnelDirection(tunnelGroup, igluPosition, carPosition) {
  const dx = carPosition.x - igluPosition.x;
  const dz = carPosition.z - igluPosition.z;
  const angle = Math.atan2(dx, dz);

  tunnelGroup.rotation.y = angle;
}
// === Rotação do celeiro em relação ao carro ===
export function updateBarnDirection(
  celeiroGroup,
  celeiroPosition,
  carPosition
) {
  const dx = carPosition.x - celeiroPosition.x;
  const dz = carPosition.z - celeiroPosition.z;
  const angle = Math.atan2(dx, dz);

  celeiroGroup.rotation.y = angle;
}
