/* Load the app inside a persistent viewport before user interaction, so resizing
   changes its real media-query viewport without restarting the player. */
(() => {
  if (window.parent !== window || !/^https?:$/.test(location.protocol)) return;
  const shell = new URL('/focus.html', location.href);
  shell.searchParams.set('v','4');
  shell.searchParams.set('page', location.pathname + location.search + location.hash);
  location.replace(shell.href);
})();
