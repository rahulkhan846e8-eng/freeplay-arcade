/* ==========================================================================
   CABINET — engines: blockfall (tetris), sky hopper (flappy)
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CABINET;
  var E = C.ENGINES;
  var K = C.EngineKit;

  /* ======================================================================
     BLOCKFALL — falling blocks
     ====================================================================== */
  E.tetris = function (api) {
    var ctx = api.ctx;
    var COLS = 10, ROWS = 20, CELL = 26;
    var OX = (960 - COLS * CELL) / 2, OY = 40;
    var SHAPES = {
      I: { c: '#4de1ff', m: [[1, 1, 1, 1]] },
      J: { c: '#7aa2ff', m: [[1, 0, 0], [1, 1, 1]] },
      L: { c: '#ffb347', m: [[0, 0, 1], [1, 1, 1]] },
      O: { c: '#ffd166', m: [[1, 1], [1, 1]] },
      S: { c: '#54ffa8', m: [[0, 1, 1], [1, 1, 0]] },
      T: { c: '#b18bff', m: [[0, 1, 0], [1, 1, 1]] },
      Z: { c: '#ff5fa2', m: [[1, 1, 0], [0, 1, 1]] }
    };
    var board = [];
    for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));
    var bag = [];
    var cur = null, next = null;
    var score = 0, lines = 0, level = 1, gravity = 0, interval = 0.7;
    var das = 0, lastDir = 0, downT = 0, over = false, flash = 0;

    function makeBag() {
      var keys = Object.keys(SHAPES);
      for (var i = keys.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = keys[i]; keys[i] = keys[j]; keys[j] = tmp;
      }
      return keys;
    }
    function pick() {
      if (!bag.length) bag = makeBag();
      var key = bag.pop();
      return { type: key, c: SHAPES[key].c, m: SHAPES[key].m.map(function (row) { return row.slice(); }) };
    }
    function rotate(m) {
      var rows = m.length, cols = m[0].length;
      var out = [];
      for (var c = 0; c < cols; c++) {
        var row = [];
        for (var r = rows - 1; r >= 0; r--) row.push(m[r][c]);
        out.push(row);
      }
      return out;
    }
    function collides(m, px, py) {
      for (var r = 0; r < m.length; r++) {
        for (var c = 0; c < m[r].length; c++) {
          if (!m[r][c]) continue;
          var x = px + c, y = py + r;
          if (x < 0 || x >= COLS || y >= ROWS) return true;
          if (y >= 0 && board[y][x]) return true;
        }
      }
      return false;
    }
    function spawn() {
      cur = next || pick();
      next = pick();
      cur.x = Math.floor((COLS - cur.m[0].length) / 2);
      cur.y = 0;
      gravity = 0;
      if (collides(cur.m, cur.x, cur.y)) {
        over = true;
        api.sfx('over');
        api.end('Stack topped out');
      }
    }
    function merge() {
      for (var r = 0; r < cur.m.length; r++) {
        for (var c = 0; c < cur.m[r].length; c++) {
          if (!cur.m[r][c]) continue;
          var y = cur.y + r;
          if (y >= 0) board[y][cur.x + c] = cur.c;
        }
      }
    }
    function clearLines() {
      var cleared = 0;
      for (var r = ROWS - 1; r >= 0; r--) {
        var full = board[r].every(function (v) { return !!v; });
        if (full) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(null));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        var points = [0, 100, 300, 500, 800][cleared] * level;
        score += points;
        level = Math.floor(lines / 10) + 1;
        interval = Math.max(0.07, 0.7 - (level - 1) * 0.058);
        flash = 0.3;
        api.sfx('line');
        api.setScore(score);
      }
    }
    function lock() {
      merge();
      clearLines();
      spawn();
    }
    function move(dx) {
      if (!collides(cur.m, cur.x + dx, cur.y)) cur.x += dx;
    }
    function tryRotate() {
      var m = rotate(cur.m);
      var kicks = [0, -1, 1, -2, 2];
      for (var i = 0; i < kicks.length; i++) {
        if (!collides(m, cur.x + kicks[i], cur.y)) {
          cur.m = m;
          cur.x += kicks[i];
          api.sfx('blip');
          return;
        }
      }
    }
    function ghostY() {
      var y = cur.y;
      while (!collides(cur.m, cur.x, y + 1)) y++;
      return y;
    }
    function hardDrop() {
      var gy = ghostY();
      score += (gy - cur.y) * 2;
      cur.y = gy;
      api.setScore(score);
      lock();
    }

    spawn();

    return {
      update: function (dt) {
        if (over) return;
        var pressed = api.takePresses();
        for (var i = 0; i < pressed.length; i++) {
          var code = pressed[i];
          if (code === 'ArrowUp' || code === 'KeyW' || code === 'KeyX' || code === 'KeyZ') tryRotate();
          else if (code === 'Space') hardDrop();
        }
        if (over) return;

        var dir = (api.keys.right ? 1 : 0) - (api.keys.left ? 1 : 0);
        if (dir !== lastDir) {
          if (dir) { move(dir); das = 0.17; }
          lastDir = dir;
        } else if (dir) {
          das -= dt;
          if (das <= 0) { move(dir); das = 0.055; }
        }

        var speedUp = api.keys.down ? 9 : 1;
        gravity += dt * speedUp;
        while (gravity >= interval) {
          gravity -= interval;
          if (!collides(cur.m, cur.x, cur.y + 1)) {
            cur.y++;
            if (api.keys.down) { score += 1; api.setScore(score); }
          } else {
            lock();
            break;
          }
        }
        if (flash > 0) flash -= dt;
        api.setScore(score);
      },
      draw: function () {
        K.bg(ctx, '#0c0b1c', '#050409');
        /* board panel */
        K.rr(ctx, OX - 10, OY - 10, COLS * CELL + 20, ROWS * CELL + 20, 10, 'rgba(8,8,16,0.8)', 'rgba(143,123,255,0.3)');
        /* grid */
        ctx.strokeStyle = 'rgba(143,123,255,0.09)'; ctx.lineWidth = 1;
        for (var x = 0; x <= COLS; x++) {
          ctx.beginPath(); ctx.moveTo(OX + x * CELL, OY); ctx.lineTo(OX + x * CELL, OY + ROWS * CELL); ctx.stroke();
        }
        for (var y = 0; y <= ROWS; y++) {
          ctx.beginPath(); ctx.moveTo(OX, OY + y * CELL); ctx.lineTo(OX + COLS * CELL, OY + y * CELL); ctx.stroke();
        }

        function block(x, y, color, size, alpha) {
          ctx.globalAlpha = alpha == null ? 1 : alpha;
          K.rr(ctx, x + 1, y + 1, size - 2, size - 2, 4, color, 'rgba(0,0,0,0.35)');
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.fillRect(x + 4, y + 4, size - 8, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + 4, y + size - 8, size - 8, 3);
          ctx.globalAlpha = 1;
        }

        /* board blocks */
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            if (board[r][c]) block(OX + c * CELL, OY + r * CELL, board[r][c], CELL);
          }
        }
        /* ghost */
        if (cur && !over) {
          var gy = ghostY();
          for (var gr = 0; gr < cur.m.length; gr++) {
            for (var gc = 0; gc < cur.m[gr].length; gc++) {
              if (cur.m[gr][gc] && gy + gr >= 0) {
                ctx.globalAlpha = 0.18;
                ctx.strokeStyle = cur.c;
                ctx.lineWidth = 2;
                ctx.strokeRect(OX + (cur.x + gc) * CELL + 2, OY + (gy + gr) * CELL + 2, CELL - 4, CELL - 4);
                ctx.globalAlpha = 1;
              }
            }
          }
          /* current */
          for (var cr = 0; cr < cur.m.length; cr++) {
            for (var cc = 0; cc < cur.m[cr].length; cc++) {
              if (cur.m[cr][cc] && cur.y + cr >= 0) block(OX + (cur.x + cc) * CELL, OY + (cur.y + cr) * CELL, cur.c, CELL);
            }
          }
        }
        if (flash > 0) {
          ctx.globalAlpha = Math.min(0.25, flash);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(OX, OY, COLS * CELL, ROWS * CELL);
          ctx.globalAlpha = 1;
        }

        /* left panel */
        var lx = 52;
        K.mono(ctx, 'SCORE', lx, 86, 10, 'rgba(255,255,255,0.4)');
        K.label(ctx, String(score).padStart(5, '0'), lx, 130, 34, '#f2efe6', 'left', 800, "'Bricolage Grotesque', sans-serif");
        K.mono(ctx, 'LEVEL', lx, 186, 10, 'rgba(255,255,255,0.4)');
        K.label(ctx, String(level).padStart(2, '0'), lx, 228, 34, '#8f7bff', 'left', 800, "'Bricolage Grotesque', sans-serif");
        K.mono(ctx, 'LINES', lx, 284, 10, 'rgba(255,255,255,0.4)');
        K.label(ctx, String(lines).padStart(3, '0'), lx, 326, 34, '#4de1ff', 'left', 800, "'Bricolage Grotesque', sans-serif");
        K.mono(ctx, 'CLEAR FOUR', lx, 390, 9, 'rgba(255,255,255,0.25)');
        K.mono(ctx, 'FOR 800 PTS', lx, 404, 9, 'rgba(255,255,255,0.25)');

        /* next panel */
        var nx = 660;
        K.mono(ctx, 'NEXT', nx, 94, 10, 'rgba(255,255,255,0.4)');
        K.rr(ctx, nx, 110, 200, 150, 10, 'rgba(8,8,16,0.7)', 'rgba(143,123,255,0.22)');
        if (next) {
          var m = next.m;
          var w = m[0].length * 24, h = m.length * 24;
          var sx = nx + 100 - w / 2, sy = 185 - h / 2;
          for (var rr2 = 0; rr2 < m.length; rr2++) {
            for (var cc2 = 0; cc2 < m[rr2].length; cc2++) {
              if (m[rr2][cc2]) block(sx + cc2 * 24, sy + rr2 * 24, next.c, 24);
            }
          }
        }
        K.mono(ctx, 'ROTATE  ↑ / X', nx, 310, 9, 'rgba(255,255,255,0.3)');
        K.mono(ctx, 'DROP    SPACE', nx, 328, 9, 'rgba(255,255,255,0.3)');
        K.mono(ctx, 'MOVE    ← →', nx, 346, 9, 'rgba(255,255,255,0.3)');

        /* level pips */
        for (var i = 0; i < 10; i++) {
          ctx.fillStyle = i < lines % 10 ? '#4de1ff' : 'rgba(255,255,255,0.12)';
          ctx.fillRect(lx + i * 16, 346, 10, 5);
        }
      }
    };
  };

  /* ======================================================================
     SKY HOPPER — one-button flyer
     ====================================================================== */
  E.flappy = function (api) {
    var ctx = api.ctx, W = api.W, H = api.H;
    var groundY = 536;
    var bird = { x: 285, y: 280, vy: 0, r: 16, rot: 0 };
    var pipes = [], score = 0, spawnT = 1.1, t = 0, started = false, scroll = 0;
    var gap = 176, speed = 235;

    function flap() {
      bird.vy = -430;
      api.sfx('jump');
      started = true;
    }
    function addPipe() {
      var gapY = K.rand(120, groundY - gap - 90);
      pipes.push({ x: W + 80, gapY: gapY, scored: false, w: 78 });
    }
    addPipe();

    return {
      update: function (dt) {
        t += dt;
        var pressed = api.takePresses();
        for (var i = 0; i < pressed.length; i++) {
          if (pressed[i] === 'Space' || pressed[i] === 'Pointer' || pressed[i] === 'ArrowUp' || pressed[i] === 'KeyW' || pressed[i] === 'KeyZ') flap();
        }
        if (!started) {
          bird.y = 280 + Math.sin(t * 3) * 10;
        } else {
          bird.vy += 1480 * dt;
          bird.y += bird.vy * dt;
          bird.rot = K.clamp(bird.vy / 900, -0.5, 1.1);
        }
        speed = 235 + score * 0.35;
        scroll += speed * dt;

        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = 1.5;
          addPipe();
        }

        for (var p = pipes.length - 1; p >= 0; p--) {
          var pipe = pipes[p];
          pipe.x -= speed * dt;
          if (pipe.x + pipe.w < -20) { pipes.splice(p, 1); continue; }
          if (!pipe.scored && pipe.x + pipe.w < bird.x) {
            pipe.scored = true;
            score++;
            api.setScore(score * 10);
            api.sfx('point');
          }
          if (started) {
            var top = { x: pipe.x, y: 0, w: pipe.w, h: pipe.gapY };
            var bot = { x: pipe.x, y: pipe.gapY + gap, w: pipe.w, h: groundY - (pipe.gapY + gap) };
            if (K.circleRect(bird.x, bird.y, bird.r - 2, top.x, top.y, top.w, top.h) ||
                K.circleRect(bird.x, bird.y, bird.r - 2, bot.x, bot.y, bot.w, bot.h)) {
              api.sfx('boom');
              api.end('Down you go');
              return;
            }
          }
        }
        if (started && (bird.y + bird.r > groundY || bird.y - bird.r < 6)) {
          api.sfx('boom');
          api.end(bird.y < 60 ? 'Too high' : 'Grounded');
          return;
        }
      },
      draw: function () {
        /* sky */
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0b2530');
        sky.addColorStop(0.6, '#1c6b74');
        sky.addColorStop(1, '#7ce8c4');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        /* sun */
        ctx.globalAlpha = 0.55;
        K.circle(ctx, 760, 130, 74, '#ffd166');
        ctx.globalAlpha = 0.12;
        K.circle(ctx, 760, 130, 130, '#ffd166');
        ctx.globalAlpha = 1;
        /* clouds */
        function cloud(x, y, s, a) {
          ctx.globalAlpha = a;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(x, y, 52 * s, 18 * s, 0, 0, Math.PI * 2);
          ctx.ellipse(x - 24 * s, y - 10 * s, 28 * s, 18 * s, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 22 * s, y - 12 * s, 32 * s, 20 * s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        cloud(((80 - scroll * 0.15) % 1100 + 1100) % 1100 - 70, 120, 1.1, 0.16);
        cloud(((420 - scroll * 0.1) % 1100 + 1100) % 1100 - 70, 210, 0.8, 0.1);
        cloud(((700 - scroll * 0.18) % 1100 + 1100) % 1100 - 70, 80, 1.4, 0.13);
        /* far city */
        ctx.fillStyle = 'rgba(8,38,42,0.55)';
        for (var i = 0; i < 12; i++) {
          var bx = ((i * 90 - scroll * 0.3) % 1080 + 1080) % 1080 - 60;
          var bh = 60 + ((i * 43) % 110);
          ctx.fillRect(bx, groundY - bh - 20, 58, bh);
        }
        /* pipes */
        for (var p = 0; p < pipes.length; p++) {
          var pipe = pipes[p];
          var col = '#54c98f';
          /* body top */
          K.rr(ctx, pipe.x, -10, pipe.w, pipe.gapY + 10, 6, col, '#0a2a22');
          /* cap top */
          K.rr(ctx, pipe.x - 10, pipe.gapY - 34, pipe.w + 20, 36, 6, '#6ee5a8', '#0a2a22');
          /* body bottom */
          K.rr(ctx, pipe.x, pipe.gapY + gap, pipe.w, groundY - (pipe.gapY + gap) + 10, 6, col, '#0a2a22');
          /* cap bottom */
          K.rr(ctx, pipe.x - 10, pipe.gapY + gap, pipe.w + 20, 36, 6, '#6ee5a8', '#0a2a22');
          /* highlights */
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(pipe.x + 10, 0, 12, Math.max(0, pipe.gapY - 34));
          ctx.fillRect(pipe.x + 10, pipe.gapY + gap + 36, 12, Math.max(0, groundY - (pipe.gapY + gap) - 36));
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(pipe.x + pipe.w - 20, 0, 10, Math.max(0, pipe.gapY - 34));
          ctx.fillRect(pipe.x + pipe.w - 20, pipe.gapY + gap + 36, 10, Math.max(0, groundY - (pipe.gapY + gap) - 36));
        }
        /* ground */
        ctx.fillStyle = '#173c33';
        ctx.fillRect(0, groundY, W, H - groundY);
        ctx.fillStyle = '#7ce8c4';
        ctx.fillRect(0, groundY, W, 5);
        ctx.fillStyle = 'rgba(124,232,196,0.16)';
        for (var g = 0; g < 14; g++) {
          var gx = ((g * 80 - scroll) % 1120 + 1120) % 1120;
          ctx.fillRect(gx, groundY + 22, 46, 4);
        }
        /* bird */
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.rot);
        ctx.globalAlpha = 0.25;
        K.circle(ctx, 0, 6, 30, '#000');
        ctx.globalAlpha = 1;
        K.circle(ctx, 0, 0, bird.r + 6, '#ffd166');
        K.circle(ctx, 0, 0, bird.r, '#ffb347');
        /* wing */
        var wing = started ? Math.sin(t * 18) * 7 : Math.sin(t * 6) * 3;
        ctx.fillStyle = '#ffe6a8';
        ctx.beginPath();
        ctx.ellipse(-6, 6 + wing, 14, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a8691c'; ctx.lineWidth = 2; ctx.stroke();
        /* eye + beak */
        K.circle(ctx, 9, -7, 6, '#ffffff');
        K.circle(ctx, 11, -7, 2.6, '#10201c');
        ctx.fillStyle = '#ff7a45';
        ctx.beginPath(); ctx.moveTo(16, -2); ctx.lineTo(30, 3); ctx.lineTo(16, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
        /* start hint */
        if (!started) {
          K.mono(ctx, 'TAP OR PRESS SPACE', W / 2, 400, 12, 'rgba(255,255,255,0.7)', 'center');
          K.mono(ctx, 'TO FLAP', W / 2, 420, 10, 'rgba(255,255,255,0.4)', 'center');
        }
        /* score */
        K.label(ctx, String(score), W / 2, 96, 56, '#ffffff', 'center', 800, "'Bricolage Grotesque', sans-serif");
        K.mono(ctx, 'PIPES', W / 2, 122, 9, 'rgba(255,255,255,0.45)', 'center');
      }
    };
  };

}());
