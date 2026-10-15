// The Jerusalem campus cat: wanders, picks mischief, gets lured by treats/yarn, flees from noise.
window.LCW = window.LCW || {};

(() => {
  const { ui, audio, models } = LCW;
  const V3 = THREE.Vector3;
  const MASH = ['asdfghjkl', 'jjjjjjjjjjj', ';;;;;;;;;', 'gggggg', '?!?!?!', 'DELETE', 'ctrl+z?!', '00000000'];
  const DESK_CRIES = ['HEY!', 'My code!!', 'NOOO', 'Not now!!', 'שלום חתול...', 'why me'];
  const SNACK_CRIES = ['MY SANDWICH!', 'My lunch!!', 'Come back!!', 'That was hummus!'];
  const DURATION = { mine: 6, keyboard: 5, unplug: 1.2, snack: 0.5, books: 8 };
  const SPEED = { walk: 4.5, rush: 6, flee: 12, play: 10 };

  LCW.Cat = class {
    constructor(scene, world, opts = {}) {
      this.scene = scene;
      this.world = world;
      this.kitten = !!opts.kitten;
      this.life = opts.life ?? Infinity;
      this.model = models.cat(this.kitten ? 0.6 : 1);
      this.model.group.visible = false;
      scene.add(this.model.group);
      this.pos = new V3(0, 0, 27);
      this.y = 0;
      this.extraY = 0;
      this.heading = Math.PI;
      this.state = 'outside';
      this.timer = opts.delay ?? 0;
      this.cooldown = 3;
      this.returns = 0;
      this.t = Math.random() * 10;
      this.walkT = 0;
      this.speed = 0;
      this.tick = 0;
      this.knockCooldown = 0;
      this.onMyLaptop = false;
      this.gone = false;
    }

    distanceTo(p) {
      return this.state === 'outside' ? Infinity : Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    }

    isCalm() { return this.state === 'calm' || this.state === 'eat'; }

    say(text, cls = 'plain', life = 1.4) {
      ui.bubble(this.model.group, text, { cls, height: this.kitten ? 1.4 : 2, life });
    }

    setState(s, timer = 0) {
      this.state = s;
      this.timer = timer;
      this.goal = null;
    }

    moveTo(target, speed, dt) {
      const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      speed *= this.boost || 1;
      this.speed = speed;
      if (d < 0.35) { this.speed = 0; return true; }
      this.heading = Math.atan2(dx, dz);
      const step = Math.min(d, speed * dt);
      this.pos.x += (dx / d) * step;
      this.pos.z += (dz / d) * step;
      return false;
    }

    randomPoint() {
      const R = this.world.ROOM;
      return new V3(R.minX + 3 + Math.random() * (R.maxX - R.minX - 6), 0, R.minZ + 4 + Math.random() * (R.maxZ - R.minZ - 6));
    }

    // ---------- Mischief ----------
    chooseMischief(game) {
      const w = this.world;
      const busy = (key) => game.cats.some((c) => c !== this && c.mischief && c.mischief.key === key);
      const options = [];
      if (!this.kitten && !busy('mine')) {
        const mine = { type: 'mine', key: 'mine', w: 2 + game.elapsed / 40, pos: w.mySeat.laptopPos.clone() };
        // It always comes back for YOUR laptop eventually, sooner in later rounds.
        if (this.sinceMine > 18 / this.boost) return this.goFor(mine, game);
        options.push(mine);
      }
      w.desks.forEach((d, i) => {
        if (!d.plugged || busy('desk' + i)) return;
        options.push({ type: 'keyboard', key: 'desk' + i, w: 0.4, pos: new V3(d.x - d.side * 0.25, 0, d.z), desk: d });
        if (!this.kitten) options.push({ type: 'unplug', key: 'desk' + i, w: 0.35, pos: new V3(d.x + d.side * 0.3, 0, d.z), desk: d });
      });
      w.tables.forEach((t, i) => {
        if (t.snack && !t.snackTaken && !busy('snack' + i)) {
          options.push({ type: 'snack', key: 'snack' + i, w: 0.8, pos: new V3(t.snack.position.x, 0, t.snack.position.z), table: t });
        }
        if (!t.isMine && !this.kitten && !busy('books' + i)) {
          options.push({ type: 'books', key: 'books' + i, w: 0.6, pos: t.booksPos.clone(), table: t });
        }
      });
      let r = Math.random() * options.reduce((s, o) => s + o.w, 0);
      this.goFor(options.find((o) => (r -= o.w) <= 0) || options[0], game);
    }

    goFor(mischief, game) {
      this.mischief = mischief;
      this.setState('goto');
      if (mischief.type === 'mine') {
        this.sinceMine = 0;
        // Fair warning: big red alarm when it heads for YOUR laptop.
        this.say('❗', 'alert', 1.8);
        if (game.live) audio.alarm();
      } else if (Math.random() < 0.5) this.say(models.pick(['😼', '😈', '👀']));
    }

    startMischief(game) {
      const m = this.mischief;
      this.setState('mischief', DURATION[m.type]);
      if (m.type === 'mine') {
        this.say('😼 *sits on your keyboard*', '', 2);
        audio.meow(1.1);
        game.punch = 0.8;
      } else if (m.type === 'keyboard') {
        ui.bubble(m.desk.student.model.group, models.pick(DESK_CRIES), { cls: 'bad', height: 2.8 });
      } else if (m.type === 'unplug') {
        m.desk.plugged = false;
        m.desk.unplugTimer = 25;
        m.desk.screenMat.color.setHex(0x111111);
        m.desk.student.stress += 0.45;
        ui.bubble(m.pos, '⚡ *yank*', { cls: 'bad', height: 2 });
        ui.bubble(m.desk.student.model.group, models.pick(['MY ESSAY!!', 'I DIDN\'T SAVE', '😱😱😱']), { cls: 'bad', height: 2.8, life: 2 });
        audio.zap();
      } else if (m.type === 'snack') {
        const t = m.table;
        t.snackTaken = true;
        this.model.mouth.add(t.snack);
        t.snack.position.set(0, 0, 0.1);
        t.snack.rotation.set(0, 0, 0);
        this.carry = t;
        t.students.forEach((s) => (s.stress += 0.4));
        if (t.students[0]) ui.bubble(t.students[0].model.group, models.pick(SNACK_CRIES), { cls: 'bad', height: 2.8, life: 2 });
        audio.meow(1.3);
        this.flee(new V3(t.x, 0, t.z), game, false);
      } else if (m.type === 'books') {
        m.table.catNap = true;
        this.extraY = 0.5;
        this.say('💤 *loaf mode*', '', 2);
      }
    }

    doMischief(dt, game) {
      const m = this.mischief;
      this.tick -= dt;
      if (m.type === 'mine') {
        this.onMyLaptop = true;
        game.progress = Math.max(0, game.progress - 1.5 * dt);
        if (this.tick <= 0) {
          this.tick = 0.45;
          ui.bubble(this.world.mySeat.laptopPos, models.pick(MASH), { cls: 'type', height: 2, life: 0.9, rise: 2, dx: (Math.random() - 0.5) * 3 });
          audio.type();
        }
      } else if (m.type === 'keyboard') {
        m.desk.student.stress += 0.15 * dt;
        m.desk.screenMat.color.setHSL(Math.random(), 0.8, 0.6);
        if (this.tick <= 0) {
          this.tick = 0.6;
          ui.bubble(m.pos, models.pick(MASH), { cls: 'type', height: 2.2, life: 0.9, rise: 2 });
        }
      } else if (m.type === 'books') {
        m.table.students.forEach((s) => (s.stress += 0.07 * dt));
        if (this.tick <= 0) { this.tick = 1.6; this.say('💤'); }
      }
      if (this.timer <= 0 && this.state === 'mischief') {
        this.endMischief();
        this.setState('wander', 2 + Math.random() * 2);
      }
    }

    endMischief() {
      const m = this.mischief;
      if (!m) return;
      if (m.type === 'keyboard' && m.desk.plugged) m.desk.screenMat.color.setHex(m.desk.screenMat.userData.base);
      if (m.type === 'books') m.table.catNap = false;
      this.extraY = 0;
      this.mischief = null;
    }

    dropCarry() {
      const t = this.carry;
      if (!t) return;
      this.carry = null;
      this.model.mouth.remove(t.snack);
      this.scene.add(t.snack);
      t.snack.position.set(this.pos.x, this.y + 0.1, this.pos.z + 0.6);
      t.snackReturn = 12; // the owner fetches it back later
    }

    // ---------- Reactions ----------
    flee(from, game, loud = true) {
      this.endMischief();
      if (this.state === 'calm' || this.state === 'eat') this.say('HSSS!', 'bad');
      else if (loud) this.say(models.pick(['MRAOW!', '🙀', 'zoomies!!']), 'bad');
      if (this.lure) { this.lure.claimed = null; this.lure = null; }
      const away = this.pos.clone().sub(from).setY(0);
      if (away.lengthSq() < 0.01) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      away.normalize().applyAxisAngle(new V3(0, 1, 0), (Math.random() - 0.5) * 1.2);
      const R = this.world.ROOM;
      this.fleeTarget = this.pos.clone().addScaledVector(away, 14);
      this.fleeTarget.x = Math.max(R.minX + 2, Math.min(R.maxX - 2, this.fleeTarget.x));
      this.fleeTarget.z = Math.max(R.minZ + 3, Math.min(R.maxZ - 2, this.fleeTarget.z));
      this.setState('flee', 2.8);
      if (loud) { game.addNoise(4); audio.meow(1.6); }
    }

    pet(game) {
      if (this.isCalm()) {
        game.stats.pets++;
        game.addPoints(200, this.model.group, 'Purrfect!');
        this.say('❤️ purrrr', 'good', 2);
        ui.bubble(this.model.group, '❤️', { cls: 'plain', height: 2.6, life: 1.2, rise: 2, dx: 1 });
        ui.bubble(this.model.group, '❤️', { cls: 'plain', height: 2.6, life: 1.2, rise: 2, dx: -1 });
        audio.purr();
        this.leave();
      } else {
        this.say('HSSSS! 😾', 'bad');
        game.addNoise(6);
        this.flee(game.player.pos, game, false);
      }
    }

    leave() {
      this.endMischief();
      this.dropCarry();
      if (this.lure) { this.lure.claimed = null; this.lure = null; }
      this.setState('leave');
      this.leaveStage = 0;
    }

    checkLures(game) {
      if (!['wander', 'goto', 'mischief', 'enter'].includes(this.state)) return;
      let best = null, bestD = 13;
      for (const tr of game.items.treats) {
        if (!tr.landed || tr.eaten || (tr.claimed && tr.claimed !== this)) continue;
        const d = this.distanceTo(tr.mesh.position);
        if (d < bestD) { best = tr; bestD = d; }
      }
      if (best) {
        this.endMischief();
        best.claimed = this;
        this.lure = best;
        this.setState('lured');
        this.say('🐟?!');
        return;
      }
      for (const y of game.items.yarns) {
        if (y.vel.length() > 1 && this.distanceTo(y.mesh.position) < 16) {
          this.endMischief();
          this.yarn = y;
          this.setState('play', 8);
          this.say('🧶!!!');
          audio.meow(1.4);
          return;
        }
      }
    }

    checkScares(game) {
      if (!['wander', 'goto', 'mischief', 'calm', 'eat', 'lured', 'play'].includes(this.state)) return;
      const p = game.player;
      if (p.running && this.distanceTo(p.pos) < 4.5) { this.flee(p.pos, game); return; }
      for (const s of this.world.students) {
        if (s.state === 'chase' && this.distanceTo(s) < 3.5) { this.flee(new V3(s.x, 0, s.z), game); return; }
      }
    }

    // ---------- Main update ----------
    update(dt, game) {
      this.t += dt;
      this.timer -= dt;
      this.onMyLaptop = false;
      this.knockCooldown -= dt;
      this.boost = game.catBoost || 1;
      this.sinceMine = (this.sinceMine || 0) + dt;
      if (this.kitten && this.state !== 'leave' && this.state !== 'outside') {
        this.life -= dt;
        if (this.life <= 0) { this.say('👋 mew'); this.leave(); }
      }

      switch (this.state) {
        case 'outside':
          if (this.timer <= 0) {
            this.model.group.visible = true;
            this.pos.set(0, 0, 27);
            this.setState('enter');
            this.goal = new V3((Math.random() - 0.5) * 10, 0, 14);
            this.say(this.returns ? '😼 I\'m back' : 'Mrrrow?', '', 1.8);
            if (game.player && this.returns) ui.banner('😼 The cat is back!', 2);
            audio.meow();
          }
          break;
        case 'enter':
          if (this.moveTo(this.goal, SPEED.walk, dt)) this.setState('wander', 1.5);
          break;
        case 'wander':
          this.cooldown -= dt;
          if (!this.goal) this.goal = this.randomPoint();
          if (this.moveTo(this.goal, SPEED.walk * 0.7, dt)) this.goal = null;
          if (this.cooldown <= 0 && this.timer <= 0) {
            this.cooldown = Math.max(0.8, (3.5 - game.elapsed / 60 - this.returns * 0.5) / this.boost);
            this.chooseMischief(game);
          }
          break;
        case 'goto':
          if (this.moveTo(this.mischief.pos, this.mischief.type === 'mine' ? SPEED.rush : SPEED.walk, dt)) this.startMischief(game);
          break;
        case 'mischief':
          this.speed = 0;
          this.doMischief(dt, game);
          break;
        case 'flee': {
          const arrived = this.moveTo(this.fleeTarget, SPEED.flee, dt);
          if (this.y > 0.5 && this.knockCooldown <= 0 && Math.random() < 0.5) {
            // Zoomies across a table: things go flying.
            this.knockCooldown = 1;
            ui.bubble(this.pos.clone(), '💥 CRASH', { cls: 'bad', height: 1.5 });
            game.addNoise(5);
            game.shake = 0.2;
            audio.crash();
            this.world.tables.forEach((t) => {
              if (Math.hypot(t.x - this.pos.x, t.z - this.pos.z) < 3) t.students.forEach((s) => (s.stress += 0.25));
            });
          }
          if (arrived || this.timer <= 0) {
            this.dropCarry();
            this.setState('wander', 1);
            this.cooldown = 2;
          }
          break;
        }
        case 'lured':
          if (!this.lure || this.lure.eaten || !game.items.treats.includes(this.lure)) { this.setState('wander'); break; }
          if (this.moveTo(this.lure.mesh.position, SPEED.rush, dt)) {
            this.setState('eat', 2);
            audio.eat();
          }
          break;
        case 'eat':
          if (this.timer <= 0) {
            if (this.lure) this.lure.eaten = true;
            this.lure = null;
            game.stats.lures++;
            game.addPoints(100, this.model.group, 'Lured!');
            this.say('😻 nom', 'good');
            this.setState('calm', this.kitten ? 5 : 8);
          }
          break;
        case 'play': {
          const y = this.yarn;
          if (!y || !game.items.yarns.includes(y)) { this.setState('calm', 4); break; }
          const caught = this.moveTo(y.mesh.position, SPEED.play, dt);
          if (caught && y.vel.length() < 0.5 && !this.batting) {
            this.batting = true;
            this.timer = 3;
            game.stats.lures++;
            game.addPoints(100, this.model.group, 'Yarn trap!');
            this.say('😸 *bats yarn*', 'good');
          }
          if (this.batting && this.timer <= 0) {
            this.batting = false;
            this.yarn = null;
            this.setState('calm', 6);
          } else if (!this.batting && this.timer <= 0) {
            this.setState('wander');
          }
          break;
        }
        case 'calm':
          this.speed = 0;
          this.tick -= dt;
          if (this.tick <= 0) { this.tick = 2; this.say(models.pick(['💤', 'purr', '😌'])); }
          if (this.timer <= 0) { this.setState('wander', 1); this.cooldown = 2.5; }
          break;
        case 'leave': {
          const goal = this.leaveStage === 0 ? new V3(0, 0, 17) : new V3(0, 0, 28);
          if (this.moveTo(goal, SPEED.walk * 1.2, dt)) {
            if (this.leaveStage === 0) this.leaveStage = 1;
            else if (this.kitten) { this.gone = true; this.scene.remove(this.model.group); }
            else {
              this.model.group.visible = false;
              this.returns++;
              this.setState('outside', 14);
            }
          }
          break;
        }
      }

      if (game.player) {
        this.checkLures(game);
        this.checkScares(game);
      }
      this.animate(dt);
    }

    // ---------- Exaggerated cartoon animation ----------
    animate(dt) {
      const m = this.model;
      const outsideRoom = this.pos.z > 19.5;
      const ground = outsideRoom ? 0 : LCW.world.surfaceHeight(this.world, this.pos.x, this.pos.z);
      const prevY = this.y;
      // Hop up fast, drop with a little gravity feel.
      this.y += (ground - this.y) * Math.min(1, dt * (ground > this.y ? 14 : 9));
      const vy = (this.y - prevY) / Math.max(dt, 1e-4);
      m.group.position.set(this.pos.x, this.y + this.extraY + Math.max(0, vy) * 0.04, this.pos.z);

      let diff = this.heading - m.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      m.group.rotation.y += diff * Math.min(1, dt * 12);

      const loaf = this.state === 'calm' || (this.state === 'mischief' && this.mischief && this.mischief.type === 'books');
      const sx = loaf ? 1.25 : 1 - Math.min(0.15, Math.abs(vy) * 0.02);
      const sy = loaf ? 0.6 : 1 + Math.min(0.25, Math.abs(vy) * 0.04);
      m.inner.scale.x += (sx - m.inner.scale.x) * Math.min(1, dt * 10);
      m.inner.scale.y += (sy - m.inner.scale.y) * Math.min(1, dt * 10);
      m.inner.scale.z = m.inner.scale.x;

      if (this.speed > 0) {
        this.walkT += dt * this.speed * 3;
        const a = Math.sin(this.walkT) * 0.8;
        m.legs[0].rotation.x = a; m.legs[3].rotation.x = a;
        m.legs[1].rotation.x = -a; m.legs[2].rotation.x = -a;
        m.inner.position.y = Math.abs(Math.sin(this.walkT)) * 0.1;
      } else {
        m.legs.forEach((l) => (l.rotation.x *= 0.8));
        m.inner.position.y = 0;
      }
      const kneading = this.state === 'mischief' && this.mischief && (this.mischief.type === 'mine' || this.mischief.type === 'keyboard');
      if (kneading) {
        m.legs[0].rotation.x = Math.sin(this.t * 14) * 0.7;
        m.legs[1].rotation.x = -Math.sin(this.t * 14) * 0.7;
      }

      const wagSpeed = this.state === 'flee' ? 20 : this.state === 'calm' ? 2 : 6;
      m.tail.rotation.z = Math.sin(this.t * wagSpeed) * (this.state === 'flee' ? 0.9 : 0.45);
      m.tail.rotation.x = this.state === 'flee' ? -0.1 : -0.6;
      m.head.rotation.x = this.state === 'eat' ? 0.5 + Math.sin(this.t * 18) * 0.15 : 0;
      m.head.rotation.z = this.state === 'calm' ? Math.sin(this.t) * 0.15 : 0;
      const twitch = Math.sin(this.t * 3) > 0.97 ? 0.5 : 0;
      m.ears.forEach((e, i) => (e.rotation.x = i === 0 ? twitch : 0));
    }
  };
})();
