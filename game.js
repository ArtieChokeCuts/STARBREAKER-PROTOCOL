(function () {
  "use strict";

  const THREE = window.THREE;
  const canvas = document.getElementById("game");
  const shell = document.querySelector(".cockpit-shell");

  const ui = {
    wave: document.getElementById("waveValue"),
    status: document.getElementById("statusValue"),
    bestTitle: document.getElementById("bestScoreTitle"),
    score: document.getElementById("scoreValue"),
    hull: document.getElementById("hullValue"),
    hullBar: document.getElementById("hullBar"),
    charge: document.getElementById("chargeValue"),
    chargeBar: document.getElementById("chargeBar"),
    combo: document.getElementById("comboValue"),
    comboBar: document.getElementById("comboBar"),
    enemies: document.getElementById("enemiesValue"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    dashButton: document.getElementById("dashButton"),
    empButton: document.getElementById("overdriveButton"),
    bossWrap: document.getElementById("bossBarWrap"),
    bossName: document.getElementById("bossName"),
    bossHpText: document.getElementById("bossHpText"),
    bossBar: document.getElementById("bossBar"),
    intro: document.getElementById("introOverlay"),
    startButton: document.getElementById("startButton"),
    upgrades: document.getElementById("upgradeOverlay"),
    upgradePrompt: document.getElementById("upgradePrompt"),
    upgradeGrid: document.getElementById("upgradeGrid"),
    paused: document.getElementById("pausedOverlay"),
    resumeButton: document.getElementById("resumeButton"),
    gameOver: document.getElementById("gameOverOverlay"),
    gameOverEyebrow: document.getElementById("gameOverEyebrow"),
    gameOverTitle: document.getElementById("gameOverTitle"),
    finalScore: document.getElementById("finalScore"),
    bestScore: document.getElementById("bestScore"),
    wavesCleared: document.getElementById("wavesCleared"),
    gameOverMessage: document.getElementById("gameOverMessage"),
    replayButton: document.getElementById("replayButton"),
    toast: document.getElementById("toast")
  };

  if (!THREE || !canvas) {
    if (ui.status) ui.status.textContent = "3D ENGINE OFFLINE";
    if (ui.toast) {
      ui.toast.dataset.message = "Three.js did not load. Try the GitHub Pages link or refresh.";
      ui.toast.classList.remove("hidden");
    }
    return;
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min, max) => min + Math.random() * (max - min);
  const formatNumber = (value) => Math.floor(value).toLocaleString("en-US");

  const world = {
    farZ: -860,
    aimZ: -150,
    muzzleZ: 34,
    nearZ: 48
  };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setClearColor(0x020204, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020204);
  scene.fog = new THREE.FogExp2(0x020204, 0.0032);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 1300);
  camera.position.set(0, 0, 48);

  const textures = createTextures();
  const spriteAnimations = {};
  const additiveTextures = new Set(["bullet", "enemyShot", "particle", "reticle", "muzzle"]);
  const environment = createEnvironment();
  const cockpit = createCockpit();
  loadCinematicAtlas();

  const ENEMIES = {
    drone: {
      label: "Shard Drone",
      texture: "drone",
      tint: 0x77dfff,
      hp: 28,
      speed: 72,
      radius: 6.2,
      depth: 15,
      scale: [15, 15],
      score: 70,
      drift: 5,
      wobble: 2.3,
      fireEvery: 0,
      shotSpeed: 0,
      damage: 10
    },
    striker: {
      label: "Needle Striker",
      texture: "striker",
      tint: 0xffd47a,
      hp: 46,
      speed: 86,
      radius: 7.4,
      depth: 16,
      scale: [19, 13],
      score: 110,
      drift: 8,
      wobble: 2.8,
      fireEvery: 2.25,
      shotSpeed: 122,
      damage: 12
    },
    bomber: {
      label: "Grav Bomber",
      texture: "bomber",
      tint: 0xff728d,
      hp: 105,
      speed: 46,
      radius: 11.5,
      depth: 20,
      scale: [24, 18],
      score: 220,
      drift: 4,
      wobble: 1.1,
      fireEvery: 1.65,
      shotSpeed: 98,
      damage: 18
    },
    leech: {
      label: "Phase Leech",
      texture: "leech",
      tint: 0x86ffd7,
      hp: 62,
      speed: 62,
      radius: 8.2,
      depth: 16,
      scale: [16, 16],
      score: 150,
      drift: 12,
      wobble: 3.4,
      fireEvery: 2.8,
      shotSpeed: 112,
      damage: 14
    },
    warden: {
      label: "Aegis Warden",
      texture: "warden",
      tint: 0x7bbdff,
      hp: 920,
      speed: 82,
      radius: 30,
      depth: 34,
      scale: [72, 38],
      score: 1800,
      drift: 18,
      wobble: 0.55,
      fireEvery: 1.15,
      shotSpeed: 118,
      damage: 15,
      holdZ: -330,
      boss: true
    },
    leviathan: {
      label: "Dread Sun",
      texture: "leviathan",
      tint: 0xff9c72,
      hp: 1600,
      speed: 76,
      radius: 36,
      depth: 40,
      scale: [92, 44],
      score: 3600,
      drift: 22,
      wobble: 0.45,
      fireEvery: 0.82,
      shotSpeed: 126,
      damage: 18,
      holdZ: -355,
      boss: true
    }
  };

  const WAVES = [
    { name: "WAVE 01 // BLUE WAKE", counts: { drone: 14, striker: 4 }, delay: 0.5 },
    { name: "WAVE 02 // NEEDLE STORM", counts: { drone: 10, striker: 9, leech: 3 }, delay: 0.43 },
    { name: "WAVE 03 // GRAV FLOCK", counts: { drone: 10, bomber: 5, striker: 6 }, delay: 0.48 },
    { name: "BOSS // AEGIS WARDEN", boss: "warden", counts: { drone: 8, leech: 5 }, delay: 0.72 },
    { name: "WAVE 05 // REDSHIFT", counts: { striker: 10, bomber: 7, leech: 7 }, delay: 0.4 },
    { name: "FINAL // DREAD SUN", boss: "leviathan", counts: { drone: 8, striker: 8, bomber: 4, leech: 6 }, delay: 0.5 }
  ];

  const UPGRADES = [
    {
      title: "Twin Vector",
      copy: "Adds side cannons and tightens the cockpit firing cone.",
      apply() {
        state.spread = Math.min(2, state.spread + 1);
        state.damage *= 1.08;
      }
    },
    {
      title: "Rail Sync",
      copy: "Boosts projectile speed and cuts the next shot delay.",
      apply() {
        state.fireInterval = Math.max(0.075, state.fireInterval * 0.82);
        state.bulletSpeed += 95;
      }
    },
    {
      title: "Hull Lattice",
      copy: "Raises max hull and welds the cockpit back together.",
      apply() {
        state.maxHull += 24;
        state.hull = Math.min(state.maxHull, state.hull + 44);
      }
    },
    {
      title: "Slip Drive",
      copy: "Shorter dash cooldown with a wider projectile scrub.",
      apply() {
        state.dashMax = Math.max(1.35, state.dashMax - 0.55);
        state.dashRadius += 4;
      }
    },
    {
      title: "EMP Core",
      copy: "EMP charges faster and punches harder through boss armor.",
      apply() {
        state.empGain *= 1.22;
        state.empDamage += 42;
      }
    },
    {
      title: "Wing Drone",
      copy: "A support sprite mirrors your shots from the cockpit edge.",
      apply() {
        state.drones = Math.min(2, state.drones + 1);
      }
    }
  ];

  const state = {
    mode: "intro",
    running: false,
    paused: false,
    choosing: false,
    gameOver: false,
    score: 0,
    best: readBest(),
    waveIndex: -1,
    wavesCleared: 0,
    spawnQueue: [],
    spawnTimer: 0,
    spawnDelay: 0.5,
    enemies: [],
    bullets: [],
    enemyShots: [],
    particles: [],
    keys: new Set(),
    pointerActive: false,
    pointerDown: false,
    aim: { x: 0, y: 0 },
    targetAim: { x: 0, y: 0 },
    hull: 100,
    maxHull: 100,
    emp: 0,
    empGain: 1,
    empDamage: 112,
    combo: 1,
    comboTimer: 0,
    fireTimer: 0,
    fireInterval: 0.16,
    bulletSpeed: 690,
    damage: 1,
    spread: 0,
    drones: 0,
    dashCooldown: 0,
    dashMax: 2.9,
    dashRadius: 16,
    dashTime: 0,
    invulnerable: 0,
    shake: 0,
    time: 0,
    toastTimer: 0
  };

  let audioContext = null;
  let lastFrame = performance.now();
  let entityId = 1;

  resize();
  updateHud();
  bindEvents();
  requestAnimationFrame(loop);

  function createTextures() {
    const makers = {
      bullet: (ctx, size) => {
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.22, "rgba(113,255,206,0.95)");
        gradient.addColorStop(1, "rgba(79,195,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        roundedRect(ctx, 54, 16, 20, 96, 10, true, false);
      },
      enemyShot: (ctx, size) => {
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 5, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.2, "rgba(255,207,106,0.96)");
        gradient.addColorStop(0.72, "rgba(255,95,126,0.42)");
        gradient.addColorStop(1, "rgba(255,95,126,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      },
      particle: (ctx, size) => {
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, "rgba(255,255,255,0.98)");
        gradient.addColorStop(0.34, "rgba(113,255,206,0.78)");
        gradient.addColorStop(1, "rgba(79,195,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      },
      reticle: (ctx, size) => {
        ctx.translate(size / 2, size / 2);
        ctx.strokeStyle = "rgba(113,255,206,0.95)";
        ctx.lineWidth = 4;
        ctx.shadowColor = "rgba(113,255,206,0.9)";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 4; i += 1) {
          ctx.rotate(Math.PI / 2);
          ctx.moveTo(0, -48);
          ctx.lineTo(0, -34);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.fill();
      },
      muzzle: (ctx, size) => {
        const gradient = ctx.createRadialGradient(size / 2, size * 0.65, 5, size / 2, size * 0.65, size * 0.55);
        gradient.addColorStop(0, "rgba(255,255,255,0.88)");
        gradient.addColorStop(0.25, "rgba(79,195,255,0.48)");
        gradient.addColorStop(1, "rgba(79,195,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = "rgba(246,251,255,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(18, 92);
        ctx.lineTo(50, 66);
        ctx.lineTo(78, 66);
        ctx.lineTo(110, 92);
        ctx.stroke();
      },
      drone: (ctx, size) => shipSprite(ctx, size, "#77dfff", [
        [64, 14], [94, 64], [64, 114], [34, 64]
      ], true),
      striker: (ctx, size) => {
        shipSprite(ctx, size, "#ffcf6a", [[20, 78], [64, 12], [108, 78], [78, 70], [64, 114], [50, 70]], true);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(64, 18);
        ctx.lineTo(64, 104);
        ctx.stroke();
      },
      bomber: (ctx, size) => shipSprite(ctx, size, "#ff728d", [
        [24, 42], [52, 16], [92, 22], [112, 64], [90, 104], [42, 106], [16, 66]
      ], true),
      leech: (ctx, size) => {
        ctx.translate(size / 2, size / 2);
        ctx.shadowColor = "rgba(113,255,206,0.9)";
        ctx.shadowBlur = 20;
        ctx.strokeStyle = "rgba(113,255,206,0.96)";
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 34, -1.2, 1.2);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.moveTo(-16, -18);
        ctx.lineTo(34, 0);
        ctx.lineTo(-16, 18);
        ctx.stroke();
      },
      warden: (ctx, size) => {
        shipSprite(ctx, size, "#7bbdff", [
          [8, 74], [32, 34], [64, 20], [96, 34], [120, 74], [88, 96], [64, 86], [40, 96]
        ], true);
        ctx.strokeStyle = "rgba(255,255,255,0.62)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(22, 72);
        ctx.lineTo(106, 72);
        ctx.stroke();
      },
      leviathan: (ctx, size) => {
        shipSprite(ctx, size, "#ff9c72", [
          [4, 70], [22, 38], [52, 20], [76, 20], [106, 38], [124, 70], [98, 94], [64, 108], [30, 94]
        ], true);
        ctx.fillStyle = "rgba(255,207,106,0.82)";
        ctx.shadowColor = "rgba(255,207,106,0.9)";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(64, 64, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    return Object.fromEntries(Object.entries(makers).map(([name, draw]) => {
      const size = 128;
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = size;
      textureCanvas.height = size;
      const ctx = textureCanvas.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      draw(ctx, size);
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.needsUpdate = true;
      if ("colorSpace" in texture && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
      return [name, texture];
    }));
  }

  function loadCinematicAtlas() {
    const image = new Image();
    image.onload = () => {
      const frames = {
        wingDrone: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]],
        drone: [[0, 2], [1, 2]],
        striker: [[2, 2], [3, 2]],
        bomber: [[4, 2], [5, 2]],
        leech: [[6, 2], [7, 2]],
        warden: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3]],
        leviathan: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4]],
        bullet: [[0, 5]],
        enemyShot: [[1, 5]]
      };

      Object.entries(frames).forEach(([name, cells]) => {
        spriteAnimations[name] = cells.map(([col, row]) => createAtlasTexture(image, col, row));
        textures[name] = spriteAnimations[name][0];
      });

      cockpit.droneLeft.material.map = textures.wingDrone;
      cockpit.droneRight.material.map = textures.wingDrone;
      cockpit.droneLeft.material.needsUpdate = true;
      cockpit.droneRight.material.needsUpdate = true;
    };
    image.src = "assets/sprites/starbreaker-cinematic-atlas.svg";
  }

  function createAtlasTexture(image, col, row) {
    const frame = 128;
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = frame;
    textureCanvas.height = frame;
    const ctx = textureCanvas.getContext("2d");
    ctx.clearRect(0, 0, frame, frame);
    ctx.drawImage(image, col * frame, row * frame, frame, frame, 0, 0, frame, frame);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if ("colorSpace" in texture && THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    return texture;
  }

  function applyTextureSequence(sprite, name, age, fps = 6) {
    const sequence = spriteAnimations[name];
    if (!sequence?.length) return;
    const texture = sequence[Math.floor(age * fps) % sequence.length];
    if (sprite.material.map !== texture) {
      sprite.material.map = texture;
      sprite.material.needsUpdate = true;
    }
  }

  function shipSprite(ctx, size, color, points, withCore) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = colorToAlpha(color, 0.52);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (withCore) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function colorToAlpha(hex, alpha) {
    const bigint = Number.parseInt(hex.replace("#", ""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function createEnvironment() {
    const streakCount = 540;
    const streakPositions = new Float32Array(streakCount * 6);
    const streaks = [];
    for (let i = 0; i < streakCount; i += 1) {
      streaks.push(makeStreak());
    }

    const streakGeometry = new THREE.BufferGeometry();
    streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPositions, 3));
    const streakMaterial = new THREE.LineBasicMaterial({
      color: 0x82d8ff,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const streakLines = new THREE.LineSegments(streakGeometry, streakMaterial);
    scene.add(streakLines);

    const ringPoints = [];
    const ringSegments = 96;
    for (let i = 0; i <= ringSegments; i += 1) {
      const a = (i / ringSegments) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const rings = Array.from({ length: 18 }, (_, index) => {
      const material = new THREE.LineBasicMaterial({
        color: index % 2 ? 0x71ffce : 0x4fc3ff,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.LineLoop(ringGeometry, material);
      ring.position.z = world.farZ + index * 48;
      ring.scale.setScalar(42 + index * 0.25);
      scene.add(ring);
      return ring;
    });

    return { streaks, streakPositions, streakGeometry, rings };
  }

  function makeStreak() {
    const spread = rand(26, 118);
    const angle = rand(0, Math.PI * 2);
    return {
      x: Math.cos(angle) * spread,
      y: Math.sin(angle) * spread * 0.62,
      z: rand(world.farZ, 30),
      length: rand(12, 54),
      speed: rand(0.76, 1.45)
    };
  }

  function createCockpit() {
    const reticle = makeSprite("reticle", 10, 10, { depthTest: false, renderOrder: 10 });
    const muzzle = makeSprite("muzzle", 36, 22, { depthTest: false, renderOrder: 9 });
    const droneLeft = makeSprite("reticle", 4.2, 4.2, { depthTest: false, opacity: 0 });
    const droneRight = makeSprite("reticle", 4.2, 4.2, { depthTest: false, opacity: 0 });
    muzzle.position.set(0, -25, world.muzzleZ);
    droneLeft.position.set(-14, -20, 24);
    droneRight.position.set(14, -20, 24);
    return { reticle, muzzle, droneLeft, droneRight };
  }

  function makeSprite(textureName, width, height, options = {}) {
    const material = new THREE.SpriteMaterial({
      map: textures[textureName],
      color: options.color || 0xffffff,
      transparent: true,
      opacity: options.opacity ?? 1,
      blending: options.blending || (additiveTextures.has(textureName) ? THREE.AdditiveBlending : THREE.NormalBlending),
      depthTest: options.depthTest ?? true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, height, 1);
    if (options.renderOrder) sprite.renderOrder = options.renderOrder;
    scene.add(sprite);
    return sprite;
  }

  function bindEvents() {
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", updateFullscreenLabel);

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      state.pointerActive = true;
      state.pointerDown = true;
      setAimFromPointer(event);
      unlockAudio();
      if (state.mode === "intro") startRun();
    });

    canvas.addEventListener("pointermove", (event) => {
      state.pointerActive = true;
      setAimFromPointer(event);
    });

    canvas.addEventListener("pointerup", (event) => {
      canvas.releasePointerCapture?.(event.pointerId);
      state.pointerDown = false;
    });

    canvas.addEventListener("pointercancel", () => {
      state.pointerDown = false;
    });

    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
      }
      state.keys.add(event.code);
      if (event.code === "Space") triggerEmp();
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") dash();
      if (event.code === "KeyP" || event.code === "Escape") togglePause();
      if ((event.code === "Enter" || event.code === "KeyJ") && state.mode === "intro") startRun();
    });

    window.addEventListener("keyup", (event) => {
      state.keys.delete(event.code);
    });

    ui.startButton?.addEventListener("click", startRun);
    ui.replayButton?.addEventListener("click", startRun);
    ui.resumeButton?.addEventListener("click", () => setPaused(false));
    ui.dashButton?.addEventListener("click", dash);
    ui.empButton?.addEventListener("click", triggerEmp);
    ui.fullscreenButton?.addEventListener("click", toggleFullscreen);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || window.innerWidth);
    const height = Math.max(1, rect.height || window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function loop(now) {
    const dt = Math.min(0.034, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;

    updateEnvironment(dt);
    if (state.running && !state.paused && !state.choosing && !state.gameOver) {
      updateGame(dt);
    } else {
      updateIdleCockpit(dt);
    }

    updateToast(dt);
    updateHud();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function updateEnvironment(dt) {
    const warp = state.running && !state.paused ? 720 : 360;
    for (let i = 0; i < environment.streaks.length; i += 1) {
      const streak = environment.streaks[i];
      streak.z += warp * streak.speed * dt;
      if (streak.z > 48) {
        Object.assign(streak, makeStreak(), { z: world.farZ });
      }
      const offset = i * 6;
      const pull = 1 + (streak.z - world.farZ) / 1000;
      environment.streakPositions[offset] = streak.x * pull;
      environment.streakPositions[offset + 1] = streak.y * pull;
      environment.streakPositions[offset + 2] = streak.z;
      environment.streakPositions[offset + 3] = streak.x * (pull + 0.04);
      environment.streakPositions[offset + 4] = streak.y * (pull + 0.04);
      environment.streakPositions[offset + 5] = streak.z - streak.length;
    }
    environment.streakGeometry.attributes.position.needsUpdate = true;

    environment.rings.forEach((ring, index) => {
      ring.position.z += warp * 0.34 * dt;
      if (ring.position.z > 44) ring.position.z = world.farZ;
      ring.rotation.z += (index % 2 ? -0.06 : 0.05) * dt;
    });
  }

  function updateIdleCockpit(dt) {
    state.time += dt;
    state.targetAim.x = Math.sin(state.time * 0.75) * 11;
    state.targetAim.y = Math.cos(state.time * 1.05) * 5.2;
    updateAim(dt);
    updateCockpitSprites(dt);
  }

  function updateGame(dt) {
    state.time += dt;
    state.fireTimer -= dt;
    state.spawnTimer -= dt;
    state.comboTimer -= dt;
    state.dashCooldown -= dt;
    state.dashTime = Math.max(0, state.dashTime - dt);
    state.invulnerable = Math.max(0, state.invulnerable - dt);
    state.shake = Math.max(0, state.shake - dt * 2.5);

    handleKeyboardAim(dt);
    updateAim(dt);
    updateSpawning();
    updateEnemies(dt);
    updateBullets(dt);
    updateEnemyShots(dt);
    updateParticles(dt);
    updateCockpitSprites(dt);

    if ((state.pointerDown || state.keys.has("KeyJ") || state.keys.has("Enter")) && state.fireTimer <= 0) {
      firePlayerWeapons();
    }

    if (state.comboTimer <= 0) {
      state.combo = lerp(state.combo, 1, Math.min(1, dt * 3));
      if (Math.abs(state.combo - 1) < 0.02) state.combo = 1;
    }

    checkWaveComplete();
  }

  function handleKeyboardAim(dt) {
    const speed = state.dashTime > 0 ? 58 : 34;
    const moveX = (state.keys.has("ArrowRight") || state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("ArrowLeft") || state.keys.has("KeyA") ? 1 : 0);
    const moveY = (state.keys.has("ArrowUp") || state.keys.has("KeyW") ? 1 : 0) - (state.keys.has("ArrowDown") || state.keys.has("KeyS") ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) state.pointerActive = false;
    state.targetAim.x = clamp(state.targetAim.x + moveX * speed * dt, -aimRangeX(), aimRangeX());
    state.targetAim.y = clamp(state.targetAim.y + moveY * speed * dt, -aimRangeY(), aimRangeY());
  }

  function updateAim(dt) {
    const t = Math.min(1, state.pointerActive ? dt * 16 : dt * 5.5);
    state.aim.x = lerp(state.aim.x, state.targetAim.x, t);
    state.aim.y = lerp(state.aim.y, state.targetAim.y, t);
  }

  function updateCockpitSprites(dt) {
    const shakeX = state.shake ? rand(-state.shake, state.shake) * 1.2 : 0;
    const shakeY = state.shake ? rand(-state.shake, state.shake) * 0.8 : 0;
    cockpit.reticle.position.set(state.aim.x + shakeX, state.aim.y + shakeY, world.aimZ);
    cockpit.reticle.material.rotation += dt * (state.pointerDown ? 1.8 : 0.55);

    const muzzlePulse = state.pointerDown && state.running ? 1.08 + Math.sin(state.time * 28) * 0.08 : 0.92;
    cockpit.muzzle.scale.set(36 * muzzlePulse, 22 * muzzlePulse, 1);

    const droneOpacity = state.drones > 0 ? 0.5 : 0;
    cockpit.droneLeft.material.opacity = droneOpacity;
    cockpit.droneRight.material.opacity = state.drones > 1 ? 0.5 : 0;
    cockpit.droneLeft.material.rotation += dt * 1.3;
    cockpit.droneRight.material.rotation -= dt * 1.3;
    applyTextureSequence(cockpit.droneLeft, "wingDrone", state.time, 8);
    applyTextureSequence(cockpit.droneRight, "wingDrone", state.time + 0.25, 8);
  }

  function setAimFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
    state.targetAim.x = clamp(nx * aimRangeX(), -aimRangeX(), aimRangeX());
    state.targetAim.y = clamp(ny * aimRangeY(), -aimRangeY(), aimRangeY());
  }

  function aimRangeX() {
    return camera.aspect < 0.75 ? 34 : camera.aspect > 1.55 ? 58 : 48;
  }

  function aimRangeY() {
    return camera.aspect < 0.75 ? 38 : 31;
  }

  function startRun() {
    unlockAudio();
    clearRunObjects();
    state.mode = "playing";
    state.running = true;
    state.paused = false;
    state.choosing = false;
    state.gameOver = false;
    state.score = 0;
    state.waveIndex = -1;
    state.wavesCleared = 0;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.hull = 100;
    state.maxHull = 100;
    state.emp = 0;
    state.empGain = 1;
    state.empDamage = 112;
    state.combo = 1;
    state.comboTimer = 0;
    state.fireTimer = 0;
    state.fireInterval = 0.16;
    state.bulletSpeed = 690;
    state.damage = 1;
    state.spread = 0;
    state.drones = 0;
    state.dashCooldown = 0;
    state.dashMax = 2.9;
    state.dashRadius = 16;
    state.dashTime = 0;
    state.invulnerable = 0;
    state.shake = 0;
    state.aim.x = 0;
    state.aim.y = 0;
    state.targetAim.x = 0;
    state.targetAim.y = 0;

    hide(ui.intro);
    hide(ui.gameOver);
    hide(ui.upgrades);
    hide(ui.paused);
    hide(ui.bossWrap);
    showToast("Launch vector locked. Click or touch to fire.");
    beginWave(0);
    playTone(180, 0.09, "sawtooth", 0.05);
    playTone(360, 0.12, "triangle", 0.04, 0.04);
  }

  function beginWave(index) {
    state.waveIndex = index;
    const wave = WAVES[index];
    state.spawnQueue = buildSpawnQueue(wave.counts || {});
    state.spawnDelay = wave.delay;
    state.spawnTimer = wave.boss ? 0.5 : 0.35;
    if (wave.boss) {
      spawnEnemy(wave.boss, true);
      showToast(`${wave.name} inbound`);
    } else {
      showToast(wave.name);
    }
  }

  function buildSpawnQueue(counts) {
    const queue = [];
    Object.entries(counts).forEach(([type, count]) => {
      for (let i = 0; i < count; i += 1) queue.push(type);
    });
    return shuffle(queue);
  }

  function updateSpawning() {
    if (state.spawnTimer > 0 || state.spawnQueue.length === 0) return;
    spawnEnemy(state.spawnQueue.shift(), false);
    state.spawnTimer = Math.max(0.16, state.spawnDelay * rand(0.74, 1.24));
  }

  function spawnEnemy(type, forcedBoss) {
    const spec = ENEMIES[type];
    const waveScale = 1 + Math.max(0, state.waveIndex) * 0.08;
    const boss = forcedBoss || Boolean(spec.boss);
    const hp = Math.round(spec.hp * (boss ? 1 + state.waveIndex * 0.04 : waveScale));
    const xLimit = boss ? 4 : aimRangeX() * 1.08;
    const yLimit = boss ? 3 : aimRangeY() * 0.9;
    const sprite = makeSprite(spec.texture, spec.scale[0], spec.scale[1]);
    const enemy = {
      id: entityId += 1,
      type,
      label: spec.label,
      sprite,
      hp,
      maxHp: hp,
      boss,
      x: rand(-xLimit, xLimit),
      y: rand(-yLimit, yLimit),
      z: boss ? world.farZ - rand(0, 80) : rand(-560, -390),
      baseX: rand(-xLimit, xLimit),
      baseY: rand(-yLimit, yLimit),
      phase: rand(0, Math.PI * 2),
      age: 0,
      fireTimer: rand(0.7, 1.7),
      radius: spec.radius,
      depth: spec.depth,
      score: spec.score,
      hitFlash: 0
    };
    enemy.sprite.position.set(enemy.x, enemy.y, enemy.z);
    state.enemies.push(enemy);
    return enemy;
  }

  function updateEnemies(dt) {
    const enemies = [...state.enemies];
    enemies.forEach((enemy) => {
      const spec = ENEMIES[enemy.type];
      enemy.age += dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 8);
      applyTextureSequence(enemy.sprite, enemy.type, enemy.age + enemy.phase * 0.05, enemy.boss ? 7 : 4);

      if (spec.holdZ && enemy.z < spec.holdZ) {
        enemy.z += spec.speed * dt;
      } else if (spec.holdZ) {
        enemy.z = spec.holdZ + Math.sin(enemy.age * 0.8) * 7;
      } else {
        enemy.z += spec.speed * dt;
      }

      if (enemy.boss) {
        enemy.x = Math.sin(enemy.age * spec.wobble + enemy.phase) * spec.drift;
        enemy.y = Math.cos(enemy.age * spec.wobble * 0.8 + enemy.phase) * spec.drift * 0.28;
      } else {
        enemy.x = enemy.baseX + Math.sin(enemy.age * spec.wobble + enemy.phase) * spec.drift;
        enemy.y = enemy.baseY + Math.cos(enemy.age * spec.wobble * 0.72 + enemy.phase) * spec.drift * 0.42;
      }

      enemy.sprite.position.set(enemy.x, enemy.y, enemy.z);
      enemy.sprite.material.rotation = Math.sin(enemy.age * 1.7 + enemy.phase) * 0.12;
      enemy.sprite.material.opacity = enemy.hitFlash > 0 ? 0.62 : 1;

      if (spec.fireEvery > 0 && enemy.z > world.farZ * 0.72) {
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0) {
          fireEnemyShot(enemy);
          enemy.fireTimer = spec.fireEvery * rand(0.75, 1.25);
          if (enemy.boss && Math.random() > 0.45) {
            window.setTimeout(() => fireEnemyShot(enemy, rand(-0.18, 0.18)), 120);
          }
        }
      }

      if (!enemy.boss && enemy.z > world.nearZ) {
        burst(enemy.x, enemy.y, 24, 0xff5f7e, 10, 1.2);
        removeEnemy(enemy, false);
        damagePlayer(spec.damage);
      }
    });
  }

  function firePlayerWeapons() {
    state.fireTimer = state.fireInterval;
    const spreadOffsets = [0];
    if (state.spread >= 1) spreadOffsets.push(-5.5, 5.5);
    if (state.spread >= 2) spreadOffsets.push(-11, 11);

    spreadOffsets.forEach((offset, index) => {
      spawnPlayerBullet(offset, index * 0.04);
    });

    if (state.drones > 0) spawnPlayerBullet(-14, 0.02, 0.64);
    if (state.drones > 1) spawnPlayerBullet(14, -0.02, 0.64);

    playTone(640 + Math.random() * 120, 0.035, "triangle", 0.018);
  }

  function spawnPlayerBullet(offsetX, waveOffset, damageScale = 1) {
    const from = new THREE.Vector3(offsetX * 0.42, -25 + Math.abs(offsetX) * 0.08, world.muzzleZ);
    const target = new THREE.Vector3(
      state.aim.x + offsetX * 0.9,
      state.aim.y + Math.sin(state.time * 10 + waveOffset) * 1.2,
      world.aimZ - 120
    );
    const direction = target.sub(from).normalize();
    const sprite = makeSprite("bullet", 2.4, 7.8, { depthTest: false, renderOrder: 8 });
    sprite.position.copy(from);

    state.bullets.push({
      id: entityId += 1,
      sprite,
      x: from.x,
      y: from.y,
      z: from.z,
      vx: direction.x * state.bulletSpeed,
      vy: direction.y * state.bulletSpeed,
      vz: direction.z * state.bulletSpeed,
      radius: 2.7,
      life: 1.35,
      damage: 32 * state.damage * damageScale
    });
  }

  function updateBullets(dt) {
    const bullets = [...state.bullets];
    bullets.forEach((bullet) => {
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.z += bullet.vz * dt;
      bullet.sprite.position.set(bullet.x, bullet.y, bullet.z);
      bullet.sprite.material.rotation += dt * 5;

      let consumed = false;
      for (const enemy of [...state.enemies]) {
        if (Math.abs(bullet.z - enemy.z) > enemy.depth) continue;
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        if (Math.hypot(dx, dy) <= enemy.radius + bullet.radius) {
          damageEnemy(enemy, bullet.damage);
          consumed = true;
          break;
        }
      }

      if (consumed || bullet.life <= 0 || bullet.z < world.farZ - 180) {
        removeFromList(state.bullets, bullet);
        disposeSprite(bullet.sprite);
      }
    });
  }

  function fireEnemyShot(enemy, lateral = 0) {
    if (!state.enemies.includes(enemy) || state.gameOver) return;
    const spec = ENEMIES[enemy.type];
    const from = new THREE.Vector3(enemy.x, enemy.y, enemy.z + 4);
    const target = new THREE.Vector3(state.aim.x + lateral * 44, state.aim.y, 36);
    const direction = target.sub(from).normalize();
    const sprite = makeSprite("enemyShot", enemy.boss ? 5.4 : 4.2, enemy.boss ? 5.4 : 4.2, {
      depthTest: false,
      renderOrder: 7
    });
    sprite.position.copy(from);

    state.enemyShots.push({
      id: entityId += 1,
      sprite,
      x: from.x,
      y: from.y,
      z: from.z,
      vx: direction.x * spec.shotSpeed,
      vy: direction.y * spec.shotSpeed,
      vz: direction.z * spec.shotSpeed,
      radius: enemy.boss ? 4.6 : 3.4,
      damage: spec.damage,
      life: 7
    });
  }

  function updateEnemyShots(dt) {
    const shots = [...state.enemyShots];
    shots.forEach((shot) => {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.z += shot.vz * dt;
      shot.sprite.position.set(shot.x, shot.y, shot.z);
      shot.sprite.material.rotation += dt * 3;

      const inCockpit = shot.z > 24;
      const hitDistance = Math.hypot(shot.x - state.aim.x, shot.y - state.aim.y);
      if (inCockpit && hitDistance <= shot.radius + 4.2) {
        burst(shot.x, shot.y, shot.z, 0xffcf6a, 8, 0.9);
        removeFromList(state.enemyShots, shot);
        disposeSprite(shot.sprite);
        damagePlayer(shot.damage);
        return;
      }

      if (shot.life <= 0 || shot.z > world.nearZ + 20) {
        removeFromList(state.enemyShots, shot);
        disposeSprite(shot.sprite);
      }
    });
  }

  function damageEnemy(enemy, amount) {
    enemy.hp -= amount;
    enemy.hitFlash = 1;
    burst(enemy.x, enemy.y, enemy.z + 2, ENEMIES[enemy.type].tint, 4, 0.5);
    if (enemy.hp <= 0) {
      removeEnemy(enemy, true);
    }
  }

  function removeEnemy(enemy, scored) {
    if (!state.enemies.includes(enemy)) return;
    removeFromList(state.enemies, enemy);
    disposeSprite(enemy.sprite);
    const spec = ENEMIES[enemy.type];
    burst(enemy.x, enemy.y, enemy.z, spec.tint, enemy.boss ? 42 : 16, enemy.boss ? 2.2 : 1.1);
    playTone(enemy.boss ? 88 : 140, enemy.boss ? 0.18 : 0.07, "sawtooth", enemy.boss ? 0.06 : 0.03);

    if (!scored) return;
    state.combo = Math.min(6, state.combo + (enemy.boss ? 0.75 : 0.16));
    state.comboTimer = 4.5;
    state.score += Math.round(enemy.score * state.combo);
    state.emp = clamp(state.emp + (enemy.boss ? 34 : 7.5) * state.empGain, 0, 100);
  }

  function burst(x, y, z, color, count, size) {
    for (let i = 0; i < count; i += 1) {
      const sprite = makeSprite("particle", rand(1.2, 3.6) * size, rand(1.2, 3.6) * size, {
        color,
        depthTest: false,
        renderOrder: 6,
        opacity: 0.95
      });
      sprite.position.set(x, y, z);
      state.particles.push({
        sprite,
        x,
        y,
        z,
        vx: rand(-20, 20) * size,
        vy: rand(-15, 15) * size,
        vz: rand(-30, 38) * size,
        life: rand(0.35, 0.8),
        maxLife: 0.8,
        spin: rand(-4, 4)
      });
    }
  }

  function updateParticles(dt) {
    const particles = [...state.particles];
    particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.vz *= 0.985;
      particle.sprite.position.set(particle.x, particle.y, particle.z);
      particle.sprite.material.rotation += particle.spin * dt;
      particle.sprite.material.opacity = clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.life <= 0) {
        removeFromList(state.particles, particle);
        disposeSprite(particle.sprite);
      }
    });
  }

  function damagePlayer(amount) {
    if (state.invulnerable > 0 || state.dashTime > 0 || state.gameOver) return;
    state.hull = Math.max(0, state.hull - amount);
    state.invulnerable = 0.42;
    state.shake = 1.2;
    state.combo = Math.max(1, state.combo - 0.65);
    state.comboTimer = 0;
    playTone(72, 0.12, "sawtooth", 0.05);
    showToast("Hull breach");
    if (state.hull <= 0) endRun(false);
  }

  function dash() {
    if (!state.running || state.paused || state.choosing || state.gameOver) return;
    if (state.dashCooldown > 0) {
      showToast("Slip drive cooling");
      return;
    }
    state.dashCooldown = state.dashMax;
    state.dashTime = 0.3;
    state.invulnerable = 0.38;
    state.shake = 0.7;

    [...state.enemyShots].forEach((shot) => {
      const dist = Math.hypot(shot.x - state.aim.x, shot.y - state.aim.y);
      if (dist < state.dashRadius) {
        burst(shot.x, shot.y, shot.z, 0x71ffce, 6, 0.75);
        removeFromList(state.enemyShots, shot);
        disposeSprite(shot.sprite);
      }
    });
    playTone(260, 0.08, "triangle", 0.05);
  }

  function triggerEmp() {
    if (!state.running || state.paused || state.choosing || state.gameOver) return;
    if (state.emp < 100) {
      showToast("EMP charging");
      return;
    }
    state.emp = 0;
    state.shake = 1;
    [...state.enemyShots].forEach((shot) => {
      burst(shot.x, shot.y, shot.z, 0x71ffce, 6, 0.75);
      removeFromList(state.enemyShots, shot);
      disposeSprite(shot.sprite);
    });
    [...state.enemies].forEach((enemy) => {
      damageEnemy(enemy, enemy.boss ? state.empDamage * 1.15 : state.empDamage);
    });
    showToast("EMP bloom released");
    playTone(110, 0.18, "sawtooth", 0.08);
    playTone(440, 0.12, "triangle", 0.05, 0.06);
  }

  function checkWaveComplete() {
    if (state.spawnQueue.length > 0 || state.enemies.length > 0 || state.gameOver || state.choosing) return;
    state.wavesCleared = Math.max(state.wavesCleared, state.waveIndex + 1);
    if (state.waveIndex >= WAVES.length - 1) {
      endRun(true);
      return;
    }
    openUpgradeDraft();
  }

  function openUpgradeDraft() {
    state.choosing = true;
    state.mode = "upgrade";
    if (ui.upgradePrompt) {
      ui.upgradePrompt.textContent = `WAVE ${String(state.waveIndex + 1).padStart(2, "0")} CLEARED`;
    }
    if (ui.upgradeGrid) {
      ui.upgradeGrid.innerHTML = "";
      shuffle([...UPGRADES]).slice(0, 3).forEach((upgrade) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "upgrade-card";
        button.innerHTML = `<h3>${upgrade.title}</h3><p>${upgrade.copy}</p>`;
        button.addEventListener("click", () => {
          upgrade.apply();
          state.choosing = false;
          state.mode = "playing";
          hide(ui.upgrades);
          showToast(`${upgrade.title} installed`);
          beginWave(state.waveIndex + 1);
          playTone(520, 0.1, "triangle", 0.04);
        });
        ui.upgradeGrid.appendChild(button);
      });
    }
    show(ui.upgrades);
  }

  function endRun(victory) {
    state.running = false;
    state.gameOver = true;
    state.mode = "gameover";
    hide(ui.bossWrap);
    state.best = Math.max(state.best, state.score);
    writeBest(state.best);
    if (ui.gameOverEyebrow) ui.gameOverEyebrow.textContent = victory ? "PROTOCOL COMPLETE" : "SIGNAL LOST";
    if (ui.gameOverTitle) ui.gameOverTitle.textContent = victory ? "STARBREAKER ONLINE" : "COCKPIT DARK";
    if (ui.finalScore) ui.finalScore.textContent = formatNumber(state.score);
    if (ui.bestScore) ui.bestScore.textContent = formatNumber(state.best);
    if (ui.wavesCleared) ui.wavesCleared.textContent = String(state.wavesCleared);
    if (ui.gameOverMessage) {
      ui.gameOverMessage.textContent = victory
        ? "Hyperlane secured. The fleet owes you one."
        : "Relaunch and punch a cleaner hole through the rift.";
    }
    show(ui.gameOver);
    playTone(victory ? 320 : 90, victory ? 0.22 : 0.2, victory ? "triangle" : "sawtooth", 0.07);
  }

  function setPaused(paused) {
    if (!state.running || state.gameOver || state.choosing) return;
    state.paused = paused;
    state.mode = paused ? "paused" : "playing";
    if (paused) show(ui.paused);
    else hide(ui.paused);
  }

  function togglePause() {
    if (!state.running || state.gameOver || state.choosing) return;
    setPaused(!state.paused);
  }

  function updateHud() {
    const wave = WAVES[state.waveIndex];
    if (ui.wave) {
      ui.wave.textContent = state.waveIndex >= 0
        ? `SECTOR ${String(state.waveIndex + 1).padStart(2, "0")}`
        : "STANDBY";
    }
    if (ui.status) {
      if (state.mode === "intro") ui.status.textContent = "HYPERWARP READY";
      else if (state.paused) ui.status.textContent = "SYSTEMS HOLDING";
      else if (state.choosing) ui.status.textContent = "UPLINK READY";
      else if (state.gameOver) ui.status.textContent = "RUN COMPLETE";
      else ui.status.textContent = wave ? wave.name : "RIFT CLEAR";
    }
    if (ui.score) ui.score.textContent = formatNumber(state.score);
    if (ui.bestTitle) ui.bestTitle.textContent = formatNumber(state.best);
    if (ui.hull) ui.hull.textContent = String(Math.ceil(state.hull));
    setWidth(ui.hullBar, (state.hull / state.maxHull) * 100);
    if (ui.charge) ui.charge.textContent = `${Math.floor(state.emp)}%`;
    setWidth(ui.chargeBar, state.emp);
    if (ui.combo) ui.combo.textContent = `x${state.combo.toFixed(1)}`;
    setWidth(ui.comboBar, clamp((state.combo - 1) / 5, 0, 1) * 100);
    if (ui.enemies) ui.enemies.textContent = String(state.enemies.length + state.spawnQueue.length);

    const dashPct = state.dashCooldown <= 0 ? 100 : (1 - state.dashCooldown / state.dashMax) * 100;
    if (ui.dashButton) {
      ui.dashButton.style.opacity = state.dashCooldown <= 0 ? "1" : "0.58";
      ui.dashButton.title = state.dashCooldown <= 0 ? "Dash ready" : `Dash ${Math.ceil(state.dashCooldown)}s`;
    }
    if (ui.empButton) {
      ui.empButton.style.opacity = state.emp >= 100 ? "1" : "0.58";
      ui.empButton.title = state.emp >= 100 ? "EMP ready" : `EMP ${Math.floor(state.emp)}%`;
    }

    const boss = state.enemies.find((enemy) => enemy.boss);
    if (boss) {
      show(ui.bossWrap);
      if (ui.bossName) ui.bossName.textContent = boss.label;
      const pct = clamp((boss.hp / boss.maxHp) * 100, 0, 100);
      if (ui.bossHpText) ui.bossHpText.textContent = `${Math.ceil(pct)}%`;
      setWidth(ui.bossBar, pct);
    } else {
      hide(ui.bossWrap);
    }

    void dashPct;
  }

  function setWidth(element, pct) {
    if (element) element.style.width = `${clamp(pct, 0, 100)}%`;
  }

  function showToast(message) {
    if (!ui.toast) return;
    ui.toast.dataset.message = message;
    ui.toast.classList.remove("hidden");
    state.toastTimer = 1.9;
  }

  function updateToast(dt) {
    if (state.toastTimer <= 0) return;
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) hide(ui.toast);
  }

  function show(element) {
    element?.classList.remove("hidden");
  }

  function hide(element) {
    element?.classList.add("hidden");
  }

  function clearRunObjects() {
    [state.enemies, state.bullets, state.enemyShots, state.particles].forEach((list) => {
      list.splice(0).forEach((item) => disposeSprite(item.sprite));
    });
  }

  function disposeSprite(sprite) {
    if (!sprite) return;
    scene.remove(sprite);
    sprite.material?.dispose();
  }

  function removeFromList(list, item) {
    const index = list.indexOf(item);
    if (index !== -1) list.splice(index, 1);
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function unlockAudio() {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) audioContext = new Context();
    }
    audioContext?.resume?.();
  }

  function playTone(frequency, duration, type = "sine", gain = 0.025, delay = 0) {
    if (!audioContext) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (shell || document.documentElement).requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function updateFullscreenLabel() {
    const label = ui.fullscreenButton?.querySelector("span");
    if (label) label.textContent = document.fullscreenElement ? "EXIT" : "FULL";
  }

  function readBest() {
    try {
      return Number(localStorage.getItem("starbreaker-protocol-best") || 0);
    } catch (_error) {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      localStorage.setItem("starbreaker-protocol-best", String(Math.floor(value)));
    } catch (_error) {
      // Storage can be blocked in private or embedded browsers. The run still works.
    }
  }
})();
