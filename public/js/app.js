/* app.js — progressive enhancement shared across pages.
   Safe to load everywhere: each block no-ops if its elements are absent. */
(function () {
  'use strict';

  var slice = function (x) { return Array.prototype.slice.call(x); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Mobile navigation toggle ──
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── FAQ accordion (one open at a time) ──
  var faqItems = slice(document.querySelectorAll('.faq-item'));
  faqItems.forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var willOpen = !item.classList.contains('open');
      faqItems.forEach(function (it) { it.classList.remove('open'); });
      if (willOpen) item.classList.add('open');
    });
  });

  // ── Count-up for stats ──
  slice(document.querySelectorAll('[data-count]')).forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    if (reduce) { el.textContent = prefix + target + suffix; return; }
    var dur = 1300, t0 = null;
    requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    });
  });

  // ── Scroll reveal + staggered children ──
  var staggerEls = slice(document.querySelectorAll('[data-stagger]'));
  staggerEls.forEach(function (c) {
    slice(c.children).forEach(function (k) { k.classList.add('reveal-child'); });
  });
  var targets = slice(document.querySelectorAll('[data-reveal], [data-stagger]'));

  function revealNow(el) {
    if (el.hasAttribute('data-stagger')) {
      slice(el.children).forEach(function (k, i) {
        k.style.transitionDelay = (i * 90) + 'ms';
        k.classList.add('is-visible');
      });
    } else {
      el.classList.add('is-visible');
    }
  }

  if ('IntersectionObserver' in window && !reduce) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    targets.forEach(function (t) { observer.observe(t); });
  } else {
    // Fallback: show everything immediately.
    targets.forEach(function (t) {
      t.classList.add('is-visible');
      slice(t.children).forEach(function (k) { k.classList.add('is-visible'); });
    });
  }
})();
