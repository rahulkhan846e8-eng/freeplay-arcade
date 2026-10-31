/* ==========================================================================
   ARCADE - Popunder Ad Intensity Controller
   Caps background popunder ads to at most 1 time per session or cooldown,
   preventing popunders from triggering on every page navigation or click.
   Leaves the Play / Download button Smartlink ad completely untouched.
   ========================================================================== */
(function () {
  'use strict';

  var MAX_POPUNDERS = 1; // Maximum popunders allowed per session / cooldown
  var COOLDOWN_HOURS = 2; // Cooldown in hours before counter resets
  var SESSION_KEY = 'arcade_popunder_count';
  var LOCAL_KEY = 'arcade_popunder_data';

  function getStorage(type, key) {
    try {
      return window[type] ? window[type].getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function setStorage(type, key, val) {
    try {
      if (window[type]) window[type].setItem(key, val);
    } catch (e) {}
  }

  var sessionCount = parseInt(getStorage('sessionStorage', SESSION_KEY) || '0', 10);
  var now = Date.now();
  var localData = { time: now, count: 0 };
  try {
    var raw = getStorage('localStorage', LOCAL_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (!localData.time || (now - localData.time) > (COOLDOWN_HOURS * 3600000)) {
    localData = { time: now, count: 0 };
  }

  var currentImpressions = Math.max(sessionCount, localData.count || 0);

  // If frequency cap reached, do NOT load the popunder script
  if (currentImpressions >= MAX_POPUNDERS) {
    return;
  }

  // Under cap: inject the Adsterra Popunder script
  var script = document.createElement('script');
  script.setAttribute('data-cfasync', 'false');
  script.src = 'https://abscloud.org/1/1b3a33f6c21a078848db21c90cbfe023';
  document.head.appendChild(script);

  // Track when the user clicks on this page to trigger the popunder
  var counted = false;
  window.addEventListener('click', function (e) {
    // Ignore clicks on the Play button (handled independently by the smartlink)
    if (e.target && e.target.closest && e.target.closest('[data-play-link]')) {
      return;
    }

    if (!counted) {
      counted = true;
      var newCount = currentImpressions + 1;
      setStorage('sessionStorage', SESSION_KEY, String(newCount));
      localData.count = newCount;
      localData.time = Date.now();
      setStorage('localStorage', LOCAL_KEY, JSON.stringify(localData));
    }
  }, true);
})();
