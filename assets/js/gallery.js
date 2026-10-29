/* ==========================================================================
   The Travel and Scale Models pages (_layouts/gallery.html)
   ========================================================================== */

// A grid of photos and clips that open full-screen when clicked, as on Yingsi Qin's
// photography page. Clips play while they are in view. The full view has arrows (and the
// arrow keys, and swipes) for the previous and next item, Back or Escape to close, and its
// own link: #photo-3 is the third entry in the page's data file, whichever order is shown.

(function () {
  'use strict';

  const gallery = document.querySelector('.gallery');
  if (!gallery) {
    return;
  }
  const grid = gallery.querySelector('.gallery__grid');
  const items = Array.from(grid.children);  // in the data file's order
  const sortButton = gallery.querySelector('.gallery__sort');
  const pageTitle = gallery.querySelector('.page__title').textContent;
  const documentTitle = document.title;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Clips play while at least half of one is in view, unless motion is reduced. */

  const clips = Array.from(grid.querySelectorAll('video'));
  const clipWatcher = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !reduceMotion.matches && !document.documentElement.classList.contains('gallery-detail-open')) {
        entry.target.play().catch(function () {});
      } else {
        entry.target.pause();
      }
    });
  }, { threshold: 0.5 }) : null;

  function watchClips() {
    clips.forEach(function (clip) {
      clipWatcher.unobserve(clip);
      clipWatcher.observe(clip);  // reports right away whether it's in view
    });
  }
  if (clipWatcher) {
    watchClips();
  }

  /* Oldest first or newest first. The button says the order a click switches to, and the
     choice is remembered for the next visit. */

  const orderKey = 'gallery-newest-first';

  function showOrder(newestFirst) {
    (newestFirst ? items.slice().reverse() : items).forEach(function (item) {
      grid.appendChild(item);
    });
    sortButton.textContent = newestFirst ? 'Oldest first' : 'Newest first';
  }

  let newestFirst = false;
  try {
    newestFirst = localStorage.getItem(orderKey) === 'true';
  } catch (e) {}
  if (newestFirst) {
    showOrder(true);
  }

  sortButton.addEventListener('click', function () {
    newestFirst = !newestFirst;
    showOrder(newestFirst);
    try {
      localStorage.setItem(orderKey, newestFirst);
    } catch (e) {}
  });

  /* The full view */

  const arrow = function (path) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + path + '"/></svg>';
  };
  const detail = document.createElement('div');
  detail.className = 'gallery-detail';
  detail.hidden = true;
  detail.setAttribute('role', 'dialog');
  detail.setAttribute('aria-modal', 'true');
  detail.innerHTML =
    '<div class="gallery-detail__bar">' +
      '<span></span>' +
      '<button type="button" class="gallery-detail__close">Back</button>' +
    '</div>' +
    '<div class="gallery-detail__body">' +
      '<div class="gallery-detail__info"></div>' +
      '<div class="gallery-detail__media"></div>' +
      '<button type="button" class="gallery-detail__arrow gallery-detail__arrow--previous" aria-label="Previous">' + arrow('M15 5l-7 7 7 7') + '</button>' +
      '<button type="button" class="gallery-detail__arrow gallery-detail__arrow--next" aria-label="Next">' + arrow('M9 5l7 7-7 7') + '</button>' +
    '</div>';
  detail.querySelector('.gallery-detail__bar span').textContent = pageTitle;
  document.body.appendChild(detail);

  const info = detail.querySelector('.gallery-detail__info');
  const media = detail.querySelector('.gallery-detail__media');
  const closeButton = detail.querySelector('.gallery-detail__close');
  const previousButton = detail.querySelector('.gallery-detail__arrow--previous');
  const nextButton = detail.querySelector('.gallery-detail__arrow--next');
  let current = null;

  function shownOrder() {
    return Array.from(grid.children);
  }

  // Fills the full view with an item's photo or clip and text.
  function show(item) {
    current = item;
    const caption = item.querySelector('figcaption');
    info.innerHTML = caption.innerHTML;
    media.textContent = '';

    const tileClip = item.querySelector('video');
    if (tileClip) {
      const clip = document.createElement('video');
      clip.src = item.dataset.full;
      clip.poster = tileClip.poster;
      clip.muted = true;
      clip.loop = true;
      clip.playsInline = true;
      clip.setAttribute('aria-label', tileClip.getAttribute('aria-label'));
      if (reduceMotion.matches) {
        clip.controls = true;
      } else {
        clip.autoplay = true;
      }
      media.appendChild(clip);
    } else {
      // The grid's copy shows at once; the full-size photo replaces it when it has loaded.
      const tilePhoto = item.querySelector('img');
      const photo = document.createElement('img');
      photo.alt = tilePhoto.alt;
      photo.src = tilePhoto.currentSrc || tilePhoto.src;
      media.appendChild(photo);
      const full = new Image();
      full.onload = function () {
        if (current === item) {
          photo.src = full.src;
        }
      };
      full.src = item.dataset.full;
    }

    const order = shownOrder();
    const position = order.indexOf(item);
    previousButton.hidden = position === 0;
    nextButton.hidden = position === order.length - 1;
    const title = caption.querySelector('h2').textContent;
    detail.setAttribute('aria-label', title);
    document.title = title + ' - ' + documentTitle;
  }

  function linkTo(item) {
    return '#photo-' + (items.indexOf(item) + 1);
  }

  // Opens the full view on an item. A click adds a step to the browser's history, so
  // its Back button closes the view again; the arrows only change the link.
  function open(item, addToHistory) {
    show(item);
    if (detail.hidden) {
      detail.hidden = false;
      document.documentElement.classList.add('gallery-detail-open');
      clips.forEach(function (clip) {
        clip.pause();
      });
      closeButton.focus();
    }
    if (addToHistory) {
      history.pushState({ galleryDetail: true }, '', linkTo(item));
    } else if (location.hash !== linkTo(item)) {
      history.replaceState(history.state, '', linkTo(item));
    }
  }

  function close() {
    if (detail.hidden) {
      return;
    }
    detail.hidden = true;
    media.textContent = '';  // stops a clip
    document.documentElement.classList.remove('gallery-detail-open');
    document.title = documentTitle;
    if (current) {
      current.focus({ preventScroll: true });
      current.scrollIntoView({ block: 'nearest' });
    }
    if (clipWatcher) {
      watchClips();
    }
  }

  // Back, Escape: return to the step before the view opened if there is one (popstate then
  // closes it), else just drop the link.
  function requestClose() {
    if (history.state && history.state.galleryDetail) {
      history.back();
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      close();
    }
  }

  function step(by) {
    const order = shownOrder();
    const next = order[order.indexOf(current) + by];
    if (next) {
      open(next, false);
    }
  }

  // The item a link like #photo-3 points to, if any.
  function linkedItem() {
    const match = /^#photo-(\d+)$/.exec(location.hash);
    return match ? items[Number(match[1]) - 1] : null;
  }

  items.forEach(function (item) {
    item.addEventListener('click', function () {
      open(item, true);
    });
    item.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(item, true);
      }
    });
  });

  closeButton.addEventListener('click', requestClose);
  previousButton.addEventListener('click', function () {
    step(-1);
  });
  nextButton.addEventListener('click', function () {
    step(1);
  });

  detail.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      requestClose();
    } else if (event.key === 'ArrowLeft') {
      step(-1);
    } else if (event.key === 'ArrowRight') {
      step(1);
    } else if (event.key === 'Tab') {
      // Keep the focus on the view's own buttons while it is open.
      const buttons = [closeButton, previousButton, nextButton].filter(function (button) {
        return !button.hidden;
      });
      const at = buttons.indexOf(document.activeElement);
      event.preventDefault();
      buttons[(at + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  });

  // Swipes on the photo go to the previous or next one.
  let touchStart = null;
  media.addEventListener('touchstart', function (event) {
    touchStart = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });
  media.addEventListener('touchend', function (event) {
    if (!touchStart) {
      return;
    }
    const dx = event.changedTouches[0].clientX - touchStart.clientX;
    const dy = event.changedTouches[0].clientY - touchStart.clientY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) {
      step(dx < 0 ? 1 : -1);
    }
    touchStart = null;
  });

  window.addEventListener('popstate', function () {
    const item = linkedItem();
    if (item) {
      open(item, false);
    } else {
      close();
    }
  });

  const linked = linkedItem();
  if (linked) {
    open(linked, false);
  }
})();
