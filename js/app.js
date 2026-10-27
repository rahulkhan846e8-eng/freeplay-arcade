/* ==========================================================================
   ARCADE — site application
   ========================================================================== */
(function () {
  'use strict';

  var D = window.CABINET_DATA;
  var C = window.CABINET;
  var page = document.body.getAttribute('data-page');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var safeUrl = function (u) {
    if (!u) return '#';
    var s = String(u).trim();
    if (/^(javascript|data|vbscript):/i.test(s)) return '#';
    return esc(s);
  };
  var norm = function (s) {
    var text = String(s);
    if (text.normalize) text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.toLowerCase();
  };

  var updateCleanUrl = function (cleanPath) {
    if (location.protocol === 'file:') return;
    try {
      var current = location.pathname.replace(/^\/+/, '');
      var target = String(cleanPath).replace(/^\/+/, '');
      if (current !== target || (location.search && !target.includes('?'))) {
        history.replaceState(null, '', target);
      }
    } catch (err) {}
  };

  /* ---------- storage ---------- */
  var KEY_FAVS = 'cabinet:favs';
  var KEY_RECENT = 'cabinet:recent';

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
  function favs() {
    var list = read(KEY_FAVS, []);
    return Array.isArray(list) ? list : [];
  }
  function isFav(slug) { return favs().indexOf(slug) !== -1; }
  function toggleFav(slug) {
    var list = favs();
    var i = list.indexOf(slug);
    if (i === -1) list.unshift(slug); else list.splice(i, 1);
    write(KEY_FAVS, list);
    updateFavUI();
    var g = D.game(slug);
    toast(i === -1 ? 'Added ' + (g ? g.title : 'game') + ' to your shelf' : 'Removed from your shelf');
    document.dispatchEvent(new CustomEvent('cabinet:favchange', { detail: { slug: slug, added: i === -1 } }));
  }
  function updateFavUI() {
    var list = favs();
    $$('[data-fav]').forEach(function (btn) {
      var on = list.indexOf(btn.getAttribute('data-fav')) !== -1;
      btn.classList.toggle('is-fav', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + (D.game(btn.getAttribute('data-fav')) || {}).title + (on ? ' from' : ' to') + ' your shelf');
    });
    $$('[data-fav-count]').forEach(function (el) { el.textContent = list.length; });
  }

  function recent() {
    var list = read(KEY_RECENT, []);
    return Array.isArray(list) ? list.filter(function (slug) { return D.game(slug); }) : [];
  }
  function recordRecent(slug) {
    var list = recent().filter(function (s) { return s !== slug; });
    list.unshift(slug);
    write(KEY_RECENT, list.slice(0, 8));
    renderRecent();
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (e) { return String(url).replace(/^https?:\/\//, '').split('/')[0]; }
  }

  /* ---------- shared UI ---------- */
  var heartSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"/></svg>';
  var playSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var arrowSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';

  function favButton(g) {
    var on = isFav(g.slug);
    return '<button class="fav-btn' + (on ? ' is-fav' : '') + '" type="button" data-fav="' + g.slug + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + (on ? 'Remove ' : 'Add ') + esc(g.title) + (on ? ' from' : ' to') + ' your shelf" title="' + (on ? 'Remove from your shelf' : 'Add to your shelf') + '">' + heartSvg + '</button>';
  }

  function cardHTML(g, index, dense) {
    var c = D.collection(g.collection);
    return '<article class="reveal' + (dense ? ' reveal--fast' : '') + '" style="transition-delay:' + Math.min(index * 35, 280) + 'ms">' +
      '<div class="game-card">' +
        '<div class="cover">' +
          C.coverHTML(g) +
          '<div class="cover-scrim"></div>' +
          '<div class="cover-ui">' +
            '<div class="cover-top"><span class="cover-chip">' + esc(c.label) + '</span>' + favButton(g) + '</div>' +
            '<div class="cover-bottom">' +
              '<div class="cover-collection">' + esc(c.name) + ' · ' + esc(g.genre) + '</div>' +
              '<div class="cover-title">' + esc(g.title) + '</div>' +
            '</div>' +
          '</div>' +
          '<a class="card-link" href="' + encodeURIComponent(g.slug) + '" aria-label="Open ' + esc(g.title) + '"></a>' +
          '<span class="cover-play">' + playSvg + ' Open game</span>' +
        '</div>' +
        '<div class="card-meta">' +
          '<span class="genre">' + esc(g.genre) + '</span>' +
          '<span class="card-play-hint" title="' + esc((g.servers && g.servers.length > 1) ? (g.servers.length + ' servers available') : g.url) + '">' +
            ((g.servers && g.servers.length > 1) ? (g.servers.length + ' Servers ↗') : 'Play link ↗') +
          '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function systemCardHTML(c, i) {
    var count = D.countFor(c.id);
    return '<a class="system-card reveal" href="collection?c=' + c.id + '" style="--sys:' + c.color + ';--sys-ink:' + c.ink + ';transition-delay:' + (i * 50) + 'ms">' +
      '<span class="system-index">' + String(i + 1).padStart(2, '0') + ' / ' + esc(c.label) + '</span>' +
      '<div><h3>' + esc(c.name) + '</h3><p>' + esc(c.blurb) + '</p></div>' +
      '<div class="system-foot"><span class="count">' + String(count).padStart(2, '0') + ' games</span>' +
        '<span class="arrow">' + arrowSvg + '</span></div>' +
    '</a>';
  }

  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }
  window.CABINET_TOAST = toast;

  function revealInit(root) {
    var items = $$('.reveal', root || document).filter(function (el) { return !el.classList.contains('in'); });
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- header / nav ---------- */
  function initHeader() {
    var menuBtn = $('[data-menu-toggle]');
    var menu = $('#mobile-nav');
    if (menuBtn && menu) {
      menuBtn.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.innerHTML = open
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
      });
      $$('a', menu).forEach(function (a) {
        a.addEventListener('click', function () { menu.classList.remove('open'); });
      });
    }
    document.querySelectorAll('[data-surprise]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var games = D.games;
        var pool = games.filter(function (g) {
          var m = location.search.match(/[?&]g=([^&]+)/);
          return !m || decodeURIComponent(m[1]) !== g.slug;
        });
        var g = pool[Math.floor(Math.random() * pool.length)];
        window.location.href = encodeURIComponent(g.slug);
      });
    });
    var clear = $('[data-clear-recent]');
    if (clear) clear.addEventListener('click', function () {
      write(KEY_RECENT, []);
      renderRecent();
      toast('History cleared');
    });
    updateFavUI();
  }

  /* ---------- search ---------- */
  var searchState = { items: [], active: -1 };

  function searchIndex(query) {
    var q = norm(query.trim());
    if (!q) {
      return D.collections.map(function (c) {
        return { type: 'collection', c: c };
      });
    }
    var words = q.split(/\s+/);
    var found = D.games.map(function (g) {
      var c = D.collection(g.collection);
      var hay = norm(g.title + ' ' + g.sourceTitle + ' ' + g.genre + ' ' + c.name + ' ' + c.label + ' ' + g.index);
      var title = norm(g.title);
      var score = 0;
      if (title === q) score += 120;
      else if (title.indexOf(q) === 0) score += 80;
      else if (title.indexOf(q) !== -1) score += 55;
      if (hay.indexOf(q) !== -1) score += 20;
      words.forEach(function (w) {
        if (title.indexOf(w) !== -1) score += 30;
        if (hay.indexOf(w) !== -1) score += 5;
      });
      return { g: g, score: score };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 9);
    return found.map(function (r) { return { type: 'game', g: r.g }; });
  }

  function renderSearch(query) {
    var box = $('#search-results');
    if (!box) return;
    var items = searchIndex(query);
    searchState.items = items;
    searchState.active = items.length ? 0 : -1;
    var html = '';
    if (!query.trim()) {
      html += '<div class="search-group-label">Jump to a collection</div>';
      items.forEach(function (item, i) {
        var c = item.c;
        html += '<a class="search-item' + (i === 0 ? ' active' : '') + '" href="collection?c=' + c.id + '" data-search-item="' + i + '">' +
          '<span class="thumb" style="background:' + c.color + ';display:grid;place-items:center;font-family:var(--font-display);font-size:16px;color:#0a0a0c">' + esc(c.label.slice(0, 2)) + '</span>' +
          '<span><span class="s-title">' + esc(c.name) + '</span><span class="s-meta">' + D.countFor(c.id) + ' games</span></span>' +
          arrowSvg.replace('<svg', '<svg class="s-arrow"') + '</a>';
      });
    } else if (!items.length) {
      html += '<div class="search-empty">No games match “' + esc(query) + '”.<br>Try “racing”, “puzzle” or a collection name.</div>';
    } else {
      html += '<div class="search-group-label">' + items.length + ' result' + (items.length === 1 ? '' : 's') + '</div>';
      items.forEach(function (item, i) {
        var g = item.g, c = D.collection(g.collection);
        html += '<a class="search-item' + (i === 0 ? ' active' : '') + '" href="' + encodeURIComponent(g.slug) + '" data-search-item="' + i + '">' +
          '<span class="thumb">' + C.coverHTML(g) + '</span>' +
          '<span><span class="s-title">' + esc(g.title) + '</span><span class="s-meta">' + esc(c.name) + ' / ' + esc(g.genre) + '</span></span>' +
          arrowSvg.replace('<svg', '<svg class="s-arrow"') + '</a>';
      });
    }
    box.innerHTML = html;
    box.scrollTop = 0;
  }

  function setSearchActive(index) {
    var items = $$('.search-item', $('#search-results'));
    if (!items.length) return;
    searchState.active = (index + items.length) % items.length;
    items.forEach(function (el, i) { el.classList.toggle('active', i === searchState.active); });
    var active = items[searchState.active];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  function openSearch() {
    var overlay = $('#search-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    var input = $('#search-input');
    if (input) {
      input.value = '';
      renderSearch('');
      setTimeout(function () { input.focus(); }, 30);
    }
  }
  function closeSearch() {
    var overlay = $('#search-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function initSearch() {
    if (!$('#search-overlay')) return;
    $$('[data-open-search]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
    });
    $$('[data-close-search]').forEach(function (el) {
      el.addEventListener('click', closeSearch);
    });
    var overlay = $('#search-overlay');
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });
    var input = $('#search-input');
    var box = $('#search-results');
    if (input) {
      input.addEventListener('input', function () { renderSearch(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSearchActive(searchState.active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchActive(searchState.active - 1); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          var active = $('.search-item.active', box);
          if (active) active.click();
        }
      });
    }
    if (box) {
      box.addEventListener('mousemove', function (e) {
        var item = e.target.closest('.search-item');
        if (!item) return;
        var items = $$('.search-item', box);
        setSearchActive(items.indexOf(item));
      });
    }
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (overlay.classList.contains('open')) closeSearch(); else openSearch();
      } else if (!typing && e.key === '/') {
        e.preventDefault();
        openSearch();
      } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeSearch();
      }
    });
  }

  /* ---------- home ---------- */
  function renderHome() {
    var heroGames = ['gta-v', 'tekken-5-dark-resurrection', 'cyberpunk-2077'];
    heroGames.forEach(function (slug) {
      var holder = $('[data-hero-poster="' + slug + '"]');
      var g = D.game(slug);
      if (holder && g) holder.insertAdjacentHTML('afterbegin', C.coverHTML(g));
    });
    var systems = $('#systems');
    if (systems) systems.innerHTML = D.collections.map(systemCardHTML).join('');
    var featured = $('#featured');
    if (featured) {
      var featSlugs = [
        'cyberpunk-2077',
        'gta-v',
        'counter-strike-16',
        'wwe-smackdown-here-comes-the-pain',
        'need-for-speed-most-wanted',
        'hollow-knight'
      ];
      var featGames = featSlugs.map(function (slug) { return D.game(slug); }).filter(Boolean);
      featured.innerHTML = featGames.map(function (g, i) {
        return cardHTML(g, i);
      }).join('');
    }
    var shelves = $('#shelves');
    if (shelves) {
      shelves.innerHTML = D.collections.map(function (c, ci) {
        var list = D.games.filter(function (g) { return g.collection === c.id; });
        var cards = list.map(function (g, i) { return cardHTML(g, i, true); }).join('');
        var cta = list.length < 3
          ? '<a class="shelf-cta reveal" href="collection?c=' + c.id + '" style="--sys:' + c.color + ';--sys-ink:' + c.ink + '">' +
              '<span class="eyebrow">Collection</span>' +
              '<span class="cta-big">View all<br><em>' + list.length + ' games</em></span>' +
              '<span class="cta-round">' + arrowSvg + '</span>' +
            '</a>'
          : '';
        return '<section class="section">' +
          '<div class="wrap">' +
            '<div class="section-head reveal">' +
              '<div><span class="eyebrow">Collection ' + String(ci + 1).padStart(2, '0') + '</span>' +
              '<h2>' + esc(c.name) + '</h2>' +
              '<p>' + esc(c.long) + '</p></div>' +
              '<div class="head-action"><a class="text-link" href="collection?c=' + c.id + '">See all ' + list.length + arrowSvg + '</a></div>' +
            '</div>' +
            '<div class="shelf" style="--sys:' + c.color + ';--sys-ink:' + c.ink + '">' +
              '<div class="shelf-intro reveal">' +
                '<div><span class="system-index">' + esc(c.label) + ' / ' + String(list.length).padStart(2, '0') + '</span>' +
                '<h3 style="margin-top:12px">' + esc(c.blurb.split('.')[0]) + '.</h3></div>' +
                '<p>' + esc(c.blurb) + '</p>' +
                '<a class="text-link" href="collection?c=' + c.id + '">Enter collection ' + arrowSvg + '</a>' +
              '</div>' +
              cards + cta +
            '</div>' +
          '</div>' +
        '</section>';
      }).join('');
    }
    renderRecent();
    revealInit();
    updateCleanUrl('home');
  }

  function renderRecent() {
    var section = $('#recent-section');
    var strip = $('#recent');
    if (!section || !strip) return;
    var list = recent();
    if (!list.length) { section.hidden = true; return; }
    section.hidden = false;
    strip.innerHTML = list.map(function (slug) {
      var g = D.game(slug);
      var c = D.collection(g.collection);
      return '<a class="recent-item" href="' + encodeURIComponent(slug) + '">' +
        '<span class="rthumb">' + C.coverHTML(g) + '</span>' +
        '<span><span class="rname">' + esc(g.title) + '</span><span class="rmeta">' + esc(c.label) + ' / ' + esc(g.genre) + '</span></span>' +
      '</a>';
    }).join('');
  }

  /* ---------- collection page ---------- */
  function collectionStateFromURL() {
    var params = new URLSearchParams(location.search);
    var mode = params.get('fav') === '1' ? 'fav' : (params.get('c') || 'all');
    return {
      mode: mode,
      genre: 'all',
      sort: 'featured',
      query: params.get('q') || ''
    };
  }

  function renderCollection() {
    var root = $('#collection-root');
    if (!root) return;
    var state = collectionStateFromURL();
    var c = state.mode !== 'all' && state.mode !== 'fav' ? D.collection(state.mode) : null;
    if (state.mode !== 'all' && state.mode !== 'fav' && !c) { state.mode = 'all'; }
    var games = state.mode === 'fav'
      ? favs().map(D.game).filter(Boolean)
      : D.games.filter(function (g) { return state.mode === 'all' || g.collection === state.mode; });
    if (state.query) {
      var q = norm(state.query);
      games = games.filter(function (g) {
        var c = D.collection(g.collection);
        return norm(g.title + ' ' + g.sourceTitle + ' ' + g.genre + ' ' + c.name).indexOf(q) !== -1;
      });
    }

    var title, lede, color, inkColor, eyebrow, crumb;
    if (state.mode === 'fav') {
      title = 'My <em>shelf.</em>'; eyebrow = 'Saved locally'; color = 'var(--acid)'; inkColor = '#0b0b0b';
      lede = 'The games you have bookmarked. Saved in this browser only / no account, no cloud, no fuss.';
      crumb = '<a href="home">Home</a> / My shelf';
    } else if (state.query) {
      title = 'Search <em>results.</em>'; eyebrow = 'Query: ' + esc(state.query); color = 'var(--acid)'; inkColor = '#0b0b0b';
      lede = 'Showing games matching “' + esc(state.query) + '”.';
      crumb = '<a href="home">Home</a> / Search';
    } else if (c) {
      var collectionTitles = {
        open: 'Open <em>Worlds</em>',
        versus: 'Versus',
        shooters: 'Fire<em>fight</em>',
        sports: 'Speed &amp; <em>Sport</em>',
        vault: 'The <em>Vault</em>'
      };
      title = collectionTitles[c.id] || esc(c.name);
      eyebrow = 'Collection ' + (D.collections.indexOf(c) + 1 < 10 ? '0' : '') + (D.collections.indexOf(c) + 1);
      color = c.color;
      inkColor = c.ink;
      lede = c.long;
      crumb = '<a href="home">Home</a> / ' + esc(c.name);
    } else {
      title = 'Explore <em>All Games.</em>'; eyebrow = 'All 148 Games Available'; color = 'var(--acid)'; inkColor = '#0b0b0b';
      lede = 'Every game available on ARCADE, all in one place. Filter by genre, search, or pick any cabinet to start playing.';
      crumb = '<a href="home">Home</a> / Explore All';
    }

    document.title = (state.mode === 'fav' ? 'My shelf' : state.query ? 'Search' : c ? c.name : 'Explore All Games') + ' — ARCADE';
    $('meta[name="description"]').setAttribute('content', (c ? c.long : lede).slice(0, 155));

    root.innerHTML =
      '<section class="page-head" style="--sys:' + color + ';--sys-ink:' + inkColor + '">' +
        '<div class="wrap">' +
          '<div class="breadcrumb">' + crumb + '</div>' +
          '<span class="eyebrow">' + eyebrow + '</span>' +
          '<h1 style="margin-top:14px">' + title + '</h1>' +
          '<p class="lede">' + lede + '</p>' +
        '</div>' +
      '</section>' +
      '<div class="filter-bar"><div class="wrap filter-inner">' +
        '<div class="filter-chips" id="genre-chips"></div>' +
        '<div class="filter-right">' +
          '<span class="result-count" id="result-count"></span>' +
          '<label class="sr-only" for="sort-select">Sort games</label>' +
          '<select class="select" id="sort-select">' +
            '<option value="featured">Featured</option>' +
            '<option value="az">A–Z</option>' +
            '<option value="index">Catalogue no.</option>' +
          '</select>' +
        '</div>' +
      '</div></div>' +
      '<section class="collection-body"><div class="wrap">' +
        '<div class="game-grid" id="collection-grid"></div>' +
        '<div id="collection-empty"></div>' +
      '</div></section>';

    var genreList = ['all'].concat(D.genres().filter(function (genre) {
      return games.some(function (g) { return g.genre === genre; });
    }));
    var chips = $('#genre-chips');
    chips.innerHTML = genreList.map(function (genre) {
      return '<button class="chip' + (genre === state.genre ? ' active' : '') + '" type="button" data-genre="' + esc(genre) + '">' + (genre === 'all' ? 'All genres' : esc(genre)) + '</button>';
    }).join('');

    function apply() {
      var list = games.slice();
      if (state.genre !== 'all') list = list.filter(function (g) { return g.genre === state.genre; });
      if (state.sort === 'az') list.sort(function (a, b) { return a.title.localeCompare(b.title); });
      if (state.sort === 'index') list.sort(function (a, b) { return a.index - b.index; });
      var grid = $('#collection-grid');
      var empty = $('#collection-empty');
      grid.innerHTML = list.map(function (g, i) { return cardHTML(g, i); }).join('');
      if (!list.length) {
        empty.innerHTML = '<div class="empty-state"><h3>Nothing on this shelf yet.</h3>' +
          '<p>' + (state.mode === 'fav' ? 'Tap the heart on any game to keep it here. Your shelf lives in this browser.' : 'Try another genre, or head back to the full collection.') + '</p>' +
          '<a class="btn" href="' + (state.mode === 'fav' ? 'collection?c=all' : 'home') + '">' + (state.mode === 'fav' ? 'Browse all games' : 'Back to the arcade') + '</a></div>';
      } else {
        empty.innerHTML = '';
      }
      $('#result-count').textContent = list.length + (list.length === 1 ? ' game' : ' games');
      updateFavUI();
      revealInit();
    }

    $('#sort-select').value = state.sort;
    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-genre]');
      if (!btn) return;
      state.genre = btn.getAttribute('data-genre');
      $$('.chip', chips).forEach(function (x) { x.classList.toggle('active', x === btn); });
      apply();
    });
    $('#sort-select').addEventListener('change', function (e) {
      state.sort = e.target.value;
      apply();
    });
    document.addEventListener('cabinet:favchange', function () {
      if (state.mode === 'fav') {
        games = favs().map(D.game).filter(Boolean);
        apply();
      }
    });
    apply();

    // active header nav
    if (c) {
      var link = $('.main-nav [data-nav="' + c.id + '"]');
      if (link) link.classList.add('active');
    } else if (!state.query && state.mode !== 'fav') {
      var allLink = $('.main-nav [data-nav="all"]');
      if (allLink) allLink.classList.add('active');
    }
    updateCleanUrl('collection' + (location.search || ''));
  }

  /* ---------- game page ---------- */
  function renderGame() {
    var root = $('#game-root');
    if (!root) return;
    var params = new URLSearchParams(location.search);
    var slug = document.body.getAttribute('data-slug') || params.get('g') || (location.pathname.split('/').filter(Boolean).pop() || '').replace(/\.html$/, '');
    var g = D.game(slug);
    if (!g) {
      root.innerHTML = '<section class="info-page"><div class="wrap"><div class="empty-state"><h3>Game not found.</h3><p>That game slot is empty. Pick another game from the floor.</p><a class="btn" href="home">Back to the arcade</a></div></div></section>';
      return;
    }
    var c = D.collection(g.collection);
    var host = hostOf(g.url);
    var total = D.games.length;
    var number = String(g.index).padStart(2, '0');
    var hasServers = Array.isArray(g.servers) && g.servers.length > 1;
    document.title = g.title + ' — Play — ARCADE';
    updateCleanUrl(g.slug);
    var meta = $('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Play ' + g.title + ', a ' + g.genre + ' game in the ' + c.name + ' collection. Play opens ' + host + ' in a new tab. ARCADE does not host the game.');

    var related = D.games.filter(function (x) { return x.collection === g.collection && x.slug !== g.slug; });
    if (related.length < 3) {
      D.games.forEach(function (x) {
        if (related.length < 3 && x.slug !== g.slug && related.indexOf(x) === -1) related.push(x);
      });
    }
    related = related.slice(0, 3);

    root.innerHTML =
      '<div class="wrap game-page">' +
        '<div class="breadcrumb"><a href="home">Home</a> / <a href="collection?c=' + g.collection + '">' + esc(c.name) + '</a> / ' + esc(g.title) + '</div>' +
        '<div class="game-head">' +
          '<div class="game-titleblock">' +
            '<span class="eyebrow">' + esc(c.label) + ' / ' + esc(g.genre) + ' / LINK ' + number + '</span>' +
            '<h1>' + esc(g.title) + '</h1>' +
            '<p class="tagline">' + esc(c.name) + ' · ' + esc(g.genre) + ' · External play link</p>' +
          '</div>' +
          '<div class="game-head-actions">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-fav="' + g.slug + '" aria-pressed="' + (isFav(g.slug) ? 'true' : 'false') + '">' +
              heartSvg + '<span data-fav-label>' + (isFav(g.slug) ? 'On your shelf' : 'Save to shelf') + '</span>' +
            '</button>' +
            (hasServers
              ? g.servers.map(function (s, idx) {
                  var sName = s.name || ('Server ' + (idx + 1));
                  var cls = idx === 0 ? 'btn btn--sm' : 'btn btn--ghost btn--sm';
                  return '<a class="' + cls + '" href="' + safeUrl(s.url) + '" target="_blank" data-play-link rel="noopener noreferrer">' + playSvg + ' ' + esc(sName) + '</a>';
                }).join(' ')
              : '<a class="btn btn--sm" href="' + safeUrl(g.url) + '" target="_blank" data-play-link rel="noopener noreferrer">' + playSvg + ' Play now</a>') +
          '</div>' +
        '</div>' +

        '<div class="game-layout">' +
          '<div>' +
            '<div class="stage-shell">' +
              '<div class="stage stage--play">' +
                '<div class="idle-cover">' + C.coverHTML(g) + '</div>' +
                '<div class="stage-overlay stage-overlay--play">' +
                  (hasServers
                    ? '<span class="eyebrow">Select a server to play / external game</span>' +
                      '<h2 class="play-word">Servers</h2>' +
                      '<p class="play-game-name">' + esc(g.title) + '</p>' +
                      '<div class="server-btn-grid">' +
                        g.servers.map(function (s, idx) {
                          var sName = s.name || ('Server ' + (idx + 1));
                          var sHost = hostOf(s.url);
                          var cls = 'play-big play-big--xl server-btn' + (idx === 1 ? ' server-btn--alt' : (idx > 1 ? ' server-btn--ghost' : ''));
                          return '<a class="' + cls + '" href="' + safeUrl(s.url) + '" target="_blank" data-play-link rel="noopener noreferrer">' +
                            playSvg + ' ' + esc(sName) +
                          '</a>';
                        }).join('') +
                      '</div>' +
                      '<span class="hint">' + g.servers.length + ' mirror servers available · opens in a new tab · not hosted by ARCADE</span>'
                    : '<span class="eyebrow">Ready to play / external game</span>' +
                      '<h2 class="play-word">Play</h2>' +
                      '<p class="play-game-name">' + esc(g.title) + '</p>' +
                      '<a class="play-big play-big--xl" href="' + safeUrl(g.url) + '" target="_blank" data-play-link rel="noopener noreferrer">' + playSvg + ' Play ' + esc(g.title) + '</a>' +
                      '<span class="hint">Opens ' + esc(host) + ' in a new tab · not hosted by ARCADE</span>') +
                '</div>' +
              '</div>' +
              '<div class="stage-foot">' +
                '<div class="controls-hint">' +
                  '<span class="ctrl">External link</span>' +
                  '<span class="ctrl">New tab</span>' +
                  '<span class="ctrl">ARCADE stays open</span>' +
                '</div>' +
                '<span class="pwr">LINK <b>' + number + '</b> / ' + total + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="play-notice">' +
              '<span class="play-notice-mark" aria-hidden="true">!</span>' +
              '<p><strong>You are leaving ARCADE.</strong> Play opens <b>' + esc(host) + '</b> in a new tab. The game, its downloads, ads and account prompts are controlled by that site, not by us. Your ARCADE tab stays open right here.</p>' +
            '</div>' +
          '</div>' +

          '<aside class="info-panel">' +
            '<div class="info-cover">' + C.coverHTML(g) + '</div>' +
            '<div class="info-card">' +
              '<h3>Game info</h3>' +
              '<dl class="meta-list">' +
                '<div><dt>Collection</dt><dd><a href="collection.html?c=' + g.collection + '">' + esc(c.name) + '</a></dd></div>' +
                '<div><dt>Genre</dt><dd>' + esc(g.genre) + '</dd></div>' +
                '<div><dt>Catalogue no.</dt><dd>' + number + ' / ' + total + '</dd></div>' +
                '<div><dt>Play via</dt><dd class="meta-host">' + esc(host) + '</dd></div>' +
                '<div><dt>Hosted by</dt><dd>Third party</dd></div>' +
              '</dl>' +
            '</div>' +
            '<div class="info-card external-card">' +
              '<h3>Off-site note</h3>' +
              '<p>' + esc(g.title) + ' is not hosted by ARCADE. Play buttons open external hosts, where that site’s own terms and privacy policy apply.</p>' +
              (hasServers
                ? '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">' +
                    g.servers.map(function (s, idx) {
                      var sName = s.name || ('Server ' + (idx + 1));
                      return '<a class="text-link" href="' + safeUrl(s.url) + '" target="_blank" data-play-link rel="noopener noreferrer">' + esc(sName) + ' ' + arrowSvg + '</a>';
                    }).join('') +
                  '</div>'
                : '<a class="text-link" href="' + safeUrl(g.url) + '" target="_blank" data-play-link rel="noopener noreferrer">Play now ' + arrowSvg + '</a>') +
            '</div>' +
          '</aside>' +
        '</div>' +

        '<div class="game-body">' +
          '<div>' +
            '<div class="prose-block">' +
              '<h2>About this cabinet</h2>' +
              '<p><strong>' + esc(g.title) + '</strong> is filed in the <strong>' + esc(c.name) + '</strong> collection under <strong>' + esc(g.genre) + '</strong>. It is one of ' + total + ' games on the ARCADE floor, and its page exists for one job: to get you to the right external play link without sending you through the wrong door.</p>' +
              '<p>Press Play and the game opens directly on <strong>' + esc(host) + '</strong> in a new tab. ARCADE does not wrap the game in a player, host a copy or claim the game as its own. The game, its controls and any downloads live on the external site.</p>' +
            '</div>' +
            '<div class="prose-block">' +
              '<h2>Before you press Play</h2>' +
              '<ul class="plain-list">' +
                '<li>The Play button opens an external website in a new tab, keeping ARCADE open in your browser.</li>' +
                '<li>Third-party hosts may show ads or pop-ups, ask you to create an account, or limit access by region.</li>' +
                '<li>Any download, purchase or account you agree to there is between you and that site. Check its terms before you continue.</li>' +
                '<li>ARCADE has no control over the game’s availability. If the link is dead, tell us and we will review it.</li>' +
              '</ul>' +
            '</div>' +
            (hasServers
              ? '<div class="prose-block">' +
                  '<h2>Available Servers</h2>' +
                  '<p>No redirect chains on our side. Choose any mirror server below to launch ' + esc(g.title) + ':</p>' +
                  g.servers.map(function (s, idx) {
                    var sName = s.name || ('Server ' + (idx + 1));
                    return '<a class="url-box" href="' + safeUrl(s.url) + '" target="_blank" data-play-link rel="noopener noreferrer" title="Open ' + esc(sName) + '" style="margin-bottom:12px;">' +
                      '<span>' + esc(sName) + ' / ' + number + '</span>' +
                      '<code>' + esc(s.url) + '</code>' +
                    '</a>';
                  }).join('') +
                '</div>'
              : '<div class="prose-block">' +
                  '<h2>The exact link</h2>' +
                  '<p>No redirect chain on our side. This is the URL attached to ' + esc(g.title) + ' in the catalogue:</p>' +
                  '<a class="url-box" href="' + safeUrl(g.url) + '" target="_blank" data-play-link rel="noopener noreferrer" title="Open ' + esc(g.title) + '">' +
                    '<span>Play link / ' + number + '</span>' +
                    '<code>' + esc(g.url) + '</code>' +
                  '</a>' +
                '</div>') +
          '</div>' +
          '<aside class="info-panel" style="position:static">' +
            '<div class="info-card">' +
              '<h3>How it works</h3>' +
              '<ol class="step-list">' +
                '<li><b>01</b><span>Open a game cabinet from the floor, a collection, search or your shelf.</span></li>' +
                '<li><b>02</b><span>Read the game info and check the external host.</span></li>' +
                '<li><b>03</b><span>Press Play. The external game loads in a new tab.</span></li>' +
              '</ol>' +
            '</div>' +
            '<div class="info-card">' +
              '<h3>Found a problem?</h3>' +
              '<p class="small-copy">Wrong game behind the button? Dead link? Tell us the game title and what happened, and we will check it.</p>' +
              '<a class="text-link" href="info?p=contact">Report a link ' + arrowSvg + '</a>' +
            '</div>' +
          '</aside>' +
        '</div>' +

        '<section class="related">' +
          '<div class="section-head"><div><span class="eyebrow">Keep browsing</span><h2 style="font-size:clamp(26px,3vw,38px)">More from <em>' + esc(c.name) + '.</em></h2></div>' +
          '<div class="head-action"><a class="text-link" href="collection?c=' + g.collection + '">See all ' + D.countFor(g.collection) + arrowSvg + '</a></div></div>' +
          '<div class="game-grid game-grid--3">' + related.map(function (x, i) { return cardHTML(x, i); }).join('') + '</div>' +
        '</section>' +
      '</div>';

    document.addEventListener('cabinet:favchange', function (e) {
      if (e.detail.slug !== g.slug) return;
      var label = $('[data-fav-label]');
      if (label) label.textContent = e.detail.added ? 'On your shelf' : 'Save to shelf';
    });

    $$('[data-play-link]').forEach(function (link) {
      link.addEventListener('click', function () { recordRecent(g.slug); });
    });

    updateFavUI();
    revealInit();
  }

  /* ---------- info pages ---------- */
  var INFO = {
    about: {
      label: 'About',
      title: '148 games. <em>One click</em> <span class="nowrap">from play.</span>',
      body:
        '<p>ARCADE is a browser arcade index: 148 games, five collections and one job — get you from the shelf to the game with as little friction as possible.</p>' +
        '<p>Every cabinet has its own page. That page tells you what you are looking at, names the external host, and gives you a big Play button. Press it and you go directly to the matching game on its own play page, in a new tab. No install, no account, no emulator setup on our side.</p>' +
        '<h2>How the floor is organised</h2>' +
        '<ul>' +
        '<li><strong>Open Worlds</strong> — big maps, long roads and room to wander.</li>' +
        '<li><strong>Versus</strong> — wrestling, fighting and party games for two sides and one winner.</li>' +
        '<li><strong>Firefight</strong> — shooters from the tactical to the completely unhinged.</li>' +
        '<li><strong>Speed &amp; Sport</strong> — racing, football, cricket and last-minute comebacks.</li>' +
        '<li><strong>The Vault</strong> — horror, rhythm, puzzle, RPG and browser curiosities that fit nowhere else.</li>' +
        '</ul>' +
        '<h2>What ARCADE is — and is not</h2>' +
        '<p>ARCADE does not host game files, ROMs, ISOs or emulators, and does not claim ownership of any game. The catalogue links to third-party sites that provide the playable versions. Game names, logos and trademarks belong to their respective owners. ARCADE is independent and is not affiliated with, endorsed by or sponsored by any publisher, platform holder, storefront or external host.</p>' +
        '<h2>What we made</h2>' +
        '<p>The site design, front-end code and every typographic poster are original to ARCADE. The posters are generated as SVG from each game’s catalogue number, collection palette and a geometric motif; they do not reproduce box art, screenshots or publisher imagery. The single real photograph — the Tokyo arcade on the homepage — is openly licensed and credited in full on the <a href="info?p=copyright">copyright page</a>.</p>' +
        '<h2>How it is built</h2>' +
        '<ul>' +
        '<li>Plain HTML, CSS and JavaScript — no framework, no build step.</li>' +
        '<li>Original SVG poster art generated in code for all 148 links.</li>' +
        '<li>Favourites and recent games saved in localStorage; no account and no backend.</li>' +
        '<li>No ads, no analytics and no tracking scripts on ARCADE itself.</li>' +
        '<li>Anton, Space Grotesk and JetBrains Mono served by Google Fonts.</li>' +
        '</ul>' +
        '<div class="info-card-callout"><p><strong>External links.</strong> Play opens a third-party site. Its terms, privacy policy, ads and availability are outside our control. A link is a signpost, not an endorsement. See the <a href="info?p=terms">terms</a> and <a href="info?p=privacy">privacy</a> pages for the plain-language version.</p></div>' +
        '<h2>Keeping the list honest</h2>' +
        '<p>If a Play link is dead, points to the wrong game or should not be listed, tell us through the <a href="info?p=contact">contact page</a>. We would rather remove a broken cabinet than leave a misleading one.</p>'
    },
    contact: {
      label: 'Contact',
      title: 'Report a <em>dead link.</em>',
      body:
        '<p>ARCADE is a small index with one important maintenance job: making sure each of the 148 Play buttons lands on the right game. If something is broken, wrong or missing, we want to hear about it.</p>' +
        '<h2>Email</h2>' +
        '<p><a href="mailto:hello@arcade.run.place">hello@arcade.run.place</a></p>' +
        '<h2>What to include</h2>' +
        '<ul>' +
        '<li>The game title and its collection, for example “Burnout 3: Takedown / Speed &amp; Sport”.</li>' +
        '<li>The link you landed on, or the page where the problem happened.</li>' +
        '<li>What went wrong: wrong game, dead host, endless redirect, unexpected download prompt, or something else.</li>' +
        '<li>Your browser and device, if the problem looks layout-related.</li>' +
        '<li>A screenshot, if you have one. It is the fastest way to show a mismatch.</li>' +
        '</ul>' +
        '<h2>Copyright and removal requests</h2>' +
        '<p>ARCADE does not host the games. If you are a rights holder and want a link removed, email with the subject “Copyright” and include the exact ARCADE page, the game and link concerned, and a statement that you are authorised to act for the rights holder. We review these promptly and will remove or amend the link where appropriate. The <a href="info?p=copyright">copyright page</a> has the full process.</p>' +
        '<h2>Game support</h2>' +
        '<p>We cannot fix saves, controls, accounts or performance inside an external game. Those belong to the site hosting it. We can remove or replace the signpost if the destination is no longer right.</p>' +
        '<div class="info-card-callout"><p>We are a tiny project, not a support desk. Replies can take a little while — but reports of mismatched or dead links go to the top of the pile.</p></div>'
    },
    copyright: {
      label: 'Copyright',
      title: 'Copyright, credits &amp; <em>disclaimers.</em>',
      body:
        '<p>ARCADE is an independent, non-commercial index of external browser game links. This page explains what we own, what we do not own, and how to report a problem.</p>' +
        '<h2>Game titles and game content</h2>' +
        '<ul>' +
        '<li><strong>No game files:</strong> ARCADE does not host, copy, emulate or distribute game files, ROMs, ISOs, executables or in-game artwork. Each Play button links to a third-party site that provides the playable version.</li>' +
        '<li><strong>Trademarks:</strong> All game names, logos and trademarks are the property of their respective owners. They are used here in a descriptive way, to identify the game being linked to. No affiliation, endorsement, sponsorship or ownership is claimed.</li>' +
        '<li><strong>External hosts:</strong> We do not control third-party content, availability, advertising, downloads, account prompts, terms or privacy practices. A listing is not an endorsement of the host.</li>' +
        '</ul>' +
        '<h2>What ARCADE owns</h2>' +
        '<ul>' +
        '<li><strong>Site design and code:</strong> the layout, styles, interaction design and JavaScript are original work created for this project.</li>' +
        '<li><strong>Typographic posters:</strong> all 148 covers are original SVG artwork generated in code from catalogue numbers, collection palettes and geometric motifs. They do not reproduce box art, screenshots or publisher illustrations.</li>' +
        '<li><strong>Photography:</strong> one real photograph is used, the homepage hero. It is openly licensed and credited below.</li>' +
        '<li><strong>Fonts:</strong> Anton, Space Grotesk and JetBrains Mono are served by Google Fonts under their respective open font licences.</li>' +
        '</ul>' +
        '<h2>Photography credit</h2>' +
        '<p>Thank you to the photographer who made their work available. The image is cropped and resized for layout; no other alterations are made.</p>' +
        '<ul class="credit-list">' +
          '<li><strong>Homepage hero</strong> — “Video games arcade center in Tokyo” by Sergiy Galyonkin, <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener">CC BY-SA 2.0</a>. <a href="https://www.flickr.com/photo.gne?id=53416317573" target="_blank" rel="noopener">Source on Flickr</a>.</li>' +
        '</ul>' +
        '<p class="credit-note">The CC BY-SA 2.0 image remains under the same licence as the original. The cropped version used here is shared under CC BY-SA 2.0. Attribution does not imply endorsement by the photographer.</p>' +
        '<h2>External links and third-party material</h2>' +
        '<p>Play buttons navigate to websites we do not own or operate. Those sites are responsible for their own content, game files, advertising and compliance. ARCADE has no ability to remove material from them. If a linked site infringes your rights, contact that host as well as notifying us so the listing can be reviewed.</p>' +
        '<h2>Reporting a problem or takedown request</h2>' +
        '<p>If you are a rights holder and believe a link or any material on ARCADE infringes your rights, email <a href="mailto:hello@arcade.run.place">hello@arcade.run.place</a> with the subject “Copyright” and include:</p>' +
        '<ul>' +
        '<li>Your name and contact details.</li>' +
        '<li>The exact ARCADE URL and the game or link concerned.</li>' +
        '<li>The work you believe is infringed and why.</li>' +
        '<li>A statement that you are authorised to act for the rights holder.</li>' +
        '</ul>' +
        '<p>We review valid requests promptly and will remove or amend a listing where appropriate. Because ARCADE does not host game files, removal of the underlying game must be requested from its external host.</p>' +
        '<h2>Using the site</h2>' +
        '<p>You are welcome to play, link to ARCADE and share screenshots. Please do not republish the site design, code or poster system as your own product, and do not sell access to them. For licensing questions, get in touch.</p>'
    },
    privacy: {
      label: 'Privacy',
      title: 'Your data stays <em>yours.</em>',
      body:
        '<p>ARCADE is a static site with no accounts, no analytics, no advertising and no backend collecting play data.</p>' +
        '<h2>What is stored in your browser</h2>' +
        '<p>A small amount of information is kept in localStorage so the site works the way you expect:</p>' +
        '<ul>' +
        '<li><strong>Your shelf:</strong> the games you have hearted.</li>' +
        '<li><strong>Recent games:</strong> the last few cabinets you opened and played.</li>' +
        '</ul>' +
        '<p>None of this is transmitted anywhere. Clearing site data in your browser removes all of it.</p>' +
        '<h2>When you press Play</h2>' +
        '<p>Play opens a third-party game site in a new tab. That site may set cookies, use analytics, show advertising, request an account or collect other data under its own privacy policy. ARCADE does not receive or control that data. Please review the privacy policy of the site you land on before sharing information with it.</p>' +
        '<h2>Fonts</h2>' +
        '<p>Fonts are loaded from Google Fonts, which means Google receives the request for the font files, including your IP address. If you prefer, block third-party fonts — the site falls back to local system fonts and still works.</p>' +
        '<h2>Cookies</h2>' +
        '<p>ARCADE sets no cookies of its own and does not track you across sites. External sites opened through a Play link may set their own.</p>'
    },
    terms: {
      label: 'Terms',
      title: 'The <em>fine print.</em>',
      body:
        '<p>By using ARCADE, you agree to the following plain-language terms.</p>' +
        '<h2>The service</h2>' +
        '<p>ARCADE is a free index of external game links. We do not host the games. The site is provided “as is”; links can change, break, be geo-blocked or be removed without notice.</p>' +
        '<h2>External sites</h2>' +
        '<ul>' +
        '<li>Play buttons open third-party websites in a new tab. Their terms, privacy policies and end-user licence agreements apply to you.</li>' +
        '<li>You are responsible for any download, purchase, account or other agreement you enter into on an external site.</li>' +
        '<li>We are not responsible for third-party content, availability, advertising, malware, account issues or losses arising from your use of an external site.</li>' +
        '<li>A link does not mean we endorse the host, the game or anything else on that site.</li>' +
        '</ul>' +
        '<h2>Acceptable use</h2>' +
        '<ul>' +
        '<li>Do not attempt to disrupt the site or other visitors’ access to it.</li>' +
        '<li>Do not scrape at a volume that harms the service, or use it for unlawful activity.</li>' +
        '<li>Do not republish the site design, code or poster system as a commercial product.</li>' +
        '<li>Do not misrepresent ARCADE as affiliated with or endorsed by any game publisher or external host.</li>' +
        '</ul>' +
        '<h2>Intellectual property</h2>' +
        '<p>Game names, logos and trademarks belong to their respective owners. ARCADE does not host game files and claims no ownership of them. The site design, code and original typographic posters belong to ARCADE; see the <a href="info?p=copyright">copyright page</a> for details.</p>' +
        '<h2>Privacy</h2>' +
        '<p>Favourites and recent games stay in your browser. The <a href="info?p=privacy">privacy page</a> explains what is stored and what happens when you follow an external link.</p>' +
        '<h2>Liability</h2>' +
        '<p>To the extent permitted by law, ARCADE is not liable for indirect or consequential loss arising from use of the site or any external site it links to. Nothing in these terms excludes rights that cannot legally be excluded.</p>' +
        '<h2>Changes</h2>' +
        '<p>These terms may be updated as the project evolves. The current version is always published on this page.</p>' +
        '<h2>Non-affiliation</h2>' +
        '<p>ARCADE is an independent project and is not affiliated with, endorsed by or sponsored by any game publisher, platform holder, storefront or external host. All game titles and trademarks remain with their owners.</p>'
    }
  };

  function renderInfo() {
    var root = $('#info-root');
    if (!root) return;
    var params = new URLSearchParams(location.search);
    var key = params.get('p') || 'about';
    var data = INFO[key] || INFO.about;
    document.title = data.label + ' — ARCADE';
    root.innerHTML =
      '<div class="wrap info-layout">' +
        '<nav class="info-nav" aria-label="Information pages">' +
          Object.keys(INFO).map(function (k) {
            return '<a href="info?p=' + k + '" class="' + (k === key ? 'active' : '') + '">' + INFO[k].label + '</a>';
          }).join('') +
        '</nav>' +
        '<article class="info-content">' +
          '<span class="eyebrow">' + esc(data.label) + '</span>' +
          '<h1>' + data.title + '</h1>' +
          data.body +
          '<p style="margin-top:34px;font-size:12px;color:var(--dim)">Last updated: October 2026.</p>' +
        '</article>' +
      '</div>';
    revealInit();
  }

  /* ---------- boot ---------- */
  function boot() {
    initHeader();
    initSearch();
    updateFavUI();
    if (page === 'home') renderHome();
    else if (page === 'collection') renderCollection();
    else if (page === 'game') renderGame();
    else if (page === 'info') renderInfo();
    else revealInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Fav buttons are delegated so they work on every rendered card
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    toggleFav(btn.getAttribute('data-fav'));
  });

  window.CABINET_APP = {
    recordRecent: recordRecent,
    toast: toast
  };
}());
