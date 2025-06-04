import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { wallMeshes } from "./main.js";

export const animatedObjects = [];
export const coinMeshes = [];
export const fenceMeshes = [];
export let igluTunnel = null;
export let igluPosition = null;
export let celeiroGroup = null;
export let celeiroPosition = null;

export async function loadLevel(levelName, scene, textureLoader) {
  // Carrega o ficheiro layout.json do nível
  const res = await fetch(`../assets/levels/${levelName}/layout.json`);
  const lvl = await res.json();

  /*  ─────────────────────────── Textura do Ceu  ─────────────────────────── */
  if (lvl.skyTexture) {
  const skyTex = textureLoader.load(
    `../assets/levels/${levelName}/${lvl.skyTexture}`
  );
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTex;
}

  /* ─────────────────────────── Remove objetos do nível anterior ─────────────────────────── */
  scene.children
    .filter((o) => o.userData.levelObject)
    .forEach((o) => scene.remove(o));

  const mapW = lvl.map[0].length;
  const mapH = lvl.map.length;

  /*  ─────────────────────────── Carrega e configura textura do chão (se existir)  ─────────────────────────── */
  let floorTexture;
  if (lvl.floor?.texture) {
    floorTexture = textureLoader.load(
      `../assets/levels/${levelName}/${lvl.floor.texture}`
    );
    floorTexture.wrapS = THREE.RepeatWrapping; // Define que a textura será repetida horizontalmente
    floorTexture.wrapT = THREE.RepeatWrapping; // Define que a textura será repetida verticalmente
    floorTexture.anisotropy = 16; // Melhorar a qualidade da textura em ângulos inclinados
    floorTexture.repeat.set(20, 20); // Controla a repetição manualmente — isto evita distorção
  }

  // Cria material para o chão (com ou sem textura)
  const floorMat = floorTexture
    ? new THREE.MeshStandardMaterial({
        map: floorTexture,
        metalness: 0.2,
        roughness: 0.8,
      })
    : new THREE.MeshStandardMaterial({ color: lvl.colors?.floor ?? "#888" });

  // Cria plano horizontal do chão e adiciona à cena
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(mapW * lvl.tileSize, mapH * lvl.tileSize),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.userData.levelObject = true;
  scene.add(floor);


  /*  ─────────────────────────── Carrega textura das paredes (se existir)  ─────────────────────────── */
  const wallTexture = lvl.wallTexture
    ? textureLoader.load(`../assets/levels/${levelName}/${lvl.wallTexture}`)
    : null;

  if (wallTexture) {
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(1, 1); // Repete a textura 1x1 por parede
    wallTexture.anisotropy = 16; // Para maior nitidez nos ângulos
  }

  /*  ─────────────────────────── Cria material das paredes (com ou sem textura) ─────────────────────────── */
  const wallMat = wallTexture
    ? new THREE.MeshStandardMaterial({
      // Se existir uma textura para a parede, aplica-a como mapa de cor
        map: wallTexture,
        metalness: 0.3, // Define o grau de metalização
        roughness: 0.6, // Define a rugosidade
        opacity: 0.9, // Define ligeira transparência
      })
    : new THREE.MeshStandardMaterial({
      // Se não existir uma textura, aplica uma cor base 
        color: lvl.colors?.wall ?? "#000000",
        roughness: 0.5, // Define o grau de metalização
        metalness: 0.4, // Define a rugosidade
        opacity: 0.9, // Define ligeira transparência
      });

  // Calcula o desvio em X para centralizar o mapa horizontalmente
  const offsetX = -(mapW * lvl.tileSize) / 2 + lvl.tileSize / 2;
  // Calcula o desvio em Z para centralizar o mapa na profundidade (eixo Z)
  const offsetZ = -(mapH * lvl.tileSize) / 2 + lvl.tileSize / 2;

  // Textura do Iglo nivel 2
  const igluTexture = textureLoader.load(
    `../assets/levels/level-2/textureiglu.jpg`
  );
  igluTexture.wrapS = igluTexture.wrapT = THREE.RepeatWrapping;

  //Textura das Cercas nivel 5 e 6 
  const texturaMadeira = textureLoader.load("../assets/textures/cerca.jpg"); // Cercas nivel 6
  const texturaMetal = textureLoader.load("../assets/textures/cerca2.png"); // Cercas nivel 5
  texturaMadeira.wrapS = THREE.RepeatWrapping;
  texturaMadeira.wrapT = THREE.RepeatWrapping;
  texturaMadeira.repeat.set(1, 1);
  texturaMetal.wrapS = THREE.RepeatWrapping;
  texturaMetal.wrapT = THREE.RepeatWrapping;
  texturaMetal.repeat.set(1, 1);

  const isLevel5 = levelName === "level-5";

  // Define material para cercas ou lasers (nível 5 e 6)
  const madeiraMat = isLevel5
  // Lasers nivel 5
    ? new THREE.MeshBasicMaterial({
        color: 0xff0000, 
        emissive: 0xff0000, // cor do brilho
        emissiveIntensity: 2, // intensidade do brilho
      })
    // Cerca nivel 6
    : new THREE.MeshStandardMaterial({
        map: texturaMadeira,
        color: 0xffffff,
      });


  // Textura Celeiro nivel 6
  const texturaCeleiroVermelha = textureLoader.load(
    "../assets/textures/textura_celeiro_vermelha.jpg"
  );

  texturaCeleiroVermelha.wrapS = THREE.RepeatWrapping;
  texturaCeleiroVermelha.wrapT = THREE.RepeatWrapping;
  texturaCeleiroVermelha.repeat.set(2, 1); 
  const materialCeleiro = new THREE.MeshStandardMaterial({
    map: texturaCeleiroVermelha,
    color: 0xffffff, 
  });
   /*  ─────────────────────────── Matriz do labirinto  ─────────────────────────── */
  lvl.map.forEach((row, z) =>
    row.forEach((cell, x) => {
      let height = lvl.wallHeight;

      if (cell === 1 || cell === 2) {
        // Cercas caso haja "2" na matriz / altura das cercas diferente das paredes 
        if (cell === 2) {
          const tileCenterX = x * lvl.tileSize + offsetX;
          const tileCenterZ = z * lvl.tileSize + offsetZ;

          const cercaGroup = new THREE.Group();

          // Dimensões das cercas
          const largura = lvl.tileSize;
          const altura = lvl.wallHeight / 3;
          const espessura = 0.25;

          // Numero de tabuas horizontais
          const numTabuasHorizontais = 2;

          // Tábuas horizontais
          for (let i = 0; i < numTabuasHorizontais; i++) {
            const y = i === 0 ? altura * 0.25 : altura * 0.75;

            // Dimensoes diferentes para o nivel 5 (lasers), usamos as cercas sem tabuas verticais 
            const tabua = isLevel5
              ? new THREE.Mesh(
                  new THREE.CylinderGeometry(0.05, 0.05, largura * 0.95, 16),
                  madeiraMat
                )
              : new THREE.Mesh(
                  new THREE.BoxGeometry(largura * 0.95, espessura, espessura),
                  madeiraMat
                );

            tabua.rotation.z = isLevel5 ? Math.PI / 2 : 0; // rodar cilindro horizontal
            tabua.position.set(0, y, 0);
            cercaGroup.add(tabua);
          }

          // Estacas verticais (apenas se não for o nível 5)
          if (!isLevel5) {
            const estacaAltura = altura; // Altura das estacas
            const estacaLargura = espessura; // Largura das estacas
            const numEstacas = 5; // Número total de estacas na cerca

            // Distribui estacas uniformemente ao longo da largura
            for (let i = 0; i < numEstacas; i++) {
              const estacaX = -largura / 2 + (i / (numEstacas - 1)) * largura;

              // Cria cada estaca como um paralelepípedo vertical
              const estaca = new THREE.Mesh(
                new THREE.BoxGeometry(
                  estacaLargura,
                  estacaAltura,
                  estacaLargura
                ),
                madeiraMat
              );

              // Posiciona a estaca ao longo do eixo X e eleva-a pela metade da altura
              estaca.position.set(estacaX, estacaAltura / 2, 0);
              // Adiciona a estaca ao grupo da cerca
              cercaGroup.add(estaca);
            }
          }

          // Orientação e posição
          cercaGroup.rotation.y =
            lvl.map[z]?.[x - 1] === 1 && lvl.map[z]?.[x + 1] === 1
              ? 0
              : Math.PI / 2;
          cercaGroup.position.set(tileCenterX, 0, tileCenterZ);
          scene.add(cercaGroup);
          fenceMeshes.push(cercaGroup);
        }
      }
      //Paredes do labirinto
      if (cell === 1) {
        // Define a geometria da parede (um cubo com altura e largura do tile)
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(lvl.tileSize, height, lvl.tileSize),
          wallMat // Aplica o material definido anteriormente (com ou sem textura)
        );
        // Posiciona a parede na grelha, centrada verticalmente
        wall.position.set(
          x * lvl.tileSize + offsetX,
          height / 2,
          z * lvl.tileSize + offsetZ
        );

        // Permite que a parede projete e receba sombras
        wall.castShadow = wall.receiveShadow = true;

        // Marca a parede como parte do nível (para futura limpeza)
        wall.userData.levelObject = true;

        // Adiciona a parede à cena
        scene.add(wall);

        // Guarda a referência para futura interação ou colisão
        wallMeshes.push(wall);
      }
    })
  );

  /*  ─────────────────────────── Objetos costumizados (layout.json)  ─────────────────────────── */
  function loadCustomObjects(objects, tileSize, offsetX, offsetZ, Scene) {
    if (!objects) return;

    // Cria bordas exteriores à volta do mapa se a espessura estiver definida
    if (lvl.borderThickness && lvl.borderThickness > 0) {
      const bt = lvl.borderThickness; // Espessura das bordas
      const w = mapW * lvl.tileSize; // Largura total do mapa
      const h = mapH * lvl.tileSize; // Altura total do mapa

      // Calcula posições laterais e verticais das bordas
      const leftX = offsetX - lvl.tileSize / 2 - bt / 2;
      const rightX = offsetX + w - lvl.tileSize / 2 + bt / 2;
      const topZ = offsetZ - lvl.tileSize / 2 - bt / 2;
      const bottomZ = offsetZ + h - lvl.tileSize / 2 + bt / 2;

      // Função auxiliar para criar uma borda com tamanho e posição
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

      // Cria as 4 bordas (topo, fundo, esquerda, direita)
      makeBorder(w, bt, (leftX + rightX) / 2, topZ); // Borda superior
      makeBorder(w, bt, (leftX + rightX) / 2, bottomZ); // Borda inferior
      makeBorder(bt, h, leftX, (topZ + bottomZ) / 2); // Borda esquerda
      makeBorder(bt, h, rightX, (topZ + bottomZ) / 2); // Borda direita
    }

    objects.forEach((obj) => {
      const { type, position, dimensions, color } = obj;
      // Le o type no layout.json 
      /* ─────────────────────────── Todos os niveis  ─────────────────────────── */
      if (type === "moeda") {

        const radius = 0.5; // Raio da moeda
        const thickness = 0.15; // Espessura da moeda

        // // Parte interior da moeda (mais pequena e dourada)
        const innerGeometry = new THREE.CylinderGeometry(
          radius * 0.9,
          radius * 0.9,
          thickness,
          32
        );
        // Textura da parte interior (dentro)
        const innerMaterial = new THREE.MeshStandardMaterial({
          color: 0xffd700,
        });
        const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);

        //Parte exterior (ligeiramente maior, cor diferente)
        const outerGeometry = new THREE.CylinderGeometry(
          radius,
          radius,
          thickness * 1.1,
          32
        );
        // Textura da parte exterior (fora)
        const outerMaterial = new THREE.MeshStandardMaterial({
          color: 0xfff066,
        });
        const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);

        // Junta ambas as partes num grupo (moeda completa)
        const coinGroup = new THREE.Group();
        coinGroup.add(outerMesh);
        coinGroup.add(innerMesh);

        // Rodar a moeda (eixo X)
        coinGroup.rotation.x = Math.PI / 2;

        // Subir para não ficar enterrada
        coinGroup.position.set(
          position.x * tileSize + offsetX,
          1,
          position.z * tileSize + offsetZ
        );

        // Adiciona um brilho por baixo da moeda (efeito visual atrativo)
        const glowTex = textureLoader.load("../assets/textures/glow.png");
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xfff066,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });

        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.set(2, 2, 1); // Tamanho do brilho
        glowSprite.position.set(0, -0.05, 0.8); // Posiciona o brilho ligeiramente abaixo

        coinGroup.add(glowSprite);// Adiciona o brilho ao grupo da moeda

        coinGroup.userData.glow = glowSprite; // Guarda referência ao brilho
        coinGroup.userData.levelObject = true; // Marca como parte do nível

        scene.add(coinGroup);  // Adiciona à cena
        coinMeshes.push(coinGroup); // Guarda no array para interação futura
      }

      /*  ─────────────────────────── Nivel 2  ───────────────────────────*/
      if (type === "iglu") {
        // Calcula a posição final do iglu no mapa (centro da tile)
        igluPosition = new THREE.Vector3(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );
        // Cria o iglu completo (cúpula, túnel, luzes) através da função dedicada
        igluTunnel = createIglu(igluPosition, scene, igluTexture);
      }

      /*  ─────────────────────────── Nivel 6  ─────────────────────────── */
      if (type === "celeiro") {
        // Grupo principal do celeiro (para agrupar todas as partes)
        celeiroGroup = new THREE.Group();

        // Forma lateral do celeiro (perfil em 2D)
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

        // Extrusão para transformar o perfil 2D num volume 3D (tipo prisma)
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

        // ───── Telhado ─────

        // Material para o telhado
        const telhadoMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Parte superior plana do telhado
        const telhadoTopo = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 0.05, 3.2), // largura = topo reto, profundidade igual ao celeiro
          telhadoMat
        );
        telhadoTopo.position.set(0, 3.05, 0.4); // alinhado com o topo do corpo
        celeiroGroup.add(telhadoTopo);

        // Inclinação teclado esquerdo
        const telhadoEsq = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.05, 3.2), // largura entre -1.6 e -0.8
          telhadoMat
        );
        telhadoEsq.rotation.z = Math.atan(0.7 / 0.8); // ≈ 0.718 radianos (41.2°)
        telhadoEsq.position.set(-1.2, 2.7, 0.4); // centro entre os pontos inclinados
        celeiroGroup.add(telhadoEsq);

        // Inclinação telhado direito
        const telhadoDir = telhadoEsq.clone();
        telhadoDir.rotation.z = -Math.atan(0.7 / 0.8);
        telhadoDir.position.x = 1.2;
        celeiroGroup.add(telhadoDir);

        // ───── Porta com moldura branca ─────
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

        // Cruz em X 
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

        // Janela circular acima da porta 
        const raioExterior = 0.3;
        const raioInterior = 0.22;

        // Aro branco (moldura)
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

        // fardos de palhas ao lado do celeiro 
        const texturaPalha = textureLoader.load("../assets/textures/palha.jpg");

        texturaPalha.wrapS = THREE.RepeatWrapping;
        texturaPalha.wrapT = THREE.RepeatWrapping;
        texturaPalha.repeat.set(1, 1);

        const materialFardo = new THREE.MeshStandardMaterial({
          map: texturaPalha,
          color: 0xffffff,
        });

        // Fardo inferior 
        const geometriaFardo1 = new THREE.CylinderGeometry(0.7, 0.8, 1.2, 32); // raio = 0.7
        const fardo1 = new THREE.Mesh(geometriaFardo1, materialFardo);
        fardo1.position.set(2, 0.8, 2.8); // y = raio (0.7) para assentar no chão
        fardo1.castShadow = fardo1.receiveShadow = true;
        celeiroGroup.add(fardo1);

        // Fardo superior 
        const geometriaFardo2 = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 32); // raio = 0.6
        const fardo2 = new THREE.Mesh(geometriaFardo2, materialFardo);
        fardo2.position.set(2, 1.8, 2.8); // y = base + raio do fardo2 = 0.7 + 0.6
        fardo2.castShadow = fardo2.receiveShadow = true;
        celeiroGroup.add(fardo2);

        scene.add(celeiroGroup);
      }
      /*  ─────────────────────────── Nivel 1  ─────────────────────────── */
      if (type === "arvore") {
        const group = new THREE.Group(); // Grupo para juntar tronco, copa e portal

        // Textura
        const texturaTronco = textureLoader.load("../assets/textures/bark.png"); // Textura do tronco
        const texturaFolhas = textureLoader.load(
          "../assets/textures/leaves.png" // Textura das folhas
        );

        // Tronco
        const tronco = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 2.5, 8, 30), // Cilindro com topo mais fino que a base
          new THREE.MeshStandardMaterial({
            map: texturaTronco,
          })
        );
        tronco.position.y = 1.5; // Eleva o tronco para assentar no chão
        group.add(tronco);

        // Copa (folhas) (esfera)
        const copa = new THREE.Mesh(
          new THREE.SphereGeometry(4, 32, 32), // Esfera grande para a copa
          new THREE.MeshStandardMaterial({
            map: texturaFolhas,
            emissive: 0x228b22,
            emissiveIntensity: 0.4,
          })
        );
        copa.position.y = 8.5; // Coloca a copa no topo do tronco
        group.add(copa);

        // Posicao final
        group.position.set(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );

          // ───── Portal escuro (fim de nível) ─────
        const porta = new THREE.Mesh(
          new THREE.CircleGeometry(1.2, 32), // Círculo preto na base da árvore
          new THREE.MeshStandardMaterial({
            color: 0x111111,
            side: THREE.DoubleSide, // Visível dos dois lados
          })
        );
        const distanciaFrontal = 2.19; // Distância à frente da árvore
        porta.rotation.y = Math.PI;  // Virar para o jogador
        porta.position.set(0, 1.2, -distanciaFrontal); // Colocada em frente à árvore
        group.add(porta);

        // ───── Moldura branca (aro da porta) ─────
        const aro = new THREE.Mesh(
          new THREE.RingGeometry(1.3, 1.5, 32), // Aro circular branco à volta da porta
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          })
        );
        aro.rotation.y = Math.PI;
        aro.position.set(0, 1.2, -distanciaFrontal - 0.01); 
        group.add(aro);

        // ───── Efeito de brilho (glow) ─────
        const glowTexture = textureLoader.load("../assets/textures/glow.png");

        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0x00ff99,  // Brilho verde-claro
          transparent: true,
          opacity: 1,
          depthWrite: false, // Não interfere com a profundidade da cena
        });

        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.set(8, 8, 1);  // Tamanho do brilho
        glowSprite.position.set(0, 1.2, -distanciaFrontal - 0.4);  // Atrás do aro
        group.add(glowSprite);

        group.userData.levelObject = true;
        scene.add(group);
      }
      /*  ─────────────────────────── Nivel 3  ─────────────────────────── */
      if (type === "vulcao") {
        const vulcaoGroup = new THREE.Group();

        // Textura da lava 
        const texturaLava = textureLoader.load(
          "../assets/levels/level-3/vulcao.png"
        );
        texturaLava.wrapS = THREE.RepeatWrapping;
        texturaLava.wrapT = THREE.RepeatWrapping;
        texturaLava.repeat.set(1, 2);

        /*  ─────────────────────────── Base do cone: cone com ponta achatada  ─────────────────────────── */
        const coneGeometry = new THREE.CylinderGeometry(0.8, 4, 4, 32); // topo menor que base
        const coneMaterial = new THREE.MeshStandardMaterial({
          map: texturaLava,
          emissiveIntensity: 0.4,
        });

        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = 1;
        cone.castShadow = cone.receiveShadow = true;
        vulcaoGroup.add(cone);

        // Posicao final
        vulcaoGroup.position.set(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );
        vulcaoGroup.rotation.y = -Math.PI / 2;

        /*  ─────────────────────────── Particulas de lava  ─────────────────────────── */
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
        particles.position.set(0, 3, 0); 
        vulcaoGroup.add(particles);

        // Guardar para animar
        particles.userData.velocities = velocities;
        animatedObjects.push(particles); 

        /*  ─────────────────────────── Portal fim de nivel  ─────────────────────────── */ 
        const distanciaFrontal = 2.6;
        const inclinacao = Math.atan((4 - 0.8) / 4); 

        const portao = new THREE.Mesh(
          new THREE.CircleGeometry(1, 32),
          new THREE.MeshStandardMaterial({
            color: 0x111111,
            side: THREE.DoubleSide,
          })
        );
        portao.rotation.set(inclinacao, 0, 0);
        portao.position.set(0, 0.8, -distanciaFrontal);
        vulcaoGroup.add(portao);

        // aro do portal 
        const aroPortao = new THREE.Mesh(
          new THREE.RingGeometry(1.1, 1.3, 32),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
          })
        );
        aroPortao.rotation.set(inclinacao, 0, 0);
        aroPortao.position.set(0, 0.8, -distanciaFrontal - 0.01);
        vulcaoGroup.add(aroPortao);

        // Brilho (glow) do portal
        const glowTexture = textureLoader.load("../assets/textures/glow.png");
        const glowMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0xff3333,
          transparent: true,
          opacity: 1,
          depthWrite: false,
        });
        const glowSprite = new THREE.Sprite(glowMaterial);
        glowSprite.scale.set(4, 4, 1);
        glowSprite.rotation.set(inclinacao, Math.PI, 0);
        glowSprite.position.set(0, 0.8, -distanciaFrontal - 0.4);
        vulcaoGroup.add(glowSprite);

        // Posicao final
        vulcaoGroup.position.set(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );

        vulcaoGroup.userData.levelObject = true;
        scene.add(vulcaoGroup);
      }
      /*  ─────────────────────────── Nivel 4  ─────────────────────────── */
      if (type === "naveET") {
        const naveGroup = new THREE.Group(); // Agrupamento do cone, partículas e portal

        // ───── Textura da lava ─────
        const materialBase = new THREE.MeshStandardMaterial({
          color: 0x888888, // cinzento médio
          metalness: 0.9, // aspeto metálico
          roughness: 0.2, // ligeiramente polido
        });

        const materialCabine = new THREE.MeshStandardMaterial({
          color: 0x88faff,
          metalness: 0.4,
          roughness: 0.1,
          transparent: true,
          opacity: 0.85,
        });

        /*  ─────────────────────────── Base (Esfera achatada)  ─────────────────────────── */
        const base = new THREE.Mesh(
          new THREE.SphereGeometry(3, 32, 32),
          materialBase
        );
        base.scale.y = 0.2;
        naveGroup.add(base);

        /*  ─────────────────────────── Cabine superior (meia esfera)  ─────────────────────────── */
        const cabine = new THREE.Mesh(
          new THREE.SphereGeometry(1.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2),
          materialCabine
        );
        cabine.position.y = 0.3;
        naveGroup.add(cabine);

        /* ─────────────────────────── Base inferior onde sai o raio de luz (cilindro achatado)  ─────────────────────────── */
        const baseInferior = new THREE.Mesh(
          new THREE.CylinderGeometry(2, 2, 0.1, 32), 
          new THREE.MeshStandardMaterial({
            color: 0xffff33,
            metalness: 0.5,
            roughness: 0.3,
          })
        );
        baseInferior.position.y = -0.55; 
        naveGroup.add(baseInferior);

        // Posicao final
        naveGroup.position.set(
          position.x * tileSize + offsetX,
          4,
          position.z * tileSize + offsetZ
        );

        /*  ─────────────────────────── Raio de luz (cone)  ─────────────────────────── */
        const raioLuz = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 3.5, 6, 32), // raio topo, raio base, altura
          new THREE.MeshStandardMaterial({
            color: 0xffff99,
            transparent: true,
            opacity: 0.25,
            emissive: 0xffff33,
            emissiveIntensity: 0.4,
            depthWrite: false,
          })
        );
        raioLuz.position.y = -3.5; 
        naveGroup.add(raioLuz);

        naveGroup.userData.levelObject = true;
        scene.add(naveGroup);
      }
      /*  ─────────────────────────── Nivel 6  ─────────────────────────── */
      if (type === "heliporto") {
        const heliGroup = new THREE.Group();

        /*  ─────────────────────────── Base (cilindro achatado)  ─────────────────────────── */
        const baseHeliporto = new THREE.Mesh(
          new THREE.CylinderGeometry(3, 3, 0.05, 64), // raio, raio, altura, segmentos
          new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.6,
            roughness: 0.5,
          })
        );
        baseHeliporto.position.y = 0.25;
        heliGroup.add(baseHeliporto);

        //Textura do H
        const hMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffff99,
          emissiveIntensity: 1.2,
          toneMapped: false,
        });

        /*  ─────────────────────────── 'H' do heliporto  ─────────────────────────── */
        const barraEsquerda = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.2, 2.5),
          hMaterial
        );
        barraEsquerda.position.set(-0.8, 0.3, 0);
        heliGroup.add(barraEsquerda);

        const barraDireita = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.2, 2.5),
          hMaterial
        );
        barraDireita.position.set(0.8, 0.3, 0);
        heliGroup.add(barraDireita);

        const barraMeio = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.2, 0.4),
          hMaterial
        );
        barraMeio.position.set(0, 0.3, 0);
        heliGroup.add(barraMeio);

        // Posição do heliporto
        heliGroup.position.set(
          position.x * tileSize + offsetX,
          0,
          position.z * tileSize + offsetZ
        );

        heliGroup.userData.levelObject = true;
        scene.add(heliGroup);
        heliGroup.name = "heliporto";
      }
      /*  ─────────────────────────── Nivel 6 ─────────────────────────── */
      if (type === "helicoptero") {
        const heliGroup = new THREE.Group();

        /* ─────────────────────────── Corpo (esfera)  ─────────────────────────── */
        const corpo = new THREE.Mesh(
          new THREE.SphereGeometry(0.9, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        corpo.position.set(0, 0, -0.4); 
        corpo.castShadow = true;
        heliGroup.add(corpo);
        /*  ─────────────────────────── Faixas á volta da esfera  ─────────────────────────── */
        const faixaMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff33,
        });

        const numFaixas = 3;
        const raioInicial = 0.8;
        const diminuicao = 0.05; 

        for (let i = 0; i < numFaixas; i++) {
          const raio = raioInicial + i * diminuicao;

          const faixa = new THREE.Mesh(
            new THREE.TorusGeometry(raio, 0.015, 16, 100),
            faixaMaterial
          );

          faixa.rotation.x = Math.PI / 2;
          faixa.position.set(0, -0.4 + i * 0.15, -0.4); // espaco entre cada faixa

          heliGroup.add(faixa);
        }

        /* ─────────────────────────── Cauda principal   ─────────────────────────── */
        // Grupo da cauda
        const caudaGroup = new THREE.Group();

        // Corpo da cauda (cilindro)
        const corpoCauda = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 2, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        corpoCauda.rotation.x = Math.PI / 2; 
        corpoCauda.castShadow = true;
        caudaGroup.add(corpoCauda);

        // Posicionar a cauda inteira
        caudaGroup.position.set(0, 0, 1.6);
        corpo.add(caudaGroup);

        /*  ─────────────────────────── Cauda secundaria  ─────────────────────────── */
        // Grupo da cauda secundária
        const caudaSecGroup = new THREE.Group();

        // Corpo da cauda (cilindro vertical)
        const corpoCaudaSec = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        corpoCaudaSec.castShadow = true;
        caudaSecGroup.add(corpoCaudaSec);

        // Posicionar o grupo
        caudaSecGroup.position.set(0, 0.2, 2.4);
        corpo.add(caudaSecGroup);

        /*  ─────────────────────────── Helice principal   ─────────────────────────── */
        // Rotor principal
        const rotorPrincipal = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.05, 4),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        rotorPrincipal.position.y = 0.9;
        rotorPrincipal.castShadow = true;
        corpo.add(rotorPrincipal);

        /*  ─────────────────────────── Helice Secundaria   ─────────────────────────── */
        // Rotor de cauda
        const rotorCauda = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.6, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        rotorCauda.position.set(0.1, 0.3, 2.4);
        rotorCauda.castShadow = true;
        corpo.add(rotorCauda);

        // Guardar rotores
        heliGroup.userData.rotorPrincipal = rotorPrincipal;
        heliGroup.userData.rotorCauda = rotorCauda;

        /*  ─────────────────────────── Base do Helicoptero (Patins) horizontal  ─────────────────────────── */
        const patimMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
        });
        const patimComprimento = 2;
        const patimEspessura = 0.05;
        const patimAltura = 0.05;
        const curvaComprimento = 0.4;

        // Criação dos dois patins
        [-0.6, 0.6].forEach((x) => {
          const patimGroup = new THREE.Group();

          // Parte reta central
          const base = new THREE.Mesh(
            new THREE.BoxGeometry(
              patimEspessura,
              patimAltura,
              patimComprimento - 2 * curvaComprimento
            ),
            patimMaterial
          );
          base.position.z = 0;
          patimGroup.add(base);

          // Valores ajustados
          const deslocamentoZ = patimComprimento / 2 - curvaComprimento * 0.6;

          /*  ─────────────────────────── Pontas inclinadas dos Patins   ─────────────────────────── */
          // Curva frontal
          const frente = new THREE.Mesh(
            new THREE.BoxGeometry(
              patimEspessura,
              patimAltura,
              curvaComprimento
            ),
            patimMaterial
          );
          frente.position.set(0, 0.05, -deslocamentoZ); // ← sobe no eixo Y com 0.05
          frente.rotation.x = Math.PI / 8;
          patimGroup.add(frente);

          // Curva traseira
          const tras = new THREE.Mesh(
            new THREE.BoxGeometry(
              patimEspessura,
              patimAltura,
              curvaComprimento
            ),
            patimMaterial
          );
          tras.position.set(0, 0.05, deslocamentoZ); // ← mesmo ajuste no Y
          tras.rotation.x = -Math.PI / 8;
          patimGroup.add(tras);

          // Posição do patim completo
          patimGroup.position.set(x, -0.9, -0.4);
          patimGroup.castShadow = true;
          heliGroup.add(patimGroup);
        });

        /*  ─────────────────────────── Supote dos Patins   ─────────────────────────── */
        // Suportes verticais (ligam corpo aos patins)
        const alturaSuporte = 0.7;
        const largura = 0.05;
        const offsetYSuporte = -0.9;
        const centroCorpo = new THREE.Vector3(0, 2, -0.4); 
        const suportesInfo = [
          { pos: new THREE.Vector3(-0.6, offsetYSuporte, -1.0) },
          { pos: new THREE.Vector3(-0.6, offsetYSuporte, 0.2) },
          { pos: new THREE.Vector3(0.6, offsetYSuporte, -1.0) },
          { pos: new THREE.Vector3(0.6, offsetYSuporte, 0.2) },
        ];

        for (const info of suportesInfo) {
          const { pos } = info;

          const dirTotal = new THREE.Vector3()
            .subVectors(centroCorpo, pos)
            .normalize();
          const dirBase = new THREE.Vector3(0, 1, 0);
          const dirSuave = dirBase.lerp(dirTotal, 0.3).normalize();

          const suporte = new THREE.Mesh(
            new THREE.BoxGeometry(largura, alturaSuporte, largura),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
          );
          suporte.position.y = alturaSuporte / 2;

          const suporteGroup = new THREE.Group();
          suporteGroup.add(suporte);
          suporteGroup.position.copy(pos);
          suporteGroup.lookAt(pos.clone().add(dirSuave));
          suporteGroup.rotateX(Math.PI / 2);

          suporte.castShadow = true;
          heliGroup.add(suporteGroup);
        }

        // Posição global do helicóptero
        heliGroup.position.set(
          position.x * tileSize + offsetX,
          2,
          position.z * tileSize + offsetZ
        );

        heliGroup.name = "helicoptero";
        heliGroup.userData.levelObject = true;
        scene.add(heliGroup);
      }
    });
  }

  /*  ─────────────────────────── Constuir o iglo   ─────────────────────────── */
  function createIglu(position, scene, igluTexture) {

    /* ─────────────────────────── Corpo do iglo (esfera)   ─────────────────────────── */
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

    /* ─────────────────────────── Entrada do iglo (2 cilindros)  ─────────────────────────── */
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
    ); 
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
    ); 
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

    /*  ─────────────────────────── Criar parede grossa entre o cilindro exterior e interior   ─────────────────────────── */
    const wallGeometry = new THREE.RingGeometry(0.9, 1.1, 32);
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: igluTexture,
      emissive: 0xffcc88,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide,
    });

    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.rotation.z = Math.PI / 2; 
    wall;
    wall.position.set(0, 0.1, 3.3); // à frente dos túneis 
    tunnelGroup.add(wall);

    /*  ─────────────────────────── Luzes do iglo   ─────────────────────────── */
    const igluLight = new THREE.PointLight(0xffcc88, 3.5, 6, 2);
    igluLight.position.set(position.x, 1.3, position.z);
    scene.add(igluLight);

    const tunnelLight = new THREE.PointLight(0xffcc88, 1.2, 3, 2);
    tunnelLight.position.set(position.x, 0.7, position.z + 2.2);
    scene.add(tunnelLight);

    return tunnelGroup;
  }

  /* ───────────────────────────Novo design de portais (translúcido e plano)   ─────────────────────────── */
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
  /*  ─────────────────────────── Devolver info ao main.js  ───────────────────────────*/
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

/* ─────────────────────────── Rotação do iglu em relação ao carro   ─────────────────────────── */
export function updateTunnelDirection(tunnelGroup, igluPosition, carPosition) {
  const dx = carPosition.x - igluPosition.x;
  const dz = carPosition.z - igluPosition.z;
  const angle = Math.atan2(dx, dz);

  tunnelGroup.rotation.y = angle;
}

/*  ─────────────────────────── Rotação do celeiro em relação ao carro   ─────────────────────────── */
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
