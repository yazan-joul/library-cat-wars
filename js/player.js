// The stressed student you play, plus the treats and yarn balls you throw.
window.LCW = window.LCW || {};

LCW.Player = class {
  constructor(scene, world) {
    this.world = world;
    this.model = LCW.models.student(0x9b6bff);
    // A tiny backpack so you can spot yourself in the crowd.
    const pack = LCW.models.mesh(new THREE.BoxGeometry(0.7, 0.8, 0.35), 0xe74c3c);
    pack.position.set(0, 1.2, -0.5);
    this.model.group.add(pack);
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.45, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd23f }),
    );
    marker.rotation.x = Math.PI;
    marker.position.y = 3.1;
    this.model.group.add(marker);
    this.marker = marker;
    scene.add(this.model.group);

    this.pos = new THREE.Vector3(world.mySeat.x, 0, world.mySeat.z + 0.2);
    this.vel = new THREE.Vector3();
    this.facing = Math.PI;
    this.radius = 0.55;
    this.treats = 5;
    this.yarn = 3;
    this.typing = false;
    this.running = false;
    this.moving = false;
    this.slip = 0;
    this.walkT = 0;
  }

  atSeat() {
    const s = this.world.mySeat;
    return Math.hypot(this.pos.x - s.x, this.pos.z - s.z) < 1.4;
  }

  update(dt, input, game) {
    const dir = new THREE.Vector3(
      (input.right ? 1 : 0) - (input.left ? 1 : 0), 0,
      (input.down ? 1 : 0) - (input.up ? 1 : 0),
    );
    this.moving = dir.lengthSq() > 0;
    this.running = this.moving && input.run;
    this.typing = input.type && !this.moving && this.atSeat() && this.slip <= 0;

    if (this.slip > 0) {
      // Sliding on coffee: no control, just "WHOAAA".
      this.slip -= dt;
      this.vel.multiplyScalar(Math.pow(0.4, dt));
      this.model.group.rotation.z = Math.sin(this.slip * 25) * 0.4;
    } else {
      this.model.group.rotation.z = 0;
      const speed = this.running ? 11 : 6;
      dir.normalize().multiplyScalar(speed);
      this.vel.lerp(dir, Math.min(1, dt * 12));
      if (this.moving) this.facing = Math.atan2(dir.x, dir.z);
      if (this.typing) this.facing = Math.PI;
    }
    this.pos.addScaledVector(this.vel, dt);
    LCW.world.collide(this.world, this.pos, this.radius);

    if (this.running) game.addNoise(12 * dt);

    // Running through a coffee puddle = slip.
    if (this.running && this.slip <= 0) {
      for (const s of game.spills) {
        if (Math.hypot(this.pos.x - s.x, this.pos.z - s.z) < s.r) {
          this.slip = 1.1;
          this.vel.multiplyScalar(1.6);
          game.addNoise(12);
          game.shake = 0.3;
          LCW.ui.bubble(this.model.group, 'WHOAAA!', { cls: 'bad' });
          LCW.audio.crash();
          break;
        }
      }
    }
    // Trampling fallen books is crunchy and loud.
    if (this.moving) {
      for (const b of game.debris) {
        if (b.resting && Math.hypot(this.pos.x - b.mesh.position.x, this.pos.z - b.mesh.position.z) < 0.7) {
          game.addNoise(5 * dt);
        }
      }
    }
    this.animate(dt);
  }

  animate(dt) {
    const m = this.model, g = m.group;
    g.position.set(this.pos.x, 0, this.pos.z);
    let diff = this.facing - g.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * Math.min(1, dt * 14);
    this.marker.position.y = 3.1 + Math.sin(performance.now() / 200) * 0.15;
    this.marker.rotation.y += dt * 3;

    if (this.typing) {
      this.walkT += dt * 30;
      m.armL.rotation.x = -1.3 + Math.sin(this.walkT) * 0.25;
      m.armR.rotation.x = -1.3 + Math.cos(this.walkT) * 0.25;
      m.legL.rotation.x = m.legR.rotation.x = 0;
      m.head.rotation.x = 0.25 + Math.sin(this.walkT * 0.3) * 0.08;
      m.body.scale.y = 1;
      return;
    }
    m.head.rotation.x = 0;
    if (this.moving) {
      this.walkT += dt * (this.running ? 16 : 10);
      const swing = this.running ? 1.1 : 0.6;
      m.legL.rotation.x = Math.sin(this.walkT) * swing;
      m.legR.rotation.x = -Math.sin(this.walkT) * swing;
      m.armL.rotation.x = -Math.sin(this.walkT) * swing;
      m.armR.rotation.x = Math.sin(this.walkT) * swing;
      g.position.y = Math.abs(Math.sin(this.walkT)) * (this.running ? 0.3 : 0.12);
      m.body.rotation.x = this.running ? 0.3 : 0;
    } else {
      m.legL.rotation.x = m.legR.rotation.x = 0;
      m.armL.rotation.x = m.armR.rotation.x = 0;
      m.body.rotation.x = 0;
      // Idle stress breathing (squash & stretch).
      m.body.scale.y = 1 + Math.sin(performance.now() / 300) * 0.04;
    }
  }
};

// Treats and yarn balls the player throws. The cat reads these lists.
LCW.Items = class {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.treats = [];
    this.yarns = [];
  }

  throwTreat(from, to) {
    const g = new THREE.Group();
    const body = LCW.models.mesh(new THREE.SphereGeometry(0.22, 10, 8), 0xff9f80);
    body.scale.set(1.6, 0.8, 0.8);
    const tail = LCW.models.mesh(new THREE.ConeGeometry(0.16, 0.25, 4), 0xff9f80);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.42;
    g.add(body, tail);
    g.position.copy(from);
    this.scene.add(g);
    this.treats.push({ mesh: g, from: from.clone(), to: to.clone(), t: 0, landed: false, eaten: false, life: 25 });
  }

  rollYarn(from, dir) {
    const g = new THREE.Group();
    const ball = LCW.models.mesh(new THREE.SphereGeometry(0.32, 14, 10), 0xff5e8a);
    g.add(ball);
    for (let i = 0; i < 3; i++) {
      const wrap = LCW.models.mesh(new THREE.TorusGeometry(0.32, 0.03, 4, 16), 0xd63c6a);
      wrap.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.add(wrap);
    }
    g.position.set(from.x, 0.32, from.z);
    this.scene.add(g);
    this.yarns.push({ mesh: g, vel: dir.clone().setY(0).normalize().multiplyScalar(17), life: 20 });
  }

  update(dt) {
    for (let i = this.treats.length - 1; i >= 0; i--) {
      const tr = this.treats[i];
      if (!tr.landed) {
        tr.t = Math.min(1, tr.t + dt * 2);
        tr.mesh.position.lerpVectors(tr.from, tr.to, tr.t);
        tr.mesh.position.y = 0.15 + Math.sin(tr.t * Math.PI) * 3;
        tr.mesh.rotation.z += dt * 12;
        if (tr.t >= 1) {
          tr.landed = true;
          tr.mesh.rotation.z = 0;
          LCW.ui.bubble(tr.mesh.position, '🐟', { cls: 'plain', height: 0.6, life: 0.9 });
        }
      } else {
        tr.life -= dt;
        tr.mesh.position.y = 0.15 + Math.abs(Math.sin(performance.now() / 250)) * 0.08;
      }
      if (tr.eaten || tr.life <= 0) {
        this.scene.remove(tr.mesh);
        this.treats.splice(i, 1);
      }
    }
    for (let i = this.yarns.length - 1; i >= 0; i--) {
      const y = this.yarns[i];
      const p = y.mesh.position;
      const before = p.clone();
      p.addScaledVector(y.vel, dt);
      LCW.world.collide(this.world, p, 0.32);
      // Bounce off whatever pushed us back.
      const push = p.clone().sub(before.addScaledVector(y.vel, dt));
      if (push.lengthSq() > 1e-6) {
        push.setY(0).normalize();
        y.vel.addScaledVector(push, -2 * y.vel.dot(push)).multiplyScalar(0.7);
      }
      const speed = y.vel.length();
      if (speed > 0) {
        y.vel.multiplyScalar(Math.max(0, speed - 5 * dt) / speed);
        y.mesh.rotation.x += (y.vel.z * dt) / 0.32;
        y.mesh.rotation.z -= (y.vel.x * dt) / 0.32;
      }
      p.y = 0.32;
      if (speed < 0.3) y.life -= dt;
      if (y.life <= 0) {
        this.scene.remove(y.mesh);
        this.yarns.splice(i, 1);
      }
    }
  }
};
