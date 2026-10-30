/* ==========================================================================
   The Travel and Scale Models pages (_layouts/gallery.html)
   ========================================================================== */

// A grid of photos and clips that open full-screen when clicked, as on Yingsi Qin's
// photography page. Clips play while they are in view. The full view has arrows (and the
// arrow keys, and swipes) for the previous and next photo, Back or Escape to close, and its
// own link: #photo-3 is the third entry in the page's data file, whichever order is shown.
// An entry with more photos (photos: in the data file) shows them one after another
// before the next entry, with small buttons for them under its text; #photo-3-2 is the
// third entry's second photo.
//
// Motion (assets/js/motion.js, https://motion.dev) moves things: a photo grows out of its
// tile into the full view and shrinks back into it, photos slide past in the full view,
// photos fade in as they load and tiles rise into view the first time the page scrolls to
// them, and the tiles rearrange themselves when the order flips or a year is picked
// (Travel). Without Motion, or when the system asks for reduced motion, the same things
// happen without moving.

(function () {
  'use strict';

  const gallery = document.querySelector('.gallery');
  if (!gallery) {
    return;
  }
  const grid = gallery.querySelector('.gallery__grid');
  const items = Array.from(grid.children);  // in the data file's order
  const sortButton = document.querySelector('.gallery__sort');  // in the menu at the top
  const years = gallery.querySelector('.gallery__years');  // if the page has them
  const pageTitle = gallery.querySelector('.gallery__title').textContent;
  const documentTitle = document.title;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = window.Motion;  // from assets/js/motion.js, if it loaded
  const easeOut = [0.22, 1, 0.36, 1];

  function moving() {
    return Boolean(motion) && !reduceMotion.matches;
  }

  // A spring that comes to rest in about `time` seconds, overshooting by `bounce` (0 to 1).
  function spring(time, bounce) {
    return { type: 'spring', visualDuration: time, bounce: bounce };
  }

  // Sets values at once. Once Motion has animated a value it keeps it, and draws it again
  // on the next frame, so a value set on the element's style directly wouldn't last.
  function put(elements, values) {
    motion.animate(elements, values, { duration: 0 });
  }

  function wait(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time * 1000);
    });
  }

  // The tiles shown, in the order shown: not those of other years, nor copies fading out.
  function shown() {
    return Array.from(grid.children).filter(function (tile) {
      return !tile.hidden && !tile.classList.contains('gallery__ghost');
    });
  }

  function onScreen(box) {
    return box.bottom > 0 && box.top < window.innerHeight;
  }

  function tilesOnScreen() {
    return shown().filter(function (tile) {
      return onScreen(tile.getBoundingClientRect());
    });
  }

  /* Clips play while at least half of one is in view, unless motion is reduced. */

  const clips = Array.from(grid.querySelectorAll('video'));
  const clipWatcher = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !reduceMotion.matches && !root.classList.contains('gallery-detail-open')) {
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

  /* Photos fade in once they have loaded, instead of appearing all at once over the gray,
     and tiles below the window rise into place the first time they scroll into view, a
     row at a time from the left. Tiles in the window at the start show at once. */

  const waiting = new Set();  // tiles still to rise
  let stopWaiting = function () {};

  if (moving() && window.innerHeight > 0) {  // not in a window with no size, as when hidden
    items.forEach(function (item) {
      const photo = item.querySelector('img');
      if (photo && !photo.complete) {
        photo.style.opacity = 0;
        const fadeIn = function () {
          motion.animate(photo, { opacity: 1 }, { duration: 0.6 });
        };
        photo.addEventListener('load', fadeIn, { once: true });
        photo.addEventListener('error', fadeIn, { once: true });
      }
      if (item.getBoundingClientRect().top > window.innerHeight) {
        item.style.opacity = 0;
        item.style.transform = 'translateY(28px)';
        waiting.add(item);
      }
    });
    if (waiting.size > 0) {
      stopWaiting = motion.inView(Array.from(waiting), function (item) {
        if (!waiting.delete(item)) {
          return;  // shown already
        }
        const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        motion.animate(item, { opacity: 1, transform: 'translateY(0px)' },
          { duration: 0.7, delay: 0.08 * (shown().indexOf(item) % columns), ease: easeOut });
      }, { margin: '0px 0px -10% 0px' });
    }
  }

  // A tile still waiting to rise just shows.
  function arrived(item) {
    if (waiting.delete(item)) {
      item.style.opacity = '';
      item.style.transform = '';
    }
  }

  // Before the tiles are rearranged, all those still waiting just show.
  function allArrived() {
    Array.from(waiting).forEach(arrived);
    stopWaiting();
  }

  /* Oldest first or newest first. The button says the order a click switches to, and the
     choice is remembered for the next visit. The tiles on screen fade out, and those now
     first fall into place one after another. */

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
    try {
      localStorage.setItem(orderKey, newestFirst);
    } catch (e) {}
    if (!moving()) {
      showOrder(newestFirst);
      return;
    }

    allArrived();
    const order = newestFirst;
    const leaving = tilesOnScreen();
    const fallIn = function () {
      if (order !== newestFirst) {
        return;  // clicked again meanwhile
      }
      showOrder(newestFirst);
      const falling = tilesOnScreen();
      const fallen = leaving.filter(function (item) {
        return !falling.includes(item);
      });
      if (fallen.length > 0) {
        put(fallen, { opacity: 1 });
      }
      if (falling.length > 0) {
        falling.forEach(function (item) {
          item.style.opacity = 0;  // until its turn comes
        });
        motion.animate(falling, { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
          { duration: 0.5, delay: motion.stagger(0.03), ease: easeOut });
      }
    };
    if (leaving.length > 0) {
      motion.animate(leaving, { opacity: 0 }, { duration: 0.15 }).then(fallIn);
    } else {
      fallIn();
    }
  });

  /* Years (Travel): the row of buttons over the photos shows those of one year, or all.
     The tiles staying glide to their new places, those leaving fade out where they were,
     and those arriving fade in where they land. */

  const gliding = new Map();  // tiles gliding, with their animations

  // Shows the photos of a year ('' for all of them), at once if `still`.
  function showYear(year, still) {
    years.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.year === year));
    });
    if (still || !moving()) {
      items.forEach(function (item) {
        item.hidden = year !== '' && item.dataset.year !== year;
      });
      return;
    }

    allArrived();
    const before = new Map();
    shown().forEach(function (item) {
      before.set(item, item.getBoundingClientRect());  // where it is seen, even mid-glide
    });
    const stopped = Array.from(gliding.keys());
    gliding.forEach(function (animation, item) {
      animation.stop();
      item.style.transform = '';  // for measuring where it goes now, just below
    });
    gliding.clear();
    const gridBox = grid.getBoundingClientRect();

    items.forEach(function (item) {
      item.hidden = year !== '' && item.dataset.year !== year;
    });

    before.forEach(function (box, item) {
      if (!item.hidden || !onScreen(box)) {
        return;
      }
      const ghost = item.cloneNode(true);
      ghost.hidden = false;
      ghost.removeAttribute('tabindex');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.classList.add('gallery__ghost');
      Object.assign(ghost.style, {
        left: box.left - gridBox.left + 'px',
        top: box.top - gridBox.top + 'px',
        width: box.width + 'px',
        height: box.height + 'px',
        opacity: '',
        transform: '',
      });
      grid.appendChild(ghost);
      motion.animate(ghost, { opacity: 0, transform: 'scale(0.9)' }, { duration: 0.25, ease: 'easeIn' })
        .then(function () {
          ghost.remove();
        });
    });

    let arriving = 0;
    shown().forEach(function (item) {
      const box = item.getBoundingClientRect();
      const was = before.get(item);
      if (!onScreen(box)) {
        return;
      }
      if (was && onScreen(was)) {
        const dx = was.left - box.left;
        const dy = was.top - box.top;
        if (dx || dy) {
          gliding.set(item, motion.animate(item,
            { transform: ['translate(' + dx + 'px, ' + dy + 'px)', 'translate(0px, 0px)'] },
            spring(0.55, 0.12)));
        }
      } else {
        item.style.opacity = 0;
        motion.animate(item, { opacity: [0, 1], transform: ['scale(0.92)', 'scale(1)'] },
          { duration: 0.45, delay: 0.12 + 0.035 * arriving++, ease: easeOut });
      }
    });

    // Tiles stopped mid-glide and not gliding again go back to their places.
    const settled = stopped.filter(function (item) {
      return !gliding.has(item);
    });
    if (settled.length > 0) {
      put(settled, { transform: 'translate(0px, 0px)' });
    }
  }

  if (years) {
    years.addEventListener('click', function (event) {
      const button = event.target.closest('button');
      if (button && button.getAttribute('aria-pressed') !== 'true') {
        showYear(button.dataset.year);
      }
    });

    // Pointing at a year starts loading its photos, so they are there when its tiles land.
    const preload = function (event) {
      const button = event.target.closest('button');
      if (button && button.dataset.year) {
        items.forEach(function (item) {
          const photo = item.querySelector('img');
          if (photo && item.dataset.year === button.dataset.year) {
            photo.loading = 'eager';
          }
        });
      }
    };
    years.addEventListener('pointerover', preload);
    years.addEventListener('focusin', preload);
  }

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
    '<div class="gallery-detail__backdrop"></div>' +
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
  if (motion) {
    detail.classList.add('gallery-detail--animated');  // Motion fades it in, not the stylesheet
  }
  document.body.appendChild(detail);

  const backdrop = detail.querySelector('.gallery-detail__backdrop');
  const bar = detail.querySelector('.gallery-detail__bar');
  const info = detail.querySelector('.gallery-detail__info');
  const media = detail.querySelector('.gallery-detail__media');
  const closeButton = detail.querySelector('.gallery-detail__close');
  const previousButton = detail.querySelector('.gallery-detail__arrow--previous');
  const nextButton = detail.querySelector('.gallery-detail__arrow--next');
  const around = [bar, info, previousButton, nextButton];  // all but the photo
  let current = null;
  let photoIndex = 0;     // which of its photos: 0 for the one in its tile
  let shownMedia = null;  // the photo or clip in the full view
  let growing = null;     // its animation while it grows out of the tile
  let closing = false;
  let turn = 0;           // counts openings and closings, so a late step of an old one is dropped

  // The file names of an item's photos: the one in its tile, then any more (photos: in the
  // data file), all in the folder of its full-size file.
  function photosOf(item) {
    const full = item.dataset.full;
    const first = full.slice(full.lastIndexOf('/') + 1).replace(/\.\w+$/, '');
    return [first].concat(item.dataset.photos ? item.dataset.photos.split(' ') : []);
  }

  function folderOf(item) {
    return item.dataset.full.slice(0, item.dataset.full.lastIndexOf('/'));
  }

  // The photo or clip for an item, or another of its photos. The grid's copy of a photo
  // shows at once; the full-size one replaces it when it has loaded. A clip carries on from
  // where the grid's copy was.
  function mediaFor(item, index) {
    if (index > 0) {
      const names = photosOf(item);
      const photo = document.createElement('img');
      photo.alt = item.querySelector('h2').textContent + ', photo ' + (index + 1) + ' of ' + names.length;
      photo.src = folderOf(item) + '/small/' + names[index] + '-800.jpg';
      const full = new Image();
      full.onload = function () {
        photo.src = full.src;
      };
      full.src = folderOf(item) + '/' + names[index] + '.jpg';
      return photo;
    }
    const tileClip = item.querySelector('video');
    if (tileClip) {
      const clip = document.createElement('video');
      clip.src = item.dataset.full;
      clip.poster = tileClip.poster;
      clip.muted = true;
      clip.loop = true;
      clip.playsInline = true;
      clip.currentTime = tileClip.currentTime;
      clip.setAttribute('aria-label', tileClip.getAttribute('aria-label'));
      if (reduceMotion.matches) {
        clip.controls = true;
      } else {
        clip.autoplay = true;
      }
      return clip;
    }
    const tilePhoto = item.querySelector('img');
    const photo = document.createElement('img');
    photo.alt = tilePhoto.alt;
    photo.src = tilePhoto.currentSrc || tilePhoto.src;
    const full = new Image();
    full.onload = function () {
      photo.src = full.src;
    };
    full.src = item.dataset.full;
    return photo;
  }

  // Fills the full view with an item's text and, if it has more than one photo, a button for
  // each under the text; the photo or clip itself is placed by open().
  function show(item, index) {
    current = item;
    photoIndex = index;
    const caption = item.querySelector('figcaption');
    info.innerHTML = caption.innerHTML;
    const names = photosOf(item);
    if (names.length > 1) {
      const buttons = document.createElement('div');
      buttons.className = 'gallery-detail__photos';
      buttons.setAttribute('role', 'group');
      buttons.setAttribute('aria-label', 'Photos');
      const tileClip = item.querySelector('video');
      names.forEach(function (name, i) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + names.length);
        const thumb = document.createElement('img');
        thumb.alt = '';
        thumb.src = i === 0 && tileClip ? tileClip.poster : folderOf(item) + '/small/' + name + '-480.jpg';
        button.appendChild(thumb);
        button.addEventListener('click', function () {
          turnTo(i);
        });
        buttons.appendChild(button);
      });
      info.appendChild(buttons);
    }
    markPhoto();
    const title = caption.querySelector('h2').textContent;
    detail.setAttribute('aria-label', title);
    document.title = title + ' - ' + documentTitle;
  }

  // Marks the photo shown among its item's buttons, and hides the arrows at the very first
  // photo and the very last.
  function markPhoto() {
    info.querySelectorAll('.gallery-detail__photos button').forEach(function (button, i) {
      if (i === photoIndex) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    });
    const order = shown();
    const position = order.indexOf(current);
    previousButton.hidden = position === 0 && photoIndex === 0;
    nextButton.hidden = position === order.length - 1 && photoIndex === photosOf(current).length - 1;
  }

  // Whether a photo or clip knows its size, which a clip only does once it has started loading.
  function hasSize(element) {
    return element.tagName === 'VIDEO' ? element.videoWidth > 0 : element.naturalWidth > 0;
  }

  // Resolves once a photo or clip has its size, or after a moment, whichever is first.
  function sized(element) {
    const loaded = element.tagName === 'VIDEO'
      ? new Promise(function (resolve) {
        if (element.readyState > 0) {
          resolve();
        } else {
          element.addEventListener('loadedmetadata', resolve, { once: true });
        }
      })
      : element.decode().catch(function () {});
    return Promise.race([loaded, wait(0.3)]);
  }

  // The box an element is laid out in, leaving out any transform moving it.
  function layoutBox(element) {
    const parent = element.offsetParent.getBoundingClientRect();
    return {
      left: parent.left + element.offsetLeft,
      top: parent.top + element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  }

  // What makes the full view's photo, laid out uncropped in `box`, look just like the photo
  // in its tile: a transform to the tile photo's place and size, and a clip-path cutting it
  // down to the part in view, where the photo and the tile overlap: the tile, which crops
  // the photo around its object-position (and zooms it on hover), or on a wall the photo
  // itself, shown whole on its mat.
  function crop(item, box) {
    const tileMedia = item.querySelector('img, video');
    const seen = tileMedia.getBoundingClientRect();
    const frame = item.getBoundingClientRect();
    const tile = {
      left: Math.max(seen.left, frame.left),
      top: Math.max(seen.top, frame.top),
      right: Math.min(seen.right, frame.right),
      bottom: Math.min(seen.bottom, frame.bottom),
    };
    const position = getComputedStyle(tileMedia).objectPosition.split(' ').map(function (value) {
      return parseFloat(value) / 100;
    });
    const scale = Math.max(seen.width / box.width, seen.height / box.height);
    const left = seen.left + (seen.width - box.width * scale) * position[0];
    const top = seen.top + (seen.height - box.height * scale) * position[1];
    const insets = [
      (tile.top - top) / scale,
      box.width - (tile.right - left) / scale,
      box.height - (tile.bottom - top) / scale,
      (tile.left - left) / scale,
    ];
    return {
      transform: 'translate(' + (left - box.left) + 'px, ' + (top - box.top) + 'px) scale(' + scale + ')',
      clipPath: 'inset(' + insets.map(function (inset) {
        return inset + 'px';
      }).join(' ') + ')',
    };
  }

  // The photo grows out of its tile into the full view, uncropping as it goes, while the
  // page behind fades out and the text fades in.
  function grow(item, photo) {
    const thisTurn = ++turn;
    const dimmed = item.matches(':hover, :focus-visible');  // under the tile's dark overlay
    arrived(item);
    detail.classList.add('gallery-detail--moving', 'gallery-detail--waiting');
    detail.hidden = false;
    sized(photo).then(function () {
      if (thisTurn !== turn) {
        return;
      }
      detail.classList.remove('gallery-detail--waiting');
      closeButton.focus({ preventScroll: true });
      if (!hasSize(photo)) {  // not known in time: just fade in
        detail.classList.remove('gallery-detail--moving');
        motion.animate(detail, { opacity: [0, 1] }, { duration: 0.3 });
        return;
      }
      const from = crop(item, layoutBox(photo));
      const keyframes = {
        transform: [from.transform, 'translate(0px, 0px) scale(1)'],
        clipPath: [from.clipPath, 'inset(0px 0px 0px 0px)'],
      };
      if (dimmed) {
        keyframes.filter = ['brightness(0.45)', 'brightness(1)'];
      }
      item.style.visibility = 'hidden';
      motion.animate(backdrop, { opacity: [0, 1] }, { duration: 0.4, ease: 'easeOut' });
      motion.animate(around, { opacity: [0, 1] }, { duration: 0.35, delay: 0.15 });
      motion.animate(info, { transform: ['translateY(12px)', 'translateY(0px)'] },
        { duration: 0.6, delay: 0.15, ease: easeOut });
      growing = motion.animate(photo, keyframes, spring(0.5, 0.12));
      growing.then(function () {
        if (thisTurn !== turn) {
          return;
        }
        growing = null;
        item.style.visibility = '';
        detail.classList.remove('gallery-detail--moving');
      });
    });
  }

  // The photo shrinks back into its tile, cropping as it goes, while the page behind fades
  // back in; another of the item's photos than the tile's fades into the tile's as it goes.
  // Its animation finishes when the photo has landed.
  function shrink(item, photo) {
    if (growing) {
      growing.stop();
      growing = null;
    }
    arrived(item);
    item.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    if (!hasSize(photo) || !onScreen(item.getBoundingClientRect())) {
      return motion.animate(detail, { opacity: 0 }, { duration: 0.2 });
    }
    const to = crop(item, layoutBox(photo));
    const now = getComputedStyle(photo);
    if (photoIndex > 0) {
      item.style.visibility = '';
      motion.animate(photo, { opacity: 0 }, { duration: 0.4, ease: 'easeIn' });
    } else {
      item.style.visibility = 'hidden';
    }
    detail.classList.add('gallery-detail--moving');
    motion.animate(around, { opacity: 0 }, { duration: 0.15 });
    motion.animate(backdrop, { opacity: 0 }, { duration: 0.4, ease: 'easeInOut' });
    return motion.animate(photo, {
      transform: [now.transform === 'none' ? 'translate(0px, 0px) scale(1)' : now.transform, to.transform],
      clipPath: [now.clipPath === 'none' ? 'inset(0px 0px 0px 0px)' : now.clipPath, to.clipPath],
    }, spring(0.45, 0.05));
  }

  // The photo shown leaves to one side as the next one comes in from the other, and the
  // text follows if it changed. `direction` is 1 for the next photo, -1 for the previous.
  function slide(leaving, arriving, direction, newText) {
    if (growing) {
      growing.complete();
    }
    const box = {
      left: leaving.offsetLeft,
      top: leaving.offsetTop,
      width: leaving.offsetWidth,
      height: leaving.offsetHeight,
    };
    leaving.classList.add('gallery-detail__leaving');
    Object.assign(leaving.style, {
      left: box.left + 'px',
      top: box.top + 'px',
      width: box.width + 'px',
      height: box.height + 'px',
    });
    media.appendChild(arriving);
    motion.animate(leaving, { opacity: 0, transform: 'translateX(' + -80 * direction + 'px)' },
      { duration: 0.3, ease: 'easeIn' })
      .then(function () {
        leaving.remove();
      });
    motion.animate(arriving, { opacity: [0, 1], transform: ['translateX(' + 80 * direction + 'px)', 'translateX(0px)'] },
      spring(0.5, 0.1));
    if (newText) {
      motion.animate(info, { opacity: [0, 1], transform: ['translateX(' + 16 * direction + 'px)', 'translateX(0px)'] },
        { duration: 0.45, ease: easeOut });
    }
  }

  function linkTo(item, index) {
    return '#photo-' + (items.indexOf(item) + 1) + (index > 0 ? '-' + (index + 1) : '');
  }

  // Opens the full view on an item, at its photo `index` (0 for the one in its tile), or
  // turns to it if the view is open. A click adds a step to the browser's history, so its
  // Back button closes the view again; the arrows only change the link. `still` opens it
  // without moving anything, as for a link followed.
  function open(item, addToHistory, still, index) {
    if (closing) {
      return;
    }
    index = index || 0;
    if (item.hidden && years) {
      showYear('', true);  // a link to a photo of another year than the one picked
    }
    const before = current;
    const leaving = detail.hidden ? null : shownMedia;
    show(item, index);
    shownMedia = mediaFor(item, index);

    if (!leaving) {
      media.textContent = '';
      media.appendChild(shownMedia);
      root.classList.add('gallery-detail-open');
      clips.forEach(function (clip) {
        clip.pause();
      });
      if (moving() && !still) {
        grow(item, shownMedia);
      } else {
        detail.hidden = false;  // fading in from the stylesheet, without Motion
        closeButton.focus();
      }
    } else if (moving()) {
      const order = shown();
      slide(leaving, shownMedia, order.indexOf(item) > order.indexOf(before) ? 1 : -1, true);
    } else {
      media.textContent = '';
      media.appendChild(shownMedia);
    }

    if (addToHistory) {
      // Chrome can put the page back where it was when the view opened, a moment after Back
      // closes it, undoing close() bringing the last photo's tile into view.
      history.scrollRestoration = 'manual';
      history.pushState({ galleryDetail: true }, '', linkTo(item, index));
    } else if (location.hash !== linkTo(item, index)) {
      history.replaceState(history.state, '', linkTo(item, index));
    }
  }

  // Turns to another of the shown item's photos, its text staying.
  function turnTo(index) {
    if (index === photoIndex || closing) {
      return;
    }
    const direction = index > photoIndex ? 1 : -1;
    const leaving = shownMedia;
    photoIndex = index;
    shownMedia = mediaFor(current, index);
    if (moving()) {
      slide(leaving, shownMedia, direction, false);
    } else {
      media.textContent = '';
      media.appendChild(shownMedia);
    }
    markPhoto();
    history.replaceState(history.state, '', linkTo(current, index));
  }

  function close() {
    if (detail.hidden || closing) {
      return;
    }
    const thisTurn = ++turn;
    const item = current;
    const photo = shownMedia;
    closing = true;
    history.scrollRestoration = 'auto';  // for leaving the page and coming back

    const finish = function () {
      if (thisTurn !== turn) {
        return;
      }
      closing = false;
      detail.hidden = true;
      detail.classList.remove('gallery-detail--moving', 'gallery-detail--waiting');
      media.textContent = '';  // stops a clip
      shownMedia = null;
      if (motion) {
        put([detail, backdrop].concat(around), { opacity: 1, transform: 'none' });
      }
      item.style.visibility = '';
      root.classList.remove('gallery-detail-open');
      document.title = documentTitle;
      item.focus({ preventScroll: true });
      if (clipWatcher) {
        watchClips();
      }
    };

    if (moving() && photo && !detail.classList.contains('gallery-detail--waiting')) {
      Promise.race([shrink(item, photo), wait(1.5)]).then(finish);
    } else {
      finish();
      item.scrollIntoView({ block: 'nearest' });
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

  // The previous or next photo: the item's own while it has more, else the item before's
  // last or the item after's first.
  function step(by) {
    const index = photoIndex + by;
    if (index >= 0 && index < photosOf(current).length) {
      turnTo(index);
      return;
    }
    const order = shown();
    const next = order[order.indexOf(current) + by];
    if (next) {
      open(next, false, false, by < 0 ? photosOf(next).length - 1 : 0);
    }
  }

  // The item, and which of its photos, that a link like #photo-3 or #photo-3-2 points to.
  function linkedPhoto() {
    const match = /^#photo-(\d+)(?:-(\d+))?$/.exec(location.hash);
    const item = match && items[Number(match[1]) - 1];
    if (!item) {
      return null;
    }
    const index = match[2] ? Number(match[2]) - 1 : 0;
    return { item: item, index: index < photosOf(item).length ? index : 0 };
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
      const buttons = Array.from(detail.querySelectorAll('button')).filter(function (button) {
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
    const linked = linkedPhoto();
    if (linked) {
      open(linked.item, false, false, linked.index);
    } else {
      close();
    }
  });

  const linked = linkedPhoto();
  if (linked) {
    open(linked.item, false, true, linked.index);
  }
})();
