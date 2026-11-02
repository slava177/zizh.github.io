/* ==========================================================================
   The Trivia page (_layouts/trivia.html)
   ========================================================================== */

// The page opens as Jimmy Chin's site does (https://jimmychin.com), on a black screen with
// a name: here 一曰慈，二曰俭, "the first is compassion, the second is frugality", from
// chapter 67 of the Tao Te Ching, written with a brush stroke by stroke in two columns in
// the middle, read from the right, with the chapter beside them and a red seal under that,
// as on a hanging scroll. The ink then turns into windows onto a clip of an animal being
// fed (`clip:` in the page's front matter), and the view flies through 慈 into it. If the
// phone filming it turned, as it did on its side for the bird, the clip turns with it, so
// the picture stays upright, and grows or shrinks to fit the window the other way round.
// Last the dark closes in on the lines of the page's text, like a censor's bars, which
// then slide off them.
//
// The characters are glyphs of the brush font Ma Shan Zheng (assets/js/calligraphy.js),
// drawn on a canvas. Each bit of a character's ink shows once a brush, moving along the
// middle line of a stroke, has passed it: the first brush to cover it, where strokes cross
// or meet, or else the one whose line it is nearest.
//
// A click, a tap or a key skips to the page. When the system asks for reduced motion the
// characters show for a moment, already written, without the clip. Without JavaScript the
// opening doesn't show.

(function () {
  'use strict';

  const intro = document.querySelector('.trivia-intro');
  if (!intro) {
    return;
  }
  const font = window.Calligraphy;
  const canvas = intro.querySelector('.trivia-intro__ink');
  const ctx = canvas.getContext && canvas.getContext('2d');
  const clip = intro.querySelector('.trivia-intro__clip');
  const text = document.querySelector('.trivia__text');
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Missing what it needs, or so late that the stylesheet is fading the opening away by
  // itself, in case this script never came: just the page. (Should anything here fail
  // before the end of this script, the stylesheet fades it away as well.)
  if (!font || !ctx || !text || performance.now() > 4500) {
    intro.remove();
    return;
  }

  const WRITTEN = ['一曰慈', '二曰俭'];  // its columns, from the right
  const CHAPTER = '《道德经》第六十七章';
  const SEAL = '李耳';  // Laozi's own name, the chapter's author
  const INK = [243, 238, 227];
  const RED = '#c33b2c';

  // Where the view flies into the clip, in the font's units: in 慈's long stroke across, a
  // little left of the middle, where the animal is as each clip starts.
  const DOOR = { x: 430, y: 612 };

  // The clip's settings, from _data/trivia.yml: when the dark closes in, in seconds into it,
  // and if the phone filming it turned, how far it had turned at each tenth of a second,
  // clockwise in degrees: the clip turns as much, the same way.
  const CLIP_END = Number(intro.dataset.end) || 9;
  const ROLL = (intro.dataset.roll || '').split(' ').filter(Boolean).map(Number);

  // Timing of the writing, in seconds.
  const BRUSH_SPEED = 4080;  // font units a second along a stroke
  const STROKE_GAP = 0.033;
  const CHARACTER_GAP = 0.18;
  const COLUMN_GAP = 0.33;
  const SOFT = 0.018;        // how long a bit of ink takes to darken fully
  const SPREAD = 0.00083;    // and how much later the edges of a stroke come, a second a unit

  const easeInOut = function (p) {
    return (1 - Math.cos(Math.PI * p)) / 2;
  };
  const easeOut = function (p) {
    return 1 - Math.pow(1 - p, 3);
  };
  const clamp = function (p) {
    return p < 0 ? 0 : p > 1 ? 1 : p;
  };

  function wait(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time * 1000);
    });
  }

  let finished = false;

  // Calls step(p) every frame for `time` seconds, with p going from 0 to 1 by `ease`.
  function tween(time, ease, step) {
    return new Promise(function (resolve) {
      const start = performance.now();
      requestAnimationFrame(function frame(now) {
        if (finished) {
          resolve();
          return;
        }
        const p = clamp((now - start) / (time * 1000));
        step(ease(p));
        if (p < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      });
    });
  }

  // A stroke's middle line, with the length along it to each point.
  function line(points) {
    const at = [0];
    for (let i = 1; i < points.length; i++) {
      at.push(at[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
    return { points: points, at: at, length: at[at.length - 1] };
  }

  /* When each stroke is written, from the start of the writing */

  let clock = 0.45;  // a moment of black first
  const written = [];
  WRITTEN.forEach(function (characters, column) {
    if (column) {
      clock += COLUMN_GAP - CHARACTER_GAP;
    }
    characters.split('').forEach(function (ch, row) {
      const strokes = font.strokes[ch].map(function (points) {
        const middle = line(points);
        const stroke = { line: middle, start: clock, time: 0.058 + middle.length / BRUSH_SPEED };
        clock += stroke.time + STROKE_GAP;
        return stroke;
      });
      clock += CHARACTER_GAP - STROKE_GAP;
      written.push({ ch: ch, column: column, row: row, path: new Path2D(font.glyphs[ch]), box: font.boxes[ch], strokes: strokes });
    });
  });
  const CHAPTER_START = clock + 0.05;
  const SEAL_START = CHAPTER_START + 0.07 * CHAPTER.length + 0.3;
  const WRITTEN_END = SEAL_START + 0.4;

  const chapter = CHAPTER.split('').map(function (ch) {
    return { ch: ch, path: new Path2D(font.glyphs[ch]), box: font.boxes[ch], turned: ch === '《' || ch === '》' };
  });
  const sealGlyphs = SEAL.split('').map(function (ch) {
    return { path: new Path2D(font.glyphs[ch]), box: font.boxes[ch] };
  });

  // The way into the clip: how far it is from DOOR to the edge of 慈, in font units.
  const door = (function () {
    const probe = document.createElement('canvas').getContext('2d');
    const path = written[2].path;
    let room = Infinity;
    for (let a = 0; a < 360; a += 10) {
      const dx = Math.cos(a * Math.PI / 180);
      const dy = Math.sin(a * Math.PI / 180);
      let d = 0;
      while (d < 300 && probe.isPointInPath(path, DOOR.x + dx * d, DOOR.y + dy * d)) {
        d += 2;
      }
      room = Math.min(room, d);
    }
    return { x: DOOR.x, y: DOOR.y, room: room || 20 };
  })();

  /* Where everything goes: the characters in two columns in the middle, a little right of
     it, in rows as tall as their taller character, the chapter in small ones to their left
     and the seal under the chapter. Sizes in CSS px. */

  let dpr = 1;
  let width = 0;
  let height = 0;
  let size = 0;     // a character's em
  let clipFit = { width: 0, height: 0, turned: 1 };
  let seal = null;  // its canvas and place

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = intro.clientWidth;
    height = intro.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    size = Math.min(height * 0.31, width * 0.36, 340);

    const k = size / 1000;
    const gap = 200;  // between characters, in font units
    const rows = [];  // how tall each row is, in font units
    written.forEach(function (character) {
      rows[character.row] = Math.max(rows[character.row] || 0, character.box[3] - character.box[1]);
    });
    const column = rows.reduce(function (sum, row) {
      return sum + gap + row;
    }, -gap);
    const columnTop = (height - column * k) / 2 - 0.015 * height;
    let top = columnTop;
    const rowTops = rows.map(function (row) {
      const at = top;
      top += (row + gap) * k;
      return at;
    });
    const pitch = 1.2 * size;                // from one column's middle to the next's
    const middle = width / 2 + 0.16 * size;  // between the two
    written.forEach(function (character) {
      const ink = character.box[3] - character.box[1];
      character.k = k;
      character.x = middle + (0.5 - character.column) * pitch - 500 * k;  // the em's left edge
      character.baseline = rowTops[character.row] + ((rows[character.row] - ink) / 2 + character.box[3]) * k;
    });

    // The chapter, from below the top of the columns, left of the last; brackets take about
    // half a cell.
    const small = 0.14 * size;
    let y = columnTop + 0.5 * size;
    const x = middle - pitch / 2 - 0.68 * size;
    chapter.forEach(function (glyph) {
      const cell = (glyph.turned ? 0.55 : 0.93) * small;
      glyph.k = small / 1000;
      glyph.x = x;
      glyph.y = y + cell / 2;
      y += cell;
    });

    seal = makeSeal(0.135 * size, 0.25 * size);
    seal.x = x;
    seal.y = y + 0.08 * size + seal.height / 2;

    written.forEach(rasterize);
    fitClip();
  }

  // The clip as large as fits upright, and how much larger (or smaller) once on its side.
  function fitClip() {
    const aspect = clip.videoWidth ? clip.videoWidth / clip.videoHeight : 9 / 16;
    clipFit.width = Math.min(width, height * aspect);
    clipFit.height = clipFit.width / aspect;
    clipFit.turned = Math.min(width / clipFit.height, height / clipFit.width);
    clip.style.width = clipFit.width + 'px';
    clip.style.height = clipFit.height + 'px';
  }

  // Draws a glyph from font units: written characters by their em, the others centered on
  // their ink at (x, y), and the brackets turned a quarter clockwise, as in a column.
  function place(glyph) {
    const k = glyph.k;
    if (glyph.baseline !== undefined) {
      ctx.transform(k, 0, 0, -k, glyph.x, glyph.baseline);
      return;
    }
    const cx = (glyph.box[0] + glyph.box[2]) / 2;
    const cy = (glyph.box[1] + glyph.box[3]) / 2;
    if (glyph.turned) {
      ctx.transform(0, k, k, 0, glyph.x - k * cy, glyph.y - k * cx);
    } else {
      ctx.transform(k, 0, 0, -k, glyph.x - k * cx, glyph.y + k * cy);
    }
  }

  /* The writing. Each character's ink is a picture the size of its em, in device pixels;
     for each of its pixels, the time it darkens: when a brush passes it (slow off the mark
     and into the end, like a hand), a little later toward the edges of the stroke, as ink
     spreads. At each point of a stroke's middle line its brush is as wide as the ink there
     lets a round one be, and a pixel darkens with the first brush to cover it, so that a
     stroke doesn't cut into one written before it where they cross or meet; or, covered by
     none, with the brush of the stroke whose line it is nearest. */

  function rasterize(character) {
    const scale = character.k * dpr;
    const left = Math.floor(character.x * dpr);
    const top = Math.floor((character.baseline - 880 * character.k) * dpr);
    const w = Math.ceil(1000 * scale) + 2;
    const h = w;
    const ox = character.x * dpr - left;  // where the font's origin is in the picture
    const oy = character.baseline * dpr - top;
    const picture = character.canvas || document.createElement('canvas');
    picture.width = w;
    picture.height = h;
    const pen = picture.getContext('2d', { willReadFrequently: true });
    pen.setTransform(scale, 0, 0, -scale, ox, oy);
    pen.fill(character.path);
    const image = pen.getImageData(0, 0, w, h);
    const data = image.data;
    const room = inside(data, w, h);

    const offsets = [];
    const alphas = [];
    const times = [];
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const o = (j * w + i) * 4;
        const alpha = data[o + 3];
        if (!alpha) {
          continue;
        }
        const fx = (i + 0.5 - ox) / scale;
        const fy = (oy - j - 0.5) / scale;
        let first = Infinity;  // when the first brush to cover it passes
        let nearest = Infinity;
        let near = 0;          // and when the nearest one does
        character.strokes.forEach(function (s) {
          // The nearest point of the stroke's line, and how far along the line it is.
          const p = s.line.points;
          let best = Infinity;
          let along = 0;
          let x = 0;
          let y = 0;
          for (let n = 1; n < p.length; n++) {
            const ax = p[n - 1][0];
            const ay = p[n - 1][1];
            const dx = p[n][0] - ax;
            const dy = p[n][1] - ay;
            const t = clamp(((fx - ax) * dx + (fy - ay) * dy) / (dx * dx + dy * dy));
            const ex = fx - ax - t * dx;
            const ey = fy - ay - t * dy;
            const d = ex * ex + ey * ey;
            if (d < best) {
              best = d;
              along = s.line.at[n - 1] + t * Math.sqrt(dx * dx + dy * dy);
              x = ax + t * dx;
              y = ay + t * dy;
            }
          }
          const d = Math.sqrt(best);
          const brush = room[Math.round(oy - y * scale - 0.5) * w + Math.round(x * scale + ox - 0.5)] || 0;
          const covers = d * scale <= brush + 1.5;  // and the edge's half-covered pixels
          if (covers || d < nearest) {
            const passes = s.start + s.time * Math.acos(1 - 2 * clamp(along / s.line.length)) / Math.PI + SPREAD * d;
            if (covers) {
              first = Math.min(first, passes);
            }
            if (d < nearest) {
              nearest = d;
              near = passes;
            }
          }
        });
        offsets.push(o);
        alphas.push(alpha);
        times.push(first < Infinity ? first : near);
        data[o] = INK[0];
        data[o + 1] = INK[1];
        data[o + 2] = INK[2];
        data[o + 3] = 0;
      }
    }
    character.canvas = picture;
    character.pen = pen;
    character.image = image;
    character.left = left;
    character.top = top;
    character.offsets = Int32Array.from(offsets);
    character.alphas = Uint8Array.from(alphas);
    character.times = Float32Array.from(times);
    character.from = character.strokes[0].start;
    character.shown = -1;  // how far into the writing its picture was last drawn
  }

  // For each pixel of a picture, how far it is from the nearest one less than half inked,
  // in pixels: how far a round brush centered there reaches, keeping to the ink. Counted
  // in steps of 1 and √2, near enough; the picture's edge is clear.
  function inside(data, w, h) {
    const room = new Float32Array(w * h);
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const n = j * w + i;
        if (data[n * 4 + 3] >= 128) {
          room[n] = Math.min(room[n - 1] + 1, room[n - w] + 1, room[n - w - 1] + Math.SQRT2, room[n - w + 1] + Math.SQRT2);
        }
      }
    }
    for (let j = h - 2; j > 0; j--) {
      for (let i = w - 2; i > 0; i--) {
        const n = j * w + i;
        if (room[n]) {
          room[n] = Math.min(room[n], room[n + 1] + 1, room[n + w] + 1, room[n + w + 1] + Math.SQRT2, room[n + w - 1] + Math.SQRT2);
        }
      }
    }
    return room;
  }

  // Brings a character's picture to `t` seconds into the writing.
  function ink(character, t) {
    const until = character.strokes[character.strokes.length - 1].start + 2;
    if (t < character.from || character.shown >= until || character.shown === t) {
      return;
    }
    const data = character.image.data;
    const times = character.times;
    const alphas = character.alphas;
    const offsets = character.offsets;
    for (let n = 0; n < offsets.length; n++) {
      const p = (t - times[n]) / SOFT;
      data[offsets[n] + 3] = p >= 1 ? alphas[n] : p <= 0 ? 0 : p * alphas[n];
    }
    character.pen.putImageData(character.image, 0, 0);
    character.shown = Math.min(t, until);
  }

  // The seal: a red stone, a little worn, with 李耳 cut into it, one above the other.
  function makeSeal(w, h) {
    const W = Math.ceil(w * dpr);
    const H = Math.ceil(h * dpr);
    const stone = document.createElement('canvas');
    stone.width = W;
    stone.height = H;
    const g = stone.getContext('2d');
    let seed = 67;
    const random = function () {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const rough = 0.035 * W;
    const corners = [[0, 0], [W, 0], [W, H], [0, H]];
    g.beginPath();
    corners.forEach(function (from, i) {
      const to = corners[(i + 1) % 4];
      const steps = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / (2 * dpr));
      for (let n = 0; n < steps; n++) {
        const x = from[0] + (to[0] - from[0]) * n / steps;
        const y = from[1] + (to[1] - from[1]) * n / steps;
        g.lineTo(x + (random() - 0.5) * rough, y + (random() - 0.5) * rough);
      }
    });
    g.closePath();
    g.fillStyle = RED;
    g.fill();

    g.globalCompositeOperation = 'destination-out';
    // Each character fills its half, stretched a little at most, as on a seal.
    const margin = 0.14 * W;
    const cellWidth = W - 2 * margin;
    const cellHeight = H / 2 - 1.5 * margin;
    sealGlyphs.forEach(function (glyph, i) {
      const box = glyph.box;
      const fitX = cellWidth / (box[2] - box[0]);
      const fitY = cellHeight / (box[3] - box[1]);
      const sx = Math.min(fitX, 1.2 * fitY);
      const sy = Math.min(fitY, 1.2 * fitX);
      const left = margin + (cellWidth - sx * (box[2] - box[0])) / 2;
      const top = (i === 0 ? margin : H / 2 + 0.5 * margin) + (cellHeight - sy * (box[3] - box[1])) / 2;
      g.setTransform(sx, 0, 0, -sy, left - sx * box[0], top + sy * box[3]);
      g.fill(glyph.path);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (let n = 0; n < 18; n++) {
      g.beginPath();
      g.arc(random() * W, random() * H, (0.15 + random() * 0.6) * 0.03 * W, 0, 2 * Math.PI);
      g.fill();
    }
    return { canvas: stone, width: w, height: h };
  }

  /* Drawing, every frame while the canvas shows */

  const state = {
    start: 0,     // when the writing started (performance.now())
    still: false, // everything written at once
    ink: 1,       // how much the ink shows, fading as it turns into windows
    labels: 1,    // the chapter and the seal, the same
    windows: false,
    zoom: 0,      // from 0 to 1, flying through 慈
  };
  let drawing = 0;

  function draw(now) {
    drawing = requestAnimationFrame(draw);
    const t = state.still ? Infinity : (now - state.start) / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // The view flies toward DOOR, faster and faster, until the window covers everything:
    // scaled by `zoom` about (px, py).
    const character = written[2];
    const px = (character.x + door.x * character.k) * dpr;
    const py = (character.baseline - door.y * character.k) * dpr;
    const far = Math.max(Math.hypot(px, py), Math.hypot(canvas.width - px, py),
      Math.hypot(px, canvas.height - py), Math.hypot(canvas.width - px, canvas.height - py));
    const zoom = Math.pow(1.15 * far / (door.room * character.k * dpr), state.zoom * state.zoom);
    const zoomed = [zoom, 0, 0, zoom, px * (1 - zoom), py * (1 - zoom)];

    if (state.windows) {
      ctx.globalCompositeOperation = 'destination-out';
      written.forEach(function (glyph) {
        ctx.setTransform.apply(ctx, zoomed);
        ctx.scale(dpr, dpr);
        place(glyph);
        ctx.fill(glyph.path);
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    if (state.ink > 0) {
      ctx.setTransform.apply(ctx, zoomed);
      ctx.globalAlpha = state.ink;
      written.forEach(function (character) {
        if (t >= character.from) {
          ink(character, t);
          ctx.drawImage(character.canvas, character.left, character.top);
        }
      });
    }

    if (state.labels > 0) {
      ctx.fillStyle = 'rgb(' + INK.join(',') + ')';
      chapter.forEach(function (glyph, n) {
        const p = clamp((t - CHAPTER_START - 0.07 * n) / 0.21);
        if (p <= 0) {
          return;
        }
        ctx.globalAlpha = 0.92 * state.labels * easeOut(p);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        place(glyph);
        if (p < 1 && !glyph.turned) {  // wiped on from the top
          ctx.save();
          ctx.beginPath();
          const box = glyph.box;
          ctx.rect(box[0], box[3] - p * (box[3] - box[1]), box[2] - box[0], p * (box[3] - box[1]));
          ctx.clip();
          ctx.fill(glyph.path);
          ctx.restore();
        } else {
          ctx.fill(glyph.path);
        }
      });

      const p = clamp((t - SEAL_START) / 0.35);
      if (p > 0) {
        const s = 1 + 0.3 * (1 - easeOut(p));  // pressed down onto the paper
        ctx.globalAlpha = state.labels * clamp(p * 2.5);
        ctx.setTransform(dpr * s, 0, 0, dpr * s, seal.x * dpr, seal.y * dpr);
        ctx.drawImage(seal.canvas, -seal.width / 2, -seal.height / 2, seal.width, seal.height);
      }
    }
  }

  /* The clip turning with the phone */

  let following = false;

  function turnClip(time) {
    const at = Math.min(Math.max(time * 10, 0), ROLL.length - 1);
    const i = Math.floor(at);
    const j = Math.min(i + 1, ROLL.length - 1);
    const angle = ROLL[i] + (ROLL[j] - ROLL[i]) * (at - i);
    const side = Math.pow(Math.sin(angle * Math.PI / 180), 2);
    const scale = 1 + (clipFit.turned - 1) * side;
    clip.style.transform = 'translate(-50%, -50%) rotate(' + angle.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')';
  }

  function follow() {
    if (!ROLL.length) {
      return;  // a clip that stays as it is
    }
    following = true;
    if ('requestVideoFrameCallback' in clip) {
      clip.requestVideoFrameCallback(function frame(now, shown) {
        if (following) {
          turnClip(shown.mediaTime);
          clip.requestVideoFrameCallback(frame);
        }
      });
    } else {
      requestAnimationFrame(function frame() {
        if (following) {
          turnClip(clip.currentTime);
          requestAnimationFrame(frame);
        }
      });
    }
  }

  // Resolves with whether the clip can play, waiting for it up to `time` seconds.
  function clipReady(time) {
    if (clip.readyState >= 3) {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve) {
      const done = function () {
        clip.removeEventListener('canplay', done);
        clearTimeout(timer);
        resolve(clip.readyState >= 3);
      };
      const timer = setTimeout(done, time * 1000);
      clip.addEventListener('canplay', done);
    });
  }

  // Resolves when the clip reaches `time`, or has been stuck for a few seconds.
  function clipAt(time) {
    return new Promise(function (resolve) {
      let last = -1;
      let stuck = 0;
      (function check() {
        if (finished || clip.ended || clip.currentTime >= time || stuck > 40) {
          resolve();
          return;
        }
        stuck = clip.currentTime === last ? stuck + 1 : 0;
        last = clip.currentTime;
        setTimeout(check, 100);
      })();
    });
  }

  /* The end: the dark closes in on the lines of the page's text, and the bars slide off. */

  let bars = [];

  // The box of each line of the page's text, the name under the quotation too, in the window.
  function lines() {
    const range = document.createRange();
    const boxes = [];
    text.querySelectorAll('p, footer').forEach(function (block) {
      range.selectNodeContents(block);
      Array.from(range.getClientRects()).forEach(function (r) {
        if (r.width < 1) {
          return;
        }
        const same = boxes.find(function (box) {
          return Math.abs(box.top - r.top) < r.height / 2;
        });
        if (same) {
          same.left = Math.min(same.left, r.left);
          same.right = Math.max(same.right, r.right);
          same.bottom = Math.max(same.bottom, r.bottom);
        } else {
          boxes.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
        }
      });
    });
    return boxes;
  }

  async function declassify() {
    const color = getComputedStyle(root).getPropertyValue('--strong').trim() || '#111';
    bars = lines().map(function (box) {
      const bar = document.createElement('div');
      bar.className = 'trivia-bar';
      bar.setAttribute('aria-hidden', 'true');
      const left = box.left - 4;
      const top = box.top + 1;
      const w = box.right - box.left + 8;
      const h = box.bottom - box.top - 2;
      Object.assign(bar.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
      // At first each covers the whole window, all black, as the opening did.
      bar.cover = 'translate(' + -left + 'px, ' + -top + 'px) scale(' + width / w + ', ' + height / h + ')';
      bar.style.transform = bar.cover;
      bar.style.backgroundColor = '#000';
      document.body.appendChild(bar);
      return bar;
    });
    intro.remove();
    root.classList.remove('trivia-intro-open');
    await Promise.all(bars.map(function (bar, i) {
      return bar.animate([
        { transform: bar.cover, backgroundColor: '#000' },
        { transform: 'none', backgroundColor: color },
      ], { duration: 950, delay: 60 * i, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' }).finished;
    }));
    await wait(0.4);
    if (finished) {
      return;
    }
    await Promise.all(bars.map(function (bar, i) {
      bar.style.transformOrigin = '100% 50%';
      return bar.animate([{ transform: 'none' }, { transform: 'scaleX(0)' }],
        { duration: 520, delay: 170 * i, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }).finished;
    }));
  }

  /* The opening, from start to end */

  function finish(fade) {
    if (finished) {
      return;
    }
    finished = true;
    following = false;
    cancelAnimationFrame(drawing);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPointer);
    root.classList.remove('trivia-intro-open');
    const leaving = [intro].concat(bars).filter(function (element) {
      return element.isConnected;
    });
    const remove = function () {
      leaving.forEach(function (element) {
        element.remove();
      });
    };
    if (fade && leaving.length) {
      leaving.forEach(function (element) {
        element.style.pointerEvents = 'none';
      });
      Promise.all(leaving.map(function (element) {
        return element.animate([{ opacity: getComputedStyle(element).opacity }, { opacity: 0 }],
          { duration: 450, easing: 'ease-out', fill: 'forwards' }).finished;
      })).then(remove, remove);
    } else {
      remove();
    }
  }

  function onKey(event) {
    if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
      finish(true);
    }
  }

  function onPointer() {
    finish(true);
  }

  async function play() {
    // Start loading the clip now: muted, it may play, and playing it a moment makes every
    // browser fetch it.
    let rolling = false;
    clip.preload = 'auto';
    const warm = clip.play();
    if (warm) {
      warm.then(function () {
        if (!rolling) {
          clip.pause();
          clip.currentTime = 0;
        }
      }, function () {});
    }

    state.start = performance.now();
    drawing = requestAnimationFrame(draw);
    await wait(WRITTEN_END + 0.7);
    if (finished) {
      return;
    }

    // The ink turns into windows onto the clip, and the view flies through 慈.
    const ready = await clipReady(3);
    rolling = ready;
    if (ready) {
      clip.currentTime = 0;
      try {
        await clip.play();
      } catch (e) {
        rolling = false;
      }
    }
    if (finished) {
      return;
    }
    if (rolling) {
      follow();
      state.windows = true;
      tween(0.5, easeOut, function (p) {
        state.labels = 1 - p;
      });
      tween(0.9, easeInOut, function (p) {
        state.ink = 1 - p;
      });
      await wait(0.45);
      await tween(1.4, function (p) {
        return p;
      }, function (p) {
        state.zoom = p;
      });
      if (finished) {
        return;
      }
      cancelAnimationFrame(drawing);
      canvas.hidden = true;
      await clipAt(CLIP_END);
      if (finished) {
        return;
      }
      await clip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }).finished;
    } else {
      // No clip (as on a phone saving power): the ink just fades.
      await tween(0.8, easeInOut, function (p) {
        state.ink = 1 - p;
        state.labels = 1 - p;
      });
    }
    if (finished) {
      return;
    }
    following = false;
    cancelAnimationFrame(drawing);
    await declassify();
    finish(false);
  }

  try {
    layout();
  } catch (e) {
    intro.remove();
    return;
  }
  intro.classList.add('trivia-intro--on');  // the stylesheet no longer fades it away
  root.classList.add('trivia-intro-open');
  window.addEventListener('resize', function () {
    if (!finished) {
      try {
        layout();
      } catch (e) {
        finish(true);
      }
    }
  });
  clip.addEventListener('loadedmetadata', function () {
    if (!finished) {
      fitClip();
    }
  });
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', onPointer);
  window.addEventListener('pagehide', function () {
    finish(false);
  });

  if (reduceMotion) {
    state.still = true;
    drawing = requestAnimationFrame(draw);
    wait(2.6).then(function () {
      finish(true);
    });
  } else {
    play().catch(function () {
      finish(true);
    });
  }
})();
