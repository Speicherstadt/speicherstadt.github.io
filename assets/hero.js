/* Night sky over the warehouses: twinkling stars, the odd shooting star,
   windows that switch on and off, and their reflections in the canal. */
(function () {
  var hero = document.querySelector('.hero');
  var canvas = hero && hero.querySelector('.sky');
  var skyline = hero && hero.querySelector('.skyline');
  if (!hero || !canvas || !canvas.getContext) return;

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d');
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ---------- Stars ---------- */
  var W = 0, H = 0, dpr = 1, stars = [], shooting = null, nextShot = 0;

  function build() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var n = Math.min(520, Math.round(W * H / 3200));
    stars = [];
    for (var i = 0; i < n; i++) {
      var bright = Math.random() < 0.05;
      stars.push({
        x: Math.random() * W,
        // a little denser towards the top, still covering the whole sky
        y: Math.pow(Math.random(), 1.25) * H,
        r: bright ? rand(1.1, 1.7) : rand(0.4, 1.05),
        a: bright ? rand(0.75, 1) : rand(0.2, 0.65),
        tw: Math.random() < 0.65 ? rand(0.35, 1.6) : 0, // twinkle speed, 0 = steady
        ph: rand(0, Math.PI * 2),
        cool: Math.random() < 0.25,                      // some bluish-white, most warm
        bright: bright
      });
    }
    if (still) draw(0);
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var k = s.tw ? 0.55 + 0.45 * Math.sin(t * s.tw + s.ph) : 1;
      var a = s.a * k;
      ctx.fillStyle = s.cool ? 'rgba(214,226,255,' + a + ')' : 'rgba(230,220,192,' + a + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.bright && k > 0.85) {
        // short sparkle cross on the brightest stars at their peak
        var len = s.r * 4.5 * (k - 0.85) / 0.15;
        ctx.strokeStyle = 'rgba(240,232,210,' + (a * 0.55) + ')';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      }
    }
    if (shooting) {
      var p = (t - shooting.t0) / shooting.dur;
      if (p >= 1) { shooting = null; }
      else {
        var hx = shooting.x + shooting.dx * p, hy = shooting.y + shooting.dy * p;
        var tail = 0.22;
        var tx = hx - shooting.dx * tail, ty = hy - shooting.dy * tail;
        var fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
        var g = ctx.createLinearGradient(tx, ty, hx, hy);
        g.addColorStop(0, 'rgba(243,196,106,0)');
        g.addColorStop(1, 'rgba(255,244,220,' + (0.9 * fade) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      }
    }
  }

  function launch(t) {
    var fromLeft = Math.random() < 0.5;
    var len = rand(220, 380);
    shooting = {
      t0: t, dur: rand(0.8, 1.2),
      x: fromLeft ? rand(W * 0.05, W * 0.5) : rand(W * 0.5, W * 0.95),
      y: rand(H * 0.03, H * 0.3),
      dx: (fromLeft ? 1 : -1) * len, dy: len * rand(0.3, 0.5)
    };
  }

  var visible = true, last = 0;
  function frame(ms) {
    var t = ms / 1000;
    if (visible && ms - last > 33) { // ~30 fps is plenty for a twinkle
      last = ms;
      if (!shooting && t > nextShot) { launch(t); nextShot = t + rand(9, 20); }
      draw(t);
    }
    requestAnimationFrame(frame);
  }

  build();
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 150); });

  if (still) return; // static sky, static city

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
  }
  nextShot = 3.5; // first one soon after the page opens
  requestAnimationFrame(frame);

  /* ---------- Windows and their reflections ---------- */
  if (!skyline) return;
  var wins = [].slice.call(skyline.querySelectorAll('.win'));
  var refl = [].slice.call(skyline.querySelectorAll('.refl'));
  if (wins.length !== refl.length) refl = [];

  function set(i, on) {
    wins[i].classList.toggle('on', on);
    if (refl[i]) refl[i].classList.toggle('on', on);
  }
  // each lamp breathes at its own pace instead of three shared rhythms
  wins.forEach(function (w) {
    w.style.animationDuration = rand(5, 11).toFixed(1) + 's';
    w.style.animationDelay = (-rand(0, 11)).toFixed(1) + 's';
  });
  refl.forEach(function (g) {
    [].forEach.call(g.children, function (r) {
      r.style.animationDuration = rand(1.8, 3.6).toFixed(1) + 's';
      r.style.animationDelay = (-rand(0, 3)).toFixed(1) + 's';
    });
  });
  // somebody is watching TV in one of the warehouses
  var tv = wins.findIndex ? wins.findIndex(function (w, i) { return i > 20 && w.classList.contains('on'); }) : -1;
  if (tv > -1) { wins[tv].classList.add('tv'); if (refl[tv]) refl[tv].classList.add('tv'); }

  var lit = wins.filter(function (w) { return w.classList.contains('on'); }).length;
  setInterval(function () {
    if (!visible || document.hidden) return;
    var i = Math.floor(Math.random() * wins.length);
    if (i === tv) return;
    var on = wins[i].classList.contains('on');
    // keep roughly the same number of lights burning
    if (on && lit <= 15) return;
    if (!on && lit >= 26) return;
    set(i, !on); lit += on ? -1 : 1;
  }, 2200);
})();
