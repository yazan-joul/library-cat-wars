// Game setup, input, the main loop and win/lose flow.
(() => {
  const { ui, audio } = LCW;
  const EXAM_SECONDS = 180;
  const TYPING_SECONDS = 80; // pure typing time needed for 100%
  const SHH_LEVELS = [45, 70, 88];
  const BEST_KEY = 'library-cat-wars-best';

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
    audio.pop();
  }

  function rollYarn() {
    const p = game.player;
    if (p.yarn <= 0) { ui.bubble(p.model.group, 'Out of yarn! 🥨', { cls: 'bad' }); return; }
    p.yarn--;
    const dir = aimPoint().sub(p.pos).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing));
    game.items.rollYarn(p.pos.clone().add(dir.clone().setLength(0.9)), dir);
    audio.pop();
  }

  // E: pet a calm cat > refill at snack machine > replug a dark monitor.
  function interact() {
    const p = game.player;
    for (const cat of game.cats) {
      if (cat.distanceTo(p.pos) < 2.6) { cat.pet(game); return; }
    }
    if (p.pos.distanceTo(game.world.snackMachine) < 3) {
      p.treats = 5;
      p.yarn = 3;
      ui.bubble(p.model.group, 'Restocked! 🐟🧶', { cls: 'good' });
      audio.eat();
      return;
    }
    const desk = nearbyUnpluggedDesk();
    if (desk) {
      desk.plugged = true;
      desk.screenMat.color.setHex(desk.screenMat.userData.base);
      desk.student.stress = Math.max(0, desk.student.stress - 0.5);
      game.stats.helped++;
      ui.bubble(desk.student.model.group, 'Thank you!! 🙏', { cls: 'good' });
      audio.pop();
    }
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
      addNoise(n) { this.noise = Math.min(100, this.noise + n); },
    };
    game.player = new LCW.Player(scene, world);
    game.items = new LCW.Items(scene, world);
    if (LCW.Cat) game.cats.push(new LCW.Cat(scene, world, { delay: 4 }));
    if (LCW.events) LCW.events.reset(game);
    camera.position.copy(game.player.pos).add(CAM_OFFSET);
    camera.lookAt(game.player.pos);
  }

  function start() {
    audio.init();
    newGame();
    state = 'playing';
    ui.$('start').classList.add('hidden');
    ui.$('end').classList.add('hidden');
    ui.$('hud').classList.remove('hidden');
    ui.banner('📝 Get to work! The exam starts in 3:00', 2.5);
  }

  function finish(won, reason) {
    state = 'over';
    ui.hint('');
    const avgChaos = game.chaosSum / Math.max(1, game.elapsed);
    let score = game.progress * 10 + game.stats.lures * 60 + game.stats.pets * 150 + game.stats.helped * 50;
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
    won ? audio.win() : audio.lose();
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
    if (p.typing && !catOnLaptop && game.typingBlocked <= 0) {
      game.progress = Math.min(100, game.progress + (100 / TYPING_SECONDS) * game.typingMult * dt);
      game.typeTick -= dt;
      if (game.typeTick <= 0) {
        game.typeTick = 0.18;
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

  function updateNoise(dt) {
    if (game.noise >= 100) { finish(false, 'noise'); return; }
    game.noise = Math.max(0, game.noise - 6 * dt);
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
    else if (p.pos.distanceTo(game.world.snackMachine) < 3) text = 'E: restock treats 🐟 and yarn 🧶';
    else if (nearbyUnpluggedDesk()) text = 'E: plug the computer back in';
    else if (!p.atSeat() && game.elapsed > 3 && game.elapsed < 12) text = 'Your seat has the glowing yellow ring';
    ui.hint(text);
  }

  function updateCamera(dt) {
    const target = game.player.pos.clone().add(CAM_OFFSET);
    camera.position.lerp(target, Math.min(1, dt * 4));
    if (game.shake > 0) {
      game.shake -= dt;
      camera.position.x += (Math.random() - 0.5) * 0.6;
      camera.position.y += (Math.random() - 0.5) * 0.6;
    }
    camera.lookAt(camera.position.x, 0, camera.position.z - CAM_OFFSET.z);
  }

  function tick(dt) {
    game.elapsed += dt;
    game.timeLeft -= dt;
    game.typingBlocked -= dt;
    game.player.update(dt, input, game);
    game.items.update(dt);
    game.cats.forEach((c) => c.update(dt, game));
    game.cats = game.cats.filter((c) => !c.gone);
    if (LCW.events) LCW.events.update(dt, game);
    game.chaosSum += game.chaos * dt;
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
