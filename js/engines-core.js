/* ==========================================================================
   CABINET — shared canvas helpers for the game engines
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CABINET = window.CABINET || {};

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function line(ctx, x1, y1, x2, y2, color, width, dash) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    if (dash) ctx.setLineDash(dash);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }
  function label(ctx, text, x, y, size, color, align, weight, family) {
    ctx.font = (weight || 700) + ' ' + size + 'px ' + (family || "'Space Grotesk', sans-serif");
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }
  function mono(ctx, text, x, y, size, color, align) {
    label(ctx, text, x, y, size, color, align, 700, "'JetBrains Mono', monospace");
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    var nx = clamp(cx, rx, rx + rw);
    var ny = clamp(cy, ry, ry + rh);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }
  function pixelArt(ctx, rows, x, y, s, color) {
    ctx.fillStyle = color;
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < rows[r].length; c++) {
        if (rows[r][c] === '1') ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
  }
  function bg(ctx, top, bottom) {
    var g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 600);
  }
  function burst(list, x, y, color, count, speed) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = speed * (0.35 + Math.random() * 0.8);
      list.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 1, color: color, r: 2 + Math.random() * 3 });
    }
  }
  function stepParticles(list, dt, gravity) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (gravity == null ? 420 : gravity) * dt;
      if (p.life <= 0) list.splice(i, 1);
    }
  }
  function drawParticles(ctx, list) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
    ctx.globalAlpha = 1;
  }
  function panel(ctx, x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill || 'rgba(8,8,11,0.7)';
    ctx.fillRect(x, y, w, h);
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  }

  C.EngineKit = {
    rr: rr, circle: circle, line: line, label: label, mono: mono,
    rand: rand, clamp: clamp, overlap: overlap, circleRect: circleRect,
    pixelArt: pixelArt, bg: bg, burst: burst, stepParticles: stepParticles,
    drawParticles: drawParticles, panel: panel
  };
  C.ENGINES = C.ENGINES || {};
}());
