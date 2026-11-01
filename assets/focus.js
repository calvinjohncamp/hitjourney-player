/* HitJourney focus: keep the fullscreen owner alive across document navigation.
   Inspired by TFB's focus.js; unlike its presentation clone, entry keeps live audio/DOM. */
(() => {
  'use strict';
  let host;
  try {
    if (parent !== window && parent.HJFocus?.ownedFrame === window.frameElement) host = parent.HJFocus;
  } catch (_) { /* An unrelated embedding has no access to our controller. */ }
  let active = false, pending = false, ownedFrame = null, hadFullscreen = false;
  const fullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  const getState = () => host ? host.state() : ({active, fullscreen: !!fullscreen(), pending, notice});
  let notice = '';
  const panel = document.createElement('div');
  panel.className = 'hj-focus-panel';
  panel.innerHTML = '<span role="status" aria-live="polite"></span><button type="button" class="hj-focus-exit" aria-label="Fokusmodus beenden">×</button>';
  document.body.append(panel);
  function render() {
    const state = getState();
    document.documentElement.classList.toggle('hj-focus-active', state.active);
    panel.hidden = !state.active || !!host;
    panel.querySelector('span').textContent = state.fullscreen ? 'Fokus · Vollbild' : (state.notice || 'Fokus · im Browserfenster');
    document.querySelectorAll('.hj-focus-dot').forEach(button => {
      button.setAttribute('aria-pressed', String(state.active));
      button.setAttribute('aria-label', state.active ? 'Fokusmodus beenden' : 'Fokusmodus aktivieren');
      button.title = state.active ? 'Fokus beenden · Escape' : 'Fokusmodus';
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
      } catch (_) { notice = 'Vollbild bitte mit Escape beenden'; }
      finally { pending = false; render(); }
      return;
    }
    active = true;
    pending = true;
    notice = '';
    render();
    const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    try {
      if (!request || document.fullscreenEnabled === false || document.webkitFullscreenEnabled === false) {
        notice = 'Fokus im Browserfenster · Vollbild hier nicht verfügbar';
      } else {
        await request.call(document.documentElement, {navigationUI: 'hide'});
        hadFullscreen = !!fullscreen();
      }
    } catch (_) { notice = 'Fokus im Browserfenster · Browser erlaubt kein Vollbild'; }
    finally { pending = false; render(); }
  }
  function navigate(value) {
    const url = new URL(value, location.href);
    if (host || (!active && !ownedFrame) || url.origin !== location.origin) {
      location.assign(url.href);
      return;
    }
    if (!ownedFrame) {
      // A real document navigation also stops the old player. Do not leave hidden audio running.
      document.querySelectorAll('audio,video').forEach(media => media.pause());
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
        } catch (_) { /* External navigation cannot access the host controller. */ }
      });
      // The retained page must not receive keyboard focus behind the visible app.
      [...document.body.children].forEach(node => { if (node !== ownedFrame && node !== panel) node.inert = true; });
      document.body.append(ownedFrame);
      document.documentElement.classList.add('hj-focus-shell');
    }
    ownedFrame.src = url.href;
    render();
    ownedFrame.focus();
  }
  window.HJFocus = {
    toggle, navigate, refresh: render, state: getState,
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
  addDots();
  // Mr. DJ creates its mobile branding after the initial markup.
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('.mobile-brand') || node.querySelector?.('.mobile-brand'))))) addDots();
  }).observe(document.body, {childList: true, subtree: true});
})();
