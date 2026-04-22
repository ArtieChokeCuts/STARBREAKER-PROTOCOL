const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const STORAGE_KEY = "starbreaker-protocol-best-score";
const WORLD = {
  width: canvas.width,
  height: canvas.height,
};
const TAU = Math.PI * 2;

const ui = {
  canvasWrap: document.querySelector(".canvas-wrap"),
  introOverlay: document.getElementById("introOverlay"),
  upgradeOverlay: document.getElementById("upgradeOverlay"),
  pausedOverlay: document.getElementById("pausedOverlay"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  startButton: document.getElementById("startButton"),
  fullscreenButton: document.getElementById("fullscreenButton"),
  resumeButton: document.getElementById("resumeButton"),
  replayButton: document.getElementById("replayButton"),
  dashButton: document.getElementById("dashButton"),
  overdriveButton: document.getElementById("overdriveButton"),
  hapticsToggle: document.getElementById("hapticsToggle"),
  hapticsIntensity: document.getElementById("hapticsIntensity"),
  trailSlider: document.getElementById("trail"),
  driftSlider: document.getElementById("drift"),
  hullValue: document.getElementById("hullValue"),
  hullBar: document.getElementById("hullBar"),
  chargeValue: document.getElementById("chargeValue"),
  chargeBar: document.getElementById("chargeBar"),
  comboValue: document.getElementById("comboValue"),
  comboBar: document.getElementById("comboBar"),
  scoreValue: document.getElementById("scoreValue"),
  waveValue: document.getElementById("waveValue"),
  enemiesValue: document.getElementById("enemiesValue"),
  statusValue: document.getElementById("statusValue"),
  bestScoreTitle: document.getElementById("bestScoreTitle"),
  bestScoreSide: document.getElementById("bestScoreSide"),
  bossBarWrap: document.getElementById("bossBarWrap"),
  bossBar: document.getElementById("bossBar"),
  bossName: document.getElementById("bossName"),
  bossHpText: document.getElementById("bossHpText"),
  upgradePrompt: document.getElementById("upgradePrompt"),
  upgradeGrid: document.getElementById("upgradeGrid"),
  toast: document.getElementById("toast"),
  activeUpgrades: document.getElementById("activeUpgrades"),
  gameOverEyebrow: document.getElementById("gameOverEyebrow"),
  gameOverTitle: document.getElementById("gameOverTitle"),
  gameOverMessage: document.getElementById("gameOverMessage"),
  finalScore: document.getElementById("finalScore"),
  bestScore: document.getElementById("bestScore"),
  wavesCleared: document.getElementById("wavesCleared"),
};

const input = {
  keys: new Set(),
  pointer: {
    active: false,
    inside: false,
    x: WORLD.width / 2,
    y: WORLD.height * 0.75,
  },
  touch: {
    active: false,
    x: WORLD.width / 2,
    y: WORLD.height * 0.75,
  },
};

const WAVE_DEFS = [
  {
    title: "Ember Wake",
    note: "Breaking the siege line",
    counts: { drone: 14, striker: 4 },
    spawnDelay: 0.72,
  },
  {
    title: "Glass Horizon",
    note: "Gunners above the smoke",
    counts: { drone: 10, striker: 8, bomber: 4 },
    spawnDelay: 0.66,
  },
  {
    title: "Aegis Warden",
    note: "Mid-line command platform incoming",
    boss: "warden",
  },
  {
    title: "Iron Halo",
    note: "Charge units punching through",
    counts: { drone: 8, striker: 10, bomber: 6, leech: 8 },
    spawnDelay: 0.58,
  },
  {
    title: "Grave Current",
    note: "No clean air left",
    counts: { striker: 12, bomber: 8, leech: 12 },
    spawnDelay: 0.52,
  },
  {
    title: "Dread Sun Leviathan",
    note: "End the siege flagship",
    boss: "leviathan",
  },
];

const UPGRADE_POOL = [
  {
    id: "volley",
    name: "Photon Volley",
    description: "Add another spread projectile and sharpen base damage.",
    apply(player) {
      player.spread = Math.min(player.spread + 1, 5);
      player.damage += 3;
    },
  },
  {
    id: "rail-core",
    name: "Rail Core",
    description: "Cut your firing interval and push bolts harder through the sky.",
    apply(player) {
      player.fireInterval = Math.max(player.fireInterval * 0.84, 0.09);
      player.bulletSpeed += 80;
    },
  },
  {
    id: "afterburners",
    name: "Afterburners",
    description: "More movement speed, longer pickup magnet, brighter escapes.",
    apply(player) {
      player.speed += 36;
      player.pickupRadius += 26;
    },
  },
  {
    id: "phase-plating",
    name: "Phase Plating",
    description: "Increase max hull and patch the current frame mid-combat.",
    apply(player) {
      player.hullMax += 22;
      player.hull = Math.min(player.hull + 30, player.hullMax);
    },
  },
  {
    id: "satellite",
    name: "Wingmate Drone",
    description: "Deploy an orbiting drone that fires support bolts.",
    apply(player) {
      player.satellites = Math.min(player.satellites + 1, 3);
    },
  },
  {
    id: "capacitor",
    name: "Capacitor Spine",
    description: "Charge the EMP faster and hit harder when you unleash it.",
    apply(player) {
      player.overdriveGain += 0.2;
      player.overdriveBurst += 18;
    },
  },
  {
    id: "phase-dash",
    name: "Phase Dash",
    description: "Shorter dash cooldown and nastier impact damage on the way through.",
    apply(player) {
      player.dashCooldownMax = Math.max(player.dashCooldownMax - 0.18, 0.48);
      player.dashDamage += 18;
    },
  },
  {
    id: "piercer",
    name: "Void Piercer",
    description: "Shots pierce one more target and hit with heavier punch.",
    apply(player) {
      player.pierce += 1;
      player.damage += 2;
    },
  },
];

const ENEMY_COLORS = {
  drone: "#ff8c50",
  striker: "#ffd05a",
  bomber: "#ff5e4f",
  leech: "#ff8f72",
  warden: "#ff6f5a",
  leviathan: "#ff5544",
};

let state = createInitialState();
let lastFrame = performance.now();
let audioContext = null;

function createInitialState() {
  const best = getStoredBest();
  return {
    phase: "intro",
    time: 0,
    score: 0,
    bestScore: best,
    combo: 1,
    comboTimer: 0,
    waveIndex: -1,
    currentWave: null,
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    particles: [],
    textBursts: [],
    stars: createStars(),
    flowParticles: createFlowParticles(),
    shake: 0,
    flash: 0,
    toastTimer: 0,
    statusText: "Awaiting launch",
    stats: { wavesCleared: 0, kills: 0 },
    offeredUpgrades: [],
    player: createPlayer(),
  };
}

function resetStar(star = {}) {
  star.x = rand(-WORLD.width * 0.92, WORLD.width * 0.92);
  star.y = rand(-WORLD.height * 0.74, WORLD.height * 0.74);
  star.z = rand(90, WORLD.width * 1.08);
  star.size = rand(0.9, 2.5);
  star.speed = rand(180, 460);
  star.alpha = rand(0.22, 0.95);
  return star;
}

function createStars() {
  return Array.from({ length: 520 }, () => resetStar({}));
}

function resetFlowParticle(particle = {}) {
  const spawnMode = Math.floor(rand(0, 4));
  if (spawnMode === 0) {
    particle.x = rand(-140, -24);
    particle.y = rand(-120, WORLD.height * 0.42);
  } else if (spawnMode === 1) {
    particle.x = rand(WORLD.width + 24, WORLD.width + 140);
    particle.y = rand(-120, WORLD.height * 0.42);
  } else if (spawnMode === 2) {
    particle.x = rand(-120, WORLD.width + 120);
    particle.y = rand(-140, -24);
  } else {
    particle.x = rand(-120, WORLD.width + 120);
    particle.y = rand(WORLD.height + 24, WORLD.height + 140);
  }

  particle.vx = rand(-18, 18);
  particle.vy = rand(-18, 18);
  particle.size = rand(0.8, 2.6);
  particle.alpha = rand(0.22, 0.82);
  particle.seed = rand(0, TAU);
  return particle;
}

function createFlowParticles() {
  return Array.from({ length: 180 }, () => resetFlowParticle({}));
}

function createPlayer() {
  return {
    x: WORLD.width / 2,
    y: WORLD.height * 0.78,
    radius: 18,
    speed: 340,
    hullMax: 100,
    hull: 100,
    damage: 14,
    fireInterval: 0.22,
    fireCooldown: 0.18,
    bulletSpeed: 890,
    spread: 1,
    pierce: 0,
    pickupRadius: 120,
    invulnerable: 0,
    dashCooldown: 0,
    dashCooldownMax: 1.2,
    dashTimer: 0,
    dashDirection: { x: 0, y: -1 },
    dashDamage: 28,
    overdrive: 0,
    overdriveGain: 1,
    overdriveTimer: 0,
    overdriveBurst: 46,
    satellites: 0,
    satelliteCooldown: 0,
    aimAngle: -Math.PI / 2,
    upgradeLog: [],
  };
}

function getStoredBest() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch (error) {
    return 0;
  }
}

function storeBestScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch (error) {
    return;
  }
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function formatScore(value) {
  return Math.round(value).toLocaleString();
}

function sliderValue(element, fallback = 0) {
  if (!element) {
    return fallback;
  }
  return clamp(Number(element.value) / 100, 0, 1);
}

function trailFadeAlpha() {
  return lerp(0.28, 0.05, sliderValue(ui.trailSlider, 0.78));
}

function driftAmount() {
  return sliderValue(ui.driftSlider, 0.35);
}

function hapticsEnabled() {
  return Boolean(ui.hapticsToggle?.checked);
}

function vibratePulse(duration) {
  if (!hapticsEnabled() || !("vibrate" in navigator)) {
    return;
  }

  const intensity = sliderValue(ui.hapticsIntensity, 0.45);
  const scaled = Math.max(0, Math.round(duration * intensity));
  if (scaled > 0) {
    navigator.vibrate(scaled);
  }
}

function shuffled(array) {
  const clone = [...array];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swap]] = [clone[swap], clone[index]];
  }
  return clone;
}

function showToast(message, duration = 2.3) {
  ui.toast.dataset.message = message;
  ui.toast.classList.remove("hidden");
  state.toastTimer = duration;
}

function hideToast() {
  ui.toast.classList.add("hidden");
}

function currentFocusPoint() {
  if (input.touch.active) {
    return { x: input.touch.x, y: input.touch.y };
  }
  if (input.pointer.inside || input.pointer.active) {
    return { x: input.pointer.x, y: input.pointer.y };
  }
  return { x: WORLD.width / 2, y: WORLD.height * 0.42 };
}

function currentAimPoint(player = state.player) {
  if (input.touch.active) {
    return { x: input.touch.x, y: input.touch.y };
  }
  if (input.pointer.inside || input.pointer.active) {
    return { x: input.pointer.x, y: input.pointer.y };
  }
  const target = nearestThreat(player.x, player.y);
  if (target) {
    return { x: target.x, y: target.y };
  }
  return { x: player.x, y: player.y - 180 };
}

function primaryFireActive() {
  return input.touch.active || input.pointer.active;
}

function setPhase(phase) {
  state.phase = phase;
  ui.introOverlay.classList.toggle("hidden", phase !== "intro");
  ui.upgradeOverlay.classList.toggle("hidden", phase !== "upgrade");
  ui.pausedOverlay.classList.toggle("hidden", phase !== "paused");
  ui.gameOverOverlay.classList.toggle("hidden", phase !== "gameover");
}

function canEnterFullscreen() {
  return Boolean(
    document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      ui.canvasWrap?.requestFullscreen ||
      ui.canvasWrap?.webkitRequestFullscreen
  );
}

function updateFullscreenUi() {
  ui.fullscreenButton.classList.toggle("hidden", !canEnterFullscreen());
}

async function enterFullscreen() {
  const target = ui.canvasWrap || document.documentElement;
  const request =
    target.requestFullscreen?.bind(target) ||
    target.webkitRequestFullscreen?.bind(target);

  if (!request) {
    showToast("Fullscreen not supported here", 1.6);
    return;
  }

  try {
    await request();
    showToast("Fullscreen engaged", 1.4);
  } catch (error) {
    showToast("Fullscreen blocked", 1.6);
  }
}

async function unregisterLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    return;
  }

  try {
    const siteRoot = new URL("./", window.location.href).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const matchingRegistrations = registrations.filter((registration) =>
      registration.scope.startsWith(siteRoot)
    );

    await Promise.all(
      matchingRegistrations.map((registration) => registration.unregister())
    );
  } catch (error) {
    return;
  }
}

function resetRun() {
  const best = state.bestScore || getStoredBest();
  state = createInitialState();
  state.bestScore = best;
  state.player = createPlayer();
  state.stars = createStars();
  state.flowParticles = createFlowParticles();
  state.statusText = "Run live";
  input.touch.active = false;
  input.pointer.active = false;
  input.pointer.inside = false;
  setPhase("playing");
  nextWave();
  updateHud(true);
}

function beginRun() {
  ensureAudio();
  resetRun();
  playTone("triangle", 240, 0.2, 0.05);
}

function nextWave() {
  state.waveIndex += 1;
  const waveDef = WAVE_DEFS[state.waveIndex];
  state.currentWave = waveDef ? { ...waveDef, spawned: false } : null;
  const wave = state.currentWave;

  if (!wave) {
    endRun(true);
    return;
  }

  state.spawnQueue = wave.counts ? buildSpawnQueue(wave.counts) : [];
  state.spawnTimer = 1.2;
  state.statusText = wave.note;
  const player = state.player;
  player.hull = Math.min(player.hull + 12, player.hullMax);
  showToast(`Wave ${state.waveIndex + 1}: ${wave.title}`);
}

function buildSpawnQueue(counts) {
  const queue = [];
  Object.entries(counts).forEach(([type, amount]) => {
    for (let index = 0; index < amount; index += 1) {
      queue.push(type);
    }
  });
  return shuffled(queue);
}

function openUpgradeDraft() {
  setPhase("upgrade");
  state.statusText = "Upgrade bay online";
  state.offeredUpgrades = shuffled(
    UPGRADE_POOL.filter((upgrade) => !state.player.upgradeLog.includes(upgrade.name))
  ).slice(0, 3);

  if (state.offeredUpgrades.length < 3) {
    const fill = shuffled(UPGRADE_POOL).slice(0, 3 - state.offeredUpgrades.length);
    state.offeredUpgrades.push(...fill);
  }

  ui.upgradePrompt.textContent = `${state.currentWave.title} cleared. Reinforce before the next breach opens.`;
  ui.upgradeGrid.innerHTML = "";

  state.offeredUpgrades.forEach((upgrade) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-card";
    button.innerHTML = `<h3>${upgrade.name}</h3><p>${upgrade.description}</p>`;
    button.addEventListener("click", () => applyUpgrade(upgrade));
    ui.upgradeGrid.appendChild(button);
  });
}

function applyUpgrade(upgrade) {
  ensureAudio();
  upgrade.apply(state.player);
  state.player.upgradeLog.push(upgrade.name);
  updateUpgradeList();
  playTone("square", 520, 0.16, 0.06);
  showToast(`${upgrade.name} online`);
  state.stats.wavesCleared += 1;
  setPhase("playing");
  nextWave();
}

function updateUpgradeList() {
  ui.activeUpgrades.innerHTML = "";
  if (!state.player.upgradeLog.length) {
    const item = document.createElement("li");
    item.textContent = "No upgrades online yet";
    ui.activeUpgrades.appendChild(item);
    return;
  }

  state.player.upgradeLog.forEach((label) => {
    const item = document.createElement("li");
    item.textContent = label;
    ui.activeUpgrades.appendChild(item);
  });
}

function spawnEnemy(type) {
  const side = Math.floor(rand(0, 3));
  const base = {
    type,
    color: ENEMY_COLORS[type],
    hitFlash: 0,
    dashImmune: 0,
    spawnPulse: 0.5,
    seed: rand(0, Math.PI * 2),
  };

  let enemy;
  if (side === 0) {
    enemy = { ...base, x: rand(60, WORLD.width - 60), y: rand(-160, -40) };
  } else if (side === 1) {
    enemy = { ...base, x: rand(-120, -40), y: rand(60, WORLD.height * 0.45) };
  } else {
    enemy = { ...base, x: rand(WORLD.width + 40, WORLD.width + 120), y: rand(60, WORLD.height * 0.45) };
  }

  switch (type) {
    case "drone":
      Object.assign(enemy, { radius: 18, hp: 38, maxHp: 38, speed: 155, value: 110, contactDamage: 14, vx: 0, vy: 0 });
      break;
    case "striker":
      Object.assign(enemy, {
        radius: 20,
        hp: 64,
        maxHp: 64,
        speed: 120,
        value: 180,
        contactDamage: 18,
        orbit: Math.random() > 0.5 ? 1 : -1,
        shootCooldown: rand(0.4, 1.4),
      });
      break;
    case "bomber":
      Object.assign(enemy, {
        radius: 26,
        hp: 96,
        maxHp: 96,
        speed: 76,
        value: 260,
        contactDamage: 22,
        shootCooldown: rand(0.9, 1.8),
        anchorY: rand(120, 210),
      });
      break;
    case "leech":
      Object.assign(enemy, {
        radius: 18,
        hp: 46,
        maxHp: 46,
        speed: 120,
        value: 200,
        contactDamage: 20,
        state: "aim",
        chargeTimer: rand(1.4, 2.3),
        chargeDuration: 0,
        vx: 0,
        vy: 0,
      });
      break;
    default:
      return;
  }

  state.enemies.push(enemy);
  spawnParticles(enemy.x, enemy.y, enemy.color, 12, 100);
}

function spawnBoss(kind) {
  let boss;
  if (kind === "warden") {
    boss = {
      type: "warden",
      boss: true,
      title: "Aegis Warden",
      x: WORLD.width / 2,
      y: 130,
      radius: 64,
      hp: 760,
      maxHp: 760,
      value: 2600,
      contactDamage: 26,
      color: ENEMY_COLORS.warden,
      hitFlash: 0,
      spawnPulse: 1.2,
      radialCooldown: 1,
      burstCooldown: 1.8,
      summonCooldown: 4.8,
      phase: 0,
    };
  } else {
    boss = {
      type: "leviathan",
      boss: true,
      title: "Dread Sun Leviathan",
      x: WORLD.width / 2,
      y: 118,
      radius: 88,
      hp: 1480,
      maxHp: 1480,
      value: 5200,
      contactDamage: 34,
      color: ENEMY_COLORS.leviathan,
      hitFlash: 0,
      spawnPulse: 1.6,
      patternTimer: 4.2,
      shotCooldown: 0.2,
      summonCooldown: 4.4,
      phaseIndex: 0,
      spiralAngle: 0,
      enraged: false,
      mode: 0,
    };
  }

  state.enemies.push(boss);
  playTone("sawtooth", 82, 0.4, 0.08);
  showToast(`${boss.title} entering range`);
  spawnParticles(boss.x, boss.y, boss.color, 28, 170);
}

function spawnParticles(x, y, color, count, speed, life = 0.8, size = 2.5) {
  for (let index = 0; index < count; index += 1) {
    const angle = rand(0, Math.PI * 2);
    const velocity = rand(speed * 0.25, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: rand(life * 0.6, life),
      maxLife: life,
      color,
      size: rand(1.2, size),
    });
  }
}

function createFloatingText(x, y, text, color) {
  state.textBursts.push({
    x,
    y,
    text,
    color,
    life: 0.9,
    maxLife: 0.9,
  });
}

function createPlayerBullet(x, y, angle, damage, pierce = 0, friendlyColor = "#7dedff") {
  state.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * state.player.bulletSpeed,
    vy: Math.sin(angle) * state.player.bulletSpeed,
    damage,
    radius: 6,
    life: 1.4,
    pierce,
    color: friendlyColor,
  });
}

function createEnemyBullet(x, y, angle, speed, radius, damage, color = "#ff9f68", life = 5) {
  state.enemyBullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    damage,
    life,
    color,
  });
}

function nearestThreat(x, y) {
  let closest = null;
  let bestDistance = Infinity;
  state.enemies.forEach((enemy) => {
    const dist = distance(x, y, enemy.x, enemy.y);
    if (dist < bestDistance) {
      bestDistance = dist;
      closest = enemy;
    }
  });
  return closest;
}

function firePlayerWeapons() {
  const player = state.player;
  const aimPoint = currentAimPoint(player);
  const baseAngle = angleTo(player.x, player.y, aimPoint.x, aimPoint.y);
  const spreadCount = player.spread;
  const spreadWidth = 0.18;
  const intervalMultiplier = player.overdriveTimer > 0 ? 0.48 : 1;
  player.fireCooldown = player.fireInterval * intervalMultiplier;
  player.aimAngle = baseAngle;

  if (spreadCount === 1) {
    createPlayerBullet(player.x, player.y, baseAngle, player.damage, player.pierce);
  } else {
    for (let shot = 0; shot < spreadCount; shot += 1) {
      const offset = shot - (spreadCount - 1) / 2;
      createPlayerBullet(
        player.x,
        player.y,
        baseAngle + offset * spreadWidth,
        player.damage,
        player.pierce
      );
    }
  }

  playTone("triangle", player.overdriveTimer > 0 ? 430 : 320, 0.04, 0.03);
  spawnParticles(player.x, player.y, "#d8ffff", player.overdriveTimer > 0 ? 5 : 3, 70, 0.22, 1.9);
}

function fireSatelliteWeapons(dt) {
  const player = state.player;
  if (!player.satellites) {
    return;
  }

  player.satelliteCooldown -= dt;
  if (player.satelliteCooldown > 0) {
    return;
  }

  player.satelliteCooldown = player.overdriveTimer > 0 ? 0.24 : 0.42;
  const target = nearestThreat(player.x, player.y);
  if (!target) {
    return;
  }

  for (let index = 0; index < player.satellites; index += 1) {
    const angle = state.time * 1.8 + (Math.PI * 2 * index) / player.satellites;
    const sx = player.x + Math.cos(angle) * 34;
    const sy = player.y + Math.sin(angle) * 22;
    const shotAngle = angleTo(sx, sy, target.x, target.y);
    state.bullets.push({
      x: sx,
      y: sy,
      vx: Math.cos(shotAngle) * (state.player.bulletSpeed + 120),
      vy: Math.sin(shotAngle) * (state.player.bulletSpeed + 120),
      damage: 7 + player.satellites * 1.5,
      radius: 4.5,
      life: 1.2,
      pierce: 0,
      color: "#9fffe4",
    });
  }
}

function tryDash() {
  if (state.phase !== "playing") {
    return;
  }
  const player = state.player;
  if (player.dashCooldown > 0 || player.dashTimer > 0) {
    return;
  }

  let moveX = 0;
  let moveY = 0;
  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) {
    moveY -= 1;
  }
  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) {
    moveY += 1;
  }
  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) {
    moveX -= 1;
  }
  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) {
    moveX += 1;
  }

  if (!moveX && !moveY && input.touch.active) {
    moveX = input.touch.x - player.x;
    moveY = input.touch.y - player.y;
  } else if (!moveX && !moveY && input.pointer.active) {
    moveX = input.pointer.x - player.x;
    moveY = input.pointer.y - player.y;
  }

  const vector = normalize(moveX || 0, moveY || -1);
  player.dashDirection = vector;
  player.dashTimer = 0.18;
  player.dashCooldown = player.dashCooldownMax;
  player.invulnerable = 0.34;
  state.shake = Math.max(state.shake, 12);
  playTone("square", 190, 0.1, 0.06);
  spawnParticles(player.x, player.y, "#7dedff", 18, 240, 0.35, 2.4);
}

function tryOverdrive() {
  if (state.phase !== "playing") {
    return;
  }
  const player = state.player;
  if (player.overdrive < 100) {
    return;
  }

  player.overdrive = 0;
  player.overdriveTimer = 4.6;
  const damage = player.overdriveBurst;
  state.enemyBullets = [];
  [...state.enemies].forEach((enemy) => {
    damageEnemy(enemy, damage, true);
  });
  state.flash = 0.95;
  state.shake = Math.max(state.shake, 22);
  vibratePulse(60);
  playTone("sawtooth", 150, 0.28, 0.08);
  showToast("EMP burst detonated");
  spawnParticles(player.x, player.y, "#c9ffff", 42, 320, 0.75, 4);
}

function togglePause() {
  if (state.phase === "playing") {
    setPhase("paused");
    state.statusText = "Paused";
  } else if (state.phase === "paused") {
    setPhase("playing");
    state.statusText = state.currentWave ? state.currentWave.note : "Run live";
  }
}

function handleInputDown(code) {
  input.keys.add(code);
  if (code === "ShiftLeft" || code === "ShiftRight") {
    tryDash();
  }
  if (code === "Space") {
    tryOverdrive();
  }
  if (code === "KeyP" || code === "Escape") {
    togglePause();
  }
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * WORLD.width;
  const y = ((clientY - rect.top) / rect.height) * WORLD.height;
  return { x, y };
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.repeat) {
    return;
  }
  handleInputDown(event.code);
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
});

window.addEventListener("blur", () => {
  input.keys.clear();
  input.pointer.active = false;
  input.pointer.inside = false;
  input.touch.active = false;
  if (state.phase === "playing") {
    togglePause();
  }
});

document.addEventListener("fullscreenchange", () => {
  updateFullscreenUi();
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    ensureAudio();
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    const point = screenToWorld(touch.clientX, touch.clientY);
    input.touch.active = true;
    input.touch.x = point.x;
    input.touch.y = point.y;
    input.pointer.active = false;
    input.pointer.inside = false;
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    const point = screenToWorld(touch.clientX, touch.clientY);
    input.touch.active = true;
    input.touch.x = point.x;
    input.touch.y = point.y;
    input.pointer.active = false;
    input.pointer.inside = false;
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchend",
  (event) => {
    if (!event.touches.length) {
      input.touch.active = false;
      input.pointer.active = false;
      input.pointer.inside = false;
    }
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchcancel",
  (event) => {
    input.touch.active = false;
    input.pointer.active = false;
    input.pointer.inside = false;
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") {
    return;
  }
  ensureAudio();
  const point = screenToWorld(event.clientX, event.clientY);
  input.pointer.active = true;
  input.pointer.inside = true;
  input.pointer.x = point.x;
  input.pointer.y = point.y;
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") {
    return;
  }
  const point = screenToWorld(event.clientX, event.clientY);
  input.pointer.inside = true;
  input.pointer.x = point.x;
  input.pointer.y = point.y;
});

canvas.addEventListener("pointerup", (event) => {
  if (event.pointerType === "touch") {
    return;
  }
  input.pointer.active = false;
});

canvas.addEventListener("pointercancel", (event) => {
  if (event.pointerType === "touch") {
    return;
  }
  input.pointer.active = false;
  input.pointer.inside = false;
});

canvas.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "touch") {
    return;
  }
  input.pointer.active = false;
  input.pointer.inside = false;
});

ui.startButton.addEventListener("click", () => {
  enterFullscreen();
  beginRun();
});
ui.fullscreenButton.addEventListener("click", () => {
  enterFullscreen();
});
ui.resumeButton.addEventListener("click", () => togglePause());
ui.replayButton.addEventListener("click", beginRun);
ui.dashButton.addEventListener("click", () => {
  ensureAudio();
  tryDash();
});
ui.overdriveButton.addEventListener("click", () => {
  ensureAudio();
  tryOverdrive();
});

function ensureAudio() {
  if (audioContext) {
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return;
  }

  audioContext = new AudioCtor();
}

function playTone(type, frequency, duration, volume) {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(40, frequency * 0.75),
    audioContext.currentTime + duration
  );
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function damageEnemy(enemy, amount, silent = false) {
  enemy.hp -= amount;
  enemy.hitFlash = 0.16;
  if (!silent) {
    spawnParticles(enemy.x, enemy.y, enemy.color, Math.ceil(amount / 5), 80, 0.28, 2);
  }

  if (enemy.hp > 0) {
    return false;
  }

  const bonus = enemy.boss ? 1.2 : 1;
  const scoreGain = enemy.value * state.combo * bonus;
  state.score += scoreGain;
  state.combo = Math.min(state.combo + (enemy.boss ? 0.8 : 0.24), 6);
  state.comboTimer = 4.2;
  state.stats.kills += 1;
  state.player.overdrive = clamp(
    state.player.overdrive + (enemy.boss ? 18 : 6) * state.player.overdriveGain,
    0,
    100
  );

  if (enemy.boss) {
    state.enemyBullets = [];
    state.shake = Math.max(state.shake, 20);
    vibratePulse(42);
    showToast(`${enemy.title} destroyed`);
    playTone("sawtooth", 92, 0.4, 0.08);
  } else {
    playTone("square", 220, 0.06, 0.025);
  }

  createFloatingText(enemy.x, enemy.y - 10, `+${Math.round(scoreGain)}`, "#ffd274");
  spawnParticles(enemy.x, enemy.y, enemy.color, enemy.boss ? 52 : 16, enemy.boss ? 240 : 140, enemy.boss ? 1.4 : 0.7, enemy.boss ? 4 : 2.8);

  if (!enemy.boss) {
    const drops = Math.random() < 0.28 ? 2 : 1;
    for (let index = 0; index < drops; index += 1) {
      state.pickups.push({
        x: enemy.x + rand(-8, 8),
        y: enemy.y + rand(-8, 8),
        value: rand(5, 9),
        life: 7,
        radius: 6,
        pulse: rand(0, Math.PI * 2),
      });
    }
  }

  const enemyIndex = state.enemies.indexOf(enemy);
  if (enemyIndex >= 0) {
    state.enemies.splice(enemyIndex, 1);
  }
  return true;
}

function damagePlayer(amount) {
  const player = state.player;
  if (player.invulnerable > 0) {
    return;
  }

  player.hull -= amount;
  player.invulnerable = 0.75;
  state.flash = Math.max(state.flash, 0.18);
  state.shake = Math.max(state.shake, 14);
  vibratePulse(34);
  playTone("sawtooth", 120, 0.12, 0.05);
  showToast("Hull breached", 1.4);
  if (player.hull <= 0) {
    player.hull = 0;
    endRun(false);
  }
}

function endRun(victory) {
  if (state.phase === "gameover") {
    return;
  }

  setPhase("gameover");
  state.statusText = victory ? "Mission accomplished" : "Signal lost";
  state.stats.wavesCleared = victory ? WAVE_DEFS.length : Math.max(state.waveIndex, 0);

  if (state.score > state.bestScore) {
    state.bestScore = Math.round(state.score);
    storeBestScore(state.bestScore);
  }

  ui.gameOverEyebrow.textContent = victory ? "Siege broken" : "Run terminated";
  ui.gameOverTitle.textContent = victory ? "Leviathan down" : "Interceptor destroyed";
  ui.gameOverMessage.textContent = victory
    ? "The blockade shattered. The sky belongs to you for one impossible night."
    : "The city still saw the streak you carved through the clouds. Reload the frame and go louder.";
  ui.finalScore.textContent = formatScore(state.score);
  ui.bestScore.textContent = formatScore(state.bestScore);
  ui.wavesCleared.textContent = String(state.stats.wavesCleared);
  playTone(victory ? "triangle" : "sawtooth", victory ? 360 : 90, 0.4, 0.08);
  updateHud(true);
}

function updateWave(dt) {
  if (!state.currentWave) {
    return;
  }

  const wave = state.currentWave;

  if (wave.boss) {
    const bossAlive = state.enemies.some((enemy) => enemy.boss);
    if (!bossAlive && !wave.spawned) {
      wave.spawned = true;
      spawnBoss(wave.boss);
      return;
    }
  } else if (state.spawnQueue.length) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const nextType = state.spawnQueue.shift();
      if (nextType) {
        spawnEnemy(nextType);
      }
      state.spawnTimer = wave.spawnDelay;
    }
  }

  const waveDone = !state.spawnQueue.length && state.enemies.length === 0;
  if (wave.boss && wave.spawned && state.enemies.length === 0) {
    if (state.waveIndex === WAVE_DEFS.length - 1) {
      endRun(true);
    } else {
      openUpgradeDraft();
    }
  } else if (!wave.boss && waveDone) {
    openUpgradeDraft();
  }
}

function updatePlayer(dt) {
  const player = state.player;
  let moveX = 0;
  let moveY = 0;
  const aimPoint = currentAimPoint(player);

  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) {
    moveY -= 1;
  }
  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) {
    moveY += 1;
  }
  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) {
    moveX -= 1;
  }
  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) {
    moveX += 1;
  }

  if (!moveX && !moveY && input.touch.active) {
    moveX = input.touch.x - player.x;
    moveY = input.touch.y - player.y;
  } else if (!moveX && !moveY && input.pointer.active) {
    moveX = input.pointer.x - player.x;
    moveY = input.pointer.y - player.y;
  }

  const movement = normalize(moveX, moveY);
  player.aimAngle = angleTo(player.x, player.y, aimPoint.x, aimPoint.y);

  player.fireCooldown -= dt;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.overdriveTimer = Math.max(0, player.overdriveTimer - dt);

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.x += player.dashDirection.x * 940 * dt;
    player.y += player.dashDirection.y * 940 * dt;
    spawnParticles(player.x, player.y, "#7dedff", 6, 120, 0.18, 1.7);
  } else {
    const currentSpeed = player.speed * (player.overdriveTimer > 0 ? 1.12 : 1);
    player.x += movement.x * currentSpeed * dt;
    player.y += movement.y * currentSpeed * dt;
  }

  player.x = clamp(player.x, 40, WORLD.width - 40);
  player.y = clamp(player.y, 60, WORLD.height - 50);

  if (player.fireCooldown <= 0 && state.enemies.length) {
    firePlayerWeapons();
  }

  fireSatelliteWeapons(dt);
}

function updateEnemy(enemy, dt) {
  enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  enemy.spawnPulse = Math.max(0, enemy.spawnPulse - dt);
  enemy.dashImmune = Math.max(0, enemy.dashImmune - dt);

  const player = state.player;

  if (enemy.type === "drone") {
    const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
    enemy.vx = lerp(enemy.vx, Math.cos(angle) * enemy.speed, dt * 3.4);
    enemy.vy = lerp(enemy.vy, Math.sin(angle) * enemy.speed, dt * 3.4);
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
  }

  if (enemy.type === "striker") {
    const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
    const dist = distance(enemy.x, enemy.y, player.x, player.y);
    const tangent = angle + enemy.orbit * Math.PI / 2;
    const desired = dist > 260 ? angle : dist < 170 ? angle + Math.PI : tangent;
    enemy.x += Math.cos(desired) * enemy.speed * dt;
    enemy.y += Math.sin(desired) * enemy.speed * dt;
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0) {
      enemy.shootCooldown = rand(1.3, 1.8);
      const shotAngle = angleTo(enemy.x, enemy.y, player.x, player.y);
      [-0.1, 0, 0.1].forEach((offset) => {
        createEnemyBullet(enemy.x, enemy.y, shotAngle + offset, 260, 5, 10, "#ffc86f", 3.6);
      });
      playTone("square", 170, 0.06, 0.02);
    }
  }

  if (enemy.type === "bomber") {
    const targetX = WORLD.width / 2 + Math.sin(state.time * 0.8 + enemy.seed) * 280;
    enemy.x = lerp(enemy.x, targetX, dt * 0.55);
    enemy.y = lerp(enemy.y, enemy.anchorY, dt * 0.75);
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0) {
      enemy.shootCooldown = rand(1.9, 2.4);
      const aim = angleTo(enemy.x, enemy.y, player.x, player.y);
      [-0.24, -0.12, 0, 0.12, 0.24].forEach((offset) => {
        createEnemyBullet(enemy.x, enemy.y + 10, aim + offset, 215, 6, 13, "#ff9068", 4.2);
      });
      playTone("triangle", 130, 0.09, 0.02);
    }
  }

  if (enemy.type === "leech") {
    if (enemy.state === "aim") {
      const orbitX = player.x + Math.cos(state.time + enemy.seed) * 160;
      const orbitY = player.y - 130 + Math.sin(state.time * 1.2 + enemy.seed) * 50;
      const angle = angleTo(enemy.x, enemy.y, orbitX, orbitY);
      enemy.x += Math.cos(angle) * enemy.speed * dt;
      enemy.y += Math.sin(angle) * enemy.speed * dt;
      enemy.chargeTimer -= dt;
      if (enemy.chargeTimer <= 0) {
        enemy.state = "charge";
        enemy.chargeDuration = 0.75;
        const dashAngle = angleTo(enemy.x, enemy.y, player.x, player.y);
        enemy.vx = Math.cos(dashAngle) * 510;
        enemy.vy = Math.sin(dashAngle) * 510;
        spawnParticles(enemy.x, enemy.y, "#ffd7a8", 10, 120, 0.25, 2.4);
      }
    } else if (enemy.state === "charge") {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.chargeDuration -= dt;
      if (enemy.chargeDuration <= 0) {
        enemy.state = "aim";
        enemy.chargeTimer = rand(1.2, 2.1);
      }
    }
  }

  if (enemy.type === "warden") {
    enemy.phase += dt;
    enemy.x = WORLD.width / 2 + Math.sin(enemy.phase * 0.9) * 310;
    enemy.y = 126 + Math.sin(enemy.phase * 1.8) * 24;
    enemy.radialCooldown -= dt;
    enemy.burstCooldown -= dt;
    enemy.summonCooldown -= dt;

    if (enemy.radialCooldown <= 0) {
      enemy.radialCooldown = enemy.hp < enemy.maxHp * 0.45 ? 0.84 : 1.18;
      for (let shot = 0; shot < 14; shot += 1) {
        createEnemyBullet(enemy.x, enemy.y, (Math.PI * 2 * shot) / 14 + enemy.phase * 0.4, 220, 5.5, 12, "#ff845f", 5);
      }
    }

    if (enemy.burstCooldown <= 0) {
      enemy.burstCooldown = enemy.hp < enemy.maxHp * 0.45 ? 1.3 : 1.8;
      const aim = angleTo(enemy.x, enemy.y, player.x, player.y);
      [-0.22, -0.08, 0.08, 0.22].forEach((offset) => {
        createEnemyBullet(enemy.x, enemy.y + 18, aim + offset, 310, 6, 14, "#ffd26b", 3.5);
      });
    }

    if (enemy.summonCooldown <= 0) {
      enemy.summonCooldown = 5.3;
      spawnEnemy("drone");
      spawnEnemy("striker");
    }
  }

  if (enemy.type === "leviathan") {
    enemy.phaseIndex += dt;
    enemy.x = WORLD.width / 2 + Math.sin(enemy.phaseIndex * 0.66) * 360;
    enemy.y = 110 + Math.cos(enemy.phaseIndex * 1.22) * 18;
    enemy.patternTimer -= dt;
    enemy.shotCooldown -= dt;
    enemy.summonCooldown -= dt;

    if (!enemy.enraged && enemy.hp < enemy.maxHp * 0.5) {
      enemy.enraged = true;
      showToast("Leviathan enraged");
      playTone("sawtooth", 120, 0.2, 0.07);
    }

    const patternDuration = enemy.enraged ? 2.7 : 3.6;
    if (enemy.patternTimer <= 0) {
      enemy.patternTimer = patternDuration;
      enemy.mode = ((enemy.mode || 0) + 1) % 3;
    }

    if (enemy.mode === 0 && enemy.shotCooldown <= 0) {
      enemy.shotCooldown = enemy.enraged ? 0.2 : 0.28;
      const aim = angleTo(enemy.x, enemy.y, player.x, player.y);
      [-0.28, -0.14, 0, 0.14, 0.28].forEach((offset) => {
        createEnemyBullet(enemy.x, enemy.y + 22, aim + offset, 290, 6.5, 15, "#ff8a63", 4.5);
      });
    }

    if (enemy.mode === 1 && enemy.shotCooldown <= 0) {
      enemy.shotCooldown = enemy.enraged ? 0.09 : 0.13;
      enemy.spiralAngle += 0.42;
      createEnemyBullet(enemy.x, enemy.y, enemy.spiralAngle, 240, 5.2, 13, "#ffc46c", 5.6);
      createEnemyBullet(enemy.x, enemy.y, enemy.spiralAngle + Math.PI, 240, 5.2, 13, "#ffc46c", 5.6);
    }

    if (enemy.mode === 2) {
      if (enemy.summonCooldown <= 0) {
        enemy.summonCooldown = enemy.enraged ? 2.8 : 3.6;
        spawnEnemy(Math.random() > 0.4 ? "striker" : "bomber");
        spawnEnemy("leech");
      }
      if (enemy.shotCooldown <= 0) {
        enemy.shotCooldown = 0.46;
        const aim = angleTo(enemy.x, enemy.y, player.x, player.y);
        createEnemyBullet(enemy.x, enemy.y, aim, 360, 7, 16, "#ff5f50", 3);
      }
    }
  }
}

function updateEnemies(dt) {
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = state.enemies[index];
    updateEnemy(enemy, dt);

    if (
      enemy.x < -220 ||
      enemy.x > WORLD.width + 220 ||
      enemy.y < -220 ||
      enemy.y > WORLD.height + 220
    ) {
      if (!enemy.boss) {
        state.enemies.splice(index, 1);
      }
    }
  }
}

function updateBullets(dt) {
  for (let index = state.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = state.bullets[index];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (
      bullet.life <= 0 ||
      bullet.x < -40 ||
      bullet.x > WORLD.width + 40 ||
      bullet.y < -40 ||
      bullet.y > WORLD.height + 40
    ) {
      state.bullets.splice(index, 1);
    }
  }

  for (let index = state.enemyBullets.length - 1; index >= 0; index -= 1) {
    const bullet = state.enemyBullets[index];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (
      bullet.life <= 0 ||
      bullet.x < -60 ||
      bullet.x > WORLD.width + 60 ||
      bullet.y < -60 ||
      bullet.y > WORLD.height + 60
    ) {
      state.enemyBullets.splice(index, 1);
    }
  }
}

function updatePickups(dt) {
  const player = state.player;
  for (let index = state.pickups.length - 1; index >= 0; index -= 1) {
    const pickup = state.pickups[index];
    pickup.life -= dt;
    pickup.pulse += dt * 5;
    const dist = distance(pickup.x, pickup.y, player.x, player.y);
    if (dist < player.pickupRadius || player.overdriveTimer > 0) {
      const angle = angleTo(pickup.x, pickup.y, player.x, player.y);
      pickup.x += Math.cos(angle) * 360 * dt;
      pickup.y += Math.sin(angle) * 360 * dt;
    }

    if (dist < player.radius + pickup.radius + 4) {
      player.overdrive = clamp(player.overdrive + pickup.value * player.overdriveGain, 0, 100);
      state.score += pickup.value * 4;
      spawnParticles(pickup.x, pickup.y, "#89fff0", 8, 70, 0.24, 2.2);
      playTone("triangle", 480, 0.04, 0.02);
      state.pickups.splice(index, 1);
      continue;
    }

    if (pickup.life <= 0) {
      state.pickups.splice(index, 1);
    }
  }
}

function updateParticles(dt) {
  for (let index = state.particles.length - 1; index >= 0; index -= 1) {
    const particle = state.particles[index];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= dt;
    if (particle.life <= 0) {
      state.particles.splice(index, 1);
    }
  }

  for (let index = state.textBursts.length - 1; index >= 0; index -= 1) {
    const burst = state.textBursts[index];
    burst.life -= dt;
    burst.y -= 26 * dt;
    if (burst.life <= 0) {
      state.textBursts.splice(index, 1);
    }
  }
}

function handleCollisions() {
  const player = state.player;

  for (let bIndex = state.bullets.length - 1; bIndex >= 0; bIndex -= 1) {
    const bullet = state.bullets[bIndex];
    for (let eIndex = state.enemies.length - 1; eIndex >= 0; eIndex -= 1) {
      const enemy = state.enemies[eIndex];
      if (distance(bullet.x, bullet.y, enemy.x, enemy.y) > bullet.radius + enemy.radius) {
        continue;
      }

      const died = damageEnemy(enemy, bullet.damage);
      bullet.pierce -= 1;
      if (died || bullet.pierce < 0) {
        state.bullets.splice(bIndex, 1);
      }
      break;
    }
  }

  for (let index = state.enemyBullets.length - 1; index >= 0; index -= 1) {
    const bullet = state.enemyBullets[index];
    if (distance(bullet.x, bullet.y, player.x, player.y) <= bullet.radius + player.radius) {
      state.enemyBullets.splice(index, 1);
      damagePlayer(bullet.damage);
    }
  }

  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = state.enemies[index];
    if (distance(enemy.x, enemy.y, player.x, player.y) > enemy.radius + player.radius) {
      continue;
    }

    if (player.dashTimer > 0 && enemy.dashImmune <= 0) {
      enemy.dashImmune = 0.25;
      damageEnemy(enemy, player.dashDamage);
      continue;
    }

    damagePlayer(enemy.contactDamage);
    if (!enemy.boss) {
      damageEnemy(enemy, enemy.hp, true);
    }
  }
}

function updateCombo(dt) {
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    return;
  }
  state.combo = Math.max(1, state.combo - dt * 0.8);
}

function updateFlowParticles(dt) {
  const focus = currentFocusPoint();
  const pull = 2.8 + driftAmount() * 4.8;
  state.flowParticles.forEach((particle) => {
    particle.x += (focus.x - particle.x) * pull * dt + particle.vx * dt;
    particle.y += (focus.y - particle.y) * pull * dt + particle.vy * dt;
    particle.alpha = clamp(
      particle.alpha + Math.sin(state.time * 3.4 + particle.seed) * 0.01,
      0.18,
      0.88
    );

    if (
      distance(particle.x, particle.y, focus.x, focus.y) < 18 ||
      particle.x < -180 ||
      particle.x > WORLD.width + 180 ||
      particle.y < -180 ||
      particle.y > WORLD.height + 180
    ) {
      resetFlowParticle(particle);
    }
  });
}

function updateBackground(dt) {
  const drift = driftAmount();
  state.stars.forEach((star) => {
    star.z -= (star.speed + drift * 260 + state.score * 0.0003) * dt;
    if (star.z <= 8) {
      resetStar(star);
    }
  });
  updateFlowParticles(dt);
  state.shake = Math.max(0, state.shake - dt * 28);
  state.flash = Math.max(0, state.flash - dt * 1.4);
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) {
      hideToast();
    }
  }
}

function drawBackground() {
  ctx.fillStyle = state.time < 0.05 ? "#000000" : `rgba(0, 0, 0, ${trailFadeAlpha()})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const drift = driftAmount();
  const centerX = WORLD.width / 2;
  const centerY = WORLD.height / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let band = 0; band < 4; band += 1) {
    const alpha = 0.04 + band * 0.025;
    const amplitude = 18 + band * 16;
    const yOffset = WORLD.height * (0.24 + band * 0.12);
    ctx.strokeStyle = `rgba(0, 247, 255, ${alpha})`;
    ctx.lineWidth = 2 + band * 1.3;
    ctx.shadowBlur = 12 + band * 4;
    ctx.shadowColor = "rgba(0, 247, 255, 0.45)";
    ctx.beginPath();
    for (let step = 0; step <= 36; step += 1) {
      const x = (WORLD.width * step) / 36;
      const y =
        yOffset +
        Math.sin(step * 0.58 + state.time * (0.42 + drift) + band * 0.8) * amplitude +
        Math.cos(step * 0.24 + state.time * 0.75 + band * 1.2) * 8;
      if (step === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  for (let haze = 0; haze < 6; haze += 1) {
    const hazeY =
      WORLD.height * (0.18 + haze * 0.12) +
      Math.sin(state.time * 0.35 + haze * 1.4) * 20 * drift;
    ctx.fillStyle = `rgba(0, 247, 255, ${0.015 + haze * 0.009})`;
    ctx.fillRect(0, hazeY, WORLD.width, 12 + haze * 3);
  }

  state.stars.forEach((star) => {
    const perspective = 320 / star.z;
    const x = centerX + star.x * perspective;
    const y = centerY + star.y * perspective;

    if (x < -40 || x > WORLD.width + 40 || y < -40 || y > WORLD.height + 40) {
      resetStar(star);
      return;
    }

    const streak = Math.max(1.4, perspective * (2.2 + drift * 8));
    const dx = (x - centerX) * 0.03 * streak;
    const dy = (y - centerY) * 0.03 * streak;
    ctx.globalAlpha = star.alpha;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = Math.max(1, star.size * perspective * 0.8);
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  });

  state.flowParticles.forEach((particle) => {
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0, 247, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
    ctx.fill();
  });

  ctx.restore();
}

function drawPlayer() {
  const player = state.player;
  const alpha = player.invulnerable > 0 ? 0.55 + Math.sin(state.time * 30) * 0.18 : 1;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.aimAngle + Math.PI / 2);
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = player.overdriveTimer > 0 ? 28 : 18;
  ctx.shadowColor = player.overdriveTimer > 0 ? "#d9ffff" : "#62deff";
  ctx.strokeStyle = player.overdriveTimer > 0 ? "#f1ffff" : "#7dedff";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(16, 18);
  ctx.lineTo(0, 10);
  ctx.lineTo(-16, 18);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 14);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 247, 255, 0.92)";
  ctx.beginPath();
  ctx.moveTo(-7, 14);
  ctx.lineTo(0, 28 + Math.sin(state.time * 30) * 4);
  ctx.lineTo(7, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (!player.satellites) {
    return;
  }

  for (let index = 0; index < player.satellites; index += 1) {
    const angle = state.time * 1.8 + (Math.PI * 2 * index) / player.satellites;
    const sx = player.x + Math.cos(angle) * 34;
    const sy = player.y + Math.sin(angle) * 22;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#9fffe4";
    ctx.strokeStyle = "#b8fff0";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(6, 7);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flashMix = enemy.hitFlash > 0 ? 255 : 0;
  const scale = 1 + enemy.spawnPulse * 0.2;
  ctx.scale(scale, scale);
  ctx.shadowBlur = enemy.boss ? 28 : 18;
  ctx.shadowColor = enemy.color;
  ctx.strokeStyle = flashMix ? "#ffffff" : enemy.color;
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = enemy.boss ? 3 : 2;

  if (enemy.type === "drone") {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.stroke();
  } else if (enemy.type === "striker") {
    ctx.rotate(Math.sin(state.time * 2 + enemy.seed) * 0.2);
    ctx.strokeRect(-16, -16, 32, 32);
    ctx.strokeRect(-6, -6, 12, 12);
  } else if (enemy.type === "bomber") {
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(26, -4);
    ctx.lineTo(16, 22);
    ctx.lineTo(-16, 22);
    ctx.lineTo(-26, -4);
    ctx.closePath();
    ctx.stroke();
  } else if (enemy.type === "leech") {
    ctx.rotate(Math.sin(state.time * 7 + enemy.seed) * 0.25);
    ctx.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = (Math.PI * 2 * point) / 6;
      const radius = point % 2 === 0 ? 18 : 8;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (point === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
  } else if (enemy.type === "warden") {
    ctx.strokeRect(-58, -40, 116, 80);
    ctx.strokeRect(-18, -12, 36, 24);
  } else if (enemy.type === "leviathan") {
    ctx.beginPath();
    ctx.moveTo(0, -84);
    ctx.lineTo(74, -18);
    ctx.lineTo(60, 68);
    ctx.lineTo(0, 40);
    ctx.lineTo(-60, 68);
    ctx.lineTo(-74, -18);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeRect(-20, -10, 40, 24);
  }

  ctx.restore();
}

function drawBullets() {
  ctx.save();
  state.bullets.forEach((bullet) => {
    ctx.shadowBlur = 14;
    ctx.shadowColor = bullet.color;
    ctx.strokeStyle = bullet.color;
    ctx.lineWidth = Math.max(1.4, bullet.radius * 0.75);
    ctx.beginPath();
    ctx.moveTo(bullet.x - bullet.vx * 0.014, bullet.y - bullet.vy * 0.014);
    ctx.lineTo(bullet.x + bullet.vx * 0.004, bullet.y + bullet.vy * 0.004);
    ctx.stroke();
  });
  state.enemyBullets.forEach((bullet) => {
    ctx.shadowBlur = 12;
    ctx.shadowColor = bullet.color;
    ctx.strokeStyle = bullet.color;
    ctx.lineWidth = Math.max(1.2, bullet.radius * 0.72);
    ctx.beginPath();
    ctx.moveTo(bullet.x - bullet.vx * 0.012, bullet.y - bullet.vy * 0.012);
    ctx.lineTo(bullet.x + bullet.vx * 0.004, bullet.y + bullet.vy * 0.004);
    ctx.stroke();
  });
  ctx.restore();
}

function drawPickups() {
  ctx.save();
  state.pickups.forEach((pickup) => {
    const scale = 1 + Math.sin(pickup.pulse) * 0.18;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#9bf7ff";
    ctx.fillStyle = "#d9ffff";
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.radius * scale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  state.particles.forEach((particle) => {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.restore();

  ctx.save();
  state.textBursts.forEach((burst) => {
    ctx.globalAlpha = burst.life / burst.maxLife;
    ctx.fillStyle = burst.color;
    ctx.font = "700 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(burst.text, burst.x, burst.y);
  });
  ctx.restore();
}

function drawForeground() {
  const focus = currentFocusPoint();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  const inset = 22;
  const corner = 24;
  ctx.beginPath();
  ctx.moveTo(inset, inset + corner);
  ctx.lineTo(inset, inset);
  ctx.lineTo(inset + corner, inset);
  ctx.moveTo(WORLD.width - inset - corner, inset);
  ctx.lineTo(WORLD.width - inset, inset);
  ctx.lineTo(WORLD.width - inset, inset + corner);
  ctx.moveTo(inset, WORLD.height - inset - corner);
  ctx.lineTo(inset, WORLD.height - inset);
  ctx.lineTo(inset + corner, WORLD.height - inset);
  ctx.moveTo(WORLD.width - inset - corner, WORLD.height - inset);
  ctx.lineTo(WORLD.width - inset, WORLD.height - inset);
  ctx.lineTo(WORLD.width - inset, WORLD.height - inset - corner);
  ctx.stroke();
  ctx.restore();

  if (input.touch.active || input.pointer.inside) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 247, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = "rgba(0, 247, 255, 0.45)";
    ctx.beginPath();
    ctx.arc(focus.x, focus.y, 18 + Math.sin(state.time * 10) * 2, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(focus.x - 12, focus.y);
    ctx.lineTo(focus.x + 12, focus.y);
    ctx.moveTo(focus.x, focus.y - 12);
    ctx.lineTo(focus.x, focus.y + 12);
    ctx.stroke();

    if (state.phase === "playing") {
      const player = state.player;
      ctx.globalAlpha = 0.24;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(focus.x, focus.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = state.flash;
    ctx.fillStyle = "#d8ffff";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.restore();
  }
}

function updateHud(force = false) {
  const player = state.player;
  ui.hullValue.textContent = `${Math.ceil(player.hull)} / ${player.hullMax}`;
  ui.hullBar.style.width = `${(player.hull / player.hullMax) * 100}%`;
  ui.chargeValue.textContent = `${Math.round(player.overdrive)}%`;
  ui.chargeBar.style.width = `${player.overdrive}%`;
  ui.comboValue.textContent = `x${state.combo.toFixed(1)}`;
  ui.comboBar.style.width = `${clamp((state.combo / 6) * 100, 0, 100)}%`;
  ui.scoreValue.textContent = formatScore(state.score);
  ui.waveValue.textContent = state.currentWave
    ? `${state.waveIndex + 1}/${WAVE_DEFS.length} | ${state.currentWave.title}`
    : "Standby";
  ui.enemiesValue.textContent = String(state.spawnQueue.length + state.enemies.length);
  ui.statusValue.textContent = state.statusText;
  ui.bestScoreTitle.textContent = formatScore(state.bestScore);
  ui.bestScoreSide.textContent = formatScore(state.bestScore);

  const boss = state.enemies.find((enemy) => enemy.boss);
  if (boss) {
    ui.bossBarWrap.classList.remove("hidden");
    ui.bossName.textContent = boss.title;
    ui.bossBar.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    ui.bossHpText.textContent = `${Math.max(0, Math.round((boss.hp / boss.maxHp) * 100))}%`;
  } else {
    ui.bossBarWrap.classList.add("hidden");
  }

  if (force) {
    updateUpgradeList();
  }
}

function update(dt) {
  state.time += dt;
  updateBackground(dt);

  if (state.phase === "playing") {
    updateWave(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateParticles(dt);
    handleCollisions();
    updateCombo(dt);
  } else {
    updateParticles(dt);
  }

  updateHud();
}

function draw() {
  const shakeX = rand(-state.shake, state.shake);
  const shakeY = rand(-state.shake, state.shake);
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawPickups();
  drawBullets();
  state.enemies.forEach(drawEnemy);
  drawParticles();
  drawPlayer();
  drawForeground();
  ctx.restore();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.033);
  lastFrame = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

updateFullscreenUi();
updateHud(true);
unregisterLegacyServiceWorkers();
requestAnimationFrame(loop);
