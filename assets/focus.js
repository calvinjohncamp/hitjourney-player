/* HitJourney focus: keep the fullscreen owner alive across document navigation.
   Inspired by TFB focus.js/presentation.js; resizing keeps the live audio/DOM. */
(() => {
  'use strict';
  let host;
  try {
    if (parent !== window && parent.HJFocus?.ownedFrame === window.frameElement) host = parent.HJFocus;
  } catch (_) { /* An unrelated embedding has no access to our controller. */ }
  const persistentHost = document.body.hasAttribute('data-hj-focus-host');
  let viewport = null, width = 1440;
  let active = false, pending = false, ownedFrame = null, hadFullscreen = false;
  const fullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  const getState = () => host ? host.state() : ({active, fullscreen: !!fullscreen(), pending, notice});
  let notice = '';
  const panel = document.createElement('div');
  panel.className = 'hj-focus-panel';
  panel.innerHTML = '<span role="status" aria-live="polite"></span><button type="button" class="hj-focus-exit" aria-label="Fokusmodus beenden">×</button>';
  document.body.append(panel);
  let controlsTimer, gripsTimer, lastGripDistance = null;
  function revealGrips() {
    if (!active || !viewport) return;
    viewport.classList.add('hj-grips-visible');
    clearTimeout(gripsTimer);
    gripsTimer = setTimeout(() => viewport.classList.remove('hj-grips-visible'), 3000);
  }
  function approachGrip(clientX) {
    if (!active || !viewport || !Number.isFinite(clientX)) return;
    const rect = viewport.getBoundingClientRect();
    const distance = Math.min(Math.abs(clientX - rect.left), Math.abs(clientX - rect.right));
    if (distance <= 16 || (distance <= 80 && (lastGripDistance === null || distance < lastGripDistance))) revealGrips();
    lastGripDistance = distance;
  }
  function reveal() {
    if (host) return host.reveal();
    panel.classList.add('hj-focus-controls');
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => panel.classList.remove('hj-focus-controls'), 2000);
  }
  panel.addEventListener('pointerenter', reveal);
  panel.addEventListener('pointerleave', reveal);
  function render() {
    const state = getState();
    document.documentElement.classList.toggle('hj-focus-active', state.active);
    if (viewport) updateWidth();
    panel.hidden = !state.active || !!host;
    panel.querySelector('span').textContent = state.notice || '';
    document.querySelectorAll('.hj-focus-dot').forEach(button => {
      button.setAttribute('aria-pressed', String(state.active));
      button.setAttribute('aria-label', state.active ? 'Fokusmodus beenden' : 'Fokusmodus aktivieren');
      button.removeAttribute('title');
    });
    if (ownedFrame) {
      try { ownedFrame.contentWindow.HJFocus?.refresh(); } catch (_) {}
    }
  }
  async function toggle() {
    if (host) return host.toggle(); // Direct same-origin call preserves the user's activation.
    if (pending) return;
    if (active) {
      pending = true;
      try {
        if (fullscreen()) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          await exit.call(document);
        }
        active = false;
      } catch (_) { notice = 'Vollbild konnte nicht beendet werden'; reveal(); }
      finally { pending = false; render(); }
      return;
    }
    clearTimeout(controlsTimer);
    panel.classList.remove('hj-focus-controls');
    active = true;
    lastGripDistance = null;
    revealGrips();
    pending = true;
    notice = '';
    render();
    const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    try {
      if (!request || (document.documentElement.requestFullscreen ? document.fullscreenEnabled === false : document.webkitFullscreenEnabled === false)) {
        notice = 'Fokus im Browserfenster · Vollbild hier nicht verfügbar';
        reveal();
      } else {
        await request.call(document.documentElement, {navigationUI: 'hide'});
        hadFullscreen = !!fullscreen();
      }
    } catch (_) { notice = 'Fokus im Browserfenster · Browser erlaubt kein Vollbild'; reveal(); }
    finally { pending = false; render(); }
  }
  function navigate(value) {
    const url = new URL(value, location.href);
    if (host || !ownedFrame || url.origin !== location.origin) {
      location.assign(url.href);
      return;
    }
    ownedFrame.src = url.href;
    ownedFrame.focus();
  }
  function updateWidth() {
    const max = Math.max(1, innerWidth - (innerWidth <= 700 ? 20 : 28));
    const actual = Math.min(width, max);
    viewport.style.setProperty('--hj-focus-width', actual + 'px');
    viewport.querySelectorAll('.hj-focus-grip').forEach(grip => {
      grip.setAttribute('aria-valuemin', String(Math.min(320, max)));
      grip.setAttribute('aria-valuemax', String(max));
      grip.setAttribute('aria-valuenow', String(Math.round(actual)));
    });
  }
  function setWidth(value) {
    const max = Math.max(1, innerWidth - (innerWidth <= 700 ? 20 : 28));
    width = Math.max(Math.min(320, max), Math.min(value, max));
    updateWidth();
  }
  function createViewport() {
    const stage = document.createElement('div');
    stage.className = 'hj-focus-stage';
    viewport = document.createElement('div');
    viewport.className = 'hj-focus-viewport';
    stage.append(viewport);
    ownedFrame = document.createElement('iframe');
    ownedFrame.className = 'hj-focus-frame';
    ownedFrame.title = 'HitJourney · Mr. DJ';
    ownedFrame.allow = 'fullscreen; autoplay';
    ownedFrame.allowFullscreen = true;
    ownedFrame.addEventListener('load', () => {
      try {
        const child = ownedFrame.contentWindow;
        if (child.location.origin === location.origin) {
          history.replaceState(history.state, '', child.location.href);
          document.title = child.document.title;
          child.HJFocus?.refresh();
        }
      } catch (_) {}
    });
    let initial = new URL(new URLSearchParams(location.search).get('page') || '/', location.origin);
    if (initial.origin !== location.origin || initial.pathname === '/focus.html') initial = new URL('/', location.origin);
    ownedFrame.src = initial.href;
    viewport.append(ownedFrame);
    for (const side of ['left', 'right']) {
      const grip = document.createElement('div');
      grip.className = 'hj-focus-grip';
      grip.dataset.side = side;
      grip.tabIndex = 0;
      grip.setAttribute('role', 'separator');
      grip.setAttribute('aria-label', 'Ansichtsbreite ändern');
      grip.setAttribute('aria-orientation', 'vertical');
      let dragging = false;
      grip.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragging = true;
        revealGrips();
        grip.setPointerCapture(event.pointerId);
      });
      grip.addEventListener('pointermove', event => {
        if (dragging) { revealGrips(); setWidth((side === 'right' ? event.clientX - innerWidth / 2 : innerWidth / 2 - event.clientX) * 2); }
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grip.addEventListener(type, () => { dragging = false; });
      grip.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = viewport.getBoundingClientRect().width;
        if (event.key === 'Home') setWidth(320);
        else if (event.key === 'End') setWidth(innerWidth);
        else setWidth(current + (event.key === 'ArrowRight' ? 20 : -20) * (event.shiftKey ? 5 : 1));
      });
      viewport.append(grip);
    }
    const edge = document.createElement('div');
    edge.className = 'hj-focus-reveal';
    edge.addEventListener('pointerenter', reveal);
    stage.append(edge);
    document.body.append(stage);
    window.addEventListener('resize', updateWidth);
    updateWidth();
  }
  window.HJFocus = {
    toggle, navigate, reveal, approachGrip, refresh: render, state: getState,
    get ownedFrame() { return ownedFrame; }
  };
  function addDots() {
    document.querySelectorAll('#logoHome > img, .hj-logo-vert > img, .mobile-hj-logo > img').forEach(img => {
      const wrap = document.createElement('span');
      wrap.className = 'hj-focus-logo';
      img.replaceWith(wrap);
      wrap.append(img);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hj-focus-dot';
      wrap.append(button);
    });
    render();
  }
  // Capture before existing Home handlers, including DJ's pointerup navigation.
  for (const type of ['click', 'pointerup', 'keydown']) {
    document.addEventListener(type, event => {
      const dot = event.target.closest?.('.hj-focus-dot');
      if (!dot || (type === 'keydown' && !['Enter', ' '].includes(event.key))) return;
      event.stopImmediatePropagation();
      if (type === 'click') { event.preventDefault(); toggle(); }
      // Preserve native button Enter/Space behavior; its generated click toggles once.
    }, true);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (event.defaultPrevented || !link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    if (getState().active && url.origin === location.origin && (url.pathname !== location.pathname || url.search !== location.search)) {
      event.preventDefault(); navigate(url.href);
    }
  });
  panel.querySelector('button').addEventListener('click', toggle);
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !getState().active) return;
    if (host) {
      if (event.clientY < 16) host.reveal();
      host.approachGrip?.(window.frameElement.getBoundingClientRect().left + event.clientX);
    } else approachGrip(event.clientX);
  }, {passive: true});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && getState().active && !getState().fullscreen) toggle();
  });
  function fullscreenChanged() {
    if (!host) {
      if (fullscreen()) { hadFullscreen = true; active = true; }
      else if (hadFullscreen) { active = false; hadFullscreen = false; }
    }
    render();
  }
  document.addEventListener('fullscreenchange', fullscreenChanged);
  document.addEventListener('webkitfullscreenchange', fullscreenChanged);
  window.addEventListener('pageshow', render);
  document.addEventListener('play', event => {
    if (ownedFrame && event.target.matches?.('audio,video')) event.target.pause();
  }, true);
  if (persistentHost) createViewport();
  addDots();
  // Mr. DJ creates its mobile branding after the initial markup.
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('.mobile-brand') || node.querySelector?.('.mobile-brand'))))) addDots();
  }).observe(document.body, {childList: true, subtree: true});
})();
