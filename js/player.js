/* ==========================================================================
   CABINET — game player
   Handles the stage, HUD, input, sound, pause and high-score flow.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.CABINET = window.CABINET || {};
  var soundEnabled = true;
  try { soundEnabled = localStorage.getItem('cabinet:sound') !== '0'; } catch (e) {}

  var audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, type, duration, vol, slideTo) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
      gain.gain.setValueAtTime(vol || 0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) { /* audio is optional */ }
  }

  var SFX = {
    blip: function () { tone(620, 'square', 0.07, 0.04); },
    laser: function () { tone(760, 'square', 0.09, 0.045, 380); },
    hit: function () { tone(150, 'sawtooth', 0.16, 0.07, 80); },
    point: function () { tone(880, 'triangle', 0.1, 0.05, 1180); },
    jump: function () { tone(330, 'square', 0.1, 0.045, 560); },
    pickup: function () { tone(1050, 'sine', 0.11, 0.05, 1400); },
    bounce: function () { tone(440, 'triangle', 0.06, 0.045); },
    boom: function () {
      tone(120, 'sawtooth', 0.28, 0.08, 50);
      setTimeout(function () { tone(70, 'sawtooth', 0.3, 0.07, 40); }, 80);
    },
    line: function () { tone(700, 'square', 0.08, 0.05); setTimeout(function () { tone(1040, 'square', 0.1, 0.05); }, 70); },
    over: function () {
      tone(240, 'sawtooth', 0.22, 0.06);
      setTimeout(function () { tone(150, 'sawtooth', 0.34, 0.06); }, 150);
    },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) {
        setTimeout(function () { tone(f, 'square', 0.16, 0.045); }, i * 110);
      });
    }
  };

  /* ---------- stage player ---------- */
  var dom = {};
  var game = null;
  var opts = {};
  var engine = null;
  var api = null;
  var raf = 0;
  var running = false;
  var active = false;
  var paused = false;
  var ended = false;
  var score = 0;
  var best = 0;
  var last = 0;
  var pressQueue = [];
  var keys = { left: false, right: false, up: false, down: false, fire: false };
  var pointer = { x: 480, y: 300, down: false };
  var normalize = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'fire', Enter: 'fire', KeyZ: 'fire', KeyX: 'fire'
  };

  function $(sel) { return document.querySelector(sel); }
  function setHidden(el, hidden) { if (el) el.hidden = hidden; }

  function updateScoreUI() {
    if (dom.score) dom.score.textContent = Math.floor(score).toLocaleString();
    if (dom.best) dom.best.textContent = Math.floor(best).toLocaleString();
    if (dom.sideBest) dom.sideBest.textContent = Math.floor(best).toLocaleString();
  }

  function setStatus(text) {
    if (!dom.status) return;
    dom.status.innerHTML = '<span class="live-dot"></span>' + text;
  }

  function pointerPos(e) {
    var r = dom.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(api.W, ((e.clientX - r.left) / r.width) * api.W)),
      y: Math.max(0, Math.min(api.H, ((e.clientY - r.top) / r.height) * api.H))
    };
  }

  function onKeyDown(e) {
    if (!active) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (!ended) togglePause();
      return;
    }
    var name = normalize[e.code];
    if (!name) return;
    e.preventDefault();
    if (!e.repeat) pressQueue.push(e.code);
    keys[name] = true;
  }

  function onKeyUp(e) {
    if (!active) return;
    var name = normalize[e.code];
    if (!name) return;
    keys[name] = false;
  }

  function clearKeys() {
    keys.left = keys.right = keys.up = keys.down = keys.fire = false;
    pointer.down = false;
    Array.prototype.forEach.call(document.querySelectorAll('.touch-btn.down'), function (b) { b.classList.remove('down'); });
  }

  function togglePause() {
    if (!active || ended) return;
    paused = !paused;
    setHidden(dom.overlayPause, !paused);
    setStatus(paused ? 'Paused' : 'Live');
    if (dom.stage) dom.stage.classList.toggle('is-idle', paused);
    // Keep the pause overlay clickable above the canvas
    if (dom.overlayPause) dom.overlayPause.style.pointerEvents = 'auto';
    clearKeys();
    pressQueue.length = 0;
    last = performance.now();
    if (!paused) {
      // ensure the kept RAF is alive
      if (!running) { running = true; raf = requestAnimationFrame(loop); }
    }
  }

  function buildApi() {
    return {
      W: 960,
      H: 600,
      canvas: dom.canvas,
      ctx: dom.canvas.getContext('2d'),
      keys: keys,
      pointer: pointer,
      sfx: function (name) { (SFX[name] || SFX.blip)(); },
      takePresses: function () { var q = pressQueue.slice(); pressQueue.length = 0; return q; },
      setScore: function (n) { score = Math.max(0, n || 0); updateScoreUI(); },
      addScore: function (n) { score = Math.max(0, score + (n || 0)); updateScoreUI(); },
      getScore: function () { return score; },
      setStatus: setStatus,
      end: function (label) { finish(label || 'Game over', false); },
      win: function (label) { finish(label || 'Level clear', true); },
      clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
      rand: function (a, b) { return a + Math.random() * (b - a); },
      lerp: function (a, b, t) { return a + (b - a) * t; }
    };
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (!paused && !ended && engine) {
      try {
        engine.update(dt);
        engine.draw(api.ctx);
      } catch (err) {
        console.error('[CABINET] engine error', err);
        setStatus('Engine error');
        running = false;
        return;
      }
    } else if (engine) {
      try { engine.draw(api.ctx); } catch (e) { /* keep calm on pause */ }
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (!game || !C.ENGINES || !C.ENGINES[game.engine]) {
      setStatus('Unavailable');
      return;
    }
    if (engine && engine.destroy) { try { engine.destroy(); } catch (e) {} }
    if (raf) cancelAnimationFrame(raf);
    clearKeys();
    pressQueue.length = 0;
    score = 0;
    ended = false;
    paused = false;
    active = true;
    running = true;
    setHidden(dom.overlayIdle, true);
    setHidden(dom.overlayPause, true);
    setHidden(dom.overlayOver, true);
    if (dom.stage) dom.stage.classList.remove('is-idle');
    setStatus('Live');
    initAudio();
    updateScoreUI();
    api = buildApi();
    engine = C.ENGINES[game.engine](api);
    last = performance.now();
    raf = requestAnimationFrame(loop);
    if (opts.onPlay) opts.onPlay(game);
  }

  function finish(label, won) {
    if (ended) return;
    ended = true;
    active = false;
    running = false;
    clearKeys();
    if (raf) cancelAnimationFrame(raf);
    setStatus(won ? 'Victory' : 'Game over');
    if (score > best) best = score;
    updateScoreUI();
    if (dom.overLabel) dom.overLabel.textContent = label || (won ? 'Victory' : 'Game over');
    if (dom.overScore) dom.overScore.textContent = Math.floor(score).toLocaleString();
    if (dom.overSub) dom.overSub.textContent = 'Best ' + Math.floor(best).toLocaleString() + ' · Saved locally';
    setHidden(dom.overlayOver, false);
    if (dom.stage) dom.stage.classList.add('is-idle');
    if (won) (SFX.win || SFX.point)(); else SFX.over();
    if (opts.onEnd) opts.onEnd(Math.floor(score), Math.floor(best), label || (won ? 'Victory' : 'Game over'));
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('cabinet:sound', soundEnabled ? '1' : '0'); } catch (e) {}
    updateSoundButton();
    if (soundEnabled) { initAudio(); SFX.blip(); }
  }

  function updateSoundButton() {
    if (!dom.btnSound) return;
    dom.btnSound.classList.toggle('off', !soundEnabled);
    dom.btnSound.setAttribute('aria-label', soundEnabled ? 'Mute sound' : 'Enable sound');
    dom.btnSound.innerHTML = soundEnabled
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8.5a5 5 0 010 7"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>';
  }

  function bindTouch() {
    Array.prototype.forEach.call(document.querySelectorAll('.touch-btn[data-key]'), function (btn) {
      var keyName = btn.getAttribute('data-key');
      var down = function (e) {
        e.preventDefault();
        if (!active || ended) return;
        initAudio();
        var name = keyName === 'fire' ? 'fire' : keyName;
        keys[name] = true;
        pressQueue.push(keyName === 'up' ? 'ArrowUp' : keyName === 'down' ? 'ArrowDown' : keyName === 'left' ? 'ArrowLeft' : keyName === 'right' ? 'ArrowRight' : 'Space');
        btn.classList.add('down');
      };
      var up = function (e) {
        if (e) e.preventDefault();
        if (keyName !== 'fire') keys[keyName] = false;
        else keys.fire = false;
        btn.classList.remove('down');
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', function (e) { if (e.buttons) up(e); });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  var Player = {
    mount: function (options) {
      opts = options || {};
      game = opts.game;
      if (!game) return;
      dom = {
        stage: $('#stage'),
        canvas: $('#stage-canvas'),
        score: $('#hud-score'),
        best: $('#hud-best'),
        status: $('#hud-status'),
        sideBest: $('#side-best'),
        overlayIdle: $('#overlay-idle'),
        overlayPause: $('#overlay-pause'),
        overlayOver: $('#overlay-over'),
        overLabel: $('#over-label'),
        overScore: $('#over-score'),
        overSub: $('#over-sub'),
        btnPause: $('#btn-pause'),
        btnRestart: $('#btn-restart'),
        btnSound: $('#btn-sound'),
        btnFull: $('#btn-full'),
        btnPlay: $('#btn-play'),
        btnAgain: $('#btn-again'),
        btnResume: $('#btn-resume'),
        btnQuit: $('#btn-quit')
      };
      if (!dom.canvas || !dom.stage) return;
      best = C.CABINET_APP ? C.CABINET_APP.bestScore(game.slug) : 0;
      updateScoreUI();
      updateSoundButton();
      setStatus('Ready');

      if (dom.btnPlay) dom.btnPlay.addEventListener('click', start);
      if (dom.btnAgain) dom.btnAgain.addEventListener('click', start);
      if (dom.btnRestart) dom.btnRestart.addEventListener('click', function () { if (active || ended) start(); else start(); });
      if (dom.btnPause) dom.btnPause.addEventListener('click', togglePause);
      if (dom.btnResume) dom.btnResume.addEventListener('click', togglePause);
      if (dom.btnQuit) dom.btnQuit.addEventListener('click', start);
      if (dom.btnSound) dom.btnSound.addEventListener('click', toggleSound);
      if (dom.btnFull) dom.btnFull.addEventListener('click', function () {
        var el = dom.stage;
        if (!document.fullscreenElement) {
          if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      });

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearKeys);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && active && !paused && !ended) togglePause();
      });

      // pointer control on the canvas
      dom.canvas.addEventListener('pointermove', function (e) {
        var p = pointerPos(e);
        pointer.x = p.x;
        pointer.y = p.y;
      });
      dom.canvas.addEventListener('pointerdown', function (e) {
        if (!active || paused || ended) return;
        e.preventDefault();
        var p = pointerPos(e);
        pointer.x = p.x;
        pointer.y = p.y;
        pointer.down = true;
        pressQueue.push('Pointer');
        initAudio();
      });
      window.addEventListener('pointerup', function () { pointer.down = false; });

      bindTouch();
      setHidden(dom.overlayIdle, false);
      setHidden(dom.overlayPause, true);
      setHidden(dom.overlayOver, true);
      if (dom.stage) dom.stage.classList.add('is-idle');

      // draw the poster background on the canvas before play
      try {
        var ctx = dom.canvas.getContext('2d');
        var grad = ctx.createLinearGradient(0, 0, 0, 600);
        grad.addColorStop(0, game.bg || '#08080b');
        grad.addColorStop(1, '#050507');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 960, 600);
      } catch (e) {}
    }
  };

  C.Player = Player;
  C.SFX = SFX;
}());
