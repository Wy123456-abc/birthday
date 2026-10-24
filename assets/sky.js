/* Sky: stars, petals, drifting motes, shooting stars, bursts */
(function () {
  var canvas = document.getElementById('skyCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1;
  var stars = [], dust = [], petals = [], bursts = [], shoots = [];
  var pointer = { x: 0.5, y: 0.5, cx: 0.5, cy: 0.5 };
  var lastShoot = performance.now() - 4200;
  var nextShoot = 5200;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    var count = Math.max(70, Math.min(170, Math.round(W / 9)));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.35, 1.5),
        a: rand(0.2, 0.9),
        tw: rand(0.5, 1.7),
        ph: rand(0, Math.PI * 2),
        depth: rand(0.3, 1.7),
        vx: rand(-0.015, 0.015)
      });
    }
    dust = [];
    var dCount = W < 700 ? 22 : 42;
    for (var j = 0; j < dCount; j++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.7, 2.1),
        v: rand(0.08, 0.32),
        sway: rand(0.3, 0.9),
        ph: rand(0, Math.PI * 2),
        o: rand(0.15, 0.55),
        warm: Math.random() > 0.42
      });
    }

    var petalColors = [
      ['#ffd9e8', '#f2a2c2'],
      ['#ffe8c2', '#f2b979'],
      ['#e9dcff', '#bfa3e0']
    ];
    petals = [];
    var pCount = W < 700 ? 13 : 24;
    for (var k = 0; k < pCount; k++) {
      petals.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(2.4, 5.4),
        v: rand(0.16, 0.52),
        sway: rand(14, 42),
        ph: rand(0, Math.PI * 2),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.004, 0.006),
        o: rand(0.26, 0.62),
        c: petalColors[Math.floor(Math.random() * petalColors.length)]
      });
    }
  }

  function spawnShoot() {
    shoots.push({
      x: rand(W * 0.1, W * 0.9),
      y: rand(0, H * 0.45),
      vx: rand(4.6, 8.4),
      vy: rand(1.4, 2.8),
      life: 1,
      len: rand(70, 150)
    });
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    pointer.cx += (pointer.x - pointer.cx) * 0.045;
    pointer.cy += (pointer.y - pointer.cy) * 0.045;
    var ox = (pointer.cx - 0.5) * 22;
    var oy = (pointer.cy - 0.5) * 14;

    // stars
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var x = ((s.x + s.vx * now * 0.02 + ox * s.depth) % W + W) % W;
      var y = (s.y + oy * s.depth) % H;
      var tw = 0.5 + 0.5 * Math.sin(now * 0.001 * s.tw + s.ph);
      ctx.globalAlpha = s.a * (0.32 + tw * 0.68);
      ctx.fillStyle = i % 7 === 0 ? '#9df3e7' : '#fff6df';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // falling petals
    for (var pi = 0; pi < petals.length; pi++) {
      var p = petals[pi];
      p.y += p.v;
      p.rot += p.vr;
      if (p.y > H + 26) {
        p.y = -26;
        p.x = Math.random() * W;
      }
      var px = p.x + Math.sin(now * 0.00045 + p.ph) * p.sway;
      ctx.save();
      ctx.globalAlpha = p.o;
      ctx.translate(px, p.y);
      ctx.rotate(p.rot + Math.sin(now * 0.0008 + p.ph) * 0.5);
      ctx.scale(1, 0.55 + 0.18 * Math.sin(now * 0.0011 + p.ph));
      ctx.fillStyle = p.c[1];
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.c[0];
      ctx.globalAlpha = p.o * 0.45;
      ctx.beginPath();
      ctx.ellipse(-p.r * 0.18, -p.r * 0.12, p.r * 0.52, p.r * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // drifting golden dust
    for (var j = 0; j < dust.length; j++) {
      var d = dust[j];
      d.y -= d.v;
      if (d.y < -20) { d.y = H + 20; d.x = Math.random() * W; }
      var dx = d.x + Math.sin(now * 0.0007 + d.ph) * 18 * d.sway;
      var glow = d.warm ? '255,214,135' : '121,231,218';
      ctx.globalAlpha = d.o * (0.6 + 0.4 * Math.sin(now * 0.001 + d.ph));
      var grd = ctx.createRadialGradient(dx, d.y, 0, dx, d.y, d.r * 5.5);
      grd.addColorStop(0, 'rgba(' + glow + ',.85)');
      grd.addColorStop(1, 'rgba(' + glow + ',0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(dx, d.y, d.r * 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // shooting stars
    if (!reduced && now - lastShoot > nextShoot) {
      lastShoot = now;
      nextShoot = rand(6500, 12000);
      spawnShoot();
    }
    for (var k = shoots.length - 1; k >= 0; k--) {
      var sh = shoots[k];
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= 0.012;
      if (sh.life <= 0) { shoots.splice(k, 1); continue; }
      var ex = sh.x - sh.vx * (sh.len / 7);
      var ey = sh.y - sh.vy * (sh.len / 7);
      var lg = ctx.createLinearGradient(sh.x, sh.y, ex, ey);
      lg.addColorStop(0, 'rgba(255,248,225,' + sh.life + ')');
      lg.addColorStop(0.4, 'rgba(255,214,135,' + sh.life * 0.45 + ')');
      lg.addColorStop(1, 'rgba(255,214,135,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // click bursts
    for (var b = bursts.length - 1; b >= 0; b--) {
      var p = bursts[b];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.018;
      p.life -= p.decay;
      if (p.life <= 0) { bursts.splice(b, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX / W;
    pointer.y = e.clientY / H;
  }, { passive: true });

  window.SkyFX = {
    burst: function (x, y, n) {
      n = n || 28;
      var palette = ['#fff5d7', '#ffd27d', '#ffb95e', '#9df3e7'];
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * Math.PI * 2;
        var sp = rand(1.2, 5.6);
        bursts.push({
          x: x,
          y: y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 0.6,
          size: rand(1.2, 3.2),
          color: palette[Math.floor(Math.random() * palette.length)],
          life: 1,
          decay: rand(0.008, 0.02)
        });
      }
    }
  };

  resize();
  requestAnimationFrame(draw);
})();
