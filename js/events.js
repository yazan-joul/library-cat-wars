// Stressed NPC students and random library disasters.
window.LCW = window.LCW || {};

LCW.events = (() => {
  const { ui, audio, models } = LCW;
  const STRESS_LINES = ['💦', '😰', 'exam in 3 min??', '😩', 'I studied the wrong chapter', '☕☕☕', 'אוף'];
  let nextIn = 0;
  let kittenSpawned = false;
  let power = 0, wifi = 0;

  function reset(game) {
    nextIn = 18;
    game.phone = null;
    kittenSpawned = false;
    power = wifi = 0;
    game.world.hemi.userData.base = game.world.hemi.intensity;
    game.world.sun.userData.base = game.world.sun.intensity;
  }

  // ---------- Students ----------
  function updateStudents(dt, game) {
    const w = game.world;
    const cat = game.cats.find((c) => c.state !== 'outside');
    let total = 0;
    for (const s of w.students) {
      s.phase += dt;
      s.chaseCooldown -= dt;
      s.stress = Math.max(0, Math.min(1, s.stress - 0.012 * dt));
      total += s.stress;
      const m = s.model;
      const frozen = (s.table && s.table.catNap) || (s.desk && !s.desk.plugged) || power > 0;

      if (s.state === 'sit') {
        // Study bob + stress shake. Frozen = arms up in horror.
        const shake = s.stress > 0.5 ? Math.sin(s.phase * 40) * 0.08 * s.stress : 0;
        m.group.position.set(s.home.x + shake, 0.15, s.home.z);
        m.head.rotation.x = 0.2 + Math.sin(s.phase * 2) * 0.08;
        if (frozen) {
          m.armL.rotation.x = m.armR.rotation.x = -2.8;
          m.armL.rotation.z = 0.3; m.armR.rotation.z = -0.3;
        } else {
          m.armL.rotation.z = m.armR.rotation.z = 0;
          m.armL.rotation.x = -1.1 + Math.sin(s.phase * 18) * 0.12;
          m.armR.rotation.x = -1.1 + Math.cos(s.phase * 18) * 0.12;
        }
        if (s.stress > 0.6 && Math.random() < dt * 0.25) {
          ui.bubble(m.group, models.pick(STRESS_LINES), { cls: 'plain', height: 2.6, life: 1.5 });
        }
        if (game.player && s.stress >= 0.95 && s.chaseCooldown <= 0 && cat && cat.distanceTo(s) < 12) {
          s.state = 'chase';
          s.timer = 4;
          m.legL.rotation.x = m.legR.rotation.x = 0;
          ui.bubble(m.group, models.pick(['COME BACK HERE!', 'GIVE IT BACK!', 'THAT CAT!!']), { cls: 'bad', height: 2.8, life: 2 });
        }
      } else if (s.state === 'chase') {
        // Flailing, loud, mostly useless chase.
        s.timer -= dt;
        game.addNoise(5 * dt);
        if (cat && cat.state !== 'outside') moveStudent(s, cat.pos, 7.5, dt, game);
        m.armL.rotation.x = Math.sin(s.phase * 25) * 2.5;
        m.armR.rotation.x = -Math.sin(s.phase * 25) * 2.5;
        m.legL.rotation.x = Math.sin(s.phase * 16) * 1.1;
        m.legR.rotation.x = -Math.sin(s.phase * 16) * 1.1;
        m.group.position.y = Math.abs(Math.sin(s.phase * 16)) * 0.35;
        if (s.timer <= 0 || !cat) s.state = 'return';
      } else if (s.state === 'return') {
        m.armL.rotation.x = m.armR.rotation.x = 0;
        m.legL.rotation.x = Math.sin(s.phase * 10) * 0.6;
        m.legR.rotation.x = -Math.sin(s.phase * 10) * 0.6;
        if (moveStudent(s, s.home, 4, dt, game)) {
          s.state = 'sit';
          s.x = s.home.x; s.z = s.home.z;
          s.stress = 0.45;
          s.chaseCooldown = 12;
          m.group.rotation.y = s.home.rotY;
          m.legL.rotation.x = m.legR.rotation.x = -Math.PI / 2;
        }
      }
    }
    game.chaos += (Math.min(100, (total / w.students.length) * 250) - game.chaos) * Math.min(1, dt * 2);

    // Students fetch stolen snacks and replug computers eventually.
    for (const t of w.tables) {
      if (t.cupReturn > 0) {
        t.cupReturn -= dt;
        if (t.cupReturn <= 0) t.cup.visible = true;
      }
      if (t.snackReturn > 0) {
        t.snackReturn -= dt;
        if (t.snackReturn <= 0) {
          t.snack.position.copy(t.snackHome);
          t.snackTaken = false;
        }
      }
    }
    for (const d of w.desks) {
      if (!d.plugged) {
        d.unplugTimer -= dt;
        if (d.unplugTimer <= 0) {
          d.plugged = true;
          d.screenMat.color.setHex(d.screenMat.userData.base);
          d.student.stress = Math.max(0, d.student.stress - 0.3);
        }
      }
    }
  }

  function moveStudent(s, target, speed, dt, game) {
    const dx = target.x - s.x, dz = target.z - s.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) return true;
    s.x += (dx / d) * Math.min(d, speed * dt);
    s.z += (dz / d) * Math.min(d, speed * dt);
    s.model.group.position.x = s.x;
    s.model.group.position.z = s.z;
    s.model.group.position.y = s.state === 'chase' ? s.model.group.position.y : 0;
    s.model.group.rotation.y = Math.atan2(dx, dz);
    return false;
  }

  // ---------- Disasters ----------
  const DISASTERS = {
    power(game) {
      ui.banner('⚡ POWER FLICKER!');
      power = 4;
      game.typingBlocked = 4;
      game.world.students.forEach((s) => (s.stress += 0.15));
      audio.zap();
    },
    books(game) {
      const shelf = models.pick(game.world.shelves);
      ui.banner('📚 BOOK AVALANCHE!');
      game.addNoise(12);
      game.shake = 0.6;
      audio.crash();
      for (let i = 0; i < 14; i++) {
        const b = models.book();
        b.position.set(shelf.x + (Math.random() - 0.5) * 4, 3 + Math.random() * 1.5, shelf.z + 0.8);
        game.scene.add(b);
        game.debris.push({
          mesh: b,
          vel: new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, 3 + Math.random() * 6),
          spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
          life: 25,
          resting: false,
        });
      }
    },
    coffee(game) {
      // Two big puddles: one near a random table, one near YOUR seat.
      const seat = game.world.mySeat;
      const spots = [];
      const t = models.pick(game.world.tables.filter((t) => !t.isMine));
      const a = Math.random() * Math.PI * 2;
      spots.push([t.x + Math.cos(a) * 4, t.z + Math.sin(a) * 4]);
      const b = Math.random() * Math.PI * 2;
      spots.push([seat.x + Math.cos(b) * (3.5 + Math.random() * 3), seat.z - 1 + Math.sin(b) * 3]);
      spots.forEach(([x, z]) => {
        const p = new THREE.Vector3(x, 0, z);
        LCW.world.collide(game.world, p, 0.5);
        if (Math.hypot(p.x - seat.x, p.z - seat.z) < 1.8) return; // never on the seat itself
        const puddle = new THREE.Mesh(
          new THREE.CircleGeometry(2.2, 24),
          new THREE.MeshLambertMaterial({ color: 0x6f4e37, transparent: true, opacity: 0.92 }),
        );
        puddle.rotation.x = -Math.PI / 2;
        puddle.position.set(p.x, 0.03, p.z);
        puddle.scale.set(1, 0.75, 1);
        game.scene.add(puddle);
        game.spills.push({ x: p.x, z: p.z, r: 2, mesh: puddle, life: 40 });
      });
      ui.banner('☕ COFFEE SPILL! It\'s slippery!');
      if (t.students[0]) ui.bubble(t.students[0].model.group, 'oops ☕', { height: 2.8 });
    },
    phone(game) {
      const candidates = game.world.students.filter((s) => s.state === 'sit');
      const s = models.pick(candidates);
      if (!s) return;
      game.phone = { student: s, timer: 14, tick: 0 };
      ui.banner('📱 A PHONE IS RINGING! Go silence it (E)');
    },
    wifi(game) {
      ui.banner('📶 WI-FI DOWN! Typing is slow');
      wifi = 9;
      game.typingMult = 0.35;
      const sample = game.world.students.slice().sort(() => Math.random() - 0.5).slice(0, 6);
      sample.forEach((s) => {
        s.stress += 0.2;
        ui.bubble(s.model.group, '📶❌', { cls: 'plain', height: 2.8, life: 2.5 });
      });
    },
    kitten(game) {
      ui.banner('🐾 A KITTEN SNUCK IN!');
      kittenSpawned = true;
      game.cats.push(new LCW.Cat(game.scene, game.world, { kitten: true, life: 25, delay: 0 }));
    },
  };

  function update(dt, game) {
    updateStudents(dt, game);

    nextIn -= dt;
    if (nextIn <= 0) {
      nextIn = 14 + Math.random() * 8;
      const pool = ['power', 'books', 'coffee', 'coffee', 'wifi', 'phone', 'phone'];
      if (!kittenSpawned && game.elapsed > 75) pool.push('kitten', 'kitten');
      DISASTERS[models.pick(pool)](game);
    }

    // Ringing phone: loud until someone silences it.
    if (game.phone) {
      const ph = game.phone;
      ph.timer -= dt;
      ph.tick -= dt;
      game.addNoise(5 * dt);
      ph.student.stress = Math.min(1, ph.student.stress + 0.05 * dt);
      if (ph.tick <= 0) {
        ph.tick = 0.9;
        ui.bubble(ph.student.model.group, '📱 RING RING', { cls: 'alert', height: 2.8, life: 0.8 });
        if (game.live) audio.ring();
      }
      if (ph.timer <= 0) game.phone = null;
    }

    // Power flicker: lights dim and screens blink.
    const w = game.world;
    if (power > 0) {
      power -= dt;
      const flick = Math.random() < 0.3;
      w.hemi.intensity = w.hemi.userData.base * (flick ? 0.9 : 0.35);
      w.sun.intensity = w.sun.userData.base * (flick ? 0.8 : 0.2);
      w.screens.forEach((s) => s.color.setHex(Math.random() < 0.5 ? 0x111111 : s.userData.base));
      if (power <= 0) {
        w.hemi.intensity = w.hemi.userData.base;
        w.sun.intensity = w.sun.userData.base;
        w.screens.forEach((s) => s.color.setHex(s.userData.base));
        w.desks.forEach((d) => { if (!d.plugged) d.screenMat.color.setHex(0x111111); });
      }
    }
    if (wifi > 0) {
      wifi -= dt;
      if (wifi <= 0) { game.typingMult = 1; ui.banner('📶 Wi-Fi is back!', 1.5); }
    }

    // Falling books: simple bouncy physics.
    for (let i = game.debris.length - 1; i >= 0; i--) {
      const b = game.debris[i];
      if (!b.resting) {
        b.vel.y -= 25 * dt;
        b.mesh.position.addScaledVector(b.vel, dt);
        b.mesh.rotation.x += b.spin.x * dt;
        b.mesh.rotation.y += b.spin.y * dt;
        b.mesh.rotation.z += b.spin.z * dt;
        if (b.mesh.position.y < 0.08) {
          b.mesh.position.y = 0.08;
          b.vel.y *= -0.45;
          b.vel.x *= 0.6;
          b.vel.z *= 0.6;
          b.spin.multiplyScalar(0.5);
          if (Math.abs(b.vel.y) < 1.2) {
            b.resting = true;
            b.mesh.rotation.x = 0;
            b.mesh.rotation.z = 0;
          }
        }
      } else {
        b.life -= dt;
        if (b.life <= 0) {
          game.scene.remove(b.mesh);
          game.debris.splice(i, 1);
        }
      }
    }
    for (let i = game.spills.length - 1; i >= 0; i--) {
      const s = game.spills[i];
      s.life -= dt;
      if (s.life < 2) s.mesh.material.opacity = Math.max(0, s.life / 2) * 0.9;
      if (s.life <= 0) {
        game.scene.remove(s.mesh);
        game.spills.splice(i, 1);
      }
    }
  }

  return { reset, update, updateStudents };
})();
