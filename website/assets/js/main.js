/* Firefly landing page.  Two behaviours, no dependencies:
     - "Launch live demo" (and the poster) swaps the hero for an iframe of the
       current GitHub Pages build.  Nothing is fetched until it is pressed.
     - "Close" points the iframe back at about:blank, which releases the WebGL
       context.  Without it a backgrounded Firefly keeps burning GPU. */
(function () {
  var frame = document.getElementById('demo-frame');
  if (!frame) return;

  var url = frame.getAttribute('data-src');

  /* Below 700px the demo opens in its own tab instead of in the page: a
     1.5-billion-point WebGL scene framed on a phone is a bad first impression,
     and iOS reclaims backgrounded WebGL contexts anyway. */
  var small = window.matchMedia('(max-width: 700px)');

  function launch() {
    if (small.matches) { window.open(url, '_blank', 'noopener'); return; }
    if (frame.getAttribute('src') !== url) frame.setAttribute('src', url);
    document.body.classList.add('demo-open');
  }

  function close() {
    document.body.classList.remove('demo-open');
    frame.setAttribute('src', 'about:blank');
  }

  document.querySelectorAll('[data-launch]').forEach(function (el) {
    el.addEventListener('click', launch);
  });
  document.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });

  /* narrowing the window while the demo is open drops back to the poster */
  small.addEventListener('change', function (e) {
    if (e.matches && document.body.classList.contains('demo-open')) close();
  });
})();
