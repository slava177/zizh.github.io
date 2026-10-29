/* ==========================================================================
   Every page: the light/dark button, the menu's island once the page scrolls, the
   section being read lit up in the profile column, and the papers' Abstract buttons
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;

  /* Light or dark: the theme picked with the button is kept in localStorage and set on
     <html> by the script in _includes/head.html; without one the system's setting applies. */

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const themeButton = document.querySelector('.theme-toggle');

  function isDark() {
    return root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches;
  }

  function showTheme() {
    themeButton.setAttribute('aria-pressed', String(isDark()));
  }

  if (themeButton) {
    themeButton.hidden = false;
    showTheme();
    systemDark.addEventListener('change', showTheme);
    themeButton.addEventListener('click', function () {
      const theme = isDark() ? 'light' : 'dark';
      root.dataset.theme = theme;
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {}
      showTheme();
    });
  }

  /* The menu gets its own background once the page has scrolled. */

  const header = document.querySelector('.site-header');

  function markScrolled() {
    header.classList.toggle('site-header--scrolled', window.scrollY > 4);
  }

  if (header) {
    markScrolled();
    window.addEventListener('scroll', markScrolled, { passive: true });
  }

  /* The section being read is the last one whose top has passed a third of the way down
     the window, or the last section once the page is scrolled to the bottom. */

  const sectionLinks = Array.from(document.querySelectorAll('.profile__sections a[href^="#"]'));
  const sections = sectionLinks.map(function (link) {
    return document.getElementById(decodeURIComponent(link.hash.slice(1)));
  });

  function markCurrentSection() {
    const line = window.innerHeight / 3;
    let current = 0;
    sections.forEach(function (section, i) {
      if (section && section.getBoundingClientRect().top <= line) {
        current = i;
      }
    });
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
      current = sections.length - 1;
    }
    sectionLinks.forEach(function (link, i) {
      link.classList.toggle('is-current', i === current);
      if (i === current) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if (sectionLinks.length > 0 && sections.every(Boolean)) {
    markCurrentSection();
    window.addEventListener('scroll', markCurrentSection, { passive: true });
    window.addEventListener('resize', markCurrentSection);
  }

  /* Buttons that open and close the panel they name in aria-controls: the abstracts.
     Hidden until now, as they need this script. */

  document.querySelectorAll('[data-opens]').forEach(function (button) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) {
      return;
    }
    button.hidden = false;
    button.addEventListener('click', function () {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
  });
})();
