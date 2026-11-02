# ziyi-zhang.com

Source for [ziyi-zhang.com](https://ziyi-zhang.com), built with Jekyll. It started from the
[Academic Pages](https://github.com/academicpages/academicpages.github.io) template; its design
is inspired by [Yingsi Qin's website](https://yingsiqin.github.io).
GitHub Actions (`.github/workflows/jekyll.yml`) builds and deploys the site on every push to `master`.

## Where things live

| What | File |
| --- | --- |
| Name, photo, position, email and links in the column at the left | `_config.yml` (`author:` block) |
| Faded photo behind the home, CV and paper pages | `_config.yml` (`backdrop:`) |
| Home page: the About Me text and the list of sections | `_pages/about.md` |
| Education, experience, teaching, skills | `_data/cv.yml`, shown on the CV page (`_pages/cv.md`); the home page shows the experience and teaching too |
| Publications | one file per paper in `_publications/`; `category:` is `conferences`, `manuscripts` (journals) or `preprints`, and `cover:` is its picture in `images/papers/` |
| Menu at the top | `_data/navigation.yml` |
| PDFs and images | `files/`, `images/` |
| Travel and Scale Models pages | `_data/travel.yml` (one entry per photo or clip, shown as a mosaic) and `_data/models.yml` (one entry per model, which can have several photos, shown as a wall of framed prints); the photos' sizes in `_data/photo_sizes.yml`, written by `scripts/gallery_images.py`; the format is in `_layouts/gallery.html`, `_sass/_gallery.scss` and `assets/js/gallery.js`, which animates them with [Motion](https://motion.dev) (`assets/js/motion.js`, a cut-down copy remade by `sh scripts/motion.sh`, which needs Node.js) |
| Trivia page | `_pages/trivia.md` (its text and which clip opens it), shown after an opening run by `assets/js/trivia.js` (see below), with the clips' settings in `_data/trivia.yml`; the format is in `_layouts/trivia.html` and `_sass/_trivia.scss` |
| The look of every page | `_layouts/`, `_includes/`, `_sass/` (colors and fonts in `_sass/_base.scss`) and `assets/js/site.js` |

## Adding a paper

Add a file to `_publications/` like the others. Its text is the abstract (the Abstract button and
its own page show it), and the start of its `citation:`, up to the title in quotes, is the list of
authors. Besides `paperurl:`, a paper can have `codeurl:`, `slidesurl:` and `bibtexurl:`, each
shown as a button.

The cover is a 16:9 picture in `images/papers/`, named in `cover:`; a paper without one is listed
without a picture. The current covers are drawn by `scripts/paper_covers.py` (needs numpy and
matplotlib), and a figure from the paper can take the place of any of them.

## Adding to the Travel and Scale Models pages

The originals go in `photography/` (Travel) or `scaled_models/` (Scale Models), named like
`2023-07-22-machu-picchu.heic`. Both folders are kept out of git and out of the site, which
uses the smaller copies in `images/travel/` and `images/models/`.

For a photo, run `python3 scripts/gallery_images.py` (macOS, needs Pillow) to make the copies
and record its size, then add an entry for it to the data file, which explains its fields. A
second photo of a model goes in its entry's `photos:` instead of an entry of its own. To take a
photo off the site, delete its entry and its copies, and move the original into a folder inside
`photography/` or `scaled_models/` (such as `photography/not-on-site/`), which the script skips.

For a clip, put an H.264 `.mp4` of about 10 seconds in `images/travel/` or `images/models/`, with
a still from it saved as a `.jpg` of the same name (shown until the clip loads), run
`python3 scripts/gallery_images.py --sizes` to record its size, and add an entry with
`video: true`. The built-in
macOS `avconvert` can trim one, though its files are larger than the current clips (2–4 MB):

```bash
avconvert --source photography/my-clip.mov --preset Preset960x540 --start 12 --duration 10 --output images/travel/my-clip.mp4
```

## The Trivia page

The page opens on a black screen, where 一曰慈，二曰俭 is written with a brush, stroke by
stroke, in two columns read from the right, beside 《道德经》第六十七章 and a seal, 李耳. The
characters then become windows onto a clip of an animal being fed, and the view flies into it
through 慈; if the phone filming it turned, the clip turns as much, so the picture stays
upright. Then the dark closes in on the page's text. A click or a key skips it. The
characters are glyphs of the brush font
[Ma Shan Zheng](https://github.com/googlefonts/mashanzheng) (SIL Open Font License, in
`assets/js/calligraphy-license.txt`), kept as outlines in `assets/js/calligraphy.js` with the
strokes of 一曰慈二俭 traced along them by hand for the writing.

`clip:` in `_pages/trivia.md` picks the clip in `images/trivia/`, with its settings in
`_data/trivia.yml`: `2020-10-15-feeding-a-squirrel`. The bird clip tried before,
`2024-09-02-feeding-a-bird`, has its settings there too, but its video isn't kept; the
second command below makes it again. Both come from the originals in `trivia/` (kept out of
git and out of the site, like `photography/`):

```bash
swift scripts/trivia_clip.swift trivia/IMG_7563.MOV images/trivia/2020-10-15-feeding-a-squirrel 3.5 10
```

```bash
swift scripts/trivia_clip.swift trivia/IMG_3388.MOV images/trivia/2024-09-02-feeding-a-bird 2.5 10 arm
```

The script prints how far the phone turned, which goes in the clip's `roll` if it turned
enough to matter (the bird's phone turned on its side; the squirrel's hardly moved), and
`arm` makes the hair on the arm in the bird clip less plain (where and when: `arm` in the
script).

## Run locally

Needs Ruby 3.3 (`brew install ruby@3.3`).

```bash
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH" LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
bundle config set --local path vendor/bundle
bundle install
bundle exec jekyll serve --livereload
```

Then open <http://localhost:4000>. Restart it after changing `_config.yml`, which Jekyll reads only
when it starts.
