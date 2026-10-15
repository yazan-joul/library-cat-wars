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
    const score = Math.round(game.score + game.progress * 10);
    if ($('score').textContent !== String(score)) $('score').textContent = score;
    const mult = game.focusMult || 1;
    $('focus').textContent = mult > 1.05 ? `🔥x${mult.toFixed(1)}` : '';
    $('focus').classList.toggle('hot', mult >= 1.59);
    $('buff').textContent = game.buff > 0 ? `☕ ESPRESSO RUSH ${Math.ceil(game.buff)}s` : '';
    $('buff').classList.toggle('show', game.buff > 0);
    document.body.classList.toggle('panic', game.level >= 3 && game.timeLeft > 0);
  }

  function bumpScore() {
    const box = $('score').parentElement;
    box.classList.remove('bump');
    void box.offsetWidth; // restart the animation
    box.classList.add('bump');
  }

  // Edge-of-screen arrow pointing at the cat when it is off camera.
  const arrow = $('cat-arrow');
  function updateCatArrow(game, camera, playing) {
    // Point at whichever cat is raiding your laptop, else the nearest cat.
    const inside = playing ? game.cats.filter((c) => c.state !== 'outside') : [];
    const p = game.player.pos;
    const cat = inside.find((c) => c.mischief && c.mischief.type === 'mine')
      || inside.sort((a, b) => a.distanceTo(p) - b.distanceTo(p))[0];
    if (!cat) { arrow.classList.add('hidden'); return; }
    cat.model.group.getWorldPosition(tmp);
    tmp.project(camera);
    const margin = 0.88;
    if (Math.abs(tmp.x) < margin && Math.abs(tmp.y) < margin && tmp.z < 1) {
      arrow.classList.add('hidden');
      return;
    }
    let { x, y } = tmp;
    if (tmp.z > 1) { x = -x; y = -y; }
    const k = margin / Math.max(Math.abs(x), Math.abs(y), 1e-4);
    x *= k; y *= k;
    const w = window.innerWidth, h = window.innerHeight;
    arrow.classList.remove('hidden');
    arrow.classList.toggle('danger', !!(cat.mischief && cat.mischief.type === 'mine'));
    arrow.style.transform = `translate(${(x * 0.5 + 0.5) * w}px, ${(-y * 0.5 + 0.5) * h}px)`;
    const ang = Math.atan2(-y, x);
    arrow.firstElementChild.style.transform = `translate(-50%, -50%) rotate(${ang}rad) translateX(40px)`;
  }

  function confetti() {
    const box = $('confetti');
    const colors = ['#ff8a3d', '#2fb8c4', '#ff5e8a', '#5cc96b', '#ffd23f', '#9b6bff'];
    for (let i = 0; i < 140; i++) {
      const c = document.createElement('div');
      c.className = 'confetto';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2 + Math.random() * 2.5 + 's';
      c.style.animationDelay = Math.random() * 0.8 + 's';
      c.style.setProperty('--spin', (Math.random() * 1440 - 720) + 'deg');
      box.appendChild(c);
      setTimeout(() => c.remove(), 5500);
    }
  }

  return { bubble, updateBubbles, clearBubbles, banner, hint, updateHud, bumpScore, updateCatArrow, confetti, $ };
})();
