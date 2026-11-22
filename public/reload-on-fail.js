/*
 * Recover from a deploy that lands mid-page-load: an index.html from the
 * previous deploy can reference a hashed /assets/ file that the new deploy no
 * longer has. Cloudflare Pages then answers with index.html (text/html), so
 * the script or stylesheet fails to load. Reload once to get the new build.
 *
 * Plain, unhashed, non-module script (the CSP forbids inline scripts) served
 * with Cache-Control: no-cache. A sessionStorage timestamp stops a genuinely
 * broken deploy from reloading in a loop.
 */
(function () {
  var KEY = '31cal:reloadOnFailAt';
  var GUARD_MS = 60 * 1000;
  var BOOT_TIMEOUT_MS = 10 * 1000;

  function reloadOnce(reason) {
    var last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY)) || 0;
    } catch (e) {}
    if (Date.now() - last < GUARD_MS) {
      if (window.console) console.warn('31cal: not reloading again', reason);
      return;
    }
    try {
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch (e) {}
    location.reload();
  }

  function isOurAsset(url) {
    try {
      var u = new URL(url, location.href);
      return (
        u.origin === location.origin && u.pathname.indexOf('/assets/') === 0
      );
    } catch (e) {
      return false;
    }
  }

  // Resource load errors don't bubble; listen in the capture phase.
  window.addEventListener(
    'error',
    function (event) {
      var t = event.target;
      if (!t || t === window) return;
      if (t.tagName === 'SCRIPT' && isOurAsset(t.src)) {
        reloadOnce('script failed: ' + t.src);
      } else if (
        t.tagName === 'LINK' &&
        /stylesheet/i.test(t.rel) &&
        isOurAsset(t.href)
      ) {
        reloadOnce('stylesheet failed: ' + t.href);
      }
    },
    true,
  );

  // The bundle sets window.__31calBooted when it runs. If it never does
  // (e.g. served as HTML and rejected), reload.
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (!window.__31calBooted) reloadOnce('app did not start');
    }, BOOT_TIMEOUT_MS);
  });
})();
