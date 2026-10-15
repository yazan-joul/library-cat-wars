// Game setup, input, the main loop and win/lose flow.
(() => {
  const { ui, audio } = LCW;
  const EXAM_SECONDS = 180;
  const TYPING_SECONDS = 110; // pure typing time needed for 100% at 1x focus
  const SHH_LEVELS = [45, 70, 88];
  const BEST_KEY = 'library-cat-wars-best';
  // Each round the cat gets bolder and the music faster.
  const ROUNDS = [
    { at: 120, boost: 1.2, text: '😼 ROUND 2: Gingi joins the gang!', spawn: true },
    { at: 60, boost: 1.4, text: '🔥 FINAL MINUTE! The cats have the zoomies' },
    { at: 30, boost: 1.6, text: '🚨 PANIC MODE! 30 SECONDS!' },
  ];
  // The gang. pace = speed, greed = how much they love YOUR laptop, calm = seconds a treat buys.
  const CATS = {
    mitzi: { name: 'Mitzi', coat: 'tabby', pace: 1, greed: 1, calm: 6 },
    shuki: { name: 'Shuki', coat: 'black', pace: 1.35, greed: 1.3, calm: 4 },
    gingi: { name: 'Gingi', coat: 'gray', pace: 0.85, greed: 0.9, calm: 9, size: 1.25 },
  };
  const MACHINE_COOLDOWN = 25;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game').appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 300);
  const CAM_OFFSET = new THREE.Vector3(0, 27, 15);
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const mouse = new THREE.Vector2(0, 0);
  let mouseSeen = false;

  let state = 'menu';
  let game = null;

  // ---------- Input ----------
  const input = { up: false, down: false, left: false, right: false, run: false, type: false };
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run', Space: 'type',
  };
  window.addEventListener('keydown', (e) => {
    if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyM' && !e.repeat) {
      const muted = audio.music.toggleMute();
      if (state === 'playing') ui.banner(muted ? '🔇 Music off' : '🎵 Music on', 1);
    }
    if (state !== 'playing' || e.repeat) return;
    if (e.code === 'Digit1') throwTreat();
    if (e.code === 'Digit2') rollYarn();
    if (e.code === 'KeyE') interact();
  });
  window.addEventListener('keyup', (e) => { if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false; });
  window.addEventListener('blur', () => Object.keys(input).forEach((k) => (input[k] = false)));
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    mouseSeen = true;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (state !== 'playing') return;
    if (e.button === 0) throwTreat();
    if (e.button === 2) rollYarn();
  });

  function aimPoint() {
    const p = game.player;
    if (!mouseSeen) {
      return new THREE.Vector3(p.pos.x + Math.sin(p.facing) * 6, 0, p.pos.z + Math.cos(p.facing) * 6);
    }
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return p.pos.clone();
    const d = hit.clone().sub(p.pos).setY(0);
    if (d.length() > 14) hit.copy(p.pos).add(d.setLength(14));
    return hit;
  }

  function throwTreat() {
    const p = game.player;
    if (p.treats <= 0) { ui.bubble(p.model.group, 'Out of treats! 🥨', { cls: 'bad' }); return; }
    p.treats--;
    const target = aimPoint();
    LCW.world.collide(game.world, target, 0.3);
    game.items.throwTreat(p.pos.clone().setY(1.5), target);
    game.addNoise(2);
    audio.pop();
  }

  function rollYarn() {
    const p = game.player;
    if (p.yarn <= 0) { ui.bubble(p.model.group, 'Out of yarn! 🥨', { cls: 'bad' }); return; }
    p.yarn--;
    const dir = aimPoint().sub(p.pos).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    game.items.rollYarn(p.pos.clone().add(dir.clone().setLength(0.9)), dir);
    game.addNoise(3);
    audio.pop();
  }

  // E: pet a calm cat > silence a phone > refill at snack machine > replug a dark monitor.
  function interact() {
    const p = game.player;
    for (const cat of game.cats) {
      if (cat.distanceTo(p.pos) < 2.6) { cat.pet(game); return; }
    }
    if (nearPhone()) {
      ui.bubble(game.phone.student.model.group, '🤫 sorry!!', { cls: 'good', height: 2.8 });
      game.addPoints(75, p.model.group, 'Silenced!');
      game.phone = null;
      return;
    }
    if (p.pos.distanceTo(game.world.snackMachine) < 3) {
      if (game.machineCooldown > 0) {
        ui.bubble(p.model.group, `🥨 Restocking... ${Math.ceil(game.machineCooldown)}s`, { cls: 'bad' });
        return;
      }
      // Partial refill only, and the machine needs time to restock.
      p.treats = Math.min(4, p.treats + 3);
      p.yarn = Math.min(2, p.yarn + 1);
      game.machineCooldown = MACHINE_COOLDOWN;
      ui.bubble(p.model.group, '+🐟🐟🐟 +🧶', { cls: 'good' });
      audio.eat();
      return;
    }
    const desk = nearbyUnpluggedDesk();
    if (desk) {
      desk.plugged = true;
      desk.screenMat.color.setHex(desk.screenMat.userData.base);
      desk.student.stress = Math.max(0, desk.student.stress - 0.5);
      game.stats.helped++;
      game.addPoints(75, desk.student.model.group, 'Hero!');
      ui.bubble(desk.student.model.group, 'Thank you!! 🙏', { cls: 'good' });
      audio.pop();
    }
  }

  function nearPhone() {
    if (!game.phone) return false;
    const s = game.phone.student;
    return Math.hypot(game.player.pos.x - s.x, game.player.pos.z - s.z) < 3.4;
  }

  function nearbyUnpluggedDesk() {
    const p = game.player.pos;
    return game.world.desks.find((d) => !d.plugged && Math.hypot(p.x - d.x, p.z - d.z) < 3.4);
  }

  // ---------- Game lifecycle ----------
  function newGame() {
    ui.clearBubbles();
    const scene = new THREE.Scene();
    const world = LCW.world.build(scene);
    game = {
      scene, world,
      progress: 0,
      timeLeft: EXAM_SECONDS,
      elapsed: 0,
      noise: 0,
      chaos: 0,
      chaosSum: 0,
      shake: 0,
      typingBlocked: 0,
      typingMult: 1,
      spills: [],
      debris: [],
      cats: [],
      shhIndex: 0,
      typeTick: 0,
      stats: { lures: 0, pets: 0, helped: 0 },
      score: 0,
      level: 0,
      catBoost: 1,
      focus: 0,
      focusMult: 1,
      focusGrace: 0,
      buff: 0,
      punch: 0,
      espresso: null,
      espressoNext: 15,
      machineCooldown: 0,
      addNoise(n) { this.noise = Math.min(100, this.noise + n); },
      addPoints(n, anchor, label) {
        if (state !== 'playing') return;
        this.score += n;
        ui.bubble(anchor, `+${n} ${label}`, { cls: 'points', height: 3.4, life: 1.4, rise: 1.5 });
        ui.bumpScore();
        audio.ding();
      },
    };
    game.player = new LCW.Player(scene, world);
    game.items = new LCW.Items(scene, world);
    game.cats.push(new LCW.Cat(scene, world, { ...CATS.mitzi, delay: 4 }));
    game.cats.push(new LCW.Cat(scene, world, { ...CATS.shuki, delay: 22 }));
    if (LCW.events) LCW.events.reset(game);
    camera.position.copy(game.player.pos).add(CAM_OFFSET);
    camera.lookAt(game.player.pos);
  }

  function start() {
    audio.init();
    newGame();
    state = 'playing';
    game.live = true;
    ui.$('start').classList.add('hidden');
    ui.$('end').classList.add('hidden');
    ui.$('hud').classList.remove('hidden');
    ui.banner('📝 Get to work! The exam starts in 3:00', 2.5);
    audio.music.setLevel(0);
    audio.music.start();
    audio.start();
  }

  function finish(won, reason) {
    state = 'over';
    game.live = false;
    ui.hint('');
    audio.music.stop();
    game.level = 0;
    const avgChaos = game.chaosSum / Math.max(1, game.elapsed);
    let score = game.score + game.progress * 10;
    if (won) score += 1000 + game.timeLeft * 15;
    score = Math.max(0, Math.round(score - avgChaos * 4));
    let best = 0;
    try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { /* storage blocked */ }
    const isBest = score > best;
    if (isBest) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) { /* storage blocked */ }
    }
    ui.$('end-title').textContent = won ? 'Submitted! 🎉' : (reason === 'noise' ? 'SHHHHH! 🤫' : "Time's up! ⏰");
    ui.$('end-text').textContent = won
      ? `You submitted with ${Math.ceil(game.timeLeft)} seconds to spare. The cat is napping somewhere, very proud of you.`
      : reason === 'noise'
        ? 'The librarian has had enough. You were escorted out of the library. The cat stays.'
        : `The exam started and your assignment is only ${Math.floor(game.progress)}% done. The cat sat on your notes.`;
    ui.$('end-score').textContent = score;
    ui.$('end-best').textContent = isBest ? '🏆 New best score!' : (best ? `Best: ${best}` : '');
    ui.$('end').classList.remove('hidden');
    if (won) { audio.win(); ui.confetti(); } else audio.lose();
  }

  ui.$('start-btn').addEventListener('click', start);
  ui.$('again-btn').addEventListener('click', start);
  try {
    const best = Number(localStorage.getItem(BEST_KEY)) || 0;
    if (best) ui.$('best').textContent = `Best score: ${best}`;
  } catch (e) { /* storage blocked */ }

  // ---------- Per-frame systems ----------
  function updateTyping(dt) {
    const p = game.player;
    const seat = game.world.mySeat;
    const catOnLaptop = game.cats.some((c) => c.onMyLaptop);
    const canType = p.typing && !catOnLaptop && game.typingBlocked <= 0;
    updateFocus(dt, canType, catOnLaptop);
    if (canType) {
      const rate = game.typingMult * game.focusMult * (game.buff > 0 ? 2 : 1);
      game.progress = Math.min(100, game.progress + (100 / TYPING_SECONDS) * rate * dt);
      game.typeTick -= dt;
      if (game.typeTick <= 0) {
        game.typeTick = game.focusMult > 1.4 || game.buff > 0 ? 0.1 : 0.18;
        const words = ['lorem', 'ipsum', 'Q.E.D.', 'thus', '∴', 'ref[3]', 'f(x)', 'בס"ד', 'TODO', 'proof'];
        ui.bubble(seat.laptopPos, LCW.models.pick(words), { cls: 'type', height: 1.8, life: 0.8, rise: 2, dx: (Math.random() - 0.5) * 3 });
        audio.type();
      }
    }
    seat.laptop.screenMat.color.setHex(catOnLaptop ? (Math.sin(game.elapsed * 20) > 0 ? 0xff5e5e : 0x111111) : seat.laptop.screenMat.userData.base);
    const ring = game.world.seatRing;
    ring.scale.setScalar(1 + Math.sin(game.elapsed * 4) * 0.12);
    ring.material.color.setHex(p.typing ? 0x5cc96b : 0xffd23f);
  }

  // Uninterrupted typing builds a focus streak: up to 1.6x speed after 12s.
  function updateFocus(dt, canType, catOnLaptop) {
    const before = game.focusMult;
    if (canType) {
      game.focus += dt;
      game.focusGrace = 0.4;
    } else {
      game.focusGrace -= dt;
      if (game.focusGrace <= 0 || catOnLaptop) {
        if (game.focus > 3 && catOnLaptop) ui.bubble(game.player.model.group, '💔 focus lost', { cls: 'bad', height: 3.4 });
        game.focus = 0;
      }
    }
    game.focusMult = 1 + 0.6 * Math.min(1, game.focus / 12);
    const g = game.player.model.group;
    if (before < 1.3 && game.focusMult >= 1.3) { game.addPoints(50, g, 'FOCUS x1.3'); }
    if (before < 1.6 && game.focusMult >= 1.6) {
      game.addPoints(150, g, '🔥 FLOW STATE x1.6');
      audio.powerup();
    }
  }

  function updateRounds(dt) {
    const next = ROUNDS[game.level];
    if (next && game.timeLeft <= next.at) {
      game.level++;
      game.catBoost = next.boost;
      if (next.spawn) game.cats.push(new LCW.Cat(game.scene, game.world, { ...CATS.gingi, delay: 0 }));
      ui.banner(next.text, 3);
      audio.music.setLevel(game.level);
      audio.alarm();
      game.shake = 0.4;
    }
    if (game.punch > 0) game.punch -= dt;
  }

  // Espresso power-up: appears on the floor now and then; grab it for a typing rush.
  function updateEspresso(dt) {
    const p = game.player;
    if (game.buff > 0) game.buff -= dt;
    if (!game.espresso) {
      game.espressoNext -= dt;
      if (game.espressoNext <= 0) spawnEspresso();
      return;
    }
    const e = game.espresso;
    e.life -= dt;
    e.mesh.rotation.y += dt * 2;
    e.mesh.position.y = 0.3 + Math.abs(Math.sin(game.elapsed * 4)) * 0.4;
    e.ring.scale.setScalar(1 + Math.sin(game.elapsed * 8) * 0.15);
    e.ring.material.opacity = e.life < 3 ? (Math.sin(game.elapsed * 20) > 0 ? 0.9 : 0.2) : 0.8;
    if (Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 1.3) {
      game.buff = 10;
      game.addPoints(25, p.model.group, '☕ ESPRESSO!');
      ui.banner('☕ ESPRESSO RUSH! 2x typing for 10s', 2);
      audio.powerup();
      removeEspresso();
    } else if (e.life <= 0) {
      removeEspresso();
    }
  }

  function spawnEspresso() {
    const R = game.world.ROOM;
    const pos = new THREE.Vector3(R.minX + 4 + Math.random() * (R.maxX - R.minX - 8), 0, R.minZ + 4 + Math.random() * (R.maxZ - R.minZ - 7));
    LCW.world.collide(game.world, pos, 1.2);
    const mesh = new THREE.Group();
    const M = LCW.models;
    const cup = M.mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 14), 0xffffff);
    const coffee = M.mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 14), 0x6f4e37);
    coffee.position.y = 0.28;
    const handle = M.mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), 0xffffff);
    handle.position.x = 0.42;
    mesh.add(cup, coffee, handle);
    mesh.position.set(pos.x, 0.3, pos.z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.04, pos.z);
    game.scene.add(mesh, ring);
    game.espresso = { mesh, ring, x: pos.x, z: pos.z, life: 15 };
    ui.bubble(mesh, '☕ ESPRESSO!', { cls: 'big', height: 1.5, life: 2 });
  }

  function removeEspresso() {
    game.scene.remove(game.espresso.mesh, game.espresso.ring);
    game.espresso = null;
    game.espressoNext = 18 + Math.random() * 12;
  }

  function updateNoise(dt) {
    if (game.noise >= 100) { finish(false, 'noise'); return; }
    game.noise = Math.max(0, game.noise - 4 * dt);
    const lib = game.world.librarian;
    // Librarian glares at you when it gets loud.
    const target = game.noise > 35
      ? Math.atan2(game.player.pos.x - lib.group.position.x, game.player.pos.z - lib.group.position.z)
      : 0;
    lib.group.rotation.y += (target - lib.group.rotation.y) * Math.min(1, dt * 4);
    if (game.shhIndex < SHH_LEVELS.length && game.noise >= SHH_LEVELS[game.shhIndex]) {
      game.shhIndex++;
      ui.bubble(lib.group, 'SHHHHH!', { cls: 'shh', height: 3.2, life: 2 });
      audio.shh();
      game.shake = 0.5;
      lib.armL.rotation.x = lib.armR.rotation.x = -2.6;
      setTimeout(() => { lib.armL.rotation.x = lib.armR.rotation.x = 0; }, 900);
    }
    if (game.shhIndex > 0 && game.noise < SHH_LEVELS[game.shhIndex - 1] - 20) game.shhIndex--;
  }

  function updateHint() {
    const p = game.player;
    let text = '';
    const calmCat = game.cats.find((c) => c.distanceTo(p.pos) < 2.6 && c.isCalm());
    if (game.cats.some((c) => c.onMyLaptop)) text = '😾 The cat is on your laptop! Toss a treat (1) or roll yarn (2) away from your seat';
    else if (calmCat) text = 'E: pet the cat 💕 (it will leave happily)';
    else if (game.typingBlocked > 0 && p.atSeat()) text = '⚡ No power... wait for it';
    else if (p.atSeat() && !p.typing) text = 'Hold Space to type your assignment';
    else if (nearPhone()) text = 'E: silence the ringing phone 📱';
    else if (p.pos.distanceTo(game.world.snackMachine) < 3) text = game.machineCooldown > 0 ? `🥨 Machine restocking... ${Math.ceil(game.machineCooldown)}s` : 'E: restock treats 🐟 and yarn 🧶';
    else if (nearbyUnpluggedDesk()) text = 'E: plug the computer back in';
    else if (!p.atSeat() && game.elapsed > 3 && game.elapsed < 12) text = 'Your seat has the glowing yellow ring';
    ui.hint(text);
  }

  function updateCamera(dt) {
    // Camera "punch": zooms in briefly when the cat lands on your laptop.
    const zoom = game.punch > 0 ? 0.8 : 1;
    const target = game.player.pos.clone().addScaledVector(CAM_OFFSET, zoom);
    camera.position.lerp(target, Math.min(1, dt * 4));
    if (game.shake > 0) {
      game.shake -= dt;
      camera.position.x += (Math.random() - 0.5) * 0.6;
      camera.position.y += (Math.random() - 0.5) * 0.6;
    }
    camera.lookAt(camera.position.x, 0, camera.position.z - CAM_OFFSET.z * (camera.position.y / CAM_OFFSET.y));
  }

  function tick(dt) {
    game.elapsed += dt;
    game.timeLeft -= dt;
    game.typingBlocked -= dt;
    game.machineCooldown -= dt;
    game.player.update(dt, input, game);
    game.items.update(dt);
    game.cats.forEach((c) => c.update(dt, game));
    game.cats = game.cats.filter((c) => !c.gone);
    if (LCW.events) LCW.events.update(dt, game);
    game.chaosSum += game.chaos * dt;
    updateRounds(dt);
    updateEspresso(dt);
    updateTyping(dt);
    updateNoise(dt);
    updateHint();
    if (state !== 'playing') return;
    if (game.progress >= 100) finish(true);
    else if (game.timeLeft <= 0) finish(false, 'time');
  }

  // ---------- Loop ----------
  newGame(); // a live library behind the start screen
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'playing') tick(dt);
    else if (game) {
      // Gentle idle animation behind menus.
      game.cats.forEach((c) => c.update(dt, game));
      if (LCW.events) LCW.events.updateStudents(dt, game);
    }
    updateCamera(dt);
    ui.updateHud(game, dt);
    ui.updateBubbles(dt, camera);
    ui.updateCatArrow(game, camera, state === 'playing');
    renderer.render(game.scene, camera);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Test hook: lets a harness step the simulation without rendering.
  window.LCW.debug = () => ({ game, state, camera, tick, updateCamera });
})();
