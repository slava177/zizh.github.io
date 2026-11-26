/* ==========================================================================
   The Trivia page (_layouts/trivia.html)
   ========================================================================== */

// The page opens as Jimmy Chin's site does (https://jimmychin.com), on a black screen with
// a name, written with a brush stroke by stroke in columns in the middle, read from the
// right, with the chapter it comes from beside them and a red seal under that, as on a
// hanging scroll. On a screen taller than it is wide, as a phone's, it is 一曰慈，二曰俭,
// "the first is compassion, the second is frugality", from chapter 67 of the Tao Te Ching,
// in two columns; on a wider one, as a laptop's, 不行而知，不见而明，不为而成, "knows
// without going, sees clearly without looking, achieves without doing", from chapter 47, in
// three. The ink then turns into windows onto a clip of an animal being fed, one for each
// shape of screen (`clips:` in the page's front matter), and the view flies into it through
// a character next to the middle of the window, 曰 or 而. If the phone filming it turned,
// the clip turns with it, so the picture stays upright, and grows or shrinks to fit the
// window the other way round. Last the dark closes in on the lines of the page's text, like
// a censor's bars, which then slide off them; on the Chinese page, whose text is a poem, the
// dark pales into fog instead, which a long wind clears as the poem condenses out of it.
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
  const text = document.querySelector('.trivia__text');
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Turning to the page in the other language (_pages/zh/trivia.md for this one, and
     back) through the key under Trivia in the menu, made of the word's strokes
     (assets/js/strokes.js, which tells of it with the event "pageturn"). Each way has its
     weather from the poem, 青玉案. To the poem, mist drifts in over the English lines,
     which dissolve into it, until the page is all fog; the poem's page opens in that fog,
     and a long wind from the left tears it away in streaks while the poem condenses out of
     the clear air, line by line (长风破雾云烟幻). Back to English, a tide runs up the page
     and washes the poem out (浪拍岸); the English page opens deep in it, and as it draws
     back down it leaves the English lines behind, top line first.

     The page turned to knows from sessionStorage ("trivia-turned", its own address), which
     the script in _layouts/trivia.html reads before anything shows, and skips its opening;
     while it is still arriving it says so on <html> (data-arriving), for the key's script,
     which waits for it. The fog is drawn on a small canvas stretched over the window,
     which softens it; the tide is drawn sharp. Their colors are --fog and --tide
     (_sass/_base.scss). Meanwhile each character of the text moves by itself, in a span
     of its own, and is put back as it was after. */

  const chinese = /^zh/.test(root.lang);
  let cover = null;    // what covers the page as it turns: its canvas, and how to put the text back
  let leaving = null;  // the way out, once begun

  // From 0 to 1, slow at both ends
  function sway(p) {
    return (1 - Math.cos(Math.PI * Math.min(Math.max(p, 0), 1))) / 2;
  }

  // Calls step(t) every frame, with the time in ms since the first of them, until step
  // returns false or stopped() is true. The time starts when the first frame is drawn, not
  // before, as a page just opened may take a while to draw it; the characters' own moves
  // (`moves`, animations) start with it.
  function frames(step, stopped, moves) {
    return new Promise(function (resolve) {
      let start = -1;
      requestAnimationFrame(function frame(now) {
        if (start < 0) {
          start = now;
          (moves || []).forEach(function (move) {
            move.startTime = now;
          });
        }
        if ((stopped && stopped()) || step(now - start) === false) {
          resolve();
          return;
        }
        requestAnimationFrame(frame);
      });
    });
  }

  // A color from the stylesheet's custom property, as [r, g, b], or `fallback`
  function color(name, fallback) {
    const hex = getComputedStyle(root).getPropertyValue(name).trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return [0, 2, 4].map(function (i) {
        return parseInt(hex.slice(i, i + 2), 16);
      });
    }
    return fallback;
  }

  function mix(a, b, t) {
    return a.map(function (v, i) {
      return Math.round(v + (b[i] - v) * t);
    });
  }

  function rgba(c, alpha) {
    return 'rgba(' + c.join(',') + ',' + alpha + ')';
  }

  // Smooth noise from 0 to 1, the same every time, and three octaves of it, for clouds
  const PERM = new Uint8Array(512);
  (function () {
    let seed = 11;
    for (let i = 0; i < 256; i++) {
      PERM[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      const swap = PERM[i];
      PERM[i] = PERM[j];
      PERM[j] = swap;
    }
    PERM.copyWithin(256, 0, 256);
  })();

  function noise(x, y) {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const u = x - i;
    const v = y - j;
    const su = u * u * (3 - 2 * u);
    const sv = v * v * (3 - 2 * v);
    const a = PERM[PERM[i & 255] + (j & 255)];
    const b = PERM[PERM[(i + 1) & 255] + (j & 255)];
    const c = PERM[PERM[i & 255] + ((j + 1) & 255)];
    const d = PERM[PERM[(i + 1) & 255] + ((j + 1) & 255)];
    return (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv) / 255;
  }

  function clouds(x, y) {
    return 0.55 * noise(x, y) + 0.3 * noise(2.1 * x + 13.7, 2.1 * y + 5.3) + 0.15 * noise(4.3 * x + 31.1, 4.3 * y + 17.9);
  }

  // Puts each character of the text, but not its spaces, in a span of its own, which
  // doesn't change where the lines break, and returns them, each with its middle in the
  // window, its line (from the top, 0 first) and its place in the line. Begins the cover,
  // with how to put the text back.
  function spell() {
    const before = text.innerHTML;
    cover = {
      canvas: null,
      restore: function () {
        text.innerHTML = before;
      },
    };
    const nodes = [];
    const walk = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      nodes.push(walk.currentNode);
    }
    const spans = [];
    nodes.forEach(function (node) {
      if (!node.data.trim()) {
        return;
      }
      const parts = document.createDocumentFragment();
      node.data.split(/(\s+)/).forEach(function (run) {
        if (/^\s*$/.test(run)) {
          parts.appendChild(document.createTextNode(run));
          return;
        }
        Array.from(run).forEach(function (ch) {
          const span = document.createElement('span');
          span.className = 'trivia-char';
          span.textContent = ch;
          parts.appendChild(span);
          spans.push(span);
        });
      });
      node.parentNode.replaceChild(parts, node);
    });
    const lines = [];
    return spans.map(function (span) {
      const box = span.getBoundingClientRect();
      let line = lines.length - 1;
      if (line < 0 || Math.abs(lines[line].top - box.top) > box.height / 2) {
        lines.push({ top: box.top, count: 0 });
        line += 1;
      }
      return { span: span, x: box.left + box.width / 2, y: box.top + box.height / 2, line: line, place: lines[line].count++ };
    });
  }

  // A canvas over the window, under the menu, or over it too (over): a pixel to every
  // `cell` CSS px, or to each of the screen's own.
  function lay(over, cell) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = cell ? 1 / cell : Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.className = 'trivia-cover' + (over ? ' trivia-cover--over' : '');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.ceil(width * scale) + 1;
    canvas.height = Math.ceil(height * scale) + 1;
    canvas.style.width = canvas.width / scale + 'px';
    canvas.style.height = canvas.height / scale + 'px';
    document.body.appendChild(canvas);
    cover.canvas = canvas;
    return { canvas: canvas, pen: canvas.getContext('2d'), width: width, height: height, scale: scale };
  }

  /* The fog */

  function makeFog(over) {
    const layer = lay(over, Math.max(5, Math.sqrt(window.innerWidth * window.innerHeight / 16000)));
    const bg = color('--bg', [255, 255, 255]);
    layer.fog = color('--fog', mix(bg, [128, 132, 140], 0.1));
    layer.lift = layer.fog.map(function (v, i) {  // how a cloud's shade moves the color, from the page's
      return 1.5 * (v - bg[i]);
    });
    layer.image = layer.pen.createImageData(layer.canvas.width, layer.canvas.height);
    return layer;
  }

  // Paints the fog: at each point, field(x, y, out) sets how thick it is (out[0], from 0 to
  // 1) and its shade (out[1], from -1 to 1, 0 being --fog itself, below about -0.65 the
  // page's own color); `dark`, from 0 to 1, turns it toward black.
  function paintFog(layer, field, dark) {
    const data = layer.image.data;
    const w = layer.canvas.width;
    const h = layer.canvas.height;
    const cell = 1 / layer.scale;
    const light = 1 - (dark || 0);
    const out = [0, 0];
    for (let j = 0; j < h; j++) {
      const y = (j + 0.5) * cell;
      for (let i = 0; i < w; i++) {
        field((i + 0.5) * cell, y, out);
        const shade = out[1] < -0.65 ? -0.65 : out[1];
        const o = (j * w + i) * 4;
        data[o] = light * (layer.fog[0] + shade * layer.lift[0]);
        data[o + 1] = light * (layer.fog[1] + shade * layer.lift[1]);
        data[o + 2] = light * (layer.fog[2] + shade * layer.lift[2]);
        data[o + 3] = 255 * out[0];
      }
    }
    layer.pen.putImageData(layer.image, 0, 0);
  }

  // Leaving the English page for the poem's: mist blown in from the left in patches,
  // thicker and thicker, and each letter dissolving into it as it comes, carried off a
  // little on the wind, until the page is all fog, even. Resolves then.
  function fogIn() {
    const TIME = 1100;
    const chars = spell();
    const layer = makeFog(false);
    const cloud = function (x, y, p) {
      return clouds(x / 300 - 0.6 * p, y / 220);
    };
    // How far the mist has come at p, from 0 to 1 of the way: thick where its cloud is
    // more than 1 - reach(p), half thick at 0.15 less.
    const reach = function (p) {
      return -0.15 + 1.6 * Math.pow(p, 1.4);
    };
    const moves = chars.map(function (ch) {
      const p = Math.pow(Math.min(Math.max((1.3 - cloud(ch.x, ch.y, 0.5)) / 1.6, 0), 1), 1 / 1.4);
      return ch.span.animate([
        { opacity: 1, filter: 'blur(0px)', left: '0px' },
        { opacity: 0, filter: 'blur(4px)', left: '12px' },
      ], { duration: 520, delay: Math.max(0, p * TIME - 260), easing: 'ease-in', fill: 'forwards' });
    });
    return frames(function (t) {
      const p = Math.min(t / TIME, 1);
      const r = reach(p);
      const shade = p < 0.7 ? 1 : (1 - p) / 0.3;  // the clouds evening out, at the end, into one fog
      paintFog(layer, function (x, y, out) {
        const n = cloud(x, y, p);
        const d = (r - 1 + n) / 0.3;
        out[0] = d <= 0 ? 0 : d >= 1 ? 1 : d * d * (3 - 2 * d);
        out[1] = (n - 0.5) * 2 * shade;
      });
      return p < 1;
    }, null, moves);
  }

  // The poem's page out of the fog: the window all fog at first, or, as the opening ends,
  // all dark, which pales into fog (over the menu too, as the opening was: over); the fog
  // stirs, then a long wind from the left tears it away to the right in streaks, and the
  // poem condenses out of the clear air, line by line, each from its start, 唯有真解在
  // last. Resolves once the poem is all there, or once stopped() says it's no longer wanted.
  async function clearFog(over, stopped) {
    const STIR = over ? 900 : 300;  // the dark paling, or the fog stirring, before the wind
    const WIND = 1300;              // the wind's way across the window
    const chars = spell();
    const layer = makeFog(over);
    const W = layer.width;
    const H = layer.height;
    const BAND = 0.2 * W + 120;     // how wide the torn edge is
    const TILT = 0.35;              // how much further behind the wind is lower down
    const front = function (q) {    // where it is at q, from 0 to 1 of its way
      return -BAND - 140 + (W + TILT * H + 2 * BAND + 280) * sway(q);
    };
    const ragged = function (y, t) {
      return (clouds(y / 120 + 3.7, t / 2500) - 0.5) * 260;
    };

    // When the wind is past a point, in ms
    const passes = function (x, y) {
      const goal = x + TILT * y + ragged(y, STIR + WIND / 2) + 0.5 * BAND;
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 18; k++) {
        const mid = (lo + hi) / 2;
        if (front(mid) < goal) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      return STIR + lo * WIND;
    };
    // The characters condense in reading order, a line after another, each once the wind
    // has passed it.
    const start = chars.length ? passes(chars[0].x, chars[0].y) : 0;
    let end = STIR + WIND;
    const moves = chars.map(function (ch) {
      const at = Math.max(start + 125 * ch.line + 18 * ch.place, passes(ch.x, ch.y) + 60);
      end = Math.max(end, at + 650);
      return ch.span.animate([
        { opacity: 0, filter: 'blur(6px)', left: '-8px' },
        { opacity: 1, filter: 'blur(0px)', left: '0px' },
      ], { duration: 650, delay: at, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)', fill: 'backwards' });
    });

    const draw = function (t) {
      const f = front((t - STIR) / WIND);
      const stir = Math.min(t / STIR, 1);  // how much the clouds show yet
      const shift = 0.3 * t;               // the streaks blown on to the right
      let rowY = -1;
      let rowRagged = 0;
      paintFog(layer, function (x, y, out) {
        if (y !== rowY) {
          rowY = y;
          rowRagged = ragged(y, t);
        }
        const s = (f - x - TILT * y - rowRagged) / BAND;  // past the wind's edge: from 0 to 1 across it
        if (s >= 1) {
          out[0] = 0;
          out[1] = 0;
          return;
        }
        const shade = (clouds((x - 0.08 * t) / 360, y / 180) - 0.5) * 2 * stir;
        if (s <= 0) {
          out[0] = 1;
          out[1] = shade;
          return;
        }
        const c = s * s * (3 - 2 * s);
        const edge = 4 * c * (1 - c);
        const streak = clouds((x - shift) / 280, y / 24) - 0.5;
        out[0] = 1 - Math.min(Math.max(c + 1.2 * streak * edge, 0), 1);
        out[1] = shade + 1.4 * streak * edge;
      }, over ? 1 - sway(t / STIR) : 0);
    };
    draw(0);  // all fog (or all dark) at once
    if (!over) {
      root.classList.remove('trivia-turned');  // the text under the fog now, waiting
    }
    await frames(function (t) {
      draw(t);
      return t < STIR + WIND;
    }, stopped, moves);
    if (stopped && stopped()) {
      return;
    }
    await wait(Math.max(0, end - STIR - WIND) / 1000);
    cover.canvas.remove();
    cover.restore();
    cover = null;
  }

  /* The tide */

  // How far past its line the water reaches up the page at x, at t ms, in px
  function swash(x, t) {
    return 9 * Math.sin(x / 70 - t / 380) + 6 * Math.sin(x / 31 + t / 260 + 1.3) + 16 * Math.sin(x / 190 + t / 900 + 0.4);
  }

  function makeTide() {
    const layer = lay(false);
    const bg = color('--bg', [255, 255, 255]);
    const ink = color('--strong', [17, 17, 17]);
    const dark = bg[0] + bg[1] + bg[2] < ink[0] + ink[1] + ink[2];
    layer.water = color('--tide', mix(bg, [120, 140, 160], 0.15));
    layer.crest = mix(layer.water, ink, dark ? 0.3 : 0.22);
    layer.foam = dark ? mix(layer.water, ink, 0.12) : mix(layer.water, bg, 0.65);
    return layer;
  }

  // Draws the tide, its edge along `line` (px from the top of the window) give or take the
  // swash: the water below it, see-through at the edge and deep further down, a dark crest
  // along the edge with foam under it, and lines of the waves behind; and the page above
  // the edge wet a little way (wet, from 0 to 1), darker.
  function paintTide(layer, line, t, wet) {
    const pen = layer.pen;
    const W = layer.width;
    const H = layer.height;
    pen.setTransform(layer.scale, 0, 0, layer.scale, 0, 0);
    pen.clearRect(0, 0, W + 1, H + 1);
    const trace = function (behind, damp) {
      const edge = function (x) {
        return line + behind - damp * swash(x + 37 * behind, t - 40 * behind);
      };
      pen.moveTo(-8, edge(-8));
      for (let x = 0; x < W + 16; x += 8) {
        pen.lineTo(x, edge(x));
      }
    };
    let shade;
    if (wet > 0) {
      shade = pen.createLinearGradient(0, line - 160, 0, line + 20);
      shade.addColorStop(0, rgba(layer.water, 0));
      shade.addColorStop(1, rgba(layer.water, 0.45 * wet));
      pen.fillStyle = shade;
      pen.beginPath();
      trace(0, 1);
      pen.lineTo(W + 16, line - 200);
      pen.lineTo(-8, line - 200);
      pen.fill();
    }
    shade = pen.createLinearGradient(0, line - 30, 0, line + 150);
    shade.addColorStop(0, rgba(layer.water, 0.5));
    shade.addColorStop(1, rgba(layer.water, 1));
    pen.fillStyle = shade;
    pen.beginPath();
    trace(0, 1);
    pen.lineTo(W + 16, H + 40);
    pen.lineTo(-8, H + 40);
    pen.fill();
    pen.lineCap = 'round';
    pen.lineJoin = 'round';
    for (let k = 1; k <= 3; k++) {
      pen.strokeStyle = rgba(layer.crest, 0.35 / k);
      pen.lineWidth = 1.2;
      pen.beginPath();
      trace(14 + 22 * k, 0.75);
      pen.stroke();
    }
    pen.strokeStyle = rgba(layer.foam, 0.9);
    pen.lineWidth = 5;
    pen.beginPath();
    trace(4, 1);
    pen.stroke();
    pen.strokeStyle = rgba(layer.crest, 0.9);
    pen.lineWidth = 1.6;
    pen.beginPath();
    trace(0, 1);
    pen.stroke();
  }

  // Leaving the poem's page for the English one: a tide runs up the page from the bottom
  // and washes the poem out, each character rocked a moment under the water before it
  // goes, until the window is all deep water, even. Resolves then.
  function tideIn() {
    const TIME = 1150;
    const chars = spell();
    const layer = makeTide();
    const H = layer.height;
    const rise = function (p) {  // fast in, slowing
      return 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 2);
    };
    const line = function (t) {  // from under the window to over it
      return H + 60 - (H + 260) * rise(t / TIME);
    };
    // When the water is over a point
    const under = function (x, y) {
      let t = TIME / 2;
      for (let k = 0; k < 3; k++) {
        const r = Math.min(Math.max((H + 60 - y - swash(x, t)) / (H + 260), 0), 1);
        t = TIME * (1 - Math.sqrt(1 - r));
      }
      return t;
    };
    const moves = chars.map(function (ch) {
      return ch.span.animate([
        { opacity: 1, filter: 'blur(0px)', left: '0px', top: '0px' },
        { opacity: 0.75, filter: 'blur(0.8px)', left: '3px', top: '-3px', offset: 0.3 },
        { opacity: 0.35, filter: 'blur(1.6px)', left: '-3px', top: '2px', offset: 0.65 },
        { opacity: 0, filter: 'blur(3px)', left: '5px', top: '6px' },
      ], { duration: 650, delay: under(ch.x, ch.y + 8), easing: 'ease-in-out', fill: 'forwards' });
    });
    return frames(function (t) {
      paintTide(layer, line(t), t, 0);
      return t < TIME;
    }, null, moves);
  }

  // The English page out of the tide: the window all deep water at first, which draws back
  // down the page, leaving the lines behind it, top line first, each character settling as
  // the water leaves it, the page wet for a moment behind it. Resolves once it's gone.
  async function ebb() {
    const TIME = 1500;
    const chars = spell();
    const layer = makeTide();
    const H = layer.height;
    const line = function (t) {  // from over the window to under it
      return -200 + (H + 420) * sway(t / TIME);
    };
    // When the water has left a point
    const left = function (x, y) {
      let t = TIME / 2;
      for (let k = 0; k < 3; k++) {
        const s = Math.min(Math.max((y + swash(x, t) + 200) / (H + 420), 0), 1);
        t = TIME * Math.acos(1 - 2 * s) / Math.PI;
      }
      return t;
    };
    let end = TIME;
    const moves = chars.map(function (ch) {
      const at = Math.max(0, left(ch.x, ch.y - 6) - 60);
      end = Math.max(end, at + 700);
      return ch.span.animate([
        { opacity: 0, filter: 'blur(3px)', left: '-3px', top: '4px' },
        { opacity: 0.7, filter: 'blur(1px)', left: '2px', top: '-1px', offset: 0.45 },
        { opacity: 1, filter: 'blur(0px)', left: '0px', top: '0px' },
      ], { duration: 700, delay: at, easing: 'ease-out', fill: 'backwards' });
    });
    paintTide(layer, line(0), 0, 1);
    root.classList.remove('trivia-turned');  // the text under the water now, waiting
    await frames(function (t) {
      paintTide(layer, line(t), t, 1);
      return t < TIME;
    }, null, moves);
    await wait(Math.max(0, end - TIME) / 1000);
    cover.canvas.remove();
    cover.restore();
    cover = null;
  }

  /* Turning */

  // Leaving: the key's script waits for this before it goes to the other page.
  document.addEventListener('pageturn', function (event) {
    try {
      sessionStorage.setItem('trivia-turned', new URL(event.detail.to, location.href).pathname);
    } catch (e) {}
    if (!text) {
      return;
    }
    if (!leaving) {
      leaving = reduceMotion ?
        text.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished :
        chinese ? tideIn() : fogIn();
    }
    event.detail.wait(leaving);
  });

  // Arriving: out of the fog to the poem, or out of the tide to the English page; or, when
  // the system asks for less motion, the text just fades in.
  async function arrive() {
    if (!text || reduceMotion) {
      root.classList.remove('trivia-turned');
      if (text) {
        await text.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished;
      }
      return;
    }
    if (document.fonts) {
      await Promise.race([document.fonts.ready, wait(1)]);  // so the characters are where they'll stay
    }
    await (chinese ? clearFog(false) : ebb());
  }

  // Back to this page from the other one, as the browser kept it: uncovered.
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) {
      return;
    }
    if (cover) {
      if (cover.canvas) {
        cover.canvas.remove();
      }
      cover.restore();
      cover = null;
    }
    if (text) {
      text.getAnimations().forEach(function (animation) {
        animation.cancel();
      });
    }
    leaving = null;
  });

  if (root.classList.contains('trivia-turned')) {
    if (intro) {
      intro.remove();
    }
    root.setAttribute('data-arriving', '');
    const arrived = function () {
      root.removeAttribute('data-arriving');
    };
    arrive().then(arrived, arrived);
    return;
  }

  /* The opening */

  if (!intro) {
    return;
  }
  const font = window.Calligraphy;
  const canvas = intro.querySelector('.trivia-intro__ink');
  const ctx = canvas.getContext && canvas.getContext('2d');
  const clip = intro.querySelector('.trivia-intro__clip');

  // Missing what it needs, or so late that the stylesheet is fading the opening away by
  // itself, in case this script never came: just the page. (Should anything here fail
  // before the end of this script, the stylesheet fades it away as well.)
  if (!font || !ctx || !text || performance.now() > 4500) {
    intro.remove();
    return;
  }

  // The two openings, each in columns read from the right. `door` is where the view flies
  // into the clip: a point in a broad stroke of the character in that column and row,
  // counted from 0, near the middle of the window, in the font's units.
  const OPENINGS = {
    tall: {
      written: ['一曰慈', '二曰俭'],  // its columns, from the right
      chapter: '《道德经》第六十七章',
      door: { column: 1, row: 1, x: 720, y: 160 },  // at the foot of the right side of 二曰俭's 曰
      pace: 1,
    },
    wide: {
      written: ['不行而知', '不见而明', '不为而成'],
      chapter: '《道德经》第四十七章',
      door: { column: 1, row: 2, x: 340, y: 630 },  // in the stroke across the top of the middle 而
      pace: 1.8,  // with twice as many strokes, written in not much more time
    },
  };
  const shape = intro.clientWidth > intro.clientHeight ? 'wide' : 'tall';
  const opening = OPENINGS[shape];
  const WRITTEN = opening.written;
  const CHAPTER = opening.chapter;
  const DOOR = opening.door;
  const SEAL = '李耳';  // Laozi's own name, the chapters' author
  const INK = [243, 238, 227];
  const RED = '#c33b2c';

  // The clip, images/trivia/<name>.mp4 with <name>.jpg as its first frame, and its settings
  // from _data/trivia.yml: when the dark closes in, in seconds into it, and if the phone
  // filming it turned, how far it had turned at each tenth of a second, clockwise in
  // degrees: the clip turns as much, the same way.
  clip.poster = intro.dataset[shape] + '.jpg';
  clip.src = intro.dataset[shape] + '.mp4';
  const CLIP_END = Number(intro.dataset[shape + 'End']) || 9;
  const ROLL = (intro.dataset[shape + 'Roll'] || '').split(' ').filter(Boolean).map(Number);

  // Timing of the writing, in seconds, at the opening's pace.
  const PACE = opening.pace;
  const BRUSH_SPEED = 4080 * PACE;  // font units a second along a stroke
  const STROKE_GAP = 0.033 / PACE;
  const CHARACTER_GAP = 0.18 / PACE;
  const COLUMN_GAP = 0.33 / PACE;
  const SOFT = 0.018;               // how long a bit of ink takes to darken fully
  const SPREAD = 0.00083 / PACE;    // and how much later the edges of a stroke come, a second a unit

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
        const stroke = { line: middle, start: clock, time: 0.058 / PACE + middle.length / BRUSH_SPEED };
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

  // The way into the clip: how far it is from DOOR to the edge of its character, in font units.
  const doorway = written.find(function (character) {
    return character.column === DOOR.column && character.row === DOOR.row;
  });
  const door = (function () {
    const probe = document.createElement('canvas').getContext('2d');
    const path = doorway.path;
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

  /* Where everything goes: the characters in columns in the middle, a little right of it,
     in rows as tall as their tallest character, the chapter in small ones to their left and
     the seal under the chapter. Sizes in CSS px. */

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

    const gap = 200;  // between characters, in font units
    const rows = [];  // how tall each row is, in font units
    written.forEach(function (character) {
      rows[character.row] = Math.max(rows[character.row] || 0, character.box[3] - character.box[1]);
    });
    const column = rows.reduce(function (sum, row) {
      return sum + gap + row;
    }, -gap);
    // As large as lets the columns take 74% of the window's height and, with the chapter,
    // 88% of its width, up to 340 px.
    const first = (WRITTEN.length - 1) / 2;  // the first column's place right of the middle, in pitches
    size = Math.min(0.74 * height * 1000 / column, 0.88 * width / (2.4 * first + 1.25), 340);

    const k = size / 1000;
    const columnTop = (height - column * k) / 2 - 0.015 * height;
    let top = columnTop;
    const rowTops = rows.map(function (row) {
      const at = top;
      top += (row + gap) * k;
      return at;
    });
    const pitch = 1.2 * size;                // from one column's middle to the next's
    const middle = width / 2 + 0.16 * size;  // of the columns
    written.forEach(function (character) {
      const ink = character.box[3] - character.box[1];
      character.k = k;
      character.x = middle + (first - character.column) * pitch - 500 * k;  // the em's left edge
      character.baseline = rowTops[character.row] + ((rows[character.row] - ink) / 2 + character.box[3]) * k;
    });

    // The chapter, from below the top of the columns, left of the last; brackets take about
    // half a cell.
    const small = 0.14 * size;
    let y = columnTop + 0.5 * size;
    const x = middle - first * pitch - 0.68 * size;
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
    const aspect = clip.videoWidth ? clip.videoWidth / clip.videoHeight : shape === 'wide' ? 16 / 9 : 9 / 16;
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
    zoom: 0,      // from 0 to 1, flying through the door
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
    const character = doorway;
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

  // The box of each line of the page's text, the name under the quotation too, in the
  // window.
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
    const leaving = [intro].concat(bars, cover && cover.canvas ? [cover.canvas] : []).filter(function (element) {
      return element.isConnected;
    });
    if (cover) {  // the poem's characters, each by itself as they condensed, back as they were
      cover.restore();
      cover = null;
    }
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

    // The ink turns into windows onto the clip, and the view flies through the door.
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
    if (chinese) {
      // The poem's page: the dark pales into fog, which the wind clears, as when the key
      // turns to it.
      const clearing = clearFog(true, function () {
        return finished;
      });
      intro.remove();
      root.classList.remove('trivia-intro-open');
      await clearing;
    } else {
      await declassify();
    }
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
