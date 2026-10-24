/* Interactions: intro, reveal, ambient audio, candles, wishes */
(function () {
  var body = document.body;
  var intro = document.getElementById('intro');
  var enterBtn = document.getElementById('enterBtn');
  var topbar = document.getElementById('topbar');
  var scrollBar = document.getElementById('scrollBar');
  var cursorGlow = document.getElementById('cursorGlow');
  var flash = document.getElementById('flash');
  var toastEl = document.getElementById('toast');
  var soundToggle = document.getElementById('soundToggle');
  var soundBtnTop = document.getElementById('soundBtnTop');
  var lightBtn = document.getElementById('lightBtn');
  var heroMedia = document.getElementById('heroMedia');
  var heroSpirit = document.getElementById('heroSpirit');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var entered = false;
  var toastTimer = null;

  function toast(html, duration) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, duration || 3200);
  }

  /* ---------- chill lofi mix ---------- */
  var audio = (function () {
    var ctx = null, master = null, music = null, delay = null, noiseBuffer = null;
    var started = false, on = false;
    var timer = null, step = 0, nextTime = 0;
    var bpm = 72, stepDur = 60 / bpm / 2;

    /* Cmaj9 → Am9 → Fmaj9 → G9, warm and unhurried */
    var chords = [
      { bass: 65.41, pad: [130.81, 164.81, 196.00, 246.94, 293.66] },
      { bass: 55.00, pad: [110.00, 130.81, 164.81, 196.00, 246.94] },
      { bass: 43.65, pad: [87.31, 110.00, 130.81, 164.81, 196.00] },
      { bass: 49.00, pad: [98.00, 123.47, 146.83, 174.61, 220.00] }
    ];
    var scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
    var kickSteps = [0, 6, 8, 14, 16, 22, 24, 30];
    var snareSteps = [4, 12, 20, 28];
    var melodySteps = [2, 6, 13, 18, 22, 27, 30];

    function makeNoise(seconds) {
      var len = Math.floor(ctx.sampleRate * seconds);
      var buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    function init() {
      if (started) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();

        master = ctx.createGain();
        master.gain.value = 0.0001;
        var warm = ctx.createBiquadFilter();
        warm.type = 'lowpass';
        warm.frequency.value = 5600;
        warm.Q.value = 0.3;
        master.connect(warm);
        warm.connect(ctx.destination);

        music = ctx.createGain();
        music.gain.value = 0.92;
        music.connect(master);

        delay = ctx.createDelay(1.4);
        delay.delayTime.value = 0.42;
        var feedback = ctx.createGain();
        feedback.gain.value = 0.3;
        var wetFilter = ctx.createBiquadFilter();
        wetFilter.type = 'lowpass';
        wetFilter.frequency.value = 2300;
        var wet = ctx.createGain();
        wet.gain.value = 0.2;
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetFilter);
        wetFilter.connect(wet);
        wet.connect(music);

        noiseBuffer = makeNoise(2);

        /* vinyl hiss + dust */
        var vinyl = ctx.createBufferSource();
        vinyl.buffer = noiseBuffer;
        vinyl.loop = true;
        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 640;
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 4200;
        var vinylGain = ctx.createGain();
        vinylGain.gain.value = 0.016;
        vinyl.connect(hp);
        hp.connect(lp);
        lp.connect(vinylGain);
        vinylGain.connect(master);
        vinyl.start();

        started = true;
      } catch (err) {
        ctx = null;
      }
    }

    function playPad(chord, t) {
      chord.pad.forEach(function (f, i) {
        var o = ctx.createOscillator();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = (i - 2) * 5;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(i === 0 ? 0.022 : 0.017, t + 0.22);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
        o.connect(g);
        g.connect(music);
        var send = ctx.createGain();
        send.gain.value = 0.12;
        g.connect(send);
        send.connect(delay);
        o.start(t);
        o.stop(t + 3);
      });
    }

    function playBass(f, t, level) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level || 0.085, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
      o.connect(g);
      g.connect(music);
      o.start(t);
      o.stop(t + 1.2);

      var o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = f * 2;
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.linearRampToValueAtTime((level || 0.085) * 0.28, t + 0.03);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o2.connect(g2);
      g2.connect(music);
      o2.start(t);
      o2.stop(t + 0.8);
    }

    function playKeys(f, t) {
      [['triangle', 1, 0.034], ['sine', 2, 0.012]].forEach(function (v) {
        var o = ctx.createOscillator();
        o.type = v[0];
        o.frequency.value = f * v[1];
        o.detune.value = Math.random() * 4 - 2;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v[2], t + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
        o.connect(g);
        g.connect(music);
        var send = ctx.createGain();
        send.gain.value = 0.42;
        g.connect(send);
        send.connect(delay);
        o.start(t);
        o.stop(t + 2);
      });
    }

    function playKick(t) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(118, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.18);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g);
      g.connect(music);
      o.start(t);
      o.stop(t + 0.36);
    }

    function playSnare(t, level) {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1900;
      bp.Q.value = 0.7;
      var g = ctx.createGain();
      var vol = level || 0.045;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      src.connect(bp);
      bp.connect(g);
      g.connect(music);
      src.start(t);
      src.stop(t + 0.17);
    }

    function playHat(t, level) {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7400;
      var g = ctx.createGain();
      g.gain.setValueAtTime(level || 0.009, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      src.connect(hp);
      hp.connect(g);
      g.connect(music);
      src.start(t);
      src.stop(t + 0.07);
    }

    function playCrackle(t) {
      if (Math.random() < 0.72) return;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400 + Math.random() * 3400;
      bp.Q.value = 5;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.006, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      src.connect(bp);
      bp.connect(g);
      g.connect(music);
      src.start(t);
      src.stop(t + 0.05);
    }

    function scheduleStep(s, t) {
      var chord = chords[Math.floor(s / 8)];
      var swing = t + (s % 2 ? 0.028 : 0);
      if (s % 8 === 0) {
        playPad(chord, t);
        playBass(chord.bass, t, 0.09);
      }
      if (s % 8 === 5) playBass(chord.bass * 1.5, t, 0.045);
      if (kickSteps.indexOf(s) > -1) playKick(swing);
      if (snareSteps.indexOf(s) > -1) playSnare(swing, s === 4 ? 0.05 : 0.04);
      if (s % 2 === 0) playHat(swing, s % 4 === 2 ? 0.013 : 0.008);
      if (s % 2 === 1) playHat(swing, 0.005);
      if (melodySteps.indexOf(s) > -1 && Math.random() > 0.32) {
        playKeys(scale[Math.floor(Math.random() * scale.length)], swing);
      }
      playCrackle(swing);
    }

    function scheduler() {
      if (!on || !ctx) return;
      while (nextTime < ctx.currentTime + 0.6) {
        scheduleStep(step, nextTime);
        step = (step + 1) % 32;
        nextTime += stepDur;
      }
      timer = setTimeout(scheduler, 140);
    }

    function paint() {
      if (soundToggle) {
        soundToggle.classList.toggle('is-on', on);
        soundToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }

    function start() {
      init();
      if (!ctx) {
        toast('这里暂时听不到 Chill Lofi，但星光仍在。');
        return;
      }
      ctx.resume();
      on = true;
      clearTimeout(timer);
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.62, now + 2.2);
      nextTime = now + 0.08;
      step = 0;
      scheduler();
      paint();
    }

    function stop() {
      if (!ctx) return;
      on = false;
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      clearTimeout(timer);
      paint();
    }

    return {
      start: start,
      stop: stop,
      toggle: function () { if (on) { stop(); } else { start(); } },
      isOn: function () { return on; }
    };
  })();

  if (soundToggle) {
    soundToggle.addEventListener('click', function () {
      audio.toggle();
      toast(audio.isOn()
        ? '<b>Chill Lofi Mix</b> · 正在播放 · SKY CAFÉ'
        : '已暂停 · 光还在慢慢流动', 2800);
    });
  }
  if (soundBtnTop) {
    soundBtnTop.addEventListener('click', function () {
      if (audio.isOn()) {
        toast('<b>Chill Lofi Mix</b> · 正在播放 · 右下角可以随时关闭');
      } else {
        audio.start();
        if (audio.isOn()) toast('<b>Chill Lofi Mix</b> 已开始 · 建议戴上耳机');
      }
    });
  }

  /* ---------- intro ---------- */
  function revealHero() {
    var items = document.querySelectorAll('.hero .reveal');
    Array.prototype.forEach.call(items, function (el, i) {
      setTimeout(function () { el.classList.add('is-in'); }, 120 + i * 95);
    });
  }

  function setupReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(items, function (el) {
      if (!el.closest('.hero')) io.observe(el);
    });
  }

  function enter() {
    if (entered) return;
    entered = true;
    intro.classList.add('is-gone');
    body.classList.remove('is-locked');
    body.classList.add('is-ready');
    audio.start();
    revealHero();
    setupReveals();
    setTimeout(function () { intro.style.display = 'none'; }, 1400);
    setTimeout(function () {
      if (window.SkyFX) window.SkyFX.burst(window.innerWidth * 0.5, window.innerHeight * 0.32, 36);
    }, 700);
  }

  if (enterBtn) enterBtn.addEventListener('click', enter);
  document.addEventListener('keydown', function (e) {
    if (!entered && e.key === 'Enter') enter();
  });

  /* ---------- hero light ---------- */
  if (lightBtn) {
    lightBtn.addEventListener('click', function () {
      var r = lightBtn.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      if (!audio.isOn()) audio.start();
      if (flash) {
        flash.classList.remove('is-on');
        void flash.offsetWidth;
        flash.classList.add('is-on');
        setTimeout(function () { flash.classList.remove('is-on'); }, 1150);
      }
      if (window.SkyFX) window.SkyFX.burst(cx, cy, 44);
      toast('<b>心火已点亮</b> · 光会记得今天');
      setTimeout(function () {
        var letter = document.getElementById('letter');
        if (letter) letter.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 460);
    });
  }

  /* ---------- hero little spirit ---------- */
  var spiritWhispers = [
    '小精灵说：今天的风，是专程为你吹的。',
    '它偷偷告诉你：花瓣落在肩上，是有人在想你。',
    '小精灵把一小束光塞进你口袋：别弄丢啦。',
    '它绕着你飞了一圈：愿望已经替你送到星河了。',
    '小精灵眨了眨眼：周五，要一直亮着呀。'
  ];
  var spiritTap = 0;
  if (heroSpirit) {
    heroSpirit.addEventListener('click', function () {
      var r = heroSpirit.getBoundingClientRect();
      if (window.SkyFX) window.SkyFX.burst(r.left + r.width / 2, r.top + r.height / 2, 26);
      heroSpirit.classList.remove('is-happy');
      void heroSpirit.offsetWidth;
      heroSpirit.classList.add('is-happy');
      setTimeout(function () { heroSpirit.classList.remove('is-happy'); }, 900);
      toast('<b>光之小精灵</b> · ' + spiritWhispers[spiritTap % spiritWhispers.length], 4200);
      spiritTap += 1;
    });
  }

  /* ---------- candles ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.candle-card'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('#candleDots i'));
  var countEl = document.getElementById('candleCount');
  var candlesSection = document.getElementById('candles');
  var completeBox = document.getElementById('candleComplete');
  var litCount = 0;

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      if (card.classList.contains('is-lit')) return;
      card.classList.add('is-lit');
      card.setAttribute('aria-pressed', 'true');
      litCount += 1;
      if (countEl) countEl.textContent = litCount;
      if (dots[litCount - 1]) dots[litCount - 1].classList.add('is-on');

      var r = card.getBoundingClientRect();
      if (window.SkyFX) window.SkyFX.burst(r.left + r.width / 2, r.top + r.height * 0.38, 34);

      if (litCount === cards.length) {
        if (candlesSection) candlesSection.classList.add('is-complete');
        toast('<b>六束光已聚齐</b> · 现在，把愿望交给星河');
        setTimeout(function () {
          if (window.SkyFX && completeBox) {
            var b = completeBox.getBoundingClientRect();
            window.SkyFX.burst(b.left + b.width * 0.5, b.top + b.height * 0.5, 70);
          }
        }, 500);
      }
    });
  });

  /* ---------- wish ---------- */
  var wishForm = document.getElementById('wishForm');
  var wishInput = document.getElementById('wishInput');
  var wishStatus = document.getElementById('wishStatus');
  var wishField = document.querySelector('.wish__field');

  function releaseOrb(x, y) {
    var orb = document.createElement('div');
    orb.className = 'wish-orb';
    orb.style.left = x + 'px';
    orb.style.top = y + 'px';
    document.body.appendChild(orb);
    setTimeout(function () { orb.remove(); }, 3600);
  }

  if (wishForm) {
    wishForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = wishInput ? wishInput.value.trim() : '';
      if (!text) {
        if (wishField) {
          wishField.classList.remove('is-shake');
          void wishField.offsetWidth;
          wishField.classList.add('is-shake');
        }
        if (wishStatus) wishStatus.textContent = '先写下一个愿望，光才知道要送达哪里。';
        if (wishInput) wishInput.focus();
        return;
      }

      var button = wishForm.querySelector('button');
      var r = button.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      releaseOrb(x, y);
      if (window.SkyFX) window.SkyFX.burst(x, y, 56);
      if (wishStatus) {
        wishStatus.textContent = '“' + text + '” 已被星河收藏。愿它早日发光。';
        wishStatus.classList.add('is-happy');
      }
      if (wishField) wishField.classList.remove('is-shake');
      if (wishInput) wishInput.value = '';
      toast('<b>愿望已启航</b> · 星河会替你记得');
    });
  }

  /* ---------- scroll + pointer ---------- */
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY || document.documentElement.scrollTop;
    if (scrollBar) scrollBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (topbar) topbar.classList.toggle('is-scrolled', y > 50);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    body.classList.add('has-cursor');
    window.addEventListener('pointermove', function (e) {
      if (cursorGlow) {
        cursorGlow.style.transform = 'translate3d(' + (e.clientX - 180) + 'px,' + (e.clientY - 180) + 'px,0)';
      }
    }, { passive: true });

    var tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    (function parallax() {
      cx += (tx - cx) * 0.045;
      cy += (ty - cy) * 0.045;
      if (heroMedia) heroMedia.style.transform = 'translate3d(' + (cx * 11) + 'px,' + (cy * 8) + 'px,0)';
      requestAnimationFrame(parallax);
    })();
  }
})();
