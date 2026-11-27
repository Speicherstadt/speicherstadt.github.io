/* Warehouse windows that switch on and off, and their reflections in the canal.
   The sky itself is drawn by sky.js. */
(function () {
  var hero = document.querySelector('.hero');
  var skyline = hero && hero.querySelector('.skyline');
  if (!hero) return;

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !skyline) return; // static city
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
  }

  /* ---------- Windows and their reflections ---------- */
  var wins = [].slice.call(skyline.querySelectorAll('.win'));
  var refl = [].slice.call(skyline.querySelectorAll('.refl'));
  if (wins.length !== refl.length) refl = [];

  function set(i, on) {
    wins[i].classList.toggle('on', on);
    if (refl[i]) { refl[i].classList.toggle('on', on); refl[i].setAttribute('opacity', on ? 1 : 0); }
  }
  // each lamp breathes at its own pace instead of three shared rhythms
  // and its glow on the water breathes in step with it
  wins.forEach(function (w, i) {
    var dur = rand(5, 11).toFixed(1) + 's', delay = (-rand(0, 11)).toFixed(1) + 's';
    w.style.animationDuration = dur; w.style.animationDelay = delay;
    var gl = refl[i] && refl[i].querySelector('.gl');
    if (gl) { gl.style.animationDuration = dur; gl.style.animationDelay = delay; }
  });
  refl.forEach(function (g) {
    [].forEach.call(g.querySelectorAll('rect'), function (r) {
      r.style.animationDuration = rand(1.8, 3.6).toFixed(1) + 's';
      r.style.animationDelay = (-rand(0, 3)).toFixed(1) + 's';
    });
  });
  // somebody is watching TV in one of the warehouses
  var tv = wins.findIndex ? wins.findIndex(function (w, i) { return i > 20 && w.classList.contains('on'); }) : -1;
  if (tv > -1) {
    wins[tv].classList.add('tv');
    if (refl[tv]) { refl[tv].classList.add('tv'); refl[tv].setAttribute('fill', '#a9c1ef'); }
    var tvgl = refl[tv] && refl[tv].querySelector('.gl');
    if (tvgl) { tvgl.style.animationDuration = ''; tvgl.style.animationDelay = ''; }
    wins[tv].style.animationDuration = ''; wins[tv].style.animationDelay = '';
  }

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
