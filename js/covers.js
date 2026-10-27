/* ==========================================================================
   CABINET - cover artwork
   Original typographic posters generated in code. No box art, no ripped
   assets. Each poster is derived from the game's catalogue number, collection
   palette and a deterministic geometric motif.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.CABINET = window.CABINET || {};
  var uidCounter = 0;
  var PAPER = '#f2eddf';

  function hexToRgb(hex) {
    var h = String(hex || '#0b0b0b').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0x0b0b0b;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); };
    return '#' + f(r) + f(g) + f(b);
  }
  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
  }
  function alpha(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }
  function hash(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    var s = seed || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* ---------- motifs ---------- */
  var MOTIFS = {};

  MOTIFS.grid = function (g, accent, accent2) {
    var lines = '';
    for (var i = -6; i <= 6; i++) {
      lines += '<line x1="300" y1="330" x2="' + (300 + i * 170) + '" y2="880" stroke="' + alpha(PAPER, 0.24) + '" stroke-width="2"/>';
    }
    var hz = '';
    var y = 350;
    var step = 9;
    for (var n = 0; n < 12; n++) {
      hz += '<line x1="-80" y1="' + y + '" x2="680" y2="' + y + '" stroke="' + alpha(PAPER, 0.18) + '" stroke-width="2"/>';
      y += step;
      step *= 1.42;
    }
    return '<circle cx="430" cy="232" r="136" fill="' + accent + '"/>' +
      '<circle cx="430" cy="232" r="104" fill="none" stroke="' + alpha(g.bg || '#0b0b0b', 0.5) + '" stroke-width="2"/>' +
      '<line x1="-80" y1="330" x2="680" y2="330" stroke="' + alpha(PAPER, 0.55) + '" stroke-width="4"/>' +
      lines + hz +
      '<rect x="48" y="276" width="54" height="54" fill="' + accent2 + '"/>' +
      '<rect x="512" y="380" width="28" height="120" fill="' + alpha(accent, 0.85) + '"/>';
  };

  MOTIFS.rings = function (g, accent, accent2) {
    var rings = '';
    var radii = [34, 76, 118, 166, 220, 278];
    radii.forEach(function (r, i) {
      rings += '<circle cx="392" cy="330" r="' + r + '" fill="none" stroke="' + alpha(i % 2 ? PAPER : accent, i % 2 ? 0.34 : 0.95) + '" stroke-width="' + (i === 3 ? 14 : 3) + '"/>';
    });
    return '<rect x="-40" y="560" width="700" height="260" fill="' + alpha(accent2, 0.16) + '"/>' +
      rings +
      '<circle cx="392" cy="330" r="18" fill="' + PAPER + '"/>' +
      '<line x1="30" y1="720" x2="570" y2="120" stroke="' + alpha(PAPER, 0.22) + '" stroke-width="2"/>' +
      '<circle cx="88" cy="190" r="34" fill="none" stroke="' + accent2 + '" stroke-width="3"/>';
  };

  MOTIFS.rays = function (g, accent, accent2) {
    var rays = '';
    var cx = 300, cy = 330;
    for (var i = 0; i < 24; i++) {
      var a1 = (i / 24) * Math.PI * 2;
      var a2 = ((i + 0.5) / 24) * Math.PI * 2;
      var r = 720;
      rays += '<path d="M' + cx + ' ' + cy + ' L' + (cx + Math.cos(a1) * r) + ' ' + (cy + Math.sin(a1) * r) + ' L' + (cx + Math.cos(a2) * r) + ' ' + (cy + Math.sin(a2) * r) + ' Z" fill="' + alpha(i % 2 ? accent : PAPER, i % 2 ? 0.2 : 0.07) + '"/>';
    }
    return rays +
      '<circle cx="300" cy="330" r="150" fill="' + alpha(g.bg || '#0b0b0b', 0.82) + '" stroke="' + accent + '" stroke-width="8"/>' +
      '<circle cx="300" cy="330" r="64" fill="' + accent2 + '"/>' +
      '<path d="M300 240 L322 300 L386 300 L334 336 L354 398 L300 360 L246 398 L266 336 L214 300 L278 300 Z" fill="' + PAPER + '"/>';
  };

  MOTIFS.speed = function (g, accent, accent2) {
    var bands = '';
    for (var i = 0; i < 11; i++) {
      var x = -220 + i * 108;
      bands += '<path d="M' + x + ' 840 L' + (x + 330) + ' 0 L' + (x + 420) + ' 0 L' + (x + 90) + ' 840 Z" fill="' + alpha(i % 3 === 0 ? accent : PAPER, i % 3 === 0 ? 0.38 : 0.07) + '"/>';
    }
    var chevrons = '';
    for (var j = 0; j < 3; j++) {
      chevrons += '<path d="M' + (80 + j * 34) + ' 540 L' + (230 + j * 34) + ' 390 L' + (380 + j * 34) + ' 540" fill="none" stroke="' + alpha(PAPER, 0.5 - j * 0.12) + '" stroke-width="6"/>';
    }
    return bands + chevrons +
      '<circle cx="462" cy="194" r="76" fill="' + accent2 + '"/>' +
      '<rect x="56" y="680" width="132" height="10" fill="' + accent + '"/>' +
      '<rect x="56" y="704" width="82" height="10" fill="' + alpha(PAPER, 0.45) + '"/>';
  };

  MOTIFS.blocks = function (g, accent, accent2) {
    var r = rng(hash(g.slug));
    var blocks = '';
    for (var i = 0; i < 18; i++) {
      var w = 48 + r() * 130;
      var h = 42 + r() * 110;
      var x = 40 + r() * 520;
      var y = 100 + r() * 500;
      blocks += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (i % 4 === 0 ? accent : alpha(PAPER, 0.07)) + '" stroke="' + alpha(PAPER, 0.28) + '" stroke-width="2"/>';
    }
    return blocks +
      '<rect x="70" y="560" width="220" height="150" fill="' + accent2 + '"/>' +
      '<line x1="70" y1="635" x2="290" y2="635" stroke="' + alpha(g.bg || '#0b0b0b', 0.6) + '" stroke-width="3"/>' +
      '<circle cx="500" cy="170" r="42" fill="none" stroke="' + accent + '" stroke-width="10"/>';
  };

  MOTIFS.wave = function (g, accent, accent2) {
    var paths = '';
    for (var i = 0; i < 9; i++) {
      var off = i * 34;
      var pts = [];
      for (var x = -20; x <= 620; x += 20) {
        var y = 380 + off + Math.sin((x + i * 42) / 92) * (52 - i * 3) + Math.sin(x / 41) * 12;
        pts.push((x === -20 ? 'M' : 'L') + x + ' ' + y.toFixed(1));
      }
      paths += '<path d="' + pts.join(' ') + '" fill="none" stroke="' + alpha(i % 3 === 0 ? accent : PAPER, i % 3 === 0 ? 0.9 : 0.18) + '" stroke-width="' + (i % 3 === 0 ? 5 : 3) + '"/>';
    }
    return '<circle cx="448" cy="190" r="118" fill="' + alpha(accent2, 0.88) + '"/>' + paths +
      '<circle cx="448" cy="190" r="118" fill="none" stroke="' + PAPER + '" stroke-width="2" stroke-dasharray="4 10"/>';
  };

  MOTIFS.bars = function (g, accent, accent2) {
    var r = rng(hash(g.slug));
    var bars = '';
    for (var i = 0; i < 13; i++) {
      var w = 22 + r() * 28;
      var h = 90 + r() * 420;
      var x = 24 + i * 43;
      bars += '<rect x="' + x.toFixed(1) + '" y="' + (700 - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (i % 4 === 0 ? accent : alpha(PAPER, 0.12)) + '"/>';
    }
    return bars +
      '<circle cx="300" cy="196" r="104" fill="none" stroke="' + accent2 + '" stroke-width="26"/>' +
      '<circle cx="300" cy="196" r="30" fill="' + PAPER + '"/>' +
      '<line x1="0" y1="700" x2="600" y2="700" stroke="' + accent + '" stroke-width="6"/>';
  };

  MOTIFS.burst = function (g, accent, accent2) {
    var cx = 300, cy = 315, points = 28, outer = 250, inner = 96;
    var d = '';
    for (var i = 0; i < points * 2; i++) {
      var a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      var rad = i % 2 ? inner : outer;
      d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1);
    }
    d += 'Z';
    var dots = '';
    for (var x = 40; x < 580; x += 22) {
      for (var y = 80; y < 750; y += 22) {
        if (Math.abs(x - 300) < 190 && Math.abs(y - 380) < 190) continue;
        dots += '<circle cx="' + x + '" cy="' + y + '" r="1.6" fill="' + alpha(PAPER, 0.32) + '"/>';
      }
    }
    return dots +
      '<path d="' + d + '" fill="' + alpha(accent, 0.9) + '" stroke="' + alpha(PAPER, 0.4) + '" stroke-width="2"/>' +
      '<circle cx="300" cy="315" r="82" fill="' + (g.bg || '#0b0b0b') + '" stroke="' + accent2 + '" stroke-width="12"/>' +
      '<circle cx="300" cy="315" r="14" fill="' + PAPER + '"/>';
  };

  /* ---------- public ---------- */
  C.coverSVG = function (game) {
    if (!game) return '';
    var uid = 'p' + (++uidCounter) + '-' + game.slug.replace(/[^a-z0-9]/g, '');
    var motif = MOTIFS[game.motif] || MOTIFS.burst;
    var D = window.CABINET_DATA;
    var coll = D && D.collection ? D.collection(game.collection) : null;
    var accent = game.accent || (coll ? coll.color : '#d8ff3e');
    var accent2 = game.accent2 || PAPER;
    var bg = game.bg || '#0c0c12';
    var index = pad(game.index || 1);
    var total = D && D.games ? pad(D.games.length) : '148';
    var collLabel = coll ? coll.label : 'ARCADE';
    var body = motif(game, accent, accent2);

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="bg-' + uid + '" x1="0" y1="0" x2="0.4" y2="1">' +
          '<stop offset="0" stop-color="' + mix(bg, accent, 0.13) + '"/>' +
          '<stop offset="1" stop-color="' + bg + '"/>' +
        '</linearGradient>' +
        '<pattern id="dot-' + uid + '" width="12" height="12" patternUnits="userSpaceOnUse">' +
          '<circle cx="1.5" cy="1.5" r="1.1" fill="' + alpha(PAPER, 0.22) + '"/>' +
        '</pattern>' +
      '</defs>' +
      '<rect width="600" height="800" fill="url(#bg-' + uid + ')"/>' +
      '<rect width="600" height="800" fill="url(#dot-' + uid + ')" opacity="0.45"/>' +
      body +
      '<rect x="24" y="24" width="552" height="752" fill="none" stroke="' + alpha(PAPER, 0.18) + '" stroke-width="2"/>' +
      '<text x="46" y="70" font-family="JetBrains Mono, Consolas, monospace" font-size="13" font-weight="700" letter-spacing="3" fill="' + alpha(PAPER, 0.78) + '">ARCADE / ' + collLabel + '</text>' +
      '<text x="554" y="70" text-anchor="end" font-family="JetBrains Mono, Consolas, monospace" font-size="13" font-weight="700" letter-spacing="2" fill="' + alpha(PAPER, 0.55) + '">NO. ' + index + ' / ' + total + '</text>' +
      '<text x="300" y="590" text-anchor="middle" font-family="Anton, Arial Black, sans-serif" font-size="430" fill="none" stroke="' + alpha(PAPER, 0.9) + '" stroke-width="4" letter-spacing="-8">' + index + '</text>' +
      '<text x="300" y="590" text-anchor="middle" font-family="Anton, Arial Black, sans-serif" font-size="430" fill="' + alpha(accent, 0.1) + '" letter-spacing="-8">' + index + '</text>' +
      '<line x1="46" y1="732" x2="160" y2="732" stroke="' + accent + '" stroke-width="6"/>' +
      '<text x="46" y="762" font-family="JetBrains Mono, Consolas, monospace" font-size="12" font-weight="700" letter-spacing="3" fill="' + alpha(PAPER, 0.6) + '">EXTERNAL PLAY LINK</text>' +
      '<g opacity="0.7">' +
        '<rect x="484" y="720" width="3" height="42" fill="' + PAPER + '"/>' +
        '<rect x="491" y="720" width="2" height="42" fill="' + PAPER + '"/>' +
        '<rect x="497" y="720" width="5" height="42" fill="' + PAPER + '"/>' +
        '<rect x="506" y="720" width="2" height="42" fill="' + PAPER + '"/>' +
        '<rect x="512" y="720" width="4" height="42" fill="' + PAPER + '"/>' +
        '<rect x="520" y="720" width="2" height="42" fill="' + PAPER + '"/>' +
        '<rect x="526" y="720" width="5" height="42" fill="' + PAPER + '"/>' +
        '<rect x="535" y="720" width="2" height="42" fill="' + PAPER + '"/>' +
        '<rect x="541" y="720" width="3" height="42" fill="' + PAPER + '"/>' +
        '<rect x="548" y="720" width="6" height="42" fill="' + PAPER + '"/>' +
      '</g>' +
    '</svg>';
  };

  C.coverHTML = function (game, extraClass) {
    var cls = 'cover-art cover-art--' + game.slug + (extraClass ? ' ' + extraClass : '');
    var posterSrc = 'assets/covers/' + game.slug + '.jpg';
    var safeTitle = (game.title || '').replace(/"/g, '&quot;');
    return '<div class="' + cls + '">' +
      '<img class="cover-img" src="' + posterSrc + '" alt="' + safeTitle + ' poster" loading="lazy" onerror="this.style.display=\'none\';var f=this.nextElementSibling;if(f)f.style.display=\'block\';">' +
      '<div class="cover-fallback" style="display:none;width:100%;height:100%;">' + C.coverSVG(game) + '</div>' +
    '</div>';
  };
}());
