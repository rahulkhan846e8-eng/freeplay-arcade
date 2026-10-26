/* ==========================================================================
   CABINET — engines: racer, runner, brawler, duel
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CABINET;
  var E = C.ENGINES;
  var K = C.EngineKit;

  /* ======================================================================
     NEON DRIFT — pseudo-3D traffic racer
     ====================================================================== */
  E.racer = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var px = 0, speed = 340, dist = 0, t = 0, spawnT = 1.2, cars = [], dash = 0;
    var horizon = 205, playerY = 505;
    var stars = [];
    for (var i = 0; i < 60; i++) stars.push({ x: K.rand(0, W), y: K.rand(0, horizon - 20), r: K.rand(0.4, 1.7) });

    function half(y) { var k = (y - horizon) / (H - horizon); return 118 + k * 402; }
    function laneX(lane, y) { return W / 2 + lane * half(y) * 0.86; }

    function addCar() {
      cars.push({
        lane: K.rand(-0.75, 0.75),
        y: horizon + 8,
        vy: K.rand(120, 280),
        color: ['#ff4d8d', '#57e6ff', '#ffd166', '#c8ff3d', '#b18bff'][Math.floor(Math.random() * 5)]
      });
    }

    function drawCar(x, y, s, color, isPlayer) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 22, 48, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      /* wheels */
      ctx.fillStyle = '#08060e';
      K.rr(ctx, -46, 12, 22, 14, 4, '#08060e');
      K.rr(ctx, 24, 12, 22, 14, 4, '#08060e');
      /* body */
      K.rr(ctx, -44, -20, 88, 40, 9, color, 'rgba(0,0,0,0.55)');
      /* cabin */
      K.rr(ctx, -22, -34, 44, 22, 7, '#151124', 'rgba(0,0,0,0.5)');
      K.rr(ctx, -16, -30, 32, 13, 4, isPlayer ? 'rgba(216,255,62,0.5)' : 'rgba(255,255,255,0.18)');
      /* lights */
      K.rr(ctx, -38, 3, 13, 7, 3, isPlayer ? '#ffffff' : '#ff4d4d');
      K.rr(ctx, 25, 3, 13, 7, 3, isPlayer ? '#ff4d4d' : '#ffffff');
      /* stripe */
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(-2, -18, 4, 36);
      ctx.restore();
    }

    return {
      update: function (dt) {
        t += dt;
        speed = Math.min(780, 340 + t * 15);
        dist += speed * dt * 0.12;
        dash += speed * dt;
        api.setScore(Math.floor(dist));
        var steer = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        px = K.clamp(px + steer * 1.75 * dt, -1, 1);
        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = Math.max(0.32, 0.95 - t * 0.014);
          if (cars.length < 8) addCar();
        }
        for (var i = cars.length - 1; i >= 0; i--) {
          var c = cars[i];
          c.y += (c.vy + speed * 0.5) * dt;
          if (c.y > H + 90) { cars.splice(i, 1); continue; }
          if (Math.abs(c.y - playerY) < 42 && Math.abs(c.lane - px) < 0.24) {
            api.sfx('boom');
            api.end('Wiped out');
            return;
          }
        }
      },
      draw: function () {
        K.bg(ctx, '#120b2e', '#05030c');
        /* stars */
        for (var i = 0; i < stars.length; i++) {
          ctx.globalAlpha = 0.3 + (i % 5) * 0.13;
          K.circle(ctx, stars[i].x, stars[i].y, stars[i].r, '#ffffff');
        }
        ctx.globalAlpha = 1;
        /* sun */
        var sun = ctx.createRadialGradient(700, 260, 20, 700, 260, 150);
        sun.addColorStop(0, '#ff7ab8');
        sun.addColorStop(1, '#6d5cff');
        K.circle(ctx, 700, 260, 145, sun);
        for (var s = 0; s < 8; s++) {
          ctx.fillStyle = 'rgba(18,11,46,0.9)';
          ctx.fillRect(548, 236 + s * 17, 304, 5 + s * 1.3);
        }
        /* mountains */
        ctx.fillStyle = '#0c0822';
        ctx.beginPath();
        ctx.moveTo(0, 440); ctx.lineTo(120, 330); ctx.lineTo(230, 410); ctx.lineTo(380, 300);
        ctx.lineTo(520, 410); ctx.lineTo(660, 340); ctx.lineTo(820, 420); ctx.lineTo(960, 360);
        ctx.lineTo(960, 480); ctx.lineTo(0, 480); ctx.closePath(); ctx.fill();
        /* horizon glow */
        K.line(ctx, 0, 443, W, 443, 'rgba(255,77,141,0.55)', 2);
        /* road */
        var grad = ctx.createLinearGradient(0, 440, 0, H);
        grad.addColorStop(0, '#151026');
        grad.addColorStop(1, '#07050f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 150, 443); ctx.lineTo(W / 2 + 150, 443);
        ctx.lineTo(W + 220, H); ctx.lineTo(-220, H); ctx.closePath(); ctx.fill();
        /* horizontal grid */
        for (var g = 0; g < 15; g++) {
          var k = g / 15;
          var y = 443 + Math.pow(k, 1.7) * 380;
          var hw = half(y);
          ctx.globalAlpha = 0.16 + k * 0.35;
          ctx.fillStyle = '#6d5cff';
          ctx.fillRect(W / 2 - hw, y, hw * 2, 1.2 + k * 2.4);
        }
        ctx.globalAlpha = 1;
        /* lane dashes */
        var offset = dash % 90;
        for (var d = 0; d < 8; d++) {
          var yy = 470 + ((d * 90 + offset) % 360);
          var kk = (yy - 443) / 380;
          var lw = 2 + kk * 7;
          ctx.globalAlpha = 0.25 + kk * 0.4;
          ctx.fillStyle = '#d8ff3e';
          ctx.fillRect(W / 2 - lw / 2, yy, lw, 6 + kk * 20);
        }
        /* road edges */
        ctx.globalAlpha = 0.5;
        K.line(ctx, W / 2 - 150, 443, -180, H, '#ff4d8d', 3);
        K.line(ctx, W / 2 + 150, 443, W + 180, H, '#57e6ff', 3);
        ctx.globalAlpha = 1;
        /* palms */
        function palm(x, baseY, sc) {
          ctx.save(); ctx.translate(x, baseY); ctx.scale(sc, sc);
          ctx.strokeStyle = '#070510'; ctx.fillStyle = '#070510';
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-8, -50, 0, -100); ctx.stroke();
          for (var f = 0; f < 6; f++) {
            ctx.save(); ctx.translate(0, -100); ctx.rotate(-0.9 + f * 0.36);
            ctx.beginPath(); ctx.ellipse(26, 0, 30, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
        palm(70, 600, 1.15); palm(895, 610, 1.3);

        /* traffic (far to near) */
        cars.sort(function (a, b) { return a.y - b.y; });
        for (var c = 0; c < cars.length; c++) {
          var car = cars[c];
          var sc = 0.34 + ((car.y - horizon) / (H - horizon)) * 0.72;
          var x = laneX(car.lane, car.y);
          drawCar(x, car.y, sc, car.color, false);
        }
        /* player */
        drawCar(laneX(px, playerY), playerY, 1, '#d8ff3e', true);
        /* speed streaks */
        ctx.globalAlpha = 0.16;
        for (var q = 0; q < 10; q++) {
          ctx.fillStyle = q % 2 ? '#ff4d8d' : '#57e6ff';
          ctx.fillRect(20 + ((q * 97 + dash * 2) % 900), 530 + (q % 4) * 15, 40 + (q % 3) * 30, 2);
        }
        ctx.globalAlpha = 1;
      }
    };
  };

  /* ======================================================================
     SKYLINE RUN — endless rooftop runner
     ====================================================================== */
  E.runner = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var groundY = 478, px = 240, py = groundY, vy = 0, onGround = true;
    var speed = 380, dist = 0, obstacles = [], coins = [], spawnT = 1.4, coinT = 1.2;
    var coinScore = 0, anim = 0, shake = 0;

    function jump() {
      if (onGround) {
        vy = -780;
        onGround = false;
        api.sfx('jump');
      }
    }

    function spawnObstacle() {
      var type = Math.random();
      if (type < 0.62) {
        var h = K.rand(38, 62);
        obstacles.push({ x: W + 40, w: K.rand(34, 48), h: h, y: groundY - h, kind: 'crate' });
      } else {
        var hh = K.rand(62, 88);
        obstacles.push({ x: W + 40, w: 30, h: hh, y: groundY - hh, kind: 'barrier' });
      }
    }
    function spawnCoin() {
      coins.push({ x: W + 50, y: groundY - K.rand(80, 150), r: 11, spin: Math.random() * 6 });
    }

    return {
      update: function (dt) {
        anim += dt;
        var pressed = api.takePresses();
        if (pressed.indexOf('ArrowUp') >= 0 || pressed.indexOf('KeyW') >= 0 || pressed.indexOf('Space') >= 0 || pressed.indexOf('Pointer') >= 0) jump();
        if (api.keys.left) px -= 240 * dt;
        if (api.keys.right) px += 240 * dt;
        px = K.clamp(px, 130, 360);

        vy += 2350 * dt;
        py += vy * dt;
        if (py >= groundY) { py = groundY; vy = 0; onGround = true; }

        speed = Math.min(720, 380 + dist * 0.02);
        dist += speed * dt;

        spawnT -= dt;
        coinT -= dt;
        if (spawnT <= 0) { spawnT = K.rand(0.85, 1.5) * (480 / speed); spawnObstacle(); }
        if (coinT <= 0) { coinT = K.rand(1.1, 2.2); spawnCoin(); }

        for (var i = obstacles.length - 1; i >= 0; i--) {
          var o = obstacles[i];
          o.x -= speed * dt;
          if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
          if (K.overlap(px - 16, py - 52, 32, 52, o.x, o.y, o.w, o.h)) {
            api.sfx('boom');
            api.end('Took a tumble');
            return;
          }
        }
        for (var c = coins.length - 1; c >= 0; c--) {
          var coin = coins[c];
          coin.x -= speed * dt;
          coin.spin += dt * 5;
          if (coin.x < -30) { coins.splice(c, 1); continue; }
          var dx = coin.x - px, dy = coin.y - (py - 26);
          if (dx * dx + dy * dy < 34 * 34) {
            coins.splice(c, 1);
            coinScore += 25;
            api.sfx('pickup');
          }
        }
        api.setScore(Math.floor(dist / 12) + coinScore);
        if (shake > 0) shake = Math.max(0, shake - dt * 30);
      },
      draw: function () {
        ctx.save();
        if (shake > 0) ctx.translate(K.rand(-shake, shake), K.rand(-shake, shake));
        var sky = ctx.createLinearGradient(0, 0, 0, groundY);
        sky.addColorStop(0, '#2b1320');
        sky.addColorStop(0.55, '#5d2338');
        sky.addColorStop(1, '#ff8a5c');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        /* sun */
        var sun = ctx.createRadialGradient(700, 230, 20, 700, 230, 190);
        sun.addColorStop(0, 'rgba(255,179,71,0.95)');
        sun.addColorStop(1, 'rgba(255,94,94,0.06)');
        K.circle(ctx, 700, 250, 180, sun);
        /* birds */
        ctx.strokeStyle = 'rgba(30,10,20,0.7)'; ctx.lineWidth = 3;
        for (var b = 0; b < 4; b++) {
          var bx = 120 + ((b * 190 + anim * 12) % 800), by = 100 + b * 34;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 8, by - 8, bx + 16, by); ctx.quadraticCurveTo(bx + 24, by - 8, bx + 32, by); ctx.stroke();
        }
        /* skyline layers */
        function skyline(offset, base, hmax, color, alpha) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          for (var i = 0; i < 14; i++) {
            var x = ((i * 82 - offset) % 1148 + 1148) % 1148 - 90;
            var h = 70 + ((i * 47) % hmax);
            ctx.fillRect(x, base - h, 64, h);
            ctx.fillStyle = 'rgba(255,209,102,0.35)';
            for (var wy = 0; wy < 3; wy++) {
              for (var wx = 0; wx < 2; wx++) {
                if ((i + wy + wx) % 3 === 0) ctx.fillRect(x + 12 + wx * 24, base - h + 16 + wy * 22, 7, 9);
              }
            }
            ctx.fillStyle = color;
          }
          ctx.globalAlpha = 1;
        }
        skyline(dist * 0.08, 440, 180, '#2a1220', 0.85);
        skyline(dist * 0.18, 476, 250, '#1a0b16', 1);
        /* rooftop */
        ctx.fillStyle = '#120811';
        ctx.fillRect(0, groundY, W, H - groundY);
        ctx.fillStyle = '#ff8a5c';
        ctx.fillRect(0, groundY, W, 4);
        ctx.fillStyle = 'rgba(255,138,92,0.15)';
        for (var l = 0; l < 12; l++) ctx.fillRect(((l * 90 - dist * 0.8) % 1080 + 1080) % 1080, groundY + 30, 60, 3);
        /* coins */
        for (var c = 0; c < coins.length; c++) {
          var coin = coins[c];
          var squash = Math.abs(Math.cos(coin.spin));
          ctx.save(); ctx.translate(coin.x, coin.y); ctx.scale(Math.max(0.2, squash), 1);
          K.circle(ctx, 0, 0, coin.r, '#ffd166');
          K.circle(ctx, 0, 0, coin.r * 0.55, '#ffb347');
          ctx.restore();
        }
        /* obstacles */
        for (var o = 0; o < obstacles.length; o++) {
          var ob = obstacles[o];
          if (ob.kind === 'crate') {
            K.rr(ctx, ob.x, ob.y, ob.w, ob.h, 4, '#2a1a12', '#ffb347');
            ctx.fillStyle = 'rgba(255,179,71,0.35)';
            ctx.fillRect(ob.x + 5, ob.y + 5, ob.w - 10, 4);
            ctx.fillRect(ob.x + ob.w / 2 - 2, ob.y + 6, 4, ob.h - 12);
          } else {
            ctx.fillStyle = '#1a0d08';
            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
            ctx.fillStyle = '#ff5e5e';
            for (var s = 0; s < 4; s++) ctx.fillRect(ob.x + 3, ob.y + 10 + s * 18, ob.w - 6, 6);
            ctx.strokeStyle = '#ff5e5e'; ctx.lineWidth = 2; ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
          }
        }
        /* player */
        var run = onGround ? Math.sin(anim * 16) : 0;
        ctx.save();
        ctx.translate(px, py);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0, 2, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        /* legs */
        ctx.beginPath(); ctx.moveTo(-2, -24); ctx.lineTo(-12 + run * 8, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, -24); ctx.lineTo(16 - run * 8, 0); ctx.stroke();
        /* body */
        ctx.fillStyle = '#ff5e5e';
        K.rr(ctx, -13, -58, 26, 38, 8, '#ff5e5e');
        /* arms */
        ctx.strokeStyle = '#ffb347';
        ctx.beginPath(); ctx.moveTo(-8, -48); ctx.lineTo(-24 - run * 6, -28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -48); ctx.lineTo(24 + run * 6, -30); ctx.stroke();
        /* head */
        K.circle(ctx, 0, -70, 13, '#ffd166');
        ctx.fillStyle = '#2b1320';
        ctx.fillRect(2, -74, 6, 3);
        /* scarf */
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(10, -56); ctx.quadraticCurveTo(34, -52 + Math.sin(anim * 10) * 5, 46, -62); ctx.stroke();
        ctx.restore();
        ctx.restore();
      }
    };
  };

  /* ======================================================================
     STREET FURY — 2.5D beat 'em up
     ====================================================================== */
  E.brawler = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var p = { x: 250, y: 470, hp: 100, face: 1, atkT: 0, cd: 0, hitT: 0, walk: 0 };
    var enemies = [], particles = [], spawnT = 1.6, t = 0, score = 0, shake = 0;

    function spawnEnemy() {
      var side = Math.random() < 0.5 ? -1 : 1;
      enemies.push({
        x: side < 0 ? -50 : W + 50,
        y: K.rand(390, 535),
        hp: 2,
        face: side < 0 ? 1 : -1,
        cd: K.rand(0.4, 1.2),
        hitT: 0,
        speed: K.rand(52, 78) + Math.min(60, t * 1.6),
        walk: Math.random() * 5
      });
    }

    function drawPerson(x, y, scale, coat, face, punchT, hitT, isPlayer) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale * face, scale);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      var step = Math.sin(p.walk * 3) * 0.32;
      /* legs */
      ctx.strokeStyle = '#121019'; ctx.lineWidth = 11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, -46); ctx.lineTo(-12 - step * 8, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -46); ctx.lineTo(14 + step * 8, -2); ctx.stroke();
      /* body */
      K.rr(ctx, -22, -108, 44, 64, 12, coat, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-18, -102, 36, 4);
      /* belt */
      ctx.fillStyle = '#0d0b12'; ctx.fillRect(-20, -52, 40, 6);
      /* head */
      K.circle(ctx, 0, -128, 19, isPlayer ? '#e8b98a' : '#c99a72');
      ctx.fillStyle = '#0d0b12';
      ctx.beginPath(); ctx.arc(0, -136, 19, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(-19, -136, 38, 5);
      /* eyes */
      ctx.fillStyle = '#120d14';
      ctx.fillRect(4, -132, 5, 3);
      /* arms */
      ctx.strokeStyle = coat; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(-16, -96); ctx.lineTo(-26, -66); ctx.stroke();
      var reach = punchT > 0 ? 46 : 24;
      ctx.beginPath(); ctx.moveTo(14, -96); ctx.lineTo(reach, punchT > 0 ? -92 : -70); ctx.stroke();
      if (punchT > 0) {
        K.circle(ctx, reach + 6, -92, 8, '#ffd166');
        ctx.globalAlpha = 0.5;
        K.circle(ctx, reach + 6, -92, 20, '#ff6b35');
        ctx.globalAlpha = 1;
      }
      if (hitT > 0) {
        ctx.globalAlpha = Math.min(0.65, hitT * 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-30, -150, 60, 150);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    return {
      update: function (dt) {
        t += dt;
        var pressed = api.takePresses();
        var mvx = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        var mvy = (api.keys.down ? 1 : 0) - (api.keys.up ? 1 : 0);
        p.x = K.clamp(p.x + mvx * 290 * dt, 70, W - 70);
        p.y = K.clamp(p.y + mvy * 170 * dt, 385, 545);
        if (mvx) p.face = mvx;
        p.walk += Math.abs(mvx) * dt * 4 + 0.4 * dt;
        p.cd = Math.max(0, p.cd - dt);
        p.atkT = Math.max(0, p.atkT - dt);
        p.hitT = Math.max(0, p.hitT - dt);
        shake = Math.max(0, shake - dt * 30);

        if ((pressed.indexOf('Space') >= 0 || pressed.indexOf('KeyZ') >= 0 || pressed.indexOf('KeyX') >= 0 || pressed.indexOf('Pointer') >= 0) && p.cd <= 0) {
          p.cd = 0.32; p.atkT = 0.18; api.sfx('laser');
          for (var i = enemies.length - 1; i >= 0; i--) {
            var en = enemies[i];
            var dx = en.x - p.x, dy = en.y - p.y;
            if (dy < 70 && Math.abs(dx) < 105 && dx * p.face > -10) {
              en.hp -= 1; en.hitT = 0.22; en.x += p.face * 34;
              K.burst(particles, en.x, en.y - 80, '#ffd166', 8, 180);
              api.sfx('hit'); score += 100;
              if (en.hp <= 0) {
                enemies.splice(i, 1);
                score += 150;
                K.burst(particles, en.x, en.y - 60, '#ff6b35', 16, 260);
              }
            }
          }
        }

        spawnT -= dt;
        if (spawnT <= 0 && enemies.length < 5) {
          spawnT = Math.max(0.7, 2.1 - t * 0.025);
          spawnEnemy();
        }

        for (var e = enemies.length - 1; e >= 0; e--) {
          var en = enemies[e];
          en.cd = Math.max(0, en.cd - dt);
          en.hitT = Math.max(0, en.hitT - dt);
          var ddx = p.x - en.x, ddy = p.y - en.y;
          var dist = Math.sqrt(ddx * ddx + ddy * ddy);
          en.face = ddx > 0 ? 1 : -1;
          en.walk += dt * 4;
          if (dist > 62) {
            en.x += (ddx / dist) * en.speed * dt;
            en.y += (ddy / dist) * en.speed * 0.5 * dt;
          } else if (en.cd <= 0) {
            en.cd = K.rand(0.9, 1.5);
            p.hp -= 8;
            p.hitT = 0.22;
            shake = 9;
            api.sfx('hit');
            p.x = K.clamp(p.x + (en.face > 0 ? -1 : 1) * 18, 60, W - 60);
            if (p.hp <= 0) { api.end('Knocked out'); return; }
          }
          if (en.y < 370) en.y = 370;
          if (en.y > 555) en.y = 555;
        }
        api.setScore(score);
        K.stepParticles(particles, dt, 220);
      },
      draw: function () {
        ctx.save();
        if (shake > 0) ctx.translate(K.rand(-shake, shake), K.rand(-shake, shake));
        K.bg(ctx, '#1b1020', '#0b0710');
        /* wall / buildings */
        ctx.fillStyle = '#241326';
        ctx.fillRect(0, 0, W, 400);
        for (var r = 0; r < 8; r++) {
          for (var c = 0; c < 12; c++) {
            ctx.fillStyle = (r + c) % 4 === 0 ? '#2d1930' : '#28152a';
            ctx.fillRect(c * 88 + (r % 2 ? 30 : 0) - 20, 20 + r * 42, 80, 36);
          }
        }
        /* windows */
        for (var w = 0; w < 26; w++) {
          var lit = (w * 7) % 5 === 0;
          ctx.fillStyle = lit ? '#ffd166' : '#1a0d1c';
          ctx.globalAlpha = lit ? 0.55 : 0.8;
          ctx.fillRect(40 + (w % 13) * 70, 70 + Math.floor(w / 13) * 120, 26, 40);
        }
        ctx.globalAlpha = 1;
        /* neon signs */
        ctx.globalAlpha = 0.75;
        K.rr(ctx, 60, 130, 26, 160, 8, '#ff6b35');
        K.rr(ctx, 850, 170, 20, 120, 7, '#b14cff');
        ctx.globalAlpha = 1;
        for (var n = 0; n < 4; n++) {
          ctx.fillStyle = '#1b1020';
          ctx.fillRect(68, 148 + n * 34, 10, 10);
        }
        /* light beams */
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(300, 0); ctx.lineTo(150, 420); ctx.lineTo(-40, 420); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b14cff';
        ctx.beginPath(); ctx.moveTo(700, 0); ctx.lineTo(850, 0); ctx.lineTo(960, 420); ctx.lineTo(780, 420); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        /* street */
        var gr = ctx.createLinearGradient(0, 380, 0, H);
        gr.addColorStop(0, '#1b0e1c');
        gr.addColorStop(1, '#08050b');
        ctx.fillStyle = gr;
        ctx.fillRect(0, 380, W, H - 380);
        ctx.strokeStyle = 'rgba(255,107,53,0.2)'; ctx.lineWidth = 2;
        for (var l = 0; l < 4; l++) {
          ctx.beginPath();
          ctx.moveTo(0, 420 + l * 46);
          ctx.lineTo(W, 420 + l * 46);
          ctx.stroke();
        }
        /* sidewalk edge */
        ctx.fillStyle = '#2a1626'; ctx.fillRect(0, 366, W, 18);
        ctx.fillStyle = '#ff6b35'; ctx.globalAlpha = 0.4; ctx.fillRect(0, 366, W, 3); ctx.globalAlpha = 1;
        /* characters sorted by depth */
        var chars = enemies.map(function (en) { return { type: 'e', en: en, y: en.y }; });
        chars.push({ type: 'p', y: p.y });
        chars.sort(function (a, b) { return a.y - b.y; });
        for (var i = 0; i < chars.length; i++) {
          var ch = chars[i];
          if (ch.type === 'e') {
            var sc = 0.72 + (ch.en.y - 380) / 170 * 0.34;
            drawPerson(ch.en.x, ch.en.y, sc, ch.en.hp > 1 ? '#7a3fb0' : '#5a2f86', ch.en.face, 0, ch.en.hitT, false);
          } else {
            var ps = 0.9 + (p.y - 380) / 170 * 0.34;
            drawPerson(p.x, p.y, ps, '#ff6b35', p.face, p.atkT, p.hitT, true);
          }
        }
        K.drawParticles(ctx, particles);
        /* health bar */
        ctx.fillStyle = 'rgba(8,8,11,0.72)';
        ctx.fillRect(26, 24, 270, 22);
        ctx.fillStyle = '#33131c';
        ctx.fillRect(30, 28, 262, 14);
        ctx.fillStyle = p.hp > 35 ? '#d8ff3e' : '#ff4d5e';
        ctx.fillRect(30, 28, 262 * Math.max(0, p.hp) / 100, 14);
        K.mono(ctx, 'VITALITY', 30, 66, 11, 'rgba(255,255,255,0.55)');
        K.mono(ctx, Math.max(0, p.hp) + '%', 292, 66, 11, 'rgba(255,255,255,0.55)', 'right');
        K.mono(ctx, 'WAVE ' + String(Math.floor(t / 12) + 1).padStart(2, '0'), W - 28, 42, 12, 'rgba(255,255,255,0.5)', 'right');
        ctx.restore();
      }
    };
  };

  /* ======================================================================
     DUEL CIRCUIT — 1v1 side-view fighter
     ====================================================================== */
  E.duel = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var floorY = 500, t = 0, score = 0, particles = [], shake = 0, over = false;
    var p = { x: 300, y: floorY, vy: 0, hp: 100, face: 1, atk: 0, cd: 0, hitT: 0, block: false, onGround: true };
    var e = { x: 680, y: floorY, vy: 0, hp: 100, face: -1, atk: 0, cd: 0, hitT: 0, block: false, onGround: true, think: 0.8, dir: 0 };

    function jump(who) {
      if (who.onGround) { who.vy = -720; who.onGround = false; }
    }

    function drawFighter(x, y, face, colors, atk, blocking, hitT, isPlayer) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(face, 1);
      /* shadow */
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 0, 44, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      var crouch = blocking ? 14 : 0;
      /* legs */
      ctx.strokeStyle = '#171321'; ctx.lineWidth = 13; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-10, -64 + crouch); ctx.lineTo(-20, -3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, -64 + crouch); ctx.lineTo(22, -3); ctx.stroke();
      /* body */
      K.rr(ctx, -28, -150 + crouch, 56, 88, 16, colors[0], 'rgba(0,0,0,0.45)');
      /* chest stripe */
      ctx.fillStyle = colors[1];
      ctx.fillRect(-24, -140 + crouch, 48, 8);
      /* head */
      K.circle(ctx, 0, -180 + crouch, 24, isPlayer ? '#e8b98a' : '#c99a72');
      ctx.fillStyle = colors[2];
      ctx.beginPath(); ctx.arc(0, -190 + crouch, 25, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(-25, -190 + crouch, 50, 6);
      /* eyes */
      ctx.fillStyle = '#100c18';
      ctx.fillRect(6, -181 + crouch, 6, 3);
      /* arms */
      ctx.strokeStyle = colors[0]; ctx.lineWidth = 12;
      var reach = atk > 0 ? 104 : 46;
      ctx.beginPath(); ctx.moveTo(-20, -132 + crouch); ctx.lineTo(-34, -80 + crouch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, -132 + crouch); ctx.lineTo(reach, -132 + crouch); ctx.stroke();
      if (atk > 0) {
        ctx.globalAlpha = 0.45;
        K.circle(ctx, reach + 8, -132 + crouch, 26, colors[1]);
        ctx.globalAlpha = 1;
      }
      if (blocking) {
        ctx.strokeStyle = colors[1]; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(22, -150 + crouch); ctx.lineTo(42, -190 + crouch); ctx.stroke();
      }
      if (hitT > 0) {
        ctx.globalAlpha = Math.min(0.7, hitT * 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-40, -215, 80, 220);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function hit(target, damage, dir) {
      if (target.block) {
        damage = Math.round(damage * 0.15);
        K.burst(particles, target.x + dir * 20, floorY - 130, '#61e8ff', 6, 150);
      } else {
        K.burst(particles, target.x + dir * 20, floorY - 130, '#ffd166', 12, 240);
      }
      target.hp -= damage;
      target.hitT = 0.24;
      target.x = K.clamp(target.x + dir * 26, 130, W - 130);
      shake = 8;
      api.sfx(target.block ? 'bounce' : 'hit');
    }

    return {
      update: function (dt) {
        if (over) return;
        t += dt;
        var pressed = api.takePresses();
        p.cd = Math.max(0, p.cd - dt);
        p.atk = Math.max(0, p.atk - dt);
        p.hitT = Math.max(0, p.hitT - dt);
        p.block = api.keys.down && p.onGround;

        var mv = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        p.x = K.clamp(p.x + mv * 265 * dt, 120, W - 120);
        if (pressed.indexOf('ArrowUp') >= 0 || pressed.indexOf('KeyW') >= 0 || pressed.indexOf('Space') >= 0 || pressed.indexOf('Pointer') >= 0) jump(p);
        if ((pressed.indexOf('Space') >= 0 || pressed.indexOf('KeyZ') >= 0 || pressed.indexOf('KeyX') >= 0 || pressed.indexOf('Pointer') >= 0) && p.cd <= 0) {
          p.cd = 0.42; p.atk = 0.17; api.sfx('laser');
          if (Math.abs(e.x - p.x) < 108 && Math.abs(e.y - p.y) < 110) {
            hit(e, 12, p.x < e.x ? 1 : -1);
            score += 120;
          }
        }
        /* physics */
        [p, e].forEach(function (f) {
          f.vy += 2100 * dt;
          f.y += f.vy * dt;
          if (f.y >= floorY) { f.y = floorY; f.vy = 0; f.onGround = true; }
        });
        p.face = e.x >= p.x ? 1 : -1;
        e.face = p.x >= e.x ? 1 : -1;

        /* enemy AI */
        e.cd = Math.max(0, e.cd - dt);
        e.atk = Math.max(0, e.atk - dt);
        e.hitT = Math.max(0, e.hitT - dt);
        e.think -= dt;
        if (e.think <= 0) {
          e.think = K.rand(0.25, 0.6);
          var d = p.x - e.x;
          var roll = Math.random();
          if (Math.abs(d) > 130) e.dir = Math.sign(d);
          else if (Math.abs(d) < 70) e.dir = -Math.sign(d) * (roll > 0.5 ? 1 : 0);
          else e.dir = roll > 0.55 ? Math.sign(d) : 0;
          e.block = roll < 0.22;
        }
        if (!e.block) e.x = K.clamp(e.x + e.dir * 215 * dt, 120, W - 120);
        if (Math.abs(p.x - e.x) < 108 && e.cd <= 0 && !e.block) {
          e.cd = K.rand(0.7, 1.15); e.atk = 0.17;
          hit(p, 11, e.x < p.x ? 1 : -1);
        } else if (Math.abs(p.x - e.x) < 115 && e.cd <= 0 && e.block) {
          e.cd = 0.9;
        }

        shake = Math.max(0, shake - dt * 34);
        K.stepParticles(particles, dt, 320);
        score = Math.max(score, (100 - e.hp) * 8);
        api.setScore(score);

        if (e.hp <= 0) {
          over = true;
          score += 600;
          api.setScore(score);
          api.sfx('win');
          api.win('Victory');
        } else if (p.hp <= 0) {
          over = true;
          api.end('Knocked out');
        }
      },
      draw: function () {
        ctx.save();
        if (shake > 0) ctx.translate(K.rand(-shake, shake), K.rand(-shake, shake));
        /* sky */
        var sky = ctx.createLinearGradient(0, 0, 0, floorY);
        sky.addColorStop(0, '#08131b');
        sky.addColorStop(0.55, '#123c4c');
        sky.addColorStop(1, '#ff7a45');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, floorY);
        /* sun rings */
        var sun = ctx.createRadialGradient(480, 320, 20, 480, 320, 240);
        sun.addColorStop(0, 'rgba(255,209,102,0.95)');
        sun.addColorStop(1, 'rgba(255,122,69,0.08)');
        K.circle(ctx, 480, 330, 230, sun);
        for (var r = 0; r < 7; r++) {
          ctx.strokeStyle = 'rgba(8,19,27,0.4)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(480, 330, 90 + r * 24, 0, Math.PI * 2); ctx.stroke();
        }
        /* crowd */
        ctx.fillStyle = '#071016';
        for (var i = 0; i < 34; i++) {
          var x = i * 30 + 8;
          var h = 60 + ((i * 37) % 70);
          ctx.fillRect(x, floorY - h - 20, 22, h);
          K.circle(ctx, x + 11, floorY - h - 26, 11, '#071016');
        }
        /* floor */
        ctx.fillStyle = '#050a0d';
        ctx.fillRect(0, floorY, W, H - floorY);
        ctx.fillStyle = 'rgba(97,232,255,0.2)';
        ctx.fillRect(0, floorY, W, 3);
        for (var l = 0; l < 6; l++) {
          K.line(ctx, 480, floorY, -200 + l * 280, H, 'rgba(97,232,255,0.09)', 2);
        }
        /* fighters */
        var order = p.x < e.x ? [p, e] : [e, p];
        order.forEach(function (f) {
          var isP = f === p;
          drawFighter(f.x, f.y, f.face, isP ? ['#1b6d7c', '#61e8ff', '#0d1a24'] : ['#7a1f3a', '#ff3d6e', '#290a15'], f.atk, f.block, f.hitT, isP);
        });
        K.drawParticles(ctx, particles);
        /* health bars */
        function bar(x, y, hp, color, alignRight, name) {
          ctx.fillStyle = 'rgba(8,8,11,0.7)';
          ctx.fillRect(x, y, 330, 30);
          ctx.fillStyle = '#1b1b24';
          ctx.fillRect(x + 4, y + 4, 322, 12);
          var w = 322 * Math.max(0, hp) / 100;
          ctx.fillStyle = color;
          ctx.fillRect(alignRight ? x + 4 + (322 - w) : x + 4, y + 4, w, 12);
          K.mono(ctx, name, alignRight ? x + 326 : x + 4, y + 27, 10, 'rgba(255,255,255,0.7)', alignRight ? 'right' : 'left');
        }
        bar(28, 26, p.hp, '#61e8ff', false, 'YOU');
        bar(W - 358, 26, e.hp, '#ff3d6e', true, 'RIVAL');
        K.mono(ctx, 'ROUND 01', W / 2, 46, 12, 'rgba(255,255,255,0.45)', 'center');
        ctx.restore();
      }
    };
  };

}());
