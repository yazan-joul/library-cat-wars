// The glass "aquarium" library: room, furniture, NPC students and the librarian.
window.LCW = window.LCW || {};

LCW.world = (() => {
  const M = LCW.models;
  const ROOM = { minX: -30, maxX: 30, minZ: -20, maxZ: 20 };
  const TABLE_R = 2.1, TABLE_H = 1.35, DESK_H = 1.25;
  const MY_TABLE = 4;

  function floorTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#f3e6cf';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#ead8b8';
    g.fillRect(0, 0, 128, 128);
    g.fillRect(128, 128, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(15, 10);
    return tex;
  }

  function addBox(parent, w, h, d, color, x, y, z) {
    const m = M.mesh(new THREE.BoxGeometry(w, h, d), color);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function seatStudent(scene, x, z, faceX, faceZ, shirt) {
    const s = M.student(shirt);
    s.legL.rotation.x = s.legR.rotation.x = -Math.PI / 2;
    s.armL.rotation.x = s.armR.rotation.x = -1.1;
    const rotY = Math.atan2(faceX - x, faceZ - z);
    s.group.position.set(x, 0.15, z);
    s.group.rotation.y = rotY;
    scene.add(s.group);
    return {
      model: s, x, z,
      home: { x, z, rotY },
      stress: Math.random() * 0.2,
      state: 'sit',
      timer: 0,
      frozen: 0,
      phase: Math.random() * 10,
      chaseCooldown: 0,
    };
  }

  function chair(scene, x, z, rotY) {
    const g = new THREE.Group();
    addBox(g, 0.9, 0.12, 0.9, 0xb5651d, 0, 0.7, 0);
    addBox(g, 0.9, 0.9, 0.12, 0xb5651d, 0, 1.15, -0.42);
    const leg = M.mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), 0x555555);
    leg.position.y = 0.35;
    g.add(leg);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
  }

  function laptop(parent, x, z, rotY, screenColor = 0x9fe3f0) {
    const g = new THREE.Group();
    addBox(g, 0.8, 0.05, 0.55, 0x8a8f98, 0, 0, 0);
    const screenMat = new THREE.MeshBasicMaterial({ color: screenColor });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.04), [
      M.mat(0x8a8f98), M.mat(0x8a8f98), M.mat(0x8a8f98), M.mat(0x8a8f98), screenMat, M.mat(0x8a8f98),
    ]);
    lid.position.set(0, 0.28, -0.28);
    lid.rotation.x = -0.25;
    lid.castShadow = true;
    g.add(lid);
    g.position.set(x, TABLE_H + 0.03, z);
    g.rotation.y = rotY;
    parent.add(g);
    return { group: g, screenMat };
  }

  function build(scene) {
    const world = {
      ROOM, MY_TABLE,
      tables: [], desks: [], students: [], screens: [],
      circles: [], boxes: [],
      entrance: new THREE.Vector3(0, 0, 24),
    };

    // ---------- Lights ----------
    world.hemi = new THREE.HemisphereLight(0xfff8ec, 0xb09a80, 0.72);
    scene.add(world.hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 0.5);
    sun.position.set(18, 45, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 1, far: 120 });
    scene.add(sun);
    world.sun = sun;
    scene.background = new THREE.Color(0xbfe9ef);
    scene.fog = new THREE.Fog(0xbfe9ef, 70, 140);

    // ---------- Outside: grass, Jerusalem stone, pines ----------
    const grass = M.mesh(new THREE.PlaneGeometry(400, 400), 0xb7d98b);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.05;
    scene.add(grass);
    const path = M.mesh(new THREE.PlaneGeometry(8, 30), 0xe8d8b0);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, -0.03, 35);
    scene.add(path);
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 42 + Math.random() * 35;
      const x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r;
      if (Math.abs(x) < 6 && z > 0) continue;
      const tree = new THREE.Group();
      const trunk = M.mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.5, 6), 0x7a4a24);
      trunk.position.y = 1.25;
      const crown = M.mesh(new THREE.ConeGeometry(2.2, 6, 7), 0x3f8f4a);
      crown.position.y = 5;
      tree.add(trunk, crown);
      tree.position.set(x, 0, z);
      tree.scale.setScalar(0.8 + Math.random() * 0.7);
      scene.add(tree);
    }
    for (const [x, z, w, h, d] of [[-60, -45, 30, 12, 14], [-15, -55, 40, 18, 12], [40, -50, 30, 14, 16], [70, 0, 14, 10, 30], [-70, 10, 14, 9, 30]]) {
      addBox(scene, w, h, d, 0xe8d8b0, x, h / 2, z);
      addBox(scene, w + 0.6, 0.8, d + 0.6, 0xd4c08f, x, h + 0.4, z);
    }

    // ---------- Floor + rug ----------
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM.maxX - ROOM.minX, ROOM.maxZ - ROOM.minZ),
      new THREE.MeshLambertMaterial({ map: floorTexture() }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    world.floor = floor;
    const rug = M.mesh(new THREE.CircleGeometry(1, 48), 0xc94f4f);
    rug.rotation.x = -Math.PI / 2;
    rug.scale.set(17, 10.5, 1);
    rug.position.y = 0.01;
    scene.add(rug);
    const rugInner = M.mesh(new THREE.CircleGeometry(1, 48), 0xe0735f);
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.scale.set(15.8, 9.4, 1);
    rugInner.position.y = 0.015;
    scene.add(rugInner);

    // ---------- Glass walls, mullions, very tall pillars ----------
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x9fe3f0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, roughness: 0.1,
    });
    const glass = (w, h, x, y, z, rotY) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
      p.position.set(x, y, z);
      p.rotation.y = rotY;
      scene.add(p);
    };
    const WALL_H = 18;
    glass(60, WALL_H, 0, WALL_H / 2, ROOM.minZ, 0);
    glass(40, WALL_H, ROOM.minX, WALL_H / 2, 0, Math.PI / 2);
    glass(40, WALL_H, ROOM.maxX, WALL_H / 2, 0, Math.PI / 2);
    // South wall is a low glass railing (camera cutaway) with an entrance gap.
    glass(26, 1.6, -17, 0.8, ROOM.maxZ, 0);
    glass(26, 1.6, 17, 0.8, ROOM.maxZ, 0);
    const FRAME = 0x2f6f7a;
    for (let x = -30; x <= 30; x += 5) addBox(scene, 0.18, WALL_H, 0.18, FRAME, x, WALL_H / 2, ROOM.minZ);
    for (let z = -20; z <= 20; z += 5) {
      addBox(scene, 0.18, WALL_H, 0.18, FRAME, ROOM.minX, WALL_H / 2, z);
      addBox(scene, 0.18, WALL_H, 0.18, FRAME, ROOM.maxX, WALL_H / 2, z);
    }
    for (const x of [-30, -4, 4, 30]) addBox(scene, 0.2, 1.7, 0.2, FRAME, x, 0.85, ROOM.maxZ);
    addBox(scene, 26, 0.12, 0.2, FRAME, -17, 1.6, ROOM.maxZ);
    addBox(scene, 26, 0.12, 0.2, FRAME, 17, 1.6, ROOM.maxZ);
    for (const y of [6, 12, WALL_H]) {
      addBox(scene, 60, 0.15, 0.2, FRAME, 0, y, ROOM.minZ);
      addBox(scene, 0.2, 0.15, 40, FRAME, ROOM.minX, y, 0);
      addBox(scene, 0.2, 0.15, 40, FRAME, ROOM.maxX, y, 0);
    }
    const pillarGeo = new THREE.CylinderGeometry(0.7, 0.8, 60, 12);
    for (const [x, z] of [[-30, -20], [-10, -20], [10, -20], [30, -20], [-30, -5], [30, -5], [-30, 8], [30, 8]]) {
      const p = M.mesh(pillarGeo, 0xe8dcc2);
      p.position.set(x, 30, z);
      scene.add(p);
    }

    // ---------- Banner + quiet signs ----------
    const banner = M.sign(['תקופת מבחנים', 'EXAM SEASON · GOOD LUCK!'], 16, 4, '#ff8a3d', '#ffffff', 110);
    banner.position.set(0, 11, ROOM.minZ + 0.3);
    scene.add(banner);
    const huji = M.sign(['האוניברסיטה העברית בירושלים', 'The Hebrew University of Jerusalem'], 10, 2, '#2f6f7a', '#ffffff', 70);
    huji.position.set(0, 2.5, ROOM.maxZ + 0.6);
    scene.add(huji);

    // ---------- Bookshelves along the north wall ----------
    world.shelves = [];
    for (const x of [-12, -6, 6, 12]) {
      const shelf = new THREE.Group();
      addBox(shelf, 5, 3.4, 1, 0x8b5a2b, 0, 1.7, 0);
      for (let row = 0; row < 3; row++) {
        let bx = -2.2;
        while (bx < 2.1) {
          const bw = 0.2 + Math.random() * 0.2, bh = 0.6 + Math.random() * 0.3;
          addBox(shelf, bw, bh, 0.7, M.pick([0xe74c3c, 0x3498db, 0x27ae60, 0xf1c40f, 0x9b59b6, 0xe67e22]), bx + bw / 2, 0.35 + row * 1.05 + bh / 2, 0.2);
          bx += bw + 0.03;
        }
      }
      shelf.position.set(x, 0, ROOM.minZ + 1.2);
      scene.add(shelf);
      world.shelves.push({ x, z: ROOM.minZ + 1.2 });
      world.boxes.push({ minX: x - 2.5, maxX: x + 2.5, minZ: ROOM.minZ, maxZ: ROOM.minZ + 1.8 });
    }

    // ---------- Librarian desk ----------
    const lx = -22, lz = -15;
    addBox(scene, 5, 1.3, 1.4, 0x6b3e1f, lx, 0.65, lz);
    addBox(scene, 5.2, 0.12, 1.6, 0x8b5a2b, lx, 1.36, lz);
    const quiet = M.sign(['!שקט', 'QUIET PLEASE'], 3.2, 1.1, '#ffffff', '#c0392b', 150);
    quiet.position.set(lx, 0.7, lz + 0.72);
    scene.add(quiet);
    const lib = M.student(0x7f8c8d);
    lib.group.position.set(lx, 0, lz - 1.5);
    const glasses = M.mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 12), 0x111111);
    glasses.position.set(-0.14, 0.05, 0.38);
    const glasses2 = glasses.clone();
    glasses2.position.x = 0.14;
    lib.head.add(glasses, glasses2);
    const bun = M.mesh(new THREE.SphereGeometry(0.22, 10, 8), 0xbdc3c7);
    bun.position.set(0, 0.4, -0.2);
    lib.head.add(bun);
    scene.add(lib.group);
    world.librarian = lib;
    world.boxes.push({ minX: lx - 2.7, maxX: lx + 2.7, minZ: ROOM.minZ, maxZ: lz + 0.8 });

    // ---------- Snack machine ----------
    const sx = 23, sz = -17.8;
    addBox(scene, 2.6, 3.6, 1.4, 0xe74c3c, sx, 1.8, sz);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ color: 0xbfefff }));
    front.position.set(sx - 0.3, 2.2, sz + 0.71);
    scene.add(front);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      addBox(scene, 0.35, 0.3, 0.1, M.pick([0xffc93c, 0x5cc96b, 0xff6f91, 0x9b6bff]), sx - 0.8 + c * 0.5, 1.4 + r * 0.5, sz + 0.75);
    }
    const snackSign = M.sign(['SNACKS'], 2.6, 0.6, '#ffc93c', '#2b1d14', 220);
    snackSign.position.set(sx, 3.9, sz + 0.72);
    scene.add(snackSign);
    world.snackMachine = new THREE.Vector3(sx, 0, sz + 1.6);
    world.boxes.push({ minX: sx - 1.3, maxX: sx + 1.3, minZ: ROOM.minZ, maxZ: sz + 0.7 });

    // ---------- Round study tables ----------
    const tablePos = [[-11, -5], [0, -5], [11, -5], [-11, 6], [0, 6], [11, 6]];
    tablePos.forEach(([x, z], i) => {
      const t = { x, z, r: TABLE_R, students: [], snack: null, laptops: [], index: i, isMine: i === MY_TABLE };
      const top = M.mesh(new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.14, 32), 0xd9a066);
      top.position.set(x, TABLE_H, z);
      const stem = M.mesh(new THREE.CylinderGeometry(0.25, 0.25, TABLE_H, 8), 0x555555);
      stem.position.set(x, TABLE_H / 2, z);
      const foot = M.mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16), 0x555555);
      foot.position.set(x, 0.05, z);
      scene.add(top, stem, foot);
      world.circles.push({ x, z, r: TABLE_R + 0.2 });

      // Book stack: the cat's favorite nap spot.
      const books = new THREE.Group();
      for (let b = 0; b < 4; b++) {
        const bk = M.book();
        bk.position.y = b * 0.14;
        bk.rotation.y = (Math.random() - 0.5) * 0.6;
        books.add(bk);
      }
      books.position.set(x + 0.6, TABLE_H + 0.12, z - 0.5);
      scene.add(books);
      t.books = books;
      t.booksPos = new THREE.Vector3(x + 0.6, 0, z - 0.5);

      const cup = M.mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 10), 0xffffff);
      cup.position.set(x - 0.7, TABLE_H + 0.22, z + 0.2);
      scene.add(cup);

      const seats = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      seats.forEach((a, si) => {
        const cx = x + Math.sin(a) * 2.75, cz = z + Math.cos(a) * 2.75;
        const lx2 = x + Math.sin(a) * 1.4, lz2 = z + Math.cos(a) * 1.4;
        if (t.isMine && si === 0) {
          // Player's seat (south side). Laptop + glowing ring.
          const lap = laptop(scene, lx2, lz2, Math.PI);
          t.myLaptop = lap;
          world.mySeat = { x: x, z: z + 3.1, table: t, laptop: lap, laptopPos: new THREE.Vector3(lx2, 0, lz2) };
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.75, 1.0, 32),
            new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.set(x, 0.03, z + 3.1);
          scene.add(ring);
          world.seatRing = ring;
          return;
        }
        if (Math.random() < 0.25 && !(si === 2)) return; // some empty chairs
        chair(scene, cx, cz, Math.atan2(x - cx, z - cz));
        const st = seatStudent(scene, cx, cz, x, z);
        st.table = t;
        t.students.push(st);
        world.students.push(st);
        world.circles.push({ x: cx, z: cz, r: 0.6 });
        t.laptops.push(laptop(scene, lx2, lz2, Math.atan2(cx - x, cz - z) + Math.PI));
      });

      const snack = M.sandwich();
      snack.position.set(x - 0.4, TABLE_H + 0.08, z - 0.9);
      scene.add(snack);
      t.snack = snack;
      t.snackHome = snack.position.clone();
      world.tables.push(t);
    });

    // ---------- Computer desks along the side walls ----------
    for (const side of [-1, 1]) {
      for (const z of [-12, -6, 0, 6, 12]) {
        const x = side * 27.3;
        addBox(scene, 1.6, 0.12, 2.4, 0xd9a066, x, DESK_H, z);
        addBox(scene, 1.4, DESK_H, 0.12, 0x8b5a2b, x, DESK_H / 2, z - 1.1);
        addBox(scene, 1.4, DESK_H, 0.12, 0x8b5a2b, x, DESK_H / 2, z + 1.1);
        const monitor = new THREE.Group();
        addBox(monitor, 0.15, 1.0, 1.6, 0x2c3e50, 0, 0.6, 0);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x7fd8ff });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.85), screenMat);
        screen.position.set(-side * 0.09, 0.6, 0);
        screen.rotation.y = -side * Math.PI / 2;
        monitor.add(screen);
        addBox(monitor, 0.1, 0.3, 0.1, 0x2c3e50, 0, 0.1, 0);
        monitor.position.set(x + side * 0.45, DESK_H + 0.05, z);
        scene.add(monitor);
        const kb = addBox(scene, 0.4, 0.06, 1.1, 0x34495e, x - side * 0.25, DESK_H + 0.09, z);
        const cx = x - side * 1.9;
        chair(scene, cx, z, Math.atan2(x - cx, 0));
        const st = seatStudent(scene, cx, z, x, z);
        const desk = { x, z, side, screenMat, plugged: true, unplugTimer: 0, student: st, keyboard: kb, monitor };
        st.desk = desk;
        world.students.push(st);
        world.desks.push(desk);
        world.screens.push(screenMat);
        world.boxes.push({ minX: x - 0.8, maxX: x + 0.8, minZ: z - 1.2, maxZ: z + 1.2 });
        world.circles.push({ x: cx, z, r: 0.6 });
      }
    }
    world.tables.forEach((t) => t.laptops.forEach((l) => world.screens.push(l.screenMat)));
    world.screens.push(world.mySeat.laptop.screenMat);
    world.screens.forEach((s) => (s.userData.base = s.color.getHex()));

    return world;
  }

  // Height of whatever the cat is standing on (it hops onto tables and desks).
  function surfaceHeight(world, x, z) {
    for (const t of world.tables) {
      if ((x - t.x) ** 2 + (z - t.z) ** 2 < t.r * t.r) return TABLE_H + 0.07;
    }
    for (const d of world.desks) {
      if (Math.abs(x - d.x) < 0.8 && Math.abs(z - d.z) < 1.2) return DESK_H + 0.06;
    }
    return 0;
  }

  // Push a circle (x, z, radius) out of furniture and keep it in the room.
  function collide(world, p, radius) {
    for (const c of world.circles) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min && d > 0.0001) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    for (const b of world.boxes) {
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < radius) {
        if (d > 0.0001) {
          p.x = cx + (dx / d) * radius;
          p.z = cz + (dz / d) * radius;
        } else {
          p.z = b.maxZ + radius; // inside the box: pop out toward the room
        }
      }
    }
    p.x = Math.max(ROOM.minX + radius, Math.min(ROOM.maxX - radius, p.x));
    p.z = Math.max(ROOM.minZ + radius, Math.min(ROOM.maxZ - radius, p.z));
  }

  return { build, surfaceHeight, collide, TABLE_H, DESK_H };
})();
