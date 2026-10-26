'use strict';
// =============================================================================
// PLAY FREE — arcade engine: SFX, scores, FX helpers, modal wiring + the
// fan-made mini games. No external assets; everything is drawn on canvas.
// =============================================================================

// -----------------------------------------------------------------------------
// Web Audio Retro SFX Synthesizer (no external audio files required)
// -----------------------------------------------------------------------------
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq, type, duration, vol) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* ignore audio errors */ }
}

function sfxLaser()  { playTone(580, 'square', 0.11, 0.06); }
function sfxHit()    { playTone(160, 'sawtooth', 0.18, 0.09); }
function sfxPoint()  { playTone(880, 'triangle', 0.12, 0.07); }
function sfxJump()   { playTone(330, 'square', 0.1, 0.05); }
function sfxPickup() { playTone(1050, 'sine', 0.12, 0.07); }
function sfxBounce() { playTone(440, 'triangle', 0.06, 0.06); }
function sfxBoom()   { playTone(110, 'sawtooth', 0.3, 0.1); setTimeout(function () { playTone(70, 'sawtooth', 0.35, 0.09); }, 90); }
function sfxGameOver() {
  playTone(240, 'sawtooth', 0.25, 0.1);
  setTimeout(function () { playTone(140, 'sawtooth', 0.35, 0.1); }, 160);
}

// Sound toggle (persisted)
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const soundIcon = document.getElementById('sound-icon');
const soundLabel = document.getElementById('sound-label');
function applySoundUI() {
  soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
  soundLabel.textContent = soundEnabled ? 'SFX: ON' : 'SFX: OFF';
}
try { soundEnabled = localStorage.getItem('play_free_sfx') !== '0'; } catch (e) {}
applySoundUI();
soundToggleBtn.addEventListener('click', function () {
  soundEnabled = !soundEnabled;
  try { localStorage.setItem('play_free_sfx', soundEnabled ? '1' : '0'); } catch (e) {}
  applySoundUI();
  if (soundEnabled) sfxPoint();
});

// -----------------------------------------------------------------------------
// High Score Storage (safe localStorage wrapper)
// -----------------------------------------------------------------------------
const SCORE_KEY = 'play_free_brutal_scores_v2';
const highScores = [0, 0, 0, 0, 0, 0];

function loadScores() {
  try {
    const saved = localStorage.getItem(SCORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      for (let i = 0; i < 6; i++) if (typeof parsed[i] === 'number') highScores[i] = parsed[i];
    }
  } catch (e) { /* ignore */ }
  updateScoreBadges();
}

function persistScores() {
  try { localStorage.setItem(SCORE_KEY, JSON.stringify(highScores)); } catch (e) { /* ignore */ }
  updateScoreBadges();
}

function updateScoreBadges() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById('hi-score-' + i);
    if (el) el.textContent = highScores[i];
  }
}

// -----------------------------------------------------------------------------
// Shared FX: particles, floating score text, banners, brutal box drawing
// -----------------------------------------------------------------------------
let parts = [];
let floats = [];
let bannerT = 0;
let bannerText = '';

function boom(x, y, c, n, sp) {
  n = n || 12; sp = sp || 4;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = Math.random() * sp + 1;
    parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 20 + Math.random() * 14, max: 34, c: c, s: 3 + Math.random() * 4 });
  }
}
function addFloat(x, y, txt, c) { floats.push({ x: x, y: y, txt: txt, c: c || '#FFD026', life: 52 }); }
function setBanner(t) { bannerText = t; bannerT = 90; }

function stepFx() {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life--;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.s, p.s);
    ctx.globalAlpha = 1;
  }
  ctx.font = 'bold 15px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.y -= 0.9; f.life--;
    if (f.life <= 0) { floats.splice(i, 1); continue; }
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 22));
    ctx.fillStyle = '#0D0D0D';
    ctx.fillText(f.txt, f.x + 2, f.y + 2);
    ctx.fillStyle = f.c;
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function drawBanner() {
  if (bannerT <= 0) return;
  bannerT--;
  const W = canvas.width, H = canvas.height;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, bannerT / 25));
  ctx.font = '42px "Archivo Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#0D0D0D';
  ctx.strokeText(bannerText, W / 2, H / 2 + 30);
  ctx.fillStyle = '#FFD026';
  ctx.fillText(bannerText, W / 2, H / 2 + 30);
  ctx.restore();
}

function box(x, y, w, h, fill) {
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

// Brighten/darken a hex color (used for tough voxel bricks)
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// -----------------------------------------------------------------------------
// Game Metadata & Modal State
// -----------------------------------------------------------------------------
const GAMES = [
  { id: 0, badge: 'GAME 01 // PC', title: 'GRAND THEFT AUTO 2', color: '#A78BFA',
    controls: 'STEER: ◀ ▶ / A D  •  TURBO: SPACE  •  PAUSE: P' },
  { id: 1, badge: 'GAME 02 // PC', title: 'GRAND THEFT AUTO III', color: '#FF5757',
    controls: 'MOVE: ◀ ▶  •  JUMP: ▲ / W  •  FIRE: SPACE  •  PAUSE: P' },
  { id: 2, badge: 'GAME 03 // PC', title: 'GRAND THEFT AUTO IV', color: '#4CC3FF',
    controls: 'DRIVE: ◀ ▶  •  JUMP: ▲ / W  •  FIRE: SPACE  •  PAUSE: P' },
  { id: 3, badge: 'GAME 04 // PC', title: 'GRAND THEFT AUTO V', color: '#4ADE80',
    controls: 'FLY: ◀ ▶  •  ROCKETS: SPACE  •  PAUSE: P' },
  { id: 4, badge: 'GAME 05 // PC', title: 'MINECRAFT', color: '#FF7CE5',
    controls: 'PADDLE: ◀ ▶ / A D / MOUSE  •  SERVE: SPACE  •  PAUSE: P' },
  { id: 5, badge: 'GAME 06 // PC', title: 'GRAND THEFT AUTO: VICE CITY', color: '#40C9C0',
    controls: 'STEER: ◀ ▶ / A D  •  JUMP: ▲ / W / SPACE  •  PAUSE: P' }
];

const modal = document.getElementById('arcade-modal');
const modalHeaderBar = document.getElementById('modal-header-bar');
const modalGameBadge = document.getElementById('modal-game-badge');
const modalGameTitle = document.getElementById('modal-game-title');
const modalControlsHint = document.getElementById('modal-controls-hint');
const liveScoreEl = document.getElementById('live-score');
const liveBestEl = document.getElementById('live-best');
const extraStatWrap = document.getElementById('extra-stat-wrap');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverHeading = document.getElementById('game-over-heading');
const gameOverSub = document.getElementById('game-over-sub');
const pauseBtn = document.getElementById('pause-game-btn');
const canvas = document.getElementById('arcade-canvas');
const ctx = canvas.getContext('2d');

let activeGameId = null;
let animFrameId = null;
let isGameOver = false;
let isPaused = false;
let currentScore = 0;
let runStartBest = 0;
let pointerX = null;
let canvasClickServe = null;

// Normalized keys: L R U D F
const keys = { L: false, R: false, U: false, D: false, F: false };
const KEYMAP = {
  ArrowLeft: 'L', a: 'L', A: 'L',
  ArrowRight: 'R', d: 'R', D: 'R',
  ArrowUp: 'U', w: 'U', W: 'U',
  ArrowDown: 'D', s: 'D', S: 'D',
  ' ': 'F'
};

window.addEventListener('keydown', function (e) {
  if (activeGameId !== null && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].indexOf(e.key) !== -1) {
    e.preventDefault();
  }
  if (e.key === 'Escape' && activeGameId !== null) { closeGameModal(); return; }
  if ((e.key === 'p' || e.key === 'P') && activeGameId !== null && !isGameOver) { togglePause(); return; }
  const k = KEYMAP[e.key];
  if (k) keys[k] = true;
});

window.addEventListener('keyup', function (e) {
  const k = KEYMAP[e.key];
  if (k) keys[k] = false;
});

function clearKeys() { keys.L = keys.R = keys.U = keys.D = keys.F = false; }

// Touch / mouse on-screen buttons
document.querySelectorAll('.touch-ctrl').forEach(function (btn) {
  const k = btn.getAttribute('data-key');
  const press = function (e) { e.preventDefault(); keys[k] = true; };
  const release = function (e) { e.preventDefault(); keys[k] = false; };
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
  btn.addEventListener('touchcancel', release, { passive: false });
});

// Mouse / pointer paddle control (Minecraft game)
canvas.addEventListener('pointermove', function (e) {
  if (activeGameId !== 4) return;
  const r = canvas.getBoundingClientRect();
  if (r.width === 0) return;
  pointerX = (e.clientX - r.left) / r.width * canvas.width;
});
canvas.addEventListener('pointerdown', function () {
  if (activeGameId === 4 && canvasClickServe) canvasClickServe();
});

// HUD
function updateHud(score, statText) {
  currentScore = score;
  liveScoreEl.textContent = score;
  if (activeGameId !== null && score > highScores[activeGameId]) {
    highScores[activeGameId] = score;
    liveBestEl.textContent = score;
  }
  if (statText !== undefined && statText !== null) {
    extraStatWrap.textContent = statText;
  }
}

function triggerGameOver(titleText) {
  if (isGameOver) return;
  isGameOver = true;
  sfxGameOver();
  persistScores();
  const record = currentScore > runStartBest && currentScore > 0;
  gameOverHeading.textContent = record ? 'NEW RECORD!' : (titleText || 'GAME OVER');
  gameOverSub.textContent = 'FINAL SCORE: ' + currentScore + '  |  BEST: ' + highScores[activeGameId];
  gameOverOverlay.classList.remove('hidden');
  gameOverOverlay.classList.add('flex');
}

function stopCurrentLoop() {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  clearKeys();
}

function togglePause() {
  if (activeGameId === null || isGameOver) return;
  isPaused = !isPaused;
  pauseOverlay.classList.toggle('hidden', !isPaused);
  pauseOverlay.classList.toggle('flex', isPaused);
  pauseBtn.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
  sfxPoint();
}

function launchGame(gameId) {
  stopCurrentLoop();
  activeGameId = gameId;
  isGameOver = false;
  isPaused = false;
  currentScore = 0;
  runStartBest = highScores[gameId];
  pointerX = null;
  parts = []; floats = []; bannerT = 0; bannerText = '';
  canvasClickServe = null;

  const meta = GAMES[gameId];
  modalHeaderBar.style.backgroundColor = meta.color;
  modalGameBadge.textContent = meta.badge;
  modalGameTitle.textContent = meta.title;
  modalControlsHint.textContent = meta.controls;
  liveBestEl.textContent = highScores[gameId];
  pauseOverlay.classList.add('hidden');
  pauseOverlay.classList.remove('flex');
  pauseBtn.textContent = '⏸ PAUSE';
  gameOverOverlay.classList.add('hidden');
  gameOverOverlay.classList.remove('flex');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
  sfxPoint();

  if (gameId === 0) startNeonDrift();
  else if (gameId === 1) startStreetBrawler();
  else if (gameId === 2) startIronTank();
  else if (gameId === 3) startGalaxyInvaders();
  else if (gameId === 4) startVoxelBreaker();
  else if (gameId === 5) startViceHeat();
}

function closeGameModal() {
  stopCurrentLoop();
  if (activeGameId !== null) persistScores();
  activeGameId = null;
  isPaused = false;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.classList.remove('overflow-hidden');
}

// Auto-pause when tab hidden mid-game
document.addEventListener('visibilitychange', function () {
  if (document.hidden && activeGameId !== null && !isGameOver && !isPaused) togglePause();
});

// Wire all game cards and posters (click + keyboard)
document.querySelectorAll('.game-trigger').forEach(function (card) {
  card.addEventListener('click', function () {
    launchGame(parseInt(card.getAttribute('data-game-id'), 10));
  });
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      launchGame(parseInt(card.getAttribute('data-game-id'), 10));
    }
  });
});

document.getElementById('close-modal-btn').addEventListener('click', closeGameModal);
document.getElementById('overlay-exit-btn').addEventListener('click', closeGameModal);
document.getElementById('restart-game-btn').addEventListener('click', function () {
  if (activeGameId !== null) launchGame(activeGameId);
});
document.getElementById('play-again-btn').addEventListener('click', function () {
  if (activeGameId !== null) launchGame(activeGameId);
});
pauseBtn.addEventListener('click', togglePause);

// -----------------------------------------------------------------------------
// GAME 01: GRAND THEFT AUTO 2 — Neon Grid Chase (top-down traffic run)
// -----------------------------------------------------------------------------
function startNeonDrift() {
  const W = canvas.width, H = canvas.height;
  const ROAD_L = 137, ROAD_R = 543;
  const pw = 44, ph = 74, playerY = H - 92;
  let playerX = 300;
  let speed = 6.5, heat = 100, roadOff = 0, score = 0, wanted = 1, spawnT = 20;
  const obs = [];
  const laneX = [150, 240, 330, 420];

  updateHud(0, 'WANTED ★☆☆☆☆');

  function loop() {
    if (isGameOver) return;
    animFrameId = requestAnimationFrame(loop);
    if (isPaused) return;

    const turbo = keys.F && heat > 0;
    if (turbo) { speed = 11; heat = Math.max(0, heat - 2.4); }
    else { speed = 6.5; heat = Math.min(100, heat + 0.7); }

    if (keys.L && playerX > ROAD_L + 4) playerX -= 6.5;
    if (keys.R && playerX < ROAD_R - pw - 4) playerX += 6.5;

    roadOff = (roadOff + speed) % 40;
    spawnT++;
    if (spawnT > (turbo ? 26 : 40)) {
      spawnT = 0;
      const isCop = score > 350 && Math.random() < 0.22;
      const colors = ['#4CC3FF', '#FFD026', '#4ADE80', '#FF7CE5'];
      obs.push({
        x: laneX[Math.floor(Math.random() * laneX.length)],
        y: -80, w: 44, h: 68,
        color: isCop ? '#F3EFE6' : colors[Math.floor(Math.random() * colors.length)],
        cop: isCop, extra: isCop ? 2 : 0, nearSet: false
      });
    }

    // Night backdrop + scrolling windows on side buildings
    ctx.fillStyle = '#17102B';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 208, 38, 0.28)';
    for (let y = -24; y < H + 24; y += 24) {
      const wy = y + (roadOff * 0.6);
      ctx.fillRect(24, wy, 12, 8); ctx.fillRect(58, wy, 12, 8); ctx.fillRect(92, wy, 12, 8);
      ctx.fillRect(W - 104, wy, 12, 8); ctx.fillRect(W - 70, wy, 12, 8); ctx.fillRect(W - 36, wy, 12, 8);
    }
    ctx.fillStyle = '#A78BFA';
    ctx.fillRect(ROAD_L - 8, 0, 8, H);
    ctx.fillRect(ROAD_R, 0, 8, H);
    ctx.fillStyle = '#1E1B2E';
    ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);
    ctx.fillStyle = '#F3EFE6';
    ctx.fillRect(ROAD_L + 2, 0, 3, H);
    ctx.fillRect(ROAD_R - 5, 0, 3, H);
    ctx.fillStyle = '#FFD026';
    for (let y = -40; y < H + 40; y += 40) {
      const yy = y + roadOff;
      ctx.fillRect(W / 2 - 4, yy, 8, 22);
      ctx.fillRect(238, yy, 4, 18);
      ctx.fillRect(428, yy, 4, 18);
    }

    // Obstacles
    for (let i = obs.length - 1; i >= 0; i--) {
      const ob = obs[i];
      ob.y += speed * 0.95 + ob.extra;

      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(ob.x - 3, ob.y - 3, ob.w + 6, ob.h + 6);
      ctx.fillStyle = ob.color;
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(ob.x + 6, ob.y + 12, ob.w - 12, 14);
      if (ob.cop) {
        ctx.fillStyle = '#4CC3FF';
        ctx.fillRect(ob.x + 8, ob.y + 2, ob.w - 16, 6);
      }

      if (
        playerX < ob.x + ob.w - 4 && playerX + pw - 4 > ob.x &&
        playerY < ob.y + ob.h - 4 && playerY + ph - 4 > ob.y
      ) {
        boom(ob.x + ob.w / 2, ob.y + ob.h / 2, '#FF5757', 20, 6);
        sfxBoom();
        triggerGameOver('BUSTED!');
        return;
      }

      if (!ob.nearSet && ob.y > playerY + ph) {
        ob.nearSet = true;
        if (Math.abs((ob.x + ob.w / 2) - (playerX + pw / 2)) < 64) {
          score += 10;
          addFloat(playerX + pw / 2, playerY - 16, 'NEAR MISS +10', '#FF7CE5');
          sfxPoint();
        }
      }
      if (ob.y > H) {
        obs.splice(i, 1);
        const pts = ob.cop ? 40 : (turbo ? 25 : 15);
        score += pts;
        addFloat(ob.x + ob.w / 2, H - 40, '+' + pts, '#FFD026');
        sfxPoint();
      }
    }

    // Player car
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(playerX - 3, playerY - 3, pw + 6, ph + 6);
    ctx.fillStyle = '#FF5757';
    ctx.fillRect(playerX, playerY, pw, ph);
    ctx.fillStyle = '#4CC3FF';
    ctx.fillRect(playerX + 6, playerY + 14, pw - 12, 16);
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(playerX + 2, playerY + 52, pw - 4, 8);
    if (turbo) {
      ctx.fillStyle = '#FFD026';
      ctx.fillRect(playerX + 8, playerY + ph, 10, 14 + Math.random() * 8);
      ctx.fillRect(playerX + pw - 18, playerY + ph, 10, 14 + Math.random() * 8);
      ctx.fillStyle = '#FF5757';
      ctx.fillRect(playerX + 12, playerY + ph, 6, 8);
      ctx.fillRect(playerX + pw - 14, playerY + ph, 6, 8);
    }

    const nw = Math.min(5, 1 + Math.floor(score / 450));
    if (nw !== wanted) { wanted = nw; sfxJump(); }
    updateHud(score, 'WANTED ' + '★'.repeat(wanted) + '☆'.repeat(5 - wanted) + (turbo ? '  •  TURBO 2X' : '  •  HEAT ' + Math.round(heat) + '%'));

    stepFx();
    drawBanner();
  }
  animFrameId = requestAnimationFrame(loop);
}

// -----------------------------------------------------------------------------
// GAME 02: GRAND THEFT AUTO III — Liberty City Turf Showdown (wave brawler)
// -----------------------------------------------------------------------------
function startStreetBrawler() {
  const W = canvas.width, H = canvas.height;
  const groundY = H - 64;
  const player = { x: 140, y: groundY - 84, vy: 0, w: 46, h: 84, hp: 100, cd: 0, face: 1, inv: 0 };
  const enemy = { x: 480, y: groundY - 88, w: 52, h: 88, hp: 100, t: 0, tele: 0 };
  let bullets = [], score = 0, round = 1;

  updateHud(0, 'HP 100%  •  WAVE 1');

  function loop() {
    if (isGameOver) return;
    animFrameId = requestAnimationFrame(loop);
    if (isPaused) return;

    // Player
    if (keys.L) { player.x -= 5; player.face = -1; }
    if (keys.R) { player.x += 5; player.face = 1; }
    const onGround = player.y >= groundY - player.h;
    if (keys.U && onGround) { player.vy = -12.5; sfxJump(); }
    player.y += player.vy;
    if (player.y < groundY - player.h) player.vy += 0.65;
    else { player.y = groundY - player.h; player.vy = 0; }
    player.x = Math.max(20, Math.min(W - player.w - 20, player.x));

    if (player.cd > 0) player.cd--;
    if (player.inv > 0) player.inv--;
    if (keys.F && player.cd === 0) {
      player.cd = 16;
      sfxLaser();
      bullets.push({ x: player.face === 1 ? player.x + player.w : player.x - 20, y: player.y + 26, vx: player.face * 10, own: 'p' });
    }

    // Enemy AI with telegraphed shots
    enemy.t++;
    const eSpeed = 2.3 + round * 0.35;
    if (enemy.x > player.x + 96) enemy.x -= eSpeed;
    else if (enemy.x < player.x - 96) enemy.x += eSpeed;
    enemy.x = Math.max(16, Math.min(W - enemy.w - 16, enemy.x));

    if (enemy.tele > 0) {
      enemy.tele--;
      if (enemy.tele === 0) {
        const dir = player.x < enemy.x ? -1 : 1;
        bullets.push({ x: dir === 1 ? enemy.x + enemy.w : enemy.x - 20, y: enemy.y + 30, vx: dir * 7.5, own: 'e' });
        sfxLaser();
      }
    } else if (enemy.t % Math.max(34, 72 - round * 6) === 0) {
      enemy.tele = 14;
    }

    // Alley backdrop: brick wall
    ctx.fillStyle = '#191024';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#221533';
    for (let y = 0; y < groundY - 20; y += 22) {
      const off = (y / 22) % 2 ? 0 : 22;
      for (let x = off; x < W; x += 44) ctx.fillRect(x, y, 40, 18);
    }
    // Flickering neon signs
    ctx.globalAlpha = enemy.t % 17 < 2 ? 0.35 : 1;
    ctx.fillStyle = '#FF5757';
    ctx.fillRect(70, 46, 96, 38);
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(78, 56, 80, 8); ctx.fillRect(78, 68, 56, 8);
    ctx.globalAlpha = enemy.t % 23 < 2 ? 0.35 : 1;
    ctx.fillStyle = '#4CC3FF';
    ctx.fillRect(500, 56, 110, 38);
    ctx.globalAlpha = 1;
    // Window glow
    ctx.fillStyle = 'rgba(255, 208, 38, 0.5)';
    for (let y = 120; y < groundY - 60; y += 40) {
      ctx.fillRect(30, y, 10, 12); ctx.fillRect(230, y, 10, 12);
      ctx.fillRect(560, y, 10, 12); ctx.fillRect(640, y, 10, 12);
    }
    // Floor
    ctx.fillStyle = '#2D2A38';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#FFD026';
    ctx.fillRect(0, groundY, W, 5);

    // HP bars
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(36, 16, 248, 26); ctx.fillRect(W - 284, 16, 248, 26);
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(40, 20, Math.max(0, player.hp * 2.4), 18);
    ctx.fillStyle = '#FF5757';
    ctx.fillRect(W - 280, 20, Math.max(0, enemy.hp * 2.4), 18);
    ctx.font = 'bold 11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#0D0D0D';
    ctx.textAlign = 'left'; ctx.fillText('YOU', 44, 34);
    ctx.textAlign = 'right'; ctx.fillText('RIVAL W' + round, W - 44, 34);
    ctx.textAlign = 'left';

    // Player (blink while invincible)
    if (player.inv === 0 || player.inv % 8 < 4) {
      box(player.x, player.y, player.w, player.h, '#4CC3FF');
      ctx.fillStyle = '#FF5757';
      ctx.fillRect(player.x, player.y + 12, player.w, 10);
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(player.x + 8, player.y + 10, 10, 8);
      ctx.fillRect(player.x + player.w - 18, player.y + 10, 10, 8);
    }

    // Enemy (flash while telegraphing)
    box(enemy.x, enemy.y, enemy.w, enemy.h, '#FFD026');
    if (enemy.tele > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (enemy.tele / 14).toFixed(2) + ')';
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    }
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(enemy.x + 8, enemy.y + 12, 10, 8);
    ctx.fillRect(enemy.x + enemy.w - 18, enemy.y + 12, 10, 8);

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(b.x - 2, b.y - 2, 24, 16);
      ctx.fillStyle = b.own === 'p' ? '#4CC3FF' : '#FF5757';
      ctx.fillRect(b.x, b.y, 20, 12);

      if (b.own === 'p' && b.x < enemy.x + enemy.w && b.x + 20 > enemy.x && b.y < enemy.y + enemy.h && b.y + 12 > enemy.y) {
        enemy.hp -= 12; score += 25; sfxHit();
        boom(b.x, b.y + 6, '#FFD026', 8, 3);
        bullets.splice(i, 1);
        if (enemy.hp <= 0) {
          round++; score += 150; enemy.hp = 100 + (round - 1) * 25;
          boom(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#FF5757', 24, 6);
          addFloat(enemy.x, enemy.y - 10, 'K.O.! +150', '#4ADE80');
          setBanner('WAVE ' + round);
          sfxBoom();
        }
        updateHud(score, 'HP ' + Math.max(0, player.hp) + '%  •  WAVE ' + round);
        continue;
      }
      if (b.own === 'e' && player.inv === 0 && b.x < player.x + player.w && b.x + 20 > player.x && b.y < player.y + player.h && b.y + 12 > player.y) {
        player.hp -= 15; player.inv = 45; sfxHit();
        boom(b.x, b.y + 6, '#FF5757', 8, 3);
        bullets.splice(i, 1);
        updateHud(score, 'HP ' + Math.max(0, player.hp) + '%  •  WAVE ' + round);
        if (player.hp <= 0) {
          boom(player.x + player.w / 2, player.y + 40, '#4CC3FF', 20, 6);
          triggerGameOver('WASTED!');
          return;
        }
        continue;
      }
      if (b.x < -40 || b.x > W + 40) bullets.splice(i, 1);
    }

    stepFx();
    drawBanner();
  }
  animFrameId = requestAnimationFrame(loop);
}

// -----------------------------------------------------------------------------
// GAME 03: GRAND THEFT AUTO IV — Armored Heist Run (convoy blaster)
// -----------------------------------------------------------------------------
function startIronTank() {
  const W = canvas.width, H = canvas.height;
  const groundY = H - 56;
  const tank = { x: 90, y: groundY - 46, vy: 0, w: 64, h: 46, armor: 3, reload: 0, flash: 0 };
  let shells = [], bombs = [], pickups = [], enemies = [];
  let timer = 0, score = 0, inv = 0;
  const hts = [70, 120, 90, 140, 60, 110, 95, 130, 75, 150];

  function armorStat() {
    return 'ARMOR ' + '♥'.repeat(Math.max(0, tank.armor)) + '♡'.repeat(3 - Math.max(0, tank.armor));
  }

  function hitTank() {
    tank.armor--;
    inv = 50;
    sfxHit();
    boom(tank.x + tank.w / 2, tank.y + 10, '#FF5757', 14, 5);
    updateHud(score, armorStat());
    if (tank.armor <= 0) { triggerGameOver('WASTED!'); return true; }
    return false;
  }

  updateHud(0, 'ARMOR ♥♥♥');

  function loop() {
    if (isGameOver) return;
    animFrameId = requestAnimationFrame(loop);
    if (isPaused) return;
    timer++;
    if (inv > 0) inv--;
    if (tank.flash > 0) tank.flash--;

    if (keys.L && tank.x > 16) tank.x -= 4.6;
    if (keys.R && tank.x < W - tank.w - 16) tank.x += 4.6;
    const onGround = tank.y >= groundY - tank.h;
    if (keys.U && onGround) { tank.vy = -11; sfxJump(); }
    tank.y += tank.vy;
    if (tank.y < groundY - tank.h) tank.vy += 0.6;
    else { tank.y = groundY - tank.h; tank.vy = 0; }

    if (tank.reload > 0) tank.reload--;
    if (keys.F && tank.reload === 0) {
      tank.reload = 14; tank.flash = 5;
      sfxLaser();
      shells.push({ x: tank.x + tank.w + 2, y: tank.y + 10, vx: 11 });
    }

    if (timer % Math.max(32, 55 - Math.floor(score / 120)) === 0) {
      const air = Math.random() > 0.55;
      enemies.push({
        x: W + 24,
        y: air ? groundY - 128 : groundY - 44,
        w: air ? 46 : 48, h: air ? 30 : 44,
        air: air, base: groundY - 128,
        vx: -(3.6 + Math.min(3.4, score / 220))
      });
    }

    // Backdrop: brutalist city silhouettes
    ctx.fillStyle = '#101B14';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#183024';
    let idx = 0;
    for (let x = 0; x < W; x += 74) {
      const hgt = hts[idx % hts.length]; idx++;
      ctx.fillRect(x, groundY - hgt - 40, 58, hgt + 40);
    }
    ctx.fillStyle = 'rgba(255, 208, 38, 0.35)';
    for (let x = 8; x < W; x += 74) {
      for (let y = groundY - 160; y < groundY - 40; y += 26) {
        ctx.fillRect(x, y, 8, 10); ctx.fillRect(x + 26, y + 8, 8, 10);
      }
    }
    ctx.fillStyle = '#33281E';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(0, groundY, W, 5);

    // Tank
    if (inv === 0 || inv % 8 < 4) {
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(tank.x - 3, tank.y - 3, tank.w + 6, tank.h + 6);
      ctx.fillStyle = '#4CC3FF';
      ctx.fillRect(tank.x, tank.y + 12, tank.w, tank.h - 12);
      ctx.fillStyle = '#0D0D0D';
      for (let wx = tank.x + 4; wx < tank.x + tank.w - 10; wx += 14) ctx.fillRect(wx, tank.y + tank.h - 8, 10, 10);
      ctx.fillStyle = '#FFD026';
      ctx.fillRect(tank.x + 14, tank.y, 32, 16);
      ctx.fillRect(tank.x + 44, tank.y + 4, 26, 8);
      if (tank.flash > 0) {
        ctx.fillStyle = '#F3EFE6';
        ctx.fillRect(tank.x + 68, tank.y + 2, 12, 10);
      }
    }

    // Shells
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.x += s.vx;
      ctx.fillStyle = '#0D0D0D'; ctx.fillRect(s.x - 2, s.y - 2, 20, 12);
      ctx.fillStyle = '#FFD026'; ctx.fillRect(s.x, s.y, 16, 8);
      if (s.x > W + 24) shells.splice(i, 1);
    }

    // Bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.y += 3.2;
      ctx.fillStyle = '#0D0D0D'; ctx.fillRect(b.x - 2, b.y - 2, 12, 16);
      ctx.fillStyle = '#FF5757'; ctx.fillRect(b.x, b.y, 8, 12);
      if (inv === 0 && b.x < tank.x + tank.w && b.x + 8 > tank.x && b.y < tank.y + tank.h && b.y + 12 > tank.y) {
        bombs.splice(i, 1);
        if (hitTank()) return;
        continue;
      }
      if (b.y > H) bombs.splice(i, 1);
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      en.x += en.vx;
      if (en.air) en.y = en.base + Math.sin(timer * 0.05 + en.x * 0.01) * 10;

      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(en.x - 2, en.y - 2, en.w + 4, en.h + 4);
      ctx.fillStyle = en.air ? '#A78BFA' : '#FF5757';
      ctx.fillRect(en.x, en.y, en.w, en.h);
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(en.x + 8, en.y + 8, 8, 8);

      // Drones drop bombs once you're rolling
      if (en.air && score > 200 && timer % 70 === 0 && Math.random() < 0.6) {
        bombs.push({ x: en.x + en.w / 2 - 4, y: en.y + en.h });
      }

      let killed = false;
      for (let j = shells.length - 1; j >= 0; j--) {
        const s = shells[j];
        if (s.x < en.x + en.w && s.x + 16 > en.x && s.y < en.y + en.h && s.y + 8 > en.y) {
          shells.splice(j, 1); killed = true; break;
        }
      }
      if (killed) {
        const pts = en.air ? 45 : 30;
        enemies.splice(i, 1);
        score += pts;
        sfxHit();
        boom(en.x + en.w / 2, en.y + en.h / 2, en.air ? '#A78BFA' : '#FF5757', 14, 5);
        addFloat(en.x, en.y - 8, '+' + pts, '#FFD026');
        if (Math.random() < 0.18) pickups.push({ x: en.x + en.w / 2 - 9, y: en.y });
        updateHud(score, armorStat());
        continue;
      }

      if (inv === 0 && tank.x < en.x + en.w && tank.x + tank.w > en.x && tank.y < en.y + en.h && tank.y + tank.h > en.y) {
        enemies.splice(i, 1);
        if (hitTank()) return;
        continue;
      }
      if (en.x < -60) enemies.splice(i, 1);
    }

    // Armor pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.y += 2.2;
      ctx.fillStyle = '#0D0D0D'; ctx.fillRect(p.x - 2, p.y - 2, 22, 22);
      ctx.fillStyle = '#FF5757'; ctx.fillRect(p.x, p.y, 18, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(p.x + 7, p.y + 3, 4, 12); ctx.fillRect(p.x + 3, p.y + 7, 12, 4);
      if (p.x < tank.x + tank.w && p.x + 18 > tank.x && p.y < tank.y + tank.h && p.y + 18 > tank.y) {
        pickups.splice(i, 1);
        if (tank.armor < 3) { tank.armor++; addFloat(p.x, p.y, '+1 ARMOR', '#4ADE80'); }
        else { score += 50; addFloat(p.x, p.y, '+50', '#FFD026'); }
        sfxPickup();
        updateHud(score, armorStat());
        continue;
      }
      if (p.y > H) pickups.splice(i, 1);
    }

    updateHud(score, armorStat());
    stepFx();
    drawBanner();
  }
  animFrameId = requestAnimationFrame(loop);
}

// -----------------------------------------------------------------------------
// GAME 04: GRAND THEFT AUTO V — Los Santos Chopper Blitz (wave shooter)
// -----------------------------------------------------------------------------
function startGalaxyInvaders() {
  const W = canvas.width, H = canvas.height;
  const ship = { x: W / 2 - 24, y: H - 58, w: 48, h: 32, cd: 0 };
  let lasers = [], bombs = [], aliens = [];
  let dir = 1, spd = 1.25, score = 0, wave = 1, armor = 3, inv = 0, timer = 0;

  function spawnWave() {
    aliens = [];
    const colors = ['#FF7CE5', '#4CC3FF', '#4ADE80', '#FFD026'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        aliens.push({ x: 82 + c * 64, y: 48 + r * 42, w: 36, h: 26, color: colors[r % colors.length], alive: true });
      }
    }
  }
  spawnWave();

  function armorStat() {
    return 'WAVE ' + wave + '  •  ARMOR ' + '♥'.repeat(Math.max(0, armor)) + '♡'.repeat(3 - Math.max(0, armor));
  }

  updateHud(0, 'WAVE 1  •  ARMOR ♥♥♥');

  function loop() {
    if (isGameOver) return;
    animFrameId = requestAnimationFrame(loop);
    if (isPaused) return;
    timer++;
    if (inv > 0) inv--;

    if (keys.L && ship.x > 16) ship.x -= 6.2;
    if (keys.R && ship.x < W - ship.w - 16) ship.x += 6.2;
    if (ship.cd > 0) ship.cd--;
    if (keys.F && ship.cd === 0) {
      ship.cd = 13;
      sfxLaser();
      lasers.push({ x: ship.x + ship.w / 2 - 3, y: ship.y - 12 });
    }

    // Night sky + stars
    ctx.fillStyle = '#090714';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(243, 239, 230, 0.5)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect((i * 173) % W, (i * 97) % (H - 90), 2, 2);
    }

    // Alien formation movement
    let hitEdge = false, aliveCount = 0;
    for (let i = 0; i < aliens.length; i++) {
      const a = aliens[i];
      if (!a.alive) continue;
      aliveCount++;
      a.x += dir * spd;
      if (a.x < 18 || a.x + a.w > W - 18) hitEdge = true;
    }
    if (hitEdge) {
      dir *= -1;
      for (let i = 0; i < aliens.length; i++) {
        const a = aliens[i];
        if (a.alive) {
          a.y += 16;
          if (a.y + a.h >= ship.y - 4) { triggerGameOver('OVERRUN!'); return; }
        }
      }
    }
    if (aliveCount === 0) {
      wave++; spd += 0.35; score += 100;
      spawnWave();
      setBanner('WAVE ' + wave);
      sfxBoom();
    }

    // Aliens drop bombs
    if (timer % 44 === 0) {
      const alive = [];
      for (let i = 0; i < aliens.length; i++) if (aliens[i].alive) alive.push(aliens[i]);
      if (alive.length) {
        const a = alive[Math.floor(Math.random() * alive.length)];
        bombs.push({ x: a.x + a.w / 2 - 4, y: a.y + a.h, vy: 2.6 + wave * 0.2 });
      }
    }

    // Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.y -= 9.5;
      ctx.fillStyle = '#0D0D0D'; ctx.fillRect(l.x - 1, l.y - 1, 8, 18);
      ctx.fillStyle = '#4ADE80'; ctx.fillRect(l.x, l.y, 6, 16);

      let removed = false;
      for (let j = 0; j < aliens.length; j++) {
        const a = aliens[j];
        if (a.alive && l.x < a.x + a.w && l.x + 6 > a.x && l.y < a.y + a.h && l.y + 16 > a.y) {
          a.alive = false;
          removed = true;
          score += 25;
          sfxHit();
          boom(a.x + a.w / 2, a.y + a.h / 2, a.color, 12, 4);
          addFloat(a.x + a.w / 2, a.y, '+25', '#FFD026');
          break;
        }
      }
      if (removed) { lasers.splice(i, 1); updateHud(score, armorStat()); continue; }
      if (l.y < -24) lasers.splice(i, 1);
    }

    // Bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.y += b.vy;
      ctx.fillStyle = '#0D0D0D'; ctx.fillRect(b.x - 2, b.y - 2, 12, 16);
      ctx.fillStyle = '#FF5757'; ctx.fillRect(b.x, b.y, 8, 12);
      if (inv === 0 && b.x < ship.x + ship.w && b.x + 8 > ship.x && b.y < ship.y + ship.h && b.y + 12 > ship.y) {
        bombs.splice(i, 1);
        armor--; inv = 70; sfxHit();
        boom(ship.x + ship.w / 2, ship.y, '#FF5757', 14, 5);
        updateHud(score, armorStat());
        if (armor <= 0) { triggerGameOver('SHOT DOWN!'); return; }
        continue;
      }
      if (b.y > H) bombs.splice(i, 1);
    }

    // Draw aliens
    for (let i = 0; i < aliens.length; i++) {
      const a = aliens[i];
      if (!a.alive) continue;
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(a.x - 2, a.y - 2, a.w + 4, a.h + 4);
      ctx.fillStyle = a.color;
      ctx.fillRect(a.x, a.y, a.w, a.h);
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(a.x + 6, a.y + 6, 6, 6);
      ctx.fillRect(a.x + a.w - 12, a.y + 6, 6, 6);
      ctx.fillRect(a.x + a.w / 2 - 5, a.y + a.h - 8, 10, 4);
    }

    // Draw chopper
    if (inv === 0 || inv % 8 < 4) {
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(ship.x - 3, ship.y - 3, ship.w + 6, ship.h + 6);
      ctx.fillStyle = '#FFD026';
      ctx.fillRect(ship.x, ship.y + 12, ship.w, 20);
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(ship.x + 15, ship.y, 18, 14);
      const rw = 26 + (timer % 2) * 18;
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(ship.x + ship.w / 2 - rw / 2, ship.y - 8, rw, 4);
    }

    updateHud(score, armorStat());
    stepFx();
    drawBanner();
  }
  animFrameId = requestAnimationFrame(loop);
}

// -----------------------------------------------------------------------------
// GAME 05: MINECRAFT — Voxel Block Breaker (paddle + diamond ball)
// -----------------------------------------------------------------------------
function startVoxelBreaker() {
  const W = canvas.width, H = canvas.height;
  const paddle = { x: W / 2 - 55, y: H - 36, w: 110, h: 16 };
  const ball = { x: W / 2, y: paddle.y - 12, vx: 0, vy: 0, r: 9 };
  let score = 0, lives = 3, serve = true, spd = 5.2;
  const cols = 9, rows = 5;
  const colors = ['#4ADE80', '#4CC3FF', '#FFD026', '#FF5757', '#A78BFA'];
  let bricks = [];

  function buildWall() {
    bricks = [];
    const bw = 62, bh = 24, pad = 7;
    const startX = (W - (cols * (bw + pad) - pad)) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: startX + c * (bw + pad),
          y: 52 + r * (bh + pad),
          w: bw, h: bh,
          color: colors[r % colors.length],
          hp: r === 0 ? 2 : 1,
          maxHp: r === 0 ? 2 : 1,
          alive: true
        });
      }
    }
  }
  buildWall();

  function serveBall() {
    serve = false;
    ball.vx = (Math.random() * 2 - 1) * 2.6;
    ball.vy = -spd;
    sfxPoint();
  }
  canvasClickServe = function () { if (serve && !isGameOver && !isPaused) serveBall(); };

  function livesStat(extra) {
    return 'PICKAXES ' + '♥'.repeat(lives) + '♡'.repeat(3 - lives) + (extra ? '  •  ' + extra : '');
  }

  updateHud(0, livesStat('SERVE: SPACE'));

  function loop() {
    if (isGameOver) return;
    animFrameId = requestAnimationFrame(loop);
    if (isPaused) return;

    if (keys.L && paddle.x > 14) paddle.x -= 7.5;
    if (keys.R && paddle.x < W - paddle.w - 14) paddle.x += 7.5;
    if (pointerX !== null) {
      const target = Math.max(14, Math.min(W - paddle.w - 14, pointerX - paddle.w / 2));
      paddle.x += (target - paddle.x) * 0.55;
    }
    if (keys.F && serve) serveBall();

    if (serve) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 2;
    } else {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - ball.r < 12) { ball.x = 12 + ball.r; ball.vx = Math.abs(ball.vx); sfxBounce(); }
      if (ball.x + ball.r > W - 12) { ball.x = W - 12 - ball.r; ball.vx = -Math.abs(ball.vx); sfxBounce(); }
      if (ball.y - ball.r < 12) { ball.y = 12 + ball.r; ball.vy = Math.abs(ball.vy); sfxBounce(); }

      if (
        ball.vy > 0 &&
        ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x >= paddle.x - 4 && ball.x <= paddle.x + paddle.w + 4
      ) {
        const off = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        ball.vx = off * 6.2;
        ball.vy = -Math.abs(ball.vy);
        sfxBounce();
      }

      if (ball.y - ball.r > H) {
        lives--;
        boom(ball.x, H - 24, '#FF5757', 18, 5);
        sfxHit();
        if (lives <= 0) { triggerGameOver('OUT OF PICKAXES!'); return; }
        serve = true;
        updateHud(score, livesStat('SERVE: SPACE'));
      }
    }

    // Backdrop
    ctx.fillStyle = '#0F1E2E';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    for (let i = 0; i < 24; i++) ctx.fillRect((i * 211) % W, (i * 137) % 160, 3, 3);
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // Bricks
    let remaining = 0;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;
      remaining++;

      if (!serve && ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        b.hp--;
        if (b.hp <= 0) {
          b.alive = false;
          score += 20;
          sfxHit();
          boom(b.x + b.w / 2, b.y + b.h / 2, b.color, 8, 3);
          addFloat(b.x + b.w / 2, b.y, '+20', '#FFD026');
        } else {
          score += 5;
          sfxLaser();
          boom(b.x + b.w / 2, b.y + b.h / 2, '#FFFFFF', 4, 2);
        }
        ball.vy = -Math.abs(ball.vy);
        updateHud(score, livesStat('BLOCKS ' + (remaining - 1)));
        continue;
      }

      // Draw voxel brick
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
      ctx.fillStyle = b.hp === 2 ? shade(b.color, -28) : b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#0D0D0D';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      if (b.hp === 1 && b.maxHp === 2) {
        ctx.fillStyle = 'rgba(13,13,13,0.5)';
        ctx.fillRect(b.x + 10, b.y + 6, 6, 6);
        ctx.fillRect(b.x + b.w - 18, b.y + b.h - 14, 6, 6);
      }
    }

    // Wall cleared → generate a fresh chunk
    if (remaining === 0) {
      score += 200;
      spd += 0.35;
      buildWall();
      serve = true;
      addFloat(W / 2, 190, 'NEW CHUNK +200', '#4ADE80');
      setBanner('NEW CHUNK');
      sfxBoom();
      updateHud(score, livesStat('SERVE: SPACE'));
    }

    // Paddle (voxel pickaxe bar)
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(paddle.x - 3, paddle.y - 3, paddle.w + 6, paddle.h + 6);
    ctx.fillStyle = '#FFD026';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fillStyle = '#58C24F';
    ctx.fillRect(paddle.x + 6, paddle.y + 4, paddle.w - 12, 4);

    // Ball (diamond pixel cube)
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(ball.x - ball.r - 2, ball.y - ball.r - 2, ball.r * 2 + 4, ball.r * 2 + 4);
    ctx.fillStyle = '#4CC3FF';
    ctx.fillRect(ball.x - ball.r, ball.y - ball.r, ball.r * 2 - 6, ball.r * 2 - 6);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ball.x - ball.r + 2, ball.y - ball.r + 2, 6, 6);

    stepFx();
    drawBanner();
  }
  animFrameId = requestAnimationFrame(loop);
}

// -----------------------------------------------------------------------------
// GAME 06: GRAND THEFT AUTO: VICE CITY — Ocean Drive Run (neon jump runner)
// -----------------------------------------------------------------------------
function startViceHeat() {
  const W = canvas.width, H = canvas.height;
  const CAR_BOT = 358;                    // road surface under the wheels
  const car = { x: 120, y: CAR_BOT - 40, vy: 0, w: 68, h: 40, grounded: true };
  let t = 0, score = 0, spd = 5.3, spawnT = 28, jumps = 0, lastType = '';
  let items = [];   // cones / rival cars / cash bags

  function spawnItem() {
    const r = Math.random();
    if (r < 0.42 && lastType !== 'car') {
      items.push({ type: 'car', x: W + 70, y: CAR_BOT - 44, w: 62, h: 44, scored: false });
      lastType = 'car';
    } else if (r < 0.74) {
      items.push({ type: 'cone', x: W + 50, y: CAR_BOT - 30, w: 22, h: 30, scored: false, cleared: false });
      lastType = 'cone';
    } else {
      items.push({ type: 'cash', x: W + 44, y: CAR_BOT - 30, w: 26, h: 26, scored: false });
      lastType = 'cash';
    }
  }

  function crash() {
    boom(car.x + car.w / 2, car.y + car.h / 2, '#FF6EC7', 22, 6);
    sfxBoom();
    triggerGameOver('WRECKED!');
  }

  updateHud(0, 'SPEED 5.3  •  JUMPS 0');

  function loop() {
    if (isGameOver) return;
    animFrameId = requestAnimationFrame(loop);
    if (isPaused) return;
    t++;
    spd = 5.3 + Math.min(4.4, score / 800);

    if (keys.L && car.x > 22) car.x -= 5.8;
    if (keys.R && car.x < W - car.w - 22) car.x += 5.8;

    if ((keys.U || keys.F) && car.grounded) {
      car.vy = -12.6;
      car.grounded = false;
      jumps++;
      sfxJump();
    }
    car.y += car.vy;
    if (car.y < CAR_BOT - car.h) car.vy += 0.62;
    else { car.y = CAR_BOT - car.h; car.vy = 0; car.grounded = true; }

    spawnT++;
    if (spawnT > Math.max(34, 62 - Math.floor(score / 350) * 3)) { spawnT = 0; spawnItem(); }

    // --- backdrop: neon sunset over Ocean Drive ---
    // Sky bands
    ctx.fillStyle = '#FF6EC7'; ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = '#FF8FB0'; ctx.fillRect(0, 64, W, 46);
    ctx.fillStyle = '#FFC77E'; ctx.fillRect(0, 110, W, 42);
    // Striped sun
    ctx.fillStyle = '#FFD026';
    ctx.beginPath(); ctx.arc(340, 100, 66, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(340, 100, 66, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#FF6EC7';
    ctx.fillRect(270, 104, 140, 8); ctx.fillRect(276, 122, 128, 9); ctx.fillRect(284, 140, 112, 10);
    ctx.restore();
    // Ocean waves
    ctx.fillStyle = '#2AB5AC'; ctx.fillRect(0, 152, W, 40);
    ctx.fillStyle = 'rgba(127, 229, 220, 0.85)';
    const waveOff = (t * 3) % 120;
    for (let x = -120; x < W; x += 120) {
      ctx.fillRect(x + waveOff, 162, 44, 4); ctx.fillRect(x + waveOff + 60, 174, 34, 4);
    }
    // Boardwalk rail
    ctx.fillStyle = '#0D0D0D'; ctx.fillRect(0, 192, W, 10);
    // Road
    ctx.fillStyle = '#241238'; ctx.fillRect(0, 202, W, H - 202);
    ctx.fillStyle = '#FF6EC7'; ctx.fillRect(0, 202, W, 4);
    ctx.fillStyle = '#FFD026';
    const roadOff = (t * spd) % 56;
    for (let x = -56; x < W; x += 56) {
      ctx.fillRect(x + roadOff, 238, 30, 6);
      ctx.fillRect(x + roadOff, 296, 30, 6);
      ctx.fillRect(x + roadOff, 354, 30, 6);
    }

    // Items
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.x -= spd;

      if (it.type === 'cone') {
        ctx.fillStyle = '#0D0D0D'; ctx.fillRect(it.x - 2, it.y - 2, it.w + 4, it.h + 4);
        ctx.fillStyle = '#FF7A30'; ctx.fillRect(it.x, it.y, it.w, it.h);
        ctx.fillStyle = '#F3EFE6'; ctx.fillRect(it.x, it.y + 10, it.w, 7);
      } else if (it.type === 'car') {
        ctx.fillStyle = '#0D0D0D'; ctx.fillRect(it.x - 3, it.y - 3, it.w + 6, it.h + 6);
        ctx.fillStyle = '#FF5BBF'; ctx.fillRect(it.x, it.y, it.w, it.h);
        ctx.fillStyle = '#0D0D0D'; ctx.fillRect(it.x + 8, it.y + 10, it.w - 16, 12);
        ctx.fillStyle = '#40C9C0'; ctx.fillRect(it.x + 10, it.y + 12, it.w - 20, 8);
      } else {
        ctx.fillStyle = '#0D0D0D'; ctx.fillRect(it.x - 2, it.y - 2, it.w + 4, it.h + 4);
        ctx.fillStyle = '#4ADE80'; ctx.fillRect(it.x, it.y, it.w, it.h);
        ctx.font = 'bold 13px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#0D0D0D'; ctx.textAlign = 'center';
        ctx.fillText('$', it.x + it.w / 2, it.y + 19);
        ctx.textAlign = 'left';
      }

      const hit = car.x + 4 < it.x + it.w && car.x + car.w - 4 > it.x &&
        car.y + 4 < it.y + it.h && car.y + car.h - 4 > it.y;

      if (hit) {
        if (it.type === 'cash') {
          items.splice(i, 1);
          score += 30;
          sfxPickup();
          addFloat(it.x, it.y - 6, '+30', '#4ADE80');
          updateHud(score, 'SPEED ' + spd.toFixed(1) + '  •  JUMPS ' + jumps);
          continue;
        }
        if (it.type === 'cone' && car.y + car.h < it.y + 10) {
          // Airborne over the cone: reward the clean jump, no crash
          if (!it.cleared) {
            it.cleared = true;
            score += 25;
            sfxPoint();
            addFloat(it.x, it.y - 12, 'JUMP +25', '#FFD026');
            updateHud(score, 'SPEED ' + spd.toFixed(1) + '  •  JUMPS ' + jumps);
          }
          continue;
        }
        crash();
        return;
      }

      if (!it.scored && it.x + it.w < car.x) {
        it.scored = true;
        const pts = it.type === 'car' ? 15 : 10;
        score += pts;
        addFloat(it.x, it.y - 10, '+' + pts, '#FF6EC7');
        sfxPoint();
        updateHud(score, 'SPEED ' + spd.toFixed(1) + '  •  JUMPS ' + jumps);
      }

      if (it.x < -80) items.splice(i, 1);
    }

    // Player car: white body, pink stripe, teal glass
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(car.x - 3, car.y - 3, car.w + 6, car.h + 6);
    ctx.fillStyle = '#F3EFE6';
    ctx.fillRect(car.x, car.y, car.w, car.h);
    ctx.fillStyle = '#FF6EC7';
    ctx.fillRect(car.x, car.y + car.h - 12, car.w, 5);
    ctx.fillStyle = '#40C9C0';
    ctx.fillRect(car.x + 10, car.y + 4, car.w - 20, 12);
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(car.x + 4, car.y + car.h - 2, 14, 4);
    ctx.fillRect(car.x + car.w - 18, car.y + car.h - 2, 14, 4);

    updateHud(score, 'SPEED ' + spd.toFixed(1) + '  •  JUMPS ' + jumps);
    stepFx();
    drawBanner();
  }
  animFrameId = requestAnimationFrame(loop);
}

// Fallback sweep: remove poster <img> tags that failed to load so the
// drawn SVG art always shows. Covers the rare case where the browser
// never fires the inline onerror for a cached failed response.
// Also flips on any duplicate <img> whose load event got swallowed by the
// browser's response de-duplication (it only shows once fully loaded).
// (Images that DO exist are left completely untouched.)
function sweepBrokenPosters() {
  document.querySelectorAll('img[src^="posters/"]').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) { img.remove(); return; }
    if (img.complete && img.naturalWidth > 0 && img.classList.contains('opacity-0')) {
      img.classList.remove('opacity-0');
      var svg = img.parentElement ? img.parentElement.querySelector('svg') : null;
      if (svg) svg.style.visibility = 'hidden';
    }
  });
}
window.addEventListener('load', function () {
  sweepBrokenPosters();
  [400, 1200, 2500, 5000].forEach(function (ms) { setTimeout(sweepBrokenPosters, ms); });
});

// Poster images only become visible once they have actually loaded; until
// then the drawn SVG art shows through. Failed tags remove themselves.
document.querySelectorAll('img.poster-img').forEach(function (img) {
  var show = function () {
    img.classList.remove('opacity-0');
    // The real cover replaces the drawn art completely: hide the SVG
    // beneath it so no drawn caption peeks around the image edges.
    var svg = img.parentElement ? img.parentElement.querySelector('svg') : null;
    if (svg) svg.style.visibility = 'hidden';
  };
  img.addEventListener('load', show);
  if (img.complete && img.naturalWidth > 0) show();
});

// Initialize high scores on load
loadScores();
