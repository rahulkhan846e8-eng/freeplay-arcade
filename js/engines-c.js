/* ==========================================================================
   CABINET — engines: snake, breaker, pong
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CABINET;
  var E = C.ENGINES;
  var K = C.EngineKit;

  /* ======================================================================
     SNAKE CIRCUIT
     ====================================================================== */
  E.snake = function (api) {
    var ctx = api.ctx;
    var cols = 30, rows = 18, cell = 30, ox = 30, oy = 48;
    var snake = [{ x: 15, y: 9 }, { x: 14, y: 9 }, { x: 13, y: 9 }];
    var dir = { x: 1, y: 0 }, queue = [];
    var pellet = { x: 22, y: 9 };
    var acc = 0, interval = 0.14, score = 0, t = 0, growth = 0;
    var particles = [];

    function occupied(x, y) {
      return snake.some(function (s) { return s.x === x && s.y === y; });
    }
    function spawnPellet() {
      var x, y, guard = 0;
      do {
        x = Math.floor(Math.random() * cols);
        y = Math.floor(Math.random() * rows);
        guard++;
      } while (occupied(x, y) && guard < 500);
      pellet = { x: x, y: y };
    }
    spawnPellet();

    function changeDir(nx, ny) {
      var last = queue.length ? queue[queue.length - 1] : dir;
      if (last.x === -nx && last.y === -ny) return;
      if (last.x === nx && last.y === ny) return;
      if (queue.length < 2) queue.push({ x: nx, y: ny });
    }

    return {
      update: function (dt) {
        t += dt;
        var pressed = api.takePresses();
        for (var i = 0; i < pressed.length; i++) {
          var code = pressed[i];
          if (code === 'ArrowUp' || code === 'KeyW') changeDir(0, -1);
          else if (code === 'ArrowDown' || code === 'KeyS') changeDir(0, 1);
          else if (code === 'ArrowLeft' || code === 'KeyA') changeDir(-1, 0);
          else if (code === 'ArrowRight' || code === 'KeyD' || code === 'Pointer') changeDir(1, 0);
        }
        acc += dt;
        while (acc >= interval) {
          acc -= interval;
          if (queue.length) dir = queue.shift();
          var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
          if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
            api.sfx('boom');
            api.end('Hit the wall');
            return;
          }
          var self = false;
          for (var s = 0; s < snake.length - 1; s++) {
            if (snake[s].x === head.x && snake[s].y === head.y) { self = true; break; }
          }
          if (self) {
            api.sfx('boom');
            api.end('Bit your own tail');
            return;
          }
          snake.unshift(head);
          if (head.x === pellet.x && head.y === pellet.y) {
            score += 10;
            growth += 1;
            api.sfx('pickup');
            K.burst(particles, ox + pellet.x * cell + cell / 2, oy + pellet.y * cell + cell / 2, '#e6ff57', 12, 160);
            spawnPellet();
            interval = Math.max(0.072, interval - 0.002);
            api.setScore(score);
          } else {
            snake.pop();
          }
        }
        K.stepParticles(particles, dt, 40);
      },
      draw: function () {
        K.bg(ctx, '#04140f', '#020806');
        /* board frame */
        K.rr(ctx, ox - 8, oy - 8, cols * cell + 16, rows * cell + 16, 10, 'rgba(4,20,15,0.6)', 'rgba(84,255,168,0.25)');
        /* grid */
        ctx.strokeStyle = 'rgba(84,255,168,0.07)'; ctx.lineWidth = 1;
        for (var x = 0; x <= cols; x++) {
          ctx.beginPath(); ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + rows * cell); ctx.stroke();
        }
        for (var y = 0; y <= rows; y++) {
          ctx.beginPath(); ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + cols * cell, oy + y * cell); ctx.stroke();
        }
        /* pellet */
        var pulse = 1 + Math.sin(t * 7) * 0.12;
        ctx.globalAlpha = 0.2;
        K.circle(ctx, ox + pellet.x * cell + cell / 2, oy + pellet.y * cell + cell / 2, cell * 0.9 * pulse, '#e6ff57');
        ctx.globalAlpha = 1;
        K.circle(ctx, ox + pellet.x * cell + cell / 2, oy + pellet.y * cell + cell / 2, cell * 0.3, '#e6ff57');
        K.circle(ctx, ox + pellet.x * cell + cell / 2 - 3, oy + pellet.y * cell + cell / 2 - 3, cell * 0.09, '#ffffff');
        /* snake */
        for (var s = snake.length - 1; s >= 0; s--) {
          var seg = snake[s];
          var sx = ox + seg.x * cell;
          var sy = oy + seg.y * cell;
          var ratio = 1 - s / (snake.length + 6);
          ctx.globalAlpha = 0.35 + ratio * 0.65;
          K.rr(ctx, sx + 2, sy + 2, cell - 4, cell - 4, 7, s === 0 ? '#d8ff3e' : s % 2 ? '#54ffa8' : '#3ee08c');
        }
        ctx.globalAlpha = 1;
        /* head detail */
        var hx = ox + snake[0].x * cell, hy = oy + snake[0].y * cell;
        ctx.fillStyle = '#04140f';
        var eye1 = { x: hx + cell / 2 + dir.x * 5 - dir.y * 5, y: hy + cell / 2 + dir.y * 5 + dir.x * 5 };
        var eye2 = { x: hx + cell / 2 + dir.x * 5 + dir.y * 5, y: hy + cell / 2 + dir.y * 5 - dir.x * 5 };
        K.circle(ctx, eye1.x, eye1.y, 3, '#04140f');
        K.circle(ctx, eye2.x, eye2.y, 3, '#04140f');
        K.circle(ctx, hx + cell / 2 + dir.x * 9, hy + cell / 2 + dir.y * 9, 2.5, '#ff5c7a');
        K.drawParticles(ctx, particles);
        /* hud */
        K.mono(ctx, 'LENGTH ' + String(snake.length).padStart(3, '0'), 30, 32, 11, 'rgba(84,255,168,0.7)');
        K.mono(ctx, 'SPEED ' + (Math.round((0.14 / interval) * 100)) + '%', 930, 32, 11, 'rgba(255,255,255,0.35)', 'right');
      }
    };
  };

  /* ======================================================================
     BRICK BLITZ
     ====================================================================== */
  E.breaker = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var colors = ['#ff5fa2', '#57e6ff', '#ffd166', '#c8ff3e', '#b18bff'];
    var cols = 9, rows = 5, bw = 86, bh = 26, gap = 6;
    var startX = (W - (cols * bw + (cols - 1) * gap)) / 2, startY = 92;
    var bricks = [];
    var paddle = { x: W / 2, y: 552, w: 152, h: 15 };
    var ball = { x: W / 2, y: 520, vx: 0, vy: 0, r: 9, stuck: true };
    var lives = 3, score = 0, delay = 0.7, trail = [], particles = [], t = 0, launched = false;

    function build() {
      bricks = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          bricks.push({ x: startX + c * (bw + gap), y: startY + r * (bh + gap), w: bw, h: bh, row: r, alive: true });
        }
      }
    }
    build();

    function resetBall() {
      ball.stuck = true;
      ball.x = paddle.x;
      ball.y = paddle.y - ball.r - 2;
      ball.vx = 0;
      ball.vy = 0;
      delay = 0.75;
      launched = false;
      trail = [];
    }
    function loseLife() {
      lives--;
      api.sfx('over');
      if (lives <= 0) { api.end('Out of balls'); return; }
      resetBall();
    }

    return {
      update: function (dt) {
        t += dt;
        api.takePresses();
        var pv = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        if (pv) paddle.x += pv * 720 * dt;
        else paddle.x = K.lerp(paddle.x, api.pointer.x, Math.min(1, dt * 18));
        paddle.x = K.clamp(paddle.x, paddle.w / 2 + 8, W - paddle.w / 2 - 8);

        if (ball.stuck) {
          ball.x = paddle.x;
          ball.y = paddle.y - ball.r - 2;
          delay -= dt;
          if (delay <= 0) {
            ball.stuck = false;
            launched = true;
            var a = K.rand(-0.7, 0.7) - Math.PI / 2;
            ball.vx = Math.cos(a) * 400;
            ball.vy = Math.sin(a) * 400;
          }
        }

        if (!ball.stuck) {
          trail.push({ x: ball.x, y: ball.y, life: 0.3 });
          var steps = 2;
          for (var step = 0; step < steps; step++) {
            ball.x += (ball.vx * dt) / steps;
            ball.y += (ball.vy * dt) / steps;
            if (ball.x - ball.r < 10) { ball.x = 10 + ball.r; ball.vx = Math.abs(ball.vx); api.sfx('bounce'); }
            if (ball.x + ball.r > W - 10) { ball.x = W - 10 - ball.r; ball.vx = -Math.abs(ball.vx); api.sfx('bounce'); }
            if (ball.y - ball.r < 10) { ball.y = 10 + ball.r; ball.vy = Math.abs(ball.vy); api.sfx('bounce'); }
            /* paddle */
            if (ball.vy > 0 && ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h &&
                ball.x > paddle.x - paddle.w / 2 - 6 && ball.x < paddle.x + paddle.w / 2 + 6) {
              var off = (ball.x - paddle.x) / (paddle.w / 2);
              var speed = Math.min(640, Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.02);
              var ang = off * 1.05 - Math.PI / 2;
              ball.vx = Math.cos(ang) * speed;
              ball.vy = Math.sin(ang) * speed;
              ball.y = paddle.y - ball.r - 1;
              api.sfx('bounce');
            }
            /* bricks */
            for (var i = 0; i < bricks.length; i++) {
              var b = bricks[i];
              if (!b.alive) continue;
              if (K.circleRect(ball.x, ball.y, ball.r, b.x, b.y, b.w, b.h)) {
                b.alive = false;
                score += 50;
                api.setScore(score);
                K.burst(particles, ball.x, ball.y, colors[b.row], 10, 180);
                api.sfx('point');
                /* decide axis */
                var overlapLeft = Math.abs(ball.x + ball.r - b.x);
                var overlapRight = Math.abs(b.x + b.w - (ball.x - ball.r));
                var overlapTop = Math.abs(ball.y + ball.r - b.y);
                var overlapBottom = Math.abs(b.y + b.h - (ball.y - ball.r));
                var minX = Math.min(overlapLeft, overlapRight);
                var minY = Math.min(overlapTop, overlapBottom);
                if (minX < minY) ball.vx = -ball.vx;
                else ball.vy = -ball.vy;
                break;
              }
            }
            if (ball.y - ball.r > H) {
              loseLife();
              if (lives <= 0) return;
              break;
            }
          }
        }

        for (var tr = trail.length - 1; tr >= 0; tr--) {
          trail[tr].life -= dt;
          if (trail[tr].life <= 0) trail.splice(tr, 1);
        }
        K.stepParticles(particles, dt, 220);

        if (!bricks.some(function (b) { return b.alive; })) {
          score += 500;
          api.setScore(score);
          api.sfx('win');
          api.win('Wall cleared');
        }
        api.setScore(score);
      },
      draw: function () {
        K.bg(ctx, '#1a0714', '#08030a');
        /* ambient glow */
        var glow = ctx.createRadialGradient(W / 2, 200, 20, W / 2, 200, 400);
        glow.addColorStop(0, 'rgba(255,95,162,0.18)');
        glow.addColorStop(1, 'rgba(255,95,162,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        /* bricks */
        for (var i = 0; i < bricks.length; i++) {
          var b = bricks[i];
          if (!b.alive) continue;
          var col = colors[b.row];
          K.rr(ctx, b.x, b.y, b.w, b.h, 4, col, 'rgba(0,0,0,0.35)');
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(b.x + 4, b.y + b.h - 7, b.w - 8, 3);
        }
        /* trail */
        for (var tr = 0; tr < trail.length; tr++) {
          ctx.globalAlpha = Math.max(0, trail[tr].life * 2);
          K.circle(ctx, trail[tr].x, trail[tr].y, ball.r * 0.7, '#57e6ff');
        }
        ctx.globalAlpha = 1;
        /* paddle */
        ctx.globalAlpha = 0.25;
        K.rr(ctx, paddle.x - paddle.w / 2 - 6, paddle.y - 6, paddle.w + 12, paddle.h + 12, 14, '#ff5fa2');
        ctx.globalAlpha = 1;
        K.rr(ctx, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 7, '#ff5fa2');
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(paddle.x - paddle.w / 2 + 8, paddle.y + 4, paddle.w - 16, 4);
        /* ball */
        ctx.globalAlpha = 0.3;
        K.circle(ctx, ball.x, ball.y, ball.r * 2.2, '#57e6ff');
        ctx.globalAlpha = 1;
        K.circle(ctx, ball.x, ball.y, ball.r, '#ffffff');
        K.circle(ctx, ball.x + 2, ball.y + 2, ball.r * 0.55, '#57e6ff');
        K.drawParticles(ctx, particles);
        /* HUD */
        K.mono(ctx, 'LIVES', 26, 36, 10, 'rgba(255,255,255,0.4)');
        for (var l = 0; l < 3; l++) {
          ctx.fillStyle = l < lives ? '#ff5fa2' : 'rgba(255,255,255,0.13)';
          ctx.fillRect(26 + l * 20, 46, 14, 8);
        }
        K.mono(ctx, 'LEVEL 01', W - 26, 36, 10, 'rgba(255,255,255,0.35)', 'right');
      }
    };
  };

  /* ======================================================================
     PIXEL PONG
     ====================================================================== */
  E.pong = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var pH = 108, eH = 108;
    var p = { y: H / 2 }, e = { y: H / 2 };
    var ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9 };
    var ps = 0, es = 0, serveT = 0.9, rallies = 0, mouse = false;
    var lastPtrY = api.pointer.y, trail = [], over = false, t = 0;

    function serve(dir) {
      ball.x = W / 2;
      ball.y = H / 2;
      ball.vx = dir * 380;
      ball.vy = K.rand(-170, 170);
      serveT = 0;
    }
    function scorePoint(who) {
      if (who === 'p') ps++; else es++;
      rallies = 0;
      trail = [];
      api.sfx(who === 'p' ? 'point' : 'hit');
      if (ps >= 7 || es >= 7) {
        over = true;
        if (ps >= 7) {
          api.setScore(ps * 100 + rallies);
          api.sfx('win');
          api.win('Set won');
        } else {
          api.end('Set lost');
        }
        return;
      }
      serve(who === 'p' ? -1 : 1);
    }

    return {
      update: function (dt) {
        if (over) return;
        t += dt;
        api.takePresses();
        if (Math.abs(api.pointer.y - lastPtrY) > 0.6) mouse = true;
        lastPtrY = api.pointer.y;
        if (mouse) {
          p.y = K.lerp(p.y, api.pointer.y, 0.55);
        } else {
          var mv = (api.keys.down ? 1 : 0) - (api.keys.up ? 1 : 0);
          p.y += mv * 620 * dt;
        }
        p.y = K.clamp(p.y, pH / 2 + 14, H - pH / 2 - 14);

        /* AI */
        var target = ball.y + K.rand(-16, 16);
        e.y += K.clamp(target - e.y, -330 * dt, 330 * dt);
        e.y = K.clamp(e.y, eH / 2 + 14, H - eH / 2 - 14);

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.y - ball.r < 14) { ball.y = 14 + ball.r; ball.vy = Math.abs(ball.vy); api.sfx('bounce'); }
        if (ball.y + ball.r > H - 14) { ball.y = H - 14 - ball.r; ball.vy = -Math.abs(ball.vy); api.sfx('bounce'); }

        var pxEdge = 58, exEdge = W - 58;
        if (ball.vx < 0 && ball.x - ball.r < pxEdge + 9 && ball.x + ball.r > pxEdge - 9 &&
            ball.y > p.y - pH / 2 && ball.y < p.y + pH / 2) {
          var off = (ball.y - p.y) / (pH / 2);
          var sp = Math.min(760, Math.abs(ball.vx) * 1.055);
          ball.vx = Math.abs(sp);
          ball.vy = off * 380 + K.rand(-30, 30);
          ball.x = pxEdge + 12 + ball.r;
          rallies++;
          api.sfx('bounce');
        }
        if (ball.vx > 0 && ball.x + ball.r > exEdge - 9 && ball.x - ball.r < exEdge + 9 &&
            ball.y > e.y - eH / 2 && ball.y < e.y + eH / 2) {
          var off2 = (ball.y - e.y) / (eH / 2);
          var sp2 = Math.min(760, Math.abs(ball.vx) * 1.055);
          ball.vx = -Math.abs(sp2);
          ball.vy = off2 * 380 + K.rand(-30, 30);
          ball.x = exEdge - 12 - ball.r;
          rallies++;
          api.sfx('bounce');
        }

        if (ball.x < -20) scorePoint('e');
        else if (ball.x > W + 20) scorePoint('p');
        if (over) return;

        trail.push({ x: ball.x, y: ball.y, life: 0.28 });
        for (var i = trail.length - 1; i >= 0; i--) { trail[i].life -= dt; if (trail[i].life <= 0) trail.splice(i, 1); }
        api.setScore(ps * 100 + rallies);
      },
      draw: function () {
        K.bg(ctx, '#0a0a12', '#050508');
        /* court */
        ctx.strokeStyle = 'rgba(122,162,255,0.22)'; ctx.lineWidth = 2;
        ctx.strokeRect(46, 60, W - 92, H - 120);
        ctx.setLineDash([16, 16]);
        K.line(ctx, W / 2, 60, W / 2, H - 60, 'rgba(122,162,255,0.3)', 3, [16, 16]);
        ctx.setLineDash([]);
        /* giant score */
        ctx.globalAlpha = 0.14;
        K.label(ctx, String(ps), W / 4, 240, 190, '#e8ff65', 'center', 800, "'Bricolage Grotesque', sans-serif");
        K.label(ctx, String(es), (W * 3) / 4, 240, 190, '#7aa2ff', 'center', 800, "'Bricolage Grotesque', sans-serif");
        ctx.globalAlpha = 1;
        /* trail */
        for (var i = 0; i < trail.length; i++) {
          ctx.globalAlpha = Math.max(0, trail[i].life * 2);
          K.circle(ctx, trail[i].x, trail[i].y, ball.r * 0.8, '#e8ff65');
        }
        ctx.globalAlpha = 1;
        /* paddles */
        ctx.globalAlpha = 0.25;
        K.rr(ctx, 52, p.y - pH / 2 - 5, 26, pH + 10, 8, '#e8ff65');
        K.rr(ctx, W - 78, e.y - eH / 2 - 5, 26, eH + 10, 8, '#7aa2ff');
        ctx.globalAlpha = 1;
        K.rr(ctx, 58, p.y - pH / 2, 18, pH, 9, '#e8ff65');
        K.rr(ctx, W - 76, e.y - eH / 2, 18, eH, 9, '#7aa2ff');
        /* ball */
        K.circle(ctx, ball.x, ball.y, ball.r + 6, 'rgba(255,255,255,0.12)');
        K.circle(ctx, ball.x, ball.y, ball.r, '#ffffff');
        /* labels */
        K.mono(ctx, 'YOU', 58, 42, 10, 'rgba(255,255,255,0.45)');
        K.mono(ctx, 'RIVAL', W - 58, 42, 10, 'rgba(255,255,255,0.45)', 'right');
        K.mono(ctx, 'FIRST TO 7', W / 2, 42, 10, 'rgba(255,255,255,0.3)', 'center');
      }
    };
  };

}());
