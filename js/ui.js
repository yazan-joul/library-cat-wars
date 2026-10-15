// HUD meters, the event banner, hints and floating speech bubbles anchored to 3D objects.
window.LCW = window.LCW || {};

LCW.ui = (() => {
  const $ = (id) => document.getElementById(id);
  const layer = $('bubbles');
  const bubbles = [];
  const tmp = new THREE.Vector3();
  let bannerTimer = 0;
  let hintText = '';

  // anchor: an Object3D (bubble follows it) or a Vector3 (fixed spot).
  function bubble(anchor, text, opts = {}) {
    const el = document.createElement('div');
    el.className = 'bubble ' + (opts.cls || '');
    el.textContent = text;
    layer.appendChild(el);
    bubbles.push({
      el,
      anchor,
      pos: anchor.isVector3 ? anchor.clone() : null,
      height: opts.height ?? 3,
      life: opts.life ?? 1.6,
      age: 0,
      rise: opts.rise ?? 0.6,
      dx: opts.dx ?? 0,
    });
  }

  function updateBubbles(dt, camera) {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.age += dt;
      if (b.age >= b.life) {
        b.el.remove();
        bubbles.splice(i, 1);
        continue;
      }
      if (b.pos) tmp.copy(b.pos);
      else b.anchor.getWorldPosition(tmp);
      tmp.y += b.height + b.age * b.rise;
      tmp.x += b.dx * b.age;
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const fade = Math.min(1, (b.life - b.age) * 3);
      b.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      b.el.style.opacity = fade;
    }
  }

  function clearBubbles() {
    bubbles.forEach((b) => b.el.remove());
    bubbles.length = 0;
  }

  function banner(text, seconds = 2.5) {
    $('banner').textContent = text;
    $('banner').classList.add('show');
    bannerTimer = seconds;
  }

  function hint(text) {
    if (text === hintText) return;
    hintText = text;
    $('hint').textContent = text;
    $('hint').classList.toggle('show', !!text);
  }

  function updateHud(game, dt) {
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) $('banner').classList.remove('show');
    }
    $('progress-fill').style.width = game.progress + '%';
    $('progress-text').textContent = Math.floor(game.progress) + '%';
    $('noise-fill').style.width = game.noise + '%';
    $('chaos-fill').style.width = game.chaos + '%';
    $('treats').textContent = game.player.treats;
    $('yarn').textContent = game.player.yarn;
    const t = Math.max(0, Math.ceil(game.timeLeft));
    $('timer').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    $('timer').parentElement.classList.toggle('urgent', t <= 30);
  }

  return { bubble, updateBubbles, clearBubbles, banner, hint, updateHud, $ };
})();
