/* ==========================================================================
   CABINET — engines: invaders, platformer, tank
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CABINET;
  var E = C.ENGINES;
  var K = C.EngineKit;

  /* ======================================================================
     GALAXY STRIKE — formation shooter
     ====================================================================== */
  E.invaders = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var player = { x: W / 2, lives: 3, cd: 0, inv: 0 };
    var enemies = [], bullets = [], ebullets = [], parts = [];
    var dir = 1, speed = 38, wave = 1, score = 0, fireT = 1.4, t = 0;
    var stars = [];
    for (var s = 0; s < 90; s++) stars.push({ x: K.rand(0, W), y: K.rand(0, H), z: K.rand(0.3, 1.6) });

    var ALIEN = ['00111100', '01111110', '11011011', '11111111', '00100100', '01011010'];
    var SHIP = ['0001000', '0011100', '0111110', '1111111', '0111110', '0011100', '0100010'];

    function resetWave() {
      enemies = [];
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 6; c++) {
          enemies.push({ x: 220 + c * 104, y: 90 + r * 62, alive: true, w: 42, h: 30, row: r });
        }
      }
      dir = 1;
      speed = 34 + wave * 7;
      bullets = []; ebullets = [];
      fireT = 1.2;
    }
    resetWave();

    function status() {
      api.setStatus(player.lives + (player.lives === 1 ? ' life' : ' lives'));
    }
    status();

    function hitPlayer() {
      if (player.inv > 0) return;
      player.lives--;
      player.inv = 1.6;
      K.burst(parts, player.x, 540, '#ff5e5e', 20, 280);
      api.sfx('boom');
      status();
      if (player.lives <= 0) { api.end('Ship destroyed'); return true; }
      player.x = W / 2;
      ebullets = [];
      return false;
    }

    return {
      update: function (dt) {
        t += dt;
        player.cd = Math.max(0, player.cd - dt);
        player.inv = Math.max(0, player.inv - dt);
        api.takePresses();

        var mv = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        player.x = K.clamp(player.x + mv * 430 * dt, 36, W - 36);

        if (api.keys.fire && player.cd <= 0) {
          player.cd = 0.24;
          bullets.push({ x: player.x, y: 520, vy: -680 });
          api.sfx('laser');
        }

        for (var b = bullets.length - 1; b >= 0; b--) {
          bullets[b].y += bullets[b].vy * dt;
          if (bullets[b].y < -20) bullets.splice(b, 1);
        }
        for (var eb = ebullets.length - 1; eb >= 0; eb--) {
          ebullets[eb].y += ebullets[eb].vy * dt;
          ebullets[eb].x += ebullets[eb].vx * dt;
          if (ebullets[eb].y > H + 20) ebullets.splice(eb, 1);
        }

        /* formation movement */
        var alive = enemies.filter(function (e) { return e.alive; });
        if (!alive.length) {
          wave++;
          score += 500;
          api.sfx('win');
          resetWave();
          return;
        }
        var minX = Infinity, maxX = -Infinity, maxY = 0;
        alive.forEach(function (e) { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w); maxY = Math.max(maxY, e.y + e.h); });
        if ((maxX > W - 40 && dir > 0) || (minX < 40 && dir < 0)) {
          dir *= -1;
          alive.forEach(function (e) { e.y += 20; });
        }
        alive.forEach(function (e) { e.x += dir * speed * dt; });

        if (maxY > 430) { api.end('The line fell'); return; }

        /* enemy fire */
        fireT -= dt;
        if (fireT <= 0) {
          fireT = Math.max(0.35, 1.15 - wave * 0.06);
          if (alive.length) {
            var shooter = alive[Math.floor(Math.random() * alive.length)];
            ebullets.push({ x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h, vy: 260 + wave * 12, vx: K.rand(-40, 40) });
          }
        }

        /* bullet vs alien */
        for (var i = bullets.length - 1; i >= 0; i--) {
          var bullet = bullets[i];
          for (var j = 0; j < alive.length; j++) {
            var en = alive[j];
            if (bullet.x > en.x && bullet.x < en.x + en.w && bullet.y > en.y && bullet.y < en.y + en.h) {
              en.alive = false;
              bullets.splice(i, 1);
              score += 100;
              K.burst(parts, en.x + en.w / 2, en.y + en.h / 2, '#c8ff3d', 12, 220);
              api.sfx('hit');
              break;
            }
          }
        }
        /* enemy bullet vs player */
        for (var k = ebullets.length - 1; k >= 0; k--) {
          var eb = ebullets[k];
          if (K.overlap(eb.x - 4, eb.y - 4, 8, 12, player.x - 22, 510, 44, 34)) {
            ebullets.splice(k, 1);
            if (hitPlayer()) return;
          }
        }
        K.stepParticles(parts, dt, 80);
        score = Math.max(score, 0);
        api.setScore(score);
      },
      draw: function () {
        K.bg(ctx, '#060a20', '#02030a');
        for (var i = 0; i < stars.length; i++) {
          var st = stars[i];
          ctx.globalAlpha = 0.25 + st.z * 0.4;
          K.circle(ctx, st.x, (st.y + t * 18 * st.z) % H, st.z, '#ffffff');
        }
        ctx.globalAlpha = 1;
        /* planet */
        K.circle(ctx, 810, 110, 78, 'rgba(93,123,255,0.16)');
        ctx.strokeStyle = 'rgba(93,123,255,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(810, 110, 78, 0, Math.PI * 2); ctx.stroke();
        /* aliens */
        for (var e = 0; e < enemies.length; e++) {
          var en = enemies[e];
          if (!en.alive) continue;
          var col = en.row === 0 ? '#c8ff3d' : en.row === 1 ? '#5d7bff' : en.row === 2 ? '#ff5fa2' : '#ffd166';
          K.pixelArt(ctx, ALIEN, en.x, en.y, 6, col);
        }
        /* player bullets */
        for (var b = 0; b < bullets.length; b++) {
          ctx.fillStyle = '#d8ff3e';
          ctx.fillRect(bullets[b].x - 2, bullets[b].y, 4, 16);
          ctx.globalAlpha = 0.3;
          ctx.fillRect(bullets[b].x - 5, bullets[b].y + 12, 10, 10);
          ctx.globalAlpha = 1;
        }
        /* enemy bullets */
        for (var eb = 0; eb < ebullets.length; eb++) {
          K.circle(ctx, ebullets[eb].x, ebullets[eb].y, 4, '#ff5e5e');
          ctx.globalAlpha = 0.35;
          K.circle(ctx, ebullets[eb].x, ebullets[eb].y, 10, '#ff5e5e');
          ctx.globalAlpha = 1;
        }
        /* player */
        ctx.globalAlpha = player.inv > 0 ? (Math.floor(player.inv * 12) % 2 ? 0.3 : 1) : 1;
        K.pixelArt(ctx, SHIP, player.x - 21, 506, 6, '#61e8ff');
        K.circle(ctx, player.x, 500, 4, '#ffffff');
        ctx.globalAlpha = 1;
        K.drawParticles(ctx, parts);
        /* hud */
        K.mono(ctx, 'WAVE ' + String(wave).padStart(2, '0'), 26, 38, 12, 'rgba(255,255,255,0.55)');
        for (var l = 0; l < 3; l++) {
          ctx.fillStyle = l < player.lives ? '#c8ff3d' : 'rgba(255,255,255,0.15)';
          ctx.beginPath(); ctx.moveTo(32 + l * 26, 56); ctx.lineTo(44 + l * 26, 70); ctx.lineTo(32 + l * 26, 84); ctx.lineTo(26 + l * 26, 70); ctx.closePath(); ctx.fill();
        }
      }
    };
  };

  /* ======================================================================
     HAUNTED KEEP — platformer
     ====================================================================== */
  E.platformer = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var levelW = 2900, floor = 520;
    var platforms = [
      { x: 0, y: 520, w: 360 }, { x: 410, y: 520, w: 290 }, { x: 750, y: 470, w: 250 },
      { x: 1050, y: 520, w: 360 }, { x: 1460, y: 450, w: 210 }, { x: 1730, y: 520, w: 330 },
      { x: 2110, y: 470, w: 260 }, { x: 2430, y: 520, w: 400 }
    ];
    var floaters = [
      { x: 300, y: 408, w: 110 }, { x: 590, y: 372, w: 120 }, { x: 930, y: 388, w: 120 },
      { x: 1260, y: 356, w: 130 }, { x: 1590, y: 336, w: 120 }, { x: 1950, y: 380, w: 120 },
      { x: 2260, y: 326, w: 120 }, { x: 2590, y: 390, w: 110 }
    ];
    var spikes = [{ x: 520, y: 506, w: 70 }, { x: 1170, y: 506, w: 60 }, { x: 1850, y: 506, w: 70 }];
    var coins = [];
    floaters.forEach(function (p) { coins.push({ x: p.x + p.w / 2, y: p.y - 34, got: false, bob: Math.random() * 6 }); });
    platforms.forEach(function (p, i) { if (i % 2 === 0) coins.push({ x: p.x + p.w - 50, y: p.y - 30, got: false, bob: Math.random() * 6 }); });
    coins.push({ x: 720, y: 430, got: false, bob: 2 }, { x: 1370, y: 300, got: false, bob: 4 }, { x: 2500, y: 440, got: false, bob: 1 });

    var p = { x: 70, y: floor - 44, w: 30, h: 44, vx: 0, vy: 0, onGround: true, face: 1, anim: 0 };
    var camera = 0, score = 0, t = 0, goalX = 2700, won = false;

    return {
      update: function (dt) {
        if (won) return;
        t += dt;
        var pressed = api.takePresses();
        var mv = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        p.vx = mv * 280;
        if (mv) p.face = mv;
        var jump = pressed.indexOf('ArrowUp') >= 0 || pressed.indexOf('KeyW') >= 0 || pressed.indexOf('Space') >= 0 || pressed.indexOf('Pointer') >= 0;
        if (jump && p.onGround) { p.vy = -780; p.onGround = false; api.sfx('jump'); }

        var prevBottom = p.y + p.h;
        p.vy += 2200 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.x = K.clamp(p.x, 0, levelW - p.w);
        p.onGround = false;

        var all = platforms.concat(floaters);
        for (var i = 0; i < all.length; i++) {
          var pl = all[i];
          if (p.vy >= 0 && K.overlap(p.x, p.y, p.w, p.h, pl.x, pl.y, pl.w, 18) && prevBottom <= pl.y + 10) {
            p.y = pl.y - p.h;
            p.vy = 0;
            p.onGround = true;
          }
        }
        if (p.onGround) p.anim += Math.abs(p.vx) * dt * 0.04;

        if (p.y > 700) { api.sfx('over'); api.end('Lost to the dark'); return; }

        for (var s = 0; s < spikes.length; s++) {
          if (K.overlap(p.x, p.y, p.w, p.h, spikes[s].x, spikes[s].y, spikes[s].w, 16)) {
            api.sfx('boom'); api.end('Impaled'); return;
          }
        }

        for (var c = 0; c < coins.length; c++) {
          var coin = coins[c];
          if (coin.got) continue;
          var dx = (p.x + p.w / 2) - coin.x;
          var dy = (p.y + p.h / 2) - coin.y;
          if (dx * dx + dy * dy < 38 * 38) {
            coin.got = true;
            score += 50;
            api.sfx('pickup');
            api.setScore(score);
          }
        }

        /* goal beacon */
        if (p.x + p.w > goalX && p.y < floor + 20) {
          won = true;
          score += 1000;
          api.setScore(score);
          api.sfx('win');
          api.win('Keep conquered');
          return;
        }

        var target = K.clamp(p.x - 320, 0, levelW - W);
        camera += (target - camera) * Math.min(1, dt * 6);
        api.setScore(score);
      },
      draw: function () {
        /* sky */
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0f0c1e');
        sky.addColorStop(0.6, '#211638');
        sky.addColorStop(1, '#08050f');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        /* moon */
        ctx.globalAlpha = 0.85;
        K.circle(ctx, 790 - camera * 0.05, 130, 74, '#ffd166');
        ctx.globalAlpha = 0.18;
        K.circle(ctx, 710 - camera * 0.05, 250, 120, '#ffd166');
        ctx.globalAlpha = 1;
        /* stars */
        for (var i = 0; i < 30; i++) {
          ctx.globalAlpha = 0.25 + (i % 4) * 0.15;
          K.circle(ctx, (i * 137 - camera * 0.08) % W, 30 + (i * 53) % 220, 1 + (i % 2), '#ffffff');
        }
        ctx.globalAlpha = 1;
        /* far castle */
        ctx.fillStyle = 'rgba(10,6,18,0.7)';
        for (var f = 0; f < 9; f++) {
          var fx = ((f * 380 - camera * 0.18) % 3420 + 3420) % 3420 - 200;
          ctx.fillRect(fx, 300, 120, 260);
          ctx.fillRect(fx + 20, 260, 30, 60);
          ctx.fillRect(fx + 70, 280, 26, 40);
          ctx.beginPath(); ctx.moveTo(fx + 20, 260); ctx.lineTo(fx + 35, 225); ctx.lineTo(fx + 50, 260); ctx.fill();
        }
        /* fog */
        ctx.fillStyle = 'rgba(157,123,255,0.05)';
        ctx.beginPath(); ctx.ellipse(300, 470, 400, 60, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(760, 520, 380, 50, 0, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(-camera, 0);

        /* platforms */
        var all = platforms.concat(floaters);
        for (var pl = 0; pl < all.length; pl++) {
          var pt = all[pl];
          K.rr(ctx, pt.x, pt.y, pt.w, 18, 4, '#241a38', 'rgba(157,123,255,0.35)');
          ctx.fillStyle = 'rgba(157,123,255,0.4)';
          ctx.fillRect(pt.x, pt.y, pt.w, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          for (var b = 0; b < pt.w; b += 36) ctx.fillRect(pt.x + b + 4, pt.y + 8, 22, 3);
          /* hanging chains for floaters */
          if (pt.y < 500) {
            ctx.strokeStyle = 'rgba(157,123,255,0.18)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(pt.x + 14, pt.y); ctx.lineTo(pt.x + 14, pt.y - 44); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pt.x + pt.w - 14, pt.y); ctx.lineTo(pt.x + pt.w - 14, pt.y - 44); ctx.stroke();
          }
        }
        /* spikes */
        for (var s = 0; s < spikes.length; s++) {
          var sp = spikes[s];
          for (var x = sp.x; x < sp.x + sp.w; x += 16) {
            ctx.fillStyle = '#3a3350';
            ctx.beginPath(); ctx.moveTo(x, sp.y + 16); ctx.lineTo(x + 8, sp.y); ctx.lineTo(x + 16, sp.y + 16); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.moveTo(x + 8, sp.y); ctx.lineTo(x + 10, sp.y + 8); ctx.lineTo(x + 6, sp.y + 8); ctx.fill();
          }
        }
        /* torches on ground platforms */
        [200, 1180, 1820, 2520].forEach(function (tx) {
          K.circle(ctx, tx, 480 + Math.sin(t * 6) * 2, 16, 'rgba(255,209,102,0.18)');
          K.circle(ctx, tx, 480 + Math.sin(t * 6) * 2, 6, '#ffd166');
          ctx.fillStyle = '#241a38'; ctx.fillRect(tx - 2, 486, 4, 18);
        });
        /* coins */
        for (var c = 0; c < coins.length; c++) {
          var coin = coins[c];
          if (coin.got) continue;
          var bob = Math.sin(t * 3 + coin.bob) * 4;
          ctx.globalAlpha = 0.25;
          K.circle(ctx, coin.x, coin.y + bob, 16, '#ffd166');
          ctx.globalAlpha = 1;
          K.circle(ctx, coin.x, coin.y + bob, 8, '#ffd166');
          K.circle(ctx, coin.x - 2, coin.y + bob - 2, 3, '#fff3c4');
        }
        /* goal */
        ctx.fillStyle = 'rgba(157,123,255,0.2)';
        ctx.fillRect(goalX - 10, 250, 20, 270);
        K.rr(ctx, goalX - 3, 240, 6, 280, 3, '#9d7bff');
        K.circle(ctx, goalX, 236, 14 + Math.sin(t * 4) * 3, '#d8ff3e');
        ctx.globalAlpha = 0.18;
        K.circle(ctx, goalX, 236, 34, '#d8ff3e');
        ctx.globalAlpha = 1;
        /* player */
        var bob = p.onGround ? Math.abs(Math.sin(p.anim * 1.6)) * 2 : 0;
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h - bob);
        ctx.scale(p.face, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2b2440'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        var stride = p.onGround ? Math.sin(p.anim * 6) * 7 : 4;
        ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-8 + stride, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(8 - stride, 0); ctx.stroke();
        K.rr(ctx, -11, -38, 22, 26, 6, '#9d7bff', 'rgba(0,0,0,0.4)');
        ctx.fillStyle = '#ffd166'; ctx.fillRect(-11, -26, 22, 3);
        K.circle(ctx, 0, -46, 11, '#c9c3d9');
        ctx.fillStyle = '#9d7bff'; ctx.fillRect(-12, -54, 24, 7);
        ctx.fillStyle = '#d8ff3e'; ctx.fillRect(-2, -70, 3, 12);
        ctx.restore();
        ctx.restore();

        /* hud */
        K.mono(ctx, 'GOLD ' + String(score).padStart(4, '0'), 26, 38, 12, 'rgba(255,255,255,0.6)');
        K.mono(ctx, 'KEEP ' + Math.min(100, Math.floor((p.x / goalX) * 100)) + '%', W - 26, 38, 12, 'rgba(255,255,255,0.4)', 'right');
      }
    };
  };

  /* ======================================================================
     TANK VANGUARD — top-down arena
     ====================================================================== */
  E.tank = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var p = { x: W / 2, y: 320, angle: -Math.PI / 2, hp: 6, cd: 0, inv: 0 };
    var bullets = [], enemies = [], parts = [], t = 0, score = 0, spawnT = 2;
    var rocks = [];
    for (var i = 0; i < 16; i++) rocks.push({ x: K.rand(50, W - 50), y: K.rand(60, H - 60), r: K.rand(8, 26) });

    function fire(x, y, angle, owner, color) {
      bullets.push({ x: x + Math.cos(angle) * 34, y: y + Math.sin(angle) * 34, vx: Math.cos(angle) * 470, vy: Math.sin(angle) * 470, owner: owner, life: 2.2, color: color });
    }
    function spawnEnemy() {
      var side = Math.floor(Math.random() * 4);
      var x = side === 0 ? -30 : side === 1 ? W + 30 : K.rand(50, W - 50);
      var y = side === 2 ? -30 : side === 3 ? H + 30 : K.rand(50, H - 50);
      enemies.push({ x: x, y: y, angle: Math.atan2(p.y - y, p.x - x), speed: K.rand(32, 56), cd: K.rand(1, 2), hitT: 0, hp: 1 });
    }
    function damagePlayer() {
      if (p.inv > 0) return;
      p.hp--;
      p.inv = 1.4;
      K.burst(parts, p.x, p.y, '#ff8c42', 18, 260);
      api.sfx('hit');
      if (p.hp <= 0) api.end('Armour breached');
    }
    function drawTank(x, y, angle, body, turret, scale, hitT) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 8, 38, 14, 0, 0, Math.PI * 2); ctx.fill();
      /* tracks */
      K.rr(ctx, -32, -26, 64, 14, 5, '#12120a', 'rgba(0,0,0,0.6)');
      K.rr(ctx, -32, 12, 64, 14, 5, '#12120a', 'rgba(0,0,0,0.6)');
      for (var i = -26; i < 26; i += 10) {
        ctx.fillStyle = 'rgba(198,217,46,0.25)';
        ctx.fillRect(i, -24, 5, 3);
        ctx.fillRect(i, 15, 5, 3);
      }
      /* body */
      K.rr(ctx, -28, -20, 56, 40, 7, body, 'rgba(0,0,0,0.55)');
      /* turret */
      K.circle(ctx, 0, 0, 16, turret);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
      /* barrel */
      K.rr(ctx, 10, -4, 32, 8, 3, '#1b1b10', 'rgba(0,0,0,0.5)');
      K.rr(ctx, 40, -5, 6, 10, 2, '#0e0e08');
      if (hitT > 0) {
        ctx.globalAlpha = Math.min(0.7, hitT * 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-36, -30, 80, 62);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    return {
      update: function (dt) {
        t += dt;
        api.takePresses();
        p.cd = Math.max(0, p.cd - dt);
        p.inv = Math.max(0, p.inv - dt);

        var rot = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        p.angle += rot * 2.3 * dt;
        var drive = (api.keys.up ? 1 : 0) - (api.keys.down ? 1 : 0);
        p.x = K.clamp(p.x + Math.cos(p.angle) * drive * 155 * dt, 40, W - 40);
        p.y = K.clamp(p.y + Math.sin(p.angle) * drive * 155 * dt, 40, H - 40);

        if (api.keys.fire && p.cd <= 0) {
          p.cd = 0.5;
          fire(p.x, p.y, p.angle, 'p', '#d8ff3e');
          api.sfx('boom');
        }

        /* spawns */
        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = Math.max(0.9, 2.6 - t * 0.02);
          if (enemies.length < 6) spawnEnemy();
        }

        /* bullets */
        for (var b = bullets.length - 1; b >= 0; b--) {
          var bu = bullets[b];
          bu.x += bu.vx * dt;
          bu.y += bu.vy * dt;
          bu.life -= dt;
          if (bu.life <= 0 || bu.x < -20 || bu.x > W + 20 || bu.y < -20 || bu.y > H + 20) { bullets.splice(b, 1); continue; }
          if (bu.owner === 'p') {
            for (var e = enemies.length - 1; e >= 0; e--) {
              var en = enemies[e];
              var dx = en.x - bu.x, dy = en.y - bu.y;
              if (dx * dx + dy * dy < 30 * 30) {
                enemies.splice(e, 1);
                bullets.splice(b, 1);
                score += 200;
                K.burst(parts, en.x, en.y, '#ff8c42', 20, 280);
                api.sfx('boom');
                break;
              }
            }
          } else {
            var pdx = p.x - bu.x, pdy = p.y - bu.y;
            if (pdx * pdx + pdy * pdy < 28 * 28) {
              bullets.splice(b, 1);
              damagePlayer();
            }
          }
        }

        /* enemies */
        for (var i = enemies.length - 1; i >= 0; i--) {
          var en = enemies[i];
          en.hitT = Math.max(0, en.hitT - dt);
          en.cd -= dt;
          var ex = p.x - en.x, ey = p.y - en.y;
          var dist = Math.sqrt(ex * ex + ey * ey) || 1;
          en.angle = Math.atan2(ey, ex);
          if (dist > 150) {
            en.x += (ex / dist) * en.speed * dt;
            en.y += (ey / dist) * en.speed * dt;
          }
          if (en.cd <= 0 && dist < 520) {
            en.cd = K.rand(1.3, 2.4);
            fire(en.x, en.y, en.angle + K.rand(-0.08, 0.08), 'e', '#ff5e5e');
          }
          if (dist < 44) {
            damagePlayer();
            en.x -= (ex / dist) * 24;
            en.y -= (ey / dist) * 24;
          }
        }

        K.stepParticles(parts, dt, 120);
        api.setScore(score);
        api.setStatus(p.hp + ' armour');
      },
      draw: function () {
        /* sand */
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#20200e');
        g.addColorStop(1, '#0b0b05');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        /* grid */
        ctx.strokeStyle = 'rgba(198,217,46,0.08)'; ctx.lineWidth = 1;
        for (var x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        /* rocks */
        for (var r = 0; r < rocks.length; r++) {
          K.circle(ctx, rocks[r].x, rocks[r].y, rocks[r].r, 'rgba(198,217,46,0.07)');
          K.circle(ctx, rocks[r].x - 3, rocks[r].y - 3, rocks[r].r * 0.4, 'rgba(0,0,0,0.3)');
        }
        /* dust */
        ctx.globalAlpha = 0.06;
        for (var d = 0; d < 8; d++) K.circle(ctx, (d * 173 + t * 12) % W, 480 + (d % 3) * 30, 60, '#c6d92e');
        ctx.globalAlpha = 1;
        /* enemies */
        for (var e = 0; e < enemies.length; e++) drawTank(enemies[e].x, enemies[e].y, enemies[e].angle, '#6b2f1c', '#ff8c42', 0.9, enemies[e].hitT);
        /* player */
        ctx.globalAlpha = p.inv > 0 ? (Math.floor(p.inv * 12) % 2 ? 0.35 : 1) : 1;
        drawTank(p.x, p.y, p.angle, '#4a5218', '#c6d92e', 1, 0);
        ctx.globalAlpha = 1;
        /* bullets */
        for (var b = 0; b < bullets.length; b++) {
          K.circle(ctx, bullets[b].x, bullets[b].y, 5, bullets[b].color);
          ctx.globalAlpha = 0.2;
          K.circle(ctx, bullets[b].x, bullets[b].y, 12, bullets[b].color);
          ctx.globalAlpha = 1;
        }
        K.drawParticles(ctx, parts);
        /* hud */
        K.mono(ctx, 'ARMOUR', 26, 40, 11, 'rgba(255,255,255,0.5)');
        for (var i = 0; i < 6; i++) {
          ctx.fillStyle = i < p.hp ? '#c6d92e' : 'rgba(255,255,255,0.14)';
          ctx.fillRect(26 + i * 20, 50, 14, 8);
        }
        K.mono(ctx, 'HOSTILES ' + String(enemies.length).padStart(2, '0'), W - 26, 40, 11, 'rgba(255,255,255,0.4)', 'right');
      }
    };
  };

}());
