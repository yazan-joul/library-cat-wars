// Chunky "toy" models built from primitives: students, the cat, props and signs.
window.LCW = window.LCW || {};

LCW.models = (() => {
  const matCache = {};

  function mat(color, opts) {
    if (opts) return new THREE.MeshToonMaterial({ color, ...opts });
    if (!matCache[color]) matCache[color] = new THREE.MeshToonMaterial({ color });
    return matCache[color];
  }

  function mesh(geo, color, opts) {
    const m = new THREE.Mesh(geo, mat(color, opts));
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const SHIRTS = [0x4f8cff, 0xff6f91, 0x5cc96b, 0xffc93c, 0x9b6bff, 0x2fb8c4, 0xff8a3d];
  const SKINS = [0xffd9b3, 0xf1c27d, 0xc68642, 0x8d5524, 0xffe0bd];
  const HAIRS = [0x2b1d14, 0x5a3825, 0xd9a441, 0x111111, 0xa0522d];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function limb(w, h, color) {
    const pivot = new THREE.Group();
    const m = mesh(new THREE.BoxGeometry(w, h, w), color);
    m.position.y = -h / 2;
    pivot.add(m);
    return pivot;
  }

  // A student facing +z. Returns the group plus its animatable parts.
  function student(shirt = pick(SHIRTS)) {
    const skin = pick(SKINS);
    const g = new THREE.Group();
    const body = mesh(new THREE.CapsuleGeometry(0.45, 0.55, 4, 10), shirt);
    body.position.y = 1.05;
    const head = new THREE.Group();
    head.position.y = 1.9;
    head.add(mesh(new THREE.SphereGeometry(0.4, 16, 12), skin));
    const hair = mesh(new THREE.SphereGeometry(0.43, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), pick(HAIRS));
    hair.rotation.x = -0.25;
    head.add(hair);
    for (const s of [-1, 1]) {
      const eye = mesh(new THREE.SphereGeometry(0.06, 8, 6), 0x111111);
      eye.position.set(s * 0.14, 0.05, 0.36);
      head.add(eye);
    }
    const armL = limb(0.2, 0.7, shirt), armR = limb(0.2, 0.7, shirt);
    armL.position.set(-0.58, 1.45, 0);
    armR.position.set(0.58, 1.45, 0);
    const legL = limb(0.24, 0.6, 0x34495e), legR = limb(0.24, 0.6, 0x34495e);
    legL.position.set(-0.2, 0.6, 0);
    legR.position.set(0.2, 0.6, 0);
    g.add(body, head, armL, armR, legL, legR);
    return { group: g, body, head, armL, armR, legL, legR };
  }

  const CAT_COATS = {
    tabby: { fur: 0xff8a3d, stripe: 0xc75a1a, cream: 0xffe2c2, eye: 0x9be564 },
    black: { fur: 0x2e2a33, stripe: 0x17151a, cream: 0x4a4452, eye: 0xffd23f },
    gray: { fur: 0xa9b0bb, stripe: 0x6f7784, cream: 0xffffff, eye: 0x5ec8ff },
  };

  // A cat facing +z. coat: 'tabby' | 'black' | 'gray'.
  function cat(scale = 1, coat = 'tabby') {
    const c = CAT_COATS[coat] || CAT_COATS.tabby;
    const ORANGE = c.fur, STRIPE = c.stripe, CREAM = c.cream;
    const g = new THREE.Group();
    const inner = new THREE.Group(); // squash & stretch target
    g.add(inner);
    const body = mesh(new THREE.SphereGeometry(0.5, 16, 12), ORANGE);
    body.scale.set(1, 0.85, 1.6);
    body.position.y = 0.6;
    inner.add(body);
    for (let i = 0; i < 3; i++) {
      const s = mesh(new THREE.TorusGeometry(0.43, 0.06, 6, 16, Math.PI), STRIPE);
      s.position.set(0, 0.6, -0.4 + i * 0.3);
      s.scale.set(1.15, 1, 1);
      inner.add(s);
    }
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0.75);
    head.add(mesh(new THREE.SphereGeometry(0.42, 16, 12), ORANGE));
    const muzzle = mesh(new THREE.SphereGeometry(0.2, 12, 8), CREAM);
    muzzle.position.set(0, -0.1, 0.3);
    muzzle.scale.set(1.3, 0.8, 0.8);
    head.add(muzzle);
    const nose = mesh(new THREE.SphereGeometry(0.06, 8, 6), 0xff5e8a);
    nose.position.set(0, -0.03, 0.46);
    head.add(nose);
    const ears = [];
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.15, 0.32, 4), ORANGE);
      ear.position.set(s * 0.24, 0.38, 0);
      ear.rotation.z = -s * 0.25;
      head.add(ear);
      ears.push(ear);
      const eye = mesh(new THREE.SphereGeometry(0.09, 10, 8), c.eye);
      eye.position.set(s * 0.15, 0.08, 0.34);
      head.add(eye);
      const pupil = mesh(new THREE.SphereGeometry(0.05, 8, 6), 0x111111);
      pupil.position.set(s * 0.15, 0.08, 0.41);
      pupil.scale.set(0.5, 1.2, 1);
      head.add(pupil);
    }
    inner.add(head);
    const tail = new THREE.Group();
    tail.position.set(0, 0.75, -0.75);
    const tailMesh = mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 8), ORANGE);
    tailMesh.position.y = 0.55;
    tail.add(tailMesh);
    const tip = mesh(new THREE.SphereGeometry(0.1, 8, 6), STRIPE);
    tip.position.y = 1.1;
    tail.add(tip);
    tail.rotation.x = -0.6;
    inner.add(tail);
    const legs = [];
    for (const [x, z] of [[-0.25, 0.45], [0.25, 0.45], [-0.25, -0.45], [0.25, -0.45]]) {
      const leg = limb(0.16, 0.4, ORANGE);
      leg.position.set(x, 0.4, z);
      inner.add(leg);
      legs.push(leg);
    }
    const mouth = new THREE.Group(); // where stolen snacks go
    mouth.position.set(0, -0.2, 0.5);
    head.add(mouth);
    g.scale.setScalar(scale);
    return { group: g, inner, head, tail, legs, ears, mouth };
  }

  function sandwich() {
    const g = new THREE.Group();
    const bread = mesh(new THREE.BoxGeometry(0.5, 0.08, 0.35), 0xf3c77b);
    const filling = mesh(new THREE.BoxGeometry(0.52, 0.06, 0.37), 0x5cc96b);
    const top = bread.clone();
    filling.position.y = 0.07;
    top.position.y = 0.14;
    g.add(bread, filling, top);
    return g;
  }

  function book(color = pick([0xe74c3c, 0x3498db, 0x27ae60, 0xf1c40f, 0x9b59b6, 0xe67e22])) {
    return mesh(new THREE.BoxGeometry(0.6, 0.14, 0.45), color);
  }

  // Flat sign with text drawn on a canvas (handles Hebrew right-to-left fine).
  function sign(lines, w, h, bg = '#fff7e8', fg = '#2b1d14', px = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round(1024 * (h / w));
    const c = canvas.getContext('2d');
    c.fillStyle = bg;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = fg;
    c.lineWidth = 16;
    c.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    c.fillStyle = fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${px}px "Trebuchet MS", Arial, sans-serif`;
    lines.forEach((line, i) => {
      c.fillText(line, canvas.width / 2, canvas.height * ((i + 1) / (lines.length + 1)));
    });
    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  }

  return { mat, mesh, student, cat, sandwich, book, sign, pick, SHIRTS };
})();
