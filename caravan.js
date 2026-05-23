import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const canvas = document.getElementById("gameCanvas");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const caravanHpEl = document.getElementById("caravanHp");
const playerHpEl = document.getElementById("playerHp");
const killsEl = document.getElementById("kills");
const waveEl = document.getElementById("wave");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111318);
scene.fog = new THREE.Fog(0x111318, 22, 58);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 120);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const keys = new Set();
const enemies = [];
const slashEffects = [];

let player;
let caravan;
let caravanHp = 100;
let playerHp = 100;
let kills = 0;
let wave = 1;
let running = false;
let nextSpawnAt = 0;
let attackCooldown = 0;

setupWorld();
resetGame();
animate();

startBtn.addEventListener("click", () => {
  resetGame();
  running = true;
  overlay.classList.add("hidden");
});

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === " " && running) {
    event.preventDefault();
    attack();
  }
  if (event.key.toLowerCase() === "r") {
    resetGame();
    running = true;
    overlay.classList.add("hidden");
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("pointermove", updatePointer);
window.addEventListener("pointerdown", () => {
  if (running) {
    attack();
  }
});

function setupWorld() {
  const hemi = new THREE.HemisphereLight(0xc7d2fe, 0x24301d, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x35452d, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.04, 80),
    new THREE.MeshStandardMaterial({ color: 0x7c684d, roughness: 0.9 })
  );
  path.position.y = 0.02;
  path.receiveShadow = true;
  scene.add(path);

  for (let i = 0; i < 24; i += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.45),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 1 })
    );
    rock.position.set((Math.random() - 0.5) * 60, 0.25, (Math.random() - 0.5) * 60);
    if (Math.abs(rock.position.x) < 7) {
      rock.position.x += rock.position.x < 0 ? -8 : 8;
    }
    rock.castShadow = true;
    scene.add(rock);
  }
}

function resetGame() {
  enemies.splice(0).forEach((enemy) => scene.remove(enemy.mesh));
  slashEffects.splice(0).forEach((effect) => scene.remove(effect.mesh));
  if (player) scene.remove(player);
  if (caravan) scene.remove(caravan);

  player = createPlayer();
  caravan = createCaravan();
  scene.add(player, caravan);

  caravanHp = 100;
  playerHp = 100;
  kills = 0;
  wave = 1;
  nextSpawnAt = 0;
  attackCooldown = 0;
  updateHud();
}

function createPlayer() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.8, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.55 })
  );
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 1.15),
    new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.6, roughness: 0.35 })
  );
  blade.position.set(0.55, 0.95, -0.35);
  blade.castShadow = true;
  group.add(blade);

  group.position.set(0, 0, 7);
  return group;
}

function createCaravan() {
  const group = new THREE.Group();

  const wagon = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.45, 2.1),
    new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.75 })
  );
  wagon.position.y = 1;
  wagon.castShadow = true;
  group.add(wagon);

  const cover = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.12, 3.5, 16, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xe7d6ad, roughness: 0.9, side: THREE.DoubleSide })
  );
  cover.rotation.z = Math.PI / 2;
  cover.position.y = 1.72;
  cover.castShadow = true;
  group.add(cover);

  for (const x of [-1.25, 1.25]) {
    for (const z of [-0.95, 0.95]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.22, 18),
        new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.42, z);
      wheel.castShadow = true;
      group.add(wheel);
    }
  }

  group.position.set(0, 0, -8);
  return group;
}

function createEnemy() {
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 1.2, 6),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.65 })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  mesh.add(body);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.8 })
  );
  eye.position.set(0, 1.0, 0.42);
  mesh.add(eye);

  const side = Math.floor(Math.random() * 4);
  const spread = 18;
  const pos = [
    new THREE.Vector3((Math.random() - 0.5) * spread, 0, -30),
    new THREE.Vector3((Math.random() - 0.5) * spread, 0, 30),
    new THREE.Vector3(-30, 0, (Math.random() - 0.5) * spread),
    new THREE.Vector3(30, 0, (Math.random() - 0.5) * spread),
  ][side];

  mesh.position.copy(pos);
  scene.add(mesh);

  return {
    mesh,
    hp: 2 + Math.floor(wave / 3),
    speed: 1.25 + wave * 0.08 + Math.random() * 0.45,
    hitTimer: 0,
    attackTimer: 0,
  };
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  if (running) {
    updateGame(dt);
  }

  updateCamera();
  renderer.render(scene, camera);
}

function updateGame(dt) {
  attackCooldown = Math.max(0, attackCooldown - dt);
  nextSpawnAt -= dt;
  wave = 1 + Math.floor(kills / 8);

  if (nextSpawnAt <= 0 && enemies.length < 7 + wave) {
    enemies.push(createEnemy());
    nextSpawnAt = Math.max(0.35, 1.25 - wave * 0.06);
  }

  movePlayer(dt);
  updateEnemies(dt);
  updateSlashEffects(dt);
  updateHud();

  if (caravanHp <= 0 || playerHp <= 0) {
    running = false;
    overlay.classList.remove("hidden");
    overlay.querySelector("h1").textContent = "Гру завершено";
    overlay.querySelector("p").textContent = `Ти знищив монстрів: ${kills}. Натисни Почати, щоб спробувати ще раз.`;
  }
}

function movePlayer(dt) {
  const input = new THREE.Vector3();
  if (keys.has("w") || keys.has("arrowup")) input.z -= 1;
  if (keys.has("s") || keys.has("arrowdown")) input.z += 1;
  if (keys.has("a") || keys.has("arrowleft")) input.x -= 1;
  if (keys.has("d") || keys.has("arrowright")) input.x += 1;

  if (input.lengthSq() > 0) {
    input.normalize().multiplyScalar(6.5 * dt);
    player.position.add(input);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -28, 28);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -28, 28);
  }

  const target = pointerToGround();
  if (target) {
    player.lookAt(target.x, player.position.y, target.z);
  }
}

function updateEnemies(dt) {
  const caravanPos = caravan.position.clone();

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);

    const toCaravan = caravanPos.clone().sub(enemy.mesh.position);
    const toPlayer = player.position.clone().sub(enemy.mesh.position);
    const target = toPlayer.length() < 5.5 ? player.position : caravanPos;
    const direction = target.clone().sub(enemy.mesh.position);
    direction.y = 0;

    if (direction.length() > 1.25) {
      direction.normalize();
      enemy.mesh.position.addScaledVector(direction, enemy.speed * dt);
      enemy.mesh.lookAt(target.x, enemy.mesh.position.y, target.z);
    } else if (enemy.attackTimer <= 0) {
      enemy.attackTimer = 0.7;
      if (target === player.position) {
        playerHp -= 8;
      } else {
        caravanHp -= 6;
      }
    }

    enemy.mesh.scale.setScalar(enemy.hitTimer > 0 ? 1.18 : 1);

    if (enemy.hp <= 0) {
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      kills += 1;
    }
  }
}

function attack() {
  if (attackCooldown > 0) {
    return;
  }

  attackCooldown = 0.35;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
  const hitCenter = player.position.clone().addScaledVector(forward, 1.35);

  for (const enemy of enemies) {
    const distance = enemy.mesh.position.distanceTo(hitCenter);
    if (distance < 1.9) {
      enemy.hp -= 1;
      enemy.hitTimer = 0.14;
    }
  }

  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.035, 8, 40, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 })
  );
  slash.position.copy(hitCenter);
  slash.position.y = 0.8;
  slash.rotation.x = Math.PI / 2;
  slash.rotation.z = player.rotation.y;
  scene.add(slash);
  slashEffects.push({ mesh: slash, life: 0.16 });
}

function updateSlashEffects(dt) {
  for (let i = slashEffects.length - 1; i >= 0; i -= 1) {
    const effect = slashEffects[i];
    effect.life -= dt;
    effect.mesh.scale.multiplyScalar(1 + dt * 7);
    effect.mesh.material.opacity = Math.max(0, effect.life / 0.16);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      slashEffects.splice(i, 1);
    }
  }
}

function updatePointer(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function pointerToGround() {
  raycaster.setFromCamera(pointer, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, target) ? target : null;
}

function updateCamera() {
  const target = player ? player.position : new THREE.Vector3();
  camera.position.lerp(new THREE.Vector3(target.x, 14, target.z + 14), 0.08);
  camera.lookAt(target.x, 0, target.z - 3);
}

function updateHud() {
  caravanHpEl.textContent = Math.max(0, Math.ceil(caravanHp));
  playerHpEl.textContent = Math.max(0, Math.ceil(playerHp));
  killsEl.textContent = kills;
  waveEl.textContent = wave;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
