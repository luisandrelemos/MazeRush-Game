// js/main.js
import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { createCar }   from '../assets/models/CarModel.js';
import { loadLevel }   from './LevelLoader.js';

/* ───────────────────────────  Cena e câmaras  ─────────────────────────── */

const scene = new THREE.Scene();        // fog será aplicado pelo LevelLoader

// ▼ Câmaras principais
const cameraPerspective = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const cameraFollow      = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
let   orthoSize = 10;
const cameraOrtho = new THREE.OrthographicCamera(
  -orthoSize * (innerWidth/innerHeight),
   orthoSize * (innerWidth/innerHeight),
   orthoSize,
  -orthoSize,
  0.1, 1000
);
// câmara usada na transição do preview
const transitionCamera  = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);

/* ───────────  HUD: Obtém o elemento do velocímetro  ─────────────────────── */
const speedEl = document.getElementById('speedometer');

/* ─────────  Alternância de câmaras (botão + tecla C) ───────── */

let cameraMode = 0;               // 0-persp | 1-ortho | 2-follow
let activeCamera = cameraPerspective;

const cameraToggleBtn = document.getElementById('camera-toggle-btn');

function cycleCamera() {
  cameraMode = (cameraMode + 1) % 3;
  switch (cameraMode) {
    case 0: activeCamera = cameraPerspective; cameraToggleBtn.title = 'Vista Superior'; break;
    case 1: activeCamera = cameraOrtho;       cameraToggleBtn.title = 'Vista 3D';       break;
    case 2: activeCamera = cameraFollow;      cameraToggleBtn.title = 'Vista NFS';      break;
  }
}

// clique no botão
cameraToggleBtn.addEventListener('click', () => {
  cycleCamera();
  cameraToggleBtn.blur();        // << tira foco imediatamente
});

// tecla C / c
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'c' && !e.repeat) {
    cycleCamera();
    // pequena animação visual do botão
    cameraToggleBtn.style.transform = 'scale(0.9)';
    setTimeout(() => cameraToggleBtn.style.transform = '', 120);
  }
});

/* ─────────────────────────────  Renderer  ─────────────────────────────── */

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

/* ───────────────────────────  Luzes globais  ─────────────────────────── */

const ambientLight = new THREE.AmbientLight(0x334477, 0.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x8899ff, 0.9);
directionalLight.position.set(-20,50,20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(4096,4096);
directionalLight.shadow.radius = 6;
const sCam = directionalLight.shadow.camera;
Object.assign(sCam, { left:-100, right:100, top:100, bottom:-100, near:1, far:150 });
sCam.updateProjectionMatrix();
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0x445577, 0.4, 60, 2);
pointLight.position.set(0,10,0);
scene.add(pointLight);

/* ───────────────────────────  Jogador (carro)  ─────────────────────────── */

const textureLoader = new THREE.TextureLoader();
const car = createCar(textureLoader);
scene.add(car); car.castShadow = true;

/* ───────────────────────────  Estado do nível  ─────────────────────────── */

let levelData        = null;
let wallMeshes       = [];
let visitedCells     = [];
let animationStarted = false;

/* ─────────────────────────────  Faróis do carro ──────────────────────────── */

const headlightLeft  = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 10, 0.3, 1);
const headlightRight = headlightLeft.clone();
const targetLeft  = new THREE.Object3D();
const targetRight = new THREE.Object3D();
scene.add(headlightLeft, headlightRight, targetLeft, targetRight);
headlightLeft.target  = targetLeft;
headlightRight.target = targetRight;
headlightLeft.castShadow = headlightRight.castShadow = true;

/* ────────────────────────────  Easing helpers  ───────────────────────────── */

function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t){  return t * t * t; }
function easeInOutCubic(t){
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ──────────────────────  Efeitos visuais (fumo, salto)  ───────────────────── */

function createSmoke(textureLoader, position){
  const tex = textureLoader.load('./assets/textures/smoke.png');
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite:false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.5,1.5,1.5);
  sprite.position.copy(position);
  scene.add(sprite);

  const start = performance.now(), duration = 800;
  function anim(t){
    const p = Math.min((t-start)/duration, 1);
    sprite.material.opacity = 0.7 * (1-p);
    sprite.scale.setScalar(1.5 + p);
    if (p < 1) requestAnimationFrame(anim); else scene.remove(sprite);
  }
  requestAnimationFrame(anim);
}

let isRotating = false;
function rotateCar180(car, dir='right'){
  if (isRotating) return;
  isRotating = true;

  // fumo nas rodas traseiras
  const backL = new THREE.Vector3(-0.5,0.2,1.2), backR = new THREE.Vector3(0.5,0.2,1.2);
  car.localToWorld(backL); car.localToWorld(backR);
  createSmoke(textureLoader, backL);
  createSmoke(textureLoader, backR);

  const startRot = car.rotation.y;
  const angle = dir==='left' ? Math.PI : -Math.PI;
  const targetRot = startRot + angle;
  const start = performance.now(), duration = 1000;

  function anim(t){
    const p = Math.min((t-start)/duration,1);
    car.rotation.y = startRot + angle * easeOutCubic(p);
    if (p < 1) requestAnimationFrame(anim); else { car.rotation.y = targetRot; isRotating=false; }
  }
  requestAnimationFrame(anim);
}

let isJumping = false;
function createJumpDust(textureLoader, pos, count=12, spread=0.5){
  const tex = textureLoader.load('./assets/textures/smoke.png');
  const parts=[];
  for (let i=0;i<count;i++){
    const mat = new THREE.SpriteMaterial({ map: tex, transparent:true, opacity:0.6, depthWrite:false });
    const s   = new THREE.Sprite(mat);
    s.scale.set(0.3,0.3,0.3);
    s.position.copy(pos).add(new THREE.Vector3(
      (Math.random()-0.5)*spread, 0,
      (Math.random()-0.5)*spread
    ));
    scene.add(s);
    parts.push({sprite:s, angle:Math.random()*Math.PI*2});
  }
  const start=performance.now(), duration=500;
  function anim(t){
    const p=Math.min((t-start)/duration,1);
    parts.forEach(particle=>{
      particle.sprite.position.x += Math.cos(particle.angle)*0.01;
      particle.sprite.position.z += Math.sin(particle.angle)*0.01;
      particle.sprite.material.opacity = 0.6*(1-p);
      particle.sprite.scale.setScalar(0.3 + p*0.6);
    });
    if (p<1) requestAnimationFrame(anim); else parts.forEach(particle=>scene.remove(particle.sprite));
  }
  requestAnimationFrame(anim);
}

function jumpCar(car){
  if (isJumping) return;
  isJumping = true;

  const upDur=300, downDur=400, height=3, startY=car.position.y, start=performance.now();
  const groundPos = new THREE.Vector3(); car.getWorldPosition(groundPos); groundPos.y=0.1;
  createJumpDust(textureLoader, groundPos);

  function anim(t){
    const e=t-start;
    if (e<upDur){
      const p=e/upDur; car.position.y=startY+height*easeOutCubic(p); requestAnimationFrame(anim);
    } else if (e<upDur+downDur){
      const p=(e-upDur)/downDur; car.position.y=startY+height*(1-easeInCubic(p)); requestAnimationFrame(anim);
    } else { car.position.y=startY; isJumping=false; }
  }
  requestAnimationFrame(anim);
}

/* ────────────────────────────  Colisão util  ─────────────────────────────── */
function checkCollisionAndReact(car, walls) {
  const carBox = new THREE.Box3().setFromObject(car);

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);

    if (carBox.intersectsBox(wallBox)) {
      // calcula o volume de interseção
      const overlapBox = carBox.clone().intersect(wallBox);
      const overlapSize = overlapBox.getSize(new THREE.Vector3());

      // ignora colisões muito pequenas (tolerância)
      const eps = 0.1;
      if (overlapSize.x < eps && overlapSize.z < eps) continue;

      // empurra o carro para fora na direção horizontal
      const pushDir = new THREE.Vector3()
        .subVectors(car.position, wall.position)
        .setY(0)
        .normalize();

      // desloca pela maior dimensão de interseção
      const pushDist = Math.max(overlapSize.x, overlapSize.z);
      car.position.add(pushDir.multiplyScalar(pushDist));

      car.userData.velocity = 0;
      return true;
    }
  }

  return false;
}

/* ──────────────────────  Entrada de teclado / rato  ──────────────────────── */

const keysPressed={};
document.addEventListener('keydown',e=>{
  keysPressed[e.key.toLowerCase()]=true;

  if (e.key==='q') rotateCar180(car,'left');
  if (e.key==='e') rotateCar180(car,'right');
  if (e.code==='Space')  jumpCar(car);
});
document.addEventListener('keyup',  e=>{ keysPressed[e.key.toLowerCase()]=false; });

/* ─── Rato para rotação da câmara em 1ª pessoa / follow ─── */
let isDragging=false, previousMousePosition={x:0,y:0};
let cameraRotationOffset=0, targetRotationOffset=0;

document.addEventListener('mousedown',e=>{ isDragging=true; previousMousePosition.x=e.clientX; });
document.addEventListener('mouseup',  ()=>{ isDragging=false; });
document.addEventListener('mousemove',e=>{
  if (!isDragging) return;
  const dx=e.clientX-previousMousePosition.x;
  targetRotationOffset += dx*0.002;
  previousMousePosition.x=e.clientX;
});
document.addEventListener('mouseleave',()=>{ isDragging=false; });

/* ─────────────────────────────  Pause menu  ──────────────────────────────── */

const pauseMenu     = document.getElementById('pause-menu');
const resumeBtn     = document.getElementById('resume-btn');
const restartBtn    = document.getElementById('restart-btn');
const exitBtn       = document.getElementById('exit-btn');
const gameContainer = document.getElementById('game-container');

let isPaused=false;
resumeBtn.onclick  = ()=>{ isPaused=false; pauseMenu.classList.remove('active'); gameContainer.style.filter='none'; };
restartBtn.onclick = ()=> location.reload();
exitBtn.onclick    = ()=> window.location.href='index.html';
document.addEventListener('keydown',e=>{
  if (e.key==='Escape'){
    isPaused = !isPaused;
    pauseMenu.classList.toggle('active',isPaused);
    gameContainer.style.filter = isPaused ? 'blur(6px)' : 'none';
  }
});

/* ─────────────────────────────  Resize  ──────────────────────────────────── */

window.addEventListener('resize', () => {
  cameraPerspective.aspect = innerWidth/innerHeight;
  cameraPerspective.updateProjectionMatrix();
  cameraFollow.aspect = innerWidth/innerHeight;
  cameraFollow.updateProjectionMatrix();

  const aspect = innerWidth/innerHeight;
  cameraOrtho.left = -orthoSize*aspect;
  cameraOrtho.right=  orthoSize*aspect;
  cameraOrtho.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});

/* ───────────────────────  Carregar nível e arrancar  ─────────────────────── */

async function initLevel(levelName='level-1'){
  levelData = await loadLevel(levelName, scene, textureLoader);

  wallMeshes = scene.children.filter(o=>o.userData.levelObject && o.geometry?.type==='BoxGeometry');
  visitedCells = levelData.map.map(row=>row.map(()=>false));

  car.position.copy(levelData.startPos);
  car.rotation.set(0,0,0);
  car.userData.velocity=0;

  const {color,near,far}=levelData.fog;
  scene.fog = new THREE.Fog(color,near,far);

  if (!animationStarted){ animate(); animationStarted=true; }

  startMapPreviewSequence();   // mostra preview do mapa sempre que carrega
}
initLevel();

/* ─────────────────────────────  Loop  ────────────────────────────────────── */

function animate(){
  requestAnimationFrame(animate);
  if (isPaused || !levelData) return;

  const { tileSize, offsetX, offsetZ, map } = levelData;
  const mapWidth  = map[0].length;
  const mapHeight = map.length;

  // --- física básica ---
  const data       = car.userData;
  const frontAxle  = data.frontAxle;
  const steerSpeed = 0.025, maxSteer = Math.PI/6;
  const accel      = keysPressed['w']   || keysPressed['arrowup'];
  const brake      = keysPressed['s']   || keysPressed['arrowdown'];
  const left       = keysPressed['a']   || keysPressed['arrowleft'];
  const right      = keysPressed['d']   || keysPressed['arrowright'];

  // velocidade
  if (accel)      data.velocity = Math.min(data.velocity + data.acceleration, data.maxSpeed);
  else if (brake) data.velocity = Math.max(data.velocity - data.acceleration * 1.2, -data.maxSpeed * 0.5);
  else {
    data.velocity *= data.friction;
    if (Math.abs(data.velocity) < 0.001) data.velocity = 0;
  }

  const isMoving = data.velocity !== 0;

  // ângulo das rodas
  if (!isMoving) {
    if (left)  frontAxle.rotation.y = Math.min(frontAxle.rotation.y + steerSpeed,  maxSteer);
    if (right) frontAxle.rotation.y = Math.max(frontAxle.rotation.y - steerSpeed, -maxSteer);
    if (!left && !right) frontAxle.rotation.y *= 0.85;
  } else {
    if (left)  frontAxle.rotation.y = Math.min(frontAxle.rotation.y + steerSpeed,  maxSteer);
    if (right) frontAxle.rotation.y = Math.max(frontAxle.rotation.y - steerSpeed, -maxSteer);
    if (!left && !right) frontAxle.rotation.y *= 0.9;
    car.rotation.y += frontAxle.rotation.y * 0.04 * Math.sign(data.velocity);
  }

  // mover e colidir separado por eixos
  if (data.velocity !== 0) {
    const dir = new THREE.Vector3(0, 0, -1)
      .applyEuler(car.rotation)
      .multiplyScalar(data.velocity);

    // X
    car.position.x += dir.x;
    checkCollisionAndReact(car, wallMeshes);

    // Z
    car.position.z += dir.z;
    checkCollisionAndReact(car, wallMeshes);

    // gira rodas visuais
    const wheelSpeed = data.velocity * 10;
    data.rotatingWheels.forEach(w => w.rotation.x += wheelSpeed);
  }

  // câmaras
  if (cameraMode===0){
    if (!isDragging) targetRotationOffset*=0.9;
    cameraRotationOffset += (targetRotationOffset-cameraRotationOffset)*0.08;
    const base = new THREE.Vector3(0,8.5,8.5);
    const off  = base.clone().applyEuler(new THREE.Euler(0,cameraRotationOffset,0)).applyEuler(car.rotation);
    cameraPerspective.position.lerp(car.position.clone().add(off),0.08);
    cameraPerspective.lookAt(car.position);
  }
  else if (cameraMode===1){
    cameraOrtho.position.set(car.position.x,60,car.position.z+20);
    cameraOrtho.lookAt(car.position);
  }
  else if (cameraMode===2){
    if (!isDragging) targetRotationOffset*=0.9;
    cameraRotationOffset += (targetRotationOffset-cameraRotationOffset)*0.08;
    const base = new THREE.Vector3(0,1.5,4);
    const off  = base.clone().applyEuler(new THREE.Euler(0,cameraRotationOffset,0)).applyEuler(car.rotation);
    cameraFollow.position.lerp(car.position.clone().add(off),0.08);
    cameraFollow.lookAt(car.position);
  }

    // ─── ACTUALIZA HUD: velocímetro ───────────────────────────────────────
    const kmh = Math.abs(data.velocity) * 1000;    
    speedEl.textContent = `${kmh.toFixed(0)} km/h`;

  // faróis
  const leftOff  = new THREE.Vector3(-0.2,0.2,-0.6).applyEuler(car.rotation);
  const rightOff = new THREE.Vector3( 0.2,0.2,-0.6).applyEuler(car.rotation);
  const dirOff   = new THREE.Vector3(0,0,-2).applyEuler(car.rotation);
  headlightLeft.position.copy(car.position.clone().add(leftOff));
  headlightRight.position.copy(car.position.clone().add(rightOff));
  targetLeft.position.copy(headlightLeft.position.clone().add(dirOff));
  targetRight.position.copy(headlightRight.position.clone().add(dirOff));

  // marcar células visitadas
  const cx=Math.floor((car.position.x-offsetX)/tileSize+0.5);
  const cz=Math.floor((car.position.z-offsetZ)/tileSize+0.5);
  for (let dz=-1;dz<=1;dz++){
    for (let dx=-1;dx<=1;dx++){
      const nx=cx+dx,nz=cz+dz;
      if (nx>=0&&nx<mapWidth&&nz>=0&&nz<mapHeight) visitedCells[nz][nx]=true;
    }
  }

  drawMinimap(mapWidth, mapHeight, tileSize, offsetX, offsetZ);
  renderer.render(scene, activeCamera);
}

/* ───────────────────────────  Minimap  ───────────────────────────────────── */

function drawMinimap(wCells,hCells,tileSize,offsetX,offsetZ){
  const canvas=document.getElementById('minimap');
  if (!canvas) return;
  const ctx=canvas.getContext('2d'), wPx=canvas.width, hPx=canvas.height;
  const cellW=wPx/wCells, cellH=hPx/hCells;

  // fundo
  const g=ctx.createLinearGradient(0,0,0,hPx); g.addColorStop(0,'#1a1a1a'); g.addColorStop(1,'#333');
  ctx.fillStyle=g; ctx.fillRect(0,0,wPx,hPx);

  // células
  for (let z=0;z<hCells;z++){
    for (let x=0;x<wCells;x++){
      if (!visitedCells[z][x]) ctx.fillStyle='#000';
      else ctx.fillStyle = levelData.map[z][x]===1 ? '#445' : '#77a';
      ctx.fillRect(x*cellW,z*cellH,cellW,cellH);
    }
  }

  // ícone do carro
  const carX=(car.position.x-offsetX+tileSize/2)/tileSize*cellW;
  const carZ=(car.position.z-offsetZ+tileSize/2)/tileSize*cellH;
  ctx.save(); ctx.translate(carX,carZ); ctx.rotate(-car.rotation.y);
  ctx.fillStyle='#f33';
  ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(4,4); ctx.lineTo(-4,4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ───────────────────────────  UI: Toggle de luzes  ───────────────────────── */
['toggleAmbient', 'toggleDirectional', 'togglePoint'].forEach(id => {
  document.getElementById(id).addEventListener('change', e => {

    // liga / desliga a luz correspondente
    switch (id) {
      case 'toggleAmbient':
        e.target.checked ? scene.add(ambientLight)      : scene.remove(ambientLight);
        break;
      case 'toggleDirectional':
        e.target.checked ? scene.add(directionalLight)  : scene.remove(directionalLight);
        break;
      case 'togglePoint':
        e.target.checked ? scene.add(pointLight)        : scene.remove(pointLight);
        break;
    }

    e.target.blur();    // remove o foco — evita “click” extra com a tecla Espaço
  });
});

/* ───────────────────────  Preview inicial do mapa  ───────────────────────── */

function startMapPreviewSequence(){
  if (!levelData) return;   // garante que já temos dados

  const { tileSize, offsetX, offsetZ, map } = levelData;
  const mapWidth=map[0].length, mapHeight=map.length;

  const centerX = mapWidth*tileSize/2 + offsetX - tileSize/2;
  const centerZ = mapHeight*tileSize/2 + offsetZ - tileSize/2;

  const canvasAspect = innerWidth/innerHeight;
  const mapRatio = mapWidth/mapHeight;
  const zoom=1.1;
  orthoSize = canvasAspect>mapRatio
    ? (mapHeight*tileSize*zoom)/2
    : ((mapWidth*tileSize)/canvasAspect*zoom)/2;

  cameraOrtho.left=-orthoSize*canvasAspect;
  cameraOrtho.right=orthoSize*canvasAspect;
  cameraOrtho.top=orthoSize;
  cameraOrtho.bottom=-orthoSize;
  cameraOrtho.updateProjectionMatrix();

  cameraOrtho.position.set(centerX,100,centerZ);
  cameraOrtho.lookAt(centerX,0,centerZ);

  activeCamera=cameraOrtho;
  scene.fog=null;
  document.getElementById('minimap-container').style.display='none';

  const previewText=document.getElementById('preview-text');
  previewText.style.opacity=1;

  setTimeout(()=>{
    previewText.style.opacity=0;
    scene.fog=new THREE.Fog('#000000',30,80);
    document.getElementById('minimap-container').style.display='block';

    transitionCamera.position.copy(cameraOrtho.position);
    transitionCamera.quaternion.copy(cameraOrtho.quaternion);
    activeCamera=transitionCamera;

    const dur=1500,start=performance.now(),startPos=cameraOrtho.position.clone(),
          startQuat=cameraOrtho.quaternion.clone(),
          endPos=cameraPerspective.position.clone(),
          endQuat=cameraPerspective.quaternion.clone();

    function anim(t){
      const p=Math.min((t-start)/dur,1), e=easeInOutCubic(p);
      transitionCamera.position.lerpVectors(startPos,endPos,e);
      transitionCamera.quaternion.copy(startQuat.clone().slerp(endQuat,e));
      if (p<1) requestAnimationFrame(anim); else activeCamera=cameraPerspective;
    }
    requestAnimationFrame(anim);
  },3000);
}