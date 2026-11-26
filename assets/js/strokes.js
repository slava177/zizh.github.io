/* ==========================================================================
   The key to the page in the other language, made of a word's strokes
   ========================================================================== */

// A page in both languages (translation: in its front matter) has the way to the other one
// hidden in the menu (_includes/site-header.html). On an English page, let the pointer rest
// on Trivia, or on the space under it, and the bar of its T, the dot of its first i and the
// two strokes of its v come out of the word and make 文 under it, in a small round button.
// On a Chinese page the entry is 杂记, written with the brush, and the strokes of the 木 in
// 杂, its 横, 撇 and 点, make A. Clicked, the strokes make the other sign as the page turns,
// A from Trivia's, 文 from 杂记's with the dot of 记's 讠 on top; the other page opens with
// its own word's strokes still out, the way back, for a moment (sessionStorage
// "strokes-arrive", read in _includes/head.html); they go back into the word once the
// pointer has left. Meanwhile the menu turns to the other language, an entry after another,
// so the other page opens just as this one ends, nothing jumping. On a phone, a long press
// on the entry brings the strokes out; with the keyboard, the button comes after it.
//
// A page can turn its own way meanwhile, as Trivia's does with fog or a tide
// (assets/js/trivia.js): the event "pageturn" on document tells it, with the address it
// turns to (detail.to) and a function to hand it a promise to wait for (detail.wait).
//
// The strokes are the fonts' own outlines (Crimson Pro and Ma Shan Zheng, SIL Open Font
// License), drawn over the word, whose own letters are hidden while the strokes are out of
// it. Where the font hasn't come, as where Google Fonts can't be reached, the button has
// the other language's name in it instead. When the system asks for less motion, the
// strokes go to their places at once.

(function () {
  'use strict';

  // Each word the strokes come from: its font; the font's outlines for its letters, in
  // font units (em to the em), y up; the word in pieces, each the letter it is part of (its
  // place in the word), all of the letter's outline, some of its contours or the part of it
  // in a clip, and for those that come out, the stroke of 文 or A it makes and the line
  // along it, from end to end, or for a dot its middle; and where those go in 文 and in A,
  // in a square of 24 units (y down), 19px wide, in the middle of the button: a stroke from
  // one end to the other, kappa times as thick as in the word, a dot to its middle, sigma
  // times as large. A piece with nowhere to go in a sign stays in the word.
  const SOURCES = {
    Trivia: {
      font: '400 16px "Crimson Pro"',
      em: 1024,
      glyphs: {
        T: ['M518 591 540 429 496 424 454 537Q446 539 435.5 539.5Q425 540 417 540H381Q371 540 354 540Q337 540 323 539Q323 531 322.5 501.5Q322 472 322 433Q322 394 322 358V223Q322 159 323 112.5Q324 66 324 52L409 40L406 0H151L149 40L233 52Q233 66 234 112.5Q235 159 235 223V358Q235 394 235 433Q235 472 235 501.5Q235 531 234 539Q221 540 204.5 540Q188 540 177 540H138Q130 540 120 539.5Q110 539 102 537L61 423L16 429L38 591Q50 590 62 589.5Q74 589 86 588.5Q98 588 110.5 587.5Q123 587 135 587H421Q433 587 445 587.5Q457 588 469 588.5Q481 589 493.5 589.5Q506 590 518 591Z'],
        r: ['M33 0 30 36 92 51Q93 56 94 69Q95 82 95.5 104Q96 126 96 158L97 236Q97 269 94.5 301Q92 333 89 352L25 366V399L159 436L173 422L169 338L172 337Q202 395 233 415.5Q264 436 291 436Q314 436 329.5 424.5Q345 413 345 390Q345 366 328.5 353.5Q312 341 287 341Q269 341 252.5 349Q236 357 221 371L239 365Q220 353 203 331.5Q186 310 172 278L173 185Q174 160 175 133Q176 106 177 84.5Q178 63 179 51L266 38L264 0Z'],
        i: ['M27 0 25 37 92 51Q93 55 93.5 65Q94 75 95 97Q96 119 96 158V224Q96 265 94 299Q92 333 89 352L22 366V399L164 436L179 422Q176 391 174.5 361Q173 331 173 291V165Q173 119 174.5 89Q176 59 178 51L245 37L243 0Z', 'M135 549Q110 549 91.5 566Q73 583 73 608Q73 633 91.5 650Q110 667 135 667Q161 667 178 650Q195 633 195 608Q195 583 178 566Q161 549 135 549Z'],  // its body and its dot
        v: ['M220 -4 43 379 -4 394 -2 430H193L195 394L133 379L270 75L244 74L370 379L308 394L310 430H476L478 394L431 379L250 -4Z'],
        a: ['M196 -8Q156 -8 125 8Q94 24 76.5 49Q59 74 59 101Q59 135 81 157Q103 179 153 195L305 246V297Q305 322 290 342.5Q275 363 250 375Q225 387 194 387Q169 387 160 376.5Q151 366 149 335L147 293Q111 285 86 295.5Q61 306 61 330Q61 347 75.5 364Q90 381 114 396.5Q138 412 166 423Q194 434 221 438Q295 438 339.5 399Q384 360 385 297L383 129Q383 110 384.5 92Q386 74 389 65L453 53V22L404 4Q390 -1 378 -4.5Q366 -8 358 -8Q327 -8 318 27L307 66H322Q289 29 258.5 10.5Q228 -8 196 -8Z', 'M223 51Q246 51 266 61.5Q286 72 305 94V199L193 169Q169 163 158.5 150Q148 137 148 117Q148 92 170.5 71.5Q193 51 223 51Z'],  // its outside and its bowl
      },
      clips: {
        'T-bar': 'M-60 400H228V541H330V400H620V720H-60Z',   // the bar, with the serifs at its ends
        'T-stem': 'M-60 -60H620V400H330V541H228V400H-60Z',  // the stem and its foot
        'v-left': 'M-60 -60H235V520H-60Z',
        'v-right': 'M235 -60H540V520H235Z',
      },
      pieces: [
        { at: 0, glyph: 'T', clip: 'T-bar', stroke: 'bar', line: [[16, 565], [540, 565]] },
        { at: 0, glyph: 'T', clip: 'T-stem' },
        { at: 1, glyph: 'r' },
        { at: 2, glyph: 'i', contours: [0] },
        { at: 2, glyph: 'i', contours: [1], stroke: 'dot', middle: [134, 608] },
        { at: 3, glyph: 'v', clip: 'v-left', stroke: 'left', line: [[95, 430], [235, -4]] },
        { at: 3, glyph: 'v', clip: 'v-right', stroke: 'right', line: [[390, 430], [235, -4]] },
        { at: 4, glyph: 'i' },
        { at: 5, glyph: 'a' },
      ],
      shapes: {
        wen: {
          bar: { from: [3.6, 7.4], to: [20.4, 7.4], kappa: 1.1 },
          right: { from: [16.2, 10.2], to: [4.2, 21.8], kappa: 1.35 },  // the v's right stroke, the one falling left
          left: { from: [7.8, 10.4], to: [20.2, 21.8], kappa: 1.35 },   // and its left one, falling right
          dot: { at: [12.2, 3.6], sigma: 1.3 },
        },
        a: {
          bar: { from: [8, 14.8], to: [16, 14.8], kappa: 1.15 },
          right: { from: [4.6, 21.4], to: [11.9, 3.4], kappa: 1.35 },  // the v upside down, its serifs the feet
          left: { from: [19.4, 21.4], to: [12.1, 3.4], kappa: 1.35 },
        },
      },
    },
    杂记: {
      font: '400 16px "Ma Shan Zheng"',
      em: 1000,
      glyphs: {
        杂: ['M547 156Q552 160 576 160Q599 159 633 154Q667 149 683 143Q741 123 773 96Q782 90 784 86Q786 81 786 68Q786 49 773 31Q756 3 727 2Q698 1 679 25Q669 38 642 64Q616 91 596 107Q547 149 547 156Z', 'M452 412Q465 426 499 403Q515 391 520 380Q526 368 526 346Q526 329 528 324Q529 319 534 318Q542 317 597 321Q652 325 722 326Q772 328 784 326Q797 325 802 320Q813 310 810 287Q808 264 794 251Q788 245 782 244Q775 243 752 245Q719 247 697 251Q678 254 630 254Q582 255 554 252Q535 250 530 248Q526 246 524 237Q521 226 522 96Q522 -11 519 -34Q516 -58 500 -73Q462 -108 439 -112Q428 -114 406 -110Q383 -106 383 -98Q383 -91 377 -86Q371 -82 371 -67Q371 -53 360 -41Q349 -29 320 -12Q300 0 294 2Q287 3 272 2Q239 -3 223 16Q218 22 218 46Q218 71 223 85Q229 100 252 135Q276 170 293 188Q304 200 308 202Q312 205 320 201Q327 199 328 194Q330 190 331 166Q332 136 322 114Q312 93 312 87Q312 81 305 66Q295 48 300 39Q304 30 320 30Q324 31 322 26Q320 22 331 18Q350 13 379 14Q413 15 420 23Q426 31 427 72Q427 111 427 114Q427 117 430 158Q433 198 429 220L426 244L399 242Q316 233 280 224Q265 219 245 201Q229 188 219 186Q209 183 193 190Q171 199 164 224Q161 237 166 244Q170 251 187 256Q204 262 242 276Q269 285 294 290Q320 294 388 302Q422 305 426 308Q429 310 432 341Q436 394 452 412Z', 'M406 815Q411 819 414 820Q418 820 429 816Q447 809 465 780Q480 756 468 740Q462 731 462 720Q462 710 468 710Q481 710 510 722Q525 728 551 726Q559 726 574 710Q590 694 594 682Q598 671 596 665Q595 659 585 640Q574 621 572 612Q570 603 570 575Q570 535 572 526Q575 516 586 504Q597 492 607 487Q627 476 723 481L756 483L768 501Q780 518 782 536Q788 597 797 597Q808 597 818 558Q822 537 829 526Q836 516 851 505Q860 498 865 480Q870 462 868 446Q864 434 853 420Q842 405 833 402Q822 400 802 386L782 372L717 374Q652 375 622 386Q571 403 541 439Q520 463 512 484Q503 506 500 538Q493 606 507 654Q509 664 502 662Q494 662 469 656Q450 652 446 649Q441 646 436 634Q430 618 430 614Q430 607 414 575Q398 543 387 526Q373 505 367 493Q363 484 322 442Q280 400 276 400Q271 400 238 368Q227 357 190 336Q153 314 146 314Q139 314 135 324Q131 332 132 335Q134 338 144 344Q159 356 206 404Q252 453 275 481Q328 545 328 551Q328 554 334 560Q339 567 346 586Q352 605 356 613Q360 620 356 619Q350 619 321 603Q290 587 276 590Q261 593 258 600Q256 606 249 615Q242 624 244 630Q246 635 264 645Q283 655 290 655Q295 655 312 664Q330 673 354 682Q377 692 378 692Q380 693 387 739Q398 803 406 815Z'],  // its 点, the rest of its 木, and its 九
        记: ['M201 478Q210 484 219 486Q228 488 254 488Q293 488 296 484Q300 481 302 454Q303 433 300 428Q298 423 286 410Q272 398 269 390Q266 383 264 358Q260 321 256 302Q252 283 250 263Q248 243 244 236Q240 228 236 187Q235 149 240 149Q245 152 277 187Q360 283 366 283Q370 283 367 272Q365 261 362 256Q356 249 348 234Q341 218 341 214Q341 209 334 197Q328 185 320 168Q313 151 304 138Q295 125 274 85Q260 59 257 48Q254 36 255 21Q256 -15 237 -20Q228 -23 219 -31Q197 -51 159 -12Q137 10 130 22Q125 31 124 42Q124 54 128 57Q133 61 130 74Q128 88 134 92Q139 95 153 118L167 143V206Q167 270 173 318Q176 341 178 354Q179 367 179 375Q179 383 178 385Q176 387 173 387Q162 387 144 361Q137 353 123 350Q109 348 95 360L73 379Q65 385 64 397Q63 409 70 419Q73 423 108 438Q142 453 171 463Q186 468 201 478Z', 'M525 655Q554 665 582 665Q611 665 622 670Q633 676 642 674Q650 673 689 666L728 658L738 639Q747 617 744 605Q742 593 726 575Q707 552 707 544Q707 535 702 528Q696 521 689 502Q682 484 688 473Q700 451 690 432Q680 413 653 402Q638 398 632 398Q625 397 609 401Q570 414 543 400Q526 391 512 391Q498 391 496 387Q494 383 482 384Q473 384 472 380Q470 377 467 353Q449 169 456 126Q462 87 485 82Q498 78 611 82Q724 86 750 91Q808 101 827 128Q835 138 839 159Q857 268 870 268Q872 268 876 254Q881 240 881 230Q881 220 900 166Q931 68 934 56Q937 45 932 34Q924 21 909 6Q894 -8 879 -15L855 -27Q832 -38 732 -41Q633 -44 556 -35Q516 -30 503 -26Q490 -22 467 -7Q446 7 435 18Q424 30 410 55L394 83L395 143Q396 261 405 340L416 429Q418 446 426 454Q434 461 446 455Q456 450 485 458Q566 478 571 491Q576 500 584 514Q593 529 596 548Q600 568 606 591Q613 614 611 618Q609 621 587 621Q563 621 517 606Q504 601 500 602Q495 603 486 609Q462 627 485 639Q496 646 525 655Z', 'M217 738Q221 746 228 748Q234 749 258 746Q295 744 308 739Q320 734 334 714Q349 691 349 684Q349 676 356 670Q362 665 362 646Q363 627 358 623Q354 621 354 606Q354 590 345 576Q336 561 321 561Q304 561 282 580Q259 598 247 623Q240 636 227 655Q220 666 214 680Q208 693 206 701Q203 709 205 711Q209 711 209 720Q209 728 217 738Z'],  // its 讠 but the dot, its 己, and the dot
      },
      clips: {
        '杂-bar': 'M150 190H830V345H540V315H410V345H150Z',             // the 横, not the 竖 over it
        '杂-pie': 'M90 -10H300V60H415V190H90Z',                        // the 撇, not the hook's foot
        '杂-rest': 'M-200 -300H1200V1100H-200ZM150 190H830V345H540V315H410V345H150ZM90 -10H300V60H415V190H90Z',
      },
      pieces: [
        { at: 0, glyph: '杂', contours: [2] },
        { at: 0, glyph: '杂', contours: [1], clip: '杂-rest' },
        { at: 0, glyph: '杂', contours: [1], clip: '杂-bar', stroke: 'bar', line: [[175, 228], [805, 282]] },
        { at: 0, glyph: '杂', contours: [1], clip: '杂-pie', stroke: 'right', line: [[320, 190], [235, 30]] },
        { at: 0, glyph: '杂', contours: [0], stroke: 'left', line: [[560, 150], [770, 45]] },
        { at: 1, glyph: '记', contours: [0, 1] },
        { at: 1, glyph: '记', contours: [2], stroke: 'dot', middle: [283, 655] },
      ],
      shapes: {
        wen: {
          bar: { from: [3.6, 7.6], to: [20.4, 7], kappa: 0.9 },
          right: { from: [15.6, 9.8], to: [4.4, 21.8], kappa: 1.2 },  // the 撇, falling left
          left: { from: [8.4, 10.6], to: [20.4, 21.6], kappa: 1 },    // the 点, long, falling right
          dot: { at: [12.4, 3.6], sigma: 0.65 },
        },
        a: {
          bar: { from: [8.2, 15], to: [15.8, 14.6], kappa: 0.8 },
          right: { from: [4.8, 21.6], to: [11.9, 3.4], kappa: 1.2 },  // thick at the feet, both
          left: { from: [12.1, 3.4], to: [19.2, 21.6], kappa: 1 },
        },
      },
    },
  };

  const key = document.querySelector('.site-header__key');
  const keyed = key && key.parentNode;
  const tab = keyed && keyed.firstElementChild;
  const word = tab && tab.firstChild;
  const source = word && word.nodeType === Node.TEXT_NODE && SOURCES[word.data];
  if (!key || !source) {
    return;
  }

  const NS = 'http://www.w3.org/2000/svg';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // What the strokes make in the button: the other language's sign, 文 on an English page
  // or A on a Chinese one; and as the page turns, this page's own, the way back to it.
  const chinese = /^zh/.test(root.lang);
  const OUT = chinese ? 'a' : 'wen';
  const BACK = chinese ? 'wen' : 'a';

  /* Small tools */

  const lerp = function (a, b, t) {
    return a + (b - a) * t;
  };
  const easeInOut = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2;
  };

  function wait(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time);
    });
  }

  // Calls step(p) every frame for `time` ms, with p going from 0 to 1; resolves with
  // whether it got to the end before `move` was stopped.
  function tween(time, step, move) {
    return new Promise(function (resolve) {
      const start = performance.now();
      requestAnimationFrame(function frame(now) {
        if (move.stopped) {
          resolve(false);
          return;
        }
        const p = time > 0 ? Math.min(Math.max((now - start) / time, 0), 1) : 1;
        step(p);
        if (p < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve(true);
        }
      });
    });
  }

  // 2D affine matrices, [a, b, c, d, e, f] as SVG writes them
  function multiply(m, n) {
    return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  }
  const translate = function (x, y) {
    return [1, 0, 0, 1, x, y];
  };
  const rotate = function (a) {
    return [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
  };
  const scale = function (x, y) {
    return [x, 0, 0, y, 0, 0];
  };

  // The shorter way round from one angle to another
  function turnBetween(from, to) {
    let d = (to - from) % (2 * Math.PI);
    if (d > Math.PI) {
      d -= 2 * Math.PI;
    } else if (d < -Math.PI) {
      d += 2 * Math.PI;
    }
    return d;
  }

  function add(name, attributes, parent) {
    const node = document.createElementNS(NS, name);
    Object.keys(attributes).forEach(function (a) {
      node.setAttribute(a, attributes[a]);
    });
    parent.appendChild(node);
    return node;
  }

  /* The strokes, drawn over a word once its font has come */

  // A mark on the word's baseline, to measure it by
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'display: inline-block; width: 0; height: 0;';
  tab.appendChild(probe);

  let made = 0;  // how many inks have been made, for their clips' names

  // The strokes of a word (one of SOURCES), on an svg of their own, at the entry's right,
  // which stays put as the entry grows or shrinks, as it does when the menu turns to the
  // other language: the pieces, where the moving ones are in the word (homes), where they
  // go (targets, for home, wen and a), what they make or are on their way to make (shape),
  // and the move under way. Hidden until shown.
  function makeInk(of) {
    const ink = { source: of, moving: {}, homes: {}, targets: {}, shape: 'home', move: null };
    const name = 'strokes-' + (made += 1) + '-';
    const svg = ink.svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'site-header__strokes');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '1');
    svg.setAttribute('height', '1');
    svg.style.visibility = 'hidden';
    const defs = add('defs', {}, svg);
    Object.keys(of.clips).forEach(function (clip) {
      add('path', { d: of.clips[clip], 'clip-rule': 'evenodd' },
        add('clipPath', { id: name + clip, clipPathUnits: 'userSpaceOnUse' }, defs));
    });
    ink.pieces = of.pieces.map(function (spec) {
      const piece = Object.assign({}, spec);
      const contours = of.glyphs[piece.glyph];
      const attributes = {
        d: (piece.contours ? piece.contours.map(function (i) {
          return contours[i];
        }) : contours).join(''),
      };
      if (piece.clip) {
        attributes['clip-path'] = 'url(#' + name + piece.clip + ')';
      }
      piece.outer = add('g', {}, svg);
      piece.inner = add('g', {}, piece.outer);
      add('path', attributes, piece.inner);
      if (piece.stroke) {
        ink.moving[piece.stroke] = piece;
      }
      return piece;
    });
    keyed.appendChild(svg);
    return ink;
  }

  // A stroke's place: from point a toward b, kappa times as thick as in the word
  function along(a, b, kappa) {
    return {
      x: a[0],
      y: a[1],
      angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      length: Math.hypot(b[0] - a[0], b[1] - a[1]),
      kappa: kappa,
    };
  }

  // Where everything is, in px from the top right of the entry, where the strokes are
  // drawn: the letters of the word in the entry now, by the left edges of its characters and
  // the baseline, and the button by its middle. Puts the ink's moving pieces where its shape
  // has them.
  function measure(ink) {
    const of = ink.source;
    const box = keyed.getBoundingClientRect();
    const range = document.createRange();
    const lefts = [];
    for (let i = 0; i < word.length; i++) {
      range.setStart(word, i);
      range.setEnd(word, i + 1);
      lefts.push(range.getBoundingClientRect().left - box.right);
    }
    const baseline = probe.getBoundingClientRect().top - box.top;
    const k = parseFloat(getComputedStyle(tab).fontSize) / of.em;
    const inWord = function (piece, p) {
      return [lefts[piece.at] + p[0] * k, baseline - p[1] * k];
    };
    const homes = ink.homes = {};
    ink.pieces.forEach(function (piece) {
      piece.inner.setAttribute('transform', 'translate(' + lefts[piece.at].toFixed(2) + ' ' + baseline.toFixed(2) +
        ') scale(' + k.toFixed(5) + ' ' + (-k).toFixed(5) + ')');
      if (piece.middle) {
        const middle = inWord(piece, piece.middle);
        homes[piece.stroke] = { x: middle[0], y: middle[1], sigma: 1 };
      } else if (piece.line) {
        homes[piece.stroke] = along(inWord(piece, piece.line[0]), inWord(piece, piece.line[1]), 1);
      }
    });

    const button = key.getBoundingClientRect();
    const cx = (button.left + button.right) / 2 - box.right;
    const cy = (button.top + button.bottom) / 2 - box.top;
    const unit = 19 / 24;
    const inButton = function (p) {
      return [cx + (p[0] - 12) * unit, cy + (p[1] - 12) * unit];
    };
    const targets = ink.targets = { home: homes };
    Object.keys(of.shapes).forEach(function (name) {
      targets[name] = {};
      Object.keys(homes).forEach(function (stroke) {
        const place = of.shapes[name][stroke];
        if (!place) {
          targets[name][stroke] = homes[stroke];
        } else if (place.at) {
          const middle = inButton(place.at);
          targets[name][stroke] = { x: middle[0], y: middle[1], sigma: place.sigma };
        } else {
          targets[name][stroke] = along(inButton(place.from), inButton(place.to), place.kappa);
        }
      });
    });
    Object.keys(ink.moving).forEach(function (stroke) {
      ink.moving[stroke].now = Object.assign({}, targets[ink.shape][stroke]);
      draw(ink, stroke);
    });
  }

  // A moving piece where it is now: a stroke turned and stretched from its line in the word
  // to its line now, and thickened; the dot moved and grown.
  function draw(ink, stroke) {
    const piece = ink.moving[stroke];
    const home = ink.homes[stroke];
    const now = piece.now;
    let m;
    if (home.sigma !== undefined) {
      m = multiply(translate(now.x, now.y), multiply(scale(now.sigma, now.sigma), translate(-home.x, -home.y)));
    } else {
      m = multiply(translate(now.x, now.y), multiply(rotate(now.angle), multiply(scale(now.length / home.length, now.kappa),
        multiply(rotate(-home.angle), translate(-home.x, -home.y)))));
    }
    piece.outer.setAttribute('transform', 'matrix(' + m.map(function (v) {
      return v.toFixed(4);
    }).join(' ') + ')');
  }

  // Moves the ink's pieces to make `to`, each from wherever it is, one after another, on a
  // small arc (out to the side for the strokes that cross, unless the page is turning).
  // Resolves with whether they all got there before another move began.
  function become(ink, to, time) {
    if (ink.move) {
      ink.move.stopped = true;
    }
    const mine = ink.move = {};
    ink.shape = to;
    const still = reduceMotion.matches;
    const swing = turning ? 0 : 7;
    const lift = to === 'home' ? 3 : 2;
    const order = to === 'home' ? ['right', 'left', 'bar', 'dot'] : ['dot', 'bar', 'left', 'right'];
    return Promise.all(order.map(function (stroke, i) {
      return wait(still ? 0 : 55 * i).then(function () {
        if (mine.stopped) {
          return false;
        }
        const piece = ink.moving[stroke];
        const from = Object.assign({}, piece.now);
        const goal = ink.targets[to][stroke];
        const turn = from.angle === undefined ? 0 : turnBetween(from.angle, goal.angle);
        const side = stroke === 'left' ? -1 : stroke === 'right' ? 1 : 0;
        return tween(still ? 0 : time, function (p) {
          const e = easeInOut(p);
          const arc = Math.sin(Math.PI * e);
          piece.now = {
            x: lerp(from.x, goal.x, e) + side * swing * arc,
            y: lerp(from.y, goal.y, e) - lift * arc,
            sigma: from.sigma === undefined ? undefined : lerp(from.sigma, goal.sigma, e),
            angle: from.angle === undefined ? undefined : from.angle + turn * e,
            length: from.length === undefined ? undefined : lerp(from.length, goal.length, e),
            kappa: from.kappa === undefined ? undefined : lerp(from.kappa, goal.kappa, e),
          };
          draw(ink, stroke);
        }, mine);
      });
    })).then(function (done) {
      return done.every(Boolean);
    });
  }

  let ink = null;    // this page's word's strokes, once its font has come
  let lent = false;  // drawn over the word, whose own letters are hidden

  // The strokes drawn over the word, its own letters hidden; and back.
  function lend() {
    lent = true;
    tab.classList.add('is-lending');
    ink.svg.style.visibility = '';
  }

  function unlend() {
    lent = false;
    tab.classList.remove('is-lending');
    if (ink) {
      ink.svg.style.visibility = 'hidden';
    }
  }

  // Whether a word's font has come: the font itself, not one standing in for it.
  function fontHere(of) {
    const family = of.font.split('"')[1];
    let here = false;
    if (document.fonts && document.fonts.forEach) {
      document.fonts.forEach(function (face) {
        if (face.family.replace(/["']/g, '') === family && face.status === 'loaded') {
          here = true;
        }
      });
    }
    return here;
  }

  // The word's font: once it has come, the strokes can be drawn; should it come only later,
  // as on a slow connection, wake looks again.
  const fontIn = document.fonts && document.fonts.load ?
    document.fonts.load(source.font, word.data).then(function (faces) {
      return faces.length > 0;
    }, function () {
      return false;
    }) : Promise.resolve(false);
  fontIn.then(function (yes) {
    if (yes && !ink) {
      ink = makeInk(source);
    }
  });

  // The other language's word for this entry (data-turn), and its font, asked for ahead of
  // the page turning to it, when the menu turns with it.
  const other = SOURCES[tab.dataset.turn];

  function warm() {
    if (other && document.fonts && document.fonts.load) {
      document.fonts.load(other.font, tab.dataset.turn).catch(function () {});
    }
  }

  /* Showing the key and hiding it */

  let awake = false;    // the key shown
  let turning = false;  // the page turning to the other
  let over = false;     // the pointer on the entry or under it
  let waking = 0;
  let leaving = 0;
  let hold = 0;         // the hold after arriving, by number; 0 once something else has ended it

  function wake() {
    if (awake || turning) {
      return;
    }
    awake = true;
    hold = 0;
    warm();
    if (!ink && fontHere(source)) {
      ink = makeInk(source);
    }
    key.classList.toggle('is-drawn', !!ink);
    if (!ink) {
      key.classList.add('is-on');
      return;
    }
    if (!lent) {
      measure(ink);
      lend();
    }
    become(ink, OUT, 620);
    setTimeout(function () {
      if (awake) {
        key.classList.add('is-on');
      }
    }, reduceMotion.matches ? 0 : 260);
  }

  function sleep() {
    if (!awake || turning) {
      return;
    }
    awake = false;
    hold = 0;
    key.classList.remove('is-on');
    if (lent) {
      become(ink, 'home', 560).then(function (done) {
        if (done) {
          unlend();
        }
      });
    }
  }

  // Where the pointer wakes the key: the entry, and under it down past the button.
  function zone(x, y) {
    const t = tab.getBoundingClientRect();
    const b = key.getBoundingClientRect();
    const cx = (b.left + b.right) / 2;
    const cy = (b.top + b.bottom) / 2;
    return x >= Math.min(t.left, cx - 22) - 6 && x <= Math.max(t.right, cx + 22) + 6 &&
      y >= t.top - 6 && y <= cy + 24;
  }

  // The key shows once the pointer has rested there a moment, and goes a moment after it
  // leaves, unless the keyboard has its focus.
  function point(inside) {
    if (inside === over) {
      return;
    }
    over = inside;
    clearTimeout(waking);
    clearTimeout(leaving);
    if (over) {
      waking = setTimeout(wake, 320);
    } else if (document.activeElement !== key) {
      leaving = setTimeout(sleep, 420);
    }
  }

  let frame = 0;
  document.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') {
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function () {
      point(zone(x, y));
    });
  }, { passive: true });

  document.addEventListener('pointerout', function (event) {
    if (!event.relatedTarget && event.pointerType !== 'touch') {  // out of the window
      cancelAnimationFrame(frame);
      point(false);
    }
  });

  // A finger: a long press on the entry shows the key, without following the link or
  // opening the link's menu; a touch anywhere else hides it.
  let press = 0;  // the press's timer, or -1 once it has shown the key
  tab.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'touch') {
      clearTimeout(press);
      press = setTimeout(function () {
        press = -1;
        wake();
      }, 450);
    }
  });
  ['pointerup', 'pointercancel'].forEach(function (type) {
    tab.addEventListener(type, function () {
      if (press > 0) {
        clearTimeout(press);
        press = 0;
      }
    });
  });
  tab.addEventListener('contextmenu', function (event) {
    if (press === -1) {
      event.preventDefault();
    }
  });
  tab.addEventListener('click', function (event) {
    if (press === -1) {
      press = 0;
      event.preventDefault();
    }
  });
  document.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'touch' && awake && !zone(event.clientX, event.clientY)) {
      sleep();
    }
  });

  // The keyboard: the key shows while it has the focus.
  key.addEventListener('focus', wake);
  key.addEventListener('blur', function () {
    if (!over) {
      sleep();
    }
  });

  /* The menu turning to the other language with the page, so that nothing jumps when the
     other page comes: from the left, each entry's label dissolves as the one in the other
     language (data-turn, _includes/site-header.html) condenses in its place and the entry
     grows or shrinks to fit it; last, on this entry, the strokes of this page's word, making
     the way back, give way to the other word's making the same sign, as the other page
     opens with them. Put back as it was should the browser bring this page back (undo). */

  const FROM = chinese ? 'zh' : 'en';  // this language and the other: their labels' classes,
  const TO = chinese ? 'en' : 'zh';    // site-header__en and site-header__zh (_sass/_header.scss)
  const TURN = 600;                    // how long an entry takes to turn, ms
  const undo = [];

  // The font a label in the other language has here
  function labelFont() {
    const span = document.createElement('span');
    span.className = 'site-header__' + TO;
    span.style.cssText = 'position: absolute; visibility: hidden;';
    keyed.parentNode.appendChild(span);
    const style = getComputedStyle(span);
    const font = { fontFamily: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight };
    span.remove();
    return font;
  }

  // An entry from `width` to its own width now, after `delay` ms
  function refit(a, width, delay) {
    const now = a.getBoundingClientRect().width;
    return a.animate([{ width: width + 'px' }, { width: now + 'px' }], {
      duration: reduceMotion.matches ? 0 : TURN, delay: delay, easing: 'cubic-bezier(0.4, 0.1, 0.3, 1)', fill: 'both',
    }).finished;
  }

  // An entry's label turning to the other language's. The entry takes the other language's
  // font at once, so its line is as tall as it will be on the other page, and the label
  // going keeps its own.
  function relabel(a, delay, font) {
    const nodes = Array.from(a.childNodes);
    const style = a.getAttribute('style');
    const width = a.getBoundingClientRect().width;
    const was = document.createElement('span');
    was.className = 'site-header__was site-header__' + FROM;
    nodes.forEach(function (node) {
      was.appendChild(node);
    });
    const now = document.createElement('span');
    now.className = 'site-header__' + TO;
    now.lang = TO === 'zh' ? 'zh-CN' : 'en';
    now.textContent = a.dataset.turn;
    a.appendChild(now);
    a.appendChild(was);
    a.classList.add('is-turning');
    Object.assign(a.style, font);
    undo.push(function () {
      a.getAnimations({ subtree: true }).forEach(function (animation) {
        animation.cancel();
      });
      a.classList.remove('is-turning');
      now.remove();
      was.remove();
      nodes.forEach(function (node) {
        a.appendChild(node);
      });
      if (style === null) {
        a.removeAttribute('style');
      } else {
        a.setAttribute('style', style);
      }
    });
    const time = reduceMotion.matches ? 0 : TURN;
    return Promise.all([
      refit(a, width, delay),
      was.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(4px)' }],
        { duration: 0.6 * time, delay: delay, easing: 'ease-in', fill: 'both' }).finished,
      now.animate([{ opacity: 0, filter: 'blur(5px)' }, { opacity: 1, filter: 'blur(0px)' }],
        { duration: 0.75 * time, delay: delay + 0.25 * time, easing: 'ease-out', fill: 'both' }).finished,
    ]);
  }

  // This entry: the other word takes this one's place, in its own font, hidden as this one
  // is, and its strokes come in making the same sign as this word's go. If they can't be
  // drawn, the entry just turns as the others do.
  function handOver(delay, font) {
    if (!ink || !lent || !other || !fontHere(other)) {
      if (lent) {
        ink.svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: delay, fill: 'both' });
        tab.classList.remove('is-lending');
      }
      return relabel(tab, delay, font);
    }
    const had = { word: word.data, style: tab.getAttribute('style') };
    const width = tab.getBoundingClientRect().width;
    Object.assign(tab.style, font);
    word.data = tab.dataset.turn;
    const next = makeInk(other);
    next.shape = BACK;
    measure(next);
    next.svg.style.visibility = '';
    const time = reduceMotion.matches ? 0 : 450;
    undo.push(function () {
      [tab, ink.svg].forEach(function (element) {
        element.getAnimations().forEach(function (animation) {
          animation.cancel();
        });
      });
      next.svg.remove();
      word.data = had.word;
      if (had.style === null) {
        tab.removeAttribute('style');
      } else {
        tab.setAttribute('style', had.style);
      }
    });
    return Promise.all([
      refit(tab, width, delay),
      ink.svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: time, delay: delay, easing: 'ease-in-out', fill: 'both' }).finished,
      next.svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: time, delay: delay, easing: 'ease-in-out', fill: 'both' }).finished,
    ]);
  }

  function turnMenu() {
    const still = reduceMotion.matches;
    const font = labelFont();
    const entries = Array.from(keyed.parentNode.querySelectorAll('a[data-turn]')).filter(function (a) {
      return a !== tab;
    });
    const turns = entries.map(function (a, i) {
      return relabel(a, still ? 0 : 250 + 110 * i, font);
    });
    turns.push(handOver(still ? 0 : 330 + 110 * entries.length, font));
    return Promise.all(turns);
  }

  /* Turning the page: the strokes make this page's own sign, the way back, and the menu
     turns, while the page does what it does (the event "pageturn"); then the other page. */

  key.addEventListener('click', function (event) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;  // into a new tab or window: just the link
    }
    event.preventDefault();
    if (turning) {
      return;
    }
    turning = true;
    clearTimeout(waking);
    clearTimeout(leaving);
    hold = 0;
    warm();
    const address = key.href;
    try {
      sessionStorage.setItem('strokes-arrive', new URL(address).pathname);
    } catch (e) {}
    const waits = [];
    if (ink) {
      if (!lent) {
        measure(ink);
        lend();
      }
      waits.push(become(ink, BACK, 560));
    }
    waits.push(turnMenu());
    document.dispatchEvent(new CustomEvent('pageturn', {
      detail: {
        to: address,
        wait: function (promise) {
          waits.push(promise);
        },
      },
    }));
    const go = function () {
      window.location.href = address;
    };
    Promise.race([Promise.all(waits), wait(3000)]).then(go, go);
  });

  // Arriving from the other page through its key (marked on <html> by the script in
  // _includes/head.html): the strokes are still out of the word, making this page's way
  // back, for a moment, and until the page has arrived its own way, should it have one (as
  // the Trivia page's fog and tide, assets/js/trivia.js), which it marks on <html> with
  // data-arriving while it lasts.
  function arrived() {
    return new Promise(function (resolve) {
      const done = function () {
        watch.disconnect();
        clearTimeout(late);
        resolve();
      };
      const watch = new MutationObserver(function () {
        if (!root.hasAttribute('data-arriving')) {
          done();
        }
      });
      const late = setTimeout(done, 5000);
      watch.observe(root, { attributes: true, attributeFilter: ['data-arriving'] });
      if (!root.hasAttribute('data-arriving')) {
        done();
      }
    });
  }

  if (root.classList.contains('strokes-arrive')) {
    Promise.race([fontIn, wait(1000)]).then(function () {
      awake = true;
      key.classList.toggle('is-drawn', !!ink);
      if (ink) {
        ink.shape = OUT;
        measure(ink);
        lend();
      }
      key.style.transition = 'none';  // as it was on the other page
      key.classList.add('is-on');
      key.getBoundingClientRect();
      key.style.transition = '';
      root.classList.remove('strokes-arrive');
      const mine = hold = Date.now();
      return Promise.all([wait(1600), arrived()]).then(function () {
        if (hold === mine && !over && document.activeElement !== key) {
          sleep();
        }
      });
    });
  }

  // Back to this page from the other one, as the browser kept it: the menu as it was, and
  // the word whole again.
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) {
      return;
    }
    undo.splice(0).reverse().forEach(function (put) {
      put();
    });
    turning = false;
    awake = false;
    over = false;
    clearTimeout(waking);
    clearTimeout(leaving);
    hold = 0;
    key.classList.remove('is-on');
    if (ink) {
      if (ink.move) {
        ink.move.stopped = true;
      }
      ink.svg.getAnimations().forEach(function (animation) {
        animation.cancel();
      });
      ink.shape = 'home';
      measure(ink);
    }
    unlend();
  });

  window.addEventListener('resize', function () {
    if (lent && !turning) {
      measure(ink);
    }
  });
})();
