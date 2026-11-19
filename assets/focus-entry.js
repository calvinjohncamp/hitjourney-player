/* Load the app inside a persistent viewport before user interaction, so resizing
   changes its real media-query viewport without restarting the player. */
(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  if (window.parent !== window) {
    const clean = new URL(location.href);
    if (clean.searchParams.has("__hj_load")) {
      clean.searchParams.delete("__hj_load");
      history.replaceState(history.state, "", clean.href);
    }
    return;
  }
  const shell = new URL('/focus.html', location.href);
  shell.searchParams.set('v','5');
  shell.searchParams.set('page', location.pathname + location.search + location.hash);
  location.replace(shell.href);
})();
